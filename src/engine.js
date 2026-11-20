import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  DECORATIVE_STRUCTURES,
  METRO_LINE,
  METRO_STATIONS,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  MILESTONE_MEMORIES,
  AMBIENT_NPCS,
  getAllTransitStops,
  getAllMemoryCatalog,
  getNeighborhoodForX
} from './data.js';

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
export const BASE_WALK_SPEED = 165;
export const INTERIOR_WALK_SPEED = 155;
export const INTERACT_DISTANCE = 76;

const VENUE_MAP = new Map(VENUES.map((v) => [v.id, v]));
const METRO_MAP = new Map(METRO_STATIONS.map((m) => [m.id, m]));
const REST_SPOT_MAP = new Map(REST_SPOTS.map((s) => [s.id, s]));
const TRANSIT_LINE_MAP = new Map(TRANSIT_LINES.map((l) => [l.id, l]));
const ALL_STOPS = getAllTransitStops();
const STOP_MAP = new Map(ALL_STOPS.map((s) => [s.stopId, s]));
const ALL_MEMORIES = getAllMemoryCatalog();

const SOLID_OVERWORLD_RECTS = [
  ...VENUES.map((v) => ({ x: v.x, y: v.y, w: v.w, h: v.h, id: v.id })),
  ...DECORATIVE_STRUCTURES.map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, id: d.id })),
  ...METRO_STATIONS.map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h, id: m.id }))
];

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
  boardingHalfWidth: 165
};

export const METRO_ESCALATOR_DURATION = 1.0;
export const METRO_RIDE_BASE_DURATION = 3.0;
export const METRO_RIDE_EXTRA_HOP_DURATION = 1.2;

const SOLID_INTERIOR_RECTS = [
  { x: 62, y: 204, w: 72, h: 118 },
  { x: 590, y: 225, w: 92, h: 54 },
  { x: 590, y: 325, w: 92, h: 54 }
];

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
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

export function getRestSpotById(spotId) {
  return REST_SPOT_MAP.get(spotId) || null;
}

export function getStopById(stopId) {
  return STOP_MAP.get(stopId) || null;
}

export function getTransitLineById(lineId) {
  return TRANSIT_LINE_MAP.get(lineId) || null;
}

