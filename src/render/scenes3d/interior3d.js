import {
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  SANTA_JUSTA_LIFT,
  SANTA_JUSTA_PANORAMA_LANDMARKS,
  METRO_STATIONS,
  ALL_METRO_STATIONS,
  LISBOA_CITY_DISTRICTS,
  getWalkingAvenuesFrom,
  getLisboaZoneShortName,
  VENUES,
  findEnterableVenueById,
  getMetroLineById,
  getStationLineIds,
  getOutfitById,
  getMonthInfo
} from '../../data.js';
import { getDayPhase, INTERIOR_STATIONS } from '../../engine.js';

const NEAR_Z = 4.5;
const FOV_DEG = 68;
const EYE_HEIGHT = 32;

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

function parseHexRgb(hex) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return [226, 218, 204];
  const h = hex.length === 4
    ? `${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex.slice(1, 7);
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [226, 218, 204];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeColor(hex, factor) {
  const [r, g, b] = parseHexRgb(hex);
  return `rgb(${clamp(Math.round(r * factor), 0, 255)},${clamp(Math.round(g * factor), 0, 255)},${clamp(Math.round(b * factor), 0, 255)})`;
}

function clipPolyNearZ(camPts) {
  if (!camPts || camPts.length < 3) return [];
  const out = [];
  for (let i = 0; i < camPts.length; i += 1) {
    const a = camPts[i];
    const b = camPts[(i + 1) % camPts.length];
    const aIn = a.cz >= NEAR_Z;
    const bIn = b.cz >= NEAR_Z;
    if (aIn && bIn) {
      out.push(b);
    } else if (aIn && !bIn) {
      const t = (NEAR_Z - a.cz) / (b.cz - a.cz);
      out.push({ cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, cz: NEAR_Z });
    } else if (!aIn && bIn) {
      const t = (NEAR_Z - a.cz) / (b.cz - a.cz);
      out.push({ cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, cz: NEAR_Z });
      out.push(b);
    }
  }
  return out;
}

function clipSegmentNearZ(a, b) {
  const aIn = a.cz >= NEAR_Z;
  const bIn = b.cz >= NEAR_Z;
  if (!aIn && !bIn) return null;
  if (aIn && bIn) return [a, b];
  const t = (NEAR_Z - a.cz) / (b.cz - a.cz);
  const mid = { cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, cz: NEAR_Z };
  return aIn ? [a, mid] : [mid, b];
}

function pointInPolygon2D(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

class _Mixin {
  renderInterior3D(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const venue = findEnterableVenueById(state.currentVenueId);
    if (!venue) return;

    const theme = venue.interiorTheme || {
      floorPrimary: '#efe6d5',
      floorSecondary: '#e2d6be',
      wall: '#f7f1e3',
      trim: '#1b4d89',
      counter: '#6b4628',
      layout: 'shop'
    };
    const layout = theme.layout || 'shop';
    const isCathedral = layout === 'cathedral';
    const isBar = layout === 'bar';
    const cam = this.buildCamera(state);

    const xMin = 56;
    const xMax = 704;
    const yMin = 84;
    const yMax = 446;
    const ceilZ = isCathedral ? 196 : 134;

    // 1. Base ceiling & warm room backdrop
    ctx.fillStyle = isCathedral ? '#3b3732' : isBar ? '#170d20' : shadeColor(theme.wall, 0.72);
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    // 2. Ceiling plane + wooden Lisbon ceiling beams (or cathedral ribbed arches)
    this.drawPoly3D(
      ctx,
      cam,
      [[xMin, yMin, ceilZ], [xMax, yMin, ceilZ], [xMax, yMax, ceilZ], [xMin, yMax, ceilZ]],
      isCathedral ? '#665f56' : shadeColor(theme.wall, 0.84)
    );
    for (let by = yMin + 48; by < yMax - 20; by += 68) {
      this.drawPoly3D(
        ctx,
        cam,
        [[xMin, by - 5, ceilZ - 6], [xMax, by - 5, ceilZ - 6], [xMax, by + 5, ceilZ - 6], [xMin, by + 5, ceilZ - 6]],
        isCathedral ? '#8c8376' : '#5e3c23'
      );
    }

    // 3. Perspective-projected tiled / parquet room floor
    const tileS = 44;
    for (let ty = yMin; ty < yMax; ty += tileS) {
      for (let tx = xMin; tx < xMax; tx += tileS) {
        const tx2 = Math.min(xMax, tx + tileS);
        const ty2 = Math.min(yMax, ty + tileS);
        const odd = (Math.floor((tx - xMin) / tileS) + Math.floor((ty - yMin) / tileS)) % 2 === 1;
        this.drawPoly3D(
          ctx,
          cam,
          [[tx, ty, 0], [tx2, ty, 0], [tx2, ty2, 0], [tx, ty2, 0]],
          odd ? theme.floorSecondary : theme.floorPrimary,
          'rgba(60, 50, 40, 0.12)',
          0.7
        );
      }
    }

    // 4. Four 3D Interior Walls with authentic Portuguese Azulejo wainscot & moldings
    const drawInteriorWall = (a, b, shade, wallKind) => {
      const lerpW = (u, z) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, z];
      this.drawPoly3D(ctx, cam, [lerpW(0, 0), lerpW(1, 0), lerpW(1, ceilZ), lerpW(0, ceilZ)], shadeColor(theme.wall, shade), shadeColor(theme.trim, 0.7), 1.4);
      // Lower wainscot dado band (cobalt/teal azulejo tiles or dark timber paneling)
      const wainscotH = isCathedral ? 48 : 38;
      this.drawPoly3D(
        ctx,
        cam,
        [lerpW(0, 0), lerpW(1, 0), lerpW(1, wainscotH), lerpW(0, wainscotH)],
        isCathedral ? shadeColor('#c7beae', shade) : shadeColor(theme.trim, shade * 0.92)
      );
      this.drawLine3D(ctx, cam, lerpW(0, wainscotH), lerpW(1, wainscotH), '#fef3c7', 1.5);
      // Upper cornice frieze
      this.drawPoly3D(ctx, cam, [lerpW(0, ceilZ - 9), lerpW(1, ceilZ - 9), lerpW(1, ceilZ), lerpW(0, ceilZ)], shadeColor(theme.trim, shade * 0.8));

      // Venue-specific 3D wall art, bookshelves, oven, rose window, or exit door!
      if (wallKind === 'north') {
        if (layout === 'bakery') {
          // Glowing brick wood-fired bread oven on back wall
          this.drawPoly3D(ctx, cam, [lerpW(0.08, 22), lerpW(0.28, 22), lerpW(0.28, 86), lerpW(0.08, 86)], '#8c3b28', '#472d1b', 1.6);
          const flicker = 0.85 + Math.sin(animTime * 11) * 0.15;
          this.drawPoly3D(ctx, cam, [lerpW(0.12, 30), lerpW(0.24, 30), lerpW(0.24, 62), lerpW(0.12, 62)], '#1f120b');
          this.drawPoly3D(ctx, cam, [lerpW(0.14, 31), lerpW(0.22, 31), lerpW(0.2, 46 + flicker * 10), lerpW(0.16, 46 + flicker * 8)], '#f97316');
          this.drawPoly3D(ctx, cam, [lerpW(0.155, 31), lerpW(0.205, 31), lerpW(0.18, 42 + flicker * 6)], '#fde047');
        } else if (isCathedral) {
          // Soaring Stained-Glass Rose Window & Pipe Organ pipes on apse wall!
          const rosePt = this.projectWorldPt(cam, 380, yMin + 1, 134);
          if (rosePt) {
            const rr = clamp((30 * this.focal) / rosePt.cz, 12, 72);
            ctx.fillStyle = '#1e3a8a';
            ctx.beginPath();
            ctx.arc(rosePt.x, rosePt.y, rr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(rosePt.x, rosePt.y, rr * 0.56, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(rosePt.x, rosePt.y, rr * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e5ddcf';
            ctx.lineWidth = Math.max(2, rr * 0.12);
            ctx.beginPath();
            ctx.arc(rosePt.x, rosePt.y, rr, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Flanking golden pipe organ ranks
          for (const ox of [150, 172, 194, 566, 588, 610]) {
            this.drawPoly3D(ctx, cam, [[ox - 6, yMin + 2, 54], [ox + 6, yMin + 2, 54], [ox + 6, yMin + 2, 146], [ox - 6, yMin + 2, 146]], '#d4a74a', '#785616', 1);
          }
        } else if (layout === 'bookshop') {
          // Floor-to-ceiling Livraria Bertrand walnut bookshelves with colorful book spines
          for (let shelf = 0; shelf < 4; shelf += 1) {
            const sz = 44 + shelf * 19;
            this.drawPoly3D(ctx, cam, [lerpW(0.08, sz), lerpW(0.92, sz), lerpW(0.92, sz + 3), lerpW(0.08, sz + 3)], '#5c3a21');
            const bookColors = ['#b84a32', '#1b4d89', '#0f766e', '#a16207', '#6d3257', '#334155'];
            for (let bIdx = 0; bIdx < 16; bIdx += 1) {
              const bu0 = 0.09 + bIdx * 0.051;
              this.drawPoly3D(ctx, cam, [lerpW(bu0, sz + 3), lerpW(bu0 + 0.042, sz + 3), lerpW(bu0 + 0.042, sz + 16), lerpW(bu0, sz + 16)], bookColors[(bIdx + shelf) % bookColors.length]);
            }
          }
        } else if (layout === 'restaurant') {
          // Hanging Portuguese tavern plates, wine racks & Fado guitar / charcoal grill backdrop
          for (let s = 0; s < 3; s += 1) {
            const sz = 52 + s * 18;
            this.drawPoly3D(ctx, cam, [lerpW(0.12, sz), lerpW(0.88, sz), lerpW(0.88, sz + 3), lerpW(0.12, sz + 3)], '#5c3a21');
          }
          if (venue.id === 'tasca-do-fado') {
            // Red velvet Fado acoustic backdrop panel
            this.drawPoly3D(ctx, cam, [lerpW(0.72, 38), lerpW(0.94, 38), lerpW(0.94, 112), lerpW(0.72, 112)], '#7f1d1d', '#f59e0b', 1.6);
          } else {
            // Glowing charcoal sardine grill hood on back left
            this.drawPoly3D(ctx, cam, [lerpW(0.08, 38), lerpW(0.28, 38), lerpW(0.28, 86), lerpW(0.08, 86)], '#334155', '#94a3b8', 1.4);
            this.drawPoly3D(ctx, cam, [lerpW(0.11, 40), lerpW(0.25, 40), lerpW(0.25, 50), lerpW(0.11, 50)], '#f97316');
          }
        } else if (isBar) {
          // Illuminated backlit Bairro Alto liquor & ginjinha bottle wall (tapered glass bottles with necks & cream labels!)
          this.drawPoly3D(ctx, cam, [lerpW(0.08, 38), lerpW(0.92, 38), lerpW(0.92, 106), lerpW(0.08, 106)], '#1b0d26', '#e879f9', 1.8);
          const bottleCols = ['#dc2626', '#d97706', '#059669', '#0284c7', '#9333ea', '#ca8a04'];
          for (let shelf = 0; shelf < 3; shelf += 1) {
            const sz = 45 + shelf * 20;
            this.drawPoly3D(ctx, cam, [lerpW(0.1, sz), lerpW(0.9, sz), lerpW(0.9, sz + 2.8), lerpW(0.1, sz + 2.8)], shelf === 1 ? '#f472b6' : '#fbbf24');
            for (let bi = 0; bi < 16; bi += 1) {
              const bu = 0.12 + bi * 0.049;
              const col = bottleCols[(bi + shelf * 2) % bottleCols.length];
              // Bottle body
              this.drawPoly3D(ctx, cam, [lerpW(bu, sz + 2.8), lerpW(bu + 0.019, sz + 2.8), lerpW(bu + 0.019, sz + 12.2), lerpW(bu, sz + 12.2)], col, 'rgba(255,255,255,0.35)', 0.6);
              // Tapered bottle neck & foil cap
              this.drawPoly3D(ctx, cam, [lerpW(bu + 0.006, sz + 12.2), lerpW(bu + 0.013, sz + 12.2), lerpW(bu + 0.013, sz + 16.5), lerpW(bu + 0.006, sz + 16.5)], col);
              this.drawPoly3D(ctx, cam, [lerpW(bu + 0.005, sz + 16.2), lerpW(bu + 0.014, sz + 16.2), lerpW(bu + 0.014, sz + 17.6), lerpW(bu + 0.005, sz + 17.6)], '#fde047');
              // Cream vintage label on bottle belly
              this.drawPoly3D(ctx, cam, [lerpW(bu + 0.003, sz + 5.5), lerpW(bu + 0.016, sz + 5.5), lerpW(bu + 0.016, sz + 9.5), lerpW(bu + 0.003, sz + 9.5)], '#fef3c7');
            }
          }
        } else if (layout === 'airport') {
          // Aeroporto Humberto Delgado (LIS) Terminal 1: Panoramic Glass Runway Window + Live Takeoff Jet + LED Flight Departures Board!
          // 1) Wide panoramic airport terminal glass wall overlooking sky & Runway 03/21
          this.drawPoly3D(ctx, cam, [lerpW(0.06, 40), lerpW(0.56, 40), lerpW(0.56, 118), lerpW(0.06, 118)], '#38bdf8', '#1e293b', 2);
          this.drawPoly3D(ctx, cam, [lerpW(0.06, 40), lerpW(0.56, 40), lerpW(0.56, 62), lerpW(0.06, 62)], '#475569');
          // Runway dashes & animated climbing jetliner visible through Terminal 1 glass!
          const jetU = 0.14 + ((animTime * 0.09) % 0.36);
          const jetZ = 72 + ((animTime * 0.09) % 0.36) * 58;
          this.drawPoly3D(ctx, cam, [lerpW(jetU, jetZ), lerpW(jetU + 0.08, jetZ), lerpW(jetU + 0.07, jetZ + 7), lerpW(jetU, jetZ + 7)], '#ffffff', '#334155', 1);
          this.drawPoly3D(ctx, cam, [lerpW(jetU, jetZ + 6), lerpW(jetU + 0.025, jetZ + 6), lerpW(jetU + 0.01, jetZ + 16), lerpW(jetU - 0.005, jetZ + 16)], '#dc2626');
          // Glass window steel mullions
          for (const mu of [0.18, 0.31, 0.44]) {
            this.drawLine3D(ctx, cam, lerpW(mu, 40), lerpW(mu, 118), '#1e293b', 2.4);
          }
          // 2) Illuminated LED PARTIDAS / DEPARTURES Flight Information Board on right wall!
          this.drawPoly3D(ctx, cam, [lerpW(0.6, 42), lerpW(0.95, 42), lerpW(0.95, 116), lerpW(0.6, 116)], '#0f172a', '#dc2626', 2.2);
          const boardPt = this.projectWorldPt(cam, a[0] + (b[0] - a[0]) * 0.775, a[1] + 2, 102);
          if (boardPt && boardPt.cz < 480) {
            const sc = clamp(this.focal / boardPt.cz, 0.55, 1.3);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = '#facc15';
            ctx.font = `800 ${Math.max(8, Math.round(9 * sc))}px "Segoe UI", sans-serif`;
            ctx.fillText('PARTIDAS / DEPARTURES (LIS)', boardPt.x, boardPt.y);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = `700 ${Math.max(7, Math.round(7.5 * sc))}px monospace`;
            const rows = [
              'TP 1042  MADRID    GATE A12  BOARDING',
              'TP  432  PARIS     GATE A14  ON TIME ',
              'TP 1354  LONDON    GATE A16  ON TIME ',
              'TP  209  NEW YORK  GATE B04  16:40   ',
              'TP  089  SAO PAULO GATE B08  17:15   '
            ];
            rows.forEach((r, idx) => {
              ctx.fillStyle = idx === 0 ? '#4ade80' : '#f8fafc';
              ctx.fillText(r, boardPt.x, boardPt.y + (12 + idx * 11) * sc);
            });
            ctx.restore();
          }
        } else if (layout === 'stadium') {
          // Estadio da Luz / Estadio Jose Alvalade: Panoramic Glass Concourse overlooking the Football Pitch & Tiered Stands!
          const clubCol = theme.clubColor || '#dc2626';
          this.drawPoly3D(ctx, cam, [lerpW(0.08, 38), lerpW(0.92, 38), lerpW(0.92, 118), lerpW(0.08, 118)], '#38bdf8', '#1e293b', 2);
          // Tiered stadium seating bowl
          this.drawPoly3D(ctx, cam, [lerpW(0.08, 66), lerpW(0.92, 66), lerpW(0.92, 92), lerpW(0.08, 92)], clubCol, '#ffffff', 1.2);
          // Lush green football pitch with white touchline & center circle
          this.drawPoly3D(ctx, cam, [lerpW(0.08, 38), lerpW(0.92, 38), lerpW(0.92, 66), lerpW(0.08, 66)], '#16a34a', '#ffffff', 1.4);
          this.drawLine3D(ctx, cam, lerpW(0.5, 38), lerpW(0.5, 66), '#ffffff', 2.2);
          this.drawLine3D(ctx, cam, lerpW(0.12, 52), lerpW(0.88, 52), 'rgba(255,255,255,0.6)', 1.5);
        } else if (layout === 'tower') {
          // Torre Vasco da Gama / Torre de Belem / Obelisco Panoramic Observation Gallery overlooking Tagus & Sky
          this.drawPoly3D(ctx, cam, [lerpW(0.08, 42), lerpW(0.92, 42), lerpW(0.92, 116), lerpW(0.08, 116)], '#38bdf8', '#334155', 2);
          this.drawPoly3D(ctx, cam, [lerpW(0.08, 42), lerpW(0.92, 42), lerpW(0.92, 74), lerpW(0.08, 74)], '#1a6494');
          for (const mu of [0.28, 0.5, 0.72]) {
            this.drawLine3D(ctx, cam, lerpW(mu, 42), lerpW(mu, 116), '#475569', 2.2);
          }
        } else {
          // Framed Lisbon azulejo panels, mirrors, or boutique shelves on back wall
          for (const u of [0.2, 0.5, 0.8]) {
            this.drawPoly3D(
              ctx,
              cam,
              [lerpW(u - 0.1, 52), lerpW(u + 0.1, 52), lerpW(u + 0.1, 98), lerpW(u - 0.1, 98)],
              layout === 'cafe' ? '#fef3c7' : '#e8f1fa',
              '#b45309',
              1.6
            );
          }
        }

        // Venue Name Plaque mounted high on back wall
        const np = this.projectWorldPt(cam, 380, yMin + 1, isCathedral ? 82 : 112);
        if (np && np.cz > 24) {
          const fs = clamp(Math.round((11 * this.focal) / np.cz), 9, 17);
          ctx.save();
          ctx.font = `700 ${fs}px Georgia, serif`;
          const txt = venue.name.toUpperCase();
          const tw = ctx.measureText(txt).width + 20;
          const th = fs + 10;
          drawRoundedRect(ctx, np.x - tw * 0.5, np.y - th * 0.5, tw, th, 5);
          ctx.fillStyle = 'rgba(18, 34, 56, 0.88)';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(txt, np.x, np.y + fs * 0.34);
          ctx.restore();
        }
      } else if (wallKind === 'south') {
        // Exit doorway back to sunlit Lisboa street!
        const exitPoly = this.drawPoly3D(
          ctx,
          cam,
          [[332, yMax - 1, 0], [428, yMax - 1, 0], [428, yMax - 1, 66], [332, yMax - 1, 66]],
          nearbyInteraction?.type === 'exit' ? '#d97706' : '#5a351e',
          '#fde047',
          2
        );
        this.drawPoly3D(ctx, cam, [[344, yMax - 1.5, 42], [416, yMax - 1.5, 42], [416, yMax - 1.5, 60], [344, yMax - 1.5, 60]], '#bae6fd');
        if (exitPoly) this.lastHitTargets.push({ kind: 'exit-venue', poly: exitPoly });
        const ep = this.projectWorldPt(cam, 380, yMax - 2, 74);
        if (ep) {
          ctx.save();
          ctx.font = '700 11px "Segoe UI", sans-serif';
          const tw = 116;
          drawRoundedRect(ctx, ep.x - tw * 0.5, ep.y - 10, tw, 20, 5);
          ctx.fillStyle = '#0f5c52';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText('EXIT TO STREET [E]', ep.x, ep.y + 4);
          ctx.restore();
        }
      } else {
        // Side wall decorative frames / sunlit windows / bookshelves
        for (const u of [0.28, 0.72]) {
          this.drawPoly3D(
            ctx,
            cam,
            [lerpW(u - 0.12, 46), lerpW(u + 0.12, 46), lerpW(u + 0.12, 92), lerpW(u - 0.12, 92)],
            layout === 'bookshop' ? '#5c3a21' : isCathedral ? '#94a3b8' : '#fef9c3',
            shadeColor(theme.trim, 0.8),
            1.4
          );
        }
      }
    };

    drawInteriorWall([xMin, yMin], [xMax, yMin], 0.98, 'north');
    drawInteriorWall([xMin, yMax], [xMin, yMin], 0.9, 'west');
    drawInteriorWall([xMax, yMin], [xMax, yMax], 0.84, 'east');
    drawInteriorWall([xMax, yMax], [xMin, yMax], 0.88, 'south');

    // 5. Floor hover Street View oval ring
    if (this.hoverWorld) {
      const pts = [];
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        pts.push([this.hoverWorld.x + Math.cos(a) * 14, this.hoverWorld.y + Math.sin(a) * 14, 0.5]);
      }
      this.drawPoly3D(ctx, cam, pts, 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.85)', 2);
    }

    // 6. Depth-sorted 3D Interior Furniture, Staff, Food/Pastry Displays, Tables & LAN Peers
    const items = [];

    // Uniformed Proprietor & Cashier standing behind the counter
    const activeAct = state.indoorActivity && state.indoorActivity.venueId === venue.id ? state.indoorActivity : null;
    const seatedMeal = state.seatedDining && state.seatedDining.venueId === venue.id ? state.seatedDining : null;
    items.push({
      dist: Math.hypot(345 - cam.camX, 114 - cam.camY),
      draw: () => this.drawPersonSprite3D(ctx, cam, {
        x: 345,
        y: 114,
        primaryColor: layout === 'bakery' ? '#ffffff' : isCathedral ? '#4c1d95' : theme.trim,
        secondaryColor: '#f8fafc',
        apron: layout === 'bakery' || layout === 'restaurant' || layout === 'cafe',
        chefHat: layout === 'bakery' || layout === 'restaurant',
        behindCounter: true,
        waveArm: activeAct?.type === 'dialogue' || activeAct?.type === 'souvenir' || activeAct?.type === 'toast',
        emoteText:
          activeAct?.type === 'dialogue'
            ? `"${venue.phrase?.pt || venue.greeting}"`
            : activeAct?.type === 'souvenir'
              ? `Wrapped: ${activeAct.itemName}!`
              : activeAct?.type === 'dining'
                ? `Bom apetite!`
                : activeAct?.type === 'toast'
                  ? 'Saude!'
                  : '',
        label: `${venue.proprietor} (${venue.proprietorRole})`
      })
    });
    if (venue.cashierName) {
      items.push({
        dist: Math.hypot(468 - cam.camX, 114 - cam.camY),
        draw: () => this.drawPersonSprite3D(ctx, cam, {
          x: 468,
          y: 114,
          primaryColor: '#1e3a5f',
          secondaryColor: '#fef3c7',
          apron: true,
          behindCounter: true,
          waveArm: activeAct?.type === 'souvenir' || activeAct?.type === 'toast',
          label: `${venue.cashierName} (${venue.cashierRole || 'Cashier'})`
        })
      });
    }

    // Main 3D Proprietor Counter (or Cathedral High Altar) + Brass Cash Register + Espresso Machine / Pastry Trays!
    items.push({
      dist: Math.hypot(380 - cam.camX, 154 - cam.camY),
      draw: () => {
        const counterH = 22;
        const counterStroke =
          activeAct?.type === 'dialogue' || activeAct?.type === 'souvenir' || nearbyInteraction?.type === 'counter'
            ? '#facc15'
            : '#3b2414';
        this.drawBox3D(
          ctx,
          cam,
          225,
          126,
          535,
          178,
          0,
          counterH,
          { front: theme.counter, back: theme.counter, side: theme.counter, top: isCathedral ? '#f8fafc' : '#e7dcc8', stroke: counterStroke, lineWidth: nearbyInteraction?.type === 'counter' || activeAct?.type === 'souvenir' ? 2.4 : 1.3 },
          { kind: 'counter' }
        );
        // Vintage Brass Cash Register on far right end of counter (unobstructed beside cashier)
        if (isCathedral) {
          for (const cx of [270, 320, 440, 490]) {
            this.drawLine3D(ctx, cam, [cx, 152, counterH], [cx, 152, counterH + 14], '#d97706', 3);
            const fl = this.projectWorldPt(cam, cx, 152, counterH + 17);
            if (fl) {
              ctx.fillStyle = '#fde047';
              ctx.beginPath();
              ctx.arc(fl.x, fl.y, clamp((3.5 * this.focal) / fl.cz, 2, 6), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else {
          this.drawBox3D(ctx, cam, 494, 142, 524, 166, counterH, counterH + 11, { front: '#ca8a04', side: '#a16207', top: '#eab308', stroke: '#422006', lineWidth: 1.2 });
          if (layout === 'cafe') {
            // Gleaming brass espresso machine + animated steam puffs
            this.drawBox3D(ctx, cam, 244, 138, 286, 164, counterH, counterH + 16, { front: '#d97706', side: '#b45309', top: '#fde047', stroke: '#451a03' });
            const stPt = this.projectWorldPt(cam, 265, 150, counterH + 22 + ((animTime * 14) % 16));
            if (stPt) {
              ctx.fillStyle = 'rgba(255,255,255,0.65)';
              ctx.beginPath();
              ctx.arc(stPt.x, stPt.y, clamp((5 * this.focal) / stPt.cz, 2, 10), 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (layout === 'bakery') {
            // Golden trays of Pasteis de Nata & Pao de Mafra loaves on the bakery counter
            for (const bx of [256, 284, 312, 386, 414]) {
              this.drawBox3D(ctx, cam, bx - 10, 146, bx + 10, 164, counterH, counterH + 4.5, { front: '#d97706', side: '#b45309', top: '#f59e0b', stroke: '#78350f' });
            }
          } else if (isBar) {
            // Gleaming brass beer tap tower & colorful ginjinha/caipirinha glasses on the bar counter!
            this.drawBox3D(ctx, cam, 246, 142, 274, 162, counterH, counterH + 18, { front: '#eab308', side: '#ca8a04', top: '#fef08a', stroke: '#78350f' });
            for (const [gx, col] of [[310, '#f59e0b'], [334, '#ef4444'], [360, '#10b981'], [410, '#ec4899']]) {
              this.drawBox3D(ctx, cam, gx - 5, 150, gx + 5, 160, counterH, counterH + 7, { front: col, side: col, top: '#fffbeb', stroke: '#ffffff', lineWidth: 0.8 });
            }
          }
        }

        // Visible 3D Souvenir Package wrapped with crimson-and-gold ribbon on the counter when purchased!
        if (activeAct?.type === 'souvenir') {
          this.drawBox3D(ctx, cam, 370, 152, 390, 166, counterH, counterH + 8, {
            front: '#f59e0b',
            side: '#d97706',
            top: '#fef3c7',
            stroke: '#dc2626',
            lineWidth: 1.8
          });
          this.drawLine3D(ctx, cam, [380, 152, counterH + 8.2], [380, 166, counterH + 8.2], '#dc2626', 2.4);
          this.drawLine3D(ctx, cam, [370, 159, counterH + 8.2], [390, 159, counterH + 8.2], '#dc2626', 2.4);
          const gPt = this.projectWorldPt(cam, 380, 159, counterH + 15);
          if (gPt) {
            ctx.save();
            ctx.font = '700 10px "Segoe UI", sans-serif';
            const txt = `WRAPPED FOR SATCHEL: ${activeAct.itemName}`;
            const tw = ctx.measureText(txt).width + 16;
            drawRoundedRect(ctx, gPt.x - tw * 0.5, gPt.y - 11, tw, 20, 5);
            ctx.fillStyle = 'rgba(20, 50, 88, 0.94)';
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.fillText(txt, gPt.x, gPt.y + 3);
            ctx.restore();
          }
        }
      }
    });

    // Left 3D Display Vitrine / Pastry Case / Book Table / Tile Showcase (matches SOLID_INTERIOR_RECTS[0]: x 62..134, y 204..322)
    items.push({
      dist: Math.hypot(98 - cam.camX, 263 - cam.camY),
      draw: () => {
        const isInspecting = activeAct?.type === 'inspect';
        const dispStroke = isInspecting || nearbyInteraction?.type === 'display' ? '#facc15' : '#472d1b';
        this.drawBox3D(
          ctx,
          cam,
          64,
          204,
          134,
          322,
          0,
          24,
          { front: theme.counter, side: theme.counter, top: '#e7dcc8', stroke: dispStroke, lineWidth: isInspecting || nearbyInteraction?.type === 'display' ? 2.6 : 1.3 },
          { kind: 'display' }
        );
        // Glass vitrine showcase top with colorful goods inside (breads/pastries/tiles/books/vinyls)
        this.drawBox3D(
          ctx,
          cam,
          68,
          210,
          130,
          316,
          24,
          40,
          { front: isInspecting ? '#fef08a' : '#e0f2fe', side: '#bae6fd', top: '#f0f9ff', stroke: isInspecting ? '#f59e0b' : '#64748b', lineWidth: isInspecting ? 2 : 1 }
        );
        const goodsColor =
          layout === 'bakery' ? '#d97706'
            : layout === 'azulejo' ? '#1d4ed8'
              : layout === 'vinyl' ? '#1e293b'
                : layout === 'restaurant' ? '#dc2626'
                  : '#b45309';
        for (const gy of [228, 263, 298]) {
          this.drawBox3D(ctx, cam, 82, gy - 10, 116, gy + 10, 24.5, 32, { front: goodsColor, side: goodsColor, top: shadeColor(goodsColor, 1.15) });
        }
        if (isInspecting) {
          const sp = this.projectWorldPt(cam, 98, 263, 56);
          if (sp) {
            ctx.save();
            const rad = clamp((28 * this.focal) / sp.cz, 16, 65);
            const g = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, rad);
            g.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
            g.addColorStop(1, 'rgba(253, 224, 71, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    });

    // Right-Side 3D Dining Tables / Bistro Tables / Cathedral Pews (matches SOLID_INTERIOR_RECTS[1..2])
    for (const ty of [225, 325]) {
      const isActiveDiningTable = Boolean(seatedMeal && ty === 225);
      // Wooden dining chairs beside each table
      items.push({
        dist: Math.hypot(566 - cam.camX, ty + 27 - cam.camY),
        draw: () => {
          this.drawBox3D(ctx, cam, 556, ty + 15, 576, ty + 39, 0, 13, {
            front: '#6b4226',
            side: '#4e2f1a',
            top: isActiveDiningTable ? '#f59e0b' : '#8b5a34',
            stroke: isActiveDiningTable ? '#fde047' : '#3b2414',
            lineWidth: isActiveDiningTable ? 1.8 : 1
          });
          this.drawBox3D(ctx, cam, 555, ty + 15, 559, ty + 39, 13, 27, {
            front: '#6b4226',
            side: '#4e2f1a',
            top: '#8b5a34',
            stroke: '#3b2414',
            lineWidth: 1
          });
        }
      });

      items.push({
        dist: Math.hypot(636 - cam.camX, ty + 27 - cam.camY),
        draw: () => {
          const topCol = layout === 'restaurant' ? '#dc2626' : isCathedral ? '#6b4628' : isBar ? '#3b1c4a' : '#e7dcc8';
          this.drawBox3D(ctx, cam, 590, ty, 682, ty + 54, 0, isCathedral ? 18 : 24, {
            front: '#5c3a21',
            side: '#472d1b',
            top: topCol,
            stroke: isActiveDiningTable ? '#fde047' : '#3b2414',
            lineWidth: isActiveDiningTable ? 2.4 : 1.2
          });
          if (isActiveDiningTable && seatedMeal) {
            const p = this.projectWorldPt(cam, 616, ty + 27, 25.5);
            if (p) {
              const pr = clamp((13 * this.focal) / p.cz, 6, 30);
              const isGlass = seatedMeal.servingType === 'glass';
              const idStr = seatedMeal.itemId || '';
              ctx.save();
              if (isGlass) {
                // DRINK ORDER: Rendered strictly as a chilled / warm Drink Glass on a coaster (NO dinner plate, NO fork/knife!)
                ctx.fillStyle = '#b45309';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y + pr * 0.18, pr * 0.62, pr * 0.34, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 1.3;
                ctx.stroke();

                const liqCol =
                  idStr.includes('ginjinha') || idStr.includes('sangria') || idStr.includes('tinto')
                    ? '#be123c'
                    : idStr.includes('imperial')
                      ? '#f59e0b'
                      : idStr.includes('caipirinha') || idStr.includes('verde') || idStr.includes('limonada')
                        ? '#84cc16'
                        : '#a16207';

                // Tall translucent glass body filled with beverage
                const gw = pr * 0.44;
                const gh = pr * 1.15;
                drawRoundedRect(ctx, p.x - gw, p.y - gh, gw * 2, gh + pr * 0.12, 3);
                ctx.fillStyle = liqCol;
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1.4, pr * 0.1);
                ctx.stroke();

                // Frothy beer head, lime wheel, or warm cream top
                if (idStr.includes('imperial') || idStr.includes('galao')) {
                  ctx.fillStyle = '#fffbeb';
                  ctx.fillRect(p.x - gw, p.y - gh, gw * 2, gh * 0.25);
                } else if (idStr.includes('caipirinha') || idStr.includes('limonada') || idStr.includes('sangria')) {
                  ctx.fillStyle = '#fde047';
                  ctx.beginPath();
                  ctx.arc(p.x + gw * 0.85, p.y - gh, pr * 0.24, 0, Math.PI * 2);
                  ctx.fill();
                }
                // Glass specular highlight
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.lineWidth = Math.max(1.2, pr * 0.08);
                ctx.beginPath();
                ctx.moveTo(p.x - gw * 0.55, p.y - gh * 0.82);
                ctx.lineTo(p.x - gw * 0.55, p.y - pr * 0.05);
                ctx.stroke();
              } else {
                // FOOD ORDER: Rendered strictly as a Porcelain Dinner Plate with dish, folded napkin & cutlery (NO drink glass!)
                ctx.fillStyle = '#fef3c7';
                ctx.fillRect(p.x - pr * 1.45, p.y - pr * 0.45, pr * 0.35, pr * 0.9);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = Math.max(1.5, pr * 0.1);
                ctx.beginPath();
                ctx.moveTo(p.x - pr * 1.25, p.y - pr * 0.38);
                ctx.lineTo(p.x - pr * 1.25, p.y + pr * 0.38);
                ctx.moveTo(p.x + pr * 1.25, p.y - pr * 0.38);
                ctx.lineTo(p.x + pr * 1.25, p.y + pr * 0.38);
                ctx.stroke();
                // Glazed white porcelain dinner plate with cobalt-blue rim
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, pr, pr * 0.62, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#1d4ed8';
                ctx.lineWidth = Math.max(1.4, pr * 0.12);
                ctx.stroke();
                // Served food dish tailored to ordered item
                const dishCol =
                  idStr.includes('caldo') ? '#4d7c0f'
                    : idStr.includes('sardinha') ? '#94a3b8'
                      : '#d97706';
                ctx.fillStyle = dishCol;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, pr * 0.65, pr * 0.38, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(p.x + pr * 0.18, p.y - pr * 0.08, pr * 0.2, 0, Math.PI * 2);
                ctx.fill();
                // Animated rising steam wisps above hot food plate
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
                ctx.lineWidth = 1.5;
                const drift = Math.sin(animTime * 4.2) * 4;
                ctx.beginPath();
                ctx.moveTo(p.x - pr * 0.25, p.y - pr * 0.3);
                ctx.quadraticCurveTo(p.x - pr * 0.25 + drift, p.y - pr * 0.9, p.x - pr * 0.1, p.y - pr * 1.45);
                ctx.moveTo(p.x + pr * 0.22, p.y - pr * 0.3);
                ctx.quadraticCurveTo(p.x + pr * 0.22 - drift, p.y - pr * 0.95, p.x + pr * 0.3, p.y - pr * 1.5);
                ctx.stroke();
              }
              ctx.restore();
            }
          } else if (layout === 'restaurant' || layout === 'cafe' || layout === 'bakery') {
            // Plated Portuguese dishes / porcelain cups on the table!
            for (const px of [614, 658]) {
              const p = this.projectWorldPt(cam, px, ty + 27, 25.5);
              if (p) {
                const pr = clamp((6 * this.focal) / p.cz, 2.5, 11);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, pr, pr * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = layout === 'restaurant' ? '#d97706' : '#78350f';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, pr * 0.55, pr * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      });
    }

    // Lively Bairro Alto bar patrons enjoying drinks & toasts inside Bar da Noite!
    if (isBar) {
      const barPatrons = [
        { x: 256, y: 204, outfitId: 'alfama-dress', drink: '#f59e0b', drinkType: 'imperial', emote: 'Saude!', phase: 0.4 },
        { x: 492, y: 206, outfitId: 'fado-blazer', drink: '#dc2626', drinkType: 'ginjinha', emote: 'Ginjinha!', phase: 1.9 },
        { x: 284, y: 252, outfitId: 'bohemian-poncho', drink: '#10b981', drinkType: 'caipirinha', emote: 'Boa noite!', phase: 3.1 },
        { x: 472, y: 262, outfitId: 'maritime-striped', drink: '#ec4899', drinkType: 'sangria', emote: 'Que festa!', phase: 4.5 }
      ];
      const activeIdx = Math.floor(animTime / 2.8) % barPatrons.length;
      barPatrons.forEach((bp, idx) => {
        items.push({
          dist: Math.hypot(bp.x - cam.camX, bp.y - cam.camY),
          draw: () => this.drawPersonSprite3D(ctx, cam, {
            x: bp.x,
            y: bp.y,
            outfitId: bp.outfitId,
            holdingDrink: bp.drink,
            drinkType: bp.drinkType,
            partyBob: true,
            animTime,
            phaseOffset: bp.phase,
            emoteText: idx === activeIdx || idx === (activeIdx + 2) % barPatrons.length ? bp.emote : ''
          })
        });
      });
    }

    // Connected LAN Multiplayer Peers inside the same store
    for (const rp of state.remotePlayers || []) {
      if (rp.mode === 'interior' && rp.currentVenueId === state.currentVenueId) {
        items.push({
          dist: Math.hypot(rp.x - cam.camX, rp.y - cam.camY),
          draw: () => this.drawPersonSprite3D(ctx, cam, {
            x: rp.x,
            y: rp.y,
            outfitId: rp.outfitId,
            walkPhase: rp.walkPhase || 0,
            isMoving: Boolean(rp.isMoving),
            label: rp.name,
            emoteText: rp.emoteText || ''
          })
        });
      }
    }

    // Painter's back-to-front draw of all room items
    items.sort((a, b) => b.dist - a.dist);
    for (const it of items) it.draw();

    // Hanging glowing brass pendant lamps (or colorful twinkling party string lights inside Bar da Noite!)
    if (isBar) {
      const partyCols = ['#f472b6', '#fde047', '#38bdf8', '#fb923c', '#c084fc'];
      for (const sy of [136, 198, 268]) {
        const strandPts = [];
        for (let bi = 0; bi <= 8; bi += 1) {
          const t = bi / 8;
          const bx = xMin + 14 + t * (xMax - xMin - 28);
          const sag = Math.sin(t * Math.PI) * 18;
          const lp = this.projectWorldPt(cam, bx, sy, ceilZ - 14 - sag);
          if (lp) strandPts.push({ lp, bi });
        }
        if (strandPts.length >= 2) {
          ctx.strokeStyle = 'rgba(244, 114, 182, 0.65)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          strandPts.forEach((entry, i) => {
            if (i === 0) ctx.moveTo(entry.lp.x, entry.lp.y);
            else ctx.lineTo(entry.lp.x, entry.lp.y);
          });
          ctx.stroke();
        }
        for (let k = 1; k < strandPts.length - 1; k += 1) {
          const { lp, bi } = strandPts[k];
          const twinkle = 0.75 + 0.25 * Math.sin(animTime * 4.8 + bi * 1.1 + sy * 0.03);
          const r = clamp((4.8 * this.focal) / lp.cz, 2.5, 9) * twinkle;
          const col = partyCols[(bi + Math.round(sy / 60)) % partyCols.length];
          const glow = ctx.createRadialGradient(lp.x, lp.y, 1, lp.x, lp.y, r * 4.2);
          glow.addColorStop(0, col);
          glow.addColorStop(0.45, 'rgba(232, 121, 249, 0.28)');
          glow.addColorStop(1, 'rgba(232, 121, 249, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(lp.x, lp.y, r * 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fffbeb';
          ctx.beginPath();
          ctx.arc(lp.x, lp.y, r * 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      for (const lx of [220, 380, 540]) {
        this.drawLine3D(ctx, cam, [lx, 240, ceilZ], [lx, 240, ceilZ - 24], '#785616', 1.8);
        const lp = this.projectWorldPt(cam, lx, 240, ceilZ - 26);
        if (lp) {
          const r = clamp((6 * this.focal) / lp.cz, 2.5, 10);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(lp.x, lp.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6b. Foreground 3D Visible Outcome Overlays (Seated Dining Plate & Table View, Wrapped Souvenir, Proprietor Dialogue, Display Spotlight Card, Toast, Cathedral Chime)
    this.drawIndoorActionOutcome3D(ctx, state, venue, activeAct, seatedMeal, nearbyInteraction, animTime);

    // 7. Top-left Room HUD & Top-right Room Mini-Map
    const peersInRoom = (state.remotePlayers || []).filter((r) => r.mode === 'interior' && r.currentVenueId === state.currentVenueId);
    const activeRoomToast =
      state.sharedToast && state.sharedToast.locationKey === `venue:${venue.id}`
        ? state.sharedToast
        : null;
    this.drawSceneHud(
      ctx,
      cam,
      `3D INTERIOR  -  ${venue.name}`,
      seatedMeal
        ? `SEATED AT DINING TABLE: Enjoying ${seatedMeal.itemName} (+${seatedMeal.fullnessDelta} Fullness, +${seatedMeal.energyDelta} Energy)`
        : activeRoomToast
          ? `${(activeRoomToast.speakerName || 'COMPANION').toUpperCase()} TOAST: "${activeRoomToast.text}"`
          : `${venue.memory.neighborhood}  |  Walk/Click Counter, Display, or Exit`,
      {
        floorRect: { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin },
        floorColor: 'rgba(235, 224, 200, 0.24)',
        px: state.player.x,
        py: state.player.y,
        peers: peersInRoom,
        pois: [
          { x: INTERIOR_STATIONS.counter.x, y: INTERIOR_STATIONS.counter.y, color: '#facc15' },
          { x: INTERIOR_STATIONS.display.x, y: INTERIOR_STATIONS.display.y, color: '#38bdf8' },
          { x: 616, y: 252, color: '#f97316' },
          { x: INTERIOR_STATIONS.exitMat.x, y: INTERIOR_STATIONS.exitMat.y, color: '#34d399' }
        ]
      }
    );
  }

  drawIndoorActionOutcome3D(ctx, state, venue, activeAct, seatedMeal, nearbyInteraction = null, animTime = 0) {
    const w = this.viewWidth;
    const h = this.viewHeight;
    const bottomClearance = nearbyInteraction ? 76 : 12;

    // 1. Seated at Dining Table with EITHER a Drink Glass (for drinks) OR a Plated Dish (for food)!
    if (seatedMeal) {
      ctx.save();
      const isGlass = seatedMeal.servingType === 'glass';
      const idStr = seatedMeal.itemId || '';
      const trayW = 390;
      const trayH = 112;
      const trayX = Math.round(w * 0.5 - trayW * 0.5);
      const trayY = h - trayH - bottomClearance;

      // Warm oak dining table edge & woven Portuguese linen placemat
      drawRoundedRect(ctx, trayX, trayY, trayW, trayH, 12);
      ctx.fillStyle = 'rgba(58, 34, 18, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      drawRoundedRect(ctx, trayX + 12, trayY + 28, trayW - 24, trayH - 36, 8);
      ctx.fillStyle =
        venue.interiorTheme?.layout === 'bar'
          ? '#3b0764'
          : venue.interiorTheme?.layout === 'restaurant'
            ? '#991b1b'
            : '#1e3a5f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Header pill on dining table mat (strictly distinguishes GLASS vs PLATE)
      ctx.fillStyle = '#fde047';
      ctx.font = '700 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${isGlass ? 'SEATED WITH A GLASS' : 'SEATED WITH A PLATE'}  -  ${seatedMeal.itemName.toUpperCase()}`,
        w * 0.5,
        trayY + 19,
        trayW - 24
      );

      if (isGlass) {
        // DRINK ORDER FOREGROUND: Crystal Glass on a Portuguese Cork/Azulejo Coaster (NO plate, NO fork/knife!)
        const gx = w * 0.5 - 16;
        const gy = trayY + 72;

        // Small cocktail napkin to the left
        ctx.fillStyle = '#fef3c7';
        drawRoundedRect(ctx, gx - 78, gy - 14, 28, 28, 4);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cork & cobalt azulejo drink coaster beneath the glass
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(gx, gy + 16, 38, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        if (
          idStr.includes('tinto') ||
          idStr.includes('sangria') ||
          idStr.includes('verde') ||
          idStr.includes('espumante') ||
          idStr.includes('porto')
        ) {
          // Stemmed crystal wine / sparkling espumante / port / sangria goblet
          const wineCol = idStr.includes('verde')
            ? '#bef264'
            : idStr.includes('espumante')
              ? '#fef08a'
              : idStr.includes('porto')
                ? '#7f1d1d'
                : '#9f1239';
          // Foot & stem
          ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
          ctx.beginPath();
          ctx.ellipse(gx, gy + 14, 18, 5.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(gx - 2.5, gy - 4, 5, 18);
          // Crystal bowl & liquid
          ctx.fillStyle = wineCol;
          ctx.beginPath();
          ctx.arc(gx, gy - 16, 21, 0, Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(gx, gy - 16, 22, -0.15 * Math.PI, 1.15 * Math.PI);
          ctx.closePath();
          ctx.stroke();
          if (idStr.includes('sangria')) {
            // Floating orange wheel & berries
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(gx + 8, gy - 14, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (idStr.includes('imperial')) {
          // Tall frosted Lisbon Imperial draft beer pilsner glass with rising bubbles & creamy foam head
          drawRoundedRect(ctx, gx - 18, gy - 36, 36, 50, 5);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          // Creamy foam head
          drawRoundedRect(ctx, gx - 19, gy - 38, 38, 13, 4);
          ctx.fillStyle = '#fffbeb';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          drawRoundedRect(ctx, gx - 18, gy - 36, 36, 50, 5);
          ctx.stroke();
          // Rising carbonation bubbles
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          for (const [bx, by] of [[-7, -8], [4, -15], [-2, -22], [8, -5]]) {
            ctx.beginPath();
            ctx.arc(gx + bx, gy + by, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (idStr.includes('ginjinha')) {
          // Dark chocolate shot cup brimming with ruby Ginjinha cherry liqueur & whole sour cherry
          drawRoundedRect(ctx, gx - 16, gy - 24, 32, 36, 4);
          ctx.fillStyle = '#451a03';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.fillStyle = '#be123c';
          ctx.beginPath();
          ctx.ellipse(gx, gy - 22, 14, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#881337';
          ctx.beginPath();
          ctx.arc(gx + 3, gy - 23, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Chilled Caipirinha / Limonada / Galao / Tea tall crystal tumbler glass
          const isWarm = idStr.includes('galao') || idStr.includes('cha');
          drawRoundedRect(ctx, gx - 18, gy - 34, 36, 48, 5);
          ctx.fillStyle = isWarm ? '#d97706' : '#84cc16';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.stroke();
          if (isWarm) {
            ctx.fillStyle = '#fffbeb';
            ctx.fillRect(gx - 16, gy - 32, 32, 10);
          } else {
            // Translucent ice cubes & fresh lime/lemon wheel on rim
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.fillRect(gx - 10, gy - 20, 9, 9);
            ctx.fillRect(gx + 2, gy - 12, 9, 9);
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(gx + 17, gy - 32, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Glass specular reflection bar
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx - 11, gy - 26);
        ctx.lineTo(gx - 11, gy + 4);
        ctx.stroke();
      } else {
        // FOOD ORDER FOREGROUND: Glazed Porcelain Dinner Plate, Dish, Napkin & Fork/Knife (NO drink glass!)
        const px = w * 0.5 - 16;
        const py = trayY + 68;
        ctx.fillStyle = '#fef3c7';
        drawRoundedRect(ctx, px - 86, py - 24, 22, 48, 3);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(px - 75, py - 18);
        ctx.lineTo(px - 75, py + 18);
        ctx.moveTo(px + 68, py - 18);
        ctx.lineTo(px + 68, py + 18);
        ctx.stroke();

        // Glazed Portuguese porcelain dinner plate with hand-painted cobalt rim
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(px, py, 54, 31, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(px, py, 43, 23, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Dish-specific food geometry on the plate
        if (idStr.includes('caldo')) {
          ctx.fillStyle = '#9a3412';
          ctx.beginPath();
          ctx.ellipse(px - 6, py, 27, 17, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4d7c0f';
          ctx.beginPath();
          ctx.ellipse(px - 6, py, 22, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(px - 5, py, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.ellipse(px + 26, py + 4, 12, 7, 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (idStr.includes('sardinha')) {
          for (const sy of [-9, 0, 9]) {
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.ellipse(px - 4, py + sy, 23, 4.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#334155';
            ctx.fillRect(px - 10, py + sy - 3, 2.2, 6);
            ctx.fillRect(px + 2, py + sy - 3, 2.2, 6);
          }
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(px + 28, py + 5, 6.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (idStr.includes('bacalhau')) {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.ellipse(px, py, 31, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1e293b';
          for (const ox of [-12, 2, 14]) {
            ctx.beginPath();
            ctx.arc(px + ox, py, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(px - 4, py - 8, 8, 4);
        } else {
          for (const ox of [-14, 12]) {
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.arc(px + ox, py, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(px + ox, py, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(px + ox - 2, py - 1, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Animated rising steam wisps above hot plated food
        const sShift = Math.sin(animTime * 4.2) * 5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1.8;
        for (const sx of [px - 14, px + 10]) {
          ctx.beginPath();
          ctx.moveTo(sx, py - 12);
          ctx.quadraticCurveTo(sx + sShift, py - 26, sx - sShift * 0.5, py - 38);
          ctx.stroke();
        }
      }

      // Vitals boost badge on right edge of placemat
      ctx.fillStyle = '#86efac';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`+${seatedMeal.fullnessDelta} Fullness  |  +${seatedMeal.energyDelta} Energy`, trayX + trayW - 18, trayY + trayH - 12);
      ctx.textAlign = 'left';
      ctx.restore();
      return;
    }

    if (!activeAct) return;

    // 2. Visible Outcome Cards for Inspect Display, Souvenir Purchase, Proprietor Dialogue, Toast & Cathedral Bell
    ctx.save();
    const cardW = 470;
    const cardH = 78;
    const cardX = Math.round(w * 0.5 - cardW * 0.5);
    const cardY = h - cardH - bottomClearance;

    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.93)';
    ctx.fill();
    ctx.strokeStyle =
      activeAct.type === 'inspect' ? '#38bdf8'
        : activeAct.type === 'souvenir' ? '#f59e0b'
          : activeAct.type === 'cathedral-bell' ? '#eab308'
            : '#fde047';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Left icon medallion inside card
    const icX = cardX + 38;
    const icY = cardY + cardH * 0.5;
    ctx.fillStyle =
      activeAct.type === 'inspect' ? '#0284c7'
        : activeAct.type === 'souvenir' ? '#d97706'
          : activeAct.type === 'cathedral-bell' ? '#ca8a04'
            : '#1d4ed8';
    ctx.beginPath();
    ctx.arc(icX, icY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    if (activeAct.type === 'souvenir') {
      // Gift box icon with ribbon
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(icX - 11, icY - 9, 22, 18);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(icX, icY - 9);
      ctx.lineTo(icX, icY + 9);
      ctx.moveTo(icX - 11, icY);
      ctx.lineTo(icX + 11, icY);
      ctx.stroke();
    } else if (activeAct.type === 'inspect') {
      // Magnifying lens over azulejo tile icon
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(icX - 2, icY - 2, 8, 0, Math.PI * 2);
      ctx.moveTo(icX + 4, icY + 4);
      ctx.lineTo(icX + 11, icY + 11);
      ctx.stroke();
    } else if (activeAct.type === 'cathedral-bell') {
      // Golden bronze cathedral bell icon with acoustic rings
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(icX, icY - 2, 8, Math.PI, 0);
      ctx.lineTo(icX + 11, icY + 8);
      ctx.lineTo(icX - 11, icY + 8);
      ctx.closePath();
      ctx.fill();
    } else {
      // Speech / Toast chalice icon
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(icX, icY, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde047';
    ctx.font = '700 11.5px Georgia, serif';
    const titleTxt =
      activeAct.type === 'souvenir'
        ? `KEEPSAKE WRAPPED & ADDED TO SATCHEL: ${activeAct.itemName.toUpperCase()}`
        : activeAct.type === 'inspect'
          ? `DISPLAY SHOWCASE INSPECTED: ${(activeAct.title || venue.name).toUpperCase()}`
          : activeAct.type === 'dialogue'
            ? `CONVERSATION WITH ${activeAct.proprietor.toUpperCase()} (${activeAct.role.toUpperCase()})`
            : activeAct.type === 'cathedral-bell'
              ? `SE DE LISBOA (1147) BRONZE BELL CHIME (${activeAct.clockLabel})`
              : `SHARED LISBOA TOAST AT ${venue.name.toUpperCase()}`;
    ctx.fillText(titleTxt, cardX + 72, cardY + 25, cardW - 86);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    const line1 =
      activeAct.type === 'souvenir'
        ? `Hand-wrapped by ${activeAct.proprietor} at ${venue.name} (-${Number(activeAct.costEur || 0).toFixed(2)} EUR).`
        : activeAct.type === 'inspect'
          ? activeAct.note
          : activeAct.type === 'dialogue'
            ? `"${activeAct.greeting}"`
            : activeAct.text;
    ctx.fillText(line1, cardX + 72, cardY + 45, cardW - 86);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 10px "Segoe UI", sans-serif';
    const line2 =
      activeAct.type === 'dialogue'
        ? `Phrase: "${activeAct.phrasePt}" (${activeAct.phraseEn})`
        : activeAct.type === 'souvenir'
          ? 'Open your Satchel panel anytime to admire your Lisboa keepsakes.'
          : activeAct.type === 'inspect'
            ? `Cultural heritage exhibit inside ${venue.name} (${venue.memory.neighborhood}).`
            : 'Visible indoor action active in room.';
    ctx.fillText(line2, cardX + 72, cardY + 64, cardW - 86);
    ctx.restore();
  }

}

export const interior3dMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    interior3dMethods[key] = _Mixin.prototype[key];
  }
}
