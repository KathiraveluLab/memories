import {
  WORLD_MIN_X,
  WORLD_MAX_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  ALL_LISBOA_NEIGHBORHOODS,
  DECORATIVE_STRUCTURES,
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
  LISBOA_CORRIDOR_LANDMARKS,
  ENTERABLE_LANDMARK_VENUES,
  ALL_ENTERABLE_VENUES,
  findEnterableVenueById,
  CITY_DISTRICT_PORTALS,
  OVERWORLD_CITY_GATEWAYS,
  getWalkingAvenuesFrom,
  getLisboaZoneShortName,
  computeLisboaWalkingRoute,
  getMetroLineById,
  getStationLineIds,
  getDirectStationsOnLine,
  computeMetroNetworkRoute,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  FUNICULAR_LINES,
  MILESTONE_MEMORIES,
  AMBIENT_NPCS,
  SEASONAL_CROWD_NPCS,
  RIVERSIDE_JOGGERS,
  RIVERSIDE_BENCHES,
  CASTANHA_VENDORS,
  CASTANHA_CONE_ITEM,
  isBairroAltoPartyTime,
  DEFAULT_MONTH,
  LISBOA_MONTHS,
  getMonthInfo,
  getTerrainElevation,
  PLAYER_OUTFITS,
  getAllTransitStops,
  getAllMemoryCatalog,
  getNeighborhoodAt,
  getNeighborhoodForX
} from '../data.js';

export const INITIAL_EUROS = 120.0;
export const INITIAL_ENERGY = 100;
export const INITIAL_FULLNESS = 85;
export const DAY_START_MINUTES = 9 * 60; // 09:00
export const EVENING_SUGGEST_MINUTES = 21 * 60 + 30; // 21:30
export const OVERNIGHT_COST_EUR = 18.0;
export const LOW_FUND_STIPEND_THRESHOLD = 25.0;
export const LOW_FUND_STIPEND_AMOUNT = 25.0;
export const PLAYER_RADIUS = 13;
export const PERSON_SEPARATION_DIST = PLAYER_RADIUS * 2 + 2;
export const VEHICLE_HALF_LEN = 38;
export const VEHICLE_HALF_WIDTH = 17;
export const VEHICLE_BRAKE_LOOKAHEAD = 76;
export const BASE_WALK_SPEED = 64;
export const INTERIOR_WALK_SPEED = 76;
export const INTERACT_DISTANCE = 76;
export const CRITICAL_LOW_ENERGY_THRESHOLD = 20;
export const PROPORTIONAL_SLOWDOWN_THRESHOLD = 70;

export const VENUE_MAP = new Map(ALL_ENTERABLE_VENUES.map((v) => [v.id, v]));
export const METRO_MAP = new Map(ALL_METRO_STATIONS.map((m) => [m.id, m]));
export const CITY_DISTRICT_MAP = new Map(LISBOA_CITY_DISTRICTS.map((d) => [d.id, d]));
export const FERRY_DEST_MAP = new Map(FERRY_DESTINATIONS.map((d) => [d.id, d]));
export const REST_SPOT_MAP = new Map(REST_SPOTS.map((s) => [s.id, s]));
export const RIVERSIDE_BENCH_MAP = new Map(RIVERSIDE_BENCHES.map((b) => [b.id, b]));
export const CASTANHA_VENDOR_MAP = new Map(CASTANHA_VENDORS.map((c) => [c.id, c]));
export const TRANSIT_LINE_MAP = new Map(TRANSIT_LINES.map((l) => [l.id, l]));
export const FUNICULAR_MAP = new Map(FUNICULAR_LINES.map((f) => [f.id, f]));

