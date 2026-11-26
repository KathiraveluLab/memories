import {
  WORLD_MIN_X,
  WORLD_MAX_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  STREETS,
  CROSSWALKS,
  DECORATIVE_STRUCTURES,
  FERRY_TERMINAL,
  SANTA_JUSTA_LIFT,
  OVERWORLD_CITY_GATEWAYS,
  METRO_STATIONS,
  ALL_METRO_STATIONS,
  CITY_DISTRICT_SPOTS,
  LISBOA_CORRIDOR_LANDMARKS,
  TRANSIT_LINES,
  VENUES,
  REST_SPOTS,
  RIVERSIDE_BENCHES,
  CASTANHA_VENDORS,
  FUNICULAR_LINES,
  BAIRRO_ALTO_PARTY_REVELERS,
  isBairroAltoPartyTime,
  getTerrainElevation as getRawTerrainElevation,
  getAllTransitStops,
  getOutfitById,
  getMonthInfo
} from '../../data.js';
import { getDayPhase, computeFunicularCarPose } from '../../engine.js';
import {
  ELEV_3D_SCALE, getTerrainElevation, ALL_STOPS, NEAR_Z, MAX_VIEW_DIST, FOV_DEG, EYE_HEIGHT, STREET_TREES, STREET_LAMPS, clamp, drawRoundedRect, parseHexRgb, shadeColor, getVenueHeight, getVenueWallBaseColor, getVenueTileMode, clipPolyNearZ, clipSegmentNearZ, rayBoxEntryDistance, getBoxViewOrdering, sortOccludersBackToFront, pointInPolygon2D, findNearestStreetName, CALCADA_TEX_SIZE, CALCADA_TEX_MASK, IS_LITTLE_ENDIAN, hash2DInt, buildCalcadaTextureData
} from './constants.js';

class _Mixin {
  drawSkyAndPanorama(ctx, cam, phase, animTime, monthInfo = getMonthInfo()) {
    const w = this.viewWidth;
    const hy = clamp(cam.horizonY, 60, this.viewHeight - 80);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const isHeavyRain = (monthInfo.rainIntensity || 0) >= 0.7;
    const isRainy = (monthInfo.rainIntensity || 0) >= 0.35;
    const isBrightSummer = (monthInfo.sunBrightness || 1) >= 1.15;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, hy + 2);
    if (isEvening) {
      skyGrad.addColorStop(0, isHeavyRain ? '#0b1322' : '#0a1630');
      skyGrad.addColorStop(0.58, isHeavyRain ? '#1b273b' : '#172b54');
      skyGrad.addColorStop(1, isHeavyRain ? '#2c3a4f' : '#2b3f6b');
    } else if (isHeavyRain) {
      skyGrad.addColorStop(0, '#3e4f63');
      skyGrad.addColorStop(0.55, '#64778c');
      skyGrad.addColorStop(1, '#9baab8');
    } else if (isRainy && !isGolden) {
      skyGrad.addColorStop(0, '#3e6b99');
      skyGrad.addColorStop(0.58, '#789bb8');
      skyGrad.addColorStop(1, '#c2d3e0');
    } else if (isGolden) {
      skyGrad.addColorStop(0, isBrightSummer ? '#295796' : '#36588f');
      skyGrad.addColorStop(0.55, isBrightSummer ? '#e08448' : '#c97c5d');
      skyGrad.addColorStop(1, isBrightSummer ? '#fde088' : '#f7cf86');
    } else if (isBrightSummer) {
      // Dazzling dry July / August Lisbon cobalt sky
      skyGrad.addColorStop(0, '#0e58b8');
      skyGrad.addColorStop(0.58, '#3ca3ec');
      skyGrad.addColorStop(1, '#e0f6ff');
    } else if (phase.id === 'morning') {
      skyGrad.addColorStop(0, '#2972b8');
      skyGrad.addColorStop(0.65, '#72b7e8');
      skyGrad.addColorStop(1, '#d7effa');
    } else {
      skyGrad.addColorStop(0, '#1f64ad');
      skyGrad.addColorStop(0.62, '#62addf');
      skyGrad.addColorStop(1, '#cdeaf8');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, hy + 2);

