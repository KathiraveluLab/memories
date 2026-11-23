import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NEIGHBORHOODS,
  ALL_LISBOA_NEIGHBORHOODS,
  getNeighborhoodAt,
  DECORATIVE_STRUCTURES,
  FADO_TRACKS,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  SANTA_JUSTA_LIFT,
  SANTA_JUSTA_PANORAMA_LANDMARKS,
  METRO_LINE,
  METRO_NETWORK_LINES,
  METRO_STATIONS,
  CITY_METRO_STATIONS,
  ALL_METRO_STATIONS,
  LISBOA_CITY_DISTRICTS,
  CITY_DISTRICT_SPOTS,
  CITY_DISTRICT_PORTALS,
  OVERWORLD_CITY_GATEWAYS,
  LISBOA_WALKING_NETWORK,
  LISBOA_CITY_MAP_NODES,
  getWalkingAvenuesFrom,
  computeLisboaWalkingRoute,
  computeMetroNetworkRoute,
  getStationLineIds,
  getDirectStationsOnLine,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  AMBIENT_NPCS,
  SEASONAL_CROWD_NPCS,
  RIVERSIDE_JOGGERS,
  RIVERSIDE_BENCHES,
  CASTANHA_VENDORS,
  CASTANHA_CONE_ITEM,
  FUNICULAR_LINES,
  BAIRRO_ALTO_PARTY_REVELERS,
  isBairroAltoPartyTime,
  getTerrainElevation,
  getTerrainSlope,
  LISBOA_MONTHS,
  DEFAULT_MONTH,
  getMonthInfo,
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
  BASE_WALK_SPEED,
  PLAYER_RADIUS,
  PERSON_SEPARATION_DIST,
  isOverworldPositionValid,
  isInteriorPositionValid,
  isFerryPierPositionValid,
  isCityDistrictPositionValid,
  getCityDistrictById,
  isPointInVehicleLane,
  isPointOnSidewalk,
  pointIntersectsVehicle,
  formatClock,
  getDayPhase
} from '../src/engine.js';
import { LisboaCanvasRenderer } from '../src/renderer.js';
import { buildCalcadaTextureData } from '../src/streetview3d.js';
import { computeSoundscapeProfile, LisboaSoundEngine } from '../src/audio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('dataset & spatial integrity: all 15 buildings enterable, 3 real Metro stations, Cais do Sodre Ferry Port, realistic speeds, and 26 memories', () => {
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
  assert.equal(VENUES.length, 16);
  assert.ok(VENUES.some((v) => v.id === 'se-de-lisboa'), 'Se de Lisboa must be an enterable venue');
  assert.ok(VENUES.some((v) => v.id === 'bar-bairro-alto'), 'Bar da Noite must be an enterable venue at the top of Bairro Alto');
  assert.equal(METRO_STATIONS.length, 3);
  assert.equal(FERRY_DESTINATIONS.length, 3);
  assert.deepEqual(FERRY_DESTINATIONS.map((d) => d.id), ['cacilhas', 'seixal', 'montijo']);
  assert.equal(REST_SPOTS.length, 3);
  assert.equal(TRANSIT_LINES.length, 9);
  assert.deepEqual(
    TRANSIT_LINES.map((l) => l.routeNumber),
    ['28E', '737', '15E', '24E', '736', '728', '746', '706', '744']
  );
  assert.equal(getAllMemoryCatalog().length, 27);

  // Realistic speeds: walking must be noticeably slower than both Tram 28E and Carris Bus 737/758
  const tramLine = TRANSIT_LINES.find((l) => l.mode === 'tram');
  const busLine = TRANSIT_LINES.find((l) => l.mode === 'bus');
  assert.ok(BASE_WALK_SPEED <= 70, `Expected realistic slow walk speed <= 70 px/s, got ${BASE_WALK_SPEED}`);
  assert.ok(
    BASE_WALK_SPEED * 1.5 < tramLine.speedPxPerSec && tramLine.speedPxPerSec < busLine.speedPxPerSec,
    `Expected walk (${BASE_WALK_SPEED}) * 1.5 < tram (${tramLine.speedPxPerSec}) < bus (${busLine.speedPxPerSec})`
  );

  // Each of the 3 ferry destinations has an explorable waterfront townscape with 3 interactive spots
  for (const dest of FERRY_DESTINATIONS) {
    assert.ok(Array.isArray(dest.townSpots) && dest.townSpots.length === 3, `Expected 3 townSpots in ${dest.id}`);
    assert.ok(dest.townSpots.some((s) => s.kind === 'eatery' && s.items.length >= 2));
    assert.ok(dest.townSpots.some((s) => s.kind === 'landmark'));
    assert.ok(dest.townSpots.some((s) => s.kind === 'shop' && s.items.length >= 2));
  }

  // Cais do Sodre Ferry Terminal sits cleanly at the Tagus riverfront with valid sidewalk approach
  assert.equal(isOverworldPositionValid(FERRY_TERMINAL.spawnOutside.x, FERRY_TERMINAL.spawnOutside.y), true);
  assert.equal(isPointInVehicleLane(FERRY_TERMINAL.spawnOutside.x, FERRY_TERMINAL.spawnOutside.y), false);
  assert.equal(isFerryPierPositionValid(380, 220), true);

  // Public Domain Portuguese Fado MP3s exist on disk and are cited in assets/SOURCES.md
  assert.ok(FADO_TRACKS.length >= 3);
  for (const track of FADO_TRACKS) {
    const absAudio = path.join(ROOT_DIR, track.src.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(absAudio), `Missing Fado audio file: ${absAudio}`);
    assert.ok(fs.statSync(absAudio).size > 100000, `Expected non-empty Fado MP3: ${absAudio}`);
  }
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'assets', 'SOURCES.md')), 'assets/SOURCES.md citation file must exist');

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

  assert.ok(RIVERSIDE_BENCHES.length >= 6, 'Expected Tagus riverside benches along the seawall');
  assert.ok(CASTANHA_VENDORS.length >= 4, 'Expected seasonal Castanha nut vendor locations');
  assert.equal(RIVERSIDE_JOGGERS.length, 3, 'Expected 3 warm-month Tagus riverside joggers');
  for (const jogger of RIVERSIDE_JOGGERS) {
    assert.equal(isPointOnSidewalk(jogger.x, jogger.y), true, `Jogger ${jogger.id} start must sit on promenade sidewalk`);
    assert.equal(isPointOnSidewalk(jogger.minX, jogger.y), true, `Jogger ${jogger.id} minX must sit on promenade sidewalk`);
    assert.equal(isPointOnSidewalk(jogger.maxX, jogger.y), true, `Jogger ${jogger.id} maxX must sit on promenade sidewalk`);
    assert.equal(isPointInVehicleLane(jogger.x, jogger.y), false, `Jogger ${jogger.id} must stay clear of vehicle lanes`);
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

  // All ambient Lisbon locals and seasonal crowds patrol strictly on sidewalks (never in the middle of streets)
  for (const npc of [...AMBIENT_NPCS, ...SEASONAL_CROWD_NPCS]) {
    assert.equal(isPointInVehicleLane(npc.x, npc.y), false, `NPC ${npc.id} spawns in vehicle lane`);
    assert.equal(isPointOnSidewalk(npc.x, npc.y), true, `NPC ${npc.id} must spawn on a sidewalk`);
    assert.ok(npc.speed <= 24, `Expected calm strolling NPC speed <= 24 px/s for ${npc.id}, got ${npc.speed}`);
    const mid = (npc.min + npc.max) / 2;
    const pts =
      npc.patrolAxis === 'x'
        ? [[npc.min, npc.y], [mid, npc.y], [npc.max, npc.y]]
        : [[npc.x, npc.min], [npc.x, mid], [npc.x, npc.max]];
    for (const [px, py] of pts) {
      assert.equal(isPointInVehicleLane(px, py), false, `NPC ${npc.id} patrol enters vehicle lane at (${px},${py})`);
      assert.equal(isPointOnSidewalk(px, py), true, `NPC ${npc.id} patrol leaves sidewalk at (${px},${py})`);
    }
  }

  // Verify 12-month Lisboa climate & cultural calendar integrity
  assert.equal(LISBOA_MONTHS.length, 12);
  assert.equal(getMonthInfo(12).decorStyle, 'christmas-lights');
  assert.equal(getMonthInfo(2).decorStyle, 'carnaval');
  assert.equal(getMonthInfo(4).decorStyle, 'cravos-25-abril');
  assert.equal(getMonthInfo(6).decorStyle, 'santos-populares');
  assert.ok(getMonthInfo(7).sunBrightness >= 1.2 && getMonthInfo(7).crowdExtra >= 5);
  assert.ok(getMonthInfo(11).rainIntensity >= 0.85);
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
  for (let i = 0; i < 40; i += 1) {
    engine.tick(0.1, { x: -1, y: 0 });
  }
  assert.equal(state.currentNeighborhoodId, 'bairro-alto');
  assert.ok(state.visitedNeighborhoods.includes('bairro-alto'));
  assert.ok(state.energy < INITIAL_ENERGY);
  assert.ok(state.fullness < INITIAL_FULLNESS);
  assert.ok(state.stats.distanceWalkedPx > 200);

  // Walk east along the sidewalk all the way into Alfama (at realistic slow pedestrian speed)
  for (let i = 0; i < 165; i += 1) {
    engine.tick(0.1, { x: 1, y: 0 });
  }
  assert.equal(state.currentNeighborhoodId, 'alfama');
  assert.ok(state.visitedNeighborhoods.includes('alfama'));
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);
});

