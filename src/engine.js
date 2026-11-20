import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  DECORATIVE_STRUCTURES,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  METRO_LINE,
  METRO_STATIONS,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  MILESTONE_MEMORIES,
  AMBIENT_NPCS,
  PLAYER_OUTFITS,
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
export const BASE_WALK_SPEED = 64;
export const INTERIOR_WALK_SPEED = 76;
export const INTERACT_DISTANCE = 76;

const VENUE_MAP = new Map(VENUES.map((v) => [v.id, v]));
const METRO_MAP = new Map(METRO_STATIONS.map((m) => [m.id, m]));
const FERRY_DEST_MAP = new Map(FERRY_DESTINATIONS.map((d) => [d.id, d]));
const REST_SPOT_MAP = new Map(REST_SPOTS.map((s) => [s.id, s]));
const TRANSIT_LINE_MAP = new Map(TRANSIT_LINES.map((l) => [l.id, l]));
const ALL_STOPS = getAllTransitStops();
const STOP_MAP = new Map(ALL_STOPS.map((s) => [s.stopId, s]));
const ALL_MEMORIES = getAllMemoryCatalog();

const SOLID_OVERWORLD_RECTS = [
  ...VENUES.map((v) => ({ x: v.x, y: v.y, w: v.w, h: v.h, id: v.id })),
  ...DECORATIVE_STRUCTURES.map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, id: d.id })),
  ...METRO_STATIONS.map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h, id: m.id })),
  { x: FERRY_TERMINAL.x, y: FERRY_TERMINAL.y, w: FERRY_TERMINAL.w, h: FERRY_TERMINAL.h, id: FERRY_TERMINAL.id }
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
  const inLane = Math.abs(localY) < VEHICLE_HALF_WIDTH + radius + 3;
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

