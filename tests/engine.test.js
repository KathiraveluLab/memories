import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NEIGHBORHOODS,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  getAllTransitStops,
  getAllMemoryCatalog
} from '../src/data.js';
import {
  MemoriesGameEngine,
  INITIAL_EUROS,
  INITIAL_ENERGY,
  INITIAL_FULLNESS,
  DAY_START_MINUTES,
  OVERNIGHT_COST_EUR,
  LOW_FUND_STIPEND_AMOUNT,
  INTERIOR_STATIONS,
  isOverworldPositionValid,
  isInteriorPositionValid,
  formatClock,
  getDayPhase
} from '../src/engine.js';
import { LisboaCanvasRenderer } from '../src/renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('dataset & spatial integrity: 3 neighborhoods, 9 enterable venues, valid spawns, stops, and 16 memories', () => {
  assert.deepEqual(
    NEIGHBORHOODS.map((n) => n.id),
    ['bairro-alto', 'chiado', 'alfama']
  );
  assert.equal(VENUES.length, 9);
  assert.equal(REST_SPOTS.length, 3);
  assert.equal(TRANSIT_LINES.length, 2);
  assert.equal(getAllMemoryCatalog().length, 16);

  const venueIds = new Set(VENUES.map((v) => v.id));
  assert.equal(venueIds.size, 9);

  for (const venue of VENUES) {
    assert.ok(
      isOverworldPositionValid(venue.spawnOutside.x, venue.spawnOutside.y),
      `Venue spawnOutside collides with obstacle for ${venue.id}`
    );
    assert.ok(venue.phrase?.pt && venue.phrase?.pronunciation && venue.phrase?.en);
    assert.ok(venue.memory?.id && venue.memory?.title && venue.memory?.caption);
    assert.ok(Array.isArray(venue.items) && venue.items.length >= 2);
  }

  for (const stop of getAllTransitStops()) {
    assert.ok(
      isOverworldPositionValid(stop.platformX, stop.platformY),
      `Transit stop platform collides with obstacle for ${stop.stopId}`
    );
  }

  for (const spot of REST_SPOTS) {
    assert.ok(
      isOverworldPositionValid(spot.x, spot.y + 22),
      `Rest bench approach collides with obstacle for ${spot.id}`
    );
  }
});

test('AC-01: initial state, continuous foot walking, collision safety, and neighborhood transitions', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  assert.equal(state.mode, 'overworld');
  assert.equal(state.euros, INITIAL_EUROS);
  assert.equal(state.energy, INITIAL_ENERGY);
  assert.equal(state.fullness, INITIAL_FULLNESS);
  assert.equal(state.day, 1);
  assert.equal(state.minutesOfDay, DAY_START_MINUTES);
  assert.equal(state.currentNeighborhoodId, 'chiado');
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  // Walk west along Tram Avenue corridor from Chiado into Bairro Alto
  for (let i = 0; i < 30; i += 1) {
    engine.tick(0.1, { x: -1, y: 0 });
  }
  assert.equal(state.currentNeighborhoodId, 'bairro-alto');
  assert.ok(state.visitedNeighborhoods.includes('bairro-alto'));
  assert.ok(state.energy < INITIAL_ENERGY);
  assert.ok(state.fullness < INITIAL_FULLNESS);
  assert.ok(state.stats.distanceWalkedPx > 200);

  // Walk east all the way into Alfama
  for (let i = 0; i < 95; i += 1) {
    engine.tick(0.1, { x: 1, y: 0 });
  }
  assert.equal(state.currentNeighborhoodId, 'alfama');
  assert.ok(state.visitedNeighborhoods.includes('alfama'));
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);
});

