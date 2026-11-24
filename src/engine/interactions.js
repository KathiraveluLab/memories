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
  getNearbyInteraction() {
    const state = this.state;

    if (state.ridingFunicularId) {
      const fun = (state.funiculars || []).find((f) => f.id === state.ridingFunicularId);
      if (!fun) return null;
      const goingUp = state.ridingFunicularTargetEnd === 'upper';
      const destLabel = goingUp ? fun.upperStation.name : fun.lowerStation.name;
      return {
        type: 'riding-funicular',
        id: fun.id,
        funicular: fun,
        label: `Aboard ${fun.shortName} -> ${destLabel}`,
        sublabel: `${goingUp ? 'Climbing steep Bairro Alto hill' : 'Descending toward Tagus River'} - Press [E] to step out at station`
      };
    }

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

    if (state.cityWalk?.active) {
      const cw = state.cityWalk;
      return {
        type: 'city-walk-transition',
        label: `Walking along ${cw.avenueName} -> ${cw.shortLabel}`,
        sublabel: `${cw.distanceMeters >= 1000 ? `${(cw.distanceMeters / 1000).toFixed(1)} km` : `${cw.distanceMeters} m`} on foot (~${cw.walkMinutes} min)`
      };
    }

    if (state.mode === 'metro') {
      const m = state.metro;
      const station = getMetroStationById(m.stationId);
      const curLineId = m.activeLineId || getStationLineIds(station)[0];
      const curLine = getMetroLineById(curLineId);
      if (m.phase === 'descending') {
        return {
          type: 'metro-transition',
          label: `Descending escalators into ${station ? station.name : 'Metro'}...`,
          sublabel: `Heading underground to the ${curLine ? curLine.name : 'Metro'} platform`
        };
      }
      if (m.phase === 'ascending') {
        return {
          type: 'metro-transition',
          label: `Riding escalators up to ${station ? station.name : 'street'}...`,
          sublabel: station?.districtId ? 'Ascending to the Lisboa city district plaza' : 'Returning to the sunlit Lisboa sidewalk'
        };
      }
      if (m.phase === 'transferring') {
        const toLine = getMetroLineById(m.transferToLineId);
        return {
          type: 'metro-transition',
          label: `Transferring at ${station ? station.name : 'Station'} -> ${toLine ? toLine.name : 'Connecting Line'}...`,
          sublabel: 'Walking through the underground Correspondencia corridor (Free transfer)'
        };
      }
      if (m.phase === 'riding') {
        const dest = getMetroStationById(m.toStationId);
        return {
          type: 'metro-transition',
          label: `Riding ${curLine ? curLine.name : 'Metropolitano de Lisboa'} -> ${dest ? dest.name : 'next station'}`,
          sublabel: 'Press [E] to ring shared Atencao as Portas door chime'
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
      // Official 2-line transfer corridor on the east concourse wall (ONLY at the 6 real interchange stations!)
      const otherLineIds = getStationLineIds(station).filter((id) => id !== curLineId);
      if (
        otherLineIds.length > 0 &&
        distance(px, py, METRO_PLATFORM_ZONES.transferX, METRO_PLATFORM_ZONES.transferY) <= METRO_PLATFORM_ZONES.transferRadius
      ) {
        const targetLine = getMetroLineById(otherLineIds[0]);
        return {
          type: 'metro-transfer',
          targetLineId: otherLineIds[0],
          label: `Transfer to ${targetLine ? targetLine.name : 'Connecting Line'} Platform (Free Correspondencia)`,
          sublabel: `Press [E] to walk through the underground transfer passage at ${station ? station.name : 'this hub'}`
        };
      }
      if (py >= 242 && Math.abs(px - 380) <= METRO_PLATFORM_ZONES.boardingHalfWidth) {
        const directOptions = getDirectStationsOnLine(m.stationId, curLineId);
        const nextDest = directOptions[0]?.station || null;
        const fareLabel = m.ticketPaid ? 'Transfer Included (0.00 EUR)' : `${METRO_LINE.fareEur.toFixed(2)} EUR`;
        return {
          type: 'metro-board',
          destId: nextDest?.id || null,
          lineId: curLineId,
          label: `Board ${curLine ? curLine.name : 'Metro'} -> ${nextDest ? nextDest.name : 'Next Station'} (${fareLabel})`,
          sublabel: `Press [E] to board direct on ${curLine ? curLine.name : 'this line'}, or choose a station in the Metro panel`
        };
      }
      return null;
    }

    if (state.mode === 'city-district') {
      const district = this.getCurrentCityDistrict();
      if (!district) return null;
      const station = getMetroStationById(district.stationId);
      const px = state.player.x;
      const py = state.player.y;
      if (py >= 238 && Math.abs(px - 380) <= FERRY_PIER_ZONES.gangwayHalfWidth) {
        return {
          type: 'city-district-metro',
          stationId: district.stationId,
          label: `Descend into ${station ? station.name : 'Metro Station'} [METRO]`,
          sublabel: `${station ? station.lines.join(' & ') : 'Metropolitano de Lisboa'} - Press [E] to enter the underground 4-line Metro network`
        };
      }
      // Check walkable perimeter Lisbon Avenue Gateways to neighboring city districts!
      const cityAvenues = getWalkingAvenuesFrom(district.id);
      let bestAv = null;
      let bestAvDist = 62;
      for (const av of cityAvenues) {
        const d = distance(px, py, av.x, av.y);
        if (d <= bestAvDist) {
          bestAvDist = d;
          bestAv = av;
        }
      }
      if (bestAv) {
        const kmTxt = bestAv.distanceMeters >= 1000 ? `${(bestAv.distanceMeters / 1000).toFixed(1)} km` : `${bestAv.distanceMeters} m`;
        return {
          type: 'city-avenue',
          targetZoneId: bestAv.toZoneId,
          avenue: bestAv,
          label: `Walk ${bestAv.avenueName} -> ${bestAv.shortLabel} (${kmTxt})`,
          sublabel: `Continue on foot (~${bestAv.walkMinutes} min, Free) - Walk outward or press [E]`
        };
      }
      if (Array.isArray(district.townSpots)) {
        let bestSpot = null;
        let bestDist = 78;
        for (const spot of district.townSpots) {
          const d = distance(px, py, spot.x, Math.min(spot.y, 184));
          if (d <= bestDist) {
            bestDist = d;
            bestSpot = spot;
          }
        }
        if (bestSpot) {
          return {
            type: 'city-district-spot',
            spotId: bestSpot.id,
            spot: bestSpot,
            label:
              bestSpot.kind === 'landmark'
                ? `Explore ${bestSpot.name}`
                : `Explore ${bestSpot.name} ${bestSpot.badge}`,
            sublabel:
              bestSpot.kind === 'landmark'
                ? `Press [E] to rest (+25 Energy) & experience ${district.shortName} transit and monument`
                : `Host: ${bestSpot.host} - Press [E] to open menu & chat (then [1] or [2] to order plate/glass or buy)`
          };
        }
      }
      return null;
    }

    if (state.mode === 'santa-justa') {
      const sj = state.santaJusta;
      if (sj.phase === 'lobby') {
        return {
          type: 'santa-justa-ascend',
          label: `Ride Elevador de Santa Justa Up to 45m Miradouro (${SANTA_JUSTA_LIFT.fareEur.toFixed(2)} EUR)`,
          sublabel: 'Step inside the 1902 mahogany-and-brass vertical lift cabin for the 360-degree Lisbon skyline [E]'
        };
      }
      if (sj.phase === 'ascending' || sj.phase === 'descending') {
        return {
          type: 'santa-justa-transition',
          label: `Elevador de Santa Justa - ${sj.phase === 'ascending' ? 'Ascending' : 'Descending'} (${Math.round(sj.altitudeMeters)}m / 45m)`,
          sublabel: 'Raoul Mesnier du Ponsard 1902 Neo-Gothic cast-iron lift shaft'
        };
      }
      const focused =
        SANTA_JUSTA_PANORAMA_LANDMARKS.find((l) => l.id === sj.focusedLandmarkId) ||
        SANTA_JUSTA_PANORAMA_LANDMARKS[3];
      return {
        type: 'santa-justa-descend',
        label: 'Descend Elevador de Santa Justa to Street (Free Return)',
        sublabel: `Viewing ${focused.shortName} (${focused.compassLabel}) from 45m - Drag 360 deg or press [E] / [Esc] to go down`
      };
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
          sublabel: 'Press [E] to sound shared Transtejo Tagus foghorn'
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
      // Prioritize boarding gangway cleanly when standing near the yellow quay curb (never hijacked by center landmark!)
      if (py >= 238 && Math.abs(px - 380) <= FERRY_PIER_ZONES.gangwayHalfWidth) {
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
      // On South-Bank waterfront towns (Cacilhas, Seixal, Montijo), pick the nearest eatery, landmark, or shop!
      if (curDest && Array.isArray(curDest.townSpots)) {
        let bestSpot = null;
        let bestDist = 78;
        for (const spot of curDest.townSpots) {
          const d = distance(px, py, spot.x, Math.min(spot.y, 184));
          if (d <= bestDist) {
            bestDist = d;
            bestSpot = spot;
          }
        }
        if (bestSpot) {
          return {
            type: 'south-bank-spot',
            spotId: bestSpot.id,
            spot: bestSpot,
            label:
              bestSpot.kind === 'landmark'
                ? `Explore ${bestSpot.name}`
                : `Explore ${bestSpot.name} ${bestSpot.badge}`,
            sublabel:
              bestSpot.kind === 'landmark'
                ? 'Press [E] to rest (+25 Energy) and view Tagus south-bank postcard'
                : `Host: ${bestSpot.host} - Press [E] to open menu & chat (then [1] or [2] to order/buy)`
          };
        }
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
    if (state.seatedBenchId && state.seatedBench) {
      return {
        type: 'stand-up-bench',
        id: state.seatedBenchId,
        bench: state.seatedBench,
        label: `Stand Up from ${state.seatedBench.name}`,
        sublabel: 'Restoring Energy (+4.5/s) - Drag to pan Tagus & Almada, or press [E] / move to stand'
      };
    }

    const px = state.player.x;
    const py = state.player.y;
    let best = null;
    let bestDist = Infinity;

    for (const station of ALL_METRO_STATIONS) {
      if (!Number.isFinite(station.doorX)) continue;
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

    // Elevador de Santa Justa (1902) Cast-Iron Vertical Lift Tower on Rua do Carmo
    const sjDist = distance(px, py, SANTA_JUSTA_LIFT.doorX, SANTA_JUSTA_LIFT.doorY);
    if (sjDist <= INTERACT_DISTANCE + 10 && sjDist < bestDist) {
      bestDist = sjDist;
      best = {
        type: 'santa-justa',
        id: SANTA_JUSTA_LIFT.id,
        label: `Enter ${SANTA_JUSTA_LIFT.name} (${SANTA_JUSTA_LIFT.fareEur.toFixed(2)} EUR)`,
        sublabel: 'Ride up 45m inside the 1902 mahogany cabin for a factual 360-degree view of Lisboa - Walk UP or press [E]'
      };
    }

    for (const venue of ALL_ENTERABLE_VENUES) {
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
        const perf = (state.miradouroPerformances || []).find((m) => m.spotId === spot.id);
        const musicLine = perf
          ? `${perf.musicianName} (${perf.instrument}): "${perf.songTitle}"`
          : 'Live Miradouro Street Music';
        best = {
          type: 'bench',
          id: spot.id,
          spot,
          label: `Rest & Listen at ${spot.name}`,
          sublabel: `${musicLine} - Free rest (+30 Energy) & Encore [E]`
        };
      }
    }

    // Seasonal Castanhas Assadas roasted chestnut street carts (Oct - Feb)
    if (getMonthInfo(state.month).hasCastanhaVendors) {
      for (const cv of CASTANHA_VENDORS) {
        const d = Math.min(distance(px, py, cv.x, cv.y), distance(px, py, cv.x + 17, cv.y - 4));
        if (d <= INTERACT_DISTANCE + 8 && d < bestDist) {
          bestDist = d;
          best = {
            type: 'castanha-cart',
            id: cv.id,
            vendor: cv,
            item: CASTANHA_CONE_ITEM,
            label: `Buy Hot Paper Cone of Castanhas (${CASTANHA_CONE_ITEM.costEur.toFixed(2)} EUR)`,
            sublabel: `${cv.vendorName} (${cv.locationName}): "${cv.cry}" - +${CASTANHA_CONE_ITEM.fullnessDelta} Fullness, +${CASTANHA_CONE_ITEM.energyDelta} Energy [E]`
          };
        }
      }
    }

    // Historic Lisbon Cable Funiculars (Elevador da Bica & Elevador da Gloria) lower & upper stations
    for (const fun of state.funiculars || []) {
      for (const [endKey, st] of [['lower', fun.lowerStation], ['upper', fun.upperStation]]) {
        const d = Math.min(distance(px, py, st.platformX, st.platformY), distance(px, py, st.x, st.y));
        if (d <= INTERACT_DISTANCE + 10 && d < bestDist) {
          bestDist = d;
          const destEnd = endKey === 'lower' ? fun.upperStation : fun.lowerStation;
          best = {
            type: 'funicular-station',
            id: fun.id,
            fromEnd: endKey,
            funicular: fun,
            station: st,
            label: `Board ${fun.shortName} -> ${endKey === 'lower' ? 'Upper Bairro Alto' : 'Lower Waterfront'} (${fun.fareEur.toFixed(2)} EUR)`,
            sublabel: `${st.name} to ${destEnd.name} (+12 Energy, tilted hillside cable car) [E]`
          };
        }
      }
    }

    // Interactive Tagus riverside seawall benches (sit & enjoy the Almada & Tagus view while restoring Energy)
    for (const rb of RIVERSIDE_BENCHES) {
      const d = distance(px, py, rb.x, rb.y);
      if (d <= INTERACT_DISTANCE && d < bestDist) {
        bestDist = d;
        best = {
          type: 'riverside-bench',
          id: rb.id,
          bench: rb,
          label: `Sit on ${rb.name}`,
          sublabel: `${rb.viewNote} - Free riverside rest (+Energy) [E]`
        };
      }
    }

    // Historic Lisbon Bronze Statues & Chafariz Water Fountains
    for (const struct of DECORATIVE_STRUCTURES) {
      const cx = struct.x + struct.w * 0.5;
      const cy = struct.y + struct.h * 0.5;
      const d = distance(px, py, cx, cy);
      if (d <= 56 && d < bestDist) {
        bestDist = d;
        const isFountain = struct.monumentType === 'fountain';
        best = {
          type: isFountain ? 'fountain' : 'statue',
          id: struct.id,
          struct,
          label: isFountain
            ? `Refresh at ${struct.label} (+8 Energy, Free)`
            : `Admire ${struct.label} (+5 Energy)`,
          sublabel: isFountain
            ? `${struct.sculptor || 'Historic Lisbon Chafariz'} - Press [E] to splash cool aqueduct water`
            : `${struct.sculptor || 'Historic Lisbon Monument'} - Press [E] to read the bronze pedestal plaque`
        };
      }
    }

    // Greater Lisboa open-world landmarks, Aeroporto Terminal 1, stadiums, eateries & cultural shops (all enterable, excluding private residences!)
    for (const spot of [...CITY_DISTRICT_SPOTS, ...LISBOA_CORRIDOR_LANDMARKS]) {
      const doorX = Number.isFinite(spot.doorX) ? spot.doorX : spot.worldX + (spot.w || 180) * 0.5;
      const doorY = Number.isFinite(spot.doorY) ? spot.doorY : spot.worldY + (spot.h || 140);
      const d = distance(px, py, doorX, doorY);
      if (d <= INTERACT_DISTANCE + 14 && d < bestDist) {
        bestDist = d;
        const isSantaJusta = spot.id === 'rossio-santa-justa-lift';
        best = {
          type: isSantaJusta ? 'city-district-spot' : 'venue',
          id: spot.id,
          spotId: spot.id,
          spot,
          districtId: spot.districtId || null,
          label: `Enter ${spot.name} ${spot.badge || ''}`.trim(),
          sublabel: isSantaJusta
            ? `${spot.districtName || 'Lisboa'} - Press [E] to enter Elevador de Santa Justa`
            : `${spot.districtName || 'Lisboa'} - Press [E] or walk inside`
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
    if (nearby.type === 'riding-funicular') {
      return this.disembarkFunicular();
    }
    if (nearby.type === 'funicular-station') {
      return this.boardFunicular(nearby.id, nearby.fromEnd);
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
    if (nearby.type === 'metro-transfer' && nearby.targetLineId) {
      return this.transferMetroLine(nearby.targetLineId);
    }
    if (nearby.type === 'metro-board' && nearby.destId) {
      return this.rideMetro(this.state.metro.stationId, nearby.destId);
    }
    if (nearby.type === 'metro-transition') {
      if (this.state.mode === 'metro' && this.state.metro.phase === 'riding') {
        return this.triggerMetroDoorChime();
      }
      return { ok: true, state: this.state };
    }
    if (nearby.type === 'ferry-transition') {
      if (this.state.mode === 'ferry' && this.state.ferry.phase === 'sailing') {
        return this.soundFerryHorn();
      }
      return { ok: true, state: this.state };
    }
    if (nearby.type === 'santa-justa') {
      return this.openSantaJusta();
    }
    if (nearby.type === 'santa-justa-ascend') {
      return this.ascendSantaJusta();
    }
    if (nearby.type === 'santa-justa-descend') {
      return this.descendSantaJusta();
    }
    if (nearby.type === 'santa-justa-transition') {
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
    if (nearby.type === 'city-avenue' && nearby.targetZoneId) {
      return this.walkCityAvenue(nearby.targetZoneId);
    }
    if (nearby.type === 'city-walk-transition') {
      return { ok: true, state: this.state };
    }
    if (nearby.type === 'city-district-metro') {
      return this.enterMetroFromCityDistrict();
    }
    if (nearby.type === 'city-district-spot' && nearby.spotId) {
      return this.interactWithCityDistrictSpot(nearby.spotId);
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
    if (nearby.type === 'stand-up-bench') {
      return this.standUpFromRiversideBench();
    }
    if (nearby.type === 'riverside-bench') {
      return this.sitAtRiversideBench(nearby.id);
    }
    if (nearby.type === 'castanha-cart') {
      return this.buyCastanhaCone(nearby.id);
    }
    if (nearby.type === 'fountain' || nearby.type === 'statue') {
      return this.interactWithMonument(nearby.id);
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
    if (this.state.ridingVehicleId || this.state.ridingFunicularId) {
      return { ok: false, error: 'Step off transit before entering a shop or restaurant.' };
    }
    const venue = getVenueById(venueId);
    if (!venue) {
      return { ok: false, error: `Unknown venue: ${venueId}` };
    }

    this.state.activeMetroStationId = null;
    this.state.mode = 'interior';
    this.state.currentVenueId = venue.id;
    this.state.seatedDining = null;
    this.state.indoorActivity = null;
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
    const newMemory = venue.isLandmarkInterior ? false : unlockMemory(this.state, venue.memory);
    if (venue.isLandmarkInterior && venue.category === 'landmark') {
      this.state.energy = clamp(this.state.energy + 12, 0, 100);
    }

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
    this.state.seatedDining = null;
    this.state.indoorActivity = null;
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
    const newMemory = venue.isLandmarkInterior ? false : unlockMemory(this.state, venue.memory);
    if (venue.isLandmarkInterior && venue.category === 'landmark') {
      this.state.energy = clamp(this.state.energy + 12, 0, 100);
    }
    this.state.player.facing = 'up';
    this.state.cameraYaw = -Math.PI * 0.5;
    this.state.cameraPitch = 0.02;
    this.state.indoorActivity = {
      type: 'dialogue',
      venueId: venue.id,
      venueName: venue.name,
      proprietor: venue.proprietor,
      role: venue.proprietorRole,
      greeting: venue.greeting,
      phrasePt: venue.phrase.pt,
      phraseEn: venue.phrase.en,
      timer: 10.0
    };
    this.triggerEmote('Bom dia!', 3.6);
    this.state.statusMessage = `${venue.proprietor} (${venue.name}): "${venue.greeting}"`;
    return { ok: true, venue, newPhrase, newMemory, indoorActivity: this.state.indoorActivity, state: this.state };
  }

  inspectVenueDisplay() {
    const venue = this.getCurrentVenue();
    if (!venue) {
      return { ok: false, error: 'Enter a venue to inspect its display.' };
    }
    this.state.seatedDining = null;
    this.state.player.x = INTERIOR_STATIONS.display.x;
    this.state.player.y = INTERIOR_STATIONS.display.y;
    this.state.player.facing = 'left';
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.player.isMoving = false;
    this.state.cameraYaw = Math.PI;
    this.state.cameraPitch = -0.02;
    this.state.indoorActivity = {
      type: 'inspect',
      venueId: venue.id,
      venueName: venue.name,
      title: `${venue.name} Cultural Exhibit`,
      note: venue.displayNote,
      timer: 10.0
    };
    this.state.statusMessage = `${venue.name}: ${venue.displayNote}`;
    return { ok: true, venue, note: venue.displayNote, indoorActivity: this.state.indoorActivity, state: this.state };
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
          venueName: venue.name,
          day: this.state.day
        });
      }
      // Receive a glass (for drinks) or a plate (for food) and walk over to sit at the venue dining table!
      const seatX = 562;
      const seatY = 252;
      this.state.player.x = seatX;
      this.state.player.y = seatY;
      this.state.player.facing = 'right';
      this.state.player.walkTarget = null;
      this.state.player.walkQueue = [];
      this.state.player.isMoving = false;
      this.state.cameraYaw = 0;
      this.state.cameraPitch = -0.08;
      this.state.seatedDining = {
        active: true,
        servingType,
        glassStyle,
        itemId: item.id,
        itemName: item.name,
        costEur: item.costEur,
        fullnessDelta: item.fullnessDelta || 0,
        energyDelta: item.energyDelta || 0,
        venueId: venue.id,
        venueName: venue.name,
        seatX,
        seatY,
        tableX: 636,
        tableY: 252,
        plateX: 616,
        plateY: 252
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
        venueId: venue.id,
        venueName: venue.name,
        proprietor: venue.proprietor,
        timer: 14.0
      };
      this.advanceMinutes(isGlass ? 12 : 18);
      unlockedMilestone = unlockMemory(this.state, MILESTONE_MEMORIES.taste);
      const purchaseMsg = isGlass
        ? `Received a glass of ${item.name} and sat at the table in ${venue.name} (-${item.costEur.toFixed(2)} EUR, +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy).`
        : `Received a plate of ${item.name} and sat at the dining table in ${venue.name} (-${item.costEur.toFixed(2)} EUR, +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy).`;
      this.triggerSharedToast({ itemName: item.name, preserveIndoorActivity: true });
      this.state.statusMessage = purchaseMsg;
      recordLog(
        this.state,
        'dining',
        `Ordered ${item.name} (${isGlass ? 'served in a glass' : 'served on a plate'}) at ${venue.name} (-${item.costEur.toFixed(2)} EUR).`
      );
    } else {
      this.state.seatedDining = null;
      this.state.player.x = 380;
      this.state.player.y = 246;
      this.state.player.facing = 'up';
      this.state.player.walkTarget = null;
      this.state.player.walkQueue = [];
      this.state.player.isMoving = false;
      this.state.cameraYaw = -Math.PI * 0.5;
      this.state.cameraPitch = -0.02;
      this.state.stats.souvenirsBought += 1;
      this.state.satchel.push({
        id: item.id,
        name: item.name,
        venueName: venue.name,
        neighborhood: venue.memory.neighborhood,
        costEur: item.costEur,
        day: this.state.day
      });
      this.state.indoorActivity = {
        type: 'souvenir',
        itemId: item.id,
        itemName: item.name,
        costEur: item.costEur,
        venueId: venue.id,
        venueName: venue.name,
        proprietor: venue.proprietor,
        timer: 12.0
      };
      this.advanceMinutes(10);
      unlockedMilestone = unlockMemory(this.state, MILESTONE_MEMORIES.keepsake);
      this.state.statusMessage = `Wrapped ${item.name} at the counter and added it to your satchel from ${venue.name} (-${item.costEur.toFixed(2)} EUR).`;
      recordLog(this.state, 'shop', `Bought ${item.name} at ${venue.name} (-${item.costEur.toFixed(2)} EUR).`);
    }

    recordPhrase(this.state, venue.phrase, venue.name);
    unlockMemory(this.state, venue.memory);
    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();

    return {
      ok: true,
      item,
      venue,
      unlockedMilestone,
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
    const perfRes = this.triggerMiradouroPerformance(spot.id);

    this.state.statusMessage = `Rested at ${spot.name} (+30 Energy) while ${perfRes.encore?.musicianName || spot.musicianName || 'the street musician'} plays "${perfRes.encore?.songTitle || 'Serenata'}".`;
    recordLog(this.state, 'rest', `Rested at ${spot.name} (+30 Energy) listening to "${perfRes.encore?.songTitle || 'Serenata'}".`);

    return {
      ok: true,
      spot,
      encore: perfRes.encore,
      newPhrase,
      newMemory,
      state: this.state
    };
  }

  buyCastanhaCone(vendorId = null) {
    if (this.state.mode !== 'overworld' || this.state.ridingVehicleId) {
      return { ok: false, error: 'Walk up to a street castanha roaster cart to buy roasted chestnuts.' };
    }
    const monthInfo = getMonthInfo(this.state.month);
    if (!monthInfo.hasCastanhaVendors) {
      this.state.statusMessage =
        `Castanha carts roast along Lisboa streets from October through February (currently ${monthInfo.name}).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    let vendor = vendorId ? CASTANHA_VENDOR_MAP.get(vendorId) : null;
    if (!vendor) {
      let bestDist = Infinity;
      for (const cv of CASTANHA_VENDORS) {
        const d = distance(this.state.player.x, this.state.player.y, cv.x, cv.y);
        if (d < bestDist) {
          bestDist = d;
          vendor = cv;
        }
      }
    }
    if (!vendor) {
      return { ok: false, error: 'Castanha vendor not found.' };
    }

    const item = CASTANHA_CONE_ITEM;
    if (this.state.euros < item.costEur) {
      this.state.statusMessage = `Not enough EUR (${this.state.euros.toFixed(2)} EUR) for ${item.name} (${item.costEur.toFixed(2)} EUR).`;
      return { ok: false, error: this.state.statusMessage, state: this.state };
    }

    this.state.euros = roundMoney(this.state.euros - item.costEur);
    this.state.stats.eurosSpent = roundMoney(this.state.stats.eurosSpent + item.costEur);
    this.state.stats.mealsEaten += 1;
    this.state.stats.castanhaConesBought = (this.state.stats.castanhaConesBought || 0) + 1;
    this.state.fullness = clamp(this.state.fullness + item.fullnessDelta, 0, 100);
    this.state.energy = clamp(this.state.energy + item.energyDelta, 0, 100);
    this.state.needsMealToRecoverSpeed = false;
    this.state.holdingConeTimer = 14.0;
    this.advanceMinutes(8);

    if (!this.state.tastedFoods.some((f) => f.id === item.id)) {
      this.state.tastedFoods.push({
        id: item.id,
        name: item.name,
        venueName: `${vendor.vendorName} (${vendor.locationName})`,
        day: this.state.day
      });
    }
    const newPhrase = recordPhrase(this.state, vendor.phrase, `${vendor.vendorName} - ${vendor.locationName}`);
    const unlockedMilestone = unlockMemory(this.state, MILESTONE_MEMORIES.taste);
    this.triggerEmote('Castanhas quentinhas!', 3.6);
    this.state.statusMessage =
      `Bought a hot paper cone of Castanhas Assadas from ${vendor.vendorName} at ${vendor.locationName} (-${item.costEur.toFixed(2)} EUR, +${item.fullnessDelta} Fullness, +${item.energyDelta} Energy).`;
    recordLog(
      this.state,
      'dining',
      `Bought a hot paper cone of Castanhas Assadas from ${vendor.vendorName} (${vendor.locationName}) (-${item.costEur.toFixed(2)} EUR).`
    );

    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();

    return {
      ok: true,
      vendor,
      item,
      newPhrase,
      unlockedMilestone,
      soundEffect: 'register',
      state: this.state
    };
  }

  sitAtRiversideBench(benchId = null) {
    if (this.state.mode !== 'overworld' || this.state.ridingVehicleId) {
      return { ok: false, error: 'Stroll down to the Tagus promenade to sit on a riverside bench.' };
    }
    let bench = benchId ? RIVERSIDE_BENCH_MAP.get(benchId) : null;
    if (!bench) {
      let bestDist = Infinity;
      for (const rb of RIVERSIDE_BENCHES) {
        const d = distance(this.state.player.x, this.state.player.y, rb.x, rb.y);
        if (d < bestDist) {
          bestDist = d;
          bench = rb;
        }
      }
    }
    if (!bench) {
      return { ok: false, error: `Unknown riverside bench: ${benchId}` };
    }

    this.state.activeMetroStationId = null;
    this.state.seatedBenchId = bench.id;
    this.state.seatedBench = bench;
    this.state.player.x = bench.x;
    this.state.player.y = bench.y - 3;
    this.state.player.overworldX = bench.x;
    this.state.player.overworldY = bench.y - 3;
    this.state.player.facing = 'down';
    this.state.player.isMoving = false;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    // Orient first-person view across the Tagus toward Ponte 25 de Abril and Almada
    this.state.cameraYaw = Math.PI * 0.56;
    this.state.cameraPitch = 0.02;
    this.state.energy = clamp(this.state.energy + 12, 0, 100);
    this.state.stats.restsTaken += 1;
    this.advanceMinutes(10);
    this.updateNeighborhoodTracking();
    this.computeWalkSpeedMultiplier();
    this.triggerEmote('Vista do Tejo!', 3.2);
    this.state.statusMessage =
      `Seated on ${bench.name} (+12 Energy & restoring while seated): ${bench.viewNote}. Drag to pan across the Tagus, or press [E] / move to stand up.`;
    recordLog(this.state, 'rest', `Sat on ${bench.name} overlooking the Tagus River and Almada.`);

    return {
      ok: true,
      seated: true,
      bench,
      state: this.state
    };
  }

  standUpFromRiversideBench({ silent = false } = {}) {
    if (!this.state.seatedBenchId) {
      return { ok: false, error: 'You are not currently seated on a riverside bench.' };
    }
    const prevBench = this.state.seatedBench;
    this.state.seatedBenchId = null;
    this.state.seatedBench = null;
    this.state.player.y = Math.min(this.state.player.y, 996);
    this.state.player.overworldY = this.state.player.y;
    if (!silent) {
      this.state.statusMessage = prevBench
        ? `Stood up from ${prevBench.name} to continue strolling along the Tagus.`
        : 'Stood up from the riverside bench.';
    }
    return { ok: true, seated: false, prevBench, state: this.state };
  }

  interactWithMonument(monumentId) {
    const struct = DECORATIVE_STRUCTURES.find((s) => s.id === monumentId);
    if (!struct) {
      return { ok: false, error: `Unknown Lisbon monument: ${monumentId}` };
    }
    const isFountain = struct.monumentType === 'fountain';
    const energyBoost = isFountain ? 8 : 5;
    this.state.energy = clamp(this.state.energy + energyBoost, 0, 100);
    this.computeWalkSpeedMultiplier();
    this.triggerEmote(isFountain ? 'Agua fresca!' : 'Que monumento!', 3.4);
    this.state.statusMessage = isFountain
      ? `Refreshed at ${struct.label} (${struct.sculptor || 'Lisboa'}): ${struct.note} (+${energyBoost} Energy)`
      : `Admired ${struct.label} (${struct.sculptor || 'Lisboa'}): ${struct.note} (+${energyBoost} Energy)`;
    recordLog(
      this.state,
      isFountain ? 'fountain' : 'statue',
      `${isFountain ? 'Refreshed with cool aqueduct water at' : 'Admired bronze statue'} ${struct.label}.`
    );
    return {
      ok: true,
      monumentType: struct.monumentType || 'statue',
      struct,
      energyBoost,
      state: this.state
    };
  }


  triggerMiradouroPerformance(spotId = null) {
    let targetId = spotId;
    if (!targetId) {
      let bestSpot = REST_SPOTS[0];
      let bestD = Infinity;
      for (const s of REST_SPOTS) {
        const d = distance(this.state.player.x, this.state.player.y, s.x, s.y);
        if (d < bestD) {
          bestD = d;
          bestSpot = s;
        }
      }
      targetId = bestSpot.id;
    }
    const spot = getRestSpotById(targetId) || REST_SPOTS[0];
    const perf = (this.state.miradouroPerformances || []).find((m) => m.spotId === spot.id);
    const songs = perf?.songs || spot.songs || ['Serenata de Lisboa'];
    const nextIdx = ((perf ? perf.songIndex : 0) + 1) % songs.length;
    const nextTitle = songs[nextIdx];
    const musicianName = perf?.musicianName || spot.musicianName || 'Musico de Lisboa';
    const instrument = perf?.instrument || spot.instrument || 'Guitarra Portuguesa';
    if (perf) {
      perf.songIndex = nextIdx;
      perf.songTitle = nextTitle;
    }

    const requester = this.state.player.name || 'Traveler';
    this.signalSeq += 1;
    this.lastLocalEncoreAt = Date.now();
    this.state.miradouroEncore = {
      id: this.signalSeq,
      spotId: spot.id,
      spotName: spot.name,
      neighborhood: spot.neighborhood,
      musicianName,
      instrument,
      songIndex: nextIdx,
      songTitle: nextTitle,
      requestedBy: requester,
      text: `${musicianName} (${instrument}) performs "${nextTitle}" at ${spot.name}`,
      timer: 4.8
    };
    this.state.statusMessage = `${musicianName} (${instrument}) strikes up "${nextTitle}" at ${spot.name}!`;
    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'miradouro-perform',
        spotId: spot.id,
        requestedBy: requester
      });
    }
    return { ok: true, spot, encore: this.state.miradouroEncore, state: this.state };
  }

  triggerSharedToast({ itemName = '', customText = '', preserveIndoorActivity = false } = {}) {
    const loc = this.getCurrentLocationInfo();
    const speaker = this.state.player.name || 'Traveler';
    const cleanItem = String(itemName || '').trim();
    const text =
      String(customText || '').trim() ||
      (cleanItem
        ? `Saude! Raising a toast with ${cleanItem} at ${loc.locationName}!`
        : `Saude! Um brinde a Lisboa at ${loc.locationName}!`);

    this.triggerEmote('Saude!', 4.0);
    this.signalSeq += 1;
    this.lastLocalToastAt = Date.now();
    this.state.sharedToast = {
      id: this.signalSeq,
      locationKey: loc.locationKey,
      locationName: loc.locationName,
      speakerName: speaker,
      itemName: cleanItem,
      text,
      timer: 4.5
    };
    if (this.state.mode === 'interior' && !preserveIndoorActivity) {
      this.state.indoorActivity = {
        type: 'toast',
        venueId: this.state.currentVenueId,
        venueName: loc.locationName,
        speakerName: speaker,
        itemName: cleanItem || this.state.seatedDining?.itemName || 'Lisboa',
        text,
        timer: 8.0
      };
    }
    this.state.statusMessage = text;
    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'cafe-toast',
        locationKey: loc.locationKey,
        locationName: loc.locationName,
        speakerName: speaker,
        itemName: cleanItem,
        text
      });
    }
    return { ok: true, toast: this.state.sharedToast, state: this.state };
  }

  triggerCathedralChime({ hour = null, triggeredBy = '', emitNetwork = true, updateStatus = true } = {}) {
    const rawHour = Number.isFinite(hour)
      ? ((Math.floor(hour) % 24) + 24) % 24
      : Math.floor(this.state.minutesOfDay / 60);
    const clockLabel = `${String(rawHour).padStart(2, '0')}:00`;
    const tolls = ((rawHour + 11) % 12) + 1;
    const ringer = String(triggeredBy || this.state.player.name || 'Se de Lisboa (1147)').trim();

    this.signalSeq += 1;
    this.lastHourlyChimeKey = `${this.state.day}:${rawHour}`;
    if (emitNetwork) {
      this.lastLocalCathedralChimeAt = Date.now();
    }
    this.state.cathedralChime = {
      id: this.signalSeq,
      day: this.state.day,
      hour: rawHour,
      clockLabel,
      tolls,
      triggeredBy: ringer,
      text: `Se de Lisboa (1147) Bell Towers toll ${tolls} ${tolls === 1 ? 'chime' : 'chimes'} for ${clockLabel} across Lisboa`,
      timer: 4.8
    };
    if (this.state.mode === 'interior' && this.state.currentVenueId === 'se-de-lisboa') {
      this.state.indoorActivity = {
        type: 'cathedral-bell',
        venueId: 'se-de-lisboa',
        venueName: 'Se de Lisboa',
        clockLabel,
        tolls,
        text: this.state.cathedralChime.text,
        timer: 8.0
      };
    }
    if (updateStatus) {
      this.state.statusMessage = this.state.cathedralChime.text;
    }
    if (emitNetwork && this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'cathedral-chime',
        hour: rawHour,
        triggeredBy: ringer
      });
    }
    return { ok: true, cathedralChime: this.state.cathedralChime, state: this.state };
  }

  triggerSharedPostcard({ caption = '' } = {}) {
    const loc = this.getCurrentLocationInfo();
    const photographer = this.state.player.name || 'Traveler';
    const peersHere = this.getCompanionsInSameLocation();
    const companions = [photographer, ...peersHere.map((p) => p.name)];
    const clockStr = formatClock(this.state.minutesOfDay);
    const cleanCaption =
      String(caption || '').trim() ||
      (peersHere.length > 0
        ? `Postcard from ${loc.locationName} with ${companions.join(' & ')}`
        : `Postcard from ${loc.locationName} (${this.state.currentNeighborhoodName || 'Lisboa'})`);

    this.triggerEmote('Sorria!', 4.0);
    this.signalSeq += 1;
    this.lastLocalPostcardAt = Date.now();
    const card = {
      id: this.signalSeq,
      locationKey: loc.locationKey,
      locationName: loc.locationName,
      neighborhood: this.state.currentNeighborhoodName || 'Lisboa',
      photographer,
      companions,
      day: this.state.day,
      clock: clockStr,
      caption: cleanCaption,
      timer: 4.8
    };
    this.state.sharedPostcard = card;
    this.state.postcards = [card, ...(this.state.postcards || [])].slice(0, 12);
    this.state.statusMessage = `Captured Shared Lisboa Postcard at ${loc.locationName}: "${cleanCaption}"`;
    recordLog(this.state, 'postcard', `Snapped Lisboa Postcard at ${loc.locationName} (${companions.join(' & ')}).`);

    if (this.globalTransitSynced) {
      this.emitTransitIntent({
        action: 'shared-postcard',
        locationKey: loc.locationKey,
        locationName: loc.locationName,
        neighborhood: card.neighborhood,
        photographer,
        companions,
        clock: clockStr,
        caption: cleanCaption
      });
    }
    return { ok: true, postcard: card, state: this.state };
  }

  jumpToEvening() {
    this.state.minutesOfDay = 20 * 60 + 30;
    this.state.bairroAltoPartyActive = true;
    this.state.eveningNoticeShown = true;
    this.state.statusMessage =
      'Evening falls over Lisboa (20:30)! String lights glow atop Bairro Alto as revelers gather with drinks outside Bar da Noite!';
    recordLog(this.state, 'evening', 'Evening arrived (20:30) - Bairro Alto hilltop party lights & Bar da Noite came alive.');
    return { ok: true, minutesOfDay: this.state.minutesOfDay, state: this.state };
  }

  restOvernight() {
    if (this.state.ridingFunicularId) {
      this.disembarkFunicular();
    }
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
      this.exitMetroStation({ immediate: true, forceOverworld: true });
    }
    if (this.state.cityWalk?.active) {
      this.state.cityWalk.active = false;
      this.state.cityWalk.progress = 0;
    }
    if (this.state.mode === 'city-district') {
      this.completeMetroExitToStreet(null, { forceOverworld: true });
    }
    if (this.state.mode === 'santa-justa') {
      this.descendSantaJusta({ immediate: true, forceOverworld: true });
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
    this.state.bairroAltoPartyActive = false;
    this.state.eveningNoticeShown = false;
    this.state.energy = 100;
    this.state.fullness = Math.max(this.state.fullness, 75);
    this.state.needsMealToRecoverSpeed = false;
    this.computeWalkSpeedMultiplier();
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

export const interactionMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    interactionMethods[key] = _Mixin.prototype[key];
  }
}
