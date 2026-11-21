import {
  WORLD_WIDTH,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  STREETS,
  CROSSWALKS,
  DECORATIVE_STRUCTURES,
  FERRY_TERMINAL,
  METRO_STATIONS,
  VENUES,
  REST_SPOTS,
  RIVERSIDE_BENCHES,
  CASTANHA_VENDORS,
  getAllTransitStops,
  getOutfitById,
  getMonthInfo
} from './data.js';
import { getDayPhase } from './engine.js';

const ALL_STOPS = getAllTransitStops();

const NEAR_Z = 5.0;
const MAX_VIEW_DIST = 1150;
const FOV_DEG = 66;
const EYE_HEIGHT = 34;

const STREET_TREES = [
  { x: 482, y: 125, c: '#7a58ab', highlight: '#b093dc' },
  { x: 545, y: 125, c: '#7a58ab', highlight: '#b093dc' },
  { x: 890, y: 492, c: '#3f7d52', highlight: '#65a676' },
  { x: 1010, y: 492, c: '#3f7d52', highlight: '#65a676' },
  { x: 2178, y: 492, c: '#487f57', highlight: '#73ad82' },
  // Sunlit Tagus Riverside Promenade trees (Olive, Stone Pine & Jacarandas along Ribeira das Naus)
  { x: 350, y: 984, c: '#3f7d52', highlight: '#65a676' },
  { x: 545, y: 984, c: '#7a58ab', highlight: '#b093dc' },
  { x: 860, y: 984, c: '#3f7d52', highlight: '#65a676' },
  { x: 1135, y: 984, c: '#487f57', highlight: '#73ad82' },
  { x: 1410, y: 984, c: '#7a58ab', highlight: '#b093dc' },
  { x: 1685, y: 984, c: '#3f7d52', highlight: '#65a676' },
  { x: 1895, y: 984, c: '#7a58ab', highlight: '#b093dc' },
  { x: 2070, y: 984, c: '#3f7d52', highlight: '#65a676' }
];