test('AC-02: boarding Tram 28E and Carris Bus, bell & Proxima Paragem announcements, disembarking onto sidewalks, and transit memories', () => {
  const engine = new MemoriesGameEngine();
  const state = engine.getState();

  const tramRes = engine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
  assert.equal(tramRes.ok, true);
  assert.equal(state.ridingVehicleId, 'tram-28e');
  assert.equal(state.euros, 120 - 3.1);
  assert.equal(state.stats.tramRides, 1);
  assert.ok(state.memories.some((m) => m.id === 'mem-ride-tram-28e'));

  const startX = state.player.x;
  const scrollBefore = state.tramScrollOffset;
  for (let i = 0; i < 20; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  assert.notEqual(state.player.x, startX);
  assert.ok(state.tramScrollOffset > scrollBefore, 'In-tram cityscape scroll offset should advance while moving');

  // Press [E] while riding Tram 28E between stops -> rings bell and announces "Proxima Paragem: <Next Stop>"
  const tramVehicle = state.vehicles.find((v) => v.id === 'tram-28e');
  assert.equal(tramVehicle.currentStopId, null);
  const tramBellRes = engine.triggerNearbyInteraction();
  assert.equal(tramBellRes.ok, true);
  assert.equal(tramBellRes.alighted, false);
  assert.equal(state.alightAtNextStop, true);
  assert.ok(state.transitAnnouncement);
  assert.equal(state.transitAnnouncement.vehicleMode, 'tram');
  assert.equal(state.transitAnnouncement.ringBell, true);
  assert.ok(state.transitAnnouncement.text.startsWith('Proxima Paragem: '));

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

  // Let bus pull out from stop, then press [E] to ring Carris bus STOP bell & announce Proxima Paragem
  for (let i = 0; i < 18; i += 1) {
    engine.tick(0.1, { x: 0, y: 0 });
  }
  const busBellRes = engine.triggerNearbyInteraction();
  assert.equal(busBellRes.ok, true);
  assert.equal(state.alightAtNextStop, true);
  assert.equal(state.transitAnnouncement.vehicleMode, 'bus');
  assert.equal(state.transitAnnouncement.ringBell, true);
  assert.ok(state.transitAnnouncement.text.startsWith('Proxima Paragem: '));

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
  // Verify ordering food gives a plate and seats the player at the dining table with visible outcome!
  assert.ok(state.seatedDining, 'Ordering food in a restaurant or cafe must create an active seatedDining plate state');
  assert.equal(state.seatedDining.active, true);
  assert.equal(state.seatedDining.itemId, 'item-bica-nata');
  assert.equal(state.player.x, 562);
  assert.equal(state.player.y, 252);
  assert.equal(state.player.facing, 'right');
  assert.equal(isInteriorPositionValid(state.player.x, state.player.y), true);
  assert.equal(state.indoorActivity?.type, 'dining');
  assert.equal(state.seatedDining.servingType, 'plate', 'Ordering food (Bica & Pastel de Nata) must serve a plate');

  // Ordering a drink (Galao Quente em Copo Alto) in the cafe serves a GLASS, not a plate!
  const galaoRes = engine.purchaseVenueItem('item-galao-bolo');
  assert.equal(galaoRes.ok, true);
  assert.equal(state.seatedDining?.servingType, 'glass', 'Ordering a drink must serve a glass');

  // Verify talking to proprietor and inspecting venue display also produce visible indoor outcomes
  const talkRes = engine.talkToProprietor();
  assert.equal(talkRes.ok, true);
  assert.equal(state.indoorActivity?.type, 'dialogue');
  assert.equal(state.indoorActivity?.proprietor, enterRes.venue.proprietor);

  const inspectRes = engine.inspectVenueDisplay();
  assert.equal(inspectRes.ok, true);
  assert.equal(state.indoorActivity?.type, 'inspect');
  assert.equal(state.player.x, 175);
  assert.equal(state.player.y, 245);
  assert.equal(isInteriorPositionValid(state.player.x, state.player.y), true);

  const exitRes = engine.exitVenue();
  assert.equal(exitRes.ok, true);
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentVenueId, null);
  assert.equal(state.seatedDining, null);
  assert.equal(state.indoorActivity, null);
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  assert.equal(engine.enterVenue('oficina-azulejos').ok, true);
  const buyRes = engine.purchaseVenueItem('item-azulejo-coaster');
  assert.equal(buyRes.ok, true);
  assert.equal(state.satchel.length, 1);
  assert.equal(state.satchel[0].name, 'Cobalt Azulejo Tile');
  assert.equal(state.indoorActivity?.type, 'souvenir');
  assert.equal(state.indoorActivity?.itemId, 'item-azulejo-coaster');
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

  // Verify polite riverside jogger collision avoidance around pedestrians (never running through people!)
  engine.setMonth(7, { silent: true }); // July has warm-month joggers active
  assert.ok(state.joggers.length >= 2, 'Expected warm-month riverside joggers in July');
  const jog = state.joggers[1]; // Tejo Runner (min: 855, max: 1380)
  jog.x = 1100;
  jog.y = 992;
  jog.homeY = 992;
  jog.dir = 1;
  jog.avoidSide = 0;
  // Place a stationary pedestrian directly in the jogger's path at (1148, 992)
  engine.setPlayerPosition(1148, 992);
  let minSepToPlayer = Infinity;
  let maxLatOffset = 0;
  for (let step = 0; step < 35; step += 1) {
    engine.updateJoggers(0.05);
    const d = Math.hypot(jog.x - state.player.x, jog.y - state.player.y);
    if (d < minSepToPlayer) minSepToPlayer = d;
    const lat = Math.abs(jog.y - 992);
    if (lat > maxLatOffset) maxLatOffset = lat;
  }
  assert.ok(jog.x > 1165, `Expected jogger to curve around and pass x=1148, reached x=${jog.x}`);
  assert.ok(maxLatOffset >= 10, `Expected jogger to arc laterally around pedestrian, maxLatOffset=${maxLatOffset}`);
  assert.ok(minSepToPlayer >= 16.5, `Expected jogger never to pass through pedestrian (minSep=${minSepToPlayer})`);

  // Verify authentic Lisboa Metro station characteristics across all 3 stations
  for (const st of METRO_STATIONS) {
    assert.ok(st.undergroundTheme?.architect, `Metro station ${st.id} must specify its Lisbon architect`);
    assert.ok(st.undergroundTheme?.artist, `Metro station ${st.id} must specify its Portuguese azulejo/mural artist`);
    assert.ok(st.undergroundTheme?.muralStyle, `Metro station ${st.id} must specify its muralStyle`);
  }

  // Verify critical Drink -> Glass vs Food -> Plate distinction in both Bar and Restaurant
  assert.equal(engine.enterVenue('bar-bairro-alto').ok, true);
  const barDrinkRes = engine.purchaseVenueItem('item-imperial');
  assert.equal(barDrinkRes.ok, true);
  assert.equal(state.seatedDining?.servingType, 'glass', 'Ordering a drink in Bar da Noite must give a glass');
  assert.ok(state.statusMessage.includes('Received a glass of'), `Expected glass status message, got: ${state.statusMessage}`);
  assert.equal(engine.exitVenue().ok, true);

  assert.equal(engine.enterVenue('tasca-do-fado').ok, true);
  const restFoodRes = engine.purchaseVenueItem('item-caldo-verde');
  assert.equal(restFoodRes.ok, true);
  assert.equal(state.seatedDining?.servingType, 'plate', 'Ordering food in Tasca do Fado restaurant must give a plate');
  assert.ok(state.statusMessage.includes('Received a plate of'), `Expected plate status message, got: ${state.statusMessage}`);
  const restDrinkRes = engine.purchaseVenueItem('item-vinho-tinto-dao');
  assert.equal(restDrinkRes.ok, true);
  assert.equal(state.seatedDining?.servingType, 'glass', 'Ordering a wine drink in Tasca do Fado restaurant must give a glass');
  assert.ok(state.statusMessage.includes('Received a glass of'), `Expected glass status message, got: ${state.statusMessage}`);
  assert.equal(engine.exitVenue().ok, true);

  // Verify accurately placed Lisbon Statues and Chafariz Water Fountains in DECORATIVE_STRUCTURES
  const statues = DECORATIVE_STRUCTURES.filter((s) => s.monumentType === 'statue');
  const fountains = DECORATIVE_STRUCTURES.filter((s) => s.monumentType === 'fountain');
  assert.ok(statues.length >= 2, 'Expected at least 2 historic Lisbon bronze statues (Camoes & Poeta Chiado)');
  assert.ok(fountains.length >= 2, 'Expected at least 2 historic Lisbon water fountains (Chafariz do Carmo & Chafariz d\'El-Rei)');
  for (const struct of DECORATIVE_STRUCTURES) {
    const cx = struct.x + struct.w * 0.5;
    const cy = struct.y + struct.h * 0.5;
    assert.equal(isPointInVehicleLane(cx, cy), false, `Monument ${struct.id} must not sit in a vehicle lane`);
  }
  state.energy = 60;
  const fountRes = engine.interactWithMonument('fountain-chafariz-carmo');
  assert.equal(fountRes.ok, true);
  assert.equal(fountRes.monumentType, 'fountain');
  assert.equal(state.energy, 68);
  const statRes = engine.interactWithMonument('statue-poeta-chiado');
  assert.equal(statRes.ok, true);
  assert.equal(statRes.monumentType, 'statue');
  assert.equal(state.energy, 73);
});

