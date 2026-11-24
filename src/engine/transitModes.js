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
import {
  INITIAL_EUROS, INITIAL_ENERGY, INITIAL_FULLNESS, DAY_START_MINUTES, EVENING_SUGGEST_MINUTES, OVERNIGHT_COST_EUR, LOW_FUND_STIPEND_THRESHOLD, LOW_FUND_STIPEND_AMOUNT, PLAYER_RADIUS, PERSON_SEPARATION_DIST, VEHICLE_HALF_LEN, VEHICLE_HALF_WIDTH, VEHICLE_BRAKE_LOOKAHEAD, BASE_WALK_SPEED, INTERIOR_WALK_SPEED, INTERACT_DISTANCE, CRITICAL_LOW_ENERGY_THRESHOLD, PROPORTIONAL_SLOWDOWN_THRESHOLD, VENUE_MAP, METRO_MAP, CITY_DISTRICT_MAP, FERRY_DEST_MAP, REST_SPOT_MAP, RIVERSIDE_BENCH_MAP, CASTANHA_VENDOR_MAP, TRANSIT_LINE_MAP, FUNICULAR_MAP, computeFunicularCarPose, createInitialFuniculars, ALL_STOPS, STOP_MAP, ALL_MEMORIES, SOLID_OVERWORLD_RECTS, FERRY_PIER_ZONES, INTERIOR_STATIONS, METRO_PLATFORM_ZONES, METRO_ESCALATOR_DURATION, METRO_TRANSFER_DURATION, METRO_RIDE_BASE_DURATION, METRO_RIDE_EXTRA_HOP_DURATION, SANTA_JUSTA_RIDE_DURATION, CITY_AVENUE_WALK_DURATION, SOLID_INTERIOR_RECTS, roundMoney, clamp, distance, formatClock, getDayPhase, getVenueById, getMetroStationById, getCityDistrictById, getFerryDestinationById, getRestSpotById, getStopById, getTransitLineById, getItemServingType, circleIntersectsRect, toVehicleLocal, pointIntersectsVehicle, isPedestrianAheadOfVehicle, isPointInVehicleLane, isPointOnSidewalk, isOverworldPositionValid, isInteriorPositionValid, isMetroPlatformPositionValid, isFerryPierPositionValid, isCityDistrictPositionValid, getNextWaypointIndex, findUpcomingStopName, createInitialVehicles, createNpcRecord, createInitialNpcs, createInitialJoggers, recordLog, recordPhrase, unlockMemory, createInitialState
} from './constants.js';

class _Mixin {
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
        this.state.cameraYaw = -Math.PI * 0.5;
        this.state.cameraPitch = 0.04;

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

  openSantaJusta({ fromDistrictId = null } = {}) {
    if (this.state.ridingVehicleId || this.state.ridingFunicularId) {
      return { ok: false, error: 'Step off transit before entering Elevador de Santa Justa.' };
    }
    const returnMode =
      fromDistrictId || this.state.mode === 'city-district' ? 'city-district' : 'overworld';
    const returnDistrictId =
      fromDistrictId || (this.state.mode === 'city-district' ? this.state.cityDistrictId : null);

    this.state.mode = 'santa-justa';
    this.state.activeMetroStationId = null;
    this.state.cityDistrictFeedback = null;
    this.state.seatedDining = null;
    this.state.seatedBenchId = null;
    this.state.seatedBench = null;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.state.cameraYaw = -Math.PI * 0.5;
    this.state.cameraPitch = 0.03;
    this.state.santaJusta = {
      phase: 'lobby',
      phaseProgress: 0,
      altitudeMeters: 0,
      ticketPaid: false,
      returnMode,
      returnDistrictId,
      focusedLandmarkId: 'sj-castelo'
    };

    recordPhrase(this.state, SANTA_JUSTA_LIFT.phrase, SANTA_JUSTA_LIFT.name);
    this.state.statusMessage =
      `Stepped inside ${SANTA_JUSTA_LIFT.name} (Raoul Mesnier du Ponsard, 1902). Board the mahogany cabin to ascend 45m to the panoramic Lisboa miradouro (${SANTA_JUSTA_LIFT.fareEur.toFixed(2)} EUR).`;
    recordLog(this.state, 'venue', 'Entered Elevador de Santa Justa (1902) ground-floor cast-iron lobby.');
    return { ok: true, lift: SANTA_JUSTA_LIFT, state: this.state };
  }

