import {
  NEIGHBORHOODS,
  ALL_LISBOA_NEIGHBORHOODS,
  getNeighborhoodAt,
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
  TRANSIT_LINES,
  LISBOA_WALKING_NETWORK,
  LISBOA_CITY_MAP_NODES,
  getLisboaZoneLabel,
  getLisboaZoneShortName,
  getWalkingAvenuesFrom,
  computeLisboaWalkingRoute,
  computeMetroNetworkRoute,
  getMetroLineById,
  getStationLineIds,
  getDirectStationsOnLine,
  VENUES,
  REST_SPOTS,
  RIVERSIDE_BENCHES,
  CASTANHA_VENDORS,
  CASTANHA_CONE_ITEM,
  FUNICULAR_LINES,
  PLAYER_OUTFITS,
  LISBOA_MONTHS,
  getMonthInfo,
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
  getItemServingType,
  isOverworldPositionValid,
  isPointInVehicleLane
} from './engine.js';
import { LisboaCanvasRenderer } from './renderer.js';
import { LanMultiplayerClient } from './multiplayer.js';
import { LisboaSoundEngine } from './audio.js';

const ALL_STOPS = getAllTransitStops();
const ALL_MEMORIES = getAllMemoryCatalog();

// Pedestrians route strictly along continuous Lisboa sidewalks across all 12 neighborhoods
// (from Belem to Parque das Nacoes, and from Tagus Waterfront to Campo Grande) and cross at zebra crosswalks.
const HORIZONTAL_SIDEWALKS = [-2494, -2356, -1814, -1676, -1134, -996, -454, -316, 220, 352, 546, 676, 878, 996];
const VERTICAL_SIDEWALKS = [-2280, -1400, -490, 0, 512, 892, 1014, 1680, 1800, 2202, 2856, 3290, 3960];

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
    (y >= -2512 && y <= -2476) ||
    (y >= -2374 && y <= -2338) ||
    (y >= -1832 && y <= -1796) ||
    (y >= -1694 && y <= -1658) ||
    (y >= -1152 && y <= -1116) ||
    (y >= -1014 && y <= -978) ||
    (y >= -472 && y <= -436) ||
    (y >= -334 && y <= -298) ||
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
let lastAnnouncementId = 0;
let lastFerryHornId = 0;
let lastMetroDoorChimeId = 0;
let lastMiradouroEncoreId = 0;
let lastSharedToastId = 0;
let lastCathedralChimeId = 0;
let lastSharedPostcardId = 0;
let lastTransitIntentId = 0;

const pressedKeys = new Set();
let activeTab = 'guide';
let lastUiSignature = '';
let lastContextSignature = '';
let lastLanSignature = '';
let lastStatusText = '';
let lastGameOverSignature = '';
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
  monthSelect: document.getElementById('hud-month-select'),
  weatherPill: document.getElementById('hud-weather-pill'),
  monthEvent: document.getElementById('hud-month-event'),
  memories: document.getElementById('hud-memories'),
  sceneTitle: document.getElementById('scene-title'),
  sceneSubtitle: document.getElementById('scene-subtitle'),
  liveSeasonStatus: document.getElementById('live-season-status'),
  liveAudioStatus: document.getElementById('live-audio-status'),
  liveLanStatus: document.getElementById('live-lan-status'),
  liveTramStatus: document.getElementById('live-tram-status'),
  liveBusStatus: document.getElementById('live-bus-status'),
  btnViewMode: document.getElementById('btn-view-mode'),
  btnSound: document.getElementById('btn-sound'),
  lanConnectionBadge: document.getElementById('lan-connection-badge'),
  lanJoinRow: document.getElementById('lan-join-row'),
  lanJoinUrl: document.getElementById('lan-join-url'),
  lanSoloHint: document.getElementById('lan-solo-hint'),
  btnCopyLan: document.getElementById('btn-copy-lan'),
  mpNameInput: document.getElementById('mp-name-input'),
  mpOutfitSelect: document.getElementById('mp-outfit-select'),
  btnWave: document.getElementById('btn-wave'),
  btnPostcard: document.getElementById('btn-postcard'),
  lanPlayersList: document.getElementById('lan-players-list'),
  btnContextAction: document.getElementById('btn-context-action'),
  btnSecondaryAction: document.getElementById('btn-secondary-action'),
  btnEvening: document.getElementById('btn-evening'),
  btnOvernight: document.getElementById('btn-overnight'),
  btnReset: document.getElementById('btn-reset'),
  statusBanner: document.getElementById('status-banner'),
  activeContextPanel: document.getElementById('active-context-panel'),
  visitedVenuesBadge: document.getElementById('visited-venues-badge'),
  guideList: document.getElementById('guide-list'),
  albumCountBadge: document.getElementById('album-count-badge'),
  btnAlbumCopyCard: document.getElementById('btn-album-copy-card'),
  btnAlbumDownloadCard: document.getElementById('btn-album-download-card'),
  albumCompleteBanner: document.getElementById('album-complete-banner'),
  memoriesList: document.getElementById('memories-list'),
  phraseCountBadge: document.getElementById('phrase-count-badge'),
  phrasebookList: document.getElementById('phrasebook-list'),
  satchelCountBadge: document.getElementById('satchel-count-badge'),
  postcardsList: document.getElementById('postcards-list'),
  satchelList: document.getElementById('satchel-list'),
  tastedList: document.getElementById('tasted-list'),
  journalList: document.getElementById('journal-list'),
  gameOverModal: document.getElementById('game-over-modal'),
  gameOverTitle: document.getElementById('game-over-title'),
  gameOverSubtitle: document.getElementById('game-over-subtitle'),
  gameOverScore: document.getElementById('game-over-score'),
  gameOverRank: document.getElementById('game-over-rank'),
  gameOverTallyGrid: document.getElementById('game-over-tally-grid'),
  gameOverMultiplayerBadge: document.getElementById('game-over-multiplayer-badge'),
  gameOverMultiplayerList: document.getElementById('game-over-multiplayer-list'),
  gameOverMemoriesBadge: document.getElementById('game-over-memories-badge'),
  gameOverMemoriesList: document.getElementById('game-over-memories-list'),
  gameOverCardPreview: document.getElementById('game-over-card-preview'),
  btnGameOverCopyCard: document.getElementById('btn-gameover-copy-card'),
  btnGameOverDownloadCard: document.getElementById('btn-gameover-download-card'),
  btnGameOverRestart: document.getElementById('btn-gameover-restart')
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

const dragLook = {
  active: false,
  moved: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0
};

function isFirstPerson3DActive(state) {
  if (!state || state.viewMode !== 'street3d' || state.ridingVehicleId || state.cityWalk?.active) return false;
  if (state.mode === 'overworld' || state.mode === 'interior' || state.mode === 'city-district') return true;
  if (state.mode === 'metro' && state.metro.phase === 'platform') return true;
  if (state.mode === 'ferry' && state.ferry.phase === 'terminal') return true;
  if (state.mode === 'santa-justa' && (state.santaJusta?.phase === 'miradouro' || state.santaJusta?.phase === 'lobby')) return true;
  return false;
}