test('AC-05 & AC-06: non-teleporting Metro descent, underground ride, ascent, gentle loop, Transtejo ferries, and 26-memory completion', () => {
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

  // Collecting all 26 memories (including all 3 Transtejo Tagus ferry routes) marks albumCompleted = true
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

  // Board Transtejo ferries from Cais do Sodre to Cacilhas, Seixal, and Montijo, explore each south-bank town, and sail back
  state.euros = 120;
  engine.openFerryTerminal();
  assert.equal(state.mode, 'ferry');
  assert.equal(state.ferry.portId, 'cais-do-sodre');
  for (const dest of FERRY_DESTINATIONS) {
    const sailOut = engine.boardFerry(dest.id);
    assert.equal(sailOut.ok, true);
    assert.equal(state.ferry.phase, 'sailing');
    for (let i = 0; i < 60; i += 1) engine.tick(0.1, { x: 0, y: 0 });
    assert.equal(state.ferry.phase, 'terminal');
    assert.equal(state.ferry.portId, dest.id);

    // Explore the south-bank townscape using [E] (triggerNearbyInteraction) at eatery, landmark, shop & return ferry gangway!
    const landmark = dest.townSpots.find((s) => s.kind === 'landmark');
    const eatery = dest.townSpots.find((s) => s.kind === 'eatery');
    const shop = dest.townSpots.find((s) => s.kind === 'shop');

    // 1. Walk to eatery and press [E] -> opens feedback card, selects spot, and quick-orders dish via [1]
    state.player.x = eatery.x;
    state.player.y = 186;
    const nearbyEatery = engine.getNearbyInteraction();
    assert.equal(nearbyEatery.type, 'south-bank-spot');
    assert.equal(nearbyEatery.spotId, eatery.id);
    const eEateryRes = engine.triggerNearbyInteraction();
    assert.equal(eEateryRes.ok, true);
    assert.equal(state.activeSouthBankSpotId, eatery.id);
    assert.ok(state.southBankFeedback && state.southBankFeedback.spotId === eatery.id);
    const dish = eatery.items[0];
    const orderSbRes = engine.purchaseActiveSouthBankItemByIndex(0);
    assert.equal(orderSbRes.ok, true);
    assert.ok(state.tastedFoods.some((f) => f.id === dish.id));

    // 2. Walk to center landmark and press [E] -> restores +25 Energy & shows landmark postcard card
    state.player.x = landmark.x;
    state.player.y = 186;
    state.energy = 60;
    const nearbyLandmark = engine.getNearbyInteraction();
    assert.equal(nearbyLandmark.type, 'south-bank-spot');
    assert.equal(nearbyLandmark.spotId, landmark.id);
    const restLandmarkRes = engine.triggerNearbyInteraction();
    assert.equal(restLandmarkRes.ok, true);
    assert.equal(state.energy, 85);
    assert.ok(state.southBankFeedback && state.southBankFeedback.spotId === landmark.id);

    // 3. Walk to right shop and press [E] -> selects shop & buys souvenir keepsake
    state.player.x = shop.x;
    state.player.y = 186;
    const eShopRes = engine.triggerNearbyInteraction();
    assert.equal(eShopRes.ok, true);
    assert.equal(state.activeSouthBankSpotId, shop.id);
    const keepsake = shop.items.find((i) => i.kind === 'souvenir') || shop.items[0];
    const buySbRes = engine.purchaseSouthBankItem(shop.id, keepsake.id);
    assert.equal(buySbRes.ok, true);
    assert.ok(state.satchel.some((s) => s.id === keepsake.id));

    // 4. Walk to return ferry gangway (380, 255) and press [E] -> MUST board return ferry (never hijacked by center landmark!)
    state.player.x = 380;
    state.player.y = 255;
    const nearbyReturn = engine.getNearbyInteraction();
    assert.equal(nearbyReturn.type, 'ferry-board');
    assert.equal(nearbyReturn.targetPortId, 'cais-do-sodre');
    const sailBack = engine.triggerNearbyInteraction();
    assert.equal(sailBack.ok, true);
    assert.equal(state.ferry.phase, 'sailing');
    for (let i = 0; i < 60; i += 1) engine.tick(0.1, { x: 0, y: 0 });
    assert.equal(state.ferry.portId, 'cais-do-sodre');
  }
  assert.equal(engine.exitFerryTerminal().ok, true);
  assert.equal(state.mode, 'overworld');
  assert.equal(state.memories.length, 27);
  assert.equal(state.albumCompleted, true);

  // Proportional walk-speed slowdown on low energy / fullness, critical low-energy crawl until eating a meal, and Wallet 0.00 EUR Game Over Scorecard
  state.energy = 85;
  state.fullness = 85;
  state.needsMealToRecoverSpeed = false;
  assert.equal(engine.computeWalkSpeedMultiplier(), 1.0);

  // Proportional slowdown as energy or fullness drops below 70
  state.energy = 50;
  state.fullness = 80;
  const speedAtEnergy50 = engine.computeWalkSpeedMultiplier();
  assert.ok(speedAtEnergy50 < 1.0 && speedAtEnergy50 > 0.45, `Expected proportional slowdown at energy=50, got ${speedAtEnergy50}`);

  state.energy = 32;
  const speedAtEnergy32 = engine.computeWalkSpeedMultiplier();
  assert.ok(speedAtEnergy32 < speedAtEnergy50, `Expected slower speed at energy=32 (${speedAtEnergy32}) than energy=50 (${speedAtEnergy50})`);

  state.energy = 85;
  state.fullness = 35;
  const speedAtFullness35 = engine.computeWalkSpeedMultiplier();
  assert.ok(speedAtFullness35 < 1.0 && speedAtFullness35 > 0.4, `Expected proportional slowdown at fullness=35, got ${speedAtFullness35}`);

  // Critical low-energy crawl (energy <= 20): moves really slowly (<= 0.22x) even after bench rest until eating a meal in a bakery or restaurant!
  state.energy = 12;
  state.fullness = 35;
  const crawlSpeed = engine.computeWalkSpeedMultiplier();
  assert.equal(state.needsMealToRecoverSpeed, true);
  assert.ok(crawlSpeed <= 0.22, `Expected critical low-energy crawl <= 0.22, got ${crawlSpeed}`);

  // Resting on a street bench restores energy (+30 -> 42), but player stays in critical slow mode until eating a meal!
  engine.restAtBench('bench-chiado');
  assert.equal(state.needsMealToRecoverSpeed, true);
  assert.ok(engine.computeWalkSpeedMultiplier() <= 0.22);

  // Eating a meal at a bakery (Casa da Rosa) clears needsMealToRecoverSpeed and restores normal walking speed!
  state.euros = 10.0;
  engine.enterVenue('casa-da-rosa');
  const mealRes = engine.purchaseVenueItem('item-pao-mafra'); // 3.20 EUR food item (+28 fullness, +22 energy)
  assert.equal(mealRes.ok, true);
  assert.equal(state.needsMealToRecoverSpeed, false);
  assert.ok(state.walkSpeedMultiplier > 0.65, `Expected walk speed restored after bakery meal, got ${state.walkSpeedMultiplier}`);

  // Spending remaining wallet down to 0.00 EUR triggers Game Over with complete Final Memories Scorecard!
  state.euros = 3.5;
  engine.exitVenue();
  engine.enterVenue('cafe-do-poeta');
  const finalEuroRes = engine.purchaseVenueItem('item-bica-nata'); // 3.50 EUR -> wallet reaches 0.00 EUR
  assert.equal(finalEuroRes.ok, true);
  assert.equal(state.euros, 0);
  assert.equal(state.gameOver, true);
  assert.ok(state.gameOverSummary, 'Expected gameOverSummary scorecard when wallet reaches 0.00 EUR');
  assert.equal(state.gameOverSummary.memoriesCaptured, 27);
  assert.equal(state.gameOverSummary.memoriesTotal, 27);
  assert.equal(state.gameOverSummary.memoriesList.length, 27);
  assert.equal(state.gameOverSummary.venuesVisited, 16);
  assert.ok(state.gameOverSummary.totalScore >= 2600);

  // Verify Comparative Multiplayer End-of-Stroll Scorecard & Exportable Memory Summary Card (.txt and .json)
  engine.setRemotePlayers([
    {
      id: 'peer-2',
      slot: 2,
      name: 'Alice',
      outfitId: 'alfama-dress',
      x: 1151,
      y: 546,
      mode: 'overworld',
      memoriesCaptured: 14,
      venuesVisited: 8,
      mealsEaten: 3,
      souvenirsBought: 2,
      transitRides: 4,
      phrasesLearned: 10,
      postcardsCaptured: 1,
      eurosRemaining: 42.5,
      totalScore: 2160,
      explorerRank: 'Chiado & Alfama Cultural Flaneur',
      gameOver: false
    }
  ], { snap: true });
  assert.equal(state.gameOverSummary.multiplayerComparison.length, 2);
  assert.equal(state.gameOverSummary.multiplayerComparison[0].isLocal, true);
  assert.equal(state.gameOverSummary.multiplayerComparison[0].standing, 1);
  assert.equal(state.gameOverSummary.multiplayerComparison[1].name, 'Alice');
  assert.equal(state.gameOverSummary.multiplayerComparison[1].standing, 2);
  assert.equal(state.gameOverSummary.groupTotals.totalPlayers, 2);
  assert.equal(
    state.gameOverSummary.groupTotals.combinedScore,
    state.gameOverSummary.totalScore + 2160
  );

  const exportedText = engine.exportMemorySummaryCard({ format: 'text' });
  assert.equal(exportedText.ok, true);
  assert.ok(exportedText.cardText.includes('=== MEMORIES: LISBOA EXPLORATION SUMMARY CARD ==='));
  assert.ok(exportedText.cardText.includes('COMPARATIVE MULTIPLAYER SCORECARD (2 Travelers'));
  assert.ok(exportedText.cardText.includes('#2 Alice - 2160 pts'));
  assert.ok(exportedText.cardText.includes('[CAPTURED] Bica at Cafe A Brasileira'));

  const exportedJson = engine.exportMemorySummaryCard({ format: 'json' });
  assert.equal(exportedJson.ok, true);
  const parsedCard = JSON.parse(exportedJson.cardText);
  assert.equal(parsedCard.memoriesCaptured, 27);
  assert.equal(parsedCard.multiplayerComparison.length, 2);

  // Verify Game Over also triggers with the full Final Memories Scorecard when Energy goes to 0, Fullness goes to 0, or both go to 0
  engine.exitVenue();
  engine.setRemotePlayers([], { snap: true });
  state.gameOver = false;
  state.gameOverReason = null;
  state.gameOverSummary = null;
  state.euros = 50;
  state.energy = 0.001;
  state.fullness = 40;
  engine.tick(0.2, { x: 1, y: 0 });
  assert.equal(state.energy, 0);
  assert.equal(state.gameOver, true);
  assert.equal(state.gameOverReason, 'energy');
  assert.equal(state.gameOverSummary.title, 'GAME OVER - Energy Reached 0');
  assert.equal(state.gameOverSummary.memoriesCaptured, 27);

  state.gameOver = false;
  state.gameOverReason = null;
  state.gameOverSummary = null;
  state.energy = 60;
  state.fullness = 0.001;
  engine.tick(0.2, { x: -1, y: 0 });
  assert.equal(state.fullness, 0);
  assert.equal(state.gameOver, true);
  assert.equal(state.gameOverReason, 'fullness');
  assert.equal(state.gameOverSummary.title, 'GAME OVER - Fullness Reached 0');
  assert.equal(state.gameOverSummary.memoriesCaptured, 27);

  state.gameOver = false;
  state.gameOverReason = null;
  state.gameOverSummary = null;
  state.energy = 0.001;
  state.fullness = 0.001;
  engine.tick(0.2, { x: 1, y: 0 });
  assert.equal(state.energy, 0);
  assert.equal(state.fullness, 0);
  assert.equal(state.gameOver, true);
  assert.equal(state.gameOverReason, 'energy-and-fullness');
  assert.equal(state.gameOverSummary.title, 'GAME OVER - Energy & Fullness Reached 0');
  assert.equal(state.gameOverSummary.memoriesCaptured, 27);
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

  // Case 5: Blocked villager curves AROUND the player and continues in the EXACT SAME direction (never reverses!)
  engine.setRemotePlayers([]);
  const strollNpc = state.npcs[0]; // patrols x: 590..805 on north Tram Ave sidewalk (y: 538..575)
  for (const scenario of [
    { label: 'building-side homeY', startY: 544, playerY: 544 },
    { label: 'dead-center sidewalk', startY: 556, playerY: 556 },
    { label: 'curb-side sidewalk', startY: 570, playerY: 572 }
  ]) {
    strollNpc.x = 610;
    strollNpc.y = scenario.startY;
    strollNpc.dir = 1;
    strollNpc.avoidSide = 0;
    strollNpc.blockedTime = 0;
    state.player.x = 645;
    state.player.y = scenario.playerY;

    let stayedStrictlyOnSidewalk = true;
    let keptSameDirection = true;
    let minPlayerSep = Infinity;
    let maxLatDodge = 0;

    for (let i = 0; i < 60; i += 1) {
      engine.tick(0.1, { x: 0, y: 0 });
      if (!isPointOnSidewalk(strollNpc.x, strollNpc.y)) {
        stayedStrictlyOnSidewalk = false;
      }
      if (strollNpc.dir !== 1) {
        keptSameDirection = false;
      }
      minPlayerSep = Math.min(minPlayerSep, Math.hypot(strollNpc.x - state.player.x, strollNpc.y - state.player.y));
      maxLatDodge = Math.max(maxLatDodge, Math.abs(strollNpc.y - scenario.playerY));
    }

    assert.equal(stayedStrictlyOnSidewalk, true, `[${scenario.label}] Dodging villager must remain strictly on the sidewalk`);
    assert.equal(keptSameDirection, true, `[${scenario.label}] Villager must NOT reverse direction when blocked by player`);
    assert.ok(
      strollNpc.x > 668,
      `[${scenario.label}] Expected villager to walk completely around and past player at x=645, ended at x=${strollNpc.x.toFixed(1)}`
    );
    assert.ok(
      maxLatDodge >= 16,
      `[${scenario.label}] Expected villager to curve laterally around player (maxLatDodge=${maxLatDodge.toFixed(1)})`
    );
    assert.ok(
      minPlayerSep >= 16.5,
      `[${scenario.label}] Expected villager to maintain non-overlapping clearance around player (minSep=${minPlayerSep.toFixed(1)})`
    );
  }
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
    scale: noop,
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

  // Render Street View 3D perspective across all 4 times of day, camera directions, and screenToWorld ground picking
  assert.equal(engine.getState().viewMode, 'street3d');
  for (const [mins, yaw] of [[9 * 60, 0.08], [14 * 60, Math.PI * 0.52], [18 * 60, Math.PI * 0.95], [21 * 60, -0.75]]) {
    engine.getState().minutesOfDay = mins;
    engine.setCameraAngles(yaw, 0.04);
    engine.tick(0.1, { x: 1, y: 0 });
    renderer.setStreetHover(460, 420, engine.getState());
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  }
  const pickedGround = renderer.screenToWorld(460, 420, engine.getState());
  assert.ok(pickedGround && Number.isFinite(pickedGround.x) && Number.isFinite(pickedGround.y));
  assert.equal(engine.toggleViewMode(), 'overhead');
  assert.equal(engine.getState().viewMode, 'overhead');

  for (const mins of [9 * 60, 14 * 60, 18 * 60, 21 * 60]) {
    engine.getState().minutesOfDay = mins;
    engine.tick(0.1, { x: 1, y: 0 });
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  }
  assert.equal(engine.toggleViewMode(), 'street3d');

  engine.getState().vehicles[0].yielding = true;
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.getState().vehicles[0].yielding = false;

  // Render panoramic inside-the-tram (Remodelado 28E) view with active Proxima Paragem announcement
  engine.boardTransitAtStop('stop-tram-camoes', { waitIfApproaching: true });
  for (let i = 0; i < 16; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  engine.triggerNearbyInteraction();
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.disembarkTransit({ immediateToNextStop: true });

  // Render panoramic inside-the-bus Lisboa cityscape view (hillside avenue + waterfront + announcement)
  engine.boardTransitAtStop('stop-bus-garrett', { waitIfApproaching: true });
  for (let i = 0; i < 16; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  engine.triggerNearbyInteraction();
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.getState().vehicles.find((v) => v.mode === 'bus').y = 932;
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.disembarkTransit({ immediateToNextStop: true });

  // Render Cais do Sodre Ferry Terminal & animated Tagus crossings to Cacilhas, Seixal & Montijo
  engine.openFerryTerminal();
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  for (const destId of ['cacilhas', 'seixal', 'montijo']) {
    engine.boardFerry(destId);
    engine.tick(0.5, { x: 0, y: 0 });
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
    for (let i = 0; i < 60; i += 1) engine.tick(0.1, { x: 0, y: 0 });
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
    engine.boardFerry('cais-do-sodre');
    for (let i = 0; i < 60; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  }
  engine.exitFerryTerminal();

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
    engine.setViewMode('street3d');
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
    const floorPick = renderer.screenToWorld(460, 440, engine.getState());
    assert.ok(floorPick && Number.isFinite(floorPick.x) && Number.isFinite(floorPick.y));
    engine.setViewMode('overhead');
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
    engine.setViewMode('street3d');
    engine.exitVenue();
  }

  // Render Street View 3D & 2.5D Overhead across key Lisboa seasonal months (Dec Christmas lights, Feb Carnaval, Apr 25 de Abril, Jul Summer crowds, Nov Atlantic rain)
  for (const m of [12, 2, 4, 6, 7, 11, DEFAULT_MONTH]) {
    engine.setMonth(m);
    assert.equal(engine.getState().month, m);
    engine.setViewMode('street3d');
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
    engine.setViewMode('overhead');
    renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  }
  engine.setViewMode('street3d');

  // Verify July summer crowds expand safely beyond winter/November quiet streets,
  // warm-month joggers appear only May-Oct, and Castanha vendors appear only Oct-Feb
  engine.setMonth(11);
  const novCount = engine.getState().npcs.length;
  assert.equal(engine.getState().joggers.length, 0, 'No joggers should run along the riverside in rainy November');
  assert.equal(getMonthInfo(11).hasCastanhaVendors, true, 'Castanha nut vendors should appear in November');
  engine.setPlayerPosition(840, 992);
  engine.setCameraAngles(0.14, 0.02);
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);

  engine.setMonth(1);
  assert.equal(engine.getState().joggers.length, 0, 'No joggers should run in winter January');
  assert.equal(getMonthInfo(1).hasCastanhaVendors, true, 'Castanha nut vendors should appear in January');

  engine.setMonth(5);
  assert.equal(engine.getState().joggers.length, 2, 'Two joggers should appear in warm May');
  assert.equal(getMonthInfo(5).hasCastanhaVendors, false, 'Castanha nut vendors should not appear in warm May');

  engine.setMonth(7);
  const julCount = engine.getState().npcs.length;
  assert.ok(julCount > novCount, `Expected more summer crowds in July (${julCount}) than rainy November (${novCount})`);
  assert.equal(engine.getState().joggers.length, 3, 'Three joggers should run along the Tagus riverside in warm July');
  assert.equal(getMonthInfo(7).hasCastanhaVendors, false, 'Castanha nut vendors should not appear in hot July');
  const blockedSummerCone = engine.buyCastanhaCone('castanha-ribeira');
  assert.equal(blockedSummerCone.ok, false, 'Castanha cones should only be purchasable Oct-Feb');

  // Verify authentic procedural Calcada Portuguesa hand-laid mosaic stone buffers (limestone + basalt contrast)
  const calcada = buildCalcadaTextureData();
  assert.equal(calcada.size, 128);
  for (const key of ['sidewalkMosaic', 'sidewalkWhite', 'sidewalkBlack', 'marLargo', 'lequeRoad']) {
    assert.equal(calcada[key].length, 128 * 128 * 4, `Expected 128x128 RGBA texture for ${key}`);
  }
  let lightStones = 0;
  let darkStones = 0;
  for (let i = 0; i < calcada.marLargo.length; i += 4) {
    const lum = (calcada.marLargo[i] + calcada.marLargo[i + 1] + calcada.marLargo[i + 2]) / 3;
    if (lum > 195) lightStones += 1;
    else if (lum < 95) darkStones += 1;
  }
  assert.ok(lightStones > 3500 && darkStones > 3500, 'Mar Largo Calcada Portuguesa must combine white limestone and black basalt tesserae');

  // Verify purchasable hot paper cones at chestnut carts (Nov) & interactive Tagus riverside seating
  engine.setMonth(11);
  engine.setPlayerPosition(895, 996);
  const nearCart = engine.getNearbyInteraction();
  assert.equal(nearCart?.type, 'castanha-cart');
  assert.equal(nearCart?.id, 'castanha-ribeira');
  const eurosBeforeCone = engine.getState().euros;
  engine.getState().energy = 40;
  engine.getState().fullness = 40;
  engine.getState().needsMealToRecoverSpeed = true;
  const coneRes = engine.triggerNearbyInteraction();
  assert.equal(coneRes.ok, true);
  assert.equal(coneRes.soundEffect, 'register');
  assert.equal(engine.getState().euros, Number((eurosBeforeCone - CASTANHA_CONE_ITEM.costEur).toFixed(2)));
  assert.equal(engine.getState().stats.castanhaConesBought, 1);
  assert.equal(engine.getState().needsMealToRecoverSpeed, false);
  assert.ok(engine.getState().fullness >= 64);
  assert.ok(engine.getState().energy >= 58);
  assert.ok(engine.getState().holdingConeTimer > 10);

  // Sit on interactive Tagus riverside bench, restore energy while seated, then stand up cleanly on movement or [E]
  engine.setPlayerPosition(950, 998);
  const nearRvBench = engine.getNearbyInteraction();
  assert.equal(nearRvBench?.type, 'riverside-bench');
  assert.equal(nearRvBench?.id, 'rv-bench-3');
  engine.getState().energy = 50;
  const sitRes = engine.triggerNearbyInteraction();
  assert.equal(sitRes.ok, true);
  assert.equal(engine.getState().seatedBenchId, 'rv-bench-3');
  assert.ok(engine.getState().energy >= 62);
  const seatedEnergyBeforeTick = engine.getState().energy;
  for (let i = 0; i < 10; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.ok(engine.getState().energy > seatedEnergyBeforeTick + 3, 'Energy must recover continuously while seated by the Tagus');
  assert.equal(engine.getNearbyInteraction()?.type, 'stand-up-bench');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  const standRes = engine.triggerNearbyInteraction();
  assert.equal(standRes.ok, true);
  assert.equal(engine.getState().seatedBenchId, null);

  // Also verify moving stands up automatically from a riverside bench
  engine.sitAtRiversideBench('rv-bench-3');
  assert.equal(engine.getState().seatedBenchId, 'rv-bench-3');
  engine.tick(0.1, { x: 1, y: 0 });
  assert.equal(engine.getState().seatedBenchId, null, 'Directional movement should stand player up smoothly from riverside bench');

  engine.setMonth(7);
  const jog0Before = engine.getState().joggers[0].x;
  for (let i = 0; i < 10; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.notEqual(engine.getState().joggers[0].x, jog0Before, 'Warm-month joggers should move along the promenade');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('overhead');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('street3d');
  engine.setMonth(DEFAULT_MONTH);

  // Verify Bairro Alto & Alfama terrain elevation, architectural diversity across all 15 buildings, and historic Lisbon Cable Funiculars (Bica & Gloria)
  const elevWaterfront = getTerrainElevation(512, 996);
  const elevChiado = getTerrainElevation(950, 550);
  const elevBairroRidge = getTerrainElevation(512, 220);
  const elevAlfamaRidge = getTerrainElevation(1950, 220);
  assert.equal(elevWaterfront, 0, 'Tagus waterfront promenade must sit flat at sea level (z=0)');
  assert.ok(elevBairroRidge > 65, `Bairro Alto ridge should sit dramatically elevated above street level (got ${elevBairroRidge.toFixed(1)})`);
  assert.ok(elevBairroRidge > elevChiado + 40, 'Bairro Alto ridge must sit substantially higher than Chiado');
  assert.ok(elevAlfamaRidge > 35, `Alfama ridge should sit noticeably elevated above the waterfront (got ${elevAlfamaRidge.toFixed(1)})`);
  const slopeBica = getTerrainSlope(512, 560);
  assert.ok(slopeBica.dzdy < -0.05, `Rua da Bica should slope steeply uphill northward (dzdy=${slopeBica.dzdy.toFixed(3)})`);

  // Distinct Lisbon building architecture diversity across all 15 venues
  const distinctArchStyles = new Set(VENUES.map((v) => v.archStyle));
  assert.ok(distinctArchStyles.size >= 14, `Expected distinct Lisbon architectural archetypes across venues, got ${distinctArchStyles.size}`);

  // Verify Elevador da Bica (1892) & Elevador da Gloria (1885) stations and end-to-end hillside funicular ride
  assert.equal(FUNICULAR_LINES.length, 2);
  for (const fun of FUNICULAR_LINES) {
    assert.equal(isOverworldPositionValid(fun.lowerStation.platformX, fun.lowerStation.platformY), true);
    assert.equal(isOverworldPositionValid(fun.upperStation.platformX, fun.upperStation.platformY), true);
  }
  const bica = FUNICULAR_LINES.find((f) => f.id === 'funicular-bica');
  engine.setPlayerPosition(bica.lowerStation.platformX, bica.lowerStation.platformY);
  const nearBica = engine.getNearbyInteraction();
  assert.equal(nearBica?.type, 'funicular-station');
  assert.equal(nearBica?.id, 'funicular-bica');
  assert.equal(nearBica?.fromEnd, 'lower');

  const eurosBeforeFun = engine.getState().euros;
  engine.getState().energy = 60;
  const boardFunRes = engine.triggerNearbyInteraction();
  assert.equal(boardFunRes.ok, true);
  assert.equal(engine.getState().ridingFunicularId, 'funicular-bica');
  assert.equal(engine.getState().euros, Number((eurosBeforeFun - bica.fareEur).toFixed(2)));
  assert.equal(engine.getState().stats.funicularRides, 1);
  assert.ok(engine.getState().energy >= 72);
  const startElevM = engine.getState().elevationMeters;
  // Render both Street View 3D and Overhead 2.5D mid-climb along Rua da Bica
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.ok(engine.getState().elevationMeters > startElevM + 8, 'Elevation should climb steadily while riding Elevador da Bica uphill');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('overhead');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('street3d');
  // Complete the ride and verify clean arrival on Bairro Alto ridge
  for (let i = 0; i < 60; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(engine.getState().ridingFunicularId, null, 'Funicular should arrive and disembark smoothly at upper Bairro Alto ridge');
  assert.ok(engine.getState().elevationMeters >= 40, `Player should finish on high Bairro Alto ridge (got ${engine.getState().elevationMeters}m)`);
  // Render high Bairro Alto downhill vista in Street View 3D
  engine.setCameraAngles(Math.PI * 0.5, -0.09);
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);

  // Verify Top-of-Bairro-Alto Evening Bar (Bar da Noite) & Street Party Atmosphere with drinks and lights
  const barVenue = VENUES.find((v) => v.id === 'bar-bairro-alto');
  assert.ok(barVenue && barVenue.neighborhood === 'bairro-alto' && barVenue.interiorTheme.layout === 'bar');
  assert.ok(getTerrainElevation(barVenue.doorX, barVenue.doorY) > 70, 'Bar da Noite must sit high atop Bairro Alto ridge');
  assert.ok(BAIRRO_ALTO_PARTY_REVELERS.length >= 6);
  for (const rev of BAIRRO_ALTO_PARTY_REVELERS) {
    assert.equal(isOverworldPositionValid(rev.x, rev.y), true, `Bairro Alto party reveler ${rev.id} must not collide with buildings`);
    assert.equal(isPointInVehicleLane(rev.x, rev.y), false, `Bairro Alto party reveler ${rev.id} must stay off vehicle lanes`);
    assert.ok(rev.drinkColor && rev.toastPhrase, `Bairro Alto party reveler ${rev.id} should hold a drink and toast`);
  }
  assert.equal(isBairroAltoPartyTime(11 * 60), false);
  assert.equal(isBairroAltoPartyTime(20 * 60 + 30), true);

  engine.jumpToEvening();
  assert.equal(engine.getState().bairroAltoPartyActive, true);
  engine.setPlayerPosition(barVenue.spawnOutside.x, barVenue.spawnOutside.y);
  const partyStreetAudio = computeSoundscapeProfile(engine.getState());
  assert.equal(partyStreetAudio.activeLabel, 'Bairro Alto Evening Party');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('overhead');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('street3d');

  // Step inside Bar da Noite, order a Bairro Alto Ginjinha / Imperial, and verify bar soundscape & 3D/2D interior renders
  const enterBarRes = engine.enterVenue('bar-bairro-alto');
  assert.equal(enterBarRes.ok, true);
  const barAudio = computeSoundscapeProfile(engine.getState());
  assert.equal(barAudio.activeLabel, 'Bairro Alto Bar & Party');
  const drinkRes = engine.purchaseVenueItem('item-ginjinha');
  assert.equal(drinkRes.ok, true);
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('overhead');
  renderer.render(engine.getState(), engine.getNearbyInteraction(), 0.016);
  engine.setViewMode('street3d');
  engine.exitVenue();

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
    setValueAtTime: () => { },
    linearRampToValueAtTime: () => { },
    exponentialRampToValueAtTime: () => { },
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
    createGain: () => ({ gain: createMockParam(1), connect: () => { } }),
    createBiquadFilter: () => ({
      type: 'lowpass',
      frequency: createMockParam(440),
      Q: createMockParam(1),
      connect: () => { }
    }),
    createOscillator: () => ({
      type: 'sine',
      frequency: createMockParam(440),
      detune: createMockParam(0),
      connect: () => { },
      start: () => { startedNodes += 1; },
      stop: () => { }
    }),
    createBufferSource: () => ({
      buffer: null,
      loop: false,
      connect: () => { },
      start: () => { startedNodes += 1; },
      stop: () => { }
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
  sound.playEffect('stop-bell');
  sound.playEffect('metro-chime');
  sound.playEffect('ferry-horn');
  sound.announceNextStop('Rua Garrett', { mode: 'bus', ringBell: true });
  sound.announceNextStop('Largo do Chiado', { mode: 'tram', ringBell: true });

  // Verify Ferry soundscape profile (pier, Tagus crossing, and south-bank town) and real Public Domain Fado MP3 playlist rotation
  engine.openFerryTerminal();
  const ferryPierProfile = computeSoundscapeProfile(state);
  assert.ok(ferryPierProfile.riverWater >= 0.8);
  assert.ok(ferryPierProfile.ferryEngine >= 0.35);
  engine.boardFerry('cacilhas');
  const ferrySailProfile = computeSoundscapeProfile(state);
  assert.equal(ferrySailProfile.riverWater, 1);
  assert.equal(ferrySailProfile.ferryEngine, 1);
  sound.update(state);
  assert.ok(sound.ferryBus.gain.value > 0.4);
  const hornTriggerRes = engine.triggerNearbyInteraction();
  assert.equal(hornTriggerRes.ok, true);
  assert.ok(state.ferryHornSignal?.text.includes('Transtejo Foghorn'));
  sound.playEffect('ferry-horn');
  sound.playEffect('metro-door-chime');
  sound.playEffect('miradouro-strum');
  sound.playEffect('cafe-toast');
  sound.playEffect('cathedral-bells');
  sound.playEffect('camera-shutter');
  const cardRes = engine.triggerSharedPostcard();
  assert.equal(cardRes.ok, true);
  assert.equal(state.postcards.length, 1);
  const bellRes = engine.triggerCathedralChime({ hour: 10 });
  assert.equal(bellRes.ok, true);
  assert.equal(state.cathedralChime.clockLabel, '10:00');
  for (let i = 0; i < 60; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  const southBankTownProfile = computeSoundscapeProfile(state);
  assert.ok(southBankTownProfile.riverWater >= 0.6);
  assert.ok(southBankTownProfile.folkGuitar >= 0.4);
  engine.exitFerryTerminal({ immediate: true });

  // Test MP3 playlist auto-rotation with mock HTMLAudioElement
  const listeners = {};
  const mockAudioEl = {
    src: '',
    volume: 0,
    paused: true,
    preload: '',
    loop: false,
    addEventListener(evt, fn) { listeners[evt] = fn; },
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; }
  };
  const mp3Sound = new LisboaSoundEngine({
    audioContextFactory: () => mockAudioCtx,
    audioElementFactory: () => mockAudioEl
  });
  mp3Sound.unlock();
  engine.enterVenue('tasca-do-fado');
  mp3Sound.update(state);
  assert.equal(mp3Sound.isUsingRealFadoAudio(), true);
  const firstTrack = mp3Sound.getCurrentFadoTrack().id;
  assert.ok(mockAudioEl.src.includes('.mp3'));
  listeners.ended?.();
  const secondTrack = mp3Sound.getCurrentFadoTrack().id;
  assert.notEqual(firstTrack, secondTrack, 'Fado playlist must advance to the next recording instead of repeating the same track');
  mp3Sound.dispose();
  engine.exitVenue();

  assert.equal(sound.toggleMute(), true);
  assert.equal(sound.masterGain.gain.value, 0);
  assert.equal(sound.toggleMute(), false);
  assert.ok(sound.masterGain.gain.value > 0.5);

  // Verify November rainy weather activates Lisboa Atlantic Rain soundscape outdoors
  engine.setMonth(11);
  engine.setPlayerPosition(1180, 544);
  const novRainProfile = computeSoundscapeProfile(state);
  assert.ok(novRainProfile.rainLevel >= 0.85, `Expected strong Atlantic rainLevel in November, got ${novRainProfile.rainLevel}`);
  assert.equal(novRainProfile.activeLabel, 'Lisboa Atlantic Rain');
  sound.update(state);
  assert.ok(sound.rainBus.gain.value > 0.35);
  engine.setMonth(DEFAULT_MONTH);

  sound.dispose();
  assert.equal(closed, true);
  assert.ok(startedNodes >= 25, `Expected comprehensive audio nodes started, got ${startedNodes}`);
});

test('Full 4-Line Metropolitano de Lisboa network (56 stops), multi-line transfer routing & walkable city districts', () => {
  // 1. Verify official 4-line Metropolitano de Lisboa topology (metrolisboa.pt)
  assert.equal(METRO_NETWORK_LINES.length, 4);
  assert.deepEqual(
    METRO_NETWORK_LINES.map((l) => l.name),
    ['Linha Azul', 'Linha Amarela', 'Linha Verde', 'Linha Vermelha']
  );

  const azul = METRO_NETWORK_LINES.find((l) => l.id === 'linha-azul');
  const amarela = METRO_NETWORK_LINES.find((l) => l.id === 'linha-amarela');
  const verde = METRO_NETWORK_LINES.find((l) => l.id === 'linha-verde');
  const vermelha = METRO_NETWORK_LINES.find((l) => l.id === 'linha-vermelha');

  assert.equal(azul.stations.length, 18, 'Linha Azul has 18 factual stations (Reboleira to Santa Apolonia)');
  assert.equal(azul.stations[0], 'Reboleira');
  assert.equal(azul.stations[17], 'Santa Apolonia');

  assert.equal(amarela.stations.length, 13, 'Linha Amarela has 13 factual stations (Odivelas to Rato)');
  assert.equal(amarela.stations[0], 'Odivelas');
  assert.equal(amarela.stations[12], 'Rato');

  assert.equal(verde.stations.length, 13, 'Linha Verde has 13 factual stations (Telheiras to Cais do Sodre)');
  assert.equal(verde.stations[0], 'Telheiras');
  assert.equal(verde.stations[12], 'Cais do Sodre');

  assert.equal(vermelha.stations.length, 12, 'Linha Vermelha has 12 factual stations (Sao Sebastiao to Aeroporto)');
  assert.equal(vermelha.stations[0], 'Sao Sebastiao');
  assert.equal(vermelha.stations[11], 'Aeroporto');

  const totalLineStops = METRO_NETWORK_LINES.reduce((sum, l) => sum + l.stations.length, 0);
  assert.equal(totalLineStops, 56, 'All 4 Metropolitano de Lisboa lines sum to 56 factual station stops');

  // Verify every single one of the 56 official station stops is covered by ALL_METRO_STATIONS corridorStops
  const coveredStops = new Set(ALL_METRO_STATIONS.flatMap((s) => s.corridorStops || [s.canonicalStopName]));
  for (const line of METRO_NETWORK_LINES) {
    for (const stopName of line.stations) {
      assert.ok(coveredStops.has(stopName), `Expected official Metro stop "${stopName}" (${line.name}) to be covered`);
    }
  }

  assert.equal(CITY_METRO_STATIONS.length, 9);
  assert.equal(ALL_METRO_STATIONS.length, 12);
  assert.equal(LISBOA_CITY_DISTRICTS.length, 9);

  // Every city district must include both a plate food item and a glass drink item in its eatery
  for (const dist of LISBOA_CITY_DISTRICTS) {
    assert.equal(dist.townSpots.length, 3, `${dist.id} must have eatery, landmark, and shop`);
    const eatery = dist.townSpots.find((s) => s.kind === 'eatery');
    assert.ok(eatery && eatery.items.some((i) => i.servingType === 'plate'), `${dist.id} eatery must serve a plate food item`);
    assert.ok(eatery && eatery.items.some((i) => i.servingType === 'glass'), `${dist.id} eatery must serve a glass drink item`);
  }

  // 2. Verify exact multi-line BFS shortest-path and transfer hub computation
  const directVerde = computeMetroNetworkRoute('metro-baixa-chiado', 'metro-cais-sodre');
  assert.equal(directVerde.transferStation, null);
  assert.equal(directVerde.linesUsed.length, 1);
  assert.equal(directVerde.linesUsed[0].id, 'linha-verde');
  assert.deepEqual(directVerde.stationPath, ['Baixa-Chiado', 'Cais do Sodre']);

  const toOriente = computeMetroNetworkRoute('metro-baixa-chiado', 'metro-oriente-aeroporto');
  assert.equal(toOriente.transferStation, 'Alameda', 'Baixa-Chiado to Oriente transfers at Alameda (Linha Verde -> Linha Vermelha)');
  assert.deepEqual(toOriente.linesUsed.map((l) => l.id), ['linha-verde', 'linha-vermelha']);
  assert.ok(toOriente.stationPath.includes('Olaias'));
  assert.equal(toOriente.stationPath[toOriente.stationPath.length - 1], 'Oriente');

  const toRato = computeMetroNetworkRoute('metro-baixa-chiado', 'metro-rato');
  assert.equal(toRato.transferStation, 'Marques de Pombal', 'Baixa-Chiado to Rato transfers at Marques de Pombal (Linha Azul -> Linha Amarela)');
  assert.deepEqual(toRato.linesUsed.map((l) => l.id), ['linha-azul', 'linha-amarela']);

  // 3. Verify strict factual single-line boarding & Correspondencia physical line transfers:
  //    3A) Terreiro do Paco (Linha Azul ONLY) -> MUST reject Yellow Line (Rato) directly -> ride Blue to Marques de Pombal -> Correspondencia to Linha Amarela -> ride Yellow to Rato (single 1.80 EUR ticket covers free transfers!)
  const tpDirectBlueIds = getDirectStationsOnLine('metro-terreiro-paco', 'linha-azul').map((d) => d.station.id);
  assert.ok(tpDirectBlueIds.includes('metro-marques-pombal'));
  assert.ok(tpDirectBlueIds.includes('metro-baixa-chiado'));
  assert.equal(tpDirectBlueIds.includes('metro-rato'), false, 'Rato (Linha Amarela) is NOT directly reachable from Terreiro do Paco (Linha Azul)');
  assert.equal(tpDirectBlueIds.includes('metro-oriente-aeroporto'), false, 'Oriente (Linha Vermelha) is NOT directly reachable from Terreiro do Paco');
  assert.deepEqual(getStationLineIds('metro-terreiro-paco'), ['linha-azul']);
  assert.deepEqual(getStationLineIds('metro-marques-pombal'), ['linha-azul', 'linha-amarela']);

  const engine = new MemoriesGameEngine();
  const state = engine.getState();
  const startEuros = state.euros;

  const openTp = engine.openMetroStation('metro-terreiro-paco');
  assert.equal(openTp.ok, true);
  assert.equal(openTp.activeLineId, 'linha-azul');
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.activeLineId, 'linha-azul');

  // Cannot switch to Linha Amarela at Terreiro do Paco (not an interchange!)
  const badTransferAtTp = engine.transferMetroLine('linha-amarela');
  assert.equal(badTransferAtTp.ok, false);

  // Cannot board Linha Amarela (Rato) directly at Terreiro do Paco!
  const blockedYellow = engine.rideMetro('metro-terreiro-paco', 'metro-rato');
  assert.equal(blockedYellow.ok, false);
  assert.equal(blockedYellow.transferRequired, true);
  assert.equal(blockedYellow.transferStationId, 'metro-marques-pombal');
  assert.equal(blockedYellow.nextLegStationId, 'metro-marques-pombal');

  // Leg 1: Board Linha Azul from Terreiro do Paco to official Blue/Yellow transfer hub Marques de Pombal (pays 1.80 EUR once)
  const leg1Blue = engine.rideMetro('metro-terreiro-paco', 'metro-marques-pombal');
  assert.equal(leg1Blue.ok, true);
  assert.equal(leg1Blue.fareEur, METRO_LINE.fareEur);
  assert.equal(leg1Blue.activeLineId, 'linha-azul');
  for (let i = 0; i < 80; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.stationId, 'metro-marques-pombal');
  assert.equal(state.metro.activeLineId, 'linha-azul');
  assert.equal(state.metro.ticketPaid, true);

  // Still standing on Linha Azul platform at Marques de Pombal -> attempting to board Rato (Linha Amarela) prompts Correspondencia transfer first!
  const needPlatformSwitch = engine.rideMetro('metro-marques-pombal', 'metro-rato');
  assert.equal(needPlatformSwitch.ok, false);
  assert.equal(needPlatformSwitch.platformTransferRequired, true);
  assert.equal(needPlatformSwitch.targetLineId, 'linha-amarela');

  // Walk through free Correspondencia underground passage at Marques de Pombal to Linha Amarela platform!
  const trToYellow = engine.transferMetroLine('linha-amarela');
  assert.equal(trToYellow.ok, true);
  assert.equal(state.metro.phase, 'transferring');
  assert.equal(state.metro.transferToLineId, 'linha-amarela');
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.activeLineId, 'linha-amarela');

  // Leg 2: Board Linha Amarela to Rato with 0.00 EUR transfer fare included!
  const leg2Yellow = engine.rideMetro('metro-marques-pombal', 'metro-rato');
  assert.equal(leg2Yellow.ok, true);
  assert.equal(leg2Yellow.fareEur, 0, 'Connecting Metro leg inside gates must be covered by single 1.80 EUR Navegante ticket');
  assert.equal(leg2Yellow.activeLineId, 'linha-amarela');
  assert.equal(state.euros, Number((startEuros - METRO_LINE.fareEur).toFixed(2)));
  for (let i = 0; i < 80; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.stationId, 'metro-rato');
  assert.equal(state.metro.activeLineId, 'linha-amarela');

  // Exit gates at Rato straight onto unified open-world Principe Real / Rato street (resets ticketPaid, ZERO disjoint rooms!)
  engine.exitMetroStation();
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentNeighborhoodId, 'rato-principe-real');
  assert.ok(state.visitedCityDistricts.includes('district-rato-principe-real'));
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);
  assert.equal(state.metro.ticketPaid, false);

  //    3B) Full factual 2-line transfer journey: Baixa-Chiado (Blue -> Green) -> Alameda (Green -> Red) -> Oriente -> Unified Oriente Street -> Plate vs Glass -> Landmark -> Shop -> Return via Alameda -> Baixa-Chiado
  const openRes = engine.openMetroStation('metro-baixa-chiado');
  assert.equal(openRes.ok, true);
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.activeLineId, 'linha-azul');

  // Direct ride Baixa-Chiado -> Oriente MUST be rejected (Red Line is not served at Baixa-Chiado!)
  const blockedOriente = engine.rideMetro('metro-baixa-chiado', 'metro-oriente-aeroporto');
  assert.equal(blockedOriente.ok, false);
  assert.equal(blockedOriente.transferRequired, true);
  assert.equal(blockedOriente.transferStationId, 'metro-alameda');

  // Switch platform at Baixa-Chiado to Linha Verde -> ride direct to Alameda -> switch to Linha Vermelha -> ride direct to Oriente!
  assert.equal(engine.transferMetroLine('linha-verde').ok, true);
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.activeLineId, 'linha-verde');

  const toAlameda = engine.rideMetro('metro-baixa-chiado', 'metro-alameda');
  assert.equal(toAlameda.ok, true);
  assert.equal(state.metro.phase, 'riding');
  for (let i = 0; i < 80; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.stationId, 'metro-alameda');
  assert.equal(state.metro.activeLineId, 'linha-verde');

  assert.equal(engine.transferMetroLine('linha-vermelha').ok, true);
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.activeLineId, 'linha-vermelha');

  const rideRes = engine.rideMetro('metro-alameda', 'metro-oriente-aeroporto');
  assert.equal(rideRes.ok, true);
  assert.equal(rideRes.fareEur, 0);
  assert.equal(state.metro.phase, 'riding');
  for (let i = 0; i < 80; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.phase, 'platform');
  assert.equal(state.metro.stationId, 'metro-oriente-aeroporto');
  assert.equal(state.metro.activeLineId, 'linha-vermelha');

  // Ascend escalator straight into unified open-world Parque das Nacoes / Gare do Oriente sidewalk!
  const ascRes = engine.exitMetroStation();
  assert.equal(ascRes.ok, true);
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentNeighborhoodId, 'oriente-parque-nacoes');
  assert.ok(state.visitedCityDistricts.includes('district-oriente-parque-nacoes'));
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  // Verify soundscape reacts to riverfront Parque das Nacoes Tagus Estuary street
  const orienteSound = computeSoundscapeProfile(state);
  assert.ok(orienteSound.riverWater >= 0.5, 'Oriente riverfront neighborhood should have Tagus river ambience');

  // Order a drink (Glass) at Oriente waterfront eatery directly on the open-world street
  const drinkRes = engine.purchaseCityDistrictItem('oriente-marina-restaurante', 'item-oriente-espumante-glass');
  assert.equal(drinkRes.ok, true);
  assert.equal(state.seatedDining.servingType, 'glass');
  assert.ok(state.statusMessage.includes('Received a glass of'));

  // Order food (Plate) at Oriente waterfront eatery directly on the open-world street
  const foodRes = engine.purchaseCityDistrictItem('oriente-marina-restaurante', 'item-oriente-robalo-plate');
  assert.equal(foodRes.ok, true);
  assert.equal(state.seatedDining.servingType, 'plate');
  assert.ok(state.statusMessage.includes('Received a plate of'));

  // Explore iconic landmark & Telecabine Lisboa (+25 Energy) directly on the open-world street
  state.energy = 60;
  const lmRes = engine.interactWithCityDistrictSpot('oriente-calatrava-telecabine');
  assert.equal(lmRes.ok, true);
  assert.equal(state.energy, 85);
  assert.ok(state.cityDistrictFeedback && state.cityDistrictFeedback.title.includes('Gare do Oriente'));

  // Buy Oceanario keepsake into Satchel directly on the open-world street
  const shopRes = engine.purchaseCityDistrictItem('oriente-oceanario-loja', 'item-oceanario-lontra-keepsake');
  assert.equal(shopRes.ok, true);
  assert.ok(state.satchel.some((s) => s.id === 'item-oceanario-lontra-keepsake'));

  // Walk right back into Metro Oriente entrance on the street -> ride to Alameda -> transfer Linha Verde -> ride to Baixa-Chiado
  const backMetro = engine.openMetroStation('metro-oriente-aeroporto');
  assert.equal(backMetro.ok, true);
  assert.equal(state.mode, 'metro');
  assert.equal(state.metro.stationId, 'metro-oriente-aeroporto');
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.phase, 'platform');

  assert.equal(engine.rideMetro('metro-oriente-aeroporto', 'metro-alameda').ok, true);
  for (let i = 0; i < 80; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.stationId, 'metro-alameda');
  assert.equal(engine.transferMetroLine('linha-verde').ok, true);
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });

  const rideBack = engine.rideMetro('metro-alameda', 'metro-baixa-chiado');
  assert.equal(rideBack.ok, true);
  assert.equal(rideBack.fareEur, 0);
  for (let i = 0; i < 80; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.metro.stationId, 'metro-baixa-chiado');
  engine.exitMetroStation();
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.mode, 'overworld');
  assert.equal(getCityDistrictById('district-marques-pombal-avenida').shortName, 'Marques de Pombal');
});