export function computeFunicularCarPose(fun, carIndex = 0) {
  const t = clamp(carIndex === 0 ? fun.progress : 1 - fun.progress, 0, 1);
  const y = fun.bottomY + (fun.topY - fun.bottomY) * t;
  const loopSpread = Math.exp(-Math.pow((t - 0.5) / 0.14, 2));
  const side = carIndex === 0 ? -1 : 1;
  const x = fun.trackX + side * (fun.passingHalfOffset || 14) * loopSpread;
  const z = getTerrainElevation(x, y);
  const climbing = carIndex === 0 ? fun.dir > 0 : fun.dir < 0;
  return { x, y, z, t, climbing };
}

export function createInitialFuniculars() {
  return FUNICULAR_LINES.map((line, idx) => ({
    ...line,
    progress: idx === 0 ? 0.05 : 0.94,
    dir: idx === 0 ? 1 : -1,
    dwellRemaining: 0
  }));
}
export const ALL_STOPS = getAllTransitStops();
export const STOP_MAP = new Map(ALL_STOPS.map((s) => [s.stopId, s]));
export const ALL_MEMORIES = getAllMemoryCatalog();

export const SOLID_OVERWORLD_RECTS = [
  ...VENUES.map((v) => ({ x: v.x, y: v.y, w: v.w, h: v.h, id: v.id })),
  ...DECORATIVE_STRUCTURES.map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, id: d.id })),
  ...ALL_METRO_STATIONS.filter((m) => Number.isFinite(m.x)).map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h, id: m.id })),
  ...CITY_DISTRICT_SPOTS.map((s) => ({ x: s.worldX, y: s.worldY, w: s.w, h: s.h, id: s.id })),
  ...LISBOA_CORRIDOR_LANDMARKS.map((s) => ({ x: s.worldX, y: s.worldY, w: s.w, h: s.h, id: s.id })),
  { x: FERRY_TERMINAL.x, y: FERRY_TERMINAL.y, w: FERRY_TERMINAL.w, h: FERRY_TERMINAL.h, id: FERRY_TERMINAL.id },
  { x: SANTA_JUSTA_LIFT.x, y: SANTA_JUSTA_LIFT.y, w: SANTA_JUSTA_LIFT.w, h: SANTA_JUSTA_LIFT.h, id: SANTA_JUSTA_LIFT.id },
  // Aeroporto Humberto Delgado (LIS) Fenced Airside Runway 03/21 Perimeter (prevents walking onto active runway!)
  { x: 2880, y: -2345, w: 1380, h: 345, id: 'aeroporto-runway-fence' }
];

export const FERRY_PIER_ZONES = {
  exitY: 168,
  exitHalfWidth: 68,
  gangwayY: 266,
  gangwayHalfWidth: 165
};

export const INTERIOR_STATIONS = {
  counter: { x: 380, y: 205, radius: 74, label: 'Proprietor Counter' },
  display: { x: 175, y: 245, radius: 66, label: 'Local Display' },
  exitMat: { x: 380, y: 416, halfWidth: 60, triggerY: 404 }
};

export const METRO_PLATFORM_ZONES = {
  escalatorTopY: 74,
  escalatorBottomY: 174,
  escalatorExitTriggerY: 172,
  escalatorHalfWidth: 56,
  boardingZoneY: 266,
  boardingHalfWidth: 165,
  transferX: 658,
  transferY: 206,
  transferRadius: 68
};

export const METRO_ESCALATOR_DURATION = 1.0;
export const METRO_TRANSFER_DURATION = 1.1;
export const METRO_RIDE_BASE_DURATION = 3.0;
export const METRO_RIDE_EXTRA_HOP_DURATION = 1.2;
export const SANTA_JUSTA_RIDE_DURATION = 3.2;
export const CITY_AVENUE_WALK_DURATION = 1.45;

export const SOLID_INTERIOR_RECTS = [
  { x: 62, y: 204, w: 72, h: 118 },
  { x: 590, y: 225, w: 92, h: 54 },
  { x: 590, y: 325, w: 92, h: 54 }
];

