import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createMultiplayerServer } from '../server.js';
import { MemoriesGameEngine } from '../src/engine.js';

function openSseStream(port, playerId) {
  return new Promise((resolve, reject) => {
    const events = [];
    const waiters = [];
    let buffer = '';

    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: `/api/events?playerId=${encodeURIComponent(playerId)}`
      },
      (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          buffer += chunk;
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const dataLine = raw
              .split('\n')
              .find((line) => line.startsWith('data: '));
            if (dataLine) {
              const parsed = JSON.parse(dataLine.slice(6));
              events.push(parsed);
              for (let i = waiters.length - 1; i >= 0; i -= 1) {
                if (waiters[i].predicate(parsed)) {
                  const w = waiters.splice(i, 1)[0];
                  clearTimeout(w.timer);
                  w.resolve(parsed);
                }
              }
            }
          }
        });
        resolve({
          events,
          waitFor(predicate, timeoutMs = 4000) {
            const existing = events.find(predicate);
            if (existing) return Promise.resolve(existing);
            return new Promise((resWait, rejWait) => {
              const timer = setTimeout(() => {
                rejWait(new Error('Timed out waiting for SSE event'));
              }, timeoutMs);
              waiters.push({ predicate, resolve: resWait, timer });
            });
          },
          close() {
            req.destroy();
          }
        });
      }
    );
    req.on('error', reject);
  });
}

