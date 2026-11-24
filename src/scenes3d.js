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
} from './data.js';
import { getDayPhase, INTERIOR_STATIONS } from './engine.js';

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

export class LisboaScenes3DRenderer {
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.focal = (viewWidth * 0.5) / Math.tan((FOV_DEG * Math.PI) / 360);
    this.hoverWorld = null;
    this.lastHitTargets = [];
  }

  buildCamera(state, opts = {}) {
    const player = state.player;
    const yaw = Number.isFinite(opts.yaw) ? opts.yaw : (Number.isFinite(state.cameraYaw) ? state.cameraYaw : -Math.PI * 0.5);
    const pitch = clamp(Number.isFinite(opts.pitch) ? opts.pitch : (Number.isFinite(state.cameraPitch) ? state.cameraPitch : 0.03), -0.26, 0.34);
    const bob = player.isMoving && !opts.noBob ? Math.sin(player.walkPhase * 2) * 1.1 : 0;
    const camX = Number.isFinite(opts.x) ? opts.x : player.x;
    const camY = Number.isFinite(opts.y) ? opts.y : player.y;
    const camZ = (Number.isFinite(opts.z) ? opts.z : EYE_HEIGHT) + bob;
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

  drawPoly3D(ctx, cam, worldPts, fillStyle, strokeStyle = null, lineWidth = 1) {
    const camPts = worldPts.map((p) => this.toCam(cam, p[0], p[1], p[2]));
    const clipped = clipPolyNearZ(camPts);
    if (clipped.length < 3) return null;
    const screenPts = clipped.map((p) => this.projectCamPt(cam, p));
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

  drawBox3D(ctx, cam, x0, y0, x1, y1, z0, z1, colors, hitMeta = null) {
    const faces = [];
    if (cam.camY > y1) faces.push({ pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c: colors.front || colors.side, shade: 1.0 });
    if (cam.camY < y0) faces.push({ pts: [[x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1]], c: colors.back || colors.side, shade: 0.86 });
    if (cam.camX < x0) faces.push({ pts: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], c: colors.side, shade: 0.92 });
    if (cam.camX > x1) faces.push({ pts: [[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]], c: colors.side, shade: 0.8 });
    for (const f of faces) {
      const poly = this.drawPoly3D(ctx, cam, f.pts, shadeColor(f.c, f.shade), colors.stroke || null, colors.lineWidth || 1);
      if (poly && hitMeta) this.lastHitTargets.push({ ...hitMeta, poly });
    }
    if (cam.camZ > z1) {
      const topPoly = this.drawPoly3D(ctx, cam, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], colors.top || colors.side, colors.stroke || null, colors.lineWidth || 1);
      if (topPoly && hitMeta) this.lastHitTargets.push({ ...hitMeta, poly: topPoly });
    }
  }

  screenToFloor(canvasX, canvasY, state) {
    const cam = this.buildCamera(state);
    const dy = canvasY - cam.horizonY;
    if (dy <= 6) return null;
    const cz = (cam.camZ * this.focal) / dy;
    if (cz < 8 || cz > 680) return null;
    const cx = ((canvasX - this.viewWidth * 0.5) * cz) / this.focal;
    const wx = cam.camX + cam.fx * cz + cam.rx * cx;
    const wy = cam.camY + cam.fy * cz + cam.ry * cx;
    if (state.mode === 'interior') {
      return { x: clamp(wx, 76, INTERIOR_WIDTH - 76), y: clamp(wy, 194, INTERIOR_HEIGHT - 32), cz };
    }
    if (state.mode === 'metro') {
      return { x: clamp(wx, 74, INTERIOR_WIDTH - 74), y: clamp(wy, 166, 276), cz };
    }
    if (state.mode === 'ferry' || state.mode === 'city-district') {
      return { x: clamp(wx, 74, INTERIOR_WIDTH - 74), y: clamp(wy, 166, 272), cz };
    }
    return { x: wx, y: wy, cz };
  }

  setHoverPoint(canvasX, canvasY, state) {
    if (canvasX == null || canvasY == null) {
      this.hoverWorld = null;
      return;
    }
    this.hoverWorld = this.screenToFloor(canvasX, canvasY, state);
  }

  pickTarget(canvasX, canvasY) {
    for (let i = this.lastHitTargets.length - 1; i >= 0; i -= 1) {
      const t = this.lastHitTargets[i];
      if (t.poly && pointInPolygon2D(canvasX, canvasY, t.poly)) {
        return t;
      }
    }
    return null;
  }

  drawPersonSprite3D(ctx, cam, opts) {
    const baseZ = opts.z || 0;
    const personHeight = opts.behindCounter ? 44 : 38;
    const foot = this.projectWorldPt(cam, opts.x, opts.y, baseZ);
    const head = this.projectWorldPt(cam, opts.x, opts.y, baseZ + personHeight);
    if (!foot || !head) return;
    const h = Math.max(10, foot.y - head.y);
    const w = h * 0.42;
    const outfit = opts.outfitId ? getOutfitById(opts.outfitId) : null;
    const primary = opts.primaryColor || outfit?.primaryColor || '#264f73';
    const secondary = opts.secondaryColor || outfit?.secondaryColor || '#f8fafc';
    const pants = opts.pantsColor || outfit?.pantsColor || '#334155';
    const skin = opts.skinColor || outfit?.skinColor || '#f1c7a6';
    const hair = opts.hairColor || outfit?.hairColor || '#3b2b20';
    const stride = opts.isMoving ? Math.sin(opts.walkPhase || 0) * h * 0.07 : 0;

    if (!opts.behindCounter) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      ctx.beginPath();
      ctx.ellipse(foot.x, foot.y, w * 0.6, w * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pants;
      ctx.fillRect(foot.x - w * 0.34, foot.y - h * 0.36 + stride * 0.5, w * 0.26, h * 0.36 - stride * 0.5);
      ctx.fillRect(foot.x + w * 0.08, foot.y - h * 0.36 - stride * 0.5, w * 0.26, h * 0.36 + stride * 0.5);
    }

    const bodyTop = head.y + h * 0.27;
    const bodyH = h * 0.42;
    ctx.fillStyle = primary;
    if (outfit && (outfit.styleType === 'dress' || outfit.styleType === 'poncho')) {
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

    // Uniform apron or outfit trim
    ctx.fillStyle = secondary;
    if (opts.apron) {
      ctx.fillRect(foot.x - w * 0.32, bodyTop + bodyH * 0.12, w * 0.64, bodyH * 0.82);
    } else {
      ctx.fillRect(foot.x - w * 0.34, bodyTop + bodyH * 0.22, w * 0.68, Math.max(2, bodyH * 0.18));
    }

    const headR = h * 0.14;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(foot.x, head.y + headR, headR, 0, Math.PI * 2);
    ctx.fill();

    if (headR >= 4.5) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(foot.x - headR * 0.34, head.y + headR * 1.05, Math.max(1.1, headR * 0.14), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(foot.x + headR * 0.34, head.y + headR * 1.05, Math.max(1.1, headR * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(foot.x, head.y + headR * 0.82, headR * 1.04, Math.PI, Math.PI * 2);
    ctx.fill();

    if (opts.chefHat) {
      ctx.fillStyle = '#ffffff';
      drawRoundedRect(ctx, foot.x - headR * 0.9, head.y - headR * 0.72, headR * 1.8, headR * 1.05, Math.max(2, headR * 0.4));
      ctx.fill();
    } else if (outfit?.hatType === 'sunhat' || outfit?.hatType === 'fedora') {
      ctx.fillStyle = outfit.hatType === 'sunhat' ? '#e5c17b' : '#4b3b2f';
      ctx.fillRect(foot.x - headR * 1.45, head.y + headR * 0.25, headR * 2.9, Math.max(2, headR * 0.35));
    }

    // Raised celebratory drink glass / tumbler when mingling inside Bar da Noite!
    if (opts.holdingDrink && h > 16) {
      const lift = opts.partyBob ? Math.sin((opts.animTime || 0) * 3.8 + (opts.phaseOffset || 0)) * h * 0.045 : 0;
      const gx = foot.x + w * 0.56;
      const gy = head.y + h * 0.42 - lift;
      ctx.strokeStyle = skin;
      ctx.lineWidth = Math.max(1.6, w * 0.14);
      ctx.beginPath();
      ctx.moveTo(foot.x + w * 0.32, head.y + h * 0.48);
      ctx.lineTo(gx, gy + h * 0.03);
      ctx.stroke();
      const gw = Math.max(3, w * 0.22);
      const gh = Math.max(4.5, h * 0.11);
      ctx.fillStyle = opts.holdingDrink;
      ctx.fillRect(gx - gw * 0.5, gy - gh, gw, gh);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(gx - gw * 0.5, gy - gh, gw, gh);
      if (opts.drinkType === 'imperial') {
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(gx - gw * 0.5, gy - gh - Math.max(1.5, gh * 0.22), gw, Math.max(1.5, gh * 0.22));
      }
    }

    if (opts.label && h > 16) {
      const fs = clamp(Math.round(h * 0.14), 9, 12);
      ctx.save();
      ctx.font = `700 ${fs}px "Segoe UI", sans-serif`;
      const tw = ctx.measureText(opts.label).width + 12;
      const ly = head.y - (opts.chefHat ? headR * 0.85 : 2) - fs - 8;
      drawRoundedRect(ctx, foot.x - tw * 0.5, ly, tw, fs + 6, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(opts.label, foot.x, ly + fs + 1.5);
      if (opts.emoteText) {
        const ew = ctx.measureText(opts.emoteText).width + 14;
        drawRoundedRect(ctx, foot.x - ew * 0.5, ly - fs - 12, ew, fs + 7, 5);
        ctx.fillStyle = '#fef3c7';
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.stroke();
        ctx.fillStyle = '#78350f';
        ctx.fillText(opts.emoteText, foot.x, ly - 10);
      }
      ctx.restore();
    }
  }

  drawSceneHud(ctx, cam, title, subtitle, miniMapOpts) {
    ctx.save();
    const deg = (((cam.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const compass = dirs[Math.round(deg / 45) % 8];
    const line1 = `${title.toUpperCase()}  |  FACING ${compass}`;
    const line2 = `${subtitle}  |  Drag 360 deg  |  [V] 2D Plan`;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    const w1 = ctx.measureText(line1).width;
    ctx.font = '600 10px "Segoe UI", sans-serif';
    const w2 = ctx.measureText(line2).width;
    const boxW = Math.max(300, Math.min(580, Math.max(w1, w2) + 28));

    drawRoundedRect(ctx, 14, 14, boxW, 50, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillText(line1, 26, 33, boxW - 24);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 10px "Segoe UI", sans-serif';
    ctx.fillText(line2, 26, 51, boxW - 24);

    // Top-Right Mini-Map Radar for Room / Station / Pier
    if (miniMapOpts) {
      const mw = 136;
      const mh = 86;
      const mx = this.viewWidth - mw - 14;
      const my = 14;
      drawRoundedRect(ctx, mx, my, mw, mh, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const sx = (wx) => mx + 8 + (wx / INTERIOR_WIDTH) * (mw - 16);
      const sy = (wy) => my + 8 + (wy / INTERIOR_HEIGHT) * (mh - 16);

      if (miniMapOpts.floorRect) {
        const r = miniMapOpts.floorRect;
        ctx.fillStyle = miniMapOpts.floorColor || 'rgba(226, 218, 202, 0.25)';
        ctx.fillRect(sx(r.x), sy(r.y), ((r.w) / INTERIOR_WIDTH) * (mw - 16), ((r.h) / INTERIOR_HEIGHT) * (mh - 16));
      }
      for (const poi of miniMapOpts.pois || []) {
        ctx.fillStyle = poi.color || '#facc15';
        ctx.beginPath();
        ctx.arc(sx(poi.x), sy(poi.y), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const peer of miniMapOpts.peers || []) {
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.arc(sx(peer.x), sy(peer.y), 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      const px = sx(miniMapOpts.px);
      const py = sy(miniMapOpts.py);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
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
    }
    ctx.restore();
  }

  // =========================================================================
  // 1. FULL 3D INTERIOR ROOMS FOR ALL 15 LISBOA SHOPS, CAFES, BAKERIES, RESTAURANTS & SE CATHEDRAL
  // =========================================================================
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

  drawMetroMuralPanel3D(ctx, cam, muralStyle, panX0, panX1, wallY, z0, z1, reverseX = false) {
    const polyPts = reverseX
      ? [[panX1, wallY, z0], [panX0, wallY, z0], [panX0, wallY, z1], [panX1, wallY, z1]]
      : [[panX0, wallY, z0], [panX1, wallY, z0], [panX1, wallY, z1], [panX0, wallY, z1]];
    const detailY = reverseX ? wallY - 0.3 : wallY + 0.2;

    if (muralStyle === 'siza-limestone-gold') {
      // Baixa-Chiado (Alvaro Siza Vieira Lioz limestone ashlar grid + Angelo de Sousa gleaming gold geometric tile intervention)
      this.drawPoly3D(ctx, cam, polyPts, '#ece6db', '#475569', 1.4);
      for (let gx = panX0 + 24; gx < panX1 - 24; gx += 46) {
        const gPts = reverseX
          ? [[gx + 24, detailY, z0 + 6], [gx, detailY, z0 + 6], [gx, detailY, z1 - 6], [gx + 24, detailY, z1 - 6]]
          : [[gx, detailY, z0 + 6], [gx + 24, detailY, z0 + 6], [gx + 24, detailY, z1 - 6], [gx, detailY, z1 - 6]];
        this.drawPoly3D(ctx, cam, gPts, '#eab308', '#fef08a', 1);
      }
    } else if (muralStyle === 'transparencia-blue-glass') {
      // Terreiro do Paco (Joao Rodrigues Vieira "Transparencia II" layered cobalt, cyan & white glazed geometric light panels)
      this.drawPoly3D(ctx, cam, polyPts, '#0c4a6e', '#38bdf8', 1.5);
      const glassCols = ['#0284c7', '#38bdf8', '#e0f2fe', '#1d4ed8'];
      for (let i = 0; i < 5; i += 1) {
        const gx = panX0 + 12 + i * 42;
        if (gx + 34 > panX1) break;
        const gPts = reverseX
          ? [[gx + 34, detailY, z0 + 4], [gx, detailY, z0 + 4], [gx + 6, detailY, z1 - 4], [gx + 28, detailY, z1 - 4]]
          : [[gx, detailY, z0 + 4], [gx + 34, detailY, z0 + 4], [gx + 26, detailY, z1 - 4], [gx + 6, detailY, z1 - 4]];
        this.drawPoly3D(ctx, cam, gPts, glassCols[i % glassCols.length]);
      }
    } else if (muralStyle === 'dacosta-wonderland-tiles') {
      // Cais do Sodre (Antonio Dacosta giant cobalt-blue Alice-in-Wonderland running rabbit panels on cream azulejos)
      this.drawPoly3D(ctx, cam, polyPts, '#f8fafc', '#16a34a', 1.5);
      for (let i = 0; i < 3; i += 1) {
        const rx = panX0 + 44 + i * 74;
        if (rx > panX1 - 24) break;
        const pPt = this.projectWorldPt(cam, rx, detailY, (z0 + z1) * 0.5);
        if (pPt) {
          const r = clamp((13 * this.focal) / pPt.cz, 5, 22);
          ctx.save();
          ctx.fillStyle = '#1d4ed8';
          ctx.beginPath();
          ctx.ellipse(pPt.x, pPt.y + r * 0.2, r * 0.85, r * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(pPt.x - r * 0.3, pPt.y - r * 0.85, r * 0.2, r * 0.55, -0.2, 0, Math.PI * 2);
          ctx.ellipse(pPt.x + r * 0.25, pPt.y - r * 0.85, r * 0.2, r * 0.55, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(pPt.x + r * 0.5, pPt.y + r * 0.1, r * 0.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (muralStyle === 'keil-geometric-patterns') {
      // Rossio & Marques de Pombal (Maria Keil mid-century emerald, gold, and cobalt triangular & diamond azulejos)
      this.drawPoly3D(ctx, cam, polyPts, '#ecfdf5', '#15803d', 1.5);
      const cols = ['#16a34a', '#eab308', '#2563eb', '#0f766e'];
      for (let i = 0; i < 6; i += 1) {
        const gx = panX0 + 14 + i * 38;
        if (gx + 30 > panX1) break;
        const midX = gx + 15;
        const midZ = (z0 + z1) * 0.5;
        this.drawPoly3D(
          ctx,
          cam,
          [[midX, detailY, z1 - 5], [gx + 30, detailY, midZ], [midX, detailY, z0 + 5], [gx, detailY, midZ]],
          cols[i % cols.length]
        );
      }
    } else if (muralStyle === 'cargaleiro-polychrome') {
      // Rato (Manuel Cargaleiro vibrant polychrome diagonal mosaic stripes & Vieira da Silva grid)
      this.drawPoly3D(ctx, cam, polyPts, '#fffbeb', '#b45309', 1.5);
      const cols = ['#dc2626', '#2563eb', '#eab308', '#16a34a', '#9333ea'];
      for (let i = 0; i < 6; i += 1) {
        const gx = panX0 + 10 + i * 38;
        if (gx + 32 > panX1) break;
        const gPts = reverseX
          ? [[gx + 30, detailY, z0 + 4], [gx + 8, detailY, z0 + 4], [gx, detailY, z1 - 4], [gx + 22, detailY, z1 - 4]]
          : [[gx, detailY, z0 + 4], [gx + 22, detailY, z0 + 4], [gx + 30, detailY, z1 - 4], [gx + 8, detailY, z1 - 4]];
        this.drawPoly3D(ctx, cam, gPts, cols[i % cols.length]);
      }
    } else if (muralStyle === 'almada-marble-reliefs') {
      // Saldanha (Jorge Vieira & Almada Negreiros sculpted pink/cream Estremoz marble reliefs & terracotta medallions)
      this.drawPoly3D(ctx, cam, polyPts, '#f5ebe0', '#b91c1c', 1.5);
      for (let i = 0; i < 4; i += 1) {
        const rx = panX0 + 34 + i * 54;
        if (rx > panX1 - 20) break;
        const pPt = this.projectWorldPt(cam, rx, detailY, (z0 + z1) * 0.5);
        if (pPt) {
          const r = clamp((13 * this.focal) / pPt.cz, 5, 22);
          ctx.save();
          ctx.strokeStyle = i % 2 === 0 ? '#b91c1c' : '#ca8a04';
          ctx.lineWidth = 2.2;
          ctx.strokeRect(pPt.x - r, pPt.y - r * 0.8, r * 2, r * 1.6);
          ctx.beginPath();
          ctx.arc(pPt.x, pPt.y, r * 0.55, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (muralStyle === 'pomar-zoo-fauna') {
      // Sao Sebastiao / Jardim Zoologico (Julio Pomar lively painted tigers, toucans & fauna frescoes on glazed tiles)
      this.drawPoly3D(ctx, cam, polyPts, '#fef9c3', '#1d4ed8', 1.5);
      const faunaCols = ['#ea580c', '#16a34a', '#2563eb', '#dc2626'];
      for (let i = 0; i < 4; i += 1) {
        const rx = panX0 + 34 + i * 54;
        if (rx > panX1 - 20) break;
        const pPt = this.projectWorldPt(cam, rx, detailY, (z0 + z1) * 0.5);
        if (pPt) {
          const r = clamp((13 * this.focal) / pPt.cz, 5, 22);
          ctx.save();
          ctx.fillStyle = faunaCols[i % faunaCols.length];
          ctx.beginPath();
          ctx.arc(pPt.x, pPt.y, r * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(pPt.x - r * 0.5, pPt.y - r * 0.3);
          ctx.lineTo(pPt.x + r * 0.5, pPt.y + r * 0.3);
          ctx.moveTo(pPt.x - r * 0.5, pPt.y + r * 0.3);
          ctx.lineTo(pPt.x + r * 0.5, pPt.y - r * 0.3);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (muralStyle === 'nery-convite-sentinels') {
      // Campo Grande (Eduardo Nery 18th-century blue-and-white baroque Figura de Convite sentinel cutouts)
      this.drawPoly3D(ctx, cam, polyPts, '#eff6ff', '#1e40af', 1.5);
      for (let i = 0; i < 4; i += 1) {
        const gx = panX0 + 26 + i * 54;
        if (gx + 24 > panX1) break;
        const gPts = reverseX
          ? [[gx + 22, detailY, z0 + 4], [gx, detailY, z0 + 4], [gx + 4, detailY, z1 - 4], [gx + 18, detailY, z1 - 4]]
          : [[gx, detailY, z0 + 4], [gx + 22, detailY, z0 + 4], [gx + 18, detailY, z1 - 4], [gx + 4, detailY, z1 - 4]];
        this.drawPoly3D(ctx, cam, gPts, '#1d4ed8', '#93c5fd', 1.2);
      }
    } else if (muralStyle === 'taveira-polychrome-arches') {
      // Alameda & Olaias (Costa Pinheiro & Tomas Taveira polychrome cathedral arches & navigator caravels)
      this.drawPoly3D(ctx, cam, polyPts, '#fef2f2', '#dc2626', 1.5);
      const archCols = ['#dc2626', '#eab308', '#0284c7', '#16a34a'];
      for (let i = 0; i < 5; i += 1) {
        const gx = panX0 + 14 + i * 44;
        if (gx + 32 > panX1) break;
        const gPts = reverseX
          ? [[gx + 32, detailY, z0 + 4], [gx, detailY, z0 + 4], [gx + 16, detailY, z1 - 4]]
          : [[gx, detailY, z0 + 4], [gx + 32, detailY, z0 + 4], [gx + 16, detailY, z1 - 4]];
        this.drawPoly3D(ctx, cam, gPts, archCols[i % archCols.length]);
      }
    } else if (muralStyle === 'calatrava-oceans-mural') {
      // Oriente (Santiago Calatrava white steel arches + Hundertwasser/Kusama/Zao Wou-Ki five-continent ocean waves)
      this.drawPoly3D(ctx, cam, polyPts, '#e0f2fe', '#0284c7', 1.5);
      const waveCols = ['#0369a1', '#0ea5e9', '#dc2626', '#eab308'];
      for (let i = 0; i < 5; i += 1) {
        const rx = panX0 + 28 + i * 46;
        if (rx > panX1 - 18) break;
        const pPt = this.projectWorldPt(cam, rx, detailY, (z0 + z1) * 0.5);
        if (pPt) {
          const r = clamp((12 * this.focal) / pPt.cz, 5, 20);
          ctx.save();
          ctx.fillStyle = waveCols[i % waveCols.length];
          ctx.beginPath();
          ctx.arc(pPt.x, pPt.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pPt.x, pPt.y, r * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else {
      // Santa Apolonia (Jose Santa Barbara "Homenagem aos Ferroviarios" Viuva Lamego railway wheel & signal relief azulejos)
      this.drawPoly3D(ctx, cam, polyPts, '#fef3c7', '#1d4ed8', 1.5);
      for (let i = 0; i < 4; i += 1) {
        const wx = panX0 + 34 + i * 52;
        if (wx > panX1 - 18) break;
        const wPt = this.projectWorldPt(cam, wx, detailY, (z0 + z1) * 0.5);
        if (wPt) {
          const wr = clamp((12 * this.focal) / wPt.cz, 4, 20);
          ctx.save();
          ctx.strokeStyle = i % 2 === 0 ? '#1d4ed8' : '#b45309';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(wPt.x, wPt.y, wr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(wPt.x, wPt.y, wr * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  // =========================================================================
  // 2. FULL 3D UNDERGROUND METROPOLITANO DE LISBOA (ESCALATOR, PLATFORM & TUNNEL RIDE)
  // =========================================================================
  renderMetro3D(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const m = state.metro;
    const station =
      ALL_METRO_STATIONS.find((s) => s.id === (m.stationId || state.activeMetroStationId)) ||
      METRO_STATIONS[0];
    const theme = station.undergroundTheme;
    const stationLineIds = getStationLineIds(station);
    const activeLineId =
      m.activeLineId && stationLineIds.includes(m.activeLineId)
        ? m.activeLineId
        : stationLineIds[0];
    const activeLine = getMetroLineById(activeLineId);
    const otherLineIds = stationLineIds.filter((id) => id !== activeLineId);
    const otherLine = otherLineIds.length > 0 ? getMetroLineById(otherLineIds[0]) : null;
    const primaryLineColor = activeLine?.color || (station.lineColors && station.lineColors[0]) || '#2563eb';
    const secondaryLineColor = otherLine?.color || null;

    // A) 3D Escalator Shaft Descent / Ascent
    if (m.phase === 'descending' || m.phase === 'ascending') {
      const goingDown = m.phase === 'descending';
      const w = this.viewWidth;
      const h = this.viewHeight;
      const vpX = w * 0.5;
      const vpY = goingDown ? h * 0.58 : h * 0.34;

      // Vaulted azulejo tunnel walls converging to vanishing point
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, goingDown ? '#1e3a5f' : '#3b82c4');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Left & Right tiled escalator shaft walls
      ctx.fillStyle = theme.wallPrimary;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vpX - 110, vpY - 70);
      ctx.lineTo(vpX - 110, vpY + 60);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = shadeColor(theme.wallPrimary, 0.88);
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(vpX + 110, vpY - 70);
      ctx.lineTo(vpX + 110, vpY + 60);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Ceiling light strips & central portal opening (underground vault OR sunlit Lisboa sky)
      ctx.fillStyle = goingDown ? '#1e293b' : '#93c5fd';
      ctx.fillRect(vpX - 110, vpY - 70, 220, 130);

      // Animated moving metallic escalator stair treads in perspective
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(vpX - 110, vpY + 55);
      ctx.lineTo(vpX + 110, vpY + 55);
      ctx.lineTo(w * 0.84, h);
      ctx.lineTo(w * 0.16, h);
      ctx.closePath();
      ctx.fill();

      const stepShift = (animTime * (goingDown ? 3.5 : -3.5)) % 1;
      for (let i = 0; i < 12; i += 1) {
        const t = ((i + stepShift + 12) % 12) / 12;
        const depth = t * t;
        const sy = vpY + 56 + depth * (h - vpY - 56);
        const halfW = 110 + depth * (w * 0.34 - 110);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.4 + depth * 2;
        ctx.beginPath();
        ctx.moveTo(vpX - halfW, sy);
        ctx.lineTo(vpX + halfW, sy);
        ctx.stroke();
      }

      // Black rubber handrails
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(vpX - 106, vpY + 26);
      ctx.lineTo(w * 0.14, h - 18);
      ctx.moveTo(vpX + 106, vpY + 26);
      ctx.lineTo(w * 0.86, h - 18);
      ctx.stroke();

      // Overhead station badge
      drawRoundedRect(ctx, vpX - 240, 20, 480, 44, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = primaryLineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${station.name.toUpperCase()}  -  ${goingDown ? `DESCENDING TO ${(activeLine?.name || 'PLATFORM').toUpperCase()}` : 'ASCENDING TO STREET'}`,
        vpX,
        46,
        460
      );
      ctx.textAlign = 'left';
      return;
    }

    // A2) 3D Underground Correspondencia Pedestrian Transfer Corridor (between 2 Metro lines at official transfer hub!)
    if (m.phase === 'transferring') {
      const w = this.viewWidth;
      const h = this.viewHeight;
      const vpX = w * 0.5;
      const vpY = h * 0.46;
      const targetLine = getMetroLineById(m.transferToLineId) || otherLine || activeLine;
      const targetColor = targetLine?.color || '#eab308';
      const targetName = targetLine?.name || 'Connecting Line';

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Perspective tiled ceiling & corridor stone floor
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(vpX + 120, vpY - 82);
      ctx.lineTo(vpX - 120, vpY - 82);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = theme.platformFloor || '#d4cec2';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(vpX - 120, vpY + 84);
      ctx.lineTo(vpX + 120, vpY + 84);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Left & Right Lisbon Azulejo transfer walls with glowing target-line wayfinding stripe
      ctx.fillStyle = theme.wallPrimary || '#e5dfd3';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vpX - 120, vpY - 82);
      ctx.lineTo(vpX - 120, vpY + 84);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = shadeColor(theme.wallPrimary || '#e5dfd3', 0.9);
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(vpX + 120, vpY - 82);
      ctx.lineTo(vpX + 120, vpY + 84);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Illuminated target-line wayfinding bands guiding traveler down the corridor
      ctx.fillStyle = targetColor;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.44);
      ctx.lineTo(vpX - 120, vpY - 4);
      ctx.lineTo(vpX - 120, vpY + 12);
      ctx.lineTo(0, h * 0.52);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w, h * 0.44);
      ctx.lineTo(vpX + 120, vpY - 4);
      ctx.lineTo(vpX + 120, vpY + 12);
      ctx.lineTo(w, h * 0.52);
      ctx.closePath();
      ctx.fill();

      // Far connecting platform portal glowing in destination line color
      ctx.fillStyle = '#0b1322';
      ctx.fillRect(vpX - 120, vpY - 82, 240, 166);
      ctx.strokeStyle = targetColor;
      ctx.lineWidth = 6;
      ctx.strokeRect(vpX - 120, vpY - 82, 240, 166);

      // Animated walking floor tile seams & directional chevrons
      const walkShift = (animTime * 3.8) % 1;
      for (let i = 0; i < 8; i += 1) {
        const t = ((i + walkShift) % 8) / 8;
        const depth = t * t;
        const fy = vpY + 86 + depth * (h - vpY - 86);
        const halfW = 120 + depth * (w * 0.5 - 120);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.25)';
        ctx.lineWidth = 1.2 + depth * 1.8;
        ctx.beginPath();
        ctx.moveTo(vpX - halfW, fy);
        ctx.lineTo(vpX + halfW, fy);
        ctx.stroke();

        // Forward transfer chevron in target line color
        const chevW = 24 + depth * 64;
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = 2.2 + depth * 2.4;
        ctx.beginPath();
        ctx.moveTo(vpX - chevW, fy + 10);
        ctx.lineTo(vpX, fy - 4);
        ctx.lineTo(vpX + chevW, fy + 10);
        ctx.stroke();
      }

      // Far archway sign inside tunnel
      drawRoundedRect(ctx, vpX - 102, vpY - 58, 204, 34, 6);
      ctx.fillStyle = targetColor;
      ctx.fill();
      ctx.fillStyle = targetLine?.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
      ctx.font = '800 11.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`CAIS ${targetName.toUpperCase()}`, vpX, vpY - 37, 192);

      // Top Correspondencia HUD Banner
      drawRoundedRect(ctx, vpX - 270, 16, 540, 56, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.strokeStyle = targetColor;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px Georgia, serif';
      ctx.fillText(
        `CORRESPONDENCIA AT ${station.name.replace('Metro ', '').toUpperCase()}`,
        vpX,
        38,
        520
      );
      ctx.fillStyle = '#fde68a';
      ctx.font = '700 10.5px "Segoe UI", sans-serif';
      ctx.fillText(
        `WALKING TO ${targetName.toUpperCase()} PLATFORM (${(targetLine?.termini || []).join(' <-> ').toUpperCase()})  |  FREE TRANSFER`,
        vpX,
        58,
        520
      );
      ctx.textAlign = 'left';
      return;
    }

    // B) 3D Inside-the-Metro-Train Tunnel Ride
    if (m.phase === 'riding') {
      const w = this.viewWidth;
      const h = this.viewHeight;
      const vpX = w * 0.5;
      const vpY = h * 0.44;
      const dest = ALL_METRO_STATIONS.find((s) => s.id === m.toStationId);
      const route = m.route;
      const activeLineColor = activeLine?.color || route?.primaryColor || primaryLineColor;
      const activeLineLabel =
        activeLine?.name?.toUpperCase() ||
        route?.linesUsed?.map((l) => l.name.toUpperCase()).join(' -> ') ||
        (station.lines || ['LINHA AZUL']).join(' / ').toUpperCase();

      // Deep dark subterranean tunnel rushing toward viewer
      ctx.fillStyle = '#08101c';
      ctx.fillRect(0, 0, w, h);

      // Animated 3D tunnel rings streaking forward!
      const ringShift = (animTime * 4.8) % 1;
      const [lr, lg, lb] = parseHexRgb(activeLineColor);
      for (let i = 0; i < 10; i += 1) {
        const t = ((i + ringShift) % 10) / 10;
        const scale = 0.08 + t * t * 1.15;
        const rx = 280 * scale;
        const ry = 190 * scale;
        ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${0.18 + t * 0.38})`;
        ctx.lineWidth = 1.5 + t * 3;
        ctx.beginPath();
        ctx.ellipse(vpX, vpY, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Steel subterranean rails converging to tunnel vanishing point
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(vpX - 24, vpY + 24);
      ctx.lineTo(vpX - 180, h);
      ctx.moveTo(vpX + 24, vpY + 24);
      ctx.lineTo(vpX + 180, h);
      ctx.stroke();

      // Panoramic Lisbon Metro Car Front Frame & Illuminated Interior Cabin Sides
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, 78);
      ctx.fillRect(0, 0, 128, h);
      ctx.fillRect(w - 128, 0, 128, h);
      ctx.fillRect(0, h - 108, w, 108);
      // Active Line Color & Crimson Metropolitano de Lisboa cabin trim
      ctx.fillStyle = activeLineColor;
      ctx.fillRect(128, 72, w - 256, 8);
      ctx.fillStyle = '#c81e32';
      ctx.fillRect(128, h - 114, w - 256, 8);
      // Overhead LED Next-Station display & Synchronized Door-Closing Chime Alert
      const chimeActive = Boolean(state.metroDoorChime);
      drawRoundedRect(ctx, 175, 10, 570, 58, 8);
      ctx.fillStyle = '#090d16';
      ctx.fill();
      ctx.strokeStyle = chimeActive ? '#f97316' : activeLineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = chimeActive ? '#fb923c' : '#38bdf8';
      ctx.font = '700 12.5px "Consolas", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        chimeActive
          ? `ATENCAO AS PORTAS  |  PROXIMA ESTACAO: ${(dest?.name || 'LISBOA').toUpperCase()}`
          : `${activeLineLabel}  |  PROXIMA ESTACAO: ${(dest?.name || 'LISBOA').toUpperCase()}`,
        w * 0.5,
        32,
        546
      );
      ctx.fillStyle = '#fde68a';
      ctx.font = '600 10.5px "Segoe UI", sans-serif';
      const routeDetail = chimeActive
        ? `${(state.metroDoorChime.triggeredBy || 'METRO').toUpperCase()} CHIME: "${state.metroDoorChime.text}"`
        : route?.transferStation
          ? `TRANSFER AT ${route.transferStation.toUpperCase()}  |  VIA: ${route.stationPath.join(' -> ')}`
          : route?.stationPath
            ? `STOPS: ${route.stationPath.join(' -> ')}`
            : 'METROPOLITANO DE LISBOA 4-LINE NETWORK';
      ctx.fillText(routeDetail, w * 0.5, 53, 546);
      const metroPeers = (state.remotePlayers || []).filter(
        (rp) => rp.mode === 'metro' && rp.metroPhase === 'riding'
      );
      if (metroPeers.length > 0) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 11px "Segoe UI", sans-serif';
        ctx.fillText(`RIDING TOGETHER WITH: ${metroPeers.map((p) => p.name).join(', ')}`, w * 0.5, h - 82);
      }
      ctx.textAlign = 'left';
      return;
    }

    // C) Full 3D Walkable Underground Metro Platform!
    const cam = this.buildCamera(state);
    const ceilZ = 148;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    // Vaulted station ceiling & fluorescent light panels
    this.drawPoly3D(ctx, cam, [[50, 140, ceilZ], [710, 140, ceilZ], [710, 420, ceilZ], [50, 420, ceilZ]], '#1e293b');
    for (const lx of [180, 380, 580]) {
      this.drawPoly3D(ctx, cam, [[lx - 55, 200, ceilZ - 2], [lx + 55, 200, ceilZ - 2], [lx + 55, 224, ceilZ - 2], [lx - 55, 224, ceilZ - 2]], '#e0f2fe');
    }

    // Underground tiled concourse floor + yellow safety curb + sunken track bed
    this.drawPoly3D(ctx, cam, [[50, 140, 0], [710, 140, 0], [710, 286, 0], [50, 286, 0]], theme.platformFloor);
    this.drawPoly3D(ctx, cam, [[50, 276, 0.3], [710, 276, 0.3], [710, 286, 0.3], [50, 286, 0.3]], '#facc15');
    this.drawPoly3D(ctx, cam, [[50, 286, -16], [710, 286, -16], [710, 420, -16], [50, 420, -16]], '#1e2430');
    this.drawLine3D(ctx, cam, [50, 322, -15], [710, 322, -15], '#94a3b8', 2.4);
    this.drawLine3D(ctx, cam, [50, 356, -15], [710, 356, -15], '#94a3b8', 2.4);

    // North Concourse Wall (with station-specific Lisboa Azulejo art mural & Escalator Exit to Street!)
    this.drawPoly3D(ctx, cam, [[50, 140, 0], [710, 140, 0], [710, 140, ceilZ], [50, 140, ceilZ]], theme.wallPrimary, theme.trim, 1.4);
    this.drawPoly3D(ctx, cam, [[50, 140, 0], [710, 140, 0], [710, 140, 44], [50, 140, 44]], theme.tileAccent);
    // Continuous active Metro line color wayfinding frieze along North Concourse Wall
    this.drawPoly3D(ctx, cam, [[50, 140.4, 44], [710, 140.4, 44], [710, 140.4, 54], [50, 140.4, 54]], primaryLineColor);
    if (secondaryLineColor) {
      this.drawPoly3D(ctx, cam, [[50, 140.5, 54], [710, 140.5, 54], [710, 140.5, 59], [50, 140.5, 59]], secondaryLineColor);
    }

    // Station-specific Portuguese Architectural & Azulejo Wall Art Panels (left & right of escalator alcove)
    for (const [panX0, panX1] of [[78, 304], [456, 682]]) {
      this.drawMetroMuralPanel3D(ctx, cam, theme.muralStyle, panX0, panX1, 140.6, 62, 118, false);
    }

    // Stainless-Steel Navegante / Viva Viagem Automatic Fare Gates flanking the escalator alcove
    for (const gx of [214, 250, 286, 474, 510, 546]) {
      this.drawBox3D(ctx, cam, gx - 5, 146, gx + 5, 164, 0, 24, {
        front: '#94a3b8',
        side: '#64748b',
        top: '#cbd5e1',
        stroke: '#1e293b',
        lineWidth: 1
      });
      // Blue Navegante card validator dome & green LED entry arrow
      const vPt = this.projectWorldPt(cam, gx, 164, 21);
      if (vPt) {
        const vr = clamp((3.2 * this.focal) / vPt.cz, 1.8, 6);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(vPt.x, vPt.y - vr * 1.4, vr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(vPt.x, vPt.y + vr * 0.6, vr * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ascending Escalator Alcove (clickable to return to street or city district plaza!)
    const escPoly = this.drawPoly3D(ctx, cam, [[328, 141, 0], [432, 141, 0], [432, 141, 86], [328, 141, 86]], '#1e3a5f', '#fde047', 2);
    if (escPoly) this.lastHitTargets.push({ kind: 'metro-exit', poly: escPoly });
    const escPt = this.projectWorldPt(cam, 380, 142, 92);
    if (escPt) {
      ctx.save();
      ctx.font = '700 10.5px "Segoe UI", sans-serif';
      drawRoundedRect(ctx, escPt.x - 74, escPt.y - 10, 148, 20, 4);
      ctx.fillStyle = '#0f5c52';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(station.districtId ? 'EXIT TO DISTRICT PLAZA' : 'ESCALATOR TO STREET', escPt.x, escPt.y + 4);
      ctx.restore();
    }

    // South Far Tunnel Wall across the tracks (with station-specific Azulejo murals, red diamond Lisbon Metro M signs & line color frieze!)
    this.drawPoly3D(ctx, cam, [[710, 420, -16], [50, 420, -16], [50, 420, ceilZ], [710, 420, ceilZ]], shadeColor(theme.wallPrimary, 0.84));
    this.drawPoly3D(ctx, cam, [[710, 420, 32], [50, 420, 32], [50, 420, 56], [710, 420, 56]], primaryLineColor);
    if (secondaryLineColor) {
      this.drawPoly3D(ctx, cam, [[710, 419.6, 56], [50, 419.6, 56], [50, 419.6, 62], [710, 419.6, 62]], secondaryLineColor);
    }

    // Station-specific Portuguese Architectural & Azulejo Wall Art across the South Track Wall (visible above the train!)
    for (const [panX0, panX1] of [[70, 355], [405, 690]]) {
      this.drawMetroMuralPanel3D(ctx, cam, theme.muralStyle, panX0, panX1, 419.4, 64, 114, true);
    }

    for (const sx of [185, 380, 575]) {
      const metroSignPt = this.projectWorldPt(cam, sx, 418, 120);
      if (metroSignPt) {
        ctx.save();
        ctx.font = '700 10.5px Georgia, serif';
        const shortName = station.name.replace('Metro ', '').toUpperCase();
        const activeLineUpper = (activeLine?.name || station.lines[0] || 'LINHA AZUL').toUpperCase();
        const mTxt = sx === 380 ? `${shortName}  |  ${activeLineUpper} PLATFORM` : shortName;
        const mtw = ctx.measureText(mTxt).width + 38;
        drawRoundedRect(ctx, metroSignPt.x - mtw * 0.5, metroSignPt.y - 12, mtw, 24, 5);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = primaryLineColor;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // Authentic Red Diamond "M" Metropolitano de Lisboa logo on left of sign
        const dX = metroSignPt.x - mtw * 0.5 + 15;
        const dY = metroSignPt.y;
        ctx.fillStyle = '#c81e32';
        ctx.beginPath();
        ctx.moveTo(dX, dY - 8);
        ctx.lineTo(dX + 8, dY);
        ctx.lineTo(dX, dY + 8);
        ctx.lineTo(dX - 8, dY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 8px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('M', dX, dY + 3);
        ctx.font = '700 10.5px Georgia, serif';
        ctx.fillText(mTxt, metroSignPt.x + 10, metroSignPt.y + 4);
        ctx.restore();
      }
    }

    // West & East End Walls with Dark Subterranean Tunnel Portals
    this.drawPoly3D(ctx, cam, [[50, 420, -16], [50, 140, -16], [50, 140, ceilZ], [50, 420, ceilZ]], shadeColor(theme.wallPrimary, 0.75));
    this.drawPoly3D(ctx, cam, [[51, 390, -16], [51, 294, -16], [51, 294, 72], [51, 390, 72]], '#050912');
    this.drawPoly3D(ctx, cam, [[710, 140, -16], [710, 420, -16], [710, 420, ceilZ], [710, 140, ceilZ]], shadeColor(theme.wallPrimary, 0.75));
    this.drawPoly3D(ctx, cam, [[709, 294, -16], [709, 390, -16], [709, 390, 72], [709, 294, 72]], '#050912');

    // Official 2-Line Transfer Corridor Arch (Correspondencia) on East Platform Wall - ONLY at the 6 transfer hubs!
    if (otherLine) {
      const trMatPoly = this.drawPoly3D(
        ctx,
        cam,
        [[636, 182, 0.35], [706, 182, 0.35], [706, 232, 0.35], [636, 232, 0.35]],
        'rgba(15, 23, 42, 0.35)',
        otherLine.color,
        2.2
      );
      if (trMatPoly) this.lastHitTargets.push({ kind: 'metro-transfer', lineId: otherLine.id, poly: trMatPoly });

      const trArchPoly = this.drawPoly3D(
        ctx,
        cam,
        [[708.5, 174, 0], [708.5, 240, 0], [708.5, 240, 82], [708.5, 174, 82]],
        '#0c1628',
        otherLine.color,
        3
      );
      if (trArchPoly) this.lastHitTargets.push({ kind: 'metro-transfer', lineId: otherLine.id, poly: trArchPoly });

      // Illuminated target-line guiding stripe inside the transfer arch
      this.drawPoly3D(
        ctx,
        cam,
        [[708.2, 180, 38], [708.2, 234, 38], [708.2, 234, 48], [708.2, 180, 48]],
        otherLine.color
      );

      const trBadgePt = this.projectWorldPt(cam, 704, 207, 92);
      if (trBadgePt) {
        ctx.save();
        ctx.font = '800 10px "Segoe UI", sans-serif';
        const trTxt = `CORRESPONDENCIA -> ${otherLine.name.toUpperCase()} [E]`;
        const trW = ctx.measureText(trTxt).width + 18;
        drawRoundedRect(ctx, trBadgePt.x - trW * 0.5, trBadgePt.y - 11, trW, 22, 5);
        ctx.fillStyle = otherLine.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = otherLine.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(trTxt, trBadgePt.x, trBadgePt.y + 3.5);
        ctx.restore();
      }
    }

    // 3D Silver-and-Crimson Metropolitano de Lisboa ML99 Train parked cleanly at the platform!
    const tx = m.trainX || 380;
    this.drawBox3D(
      ctx,
      cam,
      tx - 175,
      302,
      tx + 175,
      376,
      -12,
      46,
      { front: '#cbd5e1', back: '#e2e8f0', side: '#94a3b8', top: '#64748b', stroke: '#1e293b', lineWidth: 1.4 },
      { kind: 'metro-board' }
    );
    // Active Line lower skirt, Crimson Lisbon Metro belt & illuminated open passenger doors along the train side facing platform (y = 302)
    const doorColor = state.metroDoorChime ? '#fb923c' : '#fef08a';
    this.drawPoly3D(ctx, cam, [[tx + 175, 301.6, -10], [tx - 175, 301.6, -10], [tx - 175, 301.6, 4], [tx + 175, 301.6, 4]], primaryLineColor);
    this.drawPoly3D(ctx, cam, [[tx + 175, 301.5, 4], [tx - 175, 301.5, 4], [tx - 175, 301.5, 16], [tx + 175, 301.5, 16]], '#c81e32');
    for (let dx = -140; dx <= 120; dx += 52) {
      this.drawPoly3D(ctx, cam, [[tx + dx + 34, 301, 18], [tx + dx, 301, 18], [tx + dx, 301, 38], [tx + dx + 34, 301, 38]], doorColor, '#1e293b', 1.2);
      // Yellow vertical passenger grab pole inside open doorway
      this.drawLine3D(ctx, cam, [tx + dx + 17, 301.2, 18], [tx + dx + 17, 301.2, 38], '#eab308', 2);
    }

    // Suspended Red-LED Next-Train Countdown Boards (strictly matching active platform line termini!)
    const ledTerminusA = (activeLine?.termini?.[1] || theme.nextTrainDest || 'SANTA APOLONIA').toUpperCase();
    const ledTerminusB = (activeLine?.termini?.[0] || theme.oppositeDest || 'REBOLEIRA').toUpperCase();
    for (const [bx, destLabel, mins] of [
      [300, ledTerminusA, '1 MIN'],
      [460, ledTerminusB, '4 MIN']
    ]) {
      this.drawLine3D(ctx, cam, [bx - 22, 296, ceilZ], [bx - 22, 296, 56], '#475569', 1.8);
      this.drawLine3D(ctx, cam, [bx + 22, 296, ceilZ], [bx + 22, 296, 56], '#475569', 1.8);
      const bPt = this.projectWorldPt(cam, bx, 296, 53);
      if (bPt && bPt.cz > 25) {
        ctx.save();
        const bw = clamp((86 * this.focal) / bPt.cz, 118, 196);
        const bh = clamp((18 * this.focal) / bPt.cz, 22, 32);
        drawRoundedRect(ctx, bPt.x - bw * 0.5, bPt.y - bh * 0.5, bw, bh, 4);
        ctx.fillStyle = '#090d16';
        ctx.fill();
        ctx.strokeStyle = primaryLineColor;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#fb923c';
        ctx.font = '700 10px "Consolas", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`DEST: ${destLabel}  ${mins}`, bPt.x, bPt.y + 3.5, bw - 10);
        ctx.restore();
      }
    }

    // Hover ring on platform
    if (this.hoverWorld) {
      const pts = [];
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        pts.push([this.hoverWorld.x + Math.cos(a) * 12, this.hoverWorld.y + Math.sin(a) * 12, 0.5]);
      }
      this.drawPoly3D(ctx, cam, pts, 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.85)', 2);
    }

    // Connected LAN peers on the same underground platform in 3D
    const peersHere = (state.remotePlayers || []).filter(
      (rp) => rp.mode === 'metro' && rp.metroStationId === m.stationId && rp.metroPhase === 'platform'
    );
    for (const rp of peersHere) {
      this.drawPersonSprite3D(ctx, cam, {
        x: rp.x,
        y: rp.y,
        outfitId: rp.outfitId,
        walkPhase: rp.walkPhase || 0,
        isMoving: Boolean(rp.isMoving),
        label: rp.name,
        emoteText: rp.emoteText || ''
      });
    }

    const platformPois = [
      { x: 380, y: 168, color: '#34d399' },
      { x: 380, y: 274, color: primaryLineColor }
    ];
    if (otherLine) {
      platformPois.push({ x: 658, y: 206, color: otherLine.color });
    }

    const activeLineDisplay = activeLine?.name || station.lines[0] || 'Metropolitano de Lisboa';
    this.drawSceneHud(
      ctx,
      cam,
      `3D METRO  -  ${station.name.replace('Metro ', '')} (${activeLineDisplay})`,
      state.metroDoorChime
        ? `${(state.metroDoorChime.triggeredBy || activeLineDisplay).toUpperCase()} CHIME: "${state.metroDoorChime.text}"`
        : otherLine
          ? `Platform: ${activeLineDisplay}  |  East Arch: Transfer to ${otherLine.name} [E]  |  ${m.ticketPaid ? 'Ticket Paid' : '1.80 EUR'}`
          : `${activeLineDisplay} Only  |  Click Train to Board Direct or Escalator to Exit`,
      {
        floorRect: { x: 50, y: 140, w: 660, h: 146 },
        floorColor: 'rgba(148, 163, 184, 0.3)',
        px: state.player.x,
        py: state.player.y,
        peers: peersHere,
        pois: platformPois
      }
    );
  }

  // =========================================================================
  // 3. FULL 3D FERRY PIER, TAGUS BOW-DECK CROSSING & EXPLORABLE SOUTH-BANK TOWNS
  // =========================================================================
  renderFerry3D(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const f = state.ferry;
    const phase = getDayPhase(state.minutesOfDay);
    const monthInfo = getMonthInfo(state.month);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const isHeavyRain = (monthInfo.rainIntensity || 0) >= 0.7;
    const isBrightSummer = (monthInfo.sunBrightness || 1) >= 1.15;

    // A) 3D Forward Bow-Deck View Sailing Across the Tagus River!
    if (f.phase === 'sailing') {
      const w = this.viewWidth;
      const h = this.viewHeight;
      const hy = h * 0.46;
      const progress = clamp(f.phaseProgress || 0, 0, 1);
      const toDest = FERRY_DESTINATIONS.find((d) => d.id === f.toPortId);
      const toLabel = f.toPortId === FERRY_TERMINAL.id ? 'Cais do Sodre (Lisboa)' : (toDest?.name || 'South Bank');

      // Sky gradient (responsive to selected Lisboa month weather)
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      if (isEvening) {
        sky.addColorStop(0, '#0a1630');
        sky.addColorStop(1, '#263d66');
      } else if (isHeavyRain) {
        sky.addColorStop(0, '#3e4f63');
        sky.addColorStop(0.58, '#6c7e92');
        sky.addColorStop(1, '#a5b3c2');
      } else if (isGolden) {
        sky.addColorStop(0, '#36588f');
        sky.addColorStop(0.55, '#db8556');
        sky.addColorStop(1, '#fde68a');
      } else if (isBrightSummer) {
        sky.addColorStop(0, '#0d56b5');
        sky.addColorStop(0.62, '#3ca3ec');
        sky.addColorStop(1, '#e0f6ff');
      } else {
        sky.addColorStop(0, '#2563eb');
        sky.addColorStop(0.65, '#7dd3fc');
        sky.addColorStop(1, '#e0f2fe');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, hy);

      // Approaching 3D Destination Skyline growing smoothly closer as progress -> 1!
      const s = 0.55 + progress * 0.95;
      const midX = w * 0.5;
      ctx.fillStyle = isEvening ? '#1e293b' : '#4a6b5d';
      ctx.beginPath();
      ctx.moveTo(0, hy + 2);
      ctx.quadraticCurveTo(w * 0.25, hy - 28 * s, midX, hy - 22 * s);
      ctx.quadraticCurveTo(w * 0.78, hy - 34 * s, w, hy + 2);
      ctx.closePath();
      ctx.fill();

      if (f.toPortId === 'cacilhas' || f.fromPortId === 'cacilhas') {
        // Architectural Ponte 25 de Abril suspension bridge & Santuario de Cristo Rei + Farol de Cacilhas
        const bLeft = midX - 210 * s;
        const bRight = midX + 165 * s;
        const t1X = midX - 112 * s;
        const t2X = midX + 68 * s;
        const deckY = hy - 20 * s;
        const towerTopY = hy - 84 * s;
        const bridgeRed = isEvening ? '#881b24' : '#c8232c';
        const bridgeHighlight = isEvening ? '#b02a36' : '#e33b45';

        // Concrete caisson water piers
        for (const tx of [t1X, t2X]) {
          ctx.fillStyle = isEvening ? '#475569' : '#cbd5e1';
          ctx.fillRect(tx - 11 * s, hy - 7 * s, 22 * s, 9 * s);
          ctx.fillStyle = isEvening ? '#334155' : '#94a3b8';
          ctx.fillRect(tx - 13 * s, hy - 2 * s, 26 * s, 4 * s);
        }

        // Main catenary cables & 24 vertical suspender dropper cables
        const cableY = (x) => {
          if (x <= t1X) {
            const u = (x - bLeft) / Math.max(1, t1X - bLeft);
            return (deckY - 2 * s) - u * u * ((deckY - 2 * s) - (towerTopY + 3 * s));
          }
          if (x >= t2X) {
            const u = (bRight - x) / Math.max(1, bRight - t2X);
            return (deckY - 2 * s) - u * u * ((deckY - 2 * s) - (towerTopY + 3 * s));
          }
          const u = (x - t1X) / Math.max(1, t2X - t1X);
          const sag = 4 * u * (1 - u);
          return (towerTopY + 3 * s) + sag * ((deckY - 6 * s) - (towerTopY + 3 * s));
        };

        ctx.strokeStyle = isEvening ? 'rgba(160, 38, 48, 0.72)' : 'rgba(184, 30, 40, 0.72)';
        ctx.lineWidth = Math.max(0.8, 0.95 * s);
        ctx.beginPath();
        for (let sx = bLeft + 8 * s; sx <= bRight - 8 * s; sx += 9 * s) {
          if (Math.abs(sx - t1X) < 6 * s || Math.abs(sx - t2X) < 6 * s) continue;
          ctx.moveTo(sx, cableY(sx));
          ctx.lineTo(sx, deckY);
        }
        ctx.stroke();

        // Double-deck Warren stiffening truss roadway
        ctx.fillStyle = isEvening ? 'rgba(84, 16, 22, 0.85)' : 'rgba(136, 20, 28, 0.82)';
        ctx.fillRect(bLeft, deckY, bRight - bLeft, 5.5 * s);
        ctx.strokeStyle = bridgeHighlight;
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.beginPath();
        ctx.moveTo(bLeft, deckY);
        ctx.lineTo(bRight, deckY);
        ctx.moveTo(bLeft, deckY + 5.5 * s);
        ctx.lineTo(bRight, deckY + 5.5 * s);
        for (let wx = bLeft; wx < bRight - 6 * s; wx += 8 * s) {
          ctx.moveTo(wx, deckY);
          ctx.lineTo(wx + 4 * s, deckY + 5.5 * s);
          ctx.lineTo(wx + 8 * s, deckY);
        }
        ctx.stroke();

        // Main parabolic suspension cables
        ctx.strokeStyle = bridgeHighlight;
        ctx.lineWidth = Math.max(1.4, 2.1 * s);
        ctx.beginPath();
        for (let sx = bLeft; sx <= bRight; sx += 4 * s) {
          const cy = cableY(sx);
          if (sx === bLeft) ctx.moveTo(sx, cy);
          else ctx.lineTo(sx, cy);
        }
        ctx.stroke();

        // Twin portal steel towers with diamond X-bracing
        for (const tx of [t1X, t2X]) {
          ctx.fillStyle = bridgeRed;
          ctx.fillRect(tx - 6.5 * s, towerTopY, 3.4 * s, hy - 6 * s - towerTopY);
          ctx.fillRect(tx + 3.1 * s, towerTopY, 3.4 * s, hy - 6 * s - towerTopY);
          ctx.fillStyle = bridgeHighlight;
          ctx.fillRect(tx - 6.5 * s, towerTopY, 1.3 * s, hy - 6 * s - towerTopY);
          ctx.fillRect(tx + 3.1 * s, towerTopY, 1.3 * s, hy - 6 * s - towerTopY);
          ctx.strokeStyle = bridgeRed;
          ctx.lineWidth = Math.max(1, 1.4 * s);
          for (const [yA, yB] of [
            [towerTopY + 3 * s, towerTopY + 22 * s],
            [towerTopY + 23 * s, deckY - 2 * s],
            [deckY + 5 * s, hy - 9 * s]
          ]) {
            ctx.beginPath();
            ctx.moveTo(tx - 5 * s, yA);
            ctx.lineTo(tx + 5 * s, yA);
            ctx.moveTo(tx - 5 * s, yA);
            ctx.lineTo(tx + 5 * s, yB);
            ctx.moveTo(tx + 5 * s, yA);
            ctx.lineTo(tx - 5 * s, yB);
            ctx.stroke();
          }
        }

        // Santuario de Cristo Rei pedestal & outstretched-arms statue on Almada escarpment
        const crX = midX + 186 * s;
        const crBaseY = hy - 22 * s;
        ctx.fillStyle = isEvening ? '#475569' : '#d6cfc2';
        ctx.beginPath();
        ctx.moveTo(crX - 10 * s, crBaseY);
        ctx.lineTo(crX - 6.5 * s, crBaseY - 32 * s);
        ctx.lineTo(crX + 6.5 * s, crBaseY - 32 * s);
        ctx.lineTo(crX + 10 * s, crBaseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = isEvening ? '#1e293b' : '#8c8273';
        ctx.fillRect(crX - 2 * s, crBaseY - 27 * s, 4 * s, 27 * s);
        ctx.fillStyle = isEvening ? '#94a3b8' : '#f8fafc';
        ctx.fillRect(crX - 2.2 * s, crBaseY - 44 * s, 4.4 * s, 12 * s);
        ctx.fillRect(crX - 10 * s, crBaseY - 41 * s, 20 * s, 2.6 * s);
        ctx.beginPath();
        ctx.arc(crX, crBaseY - 46 * s, 2.2 * s, 0, Math.PI * 2);
        ctx.fill();

        // Crimson Farol de Cacilhas lighthouse at the point
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(midX + 132 * s, hy - 34 * s, 9 * s, 34 * s);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(midX + 132 * s, hy - 22 * s, 9 * s, 5 * s);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(midX + 136.5 * s, hy - 36 * s, 3.8 * s, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.toPortId === 'seixal') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(midX - 44 * s, hy - 36 * s, 88 * s, 36 * s);
        ctx.fillStyle = '#b84a32';
        ctx.fillRect(midX - 48 * s, hy - 42 * s, 96 * s, 8 * s);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(midX - 96 * s, hy);
        ctx.lineTo(midX - 64 * s, hy);
        ctx.lineTo(midX - 84 * s, hy - 46 * s);
        ctx.closePath();
        ctx.fill();
      } else if (f.toPortId === 'montijo') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(midX - 14 * s, hy - 46 * s, 28 * s, 46 * s);
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.arc(midX, hy - 46 * s, 14 * s, Math.PI, 0);
        ctx.fill();
        ctx.save();
        ctx.translate(midX, hy - 38 * s);
        ctx.rotate(animTime * 1.1);
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 3;
        for (let b = 0; b < 4; b += 1) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -26 * s);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3D Tagus Estuary Water Plane & Animated Bow Wake
      const water = ctx.createLinearGradient(0, hy, 0, h);
      water.addColorStop(0, isEvening ? '#0e2944' : '#14628c');
      water.addColorStop(1, isEvening ? '#071729' : '#0b3a57');
      ctx.fillStyle = water;
      ctx.fillRect(0, hy, w, h - hy);

      const waveT = (animTime * 1.8) % 1;
      for (let i = 0; i < 8; i += 1) {
        const t = ((i + waveT) % 8) / 8;
        const wy = hy + t * t * (h - hy);
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.15 + t * 0.35})`;
        ctx.lineWidth = 1.2 + t * 2.5;
        ctx.beginPath();
        ctx.moveTo(40, wy);
        ctx.lineTo(w - 40, wy);
        ctx.stroke();
      }

      // Foaming V-shaped bow wake
      ctx.strokeStyle = 'rgba(240, 249, 255, 0.72)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(midX, h - 108);
      ctx.lineTo(midX - 240, h);
      ctx.moveTo(midX, h - 108);
      ctx.lineTo(midX + 240, h);
      ctx.stroke();

      // 3D Transtejo Catamaran Forward Deck & White Nautical Handrails
      const bob = Math.sin(animTime * 2.8) * 4;
      ctx.fillStyle = '#c8b498';
      ctx.beginPath();
      ctx.moveTo(midX - 180, h - 98 + bob);
      ctx.lineTo(midX + 180, h - 98 + bob);
      ctx.lineTo(w, h + 10);
      ctx.lineTo(0, h + 10);
      ctx.closePath();
      ctx.fill();
      // Orange & emerald Transtejo bow gunwale + white metal safety railing
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(midX - 184, h - 104 + bob, 368, 10);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.strokeRect(midX - 178, h - 138 + bob, 356, 36);

      // Connected LAN companions sailing right alongside you on the Transtejo bow deck!
      const ferryPeers = (state.remotePlayers || []).filter(
        (rp) => rp.mode === 'ferry' && rp.ferryPhase === 'sailing'
      );
      ferryPeers.slice(0, 4).forEach((rp, idx) => {
        const outfit = getOutfitById(rp.outfitId);
        const px = midX - 100 + idx * 66;
        const py = h - 106 + bob;
        ctx.fillStyle = outfit.primaryColor;
        drawRoundedRect(ctx, px - 12, py - 38, 24, 34, 5);
        ctx.fill();
        ctx.fillStyle = outfit.skinColor || '#f1c7a6';
        ctx.beginPath();
        ctx.arc(px, py - 47, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = outfit.hairColor || '#3b2b20';
        ctx.beginPath();
        ctx.arc(px, py - 49, 9.2, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.font = '700 10px "Segoe UI", sans-serif';
        const tw = ctx.measureText(rp.name).width + 10;
        drawRoundedRect(ctx, px - tw * 0.5, py - 74, tw, 16, 4);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.textAlign = 'center';
        ctx.fillText(rp.name, px, py - 62);
        if (rp.emoteText) {
          const ew = ctx.measureText(rp.emoteText).width + 12;
          drawRoundedRect(ctx, px - ew * 0.5, py - 94, ew, 16, 4);
          ctx.fillStyle = 'rgba(255, 251, 235, 0.94)';
          ctx.fill();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.1;
          ctx.stroke();
          ctx.fillStyle = '#1e293b';
          ctx.fillText(rp.emoteText, px, py - 82);
        }
      });

      // Progress Header & Synchronized Transtejo Ferry Horn Alert
      const hornActive = Boolean(state.ferryHornSignal);
      if (hornActive) {
        // Acoustic brass horn wave rings pulsing across the Tagus bow sky
        ctx.save();
        for (let r = 0; r < 3; r += 1) {
          const rad = 38 + r * 22 + ((animTime * 55) % 22);
          ctx.strokeStyle = `rgba(253, 224, 71, ${0.55 - r * 0.15})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(midX, 92, rad, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        ctx.restore();
      }
      const hasSubLine = hornActive || ferryPeers.length > 0;
      const headerH = hasSubLine ? 60 : 50;
      drawRoundedRect(ctx, midX - 255, 14, 510, headerH, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = hornActive ? '#facc15' : '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = hornActive ? '#fde047' : '#ffffff';
      ctx.font = '700 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        hornActive
          ? `TRANSTEJO HORN SIGNAL  -  TO ${toLabel.toUpperCase()} (${Math.round(progress * 100)}%)`
          : `TRANSTEJO 3D BOW DECK  -  TO ${toLabel.toUpperCase()} (${Math.round(progress * 100)}%)`,
        midX,
        hasSubLine ? 38 : 44,
        486
      );
      if (hornActive) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 10.5px "Segoe UI", sans-serif';
        ctx.fillText(
          `${(state.ferryHornSignal.triggeredBy || 'CAPTAIN').toUpperCase()} SOUNDED HORN: "${state.ferryHornSignal.text}"`,
          midX,
          58,
          486
        );
      } else if (ferryPeers.length > 0) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 10.5px "Segoe UI", sans-serif';
        ctx.fillText(`SAILING TOGETHER WITH: ${ferryPeers.map((p) => p.name).join(', ')}`, midX, 60, 486);
      }
      ctx.textAlign = 'left';
      return;
    }

    // B) Full 3D Walkable Cais do Sodre Ferry Pier OR Explorable 3D South-Bank Towns (Cacilhas, Seixal, Montijo)!
    const cam = this.buildCamera(state);
    const isLisbon = f.portId === FERRY_TERMINAL.id;
    const destInfo = FERRY_DESTINATIONS.find((d) => d.id === f.portId);
    const hy = clamp(cam.horizonY, 60, this.viewHeight - 80);

    // 1. Sky + Tagus River Horizon + Ponte 25 de Abril silhouette
    const sky = ctx.createLinearGradient(0, 0, 0, hy + 2);
    if (isEvening) {
      sky.addColorStop(0, '#0a1630');
      sky.addColorStop(1, '#263d66');
    } else if (isGolden) {
      sky.addColorStop(0, '#36588f');
      sky.addColorStop(0.58, '#c97c5d');
      sky.addColorStop(1, '#f7cf86');
    } else {
      sky.addColorStop(0, '#2563eb');
      sky.addColorStop(0.65, '#7dd3fc');
      sky.addColorStop(1, '#d8f1fc');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.viewWidth, hy + 2);

    // Base sunlit terrain (south-bank town sits on solid land north of pier y=286; Tagus River spans south of y=286!)
    const baseGround = ctx.createLinearGradient(0, hy, 0, this.viewHeight);
    if (isLisbon) {
      baseGround.addColorStop(0, isEvening ? '#0e2944' : '#1b6b96');
      baseGround.addColorStop(1, isEvening ? '#081a2e' : '#0e4263');
    } else {
      baseGround.addColorStop(0, isEvening ? '#394152' : '#cfc7b8');
      baseGround.addColorStop(1, isEvening ? '#4b5263' : '#e4ddd0');
    }
    ctx.fillStyle = baseGround;
    ctx.fillRect(0, hy, this.viewWidth, this.viewHeight - hy);

    // Explicit 3D Tagus River water plane strictly SOUTH of the pier curb (y >= 286)
    this.drawPoly3D(
      ctx,
      cam,
      [[-400, 286, -0.5], [1160, 286, -0.5], [1160, 1500, -0.5], [-400, 1500, -0.5]],
      isEvening ? '#0d2642' : '#16628d'
    );

    // 2. Walkable 3D Timber Pier (Cais do Sodre) OR Cobblestone South-Bank Promenade (y: 148..286)
    this.drawPoly3D(
      ctx,
      cam,
      [[48, 128, 0], [712, 128, 0], [712, 286, 0], [48, 286, 0]],
      isLisbon ? '#cbb89d' : '#e4ddd0',
      '#78716c',
      1.4
    );
    // Cobblestone / timber plank depth lines
    for (let px = 88; px < 700; px += 44) {
      this.drawLine3D(ctx, cam, [px, 128, 0.2], [px, 286, 0.2], 'rgba(92, 74, 56, 0.22)', 1);
    }
    // Yellow safety quay edge along y = 278..286
    this.drawPoly3D(ctx, cam, [[48, 278, 0.3], [712, 278, 0.3], [712, 286, 0.3], [48, 286, 0.3]], '#facc15');
    // Wooden boarding gangway bridging pier to catamaran
    this.drawPoly3D(ctx, cam, [[352, 284, 0.4], [408, 284, 0.4], [408, 324, 0.4], [352, 324, 0.4]], '#64748b', '#f8fafc', 1.5);

    // Floor hover oval
    if (this.hoverWorld) {
      const pts = [];
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        pts.push([this.hoverWorld.x + Math.cos(a) * 12, this.hoverWorld.y + Math.sin(a) * 12, 0.5]);
      }
      this.drawPoly3D(ctx, cam, pts, 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.85)', 2);
    }

    // 3. Depth-Sorted 3D Pier / South-Bank Townscape Structures, Catamaran, Bollards, Local Resident & LAN Peers
    const items = [];

    // Iron mooring bollards along the pier edge
    for (const bx of [96, 220, 540, 664]) {
      items.push({
        dist: Math.hypot(bx - cam.camX, 276 - cam.camY),
        draw: () => this.drawBox3D(ctx, cam, bx - 6, 270, bx + 6, 282, 0, 14, { front: '#1e293b', side: '#334155', top: '#94a3b8' })
      });
    }

    // Docked 3D White-and-Orange Transtejo Catamaran Ferry waiting at y = 324..394!
    items.push({
      dist: Math.hypot(380 - cam.camX, 358 - cam.camY),
      draw: () => {
        const bob = Math.sin(animTime * 2.2) * 2.2;
        this.drawBox3D(
          ctx,
          cam,
          248,
          324,
          512,
          388,
          -4 + bob,
          12 + bob,
          { front: '#ea580c', back: '#ea580c', side: '#c2410c', top: '#0f5c52', stroke: '#7c2d12', lineWidth: 1.4 },
          { kind: 'ferry-board' }
        );
        this.drawBox3D(
          ctx,
          cam,
          272,
          332,
          488,
          380,
          12 + bob,
          40 + bob,
          { front: '#f8fafc', back: '#f8fafc', side: '#e2e8f0', top: '#cbd5e1', stroke: '#334155', lineWidth: 1.2 },
          { kind: 'ferry-board' }
        );
        // Panoramic blue catamaran passenger windows facing pier
        for (let wx = 286; wx <= 454; wx += 28) {
          this.drawPoly3D(ctx, cam, [[wx + 20, 331.5, 20 + bob], [wx, 331.5, 20 + bob], [wx, 331.5, 34 + bob], [wx + 20, 331.5, 34 + bob]], '#0284c7');
        }
        // Bridge wheelhouse
        this.drawBox3D(ctx, cam, 396, 340, 456, 372, 40 + bob, 56 + bob, { front: '#0f5c52', side: '#0b443d', top: '#115e59' });
        const bp = this.projectWorldPt(cam, 380, 330, 52 + bob);
        if (bp) {
          ctx.save();
          ctx.font = '700 10.5px "Segoe UI", sans-serif';
          const lbl = isLisbon ? 'TRANSTEJO FERRY [E]' : 'RETURN TO LISBOA [E]';
          const tw = ctx.measureText(lbl).width + 16;
          drawRoundedRect(ctx, bp.x - tw * 0.5, bp.y - 10, tw, 20, 5);
          ctx.fillStyle = '#0f5c52';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(lbl, bp.x, bp.y + 4);
          ctx.restore();
        }
      }
    });

    if (isLisbon) {
      // Cais do Sodre Emerald Terminal Gate Arch along y = 144 (clickable to exit back to Lisbon street!)
      items.push({
        dist: Math.hypot(380 - cam.camX, 144 - cam.camY),
        draw: () => {
          this.drawBox3D(
            ctx,
            cam,
            280,
            110,
            480,
            148,
            0,
            74,
            { front: '#e5ded0', back: '#d6cfc0', side: '#cfc8b8', top: '#0f5c52', stroke: '#0f5c52', lineWidth: 1.5 },
            { kind: 'ferry-exit' }
          );
          this.drawPoly3D(ctx, cam, [[340, 148.5, 0], [420, 148.5, 0], [420, 148.5, 48], [340, 148.5, 48]], '#1e3a5f', '#fde047', 1.8);
          const ep = this.projectWorldPt(cam, 380, 149, 58);
          if (ep) {
            ctx.save();
            ctx.font = '700 10.5px "Segoe UI", sans-serif';
            drawRoundedRect(ctx, ep.x - 74, ep.y - 10, 148, 20, 4);
            ctx.fillStyle = '#0f5c52';
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('EXIT TO LISBOA STREET', ep.x, ep.y + 4);
            ctx.restore();
          }
        }
      });
    } else if (destInfo && Array.isArray(destInfo.townSpots)) {
      // 3 Bespoke 3D Waterfront Buildings & Landmarks along the South-Bank Promenade (y: 54..148)!
      const isCacilhas = destInfo.id === 'cacilhas';
      const isSeixal = destInfo.id === 'seixal';
      const [eatery, landmark, shop] = destInfo.townSpots;

      // 1. Left 3D Striped-Awning South-Bank Eatery (x: 56..244, y: 24..116)
      items.push({
        dist: Math.hypot(150 - cam.camX, 92 - cam.camY),
        draw: () => {
          const accent = isCacilhas ? '#b84a32' : isSeixal ? '#0f766e' : '#9a3412';
          const hl = nearbyInteraction?.type === 'south-bank-spot' && nearbyInteraction.spotId === eatery.id;
          this.drawBox3D(
            ctx,
            cam,
            56,
            24,
            244,
            116,
            0,
            78,
            { front: isCacilhas ? '#f6e7d4' : '#f7f4ec', side: '#e7dcc8', top: accent, stroke: hl ? '#facc15' : '#472d1b', lineWidth: hl ? 2.4 : 1.3 },
            { kind: 'south-bank-spot', spotId: eatery.id }
          );
          for (let s = 0; s < 6; s += 1) {
            const sx0 = 68 + s * 27;
            this.drawPoly3D(ctx, cam, [[sx0, 116, 34], [sx0 + 27, 116, 34], [sx0 + 27, 130, 26], [sx0, 130, 26]], s % 2 === 0 ? accent : '#fef3c7');
          }
          this.drawPoly3D(ctx, cam, [[133, 116.5, 0], [167, 116.5, 0], [167, 116.5, 29], [133, 116.5, 29]], '#5c3a21', '#2d1a0f', 1.4);
          this.drawPoly3D(ctx, cam, [[78, 116.5, 8], [120, 116.5, 8], [120, 116.5, 26], [78, 116.5, 26]], '#fff7ed', '#472d1b', 1.2);
          this.drawPoly3D(ctx, cam, [[180, 116.5, 8], [222, 116.5, 8], [222, 116.5, 26], [180, 116.5, 26]], '#fff7ed', '#472d1b', 1.2);
          const sp = this.projectWorldPt(cam, 150, 117, 50);
          if (sp) {
            ctx.save();
            ctx.font = '700 9.5px Georgia, serif';
            const txt = eatery.name.toUpperCase();
            const tw = ctx.measureText(txt).width + 12;
            drawRoundedRect(ctx, sp.x - tw * 0.5, sp.y - 9, tw, 18, 4);
            ctx.fillStyle = accent;
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(txt, sp.x, sp.y + 3.5);
            ctx.restore();
          }
        }
      });

      // 2. Center 3D Signature South-Bank Landmark (x: 290..470, y: 24..112)
      items.push({
        dist: Math.hypot(380 - cam.camX, 86 - cam.camY),
        draw: () => {
          const hl = nearbyInteraction?.type === 'south-bank-spot' && nearbyInteraction.spotId === landmark.id;
          if (isCacilhas) {
            // Iconic 1886 Red Farol de Cacilhas Cast-Iron 3D Lighthouse (slender proportions + lantern dome!)
            this.drawBox3D(
              ctx,
              cam,
              364,
              64,
              396,
              96,
              0,
              14,
              { front: '#d6cfc0', side: '#bfb7a6', top: '#e5ded0', stroke: '#57534e' },
              { kind: 'south-bank-spot', spotId: landmark.id }
            );
            this.drawBox3D(
              ctx,
              cam,
              370,
              70,
              390,
              90,
              14,
              74,
              { front: '#dc2626', side: '#b91c1c', top: '#1e293b', stroke: hl ? '#facc15' : '#7f1d1d', lineWidth: hl ? 2.4 : 1.4 },
              { kind: 'south-bank-spot', spotId: landmark.id }
            );
            const lamp = this.projectWorldPt(cam, 380, 80, 82);
            if (lamp) {
              const r = clamp((9 * this.focal) / lamp.cz, 5, 18);
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(lamp.x, lamp.y, r, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (isSeixal) {
            this.drawBox3D(
              ctx,
              cam,
              318,
              46,
              442,
              114,
              0,
              68,
              { front: '#f8fafc', side: '#e2e8f0', top: '#b84a32', stroke: hl ? '#facc15' : '#0f766e', lineWidth: hl ? 2.4 : 1.4 },
              { kind: 'south-bank-spot', spotId: landmark.id }
            );
            for (const wx of [342, 380, 418]) {
              this.drawPoly3D(ctx, cam, [[wx - 11, 114.5, 0], [wx + 11, 114.5, 0], [wx + 11, 114.5, 24], [wx - 11, 114.5, 24]], '#0284c7');
            }
            this.drawPoly3D(ctx, cam, [[282, 102, 4], [312, 102, 4], [296, 102, 66]], '#f59e0b', '#b45309', 1.2);
          } else {
            this.drawBox3D(
              ctx,
              cam,
              362,
              58,
              398,
              94,
              0,
              76,
              { front: '#f8fafc', side: '#e2e8f0', top: '#1d4ed8', stroke: hl ? '#facc15' : '#1e3a5f', lineWidth: hl ? 2.4 : 1.4 },
              { kind: 'south-bank-spot', spotId: landmark.id }
            );
            const hub = this.projectWorldPt(cam, 380, 95, 64);
            if (hub) {
              const bladeLen = clamp((34 * this.focal) / hub.cz, 12, 64);
              ctx.save();
              ctx.translate(hub.x, hub.y);
              ctx.rotate(animTime * 0.9);
              ctx.strokeStyle = '#7c2d12';
              ctx.lineWidth = 3;
              for (let b = 0; b < 4; b += 1) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -bladeLen);
                ctx.stroke();
              }
              ctx.restore();
            }
            for (const fx of [314, 336, 442]) {
              this.drawLine3D(ctx, cam, [fx, 106, 0], [fx, 106, 14], '#be185d', 1.6);
              const fp = this.projectWorldPt(cam, fx, 106, 17);
              if (fp) {
                ctx.fillStyle = '#f472b6';
                ctx.beginPath();
                ctx.arc(fp.x, fp.y, clamp((4.5 * this.focal) / fp.cz, 2.5, 9), 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          const lp = this.projectWorldPt(cam, 380, 106, 26);
          if (lp) {
            ctx.save();
            ctx.font = '700 9px "Segoe UI", sans-serif';
            const txt = `${landmark.name.toUpperCase()} [REST +25]`;
            const tw = ctx.measureText(txt).width + 12;
            drawRoundedRect(ctx, lp.x - tw * 0.5, lp.y - 9, tw, 18, 4);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.stroke();
            ctx.fillStyle = '#fef3c7';
            ctx.textAlign = 'center';
            ctx.fillText(txt, lp.x, lp.y + 3.5);
            ctx.restore();
          }
        }
      });

      // 3. Right 3D Regional Artisan Shop / Kiosk (x: 516..704, y: 24..116)
      items.push({
        dist: Math.hypot(610 - cam.camX, 92 - cam.camY),
        draw: () => {
          const accent = isCacilhas ? '#1f6e58' : isSeixal ? '#7c4f2b' : '#1b4d89';
          const hl = nearbyInteraction?.type === 'south-bank-spot' && nearbyInteraction.spotId === shop.id;
          this.drawBox3D(
            ctx,
            cam,
            516,
            24,
            704,
            116,
            0,
            76,
            { front: isCacilhas ? '#d8e6dc' : isSeixal ? '#e7d5bc' : '#eaf2fb', side: '#dbe4ec', top: accent, stroke: hl ? '#facc15' : '#1e3a5f', lineWidth: hl ? 2.4 : 1.3 },
            { kind: 'south-bank-spot', spotId: shop.id }
          );
          this.drawPoly3D(ctx, cam, [[593, 116.5, 0], [627, 116.5, 0], [627, 116.5, 29], [593, 116.5, 29]], '#5c3a21', '#2d1a0f', 1.4);
          this.drawPoly3D(ctx, cam, [[534, 116.5, 8], [578, 116.5, 8], [578, 116.5, 26], [534, 116.5, 26]], '#fff7ed', '#1e3a5f', 1.2);
          this.drawPoly3D(ctx, cam, [[642, 116.5, 8], [686, 116.5, 8], [686, 116.5, 26], [642, 116.5, 26]], '#fff7ed', '#1e3a5f', 1.2);
          const sp = this.projectWorldPt(cam, 610, 117, 50);
          if (sp) {
            ctx.save();
            ctx.font = '700 9.5px Georgia, serif';
            const txt = shop.name.toUpperCase();
            const tw = ctx.measureText(txt).width + 12;
            drawRoundedRect(ctx, sp.x - tw * 0.5, sp.y - 9, tw, 18, 4);
            ctx.fillStyle = accent;
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(txt, sp.x, sp.y + 3.5);
            ctx.restore();
          }
        }
      });

      // Strolling 3D south-bank local resident
      const localX = 270 + Math.sin(animTime * 0.55) * 65;
      items.push({
        dist: Math.hypot(localX - cam.camX, 230 - cam.camY),
        draw: () => this.drawPersonSprite3D(ctx, cam, {
          x: localX,
          y: 230,
          outfitId: isCacilhas ? 'maritime-striped' : isSeixal ? 'tile-artisan' : 'alfama-dress',
          walkPhase: animTime * 3.8,
          isMoving: true
        })
      });
    }

    // Connected LAN peers sharing the same pier/promenade in 3D
    const peersHere = (state.remotePlayers || []).filter(
      (rp) => rp.mode === 'ferry' && rp.ferryPortId === f.portId && rp.ferryPhase === 'terminal'
    );
    for (const rp of peersHere) {
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

    items.sort((a, b) => b.dist - a.dist);
    for (const it of items) it.draw();

    this.drawSceneHud(
      ctx,
      cam,
      isLisbon ? '3D PIER  -  CAIS DO SODRE PORT' : `3D PROMENADE  -  ${(destInfo?.name || 'SOUTH BANK').toUpperCase()}`,
      state.ferryHornSignal
        ? `${(state.ferryHornSignal.triggeredBy || 'CAPTAIN').toUpperCase()} HORN: "${state.ferryHornSignal.text}"`
        : (isLisbon ? 'Click Transtejo Ferry to Sail or Gate to Exit' : 'Explore Eatery, Landmark & Shop | Click Ferry to Return'),
      {
        floorRect: { x: 48, y: 148, w: 664, h: 138 },
        floorColor: 'rgba(226, 218, 202, 0.28)',
        px: state.player.x,
        py: state.player.y,
        peers: peersHere,
        pois: isLisbon
          ? [{ x: 380, y: 162, color: '#34d399' }, { x: 380, y: 274, color: '#38bdf8' }]
          : [
              { x: 155, y: 186, color: '#f59e0b' },
              { x: 380, y: 186, color: '#facc15' },
              { x: 605, y: 186, color: '#a78bfa' },
              { x: 380, y: 274, color: '#38bdf8' }
            ]
      }
    );
  }

  // =========================================================================
  // 4. FULL 3D WALKABLE LISBOA CITY DISTRICTS (ALL 4 METRO LINES & MULTIMODAL TRANSIT)
  // =========================================================================
  renderCityDistrict3D(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const district =
      LISBOA_CITY_DISTRICTS.find((d) => d.id === state.cityDistrictId) ||
      LISBOA_CITY_DISTRICTS[0];
    const station =
      ALL_METRO_STATIONS.find((s) => s.id === district.stationId) ||
      METRO_STATIONS[0];
    const [eatery, landmark, shop] = district.townSpots;
    const phase = getDayPhase(state.minutesOfDay);
    const monthInfo = getMonthInfo(state.month);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const isHeavyRain = (monthInfo.rainIntensity || 0) >= 0.7;

    const cam = this.buildCamera(state);
    const w = this.viewWidth;
    const h = this.viewHeight;
    const hy = clamp(cam.horizonY, 70, h - 70);

    // 1. Sky & District-Specific Lisbon Horizon Backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    if (isEvening) {
      sky.addColorStop(0, '#0a1630');
      sky.addColorStop(1, '#263d66');
    } else if (isHeavyRain) {
      sky.addColorStop(0, '#3e4f63');
      sky.addColorStop(0.58, '#6c7e92');
      sky.addColorStop(1, '#a5b3c2');
    } else if (isGolden) {
      sky.addColorStop(0, '#36588f');
      sky.addColorStop(0.55, '#db8556');
      sky.addColorStop(1, '#fde68a');
    } else {
      sky.addColorStop(0, '#1d5eb8');
      sky.addColorStop(0.65, '#60b8f0');
      sky.addColorStop(1, '#e0f2fe');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hy + 4);

    // Distant Lisbon Hills / Tagus Estuary / Ponte Vasco da Gama / Parque Eduardo VII horizon
    ctx.fillStyle = isEvening ? '#1e293b' : '#436256';
    ctx.beginPath();
    ctx.moveTo(0, hy + 2);
    ctx.quadraticCurveTo(w * 0.25, hy - 28, w * 0.52, hy - 20);
    ctx.quadraticCurveTo(w * 0.78, hy - 34, w, hy + 2);
    ctx.closePath();
    ctx.fill();

    if (district.skylineStyle === 'oriente-calatrava' || district.skylineStyle === 'belem-tower') {
      // Shimmering Tagus Estuary water band along the horizon
      const waterGrad = ctx.createLinearGradient(0, hy, 0, h);
      waterGrad.addColorStop(0, isEvening ? '#162c46' : '#1b769c');
      waterGrad.addColorStop(1, isEvening ? '#091526' : '#0f4c6c');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, hy, w, h - hy);

      if (district.skylineStyle === 'oriente-calatrava') {
        // 12.3 km Cable-Stayed Ponte Vasco da Gama stretching across the eastern Tagus horizon!
        const pvgX1 = w * 0.72;
        const pvgX2 = w * 0.86;
        ctx.strokeStyle = isEvening ? '#94a3b8' : '#f8fafc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.56, hy - 8);
        ctx.lineTo(w * 0.98, hy - 8);
        ctx.moveTo(pvgX1, hy + 2);
        ctx.lineTo(pvgX1, hy - 44);
        ctx.moveTo(pvgX2, hy + 2);
        ctx.lineTo(pvgX2, hy - 44);
        ctx.stroke();
        ctx.lineWidth = 0.9;
        for (let i = -3; i <= 3; i += 1) {
          if (i === 0) continue;
          ctx.beginPath();
          ctx.moveTo(pvgX1, hy - 40);
          ctx.lineTo(pvgX1 + i * 16, hy - 8);
          ctx.moveTo(pvgX2, hy - 40);
          ctx.lineTo(pvgX2 + i * 16, hy - 8);
          ctx.stroke();
        }
      }
    } else {
      // Urban Lisbon terracotta & parkland ground backdrop below horizon
      const groundGrad = ctx.createLinearGradient(0, hy, 0, h);
      groundGrad.addColorStop(0, isEvening ? '#1f2937' : '#c7beb0');
      groundGrad.addColorStop(1, isEvening ? '#111827' : '#a89f91');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, hy, w, h - hy);
    }

    // 2. Walkable 3D Calçada Portuguesa District Plaza (y: 146..286, x: 48..712)
    this.drawPoly3D(ctx, cam, [[48, 22, 0], [712, 22, 0], [712, 146, 0], [48, 146, 0]], '#d6cec0', '#94a3b8', 1.2);
    this.drawPoly3D(ctx, cam, [[48, 146, 0], [712, 146, 0], [712, 286, 0], [48, 286, 0]], '#e7dfd1', '#64748b', 1.6);
    // Decorative black basalt Calçada Portuguesa wave/diamond mosaic border bands
    for (let mx = 68; mx <= 684; mx += 44) {
      this.drawPoly3D(
        ctx,
        cam,
        [[mx, 156, 0.25], [mx + 22, 156, 0.25], [mx + 22, 162, 0.25], [mx, 162, 0.25]],
        '#334155'
      );
      this.drawPoly3D(
        ctx,
        cam,
        [[mx, 272, 0.25], [mx + 22, 272, 0.25], [mx + 22, 278, 0.25], [mx, 278, 0.25]],
        '#334155'
      );
    }

    // Hover ring on plaza floor
    if (this.hoverWorld) {
      const pts = [];
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        pts.push([this.hoverWorld.x + Math.cos(a) * 12, this.hoverWorld.y + Math.sin(a) * 12, 0.5]);
      }
      this.drawPoly3D(ctx, cam, pts, 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.85)', 2);
    }

    // 3. Depth-Sorted 3D Buildings, District Monument, Public Transit Vehicles, Metro Entrance, Open Lisbon Avenues & People
    const items = [];
    const primaryLineColor = (station.lineColors && station.lineColors[0]) || district.accentColor || '#2563eb';
    const secondaryLineColor = (station.lineColors && station.lineColors[1]) || null;
    const walkingAvenues = getWalkingAvenuesFrom(district.id);

    // 2B. Continuing 3D Sunlit Lisbon Avenues extending outward past the plaza perimeter into neighboring districts!
    for (const av of walkingAvenues) {
      const avHit = { kind: 'city-avenue', targetZoneId: av.toZoneId, x: av.x, y: av.y };
      const isHiAv = nearbyInteraction?.type === 'city-avenue' && nearbyInteraction.targetZoneId === av.toZoneId;
      if (av.slot === 'west') {
        this.drawPoly3D(ctx, cam, [[-280, 174, -0.05], [48, 174, -0.05], [48, 256, -0.05], [-280, 256, -0.05]], '#dfd7c8', '#64748b', 1.2);
        this.drawPoly3D(ctx, cam, [[48, 198, 0.32], [86, 198, 0.32], [86, 230, 0.32], [48, 230, 0.32]], 'rgba(27, 77, 137, 0.25)', isHiAv ? '#facc15' : '#1b4d89', 2);
      } else if (av.slot === 'east') {
        this.drawPoly3D(ctx, cam, [[712, 174, -0.05], [1040, 174, -0.05], [1040, 256, -0.05], [712, 256, -0.05]], '#dfd7c8', '#64748b', 1.2);
        this.drawPoly3D(ctx, cam, [[674, 198, 0.32], [712, 198, 0.32], [712, 230, 0.32], [674, 230, 0.32]], 'rgba(27, 77, 137, 0.25)', isHiAv ? '#facc15' : '#1b4d89', 2);
      } else if (av.slot === 'north-west' || av.slot === 'north-east') {
        const ax = av.x;
        this.drawPoly3D(ctx, cam, [[ax - 22, -220, -0.05], [ax + 22, -220, -0.05], [ax + 22, 146, -0.05], [ax - 22, 146, -0.05]], '#dfd7c8', '#64748b', 1.2);
        this.drawPoly3D(ctx, cam, [[ax - 18, 146, 0.32], [ax + 18, 146, 0.32], [ax + 18, 172, 0.32], [ax - 18, 172, 0.32]], 'rgba(27, 77, 137, 0.25)', isHiAv ? '#facc15' : '#1b4d89', 2);
      } else if (av.slot === 'south-west' || av.slot === 'south-east') {
        const ax = av.x;
        this.drawPoly3D(ctx, cam, [[ax - 28, 286, -0.05], [ax + 28, 286, -0.05], [ax + 28, 520, -0.05], [ax - 28, 520, -0.05]], '#dfd7c8', '#64748b', 1.2);
        this.drawPoly3D(ctx, cam, [[ax - 22, 260, 0.32], [ax + 22, 260, 0.32], [ax + 22, 286, 0.32], [ax - 22, 286, 0.32]], 'rgba(27, 77, 137, 0.25)', isHiAv ? '#facc15' : '#1b4d89', 2);
      }

      // Authentic Wrought-Iron Lisbon Blue-and-White Azulejo Avenue Signpost (clickable in 3D!)
      const postX = av.slot === 'west' ? 52 : av.slot === 'east' ? 708 : av.x;
      const postY = av.slot === 'north-west' || av.slot === 'north-east' ? 142 : av.slot === 'south-west' || av.slot === 'south-east' ? 286 : av.y;
      items.push({
        dist: Math.hypot(postX - cam.camX, postY - cam.camY),
        draw: () => {
          this.drawBox3D(
            ctx,
            cam,
            postX - 3,
            postY - 3,
            postX + 3,
            postY + 3,
            0,
            46,
            { front: '#1e293b', side: '#0f172a', top: '#eab308', stroke: isHiAv ? '#facc15' : '#334155', lineWidth: isHiAv ? 2 : 1 },
            avHit
          );
          const sp = this.projectWorldPt(cam, postX, postY, 50);
          if (sp && sp.cz > 16) {
            ctx.save();
            const kmTxt = av.distanceMeters >= 1000 ? `${(av.distanceMeters / 1000).toFixed(1)}km` : `${av.distanceMeters}m`;
            const line1 = `WALK -> ${av.shortLabel} (${kmTxt})`;
            const line2 = `${av.avenueName.split(' -> ')[0]}  [E]`;
            ctx.font = '700 9px Georgia, serif';
            const tw = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) + 18;
            const bx0 = sp.x - tw * 0.5;
            const by0 = sp.y - 16;
            drawRoundedRect(ctx, bx0, by0, tw, 30, 5);
            ctx.fillStyle = '#faf8f3';
            ctx.fill();
            ctx.strokeStyle = isHiAv ? '#f59e0b' : '#1b4d89';
            ctx.lineWidth = isHiAv ? 2.4 : 1.8;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(27, 77, 137, 0.45)';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx0 + 3, by0 + 3, tw - 6, 24);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#14375f';
            ctx.font = '700 8.8px Georgia, serif';
            ctx.fillText(line1, sp.x, by0 + 13);
            ctx.fillStyle = '#2563eb';
            ctx.font = '700 7.8px "Segoe UI", sans-serif';
            ctx.fillText(line2, sp.x, by0 + 24);
            ctx.restore();
            this.lastHitTargets.push({
              ...avHit,
              poly: [
                { x: bx0, y: by0 },
                { x: bx0 + tw, y: by0 },
                { x: bx0 + tw, y: by0 + 30 },
                { x: bx0, y: by0 + 30 }
              ]
            });
          }
        }
      });
    }

    // A) Left 3D District Eatery / Cafe / Cervejaria (x: 56..244, y: 24..116) + Terrace Dining Table
    items.push({
      dist: Math.hypot(150 - cam.camX, 92 - cam.camY),
      draw: () => {
        const hl = nearbyInteraction?.type === 'city-district-spot' && nearbyInteraction.spotId === eatery.id;
        const accent = district.accentColor || '#1d4ed8';
        this.drawBox3D(
          ctx,
          cam,
          56,
          24,
          244,
          116,
          0,
          78,
          { front: '#f7f1e5', side: '#e5dccb', top: '#a8442a', stroke: hl ? '#facc15' : '#334155', lineWidth: hl ? 2.4 : 1.3 },
          { kind: 'city-district-spot', spotId: eatery.id }
        );
        // Terracotta roof cornice band & lower azulejo wainscot
        this.drawPoly3D(ctx, cam, [[56, 116.2, 72], [244, 116.2, 72], [244, 116.2, 78], [56, 116.2, 78]], '#a8442a');
        this.drawPoly3D(ctx, cam, [[56, 116.2, 0], [244, 116.2, 0], [244, 116.2, 10], [56, 116.2, 10]], accent);
        // Upper-story shuttered Lisbon windows & wrought-iron Juliet balconies
        for (const wx of [82, 134, 186]) {
          this.drawPoly3D(ctx, cam, [[wx, 116.4, 48], [wx + 28, 116.4, 48], [wx + 28, 116.4, 67], [wx, 116.4, 67]], isEvening ? '#fde68a' : '#2c4159', '#475569', 1.2);
          this.drawLine3D(ctx, cam, [wx - 2, 117.2, 48], [wx + 30, 117.2, 48], '#0f172a', 1.8);
          this.drawLine3D(ctx, cam, [wx - 2, 117.2, 54], [wx + 30, 117.2, 54], '#0f172a', 1.4);
        }
        // Striped Portuguese awning
        for (let s = 0; s < 6; s += 1) {
          const sx0 = 68 + s * 27;
          this.drawPoly3D(ctx, cam, [[sx0, 116, 35], [sx0 + 27, 116, 35], [sx0 + 27, 130, 27], [sx0, 130, 27]], s % 2 === 0 ? accent : '#fef3c7');
        }
        this.drawPoly3D(ctx, cam, [[133, 116.5, 0], [167, 116.5, 0], [167, 116.5, 30], [133, 116.5, 30]], '#5c3a21', '#2d1a0f', 1.4);
        this.drawPoly3D(ctx, cam, [[78, 116.5, 10], [120, 116.5, 10], [120, 116.5, 27], [78, 116.5, 27]], isEvening ? '#fde68a' : '#dbeafe', '#334155', 1.2);
        this.drawPoly3D(ctx, cam, [[180, 116.5, 10], [222, 116.5, 10], [222, 116.5, 27], [180, 116.5, 27]], isEvening ? '#fde68a' : '#dbeafe', '#334155', 1.2);
        // Outdoor terrace table in front of eatery (renders glass or plate when seatedDining is active!)
        this.drawBox3D(ctx, cam, 143, 174, 167, 192, 0, 15, { front: '#78350f', side: '#5c280b', top: '#fef3c7', stroke: '#451a03' });
        if (state.seatedDining && state.seatedDining.active) {
          const tPt = this.projectWorldPt(cam, 155, 183, 16.5);
          if (tPt) {
            if (state.seatedDining.servingType === 'glass') {
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(tPt.x - 3, tPt.y - 8, 6, 8);
              ctx.strokeStyle = '#ffffff';
              ctx.strokeRect(tPt.x - 3, tPt.y - 8, 6, 8);
            } else {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.ellipse(tPt.x, tPt.y, 7, 4, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#d97706';
              ctx.beginPath();
              ctx.arc(tPt.x, tPt.y - 1, 3.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        const sp = this.projectWorldPt(cam, 150, 117, 42);
        if (sp) {
          ctx.save();
          ctx.font = '700 9.5px Georgia, serif';
          const txt = eatery.name.toUpperCase();
          const tw = ctx.measureText(txt).width + 12;
          drawRoundedRect(ctx, sp.x - tw * 0.5, sp.y - 9, tw, 18, 4);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(txt, sp.x, sp.y + 3.5);
          ctx.restore();
        }
      }
    });

    // Helper for authentic yellow Carris Lisbon streetcar / funicular cars in 3D city districts
    const drawCarrisTram3D = (x0, y0, x1, y1, z0, z1, label, hitMeta) => {
      // Dark steel undercarriage & bogie skirt rendered underneath the tram body
      this.drawBox3D(ctx, cam, x0 + 4, y0 + 2, x1 - 4, y1 - 2, z0, z0 + 4, { front: '#1e293b', side: '#0f172a', top: '#334155' });
      this.drawBox3D(ctx, cam, x0, y0, x1, y1, z0 + 4, z1, { front: '#eab308', side: '#ca8a04', top: '#f8fafc', stroke: '#713f12', lineWidth: 1.4 }, hitMeta);
      // Cream upper window band & dark glass windows
      const midZ = z0 + (z1 - z0) * 0.52;
      this.drawPoly3D(ctx, cam, [[x0, y1 + 0.3, midZ], [x1, y1 + 0.3, midZ], [x1, y1 + 0.3, z1 - 2], [x0, y1 + 0.3, z1 - 2]], '#fef9c3');
      const winCount = 4;
      const winW = (x1 - x0 - 12) / winCount;
      for (let i = 0; i < winCount; i += 1) {
        const wx = x0 + 6 + i * winW;
        this.drawPoly3D(ctx, cam, [[wx + 1.5, y1 + 0.6, midZ + 1.5], [wx + winW - 2.5, y1 + 0.6, midZ + 1.5], [wx + winW - 2.5, y1 + 0.6, z1 - 4], [wx + 1.5, y1 + 0.6, z1 - 4]], '#1e3a5f', '#78350f', 1);
      }
      // Signature Carris crimson trim band & roof pantograph
      this.drawPoly3D(ctx, cam, [[x0, y1 + 0.5, z0 + 9], [x1, y1 + 0.5, z0 + 9], [x1, y1 + 0.5, z0 + 12], [x0, y1 + 0.5, z0 + 12]], '#b91c1c');
      const cx = (x0 + x1) * 0.5;
      const cy = (y0 + y1) * 0.5;
      this.drawLine3D(ctx, cam, [cx - 6, cy, z1], [cx, cy, z1 + 11], '#334155', 1.8);
      this.drawLine3D(ctx, cam, [cx + 6, cy, z1], [cx, cy, z1 + 11], '#334155', 1.8);
      this.drawLine3D(ctx, cam, [cx - 9, cy, z1 + 11], [cx + 9, cy, z1 + 11], '#0f172a', 2.2);
      const tPt = this.projectWorldPt(cam, cx, y1 + 1, z1 + 4);
      if (tPt) {
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 8px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, tPt.x, tPt.y);
        ctx.restore();
      }
    };

    // B) Center 3D Iconic District Monument & Connected Public Transit Hub (x: 280..480, y: 24..118)
    items.push({
      dist: Math.hypot(380 - cam.camX, 86 - cam.camY),
      draw: () => {
        const hl = nearbyInteraction?.type === 'city-district-spot' && nearbyInteraction.spotId === landmark.id;
        const hitMeta = { kind: 'city-district-spot', spotId: landmark.id };
        const style = district.skylineStyle;

        if (style === 'belem-tower') {
          // 1515 Manueline Lioz Limestone Torre de Belem (bastion bulwark + battlements + corner guaritas + Loggia arches) + Eletrico 15E
          this.drawBox3D(ctx, cam, 294, 52, 396, 112, 0, 26, { front: '#efe8d8', side: '#dfd5c0', top: '#e7decb', stroke: '#78716c', lineWidth: 1.3 }, hitMeta);
          // Crenellated limestone merlons & Cross of Christ shields along bastion parapet
          for (let mx = 298; mx <= 384; mx += 16) {
            this.drawBox3D(ctx, cam, mx, 108, mx + 9, 113, 26, 33, { front: '#f5efe2', side: '#d6cbb5', top: '#efe8d8', stroke: '#78716c' }, hitMeta);
            this.drawPoly3D(ctx, cam, [[mx + 2, 113.3, 27.5], [mx + 7, 113.3, 27.5], [mx + 7, 113.3, 31.5], [mx + 2, 113.3, 31.5]], '#b91c1c');
          }
          // Twin corner Bartizan watchtowers (guaritas) with ribbed Moorish domes
          for (const gx of [292, 390]) {
            this.drawBox3D(ctx, cam, gx, 104, gx + 10, 114, 22, 42, { front: '#f5efe2', side: '#dfd5c0', top: '#d6cbb5', stroke: '#57534e' }, hitMeta);
            const dPt = this.projectWorldPt(cam, gx + 5, 109, 44);
            if (dPt) {
              const r = clamp((5.5 * this.focal) / dPt.cz, 3, 12);
              ctx.fillStyle = '#e7decb';
              ctx.beginPath();
              ctx.arc(dPt.x, dPt.y, r, Math.PI, 0);
              ctx.fill();
              ctx.strokeStyle = '#78716c';
              ctx.stroke();
            }
          }
          // Tall Manueline Keep Tower with arched Renaissance Loggia & twin Gothic windows
          this.drawBox3D(ctx, cam, 318, 42, 376, 94, 26, 86, { front: '#f5efe2', side: '#e5dcc8', top: '#d6cbb5', stroke: hl ? '#facc15' : '#57534e', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          for (let mx = 320; mx <= 368; mx += 14) {
            this.drawBox3D(ctx, cam, mx, 90, mx + 8, 95, 86, 92, { front: '#f5efe2', side: '#d6cbb5', top: '#efe8d8', stroke: '#78716c' }, hitMeta);
          }
          // Renaissance Loggia arcade across middle face
          for (const lx of [324, 338, 352, 364]) {
            this.drawPoly3D(ctx, cam, [[lx, 94.4, 36], [lx + 9, 94.4, 36], [lx + 9, 94.4, 52], [lx, 94.4, 52]], '#475569', '#a8a29e', 1);
          }
          // Upper twin Gothic windows & Royal Armillary Coat of Arms
          this.drawPoly3D(ctx, cam, [[328, 94.4, 60], [340, 94.4, 60], [340, 94.4, 76], [328, 94.4, 76]], '#334155', '#78716c', 1.2);
          this.drawPoly3D(ctx, cam, [[354, 94.4, 60], [366, 94.4, 60], [366, 94.4, 76], [354, 94.4, 76]], '#334155', '#78716c', 1.2);
          // Detailed yellow Carris Eletrico 15E tram beside the Belem esplanade
          drawCarrisTram3D(408, 76, 480, 112, 0, 34, '15E BELEM', hitMeta);
        } else if (style === 'rossio-santa-justa') {
          // 1902 Neo-Gothic Cast-Iron Elevador de Santa Justa vertical lift tower with open filigree lattice, elevator cab & Carmo skybridge!
          this.drawBox3D(ctx, cam, 354, 48, 408, 102, 0, 96, { front: '#273447', side: '#1e293b', top: '#475569', stroke: hl ? '#facc15' : '#94a3b8', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          // Upper viewing gallery deck & Carmo iron skybridge extending left
          this.drawBox3D(ctx, cam, 344, 44, 418, 106, 94, 103, { front: '#334155', side: '#1e293b', top: '#64748b', stroke: '#cbd5e1', lineWidth: 1.4 }, hitMeta);
          this.drawBox3D(ctx, cam, 270, 66, 354, 84, 84, 94, { front: '#334155', side: '#1e293b', top: '#475569', stroke: '#94a3b8' }, hitMeta);
          // Neo-Gothic vertical iron ribs, pointed filigree arches & X-bracing across 4 stories
          for (const zBay of [4, 26, 48, 70]) {
            this.drawPoly3D(ctx, cam, [[360, 102.4, zBay], [378, 102.4, zBay], [378, 102.4, zBay + 18], [369, 102.4, zBay + 22], [360, 102.4, zBay + 18]], '#60a5fa', '#cbd5e1', 1.2);
            this.drawPoly3D(ctx, cam, [[384, 102.4, zBay], [402, 102.4, zBay], [402, 102.4, zBay + 18], [393, 102.4, zBay + 22], [384, 102.4, zBay + 18]], '#60a5fa', '#cbd5e1', 1.2);
          }
          // Illuminated wooden elevator cab smoothly riding inside the Neo-Gothic shaft
          const cabZ = 18 + ((Math.sin(animTime * 1.4) + 1) * 0.5) * 48;
          this.drawBox3D(ctx, cam, 362, 98, 400, 104, cabZ, cabZ + 18, { front: '#b45309', side: '#78350f', top: '#fde047', stroke: '#fef08a', lineWidth: 1.5 }, hitMeta);
          this.drawPoly3D(ctx, cam, [[366, 104.3, cabZ + 5], [396, 104.3, cabZ + 5], [396, 104.3, cabZ + 14], [366, 104.3, cabZ + 14]], '#fef08a');
          // Sculpted Baroque Rossio Fountain with tiered bronze bowls & sparkling water arcs
          this.drawBox3D(ctx, cam, 286, 78, 338, 112, 0, 13, { front: '#e2e8f0', side: '#cbd5e1', top: '#0284c7', stroke: '#475569' }, hitMeta);
          this.drawBox3D(ctx, cam, 304, 88, 320, 102, 13, 30, { front: '#475569', side: '#334155', top: '#64748b' }, hitMeta);
          for (const dx of [-12, 0, 12]) {
            this.drawLine3D(ctx, cam, [312, 95, 30], [312 + dx, 95, 14 + Math.sin(animTime * 5 + dx) * 2], '#e0f2fe', 2.2);
          }
        } else if (style === 'marques-pombal') {
          // Parque Eduardo VII green sculpted boxwood hedge slope rising behind the Rotunda
          this.drawPoly3D(ctx, cam, [[276, 34, 0], [484, 34, 0], [468, 22, 48], [292, 22, 48]], '#15803d', '#166534', 1.2);
          for (const hx of [310, 355, 405, 448]) {
            this.drawLine3D(ctx, cam, [hx, 34, 2], [hx, 24, 42], '#4ade80', 2);
          }
          // Monumento ao Marques de Pombal stepped plinth, allegorical bronze relief band, fluted column & sculpted bronze statue + lion!
          this.drawBox3D(ctx, cam, 336, 56, 406, 112, 0, 14, { front: '#d6cfc2', side: '#bfb7a8', top: '#e5ded0', stroke: '#57534e' }, hitMeta);
          this.drawBox3D(ctx, cam, 346, 62, 396, 106, 14, 28, { front: '#e5ded0', side: '#cfc6b5', top: '#ece6da', stroke: '#78716c' }, hitMeta);
          // Bronze allegorical relief frieze band around plinth
          this.drawPoly3D(ctx, cam, [[348, 106.4, 17], [394, 106.4, 17], [394, 106.4, 25], [348, 106.4, 25]], '#4a5d4e', '#1e293b', 1.2);
          // Tall fluted Lioz limestone pedestal shaft
          this.drawBox3D(ctx, cam, 360, 72, 382, 96, 28, 84, { front: '#f5efe2', side: '#ded6c6', top: '#cbd5e1', stroke: hl ? '#facc15' : '#57534e', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          for (const fx of [365, 371, 377]) {
            this.drawLine3D(ctx, cam, [fx, 96.3, 30], [fx, 96.3, 82], '#b5a895', 1.2);
          }
          // Sculpted bronze statue of Marques de Pombal & crouching lion projected cleanly at summit!
          const stFoot = this.projectWorldPt(cam, 371, 84, 84);
          const stHead = this.projectWorldPt(cam, 371, 84, 106);
          if (stFoot && stHead) {
            const sh = Math.max(12, stFoot.y - stHead.y);
            ctx.save();
            ctx.fillStyle = '#365314';
            ctx.strokeStyle = '#1a2e05';
            ctx.lineWidth = 1.4;
            // Cloak & figure silhouette
            ctx.beginPath();
            ctx.moveTo(stFoot.x - sh * 0.24, stFoot.y);
            ctx.lineTo(stFoot.x - sh * 0.14, stHead.y + sh * 0.24);
            ctx.lineTo(stFoot.x + sh * 0.16, stHead.y + sh * 0.24);
            ctx.lineTo(stFoot.x + sh * 0.22, stFoot.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Outstretched pointing arm & head
            ctx.beginPath();
            ctx.arc(stFoot.x, stHead.y + sh * 0.14, sh * 0.12, 0, Math.PI * 2);
            ctx.fill();
            // Lion at his side
            ctx.fillStyle = '#4d7c0f';
            ctx.fillRect(stFoot.x + sh * 0.16, stFoot.y - sh * 0.26, sh * 0.26, sh * 0.26);
            ctx.restore();
          }
          // Authentic yellow Carris Elevador do Lavra (1884) hillside funicular car beside the rotunda
          drawCarrisTram3D(414, 76, 480, 112, 0, 34, 'LAVRA 1884', hitMeta);
        } else if (style === 'rato-aqueduct') {
          // 1746 Mae d Agua das Amoreiras stone water hall + pointed Aqueduto das Aguas Livres arches + Eletrico 24E
          this.drawBox3D(ctx, cam, 288, 42, 408, 106, 0, 74, { front: '#dfd7c8', side: '#cbc1b0', top: '#94a3b8', stroke: hl ? '#facc15' : '#57534e', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          for (const ax of [302, 338, 374]) {
            this.drawPoly3D(ctx, cam, [[ax, 106.4, 0], [ax + 24, 106.4, 0], [ax + 24, 106.4, 42], [ax + 12, 106.4, 54], [ax, 106.4, 42]], '#0284c7', '#475569', 1.4);
          }
          drawCarrisTram3D(416, 76, 480, 112, 0, 34, '24E RATO', hitMeta);
        } else if (style === 'campo-pequeno') {
          // 1892 Praca do Campo Pequeno Neo-Moorish Red-Brick Rotunda with Horseshoe Arcades & Twin Onion-Domed Towers
          this.drawBox3D(ctx, cam, 296, 44, 464, 112, 0, 68, { front: '#b91c1c', side: '#991b1b', top: '#7f1d1d', stroke: hl ? '#facc15' : '#450a0a', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          // White limestone Neo-Moorish stringcourses & golden horseshoe arch windows
          this.drawPoly3D(ctx, cam, [[296, 112.3, 34], [464, 112.3, 34], [464, 112.3, 38], [296, 112.3, 38]], '#fef3c7');
          for (const ax of [314, 344, 374, 404, 434]) {
            this.drawPoly3D(ctx, cam, [[ax, 112.4, 6], [ax + 18, 112.4, 6], [ax + 18, 112.4, 24], [ax + 9, 112.4, 30], [ax, 112.4, 24]], '#450a0a', '#fde047', 1.2);
            this.drawPoly3D(ctx, cam, [[ax, 112.4, 42], [ax + 18, 112.4, 42], [ax + 18, 112.4, 56], [ax + 9, 112.4, 62], [ax, 112.4, 56]], '#fde68a', '#7f1d1d', 1.2);
          }
          // Twin corner octagonal towers topped with dark metallic onion domes
          for (const tx of [300, 428]) {
            this.drawBox3D(ctx, cam, tx, 54, tx + 32, 114, 68, 90, { front: '#c2410c', side: '#9a3412', top: '#334155', stroke: '#fde047' }, hitMeta);
            const dPt = this.projectWorldPt(cam, tx + 16, 84, 96);
            if (dPt) {
              const r = clamp((13 * this.focal) / dPt.cz, 6, 22);
              ctx.fillStyle = '#334155';
              ctx.beginPath();
              ctx.arc(dPt.x, dPt.y, r, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#fde047';
              ctx.lineWidth = 1.6;
              ctx.stroke();
            }
          }
        } else if (style === 'gulbenkian-zoo') {
          // Gulbenkian Modernist Cantilevered Concrete Pavilion with Glass Curtain Wall, Pond & Sete Rios Zoo Teleferico Cable Car
          this.drawBox3D(ctx, cam, 294, 48, 466, 108, 0, 52, { front: '#cbd5e1', side: '#94a3b8', top: '#15803d', stroke: hl ? '#facc15' : '#334155', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          this.drawPoly3D(ctx, cam, [[304, 108.4, 8], [456, 108.4, 8], [456, 108.4, 40], [304, 108.4, 40]], '#0f172a', '#38bdf8', 1.4);
          for (const cx of [336, 380, 424]) {
            this.drawLine3D(ctx, cam, [cx, 108.6, 8], [cx, 108.6, 40], '#cbd5e1', 2);
          }
          // Overhead Zoo Teleferico twin steel cables & swaying basket cabin
          this.drawLine3D(ctx, cam, [282, 92, 88], [478, 92, 88], '#334155', 2.2);
          const basketX = 356 + Math.sin(animTime * 1.1) * 44;
          this.drawLine3D(ctx, cam, [basketX, 92, 88], [basketX, 92, 76], '#1e293b', 2);
          this.drawBox3D(ctx, cam, basketX - 13, 85, basketX + 13, 99, 60, 76, { front: '#2563eb', side: '#1d4ed8', top: '#fde047', stroke: '#ffffff' }, hitMeta);
        } else if (style === 'campo-grande-university') {
          // Reitoria da Universidade de Lisboa Classical Colonnade & Pediment + Campo Grande Park Trees
          this.drawBox3D(ctx, cam, 294, 44, 466, 110, 0, 72, { front: '#f8fafc', side: '#e2e8f0', top: '#0f766e', stroke: hl ? '#facc15' : '#1e3a8a', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          this.drawPoly3D(ctx, cam, [[296, 110.4, 62], [464, 110.4, 62], [380, 110.4, 86]], '#e2e8f0', '#1e3a8a', 1.5);
          for (const cx of [314, 346, 380, 414, 446]) {
            this.drawBox3D(ctx, cam, cx - 5, 106, cx + 5, 113, 0, 60, { front: '#f1f5f9', side: '#cbd5e1', top: '#94a3b8', stroke: '#64748b' }, hitMeta);
          }
        } else if (style === 'alameda-fountain') {
          // 1948 Monumental Fonte Luminosa Limestone Portico Backdrop, Reflecting Basin & Cascading Water Arcs
          this.drawBox3D(ctx, cam, 292, 42, 468, 72, 0, 64, { front: '#f1f5f9', side: '#cbd5e1', top: '#94a3b8', stroke: '#64748b' }, hitMeta);
          for (const nx of [314, 366, 418]) {
            this.drawPoly3D(ctx, cam, [[nx, 72.4, 16], [nx + 28, 72.4, 16], [nx + 28, 72.4, 52], [nx, 72.4, 52]], '#cbd5e1', '#475569', 1.2);
          }
          this.drawBox3D(ctx, cam, 294, 72, 466, 114, 0, 18, { front: '#e2e8f0', side: '#cbd5e1', top: '#0284c7', stroke: hl ? '#facc15' : '#475569', lineWidth: hl ? 2.4 : 1.4 }, hitMeta);
          for (const jx of [324, 352, 380, 408, 436]) {
            const jetH = (jx === 380 ? 92 : 74) + Math.sin(animTime * 5 + jx) * 6;
            this.drawLine3D(ctx, cam, [jx, 90, 18], [jx, 90, jetH], '#e0f2fe', 3.2);
          }
        } else {
          // Gare do Oriente (Santiago Calatrava 1998 OPEN soaring white steel gothic tree-arches against Tagus sky!) & Telecabine Lisboa
          // Low concrete station concourse platform base (leaving upper canopy open so Tagus & Ponte Vasco da Gama shine through!)
          this.drawBox3D(ctx, cam, 290, 46, 470, 112, 0, 16, { front: '#cbd5e1', side: '#94a3b8', top: '#e2e8f0', stroke: '#475569' }, hitMeta);
          // Translucent sky-blue steel-and-glass Oceanario pavilion recessed on left
          this.drawBox3D(ctx, cam, 294, 48, 356, 84, 16, 44, { front: '#0ea5e9', side: '#0284c7', top: '#e0f2fe', stroke: '#0369a1' }, hitMeta);
          // Soaring Santiago Calatrava white steel gothic palm-tree columns & intersecting glass-canopy arches!
          for (const ax of [320, 380, 440]) {
            // Vertical sculpted white steel trunk
            this.drawBox3D(ctx, cam, ax - 3.5, 92, ax + 3.5, 100, 16, 48, { front: '#ffffff', side: '#e2e8f0', top: '#f8fafc', stroke: '#94a3b8' }, hitMeta);
            // Branching gothic steel ribs radiating upward to form iconic Expo 98 tree canopy
            for (const dx of [-28, -16, 0, 16, 28]) {
              this.drawLine3D(ctx, cam, [ax, 96, 44], [ax + dx, 96, 86], '#ffffff', 2.8);
              this.drawLine3D(ctx, cam, [ax, 96, 44], [ax + dx, 96, 86], '#94a3b8', 1.1);
            }
            // Translucent glass palm canopy crown
            this.drawPoly3D(
              ctx,
              cam,
              [[ax - 29, 95, 84], [ax + 29, 95, 84], [ax + 22, 95, 90], [ax - 22, 95, 90]],
              'rgba(224, 242, 254, 0.72)',
              hl ? '#facc15' : '#38bdf8',
              hl ? 2.2 : 1.4
            );
          }
          // Continuous glazed canopy roof tie beam linking all 3 Calatrava trees
          this.drawLine3D(ctx, cam, [292, 96, 86], [468, 96, 86], '#ffffff', 3);
          // Telecabine Lisboa aerial riverfront gondola cable + red-and-silver glazed cabin gliding across!
          this.drawLine3D(ctx, cam, [278, 104, 102], [482, 104, 102], '#334155', 2.2);
          const gondX = 398 + Math.sin(animTime * 1.2) * 34;
          this.drawLine3D(ctx, cam, [gondX, 104, 102], [gondX, 104, 88], '#1e293b', 2.2);
          this.drawBox3D(ctx, cam, gondX - 15, 98, gondX + 15, 110, 72, 88, { front: '#dc2626', side: '#b91c1c', top: '#f8fafc', stroke: '#fde047', lineWidth: 1.5 }, hitMeta);
          this.drawPoly3D(ctx, cam, [[gondX - 11, 110.3, 77], [gondX + 11, 110.3, 77], [gondX + 11, 110.3, 85], [gondX - 11, 110.3, 85]], '#bae6fd', '#0f172a', 1);
        }

        const lp = this.projectWorldPt(cam, 380, 114, 24);
        if (lp) {
          ctx.save();
          ctx.font = '700 9px "Segoe UI", sans-serif';
          const txt = `${landmark.name.toUpperCase()} [REST +25]`;
          const tw = ctx.measureText(txt).width + 12;
          drawRoundedRect(ctx, lp.x - tw * 0.5, lp.y - 9, tw, 18, 4);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.stroke();
          ctx.fillStyle = '#fef3c7';
          ctx.textAlign = 'center';
          ctx.fillText(txt, lp.x, lp.y + 3.5);
          ctx.restore();
        }
      }
    });

    // C) Right 3D District Cultural Shop / Boutique (x: 516..704, y: 24..116)
    items.push({
      dist: Math.hypot(610 - cam.camX, 92 - cam.camY),
      draw: () => {
        const hl = nearbyInteraction?.type === 'city-district-spot' && nearbyInteraction.spotId === shop.id;
        const accent = secondaryLineColor || primaryLineColor;
        this.drawBox3D(
          ctx,
          cam,
          516,
          24,
          704,
          116,
          0,
          76,
          { front: '#eaf2fb', side: '#dbe4ec', top: '#a8442a', stroke: hl ? '#facc15' : '#1e3a5f', lineWidth: hl ? 2.4 : 1.3 },
          { kind: 'city-district-spot', spotId: shop.id }
        );
        this.drawPoly3D(ctx, cam, [[516, 116.2, 70], [704, 116.2, 70], [704, 116.2, 76], [516, 116.2, 76]], '#a8442a');
        this.drawPoly3D(ctx, cam, [[516, 116.2, 0], [704, 116.2, 0], [704, 116.2, 10], [516, 116.2, 10]], accent);
        for (const wx of [540, 594, 648]) {
          this.drawPoly3D(ctx, cam, [[wx, 116.4, 46], [wx + 28, 116.4, 46], [wx + 28, 116.4, 65], [wx, 116.4, 65]], isEvening ? '#fde68a' : '#2c4159', '#475569', 1.2);
          this.drawLine3D(ctx, cam, [wx - 2, 117.2, 46], [wx + 30, 117.2, 46], '#0f172a', 1.6);
        }
        this.drawPoly3D(ctx, cam, [[593, 116.5, 0], [627, 116.5, 0], [627, 116.5, 29], [593, 116.5, 29]], '#5c3a21', '#2d1a0f', 1.4);
        this.drawPoly3D(ctx, cam, [[534, 116.5, 10], [578, 116.5, 10], [578, 116.5, 27], [534, 116.5, 27]], '#fff7ed', '#1e3a5f', 1.2);
        this.drawPoly3D(ctx, cam, [[642, 116.5, 10], [686, 116.5, 10], [686, 116.5, 27], [642, 116.5, 27]], '#fff7ed', '#1e3a5f', 1.2);
        const sp = this.projectWorldPt(cam, 610, 117, 40);
        if (sp) {
          ctx.save();
          ctx.font = '700 9.5px Georgia, serif';
          const txt = shop.name.toUpperCase();
          const tw = ctx.measureText(txt).width + 12;
          drawRoundedRect(ctx, sp.x - tw * 0.5, sp.y - 9, tw, 18, 4);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(txt, sp.x, sp.y + 3.5);
          ctx.restore();
        }
      }
    });

    // D) South 3D Metropolitano de Lisboa Entrance Canopy & Red Diamond M Totem (y = 308..364, clickable to descend into Metro!)
    items.push({
      dist: Math.hypot(380 - cam.camX, 336 - cam.camY),
      draw: () => {
        const hitMeta = { kind: 'city-district-metro', stationId: station.id };
        this.drawBox3D(
          ctx,
          cam,
          286,
          312,
          474,
          368,
          0,
          44,
          { front: '#1e293b', back: '#0f172a', side: '#334155', top: primaryLineColor, stroke: '#fde047', lineWidth: 1.5 },
          hitMeta
        );
        this.drawPoly3D(ctx, cam, [[326, 311.5, 0], [434, 311.5, 0], [434, 311.5, 34], [326, 311.5, 34]], '#090d16', '#38bdf8', 1.6);
        const mp = this.projectWorldPt(cam, 380, 310, 56);
        if (mp) {
          ctx.save();
          ctx.font = '700 10.5px "Segoe UI", sans-serif';
          const lbl = `DESCEND INTO ${station.name.toUpperCase()} [E]`;
          const tw = ctx.measureText(lbl).width + 34;
          drawRoundedRect(ctx, mp.x - tw * 0.5, mp.y - 11, tw, 22, 5);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.strokeStyle = primaryLineColor;
          ctx.lineWidth = 1.8;
          ctx.stroke();
          // Red diamond M emblem
          const dX = mp.x - tw * 0.5 + 14;
          const dY = mp.y;
          ctx.fillStyle = '#c81e32';
          ctx.beginPath();
          ctx.moveTo(dX, dY - 7);
          ctx.lineTo(dX + 7, dY);
          ctx.lineTo(dX, dY + 7);
          ctx.lineTo(dX - 7, dY);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(lbl, mp.x + 8, mp.y + 4);
          ctx.restore();
        }
      }
    });

    // Strolling 3D Lisbon district local resident
    const localX = 270 + Math.sin(animTime * 0.55) * 65;
    items.push({
      dist: Math.hypot(localX - cam.camX, 230 - cam.camY),
      draw: () => this.drawPersonSprite3D(ctx, cam, {
        x: localX,
        y: 230,
        outfitId: 'fado-blazer',
        walkPhase: animTime * 3.8,
        isMoving: true
      })
    });

    // Connected LAN peers sharing the same city district plaza in 3D
    const peersHere = (state.remotePlayers || []).filter(
      (rp) => rp.mode === 'city-district' && rp.cityDistrictId === district.id
    );
    for (const rp of peersHere) {
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

    items.sort((a, b) => b.dist - a.dist);
    for (const it of items) it.draw();

    // Render foreground 3D Glass (for drinks) or 3D Plate (for food) tray when dining in the city district!
    const activeAct = state.indoorActivity && state.indoorActivity.venueId ? state.indoorActivity : null;
    const seatedMeal = state.seatedDining && state.seatedDining.active ? state.seatedDining : null;
    if (seatedMeal || activeAct) {
      this.drawIndoorActionOutcome3D(
        ctx,
        state,
        { name: district.name, interiorTheme: { layout: 'cafe' }, memory: { neighborhood: district.shortName } },
        activeAct,
        seatedMeal,
        nearbyInteraction,
        animTime
      );
    }

    const districtPois = [
      { x: 155, y: 186, color: '#f59e0b' },
      { x: 380, y: 186, color: '#facc15' },
      { x: 605, y: 186, color: '#a78bfa' },
      { x: 380, y: 274, color: primaryLineColor },
      ...walkingAvenues.map((av) => ({ x: av.x, y: av.y, color: '#38bdf8' }))
    ];

    this.drawSceneHud(
      ctx,
      cam,
      `3D LISBOA  -  ${district.shortName.toUpperCase()}`,
      `${district.zoneBadge}  |  ${walkingAvenues.length} Walkable Avenues & Metro`,
      {
        floorRect: { x: 48, y: 148, w: 664, h: 138 },
        floorColor: 'rgba(226, 218, 202, 0.28)',
        px: state.player.x,
        py: state.player.y,
        peers: peersHere,
        pois: districtPois
      }
    );
  }

  // =========================================================================
  // 4B. CONTINUOUS LISBON AVENUE WALKING STROLL TRANSITION (INTER-DISTRICT FOOT TRAVEL)
  // =========================================================================
  renderCityAvenueWalk3D(ctx, state, animTime = 0) {
    this.lastHitTargets = [];
    const cw = state.cityWalk;
    if (!cw || !cw.active) return;
    const phase = getDayPhase(state.minutesOfDay);
    const monthInfo = getMonthInfo(state.month);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const isJacaranda = (monthInfo.jacarandaBloom || 0) >= 0.4;
    const w = this.viewWidth;
    const h = this.viewHeight;
    const vpX = w * 0.5;
    const hy = Math.round(h * 0.44);
    const p = clamp(cw.progress || 0, 0, 1);
    const style = cw.sceneryStyle || 'grand-boulevard';

    // 1. Dynamic Lisbon Sky
    const sky = ctx.createLinearGradient(0, 0, 0, hy + 8);
    if (isEvening) {
      sky.addColorStop(0, '#09152e');
      sky.addColorStop(1, '#263d66');
    } else if (isGolden) {
      sky.addColorStop(0, '#36588f');
      sky.addColorStop(0.58, '#db8556');
      sky.addColorStop(1, '#fde68a');
    } else {
      sky.addColorStop(0, '#1d5eb8');
      sky.addColorStop(0.65, '#60b8f0');
      sky.addColorStop(1, '#e0f2fe');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hy + 8);

    // Distant Lisbon Seven Hills silhouette gently rising behind the boulevard horizon
    ctx.fillStyle = isEvening ? '#182846' : isGolden ? '#9f7666' : '#7b99a8';
    ctx.beginPath();
    ctx.moveTo(0, hy + 2);
    ctx.quadraticCurveTo(w * 0.22, hy - 34, w * 0.42, hy - 14);
    ctx.quadraticCurveTo(w * 0.68, hy - 40, w, hy - 10);
    ctx.lineTo(w, hy + 2);
    ctx.closePath();
    ctx.fill();

    // 2. Perspective Lisbon Avenue & Calçada Portuguesa Promenade floor
    ctx.fillStyle = isEvening ? '#273142' : '#d8cfc0';
    ctx.fillRect(0, hy, w, h - hy);

    // Central receding Calçada Portuguesa pedestrian promenade
    ctx.fillStyle = isEvening ? '#3c4557' : '#ebe4d6';
    ctx.beginPath();
    ctx.moveTo(vpX - 64, hy);
    ctx.lineTo(vpX + 64, hy);
    ctx.lineTo(w * 0.86, h);
    ctx.lineTo(w * 0.14, h);
    ctx.closePath();
    ctx.fill();

    // Animated basalt wave seams scrolling toward you with natural footsteps!
    const bob = Math.sin(animTime * 11) * 2.5;
    const tileShift = (animTime * 2.6) % 1;
    for (let i = 0; i < 10; i += 1) {
      const t = ((i + tileShift) % 10) / 10;
      const depth = t * t;
      const sy = hy + 6 + depth * (h - hy - 6) + bob * depth;
      const hw = 64 + depth * (w * 0.36 - 64);
      ctx.strokeStyle = isEvening ? 'rgba(15, 23, 42, 0.45)' : 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1.2 + depth * 2;
      ctx.beginPath();
      ctx.moveTo(vpX - hw, sy);
      ctx.lineTo(vpX + hw, sy);
      ctx.stroke();
    }

    // 3. Left & Right Scenery (Tagus Riverfront OR Grand Pombaline Lisbon Facades & Blooming Trees!)
    if (style === 'waterfront-avenue') {
      // Shimmering Tagus River along the right side of Avenida 24 de Julho / Infante Dom Henrique
      ctx.fillStyle = isEvening ? '#0f2744' : '#1b769c';
      ctx.beginPath();
      ctx.moveTo(vpX + 64, hy);
      ctx.lineTo(w, hy);
      ctx.lineTo(w, h);
      ctx.lineTo(w * 0.86, h);
      ctx.closePath();
      ctx.fill();
    }

    const wallColors = ['#f5e9d4', '#e8d0c8', '#dce8e3', '#f2dcb4', '#ede4d5'];
    for (let i = 0; i < 6; i += 1) {
      const t = ((i + (animTime * 1.4) % 1) % 6) / 6;
      const depth = t * t;
      const scale = 0.2 + depth * 1.15;
      const bh = 165 * scale;
      const bw = 96 * scale;
      const baseY = hy + 8 + depth * (h - hy) + bob * depth;

      // Left Lisbon Pombaline facade (or green park hedge) with shuttered windows & balconies
      const lx = vpX - 66 - depth * (w * 0.38);
      if (style === 'park-boulevard') {
        ctx.fillStyle = isEvening ? '#14532d' : '#16a34a';
        ctx.fillRect(lx - bw, baseY - bh * 0.52, bw, bh * 0.52);
      } else {
        ctx.fillStyle = shadeColor(wallColors[i % wallColors.length], isEvening ? 0.55 : 0.96);
        ctx.fillRect(lx - bw, baseY - bh, bw, bh);
        ctx.fillStyle = '#b84a32';
        ctx.fillRect(lx - bw - 3, baseY - bh - 8 * scale, bw + 6, 10 * scale);
        const winCol = isEvening ? '#fde68a' : '#2c4159';
        for (let row = 0; row < 2; row += 1) {
          for (let col = 0; col < 2; col += 1) {
            const wx = lx - bw + bw * (0.18 + col * 0.44);
            const wy = baseY - bh * (0.78 - row * 0.32);
            ctx.fillStyle = winCol;
            ctx.fillRect(wx, wy, bw * 0.22, bh * 0.18);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = Math.max(0.8, 1.2 * scale);
            ctx.strokeRect(wx - 1.5 * scale, wy + bh * 0.12, bw * 0.22 + 3 * scale, bh * 0.06);
          }
        }
      }

      // Right side: Lisbon facade OR riverside trees
      const rx = vpX + 66 + depth * (w * 0.38);
      if (style !== 'waterfront-avenue') {
        if (style === 'park-boulevard') {
          ctx.fillStyle = isEvening ? '#14532d' : '#15803d';
          ctx.fillRect(rx, baseY - bh * 0.52, bw, bh * 0.52);
        } else {
          ctx.fillStyle = shadeColor(wallColors[(i + 2) % wallColors.length], isEvening ? 0.52 : 0.94);
          ctx.fillRect(rx, baseY - bh, bw, bh);
          ctx.fillStyle = '#b84a32';
          ctx.fillRect(rx - 3, baseY - bh - 8 * scale, bw + 6, 10 * scale);
          const winCol = isEvening ? '#fde68a' : '#2c4159';
          for (let row = 0; row < 2; row += 1) {
            for (let col = 0; col < 2; col += 1) {
              const wx = rx + bw * (0.18 + col * 0.44);
              const wy = baseY - bh * (0.78 - row * 0.32);
              ctx.fillStyle = winCol;
              ctx.fillRect(wx, wy, bw * 0.22, bh * 0.18);
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = Math.max(0.8, 1.2 * scale);
              ctx.strokeRect(wx - 1.5 * scale, wy + bh * 0.12, bw * 0.22 + 3 * scale, bh * 0.06);
            }
          }
        }
      }

      // Flanking Jacaranda / plane street trees & wrought-iron Lisbon streetlamps
      const treeCol = isJacaranda ? '#8b5cf6' : isEvening ? '#1e3a2f' : '#2f7349';
      for (const tx of [lx - 6 * scale, rx + 6 * scale]) {
        ctx.fillStyle = '#5c3d28';
        ctx.fillRect(tx - 3 * scale, baseY - 46 * scale, 6 * scale, 46 * scale);
        ctx.fillStyle = treeCol;
        ctx.beginPath();
        ctx.arc(tx, baseY - 56 * scale, 22 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Authentic Blue-and-White Azulejo Lisbon Street Banner at Top
    const fromName = getLisboaZoneShortName(cw.fromZoneId);
    const toName = getLisboaZoneShortName(cw.toZoneId);
    const walkedM = Math.round((cw.distanceMeters || 800) * p);
    const distLabel = cw.distanceMeters >= 1000 ? `${(cw.distanceMeters / 1000).toFixed(1)} km` : `${cw.distanceMeters} m`;

    drawRoundedRect(ctx, 130, 18, w - 260, 74, 8);
    ctx.fillStyle = '#faf8f3';
    ctx.fill();
    ctx.strokeStyle = '#1b4d89';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(27, 77, 137, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(136, 24, w - 272, 62);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#14375f';
    ctx.font = '700 13.5px Georgia, serif';
    ctx.fillText(`WALKING ALONG ${cw.avenueName.toUpperCase()}`, vpX, 44, w - 296);
    ctx.fillStyle = '#2563eb';
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.fillText(`${fromName}  ->  ${toName}   |   ${walkedM}m / ${distLabel} (~${cw.walkMinutes} min on foot)`, vpX, 64, w - 296);

    // Smooth walking progress bar
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(220, 74, w - 440, 7);
    ctx.fillStyle = '#1b4d89';
    ctx.fillRect(220, 74, Math.round((w - 440) * p), 7);
    ctx.textAlign = 'left';
  }

  // =========================================================================
  // 5. ELEVADOR DE SANTA JUSTA (1902): LOBBY, 45M VERTICAL CLIMB & FACTUAL 360 LISBON PANORAMA
  // =========================================================================
  renderSantaJusta3D(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const sj = state.santaJusta || { phase: 'lobby', altitudeMeters: 0, phaseProgress: 0 };
    const phase = getDayPhase(state.minutesOfDay);
    const monthInfo = getMonthInfo(state.month);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const isRainy = (monthInfo.rainIntensity || 0) >= 0.45;
    const isJacaranda = (monthInfo.jacarandaBloom || 0) >= 0.4;
    const w = this.viewWidth;
    const h = this.viewHeight;

    // -----------------------------------------------------------------------
    // A) GROUND-FLOOR 1902 NEO-GOTHIC LOBBY & MAHOGANY WOOD-PANELED CABIN
    // -----------------------------------------------------------------------
    if (sj.phase === 'lobby') {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#17202d');
      bg.addColorStop(0.55, '#253142');
      bg.addColorStop(1, '#121822');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Ornate Neo-Gothic cast-iron arched lobby ribs framing the wooden lift cabin
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i += 1) {
        const pad = 26 + i * 28;
        ctx.beginPath();
        ctx.moveTo(pad, h);
        ctx.lineTo(pad, 132 + i * 14);
        ctx.quadraticCurveTo(w * 0.5, 16 + i * 24, w - pad, 132 + i * 14);
        ctx.lineTo(w - pad, h);
        ctx.stroke();
      }

      // Checkered Baixa limestone-and-basalt lobby floor
      ctx.fillStyle = '#d6cfc2';
      ctx.fillRect(110, h - 108, w - 220, 108);
      ctx.fillStyle = '#334155';
      for (let rx = 120; rx < w - 120; rx += 56) {
        ctx.beginPath();
        ctx.moveTo(rx + 28, h - 96);
        ctx.lineTo(rx + 50, h - 60);
        ctx.lineTo(rx + 28, h - 24);
        ctx.lineTo(rx + 6, h - 60);
        ctx.closePath();
        ctx.fill();
      }

      // Polished Brazilian Mahogany & Brass 1902 Vertical Lift Cabin (clickable to ascend!)
      const cabX = 240;
      const cabY = 122;
      const cabW = 440;
      const cabH = 336;
      const cabPoly = [
        { x: cabX, y: cabY },
        { x: cabX + cabW, y: cabY },
        { x: cabX + cabW, y: cabY + cabH },
        { x: cabX, y: cabY + cabH }
      ];
      this.lastHitTargets.push({ kind: 'santa-justa-ascend', poly: cabPoly });

      // Rich varnished mahogany wooden exterior surround
      const woodGrad = ctx.createLinearGradient(cabX, cabY, cabX + cabW, cabY + cabH);
      woodGrad.addColorStop(0, '#6b2f17');
      woodGrad.addColorStop(0.5, '#8c3f20');
      woodGrad.addColorStop(1, '#4c1f0e');
      drawRoundedRect(ctx, cabX, cabY, cabW, cabH, 10);
      ctx.fillStyle = woodGrad;
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Open glowing cabin interior with beveled mirror, brass handrails & warm globe chandelier
      drawRoundedRect(ctx, cabX + 54, cabY + 42, cabW - 108, cabH - 54, 6);
      const innerGrad = ctx.createLinearGradient(0, cabY + 42, 0, cabY + cabH);
      innerGrad.addColorStop(0, '#fef3c7');
      innerGrad.addColorStop(0.35, '#9a4d22');
      innerGrad.addColorStop(1, '#431d0c');
      ctx.fillStyle = innerGrad;
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Beveled vintage mirror & wood wainscoting slats inside cabin
      ctx.fillStyle = 'rgba(186, 230, 253, 0.36)';
      ctx.fillRect(cabX + 128, cabY + 76, cabW - 256, 118);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(cabX + 128, cabY + 76, cabW - 256, 118);

      // Warm milk-glass globe lamp glowing at cabin ceiling
      const lampGrad = ctx.createRadialGradient(w * 0.5, cabY + 62, 4, w * 0.5, cabY + 62, 46);
      lampGrad.addColorStop(0, '#ffffff');
      lampGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.85)');
      lampGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = lampGrad;
      ctx.beginPath();
      ctx.arc(w * 0.5, cabY + 62, 46, 0, Math.PI * 2);
      ctx.fill();

      // Polished horizontal brass safety handrail across cabin rear wall
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cabX + 76, cabY + 214, cabW - 152, 7);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cabX + 76, cabY + 214, cabW - 152, 2.5);

      // Authentic Semicircular Brass Elevation Indicator Dial above cabin door (0m -> 45m)
      const dialCx = w * 0.5;
      const dialCy = cabY + 2;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(dialCx, dialCy, 56, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('0m', dialCx - 40, dialCy - 8);
      ctx.fillText('22m', dialCx, dialCy - 38);
      ctx.fillText('45m', dialCx + 38, dialCy - 8);
      // Brass pointer resting at 0m
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(dialCx, dialCy - 4);
      ctx.lineTo(dialCx - 34, dialCy - 18);
      ctx.stroke();

      // Lift Operator Jorge standing politely beside the left entrance post of the 1902 cabin (never obscured by plaque!)
      const opX = cabX - 46;
      const opY = cabY + cabH - 36;
      ctx.fillStyle = '#1e3a5f';
      drawRoundedRect(ctx, opX - 18, opY - 54, 36, 62, 8);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(opX - 3, opY - 48, 6, 42);
      ctx.fillStyle = '#f1cbb0';
      ctx.beginPath();
      ctx.arc(opX, opY - 68, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(opX - 16, opY - 84, 32, 9);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(opX - 13, opY - 76, 26, 3);
      // Small operator nameplate
      drawRoundedRect(ctx, opX - 34, opY + 14, 68, 18, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 8.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JORGE (CARRIS)', opX, opY + 26);

      // Call-to-action brass boarding plaque inside cabin
      drawRoundedRect(ctx, w * 0.5 - 156, cabY + 250, 312, 46, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = '700 12px Georgia, serif';
      ctx.fillText('BOARD CABIN -> 45m MIRADOURO [E]', w * 0.5, cabY + 271);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 10px "Segoe UI", sans-serif';
      ctx.fillText(`Raoul Mesnier du Ponsard (1902)  |  ${SANTA_JUSTA_LIFT.fareEur.toFixed(2)} EUR`, w * 0.5, cabY + 288);

      // Top header banner
      drawRoundedRect(ctx, 170, 14, 580, 48, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px Georgia, serif';
      ctx.fillText('ELEVADOR DE SANTA JUSTA (1902)  -  GROUND LOBBY (0m)', w * 0.5, 35, 556);
      ctx.fillStyle = '#bae6fd';
      ctx.font = '600 10px "Segoe UI", sans-serif';
      ctx.fillText('Click Mahogany Cabin or Press [E] to Ascend 45m for a 360-Degree View of Lisboa  |  [Esc] Exit', w * 0.5, 53, 556);
      ctx.textAlign = 'left';
      return;
    }

    // -----------------------------------------------------------------------
    // B) ANIMATED 45M VERTICAL LIFT RIDE THROUGH THE NEO-GOTHIC IRON SHAFT
    // -----------------------------------------------------------------------
    if (sj.phase === 'ascending' || sj.phase === 'descending') {
      const alt = clamp(sj.altitudeMeters || 0, 0, 45);
      const frac = alt / 45; // 0 = street level, 1 = 45m summit!

      // Outside Lisbon sky & rising view of Baixa rooftops + Castelo de Sao Jorge as cabin climbs!
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      if (isEvening) {
        sky.addColorStop(0, '#0a1630');
        sky.addColorStop(0.65, '#1e355c');
        sky.addColorStop(1, '#31446b');
      } else if (isGolden) {
        sky.addColorStop(0, '#36588f');
        sky.addColorStop(0.55, '#db8556');
        sky.addColorStop(1, '#fde68a');
      } else {
        sky.addColorStop(0, '#1d5eb8');
        sky.addColorStop(0.6, '#6cbdf0');
        sky.addColorStop(1, '#e0f2fe');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // As altitude rises (frac 0 -> 1), Castelo hill and Baixa terracotta roofs sink downward revealing wider city!
      const cityBaseY = Math.round(h * 0.36 + frac * 175);
      // Distant Castelo de Sao Jorge hill rising cleanly into view once cabin clears surrounding eaves
      ctx.fillStyle = isEvening ? '#1a2844' : '#597462';
      ctx.beginPath();
      ctx.moveTo(0, cityBaseY + 20);
      ctx.quadraticCurveTo(w * 0.3, cityBaseY - 72, w * 0.55, cityBaseY - 82);
      ctx.quadraticCurveTo(w * 0.82, cityBaseY - 64, w, cityBaseY + 20);
      ctx.closePath();
      ctx.fill();
      // Castle silhouette crowning the hill
      ctx.fillStyle = isEvening ? '#a18a62' : '#d6c7ad';
      ctx.fillRect(w * 0.44, cityBaseY - 102, 128, 28);
      for (const tx of [0, 32, 66, 98]) {
        ctx.fillRect(w * 0.44 + tx, cityBaseY - 116, 20, 20);
      }

      // Baixa Pombalina terracotta rooftops descending below as cabin climbs 0m -> 45m!
      for (let row = 0; row < 4; row += 1) {
        const ry = cityBaseY - 24 + row * 48;
        for (let bx = 90; bx < w - 90; bx += 92) {
          ctx.fillStyle = row % 2 === 0 ? '#e6d8c3' : '#f1d9b8';
          ctx.fillRect(bx, ry + 14, 82, 42);
          ctx.fillStyle = isEvening ? '#7c3424' : '#b84a32';
          ctx.beginPath();
          ctx.moveTo(bx - 4, ry + 16);
          ctx.lineTo(bx + 10, ry);
          ctx.lineTo(bx + 72, ry);
          ctx.lineTo(bx + 86, ry + 16);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Riveted Neo-Gothic Cast-Iron Lattice Girders scrolling downward past the cabin windows!
      const girderSpacing = 124;
      const scrollY = (alt * 28) % girderSpacing;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 7;
      for (let gy = -girderSpacing + scrollY; gy < h + girderSpacing; gy += girderSpacing) {
        ctx.beginPath();
        ctx.moveTo(116, gy);
        ctx.lineTo(w - 116, gy);
        ctx.stroke();
        // Gothic X-lattice & pointed iron arch between floors
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.78)';
        ctx.beginPath();
        ctx.moveTo(130, gy);
        ctx.lineTo(w - 130, gy + girderSpacing);
        ctx.moveTo(w - 130, gy);
        ctx.lineTo(130, gy + girderSpacing);
        ctx.stroke();
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#1e293b';
      }

      // Foreground 1902 Mahogany Wood Cabin Window Frame & Brass Handrails
      const hum = Math.sin(animTime * 16) * 0.9;
      ctx.save();
      ctx.translate(0, hum);
      ctx.fillStyle = '#5c2612';
      ctx.fillRect(0, 0, w, 78);
      ctx.fillRect(0, 0, 122, h);
      ctx.fillRect(w - 122, 0, 122, h);
      ctx.fillRect(0, h - 102, w, 102);
      // Center mahogany vertical window mullion posts
      for (const mx of [356, 564]) {
        ctx.fillStyle = '#6b2f17';
        ctx.fillRect(mx - 8, 76, 16, h - 176);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(mx - 2, 76, 4, h - 176);
      }
      // Brass interior cabin rail
      ctx.fillStyle = '#eab308';
      ctx.fillRect(122, h - 108, w - 244, 9);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(122, h - 108, w - 244, 3);

      // Overhead Live Brass Elevation Dial & Altitude Readout
      drawRoundedRect(ctx, 210, 10, 500, 58, 8);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = '700 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `ELEVADOR DE SANTA JUSTA  -  ${sj.phase === 'ascending' ? 'ASCENDING' : 'DESCENDING'}  ${Math.round(alt)}m / 45m`,
        w * 0.5,
        32,
        480
      );
      // Progress altitude bar inside brass header
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(260, 44, 400, 10);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(260, 44, Math.round(400 * frac), 10);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.strokeRect(260, 44, 400, 10);
      ctx.restore();
      ctx.textAlign = 'left';
      return;
    }

    // -----------------------------------------------------------------------
    // C) 45-METER OPEN-AIR MIRADOURO: FULL 360-DEGREE FACTUAL VIEW OF LISBOA CITY!
    // -----------------------------------------------------------------------
    const yawDeg = (((state.cameraYaw || 0) * 180) / Math.PI + 360) % 360;
    const centerBearing = (yawDeg + 90) % 360; // 0 = N, 90 = E, 180 = S, 270 = W
    const pitchPx = clamp((state.cameraPitch || 0) * 320, -88, 88);
    const hy = Math.round(h * 0.42 + pitchPx);
    const fovDeg = 78;
    const pxPerDeg = w / fovDeg;
    const angleDiff = (targetDeg) => ((targetDeg - centerBearing + 540) % 360) - 180;
    const bx = (targetDeg) => w * 0.5 + angleDiff(targetDeg) * pxPerDeg;
    const isVisibleDeg = (targetDeg, margin = 26) => Math.abs(angleDiff(targetDeg)) <= fovDeg * 0.5 + margin;

    // 1. Dynamic Lisbon Sky Dome (Morning / Afternoon / Golden Hour / Evening + Atlantic Weather)
    const sky = ctx.createLinearGradient(0, 0, 0, hy + 18);
    if (isEvening) {
      sky.addColorStop(0, '#071126');
      sky.addColorStop(0.55, '#15294d');
      sky.addColorStop(1, '#2a436e');
    } else if (isRainy) {
      sky.addColorStop(0, '#3e4f63');
      sky.addColorStop(0.55, '#6b7e94');
      sky.addColorStop(1, '#a9b8c8');
    } else if (isGolden) {
      sky.addColorStop(0, '#2c4a82');
      sky.addColorStop(0.5, '#d67b4d');
      sky.addColorStop(0.84, '#f5b96b');
      sky.addColorStop(1, '#fef08a');
    } else {
      sky.addColorStop(0, '#1854ad');
      sky.addColorStop(0.58, '#5bb5ef');
      sky.addColorStop(1, '#dff4ff');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Stars & crescent moon at night OR golden sun over SW Tagus / Atlantic
    if (isEvening) {
      ctx.fillStyle = 'rgba(255, 250, 224, 0.85)';
      for (let s = 0; s < 42; s += 1) {
        const sDeg = (s * 43 + 11) % 360;
        if (!isVisibleDeg(sDeg, 4)) continue;
        const sx = bx(sDeg);
        const sy = 22 + ((s * 67) % Math.max(40, hy - 44));
        ctx.fillRect(sx, sy, s % 3 === 0 ? 2.4 : 1.6, s % 3 === 0 ? 2.4 : 1.6);
      }
      if (isVisibleDeg(152, 12)) {
        const mx = bx(152);
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(mx, Math.max(44, hy - 118), 16, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (!isRainy) {
      const sunDeg = isGolden ? 236 : 168;
      if (isVisibleDeg(sunDeg, 20)) {
        const sx = bx(sunDeg);
        const sy = isGolden ? hy - 54 : Math.max(48, hy - 134);
        const sg = ctx.createRadialGradient(sx, sy, 8, sx, sy, isGolden ? 96 : 64);
        sg.addColorStop(0, '#fffbeb');
        sg.addColorStop(0.35, isGolden ? 'rgba(253, 186, 116, 0.78)' : 'rgba(254, 240, 138, 0.55)');
        sg.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sx, sy, isGolden ? 96 : 64, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Soft drifting Atlantic clouds
    ctx.fillStyle = isEvening ? 'rgba(148, 163, 184, 0.14)' : isGolden ? 'rgba(254, 215, 170, 0.42)' : 'rgba(255, 255, 255, 0.58)';
    for (let c = 0; c < 12; c += 1) {
      const cDeg = (c * 31 + animTime * 0.35) % 360;
      if (!isVisibleDeg(cDeg, 18)) continue;
      const cx = bx(cDeg);
      const cy = 54 + (c % 4) * 28;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 46 + (c % 3) * 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Continuous 360-Degree Horizon Topography: Lisbon Seven Hills + Shimmering Tagus Estuary + Almada Cliffs!
    // Base urban valley fill below horizon
    const valleyGrad = ctx.createLinearGradient(0, hy - 6, 0, h);
    valleyGrad.addColorStop(0, isEvening ? '#182436' : '#c9b79f');
    valleyGrad.addColorStop(1, isEvening ? '#0f172a' : '#8c7258');
    ctx.fillStyle = valleyGrad;
    ctx.fillRect(0, hy - 4, w, h - hy + 4);

    // Sample Lisbon 360-degree factual hill profile (peaks at Graca NE 42, Castelo E 84, Alfama SE 130, Almada SSW 214, Chiado/Carmo W 272, Parque Eduardo VII NNW 330)
    const hillHeightAtDeg = (deg) => {
      const d = ((deg % 360) + 360) % 360;
      const bump = (center, width, amp) => {
        const diff = Math.abs(((d - center + 540) % 360) - 180);
        if (diff >= width) return 0;
        const u = diff / width;
        return amp * 0.5 * (1 + Math.cos(u * Math.PI));
      };
      return (
        10 +
        bump(332, 36, 36) + // Avenida da Liberdade / Parque Eduardo VII
        bump(42, 38, 66) +  // Miradouro da Graca & Senhora do Monte
        bump(84, 34, 72) +  // Castelo de Sao Jorge hill
        bump(130, 32, 34) + // Alfama & Se ridge
        bump(216, 48, 22) + // Distant Almada cliffs across Tagus
        bump(268, 44, 54)   // Chiado / Carmo / Bairro Alto hill directly west!
      );
    };

    ctx.fillStyle = isEvening ? '#19273f' : isGolden ? '#7d5b54' : '#658074';
    ctx.beginPath();
    ctx.moveTo(0, hy + 42);
    for (let sx = 0; sx <= w; sx += 8) {
      const deg = centerBearing + (sx - w * 0.5) / pxPerDeg;
      ctx.lineTo(sx, hy - hillHeightAtDeg(deg));
    }
    ctx.lineTo(w, hy + 42);
    ctx.closePath();
    ctx.fill();

    // 2B. Shimmering Rio Tejo (Tagus River Estuary) sweeping naturally from SE (122 deg) through South (180 deg) to SW (242 deg)
    // Tapered organic Lisbon riverfront shorelines on both the Alfama (E) and Chiado/Cais do Sodre (W) embankments!
    const riverLeftX = bx(118);
    const riverRightX = bx(244);
    if (riverRightX > 0 && riverLeftX < w) {
      const riverY0 = hy + 2;
      const riverH = 88;
      const rGrad = ctx.createLinearGradient(0, riverY0, 0, riverY0 + riverH);
      if (isEvening) {
        rGrad.addColorStop(0, '#0f2744');
        rGrad.addColorStop(1, '#08182b');
      } else if (isGolden) {
        rGrad.addColorStop(0, '#44749c');
        rGrad.addColorStop(0.5, '#c78c62');
        rGrad.addColorStop(1, '#265c7e');
      } else {
        rGrad.addColorStop(0, '#1f78ab');
        rGrad.addColorStop(1, '#124e75');
      }
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(riverLeftX + 70, riverY0);
      ctx.lineTo(riverRightX - 70, riverY0);
      ctx.quadraticCurveTo(riverRightX - 12, riverY0 + 36, riverRightX - 58, riverY0 + riverH);
      ctx.lineTo(riverLeftX + 58, riverY0 + riverH);
      ctx.quadraticCurveTo(riverLeftX + 12, riverY0 + 36, riverLeftX + 70, riverY0);
      ctx.closePath();
      ctx.fillStyle = rGrad;
      ctx.fill();
      ctx.clip();

      // Gentle Tagus wave glints clipped organically inside the curved estuary basin
      const rx0 = Math.max(0, riverLeftX);
      const rx1 = Math.min(w, riverRightX);
      ctx.strokeStyle = isGolden ? 'rgba(254, 240, 138, 0.5)' : 'rgba(224, 242, 254, 0.36)';
      ctx.lineWidth = 1.4;
      for (let wy = riverY0 + 10; wy < riverY0 + riverH - 8; wy += 14) {
        const waveShift = ((animTime * 12 + wy * 3) % 44);
        for (let wx = rx0 - waveShift; wx < rx1; wx += 44) {
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 18, wy);
          ctx.stroke();
        }
      }
      // Tiny Transtejo orange catamaran & white sailboat crossing the Tagus toward Cacilhas!
      for (const [bDeg, bOffY, isFerry] of [[166 + Math.sin(animTime * 0.14) * 6, 36, true], [192 - Math.sin(animTime * 0.11) * 5, 28, false]]) {
        if (!isVisibleDeg(bDeg, 4)) continue;
        const bpx = bx(bDeg);
        const bpy = riverY0 + bOffY;
        if (isFerry) {
          ctx.fillStyle = '#f97316';
          ctx.fillRect(bpx - 9, bpy, 18, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bpx - 6, bpy - 3, 12, 3);
        } else {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(bpx - 4, bpy);
          ctx.lineTo(bpx + 5, bpy);
          ctx.lineTo(bpx, bpy - 12);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 3. FACTUAL 360-DEGREE LISBON ARCHITECTURAL MONUMENTS AT EXACT COMPASS BEARINGS!

    // [SSW 214 deg] Ponte 25 de Abril (1966) Crimson Suspension Bridge & Santuario de Cristo Rei (1959) on Almada Cliff!
    if (isVisibleDeg(214, 34)) {
      const pCx = bx(214);
      const t1X = pCx - 86;
      const t2X = pCx + 42;
      const bLeft = pCx - 172;
      const bRight = pCx + 126;
      const deckY = hy + 6;
      const towerTopY = hy - 48;
      const bRed = isEvening ? '#881b24' : '#c8232c';
      const bHi = isEvening ? '#b91c1c' : '#ef4444';

      // Main catenary cables
      const cableY = (x) => {
        if (x <= t1X) {
          const u = (x - bLeft) / Math.max(1, t1X - bLeft);
          return deckY - u * u * (deckY - (towerTopY + 3));
        }
        if (x >= t2X) {
          const u = (bRight - x) / Math.max(1, bRight - t2X);
          return deckY - u * u * (deckY - (towerTopY + 3));
        }
        const u = (x - t1X) / Math.max(1, t2X - t1X);
        return (towerTopY + 3) + 4 * u * (1 - u) * ((deckY - 4) - (towerTopY + 3));
      };
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let sx = bLeft + 8; sx <= bRight - 8; sx += 9) {
        ctx.moveTo(sx, cableY(sx));
        ctx.lineTo(sx, deckY);
      }
      ctx.stroke();

      ctx.strokeStyle = bHi;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let sx = bLeft; sx <= bRight; sx += 5) {
        const cy = cableY(sx);
        if (sx === bLeft) ctx.moveTo(sx, cy);
        else ctx.lineTo(sx, cy);
      }
      ctx.stroke();

      // Double-deck stiffening roadway & twin crimson portal towers
      ctx.fillStyle = bRed;
      ctx.fillRect(bLeft, deckY, bRight - bLeft, 4.5);
      for (const tx of [t1X, t2X]) {
        ctx.fillStyle = bRed;
        ctx.fillRect(tx - 5, towerTopY, 3, hy + 20 - towerTopY);
        ctx.fillRect(tx + 2, towerTopY, 3, hy + 20 - towerTopY);
        ctx.strokeStyle = bHi;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx - 4, towerTopY + 6);
        ctx.lineTo(tx + 4, towerTopY + 6);
        ctx.moveTo(tx - 4, towerTopY + 22);
        ctx.lineTo(tx + 4, towerTopY + 22);
        ctx.stroke();
      }

      // Santuario de Cristo Rei on Almada escarpment (left of bridge at ~201 deg)
      const crX = bx(201);
      const crBaseY = hy - 8;
      ctx.fillStyle = isEvening ? '#e2e8f0' : '#ece5d6';
      ctx.beginPath();
      ctx.moveTo(crX - 7, crBaseY);
      ctx.lineTo(crX - 4.5, crBaseY - 26);
      ctx.lineTo(crX + 4.5, crBaseY - 26);
      ctx.lineTo(crX + 7, crBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(crX - 1.6, crBaseY - 36, 3.2, 10);
      ctx.fillRect(crX - 8, crBaseY - 33, 16, 2.2);
      if (isEvening) {
        const cg = ctx.createRadialGradient(crX, crBaseY - 26, 2, crX, crBaseY - 26, 22);
        cg.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
        cg.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(crX, crBaseY - 26, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // [E 84 deg] Castelo de Sao Jorge (11th c. Hilltop Citadel with 7 Crenellated Towers, Umbrella Pines & Portuguese Flag!)
    if (isVisibleDeg(84, 30)) {
      const cX = bx(84);
      const cY = hy - 68;
      // Warm evening architectural floodlight halo on medieval castle walls
      if (isEvening) {
        const halo = ctx.createRadialGradient(cX, cY - 8, 12, cX, cY - 8, 125);
        halo.addColorStop(0, 'rgba(253, 224, 71, 0.34)');
        halo.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cX, cY - 8, 125, 0, Math.PI * 2);
        ctx.fill();
      }
      // Stone umbrella pines tucked along castle hilltop terrace
      ctx.fillStyle = isEvening ? '#143326' : '#2d5a3e';
      for (const [ox, oy, r] of [[-102, 12, 16], [-62, 4, 15], [44, 4, 16], [88, 10, 17], [118, 18, 14]]) {
        ctx.beginPath();
        ctx.ellipse(cX + ox, cY + oy, r * 1.4, r * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Golden limestone medieval curtain wall & crenellated battlements
      const stoneWall = isEvening ? '#a88d62' : '#d8c5a3';
      const stoneShadow = isEvening ? '#7d6644' : '#b8a27e';
      ctx.fillStyle = stoneWall;
      ctx.fillRect(cX - 108, cY - 12, 216, 30);
      ctx.fillStyle = stoneShadow;
      ctx.fillRect(cX - 108, cY + 12, 216, 12);
      // 7 iconic crenellated square limestone watchtowers along the citadel ridge
      for (const [tx, tw, th] of [
        [-104, 22, 34], [-64, 24, 42], [-22, 28, 48], [16, 22, 38], [52, 26, 44], [88, 22, 34]
      ]) {
        ctx.fillStyle = stoneWall;
        ctx.fillRect(cX + tx, cY - th + 16, tw, th);
        ctx.strokeStyle = stoneShadow;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cX + tx, cY - th + 16, tw, th);
        // Merlon crenellations atop each tower
        for (let m = 0; m < tw - 4; m += 7) {
          ctx.fillRect(cX + tx + m, cY - th + 11, 4.5, 5);
        }
        // Narrow medieval arrow slit
        ctx.fillStyle = '#292524';
        ctx.fillRect(cX + tx + tw * 0.5 - 1.5, cY - th + 26, 3, 10);
      }
      // Fluttering Portuguese green-and-red flag over Torre de Ulisses!
      const fx = cX - 8;
      const fy = cY - 36;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 6);
      ctx.lineTo(fx, fy - 22);
      ctx.stroke();
      const wave = Math.sin(animTime * 4.5) * 2;
      ctx.fillStyle = '#15803d';
      ctx.fillRect(fx + 1, fy - 21 + wave * 0.3, 8, 11);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(fx + 9, fy - 21 + wave * 0.5, 12, 11);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(fx + 9, fy - 15.5 + wave * 0.4, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // [NE 42 deg] Miradouro da Graca Convent & Pine Belvedere on High Northeastern Ridge
    if (isVisibleDeg(42, 24)) {
      const gX = bx(42);
      const gY = hy - 62;
      ctx.fillStyle = isEvening ? '#cbd5e1' : '#f8fafc';
      ctx.fillRect(gX - 38, gY - 12, 76, 26);
      ctx.fillStyle = '#b84a32';
      ctx.fillRect(gX - 42, gY - 18, 84, 7);
      // Bell tower of Igreja da Graca
      ctx.fillStyle = isEvening ? '#e2e8f0' : '#ffffff';
      ctx.fillRect(gX - 8, gY - 34, 16, 24);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(gX, gY - 34, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = isEvening ? '#143326' : '#2d5a3e';
      for (const ox of [-52, -28, 30, 52]) {
        ctx.beginPath();
        ctx.arc(gX + ox, gY + 6, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // [SE 136 deg] Se de Lisboa (1147 Twin Romanesque Towers) & [ESE 124 deg] Panteao Nacional White Dome!
    if (isVisibleDeg(132, 26)) {
      // Panteao Nacional gleaming white cupola farther east on Alfama crest
      const panX = bx(123);
      const panY = hy - 28;
      ctx.fillStyle = isEvening ? '#cbd5e1' : '#f8fafc';
      ctx.fillRect(panX - 18, panY - 8, 36, 20);
      ctx.beginPath();
      ctx.arc(panX, panY - 8, 16, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(panX - 4, panY - 30, 8, 8);

      // Se de Lisboa (1147) Romanesque fortress facade with twin crenellated bell towers & rose window
      const seX = bx(136);
      const seY = hy - 14;
      const seStone = isEvening ? '#b8a993' : '#dfd5c3';
      ctx.fillStyle = seStone;
      ctx.fillRect(seX - 28, seY - 18, 56, 38);
      ctx.fillRect(seX - 30, seY - 40, 18, 60);
      ctx.fillRect(seX + 12, seY - 40, 18, 60);
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(seX - 30, seY - 40, 18, 60);
      ctx.strokeRect(seX + 12, seY - 40, 18, 60);
      // Crenellations & blue-gold rose window
      ctx.fillStyle = '#8c7e6a';
      for (const ox of [-30, -22, -16, 12, 20, 26]) {
        ctx.fillRect(seX + ox, seY - 45, 4, 5);
      }
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(seX, seY - 6, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(seX, seY - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // [S 174 deg] Rua Augusta Axis, Arco da Rua Augusta (1873) & Yellow Praca do Comercio Arcades overlooking Rio Tejo!
    if (isVisibleDeg(174, 28)) {
      const aX = bx(174);
      const aY = hy + 68;
      // Yellow Pombaline colonnade wings of Praca do Comercio framing the riverfront
      ctx.fillStyle = isEvening ? '#b8861e' : '#eab308';
      ctx.fillRect(aX - 116, aY - 18, 86, 26);
      ctx.fillRect(aX + 30, aY - 18, 86, 26);
      ctx.fillStyle = '#b84a32';
      ctx.fillRect(aX - 118, aY - 23, 90, 6);
      ctx.fillRect(aX + 28, aY - 23, 90, 6);
      // Iconic white Lioz limestone Arco da Rua Augusta (1873) triumphal arch dead-center!
      ctx.fillStyle = isEvening ? '#cbd5e1' : '#f5efe2';
      ctx.fillRect(aX - 28, aY - 42, 56, 52);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(aX - 28, aY - 42, 56, 52);
      // Central triumphal arch opening showing sunlit Tagus water beyond
      ctx.fillStyle = isEvening ? '#0f2744' : '#1d75a8';
      ctx.beginPath();
      ctx.arc(aX, aY - 4, 13, Math.PI, 0);
      ctx.lineTo(aX + 13, aY + 10);
      ctx.lineTo(aX - 13, aY + 10);
      ctx.closePath();
      ctx.fill();
      // Clock face & Glory crowning sculptural pediment atop Arco da Rua Augusta
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(aX, aY - 29, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isEvening ? '#e2e8f0' : '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(aX - 16, aY - 42);
      ctx.lineTo(aX, aY - 58);
      ctx.lineTo(aX + 16, aY - 42);
      ctx.closePath();
      ctx.fill();
    }

    // [NNW 332 deg] Estacao do Rossio (1890 Neo-Manueline Twin Horseshoe Arches) & [N 4 deg] Praca do Rossio + Teatro Nacional D. Maria II!
    if (isVisibleDeg(348, 38)) {
      // Estacao do Rossio (332 deg)
      const estX = bx(332);
      const estY = hy + 28;
      ctx.fillStyle = isEvening ? '#cbd5e1' : '#f4eee2';
      ctx.fillRect(estX - 48, estY - 36, 96, 46);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(estX - 48, estY - 36, 96, 46);
      // Signature twin Neo-Manueline horseshoe arch portals!
      for (const hx of [-18, 18]) {
        ctx.fillStyle = isEvening ? '#fde68a' : '#1e293b';
        ctx.beginPath();
        ctx.arc(estX + hx, estY - 6, 12, Math.PI * 0.85, Math.PI * 0.15);
        ctx.lineTo(estX + hx + 9, estY + 10);
        ctx.lineTo(estX + hx - 9, estY + 10);
        ctx.closePath();
        ctx.fill();
      }
      // Central stone pinnacle clocktower
      ctx.fillStyle = isEvening ? '#e2e8f0' : '#f8f4ec';
      ctx.fillRect(estX - 10, estY - 54, 20, 20);
      ctx.beginPath();
      ctx.moveTo(estX - 12, estY - 54);
      ctx.lineTo(estX, estY - 68);
      ctx.lineTo(estX + 12, estY - 54);
      ctx.closePath();
      ctx.fill();

      // Praca Dom Pedro IV (Rossio) & Teatro Nacional D. Maria II (N 4 deg)!
      const rX = bx(4);
      const rY = hy + 34;
      // Teatro Nacional D. Maria II (1846) neoclassical white 6-column portico & pediment at north end of Rossio
      ctx.fillStyle = isEvening ? '#cbd5e1' : '#f8f5ef';
      ctx.fillRect(rX - 66, rY - 40, 132, 34);
      ctx.beginPath();
      ctx.moveTo(rX - 44, rY - 40);
      ctx.lineTo(rX, rY - 60);
      ctx.lineTo(rX + 44, rY - 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      for (let col = -34; col <= 34; col += 13.6) {
        ctx.fillStyle = isEvening ? '#94a3b8' : '#e2e8f0';
        ctx.fillRect(rX + col - 2, rY - 38, 4, 30);
      }

      // Bird's-eye Rossio Square rolling Mar Largo wave calcada plaza directly below Teatro Nacional!
      ctx.fillStyle = isEvening ? '#334155' : '#e7dfd0';
      ctx.beginPath();
      ctx.moveTo(rX - 96, rY - 4);
      ctx.lineTo(rX + 96, rY - 4);
      ctx.lineTo(rX + 148, rY + 86);
      ctx.lineTo(rX - 148, rY + 86);
      ctx.closePath();
      ctx.fill();
      // Undulating black basalt Mar Largo waves across Rossio plaza
      ctx.strokeStyle = isEvening ? 'rgba(15, 23, 42, 0.7)' : 'rgba(30, 41, 59, 0.55)';
      ctx.lineWidth = 2.6;
      for (let wy = rY + 12; wy <= rY + 72; wy += 15) {
        const spanW = 94 + ((wy - rY) / 86) * 48;
        ctx.beginPath();
        for (let wx = -spanW; wx <= spanW; wx += 14) {
          const yOff = Math.sin(wx * 0.14) * 3.5;
          if (wx === -spanW) ctx.moveTo(rX + wx, wy + yOff);
          else ctx.lineTo(rX + wx, wy + yOff);
        }
        ctx.stroke();
      }
      // Twin Baroque French bronze fountains flanking Dom Pedro IV Column
      for (const fx of [-58, 58]) {
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(rX + fx, rY + 34, 15, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#475569';
        ctx.fillRect(rX + fx - 3, rY + 16, 6, 18);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(rX + fx, rY + 16);
        ctx.lineTo(rX + fx - 8, rY + 30);
        ctx.moveTo(rX + fx, rY + 16);
        ctx.lineTo(rX + fx + 8, rY + 30);
        ctx.stroke();
      }
      // Iconic 27-meter Dom Pedro IV Column rising dead-center in Rossio!
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(rX - 4, rY - 22, 8, 58);
      ctx.fillStyle = '#334155';
      ctx.fillRect(rX - 9, rY + 28, 18, 10);
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.arc(rX, rY - 27, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. BIRD'S-EYE BAIXA POMBALINA 1755 GEOMETRIC ROOFTOP GRID (directly below the 45m deck!)
    // Dense rows of uniform terracotta hipped roofs, ochre/cream/rose facades, attic dormers, and sunlit Baixa streets
    const pombalineWallCols = ['#ebd9bd', '#f4ead8', '#e6c5b3', '#d8e3dd', '#efe1c4', '#e8d0c8'];
    for (let layer = 0; layer < 4; layer += 1) {
      const yTop = hy + 76 + layer * 44;
      const roofH = 18 + layer * 6;
      const wallH = 26 + layer * 8;
      const degStep = 14 - layer * 1.6;
      for (let d = 0; d < 360; d += degStep) {
        // Leave Rossio plaza (N 350..18), Rua Augusta corridor (S 168..182), and Carmo skybridge gap (W 262..286) clearly readable!
        if ((d >= 352 || d <= 16) && layer < 2) continue;
        if (d >= 169 && d <= 180 && layer < 3) continue;
        if (d >= 260 && d <= 288) continue;
        if (!isVisibleDeg(d, 10)) continue;

        const rx = bx(d);
        const bw = degStep * pxPerDeg * 0.86;
        const seed = Math.round(d * 7 + layer * 19);
        const wallCol = pombalineWallCols[seed % pombalineWallCols.length];
        const roofCol = isEvening ? '#6e2c1d' : seed % 3 === 0 ? '#b84a32' : '#c75939';

        // Facade below roof eaves
        ctx.fillStyle = shadeColor(wallCol, isEvening ? 0.5 : 0.94 - layer * 0.04);
        ctx.fillRect(rx - bw * 0.5, yTop + roofH, bw, wallH);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx - bw * 0.5, yTop + roofH, bw, wallH);

        // Pombaline shuttered windows (warm lit amber panes in Evening!)
        const winCols = Math.max(2, Math.floor(bw / 22));
        for (let wc = 0; wc < winCols; wc += 1) {
          const wx = rx - bw * 0.42 + (wc + 0.5) * ((bw * 0.84) / winCols);
          ctx.fillStyle = isEvening && (seed + wc) % 3 !== 0 ? '#fde68a' : '#2c3e55';
          ctx.fillRect(wx - 4, yTop + roofH + 6, 8, Math.min(14, wallH - 10));
        }

        // Authentic pitched terracotta hipped Pombaline roof + attic dormers
        ctx.fillStyle = roofCol;
        ctx.beginPath();
        ctx.moveTo(rx - bw * 0.53, yTop + roofH + 1);
        ctx.lineTo(rx - bw * 0.34, yTop);
        ctx.lineTo(rx + bw * 0.34, yTop);
        ctx.lineTo(rx + bw * 0.53, yTop + roofH + 1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isEvening ? '#451a03' : '#7c2d12';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Whitewashed roof dormer window characteristic of Baixa Pombalina
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(rx - 5, yTop + roofH * 0.42, 10, 7);
        ctx.fillStyle = isEvening ? '#fde047' : '#334155';
        ctx.fillRect(rx - 3, yTop + roofH * 0.48, 6, 5);
      }
    }

    // [W 274 deg] DRAWN ABOVE ROOF LAYER: Passadico Iron Skybridge & Roofless Gothic Arches of Convento do Carmo (1389)!
    if (isVisibleDeg(274, 34)) {
      const carmX = bx(274);
      const carmBaseY = hy + 68;
      // Blooming violet Jacaranda canopy in Largo do Carmo (May/June) or lush Lisbon foliage
      ctx.fillStyle = isJacaranda ? '#8b5cf6' : isEvening ? '#1e3a2f' : '#3f7d52';
      for (const [jx, jy, jr] of [[-128, -4, 24], [-92, 6, 20], [96, 2, 24], [134, 10, 20]]) {
        ctx.beginPath();
        ctx.arc(carmX + jx, carmBaseY + jy, jr, 0, Math.PI * 2);
        ctx.fill();
      }
      // Iconic 1389 Roofless Pointed Gothic Limestone Nave Arches of Convento do Carmo (open to the sky since 1755!)
      const gothStone = isEvening ? '#9c9284' : '#e5ded0';
      const gothDark = isEvening ? '#57534e' : '#9c907f';
      // Back west gable wall & Gothic rose window frame
      ctx.fillStyle = gothStone;
      ctx.fillRect(carmX - 104, carmBaseY - 92, 26, 102);
      ctx.fillRect(carmX + 78, carmBaseY - 92, 26, 102);
      // 5 towering roofless pointed Gothic transverse stone rib arches open directly against the Lisbon sky!
      ctx.strokeStyle = gothStone;
      ctx.lineWidth = 7;
      for (let ai = 0; ai < 5; ai += 1) {
        const ax0 = carmX - 88 + ai * 36;
        const ax1 = ax0 + 36;
        const am = (ax0 + ax1) * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax0, carmBaseY + 12);
        ctx.lineTo(ax0, carmBaseY - 56);
        ctx.quadraticCurveTo(ax0 + 4, carmBaseY - 96, am, carmBaseY - 108);
        ctx.quadraticCurveTo(ax1 - 4, carmBaseY - 96, ax1, carmBaseY - 56);
        ctx.lineTo(ax1, carmBaseY + 12);
        ctx.stroke();
        ctx.strokeStyle = gothDark;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.strokeStyle = gothStone;
        ctx.lineWidth = 7;
      }

      // Raoul Mesnier 1902 Wrought-Iron Passadico Walkway Skybridge connecting Santa Justa directly to Carmo!
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(carmX - 18, carmBaseY + 16);
      ctx.lineTo(carmX + 18, carmBaseY + 16);
      ctx.lineTo(carmX + 94, h - 54);
      ctx.lineTo(carmX - 94, h - 54);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // Iron truss side parapets on the Passadico skybridge
      for (let t = 0.15; t <= 0.9; t += 0.18) {
        const py = carmBaseY + 16 + t * (h - 70 - carmBaseY);
        const hw = 18 + t * 76;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(carmX - hw, py);
        ctx.lineTo(carmX + hw, py);
        ctx.stroke();
      }
    }

    // 5. CLICKABLE FLOATING FACTUAL LANDMARK PINS AROUND THE 360-DEGREE SKYLINE!
    for (const lm of SANTA_JUSTA_PANORAMA_LANDMARKS) {
      if (!isVisibleDeg(lm.compassBearing, -3)) continue;
      const lx = bx(lm.compassBearing);
      const isFocused = sj.focusedLandmarkId === lm.id;
      const ly =
        lm.id === 'sj-convento-carmo'
          ? hy - 78
          : lm.id === 'sj-castelo'
            ? hy - 148
            : lm.id === 'sj-graca'
              ? hy - 126
              : lm.id === 'sj-rossio'
                ? hy - 64
                : lm.id === 'sj-estacao-rossio'
                  ? hy - 74
                  : lm.id === 'sj-ponte-cristo-rei'
                    ? hy - 78
                    : lm.id === 'sj-se-panteao'
                      ? hy - 74
                      : hy - 14;
      const pinY = clamp(ly, 68, h - 186);

      ctx.save();
      ctx.font = isFocused ? '700 10.5px "Segoe UI", sans-serif' : '600 9.5px "Segoe UI", sans-serif';
      const pinTxt = `${lm.shortName.toUpperCase()} [${lm.compassLabel}]`;
      const pw = ctx.measureText(pinTxt).width + 16;
      const ph = 20;
      const px0 = clamp(lx - pw * 0.5, 10, w - pw - 10);

      // Vertical brass leader pin down toward landmark
      ctx.strokeStyle = isFocused ? '#facc15' : 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = isFocused ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(lx, pinY + ph);
      ctx.lineTo(lx, pinY + ph + 16);
      ctx.stroke();

      drawRoundedRect(ctx, px0, pinY, pw, ph, 5);
      ctx.fillStyle = isFocused ? 'rgba(15, 23, 42, 0.94)' : 'rgba(15, 23, 42, 0.78)';
      ctx.fill();
      ctx.strokeStyle = isFocused ? '#facc15' : lm.accentColor;
      ctx.lineWidth = isFocused ? 2 : 1.3;
      ctx.stroke();
      ctx.fillStyle = isFocused ? '#fde047' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(pinTxt, px0 + pw * 0.5, pinY + 13.5);
      ctx.restore();

      this.lastHitTargets.push({
        kind: 'santa-justa-landmark',
        landmarkId: lm.id,
        poly: [
          { x: px0, y: pinY },
          { x: px0 + pw, y: pinY },
          { x: px0 + pw, y: pinY + ph },
          { x: px0, y: pinY + ph }
        ]
      });
    }

    // 6. FOREGROUND 1902 NEO-GOTHIC CAST-IRON OBSERVATION DECK RAILING (45m Summit!)
    const railTopY = h - 72;
    // Wooden/iron deck floor edge at very bottom
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, h - 18, w, 18);
    // Horizontal brass top handrail & iron bottom kick rail
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, railTopY, w, 7);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, railTopY, w, 2.6);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, h - 24, w, 6);

    // Repeating Neo-Gothic pointed iron railing balusters scrolling naturally as you pan 360 degrees!
    const railSpacing = 54;
    const railShift = ((centerBearing * pxPerDeg) % railSpacing + railSpacing) % railSpacing;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    for (let rx = -railShift; rx < w + railSpacing; rx += railSpacing) {
      ctx.beginPath();
      ctx.moveTo(rx, railTopY + 5);
      ctx.lineTo(rx, h - 18);
      ctx.stroke();
      // Delicate pointed Gothic iron arch between balusters
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(rx + 6, h - 22);
      ctx.lineTo(rx + 6, railTopY + 26);
      ctx.quadraticCurveTo(rx + railSpacing * 0.5, railTopY + 4, rx + railSpacing - 6, railTopY + 26);
      ctx.lineTo(rx + railSpacing - 6, h - 22);
      ctx.stroke();
      // Decorative iron rosette ring
      ctx.beginPath();
      ctx.arc(rx + railSpacing * 0.5, railTopY + 28, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1e293b';
    }

    // 7. TOP SCROLLING 360-DEGREE COMPASS DEGREE RIBBON & ALTITUDE HUD
    const compW = 460;
    const compX = Math.round((w - compW) * 0.5);
    drawRoundedRect(ctx, compX, 12, compW, 44, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.save();
    drawRoundedRect(ctx, compX + 8, 14, compW - 16, 40, 6);
    ctx.clip();
    const cardinals = [
      [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
      [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']
    ];
    for (let deg = 0; deg < 360; deg += 15) {
      const diff = angleDiff(deg);
      if (Math.abs(diff) > 48) continue;
      const tx = w * 0.5 + diff * 4.6;
      const card = cardinals.find(([d]) => d === deg);
      ctx.strokeStyle = card ? '#facc15' : 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = card ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(tx, 46);
      ctx.lineTo(tx, card ? 36 : 41);
      ctx.stroke();
      if (card) {
        ctx.fillStyle = '#fde047';
        ctx.font = '800 10.5px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(card[1], tx, 32);
      }
    }
    ctx.restore();

    // Center bearing pointer triangle & numeric readout
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 55);
    ctx.lineTo(w * 0.5 - 5, 62);
    ctx.lineTo(w * 0.5 + 5, 62);
    ctx.closePath();
    ctx.fill();

    // Top-left 45m Miradouro altitude badge
    drawRoundedRect(ctx, 14, 12, 206, 44, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = '700 10.5px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('SANTA JUSTA MIRADOURO', 24, 30, 186);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '700 9.5px "Consolas", monospace';
    ctx.fillText(`ELEV 45m  |  HDG ${String(Math.round(centerBearing)).padStart(3, '0')} DEG`, 24, 46, 186);

    // Top-right Descend Lift button pill (clickable directly on canvas!)
    const descX = w - 196;
    drawRoundedRect(ctx, descX, 12, 182, 44, 8);
    ctx.fillStyle = 'rgba(15, 92, 82, 0.92)';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DESCEND LIFT [E / ESC]', descX + 91, 31);
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 9px "Segoe UI", sans-serif';
    ctx.fillText('Drag 360 deg | [P] Postcard', descX + 91, 46);
    this.lastHitTargets.push({
      kind: 'santa-justa-descend',
      poly: [
        { x: descX, y: 12 },
        { x: descX + 182, y: 12 },
        { x: descX + 182, y: 56 },
        { x: descX, y: 56 }
      ]
    });

    // 8. FOCUSED FACTUAL LANDMARK OBSERVATORY PLAQUE (cleanly positioned above bottom railing/banner!)
    const focused =
      SANTA_JUSTA_PANORAMA_LANDMARKS.find((l) => l.id === sj.focusedLandmarkId) ||
      SANTA_JUSTA_PANORAMA_LANDMARKS[3];
    if (focused) {
      const cardW = 680;
      const cardH = 54;
      const cardX = Math.round((w - cardW) * 0.5);
      const cardY = h - 134;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = focused.accentColor || '#eab308';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fde047';
      ctx.font = '700 11px Georgia, serif';
      ctx.fillText(
        `${focused.compassLabel} (${focused.compassBearing} DEG, ${focused.distanceMeters}m)  -  ${focused.name} (${focused.year})`,
        cardX + 14,
        cardY + 20,
        cardW - 28
      );
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '500 10px "Segoe UI", sans-serif';
      const clipped = focused.description.length > 116 ? `${focused.description.slice(0, 113)}...` : focused.description;
      ctx.fillText(clipped, cardX + 14, cardY + 39, cardW - 28);
    }
    ctx.textAlign = 'left';
  }
}