test('Elevador de Santa Justa (1902): enterable lift on Rua do Carmo & Rossio, 45m climb, and factual 360-degree Lisbon panorama', () => {
  assert.equal(SANTA_JUSTA_LIFT.yearBuilt, 1902);
  assert.equal(SANTA_JUSTA_LIFT.heightMeters, 45);
  assert.equal(isOverworldPositionValid(SANTA_JUSTA_LIFT.spawnOutside.x, SANTA_JUSTA_LIFT.spawnOutside.y), true);
  assert.equal(isPointInVehicleLane(SANTA_JUSTA_LIFT.spawnOutside.x, SANTA_JUSTA_LIFT.spawnOutside.y), false);

  // Verify factual compass bearings of key Lisbon landmarks from Santa Justa 45m summit
  const byId = new Map(SANTA_JUSTA_PANORAMA_LANDMARKS.map((l) => [l.id, l]));
  assert.equal(byId.get('sj-rossio').compassLabel, 'N');
  assert.equal(byId.get('sj-castelo').compassLabel, 'E');
  assert.equal(byId.get('sj-se-panteao').compassLabel, 'SE');
  assert.equal(byId.get('sj-rua-augusta-tejo').compassLabel, 'S');
  assert.equal(byId.get('sj-ponte-cristo-rei').compassLabel, 'SSW');
  assert.equal(byId.get('sj-convento-carmo').compassLabel, 'W');

  const engine = new MemoriesGameEngine();
  const state = engine.getState();
  const startEuros = state.euros;

  // 1. Walk up to Elevador de Santa Justa on Rua do Carmo and enter via [E]
  state.player.x = SANTA_JUSTA_LIFT.spawnOutside.x;
  state.player.y = SANTA_JUSTA_LIFT.spawnOutside.y;
  const nearEntrance = engine.getNearbyInteraction();
  assert.equal(nearEntrance?.type, 'santa-justa');

  const enterRes = engine.triggerNearbyInteraction();
  assert.equal(enterRes.ok, true);
  assert.equal(state.mode, 'santa-justa');
  assert.equal(state.santaJusta.phase, 'lobby');
  assert.equal(state.santaJusta.altitudeMeters, 0);

  // 2. Board mahogany cabin -> animated 45m climb (1.80 EUR) -> open-air 45m miradouro
  const ascendRes = engine.ascendSantaJusta();
  assert.equal(ascendRes.ok, true);
  assert.equal(state.santaJusta.phase, 'ascending');
  assert.equal(state.euros, Number((startEuros - SANTA_JUSTA_LIFT.fareEur).toFixed(2)));
  for (let i = 0; i < 10; i += 1) engine.tick(0.16, { x: 0, y: 0 });
  assert.ok(state.santaJusta.altitudeMeters > 10 && state.santaJusta.altitudeMeters < 45, 'Lift must smoothly climb 0m -> 45m');
  for (let i = 0; i < 30; i += 1) engine.tick(0.15, { x: 0, y: 0 });
  assert.equal(state.santaJusta.phase, 'miradouro');
  assert.equal(state.santaJusta.altitudeMeters, 45);
  assert.equal(state.visitedSantaJustaMiradouro, true);

  // 3. Look around 360 degrees at real factual Lisbon landmarks & verify audio + postcard
  engine.lookAtSantaJustaLandmark('sj-rossio');
  assert.equal(state.santaJusta.focusedLandmarkId, 'sj-rossio');
  engine.lookAtSantaJustaLandmark('sj-rua-augusta-tejo');
  assert.equal(state.santaJusta.focusedLandmarkId, 'sj-rua-augusta-tejo');
  engine.lookAtSantaJustaLandmark('sj-convento-carmo');
  assert.equal(state.santaJusta.focusedLandmarkId, 'sj-convento-carmo');
  engine.lookAtSantaJustaLandmark('sj-castelo');
  assert.equal(state.santaJusta.focusedLandmarkId, 'sj-castelo');

  const sound = computeSoundscapeProfile(state);
  assert.equal(sound.activeLabel, 'Santa Justa 45m Miradouro');
  const pcRes = engine.triggerSharedPostcard();
  assert.equal(pcRes.ok, true);
  assert.ok(pcRes.postcard.locationName.includes('Elevador de Santa Justa'));

  // 4. Descend back to Rua do Carmo free of charge
  const descRes = engine.descendSantaJusta();
  assert.equal(descRes.ok, true);
  assert.equal(state.santaJusta.phase, 'descending');
  for (let i = 0; i < 30; i += 1) engine.tick(0.15, { x: 0, y: 0 });
  assert.equal(state.mode, 'overworld');
  assert.equal(state.euros, Number((startEuros - SANTA_JUSTA_LIFT.fareEur).toFixed(2)), 'Return descent must be free');

  // 5. Verify entering Elevador de Santa Justa from Rossio on unified open-world streets returns cleanly to overworld!
  engine.openMetroStation('metro-rossio');
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  engine.exitMetroStation();
  for (let i = 0; i < 20; i += 1) engine.tick(0.1, { x: 0, y: 0 });
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentNeighborhoodId, 'rossio-restauradores');

  const fromRossio = engine.interactWithCityDistrictSpot('rossio-santa-justa-lift');
  assert.equal(fromRossio.ok, true);
  assert.equal(state.mode, 'santa-justa');
  assert.equal(state.santaJusta.returnMode, 'overworld');
  engine.descendSantaJusta({ immediate: true });
  assert.equal(state.mode, 'overworld');
});