export function isPointOnSidewalk(px, py) {
  if (isPointInVehicleLane(px, py)) return false;
  if (!isOverworldPositionValid(px, py, PLAYER_RADIUS)) return false;
  // Exclude roadway curb-to-curb lanes of horizontal streets while preserving full stone sidewalks
  if (py > 246 && py < 324) return false;
  if (py > 575 && py < 645) return false;
  if (py > 892 && py < 970) return false;
  return true;
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

export function isFerryPierPositionValid(x, y, radius = PLAYER_RADIUS) {
  // Walkable Transtejo timber & limestone pier safely north of the Tagus water edge
  if (x < 64 + radius || x > INTERIOR_WIDTH - 64 - radius) return false;
  if (y < 156 + radius || y > 282 - radius) return false;
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
    homeX: npc.x,
    homeY: npc.y,
    dir: 1,
    walkPhase: 0,
    isMoving: true,
    blockedTime: 0,
    avoidSide: 0
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
    mode: 'overworld', // 'overworld' | 'interior' | 'metro' | 'ferry'
    viewMode: 'street3d', // 'street3d' | 'overhead'
    cameraYaw: 0.08, // Looking east along Largo do Chiado toward Cafe A Brasileira & Tram 28E
    cameraPitch: 0.03,
    euros: INITIAL_EUROS,
    energy: INITIAL_ENERGY,
    fullness: INITIAL_FULLNESS,
    day: 1,
    minutesOfDay: DAY_START_MINUTES,
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
    ferry: {
      portId: null, // 'cais-do-sodre' | 'cacilhas' | 'seixal' | 'montijo'
      phase: null, // 'terminal' | 'sailing'
      phaseProgress: 0,
      fromPortId: null,
      toPortId: null,
      sailDuration: 4.5,
      waveOffset: 0
    },
    visitedFerryPorts: [],
    busScrollOffset: 0,
    tramScrollOffset: 0,
    transitAnnouncement: null,
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
      ferryRides: 0,
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
    this.doorEntryCooldown = 0;
    this.announcementSeq = 0;
  }

  reset() {
    const prevName = this.state?.player?.name || 'Traveler 1';
    const prevOutfit = this.state?.player?.outfitId || PLAYER_OUTFITS[0].id;
    const prevRemotes = this.state?.remotePlayers || [];
    const prevViewMode = this.state?.viewMode || 'street3d';
    this.state = createInitialState();
    this.state.viewMode = prevViewMode;
    this.state.player.name = prevName;
    this.state.player.outfitId = prevOutfit;
    this.state.remotePlayers = prevRemotes;
    this.timeAccumulator = 0;
    this.doorEntryCooldown = 0;
    return this.state;
  }

  setViewMode(mode) {
    if (mode !== 'street3d' && mode !== 'overhead') return this.state.viewMode;
    this.state.viewMode = mode;
    this.state.statusMessage =
      mode === 'street3d'
        ? 'Switched to 3D Street View. Drag to look 360 degrees, press W/S or Up/Down to walk, A/D or Left/Right to turn, or press [V] for Overhead Map.'
        : 'Switched to 2.5D Overhead Lisboa Map. Press [V] anytime to return to 3D Street View.';
    return this.state.viewMode;
  }

  toggleViewMode() {
    return this.setViewMode(this.state.viewMode === 'street3d' ? 'overhead' : 'street3d');
  }

  rotateCamera(deltaYaw, deltaPitch = 0) {
    if (Number.isFinite(deltaYaw)) {
      const next = (this.state.cameraYaw || 0) + deltaYaw;
      this.state.cameraYaw = Math.atan2(Math.sin(next), Math.cos(next));
    }
    if (Number.isFinite(deltaPitch) && deltaPitch !== 0) {
      this.state.cameraPitch = clamp((this.state.cameraPitch || 0) + deltaPitch, -0.24, 0.34);
    }
    return { yaw: this.state.cameraYaw, pitch: this.state.cameraPitch };
  }

  setCameraAngles(yaw, pitch) {
    if (Number.isFinite(yaw)) {
      this.state.cameraYaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    }
    if (Number.isFinite(pitch)) {
      this.state.cameraPitch = clamp(pitch, -0.24, 0.34);
    }
    return { yaw: this.state.cameraYaw, pitch: this.state.cameraPitch };
  }

  setPlayerProfile({ name, outfitId } = {}) {
    if (typeof name === 'string' && name.trim()) {
      this.state.player.name = name.trim().slice(0, 22);
    }
    if (typeof outfitId === 'string' && PLAYER_OUTFITS.some((o) => o.id === outfitId)) {
      this.state.player.outfitId = outfitId;
    }
    return {
      name: this.state.player.name,
      outfitId: this.state.player.outfitId
    };
  }

  setPlayerPosition(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.state.player.x = x;
    this.state.player.y = y;
    if (this.state.mode === 'overworld') {
      this.state.player.overworldX = x;
      this.state.player.overworldY = y;
      this.updateNeighborhoodTracking();
    }
  }

  triggerEmote(text, durationSeconds = 3.2) {
    const cleaned = String(text || '').trim().slice(0, 36);
    if (!cleaned) return;
    this.state.player.emoteText = cleaned;
    this.state.player.emoteTimer = Math.max(1.0, durationSeconds);
  }

  setRemotePlayers(playersList = [], { snap = false } = {}) {
    const existingById = new Map(this.state.remotePlayers.map((rp) => [rp.id, rp]));
    this.state.remotePlayers = playersList.map((raw) => {
      const prev = existingById.get(raw.id);
      const sameScene =
        !snap &&
        prev &&
        prev.mode === (raw.mode || 'overworld') &&
        prev.currentVenueId === (raw.currentVenueId || null) &&
        prev.metroStationId === (raw.metroStationId || null);
      const targetX = Number.isFinite(raw.x) ? raw.x : 950;
      const targetY = Number.isFinite(raw.y) ? raw.y : 544;
      const outfitId = PLAYER_OUTFITS.some((o) => o.id === raw.outfitId)
        ? raw.outfitId
        : PLAYER_OUTFITS[1].id;
      return {
        id: raw.id,
        slot: raw.slot || 2,
        name: raw.name || `Traveler ${raw.slot || 2}`,
        outfitId,
        x: sameScene ? prev.x : targetX,
        y: sameScene ? prev.y : targetY,
        targetX,
        targetY,
        facing: ['up', 'down', 'left', 'right'].includes(raw.facing) ? raw.facing : 'down',
        walkPhase: sameScene ? prev.walkPhase : (Number.isFinite(raw.walkPhase) ? raw.walkPhase : 0),
        isMoving: Boolean(raw.isMoving),
        mode: raw.mode || 'overworld',
        currentVenueId: raw.currentVenueId || null,
        metroStationId: raw.metroStationId || null,
        metroPhase: raw.metroPhase || null,
        ridingVehicleId: raw.ridingVehicleId || null,
        neighborhoodName: raw.neighborhoodName || 'Chiado',
        emoteText: typeof raw.emoteText === 'string' ? raw.emoteText : ''
      };
    });
    return this.state.remotePlayers;
  }

  updateRemotePlayers(dt) {
    if (this.state.player.emoteTimer > 0) {
      this.state.player.emoteTimer = Math.max(0, this.state.player.emoteTimer - dt);
      if (this.state.player.emoteTimer === 0) {
        this.state.player.emoteText = '';
      }
    }

    const alpha = Math.min(1, dt * 14);
    for (const rp of this.state.remotePlayers) {
      const dx = rp.targetX - rp.x;
      const dy = rp.targetY - rp.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 160) {
        rp.x = rp.targetX;
        rp.y = rp.targetY;
      } else if (dist > 0.5) {
        rp.x += dx * alpha;
        rp.y += dy * alpha;
      } else {
        rp.x = rp.targetX;
        rp.y = rp.targetY;
      }
      if (rp.isMoving || dist > 2.2) {
        rp.walkPhase = (rp.walkPhase + dt * 9.2) % (Math.PI * 2);
      }
    }
  }

  getNetworkSnapshot() {
    const s = this.state;
    return {
      x: Math.round(s.player.x * 10) / 10,
      y: Math.round(s.player.y * 10) / 10,
      facing: s.player.facing,
      walkPhase: Math.round(s.player.walkPhase * 100) / 100,
      isMoving: s.player.isMoving,
      mode: s.mode,
      currentVenueId: s.currentVenueId,
      metroStationId: s.mode === 'metro' ? s.metro.stationId : null,
      metroPhase: s.mode === 'metro' ? s.metro.phase : null,
      ferryPortId: s.mode === 'ferry' ? s.ferry.portId : null,
      ferryPhase: s.mode === 'ferry' ? s.ferry.phase : null,
      ridingVehicleId: s.ridingVehicleId,
      neighborhoodName: s.currentNeighborhoodName,
      outfitId: s.player.outfitId,
      name: s.player.name,
      emoteText: s.player.emoteText
    };
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

  isRemotePlayerInSameScene(rp) {
    if (this.state.mode === 'overworld') {
      return rp.mode === 'overworld' && !rp.ridingVehicleId;
    }
    if (this.state.mode === 'interior') {
      return rp.mode === 'interior' && rp.currentVenueId === this.state.currentVenueId;
    }
    if (this.state.mode === 'metro') {
      return (
        rp.mode === 'metro' &&
        rp.metroStationId === this.state.metro.stationId &&
        rp.metroPhase !== 'riding'
      );
    }
    if (this.state.mode === 'ferry') {
      return (
        rp.mode === 'ferry' &&
        rp.ferryPortId === this.state.ferry.portId &&
        rp.ferryPhase === 'terminal'
      );
    }
    return false;
  }

  isBlockedByPerson(x, y, { ignorePlayer = false, ignoreNpcId = null, fromX = null, fromY = null } = {}) {
    if (!ignorePlayer && this.state.mode === 'overworld' && !this.state.ridingVehicleId) {
      if (distance(x, y, this.state.player.x, this.state.player.y) < PERSON_SEPARATION_DIST) {
        return { kind: 'player', name: this.state.player.name || 'Traveler' };
      }
    }
    if (this.state.mode === 'overworld') {
      for (const npc of this.state.npcs) {
        if (npc.id === ignoreNpcId) continue;
        const nextDist = distance(x, y, npc.x, npc.y);
        if (nextDist < PERSON_SEPARATION_DIST) {
          // Anti-deadlock: if a villager slips closely past on a narrow sidewalk, always allow stepping farther apart
          if (Number.isFinite(fromX) && Number.isFinite(fromY)) {
            const curDist = distance(fromX, fromY, npc.x, npc.y);
            if (nextDist > curDist + 0.05) continue;
          }
          return { kind: 'npc', name: npc.name, npc };
        }
      }
    }
    for (const rp of this.state.remotePlayers) {
      if (!this.isRemotePlayerInSameScene(rp)) continue;
      const nextDist = distance(x, y, rp.x, rp.y);
      if (nextDist < PERSON_SEPARATION_DIST) {
        // Anti-deadlock: if two players start close, always allow stepping farther apart
        if (Number.isFinite(fromX) && Number.isFinite(fromY)) {
          const curDist = distance(fromX, fromY, rp.x, rp.y);
          if (nextDist > curDist + 0.05) continue;
        }
        return { kind: 'remote-player', name: rp.name, player: rp };
      }
    }
    return null;
  }

  canPlayerStepTo(x, y) {
    const px = this.state.player.x;
    const py = this.state.player.y;
    if (this.state.mode === 'interior') {
      if (!isInteriorPositionValid(x, y)) return { ok: false, blocker: null };
      const blockingPeer = this.isBlockedByPerson(x, y, { ignorePlayer: true, fromX: px, fromY: py });
      if (blockingPeer) return { ok: false, blocker: blockingPeer };
      return { ok: true, blocker: null };
    }
    if (this.state.mode === 'metro') {
      if (!isMetroPlatformPositionValid(x, y)) return { ok: false, blocker: null };
      const blockingPeer = this.isBlockedByPerson(x, y, { ignorePlayer: true, fromX: px, fromY: py });
      if (blockingPeer) return { ok: false, blocker: blockingPeer };
      return { ok: true, blocker: null };
    }
    if (this.state.mode === 'ferry') {
      if (!isFerryPierPositionValid(x, y)) return { ok: false, blocker: null };
      const blockingPeer = this.isBlockedByPerson(x, y, { ignorePlayer: true, fromX: px, fromY: py });
      if (blockingPeer) return { ok: false, blocker: blockingPeer };
      return { ok: true, blocker: null };
    }
    if (!isOverworldPositionValid(x, y)) {
      return { ok: false, blocker: { kind: 'structure' } };
    }
    const blockingVehicle = this.isBlockedByVehicle(x, y, PLAYER_RADIUS);
    if (blockingVehicle) {
      return { ok: false, blocker: { kind: 'vehicle', vehicle: blockingVehicle } };
    }
    const blockingPerson = this.isBlockedByPerson(x, y, { ignorePlayer: true, fromX: px, fromY: py });
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
    // Never run over or collide with connected multiplayer travelers on foot (check both rendered and target coordinates)
    for (const rp of this.state.remotePlayers) {
      if (rp.mode !== 'overworld' || rp.ridingVehicleId) continue;
      if (
        isPedestrianAheadOfVehicle(probeVehicle, rp.x, rp.y, PLAYER_RADIUS) ||
        pointIntersectsVehicle(rp.x, rp.y, PLAYER_RADIUS, probeVehicle) ||
        (Number.isFinite(rp.targetX) &&
          Number.isFinite(rp.targetY) &&
          (isPedestrianAheadOfVehicle(probeVehicle, rp.targetX, rp.targetY, PLAYER_RADIUS) ||
            pointIntersectsVehicle(rp.targetX, rp.targetY, PLAYER_RADIUS, probeVehicle)))
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
    const passClearance = 17.0; // Clean shoulder-to-shoulder passing clearance on 35-38px Lisbon sidewalks
    const preferredGap = 24.0; // Comfortable berth when full sidewalk width is open
    const lookahead = 54.0; // Start curving around blocking people well before colliding

    const getPedestriansFor = (npc) => {
      const list = [];
      if (this.state.mode === 'overworld' && !this.state.ridingVehicleId) {
        list.push({ x: this.state.player.x, y: this.state.player.y });
      }
      for (const rp of this.state.remotePlayers || []) {
        if (rp.mode === 'overworld' && !rp.ridingVehicleId) {
          list.push({ x: rp.x, y: rp.y });
        }
      }
      for (const other of this.state.npcs) {
        if (other.id === npc.id) continue;
        list.push({ x: other.x, y: other.y });
      }
      return list;
    };

    const getSidewalkSpanY = (x, refY) => {
      const base = Math.round(refY);
      let minY = base;
      let maxY = base;
      while (minY > base - 50 && isPointOnSidewalk(x, minY - 1)) minY -= 1;
      while (maxY < base + 50 && isPointOnSidewalk(x, maxY + 1)) maxY += 1;
      return { minY, maxY };
    };

    const getSidewalkSpanX = (refX, y) => {
      const base = Math.round(refX);
      let minX = base;
      let maxX = base;
      while (minX > base - 50 && isPointOnSidewalk(minX - 1, y)) minX -= 1;
      while (maxX < base + 50 && isPointOnSidewalk(maxX + 1, y)) maxX += 1;
      return { minX, maxX };
    };

    const isNpcCandidateClear = (npc, cx, cy, pedestrians, minSep) => {
      if (!isPointOnSidewalk(cx, cy)) return false;
      if (this.isBlockedByVehicle(cx, cy, PLAYER_RADIUS)) return false;
      for (const p of pedestrians) {
        const nextDist = distance(cx, cy, p.x, p.y);
        if (nextDist < minSep) {
          const curDist = distance(npc.x, npc.y, p.x, p.y);
          // If already closer than minSep, only allow stepping strictly farther away
          if (curDist < minSep && nextDist > curDist + 0.05) continue;
          return false;
        }
      }
      return true;
    };

    for (const npc of this.state.npcs) {
      const step = npc.speed * dt;
      const pedestrians = getPedestriansFor(npc);

      if (npc.patrolAxis === 'x') {
        // Reached patrol corridor end: turn around naturally only at endpoints
        if (npc.x >= npc.max && npc.dir > 0) npc.dir = -1;
        else if (npc.x <= npc.min && npc.dir < 0) npc.dir = 1;

        // Detect closest blocking pedestrian ahead or directly beside us along our travel direction
        let blocker = null;
        let bestAlong = Infinity;
        for (const p of pedestrians) {
          const along = (p.x - npc.x) * npc.dir;
          const lat = Math.abs(p.y - npc.y);
          if (along > -20 && along < lookahead && lat < preferredGap - 1) {
            if (along < bestAlong) {
              bestAlong = along;
              blocker = p;
            }
          }
        }

        if (blocker) {
          const curSpan = getSidewalkSpanY(npc.x, npc.y);
          const passSpan = getSidewalkSpanY(clamp(blocker.x, npc.min, npc.max), npc.y);
          const sideMinY = Math.max(curSpan.minY, passSpan.minY);
          const sideMaxY = Math.min(curSpan.maxY, passSpan.maxY);
          const useMinY = sideMaxY - sideMinY >= passClearance ? sideMinY : curSpan.minY;
          const useMaxY = sideMaxY - sideMinY >= passClearance ? sideMaxY : curSpan.maxY;

          const spaceUp = blocker.y - useMinY;
          const spaceDown = useMaxY - blocker.y;

          // Lock a consistent passing side so the villager arcs smoothly around you without reversing direction
          if (!npc.avoidSide) {
            npc.avoidSide = spaceDown >= spaceUp ? 1 : -1;
          } else if (npc.avoidSide === 1 && spaceDown < passClearance && spaceUp >= passClearance) {
            npc.avoidSide = -1;
          } else if (npc.avoidSide === -1 && spaceUp < passClearance && spaceDown >= passClearance) {
            npc.avoidSide = 1;
          }

          const desiredY =
            npc.avoidSide > 0
              ? Math.min(useMaxY, blocker.y + preferredGap)
              : Math.max(useMinY, blocker.y - preferredGap);

          const dyNeeded = desiredY - npc.y;
          const latMove = Math.sign(dyNeeded) * Math.min(Math.abs(dyNeeded), Math.max(step * 1.65, 2.2));
          const nextY = clamp(npc.y + latMove, useMinY, useMaxY);
          const nextX = clamp(npc.x + step * npc.dir, npc.min, npc.max);
          const halfX = clamp(npc.x + step * 0.55 * npc.dir, npc.min, npc.max);

          const candidates = [
            { x: nextX, y: nextY },
            { x: halfX, y: nextY },
            { x: npc.x, y: nextY },
            { x: nextX, y: npc.y }
          ];

          let moved = false;
          for (const c of candidates) {
            if (isNpcCandidateClear(npc, c.x, c.y, pedestrians, passClearance)) {
              npc.x = c.x;
              npc.y = c.y;
              npc.isMoving = true;
              npc.blockedTime = 0;
              npc.walkPhase = (npc.walkPhase + dt * 4.6) % (Math.PI * 2);
              moved = true;
              break;
            }
          }
          if (!moved) {
            // Never reverse direction because of a person; wait politely if completely walled off
            npc.isMoving = false;
          }
          continue;
        }

        // Path ahead is clear: reset avoidSide, continue in the SAME direction, and ease gently back to homeY
        npc.avoidSide = 0;
        const targetX = clamp(npc.x + step * npc.dir, npc.min, npc.max);
        let targetY = npc.y;
        const homeDy = npc.homeY - npc.y;
        if (Math.abs(homeDy) > 0.4) {
          const driftY = npc.y + clamp(homeDy, -step * 0.8, step * 0.8);
          if (isNpcCandidateClear(npc, targetX, driftY, pedestrians, preferredGap)) {
            targetY = driftY;
          }
        }

        if (isNpcCandidateClear(npc, targetX, targetY, pedestrians, passClearance)) {
          npc.x = targetX;
          npc.y = targetY;
          npc.isMoving = true;
          npc.blockedTime = 0;
          npc.walkPhase = (npc.walkPhase + dt * 4.6) % (Math.PI * 2);
          if (npc.x >= npc.max) npc.dir = -1;
          else if (npc.x <= npc.min) npc.dir = 1;
        } else {
          npc.isMoving = false;
        }
      } else {
        // Symmetric vertical sidewalk patrol & smooth go-around logic (never flips direction on person block)
        if (npc.y >= npc.max && npc.dir > 0) npc.dir = -1;
        else if (npc.y <= npc.min && npc.dir < 0) npc.dir = 1;

        let blocker = null;
        let bestAlong = Infinity;
        for (const p of pedestrians) {
          const along = (p.y - npc.y) * npc.dir;
          const lat = Math.abs(p.x - npc.x);
          if (along > -20 && along < lookahead && lat < preferredGap - 1) {
            if (along < bestAlong) {
              bestAlong = along;
              blocker = p;
            }
          }
        }

        if (blocker) {
          const curSpan = getSidewalkSpanX(npc.x, npc.y);
          const spaceLeft = blocker.x - curSpan.minX;
          const spaceRight = curSpan.maxX - blocker.x;
          if (!npc.avoidSide) {
            npc.avoidSide = spaceRight >= spaceLeft ? 1 : -1;
          }
          const desiredX =
            npc.avoidSide > 0
              ? Math.min(curSpan.maxX, blocker.x + preferredGap)
              : Math.max(curSpan.minX, blocker.x - preferredGap);
          const dxNeeded = desiredX - npc.x;
          const latMove = Math.sign(dxNeeded) * Math.min(Math.abs(dxNeeded), Math.max(step * 1.65, 2.2));
          const nextX = clamp(npc.x + latMove, curSpan.minX, curSpan.maxX);
          const nextY = clamp(npc.y + step * npc.dir, npc.min, npc.max);
          const halfY = clamp(npc.y + step * 0.55 * npc.dir, npc.min, npc.max);

          let moved = false;
          for (const c of [
            { x: nextX, y: nextY },
            { x: nextX, y: halfY },
            { x: nextX, y: npc.y },
            { x: npc.x, y: nextY }
          ]) {
            if (isNpcCandidateClear(npc, c.x, c.y, pedestrians, passClearance)) {
              npc.x = c.x;
              npc.y = c.y;
              npc.isMoving = true;
              npc.walkPhase = (npc.walkPhase + dt * 4.6) % (Math.PI * 2);
              moved = true;
              break;
            }
          }
          if (!moved) npc.isMoving = false;
          continue;
        }

        npc.avoidSide = 0;
        const targetY = clamp(npc.y + step * npc.dir, npc.min, npc.max);
        let targetX = npc.x;
        const homeDx = npc.homeX - npc.x;
        if (Math.abs(homeDx) > 0.4) {
          const driftX = npc.x + clamp(homeDx, -step * 0.8, step * 0.8);
          if (isNpcCandidateClear(npc, driftX, targetY, pedestrians, preferredGap)) {
            targetX = driftX;
          }
        }
        if (isNpcCandidateClear(npc, targetX, targetY, pedestrians, passClearance)) {
          npc.x = targetX;
          npc.y = targetY;
          npc.isMoving = true;
          npc.walkPhase = (npc.walkPhase + dt * 4.6) % (Math.PI * 2);
          if (npc.y >= npc.max) npc.dir = -1;
          else if (npc.y <= npc.min) npc.dir = 1;
        } else {
          npc.isMoving = false;
        }
      }
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
      if (this.state.mode === 'overworld') {
        const targetYaw = Math.atan2(vy, vx);
        const curYaw = this.state.cameraYaw || 0;
        const diff = Math.atan2(Math.sin(targetYaw - curYaw), Math.cos(targetYaw - curYaw));
        this.state.cameraYaw = Math.atan2(Math.sin(curYaw + diff * Math.min(1, dt * 6.5)), Math.cos(curYaw + diff * Math.min(1, dt * 6.5)));
      }
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

    // Directional walk-in doorway entry: pressing Up/Down/Left/Right into a building or Metro doorway enters it naturally
    if (this.state.mode === 'overworld' && this.doorEntryCooldown <= 0 && !player.walkTarget) {
      const doorMatch = this.findDoorwayAhead(player.x, player.y, vx, vy);
      if (doorMatch) {
        if (doorMatch.type === 'venue') {
          this.enterVenue(doorMatch.id);
          return;
        }
        if (doorMatch.type === 'metro') {
          this.openMetroStation(doorMatch.id);
          return;
        }
        if (doorMatch.type === 'ferry') {
          this.openFerryTerminal();
          return;
        }
      }
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
      } else if (this.state.mode === 'ferry' && this.state.ferry.phase === 'terminal') {
        if (
          this.state.ferry.portId === FERRY_TERMINAL.id &&
          vy < -0.25 &&
          player.y <= FERRY_PIER_ZONES.exitY &&
          Math.abs(player.x - 380) <= FERRY_PIER_ZONES.exitHalfWidth
        ) {
          this.exitFerryTerminal();
        }
      }
    } else {
      player.isMoving = false;
      if (lastBlocker?.kind === 'vehicle') {
        this.state.statusMessage = `Waiting safely on the side as ${lastBlocker.vehicle.name} passes.`;
        // Keep click-to-walk target waiting patiently if blocked temporarily by a passing vehicle
        return;
      }
      if (lastBlocker?.kind === 'npc' || lastBlocker?.kind === 'remote-player') {
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

  findDoorwayAhead(px, py, vx, vy) {
    const doorwayHalfW = 24;
    const approachReach = 28;

    for (const venue of VENUES) {
      if (
        venue.doorSide === 'south' &&
        vy < -0.25 &&
        Math.abs(px - venue.doorX) <= doorwayHalfW &&
        py >= venue.doorY - 2 &&
        py <= venue.doorY + approachReach
      ) {
        return { type: 'venue', id: venue.id };
      }
      if (
        venue.doorSide === 'north' &&
        vy > 0.25 &&
        Math.abs(px - venue.doorX) <= doorwayHalfW &&
        py <= venue.doorY + 2 &&
        py >= venue.doorY - approachReach
      ) {
        return { type: 'venue', id: venue.id };
      }
      if (
        venue.doorSide === 'west' &&
        vx > 0.25 &&
        Math.abs(py - venue.doorY) <= doorwayHalfW &&
        px <= venue.doorX + 2 &&
        px >= venue.doorX - approachReach
      ) {
        return { type: 'venue', id: venue.id };
      }
      if (
        venue.doorSide === 'east' &&
        vx < -0.25 &&
        Math.abs(py - venue.doorY) <= doorwayHalfW &&
        px >= venue.doorX - 2 &&
        px <= venue.doorX + approachReach
      ) {
        return { type: 'venue', id: venue.id };
      }
    }

    for (const station of METRO_STATIONS) {
      if (
        vy < -0.25 &&
        Math.abs(px - station.doorX) <= doorwayHalfW &&
        py >= station.doorY - 2 &&
        py <= station.doorY + approachReach
      ) {
        return { type: 'metro', id: station.id };
      }
    }

    // Cais do Sodre Ferry Terminal (walk DOWN into north waterfront entrance)
    if (
      vy > 0.25 &&
      Math.abs(px - FERRY_TERMINAL.doorX) <= doorwayHalfW + 14 &&
      py <= FERRY_TERMINAL.doorY + 2 &&
      py >= FERRY_TERMINAL.doorY - approachReach
    ) {
      return { type: 'ferry', id: FERRY_TERMINAL.id };
    }

    return null;
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
    } else if (action.type === 'openFerry') {
      this.openFerryTerminal();
    } else if (action.type === 'exitFerry') {
      this.exitFerryTerminal();
    } else if (action.type === 'boardDefaultFerry') {
      const target = this.state.ferry.portId === FERRY_TERMINAL.id ? 'cacilhas' : FERRY_TERMINAL.id;
      this.boardFerry(target);
    } else if (action.type === 'southBankSpot' && action.spotId) {
      this.interactWithSouthBankSpot(action.spotId);
    }
  }

  updateFerrySimulation(dt) {
    if (this.state.mode !== 'ferry') return;
    const f = this.state.ferry;
    f.waveOffset = (f.waveOffset + dt * (f.phase === 'sailing' ? 210 : 38)) % 1200;

    if (f.phase === 'sailing') {
      f.phaseProgress = Math.min(1, f.phaseProgress + dt / Math.max(1.5, f.sailDuration || 4.2));
      this.state.player.isMoving = false;

      if (f.phaseProgress >= 1) {
        f.portId = f.toPortId;
        f.phase = 'terminal';
        f.phaseProgress = 0;
        this.state.player.x = 380;
        this.state.player.y = 228;
        this.state.player.facing = 'up';

        if (f.portId === FERRY_TERMINAL.id) {
          this.state.statusMessage =
            'Transtejo ferry docked back at Cais do Sodre. Walk up to the waterfront gate (or press Esc) to return to Lisbon streets.';
        } else {
          const dest = getFerryDestinationById(f.portId);
          this.state.statusMessage = dest
            ? `Arrived across the Tagus at ${dest.name}! ${dest.pierNote}`
            : 'Arrived at the Tagus south-bank ferry pier.';
        }
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
        this.doorEntryCooldown = 0.55;
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

    if (this.doorEntryCooldown > 0) {
      this.doorEntryCooldown = Math.max(0, this.doorEntryCooldown - dt);
    }

    this.updateVehicles(dt);
    this.updateNpcs(dt);
    this.updateRemotePlayers(dt);

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

    if (this.state.mode === 'ferry') {
      this.updateFerrySimulation(dt);
      if (this.state.mode === 'ferry' && this.state.ferry.phase === 'terminal') {
        this.movePlayerByInput(input.x || 0, input.y || 0, dt);
      }
      return this.state;
    }

    if (this.state.transitAnnouncement && this.state.transitAnnouncement.timer > 0) {
      this.state.transitAnnouncement.timer = Math.max(0, this.state.transitAnnouncement.timer - dt);
      if (this.state.transitAnnouncement.timer === 0) {
        this.state.transitAnnouncement = null;
      }
    }

    if (this.state.ridingVehicleId) {
      const vehicle = this.getRidingVehicle();
      if (vehicle) {
        if (!vehicle.yielding && vehicle.dwellRemaining <= 0) {
          if (vehicle.mode === 'bus') {
            this.state.busScrollOffset = (this.state.busScrollOffset + dt * 165) % 100000;
          } else if (vehicle.mode === 'tram') {
            this.state.tramScrollOffset = (this.state.tramScrollOffset + dt * 130) % 100000;
          }
        }
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

    if (state.mode === 'ferry') {
      const f = state.ferry;
      const curDest = getFerryDestinationById(f.portId);
      if (f.phase === 'sailing') {
        const toLabel =
          f.toPortId === FERRY_TERMINAL.id
            ? FERRY_TERMINAL.shortName
            : (getFerryDestinationById(f.toPortId)?.name || 'South Bank');
        return {
          type: 'ferry-transition',
          label: `Sailing Transtejo Ferry across the Tagus -> ${toLabel}`,
          sublabel: 'Enjoy the river breeze and Lisbon skyline crossing'
        };
      }
      const px = state.player.x;
      const py = state.player.y;
      if (
        f.portId === FERRY_TERMINAL.id &&
        py <= FERRY_PIER_ZONES.exitY + 18 &&
        Math.abs(px - 380) <= FERRY_PIER_ZONES.exitHalfWidth + 14
      ) {
        return {
          type: 'ferry-exit',
          label: 'Exit Cais do Sodre Terminal to Waterfront',
          sublabel: 'Press [E] or walk up to return to Avenida Ribeira'
        };
      }
      // On South-Bank waterfront towns (Cacilhas, Seixal, Montijo), interact with eateries, landmarks & shops!
      if (curDest && Array.isArray(curDest.townSpots)) {
        for (const spot of curDest.townSpots) {
          if (distance(px, py, spot.x, spot.y) <= 74) {
            return {
              type: 'south-bank-spot',
              spotId: spot.id,
              spot,
              label:
                spot.kind === 'landmark'
                  ? `Visit ${spot.name}`
                  : `Browse ${spot.name} ${spot.badge}`,
              sublabel:
                spot.kind === 'landmark'
                  ? 'Press [E] to rest (+25 Energy) and read local Tagus history'
                  : `Host: ${spot.host} - Press [E] to chat or order from the ${curDest.shortName} panel`
            };
          }
        }
      }
      if (py >= 236 && Math.abs(px - 380) <= FERRY_PIER_ZONES.gangwayHalfWidth) {
        if (f.portId === FERRY_TERMINAL.id) {
          return {
            type: 'ferry-board',
            targetPortId: 'cacilhas',
            label: 'Board Transtejo Ferry -> Cacilhas (1.55 EUR)',
            sublabel: 'Press [E] for Cacilhas, or choose Cacilhas, Seixal, or Montijo in the Ferry panel'
          };
        }
        return {
          type: 'ferry-board',
          targetPortId: FERRY_TERMINAL.id,
          label: `Return Ferry from ${curDest ? curDest.shortName : 'South Bank'} -> Cais do Sodre`,
          sublabel: 'Press [E] to sail back across the Tagus to Lisbon'
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
          sublabel: `${station.lines.join(' & ')} - Walk UP into entrance or press [E]`
        };
      }
    }

    // Cais do Sodre Transtejo Ferry Port along Tagus riverfront
    const ferryDist = distance(px, py, FERRY_TERMINAL.doorX, FERRY_TERMINAL.doorY);
    if (ferryDist <= INTERACT_DISTANCE + 12 && ferryDist < bestDist) {
      bestDist = ferryDist;
      best = {
        type: 'ferry',
        id: FERRY_TERMINAL.id,
        label: `Enter ${FERRY_TERMINAL.name} ${FERRY_TERMINAL.badge}`,
        sublabel: 'Transtejo ferries to Cacilhas, Seixal & Montijo - Walk DOWN or press [E]'
      };
    }

    for (const venue of VENUES) {
      const d = distance(px, py, venue.doorX, venue.doorY);
      if (d <= INTERACT_DISTANCE && d < bestDist) {
        bestDist = d;
        const dirHint =
          venue.doorSide === 'south'
            ? 'Walk UP into door'
            : venue.doorSide === 'north'
              ? 'Walk DOWN into door'
              : venue.doorSide === 'west'
                ? 'Walk RIGHT into door'
                : 'Walk LEFT into door';
        best = {
          type: 'venue',
          id: venue.id,
          venue,
          label: `Enter ${venue.name} ${venue.badge}`,
          sublabel: `${dirHint} or press [E] to step inside`
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
    if (nearby.type === 'metro-transition' || nearby.type === 'ferry-transition') {
      return { ok: true, state: this.state };
    }
    if (nearby.type === 'ferry') {
      return this.openFerryTerminal();
    }
    if (nearby.type === 'ferry-exit') {
      return this.exitFerryTerminal();
    }
    if (nearby.type === 'ferry-board' && nearby.targetPortId) {
      return this.boardFerry(nearby.targetPortId);
    }
    if (nearby.type === 'south-bank-spot' && nearby.spotId) {
      return this.interactWithSouthBankSpot(nearby.spotId);
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

  openFerryTerminal() {
    if (this.state.ridingVehicleId) {
      return { ok: false, error: 'Step off surface transit before entering Cais do Sodre Ferry Terminal.' };
    }
    if (this.state.mode === 'interior' || this.state.mode === 'metro') {
      return { ok: false, error: 'Return to the street before entering Cais do Sodre Ferry Terminal.' };
    }

    this.state.mode = 'ferry';
    this.state.activeMetroStationId = null;
    this.state.player.overworldX = FERRY_TERMINAL.spawnOutside.x;
    this.state.player.overworldY = FERRY_TERMINAL.spawnOutside.y;
    this.state.player.x = 380;
    this.state.player.y = 200;
    this.state.player.facing = 'down';
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;

    this.state.ferry = {
      portId: FERRY_TERMINAL.id,
      phase: 'terminal',
      phaseProgress: 0,
      fromPortId: FERRY_TERMINAL.id,
      toPortId: null,
      sailDuration: 4.5,
      waveOffset: 0
    };

    recordPhrase(this.state, FERRY_TERMINAL.phrase, FERRY_TERMINAL.name);
    this.state.statusMessage =
      'Stepped onto Cais do Sodre Transtejo Pier. Board a ferry across the Tagus to Cacilhas, Seixal, or Montijo!';
    recordLog(this.state, 'ferry', 'Entered Cais do Sodre Transtejo Ferry Terminal.');
    return { ok: true, terminal: FERRY_TERMINAL, state: this.state };
  }

  boardFerry(targetPortId) {
    if (this.state.ridingVehicleId || this.state.mode === 'interior' || this.state.mode === 'metro') {
      return { ok: false, error: 'Visit Cais do Sodre Ferry Terminal before boarding a ferry.' };
    }
    if (this.state.mode === 'ferry' && this.state.ferry.phase === 'sailing') {
      return { ok: false, error: 'Already sailing across the Tagus River.' };
    }

    const fromPortId = this.state.mode === 'ferry' ? this.state.ferry.portId : FERRY_TERMINAL.id;
    if (fromPortId === targetPortId) {
      return { ok: false, error: 'You are already at this ferry pier.' };
    }

    const isReturningToLisbon = targetPortId === FERRY_TERMINAL.id;
    const routeDef = isReturningToLisbon
      ? getFerryDestinationById(fromPortId) || FERRY_DESTINATIONS[0]
      : getFerryDestinationById(targetPortId);

    if (!routeDef) {
      return { ok: false, error: `Unknown Transtejo destination: ${targetPortId}` };
    }

    const fareEur = routeDef.fareEur;
    if (this.state.euros < fareEur) {
      this.state.statusMessage = `Need ${fareEur.toFixed(2)} EUR for the Transtejo ferry to ${isReturningToLisbon ? 'Cais do Sodre' : routeDef.shortName} (you have ${this.state.euros.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    this.state.euros = roundMoney(this.state.euros - fareEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + fareEur);
    this.state.stats.ferryRides += 1;
    this.state.energy = clamp(this.state.energy + 6, 0, 100);
    this.advanceMinutes(routeDef.travelMinutes);

    this.state.mode = 'ferry';
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.state.ferry = {
      portId: fromPortId,
      phase: 'sailing',
      phaseProgress: 0,
      fromPortId,
      toPortId: targetPortId,
      sailDuration: routeDef.sailDurationSec,
      waveOffset: this.state.ferry.waveOffset || 0
    };

    let newPhrase = false;
    let newMemory = false;
    if (!isReturningToLisbon) {
      if (!this.state.visitedFerryPorts.includes(routeDef.id)) {
        this.state.visitedFerryPorts.push(routeDef.id);
      }
      newPhrase = recordPhrase(this.state, routeDef.phrase, `Transtejo Ferry - ${routeDef.shortName}`);
      newMemory = unlockMemory(this.state, routeDef.memory);
    }

    const destLabel = isReturningToLisbon ? FERRY_TERMINAL.shortName : routeDef.name;
    const fromLabel =
      fromPortId === FERRY_TERMINAL.id
        ? FERRY_TERMINAL.shortName
        : (getFerryDestinationById(fromPortId)?.shortName || 'South Bank');

    this.state.statusMessage = `Sailing aboard Transtejo Catamaran from ${fromLabel} to ${destLabel} (-${fareEur.toFixed(2)} EUR, +6 Energy).`;
    recordLog(this.state, 'ferry', `Boarded Transtejo ferry from ${fromLabel} to ${destLabel} (-${fareEur.toFixed(2)} EUR).`);

    return {
      ok: true,
      fromPortId,
      toPortId: targetPortId,
      fareEur,
      newPhrase,
      newMemory,
      state: this.state
    };
  }

  exitFerryTerminal({ immediate = false } = {}) {
    if (this.state.mode !== 'ferry') {
      return { ok: false, error: 'You are not currently at a ferry terminal.' };
    }
    if (this.state.ferry.phase === 'sailing') {
      return { ok: false, error: 'Wait until the Transtejo ferry docks before stepping ashore.' };
    }
    if (!immediate && this.state.ferry.portId !== FERRY_TERMINAL.id) {
      const portName = getFerryDestinationById(this.state.ferry.portId)?.shortName || 'the South Bank';
      this.state.statusMessage = `You are across the Tagus in ${portName}. Board the return Transtejo ferry to sail back to Cais do Sodre!`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    this.state.mode = 'overworld';
    this.doorEntryCooldown = 0.55;
    this.state.ferry.phase = null;
    this.state.ferry.portId = null;
    this.state.ferry.phaseProgress = 0;
    this.state.player.x = FERRY_TERMINAL.spawnOutside.x;
    this.state.player.y = FERRY_TERMINAL.spawnOutside.y;
    this.state.player.overworldX = FERRY_TERMINAL.spawnOutside.x;
    this.state.player.overworldY = FERRY_TERMINAL.spawnOutside.y;
    this.state.player.facing = 'up';
    this.state.cameraYaw = -Math.PI * 0.5;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.updateNeighborhoodTracking();

    this.state.statusMessage = 'Stepped back onto the sunlit Tagus promenade outside Cais do Sodre Ferry Terminal.';
    return { ok: true, state: this.state };
  }

  interactWithSouthBankSpot(spotId) {
    if (this.state.mode !== 'ferry' || this.state.ferry.phase !== 'terminal') {
      return { ok: false, error: 'Cross the Tagus by ferry first to explore this south-bank town.' };
    }
    const dest = getFerryDestinationById(this.state.ferry.portId);
    const spot = dest?.townSpots?.find((s) => s.id === spotId);
    if (!dest || !spot) {
      return { ok: false, error: 'South-bank location not found.' };
    }
    if (spot.kind === 'landmark') {
      this.state.energy = clamp(this.state.energy + 25, 0, 100);
      this.state.stats.restsTaken += 1;
      this.advanceMinutes(15);
      this.state.statusMessage = `Rested at ${spot.name} in ${dest.shortName} (+25 Energy). ${spot.note}`;
      recordLog(this.state, 'rest', `Visited ${spot.name} across the Tagus in ${dest.shortName} (+25 Energy).`);
    } else {
      this.state.statusMessage = `${spot.host} at ${spot.name} (${dest.shortName}): "${spot.note}"`;
    }
    return { ok: true, dest, spot, state: this.state };
  }

  purchaseSouthBankItem(spotId, itemId) {
    if (this.state.mode !== 'ferry' || this.state.ferry.phase !== 'terminal') {
      return { ok: false, error: 'Visit the south-bank promenade before ordering or shopping.' };
    }
    const dest = getFerryDestinationById(this.state.ferry.portId);
    const spot = dest?.townSpots?.find((s) => s.id === spotId);
    const item = spot?.items?.find((i) => i.id === itemId);
    if (!dest || !spot || !item) {
      return { ok: false, error: 'Item not available at this south-bank location.' };
    }
    if (this.state.euros < item.costEur) {
      this.state.statusMessage = `Not enough EUR (${this.state.euros.toFixed(2)} EUR) for ${item.name} (${item.costEur.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    this.state.euros = roundMoney(this.state.euros - item.costEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + item.costEur);
    this.state.fullness = clamp(this.state.fullness + (item.fullnessDelta || 0), 0, 100);
    this.state.energy = clamp(this.state.energy + (item.energyDelta || 0), 0, 100);

    if (item.kind === 'food') {
      this.state.stats.mealsEaten += 1;
      if (!this.state.tastedFoods.some((f) => f.id === item.id)) {
        this.state.tastedFoods.push({
          id: item.id,
          name: item.name,
          venueName: `${spot.name} (${dest.shortName})`,
          day: this.state.day
        });
      }
      this.advanceMinutes(18);
      unlockMemory(this.state, MILESTONE_MEMORIES.taste);
      this.state.statusMessage = `Enjoyed ${item.name} at ${spot.name} in ${dest.shortName} (-${item.costEur.toFixed(2)} EUR, +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy).`;
      recordLog(this.state, 'dining', `Tasted ${item.name} at ${spot.name} in ${dest.shortName} (-${item.costEur.toFixed(2)} EUR).`);
    } else {
      this.state.stats.souvenirsBought += 1;
      this.state.satchel.push({
        id: item.id,
        name: item.name,
        venueName: spot.name,
        neighborhood: dest.name,
        costEur: item.costEur,
        day: this.state.day
      });
      this.advanceMinutes(10);
      unlockMemory(this.state, MILESTONE_MEMORIES.keepsake);
      this.state.statusMessage = `Added ${item.name} from ${spot.name} (${dest.shortName}) to your satchel (-${item.costEur.toFixed(2)} EUR).`;
      recordLog(this.state, 'shop', `Bought ${item.name} at ${spot.name} in ${dest.shortName} (-${item.costEur.toFixed(2)} EUR).`);
    }

    return { ok: true, dest, spot, item, state: this.state };
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
    this.state.cameraYaw = -Math.PI * 0.5;
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
    this.doorEntryCooldown = 0.55;
    if (venue) {
      this.state.player.x = venue.spawnOutside.x;
      this.state.player.y = venue.spawnOutside.y;
      this.state.player.facing = venue.doorSide === 'south' ? 'down' : 'up';
      this.state.cameraYaw = venue.doorSide === 'south' ? Math.PI * 0.5 : -Math.PI * 0.5;
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
    const cleanNextStop = String(vehicle.nextStopName || 'Next Stop').split(' (')[0];
    this.announcementSeq += 1;
    this.state.transitAnnouncement = {
      id: this.announcementSeq,
      stopName: cleanNextStop,
      text: `Proxima Paragem: ${cleanNextStop}`,
      vehicleMode: line.mode,
      ringBell: true,
      timer: 5.0
    };
    this.state.statusMessage = `Bell rung aboard ${line.name} - Proxima Paragem: ${cleanNextStop}.`;
    return {
      ok: true,
      alighted: false,
      queuedStop: vehicle.nextStopName,
      announcement: this.state.transitAnnouncement,
      state: this.state
    };
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
    if (this.state.mode === 'ferry') {
      this.state.ferry.phase = 'terminal';
      this.exitFerryTerminal({ immediate: true });
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