const STREET_LAMPS = [
  { x: 472, y: 542 },
  { x: 780, y: 542 },
  { x: 1042, y: 542 },
  { x: 1344, y: 542 },
  { x: 1656, y: 542 },
  { x: 1960, y: 542 },
  { x: 520, y: 678 },
  { x: 950, y: 678 },
  { x: 1460, y: 678 },
  { x: 1910, y: 678 },
  { x: 640, y: 992 },
  { x: 1180, y: 992 },
  { x: 1680, y: 992 }
];

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
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return [220, 212, 198];
  const h = hex.length === 4
    ? `${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex.slice(1, 7);
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [220, 212, 198];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeColor(hex, factor, evening = false) {
  const [r, g, b] = parseHexRgb(hex);
  const er = evening ? 0.62 : 1;
  const eg = evening ? 0.66 : 1;
  const eb = evening ? 0.78 : 1;
  const nr = clamp(Math.round(r * factor * er), 0, 255);
  const ng = clamp(Math.round(g * factor * eg), 0, 255);
  const nb = clamp(Math.round(b * factor * eb), 0, 255);
  return `rgb(${nr},${ng},${nb})`;
}

function getVenueHeight(venue) {
  const layout = venue.interiorTheme?.layout;
  if (venue.archStyle === 'cathedral' || layout === 'cathedral') return 134;
  if (venue.archStyle === 'kiosk') return 82;
  if (layout === 'bookshop' || layout === 'cafe') return 132;
  if (layout === 'bakery') return 120;
  if (layout === 'restaurant' || layout === 'gallery') return 126;
  if (layout === 'azulejo' || layout === 'vinyl' || layout === 'atelier') return 116;
  return 122;
}

function getVenueWallBaseColor(venue) {
  return venue.wallColor || '#f0ddc3';
}

function getVenueTileMode(venue) {
  if (venue.wallColor === '#f2f6fb' || (venue.archStyle || '').includes('azulejo') || venue.archStyle === 'bertrand') {
    return 'cobalt';
  }
  if (venue.wallColor === '#e7f2ee') {
    return 'teal';
  }
  return null;
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
      out.push({
        cx: a.cx + (b.cx - a.cx) * t,
        cy: a.cy + (b.cy - a.cy) * t,
        cz: NEAR_Z
      });
    } else if (!aIn && bIn) {
      const t = (NEAR_Z - a.cz) / (b.cz - a.cz);
      out.push({
        cx: a.cx + (b.cx - a.cx) * t,
        cy: a.cy + (b.cy - a.cy) * t,
        cz: NEAR_Z
      });
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
  const mid = {
    cx: a.cx + (b.cx - a.cx) * t,
    cy: a.cy + (b.cy - a.cy) * t,
    cz: NEAR_Z
  };
  return aIn ? [a, mid] : [mid, b];
}

function isBehindInManhattanView(a, b, camX, camY) {
  // Returns true if axis-aligned box `a` is strictly farther from camera than `b` along X or Y
  if (camX <= b.x0 && b.x1 <= a.x0) return true;
  if (camX >= b.x1 && a.x1 <= b.x0) return true;
  if (camY <= b.y0 && b.y1 <= a.y0) return true;
  if (camY >= b.y1 && a.y1 <= b.y0) return true;
  return false;
}

function sortOccludersBackToFront(items, camX, camY) {
  const n = items.length;
  if (n <= 1) return items;

  const dist2 = items.map((it) => {
    const mx = (it.x0 + it.x1) * 0.5;
    const my = (it.y0 + it.y1) * 0.5;
    return (mx - camX) * (mx - camX) + (my - camY) * (my - camY);
  });

  const adj = Array.from({ length: n }, () => []);
  const indeg = new Int32Array(n);

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const aBehindB = isBehindInManhattanView(items[i], items[j], camX, camY);
      const bBehindA = isBehindInManhattanView(items[j], items[i], camX, camY);
      if (aBehindB && !bBehindA) {
        adj[i].push(j);
        indeg[j] += 1;
      } else if (bBehindA && !aBehindB) {
        adj[j].push(i);
        indeg[i] += 1;
      }
    }
  }

  const ready = [];
  for (let i = 0; i < n; i += 1) {
    if (indeg[i] === 0) ready.push(i);
  }

  const ordered = [];
  const emitted = new Uint8Array(n);

  while (ready.length > 0) {
    // Among ready items, emit farthest first for natural back-to-front painter's order
    let bestIdx = 0;
    let bestD = dist2[ready[0]];
    for (let k = 1; k < ready.length; k += 1) {
      const d = dist2[ready[k]];
      if (d > bestD) {
        bestD = d;
        bestIdx = k;
      }
    }
    const u = ready.splice(bestIdx, 1)[0];
    if (emitted[u]) continue;
    emitted[u] = 1;
    ordered.push(items[u]);
    for (const v of adj[u]) {
      indeg[v] -= 1;
      if (indeg[v] === 0) ready.push(v);
    }
  }

  // Fallback for any rare overlapping edge (e.g., moving actor brushing a footprint corner)
  if (ordered.length < n) {
    const rem = [];
    for (let i = 0; i < n; i += 1) {
      if (!emitted[i]) rem.push(i);
    }
    rem.sort((a, b) => dist2[b] - dist2[a]);
    for (const idx of rem) ordered.push(items[idx]);
  }
  return ordered;
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

function findNearestStreetName(px, py) {
  for (const st of STREETS) {
    if (px >= st.x - 16 && px <= st.x + st.w + 16 && py >= st.y - 16 && py <= st.y + st.h + 16) {
      return st.name;
    }
  }
  if (py >= WATERFRONT_Y - 60) return 'Cais do Sodre - Tagus Promenade';
  return 'Lisboa Historic Quarter';
}

const CALCADA_TEX_SIZE = 128;
const CALCADA_TEX_MASK = CALCADA_TEX_SIZE - 1;
const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;

let CACHED_CALCADA_DATA = null;

function hash2DInt(ix, iy, seed = 1) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Generates authentic Lisbon Calçada Portuguesa hand-laid mosaic stone textures (128x128 seamless tiles):
 * - sidewalkMosaic: hand-knapped ~5cm irregular white limestone & black basalt tesserae in diamond-rosette motif
 * - sidewalkWhite: pure hand-knapped white/cream Lioz limestone tesserae (calcada branca)
 * - sidewalkBlack: pure hand-knapped charcoal/black basalt tesserae (calcada preta) for curb ribbons & frames
 * - marLargo: iconic Rossio & Ribeira das Naus sweeping black-and-white ocean wave mosaic of individual stones
 * - lequeRoad: traditional overlapping curved fan-arch (leque) basalt & dark granite street cobblestones
 */
export function buildCalcadaTextureData() {
  if (CACHED_CALCADA_DATA) return CACHED_CALCADA_DATA;

  const S = CALCADA_TEX_SIZE;
  const GRID = 24; // 24x24 = 576 individual tiny hand-knapped stones per 128x128 tile
  const CELL = S / GRID;

  // Deterministic jittered stone centers & subtle mineral variation for all 576 hand-cut tesserae
  const cellCx = new Float32Array(GRID * GRID);
  const cellCy = new Float32Array(GRID * GRID);
  const cellTone = new Float32Array(GRID * GRID);
  for (let gy = 0; gy < GRID; gy += 1) {
    for (let gx = 0; gx < GRID; gx += 1) {
      const idx = gy * GRID + gx;
      const jx = (hash2DInt(gx, gy, 11) - 0.5) * 0.44;
      const jy = (hash2DInt(gx, gy, 23) - 0.5) * 0.44;
      cellCx[idx] = (gx + 0.5 + jx) * CELL;
      cellCy[idx] = (gy + 0.5 + jy) * CELL;
      cellTone[idx] = (hash2DInt(gx, gy, 37) - 0.5) * 24;
    }
  }

  const sidewalkMosaic = new Uint8ClampedArray(S * S * 4);
  const sidewalkWhite = new Uint8ClampedArray(S * S * 4);
  const sidewalkBlack = new Uint8ClampedArray(S * S * 4);
  const marLargo = new Uint8ClampedArray(S * S * 4);
  const lequeRoad = new Uint8ClampedArray(S * S * 4);

  const writeStonePixel = (buf, offset, isBlack, isJoint, tone, bevel) => {
    let r;
    let g;
    let b;
    if (isJoint) {
      if (isBlack) {
        r = 68;
        g = 65;
        b = 60;
      } else {
        r = 166;
        g = 157;
        b = 143;
      }
    } else if (isBlack) {
      // Hand-chiseled Lisbon black basalt / dark gabbro
      r = clamp(Math.round(45 + tone * 0.65 + bevel * 0.6), 24, 84);
      g = clamp(Math.round(50 + tone * 0.65 + bevel * 0.6), 28, 90);
      b = clamp(Math.round(58 + tone * 0.65 + bevel * 0.65), 34, 98);
    } else {
      // Hand-chiseled warm ivory/cream Lisbon Lioz limestone (calcada branca)
      r = clamp(Math.round(237 + tone * 0.8 + bevel), 200, 253);
      g = clamp(Math.round(231 + tone * 0.8 + bevel), 192, 248);
      b = clamp(Math.round(218 + tone * 0.78 + bevel * 0.9), 178, 238);
    }
    buf[offset] = r;
    buf[offset + 1] = g;
    buf[offset + 2] = b;
    buf[offset + 3] = 255;
  };

  // 1) Generate jittered Voronoi-cuboid hand-knapped stone tesserae for sidewalkMosaic, sidewalkWhite, sidewalkBlack, marLargo
  for (let py = 0; py < S; py += 1) {
    const baseGy = Math.floor(py / CELL);
    for (let px = 0; px < S; px += 1) {
      const baseGx = Math.floor(px / CELL);
      let d1 = 1e9;
      let d2 = 1e9;
      let bestIdx = 0;
      let bestDx = 0;
      let bestDy = 0;

      for (let oy = -1; oy <= 1; oy += 1) {
        const gy = (baseGy + oy + GRID) % GRID;
        const wrapY = baseGy + oy < 0 ? -S : baseGy + oy >= GRID ? S : 0;
        for (let ox = -1; ox <= 1; ox += 1) {
          const gx = (baseGx + ox + GRID) % GRID;
          const wrapX = baseGx + ox < 0 ? -S : baseGx + ox >= GRID ? S : 0;
          const idx = gy * GRID + gx;
          const dx = px - (cellCx[idx] + wrapX);
          const dy = py - (cellCy[idx] + wrapY);
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);
          // Hybrid Euclidean + Chebyshev distance produces authentic slightly-squarish hand-chiseled limestone/basalt cubes
          const d = 0.58 * Math.hypot(dx, dy) + 0.42 * (adx > ady ? adx : ady);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            bestIdx = idx;
            bestDx = dx;
            bestDy = dy;
          } else if (d < d2) {
            d2 = d;
          }
        }
      }

      const isJoint = d2 - d1 < 0.58;
      const tone = cellTone[bestIdx];
      const bevel = clamp((-bestDx - bestDy) * 2.1, -10, 11);
      const scx = cellCx[bestIdx];
      const scy = cellCy[bestIdx];
      const off = (py * S + px) * 4;

      // Pure white limestone & pure black basalt tiles (for borders & custom bands)
      writeStonePixel(sidewalkWhite, off, false, isJoint, tone, bevel);
      writeStonePixel(sidewalkBlack, off, true, isJoint, tone, bevel);

      // Sidewalk Mosaic: hand-laid diagonal diamond lattice + 4-point compass stars (estrelas)
      const diagA = ((scx + scy) % 64 + 64) % 64;
      const diagB = ((scx - scy) % 64 + 64) % 64;
      const onLattice = diagA < 5.6 || diagA > 58.4 || diagB < 5.6 || diagB > 58.4;
      const rx = Math.abs((scx % 64) - 32);
      const ry = Math.abs((scy % 64) - 32);
      const onRosette = rx + ry < 13.5 && rx + ry > 4.6;
      writeStonePixel(sidewalkMosaic, off, onLattice || onRosette, isJoint, tone, bevel);

      // Iconic Rossio / Ribeira das Naus Mar Largo sweeping black-and-white ocean waves composed of individual tiny stones
      const wavePhase = ((scy + Math.sin((scx / 64) * Math.PI * 2) * 14.5) % 32 + 32) % 32;
      writeStonePixel(marLargo, off, wavePhase < 15.5, isJoint, tone, bevel);
    }
  }

  // 2) Generate authentic overlapping Lisbon curved fan-arch (Leque) basalt & dark granite roadway cobblestones
  const fanCenters = [
    [0, 0], [64, 0], [32, 32], [96, 32],
    [0, 64], [64, 64], [32, 96], [96, 96]
  ];
  const FAN_R = 40;
  const RING_STEP = 5.4;
  const ARC_STONE_STEP = 5.2;

  for (let py = 0; py < S; py += 1) {
    for (let px = 0; px < S; px += 1) {
      let winCy = -1e9;
      let winDx = 0;
      let winDy = 0;
      let winR = 1e9;
      let winId = 0;

      for (let i = 0; i < fanCenters.length; i += 1) {
        const [bx, by] = fanCenters[i];
        for (let wy = -S; wy <= S; wy += S) {
          const cy = by + wy;
          const dy = py - cy;
          if (dy < -2 || dy > FAN_R) continue;
          for (let wx = -S; wx <= S; wx += S) {
            const cx = bx + wx;
            const dx = px - cx;
            if (Math.abs(dx) > FAN_R) continue;
            const r = Math.hypot(dx, dy);
            if (r <= FAN_R && cy > winCy) {
              winCy = cy;
              winDx = dx;
              winDy = dy;
              winR = r;
              winId = i + 1;
            }
          }
        }
      }

      const off = (py * S + px) * 4;
      const ring = Math.floor(winR / RING_STEP);
      const rLocal = (winR - ring * RING_STEP) / RING_STEP;
      const ringRadius = Math.max(4.5, (ring + 0.5) * RING_STEP);
      const angle = Math.atan2(winDx, Math.max(0.2, winDy));
      const arcPos = angle * ringRadius + 400 + (ring % 2) * (ARC_STONE_STEP * 0.5);
      const seg = Math.floor(arcPos / ARC_STONE_STEP);
      const aLocal = (arcPos - seg * ARC_STONE_STEP) / ARC_STONE_STEP;

      const isJoint = rLocal < 0.14 || rLocal > 0.88 || aLocal < 0.14 || aLocal > 0.88;
      if (isJoint) {
        lequeRoad[off] = 74;
        lequeRoad[off + 1] = 70;
        lequeRoad[off + 2] = 64;
        lequeRoad[off + 3] = 255;
      } else {
        const h = hash2DInt(seg + winId * 31, ring, 71);
        const bevel = (0.5 - rLocal) * 16 + (0.5 - aLocal) * 10;
        // Outermost crest arc of each leque fan carries classic pale-grey granite accent stones for unmistakable Lisbon fan geometry
        const isCrestAccent = ring >= 6 && h > 0.35;
        const baseR = isCrestAccent ? 148 : 94 + (h - 0.5) * 34;
        const baseG = isCrestAccent ? 144 : 96 + (h - 0.5) * 32;
        const baseB = isCrestAccent ? 136 : 101 + (h - 0.5) * 30;
        lequeRoad[off] = clamp(Math.round(baseR + bevel), 46, 185);
        lequeRoad[off + 1] = clamp(Math.round(baseG + bevel), 48, 182);
        lequeRoad[off + 2] = clamp(Math.round(baseB + bevel), 52, 176);
        lequeRoad[off + 3] = 255;
      }
    }
  }

  CACHED_CALCADA_DATA = {
    size: S,
    mask: CALCADA_TEX_MASK,
    sidewalkMosaic,
    sidewalkWhite,
    sidewalkBlack,
    marLargo,
    lequeRoad
  };
  return CACHED_CALCADA_DATA;
}

export class LisboaStreetView3DRenderer {
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.focal = (viewWidth * 0.5) / Math.tan((FOV_DEG * Math.PI) / 360);
    this.hoverWorld = null;
    this.lastHitTargets = [];
    this.calcadaTex = buildCalcadaTextureData();
    this.groundCanvas = null;
    this.groundCtx = null;
    this.groundImg = null;
    this.groundU32 = null;
    this.groundH = 0;
  }

  buildCamera(state) {
    const player = state.player;
    const yaw = Number.isFinite(state.cameraYaw) ? state.cameraYaw : 0.08;
    const pitch = clamp(Number.isFinite(state.cameraPitch) ? state.cameraPitch : 0.03, -0.24, 0.34);
    const isSeated = Boolean(state.seatedBenchId);
    const bob = !isSeated && player.isMoving ? Math.sin(player.walkPhase * 2) * 1.15 : 0;
    const camX = player.x;
    const camY = player.y;
    const camZ = (isSeated ? 24.5 : EYE_HEIGHT) + bob;
    const fx = Math.cos(yaw);
    const fy = Math.sin(yaw);
    const rx = -fy;
    const ry = fx;
    const horizonY = this.viewHeight * 0.48 + pitch * this.focal * 0.65;
    return { camX, camY, camZ, yaw, pitch, fx, fy, rx, ry, horizonY, isSeated };
  }

  toCam(cam, wx, wy, wz) {
    const dx = wx - cam.camX;
    const dy = wy - cam.camY;
    return {
      cx: dx * cam.rx + dy * cam.ry,
      cy: wz - cam.camZ,
      cz: dx * cam.fx + dy * cam.fy
    };
  }

  projectCamPt(cam, pt) {
    const inv = this.focal / pt.cz;
    return {
      x: this.viewWidth * 0.5 + pt.cx * inv,
      y: cam.horizonY - pt.cy * inv,
      cz: pt.cz
    };
  }

  projectWorldPt(cam, wx, wy, wz) {
    const pt = this.toCam(cam, wx, wy, wz);
    if (pt.cz < NEAR_Z) return null;
    return this.projectCamPt(cam, pt);
  }

  projectPolygon(cam, worldPts) {
    const camPts = worldPts.map((p) => this.toCam(cam, p[0], p[1], p[2]));
    const clipped = clipPolyNearZ(camPts);
    if (clipped.length < 3) return null;
    return clipped.map((p) => this.projectCamPt(cam, p));
  }

  drawPoly3D(ctx, cam, worldPts, fillStyle, strokeStyle = null, lineWidth = 1) {
    const screenPts = this.projectPolygon(cam, worldPts);
    if (!screenPts) return null;
    ctx.beginPath();
    ctx.moveTo(screenPts[0].x, screenPts[0].y);
    for (let i = 1; i < screenPts.length; i += 1) {
      ctx.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    return screenPts;
  }

  drawLine3D(ctx, cam, aWorld, bWorld, strokeStyle, lineWidth = 1.5) {
    const aCam = this.toCam(cam, aWorld[0], aWorld[1], aWorld[2]);
    const bCam = this.toCam(cam, bWorld[0], bWorld[1], bWorld[2]);
    const seg = clipSegmentNearZ(aCam, bCam);
    if (!seg) return;
    const pa = this.projectCamPt(cam, seg[0]);
    const pb = this.projectCamPt(cam, seg[1]);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  screenToGround(canvasX, canvasY, state) {
    const cam = this.buildCamera(state);
    const dy = canvasY - cam.horizonY;
    if (dy <= 6) return null;
    const cz = (cam.camZ * this.focal) / dy;
    if (cz < 10 || cz > 780) return null;
    const cx = ((canvasX - this.viewWidth * 0.5) * cz) / this.focal;
    const wx = clamp(cam.camX + cam.fx * cz + cam.rx * cx, 55, WORLD_WIDTH - 55);
    const wy = clamp(cam.camY + cam.fy * cz + cam.ry * cx, 55, WATERFRONT_Y - 26);
    return { x: wx, y: wy, cz };
  }

  pickInteractiveTarget(canvasX, canvasY) {
    // Iterate top-most (last drawn) clickable 3D building/metro/ferry hit targets first
    for (let i = this.lastHitTargets.length - 1; i >= 0; i -= 1) {
      const target = this.lastHitTargets[i];
      if (target.poly && pointInPolygon2D(canvasX, canvasY, target.poly)) {
        return target;
      }
    }
    return null;
  }

  setHoverPoint(canvasX, canvasY, state) {
    if (canvasX == null || canvasY == null) {
      this.hoverWorld = null;
      return;
    }
    this.hoverWorld = this.screenToGround(canvasX, canvasY, state);
  }

  render(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const cam = this.buildCamera(state);
    const phase = getDayPhase(state.minutesOfDay);
    const monthInfo = getMonthInfo(state.month);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const lampsGlowing = isEvening || isGolden || monthInfo.rainIntensity >= 0.45 || monthInfo.decorStyle === 'christmas-lights';

    // 1. Sky dome, sun/moon & 360-degree Lisboa hills + Tagus River panorama (season & climate responsive)
    this.drawSkyAndPanorama(ctx, cam, phase, animTime, monthInfo);

    // 2. Ground plane: cobblestone terrain, Tagus water, streets, curbs, crosswalks & Tram 28E rails
    this.drawGroundAndStreets(ctx, cam, state, isEvening, animTime, monthInfo);

    // 3. Google Street View hover ground chevron & walk target ring on cobblestones
    this.drawGroundIndicators(ctx, cam, state, animTime);

    // 4. Collect all visible 3D buildings, landmarks, vehicles, trees, lamps, benches, stops, locals & LAN peers
    const occluders = this.collectOccluders(cam, state, nearbyInteraction, monthInfo);
    const sorted = sortOccludersBackToFront(occluders, cam.camX, cam.camY);

    // 5. Render back-to-front in exact topological order
    for (const item of sorted) {
      if (item.kind === 'venue') {
        this.drawVenue3D(ctx, cam, item.venue, item.visited, item.highlighted, isEvening, isGolden, animTime);
      } else if (item.kind === 'metro') {
        this.drawMetro3D(ctx, cam, item.station, item.highlighted, isEvening);
      } else if (item.kind === 'ferry') {
        this.drawFerryTerminal3D(ctx, cam, item.highlighted, isEvening);
      } else if (item.kind === 'monument') {
        this.drawCamoesMonument3D(ctx, cam, item.struct, isEvening);
      } else if (item.kind === 'vehicle') {
        this.drawTransitVehicle3D(ctx, cam, item.vehicle, isEvening);
      } else if (item.kind === 'tree') {
        this.drawTree3D(ctx, cam, item.tree, isEvening, monthInfo);
      } else if (item.kind === 'lamp') {
        this.drawStreetlamp3D(ctx, cam, item.lamp, isEvening, lampsGlowing);
      } else if (item.kind === 'bench') {
        this.drawBench3D(ctx, cam, item.spot, item.captured, isEvening);
      } else if (item.kind === 'riverside-bench') {
        this.drawRiversideBench3D(ctx, cam, item.bench, item.highlighted, item.isSeated, isEvening);
      } else if (item.kind === 'stop') {
        this.drawTransitStop3D(ctx, cam, item.stop, item.highlighted, isEvening);
      } else if (item.kind === 'seasonal-prop') {
        this.drawSeasonalProp3D(ctx, cam, item.prop, isEvening, animTime, item.highlighted);
      } else if (item.kind === 'decor-arch') {
        this.drawSeasonalDecorArch3D(ctx, cam, item.arch, monthInfo, isEvening, animTime);
      } else if (item.kind === 'jogger') {
        this.drawJogger3D(ctx, cam, item.jogger, isEvening);
      } else if (item.kind === 'person') {
        this.drawPerson3D(ctx, cam, item.person, isEvening, monthInfo);
      }
    }

    // 6. Overhead Tram 28E electric catenary wire spanning above Rua do Loreto / Largo do Chiado
    this.drawOverheadTramWire(ctx, cam, isEvening);

    // 7. Weather atmosphere overlay (Atlantic rain streaks, summer sunbeams, drifting blossoms/confetti/autumn leaves)
    this.drawWeatherAtmosphere3D(ctx, cam, monthInfo, phase, animTime);

    // 7b. First-person steaming paper cone of Castanhas Assadas while enjoying roasted chestnuts!
    if ((state.holdingConeTimer || 0) > 0) {
      this.drawHeldCastanhaCone3D(ctx, state.holdingConeTimer, animTime, isEvening);
    }

    // 8. Crisp Google Street View style HUD: street address, month/weather/event badge & live radar mini-map
    this.drawStreetViewHud(ctx, cam, state, monthInfo);
  }

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

    // 3) Realistic Iconic Ponte 25 de Abril Suspension Bridge & Santuario de Cristo Rei across the Tagus (South-Southwest)
    const bridgeYaw = Math.PI * 0.62;
    const relBridge = Math.atan2(Math.sin(bridgeYaw - cam.yaw), Math.cos(bridgeYaw - cam.yaw));
    if (Math.abs(relBridge) < 0.96) {
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

    // Tagus River Estuary water plane south of WATERFRONT_Y (extends all the way to the distant horizon with layered depth bands!)
    const isGolden = getDayPhase(state.minutesOfDay).id === 'golden';
    this.drawPoly3D(
      ctx,
      cam,
      [
        [-3500, WATERFRONT_Y, 0],
        [WORLD_WIDTH + 3500, WATERFRONT_Y, 0],
        [WORLD_WIDTH + 3500, WATERFRONT_Y + 18000, 0],
        [-3500, WATERFRONT_Y + 18000, 0]
      ],
      isEvening ? '#0d233a' : isGolden ? '#1b4f72' : '#14527b'
    );
    this.drawPoly3D(
      ctx,
      cam,
      [
        [-2500, WATERFRONT_Y, 0.02],
        [WORLD_WIDTH + 2500, WATERFRONT_Y, 0.02],
        [WORLD_WIDTH + 2500, WATERFRONT_Y + 1800, 0.02],
        [-2500, WATERFRONT_Y + 1800, 0.02]
      ],
      isEvening ? '#102b47' : isGolden ? '#226188' : '#1a6494'
    );
    this.drawPoly3D(
      ctx,
      cam,
      [
        [-1200, WATERFRONT_Y, 0.04],
        [WORLD_WIDTH + 1200, WATERFRONT_Y, 0.04],
        [WORLD_WIDTH + 1200, WATERFRONT_Y + 420, 0.04],
        [-1200, WATERFRONT_Y + 420, 0.04]
      ],
      isEvening ? '#133354' : isGolden ? '#29729c' : '#1f73a6'
    );

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

    // Vertical stone seawall face dropping down to Tagus water & cast-iron mooring bollards along WATERFRONT_Y
    this.drawPoly3D(
      ctx,
      cam,
      [
        [0, WATERFRONT_Y, -8],
        [WORLD_WIDTH, WATERFRONT_Y, -8],
        [WORLD_WIDTH, WATERFRONT_Y, 3],
        [0, WATERFRONT_Y, 3]
      ],
      isEvening ? '#475569' : '#b8afa0',
      '#64748b',
      1
    );
    const minBX = Math.max(80, Math.floor((cam.camX - 580) / 90) * 90);
    const maxBX = Math.min(WORLD_WIDTH - 80, Math.ceil((cam.camX + 580) / 90) * 90);
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

    // Glistening steel Tram 28E rails along y = 603 and y = 617 (segmented for crisp near-clipping)
    const railStart = Math.max(195, Math.floor((cam.camX - 720) / 80) * 80);
    const railEnd = Math.min(2205, Math.ceil((cam.camX + 720) / 80) * 80);
    for (let tx = railStart; tx < railEnd; tx += 80) {
      const tx2 = Math.min(railEnd, tx + 80);
      this.drawLine3D(ctx, cam, [tx, 603, 0.3], [tx2, 603, 0.3], isEvening ? '#7c8a9e' : '#4a5565', 2.4);
      this.drawLine3D(ctx, cam, [tx, 617, 0.3], [tx2, 617, 0.3], isEvening ? '#7c8a9e' : '#4a5565', 2.4);
      this.drawLine3D(ctx, cam, [tx, 602, 0.35], [tx2, 602, 0.35], 'rgba(255, 255, 255, 0.35)', 0.9);
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
        const pts = [];
        for (let k = 0; k < 10; k += 1) {
          const a = (k / 10) * Math.PI * 2;
          pts.push([px + Math.cos(a) * 18, py + Math.sin(a) * 9, 0.38]);
        }
        this.drawPoly3D(
          ctx,
          cam,
          pts,
          isEvening ? 'rgba(96, 132, 178, 0.34)' : 'rgba(130, 166, 198, 0.36)',
          'rgba(224, 242, 254, 0.32)',
          1
        );
        const rp = this.projectWorldPt(cam, px, py, 0.45);
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
        pts.push([wx + Math.cos(a) * radius, wy + Math.sin(a) * radius, 0.6]);
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

    for (const station of METRO_STATIONS) {
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

    for (const struct of DECORATIVE_STRUCTURES) {
      if (!inRange(struct.x, struct.y, struct.x + struct.w, struct.y + struct.h)) continue;
      list.push({
        kind: 'monument',
        x0: struct.x,
        y0: struct.y,
        x1: struct.x + struct.w,
        y1: struct.y + struct.h,
        struct
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

  drawVenue3D(ctx, cam, venue, visited, highlighted, isEvening, isGolden, animTime) {
    const x0 = venue.x;
    const x1 = venue.x + venue.w;
    const y0 = venue.y;
    const y1 = venue.y + venue.h;
    const isCathedral = venue.archStyle === 'cathedral' || venue.interiorTheme?.layout === 'cathedral';
    const tileMode = getVenueTileMode(venue);
    const wallH = getVenueHeight(venue);
    const roofH = isCathedral ? 28 : 30;
    const baseWall = getVenueWallBaseColor(venue);
    const roofBase = venue.roofColor || '#b84a32';
    const trimCol = venue.accentColor || venue.awningColor || '#1b4d89';

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

    const dist = Math.hypot(clamp(cam.camX, x0, x1) - cam.camX, clamp(cam.camY, y0, y1) - cam.camY);

    // Draw pitched terracotta hip/gable roof slopes cleanly above cornice
    const ridgeX0 = x0 + Math.min(28, venue.w * 0.22);
    const ridgeX1 = x1 - Math.min(28, venue.w * 0.22);
    const ridgeY = (y0 + y1) * 0.5;
    const ridgeZ = wallH + roofH;

    if (!isCathedral) {
      if (cam.camY >= ridgeY) {
        this.drawPoly3D(
          ctx,
          cam,
          [[x0, y1, wallH], [x1, y1, wallH], [ridgeX1, ridgeY, ridgeZ], [ridgeX0, ridgeY, ridgeZ]],
          shadeColor(roofBase, 1.0, isEvening),
          shadeColor(roofBase, 0.68, isEvening),
          1.2
        );
        // Terracotta barrel-tile course lines & iconic Pombaline Mansard Dormer Windows (aguas-furtadas) on south roof slope
        if (dist < 760) {
          for (const rf of [0.28, 0.54, 0.78]) {
            const rz = wallH + roofH * rf;
            const ry = y1 + (ridgeY - y1) * rf;
            const rxA = x0 + (ridgeX0 - x0) * rf;
            const rxB = x1 + (ridgeX1 - x1) * rf;
            this.drawLine3D(ctx, cam, [rxA, ry, rz], [rxB, ry, rz], shadeColor(roofBase, 0.72, isEvening), 1);
          }
          // Authentic Chiado/Baixa Pombaline Mansard Roof Dormers (aguas-furtadas)
          const dormers = venue.w >= 170 ? [0.28, 0.5, 0.72] : [0.34, 0.66];
          for (const du of dormers) {
            const dx = x0 + venue.w * du;
            const dy = y1 + (ridgeY - y1) * 0.28;
            const dw = 10;
            this.drawPoly3D(
              ctx,
              cam,
              [[dx - dw, dy, wallH + 4], [dx + dw, dy, wallH + 4], [dx + dw, dy, wallH + 22], [dx - dw, dy, wallH + 22]],
              shadeColor('#efe8da', 0.98, isEvening),
              '#6b6458',
              0.9
            );
            this.drawPoly3D(
              ctx,
              cam,
              [[dx - dw * 0.56, dy, wallH + 7], [dx + dw * 0.56, dy, wallH + 7], [dx + dw * 0.56, dy, wallH + 19], [dx - dw * 0.56, dy, wallH + 19]],
              isEvening ? '#fde68a' : '#1e3a5f'
            );
            this.drawPoly3D(
              ctx,
              cam,
              [[dx - dw - 2.5, dy, wallH + 22], [dx + dw + 2.5, dy, wallH + 22], [dx, dy, wallH + 30]],
              shadeColor(roofBase, 0.92, isEvening),
              shadeColor(roofBase, 0.65, isEvening),
              0.9
            );
          }
        }
      }
      if (cam.camY <= ridgeY) {
        this.drawPoly3D(
          ctx,
          cam,
          [[x1, y0, wallH], [x0, y0, wallH], [ridgeX0, ridgeY, ridgeZ], [ridgeX1, ridgeY, ridgeZ]],
          shadeColor(roofBase, 0.82, isEvening),
          shadeColor(roofBase, 0.62, isEvening),
          1.2
        );
        if (dist < 760) {
          for (const rf of [0.28, 0.54, 0.78]) {
            const rz = wallH + roofH * rf;
            const ry = y0 + (ridgeY - y0) * rf;
            const rxA = x0 + (ridgeX0 - x0) * rf;
            const rxB = x1 + (ridgeX1 - x1) * rf;
            this.drawLine3D(ctx, cam, [rxB, ry, rz], [rxA, ry, rz], shadeColor(roofBase, 0.64, isEvening), 1);
          }
          const dormers = venue.w >= 170 ? [0.28, 0.5, 0.72] : [0.34, 0.66];
          for (const du of dormers) {
            const dx = x0 + venue.w * du;
            const dy = y0 + (ridgeY - y0) * 0.28;
            const dw = 10;
            this.drawPoly3D(
              ctx,
              cam,
              [[dx + dw, dy, wallH + 4], [dx - dw, dy, wallH + 4], [dx - dw, dy, wallH + 22], [dx + dw, dy, wallH + 22]],
              shadeColor('#efe8da', 0.86, isEvening),
              '#6b6458',
              0.9
            );
            this.drawPoly3D(
              ctx,
              cam,
              [[dx + dw * 0.56, dy, wallH + 7], [dx - dw * 0.56, dy, wallH + 7], [dx - dw * 0.56, dy, wallH + 19], [dx + dw * 0.56, dy, wallH + 19]],
              isEvening ? '#fde68a' : '#1e3a5f'
            );
            this.drawPoly3D(
              ctx,
              cam,
              [[dx + dw + 2.5, dy, wallH + 22], [dx - dw - 2.5, dy, wallH + 22], [dx, dy, wallH + 30]],
              shadeColor(roofBase, 0.84, isEvening),
              shadeColor(roofBase, 0.58, isEvening),
              0.9
            );
          }
        }
      }
      if (cam.camX <= ridgeX0) {
        this.drawPoly3D(
          ctx,
          cam,
          [[x0, y0, wallH], [x0, y1, wallH], [ridgeX0, ridgeY, ridgeZ]],
          shadeColor(roofBase, 0.9, isEvening),
          shadeColor(roofBase, 0.65, isEvening),
          1.2
        );
      }
      if (cam.camX >= ridgeX1) {
        this.drawPoly3D(
          ctx,
          cam,
          [[x1, y1, wallH], [x1, y0, wallH], [ridgeX1, ridgeY, ridgeZ]],
          shadeColor(roofBase, 0.74, isEvening),
          shadeColor(roofBase, 0.58, isEvening),
          1.2
        );
      }
      // Terracotta ridge crest beam & whitewashed Lisbon masonry chimney stack
      this.drawLine3D(ctx, cam, [ridgeX0, ridgeY, ridgeZ], [ridgeX1, ridgeY, ridgeZ], shadeColor(roofBase, 1.15, isEvening), 2.2);
      if (dist < 780) {
        const chX = ridgeX0 + (ridgeX1 - ridgeX0) * 0.25;
        this.drawLine3D(ctx, cam, [chX, ridgeY, ridgeZ - 4], [chX, ridgeY, ridgeZ + 14], shadeColor('#f5f0e6', 0.95, isEvening), 4.5);
        this.drawLine3D(ctx, cam, [chX, ridgeY, ridgeZ + 14], [chX, ridgeY, ridgeZ + 18], shadeColor('#b84a32', 0.95, isEvening), 3.0);
      }
    }

    // Draw each visible wall facade with Lisbon stone plinths, corner quoins, azulejo tiles, shuttered multipane windows, balconies, awnings & signage
    for (const face of faces) {
      const [ax, ay] = face.a;
      const [bx, by] = face.b;
      const lerpWall = (u, z) => [ax + (bx - ax) * u, ay + (by - ay) * u, z];
      const wallQuad = [lerpWall(0, 0), lerpWall(1, 0), lerpWall(1, wallH), lerpWall(0, wallH)];
      const wallFill = shadeColor(baseWall, face.shade, isEvening);
      const wallOutline = highlighted ? '#f59e0b' : shadeColor('#57534e', face.shade, isEvening);
      const screenPoly = this.drawPoly3D(ctx, cam, wallQuad, wallFill, wallOutline, highlighted ? 2.4 : 1.1);

      if (screenPoly) {
        this.lastHitTargets.push({ kind: 'venue', id: venue.id, venue, poly: screenPoly });
      }

      // Ground-floor Rusticated Lioz Limestone Ashlar Plinth & Pombaline Story Stringcourses
      this.drawPoly3D(
        ctx,
        cam,
        [lerpWall(0, 0), lerpWall(1, 0), lerpWall(1, 37), lerpWall(0, 37)],
        shadeColor('#e2dacb', face.shade * 0.96, isEvening)
      );
      if (dist < 620) {
        // Horizontal Lioz stone masonry rustication courses along ground floor
        const stoneJoint = shadeColor('#a3998a', face.shade, isEvening);
        for (const mz of [9, 18, 27]) {
          this.drawLine3D(ctx, cam, lerpWall(0.01, mz), lerpWall(0.99, mz), stoneJoint, 0.85);
        }
      }
      // Sculpted projecting limestone belt-course molding & corbel bracket line below Piano Nobile balcony
      this.drawPoly3D(
        ctx,
        cam,
        [lerpWall(0, 35.5), lerpWall(1, 35.5), lerpWall(1, 39.2), lerpWall(0, 39.2)],
        shadeColor('#f0e9db', face.shade, isEvening),
        shadeColor('#78716c', face.shade, isEvening),
        0.9
      );
      if (wallH > 95) {
        this.drawLine3D(ctx, cam, lerpWall(0, 78), lerpWall(1, 78), shadeColor('#8c8274', face.shade, isEvening), 1.4);
      }

      // Neoclassical Pombaline Central Rooftop Pediment (Frontao) & Side Masonry Firewalls (Paredes de Empena)
      if (!isCathedral && dist < 760 && face.len >= 130) {
        const pedCol = shadeColor('#ece4d4', face.shade, isEvening);
        const pedTrim = shadeColor(trimCol, face.shade, isEvening);
        // Pombaline anti-fire masonry gable walls rising cleanly at both ends of the roofline
        for (const [uA, uB] of [[0, 0.04], [0.96, 1]]) {
          this.drawPoly3D(
            ctx,
            cam,
            [lerpWall(uA, wallH - 2), lerpWall(uB, wallH - 2), lerpWall(uB, wallH + 8), lerpWall(uA, wallH + 8)],
            pedCol,
            shadeColor('#78716c', face.shade, isEvening),
            0.9
          );
        }
        // Central neoclassical triangular pediment crowning main Chiado / Bairro Alto street facades
        if (face.side === venue.doorSide) {
          this.drawPoly3D(
            ctx,
            cam,
            [lerpWall(0.32, wallH - 1), lerpWall(0.68, wallH - 1), lerpWall(0.5, wallH + 14)],
            pedCol,
            pedTrim,
            1.4
          );
          this.drawPoly3D(
            ctx,
            cam,
            [lerpWall(0.37, wallH + 1), lerpWall(0.63, wallH + 1), lerpWall(0.5, wallH + 10)],
            shadeColor(baseWall, face.shade * 0.94, isEvening)
          );
        }
      }

      // Rusticated Lioz limestone corner quoins (alternating stone corner blocks running up both edges of each facade)
      if (dist < 760) {
        const quoinCol = shadeColor('#d6cec0', face.shade * 0.92, isEvening);
        const qU = Math.min(0.045, 7 / Math.max(50, face.len));
        for (let qz = 38; qz < wallH - 10; qz += 12) {
          const wMult = ((Math.round(qz / 12)) % 2 === 0) ? 1.35 : 0.9;
          this.drawPoly3D(
            ctx,
            cam,
            [lerpWall(0, qz), lerpWall(qU * wMult, qz), lerpWall(qU * wMult, qz + 9), lerpWall(0, qz + 9)],
            quoinCol
          );
          this.drawPoly3D(
            ctx,
            cam,
            [lerpWall(1 - qU * wMult, qz), lerpWall(1, qz), lerpWall(1, qz + 9), lerpWall(1 - qU * wMult, qz + 9)],
            quoinCol
          );
        }
      }

      // Cornice band & shadowed under-eave soffit under terracotta roof
      this.drawPoly3D(
        ctx,
        cam,
        [lerpWall(0, wallH - 7), lerpWall(1, wallH - 7), lerpWall(1, wallH), lerpWall(0, wallH)],
        shadeColor(trimCol, face.shade, isEvening)
      );
      this.drawLine3D(ctx, cam, lerpWall(0, wallH - 7), lerpWall(1, wallH - 7), shadeColor('#f5efe4', face.shade, isEvening), 1.2);

      // Authentic Azulejo glazed tile wall grid shimmer, repeating Portuguese diamond medallions & ornamental frieze band!
      if (dist < 680 && tileMode) {
        const tileStroke =
          tileMode === 'cobalt'
            ? 'rgba(27, 77, 137, 0.44)'
            : 'rgba(22, 108, 92, 0.44)';
        const friezeCol =
          tileMode === 'cobalt'
            ? shadeColor('#1b4d89', face.shade, isEvening)
            : shadeColor('#0f766e', face.shade, isEvening);
        const diamondCol =
          tileMode === 'cobalt'
            ? 'rgba(29, 78, 216, 0.36)'
            : 'rgba(15, 118, 110, 0.36)';
        // Ornamental Azulejo border bands above ground floor (z: 39..43) & under cornice
        this.drawPoly3D(
          ctx,
          cam,
          [lerpWall(0.03, 39.2), lerpWall(0.97, 39.2), lerpWall(0.97, 43.2), lerpWall(0.03, 43.2)],
          friezeCol
        );
        this.drawPoly3D(
          ctx,
          cam,
          [lerpWall(0.03, wallH - 11.5), lerpWall(0.97, wallH - 11.5), lerpWall(0.97, wallH - 8), lerpWall(0.03, wallH - 8)],
          friezeCol
        );
        const cols = Math.max(5, Math.min(12, Math.round(face.len / 18)));
        for (let c = 1; c < cols; c += 1) {
          this.drawLine3D(ctx, cam, lerpWall(c / cols, 39), lerpWall(c / cols, wallH - 8), tileStroke, 0.9);
        }
        for (let tz = 48; tz < wallH - 12; tz += 13) {
          this.drawLine3D(ctx, cam, lerpWall(0, tz), lerpWall(1, tz), tileStroke, 0.9);
          // Hand-painted diamond rosette azulejo motifs inside tile cells
          if (dist < 460) {
            for (let c = 0; c < cols; c += 1) {
              const cu = (c + 0.5) / cols;
              const du = 0.24 / cols;
              this.drawPoly3D(
                ctx,
                cam,
                [
                  lerpWall(cu, tz + 2.5),
                  lerpWall(cu + du, tz + 6.5),
                  lerpWall(cu, tz + 10.5),
                  lerpWall(cu - du, tz + 6.5)
                ],
                diamondCol
              );
            }
          }
        }
      }

      // Continuous Wrought-Iron Piano Nobile Balcony (Varanda Corrida) with carved stone corbel brackets (misulas), iron balusters & geraniums
      if (!isCathedral && dist < 560 && face.len >= 120) {
        const balZ0 = 42;
        const balZ1 = 52;
        const bracketCol = shadeColor('#cfc6b6', face.shade, isEvening);
        // Sculpted stone balcony slab
        this.drawPoly3D(
          ctx,
          cam,
          [lerpWall(0.04, balZ0 - 2.2), lerpWall(0.96, balZ0 - 2.2), lerpWall(0.96, balZ0), lerpWall(0.04, balZ0)],
          shadeColor('#e5ddd0', face.shade, isEvening),
          '#57534e',
          0.9
        );
        for (let bu = 0.08; bu <= 0.92; bu += 0.14) {
          this.drawPoly3D(
            ctx,
            cam,
            [lerpWall(bu - 0.013, balZ0 - 5.2), lerpWall(bu + 0.013, balZ0 - 5.2), lerpWall(bu + 0.017, balZ0 - 2.2), lerpWall(bu - 0.017, balZ0 - 2.2)],
            bracketCol
          );
        }
        this.drawLine3D(ctx, cam, lerpWall(0.05, balZ0), lerpWall(0.95, balZ0), '#1e293b', 1.8);
        this.drawLine3D(ctx, cam, lerpWall(0.05, balZ1), lerpWall(0.95, balZ1), '#1e293b', 1.7);
        const balCount = Math.min(22, Math.max(10, Math.round(face.len / 11)));
        for (let bi = 0; bi <= balCount; bi += 1) {
          const bu = 0.05 + (bi / balCount) * 0.9;
          this.drawLine3D(ctx, cam, lerpWall(bu, balZ0), lerpWall(bu, balZ1), '#1e293b', 0.9);
        }
      }

      // Detailed multi-story Lisbon tall casement windows, louvered exterior shutters, wrought-iron Juliet balconies & red geraniums!
      if (dist < 840 && !isCathedral) {
        const bays = Math.max(2, Math.min(5, Math.floor(face.len / 46)));
        const winGlass = isEvening ? '#fde68a' : isGolden ? '#fcd34d' : '#1e3a5f';
        const glassGlint = isEvening ? '#fffbeb' : '#7dd3fc';
        const shutterCol = shadeColor(trimCol, face.shade * 0.88, isEvening);
        const surroundCol = shadeColor('#eee8dc', face.shade, isEvening);
        const lintelCol = shadeColor('#d6cec0', face.shade * 0.95, isEvening);

        for (const floorZ of [46, 86]) {
          if (floorZ + 26 > wallH - 6) continue;
          for (let i = 0; i < bays; i += 1) {
            const uc = (i + 0.5) / bays;
            const halfU = Math.min(0.072, 11 / Math.max(40, face.len));
            const u0 = uc - halfU;
            const u1 = uc + halfU;
            const shW = Math.min(0.032, halfU * 0.48);

            // Carved Lioz stone window architrave surround & projecting lintel header
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(u0 - 0.013, floorZ - 2), lerpWall(u1 + 0.013, floorZ - 2), lerpWall(u1 + 0.013, floorZ + 25), lerpWall(u0 - 0.013, floorZ + 25)],
              surroundCol
            );
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(u0 - 0.018, floorZ + 24), lerpWall(u1 + 0.018, floorZ + 24), lerpWall(u1 + 0.018, floorZ + 27.5), lerpWall(u0 - 0.018, floorZ + 27.5)],
              lintelCol
            );

            // Flanking louvered wooden exterior shutters (portadas)
            if (dist < 640 && u0 - shW > 0.03 && u1 + shW < 0.97) {
              this.drawPoly3D(
                ctx,
                cam,
                [lerpWall(u0 - shW, floorZ), lerpWall(u0 - 0.004, floorZ), lerpWall(u0 - 0.004, floorZ + 22), lerpWall(u0 - shW, floorZ + 22)],
                shutterCol,
                '#1e293b',
                0.7
              );
              this.drawPoly3D(
                ctx,
                cam,
                [lerpWall(u1 + 0.004, floorZ), lerpWall(u1 + shW, floorZ), lerpWall(u1 + shW, floorZ + 22), lerpWall(u1 + 0.004, floorZ + 22)],
                shutterCol,
                '#1e293b',
                0.7
              );
            }

            // Recessed Window Glass
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(u0, floorZ), lerpWall(u1, floorZ), lerpWall(u1, floorZ + 22), lerpWall(u0, floorZ + 22)],
              winGlass,
              shutterCol,
              1.1
            );

            // Multipane Portuguese casement mullions (center vertical stile + two horizontal transoms) & glass sky reflection
            if (dist < 580) {
              const mullionCol = isEvening ? 'rgba(120, 53, 15, 0.65)' : 'rgba(241, 245, 249, 0.72)';
              this.drawLine3D(ctx, cam, lerpWall(uc, floorZ), lerpWall(uc, floorZ + 22), mullionCol, 1.0);
              this.drawLine3D(ctx, cam, lerpWall(u0, floorZ + 7.5), lerpWall(u1, floorZ + 7.5), mullionCol, 0.9);
              this.drawLine3D(ctx, cam, lerpWall(u0, floorZ + 15), lerpWall(u1, floorZ + 15), mullionCol, 0.9);
              this.drawLine3D(ctx, cam, lerpWall(u0 + halfU * 0.25, floorZ + 16), lerpWall(u0 + halfU * 0.65, floorZ + 20), glassGlint, 1.1);
            }

            // Wrought-iron Juliet balcony with vertical balusters & terracotta geranium flowerbox
            if (dist < 580) {
              this.drawLine3D(ctx, cam, lerpWall(u0 - 0.012, floorZ + 8.5), lerpWall(u1 + 0.012, floorZ + 8.5), '#1e293b', 1.5);
              this.drawLine3D(ctx, cam, lerpWall(u0 - 0.012, floorZ + 1.5), lerpWall(u1 + 0.012, floorZ + 1.5), '#1e293b', 1.3);
              for (let b = 0; b <= 4; b += 1) {
                const bu = (u0 - 0.008) + (b / 4) * (u1 - u0 + 0.016);
                this.drawLine3D(ctx, cam, lerpWall(bu, floorZ + 1.5), lerpWall(bu, floorZ + 8.5), '#1e293b', 0.95);
              }
              // Terracotta planter box & blooming red Lisbon geraniums on balcony sill
              if ((i + Math.round(floorZ)) % 2 === 0) {
                this.drawLine3D(ctx, cam, lerpWall(uc - halfU * 0.55, floorZ + 2.5), lerpWall(uc + halfU * 0.55, floorZ + 2.5), '#b45309', 2.4);
                this.drawLine3D(ctx, cam, lerpWall(uc - halfU * 0.45, floorZ + 4.5), lerpWall(uc + halfU * 0.45, floorZ + 4.5), '#dc2626', 2.6);
              }
            }
          }
        }
      }

      // Main Entrance Facade: 3D doorway, storefront display windows, jutting awning & signboard
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

        // Flanking ground-floor Pombaline Arched Lioz Stone Shopfront Windows with Carved Keystones (Arcadas Pombalinas)
        if (dist < 760 && !isCathedral) {
          const shopGlow = isEvening ? '#fef08a' : '#fff3d6';
          const archStone = shadeColor('#f0e9db', face.shade, isEvening);
          const keystoneCol = shadeColor('#cfc5b4', face.shade, isEvening);
          for (const sideOffset of [-0.27, 0.27]) {
            const wu = doorU + sideOffset;
            if (wu - 0.1 < 0.04 || wu + 0.1 > 0.96) continue;
            // Carved stone arched surround frame & keystone header
            this.drawPoly3D(
              ctx,
              cam,
              [
                lerpWall(wu - 0.105, 5),
                lerpWall(wu + 0.105, 5),
                lerpWall(wu + 0.105, 28),
                lerpWall(wu + 0.07, 33.5),
                lerpWall(wu, 35),
                lerpWall(wu - 0.07, 33.5),
                lerpWall(wu - 0.105, 28)
              ],
              archStone,
              shadeColor('#78716c', face.shade, isEvening),
              1.1
            );
            // Recessed arched glass showcase window
            this.drawPoly3D(
              ctx,
              cam,
              [
                lerpWall(wu - 0.088, 6.5),
                lerpWall(wu + 0.088, 6.5),
                lerpWall(wu + 0.088, 26),
                lerpWall(wu + 0.055, 31.2),
                lerpWall(wu, 32.6),
                lerpWall(wu - 0.055, 31.2),
                lerpWall(wu - 0.088, 26)
              ],
              shopGlow,
              shadeColor('#472d1b', face.shade, isEvening),
              1.3
            );
            // Carved keystone at crown of arch
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(wu - 0.018, 32), lerpWall(wu + 0.018, 32), lerpWall(wu + 0.022, 36), lerpWall(wu - 0.022, 36)],
              keystoneCol
            );
            // Warm display counter shelf inside window
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(wu - 0.075, 11), lerpWall(wu + 0.075, 11), lerpWall(wu + 0.075, 16), lerpWall(wu - 0.075, 16)],
              shadeColor(venue.roofColor || '#9a3412', 0.85, isEvening)
            );
          }
        }

        // Enterable Arched Lioz Stone Portal & Carved Timber Door
        const doorTopZ = isCathedral ? 48 : 31;
        this.drawPoly3D(
          ctx,
          cam,
          [
            lerpWall(doorU - halfDoorU * 1.18, 0),
            lerpWall(doorU + halfDoorU * 1.18, 0),
            lerpWall(doorU + halfDoorU * 1.18, doorTopZ - 3),
            lerpWall(doorU + halfDoorU * 0.72, doorTopZ + 3),
            lerpWall(doorU, doorTopZ + 5),
            lerpWall(doorU - halfDoorU * 0.72, doorTopZ + 3),
            lerpWall(doorU - halfDoorU * 1.18, doorTopZ - 3)
          ],
          shadeColor('#efe8db', face.shade, isEvening),
          shadeColor('#78716c', face.shade, isEvening),
          1.2
        );
        this.drawPoly3D(
          ctx,
          cam,
          [lerpWall(doorU - halfDoorU, 0), lerpWall(doorU + halfDoorU, 0), lerpWall(doorU + halfDoorU, doorTopZ - 2), lerpWall(doorU - halfDoorU, doorTopZ - 2)],
          highlighted ? '#d97706' : shadeColor('#5a351e', face.shade, isEvening),
          highlighted ? '#fef08a' : '#2d1a0f',
          highlighted ? 2.4 : 1.5
        );
        // Semicircular glass fanlight transom above doorway
        this.drawPoly3D(
          ctx,
          cam,
          [
            lerpWall(doorU - halfDoorU * 0.84, doorTopZ - 6),
            lerpWall(doorU + halfDoorU * 0.84, doorTopZ - 6),
            lerpWall(doorU + halfDoorU * 0.56, doorTopZ + 0.5),
            lerpWall(doorU, doorTopZ + 2.5),
            lerpWall(doorU - halfDoorU * 0.56, doorTopZ + 0.5)
          ],
          '#fef08a',
          '#472d1b',
          1.0
        );

        // Jutting 3D Striped Awning / Art Nouveau Canopy using each venue's authentic awningColor!
        const layout = venue.interiorTheme?.layout;
        const hasAwning = !isCathedral && ['cafe', 'bakery', 'restaurant', 'bookshop', 'mercearia', 'vinyl', 'azulejo'].includes(layout);
        if (hasAwning && dist < 680) {
          const proj = 15;
          const stripes = 6;
          const awnBase = venue.awningColor || venue.roofColor || '#b84a32';
          for (let s = 0; s < stripes; s += 1) {
            const su0 = 0.08 + (s / stripes) * 0.84;
            const su1 = 0.08 + ((s + 1) / stripes) * 0.84;
            const a0 = lerpWall(su0, 35);
            const a1 = lerpWall(su1, 35);
            const b0 = [a0[0] + face.nx * proj, a0[1] + face.ny * proj, 28];
            const b1 = [a1[0] + face.nx * proj, a1[1] + face.ny * proj, 28];
            const col = s % 2 === 0 ? shadeColor(awnBase, face.shade, isEvening) : shadeColor('#fef3c7', face.shade, isEvening);
            this.drawPoly3D(ctx, cam, [a0, a1, b1, b0], col, 'rgba(30, 41, 59, 0.35)', 0.7);
          }
        }

        // Crisp 3D-positioned Lisbon Enamel Fascia Signboard (only for nearby faces not at extreme oblique grazing angle)
        const doorCenter = lerpWall(doorU, 41);
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
            const titleText = venue.name.toUpperCase();
            const tw = ctx.measureText(titleText).width + 14 * scale;
            const th = 16 * scale;
            drawRoundedRect(ctx, signPt.x - tw * 0.5, signPt.y - th * 0.5, tw, th, 4);
            ctx.fillStyle = highlighted
              ? 'rgba(180, 83, 9, 0.94)'
              : visited
                ? 'rgba(15, 92, 82, 0.9)'
                : 'rgba(18, 34, 56, 0.88)';
            ctx.fill();
            ctx.strokeStyle = highlighted ? '#fde047' : '#e2d8c5';
            ctx.lineWidth = 1.3;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(titleText, signPt.x, signPt.y + fontSize * 0.34);
            ctx.restore();
          }
        }
      }
    }

    // Special Landmark Geometry: Se de Lisboa (1147) Twin Romanesque Bell Towers & Rose Window!
    if (isCathedral) {
      const towerW = 46;
      const towerD = 46;
      const towerH = 196;
      const towerXs = [x0 + 6, x1 - towerW - 6];
      const ty0 = venue.doorSide === 'south' ? y1 - towerD - 4 : y0 + 4;
      const ty1 = ty0 + towerD;
      for (const tx0 of towerXs) {
        const tx1 = tx0 + towerW;
        if (cam.camY > ty1) {
          this.drawPoly3D(ctx, cam, [[tx0, ty1, wallH], [tx1, ty1, wallH], [tx1, ty1, towerH], [tx0, ty1, towerH]], shadeColor('#e5ddcf', 0.98, isEvening), '#6b6458', 1.2);
          this.drawPoly3D(ctx, cam, [[tx0 + 13, ty1, towerH - 36], [tx1 - 13, ty1, towerH - 36], [tx1 - 13, ty1, towerH - 12], [tx0 + 13, ty1, towerH - 12]], '#2c3542');
        }
        if (cam.camY < ty0) {
          this.drawPoly3D(ctx, cam, [[tx1, ty0, wallH], [tx0, ty0, wallH], [tx0, ty0, towerH], [tx1, ty0, towerH]], shadeColor('#e5ddcf', 0.84, isEvening), '#6b6458', 1.2);
        }
        if (cam.camX < tx0) {
          this.drawPoly3D(ctx, cam, [[tx0, ty0, wallH], [tx0, ty1, wallH], [tx0, ty1, towerH], [tx0, ty0, towerH]], shadeColor('#e5ddcf', 0.9, isEvening), '#6b6458', 1.2);
          this.drawPoly3D(ctx, cam, [[tx0, ty0 + 13, towerH - 36], [tx0, ty1 - 13, towerH - 36], [tx0, ty1 - 13, towerH - 12], [tx0, ty0 + 13, towerH - 12]], '#2c3542');
        }
        if (cam.camX > tx1) {
          this.drawPoly3D(ctx, cam, [[tx1, ty1, wallH], [tx1, ty0, wallH], [tx1, ty0, towerH], [tx1, ty1, towerH]], shadeColor('#e5ddcf', 0.78, isEvening), '#6b6458', 1.2);
        }
        // Crenellated stone battlements & iron cross atop each Romanesque bell tower
        const cx = (tx0 + tx1) * 0.5;
        const cy = (ty0 + ty1) * 0.5;
        this.drawLine3D(ctx, cam, [cx, cy, towerH], [cx, cy, towerH + 18], '#334155', 2.2);
        this.drawLine3D(ctx, cam, [cx - 7, cy, towerH + 12], [cx + 7, cy, towerH + 12], '#334155', 2.2);
      }
      // Carved Rose Window centered between the twin bell towers
      const rosePt = this.projectWorldPt(cam, (x0 + x1) * 0.5, venue.doorSide === 'south' ? y1 + 0.5 : y0 - 0.5, 96);
      if (rosePt && dist < 820) {
        const r = clamp((16 * this.focal) / rosePt.cz, 4, 30);
        ctx.fillStyle = isEvening ? '#fde68a' : '#1e3a5f';
        ctx.beginPath();
        ctx.arc(rosePt.x, rosePt.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e5ddcf';
        ctx.lineWidth = Math.max(1.4, r * 0.18);
        ctx.stroke();
      }
    }

    // Subtle floating glow indicator on highlighted entrance
    if (highlighted) {
      const pulse = 0.7 + Math.sin(animTime * 6) * 0.3;
      const p = this.projectWorldPt(cam, venue.doorX, venue.doorY, 16);
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
    const h = 38;

    const faces = [];
    if (cam.camY > y1) faces.push([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], 1.0);
    if (cam.camY < y0) faces.push([[x1, y0, 0], [x0, y0, 0], [x0, y0, h], [x1, y0, h]], 0.85);
    if (cam.camX < x0) faces.push([[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]], 0.92);
    if (cam.camX > x1) faces.push([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], 0.8);

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
    // Glazed canopy roof
    this.drawPoly3D(
      ctx,
      cam,
      [[x0 - 4, y0 - 4, h], [x1 + 4, y0 - 4, h], [x1 + 4, y1 + 4, h], [x0 - 4, y1 + 4, h]],
      'rgba(56, 189, 248, 0.55)',
      '#1e3a5f',
      1.4
    );

    // Tall Lisbon Metro crimson "M" totem pole
    const mx = (x0 + x1) * 0.5;
    const my = y1 + 4;
    this.drawLine3D(ctx, cam, [mx, my, 0], [mx, my, 68], '#334155', 3);
    const pt = this.projectWorldPt(cam, mx, my, 72);
    if (pt) {
      const r = clamp((13 * this.focal) / pt.cz, 5, 22);
      ctx.fillStyle = '#c81e32';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.max(8, Math.round(r * 1.15))}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('M', pt.x, pt.y + r * 0.38);
      ctx.textAlign = 'left';
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

  drawCamoesMonument3D(ctx, cam, struct, isEvening) {
    const cx = struct.x + struct.w * 0.5;
    const cy = struct.y + struct.h * 0.5;
    // Stepped stone pedestal
    const r = 18;
    const pedH = 44;
    if (cam.camY > cy + r) {
      this.drawPoly3D(ctx, cam, [[cx - r, cy + r, 0], [cx + r, cy + r, 0], [cx + r * 0.72, cy + r * 0.72, pedH], [cx - r * 0.72, cy + r * 0.72, pedH]], shadeColor('#d6cfc0', 1, isEvening), '#6b6458', 1);
    }
    if (cam.camY < cy - r) {
      this.drawPoly3D(ctx, cam, [[cx + r, cy - r, 0], [cx - r, cy - r, 0], [cx - r * 0.72, cy - r * 0.72, pedH], [cx + r * 0.72, cy - r * 0.72, pedH]], shadeColor('#d6cfc0', 0.85, isEvening), '#6b6458', 1);
    }
    if (cam.camX < cx - r) {
      this.drawPoly3D(ctx, cam, [[cx - r, cy - r, 0], [cx - r, cy + r, 0], [cx - r * 0.72, cy + r * 0.72, pedH], [cx - r * 0.72, cy - r * 0.72, pedH]], shadeColor('#d6cfc0', 0.92, isEvening), '#6b6458', 1);
    }
    if (cam.camX > cx + r) {
      this.drawPoly3D(ctx, cam, [[cx + r, cy + r, 0], [cx + r, cy - r, 0], [cx + r * 0.72, cy - r * 0.72, pedH], [cx + r * 0.72, cy + r * 0.72, pedH]], shadeColor('#d6cfc0', 0.8, isEvening), '#6b6458', 1);
    }
    // Bronze statue of Luis de Camoes atop pedestal
    const basePt = this.projectWorldPt(cam, cx, cy, pedH);
    const topPt = this.projectWorldPt(cam, cx, cy, pedH + 34);
    if (basePt && topPt) {
      const sh = Math.max(6, basePt.y - topPt.y);
      ctx.fillStyle = '#364941';
      ctx.fillRect(topPt.x - sh * 0.16, topPt.y + sh * 0.2, sh * 0.32, sh * 0.8);
      ctx.beginPath();
      ctx.arc(topPt.x, topPt.y + sh * 0.14, sh * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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

    const pt = (l, w, z) => [vehicle.x + fx * l + rx * w, vehicle.y + fy * l + ry * w, z];
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

    // Contact shadow on street
    this.drawPoly3D(ctx, cam, [pt(halfL, -halfW, 0.5), pt(halfL, halfW, 0.5), pt(-halfL, halfW, 0.5), pt(-halfL, -halfW, 0.5)], 'rgba(15, 23, 42, 0.34)');

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
      // Lower livery skirt + upper white/cream window band
      const p0 = f.pts[0];
      const p1 = f.pts[1];
      const m0 = [p0[0], p0[1], 24];
      const m1 = [p1[0], p1[1], 24];
      this.drawPoly3D(ctx, cam, [p0, p1, m1, m0], shadeColor(bodyColor, f.shade, isEvening), '#1e293b', 1.1);
      this.drawPoly3D(ctx, cam, [m0, m1, f.pts[2], f.pts[3]], shadeColor(upperColor, f.shade, isEvening), '#1e293b', 1.1);

      // Panoramic glass windows
      const lerpF = (u, z) => [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, z];
      if (f.isSide) {
        for (let wIdx = 0; wIdx < 4; wIdx += 1) {
          const u0 = 0.08 + wIdx * 0.22;
          const u1 = u0 + 0.17;
          this.drawPoly3D(ctx, cam, [lerpF(u0, 25), lerpF(u1, 25), lerpF(u1, 41), lerpF(u0, 41)], winColor);
        }
      } else {
        this.drawPoly3D(ctx, cam, [lerpF(0.12, 25), lerpF(0.88, 25), lerpF(0.88, 40), lerpF(0.12, 40)], winColor);
        if (f.isFront) {
          // Warm glowing headlights
          for (const hu of [0.22, 0.78]) {
            const hp = this.projectWorldPt(cam, ...lerpF(hu, 12));
            if (hp) {
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(hp.x, hp.y, clamp((3.8 * this.focal) / hp.cz, 2, 7), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          // Destination plate badge (`28E` or `737`)
          const bp = this.projectWorldPt(cam, ...lerpF(0.5, 44));
          if (bp) {
            const fs = Math.max(7, Math.round(clamp((8.5 * this.focal) / bp.cz, 7, 13)));
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bp.x - fs * 1.4, bp.y - fs * 0.65, fs * 2.8, fs * 1.2);
            ctx.fillStyle = '#fde047';
            ctx.font = `800 ${fs}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(isTram ? '28E' : '737', bp.x, bp.y + fs * 0.34);
            ctx.textAlign = 'left';
          }
        }
      }
    }

    // Remodelado Tram 28E roof pantograph reaching up to the overhead catenary wire
    if (isTram) {
      this.drawLine3D(ctx, cam, pt(0, 0, topZ), pt(-8, 0, 72), '#334155', 2);
      this.drawLine3D(ctx, cam, pt(-8, 0, 72), pt(0, 0, 94), '#334155', 2);
      this.drawLine3D(ctx, cam, pt(0, -10, 94), pt(0, 10, 94), '#1e293b', 2.4);
    }
  }

  drawTree3D(ctx, cam, tree, isEvening, monthInfo = getMonthInfo()) {
    const base = this.projectWorldPt(cam, tree.x, tree.y, 0);
    const crown = this.projectWorldPt(cam, tree.x, tree.y, 58);
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
    this.drawLine3D(ctx, cam, [lamp.x, lamp.y, 0], [lamp.x, lamp.y, 64], '#1e293b', 2.4);
    const top = this.projectWorldPt(cam, lamp.x, lamp.y, 66);
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
    this.drawPoly3D(
      ctx,
      cam,
      [[spot.x - 20, spot.y - 6, 10], [spot.x + 20, spot.y - 6, 10], [spot.x + 20, spot.y + 6, 10], [spot.x - 20, spot.y + 6, 10]],
      shadeColor('#8b5a34', 1, isEvening),
      '#472d1b',
      1.2
    );
    this.drawPoly3D(
      ctx,
      cam,
      [[spot.x - 20, spot.y - 6, 10], [spot.x + 20, spot.y - 6, 10], [spot.x + 20, spot.y - 6, 20], [spot.x - 20, spot.y - 6, 20]],
      shadeColor(captured ? '#0f766e' : '#1b4d89', 1, isEvening),
      '#f8fafc',
      1
    );
    this.drawLine3D(ctx, cam, [spot.x - 16, spot.y, 0], [spot.x - 16, spot.y, 10], '#334155', 2);
    this.drawLine3D(ctx, cam, [spot.x + 16, spot.y, 0], [spot.x + 16, spot.y, 10], '#334155', 2);
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
    this.drawLine3D(ctx, cam, [px, py, 0], [px, py, 50], '#334155', 2.4);
    const sign = this.projectWorldPt(cam, px, py, 50);
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
    ctx.fillText(stop.mode === 'tram' ? '28E' : '737', sign.x, sign.y + 3 * s);
    ctx.textAlign = 'left';
  }

  drawPerson3D(ctx, cam, person, isEvening, monthInfo = getMonthInfo()) {
    const foot = this.projectWorldPt(cam, person.x, person.y, 0);
    const head = this.projectWorldPt(cam, person.x, person.y, 32);
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
    const startX = Math.max(200, Math.floor((cam.camX - 700) / 100) * 100);
    const endX = Math.min(2200, Math.ceil((cam.camX + 700) / 100) * 100);
    const col = isEvening ? 'rgba(148, 163, 184, 0.45)' : 'rgba(51, 65, 85, 0.52)';
    for (let wx = startX; wx < endX; wx += 100) {
      this.drawLine3D(ctx, cam, [wx, 610, 96], [Math.min(endX, wx + 100), 610, 96], col, 1.2);
    }
  }

  drawSeasonalProp3D(ctx, cam, prop, isEvening, animTime, highlighted = false) {
    const base = this.projectWorldPt(cam, prop.x, prop.y, 0);
    if (!base) return;
    const scale = this.focal / base.cz;

    if (prop.type === 'christmas-tree') {
      // Grand Lisboa Arvore de Natal with tiered emerald boughs, twinkling fairy lights & golden star topper
      const h = prop.r >= 20 ? 116 : 86;
      const top = this.projectWorldPt(cam, prop.x, prop.y, h);
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
      const zBot = 4.5;
      const zTop = 18.5;

      // Ground contact shadow
      this.drawPoly3D(
        ctx,
        cam,
        [[cx - hw - 3, cy - hd - 2, 0.25], [cx + hw + 3, cy - hd - 2, 0.25], [cx + hw + 3, cy + hd + 2, 0.25], [cx - hw - 3, cy + hd + 2, 0.25]],
        'rgba(15, 23, 42, 0.28)'
      );

      // Spoked iron cart wheels & push handles
      for (const wx of [cx - hw + 2, cx + hw - 2]) {
        const wPt = this.projectWorldPt(cam, wx, cy + hd * 0.7, 4.2);
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
      this.drawLine3D(ctx, cam, [cx - hw, cy - 3, 14], [cx - hw - 8, cy - 3, 16], '#78350f', 2.4);
      this.drawLine3D(ctx, cam, [cx - hw, cy + 3, 14], [cx - hw - 8, cy + 3, 16], '#78350f', 2.4);

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
        [[cx - hw - 0.1, cy - 3.5, 9.5], [cx - hw - 0.1, cy + 3.5, 9.5], [cx - hw - 0.1, cy + 3.5, 13], [cx - hw - 0.1, cy - 3.5, 13]],
        '#ea580c',
        '#fde047',
        0.9
      );
      this.drawPoly3D(
        ctx,
        cam,
        [[cx - 5.5, cy - hd - 0.1, 9.5], [cx + 5.5, cy - hd - 0.1, 9.5], [cx + 5.5, cy - hd - 0.1, 13], [cx - 5.5, cy - hd - 0.1, 13]],
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
      const signPt = this.projectWorldPt(cam, cx - hw * 0.4, cy - hd * 0.5, 15.8);
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
      this.drawLine3D(ctx, cam, [stackX, stackY, zTop], [stackX, stackY, 34], '#334155', Math.max(2.5, scale * 3.2));
      this.drawLine3D(ctx, cam, [stackX - 2, stackY, 34.5], [stackX + 2, stackY, 34.5], '#64748b', 2.2);

      // Striped Portuguese terracotta/cream rain canopy umbrella mounted along the riverfront side of the cart
      const canopyPoleX = cx - 2;
      const canopyPoleY = cy + 6;
      this.drawLine3D(ctx, cam, [canopyPoleX, canopyPoleY, zBot], [canopyPoleX, canopyPoleY, 45], '#64748b', 2.2);
      const canopyTop = this.projectWorldPt(cam, canopyPoleX, canopyPoleY, 46);
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

      const stackTop = this.projectWorldPt(cam, stackX, stackY, 35);
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
      const top = this.projectWorldPt(cam, prop.x, prop.y, 52);
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
      const top = this.projectWorldPt(cam, prop.x, prop.y, 26);
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
        const wz = zBase - Math.sin(t * Math.PI) * sag;
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
    const hyInt = clamp(Math.floor(hy), 40, h - 20);
    const groundH = h - hyInt;
    if (groundH <= 4) return false;

    if (!this.groundCanvas || this.groundCanvas.width !== w || this.groundH !== groundH) {
      this.groundCanvas = document.createElement('canvas');
      this.groundCanvas.width = w;
      this.groundCanvas.height = groundH;
      this.groundCtx = this.groundCanvas.getContext('2d');
      this.groundImg = this.groundCtx.createImageData(w, groundH);
      this.groundU32 = new Uint32Array(this.groundImg.data.buffer);
      this.groundH = groundH;
    }

    const u32 = this.groundU32;
    const tex = this.calcadaTex;
    const mask = tex.mask;
    const tMosaic = tex.sidewalkMosaic;
    const tWhite = tex.sidewalkWhite;
    const tBlack = tex.sidewalkBlack;
    const tMar = tex.marLargo;
    const tLeque = tex.lequeRoad;

    // Atmospheric distance fog color matching current Lisbon season & time of day
    const fogR = isEvening ? 54 : wet >= 0.5 ? 148 : brightSummer ? 222 : isGolden ? 204 : 196;
    const fogG = isEvening ? 62 : wet >= 0.5 ? 156 : brightSummer ? 214 : isGolden ? 174 : 190;
    const fogB = isEvening ? 80 : wet >= 0.5 ? 166 : brightSummer ? 198 : isGolden ? 148 : 178;

    // Global stone illumination tint (evening blue twilight, golden hour warmth, wet slate rain sheen, bright July limestone)
    let mulR = isEvening ? 0.58 : isGolden ? 1.06 : brightSummer ? 1.08 : wet >= 0.45 ? 0.84 : 1.0;
    let mulG = isEvening ? 0.62 : isGolden ? 0.96 : brightSummer ? 1.06 : wet >= 0.45 ? 0.86 : 1.0;
    let mulB = isEvening ? 0.76 : isGolden ? 0.84 : brightSummer ? 1.03 : wet >= 0.45 ? 0.92 : 1.0;
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

    const SIDE_SCALE = 2.45; // ~5cm hand-knapped calcada tesserae
    const MAR_SCALE = 2.25;  // Iconic Rossio / Ribeira Mar Largo wave scale
    const LEQUE_SCALE = 2.35; // Authentic overlapping 1.4m Lisbon leque fan cobblestone arches

    for (let row = 0; row < groundH; row += 1) {
      const sy = hyInt + row + 0.5;
      const dy = sy - horizonY;
      const rowOff = row * w;
      if (dy < 0.8) {
        u32.fill(0, rowOff, rowOff + w);
        continue;
      }

      const cz = (camZ * focal) / dy;
      const stepScale = cz / focal;
      const dwx = rx * stepScale;
      const dwy = ry * stepScale;
      let wx = camX + fx * cz - rx * (halfW * stepScale);
      let wy = camY + fy * cz - ry * (halfW * stepScale);

      const fog = cz <= 190 ? 0 : cz >= 1020 ? 0.82 : ((cz - 190) / 830) * 0.82;
      const invFog = 1 - fog;
      const fogAddR = fogR * fog;
      const fogAddG = fogG * fog;
      const fogAddB = fogB * fog;

      for (let sx = 0; sx < w; sx += 1, wx += dwx, wy += dwy) {
        if (wy >= WATERFRONT_Y) {
          u32[rowOff + sx] = 0;
          continue;
        }

        let r;
        let g;
        let b;

        if (wy >= WATERFRONT_Y - 14) {
          // Carved Lioz limestone seawall coping slabs along the Tagus parapet
          const slab = ((wx % 26) + 26) % 26;
          const isEdge = wy >= WATERFRONT_Y - 2 || wy < WATERFRONT_Y - 12.5 || slab < 1.3;
          r = isEdge ? 142 : 226;
          g = isEdge ? 134 : 218;
          b = isEdge ? 122 : 202;
        } else if (wy >= 972) {
          // Ribeira das Naus / Cais do Sodre Tagus Promenade: iconic black-and-white hand-laid Mar Largo wave mosaic!
          const u = Math.floor(wx * MAR_SCALE) & mask;
          const v = Math.floor(wy * MAR_SCALE) & mask;
          const ti = (v * 128 + u) * 4;
          const onFrame = wy < 976.5 || wy > 1011.5;
          const buf = onFrame ? tBlack : tMar;
          r = buf[ti];
          g = buf[ti + 1];
          b = buf[ti + 2];
        } else {
          // Classify roadway carriageway vs. raised Lioz limestone curb vs. Camoes Plaza vs. Chiado/Alfama/Bairro Alto sidewalk
          const inXSpan = wx >= 116 && wx <= 2284;
          const inNorthRoad = inXSpan && wy >= 248 && wy <= 322;
          const inTramRoad = inXSpan && wy >= 577 && wy <= 643;
          const inSouthRoad = inXSpan && wy >= 893 && wy <= 972;
          const inVertRoad =
            (wy >= 248 && wy <= 972 && (
              (wx >= 120 && wx <= 205) ||
              (wx >= 1344 && wx <= 1422) ||
              (wx >= 1685 && wx <= 1775) ||
              (wx >= 2155 && wx <= 2280)
            )) ||
            (wy >= 124 && wy <= 972 && wx >= 475 && wx <= 550);

          if (inNorthRoad || inTramRoad || inSouthRoad || inVertRoad) {
            // Check 3px raised Lioz limestone curbstone (lancil) along road edges
            const onHorizCurb =
              (inNorthRoad && (wy < 251 || wy > 319)) ||
              (inTramRoad && (wy < 580 || wy > 640)) ||
              (inSouthRoad && (wy < 896 || wy > 969));
            const onVertCurb =
              inVertRoad && !inNorthRoad && !inTramRoad && !inSouthRoad && (
                (wx >= 475 && wx <= 478) || (wx >= 547 && wx <= 550) ||
                (wx >= 1344 && wx <= 1347) || (wx >= 1419 && wx <= 1422) ||
                (wx >= 1685 && wx <= 1688) || (wx >= 1772 && wx <= 1775)
              );

            if (onHorizCurb || onVertCurb) {
              const joint = (((wx + wy) % 24) + 24) % 24 < 1.3;
              r = joint ? 128 : 224;
              g = joint ? 120 : 216;
              b = joint ? 110 : 202;
            } else {
              // Overlapping curved fan-arch (Leque) basalt street cobblestones!
              const u = Math.floor(wx * LEQUE_SCALE) & mask;
              const v = Math.floor(wy * LEQUE_SCALE) & mask;
              const ti = (v * 128 + u) * 4;
              r = tLeque[ti];
              g = tLeque[ti + 1];
              b = tLeque[ti + 2];

              // Weathered Lisbon zebra crosswalk paint brushed cleanly OVER the cobblestone texture (cobble joints show through!)
              let onCrosswalk = false;
              if (
                (wy >= 254 && wy <= 316) ||
                (wy >= 579 && wy <= 641) ||
                (wy >= 900 && wy <= 962)
              ) {
                if (
                  (wx >= 491 && wx <= 532 && ((wx - 491) % 11) < 6) ||
                  (wx >= 885 && wx <= 932 && ((wx - 885) % 11) < 6) ||
                  (wx >= 1361 && wx <= 1404 && ((wx - 1361) % 11) < 6) ||
                  (wx >= 1705 && wx <= 1748 && ((wx - 1705) % 11) < 6)
                ) {
                  onCrosswalk = true;
                }
              }
              if (onCrosswalk) {
                r = (r * 0.34 + 244 * 0.66) | 0;
                g = (g * 0.34 + 240 * 0.66) | 0;
                b = (b * 0.34 + 230 * 0.66) | 0;
              }
            }
          } else if (wx >= 865 && wx <= 1035 && wy >= 230 && wy <= 972) {
            // Praca Luis de Camoes Plaza: black basalt border frame + sweeping hand-laid Mar Largo waves!
            const u = Math.floor(wx * MAR_SCALE) & mask;
            const v = Math.floor(wy * MAR_SCALE) & mask;
            const ti = (v * 128 + u) * 4;
            const onPlazaEdge = wx < 872 || wx > 1028;
            const buf = onPlazaEdge ? tBlack : tMar;
            r = buf[ti];
            g = buf[ti + 1];
            b = buf[ti + 2];
          } else {
            // Sidewalks across Bairro Alto, Chiado, and Alfama: authentic hand-laid Calcada Portuguesa!
            // Double black basalt decorative ribbon (faixa de basalto) running parallel to every curb edge
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

        // Apply Lisbon sunlight / twilight / wet rain-sheen + atmospheric perspective fade
        const nr = clamp(((r * mulR + wetSheen * (r > 120 ? 0.5 : 0.9)) * invFog + fogAddR) | 0, 0, 255);
        const ng = clamp(((g * mulG + wetSheen * (g > 120 ? 0.55 : 1.0)) * invFog + fogAddG) | 0, 0, 255);
        const nb = clamp(((b * mulB + wetSheen * 1.15) * invFog + fogAddB) | 0, 0, 255);
        u32[rowOff + sx] = littleEndian
          ? (0xff000000 | (nb << 16) | (ng << 8) | nr)
          : ((nr << 24) | (ng << 16) | (nb << 8) | 0xff);
      }
    }

    this.groundCtx.putImageData(this.groundImg, 0, 0);
    ctx.drawImage(this.groundCanvas, 0, hyInt);
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
    const line1 = `STREET VIEW 3D  |  ${state.currentNeighborhoodName.toUpperCase()}  |  FACING ${compassLabel}`;
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

    const sx = (wx) => mapX + 6 + (wx / WORLD_WIDTH) * (mapW - 12);
    const sy = (wy) => mapY + 6 + (wy / 1200) * (mapH - 12);

    // Tagus water strip on mini-map
    ctx.fillStyle = 'rgba(14, 116, 144, 0.65)';
    ctx.fillRect(mapX + 6, sy(WATERFRONT_Y), mapW - 12, mapY + mapH - 6 - sy(WATERFRONT_Y));

    // Tiny Lisbon buildings
    ctx.fillStyle = 'rgba(226, 218, 202, 0.55)';
    for (const v of VENUES) {
      ctx.fillRect(sx(v.x), sy(v.y), Math.max(2, (v.w / WORLD_WIDTH) * (mapW - 12)), Math.max(2, (v.h / 1200) * (mapH - 12)));
    }

    // Live Tram 28E & Carris Bus dots
    for (const v of state.vehicles) {
      ctx.fillStyle = v.mode === 'tram' ? '#facc15' : '#34d399';
      ctx.beginPath();
      ctx.arc(sx(v.x), sy(v.y), 2.8, 0, Math.PI * 2);
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
