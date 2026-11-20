import {
  NEIGHBORHOODS,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  METRO_LINE,
  METRO_STATIONS,
  VENUES,
  REST_SPOTS,
  PLAYER_OUTFITS,
  getOutfitById,
  getAllTransitStops,
  getAllMemoryCatalog
} from './data.js';
import {
  MemoriesGameEngine,
  INTERIOR_STATIONS,
  METRO_PLATFORM_ZONES,
  FERRY_PIER_ZONES,
  formatClock,
  getDayPhase,
  isOverworldPositionValid,
  isPointInVehicleLane
} from './engine.js';
import { LisboaCanvasRenderer } from './renderer.js';
import { LanMultiplayerClient } from './multiplayer.js';
import { LisboaSoundEngine } from './audio.js';

const ALL_STOPS = getAllTransitStops();
const ALL_MEMORIES = getAllMemoryCatalog();

// Pedestrians route strictly along sidewalks (never down the middle of bus/tram roadways)
// and cross streets cleanly at zebra crosswalk corridors.
const HORIZONTAL_SIDEWALKS = [220, 352, 546, 676, 878, 996];
const VERTICAL_SIDEWALKS = [512, 892, 1384, 1726, 2124];

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function nearestValue(target, candidates) {
  let best = candidates[0];
  let bestDiff = Math.abs(target - best);
  for (const c of candidates) {
    const diff = Math.abs(target - c);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

function isInSidewalkBand(y) {
  return (
    (y >= 205 && y <= 246) ||
    (y >= 332 && y <= 368) ||
    (y >= 532 && y <= 570) ||
    (y >= 654 && y <= 688) ||
    (y >= 856 && y <= 892) ||
    (y >= 978 && y <= 1012)
  );
}

function isSidewalkLineClear(ax, ay, bx, by) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(4, Math.ceil(dist / 16));
  let laneSamples = 0;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (!isOverworldPositionValid(x, y, 12)) return false;
    if (isPointInVehicleLane(x, y)) laneSamples += 1;
  }
  // Allow direct line only if it stays off vehicle lanes (short sidewalk walks)
  return laneSamples === 0;
}

export function buildOverworldPath(sx, sy, tx, ty, finalAction = null) {
  if (isSidewalkLineClear(sx, sy, tx, ty)) {
    return [{ x: tx, y: ty, onArriveAction: finalAction }];
  }

  const waypoints = [];
  const hEnd = nearestValue(ty, HORIZONTAL_SIDEWALKS);
  const vStart = nearestValue(sx, VERTICAL_SIDEWALKS);

  if (isInSidewalkBand(sy)) {
    const hStart = nearestValue(sy, HORIZONTAL_SIDEWALKS);
    if (Math.abs(sy - hStart) > 6) {
      waypoints.push({ x: sx, y: hStart, onArriveAction: null });
    }
    if (hStart !== hEnd) {
      const vCrosswalk = nearestValue((sx + tx) / 2, VERTICAL_SIDEWALKS);
      waypoints.push({ x: vCrosswalk, y: hStart, onArriveAction: null });
      waypoints.push({ x: vCrosswalk, y: hEnd, onArriveAction: null });
    }
    waypoints.push({ x: tx, y: hEnd, onArriveAction: null });
  } else {
    waypoints.push({ x: vStart, y: sy, onArriveAction: null });
    waypoints.push({ x: vStart, y: hEnd, onArriveAction: null });
    waypoints.push({ x: tx, y: hEnd, onArriveAction: null });
  }

  waypoints.push({ x: tx, y: ty, onArriveAction: finalAction });
  return waypoints;
}

const engine = new MemoriesGameEngine();
const canvas = document.getElementById('lisboa-canvas');
const renderer = new LisboaCanvasRenderer(canvas);
const soundEngine = new LisboaSoundEngine();
let prevAudioMode = 'overworld';
let prevAudioVenueId = null;
let prevAudioRidingId = null;
let prevAudioFerryPhase = null;
let lastAnnouncementId = 0;

const pressedKeys = new Set();
let activeTab = 'guide';
let lastUiSignature = '';
let lastContextSignature = '';
let lastLanSignature = '';
let lastStatusText = '';
let mpStatusInfo = { status: 'connecting', lanUrls: [], playerCount: 1 };
const QUICK_GREETINGS = ['Ola!', 'Bom dia!', 'Vamos ao cafe!', 'Espera por mim!'];
let greetingIndex = 0;

const dom = {
  euros: document.getElementById('hud-euros'),
  energy: document.getElementById('hud-energy'),
  energyBar: document.getElementById('hud-energy-bar'),
  fullness: document.getElementById('hud-fullness'),
  fullnessBar: document.getElementById('hud-fullness-bar'),
  clock: document.getElementById('hud-clock'),
  phase: document.getElementById('hud-phase'),
  memories: document.getElementById('hud-memories'),
  sceneTitle: document.getElementById('scene-title'),
  sceneSubtitle: document.getElementById('scene-subtitle'),
  liveAudioStatus: document.getElementById('live-audio-status'),
  liveLanStatus: document.getElementById('live-lan-status'),
  liveTramStatus: document.getElementById('live-tram-status'),
  liveBusStatus: document.getElementById('live-bus-status'),
  btnSound: document.getElementById('btn-sound'),
  lanConnectionBadge: document.getElementById('lan-connection-badge'),
  lanJoinRow: document.getElementById('lan-join-row'),
  lanJoinUrl: document.getElementById('lan-join-url'),
  lanSoloHint: document.getElementById('lan-solo-hint'),
  btnCopyLan: document.getElementById('btn-copy-lan'),
  mpNameInput: document.getElementById('mp-name-input'),
  mpOutfitSelect: document.getElementById('mp-outfit-select'),
  btnWave: document.getElementById('btn-wave'),
  lanPlayersList: document.getElementById('lan-players-list'),
  btnContextAction: document.getElementById('btn-context-action'),
  btnSecondaryAction: document.getElementById('btn-secondary-action'),
  btnOvernight: document.getElementById('btn-overnight'),
  btnReset: document.getElementById('btn-reset'),
  statusBanner: document.getElementById('status-banner'),
  activeContextPanel: document.getElementById('active-context-panel'),
  visitedVenuesBadge: document.getElementById('visited-venues-badge'),
  guideList: document.getElementById('guide-list'),
  albumCountBadge: document.getElementById('album-count-badge'),
  albumCompleteBanner: document.getElementById('album-complete-banner'),
  memoriesList: document.getElementById('memories-list'),
  phraseCountBadge: document.getElementById('phrase-count-badge'),
  phrasebookList: document.getElementById('phrasebook-list'),
  satchelCountBadge: document.getElementById('satchel-count-badge'),
  satchelList: document.getElementById('satchel-list'),
  tastedList: document.getElementById('tasted-list'),
  journalList: document.getElementById('journal-list')
};

function setStatusBanner(message, isError = false) {
  dom.statusBanner.textContent = message;
  dom.statusBanner.classList.toggle('error', isError);
  lastStatusText = message;
}

function setActiveTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