function circleIntersectsRect(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function toVehicleLocal(px, py, vehicle) {
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
  const inLane = Math.abs(localY) < VEHICLE_HALF_WIDTH + radius + 12;
  return inFront && inLane;
}

export function isPointInVehicleLane(px, py) {
  // Tram 28E track strip (y: 586..634, x: 200..2200)
  if (px >= 200 && px <= 2200 && py >= 586 && py <= 634) return true;
  // North Bus 737 corridor (y: 262..308, x: 138..2240)
  if (px >= 138 && px <= 2240 && py >= 262 && py <= 308) return true;
  // South Bus 737 corridor (y: 908..956, x: 138..2240)
  if (px >= 138 && px <= 2240 && py >= 908 && py <= 956) return true;
  // West & East vertical Bus 737 connectors
  if (py >= 262 && py <= 956 && px >= 138 && px <= 186) return true;
  if (py >= 262 && py <= 956 && px >= 2190 && px <= 2240) return true;
  return false;
}

export function isOverworldPositionValid(x, y, radius = PLAYER_RADIUS) {
  if (x < 40 + radius || x > WORLD_WIDTH - 40 - radius) return false;
  if (y < 42 + radius || y > WATERFRONT_Y - 12 - radius) return false;
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

function getNextWaypointIndex(line, currentIndex, direction) {
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

function findUpcomingStopName(line, fromIndex, direction) {
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

function createInitialVehicles() {
  return TRANSIT_LINES.map((line, i) => {
    const startIdx = i === 0 ? 1 : 2;
    const wp = line.waypoints[startIdx];
    const nextStep = getNextWaypointIndex(line, startIdx, 1);
    const nextWp = line.waypoints[nextStep.nextIndex];
    const heading = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);
    return {
      id: line.id,
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

function createInitialNpcs() {
  return AMBIENT_NPCS.map((npc) => ({
    ...npc,
    dir: 1,
    walkPhase: 0,
    isMoving: true
  }));
}

function recordLog(state, type, summary) {
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

function recordPhrase(state, phraseObj, sourceLabel) {
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

function unlockMemory(state, memoryDef) {
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
    mode: 'overworld', // 'overworld' | 'interior' | 'metro'
    euros: INITIAL_EUROS,
    energy: INITIAL_ENERGY,
    fullness: INITIAL_FULLNESS,
    day: 1,
    minutesOfDay: DAY_START_MINUTES,
    eveningNoticeShown: false,
    player: {
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
    currentNeighborhoodId: startHood.id,
    currentNeighborhoodName: startHood.name,
    visitedNeighborhoods: [startHood.id],
    currentVenueId: null,
    visitedVenues: [],
    activeMetroStationId: null,
    metro: {
      stationId: null,
      phase: null, // 'descending' | 'platform' | 'riding' | 'ascending'
      phaseProgress: 0,
      fromStationId: null,
      toStationId: null,
      rideDuration: METRO_RIDE_BASE_DURATION,
      direction: 1, // 1 = eastbound (Baixa-Chiado -> Santa Apolonia), -1 = westbound
      trainX: 380,
      tunnelOffset: 0
    },
    ridingVehicleId: null,
    alightAtNextStop: false,
    vehicles: createInitialVehicles(),
    npcs: createInitialNpcs(),
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
      venuesEntered: 0,
      mealsEaten: 0,
      souvenirsBought: 0,
      restsTaken: 0,
      eurosSpent: 0
    }
  };

  recordLog(state, 'start', 'Arrived at Praca Luis de Camoes on Day 1 at 09:00 with 120.00 EUR.');
  return state;
}

export class MemoriesGameEngine {
  constructor() {
    this.state = createInitialState();
    this.timeAccumulator = 0;
  }

  reset() {
    this.state = createInitialState();
    this.timeAccumulator = 0;
    return this.state;
  }

  getState() {
    return this.state;
  }

  getCurrentVenue() {
    if (!this.state.currentVenueId) return null;
    return getVenueById(this.state.currentVenueId);
  }

  getActiveMetroStation() {
    if (!this.state.activeMetroStationId) return null;
    return getMetroStationById(this.state.activeMetroStationId);
  }

  getRidingVehicle() {
    if (!this.state.ridingVehicleId) return null;
    return this.state.vehicles.find((v) => v.id === this.state.ridingVehicleId) || null;
  }

  getNeighborhoodSummary() {
    return NEIGHBORHOODS.map((hood) => ({
      ...hood,
      visited: this.state.visitedNeighborhoods.includes(hood.id),
      venuesTotal: VENUES.filter((v) => v.neighborhood === hood.id).length,
      venuesVisited: VENUES.filter(
        (v) => v.neighborhood === hood.id && this.state.visitedVenues.includes(v.id)
      ).length
    }));
  }

  setWalkTarget(x, y, onArriveAction = null) {
    if (this.state.ridingVehicleId) return;
    if (this.state.mode === 'metro' && this.state.metro.phase !== 'platform') return;
    if (this.state.mode === 'overworld') this.state.activeMetroStationId = null;
    this.state.player.walkQueue = [];
    this.state.player.walkTarget = { x, y, onArriveAction };
  }

  setWalkPath(waypoints = []) {
    if (this.state.ridingVehicleId || !Array.isArray(waypoints) || waypoints.length === 0) return;
    if (this.state.mode === 'metro' && this.state.metro.phase !== 'platform') return;
    if (this.state.mode === 'overworld') this.state.activeMetroStationId = null;
    const [first, ...rest] = waypoints;
    this.state.player.walkTarget = first;
    this.state.player.walkQueue = rest;
  }

  clearWalkTarget() {
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
  }

  advanceMinutes(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    this.state.minutesOfDay = Math.min(23 * 60 + 45, this.state.minutesOfDay + minutes);
    if (this.state.minutesOfDay >= EVENING_SUGGEST_MINUTES && !this.state.eveningNoticeShown) {
      this.state.eveningNoticeShown = true;
      this.state.statusMessage =
        'Evening lanterns are glowing across Lisboa. Enjoy a late stroll or click Rest Until Morning when ready for a fresh day.';
      recordLog(this.state, 'clock', 'Evening settled over Lisboa; streetlamps lit across the hills.');
    }
  }

  isBlockedByVehicle(x, y, radius = PLAYER_RADIUS) {
    for (const vehicle of this.state.vehicles) {
      if (pointIntersectsVehicle(x, y, radius, vehicle)) {
        return vehicle;
      }
    }
    return null;
  }

  isBlockedByPerson(x, y, { ignorePlayer = false, ignoreNpcId = null } = {}) {
    if (!ignorePlayer && this.state.mode === 'overworld' && !this.state.ridingVehicleId) {
      if (distance(x, y, this.state.player.x, this.state.player.y) < PERSON_SEPARATION_DIST) {
        return { kind: 'player', name: 'Traveler' };
      }
    }
    for (const npc of this.state.npcs) {
      if (npc.id === ignoreNpcId) continue;
      if (distance(x, y, npc.x, npc.y) < PERSON_SEPARATION_DIST) {
        return { kind: 'npc', name: npc.name, npc };
      }
    }
    return null;
  }

  canPlayerStepTo(x, y) {
    if (this.state.mode === 'interior') {
      return { ok: isInteriorPositionValid(x, y), blocker: null };
    }
    if (this.state.mode === 'metro') {
      return { ok: isMetroPlatformPositionValid(x, y), blocker: null };
    }
    if (!isOverworldPositionValid(x, y)) {
      return { ok: false, blocker: { kind: 'structure' } };
    }
    const blockingVehicle = this.isBlockedByVehicle(x, y, PLAYER_RADIUS);
    if (blockingVehicle) {
      return { ok: false, blocker: { kind: 'vehicle', vehicle: blockingVehicle } };
    }
    const blockingPerson = this.isBlockedByPerson(x, y, { ignorePlayer: true });
    if (blockingPerson) {
      return { ok: false, blocker: blockingPerson };
    }
    return { ok: true, blocker: null };
  }

  shouldVehicleYield(vehicle, nextHeading) {
    const probeVehicle = { ...vehicle, heading: nextHeading };
    // Never run over or collide with the player walking on foot
    if (this.state.mode === 'overworld' && !this.state.ridingVehicleId) {
      if (
        isPedestrianAheadOfVehicle(probeVehicle, this.state.player.x, this.state.player.y, PLAYER_RADIUS) ||
        pointIntersectsVehicle(this.state.player.x, this.state.player.y, PLAYER_RADIUS, probeVehicle)
      ) {
        return true;
      }
    }
    // Never run over or collide with ambient Lisbon pedestrians
    for (const npc of this.state.npcs) {
      if (
        isPedestrianAheadOfVehicle(probeVehicle, npc.x, npc.y, PLAYER_RADIUS) ||
        pointIntersectsVehicle(npc.x, npc.y, PLAYER_RADIUS, probeVehicle)
      ) {
        return true;
      }
    }
    return false;
  }

  updateVehicles(dt) {
    for (const vehicle of this.state.vehicles) {
      const line = getTransitLineById(vehicle.id);
      if (!line) continue;

      if (vehicle.dwellRemaining > 0) {
        vehicle.yielding = false;
        vehicle.dwellRemaining = Math.max(0, vehicle.dwellRemaining - dt);
        continue;
      }

      const targetStep = getNextWaypointIndex(line, vehicle.waypointIndex, vehicle.direction);
      const targetWp = line.waypoints[targetStep.nextIndex];
      const dx = targetWp.x - vehicle.x;
      const dy = targetWp.y - vehicle.y;
      const dist = Math.hypot(dx, dy);
      const nextHeading = dist > 0.001 ? Math.atan2(dy, dx) : vehicle.heading;

      // Safety brake: yield cleanly whenever any passenger/pedestrian is in front of the vehicle
      if (this.shouldVehicleYield(vehicle, nextHeading)) {
        vehicle.yielding = true;
        continue;
      }
      vehicle.yielding = false;

      const stepDist = line.speedPxPerSec * dt;
      vehicle.currentStopId = null;
      vehicle.currentStopName = null;
      vehicle.heading = nextHeading;

      if (dist <= stepDist) {
        vehicle.x = targetWp.x;
        vehicle.y = targetWp.y;
        vehicle.waypointIndex = targetStep.nextIndex;
        vehicle.direction = targetStep.nextDirection;
        vehicle.nextStopName = findUpcomingStopName(line, vehicle.waypointIndex, vehicle.direction);

        if (targetWp.stopId) {
          vehicle.currentStopId = targetWp.stopId;
          vehicle.currentStopName = targetWp.stopName;
          vehicle.dwellRemaining = line.dwellSeconds;

          if (this.state.ridingVehicleId === vehicle.id && this.state.alightAtNextStop) {
            this.disembarkTransit();
          }
        }
      } else {
        vehicle.x += (dx / dist) * stepDist;
        vehicle.y += (dy / dist) * stepDist;
      }
    }
  }

  updateNpcs(dt) {
    for (const npc of this.state.npcs) {
      const delta = npc.speed * dt * npc.dir;
      let nextX = npc.x;
      let nextY = npc.y;

      if (npc.patrolAxis === 'x') {
        nextX += delta;
        if (nextX >= npc.max) {
          nextX = npc.max;
          npc.dir = -1;
        } else if (nextX <= npc.min) {
          nextX = npc.min;
          npc.dir = 1;
        }
      } else {
        nextY += delta;
        if (nextY >= npc.max) {
          nextY = npc.max;
          npc.dir = -1;
        } else if (nextY <= npc.min) {
          nextY = npc.min;
          npc.dir = 1;
        }
      }

      // Pedestrians never step into a passing vehicle or collide with the player / other locals
      const vehicleBlocked = this.isBlockedByVehicle(nextX, nextY, PLAYER_RADIUS + 4);
      const personBlocked = this.isBlockedByPerson(nextX, nextY, { ignoreNpcId: npc.id });
      if (vehicleBlocked || personBlocked || !isOverworldPositionValid(nextX, nextY)) {
        npc.isMoving = false;
        continue;
      }

      npc.x = nextX;
      npc.y = nextY;
      npc.isMoving = true;
      npc.walkPhase = (npc.walkPhase + dt * 5.2) % (Math.PI * 2);
    }
  }

  updateNeighborhoodTracking() {
    if (this.state.mode !== 'overworld') return;
    const hood = getNeighborhoodForX(this.state.player.x);
    if (hood.id !== this.state.currentNeighborhoodId) {
      this.state.currentNeighborhoodId = hood.id;
      this.state.currentNeighborhoodName = hood.name;
      if (!this.state.visitedNeighborhoods.includes(hood.id)) {
        this.state.visitedNeighborhoods.push(hood.id);
        this.state.statusMessage = `Entered ${hood.name}: ${hood.subtitle}`;
        recordLog(this.state, 'neighborhood', `Walked into ${hood.name}.`);
      }
    }
  }

  movePlayerByInput(inputX, inputY, dt) {
    let vx = inputX;
    let vy = inputY;
    const player = this.state.player;

    if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
      player.walkTarget = null;
      player.walkQueue = [];
      if (this.state.mode === 'overworld') {
        this.state.activeMetroStationId = null;
      }
    } else if (player.walkTarget) {
      const dx = player.walkTarget.x - player.x;
      const dy = player.walkTarget.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 12) {
        const arriveAction = player.walkTarget.onArriveAction;
        if (player.walkQueue && player.walkQueue.length > 0) {
          player.walkTarget = player.walkQueue.shift();
          return;
        }
        player.walkTarget = null;
        player.isMoving = false;
        if (arriveAction) {
          this.executeArriveAction(arriveAction);
        }
        return;
      }
      vx = dx / dist;
      vy = dy / dist;
    }

    const mag = Math.hypot(vx, vy);
    if (mag < 0.01) {
      player.isMoving = false;
      return;
    }

    vx /= mag;
    vy /= mag;

    if (Math.abs(vx) > Math.abs(vy)) {
      player.facing = vx > 0 ? 'right' : 'left';
    } else {
      player.facing = vy > 0 ? 'down' : 'up';
    }

    const fatigueFactor =
      this.state.energy < 15 || this.state.fullness < 15 ? 0.68 : 1.0;
    const speed =
      (this.state.mode === 'interior' ? INTERIOR_WALK_SPEED : BASE_WALK_SPEED) *
      fatigueFactor;

    const stepX = vx * speed * dt;
    const stepY = vy * speed * dt;

    let movedX = 0;
    let movedY = 0;
    let lastBlocker = null;

    const checkX = this.canPlayerStepTo(player.x + stepX, player.y);
    if (checkX.ok) {
      player.x += stepX;
      movedX = stepX;
    } else if (checkX.blocker) {
      lastBlocker = checkX.blocker;
    }

    const checkY = this.canPlayerStepTo(player.x, player.y + stepY);
    if (checkY.ok) {
      player.y += stepY;
      movedY = stepY;
    } else if (checkY.blocker) {
      lastBlocker = checkY.blocker;
    }

    const movedDist = Math.hypot(movedX, movedY);
    if (movedDist > 0.01) {
      player.isMoving = true;
      player.walkPhase = (player.walkPhase + dt * 9.5) % (Math.PI * 2);

      if (this.state.mode === 'overworld') {
        player.overworldX = player.x;
        player.overworldY = player.y;
        this.state.stats.distanceWalkedPx += movedDist;
        this.state.energy = clamp(this.state.energy - (movedDist / 100) * 1.15, 0, 100);
        this.state.fullness = clamp(this.state.fullness - (movedDist / 100) * 0.85, 0, 100);
        this.updateNeighborhoodTracking();
      } else if (this.state.mode === 'interior') {
        const mat = INTERIOR_STATIONS.exitMat;
        if (
          vy > 0.25 &&
          player.y >= mat.triggerY &&
          Math.abs(player.x - mat.x) <= mat.halfWidth
        ) {
          this.exitVenue();
        }
      } else if (this.state.mode === 'metro' && this.state.metro.phase === 'platform') {
        if (
          vy < -0.25 &&
          player.y <= METRO_PLATFORM_ZONES.escalatorExitTriggerY &&
          Math.abs(player.x - 380) <= METRO_PLATFORM_ZONES.escalatorHalfWidth
        ) {
          this.exitMetroStation();
        }
      }
    } else {
      player.isMoving = false;
      if (lastBlocker?.kind === 'vehicle') {
        this.state.statusMessage = `Waiting safely on the side as ${lastBlocker.vehicle.name} passes.`;
        // Keep click-to-walk target waiting patiently if blocked temporarily by a passing vehicle
        return;
      }
      if (lastBlocker?.kind === 'npc') {
        this.state.statusMessage = `Paused politely on the sidewalk as ${lastBlocker.name} passes.`;
        return;
      }
      if (player.walkTarget) {
        const arriveAction = player.walkTarget.onArriveAction;
        player.walkTarget = null;
        player.walkQueue = [];
        if (arriveAction) {
          this.executeArriveAction(arriveAction);
        }
      }
    }
  }

  executeArriveAction(action) {
    if (!action || !action.type) return;
    if (action.type === 'enterVenue') {
      this.enterVenue(action.id);
    } else if (action.type === 'openMetro') {
      this.openMetroStation(action.id);
    } else if (action.type === 'boardStop') {
      this.boardTransitAtStop(action.id, { waitIfApproaching: true });
    } else if (action.type === 'restBench') {
      this.restAtBench(action.id);
    } else if (action.type === 'talkProprietor') {
      this.talkToProprietor();
    } else if (action.type === 'inspectDisplay') {
      this.inspectVenueDisplay();
    } else if (action.type === 'exitVenue') {
      this.exitVenue();
    } else if (action.type === 'exitMetro') {
      this.exitMetroStation();
    } else if (action.type === 'boardNextMetro') {
      const origin = this.state.metro.stationId;
      const dest = METRO_STATIONS.find((s) => s.id !== origin);
      if (origin && dest) {
        this.rideMetro(origin, dest.id);
      }
    }
  }

  updateMetroSimulation(dt) {
    if (this.state.mode !== 'metro') return;
    const m = this.state.metro;
    const player = this.state.player;

    if (m.phase === 'descending') {
      m.phaseProgress = Math.min(1, m.phaseProgress + dt / METRO_ESCALATOR_DURATION);
      const t = m.phaseProgress;
      player.x = 380;
      player.y =
        METRO_PLATFORM_ZONES.escalatorTopY +
        (METRO_PLATFORM_ZONES.escalatorBottomY - METRO_PLATFORM_ZONES.escalatorTopY) * t;
      player.facing = 'down';
      player.isMoving = false;
      // Metro train glides smoothly into the station while you descend
      const easeOut = 1 - Math.pow(1 - t, 3);
      m.trainX = -260 + (380 - -260) * easeOut;

      if (m.phaseProgress >= 1) {
        m.phase = 'platform';
        m.phaseProgress = 0;
        m.trainX = 380;
        player.y = METRO_PLATFORM_ZONES.escalatorBottomY + 8;
        const station = getMetroStationById(m.stationId);
        this.state.statusMessage = station
          ? `Arrived on ${station.name} underground platform (${station.lines.join(' & ')}). Choose a Linha Azul destination or ride the escalator back to the street.`
          : 'Arrived on the underground Metro platform.';
      }
      return;
    }

    if (m.phase === 'riding') {
      m.phaseProgress = Math.min(1, m.phaseProgress + dt / m.rideDuration);
      const p = m.phaseProgress;
      const dir = m.direction || 1;
      player.isMoving = false;

      if (p < 0.16) {
        // Departing origin platform
        const k = p / 0.16;
        m.trainX = 380 + dir * k * k * 560;
        m.tunnelOffset = (m.tunnelOffset + dt * 180 * k * dir) % 1200;
      } else if (p < 0.84) {
        // Full-speed underground tunnel sequence
        m.trainX = 380;
        m.tunnelOffset = (m.tunnelOffset + dt * 520 * dir) % 1200;
      } else {
        // Decelerating smoothly into destination station platform
        const k = (p - 0.84) / 0.16;
        const ease = 1 - Math.pow(1 - k, 3);
        m.stationId = m.toStationId;
        this.state.activeMetroStationId = m.toStationId;
        m.trainX = 380 - dir * (1 - ease) * 560;
        m.tunnelOffset = (m.tunnelOffset + dt * 160 * (1 - k) * dir) % 1200;
      }

      if (m.phaseProgress >= 1) {
        const dest = getMetroStationById(m.toStationId);
        m.stationId = m.toStationId;
        this.state.activeMetroStationId = m.toStationId;
        m.phase = 'platform';
        m.phaseProgress = 0;
        m.trainX = 380;
        player.x = 380;
        player.y = 254;
        player.facing = 'up';
        if (dest) {
          player.overworldX = dest.spawnOutside.x;
          player.overworldY = dest.spawnOutside.y;
          const hood = getNeighborhoodForX(dest.spawnOutside.x);
          this.state.currentNeighborhoodId = hood.id;
          this.state.currentNeighborhoodName = hood.name;
          if (!this.state.visitedNeighborhoods.includes(hood.id)) {
            this.state.visitedNeighborhoods.push(hood.id);
          }
          this.state.statusMessage = `Metro train arrived at ${dest.name}. Step onto the ascending escalator (or press Esc) to exit onto the ${hood.name} sidewalk.`;
        }
      }
      return;
    }

    if (m.phase === 'ascending') {
      m.phaseProgress = Math.min(1, m.phaseProgress + dt / METRO_ESCALATOR_DURATION);
      const t = m.phaseProgress;
      player.x = 380;
      player.y =
        METRO_PLATFORM_ZONES.escalatorBottomY -
        (METRO_PLATFORM_ZONES.escalatorBottomY - METRO_PLATFORM_ZONES.escalatorTopY) * t;
      player.facing = 'up';
      player.isMoving = false;

      if (m.phaseProgress >= 1) {
        const station = getMetroStationById(m.stationId);
        this.state.mode = 'overworld';
        this.state.activeMetroStationId = null;
        m.phase = null;
        m.phaseProgress = 0;
        m.stationId = null;
        m.fromStationId = null;
        m.toStationId = null;
        if (station) {
          player.x = station.spawnOutside.x;
          player.y = station.spawnOutside.y;
          player.overworldX = station.spawnOutside.x;
          player.overworldY = station.spawnOutside.y;
          player.facing = 'down';
          this.updateNeighborhoodTracking();
          this.state.statusMessage = `Rode the escalator up from ${station.name} onto the Lisboa sidewalk.`;
        }
      }
      return;
    }

    // Platform idle state: gently keep train docked at center
    m.trainX = 380;
  }

  tick(dtSeconds, input = { x: 0, y: 0 }) {
    const dt = clamp(Number(dtSeconds) || 0, 0, 0.25);
    if (dt <= 0) return this.state;

    this.updateVehicles(dt);
    this.updateNpcs(dt);

    // Gentle real-time Lisbon clock progression (1 game minute per ~2.4s)
    this.timeAccumulator += dt;
    if (this.timeAccumulator >= 2.4) {
      const mins = Math.floor(this.timeAccumulator / 2.4);
      this.timeAccumulator -= mins * 2.4;
      this.advanceMinutes(mins);
    }

    if (this.state.mode === 'metro') {
      this.updateMetroSimulation(dt);
      if (this.state.mode === 'metro' && this.state.metro.phase === 'platform') {
        this.movePlayerByInput(input.x || 0, input.y || 0, dt);
      }
      return this.state;
    }

    if (this.state.ridingVehicleId) {
      const vehicle = this.getRidingVehicle();
      if (vehicle) {
        this.state.player.x = vehicle.x;
        this.state.player.y = vehicle.y;
        this.state.player.overworldX = vehicle.x;
        this.state.player.overworldY = vehicle.y;
        this.state.player.isMoving = false;
        this.state.energy = clamp(this.state.energy + dt * 0.6, 0, 100);
        this.updateNeighborhoodTracking();
      }
    } else {
      this.movePlayerByInput(input.x || 0, input.y || 0, dt);
    }

    return this.state;
  }

  getNearbyInteraction() {
    const state = this.state;

    if (state.ridingVehicleId) {
      const vehicle = this.getRidingVehicle();
      if (!vehicle) return null;
      const atStop = Boolean(vehicle.currentStopId);
      return {
        type: 'riding',
        vehicleId: vehicle.id,
        label: atStop
          ? `Disembark ${vehicle.name} at ${vehicle.currentStopName}`
          : state.alightAtNextStop
            ? `Bell rung - Hopping off at ${vehicle.nextStopName}`
            : `Ring Bell to exit at ${vehicle.nextStopName}`,
        sublabel: atStop ? 'Doors open - Press [E] to step out onto the sidewalk' : 'Press [E] to ring bell (or again to alight at next stop)'
      };
    }

    if (state.mode === 'metro') {
      const m = state.metro;
      const station = getMetroStationById(m.stationId);
      if (m.phase === 'descending') {
        return {
          type: 'metro-transition',
          label: `Descending escalators into ${station ? station.name : 'Metro'}...`,
          sublabel: 'Heading underground to the Linha Azul platform'
        };
      }
      if (m.phase === 'ascending') {
        return {
          type: 'metro-transition',
          label: `Riding escalators up to ${station ? station.name : 'street'}...`,
          sublabel: 'Returning to the sunlit Lisboa sidewalk'
        };
      }
      if (m.phase === 'riding') {
        const dest = getMetroStationById(m.toStationId);
        return {
          type: 'metro-transition',
          label: `Riding Metropolitano de Lisboa -> ${dest ? dest.name : 'next station'}`,
          sublabel: 'Underground Linha Azul tunnel transit in progress'
        };
      }
      // On underground platform
      const px = state.player.x;
      const py = state.player.y;
      if (
        py <= METRO_PLATFORM_ZONES.escalatorExitTriggerY + 18 &&
        Math.abs(px - 380) <= METRO_PLATFORM_ZONES.escalatorHalfWidth + 14
      ) {
        return {
          type: 'metro-exit',
          label: `Take Escalator to Street (${station ? station.name : 'Exit'})`,
          sublabel: 'Press [E] or walk up onto the escalator to return outside'
        };
      }
      if (py >= 242 && Math.abs(px - 380) <= METRO_PLATFORM_ZONES.boardingHalfWidth) {
        const nextDest = METRO_STATIONS.find((s) => s.id !== m.stationId);
        return {
          type: 'metro-board',
          destId: nextDest?.id || null,
          label: `Board Metro Linha Azul -> ${nextDest ? nextDest.name : 'Next Station'} (${METRO_LINE.fareEur.toFixed(2)} EUR)`,
          sublabel: 'Press [E] to board now, or pick any station in the Metro panel'
        };
      }
      return null;
    }

    if (state.mode === 'interior') {
      const venue = this.getCurrentVenue();
      if (!venue) return null;
      const px = state.player.x;
      const py = state.player.y;

      if (distance(px, py, INTERIOR_STATIONS.counter.x, INTERIOR_STATIONS.counter.y) <= INTERIOR_STATIONS.counter.radius) {
        return {
          type: 'counter',
          venueId: venue.id,
          label: `Speak with ${venue.proprietor} (${venue.proprietorRole})`,
          sublabel: 'Press [E] to chat and unlock local phrase & memory'
        };
      }
      if (distance(px, py, INTERIOR_STATIONS.display.x, INTERIOR_STATIONS.display.y) <= INTERIOR_STATIONS.display.radius) {
        return {
          type: 'display',
          venueId: venue.id,
          label: `Inspect ${venue.name} display`,
          sublabel: 'Press [E] to read cultural note'
        };
      }
      if (
        py >= INTERIOR_STATIONS.exitMat.triggerY - 18 &&
        Math.abs(px - INTERIOR_STATIONS.exitMat.x) <= INTERIOR_STATIONS.exitMat.halfWidth + 12
      ) {
        return {
          type: 'exit',
          venueId: venue.id,
          label: `Step outside onto ${this.state.currentNeighborhoodName}`,
          sublabel: 'Press [E] or walk down to exit'
        };
      }
      return null;
    }

    // Overworld proximity check
    const px = state.player.x;
    const py = state.player.y;
    let best = null;
    let bestDist = Infinity;

    for (const station of METRO_STATIONS) {
      const d = distance(px, py, station.doorX, station.doorY);
      if (d <= INTERACT_DISTANCE && d < bestDist) {
        bestDist = d;
        best = {
          type: 'metro',
          id: station.id,
          station,
          label: `Enter ${station.name} (${METRO_LINE.fareEur.toFixed(2)} EUR)`,
          sublabel: `${station.lines.join(' & ')} - Press [E] to choose destination`
        };
      }
    }

    for (const venue of VENUES) {
      const d = distance(px, py, venue.doorX, venue.doorY);
      if (d <= INTERACT_DISTANCE && d < bestDist) {
        bestDist = d;
        best = {
          type: 'venue',
          id: venue.id,
          venue,
          label: `Enter ${venue.name} ${venue.badge}`,
          sublabel: 'Press [E] or click Enter to step inside'
        };
      }
    }

    for (const stop of ALL_STOPS) {
      const d = Math.min(
        distance(px, py, stop.platformX, stop.platformY),
        distance(px, py, stop.x, stop.y)
      );
      if (d <= INTERACT_DISTANCE + 8 && d < bestDist) {
        bestDist = d;
        const vehicle = state.vehicles.find((v) => v.id === stop.lineId);
        const vehicleAtStop = vehicle && vehicle.currentStopId === stop.stopId;
        const vehicleDist = vehicle ? Math.round(distance(vehicle.x, vehicle.y, stop.x, stop.y)) : 999;
        best = {
          type: 'stop',
          id: stop.stopId,
          stop,
          vehicleAtStop,
          label: vehicleAtStop
            ? `Board ${stop.lineName} (${stop.fareEur.toFixed(2)} EUR)`
            : `Catch ${stop.lineName} at ${stop.stopName} (${stop.fareEur.toFixed(2)} EUR)`,
          sublabel: vehicleAtStop
            ? 'Doors open now - Press [E] to board from the sidewalk'
            : `Approaching (${vehicleDist}m away) - Press [E] to wait and board`
        };
      }
    }

    for (const spot of REST_SPOTS) {
      const d = distance(px, py, spot.x, spot.y);
      if (d <= INTERACT_DISTANCE && d < bestDist) {
        bestDist = d;
        best = {
          type: 'bench',
          id: spot.id,
          spot,
          label: `Rest at ${spot.name}`,
          sublabel: 'Free rest (+30 Energy) & Viewpoint Memory - Press [E]'
        };
      }
    }

    return best;
  }

  triggerNearbyInteraction() {
    const nearby = this.getNearbyInteraction();
    if (!nearby) {
      return { ok: false, error: 'Move closer to a doorway, metro entrance, transit stop, or bench to interact.' };
    }
    if (nearby.type === 'riding') {
      const vehicle = this.getRidingVehicle();
      if (vehicle && vehicle.currentStopId) {
        return this.disembarkTransit();
      }
      if (this.state.alightAtNextStop) {
        return this.disembarkTransit({ immediateToNextStop: true });
      }
      return this.disembarkTransit();
    }
    if (nearby.type === 'metro') {
      return this.openMetroStation(nearby.id);
    }
    if (nearby.type === 'metro-exit') {
      return this.exitMetroStation();
    }
    if (nearby.type === 'metro-board' && nearby.destId) {
      return this.rideMetro(this.state.metro.stationId, nearby.destId);
    }
    if (nearby.type === 'metro-transition') {
      return { ok: true, state: this.state };
    }
    if (nearby.type === 'venue') {
      return this.enterVenue(nearby.id);
    }
    if (nearby.type === 'stop') {
      return this.boardTransitAtStop(nearby.id, { waitIfApproaching: true });
    }
    if (nearby.type === 'bench') {
      return this.restAtBench(nearby.id);
    }
    if (nearby.type === 'counter') {
      return this.talkToProprietor();
    }
    if (nearby.type === 'display') {
      return this.inspectVenueDisplay();
    }
    if (nearby.type === 'exit') {
      return this.exitVenue();
    }
    return { ok: false, error: 'No action available.' };
  }

  openMetroStation(stationId) {
    if (this.state.ridingVehicleId) {
      return { ok: false, error: 'Step off surface transit before descending into the Metro.' };
    }
    if (this.state.mode === 'interior') {
      return { ok: false, error: 'Step outside onto the sidewalk before entering the Metro.' };
    }
    const station = getMetroStationById(stationId);
    if (!station) {
      return { ok: false, error: `Unknown metro station: ${stationId}` };
    }

    this.state.mode = 'metro';
    this.state.activeMetroStationId = station.id;
    this.state.player.overworldX = station.spawnOutside.x;
    this.state.player.overworldY = station.spawnOutside.y;
    this.state.player.x = 380;
    this.state.player.y = METRO_PLATFORM_ZONES.escalatorTopY;
    this.state.player.facing = 'down';
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;

    this.state.metro = {
      stationId: station.id,
      phase: 'descending',
      phaseProgress: 0,
      fromStationId: station.id,
      toStationId: null,
      rideDuration: METRO_RIDE_BASE_DURATION,
      direction: 1,
      trainX: -260,
      tunnelOffset: 0
    };

    this.state.statusMessage = `Descending the escalators into ${station.name} (${station.lines.join(' & ')})...`;
    recordLog(this.state, 'metro', `Entered ${station.name} underground station.`);
    return { ok: true, station, state: this.state };
  }

  exitMetroStation({ immediate = false } = {}) {
    if (this.state.mode !== 'metro') {
      return { ok: false, error: 'You are not currently inside a Metro station.' };
    }
    if (this.state.metro.phase === 'riding') {
      return { ok: false, error: 'Wait until the Metro train arrives at the platform before exiting.' };
    }

    const station = getMetroStationById(this.state.metro.stationId);
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];

    if (immediate) {
      this.state.mode = 'overworld';
      this.state.activeMetroStationId = null;
      this.state.metro.phase = null;
      this.state.metro.phaseProgress = 0;
      this.state.metro.stationId = null;
      if (station) {
        this.state.player.x = station.spawnOutside.x;
        this.state.player.y = station.spawnOutside.y;
        this.state.player.overworldX = station.spawnOutside.x;
        this.state.player.overworldY = station.spawnOutside.y;
        this.state.player.facing = 'down';
        this.updateNeighborhoodTracking();
      }
      return { ok: true, station, state: this.state };
    }

    this.state.metro.phase = 'ascending';
    this.state.metro.phaseProgress = 0;
    this.state.player.x = 380;
    this.state.player.y = METRO_PLATFORM_ZONES.escalatorBottomY;
    this.state.player.facing = 'up';
    this.state.statusMessage = `Riding the escalator up to ${station ? station.name : 'street'} exit...`;
    return { ok: true, station, state: this.state };
  }

  closeMetroStation() {
    if (this.state.mode === 'metro') {
      return this.exitMetroStation();
    }
    this.state.activeMetroStationId = null;
    return { ok: true, state: this.state };
  }

  rideMetro(fromStationId, toStationId) {
    if (this.state.ridingVehicleId || this.state.mode === 'interior') {
      return { ok: false, error: 'Enter a Metro station before riding the Metro.' };
    }
    if (this.state.mode === 'metro' && this.state.metro.phase === 'riding') {
      return { ok: false, error: 'Already riding a Metro train underground.' };
    }

    const originId = fromStationId || this.state.metro.stationId || this.state.activeMetroStationId;
    const origin = getMetroStationById(originId);
    const destination = getMetroStationById(toStationId);
    if (!origin || !destination) {
      return { ok: false, error: 'Unknown Metro station selected.' };
    }
    if (origin.id === destination.id) {
      return { ok: false, error: `You are already at ${origin.name}.` };
    }
    if (this.state.euros < METRO_LINE.fareEur) {
      this.state.statusMessage = `Need ${METRO_LINE.fareEur.toFixed(2)} EUR for Metropolitano de Lisboa (you have ${this.state.euros.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    this.state.euros = roundMoney(this.state.euros - METRO_LINE.fareEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + METRO_LINE.fareEur);
    this.state.stats.metroRides += 1;
    this.state.energy = clamp(this.state.energy + 4, 0, 100);
    this.advanceMinutes(METRO_LINE.travelMinutes);

    const hops = Math.max(1, Math.abs((destination.order ?? 0) - (origin.order ?? 0)));
    const direction = (destination.order ?? 0) >= (origin.order ?? 0) ? 1 : -1;
    const rideDuration =
      METRO_RIDE_BASE_DURATION + (hops - 1) * METRO_RIDE_EXTRA_HOP_DURATION;

    this.state.mode = 'metro';
    this.state.activeMetroStationId = origin.id;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.state.metro = {
      stationId: origin.id,
      phase: 'riding',
      phaseProgress: 0,
      fromStationId: origin.id,
      toStationId: destination.id,
      rideDuration,
      direction,
      trainX: 380,
      tunnelOffset: 0
    };

    const newPhrase = recordPhrase(this.state, METRO_LINE.phrase, METRO_LINE.name);
    const newMemory = unlockMemory(this.state, METRO_LINE.memory);

    this.state.statusMessage = `Boarded Metropolitano de Lisboa (Linha Azul) from ${origin.name} toward ${destination.name} (-${METRO_LINE.fareEur.toFixed(2)} EUR).`;
    recordLog(this.state, 'metro', `Boarded Metro Linha Azul from ${origin.name} to ${destination.name} (-${METRO_LINE.fareEur.toFixed(2)} EUR).`);

    return {
      ok: true,
      origin,
      destination,
      newPhrase,
      newMemory,
      state: this.state
    };
  }

  enterVenue(venueId) {
    if (this.state.ridingVehicleId) {
      return { ok: false, error: 'Step off transit before entering a shop or restaurant.' };
    }
    const venue = getVenueById(venueId);
    if (!venue) {
      return { ok: false, error: `Unknown venue: ${venueId}` };
    }

    this.state.activeMetroStationId = null;
    this.state.mode = 'interior';
    this.state.currentVenueId = venue.id;
    this.state.player.overworldX = venue.spawnOutside.x;
    this.state.player.overworldY = venue.spawnOutside.y;
    this.state.player.x = 380;
    this.state.player.y = 355;
    this.state.player.facing = 'up';
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.state.stats.venuesEntered += 1;

    const isFirstVisit = !this.state.visitedVenues.includes(venue.id);
    if (isFirstVisit) {
      this.state.visitedVenues.push(venue.id);
    }

    const newPhrase = recordPhrase(this.state, venue.phrase, venue.name);
    const newMemory = unlockMemory(this.state, venue.memory);

    this.advanceMinutes(5);

    this.state.statusMessage = `Stepped inside ${venue.name}. ${venue.proprietor}: "${venue.greeting}"`;
    recordLog(this.state, 'venue', `Entered ${venue.name} in ${venue.memory.neighborhood}.`);

    return {
      ok: true,
      venue,
      isFirstVisit,
      newPhrase,
      newMemory,
      state: this.state
    };
  }

  exitVenue() {
    if (this.state.mode !== 'interior') {
      return { ok: false, error: 'You are already outside on the street.' };
    }
    const venue = this.getCurrentVenue();
    this.state.mode = 'overworld';
    this.state.currentVenueId = null;
    if (venue) {
      this.state.player.x = venue.spawnOutside.x;
      this.state.player.y = venue.spawnOutside.y;
      this.state.player.facing = venue.doorSide === 'south' ? 'down' : 'up';
    } else {
      this.state.player.x = this.state.player.overworldX;
      this.state.player.y = this.state.player.overworldY;
    }
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.updateNeighborhoodTracking();

    this.state.statusMessage = venue
      ? `Stepped back onto the sidewalk outside ${venue.name}.`
      : 'Stepped back outside onto Lisboa sidewalks.';
    return { ok: true, venue, state: this.state };
  }

  talkToProprietor() {
    const venue = this.getCurrentVenue();
    if (!venue) {
      return { ok: false, error: 'Enter a shop or restaurant first to talk with the proprietor.' };
    }
    const newPhrase = recordPhrase(this.state, venue.phrase, venue.name);
    const newMemory = unlockMemory(this.state, venue.memory);
    this.state.statusMessage = `${venue.proprietor} (${venue.name}): "${venue.greeting}"`;
    return { ok: true, venue, newPhrase, newMemory, state: this.state };
  }

  inspectVenueDisplay() {
    const venue = this.getCurrentVenue();
    if (!venue) {
      return { ok: false, error: 'Enter a venue to inspect its display.' };
    }
    this.state.statusMessage = `${venue.name}: ${venue.displayNote}`;
    return { ok: true, venue, note: venue.displayNote, state: this.state };
  }

  purchaseVenueItem(itemId) {
    const venue = this.getCurrentVenue();
    if (!venue) {
      return { ok: false, error: 'Enter a shop or restaurant before purchasing items.' };
    }
    const item = venue.items.find((i) => i.id === itemId);
    if (!item) {
      return { ok: false, error: `Item not found in ${venue.name}.` };
    }
    if (this.state.euros < item.costEur) {
      this.state.statusMessage = `Not enough EUR (${this.state.euros.toFixed(2)} EUR) for ${item.name} (${item.costEur.toFixed(2)} EUR). You can still chat for free or rest overnight for a fresh travel stipend.`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    this.state.euros = roundMoney(this.state.euros - item.costEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + item.costEur);
    this.state.fullness = clamp(this.state.fullness + (item.fullnessDelta || 0), 0, 100);
    this.state.energy = clamp(this.state.energy + (item.energyDelta || 0), 0, 100);

    let unlockedMilestone = false;

    if (item.kind === 'food') {
      this.state.stats.mealsEaten += 1;
      if (!this.state.tastedFoods.some((f) => f.id === item.id)) {
        this.state.tastedFoods.push({
          id: item.id,
          name: item.name,
          venueName: venue.name,
          day: this.state.day
        });
      }
      this.advanceMinutes(18);
      unlockedMilestone = unlockMemory(this.state, MILESTONE_MEMORIES.taste);
      this.state.statusMessage = `Enjoyed ${item.name} at ${venue.name} (-${item.costEur.toFixed(2)} EUR, +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy).`;
      recordLog(this.state, 'dining', `Tasted ${item.name} at ${venue.name} (-${item.costEur.toFixed(2)} EUR).`);
    } else {
      this.state.stats.souvenirsBought += 1;
      this.state.satchel.push({
        id: item.id,
        name: item.name,
        venueName: venue.name,
        neighborhood: venue.memory.neighborhood,
        costEur: item.costEur,
        day: this.state.day
      });
      this.advanceMinutes(10);
      unlockedMilestone = unlockMemory(this.state, MILESTONE_MEMORIES.keepsake);
      this.state.statusMessage = `Added ${item.name} to your satchel from ${venue.name} (-${item.costEur.toFixed(2)} EUR).`;
      recordLog(this.state, 'shop', `Bought ${item.name} at ${venue.name} (-${item.costEur.toFixed(2)} EUR).`);
    }

    recordPhrase(this.state, venue.phrase, venue.name);
    unlockMemory(this.state, venue.memory);

    return {
      ok: true,
      item,
      venue,
      unlockedMilestone,
      state: this.state
    };
  }

  boardTransitAtStop(stopId, { waitIfApproaching = true } = {}) {
    if (this.state.mode !== 'overworld') {
      return { ok: false, error: 'Step outside onto the street before boarding transit.' };
    }
    if (this.state.ridingVehicleId) {
      return { ok: false, error: 'You are already aboard public transit.' };
    }

    const stop = getStopById(stopId);
    if (!stop) {
      return { ok: false, error: `Unknown transit stop: ${stopId}` };
    }

    const line = getTransitLineById(stop.lineId);
    const vehicle = this.state.vehicles.find((v) => v.id === stop.lineId);
    if (!line || !vehicle) {
      return { ok: false, error: 'Transit vehicle unavailable.' };
    }

    if (this.state.euros < line.fareEur) {
      this.state.statusMessage = `Need ${line.fareEur.toFixed(2)} EUR to board ${line.name} (you have ${this.state.euros.toFixed(2)} EUR). You can walk on foot or rest overnight for a travel stipend.`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    const isAtStop = vehicle.currentStopId === stop.stopId || distance(vehicle.x, vehicle.y, stop.x, stop.y) <= 90;
    if (!isAtStop) {
      if (!waitIfApproaching) {
        return { ok: false, error: `${line.name} has not reached ${stop.stopName} yet.`, state: this.state };
      }
      vehicle.x = stop.x;
      vehicle.y = stop.y;
      vehicle.waypointIndex = stop.waypointIndex;
      vehicle.currentStopId = stop.stopId;
      vehicle.currentStopName = stop.stopName;
      vehicle.dwellRemaining = 1.2;
      vehicle.yielding = false;
      vehicle.nextStopName = findUpcomingStopName(line, vehicle.waypointIndex, vehicle.direction);
      this.advanceMinutes(7);
    }

    this.state.activeMetroStationId = null;
    this.state.euros = roundMoney(this.state.euros - line.fareEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + line.fareEur);
    if (line.mode === 'tram') {
      this.state.stats.tramRides += 1;
    } else {
      this.state.stats.busRides += 1;
    }

    this.state.ridingVehicleId = vehicle.id;
    this.state.alightAtNextStop = false;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.x = vehicle.x;
    this.state.player.y = vehicle.y;
    this.state.player.overworldX = vehicle.x;
    this.state.player.overworldY = vehicle.y;
    vehicle.dwellRemaining = Math.min(vehicle.dwellRemaining, 1.0);

    recordPhrase(this.state, line.phrase, line.name);
    const newMemory = unlockMemory(this.state, line.memory);

    this.state.statusMessage = `Boarded ${line.name} at ${stop.stopName} (-${line.fareEur.toFixed(2)} EUR). Heading toward ${vehicle.nextStopName}. Press [E] to ring bell for the next stop.`;
    recordLog(this.state, 'transit', `Boarded ${line.name} at ${stop.stopName} (-${line.fareEur.toFixed(2)} EUR).`);

    return {
      ok: true,
      line,
      stop,
      newMemory,
      state: this.state
    };
  }

  disembarkTransit({ immediateToNextStop = false } = {}) {
    if (!this.state.ridingVehicleId) {
      return { ok: false, error: 'You are not currently riding a tram or bus.' };
    }
    const vehicle = this.getRidingVehicle();
    const line = vehicle ? getTransitLineById(vehicle.id) : null;
    if (!vehicle || !line) {
      this.state.ridingVehicleId = null;
      this.state.alightAtNextStop = false;
      return { ok: true, state: this.state };
    }

    if (vehicle.currentStopId) {
      const stop = getStopById(vehicle.currentStopId);
      this.state.ridingVehicleId = null;
      this.state.alightAtNextStop = false;
      this.state.player.x = stop ? stop.platformX : vehicle.x;
      this.state.player.y = stop ? stop.platformY : vehicle.y - 44;
      this.state.player.overworldX = this.state.player.x;
      this.state.player.overworldY = this.state.player.y;
      this.updateNeighborhoodTracking();

      this.state.statusMessage = `Stepped off ${line.name} onto the sidewalk at ${stop ? stop.stopName : 'stop'}.`;
      recordLog(this.state, 'transit', `Alighted from ${line.name} at ${stop ? stop.stopName : 'stop'}.`);
      return { ok: true, alighted: true, stop, state: this.state };
    }

    if (immediateToNextStop) {
      let guard = 0;
      while (!vehicle.currentStopId && guard < 120) {
        const step = getNextWaypointIndex(line, vehicle.waypointIndex, vehicle.direction);
        vehicle.waypointIndex = step.nextIndex;
        vehicle.direction = step.nextDirection;
        const wp = line.waypoints[vehicle.waypointIndex];
        vehicle.x = wp.x;
        vehicle.y = wp.y;
        if (wp.stopId) {
          vehicle.currentStopId = wp.stopId;
          vehicle.currentStopName = wp.stopName;
          vehicle.dwellRemaining = line.dwellSeconds;
          vehicle.nextStopName = findUpcomingStopName(line, vehicle.waypointIndex, vehicle.direction);
        }
        guard += 1;
      }
      this.advanceMinutes(6);
      return this.disembarkTransit();
    }

    this.state.alightAtNextStop = true;
    this.state.statusMessage = `Bell rung aboard ${line.name}. You will step out onto the sidewalk at ${vehicle.nextStopName}.`;
    return { ok: true, alighted: false, queuedStop: vehicle.nextStopName, state: this.state };
  }

  restAtBench(spotId) {
    if (this.state.mode !== 'overworld' || this.state.ridingVehicleId) {
      return { ok: false, error: 'Walk up to a street miradouro bench to rest.' };
    }
    const spot = getRestSpotById(spotId);
    if (!spot) {
      return { ok: false, error: `Unknown rest spot: ${spotId}` };
    }

    this.state.activeMetroStationId = null;
    this.state.energy = clamp(this.state.energy + 30, 0, 100);
    this.state.stats.restsTaken += 1;
    this.advanceMinutes(25);

    const newPhrase = recordPhrase(this.state, spot.phrase, spot.name);
    const newMemory = unlockMemory(this.state, spot.memory);

    this.state.statusMessage = `Rested at ${spot.name} (+30 Energy). ${spot.description}`;
    recordLog(this.state, 'rest', `Rested at ${spot.name} (+30 Energy).`);

    return {
      ok: true,
      spot,
      newPhrase,
      newMemory,
      state: this.state
    };
  }

  restOvernight() {
    if (this.state.ridingVehicleId) {
      this.disembarkTransit({ immediateToNextStop: true });
    }
    if (this.state.mode === 'interior') {
      this.exitVenue();
    }
    if (this.state.mode === 'metro') {
      if (this.state.metro.phase === 'riding' && this.state.metro.toStationId) {
        this.state.metro.stationId = this.state.metro.toStationId;
        this.state.metro.phase = 'platform';
      }
      this.exitMetroStation({ immediate: true });
    }
    this.state.activeMetroStationId = null;

    let paid = 0;
    if (this.state.euros >= OVERNIGHT_COST_EUR) {
      paid = OVERNIGHT_COST_EUR;
      this.state.euros = roundMoney(this.state.euros - OVERNIGHT_COST_EUR);
      this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + OVERNIGHT_COST_EUR);
    }

    let stipendAdded = 0;
    if (this.state.euros < LOW_FUND_STIPEND_THRESHOLD) {
      stipendAdded = LOW_FUND_STIPEND_AMOUNT;
      this.state.euros = roundMoney(this.state.euros + LOW_FUND_STIPEND_AMOUNT);
    }

    this.state.day += 1;
    this.state.minutesOfDay = DAY_START_MINUTES;
    this.state.eveningNoticeShown = false;
    this.state.energy = 100;
    this.state.fullness = Math.max(this.state.fullness, 75);
    this.state.stats.restsTaken += 1;

    const costText = paid > 0 ? `-${paid.toFixed(2)} EUR pensao stay` : 'complimentary neighborhood host stay';
    const stipendText = stipendAdded > 0 ? ` +${stipendAdded.toFixed(2)} EUR travel stipend received.` : '';
    this.state.statusMessage = `Good morning! Day ${this.state.day} begins at 09:00 in ${this.state.currentNeighborhoodName} (${costText}).${stipendText}`;
    recordLog(this.state, 'overnight', `Rested overnight into Day ${this.state.day} (${costText}).${stipendText}`);

    return {
      ok: true,
      day: this.state.day,
      paidEur: paid,
      stipendAdded,
      state: this.state
    };
  }
}