  ascendSantaJusta() {
    if (this.state.mode !== 'santa-justa') {
      return { ok: false, error: 'Enter Elevador de Santa Justa first.' };
    }
    const sj = this.state.santaJusta;
    if (sj.phase !== 'lobby') {
      return { ok: false, error: 'The Santa Justa lift cabin is already moving or at the top miradouro.' };
    }

    const fareToCharge = sj.ticketPaid ? 0 : SANTA_JUSTA_LIFT.fareEur;
    if (fareToCharge > 0 && this.state.euros < fareToCharge) {
      this.state.statusMessage = `Need ${fareToCharge.toFixed(2)} EUR for Elevador de Santa Justa (you have ${this.state.euros.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    if (fareToCharge > 0) {
      this.state.euros = roundMoney(this.state.euros - fareToCharge);
      this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + fareToCharge);
    }
    this.state.stats.santaJustaRides = (this.state.stats.santaJustaRides || 0) + 1;
    this.state.energy = clamp(this.state.energy + 15, 0, 100);
    this.advanceMinutes(SANTA_JUSTA_LIFT.travelMinutes);

    sj.ticketPaid = true;
    sj.phase = 'ascending';
    sj.phaseProgress = 0;
    sj.altitudeMeters = 0;
    this.state.cameraYaw = 0.08;
    this.state.cameraPitch = 0.02;
    this.state.statusMessage =
      `Ascending 45 meters inside the 1902 brass-and-mahogany cabin of Elevador de Santa Justa (-${fareToCharge.toFixed(2)} EUR)...`;
    recordLog(
      this.state,
      'transit',
      `Rode Elevador de Santa Justa up 45m to the panoramic Lisboa miradouro (-${fareToCharge.toFixed(2)} EUR).`
    );
    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();

    return { ok: true, fareEur: fareToCharge, state: this.state };
  }

  completeSantaJustaExit({ forceOverworld = false } = {}) {
    const sj = this.state.santaJusta;
    const returnMode = forceOverworld ? 'overworld' : (sj.returnMode || 'overworld');
    const returnDistrictId = forceOverworld ? null : sj.returnDistrictId;

    this.doorEntryCooldown = 0.55;
    this.state.santaJusta = {
      phase: null,
      phaseProgress: 0,
      altitudeMeters: 0,
      ticketPaid: false,
      returnMode: 'overworld',
      returnDistrictId: null,
      focusedLandmarkId: 'sj-castelo'
    };

    if (returnMode === 'city-district' && returnDistrictId) {
      const dist = getCityDistrictById(returnDistrictId);
      this.state.mode = 'city-district';
      this.state.cityDistrictId = returnDistrictId;
      this.state.player.x = 380;
      this.state.player.y = 216;
      this.state.player.facing = 'down';
      this.state.cameraYaw = -Math.PI * 0.5;
      this.state.cameraPitch = 0.03;
      this.state.statusMessage = `Stepped out of Elevador de Santa Justa back onto ${dist ? dist.name : 'Rossio & Baixa'}.`;
      return { ok: true, mode: 'city-district', state: this.state };
    }

    this.state.mode = 'overworld';
    this.state.cityDistrictId = null;
    this.state.player.x = SANTA_JUSTA_LIFT.spawnOutside.x;
    this.state.player.y = SANTA_JUSTA_LIFT.spawnOutside.y;
    this.state.player.overworldX = SANTA_JUSTA_LIFT.spawnOutside.x;
    this.state.player.overworldY = SANTA_JUSTA_LIFT.spawnOutside.y;
    this.state.player.facing = 'down';
    this.state.cameraYaw = Math.PI * 0.5;
    this.state.cameraPitch = 0.02;
    this.updateNeighborhoodTracking();
    this.state.statusMessage = 'Stepped out of Elevador de Santa Justa onto Rua do Carmo in Chiado / Baixa.';
    return { ok: true, mode: 'overworld', state: this.state };
  }

  descendSantaJusta({ immediate = false, forceOverworld = false } = {}) {
    if (this.state.mode !== 'santa-justa') {
      return { ok: false, error: 'You are not currently inside Elevador de Santa Justa.' };
    }
    const sj = this.state.santaJusta;
    if (immediate || sj.phase === 'lobby' || !sj.phase) {
      return this.completeSantaJustaExit({ forceOverworld });
    }
    if (sj.phase === 'ascending' || sj.phase === 'descending') {
      return { ok: false, error: 'Wait until the Santa Justa lift finishes moving.' };
    }
    sj.phase = 'descending';
    sj.phaseProgress = 0;
    this.state.statusMessage = 'Descending 45m inside the mahogany cabin of Elevador de Santa Justa back to street level (Free return)...';
    return { ok: true, state: this.state };
  }

  lookAtSantaJustaLandmark(landmarkId) {
    if (this.state.mode !== 'santa-justa') {
      return { ok: false, error: 'Ascend Elevador de Santa Justa to inspect landmarks from the 45m miradouro.' };
    }
    const lm = SANTA_JUSTA_PANORAMA_LANDMARKS.find((l) => l.id === landmarkId);
    if (!lm) {
      return { ok: false, error: 'Unknown Lisbon skyline landmark.' };
    }
    const rawRad = ((lm.compassBearing - 90) * Math.PI) / 180;
    this.state.cameraYaw = Math.atan2(Math.sin(rawRad), Math.cos(rawRad));
    this.state.cameraPitch = -0.02;
    this.state.santaJusta.focusedLandmarkId = lm.id;
    this.state.statusMessage = `Santa Justa 45m View (${lm.compassLabel} - ${lm.distanceMeters}m): ${lm.name} (${lm.year}) - ${lm.description}`;
    return { ok: true, landmark: lm, state: this.state };
  }

  updateSantaJustaSimulation(dt, input = { x: 0, y: 0 }) {
    if (this.state.mode !== 'santa-justa') return;
    const sj = this.state.santaJusta;

    if (sj.phase === 'ascending') {
      sj.phaseProgress = Math.min(1, sj.phaseProgress + dt / SANTA_JUSTA_RIDE_DURATION);
      const t = sj.phaseProgress;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      sj.altitudeMeters = Math.round(SANTA_JUSTA_LIFT.heightMeters * ease * 10) / 10;
      this.state.elevationMeters = Math.round(14 + sj.altitudeMeters);

      if (sj.phaseProgress >= 1) {
        sj.phase = 'miradouro';
        sj.phaseProgress = 0;
        sj.altitudeMeters = SANTA_JUSTA_LIFT.heightMeters;
        this.state.elevationMeters = 14 + SANTA_JUSTA_LIFT.heightMeters;
        this.state.visitedSantaJustaMiradouro = true;
        this.state.energy = clamp(this.state.energy + 10, 0, 100);
        this.state.cameraYaw = 0.08;
        this.state.cameraPitch = -0.02;
        sj.focusedLandmarkId = 'sj-castelo';
        this.state.statusMessage =
          'Arrived on the 45m Miradouro of Elevador de Santa Justa! Drag 360 deg (or use A/D & compass buttons) to view Castelo de Sao Jorge (E), Rossio (N), Rua Augusta & Tagus River (S), and Convento do Carmo (W).';
        recordLog(this.state, 'rest', 'Reached the 45m Miradouro of Elevador de Santa Justa overlooking historic Lisboa.');
      }
      return;
    }

    if (sj.phase === 'descending') {
      sj.phaseProgress = Math.min(1, sj.phaseProgress + dt / (SANTA_JUSTA_RIDE_DURATION * 0.85));
      const t = sj.phaseProgress;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      sj.altitudeMeters = Math.round(SANTA_JUSTA_LIFT.heightMeters * (1 - ease) * 10) / 10;
      this.state.elevationMeters = Math.round(14 + sj.altitudeMeters);

      if (sj.phaseProgress >= 1) {
        this.completeSantaJustaExit({ forceOverworld: false });
      }
      return;
    }

    if (sj.phase === 'miradouro') {
      // Allow smooth 360-degree panorama turning via A/D or Left/Right keys and gentle pitch via W/S!
      if (Math.abs(input?.x || 0) > 0.01 || Math.abs(input?.y || 0) > 0.01) {
        this.rotateCamera((input.x || 0) * dt * 1.35, -(input.y || 0) * dt * 0.55);
      }
      this.state.energy = clamp(this.state.energy + dt * 1.5, 0, 100);
      this.state.elevationMeters = 14 + SANTA_JUSTA_LIFT.heightMeters;

      // Determine exact Lisbon landmark centered in the player's current compass bearing!
      const yawDeg = (((this.state.cameraYaw || 0) * 180) / Math.PI + 360) % 360;
      const bearing = (yawDeg + 90) % 360;
      let closest = SANTA_JUSTA_PANORAMA_LANDMARKS[0];
      let bestDelta = 999;
      for (const lm of SANTA_JUSTA_PANORAMA_LANDMARKS) {
        const diff = Math.abs((((lm.compassBearing - bearing + 540) % 360) - 180));
        if (diff < bestDelta) {
          bestDelta = diff;
          closest = lm;
        }
      }
      sj.focusedLandmarkId = closest.id;
    }
  }

  getCurrentCityZoneId() {
    if (this.state.mode === 'city-district' && this.state.cityDistrictId) {
      return this.state.cityDistrictId;
    }
    if (this.state.mode === 'overworld') {
      return 'overworld';
    }
    return null;
  }

  walkCityAvenue(targetZoneId, { immediate = false } = {}) {
    if (this.state.ridingVehicleId || this.state.ridingFunicularId) {
      return { ok: false, error: 'Step off transit before walking along Lisboa avenues.' };
    }
    if (this.state.cityWalk?.active) {
      return { ok: false, error: 'Already strolling along a Lisbon avenue.' };
    }
    const fromZoneId = this.getCurrentCityZoneId();
    if (!fromZoneId) {
      return { ok: false, error: 'Step out onto the street or city plaza to walk to a neighboring Lisbon district.' };
    }
    if (fromZoneId === targetZoneId) {
      return { ok: true, alreadyHere: true, zoneId: fromZoneId, state: this.state };
    }

    const avenues = getWalkingAvenuesFrom(fromZoneId);
    const link = avenues.find((a) => a.toZoneId === targetZoneId || a.id === targetZoneId);
    if (!link) {
      const route = computeLisboaWalkingRoute(fromZoneId, targetZoneId);
      const nextZoneId = route.legs?.[0]?.toZoneId || null;
      const nextName = nextZoneId ? getLisboaZoneShortName(nextZoneId) : 'the neighboring district';
      const msg = route.ok
        ? `Walk step by step across Lisboa: first stroll to ${nextName} along ${route.legs[0].avenueName} (${(route.totalMeters / 1000).toFixed(1)} km total).`
        : 'No walkable avenue found to that destination.';
      this.state.statusMessage = msg;
      return { ok: false, multiStepRequired: true, route, nextZoneId, error: msg, state: this.state };
    }

    // Gentle realistic walking clock & stamina progression along the Lisbon avenue
    this.advanceMinutes(Math.max(4, link.walkMinutes || 8));
    this.state.stats.distanceWalkedPx += (link.distanceMeters || 800) * 6;
    const energyCost = clamp(Math.round((link.distanceMeters || 800) / 450), 1, 6);
    const fullnessCost = clamp(Math.round((link.distanceMeters || 800) / 700), 1, 4);
    this.state.energy = clamp(Math.max(5, this.state.energy - energyCost), 0, 100);
    this.state.fullness = clamp(Math.max(5, this.state.fullness - fullnessCost), 0, 100);

    this.state.seatedDining = null;
    this.state.seatedBenchId = null;
    this.state.seatedBench = null;
    this.state.cityDistrictFeedback = null;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = true;

    this.state.cityWalk = {
      active: true,
      progress: 0,
      duration: CITY_AVENUE_WALK_DURATION,
      fromZoneId,
      toZoneId: link.toZoneId,
      toSlot: link.toSlot,
      avenueName: link.avenueName,
      shortLabel: link.shortLabel,
      distanceMeters: link.distanceMeters,
      walkMinutes: link.walkMinutes,
      sceneryStyle: link.sceneryStyle || 'grand-boulevard'
    };

    const kmText = link.distanceMeters >= 1000 ? `${(link.distanceMeters / 1000).toFixed(1)} km` : `${link.distanceMeters} m`;
    this.state.statusMessage = `Walking on foot along ${link.avenueName} (${kmText}, ~${link.walkMinutes} min) toward ${getLisboaZoneShortName(link.toZoneId)}...`;
    recordLog(this.state, 'walk', `Walked along ${link.avenueName} (${kmText}) toward ${getLisboaZoneShortName(link.toZoneId)}.`);

    if (immediate) {
      return this.completeCityAvenueWalk();
    }
    return { ok: true, link, state: this.state };
  }

  completeCityAvenueWalk() {
    const cw = this.state.cityWalk;
    if (!cw || !cw.active) return { ok: false, state: this.state };
    const { toZoneId, toSlot, avenueName } = cw;

    cw.active = false;
    cw.progress = 0;
    this.doorEntryCooldown = 0.75;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;

    if (toZoneId === 'overworld') {
      const gw = OVERWORLD_CITY_GATEWAYS.find((g) => g.slot === toSlot) || OVERWORLD_CITY_GATEWAYS[2];
      this.state.mode = 'overworld';
      this.state.cityDistrictId = null;
      this.state.activeCityDistrictSpotId = null;
      this.state.cityDistrictFeedback = null;
      this.state.player.x = gw.spawnX;
      this.state.player.y = gw.spawnY;
      this.state.player.overworldX = gw.spawnX;
      this.state.player.overworldY = gw.spawnY;
      if (gw.pushDir === 'west') {
        this.state.player.facing = 'right';
        this.state.cameraYaw = 0;
      } else if (gw.pushDir === 'east') {
        this.state.player.facing = 'left';
        this.state.cameraYaw = Math.PI;
      } else {
        this.state.player.facing = 'down';
        this.state.cameraYaw = Math.PI * 0.5;
      }
      this.state.cameraPitch = 0.02;
      this.updateNeighborhoodTracking();
      this.state.statusMessage = `Walked along ${avenueName} into Historic Central Lisboa (${this.state.currentNeighborhoodName})!`;
      return { ok: true, zoneId: 'overworld', state: this.state };
    }

    const district = getCityDistrictById(toZoneId);
    const portal = CITY_DISTRICT_PORTALS[toSlot] || CITY_DISTRICT_PORTALS.west;
    this.state.mode = 'city-district';
    this.state.cityDistrictId = toZoneId;
    this.state.activeCityDistrictSpotId = null;
    this.state.cityDistrictFeedback = null;
    this.state.player.x = portal.spawnX;
    this.state.player.y = portal.spawnY;
    this.state.player.facing = portal.arriveFacing;
    this.state.cameraYaw = portal.arriveYaw;
    this.state.cameraPitch = 0.03;

    if (!this.state.visitedCityDistricts.includes(toZoneId)) {
      this.state.visitedCityDistricts.push(toZoneId);
    }
    if (district) {
      this.state.currentNeighborhoodName = district.shortName;
      recordPhrase(this.state, district.phrase, district.name);
      this.state.statusMessage = `Arrived on foot via ${avenueName} in ${district.name}! ${district.plazaNote}`;
    } else {
      this.state.statusMessage = `Arrived on foot in ${getLisboaZoneShortName(toZoneId)}.`;
    }
    return { ok: true, zoneId: toZoneId, district, state: this.state };
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
        const curLine = getMetroLineById(m.activeLineId) || getMetroLineById(getStationLineIds(station)[0]);
        const otherLines = getStationLineIds(station).filter((id) => id !== curLine?.id);
        const xferHint = otherLines.length > 0
          ? ` Or take the free Correspondencia corridor to ${getMetroLineById(otherLines[0])?.name}.`
          : '';
        this.state.statusMessage = station
          ? `Arrived on ${station.name} (${curLine ? curLine.name : station.lines[0]} platform). Board a direct ${curLine ? curLine.name : 'Metro'} train or ride the escalator to the street.${xferHint}`
          : 'Arrived on the underground Metro platform.';
      }
      return;
    }

    if (m.phase === 'transferring') {
      m.phaseProgress = Math.min(1, m.phaseProgress + dt / METRO_TRANSFER_DURATION);
      player.isMoving = false;
      m.tunnelOffset = (m.tunnelOffset + dt * 220) % 1200;
      if (m.phaseProgress >= 1) {
        const station = getMetroStationById(m.stationId);
        const nextLineId = m.transferToLineId || getStationLineIds(station)[0];
        const nextLine = getMetroLineById(nextLineId);
        m.activeLineId = nextLineId;
        m.transferToLineId = null;
        m.phase = 'platform';
        m.phaseProgress = 0;
        m.trainX = 380;
        player.x = 380;
        player.y = METRO_PLATFORM_ZONES.escalatorBottomY + 24;
        player.facing = 'down';
        this.state.cameraYaw = Math.PI * 0.5;
        this.state.cameraPitch = 0.02;
        this.state.statusMessage = `Walked through the Correspondencia corridor at ${station ? station.name : 'station'} onto the ${nextLine ? nextLine.name : 'connecting'} platform (free transfer).`;
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
        const curLine = getMetroLineById(m.activeLineId) || getMetroLineById(getStationLineIds(dest)[0]);
        m.stationId = m.toStationId;
        this.state.activeMetroStationId = m.toStationId;
        m.phase = 'platform';
        m.phaseProgress = 0;
        m.trainX = 380;
        player.x = 380;
        player.y = 254;
        player.facing = 'up';
        if (dest) {
          const otherLineIds = getStationLineIds(dest).filter((id) => id !== curLine?.id);
          const xferNote = otherLineIds.length > 0
            ? ` Free Correspondencia transfer available to ${getMetroLineById(otherLineIds[0])?.name}!`
            : '';
          if (dest.spawnOutside) {
            player.overworldX = dest.spawnOutside.x;
            player.overworldY = dest.spawnOutside.y;
            const hood = getNeighborhoodForX(dest.spawnOutside.x);
            this.state.currentNeighborhoodId = hood.id;
            this.state.currentNeighborhoodName = hood.name;
            if (!this.state.visitedNeighborhoods.includes(hood.id)) {
              this.state.visitedNeighborhoods.push(hood.id);
            }
            this.state.statusMessage = `${curLine ? curLine.name : 'Metro'} train arrived at ${dest.name}. Take the ascending escalator to ${hood.name}.${xferNote}`;
          } else if (dest.districtId) {
            const district = getCityDistrictById(dest.districtId);
            this.state.currentNeighborhoodName = district ? district.shortName : (dest.zoneLabel || dest.name);
            this.state.statusMessage = `${curLine ? curLine.name : 'Metro'} train arrived at ${dest.name}. Take the escalator up to explore ${district ? district.name : dest.name}.${xferNote}`;
          }
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
        this.completeMetroExitToStreet(station, { forceOverworld: false });
      }
      return;
    }

    // Platform idle state: gently keep train docked at center
    m.trainX = 380;
  }


  openFerryTerminal() {
    if (this.state.ridingVehicleId || this.state.ridingFunicularId) {
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
    this.state.cameraYaw = Math.PI * 0.5;
    this.state.cameraPitch = 0.02;
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
    this.state.activeSouthBankSpotId = null;
    this.state.southBankFeedback = null;
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
    const routeId = targetPortId === FERRY_TERMINAL.id ? fromPortId : targetPortId;
    this.signalSeq += 1;
    this.lastLocalFerryHornAt = Date.now();
    this.state.ferryHornSignal = {
      id: this.signalSeq,
      routeId,
      fromPortId,
      toPortId: targetPortId,
      triggeredBy: this.state.player.name || 'Traveler',
      text: `Transtejo Foghorn - Sailing toward ${destLabel}`,
      timer: 3.6
    };
    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'ferry-board',
        routeId,
        fromPortId,
        toPortId: targetPortId,
        triggeredBy: this.state.player.name || 'Traveler'
      });
    }
    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();

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

  soundFerryHorn() {
    if (this.state.mode !== 'ferry') {
      return { ok: false, error: 'Step onto a Transtejo ferry pier or catamaran to sound the ferry horn.' };
    }
    const f = this.state.ferry;
    const fromPortId = f.fromPortId || f.portId || FERRY_TERMINAL.id;
    const toPortId = f.toPortId || (f.portId === FERRY_TERMINAL.id ? 'cacilhas' : FERRY_TERMINAL.id);
    const routeId = toPortId === FERRY_TERMINAL.id ? (fromPortId === FERRY_TERMINAL.id ? 'cacilhas' : fromPortId) : toPortId;
    const destInfo = getFerryDestinationById(toPortId);
    const toLabel =
      toPortId === FERRY_TERMINAL.id
        ? FERRY_TERMINAL.shortName
        : (destInfo?.shortName || destInfo?.name || 'Tagus South Bank');
    const ringer = this.state.player.name || 'Traveler';

    this.signalSeq += 1;
    this.lastLocalFerryHornAt = Date.now();
    this.state.ferryHornSignal = {
      id: this.signalSeq,
      routeId,
      fromPortId,
      toPortId,
      triggeredBy: ringer,
      text: `Transtejo Foghorn - Sailing toward ${toLabel}`,
      timer: 3.6
    };
    this.state.statusMessage = `Sounded the Transtejo catamaran foghorn across the Tagus (${toLabel})!`;
    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'ferry-horn',
        routeId,
        fromPortId,
        toPortId,
        triggeredBy: ringer
      });
    }
    return { ok: true, hornSignal: this.state.ferryHornSignal, state: this.state };
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
    this.state.activeSouthBankSpotId = null;
    this.state.southBankFeedback = null;
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
    this.state.activeSouthBankSpotId = spot.id;
    this.announcementSeq += 1;

    if (spot.id === 'rossio-santa-justa-lift') {
      return this.openSantaJusta({ fromDistrictId: district.id });
    }

    if (spot.kind === 'landmark') {
      const before = this.state.energy;
      this.state.energy = clamp(this.state.energy + 25, 0, 100);
      const gained = Math.round(this.state.energy - before);
      this.state.stats.restsTaken += 1;
      this.advanceMinutes(15);
      this.state.statusMessage = `Explored ${spot.name} in ${dest.shortName} (+25 Energy restored). ${spot.note}`;
      this.state.southBankFeedback = {
        id: this.announcementSeq,
        spotId: spot.id,
        title: `${spot.name} (${dest.shortName})`,
        speaker: spot.host,
        badge: spot.badge,
        text: spot.note,
        actionHint: gained > 0
          ? `Sea-breeze rest complete (+${gained} Energy -> ${Math.round(this.state.energy)}/100)`
          : `Refreshed at full Energy (${Math.round(this.state.energy)}/100) overlooking the Tagus`,
        timer: 7.5
      };
      recordLog(this.state, 'rest', `Visited ${spot.name} across the Tagus in ${dest.shortName} (+25 Energy).`);
    } else {
      const menuLine = (spot.items || [])
        .map((it, idx) => `[${idx + 1}] ${it.name} (${it.costEur.toFixed(2)} EUR)`)
        .join('   |   ');
      this.state.statusMessage = `${spot.host} at ${spot.name} (${dest.shortName}): "${spot.note}" Press [1] or [2] to order/buy, or use the right panel.`;
      this.state.southBankFeedback = {
        id: this.announcementSeq,
        spotId: spot.id,
        title: `${spot.name}  -  Host: ${spot.host}`,
        speaker: spot.host,
        badge: spot.badge,
        text: spot.note,
        actionHint: menuLine ? `Quick Order: ${menuLine}` : 'Browse items in the right panel',
        timer: 8.5
      };
      recordLog(this.state, 'venue', `Explored ${spot.name} across the Tagus in ${dest.shortName}.`);
    }
    return { ok: true, dest, spot, feedback: this.state.southBankFeedback, state: this.state };
  }

  purchaseActiveSouthBankItemByIndex(itemIndex) {
    if (this.state.mode !== 'ferry' || this.state.ferry.phase !== 'terminal') {
      return { ok: false, error: 'Explore a south-bank eatery or shop first.' };
    }
    const dest = getFerryDestinationById(this.state.ferry.portId);
    const nearby = this.getNearbyInteraction();
    const spotId =
      this.state.activeSouthBankSpotId ||
      (nearby?.type === 'south-bank-spot' ? nearby.spotId : null);
    const spot = dest?.townSpots?.find((s) => s.id === spotId);
    const item = spot?.items?.[itemIndex];
    if (!spot || !item) {
      return { ok: false, error: 'No menu item selected at this south-bank spot.' };
    }
    return this.purchaseSouthBankItem(spot.id, item.id);
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
      this.state.needsMealToRecoverSpeed = false;
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

    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();
    return { ok: true, dest, spot, item, state: this.state };
  }

  openMetroStation(stationId, { lineId = null } = {}) {
    if (this.state.ridingVehicleId || this.state.ridingFunicularId) {
      return { ok: false, error: 'Step off surface transit before descending into the Metro.' };
    }
    if (this.state.mode === 'interior') {
      return { ok: false, error: 'Step outside onto the sidewalk before entering the Metro.' };
    }
    const station = getMetroStationById(stationId);
    if (!station) {
      return { ok: false, error: `Unknown metro station: ${stationId}` };
    }

    const stationLineIds = getStationLineIds(station);
    const chosenLineId = lineId && stationLineIds.includes(lineId) ? lineId : stationLineIds[0];
    const chosenLine = getMetroLineById(chosenLineId);

    this.state.mode = 'metro';
    this.state.activeMetroStationId = station.id;
    this.state.seatedDining = null;
    this.state.indoorActivity = null;
    this.state.cityDistrictFeedback = null;
    if (!this.state.visitedMetroStations.includes(station.id)) {
      this.state.visitedMetroStations.push(station.id);
    }
    if (station.spawnOutside) {
      this.state.player.overworldX = station.spawnOutside.x;
      this.state.player.overworldY = station.spawnOutside.y;
    }
    this.state.player.x = 380;
    this.state.player.y = METRO_PLATFORM_ZONES.escalatorTopY;
    this.state.player.facing = 'down';
    this.state.cameraYaw = Math.PI * 0.5;
    this.state.cameraPitch = 0.02;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;

    this.state.metro = {
      stationId: station.id,
      activeLineId: chosenLineId,
      transferToLineId: null,
      ticketPaid: false,
      phase: 'descending',
      phaseProgress: 0,
      fromStationId: station.id,
      toStationId: null,
      rideDuration: METRO_RIDE_BASE_DURATION,
      direction: 1,
      trainX: -260,
      tunnelOffset: 0,
      route: null
    };

    this.state.statusMessage = `Descending the escalators into ${station.name} (${chosenLine ? chosenLine.name : station.lines[0]} platform)...`;
    recordLog(this.state, 'metro', `Entered ${station.name} underground station (${chosenLine ? chosenLine.name : station.lines[0]}).`);
    return { ok: true, station, activeLineId: chosenLineId, state: this.state };
  }

  completeMetroExitToStreet(station, { forceOverworld = false } = {}) {
    const m = this.state.metro;
    const player = this.state.player;
    this.state.activeMetroStationId = null;
    this.doorEntryCooldown = 0.55;
    m.phase = null;
    m.phaseProgress = 0;
    m.stationId = null;
    m.activeLineId = null;
    m.transferToLineId = null;
    m.ticketPaid = false;
    m.fromStationId = null;
    m.toStationId = null;
    m.route = null;

    // Unified continuous open-world Lisboa: every one of the 12 Metro stations ascends directly onto its real street sidewalk!
    this.state.mode = 'overworld';
    this.state.cityDistrictId = null;
    this.state.activeCityDistrictSpotId = null;
    this.state.cityDistrictFeedback = null;
    this.state.seatedDining = null;
    this.state.indoorActivity = null;
    player.walkTarget = null;
    player.walkQueue = [];
    player.isMoving = false;

    const district = station?.districtId ? getCityDistrictById(station.districtId) : null;
    if (station && station.spawnOutside) {
      player.x = station.spawnOutside.x;
      player.y = station.spawnOutside.y;
      player.overworldX = station.spawnOutside.x;
      player.overworldY = station.spawnOutside.y;
      if (station.id === 'metro-aeroporto') {
        player.facing = 'up';
        this.state.cameraYaw = -Math.PI * 0.36;
        this.state.cameraPitch = 0.08;
      } else if (station.id === 'metro-oriente') {
        player.facing = 'down';
        this.state.cameraYaw = Math.PI * 0.28;
        this.state.cameraPitch = 0.03;
      } else {
        player.facing = 'down';
        this.state.cameraYaw = Math.PI * 0.5;
        this.state.cameraPitch = 0.02;
      }
      if (station.districtId && !this.state.visitedCityDistricts.includes(station.districtId)) {
        this.state.visitedCityDistricts.push(station.districtId);
      }
      if (district) {
        recordPhrase(this.state, district.phrase, district.name);
        recordLog(this.state, 'metro', `Emerged onto the street at ${district.name} (${district.transitSummary}).`);
      }
      this.updateNeighborhoodTracking();
      this.state.statusMessage = district
        ? `Rode the escalator up from ${station.name} directly onto ${district.name} sidewalks! Walk naturally or catch Carris buses and trams.`
        : `Rode the escalator up from ${station.name} onto the Lisboa sidewalk.`;
    } else {
      player.x = player.overworldX || 950;
      player.y = player.overworldY || 544;
      player.facing = 'down';
      this.updateNeighborhoodTracking();
      this.state.statusMessage = 'Returned to Lisboa sidewalks.';
    }
    return { ok: true, station, district, state: this.state };
  }

  exitMetroStation({ immediate = false, forceOverworld = false } = {}) {
    if (this.state.mode !== 'metro') {
      return { ok: false, error: 'You are not currently inside a Metro station.' };
    }
    if (this.state.metro.phase === 'riding' || this.state.metro.phase === 'transferring') {
      return { ok: false, error: 'Wait until your Metro train or Correspondencia transfer completes before exiting.' };
    }

    const station = getMetroStationById(this.state.metro.stationId);
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];

    if (immediate) {
      return this.completeMetroExitToStreet(station, { forceOverworld });
    }

    this.state.metro.phase = 'ascending';
    this.state.metro.phaseProgress = 0;
    this.state.player.x = 380;
    this.state.player.y = METRO_PLATFORM_ZONES.escalatorBottomY;
    this.state.player.facing = 'up';
    const exitTargetLabel =
      station && station.districtId
        ? (getCityDistrictById(station.districtId)?.shortName || station.name)
        : (station ? station.name : 'street');
    this.state.statusMessage = `Riding the escalator up to ${exitTargetLabel} exit...`;
    return { ok: true, station, state: this.state };
  }

  closeMetroStation() {
    if (this.state.mode === 'metro') {
      return this.exitMetroStation();
    }
    this.state.activeMetroStationId = null;
    return { ok: true, state: this.state };
  }

  enterMetroFromCityDistrict() {
    if (this.state.mode !== 'city-district') {
      return { ok: false, error: 'You are not currently in a city district plaza.' };
    }
    const district = this.getCurrentCityDistrict();
    const stationId = district?.stationId || 'metro-baixa-chiado';
    return this.openMetroStation(stationId);
  }

  interactWithCityDistrictSpot(spotId) {
    if (this.state.mode !== 'overworld' && this.state.mode !== 'city-district') {
      return { ok: false, error: 'Step onto the Lisbon street to visit this location.' };
    }
    const spot = CITY_DISTRICT_SPOTS.find((s) => s.id === spotId) || null;
    const district = spot ? getCityDistrictById(spot.districtId) : this.getCurrentCityDistrict();
    if (!district || !spot) {
      return { ok: false, error: 'City district location not found.' };
    }
    this.state.activeCityDistrictSpotId = spot.id;
    this.announcementSeq += 1;

    if (spot.id === 'rossio-santa-justa-lift') {
      return this.openSantaJusta();
    }

    if (spot.kind === 'landmark') {
      const before = this.state.energy;
      this.state.energy = clamp(this.state.energy + 25, 0, 100);
      const gained = Math.round(this.state.energy - before);
      this.state.stats.restsTaken += 1;
      this.advanceMinutes(15);
      recordPhrase(this.state, district.phrase, district.name);
      this.state.statusMessage = `Explored ${spot.name} in ${district.shortName} (+25 Energy restored). ${spot.note}`;
      this.state.cityDistrictFeedback = {
        id: this.announcementSeq,
        spotId: spot.id,
        title: `${spot.name} (${district.shortName})`,
        speaker: spot.host,
        badge: spot.badge,
        text: spot.note,
        actionHint: gained > 0
          ? `Landmark & transit visit complete (+${gained} Energy -> ${Math.round(this.state.energy)}/100) | ${district.transitSummary}`
          : `Refreshed at full Energy (${Math.round(this.state.energy)}/100) | ${district.transitSummary}`,
        timer: 8.5
      };
      recordLog(this.state, 'rest', `Visited ${spot.name} in ${district.shortName} (+25 Energy).`);
    } else {
      const menuLine = (spot.items || [])
        .map((it, idx) => `[${idx + 1}] ${it.name} (${it.costEur.toFixed(2)} EUR)`)
        .join('   |   ');
      this.state.statusMessage = `${spot.host} at ${spot.name} (${district.shortName}): "${spot.note}" Press [1] or [2] to order/buy, or use the right panel.`;
      this.state.cityDistrictFeedback = {
        id: this.announcementSeq,
        spotId: spot.id,
        title: `${spot.name}  -  Host: ${spot.host}`,
        speaker: spot.host,
        badge: spot.badge,
        text: spot.note,
        actionHint: menuLine ? `Quick Order: ${menuLine}` : 'Browse items in the right panel',
        timer: 9.0
      };
      recordLog(this.state, 'venue', `Explored ${spot.name} in ${district.shortName}.`);
    }
    return { ok: true, district, spot, feedback: this.state.cityDistrictFeedback, state: this.state };
  }

  purchaseActiveCityDistrictItemByIndex(itemIndex) {
    if (this.state.mode !== 'overworld' && this.state.mode !== 'city-district') {
      return { ok: false, error: 'Explore a Lisbon eatery or shop first.' };
    }
    const nearby = this.getNearbyInteraction();
    const spotId =
      (nearby?.type === 'city-district-spot' ? nearby.spotId : null) ||
      this.state.activeCityDistrictSpotId;
    const spot = CITY_DISTRICT_SPOTS.find((s) => s.id === spotId) || null;
    const item = spot?.items?.[itemIndex];
    if (!spot || !item) {
      return { ok: false, error: 'No menu item selected at this location.' };
    }
    return this.purchaseCityDistrictItem(spot.id, item.id);
  }

  purchaseCityDistrictItem(spotId, itemId) {
    if (this.state.mode !== 'overworld' && this.state.mode !== 'city-district') {
      return { ok: false, error: 'Walk up to a Lisbon eatery or shop before ordering or shopping.' };
    }
    const spot = CITY_DISTRICT_SPOTS.find((s) => s.id === spotId) || null;
    const district = spot ? getCityDistrictById(spot.districtId) : this.getCurrentCityDistrict();
    const item = spot?.items?.find((i) => i.id === itemId);
    if (!district || !spot || !item) {
      return { ok: false, error: 'Item not available at this location.' };
    }
    if (this.state.euros < item.costEur) {
      this.state.statusMessage = `Not enough EUR (${this.state.euros.toFixed(2)} EUR) for ${item.name} (${item.costEur.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    this.state.euros = roundMoney(this.state.euros - item.costEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + item.costEur);
    this.state.fullness = clamp(this.state.fullness + (item.fullnessDelta || 0), 0, 100);
    this.state.energy = clamp(this.state.energy + (item.energyDelta || 0), 0, 100);

    if (item.kind === 'food' || item.kind === 'drink') {
      const servingType = getItemServingType(item);
      const isGlass = servingType === 'glass';
      const glassStyle = item.glassStyle || (isGlass ? 'drink' : null);
      this.state.needsMealToRecoverSpeed = false;
      this.state.stats.mealsEaten += 1;
      if (!this.state.tastedFoods.some((f) => f.id === item.id)) {
        this.state.tastedFoods.push({
          id: item.id,
          name: item.name,
          servingType,
          venueName: `${spot.name} (${district.shortName})`,
          day: this.state.day
        });
      }
      const seatX = spot.spawnOutside ? spot.spawnOutside.x : this.state.player.x;
      const seatY = spot.spawnOutside ? spot.spawnOutside.y : this.state.player.y;
      this.state.player.x = seatX;
      this.state.player.y = seatY;
      this.state.player.overworldX = seatX;
      this.state.player.overworldY = seatY;
      this.state.player.facing = 'up';
      this.state.player.walkTarget = null;
      this.state.player.walkQueue = [];
      this.state.player.isMoving = false;
      this.state.seatedDining = {
        active: true,
        servingType,
        glassStyle,
        itemId: item.id,
        itemName: item.name,
        costEur: item.costEur,
        fullnessDelta: item.fullnessDelta || 0,
        energyDelta: item.energyDelta || 0,
        venueId: spot.id,
        venueName: `${spot.name} (${district.shortName})`,
        seatX,
        seatY,
        tableX: seatX,
        tableY: seatY - 14,
        plateX: seatX,
        plateY: seatY - 14
      };
      this.state.indoorActivity = {
        type: 'dining',
        servingType,
        glassStyle,
        itemId: item.id,
        itemName: item.name,
        costEur: item.costEur,
        fullnessDelta: item.fullnessDelta || 0,
        energyDelta: item.energyDelta || 0,
        venueId: spot.id,
        venueName: spot.name,
        proprietor: spot.host,
        timer: 14.0
      };
      this.advanceMinutes(isGlass ? 12 : 18);
      unlockMemory(this.state, MILESTONE_MEMORIES.taste);
      const purchaseMsg = isGlass
        ? `Received a glass of ${item.name} and sat at the terrace table in ${spot.name} (${district.shortName}) (-${item.costEur.toFixed(2)} EUR, +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy).`
        : `Received a plate of ${item.name} and sat at the dining table in ${spot.name} (${district.shortName}) (-${item.costEur.toFixed(2)} EUR, +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy).`;
      this.triggerSharedToast({ itemName: item.name, preserveIndoorActivity: true });
      this.state.statusMessage = purchaseMsg;
      recordLog(
        this.state,
        'dining',
        `Ordered ${item.name} (${isGlass ? 'served in a glass' : 'served on a plate'}) at ${spot.name} in ${district.shortName} (-${item.costEur.toFixed(2)} EUR).`
      );
    } else {
      this.state.seatedDining = null;
      this.state.stats.souvenirsBought += 1;
      this.state.satchel.push({
        id: item.id,
        name: item.name,
        venueName: spot.name,
        neighborhood: district.name,
        costEur: item.costEur,
        day: this.state.day
      });
      this.state.indoorActivity = {
        type: 'souvenir',
        itemId: item.id,
        itemName: item.name,
        costEur: item.costEur,
        venueId: spot.id,
        venueName: spot.name,
        proprietor: spot.host,
        timer: 12.0
      };
      this.advanceMinutes(10);
      unlockMemory(this.state, MILESTONE_MEMORIES.keepsake);
      this.state.statusMessage = `Wrapped ${item.name} at ${spot.name} (${district.shortName}) and added it to your satchel (-${item.costEur.toFixed(2)} EUR).`;
      recordLog(this.state, 'shop', `Bought ${item.name} at ${spot.name} in ${district.shortName} (-${item.costEur.toFixed(2)} EUR).`);
    }

    recordPhrase(this.state, district.phrase, district.name);
    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();
    return { ok: true, district, spot, item, state: this.state };
  }

  transferMetroLine(targetLineId) {
    if (this.state.mode !== 'metro') {
      return { ok: false, error: 'Enter a Metropolitano de Lisboa interchange station first to change lines.' };
    }
    if (this.state.metro.phase !== 'platform') {
      return { ok: false, error: 'Wait until you reach the station platform before taking a transfer corridor.' };
    }
    const station = getMetroStationById(this.state.metro.stationId);
    if (!station) {
      return { ok: false, error: 'Current Metro station not found.' };
    }
    const stationLineIds = getStationLineIds(station);
    const currentLineId = this.state.metro.activeLineId || stationLineIds[0];
    const targetLine = getMetroLineById(targetLineId);
    if (!targetLine || !stationLineIds.includes(targetLineId)) {
      const servedNames = stationLineIds.map((id) => getMetroLineById(id)?.name || id).join(' & ');
      const msg = `${station.name} only serves ${servedNames} and does not connect to ${targetLine ? targetLine.name : targetLineId}. Ride to a transfer hub first!`;
      this.state.statusMessage = msg;
      return { ok: false, error: msg, state: this.state };
    }
    if (targetLineId === currentLineId) {
      return { ok: true, alreadyOnLine: true, activeLineId: currentLineId, state: this.state };
    }

    const fromLine = getMetroLineById(currentLineId);
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.state.metro.phase = 'transferring';
    this.state.metro.phaseProgress = 0;
    this.state.metro.transferToLineId = targetLineId;
    this.advanceMinutes(2);

    this.state.statusMessage = `Walking through the Correspondencia underground passage at ${station.name} from ${fromLine ? fromLine.name : currentLineId} to ${targetLine.name} (Free transfer)...`;
    recordLog(this.state, 'metro', `Transferred at ${station.name} from ${fromLine ? fromLine.name : currentLineId} to ${targetLine.name} (Correspondencia).`);
    return {
      ok: true,
      station,
      fromLineId: currentLineId,
      toLineId: targetLineId,
      state: this.state
    };
  }

  rideMetro(fromStationId, toStationId) {
    if (this.state.ridingVehicleId || this.state.mode === 'interior') {
      return { ok: false, error: 'Enter a Metro station before riding the Metro.' };
    }
    if (this.state.mode === 'metro' && (this.state.metro.phase === 'riding' || this.state.metro.phase === 'transferring')) {
      return { ok: false, error: 'Wait until your current Metro ride or transfer completes.' };
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

    const originLineIds = getStationLineIds(origin);
    const destLineIds = getStationLineIds(destination);
    const currentLineId =
      this.state.mode === 'metro' &&
        this.state.metro.stationId === origin.id &&
        this.state.metro.activeLineId &&
        originLineIds.includes(this.state.metro.activeLineId)
        ? this.state.metro.activeLineId
        : originLineIds[0];
    const currentLine = getMetroLineById(currentLineId);
    const sharedLineIds = originLineIds.filter((id) => destLineIds.includes(id));

    // STRICT FACTUAL RULE 1: Cannot directly board a destination that is NOT on ANY line served by this station!
    if (sharedLineIds.length === 0) {
      const plannedRoute = computeMetroNetworkRoute(origin.id, destination.id, currentLineId);
      const firstLeg = plannedRoute.legs[0];
      const nextLegStationId = firstLeg?.toStationId || plannedRoute.transferStationId;
      const transferName = plannedRoute.transferStation || 'a transfer hub';
      const destLineLabel = destLineIds.map((id) => getMetroLineById(id)?.name || id).join(' / ');
      const originLineLabel = originLineIds.map((id) => getMetroLineById(id)?.name || id).join(' / ');
      const firstLineName = firstLeg?.lineName || (currentLine ? currentLine.name : originLineLabel);
      const msg = `Cannot board ${destLineLabel} directly at ${origin.name} (${originLineLabel} only). Ride ${firstLineName} to ${transferName} first, then transfer lines!`;
      this.state.statusMessage = msg;
      return {
        ok: false,
        transferRequired: true,
        transferStationId: plannedRoute.transferStationId,
        transferStationName: plannedRoute.transferStation,
        nextLegStationId,
        nextLegLineId: firstLeg?.lineId || currentLineId,
        route: plannedRoute,
        error: msg,
        state: this.state
      };
    }

    // STRICT FACTUAL RULE 2: At a 2-line transfer hub, if standing on the OTHER line's platform, must transfer platforms first!
    if (!sharedLineIds.includes(currentLineId)) {
      const requiredLineId = sharedLineIds[0];
      const requiredLine = getMetroLineById(requiredLineId);
      const msg = `You are on the ${currentLine ? currentLine.name : currentLineId} platform at ${origin.name}. Walk through the free Correspondencia transfer corridor to the ${requiredLine ? requiredLine.name : requiredLineId} platform to board toward ${destination.name}!`;
      this.state.statusMessage = msg;
      return {
        ok: false,
        platformTransferRequired: true,
        targetLineId: requiredLineId,
        targetLineName: requiredLine ? requiredLine.name : requiredLineId,
        error: msg,
        state: this.state
      };
    }

    // Valid direct single-line ride along `currentLineId`!
    const route = computeMetroNetworkRoute(origin.id, destination.id, currentLineId);
    const alreadyPaidInsideGates = this.state.mode === 'metro' && Boolean(this.state.metro.ticketPaid);
    const fareToCharge = alreadyPaidInsideGates ? 0 : METRO_LINE.fareEur;

    if (fareToCharge > 0 && this.state.euros < fareToCharge) {
      this.state.statusMessage = `Need ${fareToCharge.toFixed(2)} EUR for Metropolitano de Lisboa (you have ${this.state.euros.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    if (fareToCharge > 0) {
      this.state.euros = roundMoney(this.state.euros - fareToCharge);
      this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + fareToCharge);
    }
    this.state.stats.metroRides += 1;
    this.state.energy = clamp(this.state.energy + 4, 0, 100);
    this.advanceMinutes(Math.max(METRO_LINE.travelMinutes, route.travelMinutes || 6));

    if (!this.state.visitedMetroStations.includes(origin.id)) {
      this.state.visitedMetroStations.push(origin.id);
    }
    if (!this.state.visitedMetroStations.includes(destination.id)) {
      this.state.visitedMetroStations.push(destination.id);
    }

    const originIdxOnLine = currentLine ? currentLine.stations.indexOf(origin.canonicalStopName || '') : 0;
    const destIdxOnLine = currentLine ? currentLine.stations.indexOf(destination.canonicalStopName || '') : 1;
    const hops = Math.max(1, Math.min(4, route.hopCount || 1));
    const direction = destIdxOnLine >= originIdxOnLine ? 1 : -1;
    const rideDuration =
      METRO_RIDE_BASE_DURATION + (hops - 1) * (METRO_RIDE_EXTRA_HOP_DURATION * 0.65);

    this.state.mode = 'metro';
    this.state.activeMetroStationId = origin.id;
    this.state.seatedDining = null;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.state.metro = {
      stationId: origin.id,
      activeLineId: currentLineId,
      transferToLineId: null,
      ticketPaid: true,
      phase: 'riding',
      phaseProgress: 0,
      fromStationId: origin.id,
      toStationId: destination.id,
      rideDuration,
      direction,
      trainX: 380,
      tunnelOffset: 0,
      route
    };

    const newPhrase = recordPhrase(this.state, METRO_LINE.phrase, METRO_LINE.name);
    const newMemory = unlockMemory(this.state, METRO_LINE.memory);

    const fareText = fareToCharge > 0 ? `-${fareToCharge.toFixed(2)} EUR` : 'Transfer Included - 0.00 EUR';
    this.state.statusMessage = `Boarded ${currentLine ? currentLine.name : 'Metropolitano de Lisboa'} from ${origin.name} toward ${destination.name} (${route.hopCount} ${route.hopCount === 1 ? 'stop' : 'stops'}, ${fareText}).`;
    recordLog(this.state, 'metro', `Boarded ${currentLine ? currentLine.name : 'Metro'} from ${origin.name} to ${destination.name} (${fareText}).`);
    const destShort = destination.name.replace('Metro ', '');
    this.signalSeq += 1;
    this.lastLocalMetroChimeAt = Date.now();
    this.state.metroDoorChime = {
      id: this.signalSeq,
      stationId: origin.id,
      toStationId: destination.id,
      triggeredBy: this.state.player.name || 'Traveler',
      text: `Atencao as portas - Doors closing for ${destShort}`,
      timer: 3.4
    };
    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'metro-depart',
        fromStationId: origin.id,
        toStationId: destination.id,
        triggeredBy: this.state.player.name || 'Traveler'
      });
    }
    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();

    return {
      ok: true,
      origin,
      destination,
      activeLineId: currentLineId,
      fareEur: fareToCharge,
      route,
      newPhrase,
      newMemory,
      state: this.state
    };
  }

  triggerMetroDoorChime() {
    if (this.state.mode !== 'metro') {
      return { ok: false, error: 'Step into a Metro station or train to sound the door-closing chime.' };
    }
    const m = this.state.metro;
    const fromId = m.fromStationId || m.stationId || this.state.activeMetroStationId;
    const toId =
      m.toStationId ||
      METRO_STATIONS.find((s) => s.id !== fromId)?.id ||
      ALL_METRO_STATIONS.find((s) => s.id !== fromId)?.id ||
      fromId;
    const dest = getMetroStationById(toId);
    const destShort = dest ? dest.name.replace('Metro ', '') : 'Metropolitano de Lisboa';
    const ringer = this.state.player.name || 'Traveler';

    this.signalSeq += 1;
    this.lastLocalMetroChimeAt = Date.now();
    this.state.metroDoorChime = {
      id: this.signalSeq,
      stationId: fromId,
      toStationId: toId,
      triggeredBy: ringer,
      text: `Atencao as portas - Doors closing for ${destShort}`,
      timer: 3.4
    };
    this.state.statusMessage = `Metropolitano de Lisboa door-closing chime: "Atencao as portas - Doors closing for ${destShort}!"`;
    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'metro-chime',
        fromStationId: fromId,
        toStationId: toId,
        triggeredBy: ringer
      });
    }
    return { ok: true, doorChime: this.state.metroDoorChime, state: this.state };
  }


  boardTransitAtStop(stopId, { waitIfApproaching = true } = {}) {
    if (this.state.mode !== 'overworld') {
      return { ok: false, error: 'Step outside onto the street before boarding transit.' };
    }
    if (this.state.ridingVehicleId || this.state.ridingFunicularId) {
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
      if (this.globalTransitSynced) {
        const companionAboard = (this.state.remotePlayers || []).some(
          (rp) => rp.ridingVehicleId === vehicle.id
        );
        if (companionAboard) {
          const distM = Math.round(distance(vehicle.x, vehicle.y, stop.x, stop.y));
          this.state.statusMessage = `${line.name} is en route with your companion (${distM}m away). Wait at ${stop.stopName} to hop aboard together!`;
          return { ok: false, error: this.state.statusMessage, state: this.state };
        }
        this.emitTransitIntent({ action: 'summon-surface', lineId: line.id, stopId: stop.stopId });
      }
      vehicle.x = stop.x;
      vehicle.y = stop.y;
      vehicle.targetX = stop.x;
      vehicle.targetY = stop.y;
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
    const newMemory = line.memory ? unlockMemory(this.state, line.memory) : false;

    this.state.statusMessage = `Boarded ${line.name} at ${stop.stopName} (-${line.fareEur.toFixed(2)} EUR). Heading toward ${vehicle.nextStopName}. Press [E] to ring bell for the next stop.`;
    recordLog(this.state, 'transit', `Boarded ${line.name} at ${stop.stopName} (-${line.fareEur.toFixed(2)} EUR).`);
    this.checkWalletGameOver();

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
    vehicle.stopBellRung = true;
    this.lastLocalBellAt = Date.now();
    const cleanNextStop = String(vehicle.nextStopName || 'Next Stop').split(' (')[0];
    this.announcementSeq += 1;
    this.state.transitAnnouncement = {
      id: this.announcementSeq,
      stopName: cleanNextStop,
      text: `Proxima Paragem: ${cleanNextStop}`,
      vehicleMode: line.mode,
      ringerName: this.state.player.name,
      ringBell: true,
      timer: 5.0
    };
    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'ring-bell',
        lineId: vehicle.id,
        stopName: cleanNextStop,
        ringerName: this.state.player.name
      });
    }
    this.state.statusMessage = `Bell rung aboard ${line.name} - Proxima Paragem: ${cleanNextStop}.`;
    return {
      ok: true,
      alighted: false,
      queuedStop: vehicle.nextStopName,
      announcement: this.state.transitAnnouncement,
      state: this.state
    };
  }


  updateFuniculars(dt) {
    for (const fun of this.state.funiculars || []) {
      if (fun.dwellRemaining > 0) {
        fun.dwellRemaining = Math.max(0, fun.dwellRemaining - dt);
        continue;
      }
      const rate = 1 / Math.max(2.5, fun.rideDurationSec || 5.5);
      fun.progress += rate * dt * fun.dir;
      if (fun.progress >= 1) {
        fun.progress = 1;
        fun.dir = -1;
        fun.dwellRemaining = 2.4;
      } else if (fun.progress <= 0) {
        fun.progress = 0;
        fun.dir = 1;
        fun.dwellRemaining = 2.4;
      }
    }
  }

  boardFunicular(funicularId, fromEnd = 'lower') {
    if (this.state.mode !== 'overworld' || this.state.ridingVehicleId || this.state.ridingFunicularId) {
      return { ok: false, error: 'Step onto the street before boarding a Lisbon funicular.' };
    }
    const fun = (this.state.funiculars || []).find((f) => f.id === funicularId);
    if (!fun) {
      return { ok: false, error: `Unknown Lisbon funicular: ${funicularId}` };
    }
    if (this.state.euros < fun.fareEur) {
      this.state.statusMessage = `Need ${fun.fareEur.toFixed(2)} EUR to ride ${fun.shortName} (you have ${this.state.euros.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    if (this.state.seatedBenchId) {
      this.standUpFromRiversideBench({ silent: true });
    }
    this.state.euros = roundMoney(this.state.euros - fun.fareEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + fun.fareEur);
    this.state.stats.funicularRides = (this.state.stats.funicularRides || 0) + 1;
    this.state.energy = clamp(this.state.energy + 12, 0, 100);
    this.advanceMinutes(fun.travelMinutes || 5);

    const goingUp = fromEnd === 'lower';
    // Car 0 climbs from progress 0 -> 1; when riding down, start Car 0 at progress 1 -> 0 so player rides Car 0 smoothly!
    fun.progress = goingUp ? 0.01 : 0.99;
    fun.dir = goingUp ? 1 : -1;
    fun.dwellRemaining = 0;

    this.state.ridingFunicularId = fun.id;
    this.state.ridingFunicularCarIndex = 0;
    this.state.ridingFunicularTargetEnd = goingUp ? 'upper' : 'lower';
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    // Frame the iconic downhill view along Rua da Bica / Calcada da Gloria toward the Tagus River!
    this.state.cameraYaw = Math.PI * 0.5;
    this.state.cameraPitch = goingUp ? -0.05 : -0.09;

    const pose = computeFunicularCarPose(fun, 0);
    this.state.player.x = pose.x;
    this.state.player.y = pose.y;
    this.state.player.overworldX = pose.x;
    this.state.player.overworldY = pose.y;
    this.updateNeighborhoodTracking();

    recordPhrase(this.state, fun.phrase, fun.name);
    const destName = goingUp ? fun.upperStation.name : fun.lowerStation.name;
    this.state.statusMessage =
      `Boarded ${fun.name} (-${fun.fareEur.toFixed(2)} EUR, +12 Energy) - ${goingUp ? 'Climbing steeply up to' : 'Gliding down to'} ${destName}!`;
    recordLog(this.state, 'transit', `Rode ${fun.name} ${goingUp ? 'uphill to Bairro Alto' : 'downhill toward Tagus'} (-${fun.fareEur.toFixed(2)} EUR).`);
    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();

    return {
      ok: true,
      funicular: fun,
      goingUp,
      soundEffect: 'tram-bell',
      state: this.state
    };
  }

  disembarkFunicular() {
    if (!this.state.ridingFunicularId) {
      return { ok: false, error: 'You are not currently riding a Lisbon funicular.' };
    }
    const fun = (this.state.funiculars || []).find((f) => f.id === this.state.ridingFunicularId);
    const targetEnd = this.state.ridingFunicularTargetEnd || 'upper';
    this.state.ridingFunicularId = null;
    this.state.ridingFunicularCarIndex = 0;
    this.state.ridingFunicularTargetEnd = null;
    if (fun) {
      const dest = targetEnd === 'upper' ? fun.upperStation : fun.lowerStation;
      this.state.player.x = dest.platformX;
      this.state.player.y = dest.platformY;
      this.state.player.overworldX = dest.platformX;
      this.state.player.overworldY = dest.platformY;
      this.state.cameraPitch = 0.02;
      this.updateNeighborhoodTracking();
      this.state.statusMessage = `Stepped off ${fun.shortName} at ${dest.name} (Elevation ${this.state.elevationMeters}m).`;
    }
    return { ok: true, funicular: fun, state: this.state };
  }

}

export const transitModeMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    transitModeMethods[key] = _Mixin.prototype[key];
  }
}