function getKeyboardVector() {
  let x = 0;
  let y = 0;
  if (pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA')) x -= 1;
  if (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) x += 1;
  if (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW')) y -= 1;
  if (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS')) y += 1;
  return { x, y };
}

function handleCanvasClick(event) {
  const state = engine.getState();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;
  const worldPt = renderer.screenToWorld(canvasX, canvasY, state);

  if (state.ridingVehicleId) {
    const res = engine.triggerNearbyInteraction();
    if (res && !res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }

  if (state.mode === 'metro') {
    if (state.metro.phase !== 'platform') return;
    if (
      worldPt.y <= METRO_PLATFORM_ZONES.escalatorExitTriggerY + 12 &&
      Math.abs(worldPt.x - 380) <= METRO_PLATFORM_ZONES.escalatorHalfWidth + 16
    ) {
      engine.setWalkTarget(380, METRO_PLATFORM_ZONES.escalatorExitTriggerY, { type: 'exitMetro' });
      return;
    }
    if (worldPt.y >= 245 && Math.abs(worldPt.x - 380) <= METRO_PLATFORM_ZONES.boardingHalfWidth) {
      engine.setWalkTarget(380, 260, { type: 'boardNextMetro' });
      return;
    }
    engine.setWalkTarget(worldPt.x, Math.max(170, Math.min(272, worldPt.y)), null);
    return;
  }

  if (state.mode === 'ferry') {
    if (state.ferry.phase !== 'terminal') return;
    if (
      state.ferry.portId === FERRY_TERMINAL.id &&
      worldPt.y <= FERRY_PIER_ZONES.exitY + 14 &&
      Math.abs(worldPt.x - 380) <= FERRY_PIER_ZONES.exitHalfWidth + 16
    ) {
      engine.setWalkTarget(380, FERRY_PIER_ZONES.exitY, { type: 'exitFerry' });
      return;
    }
    if (state.ferry.portId !== FERRY_TERMINAL.id) {
      const dest = FERRY_DESTINATIONS.find((d) => d.id === state.ferry.portId);
      for (const spot of dest?.townSpots || []) {
        if (Math.hypot(worldPt.x - spot.x, worldPt.y - spot.y) <= 68 || (worldPt.y <= 165 && Math.abs(worldPt.x - spot.x) <= 95)) {
          engine.setWalkTarget(spot.x, spot.y, { type: 'southBankSpot', spotId: spot.id });
          return;
        }
      }
    }
    if (worldPt.y >= 242 && Math.abs(worldPt.x - 380) <= FERRY_PIER_ZONES.gangwayHalfWidth) {
      engine.setWalkTarget(380, 256, { type: 'boardDefaultFerry' });
      return;
    }
    engine.setWalkTarget(worldPt.x, Math.max(170, Math.min(268, worldPt.y)), null);
    return;
  }

  if (state.mode === 'interior') {
    const counterDist = Math.hypot(worldPt.x - INTERIOR_STATIONS.counter.x, worldPt.y - INTERIOR_STATIONS.counter.y);
    if (counterDist <= 78 || (worldPt.y <= 195 && worldPt.x >= 220 && worldPt.x <= 540)) {
      engine.setWalkTarget(INTERIOR_STATIONS.counter.x, INTERIOR_STATIONS.counter.y, { type: 'talkProprietor' });
      return;
    }
    const displayDist = Math.hypot(worldPt.x - INTERIOR_STATIONS.display.x, worldPt.y - INTERIOR_STATIONS.display.y);
    if (displayDist <= 72 || (worldPt.x <= 165 && worldPt.y >= 195 && worldPt.y <= 340)) {
      engine.setWalkTarget(INTERIOR_STATIONS.display.x, INTERIOR_STATIONS.display.y, { type: 'inspectDisplay' });
      return;
    }
    const mat = INTERIOR_STATIONS.exitMat;
    if (worldPt.y >= mat.triggerY - 22 && Math.abs(worldPt.x - mat.x) <= mat.halfWidth + 16) {
      engine.setWalkTarget(mat.x, mat.triggerY, { type: 'exitVenue' });
      return;
    }
    engine.setWalkTarget(worldPt.x, worldPt.y, null);
    return;
  }

  // Overworld clicks: check Cais do Sodre Ferry Terminal
  const hitFerry =
    worldPt.x >= FERRY_TERMINAL.x - 14 &&
    worldPt.x <= FERRY_TERMINAL.x + FERRY_TERMINAL.w + 14 &&
    worldPt.y >= FERRY_TERMINAL.y - 16 &&
    worldPt.y <= FERRY_TERMINAL.y + FERRY_TERMINAL.h + 44;
  if (hitFerry) {
    const path = buildOverworldPath(
      state.player.x,
      state.player.y,
      FERRY_TERMINAL.spawnOutside.x,
      FERRY_TERMINAL.spawnOutside.y,
      { type: 'openFerry' }
    );
    engine.setWalkPath(path);
    setStatusBanner(`Walking along the Tagus waterfront toward ${FERRY_TERMINAL.name}...`);
    return;
  }

  // Overworld clicks: check Metro stations first
  for (const station of METRO_STATIONS) {
    const hitMetro =
      worldPt.x >= station.x - 14 &&
      worldPt.x <= station.x + station.w + 14 &&
      worldPt.y >= station.y - 20 &&
      worldPt.y <= station.y + station.h + 18;
    if (hitMetro) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        station.spawnOutside.x,
        station.spawnOutside.y,
        { type: 'openMetro', id: station.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking along the sidewalk to ${station.name}...`);
      return;
    }
  }

  // Check venue buildings
  for (const venue of VENUES) {
    const hitBuilding =
      worldPt.x >= venue.x - 10 &&
      worldPt.x <= venue.x + venue.w + 10 &&
      worldPt.y >= venue.y - 10 &&
      worldPt.y <= venue.y + venue.h + 10;
    if (hitBuilding) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        venue.spawnOutside.x,
        venue.spawnOutside.y,
        { type: 'enterVenue', id: venue.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking along the sidewalk toward ${venue.name}...`);
      return;
    }
  }

  // Check transit stops
  for (const stop of ALL_STOPS) {
    const d = Math.min(
      Math.hypot(worldPt.x - stop.platformX, worldPt.y - stop.platformY),
      Math.hypot(worldPt.x - stop.x, worldPt.y - stop.y)
    );
    if (d <= 44) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        stop.platformX,
        stop.platformY,
        { type: 'boardStop', id: stop.stopId }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking to ${stop.stopName} sidewalk shelter to catch ${stop.lineName}...`);
      return;
    }
  }

  // Check rest benches
  for (const spot of REST_SPOTS) {
    if (Math.hypot(worldPt.x - spot.x, worldPt.y - spot.y) <= 38) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        spot.x,
        spot.y + 22,
        { type: 'restBench', id: spot.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking to ${spot.name}...`);
      return;
    }
  }

  // Snap clicks inside vehicle lanes gently onto the nearest sidewalk edge
  let targetY = worldPt.y;
  if (isPointInVehicleLane(worldPt.x, targetY)) {
    targetY = nearestValue(targetY, HORIZONTAL_SIDEWALKS);
  }
  const path = buildOverworldPath(state.player.x, state.player.y, worldPt.x, targetY, null);
  engine.setWalkPath(path);
}

function renderActiveContextPanel(state) {
  const venue = engine.getCurrentVenue();
  const riding = engine.getRidingVehicle();
  const metroStation = engine.getActiveMetroStation();

  const sig = JSON.stringify({
    mode: state.mode,
    venueId: venue?.id || null,
    metroId: metroStation?.id || null,
    metroPhase: state.metro?.phase || null,
    metroTo: state.metro?.toStationId || null,
    ferryPort: state.ferry?.portId || null,
    ferryPhase: state.ferry?.phase || null,
    ferryTo: state.ferry?.toPortId || null,
    fadoTrackId: soundEngine.getCurrentFadoTrack()?.id || null,
    ridingId: riding?.id || null,
    stopId: riding?.currentStopId || null,
    nextStop: riding?.nextStopName || null,
    alight: state.alightAtNextStop,
    euros: state.euros
  });

  if (sig === lastContextSignature) return;
  lastContextSignature = sig;

  if (riding) {
    dom.activeContextPanel.classList.remove('hidden');
    const stopStatus = riding.currentStopId
      ? `Stopped at <strong>${escapeHtml(riding.currentStopName)}</strong>`
      : `Heading toward <strong>${escapeHtml(riding.nextStopName)}</strong>`;
    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>Aboard ${escapeHtml(riding.name)}</h3>
          <div class="item-meta">${stopStatus}</div>
        </div>
        <span class="badge ${riding.mode === 'tram' ? 'badge-tram' : 'badge-bus'}">${escapeHtml(riding.badge)}</span>
      </div>
      <p class="helper-text">
        Enjoy the street-level view across Lisboa while resting your feet. Ring the bell to step out safely onto the sidewalk at the next stop.
      </p>
      <div class="action-strip">
        <button type="button" class="btn btn-primary btn-sm" data-transit-action="ring">
          ${riding.currentStopId ? 'Step Off Here' : state.alightAtNextStop ? 'Bell Rung (Waiting)' : 'Ring Bell for Next Stop'}
        </button>
        <button type="button" class="btn btn-secondary btn-sm" data-transit-action="next-now">
          Hop Off at ${escapeHtml(riding.currentStopId ? riding.currentStopName : riding.nextStopName)}
        </button>
      </div>
    `;
    return;
  }

  if (metroStation) {
    dom.activeContextPanel.classList.remove('hidden');
    const isBusy = state.mode === 'metro' && state.metro.phase !== 'platform';
    const phaseNote =
      state.metro.phase === 'descending'
        ? 'Riding escalators down to the underground platform...'
        : state.metro.phase === 'ascending'
          ? 'Riding escalators up to the Lisboa street exit...'
          : state.metro.phase === 'riding'
            ? `Traveling underground on Linha Azul toward ${escapeHtml((METRO_STATIONS.find((s) => s.id === state.metro.toStationId)?.name) || 'destination')}...`
            : metroStation.note;

    const destinations = METRO_STATIONS.filter((s) => s.id !== metroStation.id);
    const affordable = state.euros >= METRO_LINE.fareEur && !isBusy;
    const destHtml = destinations
      .map(
        (dest) => `
        <div class="item-card">
          <div>
            <h4>${escapeHtml(dest.name)}</h4>
            <div class="item-meta">${escapeHtml(dest.lines.join(' & '))} | ${escapeHtml(dest.note)}</div>
            <div class="item-meta"><strong>${METRO_LINE.fareEur.toFixed(2)} EUR</strong> | Underground Linha Azul ride (+4 Energy)</div>
          </div>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            data-ride-metro="${escapeHtml(dest.id)}"
            ${affordable ? '' : 'disabled'}
          >
            Board Train
          </button>
        </div>
      `
      )
      .join('');

    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(metroStation.name)}</h3>
          <div class="item-meta">${escapeHtml(metroStation.lines.join(' & '))} | Underground Platform</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-metro-close="true" ${isBusy ? 'disabled' : ''}>Take Escalator Out</button>
      </div>
      <p class="helper-text">${phaseNote}</p>
      <div class="phrase-callout">
        <span class="pt">${escapeHtml(METRO_LINE.phrase.pt)}</span>
        <span class="pron">${escapeHtml(METRO_LINE.phrase.pronunciation)}</span>
        <span>${escapeHtml(METRO_LINE.phrase.en)}</span>
      </div>
      ${destHtml}
    `;
    return;
  }

  if (state.mode === 'ferry') {
    dom.activeContextPanel.classList.remove('hidden');
    const f = state.ferry;
    const isSailing = f.phase === 'sailing';
    const isLisbon = f.portId === FERRY_TERMINAL.id;
    const curDest = FERRY_DESTINATIONS.find((d) => d.id === f.portId);
    const toDestLabel =
      f.toPortId === FERRY_TERMINAL.id
        ? FERRY_TERMINAL.shortName
        : (FERRY_DESTINATIONS.find((d) => d.id === f.toPortId)?.name || 'South Bank');

    const southBankTownHtml =
      !isLisbon && !isSailing && curDest && Array.isArray(curDest.townSpots)
        ? curDest.townSpots
            .map((spot) => {
              if (spot.kind === 'landmark') {
                return `
                  <div class="item-card">
                    <div>
                      <h4>${escapeHtml(spot.name)} <span class="badge-muted">${escapeHtml(spot.badge)}</span></h4>
                      <div class="item-meta">${escapeHtml(spot.note)}</div>
                    </div>
                    <button type="button" class="btn btn-sm" data-sb-visit="${escapeHtml(spot.id)}">
                      Rest (+25)
                    </button>
                  </div>
                `;
              }
              const itemsRows = (spot.items || [])
                .map((item) => {
                  const okFunds = state.euros >= item.costEur;
                  const fx =
                    item.kind === 'food'
                      ? `+${item.fullnessDelta} Fullness, +${item.energyDelta} Energy`
                      : `Satchel Keepsake, +${item.energyDelta} Energy`;
                  return `
                    <div class="item-card">
                      <div>
                        <h4>${escapeHtml(item.name)} <span class="badge-muted">${escapeHtml(spot.name)}</span></h4>
                        <div class="item-meta">${escapeHtml(item.description)}</div>
                        <div class="item-meta"><strong>${item.costEur.toFixed(2)} EUR</strong> | ${escapeHtml(fx)}</div>
                      </div>
                      <button type="button" class="btn btn-primary btn-sm" data-sb-buy="${escapeHtml(spot.id)}|${escapeHtml(item.id)}" ${okFunds ? '' : 'disabled'}>
                        ${item.kind === 'food' ? 'Order' : 'Buy'}
                      </button>
                    </div>
                  `;
                })
                .join('');
              return itemsRows;
            })
            .join('')
        : '';

    const routesHtml = isLisbon
      ? FERRY_DESTINATIONS.map((dest) => {
          const affordable = state.euros >= dest.fareEur && !isSailing;
          const visited = state.visitedFerryPorts.includes(dest.id);
          return `
            <div class="item-card">
              <div>
                <h4>${escapeHtml(dest.name)}${visited ? ' (Visited)' : ''}</h4>
                <div class="item-meta">${escapeHtml(dest.description)}</div>
                <div class="item-meta"><strong>${dest.fareEur.toFixed(2)} EUR</strong> | ~${dest.travelMinutes} min Tagus crossing (+6 Energy)</div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-board-ferry="${escapeHtml(dest.id)}" ${affordable ? '' : 'disabled'}>
                Board Ferry
              </button>
            </div>
          `;
        }).join('')
      : `
          ${southBankTownHtml}
          <div class="item-card">
            <div>
              <h4>Return Ferry to ${escapeHtml(FERRY_TERMINAL.shortName)} (Lisboa)</h4>
              <div class="item-meta">Sail back across the Tagus River to Cais do Sodre waterfront.</div>
              <div class="item-meta"><strong>${(curDest?.fareEur || 1.55).toFixed(2)} EUR</strong> | ~${curDest?.travelMinutes || 12} min crossing (+6 Energy)</div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-board-ferry="${escapeHtml(FERRY_TERMINAL.id)}" ${state.euros >= (curDest?.fareEur || 1.55) && !isSailing ? '' : 'disabled'}>
              Sail to Lisbon
            </button>
          </div>
        `;

    const phraseObj = curDest ? curDest.phrase : FERRY_TERMINAL.phrase;
    const noteText = isSailing
      ? `Sailing aboard the Transtejo catamaran toward ${toDestLabel}...`
      : curDest
        ? curDest.pierNote
        : FERRY_TERMINAL.note;

    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(isLisbon ? FERRY_TERMINAL.name : (curDest?.name || 'South Bank Pier'))}</h3>
          <div class="item-meta">Transtejo Tagus Ferries | ${isSailing ? 'Crossing in Progress' : isLisbon ? 'Lisboa Waterfront' : 'Tagus South Bank'}</div>
        </div>
        ${isLisbon ? `<button type="button" class="btn btn-secondary btn-sm" data-ferry-exit="true" ${isSailing ? 'disabled' : ''}>Exit to Street</button>` : ''}
      </div>
      <p class="helper-text">${escapeHtml(noteText)}</p>
      <div class="phrase-callout">
        <span class="pt">${escapeHtml(phraseObj.pt)}</span>
        <span class="pron">${escapeHtml(phraseObj.pronunciation)}</span>
        <span>${escapeHtml(phraseObj.en)}</span>
      </div>
      ${routesHtml}
    `;
    return;
  }

  if (venue) {
    dom.activeContextPanel.classList.remove('hidden');
    const itemsHtml = venue.items
      .map((item) => {
        const affordable = state.euros >= item.costEur;
        const effects =
          item.kind === 'food'
            ? `+${item.fullnessDelta} Fullness, +${item.energyDelta} Energy`
            : `Satchel Keepsake, +${item.energyDelta} Energy`;
        return `
          <div class="item-card">
            <div>
              <h4>${escapeHtml(item.name)}</h4>
              <div class="item-meta">${escapeHtml(item.description)}</div>
              <div class="item-meta"><strong>${item.costEur.toFixed(2)} EUR</strong> | ${escapeHtml(effects)}</div>
            </div>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              data-buy-item="${escapeHtml(item.id)}"
              ${affordable ? '' : 'disabled'}
            >
              ${item.kind === 'food' ? 'Order' : 'Buy'}
            </button>
          </div>
        `;
      })
      .join('');

    const staffText = venue.cashierName
      ? `${escapeHtml(venue.proprietor)} (${escapeHtml(venue.proprietorRole)}) | ${escapeHtml(venue.cashierName)} (${escapeHtml(venue.cashierRole || 'Cashier')})`
      : `${escapeHtml(venue.proprietor)} (${escapeHtml(venue.proprietorRole)})`;

    const isFadoVenue =
      venue.id === 'tasca-do-fado' ||
      venue.id === 'vinil-do-alto' ||
      venue.id === 'taberna-sardinha';
    const currentFado = isFadoVenue ? soundEngine.getCurrentFadoTrack() : null;
    const fadoBarHtml = currentFado
      ? `
        <div class="item-card">
          <div>
            <h4>Now Playing: ${escapeHtml(currentFado.title)}</h4>
            <div class="item-meta">${escapeHtml(currentFado.performer)} | ${escapeHtml(currentFado.source)}</div>
          </div>
          <button type="button" class="btn btn-sm" data-next-fado="true">Next Track</button>
        </div>
      `
      : '';

    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(venue.name)}</h3>
          <div class="item-meta">${escapeHtml(venue.memory.neighborhood)} | ${staffText}</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-venue-action="exit">Step Outside</button>
      </div>
      <div class="context-quote">"${escapeHtml(venue.greeting)}"</div>
      ${fadoBarHtml}
      <div class="phrase-callout">
        <span class="pt">${escapeHtml(venue.phrase.pt)}</span>
        <span class="pron">${escapeHtml(venue.phrase.pronunciation)}</span>
        <span>${escapeHtml(venue.phrase.en)}</span>
      </div>
      ${itemsHtml}
      <div class="action-strip">
        <button type="button" class="btn btn-sm" data-venue-action="talk">Chat with ${escapeHtml(venue.proprietor)}</button>
        <button type="button" class="btn btn-sm" data-venue-action="inspect">Inspect Display</button>
      </div>
    `;
    return;
  }

  dom.activeContextPanel.classList.add('hidden');
  dom.activeContextPanel.innerHTML = '';
}

