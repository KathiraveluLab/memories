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
  getCompanionsInSameLocation() {
    const s = this.state;
    const remotes = Array.isArray(s.remotePlayers) ? s.remotePlayers : [];
    return remotes.filter((rp) => {
      if (s.ridingVehicleId) return rp.ridingVehicleId === s.ridingVehicleId;
      if (s.mode === 'interior') return rp.mode === 'interior' && rp.currentVenueId === s.currentVenueId;
      if (s.mode === 'metro') return rp.mode === 'metro' && rp.metroStationId === s.metro?.stationId;
      if (s.mode === 'city-district') return rp.mode === 'city-district' && rp.cityDistrictId === s.cityDistrictId;
      if (s.mode === 'ferry') return rp.mode === 'ferry' && (rp.ferryPortId === s.ferry?.portId || rp.ferryPhase === s.ferry?.phase);
      return (
        rp.mode === 'overworld' &&
        !rp.ridingVehicleId &&
        (rp.neighborhoodName === s.currentNeighborhoodName ||
          distance(s.player.x, s.player.y, rp.x, rp.y) <= 520)
      );
    });
  }

  getCurrentLocationInfo() {
    const s = this.state;
    if (s.mode === 'interior' && s.currentVenueId) {
      const v = getVenueById(s.currentVenueId);
      return {
        locationKey: `venue:${s.currentVenueId}`,
        locationName: v ? v.name : 'Lisboa Venue'
      };
    }
    if (s.mode === 'city-district' && s.cityDistrictId) {
      const dist = getCityDistrictById(s.cityDistrictId);
      return {
        locationKey: `district:${s.cityDistrictId}`,
        locationName: dist ? dist.name : 'Lisboa City District'
      };
    }
    if (s.mode === 'santa-justa') {
      const alt = Math.round(s.santaJusta?.altitudeMeters || 0);
      return {
        locationKey: 'santa-justa:miradouro',
        locationName:
          s.santaJusta?.phase === 'miradouro'
            ? 'Elevador de Santa Justa Miradouro (45m)'
            : `Elevador de Santa Justa (${alt}m)`
      };
    }
    if (s.mode === 'ferry' && s.ferry?.portId) {
      const dest = getFerryDestinationById(s.ferry.portId);
      return {
        locationKey: `ferry:${s.ferry.portId}`,
        locationName: s.ferry.portId === FERRY_TERMINAL.id ? FERRY_TERMINAL.shortName : (dest?.name || 'Tagus South Bank')
      };
    }
    if (s.mode === 'metro' && s.metro?.stationId) {
      const st = getMetroStationById(s.metro.stationId);
      return {
        locationKey: `metro:${s.metro.stationId}`,
        locationName: st ? st.name : 'Metropolitano de Lisboa'
      };
    }
    if (s.ridingVehicleId) {
      const veh = this.getRidingVehicle();
      return {
        locationKey: `vehicle:${s.ridingVehicleId}`,
        locationName: veh ? veh.name : 'Lisboa Transit'
      };
    }
    return {
      locationKey: `overworld:${s.currentNeighborhoodId || 'chiado'}`,
      locationName: s.currentNeighborhoodName || 'Chiado'
    };
  }

  computeWalkSpeedMultiplier() {
    const s = this.state;
    const energy = clamp(Number(s.energy) || 0, 0, 100);
    const fullness = clamp(Number(s.fullness) || 0, 0, 100);

    if (energy <= CRITICAL_LOW_ENERGY_THRESHOLD) {
      s.needsMealToRecoverSpeed = true;
    }

    // Critical low-energy crawl: player moves really, really slow (15% - 22% speed) until they eat a meal in a restaurant or bakery
    if (s.needsMealToRecoverSpeed || energy <= CRITICAL_LOW_ENERGY_THRESHOLD) {
      const crawl = 0.15 + (clamp(energy, 0, CRITICAL_LOW_ENERGY_THRESHOLD) / CRITICAL_LOW_ENERGY_THRESHOLD) * 0.07;
      s.walkSpeedMultiplier = roundMoney(clamp(crawl, 0.15, 0.22));
      return s.walkSpeedMultiplier;
    }

    // Above threshold on both energy and fullness: full 1.0x strolling speed
    if (energy >= PROPORTIONAL_SLOWDOWN_THRESHOLD && fullness >= PROPORTIONAL_SLOWDOWN_THRESHOLD) {
      s.walkSpeedMultiplier = 1.0;
      return 1.0;
    }

    // Proportional slowdown as either energy or fullness drops below PROPORTIONAL_SLOWDOWN_THRESHOLD (70)
    const energySpan = Math.max(1, PROPORTIONAL_SLOWDOWN_THRESHOLD - CRITICAL_LOW_ENERGY_THRESHOLD);
    const energyFactor =
      energy >= PROPORTIONAL_SLOWDOWN_THRESHOLD
        ? 1.0
        : 0.3 + 0.7 * clamp((energy - CRITICAL_LOW_ENERGY_THRESHOLD) / energySpan, 0, 1);

    const fullnessFactor =
      fullness >= PROPORTIONAL_SLOWDOWN_THRESHOLD
        ? 1.0
        : 0.35 + 0.65 * clamp(fullness / PROPORTIONAL_SLOWDOWN_THRESHOLD, 0, 1);

    const minFactor = Math.min(energyFactor, fullnessFactor);
    const maxFactor = Math.max(energyFactor, fullnessFactor);
    const combined = minFactor * (0.85 + 0.15 * maxFactor);
    s.walkSpeedMultiplier = roundMoney(clamp(combined, 0.26, 1.0));
    return s.walkSpeedMultiplier;
  }

  computePlayerScore() {
    const s = this.state;
    return (
      s.memories.length * 100 +
      s.visitedVenues.length * 40 +
      s.learnedPhrases.length * 25 +
      s.stats.mealsEaten * 30 +
      s.stats.souvenirsBought * 35 +
      (s.visitedFerryPorts || []).length * 50 +
      (s.visitedCityDistricts || []).length * 45 +
      (s.postcards || []).length * 30
    );
  }

  computeExplorerRank(memoriesCount = this.state.memories.length) {
    if (memoriesCount >= ALL_MEMORIES.length) {
      return 'Grand Master of Lisboa (All 26 Memories Captured)';
    }
    if (memoriesCount >= 18) {
      return 'Seasoned Lisboeta Chronicler';
    }
    if (memoriesCount >= 10) {
      return 'Chiado & Alfama Cultural Flaneur';
    }
    return 'Bairro Alto Cobblestone Stroller';
  }

  buildFinalScorecard() {
    const s = this.state;
    const totalRides =
      s.stats.tramRides + s.stats.busRides + s.stats.metroRides + s.stats.ferryRides;
    const totalScore = this.computePlayerScore();
    const explorerRank = this.computeExplorerRank(s.memories.length);

    const walletZero = s.euros <= 0;
    const energyZero = s.energy <= 0;
    const fullnessZero = s.fullness <= 0;
    const reason =
      s.gameOverReason ||
      (energyZero && fullnessZero
        ? 'energy-and-fullness'
        : energyZero
          ? 'energy'
          : fullnessZero
            ? 'fullness'
            : walletZero
              ? 'wallet'
              : null);
    const title =
      reason === 'energy-and-fullness'
        ? 'GAME OVER - Energy & Fullness Reached 0'
        : reason === 'energy'
          ? 'GAME OVER - Energy Reached 0'
          : reason === 'fullness'
            ? 'GAME OVER - Fullness Reached 0'
            : 'GAME OVER - Wallet Reached 0.00 EUR';
    const reasonLabel =
      reason === 'energy-and-fullness'
        ? 'Energy 0 & Fullness 0'
        : reason === 'energy'
          ? 'Energy 0'
          : reason === 'fullness'
            ? 'Fullness 0'
            : 'Wallet 0.00 EUR';

    const localEntry = {
      id: 'local',
      name: s.player.name || 'Traveler 1',
      outfitId: s.player.outfitId,
      isLocal: true,
      totalScore,
      explorerRank,
      memoriesCaptured: s.memories.length,
      memoriesTotal: s.totalMemoriesPossible,
      venuesVisited: s.visitedVenues.length,
      venuesTotal: VENUES.length,
      mealsEaten: s.stats.mealsEaten,
      souvenirsBought: s.stats.souvenirsBought,
      transitRides: totalRides,
      phrasesLearned: s.learnedPhrases.length,
      postcardsCaptured: (s.postcards || []).length,
      eurosRemaining: s.euros,
      energyRemaining: Math.round(s.energy),
      fullnessRemaining: Math.round(s.fullness),
      gameOver: Boolean(s.gameOver),
      gameOverReason: reason,
      reasonLabel
    };

    const peerEntries = (s.remotePlayers || []).map((rp) => {
      const rpMemories = Number.isFinite(rp.memoriesCaptured) ? rp.memoriesCaptured : 0;
      const rpVenues = Number.isFinite(rp.venuesVisited) ? rp.venuesVisited : 0;
      const rpMeals = Number.isFinite(rp.mealsEaten) ? rp.mealsEaten : 0;
      const rpSouvenirs = Number.isFinite(rp.souvenirsBought) ? rp.souvenirsBought : 0;
      const rpRides = Number.isFinite(rp.transitRides) ? rp.transitRides : 0;
      const rpPhrases = Number.isFinite(rp.phrasesLearned) ? rp.phrasesLearned : 1;
      const rpPostcards = Number.isFinite(rp.postcardsCaptured) ? rp.postcardsCaptured : 0;
      const rpScore = Number.isFinite(rp.totalScore)
        ? rp.totalScore
        : rpMemories * 100 + rpVenues * 40 + rpPhrases * 25 + rpMeals * 30 + rpSouvenirs * 35 + rpPostcards * 30;
      const rpReason = rp.gameOverReason || null;
      const rpReasonLabel =
        rpReason === 'energy-and-fullness'
          ? 'Energy 0 & Fullness 0'
          : rpReason === 'energy'
            ? 'Energy 0'
            : rpReason === 'fullness'
              ? 'Fullness 0'
              : '0.00 EUR';
      return {
        id: rp.id,
        name: rp.name || 'Companion',
        outfitId: rp.outfitId,
        isLocal: false,
        totalScore: rpScore,
        explorerRank: rp.explorerRank || this.computeExplorerRank(rpMemories),
        memoriesCaptured: rpMemories,
        memoriesTotal: s.totalMemoriesPossible,
        venuesVisited: rpVenues,
        venuesTotal: VENUES.length,
        mealsEaten: rpMeals,
        souvenirsBought: rpSouvenirs,
        transitRides: rpRides,
        phrasesLearned: rpPhrases,
        postcardsCaptured: rpPostcards,
        eurosRemaining: Number.isFinite(rp.eurosRemaining) ? rp.eurosRemaining : 120,
        energyRemaining: Number.isFinite(rp.energyRemaining) ? rp.energyRemaining : 100,
        fullnessRemaining: Number.isFinite(rp.fullnessRemaining) ? rp.fullnessRemaining : 85,
        gameOver: Boolean(rp.gameOver),
        gameOverReason: rpReason,
        reasonLabel: rpReasonLabel
      };
    });

    const multiplayerComparison = [localEntry, ...peerEntries]
      .sort(
        (a, b) =>
          b.totalScore - a.totalScore ||
          b.memoriesCaptured - a.memoriesCaptured ||
          b.venuesVisited - a.venuesVisited ||
          (a.isLocal ? -1 : 1)
      )
      .map((entry, idx) => ({
        ...entry,
        standing: idx + 1
      }));

    const localStanding =
      multiplayerComparison.find((entry) => entry.isLocal)?.standing || 1;
    const groupTotals = {
      totalPlayers: multiplayerComparison.length,
      combinedScore: multiplayerComparison.reduce((acc, p) => acc + p.totalScore, 0),
      highestMemories: Math.max(...multiplayerComparison.map((p) => p.memoriesCaptured)),
      topScorerName: multiplayerComparison[0]?.name || localEntry.name,
      localStanding
    };

    return {
      title,
      subtitle: `Your Lisboa exploration concluded on Day ${s.day} at ${formatClock(s.minutesOfDay)} in ${s.currentNeighborhoodName}.`,
      gameOverReason: reason,
      reasonLabel,
      explorerRank,
      totalScore,
      dayReached: s.day,
      finalClock: formatClock(s.minutesOfDay),
      finalNeighborhood: s.currentNeighborhoodName,
      eurosRemaining: s.euros,
      energyRemaining: Math.round(s.energy),
      fullnessRemaining: Math.round(s.fullness),
      eurosSpent: s.stats.eurosSpent,
      distanceWalkedPx: Math.round(s.stats.distanceWalkedPx),
      distanceWalkedMeters: Math.max(0, Math.round(s.stats.distanceWalkedPx / 12)),
      neighborhoodsVisited: s.visitedNeighborhoods.length,
      neighborhoodsTotal: NEIGHBORHOODS.length,
      venuesVisited: s.visitedVenues.length,
      venuesTotal: VENUES.length,
      ferryPortsVisited: (s.visitedFerryPorts || []).length,
      ferryPortsTotal: FERRY_DESTINATIONS.length,
      mealsEaten: s.stats.mealsEaten,
      tastedFoods: s.tastedFoods.map((f) => f.name),
      souvenirsBought: s.stats.souvenirsBought,
      satchelItems: s.satchel.map((k) => k.name),
      phrasesLearned: s.learnedPhrases.length,
      postcardsCaptured: (s.postcards || []).length,
      transitRides: {
        tram: s.stats.tramRides,
        bus: s.stats.busRides,
        metro: s.stats.metroRides,
        ferry: s.stats.ferryRides,
        total: totalRides
      },
      memoriesCaptured: s.memories.length,
      memoriesTotal: s.totalMemoriesPossible,
      memoriesList: s.memories.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        neighborhood: m.neighborhood,
        day: m.day,
        clock: m.clock
      })),
      multiplayerComparison,
      groupTotals
    };
  }

  exportMemorySummaryCard({ format = 'text' } = {}) {
    const sc = this.buildFinalScorecard();
    if (this.state.gameOver) {
      this.state.gameOverSummary = sc;
    }
    if (format === 'json') {
      const jsonText = JSON.stringify(sc, null, 2);
      this.state.lastExportedSummaryCard = jsonText;
      return { ok: true, format: 'json', cardText: jsonText, scorecard: sc };
    }

    const outfit = PLAYER_OUTFITS.find((o) => o.id === this.state.player.outfitId) || PLAYER_OUTFITS[0];
    const capturedMap = new Map((sc.memoriesList || []).map((m) => [m.id, m]));
    const lines = [
      '=== MEMORIES: LISBOA EXPLORATION SUMMARY CARD ===',
      `Traveler: ${this.state.player.name} (${outfit.name})`,
      `Month & Weather: ${getMonthInfo(this.state.month).name} (${getMonthInfo(this.state.month).ptName}) - ${getMonthInfo(this.state.month).avgHighC}C / ${getMonthInfo(this.state.month).avgLowC}C, ${getMonthInfo(this.state.month).weatherLabel} | ${getMonthInfo(this.state.month).eventTitle}`,
      `Stroll Status: ${this.state.gameOver ? `Game Over (${sc.reasonLabel || 'Wallet 0.00 EUR'})` : `Active Stroll (${sc.eurosRemaining.toFixed(2)} EUR remaining)`}`,
      `Vitals: Wallet ${sc.eurosRemaining.toFixed(2)} EUR | Energy ${sc.energyRemaining}/100 | Fullness ${sc.fullnessRemaining}/100`,
      `Timeline: Day ${sc.dayReached} - ${sc.finalClock} | Neighborhood: ${sc.finalNeighborhood}`,
      `Final Score: ${sc.totalScore} pts | Rank: ${sc.explorerRank}`,
      '',
      '--- EXPLORATION TALLY ---',
      `Memories Captured: ${sc.memoriesCaptured} / ${sc.memoriesTotal}`,
      `Buildings Explored: ${sc.venuesVisited} / ${sc.venuesTotal} Venues (${sc.neighborhoodsVisited} / ${sc.neighborhoodsTotal} Neighborhoods)`,
      `Tagus Ferry Ports: ${sc.ferryPortsVisited} / ${sc.ferryPortsTotal} South-Bank Ports`,
      `Meals & Pastries: ${sc.mealsEaten} (${sc.tastedFoods.length > 0 ? sc.tastedFoods.join(', ') : 'None'})`,
      `Keepsakes & Souvenirs: ${sc.souvenirsBought} (${sc.satchelItems.length > 0 ? sc.satchelItems.join(', ') : 'None'})`,
      `Public Transit Rides: ${sc.transitRides.total} (Tram 28E: ${sc.transitRides.tram}, Bus 737: ${sc.transitRides.bus}, Metro: ${sc.transitRides.metro}, Ferry: ${sc.transitRides.ferry})`,
      `Portuguese Phrases Learned: ${sc.phrasesLearned} | Shared Postcards: ${sc.postcardsCaptured}`,
      `Distance Walked: ${sc.distanceWalkedMeters} m | Total Spent: ${sc.eurosSpent.toFixed(2)} EUR`,
      '',
      `--- COMPARATIVE MULTIPLAYER SCORECARD (${sc.groupTotals.totalPlayers} ${sc.groupTotals.totalPlayers === 1 ? 'Traveler' : 'Travelers'} | Combined Score: ${sc.groupTotals.combinedScore} pts) ---`
    ];

    for (const p of sc.multiplayerComparison) {
      const tag = p.isLocal ? ' (YOU)' : '';
      const statusTag = p.gameOver ? (p.reasonLabel || 'Wallet 0.00 EUR') : `${p.eurosRemaining.toFixed(2)} EUR`;
      lines.push(
        `#${p.standing} ${p.name}${tag} - ${p.totalScore} pts | Memories: ${p.memoriesCaptured}/${p.memoriesTotal} | Venues: ${p.venuesVisited}/${p.venuesTotal} | Meals: ${p.mealsEaten} | Keepsakes: ${p.souvenirsBought} | Rides: ${p.transitRides} | ${statusTag}`
      );
    }

    lines.push('', `--- LISBOA MEMORIES CHECKLIST (${sc.memoriesCaptured} / ${sc.memoriesTotal}) ---`);
    for (const mem of ALL_MEMORIES) {
      const found = capturedMap.get(mem.id);
      if (found) {
        lines.push(`[CAPTURED] ${found.title} (${found.neighborhood} - Day ${found.day} ${found.clock})`);
      } else {
        lines.push(`[MISSED]   ${mem.title} (${mem.neighborhood})`);
      }
    }

    const cardText = lines.join('\n');
    this.state.lastExportedSummaryCard = cardText;
    return { ok: true, format: 'text', cardText, scorecard: sc };
  }

  checkGameOver() {
    const walletZero = this.state.euros <= 0;
    const energyZero = this.state.energy <= 0;
    const fullnessZero = this.state.fullness <= 0;

    if (!walletZero && !energyZero && !fullnessZero) {
      return false;
    }

    if (walletZero) this.state.euros = 0;
    if (energyZero) this.state.energy = 0;
    if (fullnessZero) this.state.fullness = 0;

    const wasGameOver = this.state.gameOver;
    if (!this.state.gameOverReason) {
      if (energyZero && fullnessZero) {
        this.state.gameOverReason = 'energy-and-fullness';
      } else if (energyZero) {
        this.state.gameOverReason = 'energy';
      } else if (fullnessZero) {
        this.state.gameOverReason = 'fullness';
      } else {
        this.state.gameOverReason = 'wallet';
      }
    } else if (
      energyZero &&
      fullnessZero &&
      (this.state.gameOverReason === 'energy' || this.state.gameOverReason === 'fullness')
    ) {
      this.state.gameOverReason = 'energy-and-fullness';
    }

    this.state.gameOver = true;
    this.state.player.isMoving = false;
    this.state.player.walkTarget = null;
    this.state.player.walkQueue = [];
    this.state.gameOverSummary = this.buildFinalScorecard();

    if (!wasGameOver) {
      const reasonMsg =
        this.state.gameOverReason === 'energy-and-fullness'
          ? 'Your energy and fullness reached 0!'
          : this.state.gameOverReason === 'energy'
            ? 'Your energy reached 0!'
            : this.state.gameOverReason === 'fullness'
              ? 'Your fullness reached 0!'
              : 'Your wallet reached 0.00 EUR!';
      const logReason =
        this.state.gameOverReason === 'energy-and-fullness'
          ? 'Energy 0 & Fullness 0'
          : this.state.gameOverReason === 'energy'
            ? '0 Energy'
            : this.state.gameOverReason === 'fullness'
              ? '0 Fullness'
              : '0.00 EUR';
      this.state.statusMessage =
        `GAME OVER: ${reasonMsg} Final Tally: ${this.state.memories.length} / ${this.state.totalMemoriesPossible} Memories, ` +
        `${this.state.visitedVenues.length} / ${VENUES.length} Venues, Score ${this.state.gameOverSummary.totalScore} pts.`;
      recordLog(
        this.state,
        'gameover',
        `Game Over at ${logReason} (${this.state.memories.length}/${this.state.totalMemoriesPossible} Memories, Score ${this.state.gameOverSummary.totalScore}).`
      );
    }
    return true;
  }

  checkWalletGameOver() {
    return this.checkGameOver();
  }

  emitTransitIntent(payload) {
    this.transitIntentSeq += 1;
    this.state.lastTransitIntent = {
      id: this.transitIntentSeq,
      ...payload
    };
  }

  syncGlobalTransit(transit) {
    if (!transit || typeof transit !== 'object') return;
    const wasSynced = this.globalTransitSynced;
    this.globalTransitSynced = true;
    this.state.globalTransitSynced = true;

    // 1. Authoritative Surface Tram 28E & Carris Bus 737/758
    if (Array.isArray(transit.vehicles)) {
      for (const sv of transit.vehicles) {
        const local = this.state.vehicles.find((v) => v.id === sv.id);
        if (!local) continue;
        const prevStopId = local.currentStopId;
        local.targetX = sv.x;
        local.targetY = sv.y;
        const jumpDist = Math.hypot((sv.x ?? local.x) - local.x, (sv.y ?? local.y) - local.y);
        if (!wasSynced || jumpDist > 180) {
          local.x = sv.x;
          local.y = sv.y;
        }
        local.heading = sv.heading;
        local.waypointIndex = sv.waypointIndex;
        local.direction = sv.direction;
        local.dwellRemaining = sv.dwellRemaining;
        local.yielding = Boolean(sv.yielding);
        local.currentStopId = sv.currentStopId || null;
        local.currentStopName = sv.currentStopName || null;
        local.nextStopName = sv.nextStopName || local.nextStopName;
        local.stopBellRung = Boolean(sv.stopBellRung);

        // Synchronize window cityscape scroll offset so companions aboard the same bus/tram see identical passing scenery!
        if (Number.isFinite(sv.scrollOffset)) {
          local.scrollOffset = sv.scrollOffset;
          if (this.state.ridingVehicleId === local.id) {
            if (local.mode === 'tram') this.state.tramScrollOffset = sv.scrollOffset;
            else if (local.mode === 'bus') this.state.busScrollOffset = sv.scrollOffset;
          }
        }

        // Synchronize onboard STOP bell & "Proxima Paragem" announcements across ALL companions sharing this vehicle!
        if (sv.bellAnnouncement && Number.isFinite(sv.bellAnnouncement.id)) {
          const prevBellId = this.lastServerBellIds.get(local.id) || 0;
          if (sv.bellAnnouncement.id > prevBellId) {
            this.lastServerBellIds.set(local.id, sv.bellAnnouncement.id);
            const justRangLocally =
              sv.bellAnnouncement.ringerName === this.state.player.name &&
              Date.now() - this.lastLocalBellAt < 2500;
            if (this.state.ridingVehicleId === local.id && !justRangLocally) {
              this.announcementSeq += 1;
              this.state.transitAnnouncement = {
                id: this.announcementSeq,
                stopName: sv.bellAnnouncement.stopName,
                text: sv.bellAnnouncement.text,
                vehicleMode: sv.bellAnnouncement.vehicleMode || local.mode,
                ringerName: sv.bellAnnouncement.ringerName || 'Companion',
                ringBell: true,
                timer: 5.0
              };
              this.state.statusMessage = `${sv.bellAnnouncement.ringerName} rang the bell aboard ${local.name} - ${sv.bellAnnouncement.text}.`;
            }
          }
        }

        // If local player rang the bell and shared tram/bus just docked at a stop, alight cleanly!
        if (
          this.state.ridingVehicleId === local.id &&
          this.state.alightAtNextStop &&
          local.currentStopId &&
          local.currentStopId !== prevStopId
        ) {
          local.x = sv.x;
          local.y = sv.y;
          this.disembarkTransit();
        }
      }
    }

    // 2. Authoritative Underground Metro Linha Azul Train
    if (transit.metro && typeof transit.metro === 'object') {
      this.serverMetro = transit.metro;
      const sm = transit.metro;
      if (sm.doorChime && Number.isFinite(sm.doorChime.id) && sm.doorChime.id > this.lastServerMetroChimeId) {
        this.lastServerMetroChimeId = sm.doorChime.id;
        const justChimedLocally =
          sm.doorChime.triggeredBy === this.state.player.name &&
          Date.now() - this.lastLocalMetroChimeAt < 2500;
        const m = this.state.metro;
        const inSameMetroContext =
          this.state.mode === 'metro' &&
          (m.phase === 'riding' ||
            m.stationId === sm.doorChime.stationId ||
            m.stationId === sm.doorChime.toStationId);
        if (inSameMetroContext && !justChimedLocally) {
          this.signalSeq += 1;
          this.state.metroDoorChime = {
            id: this.signalSeq,
            stationId: sm.doorChime.stationId,
            toStationId: sm.doorChime.toStationId,
            triggeredBy: sm.doorChime.triggeredBy || 'Linha Azul',
            text: sm.doorChime.text || 'Atencao as portas - Doors closing!',
            timer: 3.4
          };
          this.state.statusMessage = `${this.state.metroDoorChime.triggeredBy} - ${this.state.metroDoorChime.text}`;
        }
      }
      if (this.state.mode === 'metro') {
        const m = this.state.metro;
        if (m.phase === 'platform') {
          if (sm.stationId === m.stationId && sm.phase === 'docked') {
            m.trainX = 380;
          } else if (sm.fromStationId === m.stationId || sm.toStationId === m.stationId) {
            m.trainX = sm.trainX;
          } else {
            m.trainX = 380;
          }
        } else if (m.phase === 'riding') {
          if (sm.phase === 'riding' && sm.toStationId === m.toStationId) {
            m.phaseProgress = Math.max(m.phaseProgress, sm.progress);
          } else if (sm.phase === 'docked' && sm.stationId === m.toStationId && m.phaseProgress > 0.25) {
            m.phaseProgress = 1;
          }
        }
      }
    }

    // 3. Authoritative Transtejo Tagus Catamaran Fleet
    if (Array.isArray(transit.ferries)) {
      this.serverFerries = transit.ferries;
      for (const sf of transit.ferries) {
        if (sf.hornSignal && Number.isFinite(sf.hornSignal.id)) {
          const prevHornId = this.lastServerFerryHornIds.get(sf.routeId) || 0;
          if (sf.hornSignal.id > prevHornId) {
            this.lastServerFerryHornIds.set(sf.routeId, sf.hornSignal.id);
            const justHornedLocally =
              sf.hornSignal.triggeredBy === this.state.player.name &&
              Date.now() - this.lastLocalFerryHornAt < 2500;
            const f = this.state.ferry;
            const localRouteId =
              f.toPortId === FERRY_TERMINAL.id ? f.fromPortId : (f.toPortId || f.portId);
            const inSameFerryContext =
              this.state.mode === 'ferry' &&
              (localRouteId === sf.routeId ||
                f.portId === sf.hornSignal.fromPortId ||
                f.portId === sf.hornSignal.toPortId ||
                f.portId === FERRY_TERMINAL.id);
            if (inSameFerryContext && !justHornedLocally) {
              this.signalSeq += 1;
              this.state.ferryHornSignal = {
                id: this.signalSeq,
                routeId: sf.routeId,
                fromPortId: sf.hornSignal.fromPortId,
                toPortId: sf.hornSignal.toPortId,
                triggeredBy: sf.hornSignal.triggeredBy || 'Transtejo Captain',
                text: sf.hornSignal.text || 'Transtejo Departure Horn!',
                timer: 3.6
              };
              this.state.statusMessage = `${this.state.ferryHornSignal.triggeredBy} sounded the Transtejo horn - ${this.state.ferryHornSignal.text}`;
            }
          }
        }
      }
      if (this.state.mode === 'ferry' && this.state.ferry.phase === 'sailing') {
        const f = this.state.ferry;
        const routeId = f.toPortId === FERRY_TERMINAL.id ? f.fromPortId : f.toPortId;
        const sf = transit.ferries.find((entry) => entry.routeId === routeId);
        if (sf) {
          if (sf.phase === 'sailing' && sf.toPortId === f.toPortId) {
            f.phaseProgress = Math.max(f.phaseProgress, sf.progress);
          } else if (sf.phase === 'docked' && sf.portId === f.toPortId && f.phaseProgress > 0.2) {
            f.phaseProgress = 1;
          }
        }
      }
    }

    if (Number.isFinite(transit.fadoTrackIndex)) {
      this.state.sharedFadoTrackIndex = transit.fadoTrackIndex;
    }

    // 4. Authoritative Ambient Lisboa Background Villagers & Seasonal Crowds (strictly synced across all connected computers!)
    if (Array.isArray(transit.npcs)) {
      const serverIds = new Set(transit.npcs.map((n) => n.id));
      const allDefs = new Map([...AMBIENT_NPCS, ...SEASONAL_CROWD_NPCS].map((d) => [d.id, d]));
      // Keep base NPCs and active server seasonal NPCs aligned cleanly
      this.state.npcs = this.state.npcs.filter((n) => !n.seasonal || serverIds.has(n.id));
      for (const sn of transit.npcs) {
        let localNpc = this.state.npcs.find((n) => n.id === sn.id);
        if (!localNpc) {
          const def = allDefs.get(sn.id);
          if (!def) continue;
          localNpc = createNpcRecord(def);
          this.state.npcs.push(localNpc);
        }
        localNpc.targetX = sn.x;
        localNpc.targetY = sn.y;
        const jumpDist = Math.hypot((sn.x ?? localNpc.x) - localNpc.x, (sn.y ?? localNpc.y) - localNpc.y);
        if (!wasSynced || jumpDist > 90) {
          localNpc.x = sn.x;
          localNpc.y = sn.y;
        }
        localNpc.dir = sn.dir === -1 ? -1 : 1;
        localNpc.isMoving = Boolean(sn.isMoving);
      }
    }

    // 4b. Authoritative Warm-Month Tagus Riverside Joggers
    if (Array.isArray(transit.joggers)) {
      const joggerDefs = new Map(RIVERSIDE_JOGGERS.map((j) => [j.id, j]));
      const serverJoggerIds = new Set(transit.joggers.map((j) => j.id));
      this.state.joggers = (this.state.joggers || []).filter((j) => serverJoggerIds.has(j.id));
      for (const sj of transit.joggers) {
        let localJog = this.state.joggers.find((j) => j.id === sj.id);
        if (!localJog) {
          const def = joggerDefs.get(sj.id);
          if (!def) continue;
          localJog = createNpcRecord(def);
          this.state.joggers.push(localJog);
        }
        localJog.targetX = sj.x;
        localJog.targetY = sj.y;
        const jumpDist = Math.hypot((sj.x ?? localJog.x) - localJog.x, (sj.y ?? localJog.y) - localJog.y);
        if (!wasSynced || jumpDist > 120) {
          localJog.x = sj.x;
          localJog.y = sj.y;
        }
        localJog.dir = sj.dir === -1 ? -1 : 1;
        localJog.isMoving = Boolean(sj.isMoving);
      }
    }

    // 4c. Authoritative Historic Lisbon Cable Funiculars (Elevador da Bica & Elevador da Gloria)
    if (Array.isArray(transit.funiculars)) {
      for (const sf of transit.funiculars) {
        const localFun = (this.state.funiculars || []).find((f) => f.id === sf.id);
        if (!localFun || this.state.ridingFunicularId === localFun.id) continue;
        localFun.progress = clamp(Number(sf.progress) || 0, 0, 1);
        localFun.dir = sf.dir === -1 ? -1 : 1;
        localFun.dwellRemaining = Math.max(0, Number(sf.dwellRemaining) || 0);
      }
    }

    // 5. Authoritative Miradouro Street-Musician Performances (synchronized across all players at the viewpoint!)
    if (Array.isArray(transit.miradouros)) {
      for (const sm of transit.miradouros) {
        const localPerf = (this.state.miradouroPerformances || []).find((m) => m.spotId === sm.spotId);
        if (localPerf) {
          if (Number.isFinite(sm.songIndex)) localPerf.songIndex = sm.songIndex;
          if (typeof sm.songTitle === 'string' && sm.songTitle) localPerf.songTitle = sm.songTitle;
          if (typeof sm.musicianName === 'string' && sm.musicianName) localPerf.musicianName = sm.musicianName;
          if (typeof sm.instrument === 'string' && sm.instrument) localPerf.instrument = sm.instrument;
        }
        if (sm.lastEncore && Number.isFinite(sm.lastEncore.id)) {
          const prevEncoreId = this.lastServerEncoreIds.get(sm.spotId) || 0;
          if (sm.lastEncore.id > prevEncoreId) {
            this.lastServerEncoreIds.set(sm.spotId, sm.lastEncore.id);
            const justRequestedLocally =
              sm.lastEncore.requestedBy === this.state.player.name &&
              Date.now() - this.lastLocalEncoreAt < 2500;
            const spot = getRestSpotById(sm.spotId);
            const distToSpot = spot
              ? distance(this.state.player.x, this.state.player.y, spot.x, spot.y)
              : 9999;
            const inSameMiradouroArea =
              this.state.mode === 'overworld' &&
              !this.state.ridingVehicleId &&
              (distToSpot <= 520 || this.state.currentNeighborhoodId === sm.lastEncore.neighborhood);
            if (inSameMiradouroArea && !justRequestedLocally) {
              this.signalSeq += 1;
              this.state.miradouroEncore = {
                id: this.signalSeq,
                spotId: sm.spotId,
                spotName: sm.lastEncore.spotName || spot?.name || 'Miradouro',
                neighborhood: sm.lastEncore.neighborhood || spot?.neighborhood || 'chiado',
                musicianName: sm.lastEncore.musicianName || localPerf?.musicianName || 'Musico',
                instrument: sm.lastEncore.instrument || localPerf?.instrument || 'Guitarra Portuguesa',
                songIndex: sm.lastEncore.songIndex ?? 0,
                songTitle: sm.lastEncore.songTitle || localPerf?.songTitle || 'Serenata',
                requestedBy: sm.lastEncore.requestedBy || 'Companion',
                text: sm.lastEncore.text || `${sm.lastEncore.musicianName} performs "${sm.lastEncore.songTitle}"`,
                timer: 4.8
              };
              this.state.statusMessage = `${this.state.miradouroEncore.requestedBy} requested an encore: ${this.state.miradouroEncore.text}!`;
            }
          }
        }
      }
    }

    // 6. Authoritative Shared Cafe / Tavern Toast Emotes (synchronized across all companions in the same location!)
    if (
      transit.cafeToast &&
      Number.isFinite(transit.cafeToast.id) &&
      transit.cafeToast.id > this.lastServerToastId
    ) {
      this.lastServerToastId = transit.cafeToast.id;
      const ct = transit.cafeToast;
      const justToastedLocally =
        ct.speakerName === this.state.player.name &&
        Date.now() - this.lastLocalToastAt < 2500;
      const myLoc = this.getCurrentLocationInfo();
      if (myLoc.locationKey === ct.locationKey && !justToastedLocally) {
        this.signalSeq += 1;
        this.state.sharedToast = {
          id: this.signalSeq,
          locationKey: ct.locationKey,
          locationName: ct.locationName || myLoc.locationName,
          speakerName: ct.speakerName || 'Companion',
          itemName: ct.itemName || '',
          text: ct.text || `Saude! Um brinde a Lisboa at ${myLoc.locationName}!`,
          timer: 4.5
        };
        this.triggerEmote('Saude!', 3.6);
        this.state.statusMessage = `${this.state.sharedToast.speakerName} raised a toast at ${this.state.sharedToast.locationName}: "${this.state.sharedToast.text}"`;
      }
    }

    // 7. Authoritative Se de Lisboa (1147) Hourly & On-Demand Cathedral Bell-Tower Chimes
    if (
      transit.cathedralChime &&
      Number.isFinite(transit.cathedralChime.id) &&
      transit.cathedralChime.id > this.lastServerCathedralChimeId
    ) {
      this.lastServerCathedralChimeId = transit.cathedralChime.id;
      const cc = transit.cathedralChime;
      const justChimedLocally =
        cc.triggeredBy === this.state.player.name &&
        Date.now() - this.lastLocalCathedralChimeAt < 2500;
      if (!justChimedLocally) {
        this.signalSeq += 1;
        this.lastHourlyChimeKey = `${cc.day || this.state.day}:${cc.hour}`;
        this.state.cathedralChime = {
          id: this.signalSeq,
          day: cc.day || this.state.day,
          hour: cc.hour,
          clockLabel: cc.clockLabel || `${String(cc.hour).padStart(2, '0')}:00`,
          tolls: cc.tolls || (((cc.hour + 11) % 12) + 1),
          triggeredBy: cc.triggeredBy || 'Se de Lisboa (1147)',
          text: cc.text || `Se de Lisboa (1147) Bell Towers toll across Lisboa`,
          timer: 4.8
        };
        this.state.statusMessage = this.state.cathedralChime.text;
      }
    }

    // 8. Authoritative Shared Lisboa Postcard Photo Snapshots across co-located companions
    if (
      transit.sharedPostcard &&
      Number.isFinite(transit.sharedPostcard.id) &&
      transit.sharedPostcard.id > this.lastServerPostcardId
    ) {
      this.lastServerPostcardId = transit.sharedPostcard.id;
      const sp = transit.sharedPostcard;
      const justSnappedLocally =
        sp.photographer === this.state.player.name &&
        Date.now() - this.lastLocalPostcardAt < 2500;
      const myLoc = this.getCurrentLocationInfo();
      const inPhoto =
        myLoc.locationKey === sp.locationKey ||
        (Array.isArray(sp.companions) && sp.companions.includes(this.state.player.name));
      if (inPhoto && !justSnappedLocally) {
        this.signalSeq += 1;
        const card = {
          id: this.signalSeq,
          locationKey: sp.locationKey,
          locationName: sp.locationName || myLoc.locationName,
          neighborhood: sp.neighborhood || this.state.currentNeighborhoodName || 'Lisboa',
          photographer: sp.photographer || 'Companion',
          companions: Array.isArray(sp.companions) ? sp.companions : [sp.photographer || 'Companion', this.state.player.name],
          day: sp.day || this.state.day,
          clock: sp.clock || formatClock(this.state.minutesOfDay),
          caption: sp.caption || `Postcard from ${myLoc.locationName}`,
          timer: 4.8
        };
        this.state.sharedPostcard = card;
        this.state.postcards = [card, ...(this.state.postcards || [])].slice(0, 12);
        this.triggerEmote('Sorria!', 3.8);
        this.state.statusMessage = `${card.photographer} captured a Shared Lisboa Postcard at ${card.locationName}: "${card.caption}"`;
        recordLog(this.state, 'postcard', `Captured in shared postcard at ${card.locationName} with ${card.companions.join(' & ')}.`);
      }
    }
  }

  clearGlobalTransit() {
    this.globalTransitSynced = false;
    this.state.globalTransitSynced = false;
    this.serverMetro = null;
    this.serverFerries = null;
  }

  syncGlobalClock(clock) {
    if (!clock || !Number.isFinite(clock.minutesOfDay)) return;
    this.globalClockSynced = true;
    this.state.globalClockSynced = true;
    if (Number.isFinite(clock.day) && clock.day >= 1) {
      this.state.day = Math.floor(clock.day);
    }
    if (Number.isFinite(clock.month) && clock.month >= 1 && clock.month <= 12 && clock.month !== this.state.month) {
      this.setMonth(clock.month, { silent: true });
    }
    const nextMins = ((Math.floor(clock.minutesOfDay) % 1440) + 1440) % 1440;
    if (nextMins < EVENING_SUGGEST_MINUTES) {
      this.state.eveningNoticeShown = false;
    }
    this.state.minutesOfDay = nextMins;
    this.timeAccumulator = 0;
  }

  setMonth(monthNumber, { silent = false } = {}) {
    const info = getMonthInfo(monthNumber);
    this.state.month = info.month;
    this.state.monthInfo = info;

    // Adjust active seasonal sidewalk crowds cleanly while keeping the 6 core Lisbon locals in place
    const baseIds = new Set(AMBIENT_NPCS.map((n) => n.id));
    const targetExtras = SEASONAL_CROWD_NPCS.slice(0, Math.max(0, info.crowdExtra || 0));
    const targetExtraIds = new Set(targetExtras.map((n) => n.id));
    const existingById = new Map(this.state.npcs.map((n) => [n.id, n]));

    const nextNpcs = [];
    for (const baseDef of AMBIENT_NPCS) {
      nextNpcs.push(existingById.get(baseDef.id) || createNpcRecord(baseDef));
    }
    for (const extraDef of targetExtras) {
      if (baseIds.has(extraDef.id)) continue;
      if (targetExtraIds.has(extraDef.id)) {
        nextNpcs.push(existingById.get(extraDef.id) || createNpcRecord(extraDef));
      }
    }
    this.state.npcs = nextNpcs;

    // Warm-month riverside joggers appear ONLY in warmer Lisboa months (May - Oct)
    const targetJoggerCount = Math.max(0, info.warmJoggersCount || 0);
    const existingJoggers = new Map((this.state.joggers || []).map((j) => [j.id, j]));
    this.state.joggers = RIVERSIDE_JOGGERS.slice(0, targetJoggerCount).map((def, idx) => {
      const prev = existingJoggers.get(def.id);
      if (prev) return prev;
      return { ...createNpcRecord(def), dir: idx % 2 === 0 ? 1 : -1 };
    });

    if (!silent) {
      this.state.statusMessage =
        `${info.name} (${info.ptName}) in Lisboa: ${info.avgHighC}C / ${info.avgLowC}C (${info.weatherLabel}) - ${info.eventTitle}. ${info.eventNote}`;
      recordLog(
        this.state,
        'season',
        `Calendar set to ${info.name} (${info.ptName}): ${info.weatherLabel}, ${info.eventTitle}.`
      );
    }
    return info;
  }

  clearGlobalClock() {
    this.globalClockSynced = false;
    this.state.globalClockSynced = false;
  }

  reset() {
    const prevName = this.state?.player?.name || 'Traveler 1';
    const prevOutfit = this.state?.player?.outfitId || PLAYER_OUTFITS[0].id;
    const prevRemotes = this.state?.remotePlayers || [];
    const prevViewMode = this.state?.viewMode || 'street3d';
    const prevMonth = this.state?.month || DEFAULT_MONTH;
    this.state = createInitialState();
    this.state.viewMode = prevViewMode;
    this.state.player.name = prevName;
    this.state.player.outfitId = prevOutfit;
    this.state.remotePlayers = prevRemotes;
    if (prevMonth !== DEFAULT_MONTH) {
      this.setMonth(prevMonth, { silent: true });
    }
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
        prev.cityDistrictId === (raw.cityDistrictId || null) &&
        prev.metroStationId === (raw.metroStationId || null) &&
        prev.ferryPortId === (raw.ferryPortId || null);
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
        cityDistrictId: raw.cityDistrictId || null,
        metroStationId: raw.metroStationId || null,
        metroPhase: raw.metroPhase || null,
        ferryPortId: raw.ferryPortId || null,
        ferryPhase: raw.ferryPhase || null,
        ridingVehicleId: raw.ridingVehicleId || null,
        seatedBenchId: raw.seatedBenchId || null,
        neighborhoodName: raw.neighborhoodName || 'Chiado',
        emoteText: typeof raw.emoteText === 'string' ? raw.emoteText : '',
        memoriesCaptured: Number.isFinite(raw.memoriesCaptured) ? raw.memoriesCaptured : (prev?.memoriesCaptured || 0),
        venuesVisited: Number.isFinite(raw.venuesVisited) ? raw.venuesVisited : (prev?.venuesVisited || 0),
        mealsEaten: Number.isFinite(raw.mealsEaten) ? raw.mealsEaten : (prev?.mealsEaten || 0),
        souvenirsBought: Number.isFinite(raw.souvenirsBought) ? raw.souvenirsBought : (prev?.souvenirsBought || 0),
        transitRides: Number.isFinite(raw.transitRides) ? raw.transitRides : (prev?.transitRides || 0),
        phrasesLearned: Number.isFinite(raw.phrasesLearned) ? raw.phrasesLearned : (prev?.phrasesLearned || 1),
        postcardsCaptured: Number.isFinite(raw.postcardsCaptured) ? raw.postcardsCaptured : (prev?.postcardsCaptured || 0),
        eurosRemaining: Number.isFinite(raw.eurosRemaining) ? raw.eurosRemaining : (prev?.eurosRemaining ?? 120),
        energyRemaining: Number.isFinite(raw.energyRemaining) ? raw.energyRemaining : (prev?.energyRemaining ?? 100),
        fullnessRemaining: Number.isFinite(raw.fullnessRemaining) ? raw.fullnessRemaining : (prev?.fullnessRemaining ?? 85),
        totalScore: Number.isFinite(raw.totalScore) ? raw.totalScore : (prev?.totalScore || 25),
        explorerRank: typeof raw.explorerRank === 'string' && raw.explorerRank ? raw.explorerRank : (prev?.explorerRank || 'Bairro Alto Cobblestone Stroller'),
        gameOver: typeof raw.gameOver === 'boolean' ? raw.gameOver : Boolean(prev?.gameOver),
        gameOverReason: typeof raw.gameOverReason === 'string' ? raw.gameOverReason : (prev?.gameOverReason || null)
      };
    });
    if (this.state.gameOver) {
      this.state.gameOverSummary = this.buildFinalScorecard();
    }
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
      cityDistrictId: s.mode === 'city-district' ? s.cityDistrictId : null,
      metroStationId: s.mode === 'metro' ? s.metro.stationId : null,
      metroPhase: s.mode === 'metro' ? s.metro.phase : null,
      ferryPortId: s.mode === 'ferry' ? s.ferry.portId : null,
      ferryPhase: s.mode === 'ferry' ? s.ferry.phase : null,
      ridingVehicleId: s.ridingVehicleId,
      seatedBenchId: s.seatedBenchId || null,
      neighborhoodName: s.currentNeighborhoodName,
      outfitId: s.player.outfitId,
      name: s.player.name,
      emoteText: s.player.emoteText,
      memoriesCaptured: s.memories.length,
      venuesVisited: s.visitedVenues.length,
      mealsEaten: s.stats.mealsEaten,
      souvenirsBought: s.stats.souvenirsBought,
      transitRides: s.stats.tramRides + s.stats.busRides + s.stats.metroRides + s.stats.ferryRides,
      phrasesLearned: s.learnedPhrases.length,
      postcardsCaptured: (s.postcards || []).length,
      eurosRemaining: s.euros,
      energyRemaining: Math.round(s.energy),
      fullnessRemaining: Math.round(s.fullness),
      totalScore: this.computePlayerScore(),
      explorerRank: this.computeExplorerRank(s.memories.length),
      gameOver: Boolean(s.gameOver),
      gameOverReason: s.gameOverReason || null
    };
  }

  getState() {
    return this.state;
  }

  getCurrentVenue() {
    if (!this.state.currentVenueId) return null;
    return getVenueById(this.state.currentVenueId);
  }

  getCurrentCityDistrict() {
    if (!this.state.cityDistrictId) return null;
    return getCityDistrictById(this.state.cityDistrictId);
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

}

export const multiplayerSyncMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    multiplayerSyncMethods[key] = _Mixin.prototype[key];
  }
}
