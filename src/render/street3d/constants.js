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

export const ELEV_3D_SCALE = 0.62;
export function getTerrainElevation(wx, wy) {
  return getRawTerrainElevation(wx, wy) * ELEV_3D_SCALE;
}

export const ALL_STOPS = getAllTransitStops();

export const NEAR_Z = 5.0;
export const MAX_VIEW_DIST = 1150;
export const FOV_DEG = 66;
export const EYE_HEIGHT = 34;

export const STREET_TREES = [
  { x: 482, y: 125, c: '#7a58ab', highlight: '#b093dc' },
  { x: 545, y: 125, c: '#7a58ab', highlight: '#b093dc' },
  { x: 908, y: 492, c: '#3f7d52', highlight: '#65a676' },
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
  { x: 2070, y: 984, c: '#3f7d52', highlight: '#65a676' },
  // Greater Lisboa Suburban Boulevards & Parque das Nacoes Jacarandas, Plane Trees & Stone Pines
  ...[-2120, -1620, -1080, -320, 420, 1180, 1980, 2240, 2500, 2760, 3120, 3560, 3920].flatMap((tx, i) => [
    { x: tx, y: -1832, c: i % 2 === 0 ? '#7a58ab' : '#3f7d52', highlight: i % 2 === 0 ? '#b093dc' : '#65a676' },
    { x: tx + 60, y: -1664, c: i % 2 === 1 ? '#7a58ab' : '#487f57', highlight: i % 2 === 1 ? '#b093dc' : '#73ad82' },
    { x: tx, y: -1152, c: i % 3 === 0 ? '#7a58ab' : '#3f7d52', highlight: i % 3 === 0 ? '#b093dc' : '#65a676' },
    { x: tx + 40, y: -472, c: i % 2 === 0 ? '#487f57' : '#7a58ab', highlight: i % 2 === 0 ? '#73ad82' : '#b093dc' }
  ]),
  // Parque das Nacoes Expo 98 Waterfront & Alameda dos Oceanos Tree Promenade
  ...[2520, 2820, 3120, 3440, 3760, 4020].flatMap((tx, i) => [
    { x: tx, y: -316, c: i % 2 === 0 ? '#3f7d52' : '#7a58ab', highlight: i % 2 === 0 ? '#65a676' : '#b093dc' },
    { x: tx, y: 352, c: i % 2 === 1 ? '#3f7d52' : '#487f57', highlight: i % 2 === 1 ? '#65a676' : '#73ad82' },
    { x: tx, y: 984, c: i % 2 === 0 ? '#7a58ab' : '#3f7d52', highlight: i % 2 === 0 ? '#b093dc' : '#65a676' }
  ])
];