function renderLists(state) {
  const sig = JSON.stringify({
    visitedVenues: state.visitedVenues,
    memories: state.memories.map((m) => m.id),
    phrases: state.learnedPhrases.length,
    satchel: state.satchel.length,
    tasted: state.tastedFoods.length,
    journalLen: state.journal.length,
    journalHead: state.journal[0]?.id || 0,
    mode: state.mode,
    riding: state.ridingVehicleId
  });
  if (sig === lastUiSignature) return;
  lastUiSignature = sig;

  dom.visitedVenuesBadge.textContent = `${state.visitedVenues.length} / ${VENUES.length} venues`;
  dom.albumCountBadge.textContent = `${state.memories.length} / ${state.totalMemoriesPossible} captured`;
  dom.phraseCountBadge.textContent = `${state.learnedPhrases.length} ${state.learnedPhrases.length === 1 ? 'phrase' : 'phrases'}`;
  dom.satchelCountBadge.textContent = `${state.satchel.length} ${state.satchel.length === 1 ? 'keepsake' : 'keepsakes'}`;

  dom.albumCompleteBanner.classList.toggle('hidden', !state.albumCompleted);

  const guideParts = [];
  for (const hood of NEIGHBORHOODS) {
    guideParts.push(`<div class="hood-group-title">${escapeHtml(hood.name)}</div>`);
    const hoodVenues = VENUES.filter((v) => v.neighborhood === hood.id);
    for (const v of hoodVenues) {
      const visited = state.visitedVenues.includes(v.id);
      guideParts.push(`
        <div class="guide-card ${visited ? 'visited' : ''}">
          <div>
            <div class="guide-card-title">${escapeHtml(v.name)} <span class="badge-muted">${escapeHtml(v.badge)}</span></div>
            <div class="guide-card-sub">${visited ? 'Visited - Memory captured' : escapeHtml(v.description)}</div>
          </div>
          <button type="button" class="btn btn-sm" data-walk-venue="${escapeHtml(v.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
            Walk Here
          </button>
        </div>
      `);
    }
    const hoodBench = REST_SPOTS.find((s) => s.neighborhood === hood.id);
    if (hoodBench) {
      const saved = state.memories.some((m) => m.id === hoodBench.memory.id);
      guideParts.push(`
        <div class="guide-card ${saved ? 'visited' : ''}">
          <div>
            <div class="guide-card-title">${escapeHtml(hoodBench.name)} <span class="badge-muted">[BENCH]</span></div>
            <div class="guide-card-sub">Free rest (+30 Energy)${saved ? ' - Viewpoint saved' : ''}</div>
          </div>
          <button type="button" class="btn btn-sm" data-walk-bench="${escapeHtml(hoodBench.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
            Walk Here
          </button>
        </div>
      `);
    }
  }

  guideParts.push('<div class="hood-group-title">Tagus River Ferries (Cais do Sodre Port)</div>');
  const visitedPorts = state.visitedFerryPorts || [];
  guideParts.push(`
    <div class="guide-card ${visitedPorts.length === FERRY_DESTINATIONS.length ? 'visited' : ''}">
      <div>
        <div class="guide-card-title">${escapeHtml(FERRY_TERMINAL.name)} <span class="badge-muted">${escapeHtml(FERRY_TERMINAL.badge)}</span></div>
        <div class="guide-card-sub">Transtejo ferries to Cacilhas, Seixal &amp; Montijo (${visitedPorts.length} / ${FERRY_DESTINATIONS.length} ports visited)</div>
      </div>
      <button type="button" class="btn btn-sm" data-walk-ferry="true" ${state.ridingVehicleId ? 'disabled' : ''}>
        Walk Here
      </button>
    </div>
  `);

  guideParts.push('<div class="hood-group-title">Metropolitano de Lisboa (Available Stations)</div>');
  for (const station of METRO_STATIONS) {
    guideParts.push(`
      <div class="guide-card">
        <div>
          <div class="guide-card-title">${escapeHtml(station.name)} <span class="badge-muted">[METRO]</span></div>
          <div class="guide-card-sub">${escapeHtml(station.lines.join(' & '))} - ${METRO_LINE.fareEur.toFixed(2)} EUR</div>
        </div>
        <button type="button" class="btn btn-sm" data-walk-metro="${escapeHtml(station.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
          Walk Here
        </button>
      </div>
    `);
  }

  guideParts.push('<div class="hood-group-title">Carris Tram 28E &amp; Bus 737 / 758 Stops</div>');
  for (const stop of ALL_STOPS) {
    guideParts.push(`
      <div class="guide-card">
        <div>
          <div class="guide-card-title">${escapeHtml(stop.stopName)}</div>
          <div class="guide-card-sub">${escapeHtml(stop.badge)} ${escapeHtml(stop.lineName)} - ${stop.fareEur.toFixed(2)} EUR</div>
        </div>
        <button type="button" class="btn btn-sm" data-walk-stop="${escapeHtml(stop.stopId)}" ${state.ridingVehicleId ? 'disabled' : ''}>
          Catch Here
        </button>
      </div>
    `);
  }
  dom.guideList.innerHTML = guideParts.join('');

  const capturedMap = new Map(state.memories.map((m) => [m.id, m]));
  dom.memoriesList.innerHTML = ALL_MEMORIES.map((mem) => {
    const found = capturedMap.get(mem.id);
    if (found) {
      return `
        <article class="memory-card captured">
          <div class="memory-top">
            <span class="memory-title">${escapeHtml(found.title)}</span>
            <span class="memory-stamp">Day ${found.day} ${escapeHtml(found.clock)} | ${escapeHtml(found.neighborhood)}</span>
          </div>
          <p class="memory-caption">${escapeHtml(found.caption)}</p>
        </article>
      `;
    }
    return `
      <article class="memory-card locked">
        <div class="memory-top">
          <span class="memory-title">Undiscovered Memory (${escapeHtml(mem.category.toUpperCase())})</span>
          <span class="memory-stamp">${escapeHtml(mem.neighborhood)}</span>
        </div>
        <p class="memory-caption">Explore ${escapeHtml(mem.neighborhood)} to capture this memory.</p>
      </article>
    `;
  }).join('');

  dom.phrasebookList.innerHTML = state.learnedPhrases
    .map(
      (p) => `
      <li>
        <span class="phrase-pt">${escapeHtml(p.pt)}</span>
        <span class="phrase-pron">${escapeHtml(p.pronunciation)}</span>
        <span class="phrase-en">${escapeHtml(p.en)}</span>
        <span class="item-meta">Learned at ${escapeHtml(p.source)} (Day ${p.day})</span>
      </li>
    `
    )
    .join('');

  dom.satchelList.innerHTML =
    state.satchel.length > 0
      ? state.satchel
        .map(
          (s) =>
            `<li><strong>${escapeHtml(s.name)}</strong> - ${escapeHtml(s.venueName)} (${escapeHtml(s.neighborhood)}, Day ${s.day})</li>`
        )
        .join('')
      : '<li class="empty-note">No souvenirs collected yet. Visit shops in Bairro Alto, Chiado, or Alfama.</li>';

  dom.tastedList.innerHTML =
    state.tastedFoods.length > 0
      ? state.tastedFoods
        .map((f) => `<li><strong>${escapeHtml(f.name)}</strong> at ${escapeHtml(f.venueName)} (Day ${f.day})</li>`)
        .join('')
      : '<li class="empty-note">No Lisbon dishes tasted yet. Stop by Cafe A Brasileira or a local tasca!</li>';

  dom.journalList.innerHTML = state.journal
    .slice(0, 18)
    .map(
      (j) =>
        `<li><strong>Day ${j.day} ${escapeHtml(j.clock)}:</strong> ${escapeHtml(j.summary)}</li>`
    )
    .join('');
}

