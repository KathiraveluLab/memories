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
  setWalkTarget(x, y, onArriveAction = null) {
    if (this.state.ridingVehicleId || this.state.ridingFunicularId) return;
    if (this.state.mode === 'metro' && this.state.metro.phase !== 'platform') return;
    if (this.state.seatedBenchId) {
      this.standUpFromRiversideBench({ silent: true });
    }
    if (this.state.mode === 'overworld') this.state.activeMetroStationId = null;
    this.state.player.walkQueue = [];
    this.state.player.walkTarget = { x, y, onArriveAction };
  }

  setWalkPath(waypoints = []) {
    if (this.state.ridingVehicleId || this.state.ridingFunicularId || !Array.isArray(waypoints) || waypoints.length === 0) return;
    if (this.state.mode === 'metro' && this.state.metro.phase !== 'platform') return;
    if (this.state.seatedBenchId) {
      this.standUpFromRiversideBench({ silent: true });
    }
    if (this.state.mode === 'overworld') this.state.activeMetroStationId = null;
    const [first, ...rest] = waypoints;
    this.state.player.walkTarget = first;
    this.state.player.walkQueue = rest;
  }

  clearWalkTarget() {
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
  }

  advanceMinutes(minutes, { force = false } = {}) {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    // In LAN multiplayer, keep every player locked to the central server's global sky clock
    if (this.globalClockSynced && !force) return;
    const prevHour = Math.floor(this.state.minutesOfDay / 60);
    this.state.minutesOfDay = Math.min(23 * 60 + 45, this.state.minutesOfDay + minutes);
    const nextHour = Math.floor(this.state.minutesOfDay / 60);
    const hourKey = `${this.state.day}:${nextHour}`;
    if (nextHour > prevHour && hourKey !== this.lastHourlyChimeKey) {
      this.triggerCathedralChime({
        hour: nextHour,
        triggeredBy: 'Se de Lisboa (1147)',
        emitNetwork: false,
        updateStatus: false
      });
    }
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
    if (this.state.mode === 'santa-justa') {
      return false;
    }

    if (this.state.mode === 'ferry') {
      return (
        rp.mode === 'ferry' &&
        rp.ferryPortId === this.state.ferry.portId &&
        rp.ferryPhase === 'terminal'
      );
    }
    if (this.state.mode === 'city-district') {
      return (
        rp.mode === 'city-district' &&
        rp.cityDistrictId === this.state.cityDistrictId
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
      for (const jog of this.state.joggers || []) {
        if (jog.id === ignoreNpcId) continue;
        const nextDist = distance(x, y, jog.x, jog.y);
        if (nextDist < PERSON_SEPARATION_DIST) {
          if (Number.isFinite(fromX) && Number.isFinite(fromY)) {
            const curDist = distance(fromX, fromY, jog.x, jog.y);
            if (nextDist > curDist + 0.05) continue;
          }
          return { kind: 'jogger', name: jog.name, npc: jog };
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
    if (this.state.mode === 'santa-justa') {
      return { ok: false, blocker: null };
    }

    if (this.state.mode === 'ferry') {
      if (!isFerryPierPositionValid(x, y)) return { ok: false, blocker: null };
      const blockingPeer = this.isBlockedByPerson(x, y, { ignorePlayer: true, fromX: px, fromY: py });
      if (blockingPeer) return { ok: false, blocker: blockingPeer };
      return { ok: true, blocker: null };
    }
    if (this.state.mode === 'city-district') {
      if (!isCityDistrictPositionValid(x, y)) return { ok: false, blocker: null };
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
    if (this.globalTransitSynced) {
      // Smoothly interpolate toward the central server node's authoritative Tram 28E & Carris Bus positions
      const alpha = Math.min(1, dt * 12);
      for (const vehicle of this.state.vehicles) {
        if (Number.isFinite(vehicle.targetX) && Number.isFinite(vehicle.targetY)) {
          const dx = vehicle.targetX - vehicle.x;
          const dy = vehicle.targetY - vehicle.y;
          const d = Math.hypot(dx, dy);
          if (d > 180) {
            vehicle.x = vehicle.targetX;
            vehicle.y = vehicle.targetY;
          } else if (d > 0.2) {
            vehicle.x += dx * alpha;
            vehicle.y += dy * alpha;
          } else {
            vehicle.x = vehicle.targetX;
            vehicle.y = vehicle.targetY;
          }
        }
      }
      return;
    }

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
    if (this.globalTransitSynced) {
      // Smoothly interpolate all 6 ambient Lisbon locals toward the central server's authoritative sidewalk positions
      const alpha = Math.min(1, dt * 12);
      for (const npc of this.state.npcs) {
        if (Number.isFinite(npc.targetX) && Number.isFinite(npc.targetY)) {
          const dx = npc.targetX - npc.x;
          const dy = npc.targetY - npc.y;
          const d = Math.hypot(dx, dy);
          if (d > 90) {
            npc.x = npc.targetX;
            npc.y = npc.targetY;
          } else if (d > 0.2) {
            npc.x += dx * alpha;
            npc.y += dy * alpha;
          } else {
            npc.x = npc.targetX;
            npc.y = npc.targetY;
          }
          if (npc.isMoving || d > 0.5) {
            npc.walkPhase = (npc.walkPhase + dt * 4.6) % (Math.PI * 2);
          }
        }
      }
      return;
    }

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
      for (const jog of this.state.joggers || []) {
        if (jog.id === npc.id) continue;
        list.push({ x: jog.x, y: jog.y });
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

  updateJoggers(dt) {
    const joggers = this.state.joggers || [];
    if (joggers.length === 0) return;

    if (this.globalTransitSynced) {
      const alpha = Math.min(1, dt * 12);
      for (const jog of joggers) {
        if (Number.isFinite(jog.targetX) && Number.isFinite(jog.targetY)) {
          const dx = jog.targetX - jog.x;
          const dy = jog.targetY - jog.y;
          const d = Math.hypot(dx, dy);
          if (d > 120) {
            jog.x = jog.targetX;
            jog.y = jog.targetY;
          } else if (d > 0.2) {
            jog.x += dx * alpha;
            jog.y += dy * alpha;
          } else {
            jog.x = jog.targetX;
            jog.y = jog.targetY;
          }
          jog.walkPhase = (jog.walkPhase + dt * 11.5) % (Math.PI * 2);
        }
      }
      return;
    }

    const passClearance = 17.0; // Polite shoulder-to-shoulder passing clearance around every pedestrian
    const preferredGap = 24.0; // Comfortable lateral berth when curving around people on the promenade
    const lookahead = 68.0; // Early lookahead so joggers curve smoothly well before reaching a person

    const getObstaclesForJogger = (jog) => {
      const list = [];
      if (this.state.mode === 'overworld' && !this.state.ridingVehicleId && !this.state.ridingFunicularId) {
        list.push({ x: this.state.player.x, y: this.state.player.y, kind: 'player' });
      }
      for (const rp of this.state.remotePlayers || []) {
        if (rp.mode === 'overworld' && !rp.ridingVehicleId) {
          list.push({ x: rp.x, y: rp.y, kind: 'remote-player' });
        }
      }
      for (const npc of this.state.npcs || []) {
        list.push({ x: npc.x, y: npc.y, kind: 'npc' });
      }
      for (const other of joggers) {
        if (other.id === jog.id) continue;
        list.push({ x: other.x, y: other.y, kind: 'jogger' });
      }
      return list;
    };

    const getPromenadeSpanY = (x, refY) => {
      const base = Math.round(refY);
      let minY = base;
      let maxY = base;
      while (minY > base - 45 && isPointOnSidewalk(x, minY - 1)) minY -= 1;
      while (maxY < base + 45 && isPointOnSidewalk(x, maxY + 1)) maxY += 1;
      return {
        minY: Math.max(973, minY + 1),
        maxY: Math.min(1012, maxY - 1)
      };
    };

    const isJoggerCandidateClear = (jog, cx, cy, obstacles, minSep) => {
      if (!isPointOnSidewalk(cx, cy)) return false;
      if (this.isBlockedByVehicle(cx, cy, PLAYER_RADIUS)) return false;
      for (const p of obstacles) {
        const nextDist = distance(cx, cy, p.x, p.y);
        if (nextDist < minSep) {
          const curDist = distance(jog.x, jog.y, p.x, p.y);
          // Anti-deadlock: if already closer than minSep, allow any step that increases separation
          if (curDist < minSep && nextDist > curDist + 0.05) continue;
          return false;
        }
      }
      return true;
    };

    for (const jog of joggers) {
      const step = jog.speed * dt;
      const obstacles = getObstaclesForJogger(jog);

      if (jog.x >= jog.max && jog.dir > 0) jog.dir = -1;
      else if (jog.x <= jog.min && jog.dir < 0) jog.dir = 1;

      // Find the closest person ahead or beside the jogger along their running direction
      let blocker = null;
      let bestAlong = Infinity;
      for (const p of obstacles) {
        const along = (p.x - jog.x) * jog.dir;
        const lat = Math.abs(p.y - jog.y);
        if (along > -20 && along < lookahead && lat < preferredGap) {
          if (along < bestAlong) {
            bestAlong = along;
            blocker = p;
          }
        }
      }

      if (blocker) {
        const curSpan = getPromenadeSpanY(jog.x, jog.y);
        const passSpan = getPromenadeSpanY(clamp(blocker.x, jog.min, jog.max), jog.y);
        const sideMinY = Math.max(curSpan.minY, passSpan.minY);
        const sideMaxY = Math.min(curSpan.maxY, passSpan.maxY);
        const useMinY = sideMaxY - sideMinY >= passClearance ? sideMinY : curSpan.minY;
        const useMaxY = sideMaxY - sideMinY >= passClearance ? sideMaxY : curSpan.maxY;

        const spaceNorth = blocker.y - useMinY;
        const spaceSouth = useMaxY - blocker.y;

        if (!jog.avoidSide) {
          jog.avoidSide = spaceSouth >= spaceNorth ? 1 : -1;
        } else if (jog.avoidSide === 1 && spaceSouth < passClearance && spaceNorth >= passClearance) {
          jog.avoidSide = -1;
        } else if (jog.avoidSide === -1 && spaceNorth < passClearance && spaceSouth >= passClearance) {
          jog.avoidSide = 1;
        }

        const desiredY =
          jog.avoidSide > 0
            ? Math.min(useMaxY, blocker.y + preferredGap)
            : Math.max(useMinY, blocker.y - preferredGap);

        const dyNeeded = desiredY - jog.y;
        const latMove = Math.sign(dyNeeded) * Math.min(Math.abs(dyNeeded), Math.max(step * 1.75, 2.8));
        const nextY = clamp(jog.y + latMove, useMinY, useMaxY);
        const fullLateralY = clamp(
          jog.y + Math.sign(dyNeeded || jog.avoidSide) * Math.max(step * 2.1, 3.4),
          useMinY,
          useMaxY
        );
        const nextX = clamp(jog.x + step * jog.dir, jog.min, jog.max);
        const halfX = clamp(jog.x + step * 0.55 * jog.dir, jog.min, jog.max);

        const candidates = [
          { x: nextX, y: nextY },
          { x: halfX, y: nextY },
          { x: halfX, y: fullLateralY },
          { x: jog.x, y: nextY },
          { x: jog.x, y: fullLateralY },
          { x: nextX, y: jog.y }
        ];

        let moved = false;
        for (const c of candidates) {
          if (isJoggerCandidateClear(jog, c.x, c.y, obstacles, passClearance)) {
            jog.x = c.x;
            jog.y = c.y;
            jog.isMoving = true;
            jog.walkPhase = (jog.walkPhase + dt * 11.5) % (Math.PI * 2);
            moved = true;
            break;
          }
        }
        if (!moved) {
          // Wait politely in place if momentarily boxed in rather than running through a person
          jog.isMoving = false;
        }
        continue;
      }

      // Path ahead is clear: reset avoidSide, continue running, and ease smoothly back toward homeY
      jog.avoidSide = 0;
      const targetX = clamp(jog.x + step * jog.dir, jog.min, jog.max);
      let targetY = jog.y;
      const homeDy = jog.homeY - jog.y;
      if (Math.abs(homeDy) > 0.4) {
        const driftY = jog.y + clamp(homeDy, -step * 0.75, step * 0.75);
        if (isJoggerCandidateClear(jog, targetX, driftY, obstacles, preferredGap)) {
          targetY = driftY;
        }
      }

      if (isJoggerCandidateClear(jog, targetX, targetY, obstacles, passClearance)) {
        jog.x = targetX;
        jog.y = targetY;
        jog.isMoving = true;
        jog.walkPhase = (jog.walkPhase + dt * 11.5) % (Math.PI * 2);
        if (jog.x >= jog.max) jog.dir = -1;
        else if (jog.x <= jog.min) jog.dir = 1;
      } else {
        jog.isMoving = false;
      }
    }
  }

  updateNeighborhoodTracking() {
    if (this.state.mode !== 'overworld') return;
    this.state.elevationMeters = Math.round(getTerrainElevation(this.state.player.x, this.state.player.y) * 0.65);
    const hood = getNeighborhoodAt(this.state.player.x, this.state.player.y);
    if (hood.districtId && !this.state.visitedCityDistricts.includes(hood.districtId)) {
      this.state.visitedCityDistricts.push(hood.districtId);
      const dist = getCityDistrictById(hood.districtId);
      if (dist?.phrase) {
        recordPhrase(this.state, dist.phrase, dist.name);
      }
    }
    if (hood.id !== this.state.currentNeighborhoodId) {
      this.state.currentNeighborhoodId = hood.id;
      this.state.currentNeighborhoodName = hood.name;
      if (!this.state.visitedNeighborhoods.includes(hood.id)) {
        this.state.visitedNeighborhoods.push(hood.id);
        this.state.statusMessage = `Entered ${hood.name}: ${hood.subtitle}`;
        recordLog(this.state, 'neighborhood', `Arrived in ${hood.name}.`);
      }
    }
  }

  movePlayerByInput(inputX, inputY, dt) {
    if (this.state.gameOver) {
      this.state.player.isMoving = false;
      return;
    }
    let vx = inputX;
    let vy = inputY;
    const player = this.state.player;

    if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
      if (this.state.seatedBenchId) {
        this.standUpFromRiversideBench({ silent: true });
      }
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
      const targetYaw = Math.atan2(vy, vx);
      const curYaw = this.state.cameraYaw || 0;
      const diff = Math.atan2(Math.sin(targetYaw - curYaw), Math.cos(targetYaw - curYaw));
      this.state.cameraYaw = Math.atan2(Math.sin(curYaw + diff * Math.min(1, dt * 6.5)), Math.cos(curYaw + diff * Math.min(1, dt * 6.5)));
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
        if (doorMatch.type === 'santa-justa') {
          this.openSantaJusta();
          return;
        }
        if (doorMatch.type === 'city-gateway' && doorMatch.targetZoneId) {
          this.walkCityAvenue(doorMatch.targetZoneId);
          return;
        }
      }
    }

    // Directional push-to-walk out of open Lisbon Avenues along the edges of any Greater Lisboa City District plaza
    if (this.state.mode === 'city-district' && this.doorEntryCooldown <= 0 && !player.walkTarget) {
      const avenues = getWalkingAvenuesFrom(this.state.cityDistrictId);
      for (const av of avenues) {
        const hitWest = av.slot === 'west' && vx < -0.25 && player.x <= 88 && Math.abs(player.y - 214) <= 44;
        const hitEast = av.slot === 'east' && vx > 0.25 && player.x >= 672 && Math.abs(player.y - 214) <= 44;
        const hitNW = av.slot === 'north-west' && vy < -0.25 && player.y <= 178 && Math.abs(player.x - 267) <= 38;
        const hitNE = av.slot === 'north-east' && vy < -0.25 && player.y <= 178 && Math.abs(player.x - 493) <= 38;
        const hitSW = av.slot === 'south-west' && vy > 0.25 && player.y >= 260 && Math.abs(player.x - 168) <= 44;
        const hitSE = av.slot === 'south-east' && vy > 0.25 && player.y >= 260 && Math.abs(player.x - 592) <= 44;
        if (hitWest || hitEast || hitNW || hitNE || hitSW || hitSE) {
          this.walkCityAvenue(av.toZoneId);
          return;
        }
      }
    }

    const fatigueFactor = this.computeWalkSpeedMultiplier();
    const speed =
      (this.state.mode === 'interior' ? INTERIOR_WALK_SPEED : BASE_WALK_SPEED) *
      fatigueFactor;

    const stepX = vx * speed * dt;
    const stepY = vy * speed * dt;

    let movedX = 0;
    let movedY = 0;
    let lastBlocker = null;

    const prevElev = this.state.mode === 'overworld' ? getTerrainElevation(player.x, player.y) : 0;
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
      player.walkPhase = (player.walkPhase + dt * 9.5 * Math.max(0.32, fatigueFactor)) % (Math.PI * 2);

      if (this.state.mode === 'overworld') {
        player.overworldX = player.x;
        player.overworldY = player.y;
        this.state.stats.distanceWalkedPx += movedDist;
        const nextElev = getTerrainElevation(player.x, player.y);
        const climbSlope = Math.max(0, (nextElev - prevElev) / Math.max(1, movedDist));
        const slopeEffort = 1 + climbSlope * 0.45;
        const wasCritLow = this.state.needsMealToRecoverSpeed;
        this.state.energy = clamp(this.state.energy - (movedDist / 100) * 0.22 * slopeEffort, 0, 100);
        this.state.fullness = clamp(this.state.fullness - (movedDist / 100) * 0.15, 0, 100);
        this.computeWalkSpeedMultiplier();
        if (this.checkGameOver()) {
          return;
        }
        if (!wasCritLow && this.state.needsMealToRecoverSpeed) {
          this.state.statusMessage =
            'Your energy is critically low! You are moving very slowly until you eat a meal at a bakery, cafe, or restaurant.';
        }
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
      } else if (this.state.mode === 'city-district') {
        if (
          vy > 0.25 &&
          player.y >= 262 &&
          Math.abs(player.x - 380) <= 78
        ) {
          this.enterMetroFromCityDistrict();
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

    for (const venue of ALL_ENTERABLE_VENUES) {
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

    for (const station of ALL_METRO_STATIONS) {
      if (
        Number.isFinite(station.doorX) &&
        vy < -0.25 &&
        Math.abs(px - station.doorX) <= doorwayHalfW + 6 &&
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

    // Elevador de Santa Justa (1902) on Rua do Carmo (walk UP into south cast-iron archway)
    if (
      vy < -0.25 &&
      Math.abs(px - SANTA_JUSTA_LIFT.doorX) <= doorwayHalfW + 8 &&
      py >= SANTA_JUSTA_LIFT.doorY - 2 &&
      py <= SANTA_JUSTA_LIFT.doorY + approachReach
    ) {
      return { type: 'santa-justa', id: SANTA_JUSTA_LIFT.id };
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
    } else if (action.type === 'sitRiversideBench') {
      this.sitAtRiversideBench(action.id);
    } else if (action.type === 'buyCastanha') {
      this.buyCastanhaCone(action.id);
    } else if (action.type === 'boardFunicular') {
      this.boardFunicular(action.id, action.fromEnd || 'lower');
    } else if (action.type === 'talkProprietor') {
      this.talkToProprietor();
    } else if (action.type === 'inspectDisplay') {
      this.inspectVenueDisplay();
    } else if (action.type === 'exitVenue') {
      this.exitVenue();
    } else if (action.type === 'exitMetro') {
      this.exitMetroStation();
    } else if (action.type === 'transferMetroLine' && action.lineId) {
      this.transferMetroLine(action.lineId);
    } else if (action.type === 'boardNextMetro') {
      const origin = this.state.metro.stationId;
      const lineId = this.state.metro.activeLineId || getStationLineIds(origin)[0];
      const direct = getDirectStationsOnLine(origin, lineId);
      const dest = direct[0]?.station || null;
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
    } else if (action.type === 'cityDistrictSpot' && action.spotId) {
      this.interactWithCityDistrictSpot(action.spotId);
    } else if (action.type === 'enterCityDistrictMetro') {
      this.enterMetroFromCityDistrict();
    } else if (action.type === 'openSantaJusta') {
      this.openSantaJusta();
    } else if (action.type === 'walkCityAvenue' && action.targetZoneId) {
      this.walkCityAvenue(action.targetZoneId);
    }
  }

}

export const movementMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    movementMethods[key] = _Mixin.prototype[key];
  }
}
