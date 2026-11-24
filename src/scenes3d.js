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

import { interior3dMethods } from './render/scenes3d/interior3d.js';
import { metro3dMethods } from './render/scenes3d/metro3d.js';
import { ferryAndDistricts3dMethods } from './render/scenes3d/ferryAndDistricts3d.js';

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
}

Object.assign(
  LisboaScenes3DRenderer.prototype,
  interior3dMethods,
  metro3dMethods,
  ferryAndDistricts3dMethods
);