function refreshUi(force = false) {
  const state = engine.getState();
  const phase = getDayPhase(state.minutesOfDay);
  const nearby = engine.getNearbyInteraction();

  dom.euros.textContent = `${state.euros.toFixed(2)} EUR`;
  dom.energy.textContent = String(Math.round(state.energy));
  dom.energyBar.style.width = `${Math.round(state.energy)}%`;
  dom.fullness.textContent = String(Math.round(state.fullness));
  dom.fullnessBar.style.width = `${Math.round(state.fullness)}%`;
  dom.clock.textContent = `Day ${state.day} - ${formatClock(state.minutesOfDay)}`;
  dom.phase.textContent = phase.label;
  dom.phase.className = `phase-pill phase-${phase.id}`;
  dom.memories.textContent = `${state.memories.length} / ${state.totalMemoriesPossible}`;

  const venue = engine.getCurrentVenue();
  const riding = engine.getRidingVehicle();
  const metroStation = engine.getActiveMetroStation();
  if (state.mode === 'ferry') {
    const f = state.ferry;
    const portInfo = FERRY_DESTINATIONS.find((d) => d.id === f.portId);
    const toName =
      f.toPortId === FERRY_TERMINAL.id
        ? FERRY_TERMINAL.shortName
        : (FERRY_DESTINATIONS.find((d) => d.id === f.toPortId)?.name || 'South Bank');
    if (f.phase === 'sailing') {
      dom.sceneTitle.textContent = `Transtejo Tagus Ferry -> ${toName}`;
      dom.sceneSubtitle.textContent = 'Sailing across the Tagus River aboard the Transtejo catamaran.';
    } else if (f.portId === FERRY_TERMINAL.id) {
      dom.sceneTitle.textContent = 'Cais do Sodre Ferry Terminal (Transtejo)';
      dom.sceneSubtitle.textContent = 'Choose a ferry to Cacilhas, Seixal, or Montijo in the Ferry panel, or walk up to exit to the waterfront.';
    } else {
      dom.sceneTitle.textContent = `${portInfo ? portInfo.name : 'South Bank'} Ferry Pier`;
      dom.sceneSubtitle.textContent = 'Enjoy the Tagus south-bank view, then board the return Transtejo ferry to Cais do Sodre.';
    }
  } else if (state.mode === 'metro') {
    const destStation = METRO_STATIONS.find((s) => s.id === state.metro.toStationId);
    if (state.metro.phase === 'riding') {
      dom.sceneTitle.textContent = `Underground Metro (Linha Azul) -> ${destStation ? destStation.name : 'Next Station'}`;
      dom.sceneSubtitle.textContent = 'Riding beneath Lisboa on Metropolitano de Lisboa.';
    } else if (state.metro.phase === 'descending') {
      dom.sceneTitle.textContent = `Descending into ${metroStation ? metroStation.name : 'Metro'}`;
      dom.sceneSubtitle.textContent = 'Taking the escalators down to the Linha Azul underground platform.';
    } else if (state.metro.phase === 'ascending') {
      dom.sceneTitle.textContent = `Ascending from ${metroStation ? metroStation.name : 'Metro'}`;
      dom.sceneSubtitle.textContent = 'Taking the escalators up to the Lisboa street sidewalk.';
    } else {
      dom.sceneTitle.textContent = `${metroStation ? metroStation.name : 'Metro Station'} - Underground Platform`;
      dom.sceneSubtitle.textContent = 'Board a Linha Azul train to another station, or take the escalator back up to the street (Esc).';
    }
  } else if (venue) {
    dom.sceneTitle.textContent = `Inside ${venue.name} (${venue.memory.neighborhood})`;
    dom.sceneSubtitle.textContent = `Walk to ${venue.proprietor}'s counter, browse the display, or walk to EXIT TO STREET.`;
  } else if (riding) {
    dom.sceneTitle.textContent =
      riding.mode === 'bus'
        ? `Inside ${riding.name} - Lisboa Cityscape (${state.currentNeighborhoodName})`
        : `Inside ${riding.name} - Lisboa Hillside View (${state.currentNeighborhoodName})`;
    dom.sceneSubtitle.textContent = riding.currentStopId
      ? `Stopped at ${riding.currentStopName}. Press [E] to step out onto the sidewalk.`
      : `Next stop: ${riding.nextStopName}. Press [E] to ring bell & hear "Proxima Paragem".`;
  } else {
    dom.sceneTitle.textContent = `${state.currentNeighborhoodName} - Ground-Level Lisboa`;
    dom.sceneSubtitle.textContent =
      'Walk along sidewalks with WASD / Arrows or click anywhere. Press [E] at shops, Metro entrances, transit stops, or benches.';
  }

  const tram = state.vehicles.find((v) => v.mode === 'tram');
  const bus = state.vehicles.find((v) => v.mode === 'bus');
  if (tram) {
    dom.liveTramStatus.textContent = tram.yielding
      ? '[TRAM 28E] Yielding to pedestrian'
      : tram.currentStopName
        ? `[TRAM 28E] At ${tram.currentStopName.split(' (')[0]}`
        : `[TRAM 28E] -> ${tram.nextStopName.split(' (')[0]}`;
  }
  if (bus) {
    dom.liveBusStatus.textContent = bus.yielding
      ? '[BUS 737] Yielding to pedestrian'
      : bus.currentStopName
        ? `[BUS 737] At ${bus.currentStopName.split(' (')[0]}`
        : `[BUS 737] -> ${bus.nextStopName.split(' (')[0]}`;
  }

  if (nearby) {
    dom.btnContextAction.disabled = false;
    dom.btnContextAction.textContent = nearby.label;
  } else {
    dom.btnContextAction.disabled = true;
    dom.btnContextAction.textContent =
      state.mode === 'interior'
        ? 'Walk to counter, display, or EXIT mat'
        : state.mode === 'metro'
          ? 'Walk to BOARD METRO zone or ESCALATOR TO STREET'
          : state.mode === 'ferry'
            ? 'Walk to BOARD FERRY gangway or pick destination'
            : 'Walk near a shop, Metro, Cais do Sodre Port, transit stop, or bench';
  }

  if (state.mode === 'interior') {
    dom.btnSecondaryAction.classList.remove('hidden');
    dom.btnSecondaryAction.textContent = 'Step Outside (Esc)';
    dom.btnSecondaryAction.dataset.action = 'exit-venue';
  } else if (state.mode === 'metro' && state.metro.phase === 'platform') {
    dom.btnSecondaryAction.classList.remove('hidden');
    dom.btnSecondaryAction.textContent = 'Take Escalator to Street (Esc)';
    dom.btnSecondaryAction.dataset.action = 'exit-metro';
  } else if (state.mode === 'ferry' && state.ferry.phase === 'terminal') {
    dom.btnSecondaryAction.classList.remove('hidden');
    if (state.ferry.portId === FERRY_TERMINAL.id) {
      dom.btnSecondaryAction.textContent = 'Exit to Waterfront (Esc)';
      dom.btnSecondaryAction.dataset.action = 'exit-ferry';
    } else {
      dom.btnSecondaryAction.textContent = 'Return Ferry to Cais do Sodre';
      dom.btnSecondaryAction.dataset.action = 'return-ferry';
    }
  } else if (state.ridingVehicleId) {
    dom.btnSecondaryAction.classList.remove('hidden');
    dom.btnSecondaryAction.textContent = 'Hop Off at Next Stop Now';
    dom.btnSecondaryAction.dataset.action = 'alight-now';
  } else {
    dom.btnSecondaryAction.classList.add('hidden');
  }

  if (force || state.statusMessage !== lastStatusText) {
    setStatusBanner(state.statusMessage, false);
  }

  renderActiveContextPanel(state);
  renderLists(state);
  renderMultiplayerPanel(state);
  updateAudioIndicator();
}