    // Evening stars (hidden under thick Atlantic rain clouds)
    if (isEvening && !isHeavyRain) {
      ctx.fillStyle = 'rgba(255, 251, 235, 0.72)';
      for (let i = 0; i < 28; i += 1) {
        const starAngle = (i * 0.71) % (Math.PI * 2);
        const rel = Math.atan2(Math.sin(starAngle - cam.yaw), Math.cos(starAngle - cam.yaw));
        if (Math.abs(rel) > 1.0) continue;
        const sx = w * 0.5 + rel * this.focal;
        const sy = 18 + ((i * 53) % Math.max(40, Math.floor(hy - 42)));
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // Sun or Moon positioned authentically on the sky dome (dimmed in heavy November rain, blazing bright in July/August)
    if (!isHeavyRain) {
      const celestialYaw = isEvening ? -1.1 : isGolden ? 2.65 : 0.75;
      const relSun = Math.atan2(Math.sin(celestialYaw - cam.yaw), Math.cos(celestialYaw - cam.yaw));
      if (Math.abs(relSun) < 0.95) {
        const sunX = w * 0.5 + relSun * this.focal;
        const sunY = isGolden ? hy - 48 : isEvening ? 64 : isBrightSummer ? 58 : 74;
        const sunRadius = isBrightSummer && !isEvening ? 88 : 54;
        const glow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, sunRadius);
        if (isEvening) {
          glow.addColorStop(0, 'rgba(241, 245, 249, 0.95)');
          glow.addColorStop(0.4, 'rgba(226, 232, 240, 0.25)');
          glow.addColorStop(1, 'rgba(226, 232, 240, 0)');
        } else if (isBrightSummer) {
          glow.addColorStop(0, 'rgba(255, 254, 232, 0.99)');
          glow.addColorStop(0.32, 'rgba(254, 240, 138, 0.58)');
          glow.addColorStop(0.68, 'rgba(253, 224, 71, 0.18)');
          glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
        } else {
          glow.addColorStop(0, isGolden ? 'rgba(255, 237, 160, 0.95)' : 'rgba(255, 250, 220, 0.92)');
          glow.addColorStop(0.42, isGolden ? 'rgba(251, 146, 60, 0.35)' : 'rgba(254, 240, 138, 0.28)');
          glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
        }
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Seasonal Atlantic cloud deck (sparse wisps in July/Aug, dense dark grey storm clouds in Nov/Dec)
    const cloudCount = Math.max(2, Math.round(3 + (monthInfo.cloudiness || 0.25) * 11));
    if (!isEvening || isRainy) {
      ctx.fillStyle = isHeavyRain
        ? isEvening
          ? 'rgba(30, 41, 59, 0.72)'
          : 'rgba(92, 108, 126, 0.68)'
        : isRainy
          ? isEvening
            ? 'rgba(42, 56, 78, 0.55)'
            : 'rgba(182, 198, 214, 0.62)'
          : isGolden
            ? 'rgba(255, 232, 198, 0.48)'
            : isBrightSummer
              ? 'rgba(255, 255, 255, 0.34)'
              : 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < cloudCount; i += 1) {
        const cloudYaw = (((i * (Math.PI * 2)) / cloudCount) + animTime * (isRainy ? 0.018 : 0.008)) % (Math.PI * 2);
        const rel = Math.atan2(Math.sin(cloudYaw - cam.yaw), Math.cos(cloudYaw - cam.yaw));
        if (Math.abs(rel) > 1.08) continue;
        const cx = w * 0.5 + rel * this.focal;
        const cy = (isHeavyRain ? 30 : 44) + (i % 3) * (isHeavyRain ? 26 : 28);
        const rx = isHeavyRain ? 96 : isRainy ? 72 : 56;
        const ry = isHeavyRain ? 24 : isRainy ? 17 : 13;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + rx * 0.45, cy - ry * 0.35, rx * 0.62, ry * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Distant Lisbon 360-degree Horizon Hills + Ponte 25 de Abril & Cristo Rei (South) + Castelo de Sao Jorge (North-East)
    // 1) Continuous distant Tagus Estuary water band up to the horizon when looking South so bridge towers rise from water, never beige ground
    const horizonWaterGrad = ctx.createLinearGradient(0, hy - 6, 0, hy + 18);
    horizonWaterGrad.addColorStop(0, isEvening ? '#0c233d' : isGolden ? '#1f5378' : '#165a8a');
    horizonWaterGrad.addColorStop(1, isEvening ? '#102944' : isGolden ? '#28648c' : '#1d6692');
    ctx.fillStyle = horizonWaterGrad;
    ctx.fillRect(0, hy - 2, w, 20);

    // 2) Rolling 7-Hills Lisboa & Almada South-Bank Escarpment Silhouette
    ctx.fillStyle = isEvening ? '#182847' : isGolden ? '#7d5964' : '#6989a6';
    ctx.beginPath();
    ctx.moveTo(0, hy + 2);
    for (let sx = 0; sx <= w; sx += 16) {
      const rayAngle = cam.yaw + Math.atan2(sx - w * 0.5, this.focal);
      const isSouth = Math.sin(rayAngle) > 0.2;
      const hillH = isSouth
        ? 16 + Math.sin(rayAngle * 4.5) * 8 + Math.cos(rayAngle * 2.5) * 6
        : 28 + Math.sin(rayAngle * 4.2) * 13 + Math.cos(rayAngle * 8.5) * 6;
      ctx.lineTo(sx, hy - hillH);
    }
    ctx.lineTo(w, hy + 2);
    ctx.closePath();
    ctx.fill();

    // Soft tree-lined ridge & distant terracotta hillside villages along the horizon hills
    ctx.fillStyle = isEvening ? '#122038' : isGolden ? '#634652' : '#53738f';
    ctx.beginPath();
    ctx.moveTo(0, hy + 2);
    for (let sx = 0; sx <= w; sx += 20) {
      const rayAngle = cam.yaw + Math.atan2(sx - w * 0.5, this.focal);
      const lowH = 9 + Math.sin(rayAngle * 6.5 + 0.8) * 5 + Math.cos(rayAngle * 3.5) * 3;
      ctx.lineTo(sx, hy - lowH);
    }
    ctx.lineTo(w, hy + 2);
    ctx.closePath();
    ctx.fill();

    // Distant Lisbon hillside neighborhood terracotta rooftops & pastel Pombaline blocks along northern/eastern/western horizon
    for (let sx = -16; sx <= w + 16; sx += 22) {
      const rayAngle = cam.yaw + Math.atan2(sx - w * 0.5, this.focal);
      if (Math.sin(rayAngle) > 0.18) continue; // Keep south horizon open for the Tagus estuary
      const seed = Math.abs(Math.round(rayAngle * 18));
      const bh = 7 + (seed % 7);
      const bw = 16 + (seed % 6);
      const walls = ['#efe6d5', '#f3d8c4', '#e5eef5', '#ebd5da', '#f2e2ba'];
      ctx.fillStyle = isEvening ? '#27364f' : walls[seed % walls.length];
      ctx.fillRect(sx, hy - bh, bw, bh + 1);
      ctx.fillStyle = isEvening ? '#5c2822' : '#b84b32';
      ctx.fillRect(sx - 1, hy - bh - 2.5, bw + 2, 2.8);
    }

    // 3) Factual Tagus Bridge Panorama:
    //    - Western & Central Lisboa (Belem, Cais do Sodre, Chiado, Alfama): Red suspension Ponte 25 de Abril (1966) + Almada + Cristo Rei
    //    - Eastern Lisboa (Parque das Nacoes / Oriente / Moscavide): White 12.3 km cable-stayed Ponte Vasco da Gama (1998) across Mar da Palha!
    const isEasternLisboa = cam.camX >= 2550;
    const bridgeYaw = Math.PI * 0.62;
    const relBridge = Math.atan2(Math.sin(bridgeYaw - cam.yaw), Math.cos(bridgeYaw - cam.yaw));
    if (!isEasternLisboa && Math.abs(relBridge) < 0.96) {
      const bx = w * 0.5 + relBridge * this.focal;
      const bridgeCol = isEvening ? '#991b1b' : isGolden ? '#dc2626' : '#c81e32';
      const bridgeDark = isEvening ? '#5c1010' : '#881320';
      const bridgeHighlight = isEvening ? '#f87171' : '#ef4444';
      const t1 = bx - 88;
      const t2 = bx + 80;
      const leftAnchor = bx - 205;
      const rightAnchor = bx + 195;
      const deckY = hy - 22;
      const trussBottomY = hy - 16;
      const towerTopY = hy - 88;
      const waterBaseY = hy + 3;

      ctx.save();

      // Accurate Almada / Cacilhas South-Bank Escarpment Skyline (layered ochre limestone cliffs, green Mediterranean crest, Almada Velha hilltop town, Boca do Vento elevator & Cais do Ginjal)
      // 1) High western Cristo Rei plateau & steep Almada cliff ridge extending east toward Cacilhas
      ctx.fillStyle = isEvening ? '#1c2b40' : isGolden ? '#5b4b44' : '#4a6b54';
      ctx.beginPath();
      ctx.moveTo(bx + 12, hy + 1);
      ctx.lineTo(bx + 54, hy - 22);
      ctx.quadraticCurveTo(bx + 96, hy - 42, bx + 142, hy - 44); // High Cristo Rei 110m ridge
      ctx.lineTo(bx + 196, hy - 37); // Almada Velha hilltop crest
      ctx.lineTo(bx + 258, hy - 32); // Jardim do Castelo & Boca do Vento cliff rim
      ctx.quadraticCurveTo(bx + 306, hy - 26, bx + 345, hy - 10);
      ctx.lineTo(bx + 390, hy + 1);
      ctx.closePath();
      ctx.fill();

      // 2) Stratified ochre-limestone Almada cliff faces below the green pine ridge
      ctx.fillStyle = isEvening ? '#273549' : isGolden ? '#8c6954' : '#9c866d';
      ctx.beginPath();
      ctx.moveTo(bx + 42, hy + 1);
      ctx.lineTo(bx + 86, hy - 24);
      ctx.lineTo(bx + 150, hy - 26);
      ctx.lineTo(bx + 215, hy - 23);
      ctx.lineTo(bx + 266, hy - 19);
      ctx.lineTo(bx + 305, hy + 1);
      ctx.closePath();
      ctx.fill();
      // Sunlit horizontal ochre sandstone escarpment strata lines along Almada cliffs
      ctx.strokeStyle = isEvening ? 'rgba(148, 163, 184, 0.2)' : isGolden ? 'rgba(253, 224, 171, 0.42)' : 'rgba(229, 212, 184, 0.46)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx + 76, hy - 16);
      ctx.lineTo(bx + 258, hy - 13);
      ctx.moveTo(bx + 94, hy - 21);
      ctx.lineTo(bx + 242, hy - 18);
      ctx.stroke();

      // Shadowed rock crevices & green hillside stone-pine clusters on the escarpment
      ctx.fillStyle = isEvening ? '#152236' : isGolden ? '#4c3e36' : '#3d5c45';
      for (const [cx, cy, rx, ry] of [
        [bx + 92, hy - 22, 16, 6],
        [bx + 136, hy - 34, 18, 5],
        [bx + 168, hy - 26, 20, 7],
        [bx + 228, hy - 22, 18, 6],
        [bx + 278, hy - 15, 16, 5]
      ]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3) Almada Velha hilltop whitewashed & terracotta houses crowning the cliff crest (east of Cristo Rei)
      for (let ax = bx + 168; ax <= bx + 262; ax += 13) {
        const ah = 5 + ((Math.round(ax) * 5) % 5);
        const crestY = hy - 35 + (ax - (bx + 168)) * 0.06;
        ctx.fillStyle = isEvening ? '#94a3b8' : (Math.round(ax) % 2 === 0 ? '#f8f5ef' : '#efe1c6');
        ctx.fillRect(ax, crestY - ah, 10, ah + 1);
        ctx.fillStyle = isEvening ? '#7c2d12' : '#c2410c';
        ctx.fillRect(ax - 1, crestY - ah - 2, 12, 2);
      }

      // 4) Iconic Elevador Panoramico da Boca do Vento (vertical glass-and-steel lift tower + horizontal cliff skybridge!)
      const liftX = bx + 244;
      const liftTopY = hy - 33;
      ctx.fillStyle = isEvening ? '#475569' : '#64748b';
      ctx.fillRect(liftX - 2.2, liftTopY, 4.4, hy - 2 - liftTopY);
      ctx.fillStyle = isEvening ? '#bae6fd' : '#e0f2fe';
      ctx.fillRect(liftX - 1.1, liftTopY + 3, 2.2, hy - 8 - liftTopY);
      // Horizontal panoramic steel bridge connecting tower to Almada Velha cliff rim
      ctx.fillStyle = isEvening ? '#64748b' : '#475569';
      ctx.fillRect(liftX - 14, liftTopY + 1, 16, 2.6);

      // 5) Historic Cais do Ginjal weathered ochre & pastel riverside warehouses along the base of the cliff
      const ginjalWalls = isEvening
        ? ['#475569', '#64748b', '#52525b']
        : ['#e8c589', '#f3ede2', '#d99b72', '#e2dfd5'];
      for (let gx = bx + 148; gx <= bx + 290; gx += 16) {
        const gh = 6 + ((Math.round(gx) * 3) % 4);
        ctx.fillStyle = ginjalWalls[Math.abs(Math.round(gx)) % ginjalWalls.length];
        ctx.fillRect(gx, hy - gh - 1, 14, gh + 1);
        ctx.fillStyle = isEvening ? '#7c2d12' : '#b84a32';
        ctx.fillRect(gx - 0.5, hy - gh - 3, 15, 2.2);
      }
      // Wooden Ponto Final waterfront restaurant jetty jutting out from Cais do Ginjal
      ctx.fillStyle = isEvening ? '#52525b' : '#8b5a34';
      ctx.fillRect(bx + 206, hy - 2, 28, 3);

      // 6) Cacilhas waterfront cottages & historic 3-masted wooden Fragata D. Fernando II e Gloria silhouette
      for (let hx = bx + 42; hx <= bx + 138; hx += 16) {
        const hh = 5 + ((Math.round(hx) * 7) % 5);
        ctx.fillStyle = isEvening ? '#cbd5e1' : '#f8fafc';
        ctx.fillRect(hx, hy - hh - 1, 12, hh);
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(hx - 1, hy - hh - 3, 14, 2.2);
      }
      // Fragata D. Fernando II e Gloria 3-masted silhouette moored at Cacilhas point
      const fragX = bx + 302;
      ctx.fillStyle = isEvening ? '#1e293b' : '#452b1c';
      ctx.fillRect(fragX - 14, hy - 5, 28, 5);
      ctx.strokeStyle = isEvening ? '#64748b' : '#573c28';
      ctx.lineWidth = 1.2;
      for (const mx of [-8, 0, 8]) {
        ctx.beginPath();
        ctx.moveTo(fragX + mx, hy - 5);
        ctx.lineTo(fragX + mx, hy - 21);
        ctx.moveTo(fragX + mx - 4, hy - 14);
        ctx.lineTo(fragX + mx + 4, hy - 14);
        ctx.stroke();
      }

      // Shimmering bridge tower reflections on the Tagus surface below horizon
      ctx.fillStyle = isEvening ? 'rgba(248, 113, 113, 0.22)' : isGolden ? 'rgba(251, 146, 60, 0.28)' : 'rgba(200, 30, 50, 0.2)';
      for (const tx of [t1, t2]) {
        for (let ry = 2; ry < 26; ry += 4) {
          const rw = 8 + ry * 0.35;
          ctx.fillRect(tx - rw * 0.5 + Math.sin(animTime * 3 + ry) * 2, waterBaseY + ry, rw, 2);
        }
      }

      // Concrete Caisson Foundation Piers emerging from the Tagus River
      for (const tx of [t1, t2]) {
        ctx.fillStyle = isEvening ? '#64748b' : '#dfd8cb';
        ctx.fillRect(tx - 11, waterBaseY - 8, 22, 10);
        ctx.fillStyle = isEvening ? '#475569' : '#9c9488';
        ctx.fillRect(tx - 11, waterBaseY - 3, 22, 4);
        // White water foam ring around each pier
        ctx.fillStyle = 'rgba(240, 249, 255, 0.65)';
        ctx.fillRect(tx - 14, waterBaseY + 1, 28, 1.8);
      }

      // Approach Viaduct Piers on North & South banks
      ctx.fillStyle = isEvening ? '#475569' : '#94a3b8';
      for (const vx of [bx - 172, bx - 142, bx + 132, bx + 164]) {
        ctx.fillRect(vx - 2.5, trussBottomY, 5, waterBaseY - trussBottomY);
      }

      // Main Parabolic Catenary Suspension Cables & Vertical Suspender Cables
      const sampleCableY = (x) => {
        if (x <= t1) {
          const u = clamp((x - leftAnchor) / Math.max(1, t1 - leftAnchor), 0, 1);
          return deckY - Math.pow(u, 1.85) * (deckY - towerTopY);
        }
        if (x >= t2) {
          const u = clamp((rightAnchor - x) / Math.max(1, rightAnchor - t2), 0, 1);
          return deckY - Math.pow(u, 1.85) * (deckY - towerTopY);
        }
        const u = ((x - t1) / Math.max(1, t2 - t1)) * 2 - 1; // -1..1 across main span
        const sagY = deckY - 6;
        return sagY - u * u * (sagY - towerTopY);
      };

      // 28 Vertical Steel Suspender Dropper Cables
      ctx.strokeStyle = isEvening ? 'rgba(220, 38, 38, 0.68)' : 'rgba(185, 28, 28, 0.75)';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      for (let sx = leftAnchor + 10; sx <= rightAnchor - 10; sx += 10) {
        if (Math.abs(sx - t1) < 6 || Math.abs(sx - t2) < 6) continue;
        const cy = sampleCableY(sx);
        if (cy < deckY - 1.5) {
          ctx.moveTo(sx, cy);
          ctx.lineTo(sx, deckY);
        }
      }
      ctx.stroke();

      // Secondary back-span catenary cable (slightly offset for 3D stereo depth)
      ctx.strokeStyle = bridgeDark;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let sx = leftAnchor; sx <= rightAnchor; sx += 6) {
        const cy = sampleCableY(sx) - 1.5;
        if (sx === leftAnchor) ctx.moveTo(sx + 3, cy);
        else ctx.lineTo(sx + 3, cy);
      }
      ctx.stroke();

      // Primary foreground catenary suspension cable
      ctx.strokeStyle = bridgeCol;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let sx = leftAnchor; sx <= rightAnchor; sx += 5) {
        const cy = sampleCableY(sx);
        if (sx === leftAnchor) ctx.moveTo(sx, cy);
        else ctx.lineTo(sx, cy);
      }
      ctx.stroke();

      // Double-Deck Continuous Warren Truss Span (Upper Highway Deck + Lower Rail Deck + Diagonal Lattice)
      ctx.fillStyle = 'rgba(136, 19, 32, 0.35)';
      ctx.fillRect(leftAnchor, deckY, rightAnchor - leftAnchor, trussBottomY - deckY);

      ctx.strokeStyle = bridgeDark;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let sx = leftAnchor; sx < rightAnchor - 8; sx += 8) {
        ctx.moveTo(sx, deckY);
        ctx.lineTo(sx + 4, trussBottomY);
        ctx.lineTo(sx + 8, deckY);
      }
      ctx.stroke();

      ctx.strokeStyle = bridgeCol;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(leftAnchor - 10, deckY);
      ctx.lineTo(rightAnchor + 10, deckY);
      ctx.stroke();

      ctx.strokeStyle = bridgeDark;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(leftAnchor - 6, trussBottomY);
      ctx.lineTo(rightAnchor + 6, trussBottomY);
      ctx.stroke();

      // Twin Portal Steel Towers with Tapered Legs & Signature Diamond X-Bracing
      for (const tx of [t1, t2]) {
        // Left & right tapered A-frame tower legs
        ctx.fillStyle = bridgeDark;
        ctx.fillRect(tx - 6.5, towerTopY, 3.8, waterBaseY - 7 - towerTopY);
        ctx.fillStyle = bridgeCol;
        ctx.fillRect(tx + 2.7, towerTopY, 3.8, waterBaseY - 7 - towerTopY);
        ctx.fillStyle = bridgeHighlight;
        ctx.fillRect(tx - 5.5, towerTopY, 1.4, waterBaseY - 7 - towerTopY);

        // Horizontal portal cross-beams & 3 diamond X-bracing bays
        ctx.strokeStyle = bridgeCol;
        ctx.lineWidth = 1.5;
        for (const [yTop, yBot] of [
          [towerTopY + 3, towerTopY + 23],
          [towerTopY + 25, towerTopY + 46],
          [towerTopY + 48, deckY - 2],
          [trussBottomY + 1, waterBaseY - 8]
        ]) {
          ctx.beginPath();
          ctx.moveTo(tx - 6, yTop);
          ctx.lineTo(tx + 6, yTop);
          ctx.moveTo(tx - 6, yTop);
          ctx.lineTo(tx + 6, yBot);
          ctx.moveTo(tx + 6, yTop);
          ctx.lineTo(tx - 6, yBot);
          ctx.stroke();
        }

        // Tower saddle caps & glowing red aviation warning beacons
        ctx.fillStyle = bridgeHighlight;
        ctx.fillRect(tx - 7.5, towerTopY - 2.5, 15, 3);
        ctx.fillStyle = isEvening || isGolden ? '#fef08a' : '#ff4d4d';
        ctx.beginPath();
        ctx.arc(tx - 4.5, towerTopY - 4, 1.8, 0, Math.PI * 2);
        ctx.arc(tx + 4.5, towerTopY - 4, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Santuario de Cristo Rei on the Almada Cliff Escarpment (4-column tapered pedestal + statue with outstretched arms)
      const crX = bx + 138;
      const cliffTopY = hy - 42;
      const pedTopY = cliffTopY - 36;
      // Warm evening sanctuary floodlight glow around Cristo Rei at dusk/night
      if (isEvening || isGolden) {
        const crGlow = ctx.createRadialGradient(crX, pedTopY - 6, 2, crX, pedTopY - 6, 28);
        crGlow.addColorStop(0, 'rgba(254, 243, 199, 0.55)');
        crGlow.addColorStop(0.55, 'rgba(251, 191, 36, 0.16)');
        crGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = crGlow;
        ctx.beginPath();
        ctx.arc(crX, pedTopY - 6, 28, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tapered 4-pillar limestone monument pedestal
      ctx.fillStyle = isEvening ? '#cbd5e1' : isGolden ? '#f3dec3' : '#e7e0d2';
      ctx.beginPath();
      ctx.moveTo(crX - 8.5, cliffTopY);
      ctx.lineTo(crX - 5.6, pedTopY);
      ctx.lineTo(crX + 5.6, pedTopY);
      ctx.lineTo(crX + 8.5, cliffTopY);
      ctx.closePath();
      ctx.fill();
      // Shadowed central archway cleft inside the Cristo Rei pedestal
      ctx.fillStyle = isEvening ? '#1e293b' : '#78716c';
      ctx.beginPath();
      ctx.moveTo(crX - 2.3, cliffTopY);
      ctx.lineTo(crX - 1.7, pedTopY + 7);
      ctx.arc(crX, pedTopY + 7, 1.7, Math.PI, 0);
      ctx.lineTo(crX + 2.3, cliffTopY);
      ctx.closePath();
      ctx.fill();
      // Observation deck cornice
      ctx.fillStyle = isEvening ? '#f1f5f9' : '#f5f0e6';
      ctx.fillRect(crX - 7.5, pedTopY - 2, 15, 2.5);
      // Christ the Redeemer statue with outstretched arms & head silhouette
      ctx.fillStyle = isEvening ? '#fef9c3' : '#faf7f0';
      ctx.fillRect(crX - 2.1, pedTopY - 13.5, 4.2, 11.5);
      ctx.fillRect(crX - 10.5, pedTopY - 11, 21, 2.4);
      ctx.beginPath();
      ctx.arc(crX, pedTopY - 15.2, 2.3, 0, Math.PI * 2);
      ctx.fill();

      // Farol de Cacilhas red 1886 cast-iron lighthouse at the water's edge east of Cais do Ginjal
      const farolX = bx + 286;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(farolX - 2.6, hy - 16, 5.2, 15);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(farolX - 3.2, hy - 18, 6.4, 2.2);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(farolX, hy - 19.6, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 3A-East) Iconic White 12.3 km Cable-Stayed Ponte Vasco da Gama (1998) across the Eastern Tagus Estuary (Parque das Nacoes / Oriente)
    if (isEasternLisboa) {
      const vascoYaw = Math.PI * 0.24;
      const relVasco = Math.atan2(Math.sin(vascoYaw - cam.yaw), Math.cos(vascoYaw - cam.yaw));
      if (Math.abs(relVasco) < 1.05) {
        const vx = w * 0.5 + relVasco * this.focal;
        const deckY = hy - 14;
        const p1 = vx - 64;
        const p2 = vx + 64;
        const pylonTopY = hy - 94;
        const leftEnd = vx - 250;
        const rightEnd = vx + 290;
        const whiteMain = isEvening ? '#cbd5e1' : isGolden ? '#fff7ed' : '#f8fafc';
        const whiteShade = isEvening ? '#64748b' : '#cbd5e1';
        const cableCol = isEvening ? 'rgba(226, 232, 240, 0.72)' : 'rgba(248, 250, 252, 0.88)';

        ctx.save();
        // Low distant Montijo / Alcochete south-bank salt-flat horizon across wide Mar da Palha estuary
        ctx.fillStyle = isEvening ? '#1e293b' : isGolden ? '#7c6a5c' : '#6c8577';
        ctx.beginPath();
        ctx.moveTo(vx + 70, hy + 1);
        ctx.quadraticCurveTo(vx + 185, hy - 12, vx + 310, hy - 6);
        ctx.lineTo(vx + 350, hy + 1);
        ctx.closePath();
        ctx.fill();

        // Shimmering white pylon reflections on the eastern Tagus Estuary
        ctx.fillStyle = isEvening ? 'rgba(226, 232, 240, 0.22)' : 'rgba(255, 255, 255, 0.32)';
        for (const px of [p1, p2]) {
          for (let ry = 2; ry < 28; ry += 4) {
            const rw = 7 + ry * 0.3;
            ctx.fillRect(px - rw * 0.5 + Math.sin(animTime * 2.6 + ry) * 2, hy + ry, rw, 2);
          }
        }

        // Long sweeping 12.3 km white prestressed concrete viaduct piers stretching across the estuary
        ctx.fillStyle = whiteShade;
        for (let pierX = leftEnd + 16; pierX <= rightEnd - 12; pierX += 22) {
          if (Math.abs(pierX - p1) < 12 || Math.abs(pierX - p2) < 12) continue;
          ctx.fillRect(pierX - 1.5, deckY + 2, 3, hy + 2 - (deckY + 2));
        }

        // Fan-shaped white harp stay cables radiating from both 150m H-shaped concrete pylons
        ctx.strokeStyle = cableCol;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        for (const px of [p1, p2]) {
          for (let k = 1; k <= 8; k += 1) {
            const anchorY = pylonTopY + 8 + k * 4.4;
            const spread = k * 10.5;
            ctx.moveTo(px - 2.5, anchorY);
            ctx.lineTo(px - spread, deckY);
            ctx.moveTo(px + 2.5, anchorY);
            ctx.lineTo(px + spread, deckY);
          }
        }
        ctx.stroke();

        // Sleek white curved highway deck spanning the entire eastern Tagus horizon
        ctx.strokeStyle = whiteMain;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(leftEnd, deckY + 4);
        ctx.quadraticCurveTo(vx, deckY - 4, rightEnd, deckY + 5);
        ctx.stroke();
        ctx.strokeStyle = whiteShade;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(leftEnd, deckY + 6.5);
        ctx.quadraticCurveTo(vx, deckY - 1.5, rightEnd, deckY + 7.5);
        ctx.stroke();

        // Twin 150-meter white concrete H-pylons (signature Ponte Vasco da Gama twin legs + upper portal crossbars)
        for (const px of [p1, p2]) {
          ctx.fillStyle = whiteMain;
          ctx.fillRect(px - 5.2, pylonTopY, 3.0, hy + 2 - pylonTopY);
          ctx.fillRect(px + 2.2, pylonTopY, 3.0, hy + 2 - pylonTopY);
          ctx.fillStyle = whiteShade;
          ctx.fillRect(px - 5.2, pylonTopY + 12, 10.4, 2.8);
          ctx.fillRect(px - 5.2, deckY + 2, 10.4, 3.2);
          // Red aviation beacons atop the 150m pylons
          ctx.fillStyle = isEvening || isGolden ? '#fef08a' : '#ef4444';
          ctx.beginPath();
          ctx.arc(px - 3.7, pylonTopY - 2.2, 1.8, 0, Math.PI * 2);
          ctx.arc(px + 3.7, pylonTopY - 2.2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Distinctive 145m Torre Vasco da Gama curved steel sail silhouette on the northern Parque das Nacoes shoreline
        const sailX = vx - 178;
        ctx.strokeStyle = isEvening ? '#94a3b8' : '#e2e8f0';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sailX, hy);
        ctx.lineTo(sailX, hy - 86);
        ctx.stroke();
        ctx.fillStyle = isEvening ? 'rgba(56, 189, 248, 0.35)' : 'rgba(224, 242, 254, 0.72)';
        ctx.beginPath();
        ctx.moveTo(sailX, hy - 82);
        ctx.quadraticCurveTo(sailX + 26, hy - 48, sailX, hy - 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = whiteMain;
        ctx.fillRect(sailX - 10, hy - 74, 22, 5);
        ctx.restore();
      }
    }

    // 3A-Air) Live Commercial Flights taking off & landing over Aeroporto Humberto Delgado (LIS Runway 03/21)!
    if (cam.camX >= 2300 && cam.camY <= -950) {
      const flights = [
        { baseYaw: -Math.PI * 0.42, speed: 0.055, altBase: 74, climb: 38, dir: 1, tailCol: '#dc2626', accentCol: '#16a34a', phase: 0.0 },
        { baseYaw: -Math.PI * 0.22, speed: 0.042, altBase: 118, climb: -32, dir: -1, tailCol: '#1d4ed8', accentCol: '#facc15', phase: 0.42 },
        { baseYaw: -Math.PI * 0.62, speed: 0.048, altBase: 92, climb: 26, dir: 1, tailCol: '#dc2626', accentCol: '#15803d', phase: 0.75 }
      ];
      ctx.save();
      for (let fi = 0; fi < flights.length; fi += 1) {
        const fl = flights[fi];
        const cycle = (animTime * fl.speed + fl.phase) % 1;
        const fYaw = fl.baseYaw + (cycle - 0.5) * 0.85 * fl.dir;
        const relF = Math.atan2(Math.sin(fYaw - cam.yaw), Math.cos(fYaw - cam.yaw));
        if (Math.abs(relF) > 0.98) continue;
        const fx = w * 0.5 + relF * this.focal;
        const fy = hy - (fl.altBase + cycle * fl.climb);
        const sc = 0.85 + (1 - Math.abs(cycle - 0.5) * 1.1) * 0.55;
        const pitchRad = (fl.climb > 0 ? -0.14 : 0.1) * fl.dir;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(pitchRad);
        // Subtle twin jet contrail fading behind aircraft
        const trailGrad = ctx.createLinearGradient(-72 * fl.dir * sc, 0, 0, 0);
        trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        trailGrad.addColorStop(1, isEvening ? 'rgba(226, 232, 240, 0.35)' : 'rgba(255, 255, 255, 0.55)');
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 2.2 * sc;
        ctx.beginPath();
        ctx.moveTo(-72 * fl.dir * sc, 1.5 * sc);
        ctx.lineTo(-10 * fl.dir * sc, 1.5 * sc);
        ctx.stroke();
        // Swept main wings
        ctx.fillStyle = isEvening ? '#94a3b8' : '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(4 * fl.dir * sc, 0);
        ctx.lineTo(-10 * fl.dir * sc, -13 * sc);
        ctx.lineTo(-15 * fl.dir * sc, -13 * sc);
        ctx.lineTo(-5 * fl.dir * sc, 0);
        ctx.lineTo(-15 * fl.dir * sc, 11 * sc);
        ctx.lineTo(-10 * fl.dir * sc, 11 * sc);
        ctx.closePath();
        ctx.fill();
        // Sleek white airliner fuselage
        ctx.fillStyle = isEvening ? '#e2e8f0' : '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 19 * sc, 3.6 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cockpit windscreen
        ctx.fillStyle = '#0f172a';
        ctx.fillRect((fl.dir > 0 ? 11 : -15) * sc, -2 * sc, 4 * sc, 2 * sc);
        // Portuguese crimson & emerald tail fin
        ctx.fillStyle = fl.tailCol;
        ctx.beginPath();
        ctx.moveTo(-12 * fl.dir * sc, -1 * sc);
        ctx.lineTo(-19 * fl.dir * sc, -10.5 * sc);
        ctx.lineTo(-13 * fl.dir * sc, -10.5 * sc);
        ctx.lineTo(-7 * fl.dir * sc, -1 * sc);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = fl.accentCol;
        ctx.fillRect(-17 * fl.dir * sc, -6.5 * sc, 4.5 * sc, 2.2 * sc);
        // Blinking navigation strobe & bright nose landing light
        const strobeOn = Math.floor(animTime * 4 + fi) % 2 === 0;
        if (strobeOn) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(-12 * fl.dir * sc, -12.5 * sc, 2.1 * sc, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(-12 * fl.dir * sc, 10.5 * sc, 2.1 * sc, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(17 * fl.dir * sc, 0.5 * sc, 2.4 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // 3b) Animated Gliding Tagus Seagulls (Gaivotas do Tejo) soaring over the river estuary!
    if (!isEvening) {
      ctx.save();
      for (let g = 0; g < 8; g += 1) {
        const gullYaw = ((Math.PI * 0.16 + g * 0.24 + animTime * (0.016 + (g % 3) * 0.005)) % (Math.PI * 0.85)) + Math.PI * 0.08;
        const relG = Math.atan2(Math.sin(gullYaw - cam.yaw), Math.cos(gullYaw - cam.yaw));
        if (Math.abs(relG) > 0.96) continue;
        const gx = w * 0.5 + relG * this.focal;
        const gy = hy - 22 - (g % 4) * 26 + Math.sin(animTime * 2.4 + g * 1.3) * 7;
        const wing = Math.sin(animTime * 5.8 + g * 2.1) * 4.5;
        const span = 8 + (g % 3) * 2.5;
        ctx.strokeStyle = isGolden ? '#fff7ed' : '#f8fafc';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(gx - span, gy + wing);
        ctx.quadraticCurveTo(gx - span * 0.45, gy - 4, gx, gy);
        ctx.quadraticCurveTo(gx + span * 0.45, gy - 4, gx + span, gy + wing);
        ctx.stroke();
        // Slate wingtips characteristic of Atlantic yellow-legged Tagus gulls
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(gx - span, gy + wing);
        ctx.lineTo(gx - span * 0.72, gy + wing * 0.65);
        ctx.moveTo(gx + span, gy + wing);
        ctx.lineTo(gx + span * 0.72, gy + wing * 0.65);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4) Detailed Castelo de Sao Jorge & Stone Pine Hilltop + Panteao Nacional Dome when looking North-East
    const castleYaw = -0.78;
    const relCastle = Math.atan2(Math.sin(castleYaw - cam.yaw), Math.cos(castleYaw - cam.yaw));
    if (Math.abs(relCastle) < 0.92) {
      const cx = w * 0.5 + relCastle * this.focal;
      // Green stone-pine crown of Sao Jorge hill
      ctx.fillStyle = isEvening ? '#172e2a' : isGolden ? '#4a5d43' : '#3d6b4c';
      ctx.beginPath();
      ctx.moveTo(cx - 88, hy - 18);
      ctx.quadraticCurveTo(cx, hy - 44, cx + 88, hy - 18);
      ctx.closePath();
      ctx.fill();

      // Moorish limestone curtain walls & 3 crenellated keep towers
      const wallCol = isEvening ? '#334155' : isGolden ? '#bfa084' : '#c8bfb0';
      const towerCol = isEvening ? '#475569' : isGolden ? '#d4b494' : '#d8d0c2';
      ctx.fillStyle = wallCol;
      ctx.fillRect(cx - 56, hy - 46, 112, 22);
      for (const [tx, tw, th] of [[-58, 22, 34], [-12, 26, 38], [38, 22, 32]]) {
        ctx.fillStyle = towerCol;
        ctx.fillRect(cx + tx, hy - 24 - th, tw, th);
        // Crenellated merlons along each tower top
        for (let m = 0; m < tw - 3; m += 6) {
          ctx.fillRect(cx + tx + m, hy - 28 - th, 3.8, 4);
        }
      }
      for (let m = -52; m <= 50; m += 9) {
        ctx.fillStyle = wallCol;
        ctx.fillRect(cx + m, hy - 50, 5, 4);
      }
    }
  }

  drawGroundAndStreets(ctx, cam, state, isEvening, animTime, monthInfo = getMonthInfo()) {
    const w = this.viewWidth;
    const h = this.viewHeight;
    const hy = clamp(cam.horizonY, 60, h - 80);
    const wet = monthInfo.wetGround || 0;
    const brightSummer = (monthInfo.sunBrightness || 1) >= 1.15;

    // Base warm Lisbon calcada ground plane (shifts to glossy wet slate in rainy months, bright sun-bleached cream in July/August)
    const groundGrad = ctx.createLinearGradient(0, hy, 0, h);
    if (isEvening) {
      groundGrad.addColorStop(0, wet >= 0.4 ? '#2b3446' : '#3a4254');
      groundGrad.addColorStop(0.35, wet >= 0.4 ? '#384254' : '#4c5261');
      groundGrad.addColorStop(1, wet >= 0.4 ? '#454e60' : '#5d606c');
    } else if (wet >= 0.5) {
      groundGrad.addColorStop(0, '#969da6');
      groundGrad.addColorStop(0.28, '#abb1b8');
      groundGrad.addColorStop(1, '#bcc2c7');
    } else if (brightSummer) {
      groundGrad.addColorStop(0, '#dad2c2');
      groundGrad.addColorStop(0.28, '#eee6d6');
      groundGrad.addColorStop(1, '#f8f2e4');
    } else {
      groundGrad.addColorStop(0, '#c7c1b6');
      groundGrad.addColorStop(0.28, '#ddd6c8');
      groundGrad.addColorStop(1, '#eae3d6');
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, hy, w, h - hy);

    // Tagus River Estuary water plane south of WATERFRONT_Y AND along the Eastern Parque das Nacoes riverfront (Mar da Palha)!
    const isGolden = getDayPhase(state.minutesOfDay).id === 'golden';
    const waterDeep = isEvening ? '#0d233a' : isGolden ? '#1b4f72' : '#14527b';
    const waterMid = isEvening ? '#102b47' : isGolden ? '#226188' : '#1a6494';
    const waterNear = isEvening ? '#133354' : isGolden ? '#29729c' : '#1f73a6';
    this.drawPoly3D(
      ctx,
      cam,
      [
        [WORLD_MIN_X - 3500, WATERFRONT_Y, 0],
        [WORLD_MAX_X + 6000, WATERFRONT_Y, 0],
        [WORLD_MAX_X + 6000, WATERFRONT_Y + 18000, 0],
        [WORLD_MIN_X - 3500, WATERFRONT_Y + 18000, 0]
      ],
      waterDeep
    );
    this.drawPoly3D(
      ctx,
      cam,
      [
        [WORLD_MIN_X - 2500, WATERFRONT_Y, 0.02],
        [WORLD_MAX_X + 4500, WATERFRONT_Y, 0.02],
        [WORLD_MAX_X + 4500, WATERFRONT_Y + 1800, 0.02],
        [WORLD_MIN_X - 2500, WATERFRONT_Y + 1800, 0.02]
      ],
      waterMid
    );
    this.drawPoly3D(
      ctx,
      cam,
      [
        [WORLD_MIN_X - 1200, WATERFRONT_Y, 0.04],
        [WORLD_MAX_X + 2500, WATERFRONT_Y, 0.04],
        [WORLD_MAX_X + 2500, WATERFRONT_Y + 420, 0.04],
        [WORLD_MIN_X - 1200, WATERFRONT_Y + 420, 0.04]
      ],
      waterNear
    );
    // Eastern Parque das Nacoes Tagus Estuary shoreline (east of x = 4220) so Oriente looks directly out over the Tagus River!
    if (cam.camX >= 2500) {
      this.drawPoly3D(
        ctx,
        cam,
        [
          [4220, -1800, 0.02],
          [WORLD_MAX_X + 14000, -1800, 0.02],
          [WORLD_MAX_X + 14000, WATERFRONT_Y + 600, 0.02],
          [4220, WATERFRONT_Y + 600, 0.02]
        ],
        waterMid
      );
    }

    // Animated Tagus River wave crests, foam glints & golden sunlight reflection path
    const waveShift = (animTime * 24) % 110;
    const waveCol = isEvening
      ? 'rgba(186, 230, 253, 0.24)'
      : isGolden
        ? 'rgba(254, 215, 170, 0.48)'
        : 'rgba(224, 242, 254, 0.42)';
    const foamCol = isEvening ? 'rgba(224, 242, 254, 0.35)' : 'rgba(255, 255, 255, 0.62)';
    for (let ry = WATERFRONT_Y + 26; ry < WATERFRONT_Y + 1450; ry += Math.max(38, Math.round((ry - WATERFRONT_Y) * 0.22))) {
      const rowOffset = ((ry * 37) % 130) + waveShift * (ry < WATERFRONT_Y + 300 ? 1 : 0.45);
      for (let rx = -300 + rowOffset; rx < WORLD_WIDTH + 300; rx += 135) {
        if (Math.hypot(rx - cam.camX, ry - cam.camY) > 1750) continue;
        const wLen = 36 + ((ry - WATERFRONT_Y) * 0.05);
        this.drawLine3D(ctx, cam, [rx, ry, 0.08], [rx + wLen, ry + 3, 0.08], waveCol, 1.8);
        this.drawLine3D(ctx, cam, [rx + 10, ry - 2, 0.09], [rx + wLen * 0.55, ry - 1, 0.09], foamCol, 1.1);
      }
    }

    // Traditional Tagus Fragata Sailboats & Transtejo Catamaran gliding across the river in 3D
    const boats = [
      { x: 420 + ((animTime * 16) % 1600), y: WATERFRONT_Y + 185, sailCol: '#c2410c', hullCol: '#451a03', dir: 1 },
      { x: 1880 - ((animTime * 13) % 1600), y: WATERFRONT_Y + 380, sailCol: '#f59e0b', hullCol: '#1e3a5f', dir: -1 },
      { x: 1120 + Math.sin(animTime * 0.25) * 380, y: WATERFRONT_Y + 680, sailCol: '#f8fafc', hullCol: '#ea580c', dir: 1 }
    ];
    for (const b of boats) {
      if (Math.hypot(b.x - cam.camX, b.y - cam.camY) > 1650) continue;
      // White bow & stern wake on water
      this.drawLine3D(ctx, cam, [b.x - b.dir * 38, b.y, 0.2], [b.x + b.dir * 20, b.y, 0.2], 'rgba(240, 249, 255, 0.7)', 2.2);
      // Wooden hull
      this.drawPoly3D(
        ctx,
        cam,
        [
          [b.x - 24, b.y, 0.3],
          [b.x + 24, b.y, 0.3],
          [b.x + 30, b.y, 8.5],
          [b.x - 28, b.y, 8.5]
        ],
        shadeColor(b.hullCol, 1, isEvening),
        '#f8fafc',
        1
      );
      // Lateen mainsail & jib sail catching the Tagus breeze
      this.drawPoly3D(
        ctx,
        cam,
        [
          [b.x - 16 * b.dir, b.y, 9.5],
          [b.x + 20 * b.dir, b.y, 9.5],
          [b.x - 2 * b.dir, b.y, 52]
        ],
        shadeColor(b.sailCol, 1, isEvening),
        'rgba(255, 255, 255, 0.65)',
        1
      );
      this.drawPoly3D(
        ctx,
        cam,
        [
          [b.x + 4 * b.dir, b.y, 10],
          [b.x + 26 * b.dir, b.y, 10],
          [b.x + 3 * b.dir, b.y, 42]
        ],
        shadeColor('#fef3c7', 0.96, isEvening)
      );
    }

    // Perspective-Correct Hand-Laid Lisbon Calçada Portuguesa & Curved Leque Cobblestone Floor-Caster!
    // Renders true-scale 5cm limestone/basalt mosaic tesserae across every street, sidewalk, plaza, and Tagus promenade.
    const renderedTexGround = this.renderPerspectiveCalcadaGround(ctx, cam, hy, isEvening, isGolden, wet, brightSummer);

    // Aeroporto Humberto Delgado (LIS) Clear Runway 03/21 Tarmac, Security Perimeter Fence & Parked/Departing Jetliners
    // Drawn cleanly ABOVE the calcada ground layer so the runway markings and perimeter fence are 100% crisp!
    if (cam.camX >= 2300 && cam.camY <= -1100) {
      const rwZ = getTerrainElevation(3550, -2160) + 0.35;
      this.drawPoly3D(
        ctx,
        cam,
        [[2880, -2340, rwZ], [4260, -2340, rwZ], [4260, -2005, rwZ], [2880, -2005, rwZ]],
        isEvening ? '#1e293b' : '#2d3748',
        '#94a3b8',
        1.8
      );
      // Runway 03/21 white dashed centerline & threshold piano-key markings
      for (let rx = 2940; rx <= 4180; rx += 90) {
        this.drawLine3D(ctx, cam, [rx, -2175, rwZ + 0.3], [rx + 52, -2175, rwZ + 0.3], '#f8fafc', 3.2);
      }
      for (const ty of [-2255, -2225, -2195, -2155, -2125, -2095]) {
        this.drawLine3D(ctx, cam, [2910, ty, rwZ + 0.3], [2965, ty, rwZ + 0.3], '#f8fafc', 2.6);
        this.drawLine3D(ctx, cam, [4175, ty, rwZ + 0.3], [4230, ty, rwZ + 0.3], '#f8fafc', 2.6);
      }
      // Illuminated blue taxiway edge lights along the apron
      for (let lx = 2960; lx <= 4160; lx += 150) {
        const lp = this.projectWorldPt(cam, lx, -2020, rwZ + 2);
        if (lp && lp.cz < 1100) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(lp.x, lp.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 3D Airport Security Perimeter Fence along southern runway edge (y = -2002) preventing anyone from entering the runway!
      const fenceY = -2002;
      const fenceH = 28;
      this.drawLine3D(ctx, cam, [2880, fenceY, rwZ + fenceH], [4260, fenceY, rwZ + fenceH], '#cbd5e1', 2.0);
      this.drawLine3D(ctx, cam, [2880, fenceY, rwZ + fenceH * 0.62], [4260, fenceY, rwZ + fenceH * 0.62], '#94a3b8', 1.4);
      this.drawLine3D(ctx, cam, [2880, fenceY, rwZ + fenceH * 0.28], [4260, fenceY, rwZ + fenceH * 0.28], '#94a3b8', 1.4);
      for (let fx = 2880; fx <= 4260; fx += 60) {
        this.drawLine3D(ctx, cam, [fx, fenceY, rwZ], [fx, fenceY, rwZ + fenceH + 4], '#64748b', 2.2);
        if (fx % 300 === 0) {
          this.drawPoly3D(ctx, cam, [[fx - 12, fenceY + 0.5, rwZ + 12], [fx + 12, fenceY + 0.5, rwZ + 12], [fx + 12, fenceY + 0.5, rwZ + 22], [fx - 12, fenceY + 0.5, rwZ + 22]], '#dc2626', '#ffffff', 1.2);
        }
      }
      // 2 Parked Airliners at Terminal 1 gates + 1 Rolling/Climbing Takeoff Flight on Runway 03/21!
      const takeoffProgress = (animTime * 0.14) % 1;
      const rollingX = 2980 + takeoffProgress * 1240;
      const rollingZ = rwZ + 12 + (takeoffProgress > 0.55 ? Math.pow((takeoffProgress - 0.55) / 0.45, 1.8) * 140 : 0);
      const apronJets = [
        { x: 3260, y: -2055, z: rwZ + 12, tailCol: '#dc2626', accentCol: '#16a34a' },
        { x: 3780, y: -2055, z: rwZ + 12, tailCol: '#1d4ed8', accentCol: '#facc15' },
        { x: rollingX, y: -2175, z: rollingZ, tailCol: '#dc2626', accentCol: '#16a34a' }
      ];
      for (const jet of apronJets) {
        this.drawPoly3D(ctx, cam, [[jet.x - 46, jet.y, jet.z], [jet.x + 54, jet.y, jet.z], [jet.x + 48, jet.y, jet.z + 15], [jet.x - 44, jet.y, jet.z + 15]], isEvening ? '#cbd5e1' : '#f8fafc', '#475569', 1.2);
        this.drawPoly3D(ctx, cam, [[jet.x - 6, jet.y - 38, jet.z + 6], [jet.x + 14, jet.y, jet.z + 6], [jet.x - 6, jet.y + 38, jet.z + 6], [jet.x - 18, jet.y, jet.z + 6]], isEvening ? '#94a3b8' : '#e2e8f0', '#475569', 1);
        this.drawPoly3D(ctx, cam, [[jet.x - 44, jet.y, jet.z + 14], [jet.x - 24, jet.y, jet.z + 14], [jet.x - 38, jet.y, jet.z + 36], [jet.x - 48, jet.y, jet.z + 36]], jet.tailCol, jet.accentCol, 1.3);
      }
    }

    // Fallback flat polygons only when running inside headless mock Canvas unit tests without DOM ImageData
    if (!renderedTexGround) {
      for (const st of STREETS) {
        const nearX = clamp(cam.camX, st.x, st.x + st.w);
        const nearY = clamp(cam.camY, st.y, st.y + st.h);
        if (Math.hypot(nearX - cam.camX, nearY - cam.camY) > MAX_VIEW_DIST) continue;
        this.drawPoly3D(
          ctx,
          cam,
          [[st.x, st.y, 0.1], [st.x + st.w, st.y, 0.1], [st.x + st.w, st.y + st.h, 0.1], [st.x, st.y + st.h, 0.1]],
          isEvening ? '#60636e' : '#e6dfd1'
        );
      }
      for (const cw of CROSSWALKS) {
        if (Math.hypot(cw.x + cw.w * 0.5 - cam.camX, cw.y + cw.h * 0.5 - cam.camY) > 760) continue;
        for (let sx = cw.x + 3; sx < cw.x + cw.w - 4; sx += 11) {
          this.drawPoly3D(
            ctx,
            cam,
            [[sx, cw.y + 4, 0.25], [sx + 6, cw.y + 4, 0.25], [sx + 6, cw.y + cw.h - 4, 0.25], [sx, cw.y + cw.h - 4, 0.25]],
            isEvening ? 'rgba(218, 224, 232, 0.58)' : 'rgba(248, 244, 236, 0.85)'
          );
        }
      }
    }

    // Vertical stone seawall face dropping down to Tagus water & cast-iron mooring bollards along WATERFRONT_Y (Belem to Parque das Nacoes)
    this.drawPoly3D(
      ctx,
      cam,
      [
        [WORLD_MIN_X, WATERFRONT_Y, -8],
        [WORLD_MAX_X, WATERFRONT_Y, -8],
        [WORLD_MAX_X, WATERFRONT_Y, 3],
        [WORLD_MIN_X, WATERFRONT_Y, 3]
      ],
      isEvening ? '#475569' : '#b8afa0',
      '#64748b',
      1
    );
    const minBX = Math.max(WORLD_MIN_X + 80, Math.floor((cam.camX - 580) / 90) * 90);
    const maxBX = Math.min(WORLD_MAX_X - 80, Math.ceil((cam.camX + 580) / 90) * 90);
    if (Math.abs(WATERFRONT_Y - cam.camY) < 680) {
      for (let bx = minBX; bx <= maxBX; bx += 90) {
        if (bx >= FERRY_TERMINAL.x - 16 && bx <= FERRY_TERMINAL.x + FERRY_TERMINAL.w + 16) continue;
        this.drawLine3D(ctx, cam, [bx, WATERFRONT_Y - 2, 0], [bx, WATERFRONT_Y - 2, 11], '#1e293b', 3.2);
        this.drawLine3D(ctx, cam, [bx - 3, WATERFRONT_Y - 2, 10], [bx + 3, WATERFRONT_Y - 2, 10], '#94a3b8', 2.2);
      }
    }

    // Perched Atlantic Yellow-Legged Seagulls (Gaivotas) sitting EXACTLY atop the 90px-spaced cast-iron seawall mooring bollards!
    if (!isEvening) {
      for (const gx of [360, 810, 900, 1080, 1260, 1530, 1800, 1980]) {
        if (gx >= FERRY_TERMINAL.x - 16 && gx <= FERRY_TERMINAL.x + FERRY_TERMINAL.w + 16) continue;
        const d = Math.hypot(gx - cam.camX, WATERFRONT_Y - 2 - cam.camY);
        if (d > 560) continue;
        const footPt = this.projectWorldPt(cam, gx, WATERFRONT_Y - 2, 10.6);
        if (!footPt) continue;
        const s = clamp(this.focal / footPt.cz, 0.35, 1.35);
        // Orange-yellow gull legs gripping the bollard cap
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = Math.max(1, 1.1 * s);
        ctx.beginPath();
        ctx.moveTo(footPt.x - 1.1 * s, footPt.y);
        ctx.lineTo(footPt.x - 1.1 * s, footPt.y - 2.6 * s);
        ctx.moveTo(footPt.x + 1.1 * s, footPt.y);
        ctx.lineTo(footPt.x + 1.1 * s, footPt.y - 2.6 * s);
        ctx.stroke();
        // Plump white chest & folded slate-grey Atlantic wing
        const by = footPt.y - 4.5 * s;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(footPt.x, by, 4.4 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(footPt.x - 0.8 * s, by - 0.5 * s, 3.6 * s, 1.4 * s, -0.15, 0, Math.PI * 2);
        ctx.fill();
        // Black wing-tip tail
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(footPt.x - 5.4 * s, by - 0.4 * s, 2.0 * s, 1.1 * s);
        // White head, eye & yellow hooked beak
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(footPt.x + 3.6 * s, by - 2.4 * s, 1.85 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(footPt.x + 4.1 * s, by - 2.6 * s, Math.max(0.7, 0.42 * s), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(footPt.x + 5.1 * s, by - 2.7 * s);
        ctx.lineTo(footPt.x + 7.4 * s, by - 2.1 * s);
        ctx.lineTo(footPt.x + 5.1 * s, by - 1.6 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Glistening steel streetcar rails for Tram 28E, Tram 15E (Belem Waterfront) & Tram 24E (Principe Real / Rato)!
    const drawHorizRails = (xMin, xMax, yCenter) => {
      if (Math.abs(yCenter - cam.camY) > 740) return;
      const rStart = Math.max(xMin, Math.floor((cam.camX - 720) / 36) * 36);
      const rEnd = Math.min(xMax, Math.ceil((cam.camX + 720) / 36) * 36);
      for (let tx = rStart; tx < rEnd; tx += 36) {
        const tx2 = Math.min(rEnd, tx + 36);
        const zA1 = getTerrainElevation(tx, yCenter - 7) + 0.35;
        const zB1 = getTerrainElevation(tx2, yCenter - 7) + 0.35;
        const zA2 = getTerrainElevation(tx, yCenter + 7) + 0.35;
        const zB2 = getTerrainElevation(tx2, yCenter + 7) + 0.35;
        this.drawLine3D(ctx, cam, [tx, yCenter - 7, zA1], [tx2, yCenter - 7, zB1], isEvening ? '#7c8a9e' : '#4a5565', 2.4);
        this.drawLine3D(ctx, cam, [tx, yCenter + 7, zA2], [tx2, yCenter + 7, zB2], isEvening ? '#7c8a9e' : '#4a5565', 2.4);
        this.drawLine3D(ctx, cam, [tx, yCenter - 8, zA1 + 0.1], [tx2, yCenter - 8, zB1 + 0.1], 'rgba(255, 255, 255, 0.35)', 0.9);
      }
    };
    drawHorizRails(195, 2205, 610); // Eletrico 28E
    drawHorizRails(-1240, 1580, 932); // Eletrico 15E (Belem - Cais do Sodre - Praca do Comercio)
    drawHorizRails(-560, 880, 285); // Eletrico 24E lower approach
    drawHorizRails(-740, -380, -384); // Eletrico 24E Rato & Principe Real
    if (Math.abs(-560 - cam.camX) < 740) {
      const yStart = Math.max(-384, Math.floor((cam.camY - 720) / 36) * 36);
      const yEnd = Math.min(285, Math.ceil((cam.camY + 720) / 36) * 36);
      for (let ty = yStart; ty < yEnd; ty += 36) {
        const ty2 = Math.min(yEnd, ty + 36);
        const z1 = getTerrainElevation(-560, ty) + 0.35;
        const z2 = getTerrainElevation(-560, ty2) + 0.35;
        this.drawLine3D(ctx, cam, [-567, ty, z1], [-567, ty2, z2], isEvening ? '#7c8a9e' : '#4a5565', 2.2);
        this.drawLine3D(ctx, cam, [-553, ty, z1], [-553, ty2, z2], isEvening ? '#7c8a9e' : '#4a5565', 2.2);
      }
    }

    // Historic Elevador da Bica & Elevador da Gloria Hillside Funicular Rails, Passing Loop & Central Traction Cable Slot!
    for (const fun of state.funiculars || FUNICULAR_LINES) {
      if (Math.abs(fun.trackX - cam.camX) > 680) continue;
      const stepY = 26;
      for (let fy = fun.topY; fy < fun.bottomY; fy += stepY) {
        const fy2 = Math.min(fun.bottomY, fy + stepY);
        const t1 = (fun.bottomY - fy) / Math.max(1, fun.bottomY - fun.topY);
        const t2 = (fun.bottomY - fy2) / Math.max(1, fun.bottomY - fun.topY);
        const sp1 = Math.exp(-Math.pow((t1 - 0.5) / 0.14, 2)) * (fun.passingHalfOffset || 14);
        const sp2 = Math.exp(-Math.pow((t2 - 0.5) / 0.14, 2)) * (fun.passingHalfOffset || 14);
        const railCol = isEvening ? '#94a3b8' : '#3f4956';
        const slotCol = '#111827';
        for (const side of [-1, 1]) {
          const cx1 = fun.trackX + side * sp1;
          const cx2 = fun.trackX + side * sp2;
          const z1 = getTerrainElevation(cx1, fy) + 0.45;
          const z2 = getTerrainElevation(cx2, fy2) + 0.45;
          this.drawLine3D(ctx, cam, [cx1 - 8, fy, z1], [cx2 - 8, fy2, z2], railCol, 2.2);
          this.drawLine3D(ctx, cam, [cx1 + 8, fy, z1], [cx2 + 8, fy2, z2], railCol, 2.2);
          // Central underground steel traction cable slot characteristic of Lisbon funiculars
          this.drawLine3D(ctx, cam, [cx1, fy, z1 + 0.1], [cx2, fy2, z2 + 0.1], slotCol, 2.0);
        }
      }
    }

    // Wet rain puddles & concentric raindrop ripples across the limestone calcada during rainy months
    if (wet >= 0.38) {
      const puddles = [
        [520, 552], [790, 548], [960, 560], [1160, 550], [1480, 554], [1860, 548],
        [920, 672], [1220, 674], [960, 480], [1040, 986], [1560, 990]
      ];
      for (let i = 0; i < puddles.length; i += 1) {
        const [px, py] = puddles[i];
        if (Math.hypot(px - cam.camX, py - cam.camY) > 620) continue;
        const pgz = getTerrainElevation(px, py);
        const pts = [];
        for (let k = 0; k < 10; k += 1) {
          const a = (k / 10) * Math.PI * 2;
          const vx = px + Math.cos(a) * 18;
          const vy = py + Math.sin(a) * 9;
          pts.push([vx, vy, getTerrainElevation(vx, vy) + 0.38]);
        }
        this.drawPoly3D(
          ctx,
          cam,
          pts,
          isEvening ? 'rgba(96, 132, 178, 0.34)' : 'rgba(130, 166, 198, 0.36)',
          'rgba(224, 242, 254, 0.32)',
          1
        );
        const rp = this.projectWorldPt(cam, px, py, pgz + 0.45);
        if (rp) {
          const rPhase = (animTime * 1.9 + i * 0.43) % 1;
          const rRad = clamp(((3 + rPhase * 12) * this.focal) / rp.cz, 2, 24);
          ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - rPhase) * 0.55})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rRad, rRad * 0.34, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  drawGroundIndicators(ctx, cam, state, animTime) {
    const drawGroundRing = (wx, wy, stroke, fill, radius = 14) => {
      const pts = [];
      const segs = 14;
      for (let i = 0; i < segs; i += 1) {
        const a = (i / segs) * Math.PI * 2;
        const rx = wx + Math.cos(a) * radius;
        const ry = wy + Math.sin(a) * radius;
        pts.push([rx, ry, getTerrainElevation(rx, ry) + 0.6]);
      }
      this.drawPoly3D(ctx, cam, pts, fill, stroke, 2.2);
    };

    if (this.hoverWorld) {
      drawGroundRing(
        this.hoverWorld.x,
        this.hoverWorld.y,
        'rgba(255, 255, 255, 0.88)',
        'rgba(255, 255, 255, 0.24)',
        15
      );
    }

    if (state.player.walkTarget) {
      const pulse = 13 + Math.sin(animTime * 6) * 3;
      drawGroundRing(
        state.player.walkTarget.x,
        state.player.walkTarget.y,
        'rgba(56, 189, 248, 0.95)',
        'rgba(56, 189, 248, 0.22)',
        pulse
      );
    }
  }

  collectOccluders(cam, state, nearbyInteraction, monthInfo = getMonthInfo()) {
    const list = [];
    const inRange = (x0, y0, x1, y1) => {
      const nx = clamp(cam.camX, x0, x1);
      const ny = clamp(cam.camY, y0, y1);
      if (Math.hypot(nx - cam.camX, ny - cam.camY) > MAX_VIEW_DIST) return false;
      // Check if at least one corner is ahead of the camera
      const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      return corners.some(([cx, cy]) => (cx - cam.camX) * cam.fx + (cy - cam.camY) * cam.fy > -20);
    };

    for (const venue of VENUES) {
      if (!inRange(venue.x, venue.y, venue.x + venue.w, venue.y + venue.h)) continue;
      list.push({
        kind: 'venue',
        x0: venue.x,
        y0: venue.y,
        x1: venue.x + venue.w,
        y1: venue.y + venue.h,
        venue,
        visited: state.visitedVenues.includes(venue.id),
        highlighted: nearbyInteraction?.type === 'venue' && nearbyInteraction.id === venue.id
      });
    }

    for (const station of ALL_METRO_STATIONS) {
      if (!Number.isFinite(station.x)) continue;
      if (!inRange(station.x, station.y, station.x + station.w, station.y + station.h)) continue;
      list.push({
        kind: 'metro',
        x0: station.x,
        y0: station.y,
        x1: station.x + station.w,
        y1: station.y + station.h,
        station,
        highlighted:
          (nearbyInteraction?.type === 'metro' && nearbyInteraction.id === station.id) ||
          state.activeMetroStationId === station.id
      });
    }

    if (inRange(FERRY_TERMINAL.x, FERRY_TERMINAL.y, FERRY_TERMINAL.x + FERRY_TERMINAL.w, FERRY_TERMINAL.y + FERRY_TERMINAL.h)) {
      list.push({
        kind: 'ferry',
        x0: FERRY_TERMINAL.x,
        y0: FERRY_TERMINAL.y,
        x1: FERRY_TERMINAL.x + FERRY_TERMINAL.w,
        y1: FERRY_TERMINAL.y + FERRY_TERMINAL.h,
        highlighted: nearbyInteraction?.type === 'ferry'
      });
    }

    if (inRange(SANTA_JUSTA_LIFT.x, SANTA_JUSTA_LIFT.y, SANTA_JUSTA_LIFT.x + SANTA_JUSTA_LIFT.w, SANTA_JUSTA_LIFT.y + SANTA_JUSTA_LIFT.h)) {
      list.push({
        kind: 'santa-justa',
        x0: SANTA_JUSTA_LIFT.x,
        y0: SANTA_JUSTA_LIFT.y,
        x1: SANTA_JUSTA_LIFT.x + SANTA_JUSTA_LIFT.w,
        y1: SANTA_JUSTA_LIFT.y + SANTA_JUSTA_LIFT.h,
        highlighted: nearbyInteraction?.type === 'santa-justa'
      });
    }

    // All Greater Lisboa Open-World Landmarks, Eateries, Cultural Shops & Metro Corridor Iconic Sites!
    for (const spot of [...CITY_DISTRICT_SPOTS, ...LISBOA_CORRIDOR_LANDMARKS]) {
      if (!inRange(spot.worldX, spot.worldY, spot.worldX + spot.w, spot.worldY + spot.h)) continue;
      list.push({
        kind: 'city-district-spot',
        x0: spot.worldX,
        y0: spot.worldY,
        x1: spot.worldX + spot.w,
        y1: spot.worldY + spot.h,
        spot,
        highlighted:
          (nearbyInteraction?.type === 'city-district-spot' && nearbyInteraction.spotId === spot.id) ||
          state.activeCityDistrictSpotId === spot.id
      });
    }

    for (const struct of DECORATIVE_STRUCTURES) {
      if (!inRange(struct.x, struct.y, struct.x + struct.w, struct.y + struct.h)) continue;
      list.push({
        kind: 'monument',
        x0: struct.x,
        y0: struct.y,
        x1: struct.x + struct.w,
        y1: struct.y + struct.h,
        struct,
        highlighted:
          (nearbyInteraction?.type === 'fountain' || nearbyInteraction?.type === 'statue') &&
          nearbyInteraction.id === struct.id
      });
    }

    for (const vehicle of state.vehicles) {
      if (state.ridingVehicleId === vehicle.id) continue;
      const r = 34;
      if (!inRange(vehicle.x - r, vehicle.y - r, vehicle.x + r, vehicle.y + r)) continue;
      list.push({
        kind: 'vehicle',
        x0: vehicle.x - 24,
        y0: vehicle.y - 16,
        x1: vehicle.x + 24,
        y1: vehicle.y + 16,
        vehicle
      });
    }

    // Historic Lisbon Cable Funiculars (Elevador da Bica & Elevador da Gloria: twin counterbalancing yellow cars + lower/upper stations!)
    for (const fun of state.funiculars || []) {
      const inCorridorView = Math.abs(cam.camX - fun.trackX) <= 135;
      for (let carIndex = 0; carIndex < 2; carIndex += 1) {
        if (!inCorridorView) continue;
        if (state.ridingFunicularId === fun.id && (state.ridingFunicularCarIndex || 0) === carIndex) continue;
        const pose = computeFunicularCarPose(fun, carIndex);
        if (!inRange(pose.x - 24, pose.y - 36, pose.x + 24, pose.y + 36)) continue;
        list.push({
          kind: 'funicular-car',
          x0: pose.x - 11,
          y0: pose.y - 22,
          x1: pose.x + 11,
          y1: pose.y + 22,
          funicular: fun,
          carIndex,
          pose
        });
      }
      for (const [fromEnd, st] of [['lower', fun.lowerStation], ['upper', fun.upperStation]]) {
        if (!inRange(st.platformX - 18, st.platformY - 18, st.platformX + 18, st.platformY + 18)) continue;
        list.push({
          kind: 'funicular-station',
          x0: st.platformX - 10,
          y0: st.platformY - 10,
          x1: st.platformX + 10,
          y1: st.platformY + 10,
          funicular: fun,
          station: st,
          fromEnd,
          highlighted:
            nearbyInteraction?.type === 'funicular-station' &&
            nearbyInteraction.id === fun.id &&
            nearbyInteraction.fromEnd === fromEnd
        });
      }
    }

    for (const tree of STREET_TREES) {
      if (!inRange(tree.x - 16, tree.y - 16, tree.x + 16, tree.y + 16)) continue;
      list.push({
        kind: 'tree',
        x0: tree.x - 10,
        y0: tree.y - 10,
        x1: tree.x + 10,
        y1: tree.y + 10,
        tree
      });
    }

    for (const lamp of STREET_LAMPS) {
      if (!inRange(lamp.x - 10, lamp.y - 10, lamp.x + 10, lamp.y + 10)) continue;
      list.push({
        kind: 'lamp',
        x0: lamp.x - 4,
        y0: lamp.y - 4,
        x1: lamp.x + 4,
        y1: lamp.y + 4,
        lamp
      });
    }

    // Seasonal 3D Lisbon plaza landmarks & street kiosks (Christmas tree, Castanhas Assadas vendors, Summer parasols, Manjericos)
    const seasonalProps = [];
    if (monthInfo.decorStyle === 'christmas-lights') {
      seasonalProps.push(
        { type: 'christmas-tree', x: 992, y: 440, r: 22 },
        { type: 'christmas-tree', x: 1855, y: 536, r: 16 }
      );
    }
    if (monthInfo.hasCastanhaVendors) {
      for (const cv of CASTANHA_VENDORS) {
        seasonalProps.push({
          type: 'chestnut-cart',
          id: cv.id,
          x: cv.x,
          y: cv.y,
          r: 12,
          vendorName: cv.vendorName,
          cry: cv.cry,
          highlighted: nearbyInteraction?.type === 'castanha-cart' && nearbyInteraction.id === cv.id
        });
        // Live Castanha vendor standing warmly beside the smoking chestnut cart shouting "Quentes e boas!"
        const vx = cv.x + 17;
        const vy = cv.y - 4;
        if (inRange(vx - 10, vy - 10, vx + 10, vy + 10)) {
          list.push({
            kind: 'person',
            x0: vx - 6,
            y0: vy - 6,
            x1: vx + 6,
            y1: vy + 6,
            person: {
              x: vx,
              y: vy,
              outfitId: 'tile-artisan',
              walkPhase: 0,
              isMoving: false,
              skipRainUmbrella: true,
              label: `${cv.vendorName} (Castanhas)`,
              emoteText: cv.cry
            }
          });
        }
      }
    }
    if (monthInfo.decorStyle === 'summer-sun' || monthInfo.decorStyle === 'summer-festival') {
      seasonalProps.push(
        { type: 'summer-parasol', x: 994, y: 452, r: 18, color: '#0284c7' },
        { type: 'summer-parasol', x: 1098, y: 534, r: 18, color: '#d97706' },
        { type: 'summer-parasol', x: 1030, y: 982, r: 18, color: '#dc2626' },
        { type: 'summer-parasol', x: 1465, y: 982, r: 18, color: '#0f766e' }
      );
    } else if (monthInfo.decorStyle === 'santos-populares') {
      seasonalProps.push(
        { type: 'manjerico-stall', x: 992, y: 454, r: 14 },
        { type: 'manjerico-stall', x: 1856, y: 538, r: 14 }
      );
    }

    // Wooden & Lioz Limestone Riverside Promenade Benches overlooking the Tagus River
    for (const rb of RIVERSIDE_BENCHES) {
      if (!inRange(rb.x - 22, rb.y - 10, rb.x + 22, rb.y + 10)) continue;
      list.push({
        kind: 'riverside-bench',
        x0: rb.x - 18,
        y0: rb.y - 6,
        x1: rb.x + 18,
        y1: rb.y + 6,
        bench: rb,
        highlighted: nearbyInteraction?.type === 'riverside-bench' && nearbyInteraction.id === rb.id,
        isSeated: state.seatedBenchId === rb.id
      });
    }

    // Warm-month Tagus Riverside Joggers (May - Oct only!)
    for (const jog of state.joggers || []) {
      if (!inRange(jog.x - 12, jog.y - 12, jog.x + 12, jog.y + 12)) continue;
      list.push({
        kind: 'jogger',
        x0: jog.x - 8,
        y0: jog.y - 8,
        x1: jog.x + 8,
        y1: jog.y + 8,
        jogger: jog
      });
    }
    for (const prop of seasonalProps) {
      if (!inRange(prop.x - prop.r, prop.y - prop.r, prop.x + prop.r, prop.y + prop.r)) continue;
      list.push({
        kind: 'seasonal-prop',
        x0: prop.x - prop.r * 0.5,
        y0: prop.y - prop.r * 0.5,
        x1: prop.x + prop.r * 0.5,
        y1: prop.y + prop.r * 0.5,
        prop,
        highlighted: Boolean(prop.highlighted)
      });
    }

    // Overhead 3D seasonal street decoration arches depth-sorted cleanly behind/in front of buildings
    const decorStyle = monthInfo.decorStyle;
    if (
      decorStyle === 'christmas-lights' ||
      decorStyle === 'janeiras-stars' ||
      decorStyle === 'carnaval' ||
      decorStyle === 'cravos-25-abril' ||
      decorStyle === 'santos-populares' ||
      decorStyle === 'alfama-fado' ||
      decorStyle === 'marathon-banners' ||
      decorStyle === 'autumn-leaves' ||
      decorStyle === 'summer-festival'
    ) {
      const corridors = [
        { y0: 540, y1: 678, z: 102, xs: [360, 560, 760, 960, 1160, 1360, 1560, 1760, 1960] },
        { y0: 224, y1: 352, z: 98, xs: [380, 620, 940, 1180, 1460, 1840] }
      ];
      for (const cor of corridors) {
        for (const x of cor.xs) {
          if (!inRange(x - 6, cor.y0, x + 6, cor.y1)) continue;
          if (Math.hypot(x - cam.camX, (cor.y0 + cor.y1) * 0.5 - cam.camY) > 760) continue;
          list.push({
            kind: 'decor-arch',
            x0: x - 4,
            y0: cor.y0,
            x1: x + 4,
            y1: cor.y1,
            arch: { x, y0: cor.y0, y1: cor.y1, z: cor.z }
          });
        }
      }
    }

    for (const spot of REST_SPOTS) {
      if (!inRange(spot.x - 24, spot.y - 14, spot.x + 24, spot.y + 14)) continue;
      list.push({
        kind: 'bench',
        x0: spot.x - 22,
        y0: spot.y - 10,
        x1: spot.x + 22,
        y1: spot.y + 10,
        spot,
        captured: state.memories.some((m) => m.id === spot.memory.id)
      });
      const perf = (state.miradouroPerformances || []).find((m) => m.spotId === spot.id);
      if (perf) {
        const mx = spot.x + 30;
        const my = spot.y + 2;
        list.push({
          kind: 'person',
          x0: mx - 8,
          y0: my - 8,
          x1: mx + 8,
          y1: my + 8,
          person: {
            x: mx,
            y: my,
            outfitId: perf.musicianOutfitId || spot.musicianOutfitId || 'fado-blazer',
            walkPhase: 0,
            isMoving: false,
            label: `${perf.musicianName}: "${perf.songTitle}"`,
            emoteText: state.miradouroEncore?.spotId === spot.id ? `${perf.instrument}!` : ''
          }
        });
      }
    }

    for (const stop of ALL_STOPS) {
      if (!inRange(stop.platformX - 18, stop.platformY - 14, stop.platformX + 18, stop.platformY + 14)) continue;
      list.push({
        kind: 'stop',
        x0: stop.platformX - 12,
        y0: stop.platformY - 10,
        x1: stop.platformX + 12,
        y1: stop.platformY + 10,
        stop,
        highlighted: nearbyInteraction?.type === 'stop' && nearbyInteraction.id === stop.stopId
      });
    }

    // Top-of-Bairro-Alto Permanent Criss-Cross Party Festoon String Lights (glowing warmly every evening!)
    for (const bx of [82, 165, 255, 350, 455, 575, 695]) {
      if (!inRange(bx - 8, 194, bx + 8, 250)) continue;
      if (Math.hypot(bx - cam.camX, 222 - cam.camY) > 780) continue;
      list.push({
        kind: 'bairro-party-arch',
        x0: bx - 4,
        y0: 194,
        x1: bx + 4,
        y1: 248,
        arch: { x: bx, y0: 194, y1: 248, z: 80 }
      });
    }

    // Evening Bairro Alto Hilltop Party Revelers enjoying drinks outside Bar da Noite & Sao Pedro!
    if (isBairroAltoPartyTime(state.minutesOfDay)) {
      for (let ri = 0; ri < BAIRRO_ALTO_PARTY_REVELERS.length; ri += 1) {
        const rev = BAIRRO_ALTO_PARTY_REVELERS[ri];
        if (!inRange(rev.x - 14, rev.y - 14, rev.x + 14, rev.y + 14)) continue;
        list.push({
          kind: 'person',
          x0: rev.x - 8,
          y0: rev.y - 8,
          x1: rev.x + 8,
          y1: rev.y + 8,
          person: {
            x: rev.x,
            y: rev.y,
            outfitId: rev.outfitId,
            walkPhase: 0,
            isMoving: false,
            holdingDrink: rev.drinkColor,
            drinkType: rev.drinkType,
            partyBob: true,
            phaseOffset: rev.phaseOffset,
            skipRainUmbrella: true,
            label: '',
            emoteText: rev.toastPhrase,
            emoteCycleIndex: ri
          }
        });
      }
    }

    for (const npc of state.npcs) {
      if (!inRange(npc.x - 12, npc.y - 12, npc.x + 12, npc.y + 12)) continue;
      list.push({
        kind: 'person',
        x0: npc.x - 8,
        y0: npc.y - 8,
        x1: npc.x + 8,
        y1: npc.y + 8,
        person: {
          x: npc.x,
          y: npc.y,
          outfitId: npc.outfitId,
          walkPhase: npc.walkPhase,
          isMoving: npc.isMoving !== false,
          label: '',
          emoteText: ''
        }
      });
    }

    for (const rp of state.remotePlayers || []) {
      if (rp.mode !== 'overworld' || rp.ridingVehicleId) continue;
      if (!inRange(rp.x - 14, rp.y - 14, rp.x + 14, rp.y + 14)) continue;
      list.push({
        kind: 'person',
        x0: rp.x - 9,
        y0: rp.y - 9,
        x1: rp.x + 9,
        y1: rp.y + 9,
        person: {
          x: rp.x,
          y: rp.y,
          outfitId: rp.outfitId,
          walkPhase: rp.walkPhase || 0,
          isMoving: Boolean(rp.isMoving),
          label: rp.name,
          emoteText: rp.emoteText || ''
        }
      });
    }

    return list;
  }


  drawWeatherAtmosphere3D(ctx, cam, monthInfo, phase, animTime) {
    const w = this.viewWidth;
    const h = this.viewHeight;
    const rain = monthInfo?.rainIntensity || 0;
    const style = monthInfo?.decorStyle || '';

    ctx.save();

    // 1. Realistic Atlantic Rainfall Streaks & Soft Misty Wash (strongest in November!)
    if (rain >= 0.14) {
      if (rain >= 0.7) {
        ctx.fillStyle = phase.id === 'evening' ? 'rgba(15, 28, 46, 0.22)' : 'rgba(110, 128, 148, 0.16)';
        ctx.fillRect(0, 0, w, h);
      }
      const dropCount = Math.round(35 + rain * 150);
      ctx.strokeStyle = phase.id === 'evening'
        ? `rgba(186, 224, 255, ${0.22 + rain * 0.28})`
        : `rgba(220, 238, 252, ${0.25 + rain * 0.35})`;
      ctx.lineWidth = rain >= 0.7 ? 1.45 : 1.1;
      ctx.beginPath();
      for (let i = 0; i < dropCount; i += 1) {
        const speed = 380 + (i % 5) * 75 + rain * 220;
        const rx = ((i * 97.3 + animTime * 85) % (w + 80)) - 40;
        const ry = ((i * 53.7 + animTime * speed) % (h + 60)) - 30;
        const len = 10 + rain * 16 + (i % 4) * 3;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - len * 0.22, ry + len);
      }
      ctx.stroke();
    }

    // 2. Dazzling Lisbon Summer Brightness & Diagonal Sunbeams (July & August)
    if ((monthInfo?.sunBrightness || 1) >= 1.15 && phase.id !== 'evening') {
      const beamGrad = ctx.createLinearGradient(w * 0.78, 0, w * 0.22, h * 0.82);
      beamGrad.addColorStop(0, 'rgba(255, 251, 220, 0.22)');
      beamGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 3. Seasonal Floating Particles (Carnaval confetti, 25 de Abril red carnation petals, May Jacaranda blossoms, Oct autumn leaves)
    if (style === 'carnaval' || style === 'cravos-25-abril' || style === 'jacaranda-bloom' || style === 'autumn-leaves') {
      const pCount = style === 'carnaval' ? 42 : 28;
      const pCols =
        style === 'carnaval'
          ? ['#ec4899', '#facc15', '#06b6d4', '#10b981', '#ef4444']
          : style === 'cravos-25-abril'
            ? ['#dc2626', '#ef4444', '#b91c1c']
            : style === 'jacaranda-bloom'
              ? ['#9b72cf', '#b796e6', '#7c55b5']
              : ['#d97706', '#b45309', '#f59e0b', '#9a3412'];
      for (let i = 0; i < pCount; i += 1) {
        const px = ((i * 113.7 + animTime * (28 + (i % 4) * 9) + Math.sin(animTime * 2 + i) * 18) % (w + 40)) - 20;
        const py = ((i * 67.3 + animTime * (36 + (i % 3) * 14)) % (h + 30)) - 15;
        ctx.fillStyle = pCols[i % pCols.length];
        ctx.beginPath();
        ctx.ellipse(px, py, style === 'autumn-leaves' ? 4.2 : 3.2, 1.9, animTime * 1.8 + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  renderPerspectiveCalcadaGround(ctx, cam, hy, isEvening, isGolden, wet, brightSummer) {
    if (typeof document === 'undefined' || typeof ctx.drawImage !== 'function') return false;
    const w = this.viewWidth;
    const h = this.viewHeight;

    if (!this.groundCanvas || this.groundCanvas.width !== w || this.groundH !== h) {
      this.groundCanvas = document.createElement('canvas');
      this.groundCanvas.width = w;
      this.groundCanvas.height = h;
      this.groundCtx = this.groundCanvas.getContext('2d');
      this.groundImg = this.groundCtx.createImageData(w, h);
      this.groundU32 = new Uint32Array(this.groundImg.data.buffer);
      this.groundH = h;
    }

    const u32 = this.groundU32;
    u32.fill(0); // Transparent over sky & Tagus River water
    const tex = this.calcadaTex;
    const mask = tex.mask;
    const tMosaic = tex.sidewalkMosaic;
    const tWhite = tex.sidewalkWhite;
    const tBlack = tex.sidewalkBlack;
    const tMar = tex.marLargo;
    const tLeque = tex.lequeRoad;

    const fogR = isEvening ? 54 : wet >= 0.5 ? 148 : brightSummer ? 222 : isGolden ? 204 : 196;
    const fogG = isEvening ? 62 : wet >= 0.5 ? 156 : brightSummer ? 214 : isGolden ? 174 : 190;
    const fogB = isEvening ? 80 : wet >= 0.5 ? 166 : brightSummer ? 198 : isGolden ? 148 : 178;

    const mulR = isEvening ? 0.58 : isGolden ? 1.06 : brightSummer ? 1.08 : wet >= 0.45 ? 0.84 : 1.0;
    const mulG = isEvening ? 0.62 : isGolden ? 0.96 : brightSummer ? 1.06 : wet >= 0.45 ? 0.86 : 1.0;
    const mulB = isEvening ? 0.76 : isGolden ? 0.84 : brightSummer ? 1.03 : wet >= 0.45 ? 0.92 : 1.0;
    const wetSheen = wet >= 0.45 ? (isEvening ? 14 : 20) : 0;

    const camX = cam.camX;
    const camY = cam.camY;
    const camZ = cam.camZ;
    const fx = cam.fx;
    const fy = cam.fy;
    const rx = cam.rx;
    const ry = cam.ry;
    const focal = this.focal;
    const halfW = w * 0.5;
    const horizonY = cam.horizonY;
    const littleEndian = IS_LITTLE_ENDIAN;

    const SIDE_SCALE = 2.45;
    const MAR_SCALE = 2.25;
    const LEQUE_SCALE = 2.35;

    const sampleCalcadaPixel = (wx, wy, cz, slopeShade) => {
      let r;
      let g;
      let b;

      if (wy >= WATERFRONT_Y - 14) {
        const slab = ((wx % 26) + 26) % 26;
        const isEdge = wy >= WATERFRONT_Y - 2 || wy < WATERFRONT_Y - 12.5 || slab < 1.3;
        r = isEdge ? 142 : 226;
        g = isEdge ? 134 : 218;
        b = isEdge ? 122 : 202;
      } else if (wy >= 972) {
        const u = Math.floor(wx * MAR_SCALE) & mask;
        const v = Math.floor(wy * MAR_SCALE) & mask;
        const ti = (v * 128 + u) * 4;
        const onFrame = wy < 976.5 || wy > 1011.5;
        const buf = onFrame ? tBlack : tMar;
        r = buf[ti];
        g = buf[ti + 1];
        b = buf[ti + 2];
      } else {
        const inXSpan = wx >= -2320 && wx <= 4320;
        const inNorthernRoad = inXSpan && wy >= -2462 && wy <= -2388;
        const inCampoRoad = inXSpan && wy >= -1782 && wy <= -1708;
        const inMarquesRoad = inXSpan && wy >= -1102 && wy <= -1028;
        const inRossioRoad = inXSpan && wy >= -422 && wy <= -348;
        const inNorthRoad = inXSpan && wy >= 248 && wy <= 322;
        const inTramRoad = inXSpan && wy >= 577 && wy <= 643;
        const inSouthRoad = inXSpan && wy >= 893 && wy <= 972;
        const inHorizRoad = inNorthernRoad || inCampoRoad || inMarquesRoad || inRossioRoad || inNorthRoad || inTramRoad || inSouthRoad;
        const inVertRoad =
          (wy >= -2462 && wy <= 972 && (
            (wx >= -2302 && wx <= -2218) ||
            (wx >= -1502 && wx <= -1418) ||
            (wx >= -602 && wx <= -518) ||
            (wx >= 892 && wx <= 978 && wy <= 322) ||
            (wx >= 1692 && wx <= 1798 && wy <= 322) ||
            (wx >= 3318 && wx <= 3402) ||
            (wx >= 4110 && wx <= 4195)
          )) ||
          (wy >= -422 && wy <= 972 && (
            (wx >= 475 && wx <= 550) ||
            (wx >= 1344 && wx <= 1422) ||
            (wx >= 2155 && wx <= 2280)
          )) ||
          (wy >= 248 && wy <= 972 && (
            (wx >= 120 && wx <= 205) ||
            (wx >= 838 && wx <= 890) ||
            (wx >= 1685 && wx <= 1775)
          ));

        if (inHorizRoad || inVertRoad) {
          const onHorizCurb =
            !inVertRoad && (
              (inNorthernRoad && (wy < -2459 || wy > -2391)) ||
              (inCampoRoad && (wy < -1779 || wy > -1711)) ||
              (inMarquesRoad && (wy < -1099 || wy > -1031)) ||
              (inRossioRoad && (wy < -419 || wy > -351)) ||
              (inNorthRoad && (wy < 251 || wy > 319)) ||
              (inTramRoad && (wy < 580 || wy > 640)) ||
              (inSouthRoad && (wy < 896 || wy > 969))
            );
          const onVertCurb =
            inVertRoad && !inHorizRoad && (
              (wx >= -2302 && wx <= -2299) || (wx >= -2221 && wx <= -2218) ||
              (wx >= -602 && wx <= -599) || (wx >= -521 && wx <= -518) ||
              (wx >= 475 && wx <= 478) || (wx >= 547 && wx <= 550) ||
              (wx >= 892 && wx <= 895) || (wx >= 975 && wx <= 978) ||
              (wx >= 1344 && wx <= 1347) || (wx >= 1419 && wx <= 1422) ||
              (wx >= 1685 && wx <= 1688) || (wx >= 1795 && wx <= 1798) ||
              (wx >= 3318 && wx <= 3321) || (wx >= 3399 && wx <= 3402) ||
              (wx >= 4110 && wx <= 4113) || (wx >= 4192 && wx <= 4195)
            );
          if (onHorizCurb || onVertCurb) {
            const joint = (((wx + wy) % 24) + 24) % 24 < 1.3;
            r = joint ? 128 : 224;
            g = joint ? 120 : 216;
            b = joint ? 110 : 202;
          } else {
            const u = Math.floor(wx * LEQUE_SCALE) & mask;
            const v = Math.floor(wy * LEQUE_SCALE) & mask;
            const ti = (v * 128 + u) * 4;
            r = tLeque[ti];
            g = tLeque[ti + 1];
            b = tLeque[ti + 2];

            if (
              (wy >= -2456 && wy <= -2394) ||
              (wy >= -1776 && wy <= -1714) ||
              (wy >= -1096 && wy <= -1034) ||
              (wy >= -416 && wy <= -354) ||
              (wy >= 254 && wy <= 316) ||
              (wy >= 579 && wy <= 641) ||
              (wy >= 900 && wy <= 962)
            ) {
              if (
                (wx >= -581 && wx <= -538 && (((wx + 581) % 11) + 11) % 11 < 6) ||
                (wx >= 491 && wx <= 532 && ((wx - 491) % 11) < 6) ||
                (wx >= 885 && wx <= 932 && ((wx - 885) % 11) < 6) ||
                (wx >= 1361 && wx <= 1404 && ((wx - 1361) % 11) < 6) ||
                (wx >= 1705 && wx <= 1748 && ((wx - 1705) % 11) < 6) ||
                (wx >= 3338 && wx <= 3382 && ((wx - 3338) % 11) < 6)
              ) {
                r = (r * 0.34 + 244 * 0.66) | 0;
                g = (g * 0.34 + 240 * 0.66) | 0;
                b = (b * 0.34 + 230 * 0.66) | 0;
              }
            }
          }
        } else if (wx >= 865 && wx <= 1035 && wy >= -1780 && wy <= 972) {
          const u = Math.floor(wx * MAR_SCALE) & mask;
          const v = Math.floor(wy * MAR_SCALE) & mask;
          const ti = (v * 128 + u) * 4;
          const onPlazaEdge = wx < 872 || wx > 1028;
          const buf = onPlazaEdge ? tBlack : tMar;
          r = buf[ti];
          g = buf[ti + 1];
          b = buf[ti + 2];
        } else {
          const onBasaltRibbon =
            inXSpan && (
              (wy >= 241 && wy <= 245) || (wy >= 325 && wy <= 329) ||
              (wy >= 569 && wy <= 573) || (wy >= 647 && wy <= 651) ||
              (wy >= 885 && wy <= 889)
            );
          const onWhiteMargin =
            inXSpan && (
              (wy >= 245 && wy < 248) || (wy > 322 && wy <= 325) ||
              (wy >= 573 && wy < 577) || (wy > 643 && wy <= 647) ||
              (wy >= 889 && wy < 893)
            );
          const u = Math.floor(wx * SIDE_SCALE) & mask;
          const v = Math.floor(wy * SIDE_SCALE) & mask;
          const ti = (v * 128 + u) * 4;
          const buf = onBasaltRibbon ? tBlack : onWhiteMargin ? tWhite : tMosaic;
          r = buf[ti];
          g = buf[ti + 1];
          b = buf[ti + 2];
        }
      }

      const fog = cz <= 210 ? 0 : cz >= 1060 ? 0.78 : ((cz - 210) / 850) * 0.78;
      const invFog = 1 - fog;
      const nr = clamp(((r * mulR * slopeShade + wetSheen * (r > 120 ? 0.5 : 0.9)) * invFog + fogR * fog) | 0, 0, 255);
      const ng = clamp(((g * mulG * slopeShade + wetSheen * (g > 120 ? 0.55 : 1.0)) * invFog + fogG * fog) | 0, 0, 255);
      const nb = clamp(((b * mulB * slopeShade + wetSheen * 1.15) * invFog + fogB * fog) | 0, 0, 255);
      return littleEndian
        ? (0xff000000 | (nb << 16) | (ng << 8) | nr)
        : ((nr << 24) | (ng << 16) | (nb << 8) | 0xff);
    };

    // True 3D Sloped Terrain Column-Heightfield Caster:
    // Front-to-back per-column height ray-march renders Bairro Alto's high plateau, steep 14% funicular streets,
    // Alfama's hillside slope, and exact hill-crest occlusion with razor-sharp interpolated Calcada Portuguesa stones!
    for (let sx = 0; sx < w; sx += 1) {
      const colOff = (sx + 0.5 - halfW) / focal;
      const rdx = fx + rx * colOff;
      const rdy = fy + ry * colOff;

      let topRow = h;
      let prevCz = 5.5;
      let prevWx = camX + rdx * prevCz;
      let prevWy = camY + rdy * prevCz;
      let prevGz = getTerrainElevation(prevWx, prevWy);
      let prevSy = horizonY - ((prevGz - camZ) * focal) / prevCz;

      let cz = 5.5;
      while (cz < 1180 && topRow > 0) {
        const step = cz < 45 ? 1.8 : cz < 130 ? 3.8 : cz < 320 ? 8.0 : cz < 660 ? 16.0 : 30.0;
        const nextCz = cz + step;
        const wx = camX + rdx * nextCz;
        const wy = camY + rdy * nextCz;

        if (wy >= WATERFRONT_Y) {
          if (prevWy < WATERFRONT_Y && rdy > 0.0001) {
            const tEdge = clamp((WATERFRONT_Y - prevWy) / (wy - prevWy), 0, 1);
            const edgeCz = prevCz + (nextCz - prevCz) * tEdge;
            const edgeWx = prevWx + (wx - prevWx) * tEdge;
            const edgeSy = horizonY - ((0 - camZ) * focal) / edgeCz;
            if (edgeSy < topRow) {
              const yStart = Math.max(0, Math.ceil(edgeSy));
              const yEnd = Math.min(h - 1, topRow - 1);
              const span = Math.max(0.001, prevSy - edgeSy);
              for (let py = yStart; py <= yEnd; py += 1) {
                const frac = clamp((prevSy - py) / span, 0, 1);
                const pCz = prevCz + (edgeCz - prevCz) * frac;
                const pWx = prevWx + (edgeWx - prevWx) * frac;
                const pWy = prevWy + (WATERFRONT_Y - 0.5 - prevWy) * frac;
                u32[py * w + sx] = sampleCalcadaPixel(pWx, pWy, pCz, 1.0);
              }
              topRow = yStart;
            }
          }
          if (rdy >= 0) break;
          prevCz = nextCz;
          prevWx = wx;
          prevWy = wy;
          prevGz = 0;
          prevSy = horizonY - ((0 - camZ) * focal) / nextCz;
          cz = nextCz;
          continue;
        }

        const gz = getTerrainElevation(wx, wy);
        const sy = horizonY - ((gz - camZ) * focal) / nextCz;
        if (sy < topRow) {
          const yStart = Math.max(0, Math.ceil(sy));
          const yEnd = Math.min(h - 1, topRow - 1);
          const span = Math.max(0.001, prevSy - sy);
          // Warm sunlight shading on steep uphill slopes makes Bairro Alto & Alfama elevation immediately legible!
          const slopeShade = clamp(1.0 + ((gz - prevGz) / step) * 0.45, 0.8, 1.18);
          for (let py = yStart; py <= yEnd; py += 1) {
            const frac = clamp((prevSy - py) / span, 0, 1);
            const pCz = prevCz + (nextCz - prevCz) * frac;
            const pWx = prevWx + (wx - prevWx) * frac;
            const pWy = prevWy + (wy - prevWy) * frac;
            u32[py * w + sx] = sampleCalcadaPixel(pWx, pWy, pCz, slopeShade);
          }
          topRow = yStart;
        }

        prevCz = nextCz;
        prevWx = wx;
        prevWy = wy;
        prevGz = gz;
        prevSy = sy;
        cz = nextCz;
      }
    }

    this.groundCtx.putImageData(this.groundImg, 0, 0);
    ctx.drawImage(this.groundCanvas, 0, 0);
    return true;
  }

  drawHeldCastanhaCone3D(ctx, timer, animTime, isEvening) {
    // Cozy first-person steaming kraft-paper cone of hot roasted Castanhas Assadas in bottom-right corner
    const w = this.viewWidth;
    const h = this.viewHeight;
    const fade = clamp(timer / 2.0, 0, 1);
    const swayX = Math.sin(animTime * 2.2) * 3;
    const swayY = Math.cos(animTime * 2.8) * 2.5;
    const cx = w - 92 + swayX;
    const cy = h - 38 + swayY;

    ctx.save();
    ctx.globalAlpha = fade;

    // Gentle curling steam wisps rising off the hot roasted chestnuts
    for (let i = 0; i < 4; i += 1) {
      const p = (animTime * 0.75 + i * 0.25) % 1;
      const sx = cx - 8 + Math.sin(animTime * 2.4 + i * 1.5) * 10 + i * 5;
      const sy = cy - 68 - p * 48;
      ctx.fillStyle = `rgba(241, 245, 249, ${(1 - p) * 0.42})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 6 + p * 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Back folded paper cone lip (traditional Lisbon cartucho made from folded newspaper/kraft sheet)
    ctx.fillStyle = shadeColor('#ebd9b7', 0.92, isEvening);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy - 58);
    ctx.lineTo(cx + 12, cy - 84);
    ctx.lineTo(cx + 34, cy - 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cluster of glossy charred roasted chestnuts dusted with coarse sea salt grains
    for (const [ox, oy, rx, ry] of [
      [-14, -56, 10, 8], [2, -62, 11, 8.5], [16, -54, 10, 8],
      [-6, -48, 10, 8], [10, -48, 10, 8], [1, -55, 9.5, 7.5]
    ]) {
      ctx.fillStyle = shadeColor('#5c240a', 1, isEvening);
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + oy, rx, ry, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#291004';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // Charred roast split & coarse sea salt glint
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(cx + ox - 2, cy + oy - 1.5, rx * 0.42, ry * 0.28, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx + ox + 2, cy + oy - 3, 2, 2);
    }

    // Front rolled kraft-paper cone body wrapping the chestnuts
    ctx.fillStyle = shadeColor('#f5e6c8', 1, isEvening);
    ctx.beginPath();
    ctx.moveTo(cx - 32, cy - 54);
    ctx.lineTo(cx + 32, cy - 50);
    ctx.lineTo(cx + 4, cy + 44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Diagonal folded seam & subtle Portuguese stamp
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 52);
    ctx.lineTo(cx + 4, cy + 36);
    ctx.stroke();
    ctx.fillStyle = '#7c2d12';
    ctx.font = '700 8.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CASTANHAS', cx + 2, cy - 26);
    ctx.fillText('LISBOA', cx + 2, cy - 15);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  drawStreetViewHud(ctx, cam, state, monthInfo = getMonthInfo(state.month)) {
    ctx.save();

    // Top-left Google Street View style address, month, weather & compass bar (auto-sized so text never overflows!)
    const streetName = findNearestStreetName(state.player.x, state.player.y);
    const deg = (((cam.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const compassLabel = dirs[Math.round(deg / 45) % 8];
    const elevM = Math.round(getRawTerrainElevation(state.player.x, state.player.y) * 0.65);
    const line1 = `STREET VIEW 3D  |  ${state.currentNeighborhoodName.toUpperCase()}  |  ELEV ${elevM}m  |  FACING ${compassLabel}`;
    const line2 = `${monthInfo.name.toUpperCase()} (${monthInfo.avgHighC}C, ${monthInfo.weatherLabel})  |  ${monthInfo.eventTag}  |  ${streetName}`;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    const w1 = ctx.measureText(line1).width;
    ctx.font = '600 10px "Segoe UI", sans-serif';
    const w2 = ctx.measureText(line2).width;
    const boxW = Math.max(340, Math.min(620, Math.max(w1, w2) + 28));

    drawRoundedRect(ctx, 14, 14, boxW, 52, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.68)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillText(line1, 26, 33, boxW - 22);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 10px "Segoe UI", sans-serif';
    ctx.fillText(line2, 26, 52, boxW - 22);

    // Subtle seated riverside bench pill while relaxing along the Tagus
    if (state.seatedBenchId && state.seatedBench) {
      const seatMsg = `SEATED: ${state.seatedBench.name}  |  Restoring Energy  |  Drag to pan Tagus & Almada  |  [E] or Move to stand`;
      ctx.font = '700 10px "Segoe UI", sans-serif';
      const sw = Math.min(this.viewWidth - 28, ctx.measureText(seatMsg).width + 24);
      drawRoundedRect(ctx, 14, 72, sw, 24, 6);
      ctx.fillStyle = 'rgba(15, 118, 110, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = '#fef9c3';
      ctx.fillText(seatMsg, 26, 87, sw - 20);
    }

    // Top-right Live Lisboa Radar Mini-Map with Rotating Blue View Cone
    const mapW = 152;
    const mapH = 84;
    const mapX = this.viewWidth - mapW - 14;
    const mapY = 14;
    drawRoundedRect(ctx, mapX, mapY, mapW, mapH, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const spanW = WORLD_MAX_X - WORLD_MIN_X;
    const spanH = WORLD_HEIGHT - WORLD_MIN_Y;
    const sx = (wx) => mapX + 6 + ((wx - WORLD_MIN_X) / spanW) * (mapW - 12);
    const sy = (wy) => mapY + 6 + ((wy - WORLD_MIN_Y) / spanH) * (mapH - 12);

    // Tagus water strip on mini-map
    ctx.fillStyle = 'rgba(14, 116, 144, 0.65)';
    ctx.fillRect(mapX + 6, sy(WATERFRONT_Y), mapW - 12, mapY + mapH - 6 - sy(WATERFRONT_Y));

    // Tiny Lisbon buildings & Greater Lisboa landmarks
    ctx.fillStyle = 'rgba(226, 218, 202, 0.55)';
    for (const v of VENUES) {
      ctx.fillRect(sx(v.x), sy(v.y), 2.2, 2.2);
    }
    ctx.fillStyle = 'rgba(125, 211, 252, 0.65)';
    for (const s of CITY_DISTRICT_SPOTS) {
      ctx.fillRect(sx(s.worldX), sy(s.worldY), 2.4, 2.4);
    }
    ctx.fillStyle = '#e11d48';
    for (const m of ALL_METRO_STATIONS) {
      if (!Number.isFinite(m.doorX)) continue;
      ctx.fillRect(sx(m.doorX) - 1.5, sy(m.doorY) - 1.5, 3, 3);
    }

    // All 9 Live Carris Tram & Bus dots
    for (const v of state.vehicles) {
      ctx.fillStyle = v.mode === 'tram' ? '#facc15' : '#34d399';
      ctx.beginPath();
      ctx.arc(sx(v.x), sy(v.y), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Remote LAN peers on mini-map
    for (const rp of state.remotePlayers || []) {
      if (rp.mode !== 'overworld') continue;
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(sx(rp.x), sy(rp.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player position + Google Street View blue directional sight cone
    const px = sx(state.player.x);
    const py = sy(state.player.y);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 16, cam.yaw - 0.52, cam.yaw + 0.52);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }
}

export const street3dPanoramaMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    street3dPanoramaMethods[key] = _Mixin.prototype[key];
  }
}
