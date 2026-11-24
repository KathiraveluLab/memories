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
}

export const metro3dMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    metro3dMethods[key] = _Mixin.prototype[key];
  }
}