function updateAudioIndicator() {
  const profile = soundEngine.getProfile();
  const muted = soundEngine.isMuted();
  const unlocked = soundEngine.isUnlocked();

  if (dom.btnSound) {
    dom.btnSound.textContent = muted ? 'Sound: OFF' : 'Sound: ON';
    dom.btnSound.setAttribute('aria-pressed', String(!muted));
  }

  if (dom.liveAudioStatus) {
    dom.liveAudioStatus.classList.remove('active', 'water', 'metro');
    if (muted) {
      dom.liveAudioStatus.textContent = '[AUDIO] Muted';
    } else if (!unlocked) {
      dom.liveAudioStatus.textContent = '[AUDIO] Click or Move';
    } else if (profile.badgeTone === 'warm') {
      const fadoTrack = profile.fadoMusic >= 0.4 ? soundEngine.getCurrentFadoTrack() : null;
      const audioText =
        fadoTrack && soundEngine.isUsingRealFadoAudio()
          ? `[AUDIO] ${fadoTrack.title}`
          : `[AUDIO] ${profile.activeLabel}`;
      dom.liveAudioStatus.textContent = audioText;
      dom.liveAudioStatus.classList.add('active');
    } else if (profile.badgeTone === 'water') {
      dom.liveAudioStatus.textContent = `[AUDIO] ${profile.activeLabel}`;
      dom.liveAudioStatus.classList.add('water');
    } else if (profile.badgeTone === 'metro') {
      dom.liveAudioStatus.textContent = `[AUDIO] ${profile.activeLabel}`;
      dom.liveAudioStatus.classList.add('metro');
    } else {
      dom.liveAudioStatus.textContent = '[AUDIO] On';
    }
  }
}

