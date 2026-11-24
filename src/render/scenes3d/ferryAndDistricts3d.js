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

export const ferryAndDistricts3dMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    ferryAndDistricts3dMethods[key] = _Mixin.prototype[key];
  }
}