test('AC-02: boarding Tram 28E and Carris Bus, riding between stops, disembarking, and unlocking transit memories', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  // Board Eletrico 28E at Praca Luis de Camoes
  const tramRes = engine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
  assert.equal(tramRes.ok, true);
  assert.equal(state.ridingVehicleId, 'tram-28e');
  assert.equal(state.euros, 120 - 3.1);
  assert.equal(state.stats.tramRides, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-ride-tram-28e'));

  // Advance simulation while riding until tram moves away from stop, then ring bell and arrive at next stop
  const startX = state.player.x;
  for (let i = 0; i < 40; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  assert.notEqual(state.player.x, startX);

  const disembarkRes = engine.disembarkTransit({ immediateToNextStop: true });
  assert.equal(disembarkRes.ok, true);
  assert.equal(disembarkRes.alighted, true);
  assert.equal(state.ridingVehicleId, null);
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  // Now board Carris Bus 737 / 758
  const busRes = engine.boardTransitAtStop('stop-bus-santa-luzia', { waitIfApproaching: true });
  assert.equal(busRes.ok, true);
  assert.equal(state.ridingVehicleId, 'bus-737-758');
  assert.equal(state.stats.busRides, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-ride-carris-bus'));

  const busExit = engine.disembarkTransit({ immediateToNextStop: true });
  assert.equal(busExit.ok, true);
  assert.equal(state.ridingVehicleId, null);
});

test('AC-03 & AC-04: entering shops and restaurants, walking interiors, eating, buying souvenirs, and exiting cleanly', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  // Drain some energy and fullness first
  state.energy = 50;
  state.fullness = 40;

  // Enter Cafe do Poeta in Chiado
  const enterRes = engine.enterVenue('cafe-do-poeta');
  assert.equal(enterRes.ok, true);
  assert.equal(state.mode, 'interior');
  assert.equal(state.currentVenueId, 'cafe-do-poeta');
  assert.equal(isInteriorPositionValid(state.player.x, state.player.y), true);
  assert.ok(state.memories.some((m) => m.id === 'mem-cafe-do-poeta'));
  assert.ok(state.learnedPhrases.some((p) => p.source === 'Cafe do Poeta'));

  // Walk inside the cafe toward counter
  const yBefore = state.player.y;
  for (let i = 0; i < 8; i += 1) {
    engine.tick(0.1, { x: 0, y: -1 });
  }
  assert.ok(state.player.y < yBefore);
  assert.equal(isInteriorPositionValid(state.player.x, state.player.y), true);

  // Order Bica & Pastel de Nata
  const eurosBefore = state.euros;
  const orderRes = engine.purchaseVenueItem('item-bica-nata');
  assert.equal(orderRes.ok, true);
  assert.equal(state.euros, Math.round((eurosBefore - 3.5) * 100) / 100);
  assert.equal(state.fullness, 62);
  assert.equal(state.energy, 80);
  assert.equal(state.stats.mealsEaten, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-milestone-taste'));

  // Exit back onto Chiado street
  const exitRes = engine.exitVenue();
  assert.equal(exitRes.ok, true);
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentVenueId, null);
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  // Enter Oficina de Azulejos in Alfama and buy a souvenir
  assert.equal(engine.enterVenue('oficina-azulejos').ok, true);
  const buyRes = engine.purchaseVenueItem('item-azulejo-coaster');
  assert.equal(buyRes.ok, true);
  assert.equal(state.satchel.length, 1);
  assert.equal(state.satchel[0].name, 'Cobalt Azulejo Tile');
  assert.ok(state.memories.some((m) => m.id === 'mem-milestone-keepsake'));
  assert.ok(state.memories.some((m) => m.id === 'mem-oficina-azulejos'));
  assert.equal(engine.exitVenue().ok, true);
});

test('AC-05: gentle non-punitive loop (miradouro free rest, overnight refresh, low-fund stipend, and full 16-memory completion)', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  // Free bench rest restores energy and unlocks viewpoint memory
  state.energy = 35;
  const benchRes = engine.restAtBench('bench-bairro-alto');
  assert.equal(benchRes.ok, true);
  assert.equal(state.energy, 65);
  assert.ok(state.memories.some((m) => m.id === 'mem-view-sao-pedro'));

  // Overnight rest with low funds never traps the player and provides gentle stipend
  state.euros = 5.0;
  state.energy = 10;
  state.fullness = 20;
  state.minutesOfDay = 22 * 60;
  assert.equal(getDayPhase(state.minutesOfDay).id, 'evening');
  assert.equal(formatClock(state.minutesOfDay), '22:00');

  const nightRes = engine.restOvernight();
  assert.equal(nightRes.ok, true);
  assert.equal(state.day, 2);
  assert.equal(state.minutesOfDay, DAY_START_MINUTES);
  assert.equal(state.energy, 100);
  assert.equal(state.fullness, 75);
  assert.equal(nightRes.paidEur, 0);
  assert.equal(nightRes.stipendAdded, LOW_FUND_STIPEND_AMOUNT);
  assert.equal(state.euros, 5.0 + LOW_FUND_STIPEND_AMOUNT);

  // Overnight rest with ample funds pays normal pensao rate
  state.euros = 80.0;
  const paidNight = engine.restOvernight();
  assert.equal(paidNight.paidEur, OVERNIGHT_COST_EUR);
  assert.equal(state.euros, 80.0 - OVERNIGHT_COST_EUR);

  // Collecting all 16 memories marks albumCompleted = true
  for (const venue of VENUES) {
    engine.enterVenue(venue.id);
    if (venue.id === 'cafe-do-poeta') engine.purchaseVenueItem('item-bica-nata');
    if (venue.id === 'oficina-azulejos') engine.purchaseVenueItem('item-azulejo-coaster');
    engine.exitVenue();
  }
  for (const spot of REST_SPOTS) {
    engine.restAtBench(spot.id);
  }
  engine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
  engine.disembarkTransit({ immediateToNextStop: true });
  engine.boardTransitAtStop('stop-bus-garrett', { waitIfApproaching: true });
  engine.disembarkTransit({ immediateToNextStop: true });

  assert.equal(state.memories.length, 16);
  assert.equal(state.albumCompleted, true);
});