function ensureAudioUnlocked() {
  if (!soundEngine.isUnlocked()) {
    soundEngine.unlock();
    soundEngine.update(engine.getState());
    updateAudioIndicator();
  }
}

function describeTravelerLocation(traveler) {
  if (traveler.mode === 'interior' && traveler.currentVenueId) {
    const venue = VENUES.find((v) => v.id === traveler.currentVenueId);
    return venue ? `Inside ${venue.name}` : 'Inside a venue';
  }
  if (traveler.mode === 'metro' && traveler.metroStationId) {
    const station = METRO_STATIONS.find((s) => s.id === traveler.metroStationId);
    return station ? `${station.name} (${traveler.metroPhase || 'platform'})` : 'Underground Metro';
  }
  if (traveler.ridingVehicleId) {
    return traveler.ridingVehicleId === 'tram-28e' ? 'Aboard Tram 28E' : 'Aboard Carris Bus';
  }
  return traveler.neighborhoodName || 'Chiado';
}

function renderMultiplayerPanel(state) {
  if (!dom.lanPlayersList) return;
  const remotes = state.remotePlayers || [];
  const totalOnline = mpStatusInfo.status === 'connected' ? remotes.length + 1 : 1;

  const sig = JSON.stringify({
    status: mpStatusInfo.status,
    urls: mpStatusInfo.lanUrls,
    me: {
      n: state.player.name,
      o: state.player.outfitId,
      loc: describeTravelerLocation({
        mode: state.mode,
        currentVenueId: state.currentVenueId,
        metroStationId: state.metro.stationId,
        metroPhase: state.metro.phase,
        ridingVehicleId: state.ridingVehicleId,
        neighborhoodName: state.currentNeighborhoodName
      })
    },
    remotes: remotes.map((r) => ({
      id: r.id,
      n: r.name,
      o: r.outfitId,
      loc: describeTravelerLocation(r)
    }))
  });
  if (sig === lastLanSignature) return;
  lastLanSignature = sig;

  const isLan = mpStatusInfo.status === 'connected';
  const isReconnecting = mpStatusInfo.status === 'reconnecting';
  if (dom.liveLanStatus) {
    dom.liveLanStatus.classList.toggle('live', isLan);
    dom.liveLanStatus.textContent = isLan
      ? `[LAN] ${totalOnline} ${totalOnline === 1 ? 'Traveler' : 'Travelers'}`
      : isReconnecting
        ? '[LAN] Reconnecting...'
        : '[SOLO]';
  }
  if (dom.lanConnectionBadge) {
    dom.lanConnectionBadge.textContent = isLan
      ? `LAN Live - ${totalOnline} Online`
      : isReconnecting
        ? 'Reconnecting...'
        : 'Solo Mode';
  }

  const shareUrl =
    (mpStatusInfo.lanUrls && mpStatusInfo.lanUrls[0]) ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  if (dom.lanJoinRow) {
    dom.lanJoinRow.classList.toggle('hidden', !isLan && !isReconnecting);
  }
  if (dom.lanSoloHint) {
    dom.lanSoloHint.classList.toggle('hidden', isLan || isReconnecting);
  }
  if (dom.lanJoinUrl) {
    dom.lanJoinUrl.textContent = shareUrl;
  }

  const myOutfit = getOutfitById(state.player.outfitId);
  const myLoc = describeTravelerLocation({
    mode: state.mode,
    currentVenueId: state.currentVenueId,
    metroStationId: state.metro.stationId,
    metroPhase: state.metro.phase,
    ridingVehicleId: state.ridingVehicleId,
    neighborhoodName: state.currentNeighborhoodName
  });

  const rows = [
    `
      <div class="mp-player-chip self">
        <div class="mp-player-info">
          <span class="mp-swatch" style="background:${escapeHtml(myOutfit.ringColor)}"></span>
          <div>
            <span class="mp-player-name">${escapeHtml(state.player.name)} (You)</span>
            <span class="mp-player-meta">${escapeHtml(myOutfit.name)} | ${escapeHtml(myLoc)}</span>
          </div>
        </div>
      </div>
    `
  ];

  for (const rp of remotes) {
    const outfit = getOutfitById(rp.outfitId);
    const loc = describeTravelerLocation(rp);
    rows.push(`
      <div class="mp-player-chip">
        <div class="mp-player-info">
          <span class="mp-swatch" style="background:${escapeHtml(outfit.ringColor)}"></span>
          <div>
            <span class="mp-player-name">${escapeHtml(rp.name)}</span>
            <span class="mp-player-meta">${escapeHtml(outfit.name)} | ${escapeHtml(loc)}</span>
          </div>
        </div>
        <button type="button" class="btn btn-sm" data-walk-peer="${escapeHtml(rp.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
          Walk To
        </button>
      </div>
    `);
  }

  dom.lanPlayersList.innerHTML = rows.join('');
}

