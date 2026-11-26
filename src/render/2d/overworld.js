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
  STREETS,
  CROSSWALKS,
  DECORATIVE_STRUCTURES,
  LISBOA_STAIRCASES,
  MIRADOURO_VIEWPOINTS,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  SANTA_JUSTA_LIFT,
  SANTA_JUSTA_PANORAMA_LANDMARKS,
  METRO_LINE,
  METRO_NETWORK_LINES,
  METRO_STATIONS,
  ALL_METRO_STATIONS,
  LISBOA_CITY_DISTRICTS,
  CITY_DISTRICT_SPOTS,
  LISBOA_CORRIDOR_LANDMARKS,
  OVERWORLD_CITY_GATEWAYS,
  getWalkingAvenuesFrom,
  VENUES,
  findEnterableVenueById,
  REST_SPOTS,
  RIVERSIDE_BENCHES,
  CASTANHA_VENDORS,
  TRANSIT_LINES,
  FUNICULAR_LINES,
  BAIRRO_ALTO_PARTY_REVELERS,
  isBairroAltoPartyTime,
  getTerrainElevation,
  getAllTransitStops,
  getMetroLineById,
  getStationLineIds,
  getOutfitById,
  getMonthInfo
} from '../../data.js';
import { getDayPhase, INTERIOR_STATIONS, METRO_PLATFORM_ZONES, FERRY_PIER_ZONES, computeFunicularCarPose } from '../../engine.js';

const ALL_STOPS = getAllTransitStops();

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function drawRoundedRect(ctx, x, y, w, h, r = 6) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