test('Unified seamless open-world Lisboa: ZERO portals, continuous foot walking, and 9 factual Carris bus & tram routes', () => {
  // 1. All 12 Metro stations and all 27 Greater Lisboa landmarks/eateries/shops sit on valid non-lane sidewalks on ONE unified map
  assert.equal(ALL_LISBOA_NEIGHBORHOODS.length, 12);
  assert.equal(ALL_METRO_STATIONS.length, 12);
  assert.equal(CITY_DISTRICT_SPOTS.length, 27);
  assert.equal(LISBOA_CITY_MAP_NODES.length, 10);

  for (const station of ALL_METRO_STATIONS) {
    assert.ok(station.spawnOutside, `Missing spawnOutside on ${station.id}`);
    assert.equal(isOverworldPositionValid(station.spawnOutside.x, station.spawnOutside.y), true, `${station.id} spawnOutside must be walkable`);
    assert.equal(isPointInVehicleLane(station.spawnOutside.x, station.spawnOutside.y), false, `${station.id} spawnOutside must stay off vehicle lanes`);
  }
  for (const spot of CITY_DISTRICT_SPOTS) {
    assert.ok(spot.spawnOutside, `Missing spawnOutside on ${spot.id}`);
    assert.equal(isOverworldPositionValid(spot.spawnOutside.x, spot.spawnOutside.y), true, `${spot.id} spawnOutside must be walkable`);
    assert.equal(isPointInVehicleLane(spot.spawnOutside.x, spot.spawnOutside.y), false, `${spot.id} spawnOutside must stay off vehicle lanes`);
  }

  // 2. All 9 real Carris surface routes (28E, 15E, 24E trams & 737, 736, 728, 746, 706, 744 buses) and all 41 stops sit off vehicle lanes on walkable sidewalks
  const expectedRoutes = ['28E', '737', '15E', '24E', '736', '728', '746', '706', '744'];
  assert.deepEqual(TRANSIT_LINES.map((l) => l.routeNumber), expectedRoutes);
  const allStops = getAllTransitStops();
  assert.equal(allStops.length, 41);
  for (const stop of allStops) {
    assert.equal(isOverworldPositionValid(stop.platformX, stop.platformY), true, `Stop ${stop.stopId} sidewalk platform must be walkable`);
    assert.equal(isPointInVehicleLane(stop.platformX, stop.platformY), false, `Stop ${stop.stopId} sidewalk platform must stay off vehicle lanes`);
  }

  // 3. Continuous physical walking on foot from Chiado straight up Avenida da Liberdade into Rossio and Marques de Pombal (ZERO portals!)
  const engine = new MemoriesGameEngine();
  const state = engine.getState();
  const startEuros = state.euros;
  assert.equal(state.vehicles.length, 9, 'All 9 Carris surface transit vehicles must run simultaneously');

  // Stand on the west sidewalk of Avenida da Liberdade (x = 892, y = 220 in Chiado) and walk continuously north on foot!
  engine.setPlayerPosition(892, 220);
  assert.equal(state.currentNeighborhoodId, 'chiado');
  for (let i = 0; i < 110; i += 1) {
    state.energy = 100;
    state.fullness = 90;
    engine.tick(0.1, { x: 0, y: -1 });
  }
  assert.equal(state.mode, 'overworld', 'Walking north across Lisbon must remain continuously in overworld with zero portals');
  assert.equal(state.currentNeighborhoodId, 'rossio-restauradores');
  assert.ok(state.visitedCityDistricts.includes('district-rossio-restauradores'), 'Walking naturally into Rossio must mark Rossio visited');

  // Keep walking north along Avenida da Liberdade right into Marques de Pombal!
  for (let i = 0; i < 100; i += 1) {
    state.energy = 100;
    state.fullness = 90;
    engine.tick(0.1, { x: 0, y: -1 });
  }
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentNeighborhoodId, 'marques-pombal-avenida');
  assert.ok(state.visitedCityDistricts.includes('district-marques-pombal-avenida'));

  // Keep walking continuously all the way north into Campo Grande!
  for (let i = 0; i < 100; i += 1) {
    state.energy = 100;
    state.fullness = 90;
    engine.tick(0.1, { x: 0, y: -1 });
  }
  assert.equal(state.mode, 'overworld');
  assert.equal(state.currentNeighborhoodId, 'campo-grande-alvalade');
  assert.ok(state.visitedCityDistricts.includes('district-campo-grande-alvalade'));
  assert.equal(state.euros, startEuros, 'Walking on foot across Greater Lisboa must be free');

  // 4. Ride real Carris Bus 736 (Baixa - Rossio - Marques de Pombal - Campo Grande - Saldanha) seamlessly across neighborhoods!
  const stop736Rossio = allStops.find((s) => s.stopId === 'stop-bus736-rossio');
  assert.ok(stop736Rossio, 'Carris Bus 736 must serve Rossio');
  engine.setPlayerPosition(stop736Rossio.platformX, stop736Rossio.platformY);
  const board736 = engine.boardTransitAtStop(stop736Rossio.stopId, { waitIfApproaching: true });
  assert.equal(board736.ok, true);
  assert.equal(engine.getRidingVehicle().routeNumber, '736');
  const bus736Audio = computeSoundscapeProfile(state);
  assert.ok(bus736Audio.activeLabel.includes('736'), `Audio label should reflect Bus 736, got ${bus736Audio.activeLabel}`);
  // Ride until Bus 736 reaches the next stop north and step off onto a valid sidewalk!
  const alight736 = engine.disembarkTransit({ immediateToNextStop: true });
  assert.equal(alight736.ok, true);
  assert.equal(state.ridingVehicleId, null);
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  // 5. Ride real Carris Bus 728 along the entire Tagus riverfront from Belem to Gare do Oriente!
  const stop728Belem = allStops.find((s) => s.stopId === 'stop-bus728-belem');
  assert.ok(stop728Belem, 'Carris Bus 728 must serve Belem');
  engine.setPlayerPosition(stop728Belem.platformX, stop728Belem.platformY);
  assert.equal(state.currentNeighborhoodId, 'cais-sodre-belem');
  const board728 = engine.boardTransitAtStop(stop728Belem.stopId, { waitIfApproaching: true });
  assert.equal(board728.ok, true);
  assert.equal(engine.getRidingVehicle().routeNumber, '728');
  // Ride across the waterfront and alight cleanly
  engine.disembarkTransit({ immediateToNextStop: true });
  assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true);

  // 6. Ride Eletrico 15E (Belem Waterfront) and Eletrico 24E (Principe Real & Rato) and Buses 746, 706, 744!
  const sampleStops = [
    { stopId: 'stop-tram15-belem', expectedNum: '15E', expectedMode: 'tram' },
    { stopId: 'stop-tram24-rato', expectedNum: '24E', expectedMode: 'tram' },
    { stopId: 'stop-bus746-saoseb', expectedNum: '746', expectedMode: 'bus' },
    { stopId: 'stop-bus706-alameda', expectedNum: '706', expectedMode: 'bus' },
    { stopId: 'stop-bus744-oriente', expectedNum: '744', expectedMode: 'bus' }
  ];
  for (const sample of sampleStops) {
    const stObj = allStops.find((s) => s.stopId === sample.stopId);
    assert.ok(stObj, `Missing Carris stop ${sample.stopId}`);
    engine.setPlayerPosition(stObj.platformX, stObj.platformY);
    const bRes = engine.boardTransitAtStop(stObj.stopId, { waitIfApproaching: true });
    assert.equal(bRes.ok, true, `Failed boarding ${sample.expectedNum} at ${sample.stopId}: ${bRes.error}`);
    const riding = engine.getRidingVehicle();
    assert.equal(riding.routeNumber, sample.expectedNum);
    assert.equal(riding.mode, sample.expectedMode);
    engine.disembarkTransit({ immediateToNextStop: true });
    assert.equal(isOverworldPositionValid(state.player.x, state.player.y), true, `Alighting ${sample.expectedNum} must land on valid sidewalk`);
  }

  // 7. Verify 2D neighborhood lookup covers Belem, Campo Grande, Oriente, and Historic Core accurately
  assert.equal(getNeighborhoodAt(-1180, 878).id, 'cais-sodre-belem');
  assert.equal(getNeighborhoodAt(1094, -1814).id, 'campo-grande-alvalade');
  assert.equal(getNeighborhoodAt(3094, -454).id, 'oriente-parque-nacoes');
  assert.equal(getNeighborhoodAt(1151, 546).id, 'chiado');
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
    path.join('src', 'streetview3d.js'),
    path.join('src', 'scenes3d.js'),
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