// Populate cloth style dropdown
if (dom.mpOutfitSelect) {
  dom.mpOutfitSelect.innerHTML = PLAYER_OUTFITS.map(
    (outfit) => `<option value="${escapeHtml(outfit.id)}">${escapeHtml(outfit.name)}</option>`
  ).join('');
  dom.mpOutfitSelect.value = engine.getState().player.outfitId;
}

const mpClient = new LanMultiplayerClient({
  onStatusChange: (info) => {
    mpStatusInfo = info;
    lastLanSignature = '';
    renderMultiplayerPanel(engine.getState());
  },
  onJoined: (assignedPlayer, lanUrls) => {
    engine.setPlayerProfile({
      name: assignedPlayer.name,
      outfitId: assignedPlayer.outfitId
    });
    engine.setPlayerPosition(assignedPlayer.x, assignedPlayer.y);
    if (dom.mpNameInput) dom.mpNameInput.value = assignedPlayer.name;
    if (dom.mpOutfitSelect) dom.mpOutfitSelect.value = assignedPlayer.outfitId;
    const outfit = getOutfitById(assignedPlayer.outfitId);
    const lanHint = lanUrls && lanUrls[0] ? ` Share ${lanUrls[0]} on your network to invite another computer.` : '';
    setStatusBanner(`Joined LAN Lisboa as ${assignedPlayer.name} wearing ${outfit.name}.${lanHint}`);
    lastLanSignature = '';
    refreshUi(true);
  },
  onRemotePlayers: (remotes) => {
    const prevIds = new Set((engine.getState().remotePlayers || []).map((r) => r.id));
    engine.setRemotePlayers(remotes);
    for (const r of remotes) {
      if (!prevIds.has(r.id)) {
        const outfit = getOutfitById(r.outfitId);
        setStatusBanner(`${r.name} joined Lisboa wearing ${outfit.name}!`);
      }
    }
    lastLanSignature = '';
    renderMultiplayerPanel(engine.getState());
  }
});

// Event listeners
window.addEventListener('pointerdown', ensureAudioUnlocked, { passive: true });

window.addEventListener('keydown', (event) => {
  ensureAudioUnlocked();
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === 'KeyM') {
    if (!event.repeat) {
      const nowMuted = soundEngine.toggleMute();
      updateAudioIndicator();
      setStatusBanner(nowMuted ? 'Lisboa soundscapes muted.' : 'Lisboa soundscapes enabled.');
    }
    return;
  }
  if (event.code === 'KeyG') {
    if (!event.repeat) {
      const text = QUICK_GREETINGS[greetingIndex % QUICK_GREETINGS.length];
      greetingIndex += 1;
      engine.triggerEmote(text);
      mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
      setStatusBanner(`You waved: "${text}"`);
    }
    return;
  }
  if (event.code === 'KeyE' || event.code === 'Space') {
    if (!event.repeat) {
      const res = engine.triggerNearbyInteraction();
      if (res && !res.ok && res.error) {
        setStatusBanner(res.error, true);
      }
      refreshUi(true);
    }
    return;
  }
  if (event.code === 'Escape') {
    if (engine.getState().mode === 'interior') {
      engine.exitVenue();
      refreshUi(true);
    } else if (engine.getState().mode === 'metro' && engine.getState().metro.phase === 'platform') {
      engine.exitMetroStation();
      refreshUi(true);
    } else if (
      engine.getState().mode === 'ferry' &&
      engine.getState().ferry.phase === 'terminal' &&
      engine.getState().ferry.portId === FERRY_TERMINAL.id
    ) {
      engine.exitFerryTerminal();
      refreshUi(true);
    }
    return;
  }
  pressedKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener('blur', () => {
  pressedKeys.clear();
});

canvas.addEventListener('click', handleCanvasClick);

dom.btnContextAction.addEventListener('click', () => {
  const res = engine.triggerNearbyInteraction();
  if (res && !res.ok && res.error) {
    setStatusBanner(res.error, true);
  }
  refreshUi(true);
});

dom.btnSecondaryAction.addEventListener('click', () => {
  const action = dom.btnSecondaryAction.dataset.action;
  if (action === 'exit-venue') {
    engine.exitVenue();
  } else if (action === 'exit-metro') {
    engine.exitMetroStation();
  } else if (action === 'exit-ferry') {
    engine.exitFerryTerminal();
  } else if (action === 'return-ferry') {
    const res = engine.boardFerry(FERRY_TERMINAL.id);
    if (!res.ok && res.error) setStatusBanner(res.error, true);
  } else if (action === 'alight-now') {
    engine.disembarkTransit({ immediateToNextStop: true });
  }
  refreshUi(true);
});

if (dom.btnSound) {
  dom.btnSound.addEventListener('click', () => {
    const nowMuted = soundEngine.toggleMute();
    soundEngine.update(engine.getState());
    updateAudioIndicator();
    setStatusBanner(nowMuted ? 'Lisboa soundscapes muted.' : 'Lisboa soundscapes enabled.');
  });
}

dom.btnOvernight.addEventListener('click', () => {
  engine.restOvernight();
  refreshUi(true);
});

dom.btnReset.addEventListener('click', () => {
  engine.reset();
  lastUiSignature = '';
  lastContextSignature = '';
  refreshUi(true);
});

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setActiveTab(btn.dataset.tab);
  });
});

dom.activeContextPanel.addEventListener('click', (event) => {
  const sbVisitBtn = event.target.closest('[data-sb-visit]');
  if (sbVisitBtn) {
    const res = engine.interactWithSouthBankSpot(sbVisitBtn.dataset.sbVisit);
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  const sbBuyBtn = event.target.closest('[data-sb-buy]');
  if (sbBuyBtn) {
    const [spotId, itemId] = sbBuyBtn.dataset.sbBuy.split('|');
    const res = engine.purchaseSouthBankItem(spotId, itemId);
    if (res.ok) soundEngine.playEffect('register');
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  const ferryBtn = event.target.closest('[data-board-ferry]');
  if (ferryBtn) {
    const res = engine.boardFerry(ferryBtn.dataset.boardFerry);
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-ferry-exit]')) {
    engine.exitFerryTerminal();
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-next-fado]')) {
    const nextTrack = soundEngine.nextFadoTrack();
    if (nextTrack) {
      setStatusBanner(`Now playing Public Domain Fado: ${nextTrack.title} (${nextTrack.performer}).`);
    }
    lastContextSignature = '';
    refreshUi(true);
    return;
  }
  const rideMetroBtn = event.target.closest('[data-ride-metro]');
  if (rideMetroBtn) {
    const originId = engine.getState().activeMetroStationId;
    const res = engine.rideMetro(originId, rideMetroBtn.dataset.rideMetro);
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-metro-close]')) {
    engine.closeMetroStation();
    refreshUi(true);
    return;
  }
  const buyBtn = event.target.closest('[data-buy-item]');
  if (buyBtn) {
    const res = engine.purchaseVenueItem(buyBtn.dataset.buyItem);
    if (res.ok) soundEngine.playEffect('register');
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  const venueBtn = event.target.closest('[data-venue-action]');
  if (venueBtn) {
    const act = venueBtn.dataset.venueAction;
    if (act === 'exit') engine.exitVenue();
    else if (act === 'talk') engine.talkToProprietor();
    else if (act === 'inspect') engine.inspectVenueDisplay();
    refreshUi(true);
    return;
  }
  const transitBtn = event.target.closest('[data-transit-action]');
  if (transitBtn) {
    const act = transitBtn.dataset.transitAction;
    if (act === 'ring') engine.disembarkTransit();
    else if (act === 'next-now') engine.disembarkTransit({ immediateToNextStop: true });
    refreshUi(true);
  }
});

