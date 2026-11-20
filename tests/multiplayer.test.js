import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createMultiplayerServer } from '../server.js';

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
    initialMinutesOfDay: 18 * 60 + 10 // Golden Hour sky for all players
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
      const snapA = await streamA.waitFor((evt) => evt.players.length === 2);
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
        const alice = evt.players.find((p) => p.id === joinA.player.id);
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
        const bruno = evt.players.find((p) => p.id === joinB.player.id);
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

      // 5. Bruno leaves cleanly -> Alice immediately receives 1-player roster
      await fetch(`${baseUrl}/api/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: joinB.player.id })
      });

      const afterLeave = await streamA.waitFor((evt) => evt.players.length === 1);
      assert.equal(afterLeave.players[0].id, joinA.player.id);
    } finally {
      streamA.close();
      streamB.close();
    }
  } finally {
    await srv.stop();
  }
});
