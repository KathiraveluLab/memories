import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NEIGHBORHOODS,
  DECORATIVE_STRUCTURES,
  METRO_LINE,
  METRO_STATIONS,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  AMBIENT_NPCS,
  PLAYER_OUTFITS,
  MULTIPLAYER_SPAWN_POINTS,
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
  PLAYER_RADIUS,
  PERSON_SEPARATION_DIST,
  isOverworldPositionValid,
  isInteriorPositionValid,
  isPointInVehicleLane,
  pointIntersectsVehicle,
  formatClock,
  getDayPhase
} from '../src/engine.js';
import { LisboaCanvasRenderer } from '../src/renderer.js';
import { computeSoundscapeProfile, LisboaSoundEngine } from '../src/audio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('dataset & spatial integrity: all 15 buildings enterable, 3 real Metro stations, valid sidewalk spawns, and 23 memories', () => {
  assert.deepEqual(
    NEIGHBORHOODS.map((n) => n.id),
    ['bairro-alto', 'chiado', 'alfama']
  );
  // Every single building on the map is enterable; only the outdoor Camoes bronze monument is non-enterable
  assert.equal(
    DECORATIVE_STRUCTURES.every((s) => s.style === 'monument'),
    true,
    'Every building on the map must be in VENUES so players can enter and explore it'
  );
  assert.equal(VENUES.length, 15);
  assert.ok(VENUES.some((v) => v.id === 'se-de-lisboa'), 'Se de Lisboa must be an enterable venue');
  assert.equal(METRO_STATIONS.length, 3);
  assert.equal(REST_SPOTS.length, 3);
  assert.equal(TRANSIT_LINES.length, 2);
  assert.equal(getAllMemoryCatalog().length, 23);

  // Authentic Lisbon geography: no Metro station inside hilltop Bairro Alto
  assert.equal(
    METRO_STATIONS.some((s) => s.neighborhood === 'bairro-alto'),
    false,
    'Bairro Alto should accurately have no underground Metro station inside its hilltop grid'
  );

  for (const station of METRO_STATIONS) {
    assert.ok(
      isOverworldPositionValid(station.spawnOutside.x, station.spawnOutside.y),
      `Metro spawnOutside collides with obstacle for ${station.id}`
    );
    assert.equal(
      isPointInVehicleLane(station.spawnOutside.x, station.spawnOutside.y),
      false,
      `Metro spawnOutside should sit safely on the sidewalk for ${station.id}`
    );
  }

  const allStaffNames = new Set();
  for (const venue of VENUES) {
    assert.ok(
      isOverworldPositionValid(venue.spawnOutside.x, venue.spawnOutside.y),
      `Venue spawnOutside collides with obstacle for ${venue.id}`
    );
    assert.equal(
      isPointInVehicleLane(venue.spawnOutside.x, venue.spawnOutside.y),
      false,
      `Venue spawnOutside should sit safely on the sidewalk for ${venue.id}`
    );
    assert.ok(venue.proprietor && venue.proprietorRole, `Venue ${venue.id} must have a named person in charge`);
    assert.equal(allStaffNames.has(venue.proprietor), false, `Duplicate staff name: ${venue.proprietor}`);
    allStaffNames.add(venue.proprietor);
    if (venue.cashierName) {
      assert.ok(venue.cashierRole, `Venue ${venue.id} cashier must have a role`);
      assert.equal(allStaffNames.has(venue.cashierName), false, `Duplicate cashier name: ${venue.cashierName}`);
      allStaffNames.add(venue.cashierName);
    }
    assert.ok(venue.phrase?.pt && venue.phrase?.pronunciation && venue.phrase?.en);
    assert.ok(venue.memory?.id && venue.memory?.title && venue.memory?.caption);
    assert.ok(Array.isArray(venue.items) && venue.items.length >= 2);
  }

  // Verify bakeries stock breads & pastries and have a dedicated cashier
  const bakery = VENUES.find((v) => v.id === 'casa-da-rosa');
  assert.equal(bakery.interiorTheme.layout, 'bakery');
  assert.ok(bakery.cashierName, 'Casa da Rosa bakery should have a dedicated cashier');
  assert.ok(bakery.items.length >= 4, 'Casa da Rosa bakery should stock breads and pastries');
  assert.ok(bakery.items.some((i) => i.name.includes('Pao de Mafra')));
  assert.ok(bakery.items.some((i) => i.name.includes('Pastel de Nata')));

  const confeitaria = VENUES.find((v) => v.id === 'arcadas-chiado');
  assert.equal(confeitaria.interiorTheme.layout, 'bakery');
  assert.ok(confeitaria.cashierName, 'Arcadas do Chiado confeitaria should have a dedicated cashier');
  assert.ok(confeitaria.items.length >= 3);

  // Verify restaurants stock full Portuguese meals and have a dedicated cashier
  for (const restId of ['tasca-do-fado', 'taberna-sardinha']) {
    const rest = VENUES.find((v) => v.id === restId);
    assert.equal(rest.interiorTheme.layout, 'restaurant');
    assert.ok(rest.cashierName, `Restaurant ${restId} should have a dedicated cashier`);
    const foodItems = rest.items.filter((i) => i.kind === 'food');
    assert.ok(foodItems.length >= 4, `Restaurant ${restId} should serve at least 4 food dishes`);
  }

  for (const stop of getAllTransitStops()) {
    assert.ok(
      isOverworldPositionValid(stop.platformX, stop.platformY),
      `Transit stop platform collides with obstacle for ${stop.stopId}`
    );
    assert.equal(
      isPointInVehicleLane(stop.platformX, stop.platformY),
      false,
      `Transit stop platform should sit safely on the sidewalk for ${stop.stopId}`
    );
  }

  for (const spot of REST_SPOTS) {
    assert.ok(
      isOverworldPositionValid(spot.x, spot.y + 22),
      `Rest bench approach collides with obstacle for ${spot.id}`
    );
  }

  // All multiplayer spawn points sit safely on the sidewalk off vehicle lanes and do not overlap
  assert.ok(PLAYER_OUTFITS.length >= 6, 'Expected at least 6 distinct traveler cloth styles');
  const outfitIds = new Set(PLAYER_OUTFITS.map((o) => o.id));
  const styleTypes = new Set(PLAYER_OUTFITS.map((o) => o.styleType));
  assert.equal(outfitIds.size, PLAYER_OUTFITS.length, 'Outfit IDs must be unique');
  assert.equal(styleTypes.size, PLAYER_OUTFITS.length, 'Each outfit must have a distinct cloth silhouette styleType');
  assert.ok(MULTIPLAYER_SPAWN_POINTS.length >= 6);
  for (let i = 0; i < MULTIPLAYER_SPAWN_POINTS.length; i += 1) {
    const pt = MULTIPLAYER_SPAWN_POINTS[i];
    assert.equal(isOverworldPositionValid(pt.x, pt.y), true, `Spawn ${i} invalid`);
    assert.equal(isPointInVehicleLane(pt.x, pt.y), false, `Spawn ${i} inside vehicle lane`);
    for (let j = i + 1; j < MULTIPLAYER_SPAWN_POINTS.length; j += 1) {
      const other = MULTIPLAYER_SPAWN_POINTS[j];
      const d = Math.hypot(pt.x - other.x, pt.y - other.y);
      assert.ok(d >= PERSON_SEPARATION_DIST, `Spawn points ${i} and ${j} too close: ${d}`);
    }
  }

  // All ambient Lisbon locals patrol strictly off vehicle lanes
  for (const npc of AMBIENT_NPCS) {
    assert.equal(isPointInVehicleLane(npc.x, npc.y), false, `NPC ${npc.id} spawns in vehicle lane`);
    const p1 = npc.patrolAxis === 'x' ? [npc.min, npc.y] : [npc.x, npc.min];
    const p2 = npc.patrolAxis === 'x' ? [npc.max, npc.y] : [npc.x, npc.max];
    assert.equal(isPointInVehicleLane(p1[0], p1[1]), false, `NPC ${npc.id} patrol min enters vehicle lane`);
    assert.equal(isPointInVehicleLane(p2[0], p2[1]), false, `NPC ${npc.id} patrol max enters vehicle lane`);
  }
});

