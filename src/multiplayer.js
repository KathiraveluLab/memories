export class LanMultiplayerClient {
  constructor({
    baseUrl = '',
    onStatusChange = () => {},
    onJoined = () => {},
    onRemotePlayers = () => {},
    onClockSync = () => {},
    onTransitSync = () => {}
  } = {}) {
    this.baseUrl = baseUrl;
    this.onStatusChange = onStatusChange;
    this.onJoined = onJoined;
    this.onRemotePlayers = onRemotePlayers;
    this.onClockSync = onClockSync;
    this.onTransitSync = onTransitSync;

    this.status = 'connecting'; // 'connecting' | 'connected' | 'solo' | 'reconnecting'
    this.playerId = null;
    this.slot = 1;
    this.lanUrls = [];
    this.allPlayers = [];
    this.eventSource = null;
    this.lastSentAt = 0;
    this.lastSentSignature = '';
    this.inFlight = false;
    this.pendingSnapshot = null;
    this.destroyed = false;

    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  async connect({ preferredName = '', preferredOutfitId = '' } = {}) {
    if (this.destroyed) return { ok: false, mode: 'solo' };

    try {
      const infoRes = await fetch(`${this.baseUrl}/api/info`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const contentType = infoRes.headers.get('content-type') || '';
      if (!infoRes.ok || !contentType.includes('application/json')) {
        this.setSoloMode();
        return { ok: false, mode: 'solo' };
      }
      const info = await infoRes.json();
      if (!info || !info.multiplayer) {
        this.setSoloMode();
        return { ok: false, mode: 'solo' };
      }
      this.lanUrls = Array.isArray(info.lanUrls) ? info.lanUrls : [];

      const joinRes = await fetch(`${this.baseUrl}/api/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preferredName || undefined,
          preferredOutfitId: preferredOutfitId || undefined
        })
      });
      if (!joinRes.ok) {
        this.setSoloMode();
        return { ok: false, mode: 'solo' };
      }
      const joinData = await joinRes.json();
      if (!joinData?.ok || !joinData.player) {
        this.setSoloMode();
        return { ok: false, mode: 'solo' };
      }

      this.playerId = joinData.player.id;
      this.slot = joinData.player.slot || 1;
      this.lanUrls = Array.isArray(joinData.lanUrls) ? joinData.lanUrls : this.lanUrls;
      this.status = 'connected';
      if (joinData.clock) {
        this.onClockSync(joinData.clock);
      }
      if (joinData.transit) {
        this.onTransitSync(joinData.transit);
      }
      this.onJoined(joinData.player, this.lanUrls);
      this.handlePlayersPayload(joinData.players || []);
      this.openEventStream();

      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', this.handleBeforeUnload);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
      }

      this.notifyStatus();
      return { ok: true, mode: 'lan', player: joinData.player, lanUrls: this.lanUrls };
    } catch {
      this.setSoloMode();
      return { ok: false, mode: 'solo' };
    }
  }

  setSoloMode() {
    this.status = 'solo';
    this.playerId = null;
    this.allPlayers = [];
    this.onClockSync(null);
    this.onTransitSync(null);
    this.onRemotePlayers([], []);
    this.notifyStatus();
  }

  notifyStatus() {
    this.onStatusChange({
      status: this.status,
      playerId: this.playerId,
      slot: this.slot,
      lanUrls: this.lanUrls,
      playerCount: this.status === 'connected' ? Math.max(1, this.allPlayers.length) : 1
    });
  }

  openEventStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (typeof EventSource === 'undefined' || !this.playerId) return;

    const url = `${this.baseUrl}/api/events?playerId=${encodeURIComponent(this.playerId)}`;
    const es = new EventSource(url);
    this.eventSource = es;

    es.addEventListener('players', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.clock) {
          this.onClockSync(data.clock);
        }
        if (data.transit) {
          this.onTransitSync(data.transit);
        }
        if (Array.isArray(data.players)) {
          if (this.status !== 'connected') {
            this.status = 'connected';
          }
          this.handlePlayersPayload(data.players);
          this.notifyStatus();
        }
      } catch {
        // Ignore malformed SSE message
      }
    });

    es.addEventListener('transit', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.clock) {
          this.onClockSync(data.clock);
        }
        if (data.transit) {
          this.onTransitSync(data.transit);
        }
      } catch {
        // Ignore malformed SSE transit packet
      }
    });

    es.onerror = () => {
      if (this.destroyed) return;
      if (this.status === 'connected') {
        this.status = 'reconnecting';
        this.notifyStatus();
      }
    };
  }

  handlePlayersPayload(playersList) {
    this.allPlayers = playersList;
    const remotes = playersList.filter((p) => p.id !== this.playerId);
    this.onRemotePlayers(remotes, playersList);
  }

  syncState(snapshot, { force = false } = {}) {
    if (this.status !== 'connected' || !this.playerId || !snapshot) return;
    const now = Date.now();
    const signature = JSON.stringify({
      x: Math.round(snapshot.x),
      y: Math.round(snapshot.y),
      f: snapshot.facing,
      m: snapshot.isMoving,
      md: snapshot.mode,
      v: snapshot.currentVenueId,
      ms: snapshot.metroStationId,
      mp: snapshot.metroPhase,
      fp: snapshot.ferryPortId,
      fph: snapshot.ferryPhase,
      r: snapshot.ridingVehicleId,
      o: snapshot.outfitId,
      n: snapshot.name,
      e: snapshot.emoteText,
      sc: snapshot.totalScore,
      mc: snapshot.memoriesCaptured,
      go: snapshot.gameOver
    });

    const elapsed = now - this.lastSentAt;
    const changed = signature !== this.lastSentSignature;
    const needsHeartbeat = elapsed >= 3000;

    if (!force && !needsHeartbeat && (!changed || elapsed < 55)) {
      return;
    }

    if (this.inFlight) {
      this.pendingSnapshot = snapshot;
      return;
    }

    this.lastSentAt = now;
    this.lastSentSignature = signature;
    this.sendSync(snapshot);
  }

  async sendSync(snapshot) {
    this.inFlight = true;
    try {
      const res = await fetch(`${this.baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          state: snapshot
        })
      });
      if (res.status === 404 && !this.destroyed) {
        // Server restarted; silently rejoin preserving name & outfit
        this.playerId = null;
        await this.connect({
          preferredName: snapshot.name,
          preferredOutfitId: snapshot.outfitId
        });
      }
    } catch {
      // Transient LAN hiccup; next tick retries cleanly
    } finally {
      this.inFlight = false;
      if (this.pendingSnapshot && !this.destroyed) {
        const queued = this.pendingSnapshot;
        this.pendingSnapshot = null;
        this.syncState(queued, { force: true });
      }
    }
  }

  async advanceGlobalMorning() {
    if (this.status !== 'connected' || !this.playerId) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, action: 'rest-morning' })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.clock) {
        this.onClockSync(data.clock);
        return data.clock;
      }
    } catch {
      // Ignore transient network error
    }
    return null;
  }

  async postTransitAction(payload) {
    if (this.status !== 'connected' || !this.playerId) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, ...payload })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.transit) {
        this.onTransitSync(data.transit);
      }
      return data;
    } catch {
      return null;
    }
  }

  requestSurfaceSummon(lineId, stopId) {
    return this.postTransitAction({ action: 'summon-surface', lineId, stopId });
  }

  requestMetroDepart(fromStationId, toStationId, triggeredBy) {
    return this.postTransitAction({ action: 'metro-depart', fromStationId, toStationId, triggeredBy });
  }

  requestMetroChime(fromStationId, toStationId, triggeredBy) {
    return this.postTransitAction({ action: 'metro-chime', fromStationId, toStationId, triggeredBy });
  }

  requestFerryBoard(routeId, fromPortId, toPortId, triggeredBy) {
    return this.postTransitAction({ action: 'ferry-board', routeId, fromPortId, toPortId, triggeredBy });
  }

  requestFerryHorn(routeId, fromPortId, toPortId, triggeredBy) {
    return this.postTransitAction({ action: 'ferry-horn', routeId, fromPortId, toPortId, triggeredBy });
  }

  requestRingBell(lineId, stopName, ringerName) {
    return this.postTransitAction({ action: 'ring-bell', lineId, stopName, ringerName });
  }

  requestNextFado() {
    return this.postTransitAction({ action: 'next-fado' });
  }

  requestMiradouroPerform(spotId, requestedBy) {
    return this.postTransitAction({ action: 'miradouro-perform', spotId, requestedBy });
  }

  requestCafeToast({ locationKey, locationName, speakerName, itemName, text } = {}) {
    return this.postTransitAction({
      action: 'cafe-toast',
      locationKey,
      locationName,
      speakerName,
      itemName,
      text
    });
  }

  requestCathedralChime(hour, triggeredBy) {
    return this.postTransitAction({
      action: 'cathedral-chime',
      hour,
      triggeredBy
    });
  }

  requestSharedPostcard({ locationKey, locationName, neighborhood, photographer, companions, clock, caption } = {}) {
    return this.postTransitAction({
      action: 'shared-postcard',
      locationKey,
      locationName,
      neighborhood,
      photographer,
      companions,
      clock,
      caption
    });
  }

  handleBeforeUnload() {
    if (!this.playerId) return;
    const payload = JSON.stringify({ playerId: this.playerId });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${this.baseUrl}/api/leave`, blob);
    }
  }

  async disconnect() {
    this.destroyed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.handleBeforeUnload);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.playerId) {
      const id = this.playerId;
      this.playerId = null;
      try {
        await fetch(`${this.baseUrl}/api/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: id })
        });
      } catch {
        // Ignore network error on teardown
      }
    }
  }
}