export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function formatClock(minutesOfDay) {
  const normalized = ((Math.floor(minutesOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getDayPhase(minutesOfDay) {
  const m = ((Math.floor(minutesOfDay) % 1440) + 1440) % 1440;
  if (m < 12 * 60) return { id: 'morning', label: 'MORNING' };
  if (m < 17 * 60) return { id: 'afternoon', label: 'AFTERNOON' };
  if (m < 19 * 60 + 30) return { id: 'golden', label: 'GOLDEN HOUR' };
  return { id: 'evening', label: 'EVENING' };
}

export function getVenueById(venueId) {
  return VENUE_MAP.get(venueId) || null;
}

export function getMetroStationById(stationId) {
  return METRO_MAP.get(stationId) || null;
}

export function getCityDistrictById(districtId) {
  return CITY_DISTRICT_MAP.get(districtId) || null;
}

export function getFerryDestinationById(destId) {
  return FERRY_DEST_MAP.get(destId) || null;
}

export function getRestSpotById(spotId) {
  return REST_SPOT_MAP.get(spotId) || null;
}

export function getStopById(stopId) {
  return STOP_MAP.get(stopId) || null;
}

export function getTransitLineById(lineId) {
  return TRANSIT_LINE_MAP.get(lineId) || null;
}

export function getItemServingType(item) {
  if (!item) return 'plate';
  if (item.servingType === 'glass' || item.servingType === 'plate') {
    return item.servingType;
  }
  if (item.kind === 'drink') return 'glass';
  const idAndName = `${item.id || ''} ${item.name || ''}`.toLowerCase();
  if (
    /\b(ginjinha|imperial|caipirinha|sangria|limonada|vinho|copo|cerveja|galao|sumo|cocktail|drink)\b/.test(
      idAndName
    )
  ) {
    return 'glass';
  }
  return 'plate';
}

export function circleIntersectsRect(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

export function toVehicleLocal(px, py, vehicle) {
  const dx = px - vehicle.x;
  const dy = py - vehicle.y;
  const cos = Math.cos(-vehicle.heading);
  const sin = Math.sin(-vehicle.heading);
  return {
    localX: dx * cos - dy * sin,
    localY: dx * sin + dy * cos
  };
}

export function pointIntersectsVehicle(px, py, radius, vehicle) {
  const { localX, localY } = toVehicleLocal(px, py, vehicle);
  const pad = radius + 4;
  return (
    Math.abs(localX) < VEHICLE_HALF_LEN + pad &&
    Math.abs(localY) < VEHICLE_HALF_WIDTH + pad
  );
}

export function isPedestrianAheadOfVehicle(vehicle, px, py, radius = PLAYER_RADIUS) {
  const { localX, localY } = toVehicleLocal(px, py, vehicle);
  const inFront = localX > -VEHICLE_HALF_LEN - radius && localX < VEHICLE_HALF_LEN + VEHICLE_BRAKE_LOOKAHEAD;
  const inLane = Math.abs(localY) < VEHICLE_HALF_WIDTH + radius + 3;
  return inFront && inLane;
}

export function isPointInVehicleLane(px, py) {
  // Horizontal transit corridors across unified Lisboa:
  // Row 0 Tagus Waterfront (Tram 15E, Bus 728, Bus 737, Bus 706): y 908..956
  if (px >= -1460 && px <= 3400 && py >= 908 && py <= 956) return true;
  // Row 1 Historic Ridge (Tram 28E): y 586..634
  if (px >= 200 && px <= 2200 && py >= 586 && py <= 634) return true;
  // Row 2 Historic North (Bus 737, Tram 24E, Bus 736): y 262..308
  if (px >= -584 && px <= 2240 && py >= 262 && py <= 308) return true;
  // Row 3 Rato / Rossio / Alameda / Oriente (Tram 24E, Bus 706, Bus 736, Bus 744, Bus 728): y -408..-360
  if (px >= -960 && px <= 3620 && py >= -408 && py <= -360) return true;
  // Row 4 Sao Sebastiao / Marques de Pombal / Saldanha / Olivais (Bus 746, Bus 736, Bus 744): y -1088..-1040
  if (px >= -980 && px <= 3384 && py >= -1088 && py <= -1040) return true;
  // Row 5 Campo Grande / Cidade Universitaria / Aeroporto Humberto Delgado (Bus 746, Bus 736, Bus 744): y -1768..-1720
  if (px >= -584 && px <= 3540 && py >= -1768 && py <= -1720) return true;
  // Row 6 Northern Ring (Reboleira - Amadora - Pontinha - Odivelas - Lumiar): y -2448..-2400
  if (px >= -2300 && px <= 4180 && py >= -2448 && py <= -2400) return true;
  // Vertical transit corridors:
  // Col W1 Cais do Sodre - Rato - Sao Sebastiao - Forcas Armadas (Bus 706, Tram 24E, Bus 746): x -584..-536
  if (py >= -1768 && py <= 956 && px >= -584 && px <= -536) return true;
  // Col H-West Bus 737 West: x 138..186
  if (py >= 262 && py <= 956 && px >= 138 && px <= 186) return true;
  // Col C2 Avenida da Liberdade (Bus 736, Bus 746): x 911..959
  if (py >= -1768 && py <= 308 && px >= 911 && px <= 959) return true;
  // Col C3 Av. Almirante Reis / Av. da Republica (Bus 736, Bus 744): x 1721..1769
  if (py >= -1768 && py <= 308 && px >= 1721 && px <= 1769) return true;
  // Col H-East Santa Apolonia - Olaias (Bus 737, Bus 706): x 2190..2240
  if (py >= -408 && py <= 956 && px >= 2190 && px <= 2240) return true;
  // Col E1 Alameda dos Oceanos / Av. Berlim (Bus 728, Bus 744 to Oriente & Aeroporto): x 3336..3384
  if (py >= -1768 && py <= 956 && px >= 3336 && px <= 3384) return true;
  return false;
}

export function isPointOnSidewalk(px, py) {
  if (isPointInVehicleLane(px, py)) return false;
  if (!isOverworldPositionValid(px, py, PLAYER_RADIUS)) return false;
  // Exclude roadway curb-to-curb lanes of horizontal avenues while preserving full stone sidewalks
  if (py > -2464 && py < -2386) return false;
  if (py > -1784 && py < -1706) return false;
  if (py > -1104 && py < -1026) return false;
  if (py > -424 && py < -346) return false;
  if (py > 246 && py < 324) return false;
  if (py > 575 && py < 645) return false;
  if (py > 892 && py < 970) return false;
  return true;
}

export function isOverworldPositionValid(x, y, radius = PLAYER_RADIUS) {
  if (x < WORLD_MIN_X + 40 + radius || x > WORLD_MAX_X - 40 - radius) return false;
  if (y < WORLD_MIN_Y + 6 + radius || y > WATERFRONT_Y - 12 - radius) return false;
  for (const rect of SOLID_OVERWORLD_RECTS) {
    if (circleIntersectsRect(x, y, radius, rect)) {
      return false;
    }
  }
  return true;
}

export function isInteriorPositionValid(x, y, radius = PLAYER_RADIUS) {
  if (x < 68 + radius || x > INTERIOR_WIDTH - 68 - radius) return false;
  if (y < 188 + radius || y > INTERIOR_HEIGHT - 24 - radius) return false;
  for (const rect of SOLID_INTERIOR_RECTS) {
    if (circleIntersectsRect(x, y, radius, rect)) {
      return false;
    }
  }
  return true;
}

export function isMetroPlatformPositionValid(x, y, radius = PLAYER_RADIUS) {
  // Walkable tiled concourse & platform safely behind the yellow track safety line
  if (x < 64 + radius || x > INTERIOR_WIDTH - 64 - radius) return false;
  if (y < 156 + radius || y > 286 - radius) return false;
  return true;
}

export function isFerryPierPositionValid(x, y, radius = PLAYER_RADIUS) {
  // Walkable Transtejo timber & limestone pier safely north of the Tagus water edge
  if (x < 64 + radius || x > INTERIOR_WIDTH - 64 - radius) return false;
  if (y < 156 + radius || y > 282 - radius) return false;
  return true;
}

export function isCityDistrictPositionValid(x, y, radius = PLAYER_RADIUS) {
  // Walkable calçada portuguesa city district plaza linking eatery, landmark/transit, shop, and Metro entrance
  if (x < 64 + radius || x > INTERIOR_WIDTH - 64 - radius) return false;
  if (y < 156 + radius || y > 282 - radius) return false;
  return true;
}

export function getNextWaypointIndex(line, currentIndex, direction) {
  const len = line.waypoints.length;
  if (line.loopType === 'cycle') {
    return { nextIndex: (currentIndex + 1) % len, nextDirection: 1 };
  }
  let nextIdx = currentIndex + direction;
  let nextDir = direction;
  if (nextIdx >= len) {
    nextDir = -1;
    nextIdx = len - 2;
  } else if (nextIdx < 0) {
    nextDir = 1;
    nextIdx = 1;
  }
  return { nextIndex: nextIdx, nextDirection: nextDir };
}

export function findUpcomingStopName(line, fromIndex, direction) {
  const len = line.waypoints.length;
  let idx = fromIndex;
  let dir = direction;
  for (let steps = 0; steps < len * 2; steps += 1) {
    const step = getNextWaypointIndex(line, idx, dir);
    idx = step.nextIndex;
    dir = step.nextDirection;
    const wp = line.waypoints[idx];
    if (wp && wp.stopName) {
      return wp.stopName;
    }
  }
  return line.name;
}

export function createInitialVehicles() {
  return TRANSIT_LINES.map((line, i) => {
    const startIdx = i === 0 ? 1 : i === 1 ? 2 : Math.min(1, line.waypoints.length - 1);
    const wp = line.waypoints[startIdx];
    const nextStep = getNextWaypointIndex(line, startIdx, 1);
    const nextWp = line.waypoints[nextStep.nextIndex];
    const heading = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);
    return {
      id: line.id,
      routeNumber: line.routeNumber || line.badge,
      mode: line.mode,
      name: line.name,
      badge: line.badge,
      fareEur: line.fareEur,
      color: line.color,
      trimColor: line.trimColor,
      x: wp.x,
      y: wp.y,
      heading,
      waypointIndex: startIdx,
      direction: 1,
      dwellRemaining: wp.stopId ? 2.5 : 0,
      yielding: false,
      currentStopId: wp.stopId || null,
      currentStopName: wp.stopName || null,
      nextStopName: findUpcomingStopName(line, startIdx, 1)
    };
  });
}

export function createNpcRecord(npc) {
  return {
    ...npc,
    homeX: npc.x,
    homeY: npc.y,
    dir: 1,
    walkPhase: 0,
    isMoving: true,
    blockedTime: 0,
    avoidSide: 0
  };
}

export function createInitialNpcs(month = DEFAULT_MONTH) {
  const info = getMonthInfo(month);
  const extras = SEASONAL_CROWD_NPCS.slice(0, Math.max(0, info.crowdExtra || 0));
  return [...AMBIENT_NPCS, ...extras].map(createNpcRecord);
}

export function createInitialJoggers(month = DEFAULT_MONTH) {
  const info = getMonthInfo(month);
  const count = Math.max(0, info.warmJoggersCount || 0);
  return RIVERSIDE_JOGGERS.slice(0, count).map((j, idx) => ({
    ...createNpcRecord(j),
    dir: idx % 2 === 0 ? 1 : -1
  }));
}

export function recordLog(state, type, summary) {
  state.journal.unshift({
    id: state.journal.length + 1,
    day: state.day,
    clock: formatClock(state.minutesOfDay),
    type,
    summary
  });
  if (state.journal.length > 60) {
    state.journal.pop();
  }
}

export function recordPhrase(state, phraseObj, sourceLabel) {
  if (!phraseObj || !phraseObj.pt) return false;
  const exists = state.learnedPhrases.some((entry) => entry.pt === phraseObj.pt);
  if (exists) return false;
  state.learnedPhrases.push({
    pt: phraseObj.pt,
    pronunciation: phraseObj.pronunciation || '',
    en: phraseObj.en,
    source: sourceLabel,
    day: state.day
  });
  return true;
}

export function unlockMemory(state, memoryDef) {
  if (!memoryDef || !memoryDef.id) return false;
  const exists = state.memories.some((m) => m.id === memoryDef.id);
  if (exists) return false;
  state.memories.push({
    ...memoryDef,
    day: state.day,
    clock: formatClock(state.minutesOfDay)
  });
  recordLog(state, 'memory', `Captured Memory: ${memoryDef.title}`);
  if (state.memories.length >= ALL_MEMORIES.length && !state.albumCompleted) {
    state.albumCompleted = true;
    recordLog(state, 'milestone', `Lisboa Memory Album complete! All ${ALL_MEMORIES.length} neighborhood memories captured.`);
  }
  return true;
}

export function createInitialState() {
  const startX = 950;
  const startY = 544;
  const startHood = getNeighborhoodForX(startX);

  const state = {
    mode: 'overworld', // 'overworld' | 'interior' | 'metro' | 'ferry'
    viewMode: 'street3d', // 'street3d' | 'overhead'
    cameraYaw: 0.08, // Looking east along Largo do Chiado toward Cafe A Brasileira & Tram 28E
    cameraPitch: 0.03,
    euros: INITIAL_EUROS,
    energy: INITIAL_ENERGY,
    fullness: INITIAL_FULLNESS,
    walkSpeedMultiplier: 1.0,
    needsMealToRecoverSpeed: false,
    gameOver: false,
    gameOverReason: null,
    gameOverSummary: null,
    lastExportedSummaryCard: '',
    month: DEFAULT_MONTH,
    monthInfo: getMonthInfo(DEFAULT_MONTH),
    day: 1,
    minutesOfDay: DAY_START_MINUTES,
    bairroAltoPartyActive: isBairroAltoPartyTime(DAY_START_MINUTES),
    eveningNoticeShown: false,
    player: {
      name: 'Traveler 1',
      outfitId: PLAYER_OUTFITS[0].id,
      emoteText: '',
      emoteTimer: 0,
      x: startX,
      y: startY,
      facing: 'down',
      walkPhase: 0,
      isMoving: false,
      overworldX: startX,
      overworldY: startY,
      walkTarget: null,
      walkQueue: []
    },
    remotePlayers: [],
    currentNeighborhoodId: startHood.id,
    currentNeighborhoodName: startHood.name,
    visitedNeighborhoods: [startHood.id],
    currentVenueId: null,
    visitedVenues: [],
    activeMetroStationId: null,
    visitedMetroStations: [],
    cityDistrictId: null,
    visitedCityDistricts: [],
    activeCityDistrictSpotId: null,
    cityDistrictFeedback: null,
    metro: {
      stationId: null,
      activeLineId: null, // 'linha-azul' | 'linha-amarela' | 'linha-verde' | 'linha-vermelha'
      transferToLineId: null,
      ticketPaid: false,
      phase: null, // 'descending' | 'platform' | 'transferring' | 'riding' | 'ascending'
      phaseProgress: 0,
      fromStationId: null,
      toStationId: null,
      rideDuration: METRO_RIDE_BASE_DURATION,
      direction: 1, // 1 = eastbound/southbound, -1 = westbound/northbound
      trainX: 380,
      tunnelOffset: 0,
      route: null
    },
    ferry: {
      portId: null, // 'cais-do-sodre' | 'cacilhas' | 'seixal' | 'montijo'
      phase: null, // 'terminal' | 'sailing'
      phaseProgress: 0,
      fromPortId: null,
      toPortId: null,
      sailDuration: 4.5,
      waveOffset: 0
    },
    santaJusta: {
      phase: null, // 'lobby' | 'ascending' | 'miradouro' | 'descending'
      phaseProgress: 0,
      altitudeMeters: 0,
      ticketPaid: false,
      returnMode: 'overworld',
      returnDistrictId: null,
      focusedLandmarkId: 'sj-castelo'
    },
    visitedSantaJustaMiradouro: false,
    cityWalk: {
      active: false,
      progress: 0,
      duration: CITY_AVENUE_WALK_DURATION,
      fromZoneId: null,
      toZoneId: null,
      toSlot: null,
      avenueName: '',
      shortLabel: '',
      distanceMeters: 0,
      walkMinutes: 0,
      sceneryStyle: 'grand-boulevard'
    },
    visitedFerryPorts: [],
    activeSouthBankSpotId: null,
    southBankFeedback: null,
    busScrollOffset: 0,
    tramScrollOffset: 0,
    transitAnnouncement: null,
    ferryHornSignal: null,
    metroDoorChime: null,
    miradouroPerformances: REST_SPOTS.map((spot) => ({
      spotId: spot.id,
      spotName: spot.name,
      neighborhood: spot.neighborhood,
      musicianName: spot.musicianName || 'Musico de Lisboa',
      instrument: spot.instrument || 'Guitarra Portuguesa',
      musicianOutfitId: spot.musicianOutfitId || 'fado-blazer',
      songs: Array.isArray(spot.songs) && spot.songs.length > 0 ? spot.songs : ['Serenata de Lisboa'],
      songIndex: 0,
      songTitle: (Array.isArray(spot.songs) && spot.songs[0]) || 'Serenata de Lisboa'
    })),
    miradouroEncore: null,
    sharedToast: null,
    cathedralChime: null,
    sharedPostcard: null,
    postcards: [],
    ridingVehicleId: null,
    alightAtNextStop: false,
    ridingFunicularId: null,
    ridingFunicularCarIndex: 0,
    ridingFunicularTargetEnd: null,
    elevationMeters: Math.round(getTerrainElevation(950, 544) * 0.65),
    seatedBenchId: null,
    seatedBench: null,
    seatedDining: null,
    indoorActivity: null,
    holdingConeTimer: 0,
    vehicles: createInitialVehicles(),
    funiculars: createInitialFuniculars(),
    npcs: createInitialNpcs(),
    joggers: createInitialJoggers(),
    memories: [],
    totalMemoriesPossible: ALL_MEMORIES.length,
    albumCompleted: false,
    satchel: [],
    tastedFoods: [],
    learnedPhrases: [
      {
        pt: 'Bom dia! Estou a explorar Lisboa a pe, de eletrico e de metro.',
        pronunciation: 'Bohm dee-ah! Esh-toh ah esh-ploh-rahr Leesh-boh-ah ah peh, deh eh-leh-tree-koo ee deh meh-troo.',
        en: 'Good morning! I am exploring Lisbon on foot, by tram, and by metro.',
        source: 'Praca Luis de Camoes',
        day: 1
      }
    ],
    journal: [],
    statusMessage: 'Welcome to Lisboa! Walk along the cobblestone sidewalks of Bairro Alto, Chiado, and Alfama, ride Tram 28E, Carris Bus, or Metro de Lisboa, and visit local shops and cafes.',
    stats: {
      distanceWalkedPx: 0,
      tramRides: 0,
      busRides: 0,
      metroRides: 0,
      ferryRides: 0,
      funicularRides: 0,
      venuesEntered: 0,
      mealsEaten: 0,
      castanhaConesBought: 0,
      souvenirsBought: 0,
      restsTaken: 0,
      eurosSpent: 0
    }
  };

  recordLog(state, 'start', 'Arrived at Praca Luis de Camoes on Day 1 at 09:00 with 120.00 EUR.');
  return state;
}
