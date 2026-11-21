import {
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  METRO_STATIONS,
  VENUES,
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
    if (state.mode === 'ferry') {
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
    ctx.fillText(line1, 26, 33);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 10px "Segoe UI", sans-serif';
    ctx.fillText(line2, 26, 51);

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
    const venue = VENUES.find((v) => v.id === state.currentVenueId);
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
    const cam = this.buildCamera(state);

    const xMin = 56;
    const xMax = 704;
    const yMin = 84;
    const yMax = 446;
    const ceilZ = isCathedral ? 196 : 134;

    // 1. Base ceiling & warm room backdrop
    ctx.fillStyle = isCathedral ? '#3b3732' : shadeColor(theme.wall, 0.72);
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
          label: `${venue.cashierName} (${venue.cashierRole || 'Cashier'})`
        })
      });
    }

    // Main 3D Proprietor Counter (or Cathedral High Altar) + Brass Cash Register + Espresso Machine / Pastry Trays!
    items.push({
      dist: Math.hypot(380 - cam.camX, 154 - cam.camY),
      draw: () => {
        const counterH = 22;
        const counterStroke = nearbyInteraction?.type === 'counter' ? '#facc15' : '#3b2414';
        this.drawBox3D(
          ctx,
          cam,
          225,
          126,
          535,
          178,
          0,
          counterH,
          { front: theme.counter, back: theme.counter, side: theme.counter, top: isCathedral ? '#f8fafc' : '#e7dcc8', stroke: counterStroke, lineWidth: nearbyInteraction?.type === 'counter' ? 2.4 : 1.3 },
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
          }
        }
      }
    });

    // Left 3D Display Vitrine / Pastry Case / Book Table / Tile Showcase (matches SOLID_INTERIOR_RECTS[0]: x 62..134, y 204..322)
    items.push({
      dist: Math.hypot(98 - cam.camX, 263 - cam.camY),
      draw: () => {
        const dispStroke = nearbyInteraction?.type === 'display' ? '#facc15' : '#472d1b';
        this.drawBox3D(
          ctx,
          cam,
          64,
          204,
          134,
          322,
          0,
          24,
          { front: theme.counter, side: theme.counter, top: '#e7dcc8', stroke: dispStroke, lineWidth: nearbyInteraction?.type === 'display' ? 2.4 : 1.3 },
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
          { front: '#e0f2fe', side: '#bae6fd', top: '#f0f9ff', stroke: '#64748b', lineWidth: 1 }
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
      }
    });

    // Right-Side 3D Dining Tables / Bistro Tables / Cathedral Pews (matches SOLID_INTERIOR_RECTS[1..2])
    for (const ty of [225, 325]) {
      items.push({
        dist: Math.hypot(636 - cam.camX, ty + 27 - cam.camY),
        draw: () => {
          const topCol = layout === 'restaurant' ? '#dc2626' : isCathedral ? '#6b4628' : '#e7dcc8';
          this.drawBox3D(ctx, cam, 590, ty, 682, ty + 54, 0, isCathedral ? 18 : 24, {
            front: '#5c3a21',
            side: '#472d1b',
            top: topCol,
            stroke: '#3b2414',
            lineWidth: 1.2
          });
          if (layout === 'restaurant' || layout === 'cafe' || layout === 'bakery') {
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

    // Hanging glowing brass pendant lamps from ceiling
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
      activeRoomToast
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
          { x: INTERIOR_STATIONS.exitMat.x, y: INTERIOR_STATIONS.exitMat.y, color: '#34d399' }
        ]
      }
    );
  }

  // =========================================================================
  // 2. FULL 3D UNDERGROUND METROPOLITANO DE LISBOA (ESCALATOR, PLATFORM & TUNNEL RIDE)
  // =========================================================================
  renderMetro3D(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const m = state.metro;
    const station = METRO_STATIONS.find((s) => s.id === (m.stationId || state.activeMetroStationId)) || METRO_STATIONS[0];
    const theme = station.undergroundTheme;

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
      drawRoundedRect(ctx, vpX - 190, 20, 380, 44, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = '#c81e32';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${station.name.toUpperCase()}  -  ${goingDown ? 'DESCENDING ESCALATOR' : 'ASCENDING TO STREET'}`, vpX, 46);
      ctx.textAlign = 'left';
      return;
    }

    // B) 3D Inside-the-Metro-Train Tunnel Ride
    if (m.phase === 'riding') {
      const w = this.viewWidth;
      const h = this.viewHeight;
      const vpX = w * 0.5;
      const vpY = h * 0.44;
      const dest = METRO_STATIONS.find((s) => s.id === m.toStationId);

      // Deep dark subterranean tunnel rushing toward viewer
      ctx.fillStyle = '#08101c';
      ctx.fillRect(0, 0, w, h);

      // Animated 3D tunnel rings streaking forward!
      const ringShift = (animTime * 4.8) % 1;
      for (let i = 0; i < 10; i += 1) {
        const t = ((i + ringShift) % 10) / 10;
        const scale = 0.08 + t * t * 1.15;
        const rx = 280 * scale;
        const ry = 190 * scale;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.14 + t * 0.35})`;
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
      // Crimson Metropolitano de Lisboa cabin trim
      ctx.fillStyle = '#c81e32';
      ctx.fillRect(128, 72, w - 256, 8);
      ctx.fillRect(128, h - 114, w - 256, 8);
      // Overhead LED Linha Azul Next-Station display & Synchronized Door-Closing Chime Alert
      const chimeActive = Boolean(state.metroDoorChime);
      drawRoundedRect(ctx, 195, 12, 530, chimeActive ? 56 : 48, 8);
      ctx.fillStyle = '#090d16';
      ctx.fill();
      ctx.strokeStyle = chimeActive ? '#f97316' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = chimeActive ? '#fb923c' : '#38bdf8';
      ctx.font = '700 13px "Consolas", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        chimeActive
          ? `ATENCAO AS PORTAS  |  PROXIMA ESTACAO: ${(dest?.name || 'LISBOA').toUpperCase()}`
          : `LINHA AZUL  |  PROXIMA ESTACAO: ${(dest?.name || 'LISBOA').toUpperCase()}`,
        w * 0.5,
        chimeActive ? 34 : 43,
        506
      );
      if (chimeActive) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '600 10.5px "Segoe UI", sans-serif';
        ctx.fillText(
          `${(state.metroDoorChime.triggeredBy || 'LINHA AZUL').toUpperCase()} CHIME: "${state.metroDoorChime.text}"`,
          w * 0.5,
          54,
          506
        );
      }
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

    // North Concourse Wall (with Azulejo tile band & Escalator Exit to Street!)
    this.drawPoly3D(ctx, cam, [[50, 140, 0], [710, 140, 0], [710, 140, ceilZ], [50, 140, ceilZ]], theme.wallPrimary, theme.trim, 1.4);
    this.drawPoly3D(ctx, cam, [[50, 140, 0], [710, 140, 0], [710, 140, 44], [50, 140, 44]], theme.tileAccent);
    // Ascending Escalator Alcove (clickable to return to street!)
    const escPoly = this.drawPoly3D(ctx, cam, [[328, 141, 0], [432, 141, 0], [432, 141, 86], [328, 141, 86]], '#1e3a5f', '#fde047', 2);
    if (escPoly) this.lastHitTargets.push({ kind: 'metro-exit', poly: escPoly });
    const escPt = this.projectWorldPt(cam, 380, 142, 92);
    if (escPt) {
      ctx.save();
      ctx.font = '700 10.5px "Segoe UI", sans-serif';
      drawRoundedRect(ctx, escPt.x - 68, escPt.y - 10, 136, 20, 4);
      ctx.fillStyle = '#0f5c52';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('ESCALATOR TO STREET', escPt.x, escPt.y + 4);
      ctx.restore();
    }

    // South Far Tunnel Wall across the tracks (with iconic red Lisbon Metro M sign & station name!)
    this.drawPoly3D(ctx, cam, [[710, 420, -16], [50, 420, -16], [50, 420, ceilZ], [710, 420, ceilZ]], shadeColor(theme.wallPrimary, 0.78));
    this.drawPoly3D(ctx, cam, [[710, 420, 32], [50, 420, 32], [50, 420, 62], [710, 420, 62]], theme.tileAccent);
    const metroSignPt = this.projectWorldPt(cam, 380, 418, 76);
    if (metroSignPt) {
      ctx.save();
      ctx.font = '700 11px Georgia, serif';
      const mTxt = `M  |  ${station.name.toUpperCase()}`;
      const mtw = ctx.measureText(mTxt).width + 20;
      drawRoundedRect(ctx, metroSignPt.x - mtw * 0.5, metroSignPt.y - 11, mtw, 22, 5);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#c81e32';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(mTxt, metroSignPt.x, metroSignPt.y + 4);
      ctx.restore();
    }

    // West & East End Walls with Dark Subterranean Tunnel Portals
    this.drawPoly3D(ctx, cam, [[50, 420, -16], [50, 140, -16], [50, 140, ceilZ], [50, 420, ceilZ]], shadeColor(theme.wallPrimary, 0.75));
    this.drawPoly3D(ctx, cam, [[51, 390, -16], [51, 294, -16], [51, 294, 72], [51, 390, 72]], '#050912');
    this.drawPoly3D(ctx, cam, [[710, 140, -16], [710, 420, -16], [710, 420, ceilZ], [710, 140, ceilZ]], shadeColor(theme.wallPrimary, 0.75));
    this.drawPoly3D(ctx, cam, [[709, 294, -16], [709, 390, -16], [709, 390, 72], [709, 294, 72]], '#050912');

    // 3D Silver-and-Crimson Metropolitano de Lisboa Train parked cleanly at the platform!
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
    // Crimson Lisbon Metro stripe & illuminated passenger doors along the train side facing platform (y = 302)
    const doorColor = state.metroDoorChime ? '#fb923c' : '#fef08a';
    this.drawPoly3D(ctx, cam, [[tx + 175, 301.5, 4], [tx - 175, 301.5, 4], [tx - 175, 301.5, 16], [tx + 175, 301.5, 16]], '#c81e32');
    for (let dx = -140; dx <= 120; dx += 52) {
      this.drawPoly3D(ctx, cam, [[tx + dx + 34, 301, 18], [tx + dx, 301, 18], [tx + dx, 301, 38], [tx + dx + 34, 301, 38]], doorColor, '#1e293b', 1.2);
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

    this.drawSceneHud(
      ctx,
      cam,
      `3D METRO  -  ${station.name}`,
      state.metroDoorChime
        ? `${(state.metroDoorChime.triggeredBy || 'LINHA AZUL').toUpperCase()} CHIME: "${state.metroDoorChime.text}"`
        : `${station.lines.join(' & ')}  |  Click Train to Board or Escalator to Exit`,
      {
        floorRect: { x: 50, y: 140, w: 660, h: 146 },
        floorColor: 'rgba(148, 163, 184, 0.3)',
        px: state.player.x,
        py: state.player.y,
        peers: peersHere,
        pois: [
          { x: 380, y: 168, color: '#34d399' },
          { x: 380, y: 274, color: '#38bdf8' }
        ]
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
}