class _Mixin {
  renderOverworld(ctx, state, nearbyInteraction) {
    const phase = getDayPhase(state.minutesOfDay);
    const monthInfo = getMonthInfo(state.month);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const lampsGlowing = isEvening || isGolden || (monthInfo.rainIntensity || 0) >= 0.45 || monthInfo.decorStyle === 'christmas-lights';
    const carryingUmbrella = (monthInfo.rainIntensity || 0) >= 0.4;

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // 1. Unified full-city Lisboa limestone ground + hillside topographic shading + sidewalk calcada cobblestones
    ctx.fillStyle = '#eae3d6';
    ctx.fillRect(WORLD_MIN_X, WORLD_MIN_Y, WORLD_MAX_X - WORLD_MIN_X, WATERFRONT_Y - WORLD_MIN_Y);
    // Subtle district turf tints across Greater Lisboa parks & squares (Parque Eduardo VII, Campo Grande, Gulbenkian, Parque das Nacoes)
    ctx.fillStyle = '#dfe9dc';
    ctx.fillRect(320, -1440, 1360, 680); // Parque Eduardo VII & Marques
    ctx.fillRect(-1080, -1440, 1400, 680); // Gulbenkian & Sete Rios Zoo
    ctx.fillRect(320, -2000, 2100, 560); // Campo Grande & Cidade Universitaria
    ctx.fillStyle = '#e3eaf0';
    ctx.fillRect(2820, -1440, 1400, WATERFRONT_Y + 1440); // Modern Parque das Nacoes & Oriente
    // Eastern Tagus Estuary shoreline east of Parque das Nacoes (Mar da Palha)
    ctx.fillStyle = '#1e5b82';
    ctx.fillRect(4220, -1520, WORLD_MAX_X - 4220 + 600, WATERFRONT_Y + 1520);
    for (const hood of NEIGHBORHOODS) {
      ctx.fillStyle = hood.groundTint;
      ctx.fillRect(hood.minX, 0, hood.maxX - hood.minX, WATERFRONT_Y);
    }
    // Subtle topographic hillside contour bands highlighting Bairro Alto high plateau & Alfama eastern ridge
    ctx.save();
    const baGrad = ctx.createLinearGradient(0, 960, 0, 80);
    baGrad.addColorStop(0, 'rgba(180, 125, 62, 0)');
    baGrad.addColorStop(0.55, 'rgba(180, 125, 62, 0.08)');
    baGrad.addColorStop(1, 'rgba(180, 125, 62, 0.16)');
    ctx.fillStyle = baGrad;
    ctx.fillRect(0, 0, 860, WATERFRONT_Y);
    ctx.strokeStyle = 'rgba(120, 96, 70, 0.16)';
    ctx.lineWidth = 1.2;
    for (const cy of [260, 440, 640, 820]) {
      ctx.beginPath();
      ctx.moveTo(20, cy);
      ctx.lineTo(845, cy);
      ctx.stroke();
    }
    ctx.restore();
    this.drawCalcadaGroundTexture(ctx);

    // 2. Streets, plazas, Alfama escadinhas, crosswalks, walkable stone staircases & miradouro railings
    this.drawStreetsAndPlazas(ctx);
    this.drawCrosswalks(ctx);
    ctx.save();
    for (const st of LISBOA_STAIRCASES) {
      ctx.fillStyle = '#e7dfd0';
      ctx.fillRect(st.x, st.y, st.w, st.h);
      const stepH = st.h / (st.steps || 10);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.2;
      for (let i = 0; i <= (st.steps || 10); i += 1) {
        const sy = st.y + i * stepH;
        ctx.beginPath();
        ctx.moveTo(st.x, sy);
        ctx.lineTo(st.x + st.w, sy);
        ctx.stroke();
      }
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(st.x + 2, st.y);
      ctx.lineTo(st.x + 2, st.y + st.h);
      ctx.moveTo(st.x + st.w - 2, st.y);
      ctx.lineTo(st.x + st.w - 2, st.y + st.h);
      ctx.stroke();
    }
    for (const vp of MIRADOURO_VIEWPOINTS) {
      const hw = (vp.railingWidth || 108) * 0.5;
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(vp.x - hw, vp.y);
      ctx.lineTo(vp.x + hw, vp.y);
      ctx.stroke();
      ctx.fillStyle = '#e5ded0';
      ctx.fillRect(vp.x - hw - 3, vp.y - 3, 6, 6);
      ctx.fillRect(vp.x + hw - 3, vp.y - 3, 6, 6);
    }
    ctx.restore();

    // 2B. Aeroporto Humberto Delgado (LIS) Runway 03/21 & Security Perimeter Fence (rendered cleanly above calcada layer!)
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.fillRect(2880, -2340, 1380, 335);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.strokeRect(2880, -2340, 1380, 335);
    ctx.setLineDash([]);
    // Security fence posts along southern perimeter preventing pedestrians from entering active runway
    ctx.fillStyle = '#e2e8f0';
    for (let fx = 2880; fx <= 4260; fx += 45) {
      ctx.fillRect(fx - 2, -2007, 4, 7);
    }
    ctx.fillStyle = '#f8fafc';
    for (let rx = 2950; rx <= 4160; rx += 84) {
      ctx.fillRect(rx, -2179, 48, 8);
    }
    for (const ty of [-2255, -2225, -2195, -2155, -2125, -2095]) {
      ctx.fillRect(2904, ty, 38, 10);
      ctx.fillRect(4198, ty, 38, 10);
    }
    ctx.font = '800 18px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('03', 2980, -2168);
    ctx.fillText('21', 4156, -2168);
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('AEROPORTO HUMBERTO DELGADO (LIS) - RUNWAY 03 / 21', 3570, -2295);
    const depX = 2980 + ((this.animTime * 170) % 1180);
    for (const [ax, ay, tailCol] of [[3260, -2055, '#dc2626'], [3780, -2055, '#1d4ed8'], [depX, -2175, '#dc2626']]) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(ax, ay, 34, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(ax + 6, ay);
      ctx.lineTo(ax - 12, ay - 26);
      ctx.lineTo(ax - 18, ay - 26);
      ctx.lineTo(ax - 6, ay);
      ctx.lineTo(ax - 18, ay + 26);
      ctx.lineTo(ax - 12, ay + 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = tailCol;
      ctx.fillRect(ax - 34, ay - 9, 10, 18);
    }
    ctx.textAlign = 'left';
    ctx.restore();

    // 3. Tagus River Waterfront, Cais do Sodre Transtejo Ferry Terminal & Elevador de Santa Justa (1902)
    this.drawTagusWaterfront(ctx, state, nearbyInteraction);
    this.drawFerryTerminal(ctx, nearbyInteraction?.type === 'ferry', isEvening);
    this.drawSantaJustaOverworld(ctx, nearbyInteraction?.type === 'santa-justa', isEvening);

    // 4. Transit corridors (Bus road markings + Steel Tram 28E Rails + Hillside Funicular Tracks)
    this.drawTransitInfrastructure(ctx);
    this.drawFunicularInfrastructure(ctx, nearbyInteraction);

    // 5. Enamel Lisbon street plaques across the unified city
    this.drawLisbonStreetPlaques(ctx);

    // 6. Jacaranda trees, bougainvillea pergolas, and tiled miradouro benches
    this.drawTreesAndBenches(ctx, state);

    // 7. Decorative Portuguese townhouses, Se de Lisboa cathedral, and Camoes monument
    for (const struct of DECORATIVE_STRUCTURES) {
      this.drawDecorativeStructure(ctx, struct, isEvening);
    }

    // 8. All 12 Authentic Metropolitano de Lisboa Street Entrances (4 official lines across unified Lisboa!)
    for (const station of ALL_METRO_STATIONS) {
      if (!Number.isFinite(station.x)) continue;
      const isHighlighted =
        (nearbyInteraction?.type === 'metro' && nearbyInteraction.id === station.id) ||
        state.activeMetroStationId === station.id;
      this.drawMetroStation(ctx, station, isHighlighted, isEvening);
    }

    // 8B. Greater Lisboa Open-World Landmarks, Eateries, Cultural Shops & Metro Corridor Iconic Sites!
    for (const spot of [...CITY_DISTRICT_SPOTS, ...LISBOA_CORRIDOR_LANDMARKS]) {
      const isHi =
        (nearbyInteraction?.type === 'city-district-spot' && nearbyInteraction.spotId === spot.id) ||
        state.activeCityDistrictSpotId === spot.id;
      this.drawCityDistrictSpotOverworld(ctx, spot, isHi, isEvening);
    }

    // 9. Bespoke Enterable Shops, Cafes & Restaurants
    for (const venue of VENUES) {
      const visited = state.visitedVenues.includes(venue.id);
      const isHighlighted = nearbyInteraction?.type === 'venue' && nearbyInteraction.id === venue.id;
      this.drawVenueBuilding(ctx, venue, visited, isHighlighted, isEvening);
    }

    // 10. Sidewalk Transit Stops
    for (const stop of ALL_STOPS) {
      const isHighlighted = nearbyInteraction?.type === 'stop' && nearbyInteraction.id === stop.stopId;
      this.drawTransitStop(ctx, stop, isHighlighted, isEvening);
    }

    // 11. Classic wrought-iron Lisbon streetlamps, seasonal street decorations & Bairro Alto hilltop evening party lights
    this.drawLisbonStreetlamps(ctx, isEvening, lampsGlowing);
    this.drawSeasonalOverworldDecor(ctx, monthInfo, isEvening, nearbyInteraction);
    this.drawBairroAltoPartyAtmosphere(ctx, state, isEvening || isGolden);

    // 12. Walk Target Indicator
    if (state.player.walkTarget) {
      const pulse = 8 + Math.sin(this.animTime * 6) * 3;
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 13. Ambient Lisbon Locals, Seasonal Crowds, Warm-Month Joggers & Bairro Alto Evening Party Revelers
    for (const npc of state.npcs) {
      this.drawCharacterSprite(ctx, npc.x, npc.y, {
        facing: npc.patrolAxis === 'x' ? (npc.dir > 0 ? 'right' : 'left') : (npc.dir > 0 ? 'down' : 'up'),
        walkPhase: npc.walkPhase,
        isMoving: npc.isMoving !== false,
        outfitId: npc.outfitId,
        tunicColor: npc.shirt,
        scarfColor: '#e6dcc8',
        hairColor: npc.hair,
        hasUmbrella: carryingUmbrella,
        isPlayer: false
      });
    }
    if (isBairroAltoPartyTime(state.minutesOfDay)) {
      const toastSlot = Math.floor(this.animTime / 2.6) % BAIRRO_ALTO_PARTY_REVELERS.length;
      BAIRRO_ALTO_PARTY_REVELERS.forEach((rev, ri) => {
        this.drawCharacterSprite(ctx, rev.x, rev.y, {
          facing: ri % 2 === 0 ? 'down' : 'right',
          walkPhase: this.animTime * 4 + rev.phaseOffset,
          isMoving: false,
          outfitId: rev.outfitId,
          emoteText: ri % 3 === toastSlot % 3 ? rev.toastPhrase : '',
          isPlayer: false
        });
        // Tiny raised drink glass beside each evening party reveler
        ctx.fillStyle = rev.drinkColor;
        ctx.fillRect(rev.x + 8, rev.y - 10, 4, 6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(rev.x + 8, rev.y - 10, 4, 6);
      });
    }
    for (const jog of state.joggers || []) {
      this.drawCharacterSprite(ctx, jog.x, jog.y, {
        facing: jog.dir > 0 ? 'right' : 'left',
        walkPhase: jog.walkPhase,
        isMoving: true,
        outfitId: 'maritime-striped',
        tunicColor: jog.shirt,
        scarfColor: '#ffffff',
        hairColor: jog.hair,
        label: '',
        isPlayer: false
      });
    }

    // 14. Live Transit Vehicles (Remodelado Tram 28E, Carris Bus & Historic Bica/Gloria Funiculars)
    const remoteList = Array.isArray(state.remotePlayers) ? state.remotePlayers : [];
    for (const vehicle of state.vehicles) {
      const playerAboard = state.ridingVehicleId === vehicle.id;
      const remoteAboard = remoteList.filter((rp) => rp.ridingVehicleId === vehicle.id);
      this.drawTransitVehicle(ctx, vehicle, playerAboard, isEvening, remoteAboard);
    }
    this.drawFunicularCars(ctx, state, isEvening);

    // 15. Local & Connected Multiplayer Travelers on foot (Y-sorted for clean depth layering)
    const overworldTravelers = [];
    if (!state.ridingVehicleId && !state.ridingFunicularId) {
      overworldTravelers.push({
        x: state.player.x,
        y: state.player.y,
        facing: state.player.facing,
        walkPhase: state.player.walkPhase,
        isMoving: state.player.isMoving,
        outfitId: state.player.outfitId,
        label: remoteList.length > 0 ? state.player.name : '',
        emoteText: state.player.emoteText || '',
        isPlayer: true
      });
    }
    for (const rp of remoteList) {
      if (rp.mode === 'overworld' && !rp.ridingVehicleId) {
        overworldTravelers.push({
          x: rp.x,
          y: rp.y,
          facing: rp.facing,
          walkPhase: rp.walkPhase,
          isMoving: rp.isMoving,
          outfitId: rp.outfitId,
          label: rp.name,
          emoteText: rp.emoteText || '',
          isPlayer: false,
          isRemotePlayer: true
        });
      }
    }
    overworldTravelers.sort((a, b) => a.y - b.y);
    for (const traveler of overworldTravelers) {
      this.drawCharacterSprite(ctx, traveler.x, traveler.y, traveler);
    }

    ctx.restore();

    // 16. Time-of-day & seasonal weather atmospheric overlay (Atlantic rain, summer sunbeams, petals/confetti)
    this.drawTimeOfDayOverlay(ctx, phase, monthInfo);

    // 17. Mini-map HUD overlay inside top-right corner
    this.drawMiniMap(ctx, state);

    // 18. Floating Context Interaction Prompt at bottom-center
    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  drawCalcadaGroundTexture(ctx) {
    if (this.patterns.sidewalk) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = this.patterns.sidewalk;
      ctx.fillRect(
        Math.max(WORLD_MIN_X, this.camera.x - 40),
        Math.max(WORLD_MIN_Y, this.camera.y - 40),
        this.viewWidth + 80,
        Math.min(WATERFRONT_Y, this.camera.y + this.viewHeight + 40) - Math.max(WORLD_MIN_Y, this.camera.y - 40)
      );
      ctx.restore();
      return;
    }

    const startX = Math.max(WORLD_MIN_X, Math.floor(this.camera.x / 32) * 32 - 32);
    const endX = Math.min(WORLD_MAX_X, this.camera.x + this.viewWidth + 64);
    const startY = Math.max(WORLD_MIN_Y, Math.floor(this.camera.y / 24) * 24 - 24);
    const endY = Math.min(WATERFRONT_Y, this.camera.y + this.viewHeight + 48);

    ctx.strokeStyle = 'rgba(118, 106, 88, 0.13)';
    ctx.lineWidth = 1;
    for (let gy = startY; gy < endY; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(startX, gy);
      ctx.lineTo(endX, gy);
      ctx.stroke();

      const stagger = ((gy / 24) % 2) * 16;
      for (let gx = startX + stagger; gx < endX; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, gy + 24);
        ctx.stroke();
      }
    }
  }

  drawStreetsAndPlazas(ctx) {
    const drawCurb = (x, y, w, h) => {
      ctx.strokeStyle = '#dfd7c8';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = '#7b7368';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    };

    for (const st of STREETS) {
      if (st.style === 'bus-road') {
        ctx.fillStyle = this.patterns.sidewalk || '#ddd6c8';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#a69f95';
        ctx.fillRect(st.x + 10, st.y + 18, st.w - 20, st.h - 36);
        drawCurb(st.x + 10, st.y + 18, st.w - 20, st.h - 36);
      } else if (st.style === 'tram-avenue') {
        ctx.fillStyle = this.patterns.sidewalk || '#e0d9cb';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#aba49a';
        ctx.fillRect(st.x + 6, st.y + 22, st.w - 12, st.h - 44);
        drawCurb(st.x + 6, st.y + 22, st.w - 12, st.h - 44);
      } else if (st.style === 'plaza') {
        ctx.fillStyle = this.patterns.plaza || '#ede7db';
        ctx.fillRect(st.x, st.y, st.w, st.h);

        ctx.strokeStyle = '#3b424c';
        ctx.lineWidth = 3;
        ctx.strokeRect(st.x + 4, st.y + 4, st.w - 8, st.h - 8);
        ctx.strokeStyle = '#68707d';
        ctx.lineWidth = 1;
        ctx.strokeRect(st.x + 9, st.y + 9, st.w - 18, st.h - 18);

        for (let wy = st.y + 22; wy < st.y + st.h - 18; wy += 24) {
          ctx.fillStyle = 'rgba(46, 54, 66, 0.34)';
          ctx.beginPath();
          for (let wx = st.x + 12; wx <= st.x + st.w - 12; wx += 8) {
            const offset = Math.sin((wx - st.x) * 0.12) * 5;
            if (wx === st.x + 12) ctx.moveTo(wx, wy + offset);
            else ctx.lineTo(wx, wy + offset);
          }
          for (let wx = st.x + st.w - 12; wx >= st.x + 12; wx -= 8) {
            const offset = Math.sin((wx - st.x) * 0.12) * 5;
            ctx.lineTo(wx, wy + 7 + offset);
          }
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.fillStyle = this.patterns.sidewalk || '#dcd4c5';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#b2aba0';
        ctx.globalAlpha = 0.65;
        ctx.fillRect(st.x + 10, st.y + 4, st.w - 20, st.h - 8);
        ctx.globalAlpha = 1;
        drawCurb(st.x + 10, st.y + 4, st.w - 20, st.h - 8);

        if (st.id === 'st-se') {
          for (let sy = 365; sy < 530; sy += 14) {
            ctx.fillStyle = sy % 28 === 0 ? '#cfc6b6' : '#e3dccd';
            ctx.fillRect(st.x + 12, sy, st.w - 24, 9);
            ctx.fillStyle = 'rgba(74, 68, 58, 0.32)';
            ctx.fillRect(st.x + 12, sy + 9, st.w - 24, 2);
          }
        }
      }
    }
  }

  drawCrosswalks(ctx) {
    // Crisp white limestone Lisbon zebra crosswalk bars at pedestrian crossings
    ctx.fillStyle = 'rgba(248, 244, 236, 0.82)';
    for (const cw of CROSSWALKS) {
      for (let sx = cw.x + 3; sx < cw.x + cw.w - 4; sx += 11) {
        ctx.fillRect(sx, cw.y + 4, 6, cw.h - 8);
      }
    }
  }

  drawTagusWaterfront(ctx, state = null, nearbyInteraction = null) {
    const fullW = WORLD_MAX_X - WORLD_MIN_X;
    // Authentic Mar Largo black-and-white Calcada Portuguesa wave promenade along Ribeira das Naus (Belem to Oriente)
    if (this.patterns.plaza) {
      ctx.fillStyle = this.patterns.plaza;
      ctx.fillRect(WORLD_MIN_X, 974, fullW, WATERFRONT_Y - 990);
      ctx.fillStyle = '#2e3540';
      ctx.fillRect(WORLD_MIN_X, 974, fullW, 3);
      ctx.fillRect(WORLD_MIN_X, WATERFRONT_Y - 19, fullW, 3);
    }
    ctx.fillStyle = '#d5ccbc';
    ctx.fillRect(WORLD_MIN_X, WATERFRONT_Y - 18, fullW, 18);
    ctx.fillStyle = '#1b4d89';
    const tileMinX = Math.max(WORLD_MIN_X, Math.floor((this.camera.x - 40) / 28) * 28);
    const tileMaxX = Math.min(WORLD_MAX_X, this.camera.x + this.viewWidth + 40);
    for (let ax = tileMinX; ax < tileMaxX; ax += 28) {
      ctx.fillRect(ax, WATERFRONT_Y - 14, 14, 4);
    }
    ctx.fillStyle = '#8b8274';
    ctx.fillRect(WORLD_MIN_X, WATERFRONT_Y - 4, fullW, 5);

    const bollardMinX = Math.max(WORLD_MIN_X + 60, Math.floor((this.camera.x - 110) / 110) * 110);
    const bollardMaxX = Math.min(WORLD_MAX_X - 40, this.camera.x + this.viewWidth + 110);
    for (let bx = bollardMinX; bx < bollardMaxX; bx += 110) {
      ctx.fillStyle = '#a89f8e';
      ctx.fillRect(bx - 5, WATERFRONT_Y - 16, 10, 12);
      ctx.fillStyle = '#e5ded0';
      ctx.fillRect(bx - 4, WATERFRONT_Y - 16, 8, 4);
      // Cast-iron mooring bollard cap on the quay edge
      ctx.fillStyle = '#27303f';
      ctx.fillRect(bx + 36, WATERFRONT_Y - 7, 7, 6);
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx + 35, WATERFRONT_Y - 8, 9, 2);
    }

    const grad = ctx.createLinearGradient(0, WATERFRONT_Y, 0, WORLD_HEIGHT);
    grad.addColorStop(0, '#2a6f97');
    grad.addColorStop(0.45, '#1e5b82');
    grad.addColorStop(1, '#123d5a');
    ctx.fillStyle = grad;
    ctx.fillRect(WORLD_MIN_X, WATERFRONT_Y, fullW, WORLD_HEIGHT - WATERFRONT_Y);

    // Subtle sunlit coastal shallow shelf & seawall shadow along the northern quay
    const shelfGrad = ctx.createLinearGradient(0, WATERFRONT_Y, 0, WATERFRONT_Y + 26);
    shelfGrad.addColorStop(0, 'rgba(15, 38, 58, 0.36)');
    shelfGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.14)');
    shelfGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = shelfGrad;
    ctx.fillRect(WORLD_MIN_X, WATERFRONT_Y, fullW, 26);

    // Shimmering Ponte 25 de Abril (1966) red suspension tower reflection on the western/central Tagus waters
    ctx.save();
    ctx.strokeStyle = 'rgba(210, 45, 58, 0.18)';
    ctx.lineWidth = 2;
    for (const tx of [380, 690]) {
      for (let ry = WATERFRONT_Y + 18; ry < WORLD_HEIGHT - 16; ry += 9) {
        const sway = Math.sin(this.animTime * 2.1 + ry * 0.15) * 5;
        ctx.beginPath();
        ctx.moveTo(tx - 10 + sway, ry);
        ctx.lineTo(tx + 10 + sway, ry);
        ctx.stroke();
      }
    }
    // Iconic White 12.3 km Cable-Stayed Ponte Vasco da Gama (1998) extending across the Eastern Tagus Estuary from Parque das Nacoes!
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(3320, WATERFRONT_Y + 18);
    ctx.quadraticCurveTo(3780, WATERFRONT_Y + 72, WORLD_MAX_X + 200, WATERFRONT_Y + 135);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.72)';
    ctx.lineWidth = 1.6;
    for (const [px, py] of [[3640, WATERFRONT_Y + 56], [3920, WATERFRONT_Y + 86]]) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(px - 6, py - 24, 4, 34);
      ctx.fillRect(px + 2, py - 24, 4, 34);
      ctx.fillRect(px - 6, py - 18, 12, 3);
      for (let k = 1; k <= 4; k += 1) {
        ctx.beginPath();
        ctx.moveTo(px, py - 20 + k * 2.5);
        ctx.lineTo(px - k * 14, py + 4);
        ctx.moveTo(px, py - 20 + k * 2.5);
        ctx.lineTo(px + k * 14, py + 8);
        ctx.stroke();
      }
    }
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(240, 249, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('PONTE VASCO DA GAMA (1998) - MAR DA PALHA', 3780, WATERFRONT_Y + 114);
    ctx.textAlign = 'left';
    ctx.restore();

    ctx.strokeStyle = 'rgba(218, 240, 255, 0.32)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 5; row += 1) {
      const ry = WATERFRONT_Y + 22 + row * 30;
      for (let rx = 50 + (row % 2) * 70; rx < WORLD_WIDTH - 40; rx += 145) {
        const shift = Math.sin(this.animTime * 1.4 + row + rx * 0.01) * 14;
        ctx.beginPath();
        ctx.moveTo(rx + shift, ry);
        ctx.quadraticCurveTo(rx + shift + 22, ry - 4, rx + shift + 44, ry);
        ctx.stroke();
      }
    }