export const STREET_LAMPS = [
  { x: 468, y: 542 },
  { x: 780, y: 542 },
  { x: 1042, y: 542 },
  { x: 1344, y: 542 },
  { x: 1656, y: 542 },
  { x: 1960, y: 542 },
  { x: 468, y: 678 },
  { x: 950, y: 678 },
  { x: 1460, y: 678 },
  { x: 1910, y: 678 },
  { x: 640, y: 992 },
  { x: 1180, y: 992 },
  { x: 1680, y: 992 },
  // Greater Lisboa Suburban & Parque das Nacoes Cast-Iron Streetlamps
  ...[-1980, -1240, -280, 620, 1420, 2060, 2360, 2660, 3140, 3540, 3920].flatMap((lx) => [
    { x: lx, y: -1826 },
    { x: lx, y: -1146 },
    { x: lx, y: -466 },
    { x: lx, y: 992 }
  ])
];

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function drawRoundedRect(ctx, x, y, w, h, r = 6) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function parseHexRgb(hex) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return [220, 212, 198];
  const h = hex.length === 4
    ? `${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex.slice(1, 7);
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [220, 212, 198];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shadeColor(hex, factor, evening = false) {
  const [r, g, b] = parseHexRgb(hex);
  const er = evening ? 0.62 : 1;
  const eg = evening ? 0.66 : 1;
  const eb = evening ? 0.78 : 1;
  const nr = clamp(Math.round(r * factor * er), 0, 255);
  const ng = clamp(Math.round(g * factor * eg), 0, 255);
  const nb = clamp(Math.round(b * factor * eb), 0, 255);
  return `rgb(${nr},${ng},${nb})`;
}

export function getVenueHeight(venue) {
  const s = venue.archStyle || '';
  if (s === 'cathedral') return 142;
  if (s === 'kiosk') return 52;
  if (s === 'bertrand') return 144;
  if (s === 'pensao') return 138;
  if (s === 'brasileira') return 136;
  if (s === 'arcaded-azulejo') return 134;
  if (s === 'palacete-gallery') return 132;
  if (s === 'azulejo-gallery') return 130;
  if (s === 'chiado-arcade') return 126;
  if (s === 'casas-rosa') return 120;
  if (s === 'azulejo-atelier') return 118;
  if (s === 'bohemian-shop') return 112;
  if (s === 'bairro-bar') return 118;
  if (s === 'mercearia') return 108;
  if (s === 'alfama-taberna') return 102;
  if (s === 'tasca') return 96;
  return 122;
}

export function getVenueWallBaseColor(venue) {
  return venue.wallColor || '#f0ddc3';
}

export function getVenueTileMode(venue) {
  const s = venue.archStyle || '';
  if (s === 'bertrand' || s === 'azulejo-atelier') return 'cobalt';
  if (s === 'azulejo-gallery') return 'polychrome';
  if (s === 'chiado-arcade') return 'teal';
  if (s === 'bohemian-shop') return 'bohemian';
  return null;
}

export function clipPolyNearZ(camPts) {
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

export function clipSegmentNearZ(a, b) {
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

export function rayBoxEntryDistance(camX, camY, rdx, rdy, box) {
  let tMin = -Infinity;
  let tMax = Infinity;

  if (Math.abs(rdx) < 1e-7) {
    if (camX < box.x0 || camX > box.x1) return null;
  } else {
    const tx1 = (box.x0 - camX) / rdx;
    const tx2 = (box.x1 - camX) / rdx;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  if (Math.abs(rdy) < 1e-7) {
    if (camY < box.y0 || camY > box.y1) return null;
  } else {
    const ty1 = (box.y0 - camY) / rdy;
    const ty2 = (box.y1 - camY) / rdy;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  if (tMax < Math.max(0.1, tMin)) return null;
  return { tEnter: Math.max(0, tMin), tExit: tMax };
}

export function getBoxViewOrdering(a, b, camX, camY) {
  // Overhead string-light arches sort cleanly by distance without creating 2D ground footprint dependencies
  if (
    a.kind === 'decor-arch' ||
    a.kind === 'bairro-party-arch' ||
    b.kind === 'decor-arch' ||
    b.kind === 'bairro-party-arch'
  ) {
    return 0;
  }

  // 1. Separating Axis (Newell's Separating Plane) between 2D footprints `a` and `b`
  const aWestOfB = a.x1 <= b.x0 + 1;
  const bWestOfA = b.x1 <= a.x0 + 1;
  const aNorthOfB = a.y1 <= b.y0 + 1;
  const bNorthOfA = b.y1 <= a.y0 + 1;

  let ordX = 0;
  if (aWestOfB) {
    if (camX >= b.x0) ordX = 1; // a is behind b
    else if (camX <= a.x1) ordX = -1; // b is behind a
  } else if (bWestOfA) {
    if (camX >= a.x0) ordX = -1; // b is behind a
    else if (camX <= b.x1) ordX = 1; // a is behind b
  }

  let ordY = 0;
  if (aNorthOfB) {
    if (camY >= b.y0) ordY = 1; // a is behind b
    else if (camY <= a.y1) ordY = -1; // b is behind a
  } else if (bNorthOfA) {
    if (camY >= a.y0) ordY = -1; // b is behind a
    else if (camY <= b.y1) ordY = 1; // a is behind b
  }

  // If separated on both X and Y in opposing camera directions, their view cones are in disjoint quadrants
  if (ordX !== 0 && ordY !== 0 && ordX !== ordY) return 0;
  const sepOrder = ordX !== 0 ? ordX : ordY;
  if (sepOrder === 0) return 0;

  // 2. Check if any sight ray from (camX, camY) intersects both 3D-padded footprints (accounting for roofs/awnings/shoulders)
  const padA = a.kind === 'venue' ? 6 : 4;
  const padB = b.kind === 'venue' ? 6 : 4;
  const boxA = { x0: a.x0 - padA, y0: a.y0 - padA, x1: a.x1 + padA, y1: a.y1 + padA };
  const boxB = { x0: b.x0 - padB, y0: b.y0 - padB, x1: b.x1 + padB, y1: b.y1 + padB };

  const axM = (boxA.x0 + boxA.x1) * 0.5;
  const ayM = (boxA.y0 + boxA.y1) * 0.5;
  const bxM = (boxB.x0 + boxB.x1) * 0.5;
  const byM = (boxB.y0 + boxB.y1) * 0.5;
  const samplePts = [
    [axM, ayM],
    [boxA.x0, boxA.y0],
    [boxA.x1, boxA.y0],
    [boxA.x1, boxA.y1],
    [boxA.x0, boxA.y1],
    [axM, boxA.y0],
    [axM, boxA.y1],
    [boxA.x0, ayM],
    [boxA.x1, ayM],
    [bxM, byM],
    [boxB.x0, boxB.y0],
    [boxB.x1, boxB.y0],
    [boxB.x1, boxB.y1],
    [boxB.x0, boxB.y1],
    [bxM, boxB.y0],
    [bxM, boxB.y1],
    [boxB.x0, byM],
    [boxB.x1, byM]
  ];

  for (let k = 0; k < samplePts.length; k += 1) {
    const dx = samplePts[k][0] - camX;
    const dy = samplePts[k][1] - camY;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    const rdx = dx / len;
    const rdy = dy / len;
    const hitA = rayBoxEntryDistance(camX, camY, rdx, rdy, boxA);
    if (!hitA) continue;
    const hitB = rayBoxEntryDistance(camX, camY, rdx, rdy, boxB);
    if (!hitB) continue;
    return sepOrder;
  }

  return 0;
}

export function sortOccludersBackToFront(items, camX, camY) {
  const n = items.length;
  if (n <= 1) return items;

  // Use closest point on the 2D box to the camera (plus minor centroid tie-breaker) so wide 220px buildings
  // never sort behind small actors/vehicles that are actually farther than the building's near wall!
  const nearDist2 = items.map((it) => {
    const nx = clamp(camX, it.x0, it.x1);
    const ny = clamp(camY, it.y0, it.y1);
    const mx = (it.x0 + it.x1) * 0.5;
    const my = (it.y0 + it.y1) * 0.5;
    const dNear = (nx - camX) * (nx - camX) + (ny - camY) * (ny - camY);
    const dMid = (mx - camX) * (mx - camX) + (my - camY) * (my - camY);
    return dNear + dMid * 0.02;
  });

  const rawAdj = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const cmp = getBoxViewOrdering(items[i], items[j], camX, camY);
      if (cmp > 0) {
        rawAdj[i].push(j);
      } else if (cmp < 0) {
        rawAdj[j].push(i);
      }
    }
  }

  // Guarantee a strict cycle-free DAG via DFS in decreasing distance order before computing indegrees
  const adj = Array.from({ length: n }, () => []);
  const indeg = new Int32Array(n);
  const visitState = new Uint8Array(n); // 0 = unvisited, 1 = on stack, 2 = done
  const orderByFar = Array.from({ length: n }, (_, i) => i).sort((a, b) => nearDist2[b] - nearDist2[a]);

  const dfs = (u) => {
    visitState[u] = 1;
    const neighbors = rawAdj[u].slice().sort((a, b) => nearDist2[b] - nearDist2[a]);
    for (const v of neighbors) {
      if (visitState[v] === 1) continue; // Drop back-edge so graph is 100% acyclic
      adj[u].push(v);
      indeg[v] += 1;
      if (visitState[v] === 0) dfs(v);
    }
    visitState[u] = 2;
  };

  for (const startNode of orderByFar) {
    if (visitState[startNode] === 0) dfs(startNode);
  }

  const ordered = [];
  const emitted = new Uint8Array(n);

  while (ordered.length < n) {
    let bestIdx = -1;
    let bestIndeg = Infinity;
    let bestD = -Infinity;
    for (let i = 0; i < n; i += 1) {
      if (emitted[i]) continue;
      const deg = indeg[i];
      const d = nearDist2[i];
      if (deg < bestIndeg || (deg === bestIndeg && d > bestD)) {
        bestIndeg = deg;
        bestD = d;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    emitted[bestIdx] = 1;
    ordered.push(items[bestIdx]);
    for (const v of adj[bestIdx]) {
      if (!emitted[v] && indeg[v] > 0) {
        indeg[v] -= 1;
      }
    }
  }

  return ordered;
}

export function pointInPolygon2D(px, py, poly) {
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

export function findNearestStreetName(px, py) {
  for (const st of STREETS) {
    if (px >= st.x - 16 && px <= st.x + st.w + 16 && py >= st.y - 16 && py <= st.y + st.h + 16) {
      return st.name;
    }
  }
  if (py >= WATERFRONT_Y - 60) return 'Cais do Sodre - Tagus Promenade';
  return 'Lisboa Historic Quarter';
}

export const CALCADA_TEX_SIZE = 128;
export const CALCADA_TEX_MASK = CALCADA_TEX_SIZE - 1;
export const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;

let CACHED_CALCADA_DATA = null;

export function hash2DInt(ix, iy, seed = 1) {
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

