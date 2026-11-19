import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  DECORATIVE_STRUCTURES,
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
export const BASE_WALK_SPEED = 165;
export const INTERIOR_WALK_SPEED = 155;
export const INTERACT_DISTANCE = 76;

const VENUE_MAP = new Map(VENUES.map((v) => [v.id, v]));
const REST_SPOT_MAP = new Map(REST_SPOTS.map((s) => [s.id, s]));
const TRANSIT_LINE_MAP = new Map(TRANSIT_LINES.map((l) => [l.id, l]));
const ALL_STOPS = getAllTransitStops();
const STOP_MAP = new Map(ALL_STOPS.map((s) => [s.stopId, s]));
const ALL_MEMORIES = getAllMemoryCatalog();

const SOLID_OVERWORLD_RECTS = [
  ...VENUES.map((v) => ({ x: v.x, y: v.y, w: v.w, h: v.h, id: v.id })),
  ...DECORATIVE_STRUCTURES.map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, id: d.id }))
];

export const INTERIOR_STATIONS = {
  counter: { x: 380, y: 205, radius: 74, label: 'Proprietor Counter' },
  display: { x: 175, y: 245, radius: 66, label: 'Local Display' },
  exitMat: { x: 380, y: 416, halfWidth: 60, triggerY: 404 }
};

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

const SOLID_INTERIOR_RECTS = [
  { x: 62, y: 204, w: 72, h: 118 }, // Display shelf
  { x: 590, y: 225, w: 92, h: 54 }, // Upper right table
  { x: 590, y: 325, w: 92, h: 54 }  // Lower right table
];

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
    walkPhase: 0
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
    recordLog(state, 'milestone', 'Lisboa Memory Album complete! All 16 neighborhood memories captured.');
  }
  return true;
}

export function createInitialState() {
  const startX = 950;
  const startY = 550;
  const startHood = getNeighborhoodForX(startX);

  const state = {
    mode: 'overworld', // 'overworld' | 'interior'
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
        pt: 'Bom dia! Estou a explorar Lisboa a pe e de eletrico.',
        pronunciation: 'Bohm dee-ah! Esh-toh ah esh-ploh-rahr Leesh-boh-ah ah peh ee deh eh-leh-tree-koo.',
        en: 'Good morning! I am exploring Lisbon on foot and by tram.',
        source: 'Praca Luis de Camoes',
        day: 1
      }
    ],
    journal: [],
    statusMessage: 'Welcome to Lisboa! Walk around Bairro Alto, Chiado, and Alfama, board Tram 28E or Carris Bus, and step inside local shops and restaurants.',
    stats: {
      distanceWalkedPx: 0,
      tramRides: 0,
      busRides: 0,
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
    this.state.player.walkQueue = [];
    this.state.player.walkTarget = { x, y, onArriveAction };
  }

  setWalkPath(waypoints = []) {
    if (this.state.ridingVehicleId || !Array.isArray(waypoints) || waypoints.length === 0) return;
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

  updateVehicles(dt) {
    for (const vehicle of this.state.vehicles) {
      const line = getTransitLineById(vehicle.id);
      if (!line) continue;

      if (vehicle.dwellRemaining > 0) {
        vehicle.dwellRemaining = Math.max(0, vehicle.dwellRemaining - dt);
        continue;
      }

      const targetStep = getNextWaypointIndex(line, vehicle.waypointIndex, vehicle.direction);
      const targetWp = line.waypoints[targetStep.nextIndex];
      const dx = targetWp.x - vehicle.x;
      const dy = targetWp.y - vehicle.y;
      const dist = Math.hypot(dx, dy);
      const stepDist = line.speedPxPerSec * dt;

      vehicle.currentStopId = null;
      vehicle.currentStopName = null;

      if (dist > 0.001) {
        vehicle.heading = Math.atan2(dy, dx);
      }

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
      if (npc.patrolAxis === 'x') {
        npc.x += delta;
        if (npc.x >= npc.max) {
          npc.x = npc.max;
          npc.dir = -1;
        } else if (npc.x <= npc.min) {
          npc.x = npc.min;
          npc.dir = 1;
        }
      } else {
        npc.y += delta;
        if (npc.y >= npc.max) {
          npc.y = npc.max;
          npc.dir = -1;
        } else if (npc.y <= npc.min) {
          npc.y = npc.min;
          npc.dir = 1;
        }
      }
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
        recordLog(stateRef(this.state), 'neighborhood', `Walked into ${hood.name}.`);
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
    const validator =
      this.state.mode === 'interior' ? isInteriorPositionValid : isOverworldPositionValid;

    let movedX = 0;
    let movedY = 0;

    if (validator(player.x + stepX, player.y)) {
      player.x += stepX;
      movedX = stepX;
    }
    if (validator(player.x, player.y + stepY)) {
      player.y += stepY;
      movedY = stepY;
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
      }
    } else {
      player.isMoving = false;
      if (player.walkTarget) {
        const arriveAction = player.walkTarget.onArriveAction;
        player.walkTarget = null;
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
    }
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
        sublabel: atStop ? 'Doors open - Press [E] to step out' : 'Press [E] to ring bell (or again to alight at next stop)'
      };
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
            ? 'Doors open now - Press [E] to board'
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
      return { ok: false, error: 'Move closer to a doorway, transit stop, or bench to interact.' };
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

  enterVenue(venueId) {
    if (this.state.ridingVehicleId) {
      return { ok: false, error: 'Step off transit before entering a shop or restaurant.' };
    }
    const venue = getVenueById(venueId);
    if (!venue) {
      return { ok: false, error: `Unknown venue: ${venueId}` };
    }

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
      ? `Stepped back onto the cobblestones outside ${venue.name}.`
      : 'Stepped back outside onto Lisboa streets.';
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
      // Gently advance vehicle to this stop as if waiting a few minutes at the shelter
      vehicle.x = stop.x;
      vehicle.y = stop.y;
      vehicle.waypointIndex = stop.waypointIndex;
      vehicle.currentStopId = stop.stopId;
      vehicle.currentStopName = stop.stopName;
      vehicle.dwellRemaining = 1.2;
      vehicle.nextStopName = findUpcomingStopName(line, vehicle.waypointIndex, vehicle.direction);
      this.advanceMinutes(7);
    }

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
      this.state.player.y = stop ? stop.platformY : vehicle.y - 36;
      this.state.player.overworldX = this.state.player.x;
      this.state.player.overworldY = this.state.player.y;
      this.updateNeighborhoodTracking();

      this.state.statusMessage = `Stepped off ${line.name} at ${stop ? stop.stopName : 'stop'}.`;
      recordLog(this.state, 'transit', `Alighted from ${line.name} at ${stop ? stop.stopName : 'stop'}.`);
      return { ok: true, alighted: true, stop, state: this.state };
    }

    if (immediateToNextStop) {
      // Advance cleanly to the next stop on the route
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
    this.state.statusMessage = `Bell rung aboard ${line.name}. You will step out automatically at ${vehicle.nextStopName}.`;
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

function stateRef(state) {
  return state;
}