test('AC-01: initial state, continuous sidewalk walking, collision safety, and neighborhood transitions', () => {
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
  assert.equal(isPointInVehicleLane(state.player.x, state.player.y), false);

  // Walk west along the north sidewalk of Tram Avenue from Chiado into Bairro Alto
  for (let i = 0; i < 30; i += 1) {
    engine.tick(0.1, { x: -1, y: 0 });
  }
  assert.equal(state.currentNeighborhoodId, 'bairro-alto');
  assert.ok(state.visitedNeighborhoods.includes('bairro-alto'));
  assert.ok(state.energy < INITIAL_ENERGY);
  assert.ok(state.fullness < INITIAL_FULLNESS);
  assert.ok(state.stats.distanceWalkedPx > 200);

  // Walk east along the sidewalk all the way into Alfama
  for (let i = 0; i < 95; i += 1) {
    engine.tick(0.1, { x: 1, y: 0 });
  }
  assert.equal(state.currentNeighborhoodId, 'alfama');
  assert.ok(state.visitedNeighborhoods.includes('alfama'));
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);
});

test('AC-02: boarding Tram 28E and Carris Bus, riding between stops, disembarking onto sidewalks, and transit memories', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  const tramRes = engine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
  assert.equal(tramRes.ok, true);
  assert.equal(state.ridingVehicleId, 'tram-28e');
  assert.equal(state.euros, 120 - 3.1);
  assert.equal(state.stats.tramRides, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-ride-tram-28e'));

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
  assert.equal(isPointInVehicleLane(state.player.x, state.player.y), false);

  const busRes = engine.boardTransitAtStop('stop-bus-santa-luzia', { waitIfApproaching: true });
  assert.equal(busRes.ok, true);
  assert.equal(state.ridingVehicleId, 'bus-737-758');
  assert.equal(state.stats.busRides, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-ride-carris-bus'));

  const busExit = engine.disembarkTransit({ immediateToNextStop: true });
  assert.equal(busExit.ok, true);
  assert.equal(state.ridingVehicleId, null);
  assert.equal(isPointInVehicleLane(state.player.x, state.player.y), false);
});

test('AC-03 & AC-04: entering Cafe A Brasileira & shops, walking interiors, eating, buying souvenirs, and exiting cleanly', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  state.energy = 50;
  state.fullness = 40;

  const enterRes = engine.enterVenue('cafe-do-poeta');
  assert.equal(enterRes.ok, true);
  assert.equal(enterRes.venue.name, 'Cafe A Brasileira');
  assert.equal(state.mode, 'interior');
  assert.equal(state.currentVenueId, 'cafe-do-poeta');
  assert.equal(isInteriorPositionValid(state.player.x, state.player.y), true);
  assert.ok(state.memories.some((m) => m.id === 'mem-cafe-do-poeta'));
  assert.ok(state.learnedPhrases.some((p) => p.source === 'Cafe A Brasileira'));

  const yBefore = state.player.y;
  for (let i = 0; i < 8; i += 1) {
    engine.tick(0.1, { x: 0, y: -1 });
  }
  assert.ok(state.player.y < yBefore);
  assert.equal(isInteriorPositionValid(state.player.x, state.player.y), true);

  const eurosBefore = state.euros;
  const orderRes = engine.purchaseVenueItem('item-bica-nata');
  assert.equal(orderRes.ok, true);
  assert.equal(state.euros, Math.round((eurosBefore - 3.5) * 100) / 100);
  assert.equal(state.fullness, 62);
  assert.equal(state.energy, 80);
  assert.equal(state.stats.mealsEaten, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-milestone-taste'));

  const exitRes = engine.exitVenue();
  assert.equal(exitRes.ok, true);
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentVenueId, null);
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  assert.equal(engine.enterVenue('oficina-azulejos').ok, true);
  const buyRes = engine.purchaseVenueItem('item-azulejo-coaster');
  assert.equal(buyRes.ok, true);
  assert.equal(state.satchel.length, 1);
  assert.equal(state.satchel[0].name, 'Cobalt Azulejo Tile');
  assert.ok(state.memories.some((m) => m.id === 'mem-milestone-keepsake'));
  assert.ok(state.memories.some((m) => m.id === 'mem-oficina-azulejos'));
  assert.equal(engine.exitVenue().ok, true);

  // Enter Se de Lisboa (1147 Cathedral), acquire Cloister pass, and exit cleanly
  const seRes = engine.enterVenue('se-de-lisboa');
  assert.equal(seRes.ok, true);
  assert.equal(seRes.venue.name, 'Se de Lisboa');
  assert.equal(state.mode, 'interior');
  assert.ok(state.memories.some((m) => m.id === 'mem-se-de-lisboa'));
  assert.ok(state.learnedPhrases.some((p) => p.source === 'Se de Lisboa'));
  assert.equal(engine.purchaseVenueItem('item-se-cloister-pass').ok, true);
  assert.equal(engine.exitVenue().ok, true);
  assert.equal(isPointInVehicleLane(state.player.x, state.player.y), false);
});

