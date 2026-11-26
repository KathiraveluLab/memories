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
  drawVenue3D(ctx, cam, venue, visited, highlighted, isEvening, isGolden, animTime) {
    const x0 = venue.x;
    const x1 = venue.x + venue.w;
    const y0 = venue.y;
    const y1 = venue.y + venue.h;
    const style = venue.archStyle || 'pombaline';
    const isCathedral = style === 'cathedral' || venue.interiorTheme?.layout === 'cathedral';
    const isKiosk = style === 'kiosk';
    const tileMode = getVenueTileMode(venue);
    const wallH = getVenueHeight(venue);
    const baseWall = getVenueWallBaseColor(venue);
    const roofBase = venue.roofColor || '#b84a32';
    const trimCol = venue.accentColor || venue.awningColor || '#1b4d89';

    // Anchor every building cleanly to the sloped Lisboa hillside terrain
    const zSW = getTerrainElevation(x0, y1);
    const zSE = getTerrainElevation(x1, y1);
    const zNW = getTerrainElevation(x0, y0);
    const zNE = getTerrainElevation(x1, y0);
    const doorZ = getTerrainElevation(venue.doorX, venue.doorY);
    const minCornerZ = Math.min(zSW, zSE, zNW, zNE);
    const maxCornerZ = Math.max(zSW, zSE, zNW, zNE);
    const baseZ = Math.max(doorZ, (zSW + zSE + zNW + zNE) * 0.25 + 2, maxCornerZ - 6);
    const skirtZ = Math.min(minCornerZ - 6, baseZ - 4);
    const topZ = baseZ + wallH;
    const dist = Math.hypot(clamp(cam.camX, x0, x1) - cam.camX, clamp(cam.camY, y0, y1) - cam.camY);

    // Special Archetype 1: Octagonal 19th-Century Wrought-Iron Lisbon Garden Pavilion (Quiosque de Sao Pedro)
    if (isKiosk) {
      const cx = (x0 + x1) * 0.5;
      const cy = (y0 + y1) * 0.5;
      const rx = Math.min(venue.w, venue.h) * 0.44;
      const ry = rx * 0.88;
      const sides = 8;
      const verts = [];
      for (let i = 0; i < sides; i += 1) {
        const ang = (i / sides) * Math.PI * 2 + Math.PI / 8;
        verts.push([cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry]);
      }
      const domeMidZ = topZ + 22;
      const domeTipZ = topZ + 38;
      const finialZ = topZ + 56;

      // Stepped stone terrace plinth anchoring kiosk to Bairro Alto ridge
      const facetOrder = [];
      for (let i = 0; i < sides; i += 1) {
        const a = verts[i];
        const b = verts[(i + 1) % sides];
        const mx = (a[0] + b[0]) * 0.5;
        const my = (a[1] + b[1]) * 0.5;
        facetOrder.push({ i, a, b, distSq: (mx - cam.camX) ** 2 + (my - cam.camY) ** 2 });
      }
      facetOrder.sort((u, v) => v.distSq - u.distSq);

      for (const f of facetOrder) {
        const [ax, ay] = f.a;
        const [bx, by] = f.b;
        const shade = 0.8 + 0.2 * Math.sin((f.i / sides) * Math.PI * 2 + 0.7);
        const gzA = getTerrainElevation(ax, ay) - 1.5;
        const gzB = getTerrainElevation(bx, by) - 1.5;
        // Stone plinth base hugging the exact ground elevation at each kiosk corner
        this.drawPoly3D(
          ctx,
          cam,
          [[ax, ay, gzA], [bx, by, gzB], [bx, by, baseZ + 6], [ax, ay, baseZ + 6]],
          shadeColor('#d8d0c0', shade, isEvening),
          '#57534e',
          1.0
        );
        // Emerald wrought-iron paneled counter lower body with ornamental diamond filigree
        const lowerP = this.drawPoly3D(
          ctx,
          cam,
          [[ax, ay, Math.min(gzA + 4, baseZ + 6)], [bx, by, Math.min(gzB + 4, baseZ + 6)], [bx, by, baseZ + 26], [ax, ay, baseZ + 26]],
          shadeColor('#1e5c4c', shade, isEvening),
          highlighted ? '#facc15' : '#0f362c',
          highlighted ? 2.2 : 1.1
        );
        if (lowerP) this.lastHitTargets.push({ kind: 'venue', id: venue.id, venue, poly: lowerP });
        const kl = (u, z) => [ax + (bx - ax) * u, ay + (by - ay) * u, z];
        this.drawPoly3D(ctx, cam, [kl(0.5, baseZ + 9), kl(0.84, baseZ + 16), kl(0.5, baseZ + 23), kl(0.16, baseZ + 16)], shadeColor('#14473a', shade, isEvening), '#d4af37', 0.9);
        // Cream counter sill + arched glazed espresso-bar serving bays
        const upperP = this.drawPoly3D(
          ctx,
          cam,
          [[ax, ay, baseZ + 26], [bx, by, baseZ + 26], [bx, by, topZ - 5], [ax, ay, topZ - 5]],
          shadeColor('#d6ece5', shade, isEvening),
          '#134e4a',
          1.2
        );
        if (upperP) this.lastHitTargets.push({ kind: 'venue', id: venue.id, venue, poly: upperP });
        this.drawPoly3D(
          ctx,
          cam,
          [kl(0.16, baseZ + 28), kl(0.84, baseZ + 28), kl(0.84, topZ - 11), kl(0.68, topZ - 7), kl(0.5, topZ - 6.2), kl(0.32, topZ - 7), kl(0.16, topZ - 11)],
          isEvening ? '#fde68a' : '#1e3a5f',
          '#14532d',
          1.1
        );
        this.drawLine3D(ctx, cam, kl(0.5, baseZ + 28), kl(0.5, topZ - 6.5), '#d4af37', 0.9);
        // Ornate emerald iron valance & cornice trim
        this.drawPoly3D(
          ctx,
          cam,
          [[ax, ay, topZ - 6], [bx, by, topZ - 6], [bx, by, topZ], [ax, ay, topZ]],
          shadeColor('#14532d', shade, isEvening),
          '#d4af37',
          1.0
        );
        // Verdigris copper ogee onion cupola dome tiers
        const ma = [cx + (ax - cx) * 0.52, cy + (ay - cy) * 0.52];
        const mb = [cx + (bx - cx) * 0.52, cy + (by - cy) * 0.52];
        this.drawPoly3D(
          ctx,
          cam,
          [[ax, ay, topZ], [bx, by, topZ], [mb[0], mb[1], domeMidZ], [ma[0], ma[1], domeMidZ]],
          shadeColor('#2d7a68', shade, isEvening),
          shadeColor('#184a3e', shade, isEvening),
          1.1
        );
        this.drawPoly3D(
          ctx,
          cam,
          [[ma[0], ma[1], domeMidZ], [mb[0], mb[1], domeMidZ], [cx, cy, domeTipZ]],
          shadeColor('#3f9682', shade, isEvening),
          shadeColor('#184a3e', shade, isEvening),
          1.0
        );
      }
      // Gilded bronze finial spire crowning the kiosk cupola
      this.drawLine3D(ctx, cam, [cx, cy, domeTipZ], [cx, cy, finialZ], '#d4af37', 2.6);
      const orbPt = this.projectWorldPt(cam, cx, cy, finialZ - 5);
      if (orbPt) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(orbPt.x, orbPt.y, clamp((4.5 * this.focal) / orbPt.cz, 2, 7), 0, Math.PI * 2);
        ctx.fill();
      }
      // Kiosk enamel signboard centered cleanly above the octagonal cupola cornice
      const kSign = this.projectWorldPt(cam, cx, cy, topZ + 12);
      if (kSign && dist < 440 && kSign.cz > 28) {
        const sc = clamp(this.focal / kSign.cz, 0.45, 1.35);
        const fs = Math.max(8, Math.round(9.5 * sc));
        ctx.save();
        ctx.font = `700 ${fs}px Georgia, serif`;
        const title = venue.name.toUpperCase();
        const tw = ctx.measureText(title).width + 14 * sc;
        const th = 16 * sc;
        drawRoundedRect(ctx, kSign.x - tw * 0.5, kSign.y - th * 0.5, tw, th, 4);
        ctx.fillStyle = highlighted ? 'rgba(180, 83, 9, 0.94)' : 'rgba(20, 83, 45, 0.92)';
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = '#fef9c3';
        ctx.textAlign = 'center';
        ctx.fillText(title, kSign.x, kSign.y + fs * 0.34);
        ctx.restore();
      }
      return;
    }

    // Determine visible wall faces by camera side (exact back-face culling)
    const faces = [];
    if (cam.camY > y1) {
      faces.push({ side: 'south', a: [x0, y1], b: [x1, y1], nx: 0, ny: 1, shade: 1.0, len: venue.w });
    } else if (cam.camY < y0) {
      faces.push({ side: 'north', a: [x1, y0], b: [x0, y0], nx: 0, ny: -1, shade: 0.86, len: venue.w });
    }
    if (cam.camX < x0) {
      faces.push({ side: 'west', a: [x0, y0], b: [x0, y1], nx: -1, ny: 0, shade: 0.92, len: venue.h });
    } else if (cam.camX > x1) {
      faces.push({ side: 'east', a: [x1, y1], b: [x1, y0], nx: 1, ny: 0, shade: 0.78, len: venue.h });
    }

    // Distinct Roof Archetypes across Bairro Alto, Chiado & Alfama
    const isMansard = style === 'bertrand' || style === 'brasileira';
    const isBalustradeFlat = style === 'azulejo-gallery';
    const isSteppedAlfama = style === 'mercearia';
    const isStudioSkylight = style === 'bohemian-shop';
    const roofH = isCathedral ? 24 : isMansard ? 34 : isBalustradeFlat ? 10 : style === 'tasca' ? 24 : 28;
    const ridgeX0 = x0 + Math.min(isMansard ? 18 : 28, venue.w * 0.22);
    const ridgeX1 = x1 - Math.min(isMansard ? 18 : 28, venue.w * 0.22);
    const ridgeY = (y0 + y1) * 0.5;
    const ridgeZ = topZ + roofH;
    const activeRoofColor = isMansard ? (style === 'bertrand' ? '#334155' : '#4b5563') : roofBase;

    if (!isCathedral && !isBalustradeFlat) {
      const eave = style === 'tasca' || style === 'alfama-taberna' ? 5 : 0;
      const rx0 = x0 - eave;
      const rx1 = x1 + eave;
      const ry0 = y0 - eave;
      const ry1 = y1 + eave;

      if (isSteppedAlfama) {
        // Asymmetric dual-height Alfama stepped terracotta roofs (west half 16 units taller than east half)
        const midX = (x0 + x1) * 0.54;
        const westTopZ = topZ + 16;
        // Elevated west gable block wall
        if (cam.camY > y1) {
          this.drawPoly3D(ctx, cam, [[x0, y1, topZ], [midX, y1, topZ], [midX, y1, westTopZ], [x0, y1, westTopZ]], shadeColor(baseWall, 0.98, isEvening), '#57534e', 1.0);
        }
        if (cam.camY < y0) {
          this.drawPoly3D(ctx, cam, [[midX, y0, topZ], [x0, y0, topZ], [x0, y0, westTopZ], [midX, y0, westTopZ]], shadeColor(baseWall, 0.85, isEvening), '#57534e', 1.0);
        }
        if (cam.camX > midX) {
          this.drawPoly3D(ctx, cam, [[midX, y1, topZ], [midX, y0, topZ], [midX, y0, westTopZ], [midX, y1, westTopZ]], shadeColor(baseWall, 0.78, isEvening), '#57534e', 1.0);
        }
        // West higher terracotta roof
        if (cam.camY >= ridgeY) {
          this.drawPoly3D(ctx, cam, [[x0, y1, westTopZ], [midX, y1, westTopZ], [midX - 8, ridgeY, westTopZ + 22], [x0 + 14, ridgeY, westTopZ + 22]], shadeColor('#b84a32', 1.0, isEvening), '#7c2d12', 1.1);
          this.drawPoly3D(ctx, cam, [[midX, y1, topZ], [x1, y1, topZ], [x1 - 14, ridgeY, topZ + 20], [midX, ridgeY, topZ + 20]], shadeColor('#9f3f2a', 0.96, isEvening), '#7c2d12', 1.1);
        }
        if (cam.camY <= ridgeY) {
          this.drawPoly3D(ctx, cam, [[midX, y0, westTopZ], [x0, y0, westTopZ], [x0 + 14, ridgeY, westTopZ + 22], [midX - 8, ridgeY, westTopZ + 22]], shadeColor('#b84a32', 0.82, isEvening), '#7c2d12', 1.1);
          this.drawPoly3D(ctx, cam, [[x1, y0, topZ], [midX, y0, topZ], [midX, ridgeY, topZ + 20], [x1 - 14, ridgeY, topZ + 20]], shadeColor('#9f3f2a', 0.8, isEvening), '#7c2d12', 1.1);
        }
      } else {
        if (cam.camY >= ridgeY) {
          this.drawPoly3D(
            ctx,
            cam,
            [[rx0, ry1, topZ], [rx1, ry1, topZ], [ridgeX1, ridgeY, ridgeZ], [ridgeX0, ridgeY, ridgeZ]],
            shadeColor(activeRoofColor, 1.0, isEvening),
            shadeColor(activeRoofColor, 0.68, isEvening),
            1.2
          );
          if (dist < 760) {
            for (const rf of [0.28, 0.56, 0.8]) {
              const rz = topZ + roofH * rf;
              const ry = ry1 + (ridgeY - ry1) * rf;
              const rxA = rx0 + (ridgeX0 - rx0) * rf;
              const rxB = rx1 + (ridgeX1 - rx1) * rf;
              this.drawLine3D(ctx, cam, [rxA, ry, rz], [rxB, ry, rz], shadeColor(activeRoofColor, 0.72, isEvening), 1);
            }
            if (isMansard || style === 'pensao' || style === 'palacete-gallery') {
              const dormers = venue.w >= 170 ? [0.26, 0.5, 0.74] : [0.34, 0.66];
              for (const du of dormers) {
                const dx = x0 + venue.w * du;
                const dy = y1 + (ridgeY - y1) * 0.24;
                const dw = isMansard ? 11 : 9;
                this.drawPoly3D(
                  ctx,
                  cam,
                  [[dx - dw, dy, topZ + 4], [dx + dw, dy, topZ + 4], [dx + dw, dy, topZ + 24], [dx - dw, dy, topZ + 24]],
                  shadeColor(isMansard ? '#cbd5e1' : '#efe8da', 0.96, isEvening),
                  '#475569',
                  0.9
                );
                this.drawPoly3D(
                  ctx,
                  cam,
                  [[dx - dw * 0.54, dy, topZ + 7], [dx + dw * 0.54, dy, topZ + 7], [dx + dw * 0.54, dy, topZ + 20], [dx - dw * 0.54, dy, topZ + 20]],
                  isEvening ? '#fde68a' : '#1e3a5f'
                );
                this.drawPoly3D(
                  ctx,
                  cam,
                  [[dx - dw - 2, dy, topZ + 24], [dx + dw + 2, dy, topZ + 24], [dx, dy, topZ + 32]],
                  shadeColor(activeRoofColor, 0.88, isEvening),
                  '#334155',
                  0.9
                );
              }
            }
          }
        }
        if (cam.camY <= ridgeY) {
          this.drawPoly3D(
            ctx,
            cam,
            [[rx1, ry0, topZ], [rx0, ry0, topZ], [ridgeX0, ridgeY, ridgeZ], [ridgeX1, ridgeY, ridgeZ]],
            shadeColor(activeRoofColor, 0.82, isEvening),
            shadeColor(activeRoofColor, 0.62, isEvening),
            1.2
          );
          if (dist < 760) {
            for (const rf of [0.28, 0.56, 0.8]) {
              const rz = topZ + roofH * rf;
              const ry = ry0 + (ridgeY - ry0) * rf;
              const rxA = rx0 + (ridgeX0 - rx0) * rf;
              const rxB = rx1 + (ridgeX1 - rx1) * rf;
              this.drawLine3D(ctx, cam, [rxB, ry, rz], [rxA, ry, rz], shadeColor(activeRoofColor, 0.64, isEvening), 1);
            }
            if (isMansard || style === 'pensao' || style === 'palacete-gallery') {
              const dormers = venue.w >= 170 ? [0.26, 0.5, 0.74] : [0.34, 0.66];
              for (const du of dormers) {
                const dx = x0 + venue.w * du;
                const dy = y0 + (ridgeY - y0) * 0.24;
                const dw = isMansard ? 11 : 9;
                this.drawPoly3D(
                  ctx,
                  cam,
                  [[dx + dw, dy, topZ + 4], [dx - dw, dy, topZ + 4], [dx - dw, dy, topZ + 24], [dx + dw, dy, topZ + 24]],
                  shadeColor(isMansard ? '#cbd5e1' : '#efe8da', 0.86, isEvening),
                  '#475569',
                  0.9
                );
                this.drawPoly3D(
                  ctx,
                  cam,
                  [[dx + dw * 0.54, dy, topZ + 7], [dx - dw * 0.54, dy, topZ + 7], [dx - dw * 0.54, dy, topZ + 20], [dx + dw * 0.54, dy, topZ + 20]],
                  isEvening ? '#fde68a' : '#1e3a5f'
                );
                this.drawPoly3D(
                  ctx,
                  cam,
                  [[dx + dw + 2, dy, topZ + 24], [dx - dw - 2, dy, topZ + 24], [dx, dy, topZ + 32]],
                  shadeColor(activeRoofColor, 0.8, isEvening),
                  '#334155',
                  0.9
                );
              }
            }
          }
        }
        if (cam.camX <= ridgeX0) {
          this.drawPoly3D(ctx, cam, [[rx0, ry0, topZ], [rx0, ry1, topZ], [ridgeX0, ridgeY, ridgeZ]], shadeColor(activeRoofColor, 0.9, isEvening), shadeColor(activeRoofColor, 0.65, isEvening), 1.2);
        }
        if (cam.camX >= ridgeX1) {
          this.drawPoly3D(ctx, cam, [[rx1, ry1, topZ], [rx1, ry0, topZ], [ridgeX1, ridgeY, ridgeZ]], shadeColor(activeRoofColor, 0.74, isEvening), shadeColor(activeRoofColor, 0.58, isEvening), 1.2);
        }
        this.drawLine3D(ctx, cam, [ridgeX0, ridgeY, ridgeZ], [ridgeX1, ridgeY, ridgeZ], shadeColor(activeRoofColor, 1.15, isEvening), 2.2);

        // Artist Studio Sawtooth Skylight on Vinil & Gravuras (Bairro Alto)
        if (isStudioSkylight && dist < 740) {
          this.drawPoly3D(
            ctx,
            cam,
            [[x0 + 36, ridgeY - 12, ridgeZ - 6], [x1 - 36, ridgeY - 12, ridgeZ - 6], [x1 - 36, ridgeY + 12, ridgeZ + 12], [x0 + 36, ridgeY + 12, ridgeZ + 12]],
            isEvening ? '#fde68a' : '#bae6fd',
            '#334155',
            1.3
          );
        } else if (dist < 780) {
          // Authentic whitewashed Lisbon masonry chimney stack(s)
          const chSpots = style === 'pensao' ? [0.22, 0.78] : [0.26];
          for (const cf of chSpots) {
            const chX = ridgeX0 + (ridgeX1 - ridgeX0) * cf;
            this.drawLine3D(ctx, cam, [chX, ridgeY, ridgeZ - 4], [chX, ridgeY, ridgeZ + 15], shadeColor('#f5f0e6', 0.95, isEvening), 4.6);
            this.drawLine3D(ctx, cam, [chX, ridgeY, ridgeZ + 15], [chX, ridgeY, ridgeZ + 19], shadeColor('#b84a32', 0.95, isEvening), 3.0);
          }
        }
      }
    }

    // Distinct Corner Zinc Turret Cupola for Chiado Art Deco Boutique (Atelier de Cortica)
    if (style === 'chiado-arcade' && dist < 860) {
      const tx = x0 + 18;
      const ty = y0 + 18;
      const tr = 20;
      const tMidZ = topZ + 16;
      const tTipZ = topZ + 44;
      for (let i = 0; i < 6; i += 1) {
        const a0 = (i / 6) * Math.PI * 2;
        const a1 = ((i + 1) / 6) * Math.PI * 2;
        const p0 = [tx + Math.cos(a0) * tr, ty + Math.sin(a0) * tr];
        const p1 = [tx + Math.cos(a1) * tr, ty + Math.sin(a1) * tr];
        const sh = 0.78 + 0.22 * Math.cos(a0);
        this.drawPoly3D(ctx, cam, [[p0[0], p0[1], topZ - 2], [p1[0], p1[1], topZ - 2], [p1[0], p1[1], tMidZ], [p0[0], p0[1], tMidZ]], shadeColor('#1f7062', sh, isEvening), '#0f3f38', 0.9);
        this.drawPoly3D(ctx, cam, [[p0[0], p0[1], tMidZ], [p1[0], p1[1], tMidZ], [tx, ty, tTipZ]], shadeColor('#64748b', sh, isEvening), '#334155', 0.9);
      }
      this.drawLine3D(ctx, cam, [tx, ty, tTipZ], [tx, ty, tTipZ + 12], '#d4af37', 2.0);
    }

    // Draw each visible wall facade with authentic district-differentiated Lisbon architecture!
    for (const face of faces) {
      const [ax, ay] = face.a;
      const [bx, by] = face.b;
      // Sample exact terrain elevation along this wall face so the building facade hugs the sloped cobblestone street directly!
      const gzA = getTerrainElevation(ax, ay) - 1.2;
      const gzB = getTerrainElevation(bx, by) - 1.2;
      const groundAt = (u) => gzA + (gzB - gzA) * u;
      const lerpWall = (u, relZ) => {
        const gz = groundAt(u);
        const t = relZ / Math.max(1, wallH);
        return [ax + (bx - ax) * u, ay + (by - ay) * u, gz + (topZ - gz) * t];
      };
      const lerpGround = (u, offsetZ = 0) => lerpWall(u, offsetZ);
      const wallFill = shadeColor(baseWall, face.shade, isEvening);
      const wallOutline = highlighted ? '#f59e0b' : shadeColor('#57534e', face.shade, isEvening);

      // Full-height building wall extending all the way down to the exact sloped sidewalk ground line (never floating!)
      const wallQuad = [lerpWall(0, 0), lerpWall(1, 0), lerpWall(1, wallH), lerpWall(0, wallH)];
      const screenPoly = this.drawPoly3D(ctx, cam, wallQuad, wallFill, wallOutline, highlighted ? 2.4 : 1.1);
      if (screenPoly) {
        this.lastHitTargets.push({ kind: 'venue', id: venue.id, venue, poly: screenPoly });
      }

      // Authentic low Portuguese Lioz granite curb plinth (soco de cantaria, 6 units high) hugging the sloped sidewalk
      this.drawPoly3D(
        ctx,
        cam,
        [lerpWall(0, 0), lerpWall(1, 0), lerpWall(1, 6.5), lerpWall(0, 6.5)],
        shadeColor('#b8afa0', face.shade * 0.94, isEvening),
        shadeColor('#57534e', face.shade, isEvening),
        0.9
      );

      // Pre-1755 Medieval Alfama Cantilevered Overhanging Upper Story (Ressalto Medieval) on Taberna da Sardinha!
      if (style === 'alfama-taberna') {
        const overhang = 7.5;
        const ox0 = x0 - overhang;
        const ox1 = x1 + overhang;
        const oy0 = y0 - overhang;
        const oy1 = y1 + overhang;
        const ovA =
          face.side === 'south' ? [ox0, oy1]
            : face.side === 'north' ? [ox1, oy0]
              : face.side === 'west' ? [ox0, oy0]
                : [ox1, oy1];
        const ovB =
          face.side === 'south' ? [ox1, oy1]
            : face.side === 'north' ? [ox0, oy0]
              : face.side === 'west' ? [ox0, oy1]
                : [ox1, oy0];
        const ov = (u, relZ) => {
          const p = lerpWall(u, relZ);
          return [
            ovA[0] + (ovB[0] - ovA[0]) * u,
            ovA[1] + (ovB[1] - ovA[1]) * u,
            p[2]
          ];
        };
        // Dark timber corbel brackets (cachorros) supporting overhanging 2nd story
        if (dist < 680) {
          for (const cu of [0.1, 0.26, 0.42, 0.58, 0.74, 0.9]) {
            this.drawLine3D(ctx, cam, lerpWall(cu, 34), ov(cu, 42), '#5c341d', 3.0);
          }
        }
        // Watertight mitered soffit under overhang + overhanging crisp whitewashed upper wall
        this.drawPoly3D(ctx, cam, [lerpWall(0, 41), lerpWall(1, 41), ov(1, 42), ov(0, 42)], shadeColor('#78716c', face.shade * 0.75, isEvening));
        this.drawPoly3D(ctx, cam, [ov(0, 42), ov(1, 42), ov(1, wallH), ov(0, wallH)], shadeColor('#faf6ee', face.shade, isEvening), '#78716c', 1.1);
        // Festive colorful triangular Santos Populares bunting draped across Alfama taberna!
        if (dist < 640 && face.side === venue.doorSide) {
          const bCols = ['#dc2626', '#facc15', '#16a34a', '#2563eb', '#f97316'];
          this.drawLine3D(ctx, cam, ov(0.05, wallH - 12), ov(0.95, wallH - 12), '#475569', 1.2);
          for (let bi = 0; bi < 10; bi += 1) {
            const u0 = 0.07 + bi * 0.086;
            const u1 = u0 + 0.068;
            const sway = Math.sin(animTime * 3.1 + bi) * 1.2;
            const tip = ov((u0 + u1) * 0.5, wallH - 21);
            this.drawPoly3D(
              ctx,
              cam,
              [ov(u0, wallH - 12), ov(u1, wallH - 12), [tip[0] + sway, tip[1], tip[2]]],
              bCols[bi % bCols.length]
            );
          }
        }
      }

      // Ground-floor treatment tailored per architectural style (hugging the sloped ground line lerpGround!)
      if (style === 'brasileira') {
        // Iconic 1905 Dark Mahogany & Hammered Brass Art Nouveau Storefront (Cafe A Brasileira)
        this.drawPoly3D(ctx, cam, [lerpGround(0, 0), lerpGround(1, 0), lerpWall(1, 40), lerpWall(0, 40)], shadeColor('#3c2214', face.shade, isEvening), '#d4af37', 1.4);
        this.drawPoly3D(ctx, cam, [lerpWall(0.02, 34), lerpWall(0.98, 34), lerpWall(0.98, 39.5), lerpWall(0.02, 39.5)], '#141414', '#eab308', 1.2);
      } else if (style === 'bohemian-shop') {
        // Bairro Alto Bohemian Street-Art Color-Block Mural Bands hugging the sidewalk
        if (dist < 640) {
          const muralCols = ['#1d4ed8', '#eab308', '#e11d48', '#0d9488'];
          for (let mi = 0; mi < 4; mi += 1) {
            const mu0 = 0.04 + mi * 0.23;
            this.drawPoly3D(ctx, cam, [lerpGround(mu0, 6.5), lerpGround(mu0 + 0.21, 6.5), lerpGround(mu0 + 0.21, 18.5), lerpGround(mu0, 18.5)], shadeColor(muralCols[mi], face.shade * 0.9, isEvening));
          }
        }
      } else if (style === 'bairro-bar') {
        // Iconic Bairro Alto Nightlife Bar Facade: dark slate club plinth, glowing magenta-gold neon trim & warm string lanterns!
        const barPartyLit = isEvening || isGolden;
        this.drawPoly3D(ctx, cam, [lerpGround(0, 0), lerpGround(1, 0), lerpWall(1, 39), lerpWall(0, 39)], shadeColor('#1f1229', face.shade, isEvening), barPartyLit ? '#e879f9' : '#6b21a8', 1.5);
        // Neon party accent stripe above ground floor
        this.drawPoly3D(ctx, cam, [lerpWall(0.03, 35.5), lerpWall(0.97, 35.5), lerpWall(0.97, 38.5), lerpWall(0.03, 38.5)], barPartyLit ? '#ec4899' : '#9d174d', '#fde047', 1.0);
        // Glowing 2nd-floor balcony party string bulbs along Bar da Noite
        if (dist < 620) {
          const bCols = ['#f472b6', '#fde047', '#38bdf8', '#fb923c', '#c084fc'];
          this.drawLine3D(ctx, cam, lerpWall(0.06, 82), lerpWall(0.94, 82), '#475569', 1.2);
          for (let bi = 0; bi < 8; bi += 1) {
            const bu = 0.09 + bi * 0.115;
            const sag = Math.sin(((bi + 0.5) / 8) * Math.PI) * 5;
            const bp = this.projectWorldPt(cam, ...lerpWall(bu, 82 - sag));
            if (bp) {
              const tw = 0.72 + 0.28 * Math.sin(animTime * 4.5 + bi * 1.3);
              const r = clamp((3.2 * this.focal) / bp.cz, 1.8, 6.5) * tw;
              if (barPartyLit) {
                const gl = ctx.createRadialGradient(bp.x, bp.y, 0.5, bp.x, bp.y, r * 3.8);
                gl.addColorStop(0, bCols[bi % bCols.length]);
                gl.addColorStop(1, 'rgba(236, 72, 153, 0)');
                ctx.fillStyle = gl;
                ctx.beginPath();
                ctx.arc(bp.x, bp.y, r * 3.8, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.fillStyle = barPartyLit ? '#fffbeb' : bCols[bi % bCols.length];
              ctx.beginPath();
              ctx.arc(bp.x, bp.y, r * 0.65, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      } else if (style === 'mercearia') {
        // Old-world emerald-green painted wooden grocer ground-floor shopfront hugging the sidewalk
        this.drawPoly3D(ctx, cam, [lerpGround(0, 0), lerpGround(1, 0), lerpWall(1, 36), lerpWall(0, 36)], shadeColor('#155e4c', face.shade, isEvening), '#0d3b30', 1.1);
      } else if (style === 'azulejo-atelier') {
        // Rustic half-height cobalt glazed tile wainscoting on ground floor hugging the sidewalk
        this.drawPoly3D(ctx, cam, [lerpGround(0, 0), lerpGround(1, 0), lerpWall(1, 36), lerpWall(0, 36)], shadeColor('#dbeafe', face.shade, isEvening), '#1d4ed8', 1.0);
        this.drawPoly3D(ctx, cam, [lerpWall(0, 32), lerpWall(1, 32), lerpWall(1, 36.5), lerpWall(0, 36.5)], shadeColor('#1d4ed8', face.shade, isEvening));
      } else {
        // Subtle horizontal Lioz stone molding band separating ground story from upper floors while preserving the building's true wall color all the way to the sidewalk!
        this.drawPoly3D(ctx, cam, [lerpWall(0, 34), lerpWall(1, 34), lerpWall(1, 37.5), lerpWall(0, 37.5)], shadeColor('#e2dacb', face.shade * 0.96, isEvening), shadeColor('#78716c', face.shade, isEvening), 0.8);
      }

      // Projecting belt-course molding
      if (!isCathedral && style !== 'alfama-taberna') {
        this.drawPoly3D(
          ctx,
          cam,
          [lerpWall(0, 36), lerpWall(1, 36), lerpWall(1, 39.5), lerpWall(0, 39.5)],
          shadeColor('#f0e9db', face.shade, isEvening),
          shadeColor('#78716c', face.shade, isEvening),
          0.9
        );
      }

      // Deep 3-Bay Lioz Limestone Ground-Floor Colonnade on Arcadas do Chiado!
      if (style === 'arcaded-azulejo' && dist < 760) {
        const archDark = shadeColor('#1e293b', face.shade, isEvening);
        const pierCol = shadeColor('#ece5d6', face.shade, isEvening);
        for (let ai = 0; ai < 3; ai += 1) {
          const au0 = 0.08 + ai * 0.3;
          const au1 = au0 + 0.24;
          const midU = (au0 + au1) * 0.5;
          this.drawPoly3D(
            ctx,
            cam,
            [lerpWall(au0, 0), lerpWall(au1, 0), lerpWall(au1, 24), lerpWall(midU + 0.06, 32), lerpWall(midU, 34.5), lerpWall(midU - 0.06, 32), lerpWall(au0, 24)],
            archDark,
            pierCol,
            1.6
          );
        }
      }

      // Distinct Rooftop Crown Treatments per Archetype!
      if (!isCathedral && dist < 760 && face.len >= 120) {
        const pedCol = shadeColor('#ece4d4', face.shade, isEvening);
        const pedTrim = shadeColor(trimCol, face.shade, isEvening);
        if (isBalustradeFlat) {
          // Carved Lioz Stone Rooftop Balustrade Parapet with Decorative Urn Finials (Galeria Pombalina)
          this.drawPoly3D(ctx, cam, [lerpWall(0, wallH), lerpWall(1, wallH), lerpWall(1, wallH + 12), lerpWall(0, wallH + 12)], pedCol, '#6b6458', 1.1);
          for (let bi = 1; bi < 12; bi += 1) {
            this.drawLine3D(ctx, cam, lerpWall(bi / 12, wallH + 2), lerpWall(bi / 12, wallH + 10), '#78716c', 1.1);
          }
          for (const uu of [0.05, 0.35, 0.65, 0.95]) {
            this.drawPoly3D(ctx, cam, [lerpWall(uu - 0.022, wallH + 12), lerpWall(uu + 0.022, wallH + 12), lerpWall(uu, wallH + 21)], pedCol, '#57534e', 1.0);
          }
        } else if (style === 'palacete-gallery' && face.side === venue.doorSide) {
          // 18th-Century Baroque Curved Scroll-Volute Pediment (Frontao Contracurvado) on Palacete do Loreto
          this.drawPoly3D(
            ctx,
            cam,
            [
              lerpWall(0.24, wallH - 1),
              lerpWall(0.76, wallH - 1),
              lerpWall(0.68, wallH + 8),
              lerpWall(0.58, wallH + 16),
              lerpWall(0.5, wallH + 21),
              lerpWall(0.42, wallH + 16),
              lerpWall(0.32, wallH + 8)
            ],
            pedCol,
            pedTrim,
            1.5
          );
          // Stone crest shield in center of Baroque pediment
          this.drawPoly3D(ctx, cam, [lerpWall(0.46, wallH + 5), lerpWall(0.54, wallH + 5), lerpWall(0.5, wallH + 15)], '#b45309', '#78350f', 1.0);
        } else if ((style === 'bertrand' || style === 'arcaded-azulejo') && face.side === venue.doorSide) {
          // Neoclassical Triangular Pombaline Pediment (Chiado)
          this.drawPoly3D(ctx, cam, [lerpWall(0.32, wallH - 1), lerpWall(0.68, wallH - 1), lerpWall(0.5, wallH + 14)], pedCol, pedTrim, 1.4);
          this.drawPoly3D(ctx, cam, [lerpWall(0.37, wallH + 1), lerpWall(0.63, wallH + 1), lerpWall(0.5, wallH + 10)], shadeColor(baseWall, face.shade * 0.94, isEvening));
        }
      }

      // Lioz Corner Quoins (on Pombaline / noble stone buildings only — not plain medieval whitewash)
      if (dist < 740 && style !== 'alfama-taberna' && style !== 'tasca') {
        const quoinCol = shadeColor('#d6cec0', face.shade * 0.92, isEvening);
        const qU = Math.min(0.045, 7 / Math.max(50, face.len));
        for (let qz = 38; qz < wallH - 10; qz += 12) {
          const wMult = ((Math.round(qz / 12)) % 2 === 0) ? 1.35 : 0.9;
          this.drawPoly3D(ctx, cam, [lerpWall(0, qz), lerpWall(qU * wMult, qz), lerpWall(qU * wMult, qz + 9), lerpWall(0, qz + 9)], quoinCol);
          this.drawPoly3D(ctx, cam, [lerpWall(1 - qU * wMult, qz), lerpWall(1, qz), lerpWall(1, qz + 9), lerpWall(1 - qU * wMult, qz + 9)], quoinCol);
        }
      }

      // Cornice band
      this.drawPoly3D(ctx, cam, [lerpWall(0, wallH - 6.5), lerpWall(1, wallH - 6.5), lerpWall(1, wallH), lerpWall(0, wallH)], shadeColor(trimCol, face.shade, isEvening));

      // Distinct Glazed Azulejo Tilework Modes (cobalt, polychrome saffron/blue, emerald Art Deco, or bohemian)
      if (dist < 680 && tileMode) {
        const tileStroke =
          tileMode === 'cobalt' ? 'rgba(27, 77, 137, 0.46)'
            : tileMode === 'polychrome' ? 'rgba(30, 64, 175, 0.42)'
              : tileMode === 'teal' ? 'rgba(15, 118, 110, 0.48)'
                : 'rgba(109, 40, 217, 0.34)';
        const friezeCol =
          tileMode === 'cobalt' ? shadeColor('#1b4d89', face.shade, isEvening)
            : tileMode === 'polychrome' ? shadeColor('#1d4ed8', face.shade, isEvening)
              : tileMode === 'teal' ? shadeColor('#0f766e', face.shade, isEvening)
                : shadeColor('#6d28d9', face.shade, isEvening);
        const diamondCol =
          tileMode === 'polychrome' ? 'rgba(29, 78, 216, 0.42)'
            : tileMode === 'cobalt' ? 'rgba(29, 78, 216, 0.36)'
              : tileMode === 'teal' ? 'rgba(13, 148, 136, 0.38)'
                : 'rgba(126, 34, 206, 0.28)';
        this.drawPoly3D(ctx, cam, [lerpWall(0.03, 39.5), lerpWall(0.97, 39.5), lerpWall(0.97, 43.2), lerpWall(0.03, 43.2)], friezeCol);
        this.drawPoly3D(ctx, cam, [lerpWall(0.03, wallH - 10.5), lerpWall(0.97, wallH - 10.5), lerpWall(0.97, wallH - 7), lerpWall(0.03, wallH - 7)], friezeCol);
        const cols = Math.max(5, Math.min(12, Math.round(face.len / 18)));
        for (let c = 1; c < cols; c += 1) {
          this.drawLine3D(ctx, cam, lerpWall(c / cols, 39.5), lerpWall(c / cols, wallH - 7), tileStroke, 0.9);
        }
        for (let tz = 48; tz < wallH - 11; tz += 13) {
          this.drawLine3D(ctx, cam, lerpWall(0, tz), lerpWall(1, tz), tileStroke, 0.9);
          if (dist < 460) {
            for (let c = 0; c < cols; c += 1) {
              const cu = (c + 0.5) / cols;
              const du = 0.24 / cols;
              this.drawPoly3D(
                ctx,
                cam,
                [lerpWall(cu, tz + 2.5), lerpWall(cu + du, tz + 6.5), lerpWall(cu, tz + 10.5), lerpWall(cu - du, tz + 6.5)],
                diamondCol
              );
            }
          }
        }
        // Hand-painted Tagus Caravel Ceramic Mural Panel on Oficina de Azulejos (Alfama)!
        if (style === 'azulejo-atelier' && face.side === venue.doorSide && dist < 560) {
          this.drawPoly3D(ctx, cam, [lerpWall(0.32, 52), lerpWall(0.68, 52), lerpWall(0.68, 86), lerpWall(0.32, 86)], '#f8fafc', '#1d4ed8', 1.8);
          this.drawPoly3D(ctx, cam, [lerpWall(0.36, 56), lerpWall(0.64, 56), lerpWall(0.64, 62), lerpWall(0.36, 62)], '#2563eb');
          this.drawPoly3D(ctx, cam, [lerpWall(0.42, 62), lerpWall(0.58, 62), lerpWall(0.55, 67), lerpWall(0.45, 67)], '#1e3a8a');
          this.drawPoly3D(ctx, cam, [lerpWall(0.49, 67), lerpWall(0.59, 68), lerpWall(0.49, 82)], '#3b82f6');
        }
      }

      // Continuous Piano Nobile Balcony (Varanda Corrida) on grand Chiado & Palacete facades
      if (!isCathedral && dist < 560 && face.len >= 120 && ['brasileira', 'bertrand', 'palacete-gallery', 'azulejo-gallery', 'arcaded-azulejo'].includes(style)) {
        const balZ0 = 42;
        const balZ1 = 52;
        const bracketCol = shadeColor('#cfc6b6', face.shade, isEvening);
        this.drawPoly3D(ctx, cam, [lerpWall(0.04, balZ0 - 2.2), lerpWall(0.96, balZ0 - 2.2), lerpWall(0.96, balZ0), lerpWall(0.04, balZ0)], shadeColor('#e5ddd0', face.shade, isEvening), '#57534e', 0.9);
        for (let bu = 0.08; bu <= 0.92; bu += 0.14) {
          this.drawPoly3D(ctx, cam, [lerpWall(bu - 0.013, balZ0 - 5.2), lerpWall(bu + 0.013, balZ0 - 5.2), lerpWall(bu + 0.017, balZ0 - 2.2), lerpWall(bu - 0.017, balZ0 - 2.2)], bracketCol);
        }
        this.drawLine3D(ctx, cam, lerpWall(0.05, balZ0), lerpWall(0.95, balZ0), '#1e293b', 1.8);
        this.drawLine3D(ctx, cam, lerpWall(0.05, balZ1), lerpWall(0.95, balZ1), '#1e293b', 1.7);
        const balCount = Math.min(20, Math.max(10, Math.round(face.len / 11)));
        for (let bi = 0; bi <= balCount; bi += 1) {
          const bu = 0.05 + (bi / balCount) * 0.9;
          this.drawLine3D(ctx, cam, lerpWall(bu, balZ0), lerpWall(bu, balZ1), '#1e293b', 0.9);
        }
      }

      // Multi-story Windows tailored to building height & neighborhood (2-story, 3-story, or 4-story)
      if (dist < 840 && !isCathedral) {
        const bays = style === 'pensao' ? Math.max(3, Math.min(5, Math.floor(face.len / 42))) : Math.max(2, Math.min(4, Math.floor(face.len / 48)));
        const winGlass = isEvening ? '#fde68a' : isGolden ? '#fcd34d' : '#1e3a5f';
        const glassGlint = isEvening ? '#fffbeb' : '#7dd3fc';
        const shutterCol = shadeColor(trimCol, face.shade * 0.88, isEvening);
        const surroundCol = shadeColor('#eee8dc', face.shade, isEvening);
        const lintelCol = shadeColor('#d6cec0', face.shade * 0.95, isEvening);
        const floorLevels = style === 'pensao' ? [45, 75, 105] : [46, 86];
        const winH = style === 'pensao' ? 19 : 22;
        const ovOffset = style === 'alfama-taberna' ? 7.6 : 0;
        const lwWin = (u, relZ) => {
          const p = lerpWall(u, relZ);
          return [
            p[0] + face.nx * ovOffset,
            p[1] + face.ny * ovOffset,
            p[2]
          ];
        };

        for (const floorZ of floorLevels) {
          if (floorZ + winH + 4 > wallH - 5) continue;
          for (let i = 0; i < bays; i += 1) {
            if (style === 'azulejo-atelier' && face.side === venue.doorSide && floorZ < 80 && i === Math.floor(bays / 2)) continue;
            const uc = (i + 0.5) / bays;
            const halfU = Math.min(0.072, 10.5 / Math.max(40, face.len));
            const u0 = uc - halfU;
            const u1 = uc + halfU;
            const shW = Math.min(0.032, halfU * 0.48);

            this.drawPoly3D(ctx, cam, [lwWin(u0 - 0.013, floorZ - 2), lwWin(u1 + 0.013, floorZ - 2), lwWin(u1 + 0.013, floorZ + winH + 2.5), lwWin(u0 - 0.013, floorZ + winH + 2.5)], surroundCol);
            this.drawPoly3D(ctx, cam, [lwWin(u0 - 0.018, floorZ + winH + 2), lwWin(u1 + 0.018, floorZ + winH + 2), lwWin(u1 + 0.018, floorZ + winH + 5), lwWin(u0 - 0.018, floorZ + winH + 5)], lintelCol);

            if (dist < 640 && u0 - shW > 0.03 && u1 + shW < 0.97 && style !== 'bohemian-shop') {
              this.drawPoly3D(ctx, cam, [lwWin(u0 - shW, floorZ), lwWin(u0 - 0.004, floorZ), lwWin(u0 - 0.004, floorZ + winH), lwWin(u0 - shW, floorZ + winH)], shutterCol, '#1e293b', 0.7);
              this.drawPoly3D(ctx, cam, [lwWin(u1 + 0.004, floorZ), lwWin(u1 + shW, floorZ), lwWin(u1 + shW, floorZ + winH), lwWin(u1 + 0.004, floorZ + winH)], shutterCol, '#1e293b', 0.7);
            }

            this.drawPoly3D(ctx, cam, [lwWin(u0, floorZ), lwWin(u1, floorZ), lwWin(u1, floorZ + winH), lwWin(u0, floorZ + winH)], winGlass, shutterCol, 1.1);

            if (dist < 580) {
              const mullionCol = isEvening ? 'rgba(120, 53, 15, 0.65)' : 'rgba(241, 245, 249, 0.72)';
              this.drawLine3D(ctx, cam, lwWin(uc, floorZ), lwWin(uc, floorZ + winH), mullionCol, 1.0);
              this.drawLine3D(ctx, cam, lwWin(u0, floorZ + winH * 0.5), lwWin(u1, floorZ + winH * 0.5), mullionCol, 0.9);
              this.drawLine3D(ctx, cam, lwWin(u0 + halfU * 0.25, floorZ + winH * 0.7), lwWin(u0 + halfU * 0.65, floorZ + winH * 0.88), glassGlint, 1.1);
            }

            if (dist < 580) {
              this.drawLine3D(ctx, cam, lwWin(u0 - 0.012, floorZ + 8), lwWin(u1 + 0.012, floorZ + 8), '#1e293b', 1.5);
              this.drawLine3D(ctx, cam, lwWin(u0 - 0.012, floorZ + 1.5), lwWin(u1 + 0.012, floorZ + 1.5), '#1e293b', 1.3);
              for (let b = 0; b <= 4; b += 1) {
                const bu = (u0 - 0.008) + (b / 4) * (u1 - u0 + 0.016);
                this.drawLine3D(ctx, cam, lwWin(bu, floorZ + 1.5), lwWin(bu, floorZ + 8), '#1e293b', 0.95);
              }
              if ((i + Math.round(floorZ)) % 2 === 0) {
                this.drawLine3D(ctx, cam, lwWin(uc - halfU * 0.55, floorZ + 2.5), lwWin(uc + halfU * 0.55, floorZ + 2.5), '#b45309', 2.4);
                this.drawLine3D(ctx, cam, lwWin(uc - halfU * 0.45, floorZ + 4.5), lwWin(uc + halfU * 0.45, floorZ + 4.5), style === 'pensao' ? '#16a34a' : '#dc2626', 2.6);
              }
            }
          }
        }

        // Authentic Fluttering Bairro Alto Balcony Laundry Lines (Estendais) on Casa da Rosa!
        if (style === 'casas-rosa' && dist < 620) {
          const lineZ = 82;
          const outP = (u, relZ) => {
            const p = lerpWall(u, relZ);
            return [p[0] + face.nx * 5, p[1] + face.ny * 5, p[2]];
          };
          this.drawLine3D(ctx, cam, outP(0.12, lineZ), outP(0.88, lineZ), '#475569', 1.1);
          const clothes = [
            { u: 0.22, w: 0.08, h: 12, col: '#f8fafc' },
            { u: 0.36, w: 0.07, h: 10, col: '#38bdf8' },
            { u: 0.52, w: 0.09, h: 13, col: '#fef08a' },
            { u: 0.68, w: 0.07, h: 11, col: '#fb7185' },
            { u: 0.8, w: 0.06, h: 9, col: '#ffffff' }
          ];
          for (let ci = 0; ci < clothes.length; ci += 1) {
            const c = clothes[ci];
            const flap = Math.sin(animTime * 2.8 + ci * 1.4) * 2.4;
            const p0 = outP(c.u - c.w * 0.5, lineZ);
            const p1 = outP(c.u + c.w * 0.5, lineZ);
            const p2 = [p1[0] + face.nx * flap, p1[1] + face.ny * flap, p1[2] - c.h];
            const p3 = [p0[0] + face.nx * flap, p0[1] + face.ny * flap, p0[2] - c.h];
            this.drawPoly3D(ctx, cam, [p0, p1, p2, p3], shadeColor(c.col, face.shade, isEvening), 'rgba(30,41,59,0.28)', 0.7);
          }
        }
      }

      // Main Entrance Facade: doorway, storefront windows, awning, lanterns & signboard
      if (face.side === venue.doorSide) {
        const doorU = clamp(
          face.side === 'south'
            ? (venue.doorX - x0) / Math.max(1, venue.w)
            : face.side === 'north'
              ? (x1 - venue.doorX) / Math.max(1, venue.w)
              : 0.5,
          0.18,
          0.82
        );
        const halfDoorU = Math.min(0.12, 16 / Math.max(60, face.len));

        // Flanking ground-floor showcase windows anchored to the local ground elevation lerpGround
        if (dist < 760 && !isCathedral && style !== 'arcaded-azulejo') {
          const shopGlow = isEvening ? '#fef08a' : '#fff3d6';
          const frameCol = style === 'brasileira' ? '#d4af37' : shadeColor('#f0e9db', face.shade, isEvening);
          for (const sideOffset of [-0.27, 0.27]) {
            const wu = doorU + sideOffset;
            if (wu - 0.1 < 0.04 || wu + 0.1 > 0.96) continue;
            this.drawPoly3D(
              ctx,
              cam,
              [lerpGround(wu - 0.105, 6), lerpGround(wu + 0.105, 6), lerpGround(wu + 0.105, 27), lerpGround(wu + 0.07, 32), lerpGround(wu, 33.5), lerpGround(wu - 0.07, 32), lerpGround(wu - 0.105, 27)],
              frameCol,
              shadeColor('#57534e', face.shade, isEvening),
              1.1
            );
            this.drawPoly3D(
              ctx,
              cam,
              [lerpGround(wu - 0.088, 7.5), lerpGround(wu + 0.088, 7.5), lerpGround(wu + 0.088, 25), lerpGround(wu + 0.055, 29.8), lerpGround(wu, 31.2), lerpGround(wu - 0.055, 29.8), lerpGround(wu - 0.088, 25)],
              shopGlow,
              shadeColor('#472d1b', face.shade, isEvening),
              1.3
            );
            // Display shelf accent inside showcase window
            const dispCol = style === 'bertrand' ? '#1d4ed8' : style === 'mercearia' ? '#dc2626' : style === 'bairro-bar' ? '#e879f9' : shadeColor(venue.roofColor || '#9a3412', 0.85, isEvening);
            this.drawPoly3D(ctx, cam, [lerpGround(wu - 0.075, 11.5), lerpGround(wu + 0.075, 11.5), lerpGround(wu + 0.075, 16.5), lerpGround(wu - 0.075, 16.5)], dispCol);
          }
        }

        // Enterable Arched Portal & Carved Timber Door anchored flush with the sidewalk at doorU!
        const doorTopZ = isCathedral ? 50 : 31;
        this.drawPoly3D(
          ctx,
          cam,
          [
            lerpGround(doorU - halfDoorU * 1.18, 0),
            lerpGround(doorU + halfDoorU * 1.18, 0),
            lerpGround(doorU + halfDoorU * 1.18, doorTopZ - 3),
            lerpGround(doorU + halfDoorU * 0.72, doorTopZ + 3),
            lerpGround(doorU, doorTopZ + 5),
            lerpGround(doorU - halfDoorU * 0.72, doorTopZ + 3),
            lerpGround(doorU - halfDoorU * 1.18, doorTopZ - 3)
          ],
          style === 'tasca' ? shadeColor('#14532d', face.shade, isEvening) : shadeColor('#efe8db', face.shade, isEvening),
          shadeColor('#78716c', face.shade, isEvening),
          1.2
        );
        this.drawPoly3D(
          ctx,
          cam,
          [lerpGround(doorU - halfDoorU, 0), lerpGround(doorU + halfDoorU, 0), lerpGround(doorU + halfDoorU, doorTopZ - 2), lerpGround(doorU - halfDoorU, doorTopZ - 2)],
          highlighted ? '#d97706' : shadeColor(isCathedral ? '#3d281a' : '#5a351e', face.shade, isEvening),
          highlighted ? '#fef08a' : '#2d1a0f',
          highlighted ? 2.4 : 1.5
        );
        this.drawPoly3D(
          ctx,
          cam,
          [lerpGround(doorU - halfDoorU * 0.84, doorTopZ - 6), lerpGround(doorU + halfDoorU * 0.84, doorTopZ - 6), lerpGround(doorU + halfDoorU * 0.56, doorTopZ + 0.5), lerpGround(doorU, doorTopZ + 2.5), lerpGround(doorU - halfDoorU * 0.56, doorTopZ + 0.5)],
          isCathedral ? '#1e293b' : '#fef08a',
          '#472d1b',
          1.0
        );

        // Twin glowing wrought-iron tavern wall lanterns flanking Tasca do Fado doorway
        if (style === 'tasca' && dist < 560) {
          for (const lu of [doorU - halfDoorU * 1.5, doorU + halfDoorU * 1.5]) {
            const lp = this.projectWorldPt(cam, ...lerpWall(lu, 27));
            if (lp) {
              const lr = clamp((4.5 * this.focal) / lp.cz, 2, 7.5);
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(lp.x, lp.y, lr, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          }
        }

        // Jutting 3D Striped Awning / Art Nouveau Canopy (selective so diverse architectures shine!)
        const hasAwning = !isCathedral && ['brasileira', 'casas-rosa', 'tasca', 'mercearia', 'alfama-taberna', 'bairro-bar'].includes(style);
        if (hasAwning && dist < 680) {
          const proj = style === 'brasileira' ? 18 : 14;
          const stripes = style === 'brasileira' ? 4 : 6;
          const awnBase = venue.awningColor || venue.roofColor || '#b84a32';
          for (let s = 0; s < stripes; s += 1) {
            const su0 = 0.08 + (s / stripes) * 0.84;
            const su1 = 0.08 + ((s + 1) / stripes) * 0.84;
            const a0 = lerpWall(su0, 35);
            const a1 = lerpWall(su1, 35);
            const b0 = [a0[0] + face.nx * proj, a0[1] + face.ny * proj, lerpWall(su0, 28)[2]];
            const b1 = [a1[0] + face.nx * proj, a1[1] + face.ny * proj, lerpWall(su1, 28)[2]];
            const col = (style === 'brasileira' || s % 2 === 0) ? shadeColor(awnBase, face.shade, isEvening) : shadeColor('#fef3c7', face.shade, isEvening);
            this.drawPoly3D(ctx, cam, [a0, a1, b1, b0], col, style === 'brasileira' ? '#d4af37' : 'rgba(30, 41, 59, 0.35)', 0.8);
          }
        }

        // Crisp 3D-positioned Lisbon Enamel Fascia Signboard
        const doorCenter = lerpWall(doorU, isCathedral ? 58 : 41);
        const toCamX = cam.camX - doorCenter[0];
        const toCamY = cam.camY - doorCenter[1];
        const toCamLen = Math.hypot(toCamX, toCamY) || 1;
        const facingDot = (toCamX * face.nx + toCamY * face.ny) / toCamLen;
        if (dist < 420 && facingDot > 0.24) {
          const signPt = this.projectWorldPt(cam, ...doorCenter);
          if (signPt && signPt.cz > 32 && signPt.x > 40 && signPt.x < this.viewWidth - 40) {
            const scale = clamp(this.focal / signPt.cz, 0.42, 1.45);
            const fontSize = Math.max(8, Math.round(10 * scale));
            ctx.save();
            ctx.font = `700 ${fontSize}px Georgia, serif`;
            const titleText =
              style === 'brasileira' ? 'A BRASILEIRA - 1905'
                : style === 'bairro-bar' ? 'BAR DA NOITE  |  DRINKS & MUSIC'
                  : venue.name.toUpperCase();
            const tw = ctx.measureText(titleText).width + 14 * scale;
            const th = 16 * scale;
            drawRoundedRect(ctx, signPt.x - tw * 0.5, signPt.y - th * 0.5, tw, th, 4);
            ctx.fillStyle = highlighted
              ? 'rgba(180, 83, 9, 0.94)'
              : style === 'bairro-bar'
                ? 'rgba(46, 16, 62, 0.95)'
                : style === 'brasileira'
                  ? 'rgba(20, 16, 12, 0.94)'
                  : visited
                    ? 'rgba(15, 92, 82, 0.9)'
                    : 'rgba(18, 34, 56, 0.88)';
            ctx.fill();
            ctx.strokeStyle = style === 'bairro-bar' ? '#f0abfc' : highlighted || style === 'brasileira' ? '#fde047' : '#e2d8c5';
            ctx.lineWidth = style === 'bairro-bar' ? 1.8 : 1.3;
            ctx.stroke();
            ctx.fillStyle = style === 'bairro-bar' ? '#fde047' : style === 'brasileira' ? '#fde047' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(titleText, signPt.x, signPt.y + fontSize * 0.34);
            ctx.restore();
          }
        }
      }
    }

    // Iconic Outdoor Oak Wine-Barrel Cocktail Tables with glowing candles & drinks outside Bar da Noite (Bairro Alto)!
    if (style === 'bairro-bar' && dist < 560) {
      for (const bx of [venue.doorX - 42, venue.doorX + 42]) {
        const by = venue.doorY + 12;
        const bz = getTerrainElevation(bx, by);
        const bw = 6.5;
        // Oak barrel staves & dark iron hoops
        this.drawPoly3D(ctx, cam, [[bx - bw, by + bw, bz], [bx + bw, by + bw, bz], [bx + bw, by + bw, bz + 17], [bx - bw, by + bw, bz + 17]], shadeColor('#7c4724', 1.0, isEvening), '#1e293b', 1.1);
        this.drawPoly3D(ctx, cam, [[bx - bw, by - bw, bz + 17], [bx + bw, by - bw, bz + 17], [bx + bw, by + bw, bz + 17], [bx - bw, by + bw, bz + 17]], shadeColor('#9a5b32', 1.0, isEvening), '#451a03', 1.0);
        // Iron hoops
        this.drawLine3D(ctx, cam, [bx - bw, by + bw + 0.2, bz + 5], [bx + bw, by + bw + 0.2, bz + 5], '#1e293b', 1.8);
        this.drawLine3D(ctx, cam, [bx - bw, by + bw + 0.2, bz + 13], [bx + bw, by + bw + 0.2, bz + 13], '#1e293b', 1.8);
        // Glowing cocktail candle & colorful drink glasses on barrel top!
        const cPt = this.projectWorldPt(cam, bx, by, bz + 19.5);
        if (cPt && cPt.cz > 14) {
          const cr = clamp((3.2 * this.focal) / cPt.cz, 1.8, 7);
          if (isEvening || isGolden) {
            const cg = ctx.createRadialGradient(cPt.x, cPt.y, 0.5, cPt.x, cPt.y, cr * 4.2);
            cg.addColorStop(0, 'rgba(253, 224, 71, 0.9)');
            cg.addColorStop(1, 'rgba(251, 146, 60, 0)');
            ctx.fillStyle = cg;
            ctx.beginPath();
            ctx.arc(cPt.x, cPt.y, cr * 4.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(cPt.x, cPt.y, cr * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = bx < venue.doorX ? '#f59e0b' : '#ec4899';
          ctx.fillRect(cPt.x + cr * 0.9, cPt.y - cr * 0.6, cr * 0.75, cr * 1.15);
        }
      }
    }

    // Iconic 3D Bronze Statue of Poet Fernando Pessoa seated outside Cafe A Brasileira (Chiado)!
    if (style === 'brasileira' && dist < 520) {
      const px = venue.doorX + 44;
      const py = venue.doorY + 13;
      const pz = getTerrainElevation(px, py);
      // Cafe marble table & bronze legs
      this.drawLine3D(ctx, cam, [px - 6, py, pz], [px - 6, py, pz + 13], '#3f3f46', 2.2);
      this.drawPoly3D(ctx, cam, [[px - 12, py - 5, pz + 13], [px, py - 5, pz + 13], [px, py + 5, pz + 13], [px - 12, py + 5, pz + 13]], '#f5f0e6', '#52525b', 1.0);
      // Seated bronze figure of Fernando Pessoa (coat + signature fedora hat)
      const figPt = this.projectWorldPt(cam, px + 6, py, pz + 15);
      if (figPt && figPt.cz > 18) {
        const sc = clamp(this.focal / figPt.cz, 0.35, 1.5);
        ctx.fillStyle = '#3f3424';
        ctx.fillRect(figPt.x - 4.5 * sc, figPt.y - 3 * sc, 9 * sc, 13 * sc);
        ctx.beginPath();
        ctx.arc(figPt.x, figPt.y - 6 * sc, 3.6 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#292218';
        ctx.fillRect(figPt.x - 6 * sc, figPt.y - 9.5 * sc, 12 * sc, 2.2 * sc);
        ctx.fillRect(figPt.x - 3.6 * sc, figPt.y - 12.2 * sc, 7.2 * sc, 3.2 * sc);
      }
    }

    // Special Landmark Geometry: Se de Lisboa (1147) Twin Crenellated Romanesque Bell Towers & 8-Spoke Rose Window!
    if (isCathedral) {
      const towerW = 46;
      const towerD = 46;
      const towerH = topZ + 66;
      const towerXs = [x0 + 6, x1 - towerW - 6];
      const ty0 = venue.doorSide === 'south' ? y1 - towerD - 4 : y0 + 4;
      const ty1 = ty0 + towerD;
      for (const tx0 of towerXs) {
        const tx1 = tx0 + towerW;
        if (cam.camY > ty1) {
          this.drawPoly3D(ctx, cam, [[tx0, ty1, topZ], [tx1, ty1, topZ], [tx1, ty1, towerH], [tx0, ty1, towerH]], shadeColor('#e5ddcf', 0.98, isEvening), '#6b6458', 1.2);
          this.drawPoly3D(ctx, cam, [[tx0 + 13, ty1, towerH - 36], [tx1 - 13, ty1, towerH - 36], [tx1 - 13, ty1, towerH - 12], [tx0 + 13, ty1, towerH - 12]], '#2c3542');
          // Crenellated medieval battlements (merlons) along tower crown
          for (let m = 0; m < 4; m += 1) {
            const mx0 = tx0 + 2 + m * 11.2;
            this.drawPoly3D(ctx, cam, [[mx0, ty1, towerH], [mx0 + 7.2, ty1, towerH], [mx0 + 7.2, ty1, towerH + 7], [mx0, ty1, towerH + 7]], shadeColor('#e5ddcf', 1.0, isEvening), '#6b6458', 0.9);
          }
        }
        if (cam.camY < ty0) {
          this.drawPoly3D(ctx, cam, [[tx1, ty0, topZ], [tx0, ty0, topZ], [tx0, ty0, towerH], [tx1, ty0, towerH]], shadeColor('#e5ddcf', 0.84, isEvening), '#6b6458', 1.2);
        }
        if (cam.camX < tx0) {
          this.drawPoly3D(ctx, cam, [[tx0, ty0, topZ], [tx0, ty1, topZ], [tx0, ty1, towerH], [tx0, ty0, towerH]], shadeColor('#e5ddcf', 0.9, isEvening), '#6b6458', 1.2);
          this.drawPoly3D(ctx, cam, [[tx0, ty0 + 13, towerH - 36], [tx0, ty1 - 13, towerH - 36], [tx0, ty1 - 13, towerH - 12], [tx0, ty0 + 13, towerH - 12]], '#2c3542');
        }
        if (cam.camX > tx1) {
          this.drawPoly3D(ctx, cam, [[tx1, ty1, topZ], [tx1, ty0, topZ], [tx1, ty0, towerH], [tx1, ty1, towerH]], shadeColor('#e5ddcf', 0.78, isEvening), '#6b6458', 1.2);
        }
        const cx = (tx0 + tx1) * 0.5;
        const cy = (ty0 + ty1) * 0.5;
        this.drawLine3D(ctx, cam, [cx, cy, towerH + 4], [cx, cy, towerH + 22], '#334155', 2.2);
        this.drawLine3D(ctx, cam, [cx - 7, cy, towerH + 16], [cx + 7, cy, towerH + 16], '#334155', 2.2);
      }
      // Carved 8-Spoke Stained-Glass Rose Window centered between the twin bell towers
      const rosePt = this.projectWorldPt(cam, (x0 + x1) * 0.5, venue.doorSide === 'south' ? y1 + 0.6 : y0 - 0.6, baseZ + 102);
      if (rosePt && dist < 840) {
        const r = clamp((18 * this.focal) / rosePt.cz, 5, 32);
        ctx.fillStyle = isEvening ? '#fde68a' : '#1e3a8a';
        ctx.beginPath();
        ctx.arc(rosePt.x, rosePt.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e5ddcf';
        ctx.lineWidth = Math.max(1.5, r * 0.16);
        ctx.stroke();
        // 8 radiating Romanesque stone tracery spokes & warm ruby/gold stained-glass petals
        ctx.strokeStyle = '#d6cfc0';
        ctx.lineWidth = Math.max(1, r * 0.08);
        for (let sp = 0; sp < 8; sp += 1) {
          const ang = (sp / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(rosePt.x, rosePt.y);
          ctx.lineTo(rosePt.x + Math.cos(ang) * r * 0.92, rosePt.y + Math.sin(ang) * r * 0.92);
          ctx.stroke();
        }
        ctx.fillStyle = isEvening ? '#fffbeb' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(rosePt.x, rosePt.y, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Subtle floating glow indicator on highlighted entrance
    if (highlighted) {
      const pulse = 0.7 + Math.sin(animTime * 6) * 0.3;
      const p = this.projectWorldPt(cam, venue.doorX, venue.doorY, baseZ + 16);
      if (p) {
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(p.x, p.y, clamp((8 * this.focal) / p.cz, 4, 14), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawMetro3D(ctx, cam, station, highlighted, isEvening) {
    const x0 = station.x;
    const x1 = station.x + station.w;
    const y0 = station.y;
    const y1 = station.y + station.h;
    const gz = getTerrainElevation((x0 + x1) * 0.5, y1);
    const h = gz + 38;

    const faces = [];
    if (cam.camY > y1) faces.push([[x0, y1, gz - 3], [x1, y1, gz - 3], [x1, y1, h], [x0, y1, h]], 1.0);
    if (cam.camY < y0) faces.push([[x1, y0, gz - 3], [x0, y0, gz - 3], [x0, y0, h], [x1, y0, h]], 0.85);
    if (cam.camX < x0) faces.push([[x0, y0, gz - 3], [x0, y1, gz - 3], [x0, y1, h], [x0, y0, h]], 0.92);
    if (cam.camX > x1) faces.push([[x1, y1, gz - 3], [x1, y0, gz - 3], [x1, y0, h], [x1, y1, h]], 0.8);

    for (let i = 0; i < faces.length; i += 2) {
      const poly = this.drawPoly3D(
        ctx,
        cam,
        faces[i],
        shadeColor('#d8e4ef', faces[i + 1], isEvening),
        highlighted ? '#38bdf8' : '#1e3a5f',
        highlighted ? 2.2 : 1.3
      );
      if (poly) this.lastHitTargets.push({ kind: 'metro', id: station.id, station, poly });
    }
    // Descending Metro entrance doorway & glass balustrade ribs on the south facade
    if (cam.camY > y1) {
      const dx0 = x0 + station.w * 0.22;
      const dx1 = x1 - station.w * 0.22;
      const doorPoly = this.drawPoly3D(
        ctx,
        cam,
        [[dx0, y1 + 0.5, gz - 2], [dx1, y1 + 0.5, gz - 2], [dx1, y1 + 0.5, gz + 28], [dx0, y1 + 0.5, gz + 28]],
        '#0f172a',
        '#38bdf8',
        1.4
      );
      if (doorPoly) this.lastHitTargets.push({ kind: 'metro', id: station.id, station, poly: doorPoly });
      // Illuminated descending escalator steps inside entrance
      for (let st = 0; st < 4; st += 1) {
        const syZ = gz + 4 + st * 4.5;
        this.drawLine3D(ctx, cam, [dx0 + 3, y1 + 0.6, syZ], [dx1 - 3, y1 + 0.6, syZ], '#64748b', 1.3);
      }
      // Station line-color fascia lintel strip above doorway
      const lineBadgeCol = station.lines?.includes('Linha Vermelha')
        ? '#dc2626'
        : station.lines?.includes('Linha Amarela')
          ? '#eab308'
          : station.lines?.includes('Linha Verde')
            ? '#16a34a'
            : '#2563eb';
      this.drawPoly3D(
        ctx,
        cam,
        [[x0 + 2, y1 + 0.5, h - 7], [x1 - 2, y1 + 0.5, h - 7], [x1 - 2, y1 + 0.5, h - 1], [x0 + 2, y1 + 0.5, h - 1]],
        lineBadgeCol
      );
    }
    // Glazed canopy roof
    this.drawPoly3D(
      ctx,
      cam,
      [[x0 - 4, y0 - 4, h], [x1 + 4, y0 - 4, h], [x1 + 4, y1 + 4, h], [x0 - 4, y1 + 4, h]],
      'rgba(56, 189, 248, 0.55)',
      '#1e3a5f',
      1.4
    );

    // Tall Lisbon Metro Red Diamond "M" street totem pole with crisp station name plaque
    const mx = (x0 + x1) * 0.5;
    const my = y1 + 4;
    this.drawLine3D(ctx, cam, [mx, my, gz], [mx, my, gz + 70], '#334155', 3.2);
    const pt = this.projectWorldPt(cam, mx, my, gz + 76);
    if (pt) {
      const r = clamp((13 * this.focal) / pt.cz, 6, 22);
      ctx.save();
      ctx.fillStyle = '#c81e32';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - r);
      ctx.lineTo(pt.x + r, pt.y);
      ctx.lineTo(pt.x, pt.y + r);
      ctx.lineTo(pt.x - r, pt.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.max(8, Math.round(r * 1.05))}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('M', pt.x, pt.y + r * 0.36);

      // Crisp Metropolitano de Lisboa station name collar below the red diamond totem
      if (r >= 7.5) {
        const cleanName = (station.name || 'METRO').replace(/^Metro\s+/i, '').toUpperCase();
        const fs = Math.max(7, Math.round(r * 0.46));
        ctx.font = `800 ${fs}px "Segoe UI", sans-serif`;
        const colW = Math.max(r * 3.0, ctx.measureText(cleanName).width + 12);
        const colH = Math.max(12, r * 0.8);
        const borderCol = station.lines?.includes('Linha Vermelha')
          ? '#ef4444'
          : station.lines?.includes('Linha Amarela')
            ? '#facc15'
            : station.lines?.includes('Linha Verde')
              ? '#22c55e'
              : '#93c5fd';
        drawRoundedRect(ctx, pt.x - colW * 0.5, pt.y + r + 3, colW, colH, 3);
        ctx.fillStyle = '#1e3a8a';
        ctx.fill();
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(cleanName, pt.x, pt.y + r + 3 + colH * 0.68);
      }
      ctx.restore();
    }
  }

  drawFerryTerminal3D(ctx, cam, highlighted, isEvening) {
    const f = FERRY_TERMINAL;
    const x0 = f.x;
    const x1 = f.x + f.w;
    const y0 = f.y;
    const y1 = f.y + f.h;
    const wallH = 88;
    const roofH = 26;
    const ridgeX0 = x0 + 24;
    const ridgeX1 = x1 - 24;
    const ridgeY = (y0 + y1) * 0.5;
    const ridgeZ = wallH + roofH;

    // 4-sided pitched emerald maritime terminal hip roof
    if (cam.camY <= ridgeY) {
      this.drawPoly3D(
        ctx,
        cam,
        [[x1 + 3, y0 - 2, wallH], [x0 - 3, y0 - 2, wallH], [ridgeX0, ridgeY, ridgeZ], [ridgeX1, ridgeY, ridgeZ]],
        shadeColor('#0f5c52', 0.95, isEvening),
        '#083b34',
        1.2
      );
    }
    if (cam.camY >= ridgeY) {
      this.drawPoly3D(
        ctx,
        cam,
        [[x0 - 3, y1 + 2, wallH], [x1 + 3, y1 + 2, wallH], [ridgeX1, ridgeY, ridgeZ], [ridgeX0, ridgeY, ridgeZ]],
        shadeColor('#0f5c52', 0.86, isEvening),
        '#083b34',
        1.2
      );
    }
    if (cam.camX <= ridgeX0) {
      this.drawPoly3D(
        ctx,
        cam,
        [[x0 - 2, y0 - 2, wallH], [x0 - 2, y1 + 2, wallH], [ridgeX0, ridgeY, ridgeZ]],
        shadeColor('#0f5c52', 0.88, isEvening),
        '#083b34',
        1.2
      );
    }
    if (cam.camX >= ridgeX1) {
      this.drawPoly3D(
        ctx,
        cam,
        [[x1 + 2, y1 + 2, wallH], [x1 + 2, y0 - 2, wallH], [ridgeX1, ridgeY, ridgeZ]],
        shadeColor('#0f5c52', 0.8, isEvening),
        '#083b34',
        1.2
      );
    }

    const drawFace = (pts, shade) => {
      const poly = this.drawPoly3D(
        ctx,
        cam,
        pts,
        shadeColor('#e5ded0', shade, isEvening),
        highlighted ? '#facc15' : '#0f5c52',
        highlighted ? 2.4 : 1.4
      );
      if (poly) this.lastHitTargets.push({ kind: 'ferry', id: f.id, poly });
    };

    const winCol = isEvening ? '#fde68a' : '#bfe3f5';

    if (cam.camY < y0) {
      drawFace([[x1, y0, 0], [x0, y0, 0], [x0, y0, wallH], [x1, y0, wallH]], 0.98);
      this.drawPoly3D(ctx, cam, [[x1, y0, 0], [x0, y0, 0], [x0, y0, 12], [x1, y0, 12]], shadeColor('#0f5c52', 0.92, isEvening));
      this.drawPoly3D(ctx, cam, [[x1, y0, wallH - 10], [x0, y0, wallH - 10], [x0, y0, wallH], [x1, y0, wallH]], shadeColor('#0f5c52', 0.96, isEvening));
      for (const u of [0.22, 0.5, 0.78]) {
        const wx0 = x0 + (x1 - x0) * (u - 0.1);
        const wx1 = x0 + (x1 - x0) * (u + 0.1);
        this.drawPoly3D(
          ctx,
          cam,
          [[wx1, y0, 0], [wx0, y0, 0], [wx0, y0, 46], [wx1, y0, 46]],
          u === 0.5 ? '#1e3a5f' : winCol,
          '#0f5c52',
          1.8
        );
        this.drawLine3D(ctx, cam, [(wx0 + wx1) * 0.5, y0, 0], [(wx0 + wx1) * 0.5, y0, 46], '#0f5c52', 1.1);
        this.drawLine3D(ctx, cam, [wx0, y0, 24], [wx1, y0, 24], '#0f5c52', 1.0);
      }
    }
    if (cam.camY > y1) {
      drawFace([[x0, y1, 0], [x1, y1, 0], [x1, y1, wallH], [x0, y1, wallH]], 0.9);
      this.drawPoly3D(ctx, cam, [[x0, y1, 0], [x1, y1, 0], [x1, y1, 12], [x0, y1, 12]], shadeColor('#0f5c52', 0.88, isEvening));
      this.drawPoly3D(ctx, cam, [[x0, y1, wallH - 10], [x1, y1, wallH - 10], [x1, y1, wallH], [x0, y1, wallH]], shadeColor('#0f5c52', 0.92, isEvening));
      for (const u of [0.22, 0.5, 0.78]) {
        const wx0 = x0 + (x1 - x0) * (u - 0.09);
        const wx1 = x0 + (x1 - x0) * (u + 0.09);
        this.drawPoly3D(ctx, cam, [[wx0, y1, 16], [wx1, y1, 16], [wx1, y1, 56], [wx0, y1, 56]], winCol, '#0f5c52', 1.4);
      }
    }
    if (cam.camX < x0) {
      drawFace([[x0, y0, 0], [x0, y1, 0], [x0, y1, wallH], [x0, y0, wallH]], 0.86);
      // Detailed West Facade: emerald plinth, cornice, twin arched maritime windows & life-ring plaque!
      this.drawPoly3D(ctx, cam, [[x0, y0, 0], [x0, y1, 0], [x0, y1, 12], [x0, y0, 12]], shadeColor('#0f5c52', 0.85, isEvening));
      this.drawPoly3D(ctx, cam, [[x0, y0, wallH - 10], [x0, y1, wallH - 10], [x0, y1, wallH], [x0, y0, wallH]], shadeColor('#0f5c52', 0.9, isEvening));
      for (const v of [0.28, 0.72]) {
        const wy0 = y0 + (y1 - y0) * (v - 0.14);
        const wy1 = y0 + (y1 - y0) * (v + 0.14);
        this.drawPoly3D(ctx, cam, [[x0, wy0, 18], [x0, wy1, 18], [x0, wy1, 58], [x0, wy0, 58]], winCol, '#0f5c52', 1.5);
        this.drawLine3D(ctx, cam, [x0, (wy0 + wy1) * 0.5, 18], [x0, (wy0 + wy1) * 0.5, 58], '#0f5c52', 1.1);
        this.drawLine3D(ctx, cam, [x0, wy0, 38], [x0, wy1, 38], '#0f5c52', 1.0);
      }
    }
    if (cam.camX > x1) {
      drawFace([[x1, y1, 0], [x1, y0, 0], [x1, y0, wallH], [x1, y1, wallH]], 0.8);
      this.drawPoly3D(ctx, cam, [[x1, y1, 0], [x1, y0, 0], [x1, y0, 12], [x1, y1, 12]], shadeColor('#0f5c52', 0.82, isEvening));
      this.drawPoly3D(ctx, cam, [[x1, y1, wallH - 10], [x1, y0, wallH - 10], [x1, y0, wallH], [x1, y1, wallH]], shadeColor('#0f5c52', 0.86, isEvening));
      for (const v of [0.28, 0.72]) {
        const wy0 = y0 + (y1 - y0) * (v - 0.14);
        const wy1 = y0 + (y1 - y0) * (v + 0.14);
        this.drawPoly3D(ctx, cam, [[x1, wy1, 18], [x1, wy0, 18], [x1, wy0, 58], [x1, wy1, 58]], winCol, '#0f5c52', 1.5);
      }
    }

    // Transtejo green fascia banner
    const signPt = this.projectWorldPt(cam, (x0 + x1) * 0.5, y0, 68);
    if (signPt) {
      const scale = clamp(this.focal / signPt.cz, 0.45, 1.45);
      const fontSize = Math.max(8, Math.round(10 * scale));
      ctx.save();
      ctx.font = `700 ${fontSize}px Georgia, serif`;
      const txt = 'CAIS DO SODRE - TRANSTEJO FERRIES';
      const tw = ctx.measureText(txt).width + 14 * scale;
      const th = 16 * scale;
      drawRoundedRect(ctx, signPt.x - tw * 0.5, signPt.y - th * 0.5, tw, th, 4);
      ctx.fillStyle = '#0f5c52';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(txt, signPt.x, signPt.y + fontSize * 0.34);
      ctx.restore();
    }
  }

  drawSantaJustaTower3D(ctx, cam, highlighted, isEvening, animTime = 0) {
    // Authentic 45m Neo-Gothic Cast-Iron Elevador de Santa Justa (Raoul Mesnier du Ponsard, 1902) on Rua do Carmo!
    const x0 = SANTA_JUSTA_LIFT.x;
    const y0 = SANTA_JUSTA_LIFT.y;
    const x1 = x0 + SANTA_JUSTA_LIFT.w;
    const y1 = y0 + SANTA_JUSTA_LIFT.h;
    const cx = (x0 + x1) * 0.5;
    const cy = (y0 + y1) * 0.5;
    const baseZ = Math.min(
      getTerrainElevation(x0, y1),
      getTerrainElevation(x1, y1),
      getTerrainElevation(x0, y0),
      getTerrainElevation(x1, y0)
    );
    const towerH = 186;
    const topZ = baseZ + towerH;
    const ironMain = isEvening ? '#1e2733' : '#2f3d4c';
    const ironDark = isEvening ? '#131a24' : '#1f2937';
    const ironTrim = highlighted ? '#facc15' : isEvening ? '#94a3b8' : '#cbd5e1';
    const skyGlass = isEvening ? 'rgba(30, 58, 108, 0.52)' : 'rgba(147, 197, 253, 0.42)';

    const drawIronFace = (pts, shade) => {
      const p = this.drawPoly3D(
        ctx,
        cam,
        pts,
        shadeColor(ironMain, shade, isEvening),
        highlighted ? '#facc15' : '#111827',
        highlighted ? 2.4 : 1.4
      );
      if (p) this.lastHitTargets.push({ kind: 'santa-justa', id: SANTA_JUSTA_LIFT.id, poly: p });
    };

    // Stone masonry base plinth anchored cleanly to Rua do Carmo slope
    const plinthH = 16;
    const drawPlinthFace = (pts, shade) => {
      const p = this.drawPoly3D(ctx, cam, pts, shadeColor('#d6cec0', shade, isEvening), '#57534e', 1.2);
      if (p) this.lastHitTargets.push({ kind: 'santa-justa', id: SANTA_JUSTA_LIFT.id, poly: p });
    };

    // Draw visible vertical tower sides with 5 tiers of Neo-Gothic pointed filigree arches
    const drawGothicFacade = (ax, ay, bx, by, shade, hasDoor = false) => {
      drawPlinthFace([[ax, ay, baseZ - 4], [bx, by, baseZ - 4], [bx, by, baseZ + plinthH], [ax, ay, baseZ + plinthH]], shade);
      drawIronFace([[ax, ay, baseZ + plinthH], [bx, by, baseZ + plinthH], [bx, by, topZ], [ax, ay, topZ]], shade);

      const lerpPt = (u, z) => [ax + (bx - ax) * u, ay + (by - ay) * u, z];
      // 5 vertical Neo-Gothic tiers with twin pointed lancet filigree arches
      for (let tier = 0; tier < 5; tier += 1) {
        const z0 = baseZ + plinthH + 4 + tier * 33;
        const z1 = z0 + 28;
        this.drawLine3D(ctx, cam, lerpPt(0, z0), lerpPt(1, z0), ironTrim, 1.5);
        for (const [u0, u1] of [[0.1, 0.46], [0.54, 0.9]]) {
          const um = (u0 + u1) * 0.5;
          const archPoly = [
            lerpPt(u0, z0 + 2),
            lerpPt(u1, z0 + 2),
            lerpPt(u1, z1 - 7),
            lerpPt(um, z1),
            lerpPt(u0, z1 - 7)
          ];
          this.drawPoly3D(ctx, cam, archPoly, skyGlass, ironTrim, 1.15);
          // Delicate iron Neo-Gothic diamond cross-bracing inside each lancet bay
          this.drawLine3D(ctx, cam, lerpPt(u0, z0 + 2), lerpPt(u1, z1 - 7), 'rgba(203, 213, 225, 0.45)', 0.9);
          this.drawLine3D(ctx, cam, lerpPt(u1, z0 + 2), lerpPt(u0, z1 - 7), 'rgba(203, 213, 225, 0.45)', 0.9);
        }
      }

      if (hasDoor) {
        // Warm illuminated Neo-Gothic entrance portal & animated wooden lift cabin riding inside the shaft!
        const doorPoly = this.drawPoly3D(
          ctx,
          cam,
          [lerpPt(0.24, baseZ), lerpPt(0.76, baseZ), lerpPt(0.76, baseZ + 38), lerpPt(0.5, baseZ + 46), lerpPt(0.24, baseZ + 38)],
          '#3b2314',
          '#fde047',
          2.0
        );
        if (doorPoly) this.lastHitTargets.push({ kind: 'santa-justa', id: SANTA_JUSTA_LIFT.id, poly: doorPoly });
        // Warm lantern glow inside entrance lobby
        this.drawPoly3D(
          ctx,
          cam,
          [lerpPt(0.32, baseZ + 4), lerpPt(0.68, baseZ + 4), lerpPt(0.68, baseZ + 32), lerpPt(0.32, baseZ + 32)],
          '#fef08a',
          '#92400e',
          1.2
        );
        // Animated mahogany-and-brass elevator cab gliding vertically through the tower shaft!
        const cabZ = baseZ + 44 + ((Math.sin(animTime * 1.1) + 1) * 0.5) * 106;
        this.drawPoly3D(
          ctx,
          cam,
          [lerpPt(0.22, cabZ), lerpPt(0.78, cabZ), lerpPt(0.78, cabZ + 22), lerpPt(0.22, cabZ + 22)],
          '#9a3412',
          '#fde047',
          1.6
        );
        this.drawPoly3D(
          ctx,
          cam,
          [lerpPt(0.3, cabZ + 5), lerpPt(0.7, cabZ + 5), lerpPt(0.7, cabZ + 17), lerpPt(0.3, cabZ + 17)],
          '#fef9c3'
        );
      }
    };

    if (cam.camY > y1) drawGothicFacade(x0, y1, x1, y1, 0.98, true);
    if (cam.camY < y0) drawGothicFacade(x1, y0, x0, y0, 0.88, false);
    if (cam.camX < x0) drawGothicFacade(x0, y0, x0, y1, 0.84, false);
    if (cam.camX > x1) drawGothicFacade(x1, y1, x1, y0, 0.82, false);

    // Overhanging 45m Upper Miradouro Observation Gallery Deck & Neo-Gothic Railing
    const deckPad = 10;
    const deckZ0 = topZ;
    const deckZ1 = topZ + 12;
    const dx0 = x0 - deckPad;
    const dx1 = x1 + deckPad;
    const dy0 = y0 - deckPad;
    const dy1 = y1 + deckPad;
    if (cam.camY > dy1) {
      this.drawPoly3D(ctx, cam, [[dx0, dy1, deckZ0], [dx1, dy1, deckZ0], [dx1, dy1, deckZ1], [dx0, dy1, deckZ1]], ironDark, '#fde047', 1.5);
    }
    if (cam.camX < dx0) {
      this.drawPoly3D(ctx, cam, [[dx0, dy0, deckZ0], [dx0, dy1, deckZ0], [dx0, dy1, deckZ1], [dx0, dy0, deckZ1]], ironDark, '#cbd5e1', 1.3);
    }
    if (cam.camX > dx1) {
      this.drawPoly3D(ctx, cam, [[dx1, dy1, deckZ0], [dx1, dy0, deckZ0], [dx1, dy0, deckZ1], [dx1, dy1, deckZ1]], ironDark, '#cbd5e1', 1.3);
    }

    // Elevated Iron Passadico do Carmo Walkway Skybridge extending West from top gallery
    const brZ0 = topZ - 18;
    const brZ1 = topZ - 6;
    const brX0 = x0 - 66;
    this.drawPoly3D(ctx, cam, [[brX0, cy + 10, brZ0], [x0, cy + 10, brZ0], [x0, cy + 10, brZ1], [brX0, cy + 10, brZ1]], ironDark, '#94a3b8', 1.3);
    this.drawLine3D(ctx, cam, [brX0, cy + 10, brZ1], [x0, cy + 10, brZ0], '#cbd5e1', 1.0);
    this.drawLine3D(ctx, cam, [brX0, cy + 10, brZ0], [x0, cy + 10, brZ1], '#cbd5e1', 1.0);

    // Classic wrought-iron signboard over entrance portal
    const signPt = this.projectWorldPt(cam, cx, y1 + 2, baseZ + 56);
    if (signPt && signPt.cz < 720) {
      const scale = clamp(this.focal / signPt.cz, 0.5, 1.35);
      const fontSize = Math.max(8, Math.round(10 * scale));
      ctx.save();
      ctx.font = `700 ${fontSize}px Georgia, serif`;
      const txt = 'ELEVADOR DE SANTA JUSTA (1902)';
      const tw = ctx.measureText(txt).width + 14 * scale;
      const th = 16 * scale;
      drawRoundedRect(ctx, signPt.x - tw * 0.5, signPt.y - th * 0.5, tw, th, 4);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = highlighted ? '#facc15' : '#eab308';
      ctx.lineWidth = highlighted ? 2 : 1.4;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(txt, signPt.x, signPt.y + fontSize * 0.34);
      ctx.restore();
    }
  }

  drawCityDistrictSpot3D(ctx, cam, spot, highlighted, isEvening, animTime = 0, state = null) {
    const x0 = spot.worldX;
    const y0 = spot.worldY;
    const x1 = x0 + spot.w;
    const y1 = y0 + spot.h;
    const cx = (x0 + x1) * 0.5;
    const cy = (y0 + y1) * 0.5;
    const gz = getTerrainElevation(cx, y1);
    const accent = spot.accentColor || '#1b4d89';
    const hitMeta = { kind: 'city-district-spot', spotId: spot.id, spot };
    const topH = spot.kind === 'landmark' ? 128 : 108;

    const drawRectBox = (bx0, by0, bx1, by1, z0, z1, frontCol, sideCol, roofCol, strokeCol) => {
      // Exact back-face culled solid architectural prism (never renders interior walls over front faces!)
      const faces = [];
      if (cam.camY > by1) {
        faces.push({ pts: [[bx0, by1, z0], [bx1, by1, z0], [bx1, by1, z1], [bx0, by1, z1]], col: frontCol, shade: 1.0, hit: true });
      }
      if (cam.camY < by0) {
        faces.push({ pts: [[bx1, by0, z0], [bx0, by0, z0], [bx0, by0, z1], [bx1, by0, z1]], col: sideCol, shade: 0.85, hit: true });
      }
      if (cam.camX < bx0) {
        faces.push({ pts: [[bx0, by0, z0], [bx0, by1, z0], [bx0, by1, z1], [bx0, by0, z1]], col: sideCol, shade: 0.92, hit: true });
      }
      if (cam.camX > bx1) {
        faces.push({ pts: [[bx1, by1, z0], [bx1, by0, z0], [bx1, by0, z1], [bx1, by1, z1]], col: sideCol, shade: 0.82, hit: true });
      }
      if (cam.camZ > z1) {
        faces.push({ pts: [[bx0, by0, z1], [bx1, by0, z1], [bx1, by1, z1], [bx0, by1, z1]], col: roofCol, shade: 0.96, hit: false });
      }
      for (const f of faces) {
        const poly = this.drawPoly3D(ctx, cam, f.pts, shadeColor(f.col, f.shade, isEvening), strokeCol, highlighted ? 2 : 1.1);
        if (poly && f.hit) {
          this.lastHitTargets.push({ ...hitMeta, poly });
        }
      }
    };

    if (spot.kind === 'landmark') {
      const style = spot.skylineStyle;
      if (style === 'belem-tower') {
        // 1515 Manueline Torre de Belem limestone bastion, arched loggia, crenellations & keep tower
        drawRectBox(x0 + 6, y0 + 18, x1 - 6, y1, gz, gz + 44, '#f2ead9', '#dfd4bf', '#e5dbc7', highlighted ? '#facc15' : '#645c50');
        drawRectBox(x0 + 46, y0 + 8, x1 - 46, y1 - 24, gz + 44, gz + 128, '#f5efe2', '#e2d7c2', '#d6cbb5', highlighted ? '#facc15' : '#57534e');
        if (cam.camY > y1) {
          // Carved stone battlements along bastion parapet & Manueline arched loggia windows
          for (let mx = x0 + 14; mx < x1 - 18; mx += 24) {
            drawRectBox(mx, y1 - 8, mx + 12, y1, gz + 44, gz + 53, '#efe5d1', '#d6cbb5', '#e5dbc7', '#645c50');
          }
          for (const ox of [-24, 0, 24]) {
            this.drawPoly3D(ctx, cam, [[cx + ox - 8, y1 - 23.4, gz + 62], [cx + ox + 8, y1 - 23.4, gz + 62], [cx + ox + 8, y1 - 23.4, gz + 86], [cx + ox - 8, y1 - 23.4, gz + 86]], isEvening ? '#fde68a' : '#2c4159', '#645c50', 1.2);
          }
          // Twin corner Moorish domed bartizan watchtowers
          for (const bx of [x0 + 10, x1 - 26]) {
            drawRectBox(bx, y1 - 16, bx + 16, y1 + 4, gz + 34, gz + 62, '#efe5d1', '#d6cbb5', '#9a3412', '#57534e');
          }
        }
      } else if (style === 'marques-pombal') {
        // Monumento ao Marques de Pombal stepped limestone plinth, fluted column & bronze statue with lion
        drawRectBox(x0 + 12, y0 + 16, x1 - 12, y1, gz, gz + 34, '#e5ded0', '#cfc6b5', '#ece6da', highlighted ? '#facc15' : '#57534e');
        drawRectBox(cx - 22, cy - 22, cx + 22, cy + 22, gz + 34, gz + 126, '#f5efe2', '#ded6c6', '#d6cbb5', highlighted ? '#facc15' : '#57534e');
        // Bronze sculpture of Marques de Pombal and lion crowning the column
        drawRectBox(cx - 12, cy - 12, cx + 12, cy + 12, gz + 126, gz + 148, '#365314', '#1a2e05', '#4d7c0f', '#14532d');
      } else if (style === 'campo-pequeno') {
        // Elaborate 1892 Neo-Moorish Red-Brick Campo Pequeno Rotunda Complex: central arena, 4 golden-domed minaret towers, horseshoe arcades & plaza terrace
        drawRectBox(x0 - 4, y0 + 6, x1 + 4, y1 + 4, gz, gz + 18, '#dfd6c5', '#c7beae', '#e8e0d2', '#78716c');
        drawRectBox(x0 + 4, y0 + 10, x1 - 4, y1, gz + 18, gz + 96, '#b44123', '#8c2d17', '#7c2d12', highlighted ? '#facc15' : '#451a03');
        // Central domed copper arena lantern
        drawRectBox(cx - 28, cy - 24, cx + 28, cy + 24, gz + 96, gz + 122, '#9a3412', '#7c2d12', '#d97706', '#451a03');
        // Four signature corner Moorish minaret towers with golden onion domes
        for (const [tx, ty] of [[x0 + 10, y0 + 14], [x1 - 36, y0 + 14], [x0 + 10, y1 - 36], [x1 - 36, y1 - 36]]) {
          drawRectBox(tx, ty, tx + 26, ty + 26, gz + 96, gz + 132, '#c2410c', '#9a3412', '#facc15', '#451a03');
          drawRectBox(tx + 5, ty + 5, tx + 21, ty + 21, gz + 132, gz + 146, '#facc15', '#ca8a04', '#fef08a', '#78350f');
        }
        // Horseshoe arched colonnade windows across the front facade
        if (cam.camY > y1) {
          for (const ox of [-58, -28, 0, 28, 58]) {
            this.drawPoly3D(ctx, cam, [[cx + ox - 9, y1 + 0.6, gz + 26], [cx + ox + 9, y1 + 0.6, gz + 26], [cx + ox + 9, y1 + 0.6, gz + 64], [cx + ox - 9, y1 + 0.6, gz + 64]], isEvening ? '#fde68a' : '#291711', '#facc15', 1.2);
          }
        }
      } else if (style === 'alameda-fountain') {
        // 1948 Monumental Fonte Luminosa limestone colonnade & sparkling water jets
        drawRectBox(x0 + 4, y0 + 8, x1 - 4, y0 + 62, gz, gz + 96, '#f1f5f9', '#cbd5e1', '#94a3b8', highlighted ? '#facc15' : '#475569');
        drawRectBox(x0 + 8, y0 + 62, x1 - 8, y1, gz, gz + 22, '#e2e8f0', '#cbd5e1', '#0284c7', '#475569');
        for (const ox of [-52, -26, 0, 26, 52]) {
          const jh = (ox === 0 ? 112 : 84) + Math.sin(animTime * 5 + ox) * 8;
          this.drawLine3D(ctx, cam, [cx + ox, y1 - 24, gz + 22], [cx + ox, y1 - 24, gz + jh], '#e0f2fe', 3.4);
        }
      } else if (style === 'oriente-calatrava') {
        // Santiago Calatrava soaring white steel gothic tree-arches at Gare do Oriente + Oceanario pavilion
        drawRectBox(x0 + 4, y0 + 10, x1 - 4, y1, gz, gz + 26, '#e2e8f0', '#cbd5e1', '#f1f5f9', highlighted ? '#facc15' : '#475569');
        for (const ox of [-66, 0, 66]) {
          this.drawLine3D(ctx, cam, [cx + ox, y1 - 24, gz + 26], [cx + ox, y1 - 24, gz + 96], '#ffffff', 4.6);
          for (const dx of [-36, -18, 18, 36]) {
            this.drawLine3D(ctx, cam, [cx + ox, y1 - 24, gz + 64], [cx + ox + dx, y1 - 24, gz + 128], '#f8fafc', 2.6);
          }
        }
        this.drawPoly3D(ctx, cam, [[x0 + 8, y1 - 36, gz + 124], [x1 - 8, y1 - 36, gz + 124], [x1 - 8, y1 - 10, gz + 128], [x0 + 8, y1 - 10, gz + 128]], 'rgba(224, 242, 254, 0.72)', '#0284c7', 1.8);
      } else if (style === 'aeroporto-terminal') {
        // Elaborate Multi-Building Aeroporto Humberto Delgado (LIS) Complex: Terminal 1 Main Glass Hall + Pier North & South Boarding Concourses + Jet-Bridges + Tall ATC Control Tower + Radar Dome!
        // 1) Main Terminal 1 Departures Hall & Crimson Aviation Canopy
        drawRectBox(x0 + 4, y0 + 18, x1 - 4, y1, gz, gz + 78, '#f1f5f9', '#cbd5e1', '#94a3b8', highlighted ? '#facc15' : '#334155');
        drawRectBox(x0 - 4, y0 + 12, x1 + 4, y1 + 5, gz + 78, gz + 90, '#dc2626', '#991b1b', '#b91c1c', '#7f1d1d');
        // 2) Pier West & Pier East Boarding Concourse Wings + Airside Jet-Bridges extending toward Runway 03/21
        drawRectBox(x0 - 38, y0 + 6, x0 + 4, y0 + 72, gz, gz + 54, '#e2e8f0', '#cbd5e1', '#38bdf8', '#334155');
        drawRectBox(x1 - 4, y0 + 6, x1 + 38, y0 + 72, gz, gz + 54, '#e2e8f0', '#cbd5e1', '#38bdf8', '#334155');
        drawRectBox(x0 - 24, y0 - 22, x0 - 8, y0 + 8, gz + 22, gz + 38, '#cbd5e1', '#94a3b8', '#e2e8f0', '#334155');
        drawRectBox(x1 + 8, y0 - 22, x1 + 24, y0 + 8, gz + 22, gz + 38, '#cbd5e1', '#94a3b8', '#e2e8f0', '#334155');
        // 3) Tall Air-Traffic Control Tower & Rotating White Radar Dome
        drawRectBox(cx - 15, y0 + 14, cx + 15, y0 + 44, gz + 90, gz + 150, '#e2e8f0', '#cbd5e1', '#f8fafc', '#475569');
        drawRectBox(cx - 25, y0 + 8, cx + 25, y0 + 50, gz + 150, gz + 170, '#0ea5e9', '#0369a1', '#f8fafc', '#0f172a');
        drawRectBox(cx - 10, y0 + 18, cx + 10, y0 + 38, gz + 170, gz + 186, '#ffffff', '#e2e8f0', '#dc2626', '#475569');
        if (cam.camY > y1) {
          for (const ox of [-56, 0, 56]) {
            this.drawPoly3D(ctx, cam, [[cx + ox - 20, y1 + 0.5, gz + 8], [cx + ox + 20, y1 + 0.5, gz + 8], [cx + ox + 20, y1 + 0.5, gz + 66], [cx + ox - 20, y1 + 0.5, gz + 66]], isEvening ? '#fde68a' : '#0ea5e9', '#1e293b', 1.3);
          }
        }
      } else if (style === 'ist-alameda-campus') {
        // Elaborate Multi-Building Instituto Superior Tecnico (Alameda Campus, Porfirio Pardal Monteiro 1936):
        // Green hilltop campus plinth + Grand Staircase + Pavilhao Central + Twin Torre Norte & Torre Sul + Civil/Quimica Academic Wings!
        drawRectBox(x0 - 8, y0, x1 + 8, y1 + 6, gz, gz + 18, '#e5ded0', '#cfc6b5', '#3f7d52', '#475569');
        // Pavilhao Central (monumental limestone colonnade + blue IST pediment)
        drawRectBox(cx - 48, y0 + 14, cx + 48, y0 + 96, gz + 18, gz + 108, '#f5efe2', '#ded6c6', '#1d4ed8', highlighted ? '#facc15' : '#334155');
        drawRectBox(cx - 24, y0 - 2, cx + 24, y0 + 18, gz + 4, gz + 24, '#e2e8f0', '#cbd5e1', '#f8fafc', '#64748b');
        // Flanking Twin 12-story Torre Norte & Torre Sul modernist glass-and-concrete towers!
        drawRectBox(x0 + 2, y0 + 68, x0 + 46, y1, gz + 18, gz + 168, '#dbeafe', '#93c5fd', '#1e3a8a', '#1e293b');
        drawRectBox(x1 - 46, y0 + 68, x1 - 2, y1, gz + 18, gz + 168, '#dbeafe', '#93c5fd', '#1e3a8a', '#1e293b');
        // Civil & Mecanica Side Academic Wings
        drawRectBox(x0 + 4, y0 + 12, x0 + 52, y0 + 62, gz + 18, gz + 82, '#efe8da', '#d8cfc0', '#b84a32', '#475569');
        drawRectBox(x1 - 52, y0 + 12, x1 - 4, y0 + 62, gz + 18, gz + 82, '#efe8da', '#d8cfc0', '#b84a32', '#475569');
      } else if (style === 'colombo-complex') {
        // Elaborate Multi-Building Centro Comercial Colombo (Benfica):
        // Twin Torre Oriente & Torre Ocidente glass office towers + Central Sunlit Praca Central Dome + Symmetrical Discoveries Galleria Wings!
        drawRectBox(x0 - 6, y0 + 8, x1 + 6, y1, gz, gz + 76, '#f5e6d0', '#dfd0b8', '#b84a32', highlighted ? '#facc15' : '#57534e');
        // Central sunlit glass dome atrium (Praca Central)
        drawRectBox(cx - 38, cy - 32, cx + 38, cy + 32, gz + 76, gz + 114, '#e0f2fe', '#7dd3fc', '#38bdf8', '#0284c7');
        // Twin Colombo Towers (Torre Oriente & Torre Ocidente) soaring above the shopping complex
        drawRectBox(x0 + 8, y0 + 16, x0 + 54, y0 + 68, gz + 76, gz + 174, '#e2e8f0', '#94a3b8', '#2563eb', '#1e293b');
        drawRectBox(x1 - 54, y0 + 16, x1 - 8, y0 + 68, gz + 76, gz + 174, '#e2e8f0', '#94a3b8', '#2563eb', '#1e293b');
      } else if (style === 'vasco-da-gama-mall') {
        // Elaborate Multi-Building Centro Comercial Vasco da Gama (Parque das Nacoes):
        // Flanking twin Expo 98 pavilions + sweeping blue-glass barrel-vault skylight + cascading water-wall facade!
        drawRectBox(x0, y0 + 10, x0 + 68, y1, gz, gz + 88, '#f1f5f9', '#cbd5e1', '#0284c7', highlighted ? '#facc15' : '#334155');
        drawRectBox(x1 - 68, y0 + 10, x1, y1, gz, gz + 88, '#f1f5f9', '#cbd5e1', '#0284c7', highlighted ? '#facc15' : '#334155');
        // Central glass galleria atrium with cascading wave-blue skylight vault
        drawRectBox(x0 + 64, y0 + 14, x1 - 64, y1 - 4, gz, gz + 106, '#e0f2fe', '#bae6fd', '#38bdf8', '#0284c7');
        for (const ox of [-30, 0, 30]) {
          this.drawLine3D(ctx, cam, [cx + ox, y0 + 14, gz + 106], [cx + ox, y1 - 4, gz + 124], '#ffffff', 2.8);
        }
      } else if (style === 'estadio-luz' || style === 'estadio-alvalade') {
        // Iconic Lisbon Football Stadiums: Red-Arched Estadio da Luz (SL Benfica) & Emerald-Gold Estadio Jose Alvalade (Sporting CP)
        const mainCol = style === 'estadio-luz' ? '#dc2626' : '#15803d';
        const darkCol = style === 'estadio-luz' ? '#991b1b' : '#14532d';
        const trimCol = style === 'estadio-luz' ? '#f8fafc' : '#facc15';
        drawRectBox(x0 + 4, y0 + 10, x1 - 4, y1, gz, gz + 74, '#f1f5f9', '#cbd5e1', mainCol, highlighted ? '#facc15' : darkCol);
        drawRectBox(x0 + 10, y0 + 14, x1 - 10, y1 - 6, gz + 74, gz + 94, mainCol, darkCol, trimCol, '#1e293b');
        // Signature soaring stadium roof arches
        for (const ox of [-70, 0, 70]) {
          this.drawLine3D(ctx, cam, [cx + ox - 34, y1 - 8, gz + 92], [cx + ox, y1 - 8, gz + 138], mainCol, 4.2);
          this.drawLine3D(ctx, cam, [cx + ox, y1 - 8, gz + 138], [cx + ox + 34, y1 - 8, gz + 92], mainCol, 4.2);
        }
      } else if (style === 'torre-vasco-da-gama') {
        // 145-meter Torre Vasco da Gama curved steel lattice caravel sail skyscraper at Parque das Nacoes
        drawRectBox(x0 + 14, y0 + 24, x1 - 14, y1, gz, gz + 48, '#e2e8f0', '#cbd5e1', '#0284c7', highlighted ? '#facc15' : '#334155');
        drawRectBox(cx - 18, y0 + 18, cx + 18, y0 + 62, gz + 48, gz + 186, '#f8fafc', '#cbd5e1', '#e0f2fe', '#0284c7');
        // Observation deck & soaring sail fin
        drawRectBox(cx - 34, y0 + 12, cx + 34, y0 + 68, gz + 144, gz + 162, '#0ea5e9', '#0369a1', '#f8fafc', '#0f172a');
        this.drawLine3D(ctx, cam, [cx + 18, y0 + 40, gz + 48], [cx + 58, y0 + 40, gz + 115], '#f8fafc', 3.4);
        this.drawLine3D(ctx, cam, [cx + 58, y0 + 40, gz + 115], [cx + 18, y0 + 40, gz + 186], '#f8fafc', 3.4);
      } else if (style === 'viuva-lamego') {
        // 1849 Fabrica Viuva Lamego & Pavilhao Carlos Lopes cobalt-and-gold azulejo tiled facade
        drawRectBox(x0 + 4, y0 + 10, x1 - 4, y1, gz, gz + 112, '#dbeafe', '#bfdbfe', '#b84a32', highlighted ? '#facc15' : '#1e3a8a');
        if (cam.camY > y1) {
          this.drawPoly3D(ctx, cam, [[x0 + 8, y1 + 0.5, gz + 14], [x1 - 8, y1 + 0.5, gz + 14], [x1 - 8, y1 + 0.5, gz + 104], [x0 + 8, y1 + 0.5, gz + 104]], '#1d4ed8', '#facc15', 1.6);
          for (const ox of [-42, 0, 42]) {
            this.drawPoly3D(ctx, cam, [[cx + ox - 12, y1 + 0.9, gz + 24], [cx + ox + 12, y1 + 0.9, gz + 24], [cx + ox + 12, y1 + 0.9, gz + 62], [cx + ox - 12, y1 + 0.9, gz + 62]], isEvening ? '#fde68a' : '#fef3c7', '#1e3a8a', 1.2);
          }
        }
      } else if (style === 'obelisco-restauradores') {
        // Rose-limestone Palacio Foz & 30m Independence Obelisk at Praca dos Restauradores
        drawRectBox(x0 + 6, y0 + 14, x1 - 6, y1 - 24, gz, gz + 88, '#f5d0c5', '#e2b4a6', '#b84a32', highlighted ? '#facc15' : '#7c2d12');
        drawRectBox(cx - 10, y1 - 28, cx + 10, y1 - 8, gz, gz + 146, '#f8fafc', '#e2e8f0', '#cbd5e1', '#475569');
      } else if (style === 'teatro-tivoli' || style === 'guimard-pavilion') {
        // Neoclassical Avenida Theatre / Art Nouveau Pavilion
        const wall = style === 'teatro-tivoli' ? '#f5efe2' : '#ecfdf5';
        const trim = style === 'teatro-tivoli' ? '#9a3412' : '#15803d';
        drawRectBox(x0 + 6, y0 + 12, x1 - 6, y1, gz, gz + 106, wall, '#d8d0c2', trim, highlighted ? '#facc15' : '#334155');
        drawRectBox(x0 + 22, y1 - 6, x1 - 22, y1 + 6, gz + 34, gz + 48, trim, '#1e293b', '#facc15', '#facc15');
      } else if (style === 'park-pavilion') {
        // Shaded Lisbon woodland garden pavilion & cypress canopy
        drawRectBox(x0 + 14, y0 + 22, x1 - 14, y1 - 8, gz, gz + 58, '#f5efe2', '#ded6c6', '#15803d', highlighted ? '#facc15' : '#14532d');
        drawRectBox(x0 + 4, y0 + 12, x1 - 4, y1, gz + 58, gz + 76, '#15803d', '#166534', '#22c55e', '#14532d');
      } else if (style === 'oceanario-lisboa') {
        // 1998 Oceanario de Lisboa floating blue-glass marine pavilion & wave-crest roof
        drawRectBox(x0 + 4, y0 + 10, x1 - 4, y1, gz, gz + 20, '#0284c7', '#0369a1', '#38bdf8', '#0f172a');
        drawRectBox(x0 + 16, y0 + 18, x1 - 16, y1 - 10, gz + 20, gz + 98, '#e0f2fe', '#bae6fd', '#0284c7', highlighted ? '#facc15' : '#0369a1');
        drawRectBox(x0 + 6, y0 + 12, x1 - 6, y1 - 4, gz + 98, gz + 114, '#f8fafc', '#cbd5e1', '#e2e8f0', '#0284c7');
      } else if (style === 'meo-arena') {
        // 1998 MEO Arena / Pavilhao da Utopia curved timber-ribbed caravel hull dome
        drawRectBox(x0 + 4, y0 + 10, x1 - 4, y1, gz, gz + 58, '#e2e8f0', '#cbd5e1', '#9a3412', highlighted ? '#facc15' : '#475569');
        drawRectBox(x0 + 16, y0 + 16, x1 - 16, y1 - 6, gz + 58, gz + 96, '#c2410c', '#9a3412', '#d97706', '#451a03');
        for (const ox of [-80, -40, 0, 40, 80]) {
          this.drawLine3D(ctx, cam, [cx + ox, y0 + 14, gz + 94], [cx + ox, y1 - 6, gz + 118], '#fef3c7', 2.4);
        }
      } else if (style === 'pavilhao-portugal') {
        // Alvaro Siza Vieira 1998 Pavilhao de Portugal sweeping white catenary concrete canopy
        drawRectBox(x0 + 4, y0 + 10, x0 + 48, y1, gz, gz + 96, '#f8fafc', '#e2e8f0', '#cbd5e1', highlighted ? '#facc15' : '#475569');
        drawRectBox(x1 - 48, y0 + 10, x1 - 4, y1, gz, gz + 96, '#f8fafc', '#e2e8f0', '#cbd5e1', highlighted ? '#facc15' : '#475569');
        // Signature suspended catenary concrete slab spanning between the two red-accented porticoes
        this.drawPoly3D(ctx, cam, [[x0 + 44, y0 + 14, gz + 92], [x1 - 44, y0 + 14, gz + 92], [x1 - 44, y1 - 6, gz + 78], [x0 + 44, y1 - 6, gz + 78]], '#f8fafc', '#dc2626', 2.2);
      } else if (style === 'twin-towers-expo') {
        // Torres Sao Gabriel & Sao Rafael twin Expo 98 nautical glass towers
        drawRectBox(x0 + 10, y0 + 14, cx - 12, y1 - 8, gz, gz + 162, '#e0f2fe', '#93c5fd', '#0284c7', highlighted ? '#facc15' : '#1e3a8a');
        drawRectBox(cx + 12, y0 + 14, x1 - 10, y1 - 8, gz, gz + 162, '#e0f2fe', '#93c5fd', '#0284c7', highlighted ? '#facc15' : '#1e3a8a');
      } else {
        // Classical Lisbon limestone landmark (Rossio, Mae d'Agua Aqueduct, Gulbenkian, Reitoria, Monasteries & Historic Manors)
        const wallC = style === 'historic-manor' ? '#f5e4c8' : style === 'monastery-gothic' ? '#e7dfd0' : '#efe8da';
        drawRectBox(x0 + 6, y0 + 10, x1 - 6, y1, gz, gz + 98, wallC, '#d8cfc0', accent, highlighted ? '#facc15' : '#475569');
        if (cam.camY > y1) {
          for (const ox of [-48, 0, 48]) {
            this.drawPoly3D(ctx, cam, [[cx + ox - 14, y1 + 0.5, gz + 6], [cx + ox + 14, y1 + 0.5, gz + 6], [cx + ox + 14, y1 + 0.5, gz + 66], [cx + ox - 14, y1 + 0.5, gz + 66]], isEvening ? '#fde68a' : '#2c4159', '#64748b', 1.2);
          }
        }
      }
    } else {
      // Greater Lisboa Eatery or Cultural Shop 3D Pombaline Facade with terracotta roof, windows, awning & door
      const wallCol = spot.kind === 'eatery' ? '#f6ecd9' : '#eaf2fb';
      const sideCol = spot.kind === 'eatery' ? '#e2d5be' : '#d5e1ee';
      drawRectBox(x0, y0, x1, y1, gz, gz + topH, wallCol, sideCol, '#b84a32', highlighted ? '#facc15' : '#334155');
      if (cam.camY > y1) {
        // Lower accent azulejo wainscot band
        this.drawPoly3D(ctx, cam, [[x0, y1 + 0.4, gz], [x1, y1 + 0.4, gz], [x1, y1 + 0.4, gz + 14], [x0, y1 + 0.4, gz + 14]], accent);
        // Shuttered upper windows & ground vitrines
        const winCol = isEvening ? '#fde68a' : '#2c4159';
        for (const wx of [x0 + 26, cx - 16, x1 - 58]) {
          this.drawPoly3D(ctx, cam, [[wx, y1 + 0.5, gz + 64], [wx + 32, y1 + 0.5, gz + 64], [wx + 32, y1 + 0.5, gz + 92], [wx, y1 + 0.5, gz + 92]], winCol, '#475569', 1.2);
        }
        // Doorway & striped storefront awning
        this.drawPoly3D(ctx, cam, [[cx - 18, y1 + 0.6, gz], [cx + 18, y1 + 0.6, gz], [cx + 18, y1 + 0.6, gz + 38], [cx - 18, y1 + 0.6, gz + 38]], '#5c3a21', '#2d1a0f', 1.3);
        this.drawPoly3D(ctx, cam, [[x0 + 16, y1 + 0.5, gz + 46], [x1 - 16, y1 + 0.5, gz + 46], [x1 - 16, y1 + 14, gz + 38], [x0 + 16, y1 + 14, gz + 38]], accent, '#fef3c7', 1.2);
      }
    }

    // Crisp 3D overhead Lisbon enamel building plaque (placed on facing side for both north- and south-facing buildings!)
    const plaqueY = spot.doorSide === 'north' ? y0 - 2 : y1 + 2;
    const sp = this.projectWorldPt(cam, cx, plaqueY, gz + (spot.kind === 'landmark' ? 68 : 54));
    if (sp && sp.cz < 760 && sp.y > 54) {
      const sc = clamp(this.focal / sp.cz, 0.5, 1.25);
      ctx.save();
      const fs = Math.max(8, Math.round(9.5 * sc));
      ctx.font = `700 ${fs}px Georgia, serif`;
      const lbl = `${spot.name.toUpperCase()} ${spot.badge}`;
      const tw = ctx.measureText(lbl).width + 16 * sc;
      const th = 20 * sc;
      drawRoundedRect(ctx, sp.x - tw * 0.5, sp.y - th * 0.5, tw, th, 4);
      ctx.fillStyle = highlighted ? 'rgba(180, 83, 9, 0.94)' : 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = highlighted ? '#fde047' : accent;
      ctx.lineWidth = highlighted ? 2 : 1.3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, sp.x, sp.y + fs * 0.34);
      ctx.restore();
    }
  }

  drawCityGateway3D(ctx, cam, gw, highlighted, isEvening) {
    const gz = getTerrainElevation(gw.x, gw.y);
    const poleCol = isEvening ? '#334155' : '#1e293b';
    const hitMeta = { kind: 'city-gateway', gateway: gw };
    // Limestone plinth base & classic dark wrought-iron Lisbon street signpost column
    const basePt = this.projectWorldPt(cam, gw.x, gw.y, gz);
    const plinthPt = this.projectWorldPt(cam, gw.x, gw.y, gz + 7);
    const topPt = this.projectWorldPt(cam, gw.x, gw.y, gz + 50);
    if (basePt && topPt && basePt.cz < 760) {
      const sc = clamp(this.focal / basePt.cz, 0.45, 1.4);
      const pw = Math.max(4, 7 * sc);
      const postW = Math.max(2.5, 3.6 * sc);
      ctx.save();
      // Tapered wrought-iron column with subtle highlight
      ctx.fillStyle = poleCol;
      ctx.fillRect(topPt.x - postW * 0.5, topPt.y, postW, Math.max(1, basePt.y - topPt.y));
      ctx.fillStyle = highlighted ? '#f59e0b' : '#475569';
      ctx.fillRect(topPt.x - postW * 0.16, topPt.y, Math.max(1, postW * 0.32), Math.max(1, basePt.y - topPt.y));
      // Stone base plinth at ground level
      if (plinthPt) {
        const ph = Math.max(4, basePt.y - plinthPt.y);
        ctx.fillStyle = isEvening ? '#64748b' : '#d6cfc2';
        ctx.fillRect(basePt.x - pw * 0.5, basePt.y - ph, pw, ph);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(basePt.x - pw * 0.5, basePt.y - ph, pw, ph);
      }
      ctx.restore();
    }
    const sp = this.projectWorldPt(cam, gw.x, gw.y, gz + 54);
    if (sp && sp.cz < 760) {
      const scale = clamp(this.focal / sp.cz, 0.45, 1.35);
      const kmTxt = gw.distanceMeters >= 1000 ? `${(gw.distanceMeters / 1000).toFixed(1)}km` : `${gw.distanceMeters}m`;
      const l1 = `WALK -> ${gw.shortLabel} (${kmTxt})`;
      const l2 = `${gw.avenueName.split(' & ')[0]} [E]`;
      ctx.save();
      const fs1 = Math.max(8, Math.round(9.5 * scale));
      const fs2 = Math.max(7, Math.round(8 * scale));
      ctx.font = `700 ${fs1}px Georgia, serif`;
      const tw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) + 20 * scale;
      const th = 30 * scale;
      const bx0 = sp.x - tw * 0.5;
      const by0 = sp.y - th * 0.5;
      drawRoundedRect(ctx, bx0, by0, tw, th, 5);
      ctx.fillStyle = '#faf8f3';
      ctx.fill();
      ctx.strokeStyle = highlighted ? '#f59e0b' : '#1b4d89';
      ctx.lineWidth = highlighted ? 2.4 : 1.8;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(27, 77, 137, 0.42)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx0 + 3, by0 + 3, tw - 6, th - 6);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#14375f';
      ctx.font = `700 ${fs1}px Georgia, serif`;
      ctx.fillText(l1, sp.x, by0 + th * 0.44);
      ctx.fillStyle = '#2563eb';
      ctx.font = `700 ${fs2}px "Segoe UI", sans-serif`;
      ctx.fillText(l2, sp.x, by0 + th * 0.8);
      ctx.restore();
      this.lastHitTargets.push({
        ...hitMeta,
        poly: [
          { x: bx0, y: by0 },
          { x: bx0 + tw, y: by0 },
          { x: bx0 + tw, y: by0 + th },
          { x: bx0, y: by0 + th }
        ]
      });
    }
  }

  drawCamoesMonument3D(ctx, cam, struct, isEvening, animTime = 0, highlighted = false) {
    const cx = struct.x + struct.w * 0.5;
    const cy = struct.y + struct.h * 0.5;
    const gz = getTerrainElevation(cx, cy);

    // A) Historic 3D Lisbon Water Fountain (Chafariz do Carmo 1771 & Chafariz d'El-Rei 1282)
    if (struct.monumentType === 'fountain') {
      const sides = 8;
      const outerR = 23;
      const innerR = 19;
      const basinH = gz + 16;
      const waterZ = gz + 13.5;

      // 1. Octagonal Lioz Limestone Outer Basin Walls (painter-sorted back-to-front facets)
      const facets = [];
      for (let i = 0; i < sides; i += 1) {
        const a0 = (i / sides) * Math.PI * 2 + Math.PI / 8;
        const a1 = ((i + 1) / sides) * Math.PI * 2 + Math.PI / 8;
        const x0 = cx + Math.cos(a0) * outerR;
        const y0 = cy + Math.sin(a0) * outerR;
        const x1 = cx + Math.cos(a1) * outerR;
        const y1 = cy + Math.sin(a1) * outerR;
        const mx = (x0 + x1) * 0.5;
        const my = (y0 + y1) * 0.5;
        facets.push({ i, x0, y0, x1, y1, distSq: (mx - cam.camX) ** 2 + (my - cam.camY) ** 2 });
      }
      facets.sort((a, b) => b.distSq - a.distSq);

      for (const f of facets) {
        const shade = 0.8 + 0.2 * Math.sin((f.i / sides) * Math.PI * 2 + 0.6);
        const poly = this.drawPoly3D(
          ctx,
          cam,
          [[f.x0, f.y0, gz - 2], [f.x1, f.y1, gz - 2], [f.x1, f.y1, basinH], [f.x0, f.y0, basinH]],
          shadeColor('#e5ddd0', shade, isEvening),
          highlighted ? '#38bdf8' : '#78716c',
          highlighted ? 2.2 : 1.1
        );
        if (poly) this.lastHitTargets.push({ kind: 'monument', id: struct.id, struct, poly });
      }

      // 2. Octagonal Stone Coping Rim & Shimmering Turquoise Aqueduct Water Pool
      const rimPts = [];
      const waterPts = [];
      for (let i = 0; i < sides; i += 1) {
        const a = (i / sides) * Math.PI * 2 + Math.PI / 8;
        rimPts.push([cx + Math.cos(a) * (outerR + 1.5), cy + Math.sin(a) * (outerR + 1.5), basinH]);
        waterPts.push([cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR, waterZ]);
      }
      this.drawPoly3D(ctx, cam, rimPts, shadeColor('#f3ede2', 0.96, isEvening), '#64748b', 1.2);
      this.drawPoly3D(
        ctx,
        cam,
        waterPts,
        isEvening ? 'rgba(14, 165, 233, 0.78)' : 'rgba(56, 189, 248, 0.85)',
        '#bae6fd',
        1.2
      );

      // Animated concentric water ripple rings on the fountain pool surface
      for (let rIdx = 0; rIdx < 2; rIdx += 1) {
        const phase = (animTime * 0.9 + rIdx * 0.5) % 1;
        const ripR = 4 + phase * 13;
        const ripPts = [];
        for (let k = 0; k < 12; k += 1) {
          const a = (k / 12) * Math.PI * 2;
          ripPts.push([cx + Math.cos(a) * ripR, cy + Math.sin(a) * ripR, waterZ + 0.4]);
        }
        this.drawPoly3D(ctx, cam, ripPts, null, `rgba(240, 249, 255, ${(1 - phase) * 0.75})`, 1.2);
      }

      // 3. Central Tiered Baroque Limestone Column, Upper Catch-Bowl & Obelisk Finial
      const colR = 5.5;
      const bowlZ = gz + 31;
      const topZ = gz + 49;
      for (const f of facets) {
        const a0 = (f.i / sides) * Math.PI * 2 + Math.PI / 8;
        const a1 = ((f.i + 1) / sides) * Math.PI * 2 + Math.PI / 8;
        const shade = 0.82 + 0.18 * Math.sin(a0);
        this.drawPoly3D(
          ctx,
          cam,
          [
            [cx + Math.cos(a0) * colR, cy + Math.sin(a0) * colR, waterZ],
            [cx + Math.cos(a1) * colR, cy + Math.sin(a1) * colR, waterZ],
            [cx + Math.cos(a1) * (colR * 0.8), cy + Math.sin(a1) * (colR * 0.8), bowlZ],
            [cx + Math.cos(a0) * (colR * 0.8), cy + Math.sin(a0) * (colR * 0.8), bowlZ]
          ],
          shadeColor('#ece5d8', shade, isEvening),
          '#78716c',
          0.9
        );
        // Sculpted upper stone obelisk spire resting directly on the upper catch-bowl
        this.drawPoly3D(
          ctx,
          cam,
          [
            [cx + Math.cos(a0) * 4.2, cy + Math.sin(a0) * 4.2, bowlZ],
            [cx + Math.cos(a1) * 4.2, cy + Math.sin(a1) * 4.2, bowlZ],
            [cx, cy, topZ]
          ],
          shadeColor('#f5f0e6', shade, isEvening),
          '#78716c',
          0.8
        );
      }

      // Upper sculpted catch-bowl lip at bowlZ
      const upperBowlPts = [];
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        upperBowlPts.push([cx + Math.cos(a) * 10.5, cy + Math.sin(a) * 10.5, bowlZ]);
      }
      this.drawPoly3D(ctx, cam, upperBowlPts, shadeColor('#e5ddd0', 0.95, isEvening), '#57534e', 1.2);

      // 4. Four Animated Parabolic Water Jets & Sparkling Droplets arcing from Bronze Dolphin/Mascaron Spouts into the Basin!
      for (let j = 0; j < 4; j += 1) {
        const ang = (j * Math.PI) / 2 + Math.PI / 4;
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        // Bronze spout nozzle
        this.drawLine3D(
          ctx,
          cam,
          [cx + dx * 4.5, cy + dy * 4.5, bowlZ - 2],
          [cx + dx * 8.5, cy + dy * 8.5, bowlZ - 2],
          '#365347',
          2.6
        );
        // Parabolic water arc segmented into 6 3D line segments
        let prevPt = [cx + dx * 8.5, cy + dy * 8.5, bowlZ - 2];
        for (let s = 1; s <= 6; s += 1) {
          const t = s / 6;
          const r = 8.5 + t * 7.8;
          const z = (bowlZ - 2) * (1 - t * t) + waterZ * (t * t) + Math.sin(t * Math.PI) * 4.5;
          const curPt = [cx + dx * r, cy + dy * r, z];
          this.drawLine3D(ctx, cam, prevPt, curPt, isEvening ? '#7dd3fc' : '#e0f2fe', 2.0);
          prevPt = curPt;
        }
        // Animated falling water droplet bead along the parabola & white splash foam in basin
        const dPhase = (animTime * 2.6 + j * 0.25) % 1;
        const dr = 8.5 + dPhase * 7.8;
        const dz = (bowlZ - 2) * (1 - dPhase * dPhase) + waterZ * (dPhase * dPhase) + Math.sin(dPhase * Math.PI) * 4.5;
        const dropPt = this.projectWorldPt(cam, cx + dx * dr, cy + dy * dr, dz);
        if (dropPt) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(dropPt.x, dropPt.y, clamp((2.5 * this.focal) / dropPt.cz, 1.5, 4.5), 0, Math.PI * 2);
          ctx.fill();
        }
        const splashPt = this.projectWorldPt(cam, cx + dx * 16.3, cy + dy * 16.3, waterZ + 0.5);
        if (splashPt) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
          ctx.beginPath();
          ctx.arc(splashPt.x, splashPt.y, clamp((3.2 * this.focal) / splashPt.cz, 1.8, 5.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Floating Heritage Fountain Plaque
      const labelPt = this.projectWorldPt(cam, cx, cy, topZ + 12);
      if (labelPt && labelPt.cz < 480) {
        ctx.save();
        ctx.font = '700 10px Georgia, serif';
        const txt = struct.shortLabel || struct.label.toUpperCase();
        const tw = ctx.measureText(txt).width + 16;
        drawRoundedRect(ctx, labelPt.x - tw * 0.5, labelPt.y - 10, tw, 19, 4);
        ctx.fillStyle = 'rgba(12, 74, 110, 0.9)';
        ctx.fill();
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(txt, labelPt.x, labelPt.y + 3);
        ctx.restore();
      }
      return;
    }

    // B) Historic 3D Lisbon Bronze Statue on Multi-Tiered Lioz Limestone Pedestal (Luis de Camoes 1867 & O Poeta Chiado 1925)
    const r = struct.statueStyle === 'poeta-chiado' ? 14 : 17;
    const plinthH = gz + 7;
    const pedH = gz + 24;

    // 1. Stepped Lioz Limestone Base Plinth
    const drawPedestalTier = (rad0, rad1, z0, z1) => {
      const faces = [];
      if (cam.camY > cy + rad1) {
        faces.push({ pts: [[cx - rad0, cy + rad0, z0], [cx + rad0, cy + rad0, z0], [cx + rad1, cy + rad1, z1], [cx - rad1, cy + rad1, z1]], shade: 1.0 });
      }
      if (cam.camY < cy - rad1) {
        faces.push({ pts: [[cx + rad0, cy - rad0, z0], [cx - rad0, cy - rad0, z0], [cx - rad1, cy - rad1, z1], [cx + rad1, cy - rad1, z1]], shade: 0.85 });
      }
      if (cam.camX < cx - rad1) {
        faces.push({ pts: [[cx - rad0, cy - rad0, z0], [cx - rad0, cy + rad0, z0], [cx - rad1, cy + rad1, z1], [cx - rad1, cy - rad1, z1]], shade: 0.92 });
      }
      if (cam.camX > cx + rad1) {
        faces.push({ pts: [[cx + rad0, cy + rad0, z0], [cx + rad0, cy - rad0, z0], [cx + rad1, cy - rad1, z1], [cx + rad1, cy + rad1, z1]], shade: 0.8 });
      }
      for (const f of faces) {
        const poly = this.drawPoly3D(
          ctx,
          cam,
          f.pts,
          shadeColor('#ded7c8', f.shade, isEvening),
          highlighted ? '#fde047' : '#6b6458',
          highlighted ? 2.0 : 1.0
        );
        if (poly) this.lastHitTargets.push({ kind: 'monument', id: struct.id, struct, poly });
      }
    };

    drawPedestalTier(r * 1.15, r * 1.02, gz - 2, plinthH);
    drawPedestalTier(r * 0.82, r * 0.68, plinthH, pedH);
    // Projecting Corinthian capital cornice cap & top surface
    drawPedestalTier(r * 0.8, r * 0.84, pedH, pedH + 3);
    const capR = r * 0.84;
    this.drawPoly3D(
      ctx,
      cam,
      [[cx - capR, cy - capR, pedH + 3], [cx + capR, cy - capR, pedH + 3], [cx + capR, cy + capR, pedH + 3], [cx - capR, cy + capR, pedH + 3]],
      shadeColor('#ece5d8', 0.96, isEvening),
      '#6b6458',
      1.0
    );

    // 2. Sculpted Verdigris-Patina Bronze Statue Figure atop Pedestal (cloak, torso, head, laurel/hat & sword/scroll)
    const basePt = this.projectWorldPt(cam, cx, cy, pedH + 3);
    const topPt = this.projectWorldPt(cam, cx, cy, pedH + 29);
    if (basePt && topPt) {
      const sh = Math.max(8, basePt.y - topPt.y);
      ctx.save();
      // Bronze plinth plate
      ctx.fillStyle = '#293d34';
      ctx.fillRect(basePt.x - sh * 0.28, basePt.y - sh * 0.08, sh * 0.56, sh * 0.08);
      // Flowing Renaissance bronze cape/cloak & standing legs
      ctx.fillStyle = '#365347';
      ctx.beginPath();
      ctx.moveTo(basePt.x - sh * 0.24, basePt.y - sh * 0.06);
      ctx.lineTo(topPt.x - sh * 0.19, topPt.y + sh * 0.24);
      ctx.lineTo(topPt.x + sh * 0.19, topPt.y + sh * 0.24);
      ctx.lineTo(basePt.x + sh * 0.22, basePt.y - sh * 0.06);
      ctx.closePath();
      ctx.fill();
      // Sunlit verdigris bronze chest highlight
      ctx.fillStyle = '#52796a';
      ctx.fillRect(topPt.x - sh * 0.12, topPt.y + sh * 0.26, sh * 0.24, sh * 0.44);
      // Sculpted bronze head & laurel wreath / poet cap
      ctx.fillStyle = '#3f5e50';
      ctx.beginPath();
      ctx.arc(topPt.x, topPt.y + sh * 0.14, sh * 0.13, 0, Math.PI * 2);
      ctx.fill();
      // Outstretched right arm holding sword (Camoes) or theatrical scroll (Poeta Chiado)
      ctx.strokeStyle = '#52796a';
      ctx.lineWidth = Math.max(2, sh * 0.09);
      ctx.beginPath();
      ctx.moveTo(topPt.x + sh * 0.12, topPt.y + sh * 0.32);
      ctx.lineTo(topPt.x + sh * 0.34, topPt.y + sh * 0.16);
      ctx.stroke();
      // Gilded bronze sword blade or scroll held high
      ctx.strokeStyle = struct.statueStyle === 'poeta-chiado' ? '#fef3c7' : '#d4af37';
      ctx.lineWidth = Math.max(1.5, sh * 0.06);
      ctx.beginPath();
      ctx.moveTo(topPt.x + sh * 0.34, topPt.y + sh * 0.22);
      ctx.lineTo(topPt.x + sh * 0.42, topPt.y - sh * 0.06);
      ctx.stroke();
      ctx.restore();
    }

    // Floating Heritage Statue Plaque
    const labelPt = this.projectWorldPt(cam, cx, cy, pedH + 35);
    if (labelPt && labelPt.cz < 480) {
      ctx.save();
      ctx.font = '700 10px Georgia, serif';
      const txt = struct.shortLabel || struct.label.toUpperCase();
      const tw = ctx.measureText(txt).width + 16;
      drawRoundedRect(ctx, labelPt.x - tw * 0.5, labelPt.y - 10, tw, 19, 4);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(txt, labelPt.x, labelPt.y + 3);
      ctx.restore();
    }
  }

}

export const street3dBuildingMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    street3dBuildingMethods[key] = _Mixin.prototype[key];
  }
}