test('renderer smoke test: renders overworld phases, live vehicles, and all 9 venue interiors cleanly', () => {
  const noop = () => {};
  const mockGradient = { addColorStop: noop };
  let drawCalls = 0;
  const mockCtx = {
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    clearRect: () => { drawCalls += 1; },
    fillRect: () => { drawCalls += 1; },
    strokeRect: () => { drawCalls += 1; },
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    quadraticCurveTo: noop,
    arc: noop,
    ellipse: noop,
    fill: () => { drawCalls += 1; },
    stroke: () => { drawCalls += 1; },
    fillText: () => { drawCalls += 1; },
    measureText: (txt) => ({ width: String(txt).length * 7 }),
    setLineDash: noop,
    createLinearGradient: () => mockGradient,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    globalAlpha: 1
  };
  const mockCanvas = {
    width: 920,
    height: 560,
    getContext: () => mockCtx
  };

  assert.equal(isInteriorPositionValid(INTERIOR_STATIONS.counter.x, INTERIOR_STATIONS.counter.y), true);
  assert.equal(isInteriorPositionValid(INTERIOR_STATIONS.display.x, INTERIOR_STATIONS.display.y), true);

  const engine = new MemoriesGameEngine();
  const renderer = new LisboaCanvasRenderer(mockCanvas);

  // Render all 4 time-of-day phases on overworld
  for (const mins of [9 * 60, 14 * 60, 18 * 60, 21 * 60]) {
    engine.getState().minutesOfDay = mins;
    engine.tick(0.1, { x: 1, y: 0 });
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  }

  // Render riding tram and bus
  engine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.disembarkTransit({ immediateToNextStop: true });

  // Render every venue interior
  for (const venue of VENUES) {
    engine.enterVenue(venue.id);
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
    engine.exitVenue();
  }

  assert.ok(drawCalls > 500, `Expected substantial canvas draw calls, got ${drawCalls}`);
});

test('compliance check: no emojis, no license mentions, and no prohibited internal naming', () => {
  const filesToCheck = [
    'package.json',
    'README.md',
    'index.html',
    'styles.css',
    path.join('src', 'data.js'),
    path.join('src', 'engine.js'),
    path.join('src', 'renderer.js'),
    path.join('src', 'app.js'),
    path.join('tests', 'engine.test.js')
  ];

  const emojiRegex = /\p{Extended_Pictographic}/u;
  const forbiddenTerms = [
    /\bbmad\b/i,
    /\blicense\b/i,
    /\bpowerhouse\b/i,
    /\bbairavaa\b/i,
    /\bbagavathi\b/i,
    /\bvillu\b/i,
    /\bbadri\b/i,
    /\baathi\b/i,
    /\bdeva\b/i,
    /\bpuli\b/i,
    /\bselva\b/i,
    /\bsivakasi\b/i,
    /\bthirumalai\b/i,
    /\btheri\b/i,
    /\budhaya\b/i,
    /\bbigil\b/i,
    /\bpokkiri\b/i,
    /\bthiruppachi\b/i,
    /\bvelayutham\b/i,
    /\bvaseegara\b/i,
    /\bsenthurapandi\b/i,
    /\bshahjahan\b/i,
    /\bmadurey\b/i
  ];

  for (const relPath of filesToCheck) {
    const absPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(absPath, 'utf8');
    assert.equal(
      emojiRegex.test(content),
      false,
      `Found prohibited emoji character in ${relPath}`
    );

    if (relPath !== path.join('tests', 'engine.test.js')) {
      for (const pattern of forbiddenTerms) {
        assert.equal(
          pattern.test(content),
          false,
          `Found prohibited term matching ${pattern} in ${relPath}`
        );
      }
    }
  }
});