test('AC-05 & AC-06: non-teleporting Metro descent, underground ride, ascent, gentle loop, and 23-memory completion', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  // Step 1: Descend escalators into Metro Baixa-Chiado (does NOT teleport)
  const openRes = engine.openMetroStation('metro-baixa-chiado');
  assert.equal(openRes.ok, true);
  assert.equal(state.mode, 'metro');
  assert.equal(state.metro.phase, 'descending');
  assert.equal(state.activeMetroStationId, 'metro-baixa-chiado');

  // Tick escalator descent smoothly to the underground platform
  for (let i = 0; i < 15; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.stationId, 'metro-baixa-chiado');

  // Step 2: Board Metro Linha Azul to Santa Apolonia -> enters animated underground 'riding' phase (NOT instant teleport)
  const eurosBeforeMetro = state.euros;
  const metroRes = engine.rideMetro('metro-baixa-chiado', 'metro-santa-apolonia');
  assert.equal(metroRes.ok, true);
  assert.equal(state.mode, 'metro');
  assert.equal(state.metro.phase, 'riding');
  assert.equal(state.metro.fromStationId, 'metro-baixa-chiado');
  assert.equal(state.metro.toStationId, 'metro-santa-apolonia');
  assert.equal(state.euros, Math.round((eurosBeforeMetro - METRO_LINE.fareEur) * 100) / 100);
  assert.equal(state.stats.metroRides, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-ride-metro-lisboa'));
  assert.ok(state.learnedPhrases.some((p) => p.source === METRO_LINE.name));

  // Mid-ride check: still traveling underground through the tunnel
  for (let i = 0; i < 20; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  assert.equal(state.metro.phase, 'riding');
  assert.ok(state.metro.phaseProgress > 0.3 && state.metro.phaseProgress < 0.85);

  // Finish underground tunnel ride -> arrives smoothly at Santa Apolonia platform
  for (let i = 0; i < 30; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  assert.equal(state.mode, 'metro');
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.stationId, 'metro-santa-apolonia');

  // Step 3: Take escalator back up to sunlit Alfama sidewalk
  const exitMetroRes = engine.exitMetroStation();
  assert.equal(exitMetroRes.ok, true);
  assert.equal(state.metro.phase, 'ascending');
  for (let i = 0; i < 15; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentNeighborhoodId, 'alfama');
  assert.equal(isPointInVehicleLane(state.player.x, state.player.y), false);

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

  state.euros = 80.0;
  const paidNight = engine.restOvernight();
  assert.equal(paidNight.paidEur, OVERNIGHT_COST_EUR);
  assert.equal(state.euros, 80.0 - OVERNIGHT_COST_EUR);

  // Collecting all 23 memories marks albumCompleted = true
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

  assert.equal(state.memories.length, 23);
  assert.equal(state.albumCompleted, true);
});

test('AC-08: directional arrow-key doorway entry for south/north buildings and Metro entrances, plus exit cooldown', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  // 1. Walk UP into south-facing Cafe A Brasileira doorway
  const brasileira = VENUES.find((v) => v.id === 'cafe-do-poeta');
  state.player.x = brasileira.doorX;
  state.player.y = brasileira.doorY + 20;
  engine.tick(0.05, { x: 0, y: -1 });
  assert.equal(state.mode, 'interior');
  assert.equal(state.currentVenueId, 'cafe-do-poeta');
  engine.exitVenue();
  assert.equal(state.mode, 'overworld');

  // Advance past exit cooldown
  for (let i = 0; i < 8; i += 1) engine.tick(0.1, { x: 0, y: 0 });

  // 2. Walk DOWN into north-facing Arcadas do Chiado doorway
  const arcadas = VENUES.find((v) => v.id === 'arcadas-chiado');
  state.player.x = arcadas.doorX;
  state.player.y = arcadas.doorY - 20;
  engine.tick(0.05, { x: 0, y: 1 });
  assert.equal(state.mode, 'interior');
  assert.equal(state.currentVenueId, 'arcadas-chiado');

  // Exiting north-facing building sets cooldown so holding Down briefly does NOT bounce player right back inside
  engine.exitVenue();
  assert.equal(state.mode, 'overworld');
  engine.tick(0.05, { x: 0, y: 1 });
  assert.equal(state.mode, 'overworld');

  // Advance past cooldown, then walk UP into Metro Baixa-Chiado entrance
  for (let i = 0; i < 8; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  const metro = METRO_STATIONS.find((s) => s.id === 'metro-baixa-chiado');
  state.player.x = metro.doorX;
  state.player.y = metro.doorY + 20;
  engine.tick(0.05, { x: 0, y: -1 });
  assert.equal(state.mode, 'metro');
  assert.equal(state.metro.phase, 'descending');
  assert.equal(state.metro.stationId, 'metro-baixa-chiado');
});

test('AC-07: pedestrian & vehicle collision safety (no walking into vehicles, vehicles yield without crashing, no person overlap)', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  const tram = state.vehicles.find((v) => v.mode === 'tram');
  assert.ok(tram);

  // Case 1: Player cannot walk downward into a stopped/passing Tram 28E
  tram.x = 960;
  tram.y = 610;
  tram.heading = 0;
  tram.dwellRemaining = 0;
  state.player.x = 960;
  state.player.y = 572; // Just above tram top edge (610 - 17 - 13 - 4 = 576)

  for (let i = 0; i < 15; i += 1) {
    engine.tick(0.05, { x: 0, y: 1 });
  }
  assert.equal(
    pointIntersectsVehicle(state.player.x, state.player.y, PLAYER_RADIUS, tram),
    false,
    'Player must never walk into a vehicle hitbox'
  );

  // Case 2: Tram yields and brakes smoothly when player stands ahead on the rails (never crashes into passenger)
  tram.x = 1000;
  tram.y = 610;
  tram.heading = 0;
  tram.direction = 1;
  tram.waypointIndex = 1; // Heading east toward x=1384
  tram.dwellRemaining = 0;

  state.player.x = 1068;
  state.player.y = 610;

  const tramXBefore = tram.x;
  for (let i = 0; i < 15; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  assert.equal(tram.yielding, true, 'Tram should engage safety yield brake when pedestrian is ahead');
  assert.equal(tram.x, tramXBefore, 'Yielding tram must not advance into the pedestrian');
  assert.equal(pointIntersectsVehicle(state.player.x, state.player.y, PLAYER_RADIUS, tram), false);

  // Once pedestrian steps clear onto the sidewalk, tram resumes cleanly
  state.player.y = 546;
  engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(tram.yielding, false);
  assert.ok(tram.x > tramXBefore, 'Tram should resume moving once pedestrian clears the track');

  // Case 3: Player and ambient Lisbon pedestrians cannot overlap / walk through each other
  const npc = state.npcs[0];
  state.player.x = npc.x;
  state.player.y = npc.y + PERSON_SEPARATION_DIST + 4;
  for (let i = 0; i < 20; i += 1) {
    engine.tick(0.05, { x: 0, y: -1 });
  }
  const sep = Math.hypot(state.player.x - npc.x, state.player.y - npc.y);
  assert.ok(sep >= PERSON_SEPARATION_DIST - 0.5, `Expected person separation >= ${PERSON_SEPARATION_DIST}, got ${sep}`);

  // Case 4: Multiplayer peer separation (cannot clip through connected peer, yet can step away) & tram yields for peer
  engine.setRemotePlayers([
    {
      id: 'peer-2',
      slot: 2,
      name: 'Traveler 2',
      outfitId: 'alfama-dress',
      x: 984,
      y: 544,
      facing: 'left',
      walkPhase: 0,
      isMoving: false,
      mode: 'overworld',
      currentVenueId: null,
      metroStationId: null,
      metroPhase: null,
      ridingVehicleId: null,
      neighborhoodName: 'Chiado',
      emoteText: 'Ola!'
    }
  ]);
  state.player.x = 950;
  state.player.y = 544;
  for (let i = 0; i < 20; i += 1) {
    engine.tick(0.05, { x: 1, y: 0 });
  }
  const peerSep = Math.hypot(state.player.x - 984, state.player.y - 544);
  assert.ok(peerSep >= PERSON_SEPARATION_DIST - 0.5, `Expected peer separation >= ${PERSON_SEPARATION_DIST}, got ${peerSep}`);

  // Tram yields when remote peer walks on rails ahead of tram
  tram.x = 1000;
  tram.y = 610;
  tram.heading = 0;
  tram.direction = 1;
  tram.waypointIndex = 1;
  tram.dwellRemaining = 0;
  state.player.x = 500;
  state.player.y = 544;
  engine.setRemotePlayers([
    {
      id: 'peer-2',
      slot: 2,
      name: 'Traveler 2',
      outfitId: 'alfama-dress',
      x: 1068,
      y: 610,
      facing: 'down',
      walkPhase: 0,
      isMoving: false,
      mode: 'overworld',
      currentVenueId: null,
      metroStationId: null,
      metroPhase: null,
      ridingVehicleId: null,
      neighborhoodName: 'Chiado',
      emoteText: ''
    }
  ]);
  engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(tram.yielding, true, 'Tram should yield for remote multiplayer traveler on rails');
});

test('renderer smoke test: renders overworld phases, Metro stations, yielding vehicles, and all 15 venue interiors cleanly', () => {
  const noop = () => { };
  const mockGradient = { addColorStop: noop };
  let drawCalls = 0;
  const mockCtx = {
    save: noop,
    restore: noop,
    clip: noop,
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
    rect: noop,
    fill: () => { drawCalls += 1; },
    stroke: () => { drawCalls += 1; },
    fillText: () => { drawCalls += 1; },
    measureText: (txt) => ({ width: String(txt).length * 7 }),
    setLineDash: noop,
    createLinearGradient: () => mockGradient,
    createRadialGradient: () => mockGradient,
    createPattern: () => ({}),
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

  for (const mins of [9 * 60, 14 * 60, 18 * 60, 21 * 60]) {
    engine.getState().minutesOfDay = mins;
    engine.tick(0.1, { x: 1, y: 0 });
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  }

  engine.getState().vehicles[0].yielding = true;
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.getState().vehicles[0].yielding = false;

  engine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.disembarkTransit({ immediateToNextStop: true });

  // Render full underground Metro experience (escalator descent, platform, tunnel ride, ascent)
  engine.openMetroStation('metro-baixa-chiado');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  for (let i = 0; i < 12; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.rideMetro('metro-baixa-chiado', 'metro-santa-apolonia');
  for (let i = 0; i < 22; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  for (let i = 0; i < 28; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  engine.exitMetroStation();
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  for (let i = 0; i < 12; i += 1) engine.tick(0.1, { x: 0, y: 0 });

  // Render all 6 distinct traveler cloth styles + remote multiplayer peers across overworld, transit, Metro, and shared interior
  engine.setRemotePlayers(
    PLAYER_OUTFITS.slice(1).map((outfit, idx) => ({
      id: `peer-${idx + 2}`,
      slot: idx + 2,
      name: `Traveler ${idx + 2}`,
      outfitId: outfit.id,
      x: 984 + idx * 34,
      y: 544,
      facing: 'down',
      walkPhase: 0.4,
      isMoving: true,
      mode: 'overworld',
      currentVenueId: null,
      metroStationId: null,
      metroPhase: null,
      ridingVehicleId: idx === 4 ? 'tram-28e' : null,
      neighborhoodName: 'Chiado',
      emoteText: idx === 0 ? 'Ola!' : ''
    }))
  );
  for (const outfit of PLAYER_OUTFITS) {
    engine.setPlayerProfile({ outfitId: outfit.id });
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  }
  engine.setPlayerProfile({ outfitId: PLAYER_OUTFITS[0].id });

  for (const venue of VENUES) {
    engine.enterVenue(venue.id);
    if (venue.id === 'casa-da-rosa') {
      engine.setRemotePlayers([
        {
          id: 'peer-bakery',
          slot: 2,
          name: 'Traveler 2',
          outfitId: 'alfama-dress',
          x: 440,
          y: 260,
          facing: 'up',
          walkPhase: 0,
          isMoving: false,
          mode: 'interior',
          currentVenueId: 'casa-da-rosa',
          metroStationId: null,
          metroPhase: null,
          ridingVehicleId: null,
          neighborhoodName: 'Bairro Alto',
          emoteText: 'Bom dia!'
        }
      ]);
    }
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
    engine.exitVenue();
  }

  assert.ok(drawCalls > 600, `Expected substantial canvas draw calls, got ${drawCalls}`);
});

test('AC-09: location-specific soundscapes (bakery oven, Fado, sardine grill, espresso cafe, Metro rumble, Cathedral organ, vinyl, folk guitar, Tagus river)', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  // 1. Mid-town Chiado overworld (far from riverfront): quiet streets
  const midtown = computeSoundscapeProfile(state);
  assert.equal(midtown.bakeryFire, 0);
  assert.equal(midtown.fadoMusic, 0);
  assert.equal(midtown.riverWater, 0);

  // 2. Approaching Avenida Ribeira and arriving at the Tagus Riverfront: smooth water swell
  engine.setPlayerPosition(1420, 900);
  const approachingRiver = computeSoundscapeProfile(state);
  assert.ok(approachingRiver.riverWater > 0.25 && approachingRiver.riverWater < 0.8);
  assert.equal(approachingRiver.bakeryFire, 0);
  assert.equal(approachingRiver.fadoMusic, 0);

  engine.setPlayerPosition(1420, 1002);
  const atRiverfront = computeSoundscapeProfile(state);
  assert.equal(atRiverfront.riverWater, 1);
  assert.equal(atRiverfront.activeLabel, 'Tagus Riverfront');

  // 3. Bakeries (Casa da Rosa - Padaria & Arcadas do Chiado): brick oven fire & crackle
  engine.enterVenue('casa-da-rosa');
  const inBakery = computeSoundscapeProfile(state);
  assert.equal(inBakery.bakeryFire, 1);
  assert.equal(inBakery.fadoMusic, 0);
  assert.equal(inBakery.riverWater, 0);
  assert.equal(inBakery.activeLabel, 'Bakery Wood Oven');
  engine.exitVenue();

  engine.enterVenue('arcadas-chiado');
  const inConfeitaria = computeSoundscapeProfile(state);
  assert.ok(inConfeitaria.bakeryFire >= 0.7);
  assert.ok(inConfeitaria.folkGuitar > 0.2);
  engine.exitVenue();

  // 4. Fado Restaurant (Tasca do Fado): Portuguese Fado music
  engine.enterVenue('tasca-do-fado');
  const inFado = computeSoundscapeProfile(state);
  assert.equal(inFado.fadoMusic, 1);
  assert.equal(inFado.bakeryFire, 0);
  assert.equal(inFado.activeLabel, 'Fado Music');
  engine.exitVenue();

  // 5. Alfama Grill Restaurant (Taberna da Sardinha): charcoal sardine grill sizzle + background Fado
  engine.enterVenue('taberna-sardinha');
  const inGrill = computeSoundscapeProfile(state);
  assert.equal(inGrill.grillSizzle, 1);
  assert.ok(inGrill.fadoMusic >= 0.4);
  assert.equal(inGrill.activeLabel, 'Charcoal Grill & Fado');
  engine.exitVenue();

  // 6. Historic Cafe (Cafe A Brasileira): espresso steam & porcelain clinks + gentle guitar
  engine.enterVenue('cafe-do-poeta');
  const inCafe = computeSoundscapeProfile(state);
  assert.equal(inCafe.cafeSteam, 1);
  assert.ok(inCafe.folkGuitar > 0.2);
  assert.equal(inCafe.activeLabel, 'Espresso Steam & Cafe');
  engine.exitVenue();

  // 7. Se de Lisboa Cathedral: resonant stone-nave pipe organ
  engine.enterVenue('se-de-lisboa');
  const inCathedral = computeSoundscapeProfile(state);
  assert.equal(inCathedral.cathedralOrgan, 1);
  assert.equal(inCathedral.activeLabel, 'Se Cathedral Organ');
  engine.exitVenue();

  // 8. Vinyl Shop (Vinil & Gravuras do Alto): Fado vinyl record + warm needle crackle
  engine.enterVenue('vinil-do-alto');
  const inVinyl = computeSoundscapeProfile(state);
  assert.ok(inVinyl.fadoMusic >= 0.8);
  assert.ok(inVinyl.vinylCrackle >= 0.8);
  assert.equal(inVinyl.activeLabel, 'Fado Vinyl & Crackle');
  engine.exitVenue();

  // 9. Bookshop & Tile Atelier: Portuguese cultural folk guitar (+ tile kiln hum in Oficina de Azulejos)
  engine.enterVenue('livraria-chiado');
  const inBookshop = computeSoundscapeProfile(state);
  assert.ok(inBookshop.folkGuitar >= 0.7);
  engine.exitVenue();

  engine.enterVenue('oficina-azulejos');
  const inTileShop = computeSoundscapeProfile(state);
  assert.ok(inTileShop.folkGuitar >= 0.7);
  assert.ok(inTileShop.bakeryFire >= 0.25);
  engine.exitVenue();

  // 10. Underground Metro de Lisboa: station vault hum -> full tunnel train rumble when riding
  engine.openMetroStation('metro-baixa-chiado');
  for (let i = 0; i < 14; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  const metroPlatform = computeSoundscapeProfile(state);
  assert.ok(metroPlatform.metroRumble > 0.5 && metroPlatform.metroRumble < 0.9);
  assert.equal(metroPlatform.metroRiding, false);
  assert.equal(metroPlatform.activeLabel, 'Metro Station Vault');

  engine.rideMetro('metro-baixa-chiado', 'metro-santa-apolonia');
  const metroTunnel = computeSoundscapeProfile(state);
  assert.equal(metroTunnel.metroRumble, 1);
  assert.equal(metroTunnel.metroRiding, true);
  assert.equal(metroTunnel.activeLabel, 'Metro Tunnel Rumble');

  // 11. LisboaSoundEngine Web Audio graph & scheduler smoke test across all 9 buses
  const createMockParam = (initial = 0) => ({
    value: initial,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    setTargetAtTime(v) { this.value = v; }
  });
  let startedNodes = 0;
  let closed = false;
  const mockAudioCtx = {
    sampleRate: 22050,
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: () => Promise.resolve(),
    close: () => { closed = true; },
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createGain: () => ({ gain: createMockParam(1), connect: () => {} }),
    createBiquadFilter: () => ({
      type: 'lowpass',
      frequency: createMockParam(440),
      Q: createMockParam(1),
      connect: () => {}
    }),
    createOscillator: () => ({
      type: 'sine',
      frequency: createMockParam(440),
      detune: createMockParam(0),
      connect: () => {},
      start: () => { startedNodes += 1; },
      stop: () => {}
    }),
    createBufferSource: () => ({
      buffer: null,
      loop: false,
      connect: () => {},
      start: () => { startedNodes += 1; },
      stop: () => {}
    })
  };

  const sound = new LisboaSoundEngine({ audioContextFactory: () => mockAudioCtx });
  assert.equal(sound.unlock(), true);
  assert.equal(sound.isUnlocked(), true);

  sound.update(state); // Inside Metro tunnel -> full metroRumble bus
  assert.ok(sound.metroBus.gain.value > 0.5);
  sound.triggerRailClack();

  engine.exitMetroStation({ immediate: true });
  engine.enterVenue('taberna-sardinha');
  sound.update(state); // Alfama Grill -> grillSizzle + warm Fado
  assert.ok(sound.grillBus.gain.value > 0.4);
  assert.ok(sound.fadoBus.gain.value > 0.25);
  sound.triggerGrillPop();

  engine.exitVenue();
  engine.enterVenue('cafe-do-poeta');
  sound.update(state); // Cafe A Brasileira -> espresso steam + cup clinks
  assert.ok(sound.cafeBus.gain.value > 0.5);
  sound.triggerEspressoSteam();
  sound.triggerCupClink();

  engine.exitVenue();
  engine.enterVenue('se-de-lisboa');
  sound.update(state); // Se Cathedral -> pipe organ
  assert.ok(sound.organBus.gain.value > 0.5);

  engine.exitVenue();
  engine.enterVenue('vinil-do-alto');
  sound.update(state); // Vinyl shop -> Fado + vinyl crackle
  assert.ok(sound.vinylBus.gain.value > 0.4);
  sound.triggerVinylTick();

  engine.exitVenue();
  engine.enterVenue('casa-da-rosa');
  sound.update(state); // Bakery -> oven fire + crackle
  assert.ok(sound.bakeryBus.gain.value > 0.4);
  sound.triggerOvenCrackle();

  engine.exitVenue();
  engine.setPlayerPosition(1420, 1002);
  sound.update(state); // Tagus Riverfront -> water bed
  assert.ok(sound.riverBus.gain.value > 0.35);

  sound.playEffect('door');
  sound.playEffect('register');
  sound.playEffect('tram-bell');
  sound.playEffect('metro-chime');

  assert.equal(sound.toggleMute(), true);
  assert.equal(sound.masterGain.gain.value, 0);
  assert.equal(sound.toggleMute(), false);
  assert.ok(sound.masterGain.gain.value > 0.5);

  sound.dispose();
  assert.equal(closed, true);
  assert.ok(startedNodes >= 25, `Expected comprehensive audio nodes started, got ${startedNodes}`);
});

test('compliance check: no emojis, no license mentions, and no prohibited internal naming', () => {
  const filesToCheck = [
    'package.json',
    'README.md',
    'server.js',
    'index.html',
    'styles.css',
    path.join('src', 'data.js'),
    path.join('src', 'engine.js'),
    path.join('src', 'multiplayer.js'),
    path.join('src', 'audio.js'),
    path.join('src', 'renderer.js'),
    path.join('src', 'app.js'),
    path.join('tests', 'engine.test.js'),
    path.join('tests', 'multiplayer.test.js')
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