    const boats = [520, 1280, 1980];
    for (let i = 0; i < boats.length; i += 1) {
      const bx = boats[i] + Math.sin(this.animTime * 0.4 + i * 2) * 16;
      const by = WATERFRONT_Y + 78 + Math.cos(this.animTime * 1.2 + i) * 3;
      // V-wake ripple behind hull
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.42)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx - 22, by + 5);
      ctx.lineTo(bx - 42, by + 1);
      ctx.moveTo(bx - 22, by + 6);
      ctx.lineTo(bx - 40, by + 11);
      ctx.stroke();

      // Traditional Tagus fragata timber hull + ochre gunwale stripe
      ctx.fillStyle = '#6e3423';
      ctx.beginPath();
      ctx.moveTo(bx - 22, by);
      ctx.lineTo(bx + 22, by);
      ctx.lineTo(bx + 14, by + 9);
      ctx.lineTo(bx - 15, by + 9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx - 18, by + 2, 36, 2);

      // Mast, lateen mainsail & forward jib
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx - 2, by);
      ctx.lineTo(bx - 2, by - 31);
      ctx.stroke();

      ctx.fillStyle = i === 1 ? '#d97648' : '#faf6ee';
      ctx.beginPath();
      ctx.moveTo(bx - 1, by - 3);
      ctx.lineTo(bx - 1, by - 29);
      ctx.lineTo(bx + 18, by - 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(250, 246, 238, 0.88)';
      ctx.beginPath();
      ctx.moveTo(bx - 4, by - 4);
      ctx.lineTo(bx - 3, by - 23);
      ctx.lineTo(bx - 17, by - 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(235, 246, 255, 0.65)';
    ctx.font = '600 13px Georgia, serif';
    ctx.fillText('RIO TEJO  -  TAGUS WATERFRONT', 1020, WATERFRONT_Y + 142);

    // Gliding Atlantic Seagulls over the Tagus River
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.lineWidth = 1.8;
    for (let g = 0; g < 6; g += 1) {
      const gx = ((220 + g * 380 + this.animTime * (22 + g * 3)) % (WORLD_WIDTH - 80)) + 40;
      const gy = WATERFRONT_Y + 34 + (g % 3) * 32 + Math.sin(this.animTime * 2.5 + g) * 6;
      const wflap = Math.sin(this.animTime * 5.2 + g * 1.7) * 3.5;
      ctx.beginPath();
      ctx.moveTo(gx - 8, gy + wflap);
      ctx.quadraticCurveTo(gx - 3, gy - 3, gx, gy);
      ctx.quadraticCurveTo(gx + 3, gy - 3, gx + 8, gy + wflap);
      ctx.stroke();
    }

    // Wooden & Lioz Limestone Riverside Promenade Benches overlooking the Tagus
    for (const rb of RIVERSIDE_BENCHES) {
      const isHi = nearbyInteraction?.type === 'riverside-bench' && nearbyInteraction.id === rb.id;
      const isSeatedHere = state?.seatedBenchId === rb.id;
      if (isHi || isSeatedHere) {
        ctx.strokeStyle = isSeatedHere ? '#34d399' : '#facc15';
        ctx.lineWidth = 2.4;
        drawRoundedRect(ctx, rb.x - 19, rb.y - 8, 38, 15, 4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(rb.x - 16, rb.y - 3, 32, 11);
      ctx.fillStyle = '#8b522c';
      drawRoundedRect(ctx, rb.x - 16, rb.y - 5, 32, 9, 2);
      ctx.fill();
      ctx.strokeStyle = isHi ? '#facc15' : '#472d1b';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  drawTransitInfrastructure(ctx) {
    // Draw dashed Carris Bus corridors for all 6 factual Lisbon Bus routes (737, 736, 728, 746, 706, 744)
    for (const line of TRANSIT_LINES) {
      if (line.mode !== 'bus') continue;
      ctx.save();
      ctx.strokeStyle = line.color || 'rgba(27, 122, 92, 0.45)';
      ctx.globalAlpha = 0.44;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      line.waypoints.forEach((wp, idx) => {
        if (idx === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      if (line.loopType === 'cycle') ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Draw steel Lisbon streetcar rails for all 3 Carris Tram routes (28E, 15E Belem, 24E Rato)
    for (const line of TRANSIT_LINES) {
      if (line.mode !== 'tram') continue;
      ctx.save();
      ctx.strokeStyle = '#535e6b';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < line.waypoints.length - 1; i += 1) {
        const a = line.waypoints[i];
        const b = line.waypoints[i + 1];
        const horiz = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
        if (horiz) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y - 7);
          ctx.lineTo(b.x, b.y - 7);
          ctx.moveTo(a.x, a.y + 7);
          ctx.lineTo(b.x, b.y + 7);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(a.x - 7, a.y);
          ctx.lineTo(b.x - 7, b.y);
          ctx.moveTo(a.x + 7, a.y);
          ctx.lineTo(b.x + 7, b.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    const tramY = 610;
    ctx.strokeStyle = 'rgba(72, 66, 58, 0.34)';
    ctx.lineWidth = 2;
    for (let tx = 200; tx <= 2200; tx += 16) {
      ctx.beginPath();
      ctx.moveTo(tx, tramY - 10);
      ctx.lineTo(tx, tramY + 10);
      ctx.stroke();
    }
  }

  drawFunicularInfrastructure(ctx, nearbyInteraction) {
    for (const fun of FUNICULAR_LINES) {
      const tx = fun.trackX;
      // Twin steel funicular rails with mid-hill passing loop & central underground traction cable slot
      const steps = 28;
      ctx.save();
      // Central dark traction cable groove slot
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(tx, fun.bottomY);
      ctx.lineTo(tx, fun.topY);
      ctx.stroke();

      // East & West counterbalancing passing-loop rails
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.8;
      for (const side of [-1, 1]) {
        for (const railOff of [-4.5, 4.5]) {
          ctx.beginPath();
          for (let i = 0; i <= steps; i += 1) {
            const t = i / steps;
            const y = fun.bottomY + (fun.topY - fun.bottomY) * t;
            const loopFactor = Math.exp(-Math.pow((t - 0.5) / 0.16, 2));
            const x = tx + side * fun.passingHalfOffset * loopFactor + railOff;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // Lower & Upper Funicular Station Boarding Platforms (emerald & gold totems)
      for (const [endKey, st] of [['lower', fun.lowerStation], ['upper', fun.upperStation]]) {
        const isHi =
          nearbyInteraction?.type === 'funicular-station' &&
          nearbyInteraction.id === fun.id &&
          nearbyInteraction.fromEnd === endKey;
        const px = st.platformX;
        const py = st.platformY;
        drawRoundedRect(ctx, px - 18, py - 11, 36, 22, 4);
        ctx.fillStyle = isHi ? '#b45309' : '#14532d';
        ctx.fill();
        ctx.strokeStyle = isHi ? '#fde047' : '#eab308';
        ctx.lineWidth = isHi ? 2.4 : 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = '700 8px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(fun.id === 'funicular-bica' ? 'BICA' : 'GLORIA', px, py - 1);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 6.5px "Segoe UI", sans-serif';
        ctx.fillText(endKey === 'lower' ? 'UP' : 'DOWN', px, py + 7.5);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  }

  drawFunicularCars(ctx, state, isEvening) {
    for (const fun of state.funiculars || []) {
      for (let ci = 0; ci < 2; ci += 1) {
        const pose = computeFunicularCarPose(fun, ci);
        const playerAboard =
          state.ridingFunicularId === fun.id && (state.ridingFunicularCarIndex || 0) === ci;
        ctx.save();
        ctx.translate(pose.x, pose.y);
        // Hillside drop shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
        drawRoundedRect(ctx, -11, -20, 24, 42, 5);
        ctx.fill();
        // Dark stepped iron undercarriage base
        ctx.fillStyle = '#1e293b';
        drawRoundedRect(ctx, -10, -19, 20, 38, 4);
        ctx.fill();
        // Bright yellow Carris wooden funicular cabin
        ctx.fillStyle = isEvening ? '#ca8a04' : (fun.bodyColor || '#eab308');
        drawRoundedRect(ctx, -9, -17, 18, 34, 4);
        ctx.fill();
        ctx.strokeStyle = playerAboard ? '#38bdf8' : '#78350f';
        ctx.lineWidth = playerAboard ? 2.4 : 1.3;
        ctx.stroke();
        // Cream clerestory roof
        ctx.fillStyle = fun.upperColor || '#fffbeb';
        drawRoundedRect(ctx, -6.5, -13, 13, 26, 3);
        ctx.fill();
        // Label & rider dot
        ctx.fillStyle = '#14532d';
        ctx.font = '800 6.5px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(fun.id === 'funicular-bica' ? 'BICA' : 'GLOR', 0, 2.5);
        if (playerAboard) {
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(0, -7, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  drawLisbonStreetPlaques(ctx) {
    const plaques = [
      { title: 'BAIRRO ALTO', sub: 'RUA DA ROSA', x: 340, y: 358 },
      { title: 'CHIADO', sub: 'PRACA LUIS DE CAMOES', x: 950, y: 358 },
      { title: 'ALFAMA', sub: 'LARGO DAS PORTAS DO SOL', x: 1955, y: 358 }
    ];
    for (const p of plaques) {
      ctx.font = '700 10px Georgia, serif';
      const w = Math.max(ctx.measureText(p.title).width, ctx.measureText(p.sub).width) + 28;
      const h = 28;
      const px = p.x - w / 2;
      const py = p.y - h / 2;

      ctx.fillStyle = 'rgba(18, 28, 42, 0.16)';
      drawRoundedRect(ctx, px + 2, py + 2, w, h, 4);
      ctx.fill();

      ctx.fillStyle = '#faf8f3';
      drawRoundedRect(ctx, px, py, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(27, 77, 137, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 3, py + 3, w - 6, h - 6);

      ctx.fillStyle = '#1b4d89';
      ctx.fillRect(px + 4, py + 4, 3, 3);
      ctx.fillRect(px + w - 7, py + 4, 3, 3);
      ctx.fillRect(px + 4, py + h - 7, 3, 3);
      ctx.fillRect(px + w - 7, py + h - 7, 3, 3);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#14375f';
      ctx.font = '700 9.5px Georgia, serif';
      ctx.fillText(p.title, p.x, py + 12);
      ctx.font = '600 8px "Segoe UI", sans-serif';
      ctx.fillStyle = '#3c5a7d';
      ctx.fillText(p.sub, p.x, py + 22);
    }
    ctx.textAlign = 'left';
  }

  drawCityDistrictSpotOverworld(ctx, spot, isHighlighted, isEvening) {
    const x = spot.worldX;
    const y = spot.worldY;
    const w = spot.w;
    const h = spot.h;
    const accent = spot.accentColor || '#1b4d89';

    ctx.save();
    ctx.fillStyle = 'rgba(18, 25, 36, 0.22)';
    ctx.fillRect(x + 6, y + 8, w, h);

    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    }

    if (spot.kind === 'landmark') {
      // Iconic Greater Lisboa open-world monument block (Torre de Belem, Marques de Pombal, Campo Pequeno, Fonte Luminosa, Calatrava Oriente, etc.)
      ctx.fillStyle = spot.skylineStyle === 'campo-pequeno' ? '#9a3412' : spot.skylineStyle === 'oriente-calatrava' ? '#e2e8f0' : '#ebe3d3';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.6;
      ctx.strokeRect(x, y, w, h);

      // Architectural silhouette badge inside roof
      ctx.fillStyle = accent;
      ctx.fillRect(x + 6, y + 6, w - 12, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8.5px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(spot.badge || '[LANDMARK]', x + w * 0.5, y + 21, w - 18);

      // Decorative monument centerpiece
      if (spot.skylineStyle === 'alameda-fountain' || spot.skylineStyle === 'rossio-santa-justa') {
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.5, y + h * 0.56, 34, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (spot.skylineStyle === 'campo-pequeno') {
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y + h * 0.58, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (spot.skylineStyle === 'oriente-calatrava') {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.4;
        for (const ox of [-44, 0, 44]) {
          ctx.beginPath();
          ctx.arc(x + w * 0.5 + ox, y + h * 0.58, 18, Math.PI, 0);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#d6cbb8';
        ctx.fillRect(x + w * 0.5 - 24, y + h * 0.38, 48, 44);
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x + w * 0.5 - 24, y + h * 0.38, 48, 44);
      }
    } else {
      // Greater Lisboa Eatery or Cultural Shop facade with terracotta roof & striped awning
      const roofH = 42;
      ctx.fillStyle = spot.kind === 'eatery' ? '#f5ead6' : '#eaf2fb';
      ctx.fillRect(x, y + roofH, w, h - roofH);
      this.drawTerracottaRoof(ctx, x, y, w, roofH, spot.kind === 'eatery' ? '#b84a32' : '#1b4d89', false);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x, y, w, h);

      // Striped Portuguese storefront awning
      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? accent : '#fef9c3';
        ctx.fillRect(x + 12 + i * ((w - 24) / 6), y + roofH + 4, (w - 24) / 6, 12);
      }
      // Glowing storefront windows & entrance door
      ctx.fillStyle = isEvening ? '#fde68a' : '#dbeafe';
      ctx.fillRect(x + 18, y + roofH + 26, 44, 34);
      ctx.fillRect(x + w - 62, y + roofH + 26, 44, 34);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(x + w * 0.5 - 16, y + h - 42, 32, 42);
    }

    // Crisp Lisbon enamel plaque above doorway
    drawRoundedRect(ctx, x + 8, y + h - 22, w - 16, 18, 4);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? '#facc15' : accent;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(spot.name, x + w * 0.5, y + h - 10, w - 24);
    ctx.restore();
  }

  drawOverworldCityGateways(ctx, nearbyInteraction) {
    for (const gw of OVERWORLD_CITY_GATEWAYS) {
      const isHi = nearbyInteraction?.type === 'city-avenue' && nearbyInteraction.targetZoneId === gw.toZoneId;
      const kmTxt = gw.distanceMeters >= 1000 ? `${(gw.distanceMeters / 1000).toFixed(1)}km` : `${gw.distanceMeters}m`;
      const label = `WALK -> ${gw.shortLabel} (${kmTxt})`;
      ctx.save();
      ctx.font = '700 8.5px Georgia, serif';
      const tw = ctx.measureText(label).width + 16;
      const gx = clamp(gw.x, tw * 0.5 + 8, WORLD_WIDTH - tw * 0.5 - 8);
      const gy = gw.y - 20;
      drawRoundedRect(ctx, gx - tw * 0.5, gy - 10, tw, 20, 4);
      ctx.fillStyle = isHi ? '#fef3c7' : '#faf8f3';
      ctx.fill();
      ctx.strokeStyle = isHi ? '#d97706' : '#1b4d89';
      ctx.lineWidth = isHi ? 2.4 : 1.8;
      ctx.stroke();
      ctx.fillStyle = '#14375f';
      ctx.textAlign = 'center';
      ctx.fillText(label, gx, gy + 3);
      // Blue-and-gold directional sidewalk beacon
      ctx.fillStyle = isHi ? '#f59e0b' : '#1b4d89';
      ctx.beginPath();
      ctx.arc(gw.x, gw.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTreesAndBenches(ctx, state) {
    const monthInfo = getMonthInfo(state.month);
    const foliageMode = monthInfo.foliageMode || 'bloom';
    const jacBloom = monthInfo.jacarandaBloom || 0;
    const trees = [
      { x: 482, y: 125, c: '#7a58ab', shadow: '#54387d', highlight: '#b79ae0', jacaranda: true },
      { x: 545, y: 125, c: '#7a58ab', shadow: '#54387d', highlight: '#b79ae0', jacaranda: true },
      { x: 890, y: 492, c: '#3f7d52', shadow: '#295738', highlight: '#74b886', jacaranda: false },
      { x: 1010, y: 492, c: '#3f7d52', shadow: '#295738', highlight: '#74b886', jacaranda: false },
      { x: 2178, y: 492, c: '#487f57', shadow: '#2d593a', highlight: '#7ec08d', jacaranda: false },
      { x: 350, y: 984, c: '#3f7d52', shadow: '#295738', highlight: '#74b886', jacaranda: false },
      { x: 545, y: 984, c: '#7a58ab', shadow: '#54387d', highlight: '#b79ae0', jacaranda: true },
      { x: 860, y: 984, c: '#3f7d52', shadow: '#295738', highlight: '#74b886', jacaranda: false },
      { x: 1135, y: 984, c: '#487f57', shadow: '#2d593a', highlight: '#7ec08d', jacaranda: false },
      { x: 1410, y: 984, c: '#7a58ab', shadow: '#54387d', highlight: '#b79ae0', jacaranda: true },
      { x: 1685, y: 984, c: '#3f7d52', shadow: '#295738', highlight: '#74b886', jacaranda: false },
      { x: 1895, y: 984, c: '#7a58ab', shadow: '#54387d', highlight: '#b79ae0', jacaranda: true },
      { x: 2070, y: 984, c: '#3f7d52', shadow: '#295738', highlight: '#74b886', jacaranda: false }
    ];
    for (const t of trees) {
      let cMain = t.c;
      let cShadow = t.shadow;
      let cHi = t.highlight;
      if (t.jacaranda) {
        if (foliageMode === 'bloom') {
          cMain = '#7a58ab';
          cShadow = '#54387d';
          cHi = '#b79ae0';
        } else if (foliageMode === 'spring') {
          cMain = jacBloom >= 0.3 ? '#786ca0' : '#4a8559';
          cShadow = jacBloom >= 0.3 ? '#524970' : '#2f5e3d';
          cHi = jacBloom >= 0.3 ? '#aa96d6' : '#79b885';
        } else if (foliageMode === 'lush') {
          cMain = '#377a4d';
          cShadow = '#245435';
          cHi = '#68b47c';
        } else if (foliageMode === 'autumn') {
          cMain = '#b86d28';
          cShadow = '#804816';
          cHi = '#e6a545';
        } else {
          cMain = '#4e6357';
          cShadow = '#34453c';
          cHi = '#728a7c';
        }
      } else if (foliageMode === 'autumn') {
        cMain = '#707339';
        cShadow = '#4c4f24';
        cHi = '#b59d4a';
      } else if (foliageMode === 'winter') {
        cMain = '#3a624a';
        cShadow = '#254231';
        cHi = '#5d8a6e';
      }

      // Dappled canopy ground shadow
      ctx.fillStyle = 'rgba(22, 28, 38, 0.2)';
      ctx.beginPath();
      ctx.ellipse(t.x + 5, t.y + 10, 21, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Carved Lioz limestone sidewalk planter curb & dark earth tree well
      ctx.fillStyle = '#dfd7c8';
      ctx.strokeStyle = '#8c8273';
      ctx.lineWidth = 1.1;
      ctx.fillRect(t.x - 10, t.y + 4, 20, 10);
      ctx.strokeRect(t.x - 10, t.y + 4, 20, 10);
      ctx.fillStyle = '#473628';
      ctx.fillRect(t.x - 7, t.y + 6, 14, 6);

      // Fallen Jacaranda petals (May/June) or golden autumn leaves (Oct/Nov) around sidewalk tree well
      if ((t.jacaranda && jacBloom >= 0.5) || foliageMode === 'autumn') {
        ctx.fillStyle = foliageMode === 'autumn' ? 'rgba(217, 119, 6, 0.58)' : 'rgba(168, 121, 224, 0.55)';
        for (const [px, py] of [[-12, 11], [-5, 14], [7, 13], [13, 9], [-8, 7]]) {
          ctx.beginPath();
          ctx.arc(t.x + px, t.y + py, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Tapered wooden trunk & forked upper branches
      ctx.fillStyle = '#593d28';
      ctx.beginPath();
      ctx.moveTo(t.x - 4.5, t.y + 10);
      ctx.lineTo(t.x + 4.5, t.y + 10);
      ctx.lineTo(t.x + 2.8, t.y - 4);
      ctx.lineTo(t.x - 2.8, t.y - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7d583c';
      ctx.fillRect(t.x - 3.2, t.y - 2, 2, 11);

      ctx.strokeStyle = '#593d28';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(t.x - 1, t.y - 2);
      ctx.lineTo(t.x - 9, t.y - 10);
      ctx.moveTo(t.x + 1, t.y - 2);
      ctx.lineTo(t.x + 9, t.y - 9);
      ctx.stroke();

      // Multi-layered volumetric foliage clusters (deep shadow -> mid -> sunlit top crown)
      ctx.fillStyle = cShadow;
      for (const [dx, dy, r] of [[-11, -4, 10], [11, -4, 10], [0, -2, 12]]) {
        ctx.beginPath();
        ctx.arc(t.x + dx, t.y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = cMain;
      for (const [dx, dy, r] of [[-9, -9, 11], [9, -8, 11], [0, -12, 13.5], [-4, -6, 12]]) {
        ctx.beginPath();
        ctx.arc(t.x + dx, t.y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = cHi;
      for (const [dx, dy, r] of [[-5, -15, 7.5], [5, -13, 6.5], [-10, -10, 5.5], [8, -7, 4.8]]) {
        ctx.beginPath();
        ctx.arc(t.x + dx, t.y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const spot of REST_SPOTS) {
      const captured = state.memories.some((m) => m.id === spot.memory.id);

      ctx.fillStyle = '#f2eee6';
      drawRoundedRect(ctx, spot.x - 32, spot.y - 18, 64, 12, 3);
      ctx.fill();
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1b4d89';
      for (let tx = spot.x - 26; tx <= spot.x + 20; tx += 12) {
        ctx.fillRect(tx, spot.y - 15, 6, 6);
      }

      if (spot.id !== 'bench-chiado') {
        ctx.fillStyle = '#be2f6c';
        ctx.beginPath();
        ctx.arc(spot.x - 28, spot.y - 14, 6, 0, Math.PI * 2);
        ctx.arc(spot.x + 28, spot.y - 14, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ec6ea3';
        ctx.beginPath();
        ctx.arc(spot.x - 29, spot.y - 15, 2.5, 0, Math.PI * 2);
        ctx.arc(spot.x + 27, spot.y - 15, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(25, 30, 35, 0.2)';
      ctx.fillRect(spot.x - 22, spot.y - 3, 44, 15);

      ctx.fillStyle = '#8b5a34';
      drawRoundedRect(ctx, spot.x - 22, spot.y - 7, 44, 13, 3);
      ctx.fill();
      ctx.strokeStyle = '#52321b';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 232, 200, 0.35)';
      ctx.beginPath();
      ctx.moveTo(spot.x - 20, spot.y - 2);
      ctx.lineTo(spot.x + 20, spot.y - 2);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.fillRect(spot.x - 18, spot.y + 5, 4, 5);
      ctx.fillRect(spot.x + 14, spot.y + 5, 4, 5);

      ctx.font = '700 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = captured ? '#0f766e' : '#3d2f22';
      ctx.fillText(captured ? 'MIRADOURO [SAVED]' : 'MIRADOURO BENCH', spot.x, spot.y - 23);
      const perf = (state.miradouroPerformances || []).find((m) => m.spotId === spot.id);
      if (perf) {
        this.drawCharacterSprite(ctx, spot.x + 34, spot.y - 2, {
          facing: 'down',
          walkPhase: this.animTime * 3.2,
          isMoving: false,
          outfitId: perf.musicianOutfitId || spot.musicianOutfitId || 'fado-blazer',
          label: `${perf.musicianName}: "${perf.songTitle}"`,
          emoteText: state.miradouroEncore?.spotId === spot.id ? `${perf.instrument}!` : '',
          isPlayer: false
        });
      }
      ctx.textAlign = 'left';
    }
  }

  drawMetroStation(ctx, station, isHighlighted, isEvening) {
    // Authentic Metropolitano de Lisboa street entrance: stone stair canopy + red/white M mast
    ctx.save();

    if (isHighlighted) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, station.x - 5, station.y - 5, station.w + 10, station.h + 10, 7);
      ctx.stroke();
    }

    // Drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    drawRoundedRect(ctx, station.x + 4, station.y + 5, station.w, station.h, 5);
    ctx.fill();

    // Limestone & steel headhouse / stairwell enclosure
    ctx.fillStyle = '#e5dfd3';
    drawRoundedRect(ctx, station.x, station.y, station.w, station.h, 5);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Descending escalator steps inside glazed canopy
    const innerX = station.x + 7;
    const innerY = station.y + 8;
    const innerW = station.w - 14;
    const innerH = Math.max(10, station.h - 14);
    ctx.fillStyle = isEvening ? '#1e3a5f' : '#324a66';
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // Subtle descending staircase treads
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 1;
    for (let sy = innerY + 4; sy < innerY + innerH - 2; sy += 5) {
      ctx.beginPath();
      ctx.moveTo(innerX + 3, sy);
      ctx.lineTo(innerX + innerW - 3, sy);
      ctx.stroke();
    }

    // Blue glazed glass canopy roof highlight
    ctx.fillStyle = 'rgba(125, 211, 252, 0.28)';
    ctx.fillRect(innerX, innerY, innerW, Math.min(18, innerH));

    // Iconic Lisbon Metro crimson-and-white "M" totem emblem
    const mx = station.x + station.w / 2;
    const my = station.y - 6;
    ctx.fillStyle = '#c81e32';
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', mx, my + 4.2);

    // Line color pills (Linha Azul / Linha Verde)
    const dotStartX = mx - ((station.lineColors.length - 1) * 7);
    station.lineColors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(dotStartX + i * 14, station.y + station.h - 6, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Crisp station name tag
    const shortName = station.name.replace('Metro ', '');
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    const labelW = ctx.measureText(shortName).width + 10;
    drawRoundedRect(ctx, mx - labelW / 2, station.y + station.h + 2, labelW, 13, 3);
    ctx.fillStyle = 'rgba(18, 34, 56, 0.88)';
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(shortName, mx, station.y + station.h + 11.5);

    ctx.restore();
  }


  drawLisbonStreetlamps(ctx, isEvening, isGolden) {
    const lamps = [
      { x: 455, y: 220 },
      { x: 878, y: 220 },
      { x: 1028, y: 220 },
      { x: 1425, y: 220 },
      { x: 1810, y: 220 },
      { x: 878, y: 542 },
      { x: 1028, y: 542 },
      { x: 1425, y: 542 },
      { x: 1810, y: 542 },
      { x: 455, y: 868 },
      { x: 1028, y: 868 },
      { x: 1660, y: 868 },
      { x: 2120, y: 868 }
    ];

    for (const lamp of lamps) {
      if (isEvening || isGolden) {
        const glowRadius = isEvening ? 46 : 26;
        const glow = ctx.createRadialGradient(lamp.x, lamp.y - 14, 2, lamp.x, lamp.y - 14, glowRadius);
        glow.addColorStop(0, isEvening ? 'rgba(255, 226, 130, 0.5)' : 'rgba(255, 220, 130, 0.22)');
        glow.addColorStop(1, 'rgba(255, 226, 130, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y - 14, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#242f3d';
      ctx.fillRect(lamp.x - 1.5, lamp.y - 16, 3, 18);
      ctx.fillRect(lamp.x - 4, lamp.y, 8, 3);
      ctx.fillStyle = isEvening || isGolden ? '#ffe082' : '#d8e4ee';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawSeasonalOverworldDecor(ctx, monthInfo, isEvening, nearbyInteraction = null) {
    const style = monthInfo?.decorStyle;
    if (!style) return;

    ctx.save();
    const xs = [360, 560, 760, 960, 1160, 1360, 1560, 1760, 1960];

    if (style === 'christmas-lights' || style === 'janeiras-stars') {
      const isDec = style === 'christmas-lights';
      for (const x of xs) {
        ctx.strokeStyle = isDec ? 'rgba(253, 224, 71, 0.78)' : 'rgba(250, 204, 21, 0.52)';
        ctx.lineWidth = isDec ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(x, 540);
        ctx.quadraticCurveTo(x + 16, 610, x, 678);
        ctx.stroke();
        for (let k = 0; k <= 6; k += 1) {
          const t = k / 6;
          const by = 540 + t * 138;
          const bx = x + Math.sin(t * Math.PI) * 16;
          ctx.fillStyle = k === 3 ? '#fef08a' : '#fde68a';
          ctx.beginPath();
          ctx.arc(bx, by, k === 3 ? (isDec ? 5.5 : 4) : 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (isDec) {
        // Illuminated Praca Luis de Camoes Christmas Tree in 2D map
        for (const [tx, ty] of [[992, 440], [1855, 536]]) {
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.moveTo(tx - 16, ty + 6);
          ctx.lineTo(tx + 16, ty + 6);
          ctx.lineTo(tx, ty - 28);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(tx, ty - 29, 4.5, 0, Math.PI * 2);
          ctx.fill();
          for (const [ox, oy, col] of [[-6, -2, '#ef4444'], [5, -4, '#fde047'], [0, -14, '#38bdf8'], [-4, -10, '#fde047']]) {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(tx + ox, ty + oy, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else if (
      style === 'carnaval' ||
      style === 'cravos-25-abril' ||
      style === 'santos-populares' ||
      style === 'alfama-fado' ||
      style === 'marathon-banners'
    ) {
      const palettes = {
        carnaval: ['#ec4899', '#facc15', '#06b6d4', '#10b981', '#ef4444'],
        'cravos-25-abril': ['#dc2626', '#15803d', '#dc2626', '#facc15'],
        'santos-populares': ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ffffff'],
        'alfama-fado': ['#881337', '#eab308', '#9f1239', '#fef08a'],
        'marathon-banners': ['#1d4ed8', '#facc15', '#0284c7']
      };
      const cols = palettes[style] || ['#ef4444', '#facc15'];
      for (const x of xs) {
        ctx.strokeStyle = isEvening ? 'rgba(203, 213, 225, 0.45)' : 'rgba(51, 65, 85, 0.48)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, 540);
        ctx.lineTo(x, 678);
        ctx.stroke();
        for (let k = 0; k < 7; k += 1) {
          const fy = 548 + k * 18;
          ctx.fillStyle = cols[k % cols.length];
          ctx.beginPath();
          ctx.moveTo(x, fy);
          ctx.lineTo(x + 9, fy + 5);
          ctx.lineTo(x, fy + 10);
          ctx.closePath();
          ctx.fill();
        }
        if (style === 'cravos-25-abril') {
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(x, 608, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (style === 'summer-sun' || style === 'summer-festival') {
      for (const [px, py, col] of [
        [994, 452, '#0284c7'],
        [1098, 534, '#d97706'],
        [1030, 982, '#dc2626'],
        [1465, 982, '#0f766e']
      ]) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath();
        ctx.arc(px + 3, py + 4, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff9f0';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, 14, 0, Math.PI * 0.5);
        ctx.lineTo(px, py);
        ctx.arc(px, py, 14, Math.PI, Math.PI * 1.5);
        ctx.fill();
      }
    }
    if (monthInfo.hasCastanhaVendors) {
      for (const cv of CASTANHA_VENDORS) {
        const cx = cv.x;
        const cy = cv.y;
        const isHi = nearbyInteraction?.type === 'castanha-cart' && nearbyInteraction.id === cv.id;
        if (isHi) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.4;
          drawRoundedRect(ctx, cx - 14, cy - 12, 28, 22, 4);
          ctx.stroke();
        }
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 10, cy - 8, 20, 14);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(cx - 6, cy - 5, 12, 6);
        // Tiny kraft-paper chestnut cones ready for sale (3 EUR)
        ctx.fillStyle = '#f5e6c8';
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy - 2);
        ctx.lineTo(cx - 10, cy - 8);
        ctx.lineTo(cx - 5, cy - 8);
        ctx.closePath();
        ctx.fill();
        const rise = (this.animTime * 12) % 14;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.beginPath();
        ctx.arc(cx, cy - 10 - rise, 5, 0, Math.PI * 2);
        ctx.fill();
        this.drawCharacterSprite(ctx, cx + 18, cy, {
          facing: 'down',
          walkPhase: 0,
          isMoving: false,
          outfitId: 'tile-artisan',
          label: `${cv.vendorName} (Castanhas)`,
          emoteText: cv.cry,
          isPlayer: false
        });
      }
    }
    ctx.restore();
  }

  drawTransitStop(ctx, stop, isHighlighted, isEvening) {
    const px = stop.platformX;
    const py = stop.platformY;
    const isTram = stop.mode === 'tram';
    const postColor = isTram ? '#d9980c' : '#1b7a5c';

    ctx.fillStyle = isHighlighted ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 252, 245, 0.65)';
    drawRoundedRect(ctx, px - 28, py - 12, 56, 24, 6);
    ctx.fill();
    ctx.strokeStyle = postColor;
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 18, py - 22, 3, 22);
    ctx.fillStyle = postColor;
    drawRoundedRect(ctx, px + 7, py - 33, 26, 14, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const routeTag = stop.routeNumber || (isTram ? '28E' : 'BUS');
    ctx.fillText(routeTag, px + 20, py - 23);

    if (isEvening) {
      ctx.fillStyle = 'rgba(255, 232, 158, 0.24)';
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 9.2px "Segoe UI", sans-serif';
    ctx.fillText(stop.stopName.split(' (')[0], px, py + 20);
    ctx.textAlign = 'left';
  }

  drawTransitVehicle(ctx, vehicle, playerAboard, isEvening, remoteAboard = []) {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.heading);

    const isTram = vehicle.mode === 'tram';
    const len = isTram ? 72 : 76;
    const wid = 30;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    drawRoundedRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 7);
    ctx.fill();

    if (isEvening) {
      const beam = ctx.createLinearGradient(len / 2, 0, len / 2 + 72, 0);
      beam.addColorStop(0, 'rgba(255, 236, 153, 0.56)');
      beam.addColorStop(1, 'rgba(255, 236, 153, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(len / 2, -8);
      ctx.lineTo(len / 2 + 72, -26);
      ctx.lineTo(len / 2 + 72, 26);
      ctx.lineTo(len / 2, 8);
      ctx.closePath();
      ctx.fill();
    }

    if (isTram) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(len / 2 - 2, -wid / 2 + 6, 6, wid - 12);
      ctx.fillRect(-len / 2 - 4, -wid / 2 + 6, 6, wid - 12);

      ctx.fillStyle = '#eab308';
      drawRoundedRect(ctx, -len / 2, -wid / 2, len, wid, 8);
      ctx.fill();
      ctx.strokeStyle = '#422006';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#fdfbf7';
      drawRoundedRect(ctx, -len / 2 + 7, -wid / 2 + 4, len - 14, wid - 8, 5);
      ctx.fill();
      ctx.strokeStyle = '#b47b16';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#1e3a5f';
      for (let wx = -len / 2 + 11; wx <= len / 2 - 19; wx += 10) {
        ctx.fillRect(wx, -wid / 2 + 1, 7, 3);
        ctx.fillRect(wx, wid / 2 - 4, 7, 3);
      }

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(len / 2 - 1, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(-4, -5);
      ctx.lineTo(-4, 5);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(-4, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(vehicle.routeNumber || '28E', 14, 3.5);
    } else {
      ctx.fillStyle = vehicle.color;
      drawRoundedRect(ctx, -len / 2, -wid / 2, len, wid, 7);
      ctx.fill();
      ctx.strokeStyle = '#133a2d';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = vehicle.trimColor;
      drawRoundedRect(ctx, -len / 2 + 8, -wid / 2 + 4, len - 16, wid - 8, 4);
      ctx.fill();

      ctx.fillStyle = '#243b53';
      for (let wx = -len / 2 + 12; wx <= len / 2 - 20; wx += 13) {
        ctx.fillRect(wx, -wid / 2 + 1, 9, 3);
        ctx.fillRect(wx, wid / 2 - 4, 9, 3);
      }
      ctx.fillStyle = '#334e68';
      ctx.fillRect(len / 2 - 7, -wid / 2 + 5, 5, wid - 10);

      ctx.fillStyle = '#124a38';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(vehicle.routeNumber || '737', 0, 3.5);
    }

    // Brake taillights glowing red when yielding to a pedestrian
    if (vehicle.yielding) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-len / 2 - 1, -wid / 2 + 4, 3, 6);
      ctx.fillRect(-len / 2 - 1, wid / 2 - 10, 3, 6);
    }

    if (playerAboard) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, -len / 2 - 4, -wid / 2 - 4, len + 8, wid + 8, 10);
      ctx.stroke();

      ctx.fillStyle = '#d4583b';
      ctx.beginPath();
      ctx.arc(-10, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6d5b8';
      ctx.beginPath();
      ctx.arc(-10, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Show connected multiplayer travelers riding aboard this tram or bus
    if (Array.isArray(remoteAboard) && remoteAboard.length > 0) {
      remoteAboard.slice(0, 3).forEach((rp, idx) => {
        const outfit = getOutfitById(rp.outfitId);
        const rx = -22 + idx * 14;
        ctx.fillStyle = outfit.ringColor;
        ctx.beginPath();
        ctx.arc(rx, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = outfit.skinColor;
        ctx.beginPath();
        ctx.arc(rx, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();

    if (vehicle.yielding) {
      const tag = `${vehicle.badge} YIELDING`;
      ctx.font = '700 9px "Segoe UI", sans-serif';
      const tw = ctx.measureText(tag).width + 12;
      drawRoundedRect(ctx, vehicle.x - tw / 2, vehicle.y + 20, tw, 16, 4);
      ctx.fillStyle = 'rgba(153, 27, 27, 0.9)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef2f2';
      ctx.fillText(tag, vehicle.x, vehicle.y + 31);
      ctx.textAlign = 'left';
    } else if (vehicle.currentStopId) {
      const tag = playerAboard ? 'ABOARD - AT STOP' : `${vehicle.badge} AT STOP`;
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      const tw = ctx.measureText(tag).width + 12;
      drawRoundedRect(ctx, vehicle.x - tw / 2, vehicle.y + 20, tw, 16, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(tag, vehicle.x, vehicle.y + 31);
      ctx.textAlign = 'left';
    }
  }

  drawCharacterSprite(ctx, x, y, opts) {
    const outfit = opts.outfitId ? getOutfitById(opts.outfitId) : null;
    const styleType = outfit ? outfit.styleType : 'trench';
    const primary = outfit ? outfit.primaryColor : (opts.tunicColor || '#1b4d89');
    const secondary = outfit ? outfit.secondaryColor : (opts.scarfColor || '#d4583b');
    const accent = outfit ? outfit.accentColor : '#eab308';
    const pantsColor = outfit ? outfit.pantsColor : '#3b2b22';
    const hairColor = outfit ? outfit.hairColor : (opts.hairColor || '#2d211b');
    const skinColor = outfit ? outfit.skinColor : '#f2cfb2';
    const ringColor = outfit ? outfit.ringColor : '#d4583b';
    const hatType = outfit ? outfit.hatType : 'none';
    const isTraveler = Boolean(opts.isPlayer || opts.isRemotePlayer);

    const bob = opts.isMoving ? Math.sin(opts.walkPhase) * 2.5 : 0;
    const legSwing = opts.isMoving ? Math.sin(opts.walkPhase) * 4 : 0;

    ctx.save();

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.beginPath();
    ctx.ellipse(x, y + 11, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight ground ring for active players (distinct color per clothing style)
    if (isTraveler) {
      ctx.strokeStyle = opts.isPlayer ? ringColor : ringColor;
      ctx.lineWidth = opts.isPlayer ? 2.0 : 1.7;
      if (opts.isRemotePlayer) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(x, y + 11, 13.5, 6.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shoes / boots / legs
    ctx.fillStyle = pantsColor;
    ctx.beginPath();
    ctx.arc(x - 4, y + 8 + legSwing * 0.45, 3.4, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 8 - legSwing * 0.45, 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Backpack visible when facing away
    if (isTraveler && opts.facing === 'up') {
      ctx.fillStyle = '#8b4c28';
      drawRoundedRect(ctx, x - 7, y - 5 + bob, 14, 11, 3);
      ctx.fill();
      ctx.strokeStyle = '#3d2514';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Clothing silhouettes: 6 distinct cloth styles
    if (styleType === 'sundress') {
      // Flared pleated Mediterranean sundress with contrasting waist sash
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 7 + bob);
      ctx.lineTo(x + 6, y - 7 + bob);
      ctx.lineTo(x + 11, y + 8 + bob);
      ctx.lineTo(x - 11, y + 8 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3f1d1d';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // White waist sash & bow
      ctx.fillStyle = secondary;
      ctx.fillRect(x - 7.5, y - 1 + bob, 15, 3);
      // Hem lace border
      ctx.fillStyle = secondary;
      ctx.fillRect(x - 10, y + 5.5 + bob, 20, 2);
      // Pleat lines
      ctx.strokeStyle = 'rgba(80, 20, 20, 0.35)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 2 + bob);
      ctx.lineTo(x - 5, y + 7 + bob);
      ctx.moveTo(x + 3, y + 2 + bob);
      ctx.lineTo(x + 5, y + 7 + bob);
      ctx.stroke();
    } else if (styleType === 'poncho') {
      // Wide triangular-draped bohemian woven poncho cape with gold diamond stripe & fringe tassels
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 7 + bob);
      ctx.lineTo(x + 7, y - 7 + bob);
      ctx.lineTo(x + 12, y + 5 + bob);
      ctx.lineTo(x, y + 8.5 + bob);
      ctx.lineTo(x - 12, y + 5 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f3d33';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Woven golden geometric band
      ctx.fillStyle = secondary;
      ctx.fillRect(x - 9, y - 1 + bob, 18, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(x - 2, y - 1 + bob, 4, 3);
      // Bottom cream fringe tassels
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.1;
      for (let fx = x - 9; fx <= x + 9; fx += 3) {
        ctx.beginPath();
        ctx.moveTo(fx, y + 5.5 + bob);
        ctx.lineTo(fx, y + 8.5 + bob);
        ctx.stroke();
      }
    } else if (styleType === 'sailor') {
      // Classic Breton horizontal-striped maritime knit sweater + neckerchief
      ctx.fillStyle = primary;
      drawRoundedRect(ctx, x - 8, y - 7 + bob, 16, 15, 4.5);
      ctx.fill();
      ctx.fillStyle = secondary;
      ctx.fillRect(x - 7.5, y - 4 + bob, 15, 2.2);
      ctx.fillRect(x - 7.5, y + 0.2 + bob, 15, 2.2);
      ctx.fillRect(x - 7.5, y + 4.4 + bob, 15, 2.2);
      ctx.strokeStyle = '#182436';
      ctx.lineWidth = 1.2;
      drawRoundedRect(ctx, x - 8, y - 7 + bob, 16, 15, 4.5);
      ctx.stroke();
      // Knotted golden-ochre maritime neckerchief
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 7 + bob);
      ctx.lineTo(x + 6, y - 7 + bob);
      ctx.lineTo(x, y - 2 + bob);
      ctx.closePath();
      ctx.fill();
    } else if (styleType === 'overalls') {
      // Collared ochre shirt under indigo denim dungaree overalls with straps & brass buttons
      ctx.fillStyle = secondary;
      drawRoundedRect(ctx, x - 8, y - 7 + bob, 16, 15, 4.5);
      ctx.fill();
      // Denim overalls bib & lower shorts/trousers
      ctx.fillStyle = primary;
      ctx.fillRect(x - 6.5, y - 1 + bob, 13, 9);
      ctx.fillRect(x - 5.5, y - 7 + bob, 3, 7);
      ctx.fillRect(x + 2.5, y - 7 + bob, 3, 7);
      // Center pocket & brass buckles
      ctx.strokeStyle = '#182436';
      ctx.lineWidth = 1.2;
      drawRoundedRect(ctx, x - 8, y - 7 + bob, 16, 15, 4.5);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x - 5, y - 2 + bob, 2, 2);
      ctx.fillRect(x + 3, y - 2 + bob, 2, 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - 3.5, y + 1.5 + bob, 7, 4);
    } else if (styleType === 'blazer') {
      // Tailored cream linen summer jacket with open V-lapels over a plum waistcoat
      ctx.fillStyle = primary;
      drawRoundedRect(ctx, x - 8.5, y - 7 + bob, 17, 15, 4);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Open V waistcoat & crisp white shirt collar
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.moveTo(x - 4.5, y - 7 + bob);
      ctx.lineTo(x + 4.5, y - 7 + bob);
      ctx.lineTo(x + 3, y + 7 + bob);
      ctx.lineTo(x - 3, y + 7 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 7 + bob);
      ctx.lineTo(x + 3, y - 7 + bob);
      ctx.lineTo(x, y - 2 + bob);
      ctx.closePath();
      ctx.fill();
      // Gold lapel pocket square
      ctx.fillStyle = accent;
      ctx.fillRect(x + 4, y - 2 + bob, 3, 2);
    } else {
      // Classic Lisbon double-breasted trench coat with brass buttons & draped hanging scarf
      ctx.fillStyle = primary;
      drawRoundedRect(ctx, x - 8, y - 7 + bob, 16, 15, 4.5);
      ctx.fill();
      ctx.strokeStyle = '#182436';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Brass trench buttons
      ctx.fillStyle = accent;
      ctx.fillRect(x - 3, y + bob, 1.8, 1.8);
      ctx.fillRect(x + 1.5, y + bob, 1.8, 1.8);
      ctx.fillRect(x - 3, y + 4 + bob, 1.8, 1.8);
      ctx.fillRect(x + 1.5, y + 4 + bob, 1.8, 1.8);
      // Draped scarf + vertical scarf tail
      ctx.fillStyle = secondary;
      ctx.fillRect(x - 7, y - 6.5 + bob, 14, 3.8);
      ctx.fillRect(x + 2, y - 3 + bob, 3.5, 8);
    }

    // Long flowing hair behind head for sundress & poncho styles
    if (styleType === 'sundress' || styleType === 'poncho') {
      ctx.fillStyle = hairColor;
      drawRoundedRect(ctx, x - 8.5, y - 16 + bob, 17, 11, 5);
      ctx.fill();
    }

    // Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(x, y - 13 + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hair cap
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(x, y - 15.5 + bob, 7.2, Math.PI, Math.PI * 2);
    ctx.fill();

    // Distinct Headwear per clothing style
    if (hatType === 'sunhat') {
      // Wide-brimmed straw sun hat with navy ribbon
      ctx.fillStyle = '#ecd298';
      ctx.beginPath();
      ctx.ellipse(x, y - 19 + bob, 12.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#92672a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e6c278';
      ctx.beginPath();
      ctx.arc(x, y - 19.5 + bob, 6.2, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(x - 6, y - 20.5 + bob, 12, 2.2);
    } else if (hatType === 'beret') {
      // Angled wool beret with tiny top stem
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.ellipse(x + 1.5, y - 20.5 + bob, 8.8, 4.2, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillRect(x + 1, y - 25.5 + bob, 1.8, 2.5);
    } else if (hatType === 'headband') {
      // Woven colorful bohemian headband
      ctx.fillStyle = secondary;
      ctx.fillRect(x - 7, y - 18.5 + bob, 14, 2.6);
      ctx.fillStyle = primary;
      ctx.fillRect(x - 2, y - 18.5 + bob, 4, 2.6);
    } else if (hatType === 'flatcap') {
      // Tweed newsboy flat cap with forward brim
      ctx.fillStyle = '#5c4938';
      ctx.beginPath();
      ctx.ellipse(x, y - 19.5 + bob, 8.2, 4, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d2f23';
      ctx.fillRect(x - 7.5, y - 19.5 + bob, 16, 2.5);
    } else if (hatType === 'fedora') {
      // Classic tailored Lisbon fedora with gold hatband
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(x, y - 19 + bob, 11, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      drawRoundedRect(ctx, x - 6.2, y - 26 + bob, 12.4, 7.5, 2.5);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(x - 6, y - 20.8 + bob, 12, 2);
    }

    // Eyes
    ctx.fillStyle = '#1e293b';
    if (opts.facing === 'down') {
      ctx.fillRect(x - 3, y - 13 + bob, 2, 2);
      ctx.fillRect(x + 1.5, y - 13 + bob, 2, 2);
    } else if (opts.facing === 'left') {
      ctx.fillRect(x - 4.5, y - 13 + bob, 2, 2);
    } else if (opts.facing === 'right') {
      ctx.fillRect(x + 2.5, y - 13 + bob, 2, 2);
    }

    // Rain umbrella canopy carried by locals on rainy Atlantic days
    if (opts.hasUmbrella) {
      const uCols = ['#1d4ed8', '#b91c1c', '#0f766e', '#ca8a04', '#4338ca'];
      const uCol = uCols[Math.abs(Math.round(x)) % uCols.length];
      ctx.fillStyle = uCol;
      ctx.beginPath();
      ctx.arc(x, y - 24 + bob, 13, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Crisp player nameplate above head when in multiplayer
    const hatTopY = hatType !== 'none' ? y - 28 + bob : y - 23 + bob;
    if (opts.label) {
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      const labelW = Math.ceil(ctx.measureText(opts.label).width) + 12;
      const pillY = hatTopY - 16;
      drawRoundedRect(ctx, x - labelW / 2, pillY, labelW, 15, 4);
      ctx.fillStyle = opts.isPlayer ? 'rgba(20, 50, 88, 0.92)' : 'rgba(255, 255, 255, 0.94)';
      ctx.fill();
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = opts.isPlayer ? '#ffffff' : '#143258';
      ctx.fillText(opts.label, x, pillY + 10.5);
    }

    // Floating quick greeting / speech bubble
    if (opts.emoteText) {
      ctx.font = '600 9.5px "Segoe UI", sans-serif';
      const bubbleW = Math.ceil(ctx.measureText(opts.emoteText).width) + 16;
      const bubbleY = (opts.label ? hatTopY - 36 : hatTopY - 22);
      drawRoundedRect(ctx, x - bubbleW / 2, bubbleY, bubbleW, 18, 6);
      ctx.fillStyle = '#fffbeb';
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#78350f';
      ctx.fillText(opts.emoteText, x, bubbleY + 12);
    }

    ctx.restore();
  }

  drawTimeOfDayOverlay(ctx, phase, monthInfo = getMonthInfo()) {
    const rain = monthInfo?.rainIntensity || 0;
    const style = monthInfo?.decorStyle || '';

    if (phase.id === 'golden') {
      ctx.fillStyle = 'rgba(235, 136, 48, 0.14)';
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    } else if (phase.id === 'evening') {
      ctx.fillStyle = 'rgba(18, 32, 66, 0.34)';
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    } else if ((monthInfo?.sunBrightness || 1) >= 1.15) {
      ctx.fillStyle = 'rgba(255, 248, 214, 0.11)';
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }

    if (rain >= 0.14) {
      ctx.save();
      if (rain >= 0.65) {
        ctx.fillStyle = 'rgba(71, 95, 120, 0.18)';
        ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
      }
      const dropCount = Math.round(30 + rain * 135);
      ctx.strokeStyle = `rgba(214, 236, 252, ${0.28 + rain * 0.34})`;
      ctx.lineWidth = rain >= 0.7 ? 1.4 : 1.05;
      ctx.beginPath();
      for (let i = 0; i < dropCount; i += 1) {
        const speed = 360 + (i % 5) * 70 + rain * 200;
        const rx = ((i * 97.3 + this.animTime * 80) % (this.viewWidth + 60)) - 30;
        const ry = ((i * 53.7 + this.animTime * speed) % (this.viewHeight + 50)) - 25;
        const len = 10 + rain * 15;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - len * 0.22, ry + len);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (style === 'carnaval' || style === 'cravos-25-abril' || style === 'jacaranda-bloom' || style === 'autumn-leaves') {
      ctx.save();
      const cols =
        style === 'carnaval'
          ? ['#ec4899', '#facc15', '#06b6d4', '#10b981', '#ef4444']
          : style === 'cravos-25-abril'
            ? ['#dc2626', '#ef4444', '#b91c1c']
            : style === 'jacaranda-bloom'
              ? ['#9b72cf', '#b796e6']
              : ['#d97706', '#b45309', '#f59e0b'];
      const count = style === 'carnaval' ? 32 : 20;
      for (let i = 0; i < count; i += 1) {
        const px = ((i * 107.1 + this.animTime * 34 + Math.sin(this.animTime * 2 + i) * 16) % (this.viewWidth + 30)) - 15;
        const py = ((i * 63.9 + this.animTime * 40) % (this.viewHeight + 30)) - 15;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.ellipse(px, py, 3.4, 1.8, this.animTime * 2 + i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawBairroAltoPartyAtmosphere(ctx, state, partyLit) {
    // Criss-crossing overhead festoon party light strings atop Bairro Alto (outside Bar da Noite & Sao Pedro!)
    ctx.save();
    const bulbCols = ['#fde047', '#f472b6', '#fb923c', '#38bdf8', '#c084fc'];
    for (const bx of [82, 165, 255, 350, 455, 575, 695]) {
      ctx.strokeStyle = partyLit ? 'rgba(244, 114, 182, 0.58)' : 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = partyLit ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(bx, 196);
      ctx.quadraticCurveTo(bx + 10, 222, bx, 246);
      ctx.stroke();
      for (let i = 1; i <= 4; i += 1) {
        const by = 196 + i * 10;
        const col = bulbCols[(i + Math.round(bx / 50)) % bulbCols.length];
        if (partyLit) {
          const tw = 0.72 + 0.28 * Math.sin(this.animTime * 4.5 + bx + i);
          const gl = ctx.createRadialGradient(bx + 4, by, 1, bx + 4, by, 11 * tw);
          gl.addColorStop(0, col);
          gl.addColorStop(1, 'rgba(244, 114, 182, 0)');
          ctx.fillStyle = gl;
          ctx.beginPath();
          ctx.arc(bx + 4, by, 11 * tw, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = partyLit ? '#fffbeb' : col;
        ctx.beginPath();
        ctx.arc(bx + 4, by, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawMiniMap(ctx, state) {
    const mw = 178;
    const mh = 102;
    const mx = this.viewWidth - mw - 10;
    const my = 10;
    const spanW = WORLD_MAX_X - WORLD_MIN_X;
    const spanH = WORLD_HEIGHT - WORLD_MIN_Y;
    const pxMap = (wx) => mx + ((wx - WORLD_MIN_X) / spanW) * mw;
    const pyMap = (wy) => my + ((wy - WORLD_MIN_Y) / spanH) * mh;

    ctx.save();
    drawRoundedRect(ctx, mx - 4, my - 4, mw + 8, mh + 22, 8);
    ctx.fillStyle = 'rgba(18, 31, 48, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(232, 224, 210, 0.16)';
    ctx.fillRect(mx, my, mw, pyMap(WATERFRONT_Y) - my);
    ctx.fillStyle = '#256c94';
    ctx.fillRect(mx, pyMap(WATERFRONT_Y), mw, my + mh - pyMap(WATERFRONT_Y));

    for (const line of TRANSIT_LINES) {
      ctx.strokeStyle = line.mode === 'tram' ? 'rgba(250, 204, 21, 0.72)' : 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = line.mode === 'tram' ? 1.3 : 1;
      ctx.beginPath();
      line.waypoints.forEach((wp, idx) => {
        if (idx === 0) ctx.moveTo(pxMap(wp.x), pyMap(wp.y));
        else ctx.lineTo(pxMap(wp.x), pyMap(wp.y));
      });
      if (line.loopType === 'cycle') ctx.closePath();
      ctx.stroke();
    }

    for (const venue of VENUES) {
      const visited = state.visitedVenues.includes(venue.id);
      ctx.fillStyle = visited ? '#34d399' : '#fbbf24';
      ctx.fillRect(pxMap(venue.x), pyMap(venue.y), 2.8, 2.8);
    }

    for (const spot of CITY_DISTRICT_SPOTS) {
      ctx.fillStyle = spot.kind === 'landmark' ? '#38bdf8' : '#f59e0b';
      ctx.fillRect(pxMap(spot.worldX), pyMap(spot.worldY), 3, 3);
    }

    for (const st of ALL_METRO_STATIONS) {
      if (!Number.isFinite(st.doorX)) continue;
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(pxMap(st.doorX) - 2, pyMap(st.doorY) - 2, 4, 4);
    }

    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(pxMap(FERRY_TERMINAL.doorX) - 2.5, pyMap(FERRY_TERMINAL.doorY) - 2, 5, 4);

    for (const v of state.vehicles) {
      ctx.fillStyle = v.mode === 'tram' ? '#fde047' : '#34d399';
      ctx.beginPath();
      ctx.arc(pxMap(v.x), pyMap(v.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (Array.isArray(state.remotePlayers)) {
      for (const rp of state.remotePlayers) {
        const outfit = getOutfitById(rp.outfitId);
        let rx = rp.x;
        let ry = rp.y;
        if (rp.mode === 'interior' && rp.currentVenueId) {
          const v = findEnterableVenueById(rp.currentVenueId);
          if (v) {
            rx = v.doorX;
            ry = v.doorY;
          }
        } else if (rp.mode === 'metro' && rp.metroStationId) {
          const st = ALL_METRO_STATIONS.find((item) => item.id === rp.metroStationId);
          if (st && Number.isFinite(st.doorX)) {
            rx = st.doorX;
            ry = st.doorY;
          }
        } else if (rp.mode === 'ferry') {
          rx = FERRY_TERMINAL.doorX;
          ry = FERRY_TERMINAL.doorY;
        }
        ctx.fillStyle = outfit.ringColor;
        ctx.beginPath();
        ctx.arc(pxMap(rx), pyMap(ry), 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const myOutfit = getOutfitById(state.player.outfitId);
    ctx.fillStyle = myOutfit.ringColor;
    ctx.beginPath();
    ctx.arc(pxMap(state.player.x), pyMap(state.player.y), 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = '700 8px "Segoe UI", sans-serif';
    ctx.fillText('BELEM', mx + 4, my + mh + 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('CIDADE DE LISBOA', mx + 52, my + mh + 12);
    ctx.fillStyle = '#bae6fd';
    ctx.fillText('ORIENTE', mx + 138, my + mh + 12);
    ctx.restore();
  }

  drawInteractionBanner(ctx, interaction) {
    const bw = Math.min(540, this.viewWidth - 40);
    const bh = 46;
    const bx = (this.viewWidth - bw) / 2;
    const by = this.viewHeight - bh - 12;

    ctx.save();
    drawRoundedRect(ctx, bx, by, bw, bh, 9);
    ctx.fillStyle = 'rgba(18, 34, 56, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f5b841';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(interaction.label, this.viewWidth / 2, by + 19, bw - 24);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 11px "Segoe UI", sans-serif';
    ctx.fillText(interaction.sublabel, this.viewWidth / 2, by + 36, bw - 24);
    ctx.restore();
  }

}

export const overworld2dMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    overworld2dMethods[key] = _Mixin.prototype[key];
  }
}