function getKeyboardVector(dt = 0.016) {
  const state = engine.getState();
  const isStreet3D = isFirstPerson3DActive(state);

  if (isStreet3D) {
    const forward = (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW') ? 1 : 0) -
      (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS') ? 1 : 0);
    const turnInput = (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD') ? 1 : 0) -
      (pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA') ? 1 : 0);
    const strafeMode = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight');

    if (state.mode === 'santa-justa' && state.santaJusta?.phase === 'miradouro') {
      if (turnInput !== 0 || forward !== 0) {
        engine.rotateCamera(turnInput * 1.55 * dt, forward * 0.65 * dt);
      }
      return { x: 0, y: 0 };
    }

    if (turnInput !== 0 && !strafeMode) {
      engine.rotateCamera(turnInput * 1.95 * dt, 0);
    }

    const yaw = state.cameraYaw || 0;
    const fx = Math.cos(yaw);
    const fy = Math.sin(yaw);
    const rx = -fy;
    const ry = fx;
    const strafe = strafeMode ? turnInput : 0;

    return {
      x: fx * forward + rx * strafe,
      y: fy * forward + ry * strafe
    };
  }

  let x = 0;
  let y = 0;
  if (pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA')) x -= 1;
  if (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) x += 1;
  if (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW')) y -= 1;
  if (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS')) y += 1;
  return { x, y };
}

function handleCanvasClick(event) {
  if (dragLook.moved) {
    dragLook.moved = false;
    return;
  }
  const state = engine.getState();
  if (state.cityWalk?.active) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;

  if (isFirstPerson3DActive(state)) {
    const hit3d = renderer.pickStreet3DTarget(canvasX, canvasY, state);
    if (hit3d) {
      if (hit3d.kind === 'counter') {
        engine.setWalkTarget(INTERIOR_STATIONS.counter.x, INTERIOR_STATIONS.counter.y, { type: 'talkProprietor' });
        return;
      }
      if (hit3d.kind === 'display') {
        engine.setWalkTarget(INTERIOR_STATIONS.display.x, INTERIOR_STATIONS.display.y, { type: 'inspectDisplay' });
        return;
      }
      if (hit3d.kind === 'exit-venue') {
        engine.setWalkTarget(INTERIOR_STATIONS.exitMat.x, INTERIOR_STATIONS.exitMat.triggerY, { type: 'exitVenue' });
        return;
      }
      if (hit3d.kind === 'metro-exit') {
        engine.setWalkTarget(380, METRO_PLATFORM_ZONES.escalatorExitTriggerY, { type: 'exitMetro' });
        return;
      }
      if (hit3d.kind === 'metro-board') {
        engine.setWalkTarget(380, 260, { type: 'boardNextMetro' });
        return;
      }
      if (hit3d.kind === 'metro-transfer' && hit3d.lineId) {
        engine.setWalkTarget(METRO_PLATFORM_ZONES.transferX, METRO_PLATFORM_ZONES.transferY, {
          type: 'transferMetroLine',
          lineId: hit3d.lineId
        });
        return;
      }
      if (hit3d.kind === 'ferry-exit') {
        engine.setWalkTarget(380, FERRY_PIER_ZONES.exitY, { type: 'exitFerry' });
        return;
      }
      if (hit3d.kind === 'ferry-board') {
        engine.setWalkTarget(380, 256, { type: 'boardDefaultFerry' });
        return;
      }
      if (hit3d.kind === 'south-bank-spot' && hit3d.spotId) {
        const dest = FERRY_DESTINATIONS.find((d) => d.id === state.ferry.portId);
        const spot = dest?.townSpots?.find((s) => s.id === hit3d.spotId);
        if (spot) {
          engine.setWalkTarget(spot.x, spot.y, { type: 'southBankSpot', spotId: spot.id });
          return;
        }
      }
      if (hit3d.kind === 'city-district-spot' && (hit3d.spot || hit3d.spotId)) {
        const spot = hit3d.spot || CITY_DISTRICT_SPOTS.find((s) => s.id === hit3d.spotId);
        if (spot && spot.spawnOutside) {
          const path = buildOverworldPath(
            state.player.x,
            state.player.y,
            spot.spawnOutside.x,
            spot.spawnOutside.y,
            { type: 'cityDistrictSpot', spotId: spot.id }
          );
          engine.setWalkPath(path);
          setStatusBanner(`Walking along the sidewalk toward ${spot.name} (${spot.districtName})...`);
          return;
        }
      }
      if (hit3d.kind === 'santa-justa-ascend') {
        const res = engine.ascendSantaJusta();
        if (res.ok) soundEngine.playEffect('metro-chime');
        else if (res.error) setStatusBanner(res.error, true);
        refreshUi(true);
        return;
      }
      if (hit3d.kind === 'santa-justa-descend') {
        const res = engine.descendSantaJusta();
        if (!res.ok && res.error) setStatusBanner(res.error, true);
        refreshUi(true);
        return;
      }
      if (hit3d.kind === 'santa-justa-landmark' && hit3d.landmarkId) {
        engine.lookAtSantaJustaLandmark(hit3d.landmarkId);
        refreshUi(true);
        return;
      }
      if (hit3d.kind === 'santa-justa') {
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          SANTA_JUSTA_LIFT.spawnOutside.x,
          SANTA_JUSTA_LIFT.spawnOutside.y,
          { type: 'openSantaJusta' }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking along Rua do Carmo to ${SANTA_JUSTA_LIFT.name}...`);
        return;
      }
      if (hit3d.kind === 'ferry') {
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
      if (hit3d.kind === 'metro' && hit3d.station) {
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          hit3d.station.spawnOutside.x,
          hit3d.station.spawnOutside.y,
          { type: 'openMetro', id: hit3d.station.id }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking along the sidewalk to ${hit3d.station.name}...`);
        return;
      }
      if (hit3d.kind === 'venue' && hit3d.venue) {
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          hit3d.venue.spawnOutside.x,
          hit3d.venue.spawnOutside.y,
          { type: 'enterVenue', id: hit3d.venue.id }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking along the sidewalk toward ${hit3d.venue.name}...`);
        return;
      }
      if (hit3d.kind === 'castanha-cart') {
        const cv = CASTANHA_VENDORS.find((v) => v.id === hit3d.id);
        if (cv) {
          const walkY = cv.y >= 970 ? 996 : cv.y + 10;
          const path = buildOverworldPath(
            state.player.x,
            state.player.y,
            cv.x,
            walkY,
            { type: 'buyCastanha', id: cv.id }
          );
          engine.setWalkPath(path);
          setStatusBanner(`Walking to ${cv.vendorName}'s Castanhas Assadas cart (${CASTANHA_CONE_ITEM.costEur.toFixed(2)} EUR)...`);
          return;
        }
      }
      if (hit3d.kind === 'riverside-bench' && hit3d.bench) {
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          hit3d.bench.x,
          998,
          { type: 'sitRiversideBench', id: hit3d.bench.id }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking along the Tagus promenade to sit on ${hit3d.bench.name}...`);
        return;
      }
      if (hit3d.kind === 'funicular-station' && hit3d.funicular && hit3d.station) {
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          hit3d.station.platformX,
          hit3d.station.platformY,
          { type: 'boardFunicular', id: hit3d.funicular.id, fromEnd: hit3d.fromEnd || 'lower' }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking to ${hit3d.station.name} to board ${hit3d.funicular.shortName}...`);
        return;
      }
      if (hit3d.kind === 'funicular' && hit3d.funicular) {
        const f = hit3d.funicular;
        const dLower = Math.hypot(state.player.x - f.lowerStation.platformX, state.player.y - f.lowerStation.platformY);
        const dUpper = Math.hypot(state.player.x - f.upperStation.platformX, state.player.y - f.upperStation.platformY);
        const fromEnd = dLower <= dUpper ? 'lower' : 'upper';
        const st = fromEnd === 'lower' ? f.lowerStation : f.upperStation;
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          st.platformX,
          st.platformY,
          { type: 'boardFunicular', id: f.id, fromEnd }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking to ${st.name} to ride ${f.shortName}...`);
        return;
      }
    }
  }

  if (state.ridingFunicularId) {
    return;
  }

  const worldPt = renderer.screenToWorld(canvasX, canvasY, state);
  if (!worldPt) return;

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
    const curStation = engine.getActiveMetroStation();
    const curLineIds = curStation ? getStationLineIds(curStation) : [];
    const curActiveLine =
      state.metro.activeLineId && curLineIds.includes(state.metro.activeLineId)
        ? state.metro.activeLineId
        : curLineIds[0];
    const otherLineId = curLineIds.find((id) => id !== curActiveLine) || null;
    if (
      otherLineId &&
      worldPt.x >= 596 &&
      Math.abs(worldPt.y - METRO_PLATFORM_ZONES.transferY) <= 56
    ) {
      engine.setWalkTarget(METRO_PLATFORM_ZONES.transferX, METRO_PLATFORM_ZONES.transferY, {
        type: 'transferMetroLine',
        lineId: otherLineId
      });
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

  if (state.mode === 'santa-justa') {
    if (state.santaJusta?.phase === 'lobby') {
      const res = engine.ascendSantaJusta();
      if (res.ok) soundEngine.playEffect('metro-chime');
      else if (res.error) setStatusBanner(res.error, true);
      refreshUi(true);
    }
    return;
  }

  if (state.mode === 'city-district') {
    const dist = LISBOA_CITY_DISTRICTS.find((d) => d.id === state.cityDistrictId);
    for (const av of getWalkingAvenuesFrom(state.cityDistrictId)) {
      if (Math.hypot(worldPt.x - av.x, worldPt.y - av.y) <= 58) {
        engine.setWalkTarget(av.x, av.y, { type: 'walkCityAvenue', targetZoneId: av.toZoneId });
        setStatusBanner(`Walking toward ${av.avenueName} -> ${getLisboaZoneShortName(av.toZoneId)}...`);
        return;
      }
    }
    for (const spot of dist?.townSpots || []) {
      if (Math.hypot(worldPt.x - spot.x, worldPt.y - spot.y) <= 68 || (worldPt.y <= 165 && Math.abs(worldPt.x - spot.x) <= 95)) {
        engine.setWalkTarget(spot.x, spot.y, { type: 'cityDistrictSpot', spotId: spot.id });
        return;
      }
    }
    if (worldPt.y >= 242 && Math.abs(worldPt.x - 380) <= FERRY_PIER_ZONES.gangwayHalfWidth) {
      engine.setWalkTarget(380, 256, { type: 'enterCityDistrictMetro' });
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

  // Overworld clicks: check Elevador de Santa Justa (1902) on Rua do Carmo
  const hitSantaJusta =
    worldPt.x >= SANTA_JUSTA_LIFT.x - 14 &&
    worldPt.x <= SANTA_JUSTA_LIFT.x + SANTA_JUSTA_LIFT.w + 14 &&
    worldPt.y >= SANTA_JUSTA_LIFT.y - 14 &&
    worldPt.y <= SANTA_JUSTA_LIFT.y + SANTA_JUSTA_LIFT.h + 18;
  if (hitSantaJusta) {
    const path = buildOverworldPath(
      state.player.x,
      state.player.y,
      SANTA_JUSTA_LIFT.spawnOutside.x,
      SANTA_JUSTA_LIFT.spawnOutside.y,
      { type: 'openSantaJusta' }
    );
    engine.setWalkPath(path);
    setStatusBanner(`Walking along Rua do Carmo toward ${SANTA_JUSTA_LIFT.name}...`);
    return;
  }

  // Overworld clicks: check all 12 Metropolitano de Lisboa street entrances across the unified city
  for (const station of ALL_METRO_STATIONS) {
    if (!Number.isFinite(station.x)) continue;
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

  // Overworld clicks: check all 27 Greater Lisboa landmarks, eateries, and cultural shops
  for (const spot of CITY_DISTRICT_SPOTS) {
    if (!Number.isFinite(spot.worldX)) continue;
    const hitSpot =
      worldPt.x >= spot.worldX - 10 &&
      worldPt.x <= spot.worldX + spot.w + 10 &&
      worldPt.y >= spot.worldY - 10 &&
      worldPt.y <= spot.worldY + spot.h + 10;
    if (hitSpot) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        spot.spawnOutside.x,
        spot.spawnOutside.y,
        { type: 'cityDistrictSpot', spotId: spot.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking along the sidewalk toward ${spot.name} (${spot.districtName})...`);
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

  // Check seasonal Castanha roasted chestnut street carts (Oct - Feb)
  if (getMonthInfo(state.month).hasCastanhaVendors) {
    for (const cv of CASTANHA_VENDORS) {
      if (Math.hypot(worldPt.x - cv.x, worldPt.y - cv.y) <= 36) {
        const walkY = cv.y >= 970 ? 996 : cv.y + 10;
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          cv.x,
          walkY,
          { type: 'buyCastanha', id: cv.id }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking to ${cv.vendorName}'s Castanhas Assadas cart (${CASTANHA_CONE_ITEM.costEur.toFixed(2)} EUR)...`);
        return;
      }
    }
  }

  // Check interactive Tagus riverside benches
  for (const rb of RIVERSIDE_BENCHES) {
    if (Math.hypot(worldPt.x - rb.x, worldPt.y - rb.y) <= 34) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        rb.x,
        998,
        { type: 'sitRiversideBench', id: rb.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking along the Tagus promenade to sit on ${rb.name}...`);
      return;
    }
  }

  // Check historic Lisbon Cable Funicular stations (Elevador da Bica & Elevador da Gloria)
  for (const fun of FUNICULAR_LINES) {
    for (const [endKey, st] of [['lower', fun.lowerStation], ['upper', fun.upperStation]]) {
      const d = Math.min(
        Math.hypot(worldPt.x - st.platformX, worldPt.y - st.platformY),
        Math.hypot(worldPt.x - st.x, worldPt.y - st.y)
      );
      if (d <= 40) {
        const path = buildOverworldPath(
          state.player.x,
          state.player.y,
          st.platformX,
          st.platformY,
          { type: 'boardFunicular', id: fun.id, fromEnd: endKey }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking to ${st.name} to ride ${fun.shortName}...`);
        return;
      }
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
  const nearby = state.mode === 'overworld' && !riding ? engine.getNearbyInteraction() : null;

  const sig = JSON.stringify({
    mode: state.mode,
    venueId: venue?.id || null,
    metroId: metroStation?.id || null,
    metroPhase: state.metro?.phase || null,
    metroActiveLine: state.metro?.activeLineId || null,
    metroTransferTo: state.metro?.transferToLineId || null,
    metroTicketPaid: Boolean(state.metro?.ticketPaid),
    metroTo: state.metro?.toStationId || null,
    ferryPort: state.ferry?.portId || null,
    ferryPhase: state.ferry?.phase || null,
    ferryTo: state.ferry?.toPortId || null,
    santaJustaPhase: state.santaJusta?.phase || null,
    santaJustaAlt: Math.round(state.santaJusta?.altitudeMeters || 0),
    santaJustaLandmark: state.santaJusta?.focusedLandmarkId || null,
    activeSouthBankSpotId: state.activeSouthBankSpotId || null,
    cityDistrictId: state.cityDistrictId || null,
    activeCityDistrictSpotId: state.activeCityDistrictSpotId || null,
    cityWalkActive: Boolean(state.cityWalk?.active),
    cityWalkTo: state.cityWalk?.toZoneId || null,
    visitedCityDistricts: (state.visitedCityDistricts || []).length,
    visitedMetroStations: (state.visitedMetroStations || []).length,
    fadoTrackId: soundEngine.getCurrentFadoTrack()?.id || null,
    ridingId: riding?.id || null,
    ridingFunicularId: state.ridingFunicularId || null,
    ridingFunicularEnd: state.ridingFunicularTargetEnd || null,
    elevM: state.ridingFunicularId ? state.elevationMeters : null,
    stopId: riding?.currentStopId || null,
    nextStop: riding?.nextStopName || null,
    alight: state.alightAtNextStop,
    seatedBenchId: state.seatedBenchId || null,
    nearbyCastanhaId: nearby?.type === 'castanha-cart' ? nearby.id : null,
    nearbyFunicularKey: nearby?.type === 'funicular-station' ? `${nearby.id}:${nearby.fromEnd}` : null,
    nearbyDistrictSpotId: nearby?.type === 'city-district-spot' ? nearby.spotId : null,
    seatedDiningId: state.seatedDining?.itemId || null,
    euros: state.euros
  });

  if (sig === lastContextSignature) return;
  lastContextSignature = sig;

  if (state.cityWalk?.active) {
    const cw = state.cityWalk;
    const distLabel = cw.distanceMeters >= 1000 ? `${(cw.distanceMeters / 1000).toFixed(1)} km` : `${cw.distanceMeters} m`;
    dom.activeContextPanel.classList.remove('hidden');
    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>Walking Along ${escapeHtml(cw.avenueName)}</h3>
          <div class="item-meta">${escapeHtml(getLisboaZoneShortName(cw.fromZoneId))} -> ${escapeHtml(getLisboaZoneShortName(cw.toZoneId))}</div>
        </div>
        <span class="badge badge-bus">ON FOOT</span>
      </div>
      <p class="helper-text">Strolling continuously across Lisboa on foot (${escapeHtml(distLabel)}, ~${cw.walkMinutes} min) into ${escapeHtml(getLisboaZoneLabel(cw.toZoneId))}...</p>
    `;
    return;
  }

  if (state.ridingFunicularId) {
    const fun = (state.funiculars || []).find((f) => f.id === state.ridingFunicularId);
    if (fun) {
      const goingUp = state.ridingFunicularTargetEnd === 'upper';
      const destSt = goingUp ? fun.upperStation : fun.lowerStation;
      dom.activeContextPanel.classList.remove('hidden');
      dom.activeContextPanel.innerHTML = `
        <div class="context-header">
          <div>
            <h3>Aboard ${escapeHtml(fun.name)}</h3>
            <div class="item-meta">${goingUp ? 'Climbing steeply to' : 'Descending toward'} <strong>${escapeHtml(destSt.name)}</strong> | Elev ${state.elevationMeters}m</div>
          </div>
          <span class="badge badge-tram">FUNICULAR</span>
        </div>
        <p class="helper-text">
          ${escapeHtml(fun.description)} Drag the 3D Street View to look downhill toward the Tagus River as the counterbalancing cable car glides past the mid-hill loop!
        </p>
        <div class="phrase-callout">
          <span class="pt">${escapeHtml(fun.phrase.pt)}</span>
          <span class="pron">${escapeHtml(fun.phrase.pronunciation)}</span>
          <span>${escapeHtml(fun.phrase.en)}</span>
        </div>
        <div class="action-strip">
          <button type="button" class="btn btn-primary btn-sm" data-disembark-funicular="true">
            Step Out at ${escapeHtml(destSt.name)} [E]
          </button>
        </div>
      `;
      return;
    }
  }

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
    const stationLineIds = getStationLineIds(metroStation);
    const activeLineId =
      state.metro?.activeLineId && stationLineIds.includes(state.metro.activeLineId)
        ? state.metro.activeLineId
        : stationLineIds[0];
    const activeLine = getMetroLineById(activeLineId);
    const otherLineIds = stationLineIds.filter((id) => id !== activeLineId);
    const transferTargetLine = getMetroLineById(state.metro?.transferToLineId);
    const destStationObj = ALL_METRO_STATIONS.find((s) => s.id === state.metro.toStationId);
    const activeRouteSummary = state.metro?.route?.summary || (activeLine ? activeLine.name : metroStation.lines.join(' & '));

    const phaseNote =
      state.metro.phase === 'descending'
        ? `Riding escalators down to the ${escapeHtml(activeLine?.name || 'underground')} platform...`
        : state.metro.phase === 'ascending'
          ? 'Riding escalators up to the Lisboa street exit...'
          : state.metro.phase === 'transferring'
            ? `Walking through the Correspondencia underground passage to the ${escapeHtml(transferTargetLine?.name || 'connecting')} platform (Free transfer)...`
            : state.metro.phase === 'riding'
              ? `Traveling underground (${escapeHtml(activeRouteSummary)}) toward ${escapeHtml(destStationObj?.name || 'destination')}...`
              : metroStation.note;

    const ticketPaid = Boolean(state.metro?.ticketPaid);
    const nextRideFare = ticketPaid ? 0 : METRO_LINE.fareEur;
    const affordable = (nextRideFare === 0 || state.euros >= nextRideFare) && !isBusy;

    const lineChip = (ln, highlight = false) =>
      `<span style="display:inline-block;padding:2px 6px;margin:2px 4px 2px 0;border-radius:4px;font-size:10px;font-weight:700;background:${ln.color};color:${ln.id === 'linha-amarela' ? '#1e293b' : '#ffffff'};${highlight ? 'outline:2px solid #0f172a;' : 'opacity:0.78;'}">${escapeHtml(ln.name)} (${ln.stations.length})</span>`;

    const lineChipsHtml = METRO_NETWORK_LINES.map((ln) => lineChip(ln, ln.id === activeLineId)).join('');

    const activeBannerBg = activeLine?.color || '#2563eb';
    const activeBannerFg = activeLineId === 'linha-amarela' ? '#0f172a' : '#ffffff';
    const activePlatformBannerHtml = `
      <div style="padding:7px 10px;margin:6px 0 8px 0;border-radius:6px;background:${activeBannerBg};color:${activeBannerFg};font-size:11.5px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <span>Platform: ${escapeHtml(activeLine?.name || metroStation.lines[0])} (${escapeHtml((activeLine?.termini || []).join(' <-> '))})</span>
        <span style="font-size:10px;opacity:0.92;">${ticketPaid ? 'Ticket Validated (Free Transfers)' : `${METRO_LINE.fareEur.toFixed(2)} EUR Single Ticket`}</span>
      </div>
    `;

    // Free in-station Correspondencia transfer card ONLY at the 6 official 2-line transfer hubs!
    const transferCardsHtml = otherLineIds
      .map((otherId) => {
        const otherLn = getMetroLineById(otherId);
        if (!otherLn) return '';
        const badgeFg = otherLn.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
        return `
          <div class="item-card" style="border-color:${otherLn.color};background:#f8fafc;">
            <div>
              <h4>
                Correspondencia: Change to
                <span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${otherLn.color};color:${badgeFg};font-size:10.5px;">${escapeHtml(otherLn.name)}</span>
              </h4>
              <div class="item-meta">Walk through the underground transfer passage at ${escapeHtml(metroStation.name)} (${escapeHtml(otherLn.termini.join(' <-> '))}).</div>
              <div class="item-meta"><strong>0.00 EUR (Free In-Station Transfer)</strong> | 2 min walk</div>
            </div>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              data-transfer-metro-line="${escapeHtml(otherLn.id)}"
              ${isBusy ? 'disabled' : ''}
            >
              Switch Line [E]
            </button>
          </div>
        `;
      })
      .join('');

    // SECTION 1: Direct Trains From This Platform (every official station on activeLineId, in exact track order!)
    const directEntries = getDirectStationsOnLine(metroStation.id, activeLineId).sort(
      (a, b) => a.destIdx - b.destIdx
    );
    const directIds = new Set(directEntries.map((d) => d.station.id));
    const directHtml = directEntries
      .map(({ station: dest, hopCount }) => {
        const route = computeMetroNetworkRoute(metroStation.id, dest.id, activeLineId);
        const visited = (state.visitedMetroStations || []).includes(dest.id);
        const destLinesHtml = getStationLineIds(dest)
          .map((lid) => {
            const ln = getMetroLineById(lid);
            if (!ln) return '';
            return `<span style="display:inline-block;padding:1px 5px;margin-right:4px;border-radius:3px;font-size:9.5px;font-weight:700;background:${ln.color};color:${ln.id === 'linha-amarela' ? '#1e293b' : '#ffffff'};">${escapeHtml(ln.name)}</span>`;
          })
          .join('');
        const isTransferHub = getStationLineIds(dest).length > 1;
        const fareLabel = ticketPaid ? '0.00 EUR (Transfer Included)' : `${METRO_LINE.fareEur.toFixed(2)} EUR`;
        return `
          <div class="item-card">
            <div>
              <h4>${escapeHtml(dest.name)}${visited ? ' (Visited)' : ''}${isTransferHub ? ' <span class="badge-muted">TRANSFER HUB</span>' : ''}</h4>
              <div style="margin:3px 0;">${destLinesHtml}<span class="badge-muted">${escapeHtml(dest.zoneLabel || 'Lisboa')}</span></div>
              <div class="item-meta">Direct on <strong>${escapeHtml(activeLine?.name || 'Line')}</strong> (${hopCount} ${hopCount === 1 ? 'stop' : 'stops'}, ~${route.travelMinutes} min) | <strong>${fareLabel}</strong></div>
            </div>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              data-ride-metro="${escapeHtml(dest.id)}"
              ${affordable ? '' : 'disabled'}
            >
              Board Direct
            </button>
          </div>
        `;
      })
      .join('');

    // SECTION 2: Other 3 Metro Lines (Transfer Required - grouped cleanly by line so all 50 stations stay scannable!)
    const otherLinesHtml = METRO_NETWORK_LINES.filter((ln) => ln.id !== activeLineId)
      .map((otherLn) => {
        const lineDests = otherLn.stations
          .map((stopName) => ALL_METRO_STATIONS.find((s) => s.canonicalStopName === stopName))
          .filter((s) => s && s.id !== metroStation.id && !directIds.has(s.id));
        if (lineDests.length === 0) return '';
        const rowsHtml = lineDests
          .map((dest) => {
            const destLineIds = getStationLineIds(dest);
            const route = computeMetroNetworkRoute(metroStation.id, dest.id, activeLineId);
            const visited = (state.visitedMetroStations || []).includes(dest.id);
            const sharedOtherLineId = otherLineIds.find((lid) => destLineIds.includes(lid)) || null;
            const firstLeg = route.legs && route.legs[0] ? route.legs[0] : null;
            let stepHint = '';
            let actionBtnHtml = '';

            if (sharedOtherLineId) {
              const targetLn = getMetroLineById(sharedOtherLineId);
              stepHint = `Walk through Correspondencia to ${targetLn?.name || 'connecting line'} here (Free)`;
              actionBtnHtml = `
                <button type="button" class="btn btn-secondary btn-sm" data-transfer-metro-line="${escapeHtml(sharedOtherLineId)}" ${isBusy ? 'disabled' : ''}>
                  Switch to ${escapeHtml((targetLn?.name || 'Line').replace('Linha ', ''))}
                </button>
              `;
            } else if (firstLeg && firstLeg.lineId !== activeLineId && otherLineIds.includes(firstLeg.lineId)) {
              const firstLn = getMetroLineById(firstLeg.lineId);
              stepHint = `${route.summary} (~${route.travelMinutes} min)`;
              actionBtnHtml = `
                <button type="button" class="btn btn-secondary btn-sm" data-transfer-metro-line="${escapeHtml(firstLeg.lineId)}" ${isBusy ? 'disabled' : ''}>
                  Step 1: ${escapeHtml((firstLn?.name || 'Line').replace('Linha ', ''))}
                </button>
              `;
            } else if (firstLeg && firstLeg.toStationId && directIds.has(firstLeg.toStationId)) {
              const hubShort = (firstLeg.toStop || route.transferStation || 'Hub').replace('Metro ', '');
              stepHint = `${route.summary} (~${route.travelMinutes} min)`;
              actionBtnHtml = `
                <button type="button" class="btn btn-secondary btn-sm" data-ride-metro="${escapeHtml(firstLeg.toStationId)}" ${affordable ? '' : 'disabled'}>
                  Leg 1 -> ${escapeHtml(hubShort)}
                </button>
              `;
            } else {
              stepHint = `Transfer required: ${route.summary} (~${route.travelMinutes} min).`;
              actionBtnHtml = `<button type="button" class="btn btn-secondary btn-sm" disabled>Transfer Req.</button>`;
            }

            return `
              <div class="item-card" style="opacity:0.95;margin-top:5px;">
                <div>
                  <h4>${escapeHtml(dest.name)}${visited ? ' (Visited)' : ''}</h4>
                  <div class="item-meta">${escapeHtml(stepHint)}</div>
                </div>
                ${actionBtnHtml}
              </div>
            `;
          })
          .join('');
        const fg = otherLn.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
        return `
          <details style="margin:6px 0;border:1px solid ${otherLn.color};border-radius:8px;padding:6px 8px;background:#f8fafc;">
            <summary style="cursor:pointer;font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${otherLn.color};color:${fg};font-size:10px;">${escapeHtml(otherLn.name)}</span>
              <span>${escapeHtml(otherLn.termini[0])} <-> ${escapeHtml(otherLn.termini[1])} (${lineDests.length} stations)</span>
            </summary>
            ${rowsHtml}
          </details>
        `;
      })
      .join('');

    const exitBtnLabel = 'Take Escalator Out';
    const transitLinks = Array.isArray(metroStation.transitConnections) && metroStation.transitConnections.length > 0
      ? `<div class="item-meta" style="margin-bottom:6px;"><strong>Public Transit Connections:</strong> ${escapeHtml(metroStation.transitConnections.join(' | '))}</div>`
      : '';

    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(metroStation.name)}</h3>
          <div class="item-meta">${escapeHtml(metroStation.lines.join(' & '))} | ${escapeHtml(metroStation.undergroundTheme?.architect || 'Metropolitano de Lisboa')}</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-metro-close="true" ${isBusy ? 'disabled' : ''}>${exitBtnLabel}</button>
      </div>
      <div style="margin-bottom:4px;">${lineChipsHtml}</div>
      ${activePlatformBannerHtml}
      <p class="helper-text">${phaseNote}</p>
      ${transitLinks}
      <div class="phrase-callout">
        <span class="pt">${escapeHtml(METRO_LINE.phrase.pt)}</span>
        <span class="pron">${escapeHtml(METRO_LINE.phrase.pronunciation)}</span>
        <span>${escapeHtml(METRO_LINE.phrase.en)}</span>
      </div>
      ${transferCardsHtml}
      <div class="hood-group-title" style="margin-top:8px;">Direct Trains From This Platform (${escapeHtml(activeLine?.name || 'Active Line')})</div>
      ${directHtml}
      ${otherLinesHtml ? `<div class="hood-group-title" style="margin-top:10px;">Other Metro Lines (Transfer Required)</div>${otherLinesHtml}` : ''}
      <div class="action-strip">
        <button type="button" class="btn btn-sm" data-metro-chime="true">Door-Closing Chime [E]</button>
      </div>
    `;
    return;
  }

  if (state.mode === 'santa-justa') {
    const sj = state.santaJusta || { phase: 'lobby', altitudeMeters: 0 };
    const isMoving = sj.phase === 'ascending' || sj.phase === 'descending';
    const isTop = sj.phase === 'miradouro';
    const affordable = sj.ticketPaid || state.euros >= SANTA_JUSTA_LIFT.fareEur;
    dom.activeContextPanel.classList.remove('hidden');

    if (!isTop) {
      dom.activeContextPanel.innerHTML = `
        <div class="context-header">
          <div>
            <h3>${escapeHtml(SANTA_JUSTA_LIFT.name)}</h3>
            <div class="item-meta">${escapeHtml(SANTA_JUSTA_LIFT.architect)} | Altitude ${Math.round(sj.altitudeMeters || 0)}m / 45m</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-sj-exit="true" ${isMoving ? 'disabled' : ''}>Exit to Street</button>
        </div>
        <p class="helper-text">${
          sj.phase === 'ascending'
            ? 'Riding the 1902 mahogany-and-brass cabin vertically through the Neo-Gothic iron shaft toward the 45-meter open-air miradouro...'
            : sj.phase === 'descending'
              ? 'Descending smoothly back down to street level inside Elevador de Santa Justa...'
              : escapeHtml(SANTA_JUSTA_LIFT.note)
        }</p>
        <div class="phrase-callout">
          <span class="pt">${escapeHtml(SANTA_JUSTA_LIFT.phrase.pt)}</span>
          <span class="pron">${escapeHtml(SANTA_JUSTA_LIFT.phrase.pronunciation)}</span>
          <span>${escapeHtml(SANTA_JUSTA_LIFT.phrase.en)}</span>
        </div>
        <div class="item-card">
          <div>
            <h4>Ascend 45m to Open-Air Lisbon Miradouro</h4>
            <div class="item-meta"><strong>${sj.ticketPaid ? '0.00 EUR (Ticket Paid)' : `${SANTA_JUSTA_LIFT.fareEur.toFixed(2)} EUR`}</strong> | Free return descent | +25 Energy & 360-degree Lisbon view</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-sj-ascend="true" ${!isMoving && affordable ? '' : 'disabled'}>
            ${isMoving ? 'Riding...' : 'Go Up [E]'}
          </button>
        </div>
      `;
      return;
    }

    const landmarkCards = SANTA_JUSTA_PANORAMA_LANDMARKS.map((lm) => {
      const active = sj.focusedLandmarkId === lm.id;
      const hiStyle = active ? ` style="border-color:${lm.accentColor};background:#fffbeb;"` : '';
      return `
        <div class="item-card"${hiStyle}>
          <div>
            <h4>${escapeHtml(lm.name)} <span class="badge-muted">${escapeHtml(lm.compassLabel)} - ${lm.distanceMeters}m</span></h4>
            <div class="item-meta"><strong>${escapeHtml(lm.year)}</strong> | ${escapeHtml(lm.description)}</div>
          </div>
          <button type="button" class="btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm" data-sj-landmark="${escapeHtml(lm.id)}">
            Look ${escapeHtml(lm.compassLabel)}
          </button>
        </div>
      `;
    }).join('');

    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>Elevador de Santa Justa - 45m Miradouro</h3>
          <div class="item-meta">360-Degree Factual View of Lisboa | Drag View or Click Any Landmark</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-sj-descend="true">Descend Lift (Esc)</button>
      </div>
      <div class="action-strip" style="margin-bottom:8px;">
        <button type="button" class="btn btn-sm" data-sj-landmark="sj-rossio">N: Rossio</button>
        <button type="button" class="btn btn-sm" data-sj-landmark="sj-castelo">E: Castelo</button>
        <button type="button" class="btn btn-sm" data-sj-landmark="sj-rua-augusta-tejo">S: Tagus</button>
        <button type="button" class="btn btn-sm" data-sj-landmark="sj-convento-carmo">W: Carmo</button>
        <button type="button" class="btn btn-primary btn-sm" data-venue-action="postcard">Postcard [P]</button>
      </div>
      <div class="hood-group-title">Factual Lisbon Landmarks Visible From 45m Summit</div>
      ${landmarkCards}
    `;
    return;
  }

  if (state.mode === 'city-district') {
    const district = LISBOA_CITY_DISTRICTS.find((d) => d.id === state.cityDistrictId);
    if (district) {
      dom.activeContextPanel.classList.remove('hidden');
      const station = ALL_METRO_STATIONS.find((s) => s.id === district.stationId);
      const orderedSpots = [...(district.townSpots || [])].sort((a, b) =>
        a.id === state.activeCityDistrictSpotId ? -1 : b.id === state.activeCityDistrictSpotId ? 1 : 0
      );
      const spotsHtml = orderedSpots
        .map((spot) => {
          const isSelected = spot.id === state.activeCityDistrictSpotId;
          const hiStyle = isSelected ? ' style="border-color:#d97706;background:#fffbeb;"' : '';
          if (spot.kind === 'landmark') {
            return `
              <div class="item-card"${hiStyle}>
                <div>
                  <h4>${escapeHtml(spot.name)} <span class="badge-muted">${escapeHtml(spot.badge)}</span></h4>
                  <div class="item-meta">${escapeHtml(spot.note)}</div>
                </div>
                <button type="button" class="btn btn-sm" data-cd-visit="${escapeHtml(spot.id)}">
                  Rest (+25)
                </button>
              </div>
            `;
          }
          return (spot.items || [])
            .map((item, idx) => {
              const okFunds = state.euros >= item.costEur;
              const isFoodOrDrink = item.kind === 'food' || item.kind === 'drink';
              const serving = isFoodOrDrink ? getItemServingType(item) : null;
              const btnLabel = !isFoodOrDrink ? 'Buy' : serving === 'glass' ? 'Order Glass' : 'Order Plate';
              const fx = isFoodOrDrink
                ? `${serving === 'glass' ? 'Glass' : 'Plate'} | +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy`
                : `Satchel Keepsake, +${item.energyDelta} Energy`;
              return `
                <div class="item-card"${hiStyle}>
                  <div>
                    <h4>${isSelected ? `[${idx + 1}] ` : ''}${escapeHtml(item.name)} <span class="badge-muted">${escapeHtml(spot.name)}</span></h4>
                    <div class="item-meta">${escapeHtml(item.description)}</div>
                    <div class="item-meta"><strong>${item.costEur.toFixed(2)} EUR</strong> | ${escapeHtml(fx)}</div>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm" data-cd-buy="${escapeHtml(spot.id)}|${escapeHtml(item.id)}" ${okFunds ? '' : 'disabled'}>
                    ${btnLabel}
                  </button>
                </div>
              `;
            })
            .join('');
        })
        .join('');

      const walkingAvenues = getWalkingAvenuesFrom(district.id);
      const avenuesHtml = walkingAvenues
        .map((av) => {
          const kmLabel = av.distanceMeters >= 1000 ? `${(av.distanceMeters / 1000).toFixed(1)} km` : `${av.distanceMeters} m`;
          const destVisited = av.toZoneId === 'overworld' || (state.visitedCityDistricts || []).includes(av.toZoneId);
          return `
            <div class="item-card">
              <div>
                <h4>${escapeHtml(getLisboaZoneShortName(av.toZoneId))} <span class="badge-muted">${escapeHtml(av.portalLabel)} AVENUE${destVisited ? ' | VISITED' : ''}</span></h4>
                <div class="item-meta"><strong>${escapeHtml(av.avenueName)}</strong></div>
                <div class="item-meta">${escapeHtml(kmLabel)} on foot | ~${av.walkMinutes} min stroll | Free</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" data-walk-city-avenue="${escapeHtml(av.toZoneId)}">
                Walk ${escapeHtml(av.portalLabel)}
              </button>
            </div>
          `;
        })
        .join('');

      dom.activeContextPanel.innerHTML = `
        <div class="context-header">
          <div>
            <h3>${escapeHtml(district.name)}</h3>
            <div class="item-meta">${escapeHtml(district.zoneBadge)} | ${escapeHtml(district.transitSummary)}</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-cd-metro="true">Descend into ${escapeHtml(station ? station.name.replace('Metro ', '') : 'Metro')} [E]</button>
        </div>
        <p class="helper-text">${escapeHtml(district.description)}</p>
        <div class="phrase-callout">
          <span class="pt">${escapeHtml(district.phrase.pt)}</span>
          <span class="pron">${escapeHtml(district.phrase.pronunciation)}</span>
          <span>${escapeHtml(district.phrase.en)}</span>
        </div>
        ${spotsHtml}
        <div class="hood-group-title" style="margin-top:10px;">Walkable Lisbon Avenues (Continue on Foot)</div>
        ${avenuesHtml}
        <div class="action-strip">
          <button type="button" class="btn btn-sm" data-venue-action="postcard">Shared Postcard [P]</button>
          <button type="button" class="btn btn-secondary btn-sm" data-cd-metro="true">Return to Metro Network (Esc)</button>
        </div>
      `;
      return;
    }
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

    const orderedSpots =
      !isLisbon && !isSailing && curDest && Array.isArray(curDest.townSpots)
        ? [...curDest.townSpots].sort((a, b) =>
          a.id === state.activeSouthBankSpotId ? -1 : b.id === state.activeSouthBankSpotId ? 1 : 0
        )
        : [];
    const southBankTownHtml =
      orderedSpots.length > 0
        ? orderedSpots
          .map((spot) => {
            const isSelected = spot.id === state.activeSouthBankSpotId;
            const hiStyle = isSelected ? ' style="border-color:#d97706;background:#fffbeb;"' : '';
            if (spot.kind === 'landmark') {
              return `
                  <div class="item-card"${hiStyle}>
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
              .map((item, idx) => {
                const okFunds = state.euros >= item.costEur;
                const fx =
                  item.kind === 'food'
                    ? `+${item.fullnessDelta} Fullness, +${item.energyDelta} Energy`
                    : `Satchel Keepsake, +${item.energyDelta} Energy`;
                return `
                    <div class="item-card"${hiStyle}>
                      <div>
                        <h4>${isSelected ? `[${idx + 1}] ` : ''}${escapeHtml(item.name)} <span class="badge-muted">${escapeHtml(spot.name)}</span></h4>
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
      <div class="action-strip">
        <button type="button" class="btn btn-sm" data-ferry-horn="true">Sound Transtejo Horn [E]</button>
      </div>
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
      venue.id === 'taberna-sardinha' ||
      venue.id === 'bar-bairro-alto';
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
        <button type="button" class="btn btn-primary btn-sm" data-venue-action="toast">Raise a Toast ("Saude!") [T]</button>
        <button type="button" class="btn btn-sm" data-venue-action="postcard">Shared Postcard [P]</button>
        ${venue.id === 'se-de-lisboa' ? '<button type="button" class="btn btn-sm" data-venue-action="cathedral-bell">Toll 1147 Bell Tower</button>' : ''}
      </div>
    `;
    return;
  }

  if (state.seatedBenchId && state.seatedBench) {
    dom.activeContextPanel.classList.remove('hidden');
    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(state.seatedBench.name)}</h3>
          <div class="item-meta">Tagus Waterfront Seating | Restoring Energy (+4.5/s)</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-stand-up-bench="true">Stand Up [E]</button>
      </div>
      <p class="helper-text">
        ${escapeHtml(state.seatedBench.viewNote)}. Drag the 3D view to admire Ponte 25 de Abril, Cristo Rei, and passing sailboats, or press [E] / WASD anytime to stand up.
      </p>
      <div class="action-strip">
        <button type="button" class="btn btn-sm" data-venue-action="postcard">Snap Tagus Postcard [P]</button>
      </div>
    `;
    return;
  }

  if (nearby?.type === 'castanha-cart' && nearby.vendor) {
    const cv = nearby.vendor;
    const item = CASTANHA_CONE_ITEM;
    const affordable = state.euros >= item.costEur;
    dom.activeContextPanel.classList.remove('hidden');
    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(cv.vendorName)} - Castanhas Assadas</h3>
          <div class="item-meta">${escapeHtml(cv.locationName)} | Charcoal Street Roaster</div>
        </div>
        <span class="badge badge-tram">SEASONAL</span>
      </div>
      <div class="context-quote">"${escapeHtml(cv.cry)}"</div>
      <div class="phrase-callout">
        <span class="pt">${escapeHtml(cv.phrase.pt)}</span>
        <span class="pron">${escapeHtml(cv.phrase.pronunciation)}</span>
        <span>${escapeHtml(cv.phrase.en)}</span>
      </div>
      <div class="item-card">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <div class="item-meta">${escapeHtml(item.description)}</div>
          <div class="item-meta"><strong>${item.costEur.toFixed(2)} EUR</strong> | +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-buy-castanha="${escapeHtml(cv.id)}" ${affordable ? '' : 'disabled'}>
          Buy Cone [E]
        </button>
      </div>
    `;
    return;
  }

  if (nearby?.type === 'funicular-station' && nearby.funicular && nearby.station) {
    const fun = nearby.funicular;
    const goingUp = nearby.fromEnd === 'lower';
    const destSt = goingUp ? fun.upperStation : fun.lowerStation;
    const affordable = state.euros >= fun.fareEur;
    dom.activeContextPanel.classList.remove('hidden');
    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(fun.name)}</h3>
          <div class="item-meta">${escapeHtml(nearby.station.name)} -> ${escapeHtml(destSt.name)}</div>
        </div>
        <span class="badge badge-tram">FUNICULAR</span>
      </div>
      <p class="helper-text">${escapeHtml(fun.description)}</p>
      <div class="phrase-callout">
        <span class="pt">${escapeHtml(fun.phrase.pt)}</span>
        <span class="pron">${escapeHtml(fun.phrase.pronunciation)}</span>
        <span>${escapeHtml(fun.phrase.en)}</span>
      </div>
      <div class="item-card">
        <div>
          <h4>${goingUp ? 'Climb Up to Bairro Alto Ridge' : 'Glide Down to Waterfront'}</h4>
          <div class="item-meta"><strong>${fun.fareEur.toFixed(2)} EUR</strong> | Historic tilted-chassis cable ride (+12 Energy)</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-board-funicular="${escapeHtml(fun.id)}|${escapeHtml(nearby.fromEnd)}" ${affordable ? '' : 'disabled'}>
          Board [E]
        </button>
      </div>
    `;
    return;
  }

  if (nearby?.type === 'city-district-spot' && nearby.spot) {
    const spot = nearby.spot;
    const district = LISBOA_CITY_DISTRICTS.find((d) => d.id === spot.districtId);
    dom.activeContextPanel.classList.remove('hidden');
    let bodyHtml = '';
    if (spot.kind === 'landmark') {
      const btnLabel = spot.id === 'rossio-santa-justa-lift' ? 'Enter Lift [E]' : 'Rest (+25) [E]';
      bodyHtml = `
        <div class="item-card">
          <div>
            <h4>${escapeHtml(spot.name)} <span class="badge-muted">${escapeHtml(spot.badge)}</span></h4>
            <div class="item-meta">${escapeHtml(spot.note)}</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-cd-visit="${escapeHtml(spot.id)}">
            ${btnLabel}
          </button>
        </div>
      `;
    } else {
      bodyHtml = (spot.items || [])
        .map((item, idx) => {
          const okFunds = state.euros >= item.costEur;
          const isFoodOrDrink = item.kind === 'food' || item.kind === 'drink';
          const serving = isFoodOrDrink ? getItemServingType(item) : null;
          const btnLabel = !isFoodOrDrink ? 'Buy' : serving === 'glass' ? 'Order Glass' : 'Order Plate';
          const fx = isFoodOrDrink
            ? `${serving === 'glass' ? 'Glass' : 'Plate'} | +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy`
            : `Satchel Keepsake, +${item.energyDelta} Energy`;
          return `
            <div class="item-card">
              <div>
                <h4>[${idx + 1}] ${escapeHtml(item.name)}</h4>
                <div class="item-meta">${escapeHtml(item.description)}</div>
                <div class="item-meta"><strong>${item.costEur.toFixed(2)} EUR</strong> | ${escapeHtml(fx)}</div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-cd-buy="${escapeHtml(spot.id)}|${escapeHtml(item.id)}" ${okFunds ? '' : 'disabled'}>
                ${btnLabel}
              </button>
            </div>
          `;
        })
        .join('');
    }
    const phraseHtml = district?.phrase
      ? `
        <div class="phrase-callout">
          <span class="pt">${escapeHtml(district.phrase.pt)}</span>
          <span class="pron">${escapeHtml(district.phrase.pronunciation)}</span>
          <span>${escapeHtml(district.phrase.en)}</span>
        </div>
      `
      : '';
    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(spot.name)}</h3>
          <div class="item-meta">${escapeHtml(spot.districtName)} | Host: ${escapeHtml(spot.host)}</div>
        </div>
        <span class="badge badge-tram">${escapeHtml(spot.badge)}</span>
      </div>
      <p class="helper-text">${escapeHtml(spot.note)}</p>
      ${phraseHtml}
      ${bodyHtml}
      <div class="action-strip">
        <button type="button" class="btn btn-sm" data-venue-action="postcard">Shared Postcard [P]</button>
      </div>
    `;
    return;
  }

  dom.activeContextPanel.classList.add('hidden');
  dom.activeContextPanel.innerHTML = '';
}

function renderLists(state) {
  const curHood = getNeighborhoodAt(state.player.x, state.player.y);
  const curZone =
    state.mode === 'city-district' && state.cityDistrictId
      ? state.cityDistrictId
      : (curHood?.districtId || 'overworld');

  const sig = JSON.stringify({
    visitedVenues: state.visitedVenues,
    visitedMetroStations: state.visitedMetroStations || [],
    visitedCityDistricts: state.visitedCityDistricts || [],
    memories: state.memories.map((m) => m.id),
    phrases: state.learnedPhrases.length,
    satchel: state.satchel.length,
    postcards: (state.postcards || []).length,
    postcardHead: state.postcards?.[0]?.id || 0,
    tasted: state.tastedFoods.length,
    journalLen: state.journal.length,
    journalHead: state.journal[0]?.id || 0,
    mode: state.mode,
    currentCityZone: curZone,
    cityWalkActive: Boolean(state.cityWalk?.active),
    riding: state.ridingVehicleId
  });
  if (sig === lastUiSignature) return;
  lastUiSignature = sig;

  dom.visitedVenuesBadge.textContent = `${state.visitedVenues.length} / ${VENUES.length} venues`;
  dom.albumCountBadge.textContent = `${state.memories.length} / ${state.totalMemoriesPossible} captured`;
  dom.phraseCountBadge.textContent = `${state.learnedPhrases.length} ${state.learnedPhrases.length === 1 ? 'phrase' : 'phrases'}`;
  dom.satchelCountBadge.textContent = `${state.satchel.length} ${state.satchel.length === 1 ? 'keepsake' : 'keepsakes'}`;

  dom.albumCompleteBanner.classList.toggle('hidden', !state.albumCompleted);

  const visitedDistrictSet = new Set(['overworld', ...(state.visitedCityDistricts || [])]);
  const mapNodeCoords = new Map(
    LISBOA_CITY_MAP_NODES.map((n) => [
      n.id,
      { ...n, sx: Math.round(n.x * 2.95 + 12), sy: Math.round(n.y * 1.44 + 15) }
    ])
  );
  const drawnEdges = new Set();
  const mapEdgeLines = [];
  for (const [fromId, links] of Object.entries(LISBOA_WALKING_NETWORK)) {
    const a = mapNodeCoords.get(fromId);
    if (!a) continue;
    for (const link of links) {
      const b = mapNodeCoords.get(link.toZoneId);
      if (!b) continue;
      const edgeKey = [fromId, link.toZoneId].sort().join('--');
      if (drawnEdges.has(edgeKey)) continue;
      drawnEdges.add(edgeKey);
      const isActiveEdge = fromId === curZone || link.toZoneId === curZone;
      mapEdgeLines.push(
        `<line x1="${a.sx}" y1="${a.sy}" x2="${b.sx}" y2="${b.sy}" stroke="${isActiveEdge ? '#1b4d89' : '#94a3b8'}" stroke-width="${isActiveEdge ? '2.4' : '1.4'}" stroke-dasharray="${isActiveEdge ? '' : '3 2'}" />`
      );
    }
  }

  const labelOffsets = {
    'district-sao-sebastiao-sete-rios': { dx: 0, dy: -10, anchor: 'middle', txt: 'Sao Sebastiao & Zoo' },
    'district-campo-grande-alvalade': { dx: 0, dy: -10, anchor: 'middle', txt: 'Campo Grande' },
    'district-aeroporto-lisboa': { dx: 0, dy: -9, anchor: 'middle', txt: 'Aeroporto' },
    'district-oriente-parque-nacoes': { dx: 8, dy: 14, anchor: 'end', txt: 'Oriente & Expo' },
    'district-rato-principe-real': { dx: -8, dy: -9, anchor: 'middle', txt: 'Rato & Pr. Real' },
    'district-marques-pombal-avenida': { dx: -2, dy: -9, anchor: 'middle', txt: 'Marques' },
    'district-saldanha-campo-pequeno': { dx: 4, dy: -9, anchor: 'middle', txt: 'Saldanha' },
    'district-alameda-arroios': { dx: 10, dy: 3, anchor: 'start', txt: 'Alameda' },
    'district-rossio-restauradores': { dx: 2, dy: 15, anchor: 'middle', txt: 'Rossio' },
    'district-cais-sodre-belem': { dx: 6, dy: 15, anchor: 'middle', txt: 'Cais & Belem' },
    overworld: { dx: 12, dy: 15, anchor: 'middle', txt: 'Chiado, Bairro Alto & Alfama' }
  };

  const mapNodesSvg = LISBOA_CITY_MAP_NODES.map((n) => {
    const pt = mapNodeCoords.get(n.id);
    const isHere = n.id === curZone;
    const isVisited = visitedDistrictSet.has(n.id);
    const lo = labelOffsets[n.id] || { dx: 0, dy: -10, anchor: 'middle', txt: n.shortName };
    return `
      <g class="city-map-node" data-walk-city-district="${escapeHtml(n.id)}" role="button" tabindex="0">
        <title>Walk to ${escapeHtml(getLisboaZoneLabel(n.id))}</title>
        ${isHere ? `<circle cx="${pt.sx}" cy="${pt.sy}" r="10.5" fill="rgba(250, 204, 21, 0.38)" stroke="#d97706" stroke-width="1.6" />` : ''}
        <circle class="city-map-dot" cx="${pt.sx}" cy="${pt.sy}" r="${isHere ? '6.2' : '5'}" fill="${isHere ? '#f59e0b' : n.color}" stroke="${isVisited ? '#14532d' : '#ffffff'}" stroke-width="${isHere ? '2.2' : '1.6'}" />
        <text x="${pt.sx + lo.dx}" y="${pt.sy + lo.dy}" text-anchor="${lo.anchor}" font-size="7.4" font-weight="${isHere ? '800' : '700'}" fill="${isHere ? '#92400e' : '#1e293b'}">${escapeHtml(lo.txt)}</text>
      </g>
    `;
  }).join('');

  const guideParts = [];
  guideParts.push(`
    <div class="city-map-card">
      <div class="city-map-header">
        <span class="city-map-title">Cidade de Lisboa - Unified Open-World Map</span>
        <span class="badge-muted">${visitedDistrictSet.size} / ${LISBOA_CITY_MAP_NODES.length} Zones</span>
      </div>
      <svg class="city-map-svg" viewBox="0 0 320 186" aria-label="Interactive Full-City Lisboa Walking Map">
        <rect x="0" y="156" width="320" height="30" fill="#bae6fd" opacity="0.62" />
        <text x="312" y="176" text-anchor="end" font-size="7" font-weight="700" fill="#0369a1" letter-spacing="0.06em">RIO TEJO (TAGUS ESTUARY)</text>
        ${mapEdgeLines.join('')}
        ${mapNodesSvg}
      </svg>
      <div class="city-map-legend">
        <span><strong>Here:</strong> ${escapeHtml(getLisboaZoneShortName(curZone))}</span>
        ${curZone !== 'overworld'
          ? `<button type="button" class="btn btn-sm" data-walk-city-district="overworld" ${state.ridingVehicleId ? 'disabled' : ''}>Walk to Historic Core</button>`
          : '<span>Click any district to walk continuously along Lisboa streets</span>'}
      </div>
    </div>
  `);
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

  guideParts.push('<div class="hood-group-title">Tagus River Ferries &amp; Elevador de Santa Justa (1902)</div>');
  const visitedPorts = state.visitedFerryPorts || [];
  guideParts.push(`
    <div class="guide-card ${state.visitedSantaJustaMiradouro ? 'visited' : ''}">
      <div>
        <div class="guide-card-title">${escapeHtml(SANTA_JUSTA_LIFT.name)} <span class="badge-muted">${escapeHtml(SANTA_JUSTA_LIFT.badge)}</span></div>
        <div class="guide-card-sub">45m Neo-Gothic vertical lift on Rua do Carmo with a factual 360-degree view of Lisboa (${SANTA_JUSTA_LIFT.fareEur.toFixed(2)} EUR)</div>
      </div>
      <button type="button" class="btn btn-sm" data-walk-santa-justa="true" ${state.ridingVehicleId ? 'disabled' : ''}>
        Walk Here
      </button>
    </div>
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

  guideParts.push('<div class="hood-group-title">Metropolitano de Lisboa - All 50 Official Stations Across 4 Lines (56 Stops)</div>');
  for (const ln of METRO_NETWORK_LINES) {
    const fg = ln.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
    const stationRows = ln.stations
      .map((stopName, sIdx) => {
        const stObj = ALL_METRO_STATIONS.find((s) => s.canonicalStopName === stopName);
        if (!stObj) return '';
        const visited = (state.visitedMetroStations || []).includes(stObj.id);
        const isHub = getStationLineIds(stObj).length > 1;
        const isTerminus = sIdx === 0 || sIdx === ln.stations.length - 1;
        const tag = isHub ? ' [HUB]' : isTerminus ? ' [TERMINUS]' : '';
        return `
          <div class="guide-card ${visited ? 'visited' : ''}" style="margin-top:4px;padding:6px 8px;">
            <div>
              <div class="guide-card-title">${escapeHtml(stObj.name)}<span class="badge-muted">${tag}</span></div>
              <div class="guide-card-sub">${escapeHtml(stObj.zoneLabel || ln.name)}</div>
            </div>
            <div class="guide-card-actions">
              <button type="button" class="btn btn-sm" data-walk-metro="${escapeHtml(stObj.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
                Walk
              </button>
              <button type="button" class="btn btn-primary btn-sm" data-travel-city-metro="${escapeHtml(stObj.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
                Metro
              </button>
            </div>
          </div>
        `;
      })
      .join('');
    guideParts.push(`
      <details style="margin:6px 0;border:1px solid ${ln.color};border-radius:8px;padding:6px 8px;background:#ffffff;">
        <summary style="cursor:pointer;font-weight:700;font-size:12px;">
          <span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${ln.color};color:${fg};font-size:10px;margin-right:6px;">${escapeHtml(ln.name)} (${ln.stations.length})</span>
          ${escapeHtml(ln.termini[0])} <-> ${escapeHtml(ln.termini[1])}
        </summary>
        ${stationRows}
      </details>
    `);
  }

  guideParts.push('<div class="hood-group-title">Greater Lisboa Featured Districts &amp; Landmarks (Walk or Ride Metro)</div>');
  for (const dist of LISBOA_CITY_DISTRICTS) {
    const station = ALL_METRO_STATIONS.find((s) => s.id === dist.stationId);
    if (!station) continue;
    const visited = (state.visitedCityDistricts || []).includes(dist.id);
    const isHere = curZone === dist.id;
    guideParts.push(`
      <div class="guide-card ${visited ? 'visited' : ''}">
        <div>
          <div class="guide-card-title">${escapeHtml(dist.shortName)} <span class="badge-muted">${escapeHtml(station.lines.join(' / '))}</span></div>
          <div class="guide-card-sub">${escapeHtml(station.name)} | ${escapeHtml(dist.transitSummary)}</div>
        </div>
        <div class="guide-card-actions">
          <button type="button" class="btn btn-primary btn-sm" data-walk-city-district="${escapeHtml(dist.id)}" ${state.ridingVehicleId || isHere ? 'disabled' : ''}>
            ${isHere ? 'Here Now' : 'Walk Here'}
          </button>
          <button type="button" class="btn btn-sm" data-travel-city-metro="${escapeHtml(station.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
            Ride Metro
          </button>
        </div>
      </div>
    `);
  }

  guideParts.push('<div class="hood-group-title">Carris Trams (28E, 15E, 24E) &amp; Buses (737, 736, 728, 746, 706, 744)</div>');
  for (const line of TRANSIT_LINES) {
    const lineStops = ALL_STOPS.filter((s) => s.lineId === line.id);
    const chipBg = line.mode === 'tram' ? '#eab308' : '#1d4ed8';
    const chipFg = line.mode === 'tram' ? '#0f172a' : '#ffffff';
    guideParts.push(`
      <div class="guide-card" style="background:#f8fafc;border-color:${chipBg};">
        <div>
          <div class="guide-card-title">
            <span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${chipBg};color:${chipFg};font-size:10.5px;font-weight:800;margin-right:5px;">${escapeHtml(line.routeNumber || line.badge)}</span>
            ${escapeHtml(line.name)}
          </div>
          <div class="guide-card-sub">${escapeHtml(line.description)} | ${line.fareEur.toFixed(2)} EUR</div>
        </div>
      </div>
    `);
    for (const stop of lineStops) {
      guideParts.push(`
        <div class="guide-card">
          <div>
            <div class="guide-card-title">${escapeHtml(stop.stopName)} <span class="badge-muted">${escapeHtml(line.routeNumber || stop.badge)}</span></div>
            <div class="guide-card-sub">${escapeHtml(stop.lineName)} - ${stop.fareEur.toFixed(2)} EUR</div>
          </div>
          <button type="button" class="btn btn-sm" data-walk-stop="${escapeHtml(stop.stopId)}" ${state.ridingVehicleId ? 'disabled' : ''}>
            Catch Here
          </button>
        </div>
      `);
    }
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

  if (dom.postcardsList) {
    const cards = state.postcards || [];
    dom.postcardsList.innerHTML =
      cards.length > 0
        ? cards
          .map(
            (c) =>
              `<li><strong>${escapeHtml(c.locationName)}</strong> (${escapeHtml(c.neighborhood)}, Day ${c.day} ${escapeHtml(c.clock)}) - "${escapeHtml(c.caption)}"</li>`
          )
          .join('')
        : '<li class="empty-note">No shared postcards captured yet. Press [P] or click Postcard [P] to snap a photo with companions in your location!</li>';
  }

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

function renderGameOverModal(state) {
  if (!dom.gameOverModal) return;
  if (!state.gameOver || !state.gameOverSummary) {
    dom.gameOverModal.classList.add('hidden');
    lastGameOverSignature = '';
    return;
  }

  const sum = state.gameOverSummary;
  const sig = JSON.stringify({
    go: state.gameOver,
    reason: sum.gameOverReason,
    title: sum.title,
    score: sum.totalScore,
    mem: sum.memoriesCaptured,
    ven: sum.venuesVisited,
    meals: sum.mealsEaten,
    en: sum.energyRemaining,
    fl: sum.fullnessRemaining,
    mp: (sum.multiplayerComparison || []).map((p) => `${p.id}:${p.totalScore}:${p.memoriesCaptured}:${p.gameOver}:${p.gameOverReason}`)
  });
  dom.gameOverModal.classList.remove('hidden');
  if (sig === lastGameOverSignature) return;
  lastGameOverSignature = sig;

  if (dom.gameOverTitle) dom.gameOverTitle.textContent = sum.title;
  if (dom.gameOverSubtitle) dom.gameOverSubtitle.textContent = sum.subtitle;
  if (dom.gameOverScore) dom.gameOverScore.textContent = `${sum.totalScore} pts`;
  if (dom.gameOverRank) dom.gameOverRank.textContent = sum.explorerRank;
  if (dom.gameOverMemoriesBadge) {
    dom.gameOverMemoriesBadge.textContent = `${sum.memoriesCaptured} / ${sum.memoriesTotal} Memories Captured`;
  }

  if (dom.gameOverTallyGrid) {
    const tastedPreview =
      sum.tastedFoods.length > 0 ? sum.tastedFoods.slice(0, 3).join(', ') : 'No dishes ordered';
    const satchelPreview =
      sum.satchelItems.length > 0 ? sum.satchelItems.slice(0, 3).join(', ') : 'No keepsakes bought';
    dom.gameOverTallyGrid.innerHTML = `
      <div class="scorecard-stat">
        <span class="scorecard-stat-label">Memories Captured</span>
        <strong class="scorecard-stat-val">${sum.memoriesCaptured} / ${sum.memoriesTotal}</strong>
        <span class="scorecard-stat-sub">${Math.round((sum.memoriesCaptured / Math.max(1, sum.memoriesTotal)) * 100)}% of Lisboa Album</span>
      </div>
      <div class="scorecard-stat">
        <span class="scorecard-stat-label">Buildings Explored</span>
        <strong class="scorecard-stat-val">${sum.venuesVisited} / ${sum.venuesTotal} Venues</strong>
        <span class="scorecard-stat-sub">${sum.neighborhoodsVisited} / ${sum.neighborhoodsTotal} Neighborhoods</span>
      </div>
      <div class="scorecard-stat">
        <span class="scorecard-stat-label">Meals &amp; Pastries Tasted</span>
        <strong class="scorecard-stat-val">${sum.mealsEaten} Dishes</strong>
        <span class="scorecard-stat-sub">${escapeHtml(tastedPreview)}</span>
      </div>
      <div class="scorecard-stat">
        <span class="scorecard-stat-label">Keepsakes Collected</span>
        <strong class="scorecard-stat-val">${sum.souvenirsBought} Keepsakes</strong>
        <span class="scorecard-stat-sub">${escapeHtml(satchelPreview)}</span>
      </div>
      <div class="scorecard-stat">
        <span class="scorecard-stat-label">Transit &amp; Tagus Ferries</span>
        <strong class="scorecard-stat-val">${sum.transitRides.total} Rides</strong>
        <span class="scorecard-stat-sub">Tram ${sum.transitRides.tram} | Bus ${sum.transitRides.bus} | Metro ${sum.transitRides.metro} | Ferry ${sum.transitRides.ferry}</span>
      </div>
      <div class="scorecard-stat">
        <span class="scorecard-stat-label">Phrases &amp; Postcards</span>
        <strong class="scorecard-stat-val">${sum.phrasesLearned} Phrases</strong>
        <span class="scorecard-stat-sub">${sum.postcardsCaptured} Shared Postcards | ${sum.distanceWalkedMeters} m walked</span>
      </div>
    `;
  }

  if (dom.gameOverMultiplayerBadge && sum.groupTotals) {
    const gt = sum.groupTotals;
    dom.gameOverMultiplayerBadge.textContent =
      gt.totalPlayers > 1
        ? `${gt.totalPlayers} Travelers | Combined Score: ${gt.combinedScore} pts | Leader: ${gt.topScorerName}`
        : `Solo Stroll | Rank #1 (${sum.totalScore} pts)`;
  }

  if (dom.gameOverMultiplayerList && Array.isArray(sum.multiplayerComparison)) {
    dom.gameOverMultiplayerList.innerHTML = sum.multiplayerComparison
      .map((entry) => {
        const outfit = getOutfitById(entry.outfitId);
        const walletTag = entry.gameOver
          ? `Finished (${entry.reasonLabel || '0.00 EUR'})`
          : `Exploring (${entry.eurosRemaining.toFixed(2)} EUR)`;
        return `
          <div class="mp-score-row ${entry.isLocal ? 'local' : ''}">
            <div>
              <span class="mp-score-rank">#${entry.standing}</span>
              <strong>${escapeHtml(entry.name)}${entry.isLocal ? ' (You)' : ''}</strong>
              <span class="badge-muted">${escapeHtml(outfit.name)}</span>
              <div class="item-meta">${escapeHtml(entry.explorerRank)} | ${escapeHtml(walletTag)}</div>
            </div>
            <div style="text-align:right;">
              <strong>${entry.totalScore} pts</strong>
              <div class="item-meta">
                Memories: ${entry.memoriesCaptured}/${entry.memoriesTotal} | Venues: ${entry.venuesVisited}/${entry.venuesTotal} | Meals: ${entry.mealsEaten} | Keepsakes: ${entry.souvenirsBought} | Rides: ${entry.transitRides}
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  if (dom.gameOverCardPreview) {
    const exported = engine.exportMemorySummaryCard({ format: 'text' });
    dom.gameOverCardPreview.textContent = exported.cardText;
  }

  if (dom.gameOverMemoriesList) {
    const capturedMap = new Map((sum.memoriesList || []).map((m) => [m.id, m]));
    dom.gameOverMemoriesList.innerHTML = ALL_MEMORIES.map((mem) => {
      const found = capturedMap.get(mem.id);
      if (found) {
        return `
          <article class="memory-card captured">
            <div class="memory-top">
              <span class="memory-title">[CAPTURED] ${escapeHtml(found.title)}</span>
              <span class="memory-stamp">Day ${found.day} ${escapeHtml(found.clock)} | ${escapeHtml(found.neighborhood)}</span>
            </div>
          </article>
        `;
      }
      return `
        <article class="memory-card locked">
          <div class="memory-top">
            <span class="memory-title">[MISSED] ${escapeHtml(mem.title)}</span>
            <span class="memory-stamp">${escapeHtml(mem.neighborhood)}</span>
          </div>
        </article>
      `;
    }).join('');
  }
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
  dom.clock.textContent = state.globalClockSynced
    ? `Day ${state.day} - ${formatClock(state.minutesOfDay)} [SYNC]`
    : `Day ${state.day} - ${formatClock(state.minutesOfDay)}`;
  dom.phase.textContent = phase.label;
  dom.phase.className = `phase-pill phase-${phase.id}`;

  const monthInfo = getMonthInfo(state.month);
  if (dom.monthSelect && Number(dom.monthSelect.value) !== monthInfo.month) {
    dom.monthSelect.value = String(monthInfo.month);
  }
  if (dom.weatherPill) {
    dom.weatherPill.textContent = `${monthInfo.avgHighC}C - ${monthInfo.weatherLabel}`;
    const weatherClass =
      monthInfo.rainIntensity >= 0.45
        ? 'weather-rainy'
        : monthInfo.decorStyle === 'christmas-lights' || monthInfo.decorStyle === 'carnaval' || monthInfo.decorStyle === 'cravos-25-abril' || monthInfo.decorStyle === 'santos-populares'
          ? 'weather-festive'
          : monthInfo.sunBrightness >= 1.1
            ? 'weather-sunny'
            : 'weather-mild';
    dom.weatherPill.className = `weather-pill ${weatherClass}`;
  }
  if (dom.monthEvent) {
    dom.monthEvent.textContent = monthInfo.eventTitle;
  }
  if (dom.liveSeasonStatus) {
    dom.liveSeasonStatus.textContent = `[${monthInfo.shortName.toUpperCase()} ${monthInfo.avgHighC}C] ${monthInfo.eventTag}`;
    const toneClass =
      monthInfo.rainIntensity >= 0.45
        ? 'rainy'
        : monthInfo.decorStyle === 'christmas-lights' || monthInfo.decorStyle === 'carnaval' || monthInfo.decorStyle === 'cravos-25-abril' || monthInfo.decorStyle === 'santos-populares'
          ? 'festive'
          : '';
    dom.liveSeasonStatus.className = `badge badge-season${toneClass ? ` ${toneClass}` : ''}`;
  }

  dom.memories.textContent = `${state.memories.length} / ${state.totalMemoriesPossible}`;

  const venue = engine.getCurrentVenue();
  const riding = engine.getRidingVehicle();
  const metroStation = engine.getActiveMetroStation();
  if (state.cityWalk?.active) {
    const cw = state.cityWalk;
    const distText = cw.distanceMeters >= 1000 ? `${(cw.distanceMeters / 1000).toFixed(1)} km` : `${cw.distanceMeters} m`;
    dom.sceneTitle.textContent = `Walking Along ${cw.avenueName}`;
    dom.sceneSubtitle.textContent = `${getLisboaZoneShortName(cw.fromZoneId)} -> ${getLisboaZoneShortName(cw.toZoneId)} on foot (${distText}, ~${cw.walkMinutes} min stroll).`;
  } else if (state.mode === 'ferry') {
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
  } else if (state.mode === 'santa-justa') {
    const sj = state.santaJusta || { phase: 'lobby', altitudeMeters: 0 };
    if (sj.phase === 'miradouro') {
      dom.sceneTitle.textContent = 'Elevador de Santa Justa - 45m Panoramic Miradouro';
      dom.sceneSubtitle.textContent = 'Drag 360 deg (or A/D) to inspect Rossio (N), Castelo de Sao Jorge (E), Rua Augusta & Tagus (S), and Convento do Carmo (W). Press Esc to descend.';
    } else if (sj.phase === 'ascending' || sj.phase === 'descending') {
      dom.sceneTitle.textContent = `Elevador de Santa Justa (1902) - ${sj.phase === 'ascending' ? 'Ascending' : 'Descending'} ${Math.round(sj.altitudeMeters || 0)}m / 45m`;
      dom.sceneSubtitle.textContent = 'Riding inside Raoul Mesnier du Ponsard 1902 brass-and-mahogany vertical cabin.';
    } else {
      dom.sceneTitle.textContent = 'Elevador de Santa Justa (1902) - Ground Lobby';
      dom.sceneSubtitle.textContent = 'Press [E] or click the mahogany cabin to ascend 45 meters for a factual 360-degree view of Lisboa (1.80 EUR).';
    }
  } else if (state.mode === 'city-district') {
    const dist = LISBOA_CITY_DISTRICTS.find((d) => d.id === state.cityDistrictId);
    dom.sceneTitle.textContent = dist ? `${dist.name} (${state.viewMode === 'street3d' ? '3D' : '2.5D'})` : 'Lisboa City District';
    dom.sceneSubtitle.textContent = dist
      ? `${dist.transitSummary} | Walk out any open Lisbon avenue on foot, explore Eatery/Monument/Shop, or descend into Metro (Esc).`
      : 'Explore this Lisbon Metro city district plaza, continue along open avenues on foot, or return underground.';
  } else if (state.mode === 'metro') {
    const destStation = ALL_METRO_STATIONS.find((s) => s.id === state.metro.toStationId);
    const activeLn = getMetroLineById(state.metro.activeLineId || (metroStation ? getStationLineIds(metroStation)[0] : 'linha-azul'));
    const transferLn = getMetroLineById(state.metro.transferToLineId);
    const activeLines = activeLn ? activeLn.name : (metroStation?.lines?.[0] || 'Metropolitano de Lisboa');
    if (state.metro.phase === 'riding') {
      dom.sceneTitle.textContent = `Underground Metro (${activeLines}) -> ${destStation ? destStation.name : 'Next Station'}`;
      dom.sceneSubtitle.textContent = state.metro?.route?.summary || 'Riding beneath Lisboa on Metropolitano de Lisboa.';
    } else if (state.metro.phase === 'transferring') {
      dom.sceneTitle.textContent = `Correspondencia at ${metroStation ? metroStation.name : 'Metro'} -> ${transferLn ? transferLn.name : 'Connecting Line'}`;
      dom.sceneSubtitle.textContent = 'Walking through the free underground transfer passage between Metro lines.';
    } else if (state.metro.phase === 'descending') {
      dom.sceneTitle.textContent = `Descending into ${metroStation ? metroStation.name : 'Metro'}`;
      dom.sceneSubtitle.textContent = `Taking the escalators down to the ${activeLines} underground platform.`;
    } else if (state.metro.phase === 'ascending') {
      dom.sceneTitle.textContent = `Ascending from ${metroStation ? metroStation.name : 'Metro'}`;
      dom.sceneSubtitle.textContent = 'Taking the escalators up to the sunlit Lisboa street sidewalk.';
    } else {
      dom.sceneTitle.textContent = `${metroStation ? metroStation.name : 'Metro Station'} - ${activeLines} Platform`;
      dom.sceneSubtitle.textContent =
        metroStation && getStationLineIds(metroStation).length > 1
          ? `Board direct ${activeLines} trains, use the East Correspondencia corridor to switch lines (Free), or take the escalator out (Esc).`
          : `Board direct ${activeLines} trains to stations on this line (or transfer hubs), or take the escalator out (Esc).`;
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
    const is3d = state.viewMode === 'street3d';
    dom.sceneTitle.textContent = is3d
      ? `${state.currentNeighborhoodName} - 3D Street View`
      : `${state.currentNeighborhoodName} - Overhead Lisboa Map`;
    dom.sceneSubtitle.textContent = is3d
      ? 'Drag to look 360 deg, click street/door to walk, W/S (Up/Down) to stroll, A/D (Left/Right) to turn, [V] for Overhead Map.'
      : 'Walk along sidewalks with WASD / Arrows or click anywhere. Press [V] for 3D Street View, or [E] at doors & transit.';
  }

  if (dom.btnViewMode) {
    const is3d = state.viewMode === 'street3d';
    dom.btnViewMode.textContent = is3d ? 'View: Street 3D [V]' : 'View: Map 2.5D [V]';
    dom.btnViewMode.setAttribute('aria-pressed', String(is3d));
  }

  const pickNearestVehicle = (mode) => {
    if (riding && riding.mode === mode) return riding;
    let best = null;
    let bestD = Infinity;
    for (const v of state.vehicles) {
      if (v.mode !== mode) continue;
      const d = Math.hypot(v.x - state.player.x, v.y - state.player.y);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  };
  const tram = pickNearestVehicle('tram');
  const bus = pickNearestVehicle('bus');
  if (tram) {
    const tNum = tram.routeNumber || '28E';
    dom.liveTramStatus.textContent = tram.yielding
      ? `[TRAM ${tNum}] Yielding to pedestrian`
      : tram.currentStopName
        ? `[TRAM ${tNum}] At ${tram.currentStopName.split(' (')[0]}`
        : `[TRAM ${tNum}] -> ${tram.nextStopName.split(' (')[0]}`;
  }
  if (bus) {
    const bNum = bus.routeNumber || '737';
    dom.liveBusStatus.textContent = bus.yielding
      ? `[BUS ${bNum}] Yielding to pedestrian`
      : bus.currentStopName
        ? `[BUS ${bNum}] At ${bus.currentStopName.split(' (')[0]}`
        : `[BUS ${bNum}] -> ${bus.nextStopName.split(' (')[0]}`;
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
          : state.mode === 'city-district'
            ? 'Walk to open Lisbon avenue sign, Eatery/Monument/Shop, or METRO ENTRANCE'
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
  } else if (state.mode === 'santa-justa' && (state.santaJusta?.phase === 'lobby' || state.santaJusta?.phase === 'miradouro')) {
    dom.btnSecondaryAction.classList.remove('hidden');
    dom.btnSecondaryAction.textContent =
      state.santaJusta.phase === 'miradouro' ? 'Descend Lift (Esc)' : 'Exit Lift Lobby (Esc)';
    dom.btnSecondaryAction.dataset.action = 'descend-santa-justa';
  } else if (state.mode === 'city-district') {
    dom.btnSecondaryAction.classList.remove('hidden');
    dom.btnSecondaryAction.textContent = 'Descend into Metro (Esc)';
    dom.btnSecondaryAction.dataset.action = 'enter-district-metro';
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
  renderGameOverModal(state);
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
  if (traveler.mode === 'santa-justa') {
    return 'Elevador de Santa Justa (45m)';
  }
  if (traveler.mode === 'city-district' && traveler.cityDistrictId) {
    const dist = LISBOA_CITY_DISTRICTS.find((d) => d.id === traveler.cityDistrictId);
    return dist ? `${dist.shortName} Plaza` : 'Lisboa City District';
  }
  if (traveler.mode === 'metro' && traveler.metroStationId) {
    const station = ALL_METRO_STATIONS.find((s) => s.id === traveler.metroStationId);
    return station ? `${station.name} (${traveler.metroPhase || 'platform'})` : 'Underground Metro';
  }
  if (traveler.ridingVehicleId) {
    const line = TRANSIT_LINES.find((l) => l.id === traveler.ridingVehicleId);
    return line ? `Aboard ${line.name}` : 'Aboard Carris Transit';
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
        cityDistrictId: state.cityDistrictId,
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
    cityDistrictId: state.cityDistrictId,
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
  onClockSync: (clock) => {
    if (clock) {
      engine.syncGlobalClock(clock);
    } else {
      engine.clearGlobalClock();
    }
  },
  onTransitSync: (transit) => {
    if (transit) {
      engine.syncGlobalTransit(transit);
    } else {
      engine.clearGlobalTransit();
    }
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
  if (event.code === 'KeyV') {
    if (!event.repeat && !engine.getState().ridingVehicleId) {
      engine.toggleViewMode();
      refreshUi(true);
    }
    return;
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
  if (event.code === 'KeyT') {
    if (!event.repeat) {
      const res = engine.triggerSharedToast();
      mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
      if (res?.toast) {
        setStatusBanner(res.toast.text);
      }
      refreshUi(true);
    }
    return;
  }
  if (event.code === 'KeyP') {
    if (!event.repeat) {
      const res = engine.triggerSharedPostcard();
      mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
      if (res?.postcard) {
        setStatusBanner(`Captured Shared Lisboa Postcard: "${res.postcard.caption}"`);
      }
      refreshUi(true);
    }
    return;
  }
  if (event.code === 'KeyE' || event.code === 'Space') {
    if (!event.repeat) {
      const res = engine.triggerNearbyInteraction();
      if (res && res.ok && res.soundEffect) {
        soundEngine.playEffect(res.soundEffect);
      } else if (res && res.ok && res.feedback) {
        soundEngine.playEffect('door');
      } else if (res && !res.ok && res.error) {
        setStatusBanner(res.error, true);
      }
      refreshUi(true);
    }
    return;
  }
  if (event.code === 'Digit1' || event.code === 'Digit2') {
    if (!event.repeat && engine.getState().mode === 'ferry' && engine.getState().ferry.phase === 'terminal') {
      const idx = event.code === 'Digit1' ? 0 : 1;
      const res = engine.purchaseActiveSouthBankItemByIndex(idx);
      if (res && res.ok) {
        soundEngine.playEffect('register');
      } else if (res && !res.ok && res.error) {
        setStatusBanner(res.error, true);
      }
      refreshUi(true);
      return;
    }
    if (!event.repeat && (engine.getState().mode === 'city-district' || engine.getState().mode === 'overworld')) {
      const idx = event.code === 'Digit1' ? 0 : 1;
      const nearbyCheck = engine.getNearbyInteraction();
      if (engine.getState().mode === 'city-district' || nearbyCheck?.type === 'city-district-spot') {
        const res = engine.purchaseActiveCityDistrictItemByIndex(idx);
        if (res && res.ok) {
          soundEngine.playEffect('register');
        } else if (res && !res.ok && res.error) {
          setStatusBanner(res.error, true);
        }
        refreshUi(true);
        return;
      }
    }
  }
  if (event.code === 'Escape') {
    if (engine.getState().cityWalk?.active) {
      return;
    }
    if (engine.getState().ridingFunicularId) {
      engine.disembarkFunicular();
      refreshUi(true);
    } else if (engine.getState().seatedBenchId) {
      engine.standUpFromRiversideBench();
      refreshUi(true);
    } else if (engine.getState().mode === 'interior') {
      engine.exitVenue();
      refreshUi(true);
    } else if (engine.getState().mode === 'metro' && engine.getState().metro.phase === 'platform') {
      engine.exitMetroStation();
      refreshUi(true);
    } else if (engine.getState().mode === 'santa-justa') {
      engine.descendSantaJusta();
      refreshUi(true);
    } else if (engine.getState().mode === 'city-district') {
      engine.enterMetroFromCityDistrict();
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

canvas.addEventListener('pointerdown', (event) => {
  const state = engine.getState();
  if (!isFirstPerson3DActive(state)) return;
  dragLook.active = true;
  dragLook.moved = false;
  dragLook.startX = event.clientX;
  dragLook.startY = event.clientY;
  dragLook.lastX = event.clientX;
  dragLook.lastY = event.clientY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (event) => {
  const state = engine.getState();
  const isStreet3D = isFirstPerson3DActive(state);
  if (dragLook.active && isStreet3D) {
    const dx = event.clientX - dragLook.lastX;
    const dy = event.clientY - dragLook.lastY;
    dragLook.lastX = event.clientX;
    dragLook.lastY = event.clientY;
    if (Math.hypot(event.clientX - dragLook.startX, event.clientY - dragLook.startY) > 5) {
      dragLook.moved = true;
    }
    // Natural Google Street View drag-to-pan (drag right rotates world smoothly right)
    engine.rotateCamera(-dx * 0.0052, dy * 0.0032);
    renderer.setStreetHover(null, null, state);
    return;
  }
  if (isStreet3D && event.target === canvas) {
    const rect = canvas.getBoundingClientRect();
    const cx = ((event.clientX - rect.left) * canvas.width) / rect.width;
    const cy = ((event.clientY - rect.top) * canvas.height) / rect.height;
    renderer.setStreetHover(cx, cy, state);
    canvas.style.cursor = 'grab';
  }
});

window.addEventListener('pointerup', () => {
  if (!dragLook.active) return;
  dragLook.active = false;
  const state = engine.getState();
  canvas.style.cursor = isFirstPerson3DActive(state) ? 'grab' : 'pointer';
});

canvas.addEventListener('pointerleave', () => {
  renderer.setStreetHover(null, null, engine.getState());
});

canvas.addEventListener('click', handleCanvasClick);

if (dom.btnViewMode) {
  dom.btnViewMode.addEventListener('click', () => {
    engine.toggleViewMode();
    refreshUi(true);
  });
}

dom.btnContextAction.addEventListener('click', () => {
  const res = engine.triggerNearbyInteraction();
  if (res && res.ok && res.soundEffect) {
    soundEngine.playEffect(res.soundEffect);
  }
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
  } else if (action === 'descend-santa-justa') {
    engine.descendSantaJusta();
  } else if (action === 'enter-district-metro') {
    engine.enterMetroFromCityDistrict();
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

if (dom.btnEvening) {
  dom.btnEvening.addEventListener('click', () => {
    engine.jumpToEvening();
    refreshUi(true);
  });
}

dom.btnOvernight.addEventListener('click', () => {
  engine.restOvernight();
  if (mpStatusInfo.status === 'connected') {
    mpClient.advanceGlobalMorning();
  }
  refreshUi(true);
});

dom.btnReset.addEventListener('click', () => {
  engine.reset();
  lastUiSignature = '';
  lastContextSignature = '';
  lastGameOverSignature = '';
  refreshUi(true);
});

if (dom.btnGameOverRestart) {
  dom.btnGameOverRestart.addEventListener('click', () => {
    engine.reset();
    lastUiSignature = '';
    lastContextSignature = '';
    lastGameOverSignature = '';
    refreshUi(true);
  });
}

async function copyMemorySummaryCardToClipboard() {
  const { cardText } = engine.exportMemorySummaryCard({ format: 'text' });
  if (dom.gameOverCardPreview) {
    dom.gameOverCardPreview.textContent = cardText;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cardText);
      setStatusBanner('Copied Lisboa Memory Summary Card to clipboard!');
      return;
    }
  } catch {
    // Fallback below
  }
  setStatusBanner('Generated Lisboa Memory Summary Card (ready to copy or download).');
}

function downloadMemorySummaryCardFile() {
  const { cardText, scorecard } = engine.exportMemorySummaryCard({ format: 'text' });
  if (dom.gameOverCardPreview) {
    dom.gameOverCardPreview.textContent = cardText;
  }
  if (typeof Blob !== 'function' || typeof URL === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([cardText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (engine.getState().player.name || 'traveler').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.href = url;
  link.download = `memories-lisboa-summary-${safeName}-day${scorecard.dayReached}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatusBanner(`Downloaded Lisboa Memory Summary Card (${link.download}).`);
}

if (dom.btnGameOverCopyCard) {
  dom.btnGameOverCopyCard.addEventListener('click', copyMemorySummaryCardToClipboard);
}
if (dom.btnAlbumCopyCard) {
  dom.btnAlbumCopyCard.addEventListener('click', copyMemorySummaryCardToClipboard);
}
if (dom.btnGameOverDownloadCard) {
  dom.btnGameOverDownloadCard.addEventListener('click', downloadMemorySummaryCardFile);
}
if (dom.btnAlbumDownloadCard) {
  dom.btnAlbumDownloadCard.addEventListener('click', downloadMemorySummaryCardFile);
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setActiveTab(btn.dataset.tab);
  });
});

dom.activeContextPanel.addEventListener('click', (event) => {
  if (event.target.closest('[data-disembark-funicular]')) {
    engine.disembarkFunicular();
    refreshUi(true);
    return;
  }
  const boardFunBtn = event.target.closest('[data-board-funicular]');
  if (boardFunBtn) {
    const [funId, fromEnd] = boardFunBtn.dataset.boardFunicular.split('|');
    const res = engine.boardFunicular(funId, fromEnd || 'lower');
    if (res.ok) soundEngine.playEffect('tram-bell');
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-stand-up-bench]')) {
    engine.standUpFromRiversideBench();
    refreshUi(true);
    return;
  }
  const castanhaBtn = event.target.closest('[data-buy-castanha]');
  if (castanhaBtn) {
    const res = engine.buyCastanhaCone(castanhaBtn.dataset.buyCastanha);
    if (res.ok) soundEngine.playEffect('register');
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
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
  if (event.target.closest('[data-sj-ascend]')) {
    const res = engine.ascendSantaJusta();
    if (res.ok) soundEngine.playEffect('metro-chime');
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-sj-descend]')) {
    const res = engine.descendSantaJusta();
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-sj-exit]')) {
    engine.descendSantaJusta({ immediate: true });
    refreshUi(true);
    return;
  }
  const sjLandmarkBtn = event.target.closest('[data-sj-landmark]');
  if (sjLandmarkBtn) {
    engine.lookAtSantaJustaLandmark(sjLandmarkBtn.dataset.sjLandmark);
    refreshUi(true);
    return;
  }
  const cdVisitBtn = event.target.closest('[data-cd-visit]');
  if (cdVisitBtn) {
    const res = engine.interactWithCityDistrictSpot(cdVisitBtn.dataset.cdVisit);
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  const cdBuyBtn = event.target.closest('[data-cd-buy]');
  if (cdBuyBtn) {
    const [spotId, itemId] = cdBuyBtn.dataset.cdBuy.split('|');
    const res = engine.purchaseCityDistrictItem(spotId, itemId);
    if (res.ok) soundEngine.playEffect('register');
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-cd-metro]')) {
    const res = engine.enterMetroFromCityDistrict();
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  const walkAvBtn = event.target.closest('[data-walk-city-avenue]');
  if (walkAvBtn) {
    const res = engine.walkCityAvenue(walkAvBtn.dataset.walkCityAvenue);
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
  if (event.target.closest('[data-ferry-horn]')) {
    engine.soundFerryHorn();
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-metro-chime]')) {
    engine.triggerMetroDoorChime();
    refreshUi(true);
    return;
  }
  if (event.target.closest('[data-next-fado]')) {
    const nextTrack = soundEngine.nextFadoTrack();
    if (mpStatusInfo.status === 'connected') {
      mpClient.requestNextFado();
    }
    if (nextTrack) {
      setStatusBanner(`Now playing Public Domain Fado: ${nextTrack.title} (${nextTrack.performer}).`);
    }
    lastContextSignature = '';
    refreshUi(true);
    return;
  }
  const transferMetroBtn = event.target.closest('[data-transfer-metro-line]');
  if (transferMetroBtn) {
    const res = engine.transferMetroLine(transferMetroBtn.dataset.transferMetroLine);
    if (res.ok && !res.alreadyOnLine) soundEngine.playEffect('metro-chime');
    if (!res.ok && res.error) setStatusBanner(res.error, true);
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
    else if (act === 'toast') {
      engine.triggerSharedToast();
      mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
    } else if (act === 'postcard') {
      engine.triggerSharedPostcard();
      mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
    } else if (act === 'cathedral-bell') {
      engine.triggerCathedralChime();
    }
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
  const walkCityBtn = event.target.closest('[data-walk-city-district]');
  if (walkCityBtn) {
    const targetZone = walkCityBtn.dataset.walkCityDistrict;
    const st = engine.getState();
    if (st.ridingVehicleId || st.ridingFunicularId) return;
    if (st.mode === 'interior') {
      engine.exitVenue();
    } else if (st.mode === 'metro') {
      if (st.metro.phase === 'riding' || st.metro.phase === 'transferring') return;
      engine.exitMetroStation({ immediate: true });
    } else if (st.mode === 'santa-justa') {
      engine.descendSantaJusta({ immediate: true });
    } else if (st.mode === 'ferry') {
      if (st.ferry.phase === 'sailing') return;
      engine.exitFerryTerminal({ immediate: true });
    }

    const node = LISBOA_CITY_MAP_NODES.find((n) => n.id === targetZone);
    if (!node || !Number.isFinite(node.worldX)) {
      setStatusBanner('District street coordinates not found.', true);
      refreshUi(true);
      return;
    }
    const curState = engine.getState();
    const path = buildOverworldPath(curState.player.x, curState.player.y, node.worldX, node.worldY, null);
    engine.setWalkPath(path);
    setStatusBanner(`Walking continuously along Lisboa sidewalks toward ${getLisboaZoneShortName(targetZone)}... (Or catch a nearby Carris Bus / Tram!)`);
    refreshUi(true);
    return;
  }

  const travelCityBtn = event.target.closest('[data-travel-city-metro]');
  if (travelCityBtn) {
    const targetStationId = travelCityBtn.dataset.travelCityMetro;
    const st = engine.getState();
    if (st.mode === 'metro' && (st.metro.phase === 'riding' || st.metro.phase === 'transferring')) {
      return;
    }
    if (st.mode === 'interior') {
      engine.exitVenue();
    } else if (st.mode === 'santa-justa') {
      engine.descendSantaJusta({ immediate: true });
    } else if (st.mode === 'ferry') {
      if (st.ferry.phase === 'sailing') return;
      engine.exitFerryTerminal({ immediate: true });
    }

    const afterSt = engine.getState();
    // If on the unified street, walk to the nearest Metro entrance on foot (no teleporting!)
    if (afterSt.mode !== 'metro') {
      let nearestEntry = ALL_METRO_STATIONS[0];
      let bestDist = Infinity;
      for (const s of ALL_METRO_STATIONS) {
        if (!s.spawnOutside) continue;
        const d = Math.hypot(afterSt.player.x - s.spawnOutside.x, afterSt.player.y - s.spawnOutside.y);
        if (d < bestDist) {
          bestDist = d;
          nearestEntry = s;
        }
      }
      const targetObj = ALL_METRO_STATIONS.find((s) => s.id === targetStationId);
      if (bestDist <= 78) {
        const targetLineIds = getStationLineIds(targetStationId);
        const preferredLine =
          getStationLineIds(nearestEntry).find((l) => targetLineIds.includes(l)) ||
          getStationLineIds(nearestEntry)[0];
        engine.openMetroStation(nearestEntry.id, { lineId: preferredLine });
        const route = computeMetroNetworkRoute(nearestEntry.id, targetStationId, preferredLine);
        setStatusBanner(
          route.isDirect
            ? `Entered ${nearestEntry.name} (${getMetroLineById(preferredLine)?.name}). Board direct toward ${targetObj?.name || targetStationId}!`
            : `Entered ${nearestEntry.name}. To reach ${targetObj?.name || targetStationId}, follow ${route.summary} (transfer at ${route.transferStation}).`
        );
      } else {
        const path = buildOverworldPath(
          afterSt.player.x,
          afterSt.player.y,
          nearestEntry.spawnOutside.x,
          nearestEntry.spawnOutside.y,
          { type: 'openMetro', id: nearestEntry.id }
        );
        engine.setWalkPath(path);
        setStatusBanner(`Walking to nearest entrance (${nearestEntry.name}) to take Metropolitano de Lisboa toward ${targetObj?.name || targetStationId}...`);
      }
      refreshUi(true);
      return;
    }

    const originId = afterSt.metro.stationId || afterSt.activeMetroStationId || 'metro-baixa-chiado';
    if (originId === targetStationId) {
      engine.exitMetroStation();
      refreshUi(true);
      return;
    }

    // Attempt truthful direct ride on current line; if transfer is needed, guide or perform Leg 1 / platform switch!
    const res = engine.rideMetro(originId, targetStationId);
    if (!res.ok) {
      if (res.platformTransferRequired && res.targetLineId) {
        const trRes = engine.transferMetroLine(res.targetLineId);
        if (trRes.ok) soundEngine.playEffect('metro-chime');
        else if (trRes.error) setStatusBanner(trRes.error, true);
      } else if (res.transferRequired) {
        setStatusBanner(res.error, true);
      } else if (res.error) {
        setStatusBanner(res.error, true);
      }
    }
    refreshUi(true);
    return;
  }
  const state = engine.getState();
  if (state.mode === 'interior') {
    engine.exitVenue();
  } else if (state.mode === 'metro') {
    if (state.metro.phase === 'riding' || state.metro.phase === 'transferring') return;
    engine.exitMetroStation({ immediate: true, forceOverworld: true });
  } else if (state.mode === 'santa-justa') {
    engine.descendSantaJusta({ immediate: true, forceOverworld: true });
  } else if (state.mode === 'city-district') {
    engine.completeMetroExitToStreet(null, { forceOverworld: true });
  } else if (state.mode === 'ferry') {
    if (state.ferry.phase === 'sailing') return;
    engine.exitFerryTerminal({ immediate: true });
  }
  if (event.target.closest('[data-walk-santa-justa]')) {
    const path = buildOverworldPath(
      engine.getState().player.x,
      engine.getState().player.y,
      SANTA_JUSTA_LIFT.spawnOutside.x,
      SANTA_JUSTA_LIFT.spawnOutside.y,
      { type: 'openSantaJusta' }
    );
    engine.setWalkPath(path);
    setStatusBanner(`Walking along Rua do Carmo toward ${SANTA_JUSTA_LIFT.name}...`);
    return;
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
    const station = ALL_METRO_STATIONS.find((s) => s.id === metroBtn.dataset.walkMetro);
    if (station && station.spawnOutside) {
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

if (dom.monthSelect) {
  dom.monthSelect.innerHTML = LISBOA_MONTHS.map(
    (m) => `<option value="${m.month}">${escapeHtml(m.name)} (${escapeHtml(m.ptName)})</option>`
  ).join('');
  dom.monthSelect.value = String(engine.getState().month);
  dom.monthSelect.addEventListener('change', () => {
    const selectedMonth = Number(dom.monthSelect.value);
    const info = engine.setMonth(selectedMonth);
    if (mpStatusInfo.status === 'connected') {
      mpClient.setGlobalMonth(info.month);
    }
    soundEngine.update(engine.getState());
    lastUiSignature = '';
    refreshUi(true);
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

if (dom.btnPostcard) {
  dom.btnPostcard.addEventListener('click', () => {
    const res = engine.triggerSharedPostcard();
    mpClient.syncState(engine.getNetworkSnapshot(), { force: true });
    if (res?.postcard) {
      setStatusBanner(`Captured Shared Lisboa Postcard: "${res.postcard.caption}"`);
    }
    refreshUi(true);
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
    } else if (state.mode === 'metro' && state.metro.phase !== 'riding' && state.metro.phase !== 'transferring') {
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
      const st = ALL_METRO_STATIONS.find((s) => s.id === peer.metroStationId);
      if (st && st.spawnOutside) {
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

  engine.tick(dt, getKeyboardVector(dt));
  const state = engine.getState();

  // Trigger subtle audio transition effects & update continuous ambient soundscapes
  if (state.mode === 'interior' && (prevAudioMode !== 'interior' || prevAudioVenueId !== state.currentVenueId)) {
    soundEngine.playEffect('door');
  }
  if (state.mode === 'metro' && prevAudioMode !== 'metro') {
    soundEngine.playEffect('metro-chime');
  }
  if (state.ferryHornSignal && state.ferryHornSignal.id !== lastFerryHornId) {
    lastFerryHornId = state.ferryHornSignal.id;
    soundEngine.playEffect('ferry-horn');
  }
  if (state.metroDoorChime && state.metroDoorChime.id !== lastMetroDoorChimeId) {
    lastMetroDoorChimeId = state.metroDoorChime.id;
    soundEngine.playEffect('metro-door-chime');
  }
  if (state.miradouroEncore && state.miradouroEncore.id !== lastMiradouroEncoreId) {
    lastMiradouroEncoreId = state.miradouroEncore.id;
    soundEngine.playEffect('miradouro-strum');
  }
  if (state.sharedToast && state.sharedToast.id !== lastSharedToastId) {
    lastSharedToastId = state.sharedToast.id;
    soundEngine.playEffect('cafe-toast');
  }
  if (state.cathedralChime && state.cathedralChime.id !== lastCathedralChimeId) {
    lastCathedralChimeId = state.cathedralChime.id;
    soundEngine.playEffect('cathedral-bells');
  }
  if (state.sharedPostcard && state.sharedPostcard.id !== lastSharedPostcardId) {
    lastSharedPostcardId = state.sharedPostcard.id;
    soundEngine.playEffect('camera-shutter');
  }
  const ridingVehNow = engine.getRidingVehicle();
  if (ridingVehNow?.mode === 'tram' && prevAudioRidingId !== state.ridingVehicleId) {
    soundEngine.playEffect('tram-bell');
  }
  if (state.transitAnnouncement && state.transitAnnouncement.id !== lastAnnouncementId) {
    lastAnnouncementId = state.transitAnnouncement.id;
    soundEngine.announceNextStop(state.transitAnnouncement.stopName, {
      mode: state.transitAnnouncement.vehicleMode,
      ringBell: state.transitAnnouncement.ringBell
    });
  }
  if (state.lastTransitIntent && state.lastTransitIntent.id !== lastTransitIntentId) {
    lastTransitIntentId = state.lastTransitIntent.id;
    const intent = state.lastTransitIntent;
    if (mpStatusInfo.status === 'connected') {
      if (intent.action === 'summon-surface') {
        mpClient.requestSurfaceSummon(intent.lineId, intent.stopId);
      } else if (intent.action === 'metro-depart') {
        mpClient.requestMetroDepart(intent.fromStationId, intent.toStationId, intent.triggeredBy);
      } else if (intent.action === 'metro-chime') {
        mpClient.requestMetroChime(intent.fromStationId, intent.toStationId, intent.triggeredBy);
      } else if (intent.action === 'ferry-board') {
        mpClient.requestFerryBoard(intent.routeId, intent.fromPortId, intent.toPortId, intent.triggeredBy);
      } else if (intent.action === 'ferry-horn') {
        mpClient.requestFerryHorn(intent.routeId, intent.fromPortId, intent.toPortId, intent.triggeredBy);
      } else if (intent.action === 'ring-bell') {
        mpClient.requestRingBell(intent.lineId, intent.stopName, intent.ringerName);
      } else if (intent.action === 'miradouro-perform') {
        mpClient.requestMiradouroPerform(intent.spotId, intent.requestedBy);
      } else if (intent.action === 'cafe-toast') {
        mpClient.requestCafeToast(intent);
      } else if (intent.action === 'cathedral-chime') {
        mpClient.requestCathedralChime(intent.hour, intent.triggeredBy);
      } else if (intent.action === 'shared-postcard') {
        mpClient.requestSharedPostcard(intent);
      }
    }
  }
  if (Number.isFinite(state.sharedFadoTrackIndex) && mpStatusInfo.status === 'connected') {
    soundEngine.setFadoTrackIndex(state.sharedFadoTrackIndex);
  }
  prevAudioMode = state.mode;
  prevAudioVenueId = state.currentVenueId;
  prevAudioRidingId = state.ridingVehicleId;
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
