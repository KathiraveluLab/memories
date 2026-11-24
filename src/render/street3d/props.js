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
  drawTransitVehicle3D(ctx, cam, vehicle, isEvening) {
    const isTram = vehicle.mode === 'tram';
    const halfL = 36;
    const halfW = 14;
    const baseZ = 4;
    const topZ = isTram ? 46 : 48;
    const fx = Math.cos(vehicle.heading || 0);
    const fy = Math.sin(vehicle.heading || 0);
    const rx = -fy;
    const ry = fx;

    // Sample exact local Lisbon hillside elevation at each corner so Tram 28E & Bus 737 naturally tilt up/down slopes!
    const pt = (l, w, z) => {
      const px = vehicle.x + fx * l + rx * w;
      const py = vehicle.y + fy * l + ry * w;
      return [px, py, getTerrainElevation(px, py) + z];
    };
    const fl0 = pt(halfL, -halfW, baseZ);
    const fr0 = pt(halfL, halfW, baseZ);
    const br0 = pt(-halfL, halfW, baseZ);
    const bl0 = pt(-halfL, -halfW, baseZ);
    const fl1 = pt(halfL, -halfW, topZ);
    const fr1 = pt(halfL, halfW, topZ);
    const br1 = pt(-halfL, halfW, topZ);
    const bl1 = pt(-halfL, -halfW, topZ);

    const bodyColor = isTram ? '#eab308' : '#157a5d';
    const upperColor = isTram ? '#fef9c3' : '#f8fafc';
    const roofColor = isTram ? '#d4d4d8' : '#0f5c46';
    const winColor = isEvening ? '#fef08a' : '#1e3a5f';

    // Contact shadow & dark-iron wheel bogie undercarriage skirt on street (never hovering!)
    const bogie0 = pt(halfL - 2, -halfW + 1.5, 0.4);
    const bogie1 = pt(halfL - 2, halfW - 1.5, 0.4);
    const bogie2 = pt(-halfL + 2, halfW - 1.5, 0.4);
    const bogie3 = pt(-halfL + 2, -halfW + 1.5, 0.4);
    this.drawPoly3D(ctx, cam, [pt(halfL, -halfW, 0.3), pt(halfL, halfW, 0.3), pt(-halfL, halfW, 0.3), pt(-halfL, -halfW, 0.3)], 'rgba(15, 23, 42, 0.38)');
    this.drawPoly3D(ctx, cam, [bogie0, bogie1, fr0, fl0], '#1e293b', '#0f172a', 0.9);
    this.drawPoly3D(ctx, cam, [bogie2, bogie3, bl0, br0], '#1e293b', '#0f172a', 0.9);
    this.drawPoly3D(ctx, cam, [bogie1, bogie2, br0, fr0], '#1e293b', '#0f172a', 0.9);
    this.drawPoly3D(ctx, cam, [bogie3, bogie0, fl0, bl0], '#1e293b', '#0f172a', 0.9);

    // Collect the 4 side faces + roof and sort by centroid depth
    const faces = [
      { pts: [fl0, fr0, fr1, fl1], mid: pt(halfL, 0, topZ * 0.5), isFront: true, shade: 1.0 },
      { pts: [br0, bl0, bl1, br1], mid: pt(-halfL, 0, topZ * 0.5), isBack: true, shade: 0.78 },
      { pts: [fr0, br0, br1, fr1], mid: pt(0, halfW, topZ * 0.5), isSide: true, shade: 0.92 },
      { pts: [bl0, fl0, fl1, bl1], mid: pt(0, -halfW, topZ * 0.5), isSide: true, shade: 0.85 },
      { pts: [fl1, fr1, br1, bl1], mid: pt(0, 0, topZ), isRoof: true, shade: 1.0 }
    ];
    faces.sort((a, b) => {
      const da = Math.hypot(a.mid[0] - cam.camX, a.mid[1] - cam.camY);
      const db = Math.hypot(b.mid[0] - cam.camX, b.mid[1] - cam.camY);
      return db - da;
    });

    for (const f of faces) {
      if (f.isRoof) {
        this.drawPoly3D(ctx, cam, f.pts, shadeColor(roofColor, 1, isEvening), '#475569', 1);
        continue;
      }
      // Lower livery skirt + upper white/cream window band aligned with tilted floor
      const p0 = f.pts[0];
      const p1 = f.pts[1];
      const tMid = (24 - baseZ) / (topZ - baseZ);
      const m0 = [p0[0], p0[1], p0[2] + (f.pts[3][2] - p0[2]) * tMid];
      const m1 = [p1[0], p1[1], p1[2] + (f.pts[2][2] - p1[2]) * tMid];
      this.drawPoly3D(ctx, cam, [p0, p1, m1, m0], shadeColor(bodyColor, f.shade, isEvening), '#1e293b', 1.1);
      this.drawPoly3D(ctx, cam, [m0, m1, f.pts[2], f.pts[3]], shadeColor(upperColor, f.shade, isEvening), '#1e293b', 1.1);

      const lerpF = (u, zLocal) => {
        const fracZ = (zLocal - baseZ) / (topZ - baseZ);
        const bx = p0[0] + (p1[0] - p0[0]) * u;
        const by = p0[1] + (p1[1] - p0[1]) * u;
        const zBot = p0[2] + (p1[2] - p0[2]) * u;
        const zTop = f.pts[3][2] + (f.pts[2][2] - f.pts[3][2]) * u;
        return [bx, by, zBot + (zTop - zBot) * fracZ];
      };
      if (f.isSide) {
        for (let wIdx = 0; wIdx < 4; wIdx += 1) {
          const u0 = 0.08 + wIdx * 0.22;
          const u1 = u0 + 0.17;
          this.drawPoly3D(ctx, cam, [lerpF(u0, 25), lerpF(u1, 25), lerpF(u1, 41), lerpF(u0, 41)], winColor);
        }
      } else {
        this.drawPoly3D(ctx, cam, [lerpF(0.12, 25), lerpF(0.88, 25), lerpF(0.88, 40), lerpF(0.12, 40)], winColor);
        if (f.isFront) {
          for (const hu of [0.22, 0.78]) {
            const hp = this.projectWorldPt(cam, ...lerpF(hu, 12));
            if (hp) {
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(hp.x, hp.y, clamp((3.8 * this.focal) / hp.cz, 2, 7), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          const bp = this.projectWorldPt(cam, ...lerpF(0.5, 44));
          if (bp) {
            const fs = Math.max(7, Math.round(clamp((8.5 * this.focal) / bp.cz, 7, 13)));
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bp.x - fs * 1.4, bp.y - fs * 0.65, fs * 2.8, fs * 1.2);
            ctx.fillStyle = '#fde047';
            ctx.font = `800 ${fs}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(vehicle.routeNumber || (isTram ? '28E' : '737'), bp.x, bp.y + fs * 0.34);
            ctx.textAlign = 'left';
          }
        }
      }
    }

    if (isTram) {
      this.drawLine3D(ctx, cam, pt(0, 0, topZ), pt(-8, 0, 72), '#334155', 2);
      this.drawLine3D(ctx, cam, pt(-8, 0, 72), pt(0, 0, 94), '#334155', 2);
      this.drawLine3D(ctx, cam, pt(0, -10, 94), pt(0, 10, 94), '#1e293b', 2.4);
    }
  }

  drawFunicularCar3D(ctx, cam, fun, carIndex, pose, isEvening) {
    // Iconic Lisbon Historic Cable Funicular (Elevador da Bica / Elevador da Gloria):
    // Features authentic stepped wedge iron undercarriage so the yellow wooden passenger cabin stays LEVEL on the steep 14% hill!
    const cx = pose.x;
    const cy = pose.y;
    const halfL = 22; // Compact north-south funicular cabin length along the hillside street
    const halfW = 10.5;
    const zNorth = getTerrainElevation(cx, cy - halfL); // Uphill end
    const zSouth = getTerrainElevation(cx, cy + halfL); // Downhill end
    const cabinFloorZ = Math.max(zNorth, zSouth) + 3.5;
    const cabinMidZ = cabinFloorZ + 19;
    const cabinTopZ = cabinFloorZ + 38;
    const roofPeakZ = cabinTopZ + 5.5;

    // 1. Sloped Dark-Iron Wedged Stepped Chassis Truss hugging the steep Bairro Alto hill flush to the rails!
    const chassisCol = '#1e293b';
    const chassisTrim = '#475569';
    // Contact shadow along the hillside track
    this.drawPoly3D(
      ctx,
      cam,
      [[cx - halfW, cy - halfL, zNorth + 0.3], [cx + halfW, cy - halfL, zNorth + 0.3], [cx + halfW, cy + halfL, zSouth + 0.3], [cx - halfW, cy + halfL, zSouth + 0.3]],
      'rgba(15, 23, 42, 0.42)'
    );
    // Uphill north & downhill south solid undercarriage skirts flush to the rails
    this.drawPoly3D(
      ctx,
      cam,
      [[cx - halfW + 0.8, cy - halfL, zNorth + 0.4], [cx + halfW - 0.8, cy - halfL, zNorth + 0.4], [cx + halfW - 0.8, cy - halfL, cabinFloorZ], [cx - halfW + 0.8, cy - halfL, cabinFloorZ]],
      chassisCol,
      chassisTrim,
      1.1
    );
    // West & East triangular wedged chassis underframes flush to the rails (taller at downhill south end, snug at uphill north end!)
    for (const sx of [cx - halfW + 0.8, cx + halfW - 0.8]) {
      this.drawPoly3D(
        ctx,
        cam,
        [[sx, cy - halfL, zNorth + 0.4], [sx, cy + halfL, zSouth + 0.4], [sx, cy + halfL, cabinFloorZ], [sx, cy - halfL, cabinFloorZ]],
        chassisCol,
        chassisTrim,
        1.2
      );
      // Cross-bracing iron struts & wheel axles inside the tilted wedge chassis
      this.drawLine3D(ctx, cam, [sx, cy - halfL + 4, zNorth + 0.8], [sx, cy + halfL - 4, cabinFloorZ], '#64748b', 1.4);
      this.drawLine3D(ctx, cam, [sx, cy + halfL - 4, zSouth + 0.8], [sx, cy - halfL + 4, cabinFloorZ], '#64748b', 1.4);
    }
    // Downhill south undercarriage apron & steel steps flush to the rails
    this.drawPoly3D(
      ctx,
      cam,
      [[cx - halfW + 0.8, cy + halfL, zSouth + 0.4], [cx + halfW - 0.8, cy + halfL, zSouth + 0.4], [cx + halfW - 0.8, cy + halfL, cabinFloorZ], [cx - halfW + 0.8, cy + halfL, cabinFloorZ]],
      chassisCol,
      chassisTrim,
      1.2
    );

    // 2. Level Bright-Yellow & Cream Historic Carris Wooden Cabin (stays horizontal while climbing!)
    const bodyCol = fun.bodyColor || '#eab308';
    const upperCol = fun.upperColor || '#fffbeb';
    const accentCol = fun.accentColor || '#92400e';
    const winCol = isEvening ? '#fef08a' : '#1e3a5f';

    const faces = [
      { a: [cx - halfW, cy + halfL], b: [cx + halfW, cy + halfL], isEnd: true, shade: 1.0, mid: [cx, cy + halfL] },
      { a: [cx + halfW, cy - halfL], b: [cx - halfW, cy - halfL], isEnd: true, shade: 0.84, mid: [cx, cy - halfL] },
      { a: [cx - halfW, cy - halfL], b: [cx - halfW, cy + halfL], isEnd: false, shade: 0.92, mid: [cx - halfW, cy] },
      { a: [cx + halfW, cy + halfL], b: [cx + halfW, cy - halfL], isEnd: false, shade: 0.8, mid: [cx + halfW, cy] }
    ];
    faces.sort((u, v) => Math.hypot(v.mid[0] - cam.camX, v.mid[1] - cam.camY) - Math.hypot(u.mid[0] - cam.camX, u.mid[1] - cam.camY));

    for (const f of faces) {
      const [ax, ay] = f.a;
      const [bx, by] = f.b;
      const lw = (u, z) => [ax + (bx - ax) * u, ay + (by - ay) * u, z];
      const lowerPoly = this.drawPoly3D(
        ctx,
        cam,
        [lw(0, cabinFloorZ), lw(1, cabinFloorZ), lw(1, cabinMidZ), lw(0, cabinMidZ)],
        shadeColor(bodyCol, f.shade, isEvening),
        '#334155',
        1.1
      );
      const upperPoly = this.drawPoly3D(
        ctx,
        cam,
        [lw(0, cabinMidZ), lw(1, cabinMidZ), lw(1, cabinTopZ), lw(0, cabinTopZ)],
        shadeColor(upperCol, f.shade, isEvening),
        '#334155',
        1.1
      );
      if (lowerPoly) this.lastHitTargets.push({ kind: 'funicular', id: fun.id, funicular: fun, poly: lowerPoly });
      if (upperPoly) this.lastHitTargets.push({ kind: 'funicular', id: fun.id, funicular: fun, poly: upperPoly });
      // Signature Carris accent stripe below windows
      this.drawPoly3D(ctx, cam, [lw(0, cabinMidZ - 3.5), lw(1, cabinMidZ - 3.5), lw(1, cabinMidZ), lw(0, cabinMidZ)], shadeColor(accentCol, f.shade, isEvening));

      if (!f.isEnd) {
        // 4 arched wooden-framed side cabin windows
        for (let wi = 0; wi < 4; wi += 1) {
          const u0 = 0.08 + wi * 0.22;
          const u1 = u0 + 0.16;
          this.drawPoly3D(ctx, cam, [lw(u0, cabinMidZ + 2), lw(u1, cabinMidZ + 2), lw(u1, cabinTopZ - 3), lw(u0, cabinTopZ - 3)], winCol, '#78350f', 1.0);
        }
      } else {
        // Front / Rear driver vestibule glazing + gleaming brass headlamp!
        this.drawPoly3D(ctx, cam, [lw(0.14, cabinMidZ + 2), lw(0.86, cabinMidZ + 2), lw(0.86, cabinTopZ - 3), lw(0.14, cabinTopZ - 3)], winCol, '#78350f', 1.1);
        const lampPt = this.projectWorldPt(cam, ...lw(0.5, cabinFloorZ + 11));
        if (lampPt) {
          const lr = clamp((4.2 * this.focal) / lampPt.cz, 2, 8);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(lampPt.x, lampPt.y, lr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    // Curved Clerestory Wooden Roof + Overhead Electric Trolley Pole reaching exact hillside power wire!
    this.drawPoly3D(
      ctx,
      cam,
      [[cx - halfW - 1, cy - halfL - 1, cabinTopZ], [cx + halfW + 1, cy - halfL - 1, cabinTopZ], [cx + halfW + 1, cy + halfL + 1, cabinTopZ], [cx - halfW - 1, cy + halfL + 1, cabinTopZ]],
      shadeColor('#d6d3d1', 1.0, isEvening),
      '#57534e',
      1.1
    );
    this.drawPoly3D(
      ctx,
      cam,
      [[cx - halfW * 0.65, cy - halfL * 0.78, roofPeakZ], [cx + halfW * 0.65, cy - halfL * 0.78, roofPeakZ], [cx + halfW * 0.65, cy + halfL * 0.78, roofPeakZ], [cx - halfW * 0.65, cy + halfL * 0.78, roofPeakZ]],
      shadeColor('#a8a29e', 1.0, isEvening),
      '#44403c',
      1.0
    );
    const wireZ = Math.max(roofPeakZ + 14, getTerrainElevation(fun.trackX, cy) + 84);
    this.drawLine3D(ctx, cam, [cx, cy, roofPeakZ], [cx, cy, wireZ], '#334155', 2.0);
    this.drawLine3D(ctx, cam, [cx - 6, cy, wireZ], [cx + 6, cy, wireZ], '#1e293b', 2.2);

    // Unclipped Carris Emerald-and-Gold Destination Crest Board drawn cleanly atop the visible vestibule roof edge
    const crestY = cam.camY >= cy ? cy + halfL : cy - halfL;
    const badgePt = this.projectWorldPt(cam, cx, crestY, cabinTopZ + 5.5);
    if (badgePt && badgePt.cz < 390) {
      const fs = Math.max(7, Math.round(clamp((8.8 * this.focal) / badgePt.cz, 7, 13)));
      const label = fun.id === 'funicular-bica' ? 'BICA' : 'GLORIA';
      ctx.save();
      ctx.font = `800 ${fs}px Georgia, serif`;
      const tw = ctx.measureText(label).width + 10;
      const th = fs * 1.3;
      drawRoundedRect(ctx, badgePt.x - tw * 0.5, badgePt.y - th * 0.5, tw, th, 2.5);
      ctx.fillStyle = '#14532d';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(label, badgePt.x, badgePt.y + fs * 0.34);
      ctx.restore();
    }
  }

  drawFunicularStation3D(ctx, cam, fun, station, fromEnd, highlighted, isEvening) {
    const px = station.platformX;
    const py = station.platformY;
    const gz = getTerrainElevation(px, py);
    this.drawLine3D(ctx, cam, [px, py, gz], [px, py, gz + 54], '#1e293b', 2.8);
    const sign = this.projectWorldPt(cam, px, py, gz + 55);
    if (!sign) return;
    const s = clamp(this.focal / sign.cz, 0.4, 1.45);
    const bw = 46 * s;
    const bh = 20 * s;
    drawRoundedRect(ctx, sign.x - bw * 0.5, sign.y - bh * 0.5, bw, bh, 4);
    ctx.fillStyle = highlighted ? '#b45309' : '#14532d';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = highlighted ? 2.2 : 1.4;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.font = `800 ${Math.max(7, Math.round(8.2 * s))}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(fun.id === 'funicular-bica' ? 'BICA' : 'GLORIA', sign.x, sign.y - 1 * s);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${Math.max(6, Math.round(6.6 * s))}px "Segoe UI", sans-serif`;
    ctx.fillText(fromEnd === 'lower' ? 'UP HILL' : 'DOWN HILL', sign.x, sign.y + 7.2 * s);
    ctx.textAlign = 'left';
    const hitPoly = [
      { x: sign.x - bw * 0.6, y: sign.y - bh * 0.6 },
      { x: sign.x + bw * 0.6, y: sign.y - bh * 0.6 },
      { x: sign.x + bw * 0.6, y: sign.y + bh * 1.4 },
      { x: sign.x - bw * 0.6, y: sign.y + bh * 1.4 }
    ];
    this.lastHitTargets.push({ kind: 'funicular-station', id: fun.id, fromEnd, funicular: fun, station, poly: hitPoly });
  }

  drawTree3D(ctx, cam, tree, isEvening, monthInfo = getMonthInfo()) {
    const gz = getTerrainElevation(tree.x, tree.y);
    const base = this.projectWorldPt(cam, tree.x, tree.y, gz);
    const crown = this.projectWorldPt(cam, tree.x, tree.y, gz + 58);
    if (!base || !crown) return;
    const scale = this.focal / base.cz;
    const trunkW = clamp(7.5 * scale, 2.5, 20);
    const canopyR = clamp(28 * scale, 6, 78);
    const trunkH = Math.max(6, base.y - crown.y);
    const isJacaranda = tree.c === '#7a58ab';
    const foliageMode = monthInfo.foliageMode || 'bloom';

    // Seasonal Lisbon tree palette: Jacarandas burst vibrant purple in May/June, green in summer, amber in autumn, crisp olive in winter
    let treeColor = tree.c;
    let treeHighlight = tree.highlight;
    if (isJacaranda) {
      if (foliageMode === 'bloom') {
        treeColor = '#7a58ab';
        treeHighlight = '#b796e6';
      } else if (foliageMode === 'spring') {
        treeColor = (monthInfo.jacarandaBloom || 0) >= 0.3 ? '#766b9e' : '#4a8559';
        treeHighlight = (monthInfo.jacarandaBloom || 0) >= 0.3 ? '#a995d4' : '#79b885';
      } else if (foliageMode === 'lush') {
        treeColor = '#377a4d';
        treeHighlight = '#68b47c';
      } else if (foliageMode === 'autumn') {
        treeColor = '#b86d28';
        treeHighlight = '#e6a545';
      } else {
        treeColor = '#4e6357';
        treeHighlight = '#728a7c';
      }
    } else if (foliageMode === 'autumn') {
      treeColor = '#6f7339';
      treeHighlight = '#b59d4a';
    } else if (foliageMode === 'winter') {
      treeColor = '#3a624a';
      treeHighlight = '#5d8a6e';
    } else if (foliageMode === 'lush') {
      treeColor = '#2f7a48';
      treeHighlight = '#64ba7c';
    }

    // 1. Stone sidewalk tree-well curb ring & dappled ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
    ctx.beginPath();
    ctx.ellipse(base.x + canopyR * 0.1, base.y + 1, canopyR * 0.92, canopyR * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shadeColor('#d6cfc0', 0.92, isEvening);
    ctx.strokeStyle = shadeColor('#78716c', 0.9, isEvening);
    ctx.lineWidth = Math.max(1, 1.4 * scale);
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, trunkW * 1.45, Math.max(2.5, trunkW * 0.52), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shadeColor('#4a3728', 0.85, isEvening);
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, trunkW * 1.05, Math.max(1.8, trunkW * 0.36), 0, 0, Math.PI * 2);
    ctx.fill();

    // Fallen purple Jacaranda petals (May/June) OR fallen autumn leaves (Oct/Nov) around the tree base
    if (canopyR > 12 && ((isJacaranda && (monthInfo.jacarandaBloom || 0) >= 0.5) || foliageMode === 'autumn')) {
      ctx.fillStyle = shadeColor(foliageMode === 'autumn' ? '#d97706' : '#9b72cf', 0.95, isEvening);
      for (const [px, py] of [[-0.55, 0.08], [0.48, 0.12], [-0.25, 0.16], [0.22, -0.06], [0.62, -0.02]]) {
        ctx.beginPath();
        ctx.arc(base.x + px * canopyR, base.y + py * canopyR, Math.max(1.3, 2.2 * scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Tapered organic bark trunk rising cleanly into the canopy base + 2 lower side boughs
    const forkY = crown.y + canopyR * 0.36;
    ctx.fillStyle = shadeColor('#5c3d28', 0.92, isEvening);
    ctx.beginPath();
    ctx.moveTo(base.x - trunkW * 0.62, base.y);
    ctx.quadraticCurveTo(base.x - trunkW * 0.44, base.y - trunkH * 0.45, base.x - trunkW * 0.38, forkY);
    ctx.lineTo(base.x + trunkW * 0.38, forkY);
    ctx.quadraticCurveTo(base.x + trunkW * 0.44, base.y - trunkH * 0.45, base.x + trunkW * 0.62, base.y);
    ctx.closePath();
    ctx.fill();

    // Sunlit bark highlight ridge on left side of trunk
    ctx.fillStyle = shadeColor('#855b3e', 0.98, isEvening);
    ctx.beginPath();
    ctx.moveTo(base.x - trunkW * 0.52, base.y);
    ctx.quadraticCurveTo(base.x - trunkW * 0.36, base.y - trunkH * 0.45, base.x - trunkW * 0.3, forkY);
    ctx.lineTo(base.x - trunkW * 0.05, forkY);
    ctx.lineTo(base.x - trunkW * 0.16, base.y);
    ctx.closePath();
    ctx.fill();

    // Lower lateral wooden boughs branching seamlessly from the upper trunk into the side foliage clusters
    ctx.strokeStyle = shadeColor('#5c3d28', 0.9, isEvening);
    ctx.lineCap = 'round';
    for (const [startSide, bxOff, byOff, bWidth] of [
      [-0.22, -0.5, 0.2, 0.38],
      [0.22, 0.48, 0.2, 0.36]
    ]) {
      ctx.lineWidth = Math.max(1.4, trunkW * bWidth);
      ctx.beginPath();
      ctx.moveTo(base.x + trunkW * startSide, forkY + canopyR * 0.16);
      ctx.quadraticCurveTo(
        base.x + bxOff * canopyR * 0.52,
        forkY + canopyR * 0.04,
        crown.x + bxOff * canopyR,
        crown.y + byOff * canopyR
      );
      ctx.stroke();
    }

    // 3. Multi-layered volumetric 3D foliage canopy (deep shadow base -> mid clusters -> sunlit crown -> blossom highlights)
    const cDeep = shadeColor(treeColor, 0.72, isEvening);
    const cMain = shadeColor(treeColor, 0.94, isEvening);
    const cHi = shadeColor(treeHighlight, 1.04, isEvening);
    const cSpec = shadeColor(treeHighlight, 1.2, isEvening);

    for (const [ox, oy, mr, col] of [
      // Under-canopy shadow clusters
      [-0.58, 0.24, 0.48, cDeep],
      [0.56, 0.24, 0.46, cDeep],
      [0, 0.26, 0.54, cDeep],
      [-0.3, 0.2, 0.52, cDeep],
      [0.3, 0.2, 0.5, cDeep],
      // Rich mid-canopy bough clusters
      [-0.52, 0.04, 0.54, cMain],
      [0.5, 0.06, 0.52, cMain],
      [-0.24, -0.08, 0.62, cMain],
      [0.24, -0.06, 0.58, cMain],
      [0, -0.22, 0.6, cMain],
      // Sunlit upper crown puffs
      [-0.42, -0.06, 0.38, cHi],
      [0.38, -0.04, 0.36, cHi],
      [-0.12, -0.28, 0.44, cHi],
      [0.16, -0.22, 0.38, cHi],
      // Top blossom / leaf clusters catching direct Lisbon sunlight
      [-0.22, -0.34, 0.24, cSpec],
      [0.08, -0.32, 0.22, cSpec],
      [-0.44, -0.12, 0.2, cSpec],
      [0.34, -0.1, 0.18, cSpec]
    ]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(crown.x + ox * canopyR, crown.y + oy * canopyR, canopyR * mr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawStreetlamp3D(ctx, cam, lamp, isEvening, isGolden) {
    const gz = getTerrainElevation(lamp.x, lamp.y);
    this.drawLine3D(ctx, cam, [lamp.x, lamp.y, gz], [lamp.x, lamp.y, gz + 64], '#1e293b', 2.4);
    const top = this.projectWorldPt(cam, lamp.x, lamp.y, gz + 66);
    if (!top) return;
    const r = clamp((5.5 * this.focal) / top.cz, 2, 11);
    if (isEvening || isGolden) {
      const glow = ctx.createRadialGradient(top.x, top.y, 1, top.x, top.y, r * 5.5);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      glow.addColorStop(0.45, 'rgba(251, 191, 36, 0.25)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(top.x, top.y, r * 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = isEvening || isGolden ? '#fef08a' : '#e2e8f0';
    ctx.beginPath();
    ctx.arc(top.x, top.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  drawBench3D(ctx, cam, spot, captured, isEvening) {
    const gz = getTerrainElevation(spot.x, spot.y);
    this.drawPoly3D(
      ctx,
      cam,
      [[spot.x - 20, spot.y - 6, gz + 10], [spot.x + 20, spot.y - 6, gz + 10], [spot.x + 20, spot.y + 6, gz + 10], [spot.x - 20, spot.y + 6, gz + 10]],
      shadeColor('#8b5a34', 1, isEvening),
      '#472d1b',
      1.2
    );
    this.drawPoly3D(
      ctx,
      cam,
      [[spot.x - 20, spot.y - 6, gz + 10], [spot.x + 20, spot.y - 6, gz + 10], [spot.x + 20, spot.y - 6, gz + 20], [spot.x - 20, spot.y - 6, gz + 20]],
      shadeColor(captured ? '#0f766e' : '#1b4d89', 1, isEvening),
      '#f8fafc',
      1
    );
    this.drawLine3D(ctx, cam, [spot.x - 16, spot.y, gz], [spot.x - 16, spot.y, gz + 10], '#334155', 2);
    this.drawLine3D(ctx, cam, [spot.x + 16, spot.y, gz], [spot.x + 16, spot.y, gz + 10], '#334155', 2);
  }

  drawRiversideBench3D(ctx, cam, bench, highlighted = false, isSeated = false, isEvening = false) {
    // Classic Ribeira das Naus wooden slat & cast-iron riverside promenade bench facing the Tagus River
    if (isSeated) return; // Avoid clipping the bench seat right in front of the seated first-person camera
    const x = bench.x;
    const y = bench.y;
    const edgeStroke = highlighted ? '#facc15' : '#472d1b';
    const edgeW = highlighted ? 2.2 : 1.1;
    // Contact shadow
    this.drawPoly3D(
      ctx,
      cam,
      [[x - 20, y - 6, 0.3], [x + 20, y - 6, 0.3], [x + 20, y + 6, 0.3], [x - 20, y + 6, 0.3]],
      highlighted ? 'rgba(250, 204, 21, 0.24)' : 'rgba(15, 23, 42, 0.22)'
    );
    // Cast-iron legs & curved armrests
    for (const lx of [x - 16, x + 16]) {
      this.drawLine3D(ctx, cam, [lx, y - 4, 0], [lx, y - 4, 15], '#1e293b', 2.2);
      this.drawLine3D(ctx, cam, [lx, y + 4, 0], [lx, y + 4, 11], '#1e293b', 2.2);
    }
    // Warm cedar seat & backrest slats (backrest on north side so bench looks south over the Tagus!)
    const seatPoly = this.drawPoly3D(
      ctx,
      cam,
      [[x - 19, y - 4, 9], [x + 19, y - 4, 9], [x + 19, y + 5, 9], [x - 19, y + 5, 9]],
      shadeColor('#a16236', 1.0, isEvening),
      edgeStroke,
      edgeW
    );
    const backPoly = this.drawPoly3D(
      ctx,
      cam,
      [[x - 19, y - 5, 11], [x + 19, y - 5, 11], [x + 19, y - 5, 19], [x - 19, y - 5, 19]],
      shadeColor('#8b522c', 0.95, isEvening),
      edgeStroke,
      edgeW
    );
    if (seatPoly) this.lastHitTargets.push({ kind: 'riverside-bench', id: bench.id, bench, poly: seatPoly });
    if (backPoly) this.lastHitTargets.push({ kind: 'riverside-bench', id: bench.id, bench, poly: backPoly });
  }

  drawJogger3D(ctx, cam, jog, isEvening) {
    // Athletic warm-month Tagus riverside jogger with lively running stride, singlet, running shorts & sneakers
    const foot = this.projectWorldPt(cam, jog.x, jog.y, 0);
    const head = this.projectWorldPt(cam, jog.x, jog.y, 31);
    if (!foot || !head) return;
    const h = Math.max(8, foot.y - head.y);
    const w = h * 0.42;
    const stride = Math.sin(jog.walkPhase || 0) * h * 0.16;
    const bounce = Math.abs(Math.cos(jog.walkPhase || 0)) * h * 0.05;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y, w * 0.65, w * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dynamic running legs + white sneakers
    ctx.fillStyle = shadeColor('#eab996', 1, isEvening);
    ctx.fillRect(foot.x - w * 0.32, foot.y - h * 0.34 - bounce + stride * 0.6, w * 0.22, h * 0.32);
    ctx.fillRect(foot.x + w * 0.1, foot.y - h * 0.34 - bounce - stride * 0.6, w * 0.22, h * 0.32);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(foot.x - w * 0.36, foot.y - h * 0.06 - bounce + stride * 0.6, w * 0.3, h * 0.07);
    ctx.fillRect(foot.x + w * 0.08, foot.y - h * 0.06 - bounce - stride * 0.6, w * 0.3, h * 0.07);

    // Athletic running shorts & vibrant technical singlet
    ctx.fillStyle = shadeColor(jog.shorts || '#0f172a', 1, isEvening);
    ctx.fillRect(foot.x - w * 0.36, foot.y - h * 0.44 - bounce, w * 0.72, h * 0.16);
    ctx.fillStyle = shadeColor(jog.shirt || '#0ea5e9', 1, isEvening);
    drawRoundedRect(ctx, foot.x - w * 0.38, head.y + h * 0.27 - bounce, w * 0.76, h * 0.34, Math.max(2, w * 0.14));
    ctx.fill();

    // Pumping runner arms
    ctx.strokeStyle = shadeColor('#eab996', 1, isEvening);
    ctx.lineWidth = Math.max(1.5, w * 0.18);
    ctx.beginPath();
    ctx.moveTo(foot.x - w * 0.36, head.y + h * 0.34 - bounce);
    ctx.lineTo(foot.x - w * 0.56, head.y + h * 0.46 - bounce - stride * 0.5);
    ctx.moveTo(foot.x + w * 0.36, head.y + h * 0.34 - bounce);
    ctx.lineTo(foot.x + w * 0.56, head.y + h * 0.46 - bounce + stride * 0.5);
    ctx.stroke();

    // Head, hair & white athletic sweatband
    const headR = h * 0.14;
    ctx.fillStyle = shadeColor('#f0c4a2', 1, isEvening);
    ctx.beginPath();
    ctx.arc(foot.x, head.y + headR - bounce, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shadeColor(jog.hair || '#3b2b20', 1, isEvening);
    ctx.beginPath();
    ctx.arc(foot.x, head.y + headR * 0.8 - bounce, headR * 1.04, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(foot.x - headR * 0.96, head.y + headR * 0.62 - bounce, headR * 1.92, Math.max(1.5, headR * 0.24));
  }

  drawTransitStop3D(ctx, cam, stop, highlighted, isEvening) {
    const px = stop.platformX;
    const py = stop.platformY;
    const gz = getTerrainElevation(px, py);
    this.drawLine3D(ctx, cam, [px, py, gz], [px, py, gz + 50], '#334155', 2.4);
    const sign = this.projectWorldPt(cam, px, py, gz + 50);
    if (!sign) return;
    const s = clamp(this.focal / sign.cz, 0.35, 1.3);
    const bw = 22 * s;
    const bh = 16 * s;
    drawRoundedRect(ctx, sign.x - bw * 0.5, sign.y - bh * 0.5, bw, bh, 3);
    ctx.fillStyle = stop.mode === 'tram' ? '#eab308' : '#157a5d';
    ctx.fill();
    ctx.strokeStyle = highlighted ? '#fde047' : '#ffffff';
    ctx.lineWidth = highlighted ? 2 : 1.2;
    ctx.stroke();
    ctx.fillStyle = stop.mode === 'tram' ? '#1e293b' : '#ffffff';
    ctx.font = `800 ${Math.max(7, Math.round(8.5 * s))}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(stop.routeNumber || (stop.mode === 'tram' ? '28E' : '737'), sign.x, sign.y + 3 * s);
    ctx.textAlign = 'left';
  }

  drawPerson3D(ctx, cam, person, isEvening, monthInfo = getMonthInfo(), animTime = 0) {
    const gz = getTerrainElevation(person.x, person.y);
    const partyBounce = person.partyBob ? Math.abs(Math.sin(animTime * 4.2 + (person.phaseOffset || 0))) * 1.4 : 0;
    const foot = this.projectWorldPt(cam, person.x, person.y, gz);
    const head = this.projectWorldPt(cam, person.x, person.y, gz + 32 + partyBounce);
    if (!foot || !head) return;
    const h = Math.max(8, foot.y - head.y);
    const w = h * 0.44;
    const outfit = getOutfitById(person.outfitId);
    const stride = person.isMoving ? Math.sin(person.walkPhase || 0) * h * 0.08 : 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y, w * 0.62, w * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = shadeColor(outfit.pantsColor, 1, isEvening);
    ctx.fillRect(foot.x - w * 0.34, foot.y - h * 0.36 + stride * 0.5, w * 0.26, h * 0.36 - stride * 0.5);
    ctx.fillRect(foot.x + w * 0.08, foot.y - h * 0.36 - stride * 0.5, w * 0.26, h * 0.36 + stride * 0.5);

    // Distinct cloth silhouette torso (dress / poncho / trench / sailor / overalls / blazer)
    const bodyTop = head.y + h * 0.27;
    const bodyH = h * 0.42;
    ctx.fillStyle = shadeColor(outfit.primaryColor, 1, isEvening);
    if (outfit.styleType === 'dress' || outfit.styleType === 'poncho') {
      ctx.beginPath();
      ctx.moveTo(foot.x - w * 0.36, bodyTop);
      ctx.lineTo(foot.x + w * 0.36, bodyTop);
      ctx.lineTo(foot.x + w * 0.56, bodyTop + bodyH + h * 0.1);
      ctx.lineTo(foot.x - w * 0.56, bodyTop + bodyH + h * 0.1);
      ctx.closePath();
      ctx.fill();
    } else {
      drawRoundedRect(ctx, foot.x - w * 0.44, bodyTop, w * 0.88, bodyH, Math.max(2, w * 0.16));
      ctx.fill();
    }

    // Accent trim (scarf / stripes / sash / suspenders)
    ctx.fillStyle = shadeColor(outfit.secondaryColor, 1, isEvening);
    ctx.fillRect(foot.x - w * 0.34, bodyTop + bodyH * 0.22, w * 0.68, Math.max(2, bodyH * 0.18));

    // Head & friendly facial eyes when close
    const headR = h * 0.14;
    ctx.fillStyle = shadeColor(outfit.skinColor || '#f1c7a6', 1, isEvening);
    ctx.beginPath();
    ctx.arc(foot.x, head.y + headR, headR, 0, Math.PI * 2);
    ctx.fill();
    if (headR >= 5) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(foot.x - headR * 0.34, head.y + headR * 1.05, Math.max(1.1, headR * 0.14), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(foot.x + headR * 0.34, head.y + headR * 1.05, Math.max(1.1, headR * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }

    // Hair / Hat silhouette
    ctx.fillStyle = shadeColor(outfit.hairColor || '#3b2b20', 1, isEvening);
    ctx.beginPath();
    ctx.arc(foot.x, head.y + headR * 0.82, headR * 1.04, Math.PI, Math.PI * 2);
    ctx.fill();
    if (outfit.hatType === 'sunhat' || outfit.hatType === 'fedora') {
      ctx.fillStyle = outfit.hatType === 'sunhat' ? '#e5c17b' : '#4b3b2f';
      ctx.fillRect(foot.x - headR * 1.45, head.y + headR * 0.25, headR * 2.9, Math.max(2, headR * 0.35));
    }

    // Raised celebratory drink glass / tumbler for Bairro Alto evening street-party revelers!
    if (person.holdingDrink && h > 13) {
      const toastWave = Math.sin(animTime * 3.6 + (person.phaseOffset || 0));
      const lift = (toastWave > 0.25 ? 0.09 : 0.02) * h;
      const gx = foot.x + w * 0.58;
      const gy = head.y + h * 0.42 - lift;
      ctx.strokeStyle = shadeColor(outfit.skinColor || '#f1c7a6', 1, isEvening);
      ctx.lineWidth = Math.max(1.5, w * 0.14);
      ctx.beginPath();
      ctx.moveTo(foot.x + w * 0.34, head.y + h * 0.48);
      ctx.lineTo(gx, gy + h * 0.03);
      ctx.stroke();
      const gw = Math.max(3.2, w * 0.22);
      const gh = Math.max(4.8, h * 0.115);
      // Tapered cocktail tumbler / imperial beer glass with subtle garnish or foam cap
      ctx.fillStyle = person.holdingDrink;
      ctx.beginPath();
      ctx.moveTo(gx - gw * 0.55, gy - gh);
      ctx.lineTo(gx + gw * 0.55, gy - gh);
      ctx.lineTo(gx + gw * 0.36, gy);
      ctx.lineTo(gx - gw * 0.36, gy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      if (person.drinkType === 'imperial') {
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(gx - gw * 0.55, gy - gh - Math.max(1.4, gh * 0.22), gw * 1.1, Math.max(1.4, gh * 0.22));
      } else if (person.drinkType === 'caipirinha' || person.drinkType === 'sangria') {
        // Cocktail straw & lime/berry garnish on rim
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = Math.max(1, gw * 0.14);
        ctx.beginPath();
        ctx.moveTo(gx + gw * 0.1, gy - gh * 0.3);
        ctx.lineTo(gx + gw * 0.45, gy - gh * 1.35);
        ctx.stroke();
      }
      // Show cheerful rotating Portuguese toast bubble ("Saude!", "Ginjinha!", "Viva o Bairro Alto!")
      const cycleSlot = Math.floor(animTime / 2.6) % 7;
      if (person.emoteText && (person.emoteCycleIndex == null || person.emoteCycleIndex % 3 === cycleSlot % 3) && h > 22) {
        const fs = clamp(Math.round(h * 0.15), 8, 12);
        ctx.save();
        ctx.font = `700 ${fs}px "Segoe UI", sans-serif`;
        const ew = ctx.measureText(person.emoteText).width + 12;
        drawRoundedRect(ctx, foot.x - ew * 0.5, head.y - fs - 10, ew, fs + 7, 5);
        ctx.fillStyle = 'rgba(254, 243, 199, 0.94)';
        ctx.fill();
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#4a1d5e';
        ctx.textAlign = 'center';
        ctx.fillText(person.emoteText, foot.x, head.y - 6);
        ctx.restore();
      }
    }

    // Pedestrians carry rain umbrellas during rainy Atlantic months (Nov/Dec/Jan/Oct)
    if ((monthInfo.rainIntensity || 0) >= 0.4 && h > 14 && !person.skipRainUmbrella) {
      const uColors = ['#1d4ed8', '#b91c1c', '#0f766e', '#ca8a04', '#4338ca'];
      const uCol = uColors[Math.abs(Math.round(person.x)) % uColors.length];
      const uTop = head.y - h * 0.24;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(1.2, w * 0.08);
      ctx.beginPath();
      ctx.moveTo(foot.x + w * 0.24, head.y + h * 0.38);
      ctx.lineTo(foot.x + w * 0.14, uTop);
      ctx.stroke();
      ctx.fillStyle = shadeColor(uCol, 1, isEvening);
      ctx.beginPath();
      ctx.arc(foot.x + w * 0.14, uTop + h * 0.08, w * 1.15, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Floating LAN multiplayer nameplate & wave bubble
    if (person.label && h > 18) {
      const fs = clamp(Math.round(h * 0.16), 9, 13);
      ctx.save();
      ctx.font = `700 ${fs}px "Segoe UI", sans-serif`;
      const tw = ctx.measureText(person.label).width + 12;
      drawRoundedRect(ctx, foot.x - tw * 0.5, head.y - fs - 10, tw, fs + 6, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(person.label, foot.x, head.y - 8);
      if (person.emoteText) {
        const ew = ctx.measureText(person.emoteText).width + 14;
        drawRoundedRect(ctx, foot.x - ew * 0.5, head.y - fs * 2 - 20, ew, fs + 8, 6);
        ctx.fillStyle = '#fef3c7';
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#78350f';
        ctx.fillText(person.emoteText, foot.x, head.y - fs - 16);
      }
      ctx.restore();
    }
  }

  drawOverheadTramWire(ctx, cam, isEvening) {
    const startX = Math.max(200, Math.floor((cam.camX - 700) / 50) * 50);
    const endX = Math.min(2200, Math.ceil((cam.camX + 700) / 50) * 50);
    const col = isEvening ? 'rgba(148, 163, 184, 0.45)' : 'rgba(51, 65, 85, 0.52)';
    for (let wx = startX; wx < endX; wx += 50) {
      const wx2 = Math.min(endX, wx + 50);
      this.drawLine3D(ctx, cam, [wx, 610, getTerrainElevation(wx, 610) + 96], [wx2, 610, getTerrainElevation(wx2, 610) + 96], col, 1.2);
    }
    // Overhead hillside power wires above Elevador da Bica & Elevador da Gloria funicular tracks!
    for (const fun of FUNICULAR_LINES) {
      if (Math.abs(fun.trackX - cam.camX) > 650) continue;
      for (let fy = fun.topY; fy < fun.bottomY; fy += 48) {
        const fy2 = Math.min(fun.bottomY, fy + 48);
        this.drawLine3D(
          ctx,
          cam,
          [fun.trackX, fy, getTerrainElevation(fun.trackX, fy) + 84],
          [fun.trackX, fy2, getTerrainElevation(fun.trackX, fy2) + 84],
          col,
          1.1
        );
      }
    }
  }

  drawSeasonalProp3D(ctx, cam, prop, isEvening, animTime, highlighted = false) {
    const gz = getTerrainElevation(prop.x, prop.y);
    const base = this.projectWorldPt(cam, prop.x, prop.y, gz);
    if (!base) return;
    const scale = this.focal / base.cz;

    if (prop.type === 'christmas-tree') {
      // Grand Lisboa Arvore de Natal with tiered emerald boughs, twinkling fairy lights & golden star topper
      const h = prop.r >= 20 ? 116 : 86;
      const top = this.projectWorldPt(cam, prop.x, prop.y, gz + h);
      if (!top) return;
      const th = Math.max(16, base.y - top.y);
      const tw = th * 0.54;

      // Pedestal pot
      ctx.fillStyle = shadeColor('#881320', 0.95, isEvening);
      ctx.fillRect(base.x - tw * 0.18, base.y - th * 0.1, tw * 0.36, th * 0.1);

      // 4 layered evergreen cones
      for (let tier = 0; tier < 4; tier += 1) {
        const yBot = base.y - th * (0.09 + tier * 0.21);
        const yTip = base.y - th * (0.38 + tier * 0.2);
        const halfW = tw * (0.56 - tier * 0.11);
        ctx.fillStyle = shadeColor(tier % 2 === 0 ? '#14532d' : '#166534', 1.0, isEvening);
        ctx.beginPath();
        ctx.moveTo(base.x - halfW, yBot);
        ctx.lineTo(base.x + halfW, yBot);
        ctx.lineTo(base.x, yTip);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
        ctx.lineWidth = Math.max(1, scale * 1.4);
        ctx.stroke();
      }

      // Twinkling holiday fairy lights & ornaments
      const bulbCols = ['#fde047', '#ef4444', '#fef9c3', '#38bdf8', '#f59e0b'];
      for (let i = 0; i < 16; i += 1) {
        const u = (i + 1) / 17;
        const spread = (1 - u) * tw * 0.46;
        const bx = base.x + Math.sin(i * 2.4) * spread;
        const by = base.y - th * (0.14 + u * 0.74);
        const twinkle = 0.65 + 0.35 * Math.sin(animTime * 4.5 + i * 1.3);
        const r = Math.max(1.8, tw * 0.045 * twinkle);
        ctx.fillStyle = bulbCols[i % bulbCols.length];
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing golden Christmas star topper
      const starR = Math.max(4, tw * 0.15);
      const glow = ctx.createRadialGradient(top.x, top.y, 1, top.x, top.y, starR * 2.8);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      glow.addColorStop(0.5, 'rgba(250, 204, 21, 0.38)');
      glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(top.x, top.y, starR * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      for (let k = 0; k < 8; k += 1) {
        const ang = (k * Math.PI) / 4;
        const rad = k % 2 === 0 ? starR : starR * 0.42;
        const sx = top.x + Math.cos(ang) * rad;
        const sy = top.y + Math.sin(ang) * rad;
        if (k === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (prop.type === 'chestnut-cart') {
      // Authentic True-3D Lisbon Castanhas Assadas Charcoal Roaster Cart (Assador de Castanhas)
      const cx = prop.x;
      const cy = prop.y;
      const hw = 10;
      const hd = 6.5;
      const zBot = gz + 4.5;
      const zTop = gz + 18.5;

      // Ground contact shadow
      this.drawPoly3D(
        ctx,
        cam,
        [[cx - hw - 3, cy - hd - 2, gz + 0.25], [cx + hw + 3, cy - hd - 2, gz + 0.25], [cx + hw + 3, cy + hd + 2, gz + 0.25], [cx - hw - 3, cy + hd + 2, gz + 0.25]],
        'rgba(15, 23, 42, 0.28)'
      );

      // Spoked iron cart wheels & push handles
      for (const wx of [cx - hw + 2, cx + hw - 2]) {
        const wPt = this.projectWorldPt(cam, wx, cy + hd * 0.7, gz + 4.2);
        if (wPt) {
          const wr = clamp((4.2 * this.focal) / wPt.cz, 2.5, 16);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = Math.max(1.5, wr * 0.22);
          ctx.beginPath();
          ctx.arc(wPt.x, wPt.y, wr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(wPt.x, wPt.y, Math.max(1, wr * 0.24), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      this.drawLine3D(ctx, cam, [cx - hw, cy - 3, gz + 14], [cx - hw - 8, cy - 3, gz + 16], '#78350f', 2.4);
      this.drawLine3D(ctx, cam, [cx - hw, cy + 3, gz + 14], [cx - hw - 8, cy + 3, gz + 16], '#78350f', 2.4);

      // 3D Iron Firebox Body (back-to-front visible faces) + clickable hit registration
      const bodyDark = shadeColor('#1f2937', 0.9, isEvening);
      const bodySide = shadeColor('#334155', 0.95, isEvening);
      const bodyTrim = highlighted ? '#facc15' : '#9ca3af';
      const trimW = highlighted ? 2.2 : 1.1;
      const pNorth = this.drawPoly3D(
        ctx,
        cam,
        [[cx - hw, cy - hd, zBot], [cx + hw, cy - hd, zBot], [cx + hw, cy - hd, zTop], [cx - hw, cy - hd, zTop]],
        bodyDark,
        bodyTrim,
        trimW
      );
      const pWest = this.drawPoly3D(
        ctx,
        cam,
        [[cx - hw, cy - hd, zBot], [cx - hw, cy + hd, zBot], [cx - hw, cy + hd, zTop], [cx - hw, cy - hd, zTop]],
        bodySide,
        bodyTrim,
        trimW
      );
      const pEast = this.drawPoly3D(
        ctx,
        cam,
        [[cx + hw, cy - hd, zBot], [cx + hw, cy + hd, zBot], [cx + hw, cy + hd, zTop], [cx + hw, cy - hd, zTop]],
        bodySide,
        bodyTrim,
        trimW
      );
      const pSouth = this.drawPoly3D(
        ctx,
        cam,
        [[cx - hw, cy + hd, zBot], [cx + hw, cy + hd, zBot], [cx + hw, cy + hd, zTop], [cx - hw, cy + hd, zTop]],
        bodyDark,
        bodyTrim,
        trimW
      );
      for (const poly of [pNorth, pWest, pEast, pSouth]) {
        if (poly && prop.id) this.lastHitTargets.push({ kind: 'castanha-cart', id: prop.id, prop, poly });
      }

      // Glowing charcoal ember slit on front & west faces of the roaster drum
      this.drawPoly3D(
        ctx,
        cam,
        [[cx - hw - 0.1, cy - 3.5, gz + 9.5], [cx - hw - 0.1, cy + 3.5, gz + 9.5], [cx - hw - 0.1, cy + 3.5, gz + 13], [cx - hw - 0.1, cy - 3.5, gz + 13]],
        '#ea580c',
        '#fde047',
        0.9
      );
      this.drawPoly3D(
        ctx,
        cam,
        [[cx - 5.5, cy - hd - 0.1, gz + 9.5], [cx + 5.5, cy - hd - 0.1, gz + 9.5], [cx + 5.5, cy - hd - 0.1, gz + 13], [cx - 5.5, cy - hd - 0.1, gz + 13]],
        '#ea580c',
        '#fde047',
        0.9
      );

      // Top roasting tray mounded with hot roasted chestnuts & stacked folded kraft paper cones (cartuchos de papel!)
      this.drawPoly3D(
        ctx,
        cam,
        [[cx - hw, cy - hd, zTop], [cx + hw, cy - hd, zTop], [cx + hw, cy + hd, zTop], [cx - hw, cy + hd, zTop]],
        '#451a03',
        '#d97706',
        1.1
      );
      this.drawPoly3D(
        ctx,
        cam,
        [[cx - 6.5, cy - 4, zTop + 0.4], [cx + 5.5, cy - 4, zTop + 0.4], [cx + 5.5, cy + 4, zTop + 0.4], [cx - 6.5, cy + 4, zTop + 0.4]],
        '#7c2d12',
        '#f97316',
        0.9
      );
      // 3 folded white/kraft paper cones brimming with glossy brown roasted chestnuts ready to buy (3.00 EUR)!
      for (const [coneOx, coneOy] of [[-5.5, -2.5], [-2.5, 1.5], [1.5, -2.5]]) {
        const cPt = this.projectWorldPt(cam, cx + coneOx, cy + coneOy, zTop + 1.2);
        if (!cPt) continue;
        const cs = clamp(this.focal / cPt.cz, 0.35, 1.8);
        ctx.fillStyle = '#f5e6c8';
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = Math.max(0.9, 0.8 * cs);
        ctx.beginPath();
        ctx.moveTo(cPt.x, cPt.y + 1.5 * cs);
        ctx.lineTo(cPt.x - 2.8 * cs, cPt.y - 5.2 * cs);
        ctx.lineTo(cPt.x + 2.8 * cs, cPt.y - 5.2 * cs);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Glossy roasted chestnuts peeking out top of each folded paper cone
        ctx.fillStyle = '#5c2808';
        for (const [nx, ny] of [[-1.2, -5.4], [0.2, -6.0], [1.3, -5.2]]) {
          ctx.beginPath();
          ctx.arc(cPt.x + nx * cs, cPt.y + ny * cs, 1.15 * cs, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Crisp price sign on the roaster ("3 EUR")
      const signPt = this.projectWorldPt(cam, cx - hw * 0.4, cy - hd * 0.5, gz + 15.8);
      if (signPt && signPt.cz < 240) {
        const ss = clamp(this.focal / signPt.cz, 0.5, 1.4);
        const bw = 54 * ss;
        const bh = 13 * ss;
        drawRoundedRect(ctx, signPt.x - bw * 0.5, signPt.y - bh * 0.5, bw, bh, 3);
        ctx.fillStyle = highlighted ? '#fef08a' : '#fff7ed';
        ctx.fill();
        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#7c2d12';
        ctx.font = `800 ${Math.max(7, Math.round(7.5 * ss))}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('CONES 3 EUR', signPt.x, signPt.y + 2.8 * ss);
        ctx.textAlign = 'left';
      }

      // Tall iron chimney smokestack rising from corner of cart + warm curling woodsmoke puffs
      const stackX = cx + hw - 2.5;
      const stackY = cy + hd - 2;
      this.drawLine3D(ctx, cam, [stackX, stackY, zTop], [stackX, stackY, gz + 34], '#334155', Math.max(2.5, scale * 3.2));
      this.drawLine3D(ctx, cam, [stackX - 2, stackY, gz + 34.5], [stackX + 2, stackY, gz + 34.5], '#64748b', 2.2);

      // Striped Portuguese terracotta/cream rain canopy umbrella mounted along the riverfront side of the cart
      const canopyPoleX = cx - 2;
      const canopyPoleY = cy + 6;
      this.drawLine3D(ctx, cam, [canopyPoleX, canopyPoleY, zBot], [canopyPoleX, canopyPoleY, gz + 45], '#64748b', 2.2);
      const canopyTop = this.projectWorldPt(cam, canopyPoleX, canopyPoleY, gz + 46);
      if (canopyTop) {
        const cr = clamp((22 * this.focal) / canopyTop.cz, 8, 92);
        ctx.fillStyle = shadeColor('#b45309', 1, isEvening);
        ctx.beginPath();
        ctx.moveTo(canopyTop.x - cr, canopyTop.y + cr * 0.34);
        ctx.quadraticCurveTo(canopyTop.x, canopyTop.y - cr * 0.24, canopyTop.x + cr, canopyTop.y + cr * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shadeColor('#fef3c7', 0.94, isEvening);
        ctx.beginPath();
        ctx.moveTo(canopyTop.x - cr * 0.36, canopyTop.y + cr * 0.33);
        ctx.lineTo(canopyTop.x, canopyTop.y + cr * 0.02);
        ctx.lineTo(canopyTop.x + cr * 0.36, canopyTop.y + cr * 0.33);
        ctx.closePath();
        ctx.fill();
      }

      const stackTop = this.projectWorldPt(cam, stackX, stackY, gz + 35);
      if (stackTop) {
        const sc = clamp(this.focal / stackTop.cz, 0.4, 2.2);
        for (let s = 0; s < 5; s += 1) {
          const rise = ((animTime * 0.65 + s * 0.2) % 1);
          const sy = stackTop.y - rise * 42 * sc;
          const sx = stackTop.x + Math.sin(animTime * 2.1 + s * 1.6) * 8 * sc;
          ctx.fillStyle = `rgba(226, 232, 240, ${(1 - rise) * 0.46})`;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(2.5, (4.5 + rise * 9.5) * sc), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    if (prop.type === 'summer-parasol') {
      // Striped sunlit Lisbon summer cafe terrace parasol
      const top = this.projectWorldPt(cam, prop.x, prop.y, gz + 52);
      if (!top) return;
      const ph = Math.max(12, base.y - top.y);
      const pr = ph * 0.52;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1.5, ph * 0.05);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();

      ctx.fillStyle = shadeColor(prop.color || '#0284c7', 1, isEvening);
      ctx.beginPath();
      ctx.moveTo(top.x - pr, top.y + ph * 0.24);
      ctx.quadraticCurveTo(top.x, top.y - ph * 0.12, top.x + pr, top.y + ph * 0.24);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 252, 244, 0.9)';
      ctx.beginPath();
      ctx.moveTo(top.x - pr * 0.35, top.y + ph * 0.23);
      ctx.lineTo(top.x, top.y + ph * 0.02);
      ctx.lineTo(top.x + pr * 0.35, top.y + ph * 0.23);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (prop.type === 'manjerico-stall') {
      // Santos Populares sweet basil manjerico pots with tiny paper poem flags
      const top = this.projectWorldPt(cam, prop.x, prop.y, gz + 26);
      if (!top) return;
      const sh = Math.max(10, base.y - top.y);
      const sw = sh * 1.1;
      ctx.fillStyle = shadeColor('#b84a32', 1, isEvening);
      ctx.fillRect(base.x - sw * 0.45, base.y - sh * 0.5, sw * 0.9, sh * 0.5);
      for (const ox of [-0.26, 0, 0.26]) {
        const px = base.x + sw * ox;
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(px, base.y - sh * 0.62, sh * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(px - sh * 0.08, base.y - sh * 0.98, sh * 0.22, sh * 0.16);
      }
    }
  }

  drawBairroPartyLights3D(ctx, cam, arch, partyLit, animTime) {
    // Authentic Top-of-Bairro-Alto overhead festoon party light strings spanning outside Bar da Noite & Sao Pedro!
    const { x, y0, y1, z } = arch;
    const steps = 8;
    const pts = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const wy = y0 + (y1 - y0) * t;
      const sag = Math.sin(t * Math.PI) * 11;
      const wz = getTerrainElevation(x, wy) + z - sag;
      const p = this.projectWorldPt(cam, x, wy, wz);
      if (p) pts.push({ p, t, i });
    }
    if (pts.length < 2) return;

    ctx.strokeStyle = partyLit ? 'rgba(244, 114, 182, 0.65)' : 'rgba(51, 65, 85, 0.45)';
    ctx.lineWidth = partyLit ? 1.8 : 1.1;
    ctx.beginPath();
    pts.forEach((entry, idx) => {
      if (idx === 0) ctx.moveTo(entry.p.x, entry.p.y);
      else ctx.lineTo(entry.p.x, entry.p.y);
    });
    ctx.stroke();

    const cols = ['#fde047', '#f472b6', '#fb923c', '#38bdf8', '#c084fc'];
    for (let i = 1; i < pts.length - 1; i += 1) {
      const { p } = pts[i];
      const s = clamp(this.focal / p.cz, 0.35, 1.5);
      const tw = 0.72 + 0.28 * Math.sin(animTime * 4.6 + x * 0.04 + i * 1.2);
      const col = cols[(i + Math.round(x / 50)) % cols.length];
      const r = Math.max(1.8, (partyLit ? 3.5 : 2.1) * s * tw);
      if (partyLit) {
        const gl = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, r * 4.5);
        gl.addColorStop(0, col);
        gl.addColorStop(0.45, 'rgba(253, 224, 71, 0.26)');
        gl.addColorStop(1, 'rgba(244, 114, 182, 0)');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = partyLit ? '#fffbeb' : col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSeasonalDecorArch3D(ctx, cam, arch, monthInfo, isEvening, animTime) {
    const style = monthInfo?.decorStyle;
    if (!style || !arch) return;
    const { x, y0, y1, z } = arch;

    const buildPts = (zBase, sag) => {
      const pts = [];
      const steps = 10;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const wy = y0 + (y1 - y0) * t;
        const wz = getTerrainElevation(x, wy) + zBase - Math.sin(t * Math.PI) * sag;
        const p = this.projectWorldPt(cam, x, wy, wz);
        if (p) pts.push({ p, t, wy, wz });
      }
      return pts;
    };

    if (style === 'christmas-lights' || style === 'janeiras-stars') {
      const isDec = style === 'christmas-lights';
      const pts = buildPts(z + 8, 12);
      if (pts.length < 2) return;

      // Luminous warm-gold arch cable
      ctx.strokeStyle = isDec ? 'rgba(253, 224, 71, 0.85)' : 'rgba(250, 204, 21, 0.65)';
      ctx.lineWidth = isDec ? 2.2 : 1.5;
      ctx.beginPath();
      pts.forEach((entry, idx) => {
        if (idx === 0) ctx.moveTo(entry.p.x, entry.p.y);
        else ctx.lineTo(entry.p.x, entry.p.y);
      });
      ctx.stroke();

      // Glowing golden LED bulbs & curtain icicles
      for (let i = 0; i < pts.length; i += 1) {
        const { p, t } = pts[i];
        const s = clamp(this.focal / p.cz, 0.3, 1.5);
        const twinkle = 0.72 + 0.28 * Math.sin(animTime * 4.2 + x * 0.03 + i);
        if (isDec) {
          ctx.strokeStyle = `rgba(254, 249, 195, ${0.42 * twinkle})`;
          ctx.lineWidth = Math.max(0.8, 1.1 * s);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + (9 + (i % 3) * 5) * s);
          ctx.stroke();
        }
        const bulbR = Math.max(1.8, (isDec ? 3.2 : 2.2) * s * twinkle);
        ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 3 === 1 ? '#fde68a' : '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, bulbR, 0, Math.PI * 2);
        ctx.fill();

        // Hanging 8-point illuminated Lisboa Christmas Star at the center of each arch
        if (Math.abs(t - 0.5) < 0.06) {
          const starR = clamp(12 * s, 4, 22);
          const sy = p.y + starR * 1.15;
          const glow = ctx.createRadialGradient(p.x, sy, 1, p.x, sy, starR * 2.4);
          glow.addColorStop(0, `rgba(254, 240, 138, ${0.9 * twinkle})`);
          glow.addColorStop(0.5, `rgba(250, 204, 21, ${0.32 * twinkle})`);
          glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, sy, starR * 2.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef9c3';
          ctx.beginPath();
          for (let k = 0; k < 8; k += 1) {
            const ang = (k * Math.PI) / 4;
            const rad = k % 2 === 0 ? starR : starR * 0.36;
            const sx = p.x + Math.cos(ang) * rad;
            const sy2 = sy + Math.sin(ang) * rad;
            if (k === 0) ctx.moveTo(sx, sy2);
            else ctx.lineTo(sx, sy2);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      return;
    }

    const palettes = {
      carnaval: ['#ec4899', '#facc15', '#06b6d4', '#10b981', '#ef4444'],
      'cravos-25-abril': ['#dc2626', '#15803d', '#dc2626', '#facc15'],
      'santos-populares': ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ffffff'],
      'alfama-fado': ['#881337', '#eab308', '#9f1239', '#fef08a'],
      'marathon-banners': ['#1d4ed8', '#facc15', '#0284c7', '#ffffff'],
      'autumn-leaves': ['#15803d', '#dc2626', '#d97706'],
      'summer-festival': ['#fef08a', '#fb923c', '#38bdf8', '#facc15']
    };
    const cols = palettes[style];
    if (!cols) return;

    const pts = buildPts(z, 14);
    if (pts.length < 2) return;

    ctx.strokeStyle = isEvening ? 'rgba(203, 213, 225, 0.5)' : 'rgba(51, 65, 85, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    pts.forEach((entry, idx) => {
      if (idx === 0) ctx.moveTo(entry.p.x, entry.p.y);
      else ctx.lineTo(entry.p.x, entry.p.y);
    });
    ctx.stroke();

    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i].p;
      const b = pts[i + 1].p;
      const s = clamp(this.focal / ((a.cz + b.cz) * 0.5), 0.25, 1.4);
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const sway = Math.sin(animTime * 3.2 + x * 0.04 + i) * 2.2 * s;

      if (style === 'summer-festival') {
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.arc(mx, my + 3 * s, Math.max(2, 3.6 * s), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(mx + sway, my + 11 * s);
        ctx.closePath();
        ctx.fill();
      }

      if (i === Math.floor((pts.length - 1) / 2)) {
        if (style === 'cravos-25-abril') {
          const crR = clamp(8 * s, 3, 15);
          ctx.fillStyle = '#15803d';
          ctx.fillRect(mx - crR * 0.2, my + crR * 0.8, crR * 0.4, crR * 1.1);
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(mx, my + crR * 0.5, crR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(mx - crR * 0.25, my + crR * 0.25, crR * 0.36, 0, Math.PI * 2);
          ctx.fill();
        } else if (style === 'santos-populares') {
          const lR = clamp(7.5 * s, 3, 14);
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(mx, my + lR * 1.2, lR, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }
  }

}

export const street3dPropMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    street3dPropMethods[key] = _Mixin.prototype[key];
  }
}