dom.guideList.addEventListener('click', (event) => {
  const state = engine.getState();
  if (state.mode === 'interior') {
    engine.exitVenue();
  } else if (state.mode === 'metro') {
    if (state.metro.phase === 'riding') return;
    engine.exitMetroStation({ immediate: true });
  } else if (state.mode === 'ferry') {
    if (state.ferry.phase === 'sailing') return;
    engine.exitFerryTerminal({ immediate: true });
  }
  if (event.target.closest('[data-walk-ferry]')) {
    const path = buildOverworldPath(
      engine.getState().player.x,
      engine.getState().player.y,
      FERRY_TERMINAL.spawnOutside.x,
      FERRY_TERMINAL.spawnOutside.y,
      { type: 'openFerry' }
    );
    engine.setWalkPath(path);
    setStatusBanner(`Walking along the Tagus waterfront toward ${FERRY_TERMINAL.name}...`);
    return;
  }
  const metroBtn = event.target.closest('[data-walk-metro]');
  if (metroBtn) {
    const station = METRO_STATIONS.find((s) => s.id === metroBtn.dataset.walkMetro);
    if (station) {
      const path = buildOverworldPath(
        engine.getState().player.x,
        engine.getState().player.y,
        station.spawnOutside.x,
        station.spawnOutside.y,
        { type: 'openMetro', id: station.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking along the sidewalk to ${station.name}...`);
    }
    return;
  }
  const venueBtn = event.target.closest('[data-walk-venue]');
  if (venueBtn) {
    const venue = VENUES.find((v) => v.id === venueBtn.dataset.walkVenue);
    if (venue) {
      const path = buildOverworldPath(
        engine.getState().player.x,
        engine.getState().player.y,
        venue.spawnOutside.x,
        venue.spawnOutside.y,
        { type: 'enterVenue', id: venue.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking along the sidewalk toward ${venue.name}...`);
    }
    return;
  }
  const benchBtn = event.target.closest('[data-walk-bench]');
  if (benchBtn) {
    const spot = REST_SPOTS.find((s) => s.id === benchBtn.dataset.walkBench);
    if (spot) {
      const path = buildOverworldPath(
        engine.getState().player.x,
        engine.getState().player.y,
        spot.x,
        spot.y + 22,
        { type: 'restBench', id: spot.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking toward ${spot.name}...`);
    }
    return;
  }
  const stopBtn = event.target.closest('[data-walk-stop]');
  if (stopBtn) {
    const stop = ALL_STOPS.find((s) => s.stopId === stopBtn.dataset.walkStop);
    if (stop) {
      const path = buildOverworldPath(
        engine.getState().player.x,
        engine.getState().player.y,
        stop.platformX,
        stop.platformY,
        { type: 'boardStop', id: stop.stopId }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking to ${stop.stopName} sidewalk shelter for ${stop.lineName}...`);
    }
  }
});

if (dom.mpNameInput) {
  dom.mpNameInput.addEventListener('input', () => {
    engine.setPlayerProfile({ name: dom.mpNameInput.value });
    mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
    lastLanSignature = '';
    renderMultiplayerPanel(engine.getState());
  });
}

if (dom.mpOutfitSelect) {
  dom.mpOutfitSelect.addEventListener('change', () => {
    engine.setPlayerProfile({ outfitId: dom.mpOutfitSelect.value });
    const outfit = getOutfitById(dom.mpOutfitSelect.value);
    mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
    setStatusBanner(`Changed cloth style to ${outfit.name}.`);
    lastLanSignature = '';
    renderMultiplayerPanel(engine.getState());
  });
}

if (dom.btnWave) {
  dom.btnWave.addEventListener('click', () => {
    const text = QUICK_GREETINGS[greetingIndex % QUICK_GREETINGS.length];
    greetingIndex += 1;
    engine.triggerEmote(text);
    mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
    setStatusBanner(`You waved: "${text}"`);
  });
}

if (dom.btnCopyLan) {
  dom.btnCopyLan.addEventListener('click', async () => {
    const text = dom.lanJoinUrl?.textContent || window.location.origin;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setStatusBanner(`Copied LAN join link: ${text}`);
        return;
      }
    } catch {
      // Fallback below
    }
    setStatusBanner(`Share this link on the same network: ${text}`);
  });
}

if (dom.lanPlayersList) {
  dom.lanPlayersList.addEventListener('click', (event) => {
    const peerBtn = event.target.closest('[data-walk-peer]');
    if (!peerBtn) return;
    const state = engine.getState();
    const peer = (state.remotePlayers || []).find((r) => r.id === peerBtn.dataset.walkPeer);
    if (!peer) return;

    if (state.mode === 'interior' && (peer.mode !== 'interior' || peer.currentVenueId !== state.currentVenueId)) {
      engine.exitVenue();
    } else if (state.mode === 'metro' && state.metro.phase !== 'riding') {
      engine.exitMetroStation({ immediate: true });
    }

    if (peer.mode === 'interior' && peer.currentVenueId) {
      if (engine.getState().mode === 'interior' && engine.getState().currentVenueId === peer.currentVenueId) {
        engine.setWalkTarget(peer.x, peer.y, null);
        return;
      }
      const venue = VENUES.find((v) => v.id === peer.currentVenueId);
      if (venue) {
        const path = buildOverworldPath(
          engine.getState().player.x,
          engine.getState().player.y,
          venue.spawnOutside.x,
          venue.spawnOutside.y,
          { type: 'enterVenue', id: venue.id }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking to meet ${peer.name} inside ${venue.name}...`);
      }
      return;
    }

    if (peer.mode === 'metro' && peer.metroStationId) {
      const st = METRO_STATIONS.find((s) => s.id === peer.metroStationId);
      if (st) {
        const path = buildOverworldPath(
          engine.getState().player.x,
          engine.getState().player.y,
          st.spawnOutside.x,
          st.spawnOutside.y,
          { type: 'openMetro', id: st.id }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking to meet ${peer.name} at ${st.name}...`);
      }
      return;
    }

    let targetY = peer.y;
    if (isPointInVehicleLane(peer.x, targetY)) {
      targetY = nearestValue(targetY, HORIZONTAL_SIDEWALKS);
    }
    const path = buildOverworldPath(engine.getState().player.x, engine.getState().player.y, peer.x, targetY, null);
    engine.setWalkPath(path);
    setStatusBanner(`Walking along the sidewalk to meet ${peer.name}...`);
  });
}

let lastFrameTime = performance.now();
let uiTimer = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  engine.tick(dt, getKeyboardVector());
  const state = engine.getState();

  // Trigger subtle audio transition effects & update continuous ambient soundscapes
  if (state.mode === 'interior' && (prevAudioMode !== 'interior' || prevAudioVenueId !== state.currentVenueId)) {
    soundEngine.playEffect('door');
  }
  if (state.mode === 'metro' && prevAudioMode !== 'metro') {
    soundEngine.playEffect('metro-chime');
  }
  if (state.mode === 'ferry' && state.ferry.phase === 'sailing' && prevAudioFerryPhase !== 'sailing') {
    soundEngine.playEffect('ferry-horn');
  }
  if (state.ridingVehicleId === 'tram-28e' && prevAudioRidingId !== 'tram-28e') {
    soundEngine.playEffect('tram-bell');
  }
  if (state.transitAnnouncement && state.transitAnnouncement.id !== lastAnnouncementId) {
    lastAnnouncementId = state.transitAnnouncement.id;
    soundEngine.announceNextStop(state.transitAnnouncement.stopName, {
      mode: state.transitAnnouncement.vehicleMode,
      ringBell: state.transitAnnouncement.ringBell
    });
  }
  prevAudioMode = state.mode;
  prevAudioVenueId = state.currentVenueId;
  prevAudioRidingId = state.ridingVehicleId;
  prevAudioFerryPhase = state.mode === 'ferry' ? state.ferry.phase : null;
  soundEngine.update(state);

  mpClient.syncState(engine.getNetworkSnapshot());
  const nearby = engine.getNearbyInteraction();
  renderer.render(state, nearby, dt);

  uiTimer += dt;
  if (uiTimer >= 0.12) {
    uiTimer = 0;
    refreshUi(false);
  }

  window.requestAnimationFrame(frame);
}

refreshUi(true);
mpClient.connect();
window.requestAnimationFrame(frame);