test('LAN multiplayer server: independent movement, distinct outfits, global server clock sync, SSE broadcast, and clean disconnect', async () => {
  const srv = createMultiplayerServer({
    host: '127.0.0.1',
    port: 0,
    staleTimeoutMs: 15000,
    clockMsPerMinute: 120,
    initialMinutesOfDay: 18 * 60 + 10, // Golden Hour sky for all players
    transitTickMs: 60
  });
  const { port } = await srv.start();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Server info & static asset serving + path traversal guard + global clock snapshot
    const infoRes = await fetch(`${baseUrl}/api/info`);
    assert.equal(infoRes.status, 200);
    const info = await infoRes.json();
    assert.equal(info.multiplayer, true);
    assert.equal(info.outfits.length, 6);
    assert.ok(info.clock && info.clock.day === 1 && info.clock.minutesOfDay >= 18 * 60 + 10);

    const indexRes = await fetch(`${baseUrl}/`);
    assert.equal(indexRes.status, 200);
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes('LAN Multiplayer'));

    const traversalRes = await fetch(`${baseUrl}/%2e%2e/%2e%2e/etc/passwd`);
    assert.ok(traversalRes.status === 403 || traversalRes.status === 404);

    // 2. Two independent computers join and receive distinct spawns + distinct cloth styles
    const joinARes = await fetch(`${baseUrl}/api/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' })
    });
    const joinA = await joinARes.json();
    assert.equal(joinA.ok, true);
    assert.equal(joinA.player.name, 'Alice');

    const joinBRes = await fetch(`${baseUrl}/api/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bruno' })
    });
    const joinB = await joinBRes.json();
    assert.equal(joinB.ok, true);
    assert.equal(joinB.player.name, 'Bruno');

    assert.notEqual(joinA.player.id, joinB.player.id);
    assert.notEqual(
      joinA.player.outfitId,
      joinB.player.outfitId,
      'Joining players must automatically receive different clothing styles'
    );
    assert.notEqual(
      joinA.player.x,
      joinB.player.x,
      'Joining players should spawn at non-overlapping sidewalk positions'
    );
    assert.ok(joinA.clock && joinB.clock, 'Both players must receive the server global clock on join');
    assert.equal(joinA.clock.day, joinB.clock.day);
    assert.ok(Math.abs(joinA.clock.minutesOfDay - joinB.clock.minutesOfDay) <= 2);

    // 3. Open real-time SSE streams for both clients
    const streamA = await openSseStream(port, joinA.player.id);
    const streamB = await openSseStream(port, joinB.player.id);

    try {
      const snapA = await streamA.waitFor((evt) => evt.players?.length === 2);
      assert.equal(snapA.players.length, 2);

      // 4. Both players move independently across Lisboa and enter different venues
      await fetch(`${baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          state: {
            x: 340,
            y: 260,
            facing: 'up',
            isMoving: true,
            mode: 'interior',
            currentVenueId: 'casa-da-rosa',
            neighborhoodName: 'Bairro Alto',
            emoteText: 'Ola!'
          }
        })
      });

      const evtOnB = await streamB.waitFor((evt) => {
        const alice = evt.players?.find((p) => p.id === joinA.player.id);
        return alice && alice.mode === 'interior' && alice.currentVenueId === 'casa-da-rosa' && alice.emoteText === 'Ola!';
      });
      const aliceSeenByB = evtOnB.players.find((p) => p.id === joinA.player.id);
      assert.equal(aliceSeenByB.x, 340);
      assert.equal(aliceSeenByB.y, 260);
      assert.equal(aliceSeenByB.outfitId, joinA.player.outfitId);

      // Meanwhile Bruno moves independently to Alfama Taberna da Sardinha and changes outfit
      await fetch(`${baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinB.player.id,
          state: {
            x: 1955,
            y: 546,
            facing: 'right',
            isMoving: true,
            mode: 'overworld',
            currentVenueId: null,
            neighborhoodName: 'Alfama',
            outfitId: 'bohemian-poncho'
          }
        })
      });

      const evtOnA = await streamA.waitFor((evt) => {
        const bruno = evt.players?.find((p) => p.id === joinB.player.id);
        return bruno && bruno.x === 1955 && bruno.outfitId === 'bohemian-poncho';
      });
      const brunoSeenByA = evtOnA.players.find((p) => p.id === joinB.player.id);
      const aliceStillUnchanged = evtOnA.players.find((p) => p.id === joinA.player.id);
      assert.equal(brunoSeenByA.neighborhoodName, 'Alfama');
      assert.equal(aliceStillUnchanged.currentVenueId, 'casa-da-rosa');

      // 4b. Global Server Clock ticks forward automatically AND syncs Rest-Until-Morning sunrise across all clients
      const clockTickEvt = await streamA.waitFor(
        (evt) => evt.clock && evt.clock.minutesOfDay > joinA.clock.minutesOfDay
      );
      assert.ok(clockTickEvt.clock.minutesOfDay > joinA.clock.minutesOfDay);

      const morningRes = await fetch(`${baseUrl}/api/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: joinA.player.id, action: 'rest-morning' })
      });
      const morningJson = await morningRes.json();
      assert.equal(morningJson.ok, true);
      assert.equal(morningJson.clock.day, 2);
      assert.equal(morningJson.clock.minutesOfDay, 9 * 60);

      const morningOnB = await streamB.waitFor(
        (evt) => evt.clock && evt.clock.day === 2 && evt.clock.minutesOfDay === 9 * 60
      );
      assert.equal(morningOnB.clock.day, 2);
      assert.equal(morningOnB.clock.minutesOfDay, 9 * 60);

      // 4c. Server-Authoritative Shared Transit Sync (Tram 28E, Bus 737, Metro Linha Azul & Transtejo Ferries)
      assert.ok(joinA.transit && Array.isArray(joinA.transit.vehicles) && joinA.transit.vehicles.length === 2);
      assert.ok(joinA.transit.metro && Array.isArray(joinA.transit.ferries) && joinA.transit.ferries.length === 3);

      // Summon Tram 28E to Praca Luis de Camoes -> BOTH clients receive identical stop docking via SSE transit stream
      const summonRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'summon-surface',
          lineId: 'tram-28e',
          stopId: 'stop-tram-camoes'
        })
      });
      const summonJson = await summonRes.json();
      assert.equal(summonJson.ok, true);
      const tramAtCamoesOnB = await streamB.waitFor(
        (evt) =>
          evt.transit &&
          evt.transit.vehicles?.some((v) => v.id === 'tram-28e' && v.currentStopId === 'stop-tram-camoes')
      );
      assert.ok(tramAtCamoesOnB.transit.vehicles.some((v) => v.id === 'tram-28e' && v.currentStopId === 'stop-tram-camoes'));

      // 4c-ii. Synchronized onboard STOP bell, "Proxima Paragem" announcement & window scrollOffset for companions!
      const bellRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'ring-bell',
          lineId: 'tram-28e',
          stopName: 'Largo do Chiado',
          ringerName: 'Alice'
        })
      });
      const bellJson = await bellRes.json();
      assert.equal(bellJson.ok, true);
      assert.equal(bellJson.announcement.text, 'Proxima Paragem: Largo do Chiado');

      const bellOnB = await streamB.waitFor(
        (evt) =>
          evt.transit?.vehicles?.some(
            (v) =>
              v.id === 'tram-28e' &&
              v.stopBellRung === true &&
              v.bellAnnouncement?.text === 'Proxima Paragem: Largo do Chiado' &&
              v.bellAnnouncement?.ringerName === 'Alice'
          )
      );
      const serverTram = bellOnB.transit.vehicles.find((v) => v.id === 'tram-28e');
      assert.equal(Number.isFinite(serverTram.scrollOffset), true);

      // Verify Bruno's engine aboard Tram 28E mirrors Alice's bell announcement & identical window cityscape scroll!
      const brunoEngine = new MemoriesGameEngine();
      brunoEngine.setPlayerProfile({ name: 'Bruno' });
      brunoEngine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
      brunoEngine.syncGlobalTransit(bellOnB.transit);
      const bState = brunoEngine.getState();
      assert.equal(bState.tramScrollOffset, serverTram.scrollOffset);
      assert.ok(bState.transitAnnouncement);
      assert.equal(bState.transitAnnouncement.text, 'Proxima Paragem: Largo do Chiado');
      assert.equal(bState.transitAnnouncement.ringerName, 'Alice');
      assert.equal(bState.vehicles.find((v) => v.id === 'tram-28e').stopBellRung, true);

      // Synchronized Fado track switch across companions inside the tavern
      const fadoRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: joinA.player.id, action: 'next-fado' })
      });
      assert.equal((await fadoRes.json()).ok, true);
      const fadoOnB = await streamB.waitFor((evt) => evt.transit?.fadoTrackIndex === 1);
      assert.equal(fadoOnB.transit.fadoTrackIndex, 1);

      // Shared Metro Linha Azul departure & door-closing chime -> BOTH clients sync on tunnel ride + Atencao as portas chime
      const metroDeptRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'metro-depart',
          fromStationId: 'metro-baixa-chiado',
          toStationId: 'metro-santa-apolonia',
          triggeredBy: 'Alice'
        })
      });
      const metroDeptJson = await metroDeptRes.json();
      assert.equal(metroDeptJson.ok, true);
      assert.ok(metroDeptJson.doorChime?.text.includes('Atencao as portas'));
      const metroOnB = await streamB.waitFor(
        (evt) =>
          evt.transit?.metro?.phase === 'riding' &&
          evt.transit.metro.toStationId === 'metro-santa-apolonia' &&
          evt.transit.metro.doorChime?.triggeredBy === 'Alice'
      );
      assert.equal(metroOnB.transit.metro.fromStationId, 'metro-baixa-chiado');

      // Verify Bruno riding/waiting in Metro Baixa-Chiado receives Alice's synchronized door-closing chime!
      brunoEngine.disembarkTransit({ immediateToNextStop: true });
      brunoEngine.openMetroStation('metro-baixa-chiado');
      brunoEngine.syncGlobalTransit(metroOnB.transit);
      assert.ok(brunoEngine.getState().metroDoorChime);
      assert.equal(brunoEngine.getState().metroDoorChime.triggeredBy, 'Alice');
      assert.ok(brunoEngine.getState().metroDoorChime.text.includes('Atencao as portas'));

      // Manual Metro door-closing chime ('metro-chime') broadcasts cleanly to companions
      const manualChimeRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'metro-chime',
          fromStationId: 'metro-baixa-chiado',
          toStationId: 'metro-santa-apolonia',
          triggeredBy: 'Alice'
        })
      });
      const manualChimeJson = await manualChimeRes.json();
      assert.equal(manualChimeJson.ok, true);
      const chimeOnB = await streamB.waitFor(
        (evt) => evt.transit?.metro?.doorChime?.id === manualChimeJson.doorChime.id
      );
      brunoEngine.syncGlobalTransit(chimeOnB.transit);
      assert.equal(brunoEngine.getState().metroDoorChime.triggeredBy, 'Alice');

      // Shared Transtejo Ferry departure & foghorn signal -> BOTH clients sail together + hear synchronized ferry horn
      const ferryDeptRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'ferry-board',
          routeId: 'cacilhas',
          fromPortId: 'cais-do-sodre',
          toPortId: 'cacilhas',
          triggeredBy: 'Alice'
        })
      });
      const ferryDeptJson = await ferryDeptRes.json();
      assert.equal(ferryDeptJson.ok, true);
      assert.ok(ferryDeptJson.hornSignal?.text.includes('Transtejo Foghorn'));
      const ferryOnB = await streamB.waitFor(
        (evt) =>
          evt.transit?.ferries?.some(
            (f) =>
              f.routeId === 'cacilhas' &&
              f.phase === 'sailing' &&
              f.toPortId === 'cacilhas' &&
              f.hornSignal?.triggeredBy === 'Alice'
          )
      );
      assert.ok(
        ferryOnB.transit.ferries.some((f) => f.routeId === 'cacilhas' && f.phase === 'sailing')
      );

      // Verify Bruno at Cais do Sodre Ferry Terminal receives Alice's synchronized Transtejo foghorn blast!
      brunoEngine.exitMetroStation({ immediate: true });
      brunoEngine.openFerryTerminal();
      brunoEngine.syncGlobalTransit(ferryOnB.transit);
      assert.ok(brunoEngine.getState().ferryHornSignal);
      assert.equal(brunoEngine.getState().ferryHornSignal.triggeredBy, 'Alice');
      assert.ok(brunoEngine.getState().ferryHornSignal.text.includes('Transtejo Foghorn'));

      // Manual onboard ferry horn signal ('ferry-horn') broadcasts cleanly to companions
      const manualHornRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'ferry-horn',
          routeId: 'cacilhas',
          fromPortId: 'cais-do-sodre',
          toPortId: 'cacilhas',
          triggeredBy: 'Alice'
        })
      });
      const manualHornJson = await manualHornRes.json();
      assert.equal(manualHornJson.ok, true);
      const hornOnB = await streamB.waitFor(
        (evt) =>
          evt.transit?.ferries?.some(
            (f) => f.routeId === 'cacilhas' && f.hornSignal?.id === manualHornJson.hornSignal.id
          )
      );
      brunoEngine.syncGlobalTransit(hornOnB.transit);
      assert.equal(brunoEngine.getState().ferryHornSignal.triggeredBy, 'Alice');

      // 4c-iii. Synchronized Miradouro Street-Musician Performances & Shared Cafe Toast Emotes!
      const encoreRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'miradouro-perform',
          spotId: 'bench-chiado',
          requestedBy: 'Alice'
        })
      });
      const encoreJson = await encoreRes.json();
      assert.equal(encoreJson.ok, true);
      assert.equal(encoreJson.encore.musicianName, 'Beatriz');
      assert.equal(encoreJson.encore.songTitle, 'Rapsodia da Rua Garrett');

      const encoreOnB = await streamB.waitFor(
        (evt) =>
          evt.transit?.miradouros?.some(
            (m) => m.spotId === 'bench-chiado' && m.lastEncore?.id === encoreJson.encore.id
          )
      );
      brunoEngine.exitFerryTerminal({ immediate: true });
      brunoEngine.setPlayerPosition(956, 512);
      brunoEngine.syncGlobalTransit(encoreOnB.transit);
      assert.ok(brunoEngine.getState().miradouroEncore);
      assert.equal(brunoEngine.getState().miradouroEncore.musicianName, 'Beatriz');
      assert.equal(brunoEngine.getState().miradouroEncore.songTitle, 'Rapsodia da Rua Garrett');
      assert.equal(brunoEngine.getState().miradouroEncore.requestedBy, 'Alice');

      // Shared Cafe Toast inside Cafe A Brasileira -> Bruno inside Cafe A Brasileira automatically raises a "Saude!" toast together!
      brunoEngine.enterVenue('cafe-do-poeta');
      const toastRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'cafe-toast',
          locationKey: 'venue:cafe-do-poeta',
          locationName: 'Cafe A Brasileira',
          speakerName: 'Alice',
          itemName: 'Bica & Pastel de Nata'
        })
      });
      const toastJson = await toastRes.json();
      assert.equal(toastJson.ok, true);
      assert.ok(toastJson.cafeToast.text.includes('Saude!'));

      const toastOnB = await streamB.waitFor(
        (evt) => evt.transit?.cafeToast?.id === toastJson.cafeToast.id
      );
      brunoEngine.syncGlobalTransit(toastOnB.transit);
      assert.ok(brunoEngine.getState().sharedToast);
      assert.equal(brunoEngine.getState().sharedToast.speakerName, 'Alice');
      assert.equal(brunoEngine.getState().sharedToast.locationKey, 'venue:cafe-do-poeta');
      assert.equal(brunoEngine.getState().player.emoteText, 'Saude!');

      // 4c-iv. Synchronized Se de Lisboa (1147) Hourly Cathedral Bell-Tower Chimes & Shared Postcard Photo Snapshots!
      const bellTowerRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'cathedral-chime',
          hour: 12,
          triggeredBy: 'Se de Lisboa (1147)'
        })
      });
      const bellTowerJson = await bellTowerRes.json();
      assert.equal(bellTowerJson.ok, true);
      assert.equal(bellTowerJson.cathedralChime.clockLabel, '12:00');
      assert.equal(bellTowerJson.cathedralChime.tolls, 12);

      const cathedralOnB = await streamB.waitFor(
        (evt) => evt.transit?.cathedralChime?.id === bellTowerJson.cathedralChime.id
      );
      brunoEngine.syncGlobalTransit(cathedralOnB.transit);
      assert.ok(brunoEngine.getState().cathedralChime);
      assert.equal(brunoEngine.getState().cathedralChime.clockLabel, '12:00');
      assert.equal(brunoEngine.getState().cathedralChime.tolls, 12);

      // Shared Postcard Photo Snapshot inside Cafe A Brasileira -> Bruno receives the postcard in his album & poses with "Sorria!"
      const postcardRes = await fetch(`${baseUrl}/api/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          action: 'shared-postcard',
          locationKey: 'venue:cafe-do-poeta',
          locationName: 'Cafe A Brasileira',
          neighborhood: 'Chiado',
          photographer: 'Alice',
          companions: ['Alice', 'Bruno'],
          caption: 'Postcard from Cafe A Brasileira with Alice & Bruno'
        })
      });
      const postcardJson = await postcardRes.json();
      assert.equal(postcardJson.ok, true);
      assert.equal(postcardJson.postcard.photographer, 'Alice');

      const postcardOnB = await streamB.waitFor(
        (evt) => evt.transit?.sharedPostcard?.id === postcardJson.postcard.id
      );
      brunoEngine.syncGlobalTransit(postcardOnB.transit);
      assert.ok(brunoEngine.getState().sharedPostcard);
      assert.equal(brunoEngine.getState().sharedPostcard.photographer, 'Alice');
      assert.equal(brunoEngine.getState().postcards.length, 1);
      assert.equal(brunoEngine.getState().postcards[0].caption, 'Postcard from Cafe A Brasileira with Alice & Bruno');
      assert.equal(brunoEngine.getState().player.emoteText, 'Sorria!');

      // 4c-v. Comparative Multiplayer End-of-Stroll Scorecards sync live across LAN peers!
      await fetch(`${baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          state: {
            x: 1151,
            y: 546,
            mode: 'interior',
            currentVenueId: 'cafe-do-poeta',
            memoriesCaptured: 19,
            venuesVisited: 11,
            mealsEaten: 4,
            souvenirsBought: 3,
            transitRides: 5,
            phrasesLearned: 14,
            postcardsCaptured: 2,
            eurosRemaining: 0,
            totalScore: 2975,
            explorerRank: 'Seasoned Lisboeta Chronicler',
            gameOver: true
          }
        })
      });
      const scoreEvtOnB = await streamB.waitFor((evt) => {
        const alice = evt.players?.find((p) => p.id === joinA.player.id);
        return alice && alice.gameOver === true && alice.totalScore === 2975 && alice.memoriesCaptured === 19;
      });
      const aliceRemoteForB = scoreEvtOnB.players.filter((p) => p.id !== joinB.player.id);
      brunoEngine.setRemotePlayers(aliceRemoteForB, { snap: true });
      const brunoCard = brunoEngine.exportMemorySummaryCard({ format: 'text' });
      assert.equal(brunoCard.scorecard.multiplayerComparison.length, 2);
      assert.equal(brunoCard.scorecard.multiplayerComparison[0].name, 'Alice');
      assert.equal(brunoCard.scorecard.multiplayerComparison[0].totalScore, 2975);
      assert.ok(brunoCard.cardText.includes('#1 Alice - 2975 pts | Memories: 19/26'));

      // 4d. Server-Authoritative Ambient Villagers & Ferry-Mode Remote Players stay synchronized across clients!
      assert.ok(Array.isArray(joinA.transit.npcs) && joinA.transit.npcs.length === 6);
      const initialNpc1X = joinA.transit.npcs.find((n) => n.id === 'npc-1').x;
      const movedNpcEvt = await streamA.waitFor(
        (evt) => evt.transit?.npcs?.some((n) => n.id === 'npc-1' && n.x !== initialNpc1X)
      );
      assert.ok(movedNpcEvt.transit.npcs.length === 6);

      // Sync Alice across the Tagus in Cacilhas -> Bruno receives Alice's exact ferry port & phase!
      await fetch(`${baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinA.player.id,
          state: {
            x: 155,
            y: 186,
            facing: 'up',
            isMoving: false,
            mode: 'ferry',
            ferryPortId: 'cacilhas',
            ferryPhase: 'terminal',
            neighborhoodName: 'Cacilhas'
          }
        })
      });
      const aliceAtCacilhasOnB = await streamB.waitFor((evt) => {
        const alice = evt.players?.find((p) => p.id === joinA.player.id);
        return alice && alice.mode === 'ferry' && alice.ferryPortId === 'cacilhas' && alice.ferryPhase === 'terminal';
      });
      assert.equal(aliceAtCacilhasOnB.players.find((p) => p.id === joinA.player.id).ferryPortId, 'cacilhas');

      // 5. Bruno leaves cleanly -> Alice immediately receives 1-player roster
      await fetch(`${baseUrl}/api/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: joinB.player.id })
      });

      const afterLeave = await streamA.waitFor((evt) => evt.players?.length === 1);
      assert.equal(afterLeave.players[0].id, joinA.player.id);
    } finally {
      streamA.close();
      streamB.close();
    }
  } finally {
    await srv.stop();
  }
});
