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
  getAllTransitStops,
  getOutfitById
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
  { x: 740, y: 985, c: '#3f7d52', highlight: '#65a676' },
  { x: 1410, y: 985, c: '#7a58ab', highlight: '#b093dc' },
  { x: 2070, y: 985, c: '#3f7d52', highlight: '#65a676' }
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

export class LisboaStreetView3DRenderer {
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.focal = (viewWidth * 0.5) / Math.tan((FOV_DEG * Math.PI) / 360);
    this.hoverWorld = null;
    this.lastHitTargets = [];
  }

  buildCamera(state) {
    const player = state.player;
    const yaw = Number.isFinite(state.cameraYaw) ? state.cameraYaw : 0.08;
    const pitch = clamp(Number.isFinite(state.cameraPitch) ? state.cameraPitch : 0.03, -0.24, 0.34);
    const bob = player.isMoving ? Math.sin(player.walkPhase * 2) * 1.15 : 0;
    const camX = player.x;
    const camY = player.y;
    const camZ = EYE_HEIGHT + bob;
    const fx = Math.cos(yaw);
    const fy = Math.sin(yaw);
    const rx = -fy;
    const ry = fx;
    const horizonY = this.viewHeight * 0.48 + pitch * this.focal * 0.65;
    return { camX, camY, camZ, yaw, pitch, fx, fy, rx, ry, horizonY };
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
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';

    // 1. Sky dome, sun/moon & 360-degree Lisboa hills + Tagus River panorama
    this.drawSkyAndPanorama(ctx, cam, phase, animTime);

    // 2. Ground plane: cobblestone terrain, Tagus water, streets, curbs, crosswalks & Tram 28E rails
    this.drawGroundAndStreets(ctx, cam, state, isEvening, animTime);

    // 3. Google Street View hover ground chevron & walk target ring on cobblestones
    this.drawGroundIndicators(ctx, cam, state, animTime);

    // 4. Collect all visible 3D buildings, landmarks, vehicles, trees, lamps, benches, stops, locals & LAN peers
    const occluders = this.collectOccluders(cam, state, nearbyInteraction);
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
        this.drawTree3D(ctx, cam, item.tree, isEvening);
      } else if (item.kind === 'lamp') {
        this.drawStreetlamp3D(ctx, cam, item.lamp, isEvening, isGolden);
      } else if (item.kind === 'bench') {
        this.drawBench3D(ctx, cam, item.spot, item.captured, isEvening);
      } else if (item.kind === 'stop') {
        this.drawTransitStop3D(ctx, cam, item.stop, item.highlighted, isEvening);
      } else if (item.kind === 'person') {
        this.drawPerson3D(ctx, cam, item.person, isEvening);
      }
    }

    // 6. Overhead Tram 28E electric catenary wire spanning above Rua do Loreto / Largo do Chiado
    this.drawOverheadTramWire(ctx, cam, isEvening);

    // 7. Crisp Google Street View style HUD: street address badge + compass & live radar mini-map
    this.drawStreetViewHud(ctx, cam, state);
  }

  drawSkyAndPanorama(ctx, cam, phase, animTime) {
    const w = this.viewWidth;
    const hy = clamp(cam.horizonY, 60, this.viewHeight - 80);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';

    const skyGrad = ctx.createLinearGradient(0, 0, 0, hy + 2);
    if (isEvening) {
      skyGrad.addColorStop(0, '#0a1630');
      skyGrad.addColorStop(0.58, '#172b54');
      skyGrad.addColorStop(1, '#2b3f6b');
    } else if (isGolden) {
      skyGrad.addColorStop(0, '#36588f');
      skyGrad.addColorStop(0.55, '#c97c5d');
      skyGrad.addColorStop(1, '#f7cf86');
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

    // Evening stars
    if (isEvening) {
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

    // Sun or Moon positioned authentically on the sky dome
    const celestialYaw = isEvening ? -1.1 : isGolden ? 2.65 : 0.75;
    const relSun = Math.atan2(Math.sin(celestialYaw - cam.yaw), Math.cos(celestialYaw - cam.yaw));
    if (Math.abs(relSun) < 0.95) {
      const sunX = w * 0.5 + relSun * this.focal;
      const sunY = isGolden ? hy - 48 : isEvening ? 64 : 74;
      const glow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 54);
      if (isEvening) {
        glow.addColorStop(0, 'rgba(241, 245, 249, 0.95)');
        glow.addColorStop(0.4, 'rgba(226, 232, 240, 0.25)');
        glow.addColorStop(1, 'rgba(226, 232, 240, 0)');
      } else {
        glow.addColorStop(0, isGolden ? 'rgba(255, 237, 160, 0.95)' : 'rgba(255, 250, 220, 0.92)');
        glow.addColorStop(0.42, isGolden ? 'rgba(251, 146, 60, 0.35)' : 'rgba(254, 240, 138, 0.28)');
        glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 54, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft Atlantic drifting clouds
    if (!isEvening) {
      ctx.fillStyle = isGolden ? 'rgba(255, 232, 198, 0.48)' : 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < 6; i += 1) {
        const cloudYaw = ((i * 1.05) + animTime * 0.008) % (Math.PI * 2);
        const rel = Math.atan2(Math.sin(cloudYaw - cam.yaw), Math.cos(cloudYaw - cam.yaw));
        if (Math.abs(rel) > 1.05) continue;
        const cx = w * 0.5 + rel * this.focal;
        const cy = 44 + (i % 3) * 28;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 56, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 26, cy - 5, 34, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Distant Lisbon 360-degree Horizon Hills + Ponte 25 de Abril & Cristo Rei (South) + Castelo de Sao Jorge (North-East)
    ctx.fillStyle = isEvening ? '#182847' : isGolden ? '#8e6d74' : '#7b99b5';
    ctx.beginPath();
    ctx.moveTo(0, hy + 2);
    for (let sx = 0; sx <= w; sx += 20) {
      const rayAngle = cam.yaw + Math.atan2(sx - w * 0.5, this.focal);
      const isSouth = Math.sin(rayAngle) > 0.25;
      const hillH = isSouth
        ? 14 + Math.sin(rayAngle * 5.0) * 7 + Math.cos(rayAngle * 3.0) * 5
        : 24 + Math.sin(rayAngle * 4.2) * 12 + Math.cos(rayAngle * 9.0) * 6;
      ctx.lineTo(sx, hy - hillH);
    }
    ctx.lineTo(w, hy + 2);
    ctx.closePath();
    ctx.fill();

    // Distant Iconic Ponte 25 de Abril & Cristo Rei across the Tagus when looking South-Southwest
    const bridgeYaw = Math.PI * 0.62;
    const relBridge = Math.atan2(Math.sin(bridgeYaw - cam.yaw), Math.cos(bridgeYaw - cam.yaw));
    if (Math.abs(relBridge) < 0.85) {
      const bx = w * 0.5 + relBridge * this.focal;
      ctx.strokeStyle = isEvening ? '#7f1d1d' : '#c81e32';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 120, hy - 14);
      ctx.lineTo(bx + 120, hy - 14);
      ctx.stroke();
      ctx.fillStyle = isEvening ? '#7f1d1d' : '#c81e32';
      ctx.fillRect(bx - 64, hy - 54, 5, 56);
      ctx.fillRect(bx + 56, hy - 54, 5, 56);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx - 120, hy - 14);
      ctx.quadraticCurveTo(bx - 92, hy - 26, bx - 62, hy - 52);
      ctx.quadraticCurveTo(bx - 2, hy - 16, bx + 58, hy - 52);
      ctx.quadraticCurveTo(bx + 88, hy - 26, bx + 120, hy - 14);
      ctx.stroke();
      // Cristo Rei monument on distant Almada ridge
      ctx.fillStyle = isEvening ? '#94a3b8' : '#e5ded0';
      ctx.fillRect(bx + 94, hy - 44, 6, 26);
      ctx.fillRect(bx + 90, hy - 46, 14, 2.5);
    }

    // Distant Castelo de Sao Jorge hilltop silhouette when looking North-East
    const castleYaw = -0.78;
    const relCastle = Math.atan2(Math.sin(castleYaw - cam.yaw), Math.cos(castleYaw - cam.yaw));
    if (Math.abs(relCastle) < 0.85) {
      const cx = w * 0.5 + relCastle * this.focal;
      ctx.fillStyle = isEvening ? '#243452' : isGolden ? '#8c6966' : '#8598a8';
      ctx.fillRect(cx - 42, hy - 46, 84, 26);
      for (let m = -40; m <= 36; m += 12) {
        ctx.fillRect(cx + m, hy - 52, 7, 6);
      }
    }
  }

  drawGroundAndStreets(ctx, cam, state, isEvening, animTime) {
    const w = this.viewWidth;
    const h = this.viewHeight;
    const hy = clamp(cam.horizonY, 60, h - 80);

    // Base warm Lisbon calcada ground plane
    const groundGrad = ctx.createLinearGradient(0, hy, 0, h);
    if (isEvening) {
      groundGrad.addColorStop(0, '#3a4254');
      groundGrad.addColorStop(0.35, '#4c5261');
      groundGrad.addColorStop(1, '#5d606c');
    } else {
      groundGrad.addColorStop(0, '#c7c1b6');
      groundGrad.addColorStop(0.28, '#ddd6c8');
      groundGrad.addColorStop(1, '#eae3d6');
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, hy, w, h - hy);

    // Tagus River water plane south of WATERFRONT_Y
    const riverColor = isEvening ? '#102944' : '#1d6692';
    this.drawPoly3D(
      ctx,
      cam,
      [
        [0, WATERFRONT_Y, 0],
        [WORLD_WIDTH, WATERFRONT_Y, 0],
        [WORLD_WIDTH, WATERFRONT_Y + 900, 0],
        [0, WATERFRONT_Y + 900, 0]
      ],
      riverColor
    );

    // Shimmering Tagus water streaks
    const waveShift = (animTime * 22) % 90;
    for (let ry = WATERFRONT_Y + 40; ry < WATERFRONT_Y + 340; ry += 65) {
      for (let rx = 120 + waveShift; rx < WORLD_WIDTH - 120; rx += 180) {
        if (Math.hypot(rx - cam.camX, ry - cam.camY) > 1050) continue;
        this.drawLine3D(ctx, cam, [rx, ry, 0], [rx + 42, ry, 0], 'rgba(218, 240, 255, 0.34)', 1.6);
      }
    }

    // Tagus limestone promenade curb & low parapet edge along WATERFRONT_Y
    this.drawPoly3D(
      ctx,
      cam,
      [
        [0, WATERFRONT_Y - 18, 0.3],
        [WORLD_WIDTH, WATERFRONT_Y - 18, 0.3],
        [WORLD_WIDTH, WATERFRONT_Y, 0.3],
        [0, WATERFRONT_Y, 0.3]
      ],
      isEvening ? '#6e7078' : '#d2c9b8'
    );

    // Project all streets, sidewalks, plazas & raised curbs cleanly in 3D perspective
    for (const st of STREETS) {
      // Quick distance cull
      const nearX = clamp(cam.camX, st.x, st.x + st.w);
      const nearY = clamp(cam.camY, st.y, st.y + st.h);
      if (Math.hypot(nearX - cam.camX, nearY - cam.camY) > MAX_VIEW_DIST) continue;

      if (st.style === 'plaza') {
        this.drawPoly3D(
          ctx,
          cam,
          [
            [st.x, st.y, 0.1],
            [st.x + st.w, st.y, 0.1],
            [st.x + st.w, st.y + st.h, 0.1],
            [st.x, st.y + st.h, 0.1]
          ],
          isEvening ? '#686b75' : '#ede7db',
          isEvening ? '#3b4252' : '#57606f',
          1.2
        );
        // Subtle Mar Largo wave bands across Praca Luis de Camoes
        for (let wy = st.y + 36; wy < st.y + st.h - 24; wy += 44) {
          if (Math.abs(wy - cam.camY) > 620) continue;
          this.drawLine3D(
            ctx,
            cam,
            [st.x + 14, wy, 0.2],
            [st.x + st.w - 14, wy, 0.2],
            isEvening ? 'rgba(30, 41, 59, 0.42)' : 'rgba(51, 65, 85, 0.3)',
            2.2
          );
        }
        continue;
      }

      // Stone sidewalk bed
      this.drawPoly3D(
        ctx,
        cam,
        [
          [st.x, st.y, 0.1],
          [st.x + st.w, st.y, 0.1],
          [st.x + st.w, st.y + st.h, 0.1],
          [st.x, st.y + st.h, 0.1]
        ],
        isEvening ? '#60636e' : '#e2dbcd'
      );

      // Inset basalt cobblestone roadway
      const insetX = st.style === 'tram-avenue' ? 6 : 10;
      const insetY = st.style === 'tram-avenue' ? 22 : st.style === 'bus-road' ? 18 : 4;
      const rx0 = st.x + insetX;
      const ry0 = st.y + insetY;
      const rx1 = st.x + st.w - insetX;
      const ry1 = st.y + st.h - insetY;
      if (rx1 > rx0 && ry1 > ry0) {
        this.drawPoly3D(
          ctx,
          cam,
          [
            [rx0, ry0, 0.15],
            [rx1, ry0, 0.15],
            [rx1, ry1, 0.15],
            [rx0, ry1, 0.15]
          ],
          isEvening ? '#404552' : '#9c958b',
          isEvening ? '#6f7480' : '#d5cdbe',
          1.5
        );
      }
    }

    // Subtle cobblestone perspective depth grid lines near the player so motion feels tactile
    const step = 48;
    const minGX = Math.max(80, Math.floor((cam.camX - 420) / step) * step);
    const maxGX = Math.min(WORLD_WIDTH - 80, Math.ceil((cam.camX + 420) / step) * step);
    const minGY = Math.max(80, Math.floor((cam.camY - 420) / step) * step);
    const maxGY = Math.min(WATERFRONT_Y - 20, Math.ceil((cam.camY + 420) / step) * step);
    const cobbleStroke = isEvening ? 'rgba(20, 26, 40, 0.18)' : 'rgba(92, 84, 72, 0.14)';
    for (let gx = minGX; gx <= maxGX; gx += step) {
      this.drawLine3D(ctx, cam, [gx, minGY, 0.18], [gx, maxGY, 0.18], cobbleStroke, 1);
    }
    for (let gy = minGY; gy <= maxGY; gy += step) {
      this.drawLine3D(ctx, cam, [minGX, gy, 0.18], [maxGX, gy, 0.18], cobbleStroke, 1);
    }

    // Zebra Crosswalks in crisp 3D perspective
    for (const cw of CROSSWALKS) {
      if (Math.hypot(cw.x + cw.w * 0.5 - cam.camX, cw.y + cw.h * 0.5 - cam.camY) > 760) continue;
      for (let sx = cw.x + 3; sx < cw.x + cw.w - 4; sx += 11) {
        this.drawPoly3D(
          ctx,
          cam,
          [
            [sx, cw.y + 4, 0.25],
            [sx + 6, cw.y + 4, 0.25],
            [sx + 6, cw.y + cw.h - 4, 0.25],
            [sx, cw.y + cw.h - 4, 0.25]
          ],
          isEvening ? 'rgba(218, 224, 232, 0.58)' : 'rgba(248, 244, 236, 0.85)'
        );
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

  collectOccluders(cam, state, nearbyInteraction) {
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
          1
        );
      }
      if (cam.camY <= ridgeY) {
        this.drawPoly3D(
          ctx,
          cam,
          [[x1, y0, wallH], [x0, y0, wallH], [ridgeX0, ridgeY, ridgeZ], [ridgeX1, ridgeY, ridgeZ]],
          shadeColor(roofBase, 0.82, isEvening),
          shadeColor(roofBase, 0.62, isEvening),
          1
        );
      }
      if (cam.camX <= ridgeX0) {
        this.drawPoly3D(
          ctx,
          cam,
          [[x0, y0, wallH], [x0, y1, wallH], [ridgeX0, ridgeY, ridgeZ]],
          shadeColor(roofBase, 0.9, isEvening),
          shadeColor(roofBase, 0.65, isEvening),
          1
        );
      }
      if (cam.camX >= ridgeX1) {
        this.drawPoly3D(
          ctx,
          cam,
          [[x1, y1, wallH], [x1, y0, wallH], [ridgeX1, ridgeY, ridgeZ]],
          shadeColor(roofBase, 0.74, isEvening),
          shadeColor(roofBase, 0.58, isEvening),
          1
        );
      }
    }

    // Draw each visible wall facade with Lisbon stone plinths, azulejo tiles, balconies, awnings & signage
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

      // Ground-floor limestone base plinth & story stringcourse moldings
      this.drawPoly3D(
        ctx,
        cam,
        [lerpWall(0, 0), lerpWall(1, 0), lerpWall(1, 36), lerpWall(0, 36)],
        shadeColor('#dfd8cb', face.shade * 0.96, isEvening)
      );
      this.drawLine3D(ctx, cam, lerpWall(0, 36), lerpWall(1, 36), shadeColor('#8c8274', face.shade, isEvening), 1.4);
      if (wallH > 95) {
        this.drawLine3D(ctx, cam, lerpWall(0, 78), lerpWall(1, 78), shadeColor('#8c8274', face.shade, isEvening), 1.1);
      }
      // Cornice band under terracotta eaves
      this.drawPoly3D(
        ctx,
        cam,
        [lerpWall(0, wallH - 6), lerpWall(1, wallH - 6), lerpWall(1, wallH), lerpWall(0, wallH)],
        shadeColor(trimCol, face.shade, isEvening)
      );

      // Authentic Azulejo glazed tile wall grid shimmer (cobalt or teal)
      if (dist < 640 && tileMode) {
        const tileStroke =
          tileMode === 'cobalt'
            ? 'rgba(27, 77, 137, 0.36)'
            : 'rgba(22, 108, 92, 0.36)';
        const cols = Math.max(5, Math.min(12, Math.round(face.len / 20)));
        for (let c = 1; c < cols; c += 1) {
          this.drawLine3D(ctx, cam, lerpWall(c / cols, 36), lerpWall(c / cols, wallH - 6), tileStroke, 0.9);
        }
        for (let tz = 50; tz < wallH - 8; tz += 15) {
          this.drawLine3D(ctx, cam, lerpWall(0, tz), lerpWall(1, tz), tileStroke, 0.9);
        }
      }

      // Detailed multi-story Lisbon tall windows & wrought-iron Juliet balconies
      if (dist < 820 && !isCathedral) {
        const bays = Math.max(2, Math.min(5, Math.floor(face.len / 46)));
        const winGlass = isEvening ? '#fde68a' : isGolden ? '#fcd34d' : '#2c4666';
        const shutterCol = shadeColor(trimCol, face.shade * 0.82, isEvening);
        for (const floorZ of [46, 86]) {
          if (floorZ + 26 > wallH - 6) continue;
          for (let i = 0; i < bays; i += 1) {
            const uc = (i + 0.5) / bays;
            const halfU = Math.min(0.08, 12 / Math.max(40, face.len));
            const u0 = uc - halfU;
            const u1 = uc + halfU;
            // Stone window surround
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(u0 - 0.012, floorZ - 2), lerpWall(u1 + 0.012, floorZ - 2), lerpWall(u1 + 0.012, floorZ + 25), lerpWall(u0 - 0.012, floorZ + 25)],
              shadeColor('#ece6da', face.shade, isEvening)
            );
            // Window glass
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(u0, floorZ), lerpWall(u1, floorZ), lerpWall(u1, floorZ + 22), lerpWall(u0, floorZ + 22)],
              winGlass,
              shutterCol,
              1.1
            );
            // Wrought-iron Juliet balcony railing across bottom of tall window
            if (dist < 560) {
              this.drawLine3D(ctx, cam, lerpWall(u0 - 0.01, floorZ + 8), lerpWall(u1 + 0.01, floorZ + 8), '#1e293b', 1.4);
              this.drawLine3D(ctx, cam, lerpWall(u0 - 0.01, floorZ + 2), lerpWall(u1 + 0.01, floorZ + 2), '#1e293b', 1.2);
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

        // Flanking ground-floor shopfront windows (warm glowing bakery / cafe / bookshop interiors!)
        if (dist < 760 && !isCathedral) {
          const shopGlow = isEvening ? '#fef08a' : '#fff3d6';
          for (const sideOffset of [-0.27, 0.27]) {
            const wu = doorU + sideOffset;
            if (wu - 0.1 < 0.04 || wu + 0.1 > 0.96) continue;
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(wu - 0.09, 6), lerpWall(wu + 0.09, 6), lerpWall(wu + 0.09, 29), lerpWall(wu - 0.09, 29)],
              shopGlow,
              shadeColor('#472d1b', face.shade, isEvening),
              1.4
            );
            this.drawPoly3D(
              ctx,
              cam,
              [lerpWall(wu - 0.075, 11), lerpWall(wu + 0.075, 11), lerpWall(wu + 0.075, 16), lerpWall(wu - 0.075, 16)],
              shadeColor(venue.roofColor || '#9a3412', 0.85, isEvening)
            );
          }
        }

        // Enterable Doorway Frame & Timber Door
        const doorTopZ = isCathedral ? 48 : 30;
        this.drawPoly3D(
          ctx,
          cam,
          [lerpWall(doorU - halfDoorU, 0), lerpWall(doorU + halfDoorU, 0), lerpWall(doorU + halfDoorU, doorTopZ), lerpWall(doorU - halfDoorU, doorTopZ)],
          highlighted ? '#d97706' : shadeColor('#5a351e', face.shade, isEvening),
          highlighted ? '#fef08a' : '#2d1a0f',
          highlighted ? 2.4 : 1.5
        );
        // Glass door transom window
        this.drawPoly3D(
          ctx,
          cam,
          [lerpWall(doorU - halfDoorU * 0.72, doorTopZ - 8), lerpWall(doorU + halfDoorU * 0.72, doorTopZ - 8), lerpWall(doorU + halfDoorU * 0.72, doorTopZ - 2), lerpWall(doorU - halfDoorU * 0.72, doorTopZ - 2)],
          '#fef08a'
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

    // Pitched emerald ferry hall roof
    this.drawPoly3D(
      ctx,
      cam,
      [[x0 - 4, y0 - 2, wallH], [x1 + 4, y0 - 2, wallH], [(x0 + x1) * 0.5, (y0 + y1) * 0.5, wallH + roofH]],
      shadeColor('#0f5c52', 0.95, isEvening),
      '#0b3f38',
      1.2
    );

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

    if (cam.camY < y0) {
      drawFace([[x1, y0, 0], [x0, y0, 0], [x0, y0, wallH], [x1, y0, wallH]], 0.98);
      // Grand emerald base trim & 3 arched waterfront terminal doors/windows on the north entrance facade
      this.drawPoly3D(ctx, cam, [[x1, y0, 0], [x0, y0, 0], [x0, y0, 12], [x1, y0, 12]], shadeColor('#0f5c52', 0.92, isEvening));
      this.drawPoly3D(ctx, cam, [[x1, y0, wallH - 10], [x0, y0, wallH - 10], [x0, y0, wallH], [x1, y0, wallH]], shadeColor('#0f5c52', 0.96, isEvening));
      for (const u of [0.22, 0.5, 0.78]) {
        const wx0 = x0 + (x1 - x0) * (u - 0.1);
        const wx1 = x0 + (x1 - x0) * (u + 0.1);
        this.drawPoly3D(
          ctx,
          cam,
          [[wx1, y0, 0], [wx0, y0, 0], [wx0, y0, 44], [wx1, y0, 44]],
          u === 0.5 ? '#1e3a5f' : isEvening ? '#fde68a' : '#bfe3f5',
          '#0f5c52',
          1.8
        );
      }
    }
    if (cam.camY > y1) drawFace([[x0, y1, 0], [x1, y1, 0], [x1, y1, wallH], [x0, y1, wallH]], 0.9);
    if (cam.camX < x0) drawFace([[x0, y0, 0], [x0, y1, 0], [x0, y1, wallH], [x0, y0, wallH]], 0.85);
    if (cam.camX > x1) drawFace([[x1, y1, 0], [x1, y0, 0], [x1, y0, wallH], [x1, y1, wallH]], 0.8);

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

  drawTree3D(ctx, cam, tree, isEvening) {
    const base = this.projectWorldPt(cam, tree.x, tree.y, 0);
    const crown = this.projectWorldPt(cam, tree.x, tree.y, 52);
    if (!base || !crown) return;
    const scale = this.focal / base.cz;
    const trunkW = clamp(6 * scale, 2, 16);
    const canopyR = clamp(24 * scale, 5, 68);

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, canopyR * 0.85, canopyR * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = shadeColor('#6c4d35', 0.9, isEvening);
    ctx.fillRect(base.x - trunkW * 0.5, crown.y, trunkW, Math.max(4, base.y - crown.y));

    // Layered Jacaranda / Olive foliage puffs (separate beginPath per circle to prevent cutout artifacts)
    const cMain = shadeColor(tree.c, 0.95, isEvening);
    const cHi = shadeColor(tree.highlight, 1.0, isEvening);
    for (const [ox, oy, mr, col] of [
      [-0.45, 0.12, 0.72, cMain],
      [0.45, 0.14, 0.7, cMain],
      [0, -0.18, 0.84, cMain],
      [-0.24, -0.32, 0.5, cHi],
      [0.28, -0.1, 0.42, cHi]
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

  drawPerson3D(ctx, cam, person, isEvening) {
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

  drawStreetViewHud(ctx, cam, state) {
    ctx.save();

    // Top-left Google Street View style address & compass bar (auto-sized so text never overflows!)
    const streetName = findNearestStreetName(state.player.x, state.player.y);
    const deg = (((cam.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const compassLabel = dirs[Math.round(deg / 45) % 8];
    const line1 = `STREET VIEW 3D  |  ${state.currentNeighborhoodName.toUpperCase()}  |  FACING ${compassLabel}`;
    const line2 = `${streetName}  |  Drag 360 deg  |  [V] Map`;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    const w1 = ctx.measureText(line1).width;
    ctx.font = '600 10px "Segoe UI", sans-serif';
    const w2 = ctx.measureText(line2).width;
    const boxW = Math.max(310, Math.min(540, Math.max(w1, w2) + 28));

    drawRoundedRect(ctx, 14, 14, boxW, 52, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.68)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillText(line1, 26, 33);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 10px "Segoe UI", sans-serif';
    ctx.fillText(line2, 26, 52);

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
