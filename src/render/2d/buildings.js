import {
  WORLD_MIN_X,
  WORLD_MAX_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  ALL_LISBOA_NEIGHBORHOODS,
  STREETS,
  CROSSWALKS,
  DECORATIVE_STRUCTURES,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  SANTA_JUSTA_LIFT,
  SANTA_JUSTA_PANORAMA_LANDMARKS,
  METRO_LINE,
  METRO_NETWORK_LINES,
  METRO_STATIONS,
  ALL_METRO_STATIONS,
  LISBOA_CITY_DISTRICTS,
  CITY_DISTRICT_SPOTS,
  LISBOA_CORRIDOR_LANDMARKS,
  OVERWORLD_CITY_GATEWAYS,
  getWalkingAvenuesFrom,
  VENUES,
  findEnterableVenueById,
  REST_SPOTS,
  RIVERSIDE_BENCHES,
  CASTANHA_VENDORS,
  TRANSIT_LINES,
  FUNICULAR_LINES,
  BAIRRO_ALTO_PARTY_REVELERS,
  isBairroAltoPartyTime,
  getTerrainElevation,
  getAllTransitStops,
  getMetroLineById,
  getStationLineIds,
  getOutfitById,
  getMonthInfo
} from '../../data.js';
import { getDayPhase, INTERIOR_STATIONS, METRO_PLATFORM_ZONES, FERRY_PIER_ZONES, computeFunicularCarPose } from '../../engine.js';

const ALL_STOPS = getAllTransitStops();

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

class _Mixin {
  drawAzulejoWall(ctx, x, y, w, h, wallStyle) {
    if (wallStyle === 'cobalt-azulejo') {
      ctx.fillStyle = '#f2f6fb';
      ctx.fillRect(x, y, w, h);

      const tile = 14;
      ctx.strokeStyle = 'rgba(27, 77, 137, 0.22)';
      ctx.lineWidth = 0.7;
      for (let ty = y; ty < y + h; ty += tile) {
        for (let tx = x; tx < x + w; tx += tile) {
          const tw = Math.min(tile, x + w - tx);
          const th = Math.min(tile, y + h - ty);
          ctx.strokeRect(tx, ty, tw, th);
          if (tw >= 10 && th >= 10) {
            const cx = tx + tw / 2;
            const cy = ty + th / 2;
            ctx.fillStyle = '#1d528f';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 3.6);
            ctx.lineTo(cx + 3.6, cy);
            ctx.lineTo(cx, cy + 3.6);
            ctx.lineTo(cx - 3.6, cy);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#f2f6fb';
            ctx.fillRect(cx - 1, cy - 1, 2, 2);
            ctx.fillStyle = 'rgba(29, 82, 143, 0.65)';
            ctx.fillRect(tx + 1, ty + 1, 2, 2);
            ctx.fillRect(tx + tw - 3, ty + 1, 2, 2);
            ctx.fillRect(tx + 1, ty + th - 3, 2, 2);
            ctx.fillRect(tx + tw - 3, ty + th - 3, 2, 2);
          }
        }
      }
      ctx.fillStyle = '#1b4d89';
      ctx.fillRect(x, y, w, 4);
      ctx.fillRect(x, y + h - 4, w, 4);
      return;
    }

    if (wallStyle === 'pombaline-teal') {
      ctx.fillStyle = '#e7f2ee';
      ctx.fillRect(x, y, w, h);
      const tile = 14;
      ctx.strokeStyle = 'rgba(22, 108, 92, 0.22)';
      ctx.lineWidth = 0.7;
      for (let ty = y; ty < y + h; ty += tile) {
        for (let tx = x; tx < x + w; tx += tile) {
          const tw = Math.min(tile, x + w - tx);
          const th = Math.min(tile, y + h - ty);
          ctx.strokeRect(tx, ty, tw, th);
          if (tw >= 10 && th >= 10) {
            const cx = tx + tw / 2;
            const cy = ty + th / 2;
            ctx.fillStyle = '#1f7062';
            ctx.fillRect(cx - 2, cy - 2, 4, 4);
            ctx.fillStyle = 'rgba(31, 112, 98, 0.4)';
            ctx.fillRect(cx - 4, cy - 0.7, 8, 1.4);
            ctx.fillRect(cx - 0.7, cy - 4, 1.4, 8);
          }
        }
      }
      ctx.fillStyle = '#185c50';
      ctx.fillRect(x, y, w, 4);
      ctx.fillRect(x, y + h - 4, w, 4);
      return;
    }

    if (wallStyle === 'whitewash-alfama') {
      ctx.fillStyle = '#f8f4ec';
      ctx.fillRect(x, y, w, h);
      // Warm stone base plinth + subtle cobalt trim
      ctx.fillStyle = '#ddd4c3';
      ctx.fillRect(x, y + h - 12, w, 12);
      ctx.fillStyle = '#1d568a';
      ctx.fillRect(x, y + h - 14, w, 3);
      return;
    }

    ctx.fillStyle = wallStyle === 'rose-plaster' ? '#ebd4da' : '#f1dec4';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#e5ddcf';
    ctx.strokeStyle = 'rgba(116, 104, 88, 0.45)';
    ctx.lineWidth = 0.8;
    for (let qy = y + 4; qy < y + h - 8; qy += 12) {
      const qw = ((qy / 12) % 2 === 0) ? 10 : 7;
      ctx.fillRect(x, qy, qw, 10);
      ctx.strokeRect(x, qy, qw, 10);
      ctx.fillRect(x + w - qw, qy, qw, 10);
      ctx.strokeRect(x + w - qw, qy, qw, 10);
    }

    ctx.fillStyle = '#eef4fa';
    ctx.fillRect(x + 10, y + h - 14, w - 20, 12);
    ctx.fillStyle = '#1b4d89';
    for (let ax = x + 14; ax < x + w - 16; ax += 12) {
      ctx.fillRect(ax, y + h - 11, 5, 5);
    }
  }

  drawTerracottaRoof(ctx, x, y, w, h, baseColor, opts = {}) {
    const { hasChimney = true, hasDormers = false } = typeof opts === 'boolean' ? { hasChimney: opts } : opts;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, '#7c2e1c');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255, 224, 194, 0.25)';
    ctx.lineWidth = 1.1;
    for (let ry = y + 10; ry < y + h - 4; ry += 11) {
      for (let rx = x + 4; rx < x + w - 6; rx += 12) {
        ctx.beginPath();
        ctx.arc(rx + 6, ry, 5.5, 0, Math.PI);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(255, 232, 206, 0.34)';
    ctx.fillRect(x + 4, y + Math.round(h * 0.45), w - 8, 3);

    // Authentic Pombaline roof dormers (aguas-furtadas)
    if (hasDormers && w >= 160) {
      const dormerXs = [x + 28, x + w - 46];
      for (const dx of dormerXs) {
        ctx.fillStyle = '#e7dfd0';
        ctx.fillRect(dx, y + h - 22, 18, 17);
        ctx.fillStyle = '#47627d';
        ctx.fillRect(dx + 4, y + h - 18, 10, 11);
        ctx.fillStyle = '#993d27';
        ctx.beginPath();
        ctx.moveTo(dx - 3, y + h - 22);
        ctx.lineTo(dx + 9, y + h - 30);
        ctx.lineTo(dx + 21, y + h - 22);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.fillStyle = '#e7dfd0';
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.fillStyle = 'rgba(40, 28, 20, 0.28)';
    ctx.fillRect(x, y + h, w, 3);

    if (hasChimney && w >= 150) {
      const cx = x + w - 26;
      const cy = y + 6;
      ctx.fillStyle = '#f3ede2';
      ctx.fillRect(cx, cy, 13, 15);
      ctx.strokeStyle = '#9c8e7c';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, 13, 15);
      ctx.fillStyle = '#b4482e';
      ctx.fillRect(cx - 2, cy - 3, 17, 5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx + 3, cy + 4, 7, 3);
    }
  }

  drawLisbonWindow(ctx, wx, wy, ww, wh, opts) {
    const { isEvening, shutterColor = '#22543d', flowerColor = '#d64545', hasBalcony = true, arched = false } = opts;

    ctx.fillStyle = '#ebe4d5';
    ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    ctx.strokeStyle = '#8b8070';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx - 4, wy - 4, ww + 8, wh + 8);

    ctx.fillStyle = shutterColor;
    ctx.fillRect(wx - 9, wy - 1, 6, wh + 2);
    ctx.fillRect(wx + ww + 3, wy - 1, 6, wh + 2);
    // Horizontal wooden louver slats on exterior portadas shutters
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    for (let ly = wy + 2; ly < wy + wh - 1; ly += 3.5) {
      ctx.fillRect(wx - 8, ly, 4, 1.1);
      ctx.fillRect(wx + ww + 4, ly, 4, 1.1);
    }

    ctx.fillStyle = isEvening ? '#ffe285' : '#5b87ad';
    if (arched) {
      ctx.beginPath();
      ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
      ctx.lineTo(wx + ww, wy + wh);
      ctx.lineTo(wx, wy + wh);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(wx, wy, ww, wh);
    }
    // Subtle sky glass reflection glint inside casement pane
    ctx.fillStyle = isEvening ? 'rgba(255, 250, 220, 0.35)' : 'rgba(224, 242, 254, 0.32)';
    ctx.fillRect(wx + 2, wy + 2, Math.max(2, ww * 0.28), Math.max(4, wh * 0.32));

    ctx.strokeStyle = '#f5f2eb';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh * 0.4);
    ctx.lineTo(wx + ww, wy + wh * 0.4);
    ctx.moveTo(wx, wy + wh * 0.72);
    ctx.lineTo(wx + ww, wy + wh * 0.72);
    ctx.stroke();

    if (hasBalcony) {
      const by = wy + wh - 5;
      ctx.strokeStyle = '#222a35';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(wx - 5, by, ww + 10, 11);
      for (let bx = wx - 1; bx <= wx + ww + 2; bx += 5) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + 11);
        ctx.stroke();
      }
      ctx.fillStyle = '#b95534';
      ctx.fillRect(wx + ww / 2 - 6, by + 4, 12, 5);
      ctx.fillStyle = '#2f7a49';
      ctx.fillRect(wx + ww / 2 - 7, by + 1, 14, 4);
      ctx.fillStyle = flowerColor;
      ctx.fillRect(wx + ww / 2 - 5, by, 3, 3);
      ctx.fillRect(wx + ww / 2 + 2, by, 3, 3);
    }
  }

  drawDecorativeStructure(ctx, struct, isEvening) {
    ctx.fillStyle = 'rgba(20, 26, 36, 0.2)';
    ctx.fillRect(struct.x + 7, struct.y + 9, struct.w, struct.h);

    if (struct.style === 'monument') {
      const cx = struct.x + struct.w / 2;
      const cy = struct.y + struct.h / 2;

      if (struct.monumentType === 'fountain') {
        // Historic Lisbon Chafariz Water Fountain (Octagonal Lioz limestone basin, shimmering turquoise water, animated ripples & 4 water jets!)
        ctx.save();
        // Outer limestone step & octagonal stone basin rim
        ctx.fillStyle = '#ebe4d6';
        ctx.beginPath();
        ctx.arc(cx, cy, 29, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#d6cfc2';
        ctx.beginPath();
        ctx.arc(cx, cy, 23, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Shimmering aqueduct water basin
        const waterGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 19);
        waterGrad.addColorStop(0, '#7dd3fc');
        waterGrad.addColorStop(0.6, '#0284c7');
        waterGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 18.5, 0, Math.PI * 2);
        ctx.fill();

        // Animated concentric water ripples inside basin
        const rPhase = (this.animTime * 1.4) % 1;
        ctx.strokeStyle = `rgba(224, 242, 254, ${0.85 * (1 - rPhase)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(cx, cy, 6 + rPhase * 11, 0, Math.PI * 2);
        ctx.stroke();

        // Four animated water jets spraying from central sculpted spouts
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i += 1) {
          const ang = (i * Math.PI) / 2 + Math.PI / 4;
          const jetLen = 12 + Math.sin(this.animTime * 6 + i) * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4);
          ctx.lineTo(cx + Math.cos(ang) * jetLen, cy + Math.sin(ang) * jetLen);
          ctx.stroke();
        }

        // Central carved Lioz limestone obelisk / bowl pedestal
        ctx.fillStyle = '#f8f5ee';
        ctx.beginPath();
        ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '700 8.5px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(struct.shortLabel || struct.label.toUpperCase(), cx, struct.y - 10);
        ctx.textAlign = 'left';
        ctx.restore();
        return;
      }

      ctx.fillStyle = '#f0eadc';
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3b434f';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      for (let i = 0; i < 8; i += 1) {
        const ang = (i * Math.PI) / 4;
        ctx.fillStyle = i % 2 === 0 ? '#3b434f' : '#9aa1ac';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang - 0.16) * 16, cy + Math.sin(ang - 0.16) * 16);
        ctx.lineTo(cx + Math.cos(ang) * 30, cy + Math.sin(ang) * 30);
        ctx.lineTo(cx + Math.cos(ang + 0.16) * 16, cy + Math.sin(ang + 0.16) * 16);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#ded7c7';
      drawRoundedRect(ctx, struct.x + 10, struct.y + 10, struct.w - 20, struct.h - 20, 5);
      ctx.fill();
      ctx.strokeStyle = '#756d5e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#3e544c';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c7a6f';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 8.8px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#243142';
      ctx.fillText(struct.shortLabel || 'LUIS DE CAMOES', cx, struct.y - 11);
      ctx.textAlign = 'left';
      return;
    }

    if (struct.style === 'cathedral') {
      ctx.fillStyle = '#ddd5c5';
      ctx.fillRect(struct.x, struct.y, struct.w, struct.h);

      ctx.strokeStyle = 'rgba(98, 88, 72, 0.25)';
      ctx.lineWidth = 1;
      for (let sy = struct.y + 12; sy < struct.y + struct.h; sy += 14) {
        ctx.beginPath();
        ctx.moveTo(struct.x, sy);
        ctx.lineTo(struct.x + struct.w, sy);
        ctx.stroke();
      }

      this.drawTerracottaRoof(ctx, struct.x + 48, struct.y + 6, struct.w - 96, 42, '#9d4c36', false);

      const towerXs = [struct.x + 6, struct.x + struct.w - 50];
      for (const tx of towerXs) {
        ctx.fillStyle = '#d3cab7';
        ctx.fillRect(tx, struct.y - 12, 44, struct.h + 10);
        ctx.strokeStyle = '#6b5e4c';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(tx, struct.y - 12, 44, struct.h + 10);

        ctx.fillStyle = '#e5ded0';
        for (let bx = tx + 2; bx < tx + 40; bx += 11) {
          ctx.fillRect(bx, struct.y - 18, 7, 7);
          ctx.strokeRect(bx, struct.y - 18, 7, 7);
        }

        ctx.fillStyle = '#3c362e';
        ctx.beginPath();
        ctx.arc(tx + 22, struct.y + 22, 10, Math.PI, 0);
        ctx.lineTo(tx + 32, struct.y + 42);
        ctx.lineTo(tx + 12, struct.y + 42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#a47d43';
        ctx.beginPath();
        ctx.arc(tx + 22, struct.y + 28, 5, Math.PI, 0);
        ctx.fill();
      }

      const rcx = struct.x + struct.w / 2;
      const rcy = struct.y + 78;
      ctx.fillStyle = isEvening ? '#f7ce65' : '#2f5885';
      ctx.beginPath();
      ctx.arc(rcx, rcy, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6c5f4d';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.strokeStyle = '#ebe4d5';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i += 1) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(rcx, rcy);
        ctx.lineTo(rcx + Math.cos(a) * 18, rcy + Math.sin(a) * 18);
        ctx.stroke();
      }

      ctx.fillStyle = '#625647';
      ctx.beginPath();
      ctx.arc(rcx, struct.y + struct.h - 22, 20, Math.PI, 0);
      ctx.lineTo(rcx + 20, struct.y + struct.h);
      ctx.lineTo(rcx - 20, struct.y + struct.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3b2b1e';
      ctx.beginPath();
      ctx.arc(rcx, struct.y + struct.h - 18, 13, Math.PI, 0);
      ctx.lineTo(rcx + 13, struct.y + struct.h);
      ctx.lineTo(rcx - 13, struct.y + struct.h);
      ctx.closePath();
      ctx.fill();

      drawRoundedRect(ctx, rcx - 46, struct.y + 12, 92, 18, 4);
      ctx.fillStyle = 'rgba(24, 34, 48, 0.8)';
      ctx.fill();
      ctx.font = '700 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef3c7';
      ctx.fillText('SE DE LISBOA', rcx, struct.y + 24);
      ctx.textAlign = 'left';
      return;
    }

    const roofH = Math.round(struct.h * 0.42);
    const wallStyle =
      struct.style === 'azulejo' || struct.style === 'arcaded-azulejo'
        ? 'cobalt-azulejo'
        : struct.id === 'house-ba-mid'
          ? 'rose-plaster'
          : 'ochre-plaster';

    this.drawAzulejoWall(ctx, struct.x, struct.y + roofH - 2, struct.w, struct.h - roofH + 2, wallStyle);
    this.drawTerracottaRoof(ctx, struct.x - 3, struct.y - 3, struct.w + 6, roofH, struct.roofColor, {
      hasChimney: true,
      hasDormers: true
    });

    if (struct.style === 'arcaded-azulejo') {
      // Authentic Pombaline arched stone arcades (Arcadas do Chiado) along lower facade
      const arches = 4;
      const span = (struct.w - 24) / arches;
      for (let i = 0; i < arches; i += 1) {
        const ax = struct.x + 12 + i * span + span / 2;
        const ay = struct.y + roofH + 34;
        ctx.fillStyle = '#e5ded0';
        ctx.beginPath();
        ctx.arc(ax, ay, 16, Math.PI, 0);
        ctx.lineTo(ax + 16, struct.y + struct.h);
        ctx.lineTo(ax - 16, struct.y + struct.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = isEvening ? '#e5bd67' : '#3a4f66';
        ctx.beginPath();
        ctx.arc(ax, ay + 2, 11, Math.PI, 0);
        ctx.lineTo(ax + 11, struct.y + struct.h - 2);
        ctx.lineTo(ax - 11, struct.y + struct.h - 2);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const cols = Math.max(3, Math.floor((struct.w - 28) / 48));
      const step = (struct.w - 34) / cols;
      for (let i = 0; i < cols; i += 1) {
        const wx = struct.x + 22 + i * step;
        const wy = struct.y + roofH + 16;
        this.drawLisbonWindow(ctx, wx, wy, 20, 30, {
          isEvening,
          shutterColor: struct.trimColor,
          flowerColor: i % 2 === 0 ? '#d94854' : '#e07a32',
          hasBalcony: true
        });
      }
    }

    if (struct.id === 'house-ba-mid') {
      ctx.strokeStyle = 'rgba(60, 50, 44, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(struct.x + 26, struct.y + roofH + 46);
      ctx.quadraticCurveTo(struct.x + struct.w / 2, struct.y + roofH + 56, struct.x + struct.w - 26, struct.y + roofH + 46);
      ctx.stroke();
      const flags = ['#f8fafc', '#3b82f6', '#f59e0b', '#ef4444', '#f8fafc'];
      flags.forEach((fc, idx) => {
        const fx = struct.x + 48 + idx * 28;
        ctx.fillStyle = fc;
        ctx.fillRect(fx, struct.y + roofH + 49, 10, 11);
      });
    }

    ctx.strokeStyle = 'rgba(30, 38, 48, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(struct.x, struct.y, struct.w, struct.h);

    ctx.font = '600 9.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 250, 240, 0.94)';
    ctx.fillText(struct.label, struct.x + struct.w / 2, struct.y + 18);
    ctx.textAlign = 'left';
  }

  drawVenueBuilding(ctx, venue, visited, isHighlighted, isEvening) {
    if (venue.archStyle === 'kiosk') {
      this.drawQuiosqueBuilding(ctx, venue, visited, isHighlighted, isEvening);
      return;
    }

    if (venue.archStyle === 'brasileira') {
      this.drawBrasileiraBuilding(ctx, venue, visited, isHighlighted, isEvening);
      return;
    }

    if (venue.archStyle === 'cathedral') {
      this.drawCathedralBuilding(ctx, venue, visited, isHighlighted, isEvening);
      return;
    }

    // Standard bespoke Pombaline / Alfama / Bairro Alto architecture
    ctx.fillStyle = 'rgba(18, 26, 36, 0.24)';
    ctx.fillRect(venue.x + 7, venue.y + 9, venue.w, venue.h);

    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(venue.x - 4, venue.y - 4, venue.w + 8, venue.h + 8);
    }

    const roofH = Math.round(venue.h * 0.39);
    const facadeY = venue.doorSide === 'south' ? venue.y + roofH - 2 : venue.y;
    const facadeH = venue.h - roofH + 2;

    const wallStyleMap = {
      tasca: 'ochre-plaster',
      pensao: 'ochre-plaster',
      'palacete-gallery': 'ochre-plaster',
      'casas-rosa': 'rose-plaster',
      'bohemian-shop': 'rose-plaster',
      'bairro-bar': 'rose-plaster',
      bertrand: 'cobalt-azulejo',
      'azulejo-gallery': 'cobalt-azulejo',
      'arcaded-azulejo': 'cobalt-azulejo',
      'chiado-arcade': 'pombaline-teal',
      'azulejo-atelier': 'cobalt-azulejo',
      'alfama-taberna': 'whitewash-alfama',
      mercearia: 'cobalt-azulejo'
    };
    const wallStyle = wallStyleMap[venue.archStyle] || 'cobalt-azulejo';

    this.drawAzulejoWall(ctx, venue.x, facadeY, venue.w, facadeH, wallStyle);

    // Distinct roof silhouettes per architectural archetype
    const roofY = venue.doorSide === 'south' ? venue.y - 3 : venue.y + venue.h - roofH + 3;
    const isGallery = venue.archStyle === 'palacete-gallery' || venue.archStyle === 'azulejo-gallery';
    this.drawTerracottaRoof(ctx, venue.x - 3, roofY, venue.w + 6, roofH, venue.roofColor, {
      hasChimney:
        venue.archStyle === 'casas-rosa' ||
        venue.archStyle === 'tasca' ||
        venue.archStyle === 'alfama-taberna' ||
        venue.archStyle === 'azulejo-atelier',
      hasDormers:
        venue.archStyle === 'pensao' ||
        venue.archStyle === 'bertrand' ||
        venue.archStyle === 'chiado-arcade' ||
        venue.archStyle === 'arcaded-azulejo'
    });

    // Neoclassical triangular museum pediment crowning Art & Architecture Galleries
    if (isGallery) {
      const pedBaseY = venue.doorSide === 'south' ? venue.y + roofH : venue.y + venue.h - roofH;
      const pedDir = venue.doorSide === 'south' ? -1 : 1;
      ctx.fillStyle = '#ece6d8';
      ctx.beginPath();
      ctx.moveTo(venue.x + 18, pedBaseY);
      ctx.lineTo(venue.x + venue.w / 2, pedBaseY + pedDir * 22);
      ctx.lineTo(venue.x + venue.w - 18, pedBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7c7160';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // Fluted lioz limestone gallery columns flanking facade
      for (const colX of [venue.x + 12, venue.x + venue.w - 22]) {
        ctx.fillStyle = '#ede7da';
        ctx.fillRect(colX, facadeY + 4, 10, facadeH - 8);
        ctx.strokeStyle = '#8b8070';
        ctx.lineWidth = 1;
        ctx.strokeRect(colX, facadeY + 4, 10, facadeH - 8);
      }
    }

    const winY = venue.doorSide === 'south' ? venue.y + roofH + 12 : venue.y + 18;
    const curbY = venue.doorSide === 'south' ? venue.y + venue.h + 11 : venue.y - 11;

    // 1. BOOKSHOP (Livraria Bertrand 1732): Multi-pane oak book bow windows, open-book crest, sidewalk book cart
    if (venue.archStyle === 'bertrand') {
      for (const wx of [venue.x + 14, venue.x + venue.w - 64]) {
        ctx.fillStyle = '#4e311c';
        drawRoundedRect(ctx, wx - 3, winY - 2, 52, 42, 4);
        ctx.fill();
        ctx.fillStyle = isEvening ? '#fce19a' : '#f7f1e3';
        ctx.fillRect(wx, winY + 1, 46, 36);
        const books = ['#1b4d89', '#b84a32', '#1f7062', '#c98a18', '#5b3a63', '#2563eb'];
        // Two packed rows of colorful upright books
        for (let row = 0; row < 2; row += 1) {
          for (let bi = 0; bi < 6; bi += 1) {
            ctx.fillStyle = books[(bi + row * 2) % books.length];
            ctx.fillRect(wx + 3 + bi * 7, winY + 4 + row * 17, 5, 13);
          }
          ctx.fillStyle = '#7c5332';
          ctx.fillRect(wx, winY + 17 + row * 17, 46, 2.5);
        }
      }
      // Gilded open-book crest + 1732 badge above doorway
      ctx.fillStyle = '#1b4d89';
      drawRoundedRect(ctx, venue.doorX - 22, venue.y + roofH + 5, 44, 15, 3);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 8px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('1732', venue.doorX, venue.y + roofH + 15.5);
      ctx.textAlign = 'left';

      // Outdoor wooden book-browsing cart on the sidewalk
      const cartX = venue.x + 28;
      ctx.fillStyle = '#7c4f2b';
      ctx.fillRect(cartX, curbY - 7, 28, 12);
      ctx.strokeStyle = '#3d2514';
      ctx.lineWidth = 1;
      ctx.strokeRect(cartX, curbY - 7, 28, 12);
      const cartBooks = ['#1d4ed8', '#dc2626', '#d97706', '#059669'];
      cartBooks.forEach((cb, i) => {
        ctx.fillStyle = cb;
        ctx.fillRect(cartX + 3 + i * 6, curbY - 5, 4, 8);
      });

      // 2. BAKERY (Casa da Rosa - Padaria): Glass bread & pastry bow windows, chimney steam, A-frame chalkboard
    } else if (venue.archStyle === 'casas-rosa') {
      // Animated warm bread-oven steam rising from chimney
      const puffY = venue.y - 4 - ((this.animTime * 12) % 14);
      ctx.fillStyle = 'rgba(255, 250, 242, 0.55)';
      ctx.beginPath();
      ctx.arc(venue.x + venue.w - 19, puffY, 5, 0, Math.PI * 2);
      ctx.arc(venue.x + venue.w - 15, puffY - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Wide glass pastry & bread display windows
      for (const wx of [venue.x + 14, venue.x + venue.w - 64]) {
        ctx.fillStyle = '#6f3224';
        drawRoundedRect(ctx, wx - 3, winY - 2, 52, 40, 5);
        ctx.fill();
        ctx.fillStyle = isEvening ? '#ffe8a8' : '#fff6e3';
        ctx.fillRect(wx, winY + 1, 46, 34);
        // Golden rustic loaves & pastries on two tiers
        ctx.fillStyle = '#c8802b';
        for (let lx = wx + 5; lx <= wx + 32; lx += 13) {
          ctx.beginPath();
          ctx.ellipse(lx + 4, winY + 11, 5.5, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#e09f3e';
        for (let px = wx + 6; px <= wx + 36; px += 9) {
          ctx.beginPath();
          ctx.arc(px + 2, winY + 25, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#8b5a34';
        ctx.fillRect(wx, winY + 16, 46, 2);
        ctx.fillRect(wx, winY + 30, 46, 2);
      }

      // Colorful Bairro Alto balcony laundry line
      ctx.strokeStyle = 'rgba(60, 50, 44, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(venue.x + 18, venue.y + roofH + 5);
      ctx.quadraticCurveTo(venue.x + venue.w / 2, venue.y + roofH + 12, venue.x + venue.w - 18, venue.y + roofH + 5);
      ctx.stroke();
      const flags = ['#f8fafc', '#3b82f6', '#f59e0b', '#ef4444'];
      for (const [idx, fx] of [[0, venue.x + 28], [1, venue.x + 48], [2, venue.x + venue.w - 58], [3, venue.x + venue.w - 38]]) {
        ctx.fillStyle = flags[idx];
        ctx.fillRect(fx, venue.y + roofH + 6, 8, 8);
      }

      // Sidewalk A-frame bakery chalkboard sign
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(venue.x + 36, curbY - 8, 18, 13);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(venue.x + 36, curbY - 8, 18, 13);
      ctx.fillStyle = '#fef3c7';
      ctx.font = '700 6.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAO', venue.x + 45, curbY + 1);
      ctx.textAlign = 'left';

      // 3. FADO RESTAURANT (Tasca do Fado): Checkered sidewalk dining table, wine barrel, Portuguese guitar emblem
    } else if (venue.archStyle === 'tasca') {
      for (const wx of [venue.x + 18, venue.x + venue.w - 44]) {
        this.drawLisbonWindow(ctx, wx, winY, 24, 28, {
          isEvening,
          shutterColor: '#6e231c',
          flowerColor: '#d94854',
          hasBalcony: false,
          arched: true
        });
      }
      // Carved Portuguese 12-string guitar emblem beside door
      const gx = venue.doorX - 32;
      const gy = venue.y + roofH + 26;
      ctx.fillStyle = '#c58435';
      ctx.beginPath();
      ctx.arc(gx, gy + 5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c3317';
      ctx.fillRect(gx - 1.5, gy - 8, 3, 9);
      ctx.fillStyle = '#3b200e';
      ctx.beginPath();
      ctx.arc(gx, gy + 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Ceramic FADO tile plaque
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(venue.doorX + 22, venue.y + roofH + 10, 28, 12);
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(venue.doorX + 22, venue.y + roofH + 10, 28, 12);
      ctx.fillStyle = '#1b4d89';
      ctx.font = '700 7.5px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('FADO', venue.doorX + 36, venue.y + roofH + 18.5);
      ctx.textAlign = 'left';

      // Sidewalk red-checkered dining table & oak wine barrel
      const tblX = venue.x + 36;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(tblX - 10, curbY - 7, 20, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tblX - 10, curbY - 7, 10, 7);
      ctx.fillRect(tblX, curbY, 10, 7);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(tblX, curbY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Wooden wine barrel (pipa) right of door
      const brlX = venue.x + venue.w - 30;
      ctx.fillStyle = '#7c4724';
      ctx.beginPath();
      ctx.arc(brlX, curbY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 4. ALFAMA GRILL RESTAURANT (Taberna da Sardinha): Festive flags, outdoor charcoal grill w/ smoke, dining tables
    } else if (venue.archStyle === 'alfama-taberna') {
      for (const wx of [venue.x + 20, venue.x + venue.w - 44]) {
        this.drawLisbonWindow(ctx, wx, winY + 4, 24, 26, {
          isEvening,
          shutterColor: '#1b558a',
          flowerColor: '#e04f3e',
          hasBalcony: false,
          arched: true
        });
      }
      // Santos Populares festive triangular garlands
      const colors = ['#dc2626', '#facc15', '#16a34a', '#2563eb'];
      for (let i = 0; i < 8; i += 1) {
        const fx = venue.x + 12 + i * 25;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(fx, venue.y + roofH + 2);
        ctx.lineTo(fx + 14, venue.y + roofH + 2);
        ctx.lineTo(fx + 7, venue.y + roofH + 12);
        ctx.closePath();
        ctx.fill();
      }
      // Outdoor blue-tablecloth sidewalk restaurant tables with plates
      for (const tx of [venue.x + 36, venue.x + venue.w - 36]) {
        ctx.fillStyle = '#1d4ed8';
        drawRoundedRect(ctx, tx - 11, curbY - 7, 22, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(tx - 4, curbY, 3, 0, Math.PI * 2);
        ctx.arc(tx + 4, curbY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Glowing charcoal sardine grill + animated grill smoke
      const gx = venue.doorX + 26;
      ctx.fillStyle = '#374151';
      ctx.fillRect(gx, venue.y + venue.h - 14, 20, 12);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(gx + 3, venue.y + venue.h - 11, 14, 6);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(gx + 4, venue.y + venue.h - 9, 12, 2);
      const smokeShift = (this.animTime * 14) % 14;
      ctx.fillStyle = 'rgba(235, 240, 245, 0.45)';
      ctx.beginPath();
      ctx.arc(gx + 10, venue.y + venue.h - 16 - smokeShift, 4, 0, Math.PI * 2);
      ctx.fill();

      // 5. VINYL & PRINT SHOP (Vinil & Gravuras do Alto): Vinyl record emblem, Tram poster showcase, outdoor record crate
    } else if (venue.archStyle === 'bairro-bar') {
      // Glowing Bairro Alto Nightlife Bar (Bar da Noite): neon trim, warm party windows & sidewalk oak cocktail barrels!
      ctx.fillStyle = '#2a1636';
      ctx.fillRect(venue.x + 2, facadeY + 2, venue.w - 4, facadeH - 4);
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2;
      ctx.strokeRect(venue.x + 3, facadeY + 3, venue.w - 6, facadeH - 6);
      for (const wx of [venue.x + 16, venue.x + venue.w - 48]) {
        ctx.fillStyle = isEvening ? '#f0abfc' : '#fde047';
        drawRoundedRect(ctx, wx, winY + 2, 32, 26, 4);
        ctx.fill();
        ctx.strokeStyle = '#c026d3';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      // Neon BAR roof sign
      drawRoundedRect(ctx, venue.doorX - 24, venue.y + roofH + 5, 48, 15, 3);
      ctx.fillStyle = '#3b0764';
      ctx.fill();
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = '800 8.5px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('BAR', venue.doorX, venue.y + roofH + 15.5);
      ctx.textAlign = 'left';
      // Sidewalk oak wine-barrel cocktail tables flanking door
      for (const bx of [venue.doorX - 42, venue.doorX + 42]) {
        ctx.fillStyle = '#7c4724';
        ctx.beginPath();
        ctx.arc(bx, curbY, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(bx, curbY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (venue.archStyle === 'bohemian-shop') {
      for (const wx of [venue.x + 14, venue.x + venue.w - 64]) {
        ctx.fillStyle = '#3b2442';
        ctx.fillRect(wx - 2, winY - 2, 50, 38);
        ctx.fillStyle = isEvening ? '#fde69e' : '#faf5ef';
        ctx.fillRect(wx, winY, 46, 34);
        // Framed yellow Tram 28E poster + black vinyl disc in window
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(wx + 4, winY + 5, 16, 22);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wx + 7, winY + 12, 10, 6);
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(wx + 34, winY + 17, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(wx + 34, winY + 17, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Giant vinyl record emblem above doorway
      const vx = venue.doorX;
      const vy = venue.y + 42;
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(vx, vy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(vx, vy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Sidewalk vinyl record crate
      ctx.fillStyle = '#8b5a34';
      ctx.fillRect(venue.x + 30, curbY - 6, 22, 11);
      ctx.fillStyle = '#111827';
      ctx.fillRect(venue.x + 33, curbY - 4, 16, 3);
      ctx.fillRect(venue.x + 33, curbY, 16, 3);

      // 6. ART & ARCHITECTURE GALLERIES (Palacete do Loreto & Galeria Pombalina): Exhibition banners + illuminated framed art
    } else if (isGallery) {
      const bannerColor = venue.archStyle === 'azulejo-gallery' ? '#1b4d89' : '#9c3626';
      // Hanging vertical museum banners flanking the doorway
      for (const bx of [venue.x + 28, venue.x + venue.w - 44]) {
        ctx.fillStyle = bannerColor;
        ctx.fillRect(bx, winY - 2, 16, 38);
        ctx.strokeStyle = '#f3c623';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx + 2, winY, 12, 34);
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(bx + 8, winY + 14, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Arched illuminated gallery showcase windows displaying gilded framed paintings
      for (const wx of [venue.x + 50, venue.x + venue.w - 72]) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(wx - 1, winY, 22, 30);
        ctx.fillStyle = isEvening ? '#fef08a' : '#f8f5ec';
        ctx.fillRect(wx + 1, winY + 2, 18, 26);
        ctx.fillStyle = bannerColor;
        ctx.fillRect(wx + 4, winY + 7, 12, 14);
        ctx.strokeStyle = '#d4a337';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(wx + 4, winY + 7, 12, 14);
      }

      // 7. GUESTHOUSE (Pensao Residencial do Alto): 3 upper residential shuttered balconies, olive urns, vertical PENSAO sign
    } else if (venue.archStyle === 'pensao') {
      // Three evenly spaced residential guestroom shuttered windows with Juliet balconies
      for (const wx of [venue.x + 22, venue.x + venue.w / 2 - 10, venue.x + venue.w - 42]) {
        this.drawLisbonWindow(ctx, wx, winY - 2, 20, 24, {
          isEvening,
          shutterColor: '#7a3324',
          flowerColor: '#d94854',
          hasBalcony: true,
          arched: false
        });
      }
      // Vertical brass PENSAO hotel blade sign on left facade edge
      ctx.fillStyle = '#1e293b';
      drawRoundedRect(ctx, venue.x + 4, venue.y + roofH + 24, 14, 38, 2);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.font = '700 7px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('H', venue.x + 11, venue.y + roofH + 45);
      ctx.textAlign = 'left';

      // Twin potted olive trees in terracotta urns flanking guesthouse steps
      for (const ux of [venue.doorX - 30, venue.doorX + 30]) {
        ctx.fillStyle = '#b95534';
        ctx.fillRect(ux - 5, curbY - 3, 10, 8);
        ctx.fillStyle = '#3f7d52';
        ctx.beginPath();
        ctx.arc(ux, curbY - 7, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. CONFEITARIA & TEA SALON (Arcadas do Chiado): Stone arcades with tiered pastry displays + cafe parasol
    } else if (venue.archStyle === 'arcaded-azulejo') {
      for (const ax of [venue.x + 36, venue.x + venue.w - 36]) {
        const ay = venue.y + 24;
        ctx.fillStyle = '#e5ded0';
        ctx.beginPath();
        ctx.arc(ax, ay, 18, Math.PI, 0);
        ctx.lineTo(ax + 18, venue.y + facadeH - 6);
        ctx.lineTo(ax - 18, venue.y + facadeH - 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = isEvening ? '#ffe28a' : '#f8f2e4';
        ctx.beginPath();
        ctx.arc(ax, ay + 2, 13, Math.PI, 0);
        ctx.lineTo(ax + 13, venue.y + facadeH - 8);
        ctx.lineTo(ax - 13, venue.y + facadeH - 8);
        ctx.closePath();
        ctx.fill();
        // Tiered porcelain pastry stand visible inside arcade window
        ctx.fillStyle = '#1b4d89';
        ctx.fillRect(ax - 8, ay + 16, 16, 3);
        ctx.fillRect(ax - 5, ay + 9, 10, 3);
        ctx.fillStyle = '#d98a1c';
        ctx.fillRect(ax - 6, ay + 13, 4, 3);
        ctx.fillRect(ax + 2, ay + 13, 4, 3);
      }
      // Sidewalk cafe parasol table beside Confeitaria
      const px = venue.x + 36;
      ctx.fillStyle = '#1b4d89';
      ctx.beginPath();
      ctx.arc(px, curbY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(px, curbY);
      ctx.arc(px, curbY, 10, 0, Math.PI / 2);
      ctx.moveTo(px, curbY);
      ctx.arc(px, curbY, 10, Math.PI, Math.PI * 1.5);
      ctx.fill();

      // 9. CERAMIC TILE WORKSHOP (Oficina de Azulejos): Framed Tagus caravel tile mural + outdoor tile easels
    } else if (venue.archStyle === 'azulejo-atelier') {
      for (const wx of [venue.x + 16, venue.x + venue.w - 60]) {
        ctx.fillStyle = '#15406a';
        ctx.fillRect(wx - 2, winY - 2, 46, 36);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(wx, winY, 42, 32);
        // Painted cobalt diamond tile samples displayed inside studio window
        ctx.fillStyle = '#1d568a';
        for (let r = 0; r < 2; r += 1) {
          for (let c = 0; c < 3; c += 1) {
            ctx.fillRect(wx + 4 + c * 13, winY + 4 + r * 14, 9, 9);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(wx + 7 + c * 13, winY + 7 + r * 14, 3, 3);
            ctx.fillStyle = '#1d568a';
          }
        }
      }
      // Outdoor tile artist easel on sidewalk
      const ex = venue.x + 34;
      ctx.strokeStyle = '#7c4f2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex, curbY - 9);
      ctx.lineTo(ex - 7, curbY + 6);
      ctx.moveTo(ex, curbY - 9);
      ctx.lineTo(ex + 7, curbY + 6);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(ex - 6, curbY - 7, 12, 10);
      ctx.fillStyle = '#1d568a';
      ctx.fillRect(ex - 3, curbY - 4, 6, 4);

      // 10. CORK & GLOVE ATELIER (Atelier de Cortica & Luvas): Mahogany luxury boutique vitrines
    } else if (venue.archStyle === 'chiado-arcade') {
      for (const wx of [venue.x + 16, venue.x + venue.w - 58]) {
        ctx.fillStyle = '#5c3317';
        drawRoundedRect(ctx, wx - 2, winY - 2, 44, 38, 6);
        ctx.fill();
        ctx.fillStyle = isEvening ? '#fde69e' : '#f7efe3';
        ctx.fillRect(wx + 1, winY + 1, 38, 32);
        // Cork journals & leather gloves resting on velvet display plinths
        ctx.fillStyle = '#b98552';
        ctx.fillRect(wx + 6, winY + 10, 12, 16);
        ctx.fillStyle = '#8b5a34';
        ctx.fillRect(wx + 22, winY + 14, 11, 12);
        ctx.fillStyle = '#1f7062';
        ctx.fillRect(wx + 4, winY + 26, 32, 5);
      }

      // 11. TRADITIONAL GROCER (Mercearia & Conservas de Alfama): Rainbow fish-tin windows + outdoor wooden market crates
    } else if (venue.archStyle === 'mercearia') {
      for (const wx of [venue.x + 14, venue.x + venue.w - 60]) {
        ctx.fillStyle = '#15544a';
        ctx.fillRect(wx - 2, winY - 2, 48, 36);
        ctx.fillStyle = isEvening ? '#fde69e' : '#faf5e8';
        ctx.fillRect(wx, winY, 44, 32);
        const tins = ['#e11d48', '#f59e0b', '#0284c7', '#10b981'];
        for (let r = 0; r < 2; r += 1) {
          for (let c = 0; c < 4; c += 1) {
            ctx.fillStyle = tins[(r + c) % tins.length];
            ctx.fillRect(wx + 3 + c * 10, winY + 5 + r * 12, 8, 9);
          }
        }
      }
      // Wooden sidewalk market crates filled with figs & colorful tins
      for (const cx of [venue.x + 26, venue.x + venue.w - 50]) {
        ctx.fillStyle = '#8e623f';
        ctx.fillRect(cx, curbY - 6, 24, 11);
        ctx.strokeStyle = '#472d1b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, curbY - 6, 24, 11);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cx + 3, curbY - 4, 6, 6);
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(cx + 11, curbY - 4, 6, 6);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(cx + 18, curbY - 4, 4, 6);
      }
    }

    // Arched Portuguese Limestone Doorway + Striped Awning + Enamel Plaque
    this.drawVenueDoorAndPlaque(ctx, venue, visited, isEvening);
  }

  drawCathedralBuilding(ctx, venue, visited, isHighlighted, isEvening) {
    // Enterable Se de Lisboa (1147) Romanesque twin bell towers, rose window & glowing portal
    ctx.fillStyle = 'rgba(20, 26, 36, 0.24)';
    ctx.fillRect(venue.x + 7, venue.y + 9, venue.w, venue.h);

    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(venue.x - 4, venue.y - 16, venue.w + 8, venue.h + 20);
    }

    ctx.fillStyle = '#ddd5c5';
    ctx.fillRect(venue.x, venue.y, venue.w, venue.h);

    ctx.strokeStyle = 'rgba(98, 88, 72, 0.25)';
    ctx.lineWidth = 1;
    for (let sy = venue.y + 12; sy < venue.y + venue.h; sy += 14) {
      ctx.beginPath();
      ctx.moveTo(venue.x, sy);
      ctx.lineTo(venue.x + venue.w, sy);
      ctx.stroke();
    }

    this.drawTerracottaRoof(ctx, venue.x + 48, venue.y + 6, venue.w - 96, 42, '#9d4c36', false);

    const towerXs = [venue.x + 6, venue.x + venue.w - 50];
    for (const tx of towerXs) {
      ctx.fillStyle = '#d3cab7';
      ctx.fillRect(tx, venue.y - 12, 44, venue.h + 10);
      ctx.strokeStyle = '#6b5e4c';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(tx, venue.y - 12, 44, venue.h + 10);

      ctx.fillStyle = '#e5ded0';
      for (let bx = tx + 2; bx < tx + 40; bx += 11) {
        ctx.fillRect(bx, venue.y - 18, 7, 7);
        ctx.strokeRect(bx, venue.y - 18, 7, 7);
      }

      ctx.fillStyle = '#3c362e';
      ctx.beginPath();
      ctx.arc(tx + 22, venue.y + 22, 10, Math.PI, 0);
      ctx.lineTo(tx + 32, venue.y + 42);
      ctx.lineTo(tx + 12, venue.y + 42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a47d43';
      ctx.beginPath();
      ctx.arc(tx + 22, venue.y + 28, 5, Math.PI, 0);
      ctx.fill();
    }

    // Spoked stained-glass rose window
    const rcx = venue.x + venue.w / 2;
    const rcy = venue.y + 78;
    ctx.fillStyle = isEvening ? '#f7ce65' : '#2f5885';
    ctx.beginPath();
    ctx.arc(rcx, rcy, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6c5f4d';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.strokeStyle = '#ebe4d5';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(rcx, rcy);
      ctx.lineTo(rcx + Math.cos(a) * 18, rcy + Math.sin(a) * 18);
      ctx.stroke();
    }

    // Warm golden welcome light spilling onto the sidewalk from the open Gothic portal
    const pulse = 0.34 + Math.sin(this.animTime * 3.0) * 0.1;
    ctx.fillStyle = `rgba(255, 214, 118, ${isEvening ? 0.65 : pulse})`;
    ctx.beginPath();
    ctx.ellipse(venue.doorX, venue.doorY + 11, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Triple-recessed Gothic entrance portal arch with illuminated open sanctuary interior
    ctx.fillStyle = '#625647';
    ctx.beginPath();
    ctx.arc(rcx, venue.y + venue.h - 22, 21, Math.PI, 0);
    ctx.lineTo(rcx + 21, venue.y + venue.h);
    ctx.lineTo(rcx - 21, venue.y + venue.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8d57e';
    ctx.beginPath();
    ctx.arc(rcx, venue.y + venue.h - 18, 13, Math.PI, 0);
    ctx.lineTo(rcx + 13, venue.y + venue.h);
    ctx.lineTo(rcx - 13, venue.y + venue.h);
    ctx.closePath();
    ctx.fill();

    // Enamel heritage plaque showing ENTER / VISITED status
    const plaqueW = 148;
    const plaqueH = 29;
    drawRoundedRect(ctx, rcx - plaqueW / 2, venue.y + 8, plaqueW, plaqueH, 5);
    ctx.fillStyle = 'rgba(24, 34, 48, 0.9)';
    ctx.fill();
    ctx.strokeStyle = visited ? '#6ee7b7' : '#f3c623';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.font = '700 10.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SE DE LISBOA', rcx, venue.y + 20);
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    ctx.fillStyle = visited ? '#86efac' : '#fde68a';
    ctx.fillText(visited ? `${venue.badge} VISITED` : `${venue.badge} ENTER`, rcx, venue.y + 32);
    ctx.textAlign = 'left';
  }

  drawQuiosqueBuilding(ctx, venue, visited, isHighlighted, isEvening) {
    // Authentic octagonal green wrought-iron Lisbon garden kiosk (Quiosque de Sao Pedro)
    const cx = venue.x + venue.w / 2;
    const cy = venue.y + venue.h / 2 + 4;

    // Garden limestone terrace base with wrought-iron railings
    ctx.fillStyle = 'rgba(20, 28, 36, 0.2)';
    drawRoundedRect(ctx, venue.x + 8, venue.y + 10, venue.w - 8, venue.h - 6, 14);
    ctx.fill();

    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, venue.x - 4, venue.y - 4, venue.w + 8, venue.h + 8, 14);
      ctx.stroke();
    }

    ctx.fillStyle = '#e7dfd0';
    drawRoundedRect(ctx, venue.x + 4, venue.y + 6, venue.w - 8, venue.h - 10, 12);
    ctx.fill();
    ctx.strokeStyle = '#245e4f';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Small round outdoor cafe tables with striped sun umbrellas flanking the octagon
    for (const tx of [venue.x + 28, venue.x + venue.w - 28]) {
      ctx.fillStyle = '#1f5446';
      ctx.beginPath();
      ctx.arc(tx, cy + 20, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(tx, cy + 20);
      ctx.arc(tx, cy + 20, 14, 0, Math.PI / 2);
      ctx.moveTo(tx, cy + 20);
      ctx.arc(tx, cy + 20, 14, Math.PI, Math.PI * 1.5);
      ctx.fill();
      ctx.strokeStyle = '#0f332a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(tx, cy + 20, 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Octagonal green iron pavilion walls
    const drawOctagon = (radius, offsetY = 0) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const ox = cx + Math.cos(a) * radius;
        const oy = cy + offsetY + Math.sin(a) * (radius * 0.78);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.closePath();
    };

    drawOctagon(54, 8);
    ctx.fillStyle = '#1f5446';
    ctx.fill();
    ctx.strokeStyle = '#0f332a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Warm serving counter windows around front of kiosk
    ctx.fillStyle = isEvening ? '#ffe394' : '#f7e4b2';
    ctx.fillRect(cx - 26, cy + 20, 52, 24);
    ctx.strokeStyle = '#143b31';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 26, cy + 20, 52, 24);

    // Ornate domed wrought-iron Lisbon kiosk cupola roof
    drawOctagon(58, -10);
    const roofGrad = ctx.createRadialGradient(cx - 10, cy - 22, 6, cx, cy - 10, 58);
    roofGrad.addColorStop(0, '#44917b');
    roofGrad.addColorStop(1, '#1a493d');
    ctx.fillStyle = roofGrad;
    ctx.fill();
    ctx.strokeStyle = '#d1fae5';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Central brass spire finial
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // Door step spill glow
    ctx.fillStyle = 'rgba(255, 212, 108, 0.34)';
    ctx.beginPath();
    ctx.ellipse(venue.doorX, venue.doorY + 10, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Plaque
    const plaqueW = 168;
    const plaqueH = 29;
    drawRoundedRect(ctx, cx - plaqueW / 2, venue.y + 8, plaqueW, plaqueH, 5);
    ctx.fillStyle = 'rgba(18, 42, 36, 0.92)';
    ctx.fill();
    ctx.strokeStyle = visited ? '#6ee7b7' : '#f3c623';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.font = '700 10.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(venue.name, cx, venue.y + 20);
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    ctx.fillStyle = visited ? '#86efac' : '#fde68a';
    ctx.fillText(visited ? `${venue.badge} VISITED` : `${venue.badge} ENTER`, cx, venue.y + 32);
    ctx.textAlign = 'left';
  }

  drawBrasileiraBuilding(ctx, venue, visited, isHighlighted, isEvening) {
    // Iconic 1905 Art Nouveau Cafe A Brasileira + Bronze Fernando Pessoa seated terrace statue
    ctx.fillStyle = 'rgba(18, 26, 36, 0.25)';
    ctx.fillRect(venue.x + 7, venue.y + 9, venue.w, venue.h);

    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(venue.x - 4, venue.y - 4, venue.w + 8, venue.h + 8);
    }

    const roofH = Math.round(venue.h * 0.38);
    // Upper stone masonry floor + terracotta roof
    ctx.fillStyle = '#efe6d5';
    ctx.fillRect(venue.x, venue.y + roofH - 2, venue.w, venue.h - roofH + 2);
    this.drawTerracottaRoof(ctx, venue.x - 3, venue.y - 3, venue.w + 6, roofH, '#8d4827', {
      hasChimney: true,
      hasDormers: true
    });

    // Ornate dark mahogany & brass Art Nouveau ground storefront
    const sfY = venue.y + roofH + 14;
    const sfH = venue.y + venue.h - sfY;
    ctx.fillStyle = '#3d2417';
    ctx.fillRect(venue.x + 4, sfY, venue.w - 8, sfH);
    ctx.strokeStyle = '#d4a337';
    ctx.lineWidth = 2;
    ctx.strokeRect(venue.x + 6, sfY + 2, venue.w - 12, sfH - 4);

    // Gilded Art Nouveau curved display windows flanking the central brass doorway
    for (const wx of [venue.x + 14, venue.x + venue.w - 58]) {
      ctx.fillStyle = isEvening ? '#ffe494' : '#f5e1b5';
      ctx.beginPath();
      ctx.arc(wx + 22, sfY + 22, 20, Math.PI, 0);
      ctx.lineTo(wx + 42, sfY + sfH - 6);
      ctx.lineTo(wx + 2, sfY + sfH - 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c99424';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Gilded "A BRASILEIRA" Art Nouveau frieze bar above storefront
    ctx.fillStyle = '#183d2e';
    ctx.fillRect(venue.x + 12, sfY - 12, venue.w - 24, 14);
    ctx.strokeStyle = '#e5b53d';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(venue.x + 12, sfY - 12, venue.w - 24, 14);
    ctx.fillStyle = '#fef08a';
    ctx.font = '700 8.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('A BRASILEIRA  -  1905', venue.x + venue.w / 2, sfY - 2.5);
    ctx.textAlign = 'left';

    // Famous Bronze Fernando Pessoa seated at a marble cafe table + second terrace espresso table on right
    const px = venue.x + 34;
    const py = venue.y + venue.h + 13;
    ctx.fillStyle = 'rgba(20, 26, 36, 0.2)';
    ctx.beginPath();
    ctx.ellipse(px, py + 4, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8f5ef';
    ctx.beginPath();
    ctx.arc(px + 6, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c4b3b';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#4a5d54';
    ctx.beginPath();
    ctx.arc(px - 6, py - 1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d3b35';
    ctx.fillRect(px - 11, py - 6, 10, 2.5);
    ctx.fillRect(px - 9, py - 9, 6, 3.5);

    // Second Chiado terrace marble table on the right side of the awning
    const tx2 = venue.x + venue.w - 32;
    ctx.fillStyle = '#f8f5ef';
    ctx.beginPath();
    ctx.arc(tx2, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c4b3b';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(tx2 - 2, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d98a1c';
    ctx.beginPath();
    ctx.arc(tx2 + 3, py, 2.2, 0, Math.PI * 2);
    ctx.fill();

    this.drawVenueDoorAndPlaque(ctx, venue, visited, isEvening);
  }

  drawVenueDoorAndPlaque(ctx, venue, visited, isEvening) {
    const doorW = 36;
    const doorH = 34;
    const dx = venue.doorX - doorW / 2;
    const dy = venue.doorSide === 'south' ? venue.y + venue.h - doorH : venue.y;

    const pulse = 0.3 + Math.sin(this.animTime * 3.2) * 0.1;
    ctx.fillStyle = `rgba(255, 212, 108, ${isEvening ? 0.62 : pulse})`;
    ctx.beginPath();
    ctx.ellipse(
      venue.doorX,
      venue.doorSide === 'south' ? venue.doorY + 11 : venue.doorY - 11,
      28,
      12,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#e9e2d2';
    ctx.fillRect(dx - 4, dy - 2, doorW + 8, doorH + 2);
    ctx.strokeStyle = '#7e7362';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(dx - 4, dy - 2, doorW + 8, doorH + 2);

    ctx.fillStyle = '#4e311d';
    ctx.fillRect(dx, dy, doorW, doorH);
    ctx.fillStyle = '#f8d57e';
    ctx.beginPath();
    if (venue.doorSide === 'south') {
      ctx.arc(venue.doorX, dy + 12, 11, Math.PI, 0);
      ctx.lineTo(venue.doorX + 11, dy + doorH - 2);
      ctx.lineTo(venue.doorX - 11, dy + doorH - 2);
    } else {
      ctx.rect(dx + 6, dy + 3, doorW - 12, doorH - 6);
    }
    ctx.closePath();
    ctx.fill();

    const awningY = venue.doorSide === 'south' ? dy - 11 : dy + doorH;
    ctx.fillStyle = venue.awningColor;
    ctx.fillRect(dx - 10, awningY, doorW + 20, 11);
    ctx.fillStyle = '#fff9f0';
    for (let sx = dx - 6; sx < dx + doorW + 8; sx += 10) {
      ctx.fillRect(sx, awningY, 4, 11);
    }
    ctx.fillStyle = venue.awningColor;
    for (let sx = dx - 6; sx <= dx + doorW + 6; sx += 8) {
      ctx.beginPath();
      ctx.arc(sx, venue.doorSide === 'south' ? awningY + 11 : awningY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(22, 32, 46, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(venue.x, venue.y, venue.w, venue.h);

    const plaqueW = Math.min(venue.w - 14, 184);
    const plaqueH = 31;
    const plaqueX = venue.x + (venue.w - plaqueW) / 2;
    const plaqueY = venue.doorSide === 'south' ? venue.y + 8 : venue.y + venue.h - plaqueH - 8;

    drawRoundedRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 5);
    ctx.fillStyle = 'rgba(18, 34, 56, 0.88)';
    ctx.fill();
    ctx.strokeStyle = visited ? '#6ee7b7' : '#f3c623';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.font = '700 10.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(venue.name, venue.x + venue.w / 2, plaqueY + 13);

    ctx.font = '700 8.8px "Segoe UI", sans-serif';
    ctx.fillStyle = visited ? '#86efac' : '#fde68a';
    ctx.fillText(
      visited ? `${venue.badge} VISITED` : `${venue.badge} ENTER`,
      venue.x + venue.w / 2,
      plaqueY + 25
    );
    ctx.textAlign = 'left';
  }


  drawFerryTerminal(ctx, isHighlighted, isEvening) {
    const t = FERRY_TERMINAL;
    ctx.save();

    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, t.x - 5, t.y - 5, t.w + 10, t.h + 10, 10);
      ctx.stroke();
    }

    // Wooden ferry boarding piers extending into the Tagus River
    ctx.fillStyle = '#785134';
    ctx.fillRect(t.x + 14, t.y + t.h - 4, 24, 46);
    ctx.fillRect(t.x + t.w - 38, t.y + t.h - 4, 24, 46);
    ctx.strokeStyle = '#472d1b';
    ctx.lineWidth = 1.2;
    for (let py = t.y + t.h + 4; py < t.y + t.h + 40; py += 8) {
      ctx.beginPath();
      ctx.moveTo(t.x + 14, py);
      ctx.lineTo(t.x + 38, py);
      ctx.moveTo(t.x + t.w - 38, py);
      ctx.lineTo(t.x + t.w - 14, py);
      ctx.stroke();
    }

    // Moored orange-and-white Transtejo Catamaran gently bobbing beside pier
    const bob = Math.sin(this.animTime * 2.4) * 2;
    const fx = t.x + 56;
    const fy = t.y + t.h + 12 + bob;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(fx + 38, fy + 16, 44, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    drawRoundedRect(ctx, fx, fy, 78, 26, 9);
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    drawRoundedRect(ctx, fx + 8, fy + 4, 58, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(fx + 14, fy + 7, 42, 6);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 7.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRANSTEJO', fx + 38, fy + 20);

    // Emerald & glass Cais do Sodre Ferry Terminal pavilion sitting on the seawall
    ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
    drawRoundedRect(ctx, t.x + 4, t.y + 6, t.w, t.h, 8);
    ctx.fill();

    ctx.fillStyle = '#0f5c52';
    drawRoundedRect(ctx, t.x, t.y, t.w, t.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#083a34';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Skylight glass bays across roof
    ctx.fillStyle = isEvening ? '#fde68a' : '#bae6fd';
    for (let gx = t.x + 14; gx < t.x + t.w - 28; gx += 34) {
      drawRoundedRect(ctx, gx, t.y + 24, 24, 18, 3);
      ctx.fill();
    }

    // North-facing entrance arch along Avenida Ribeira promenade
    ctx.fillStyle = '#e5ded0';
    ctx.fillRect(t.doorX - 18, t.y - 2, 36, 12);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(t.doorX - 13, t.y, 26, 8);

    // Header badge
    drawRoundedRect(ctx, t.x + 12, t.y + 44, t.w - 24, 18, 4);
    ctx.fillStyle = 'rgba(12, 30, 48, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAIS DO SODRE - FERRY PORT', t.x + t.w / 2, t.y + 56);

    ctx.restore();
  }


  drawSantaJustaOverworld(ctx, isHighlighted, isEvening) {
    const sj = SANTA_JUSTA_LIFT;
    ctx.save();
    if (isHighlighted) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, sj.x - 5, sj.y - 5, sj.w + 10, sj.h + 10, 8);
      ctx.stroke();
    }
    // Cast-iron Carmo walkway skybridge extending west from the tower
    ctx.fillStyle = '#334155';
    ctx.fillRect(sj.x - 54, sj.y + 42, 56, 18);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(sj.x - 54, sj.y + 42, 56, 18);

    // Tower shadow & dark wrought-iron Neo-Gothic lattice roof footprint
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    drawRoundedRect(ctx, sj.x + 5, sj.y + 6, sj.w, sj.h, 6);
    ctx.fill();

    ctx.fillStyle = isEvening ? '#1e293b' : '#2f3d4c';
    drawRoundedRect(ctx, sj.x, sj.y, sj.w, sj.h, 6);
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? '#facc15' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Neo-Gothic diagonal filigree ribs & top miradouro skylight ring
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sj.x + 6, sj.y + 6);
    ctx.lineTo(sj.x + sj.w - 6, sj.y + sj.h - 6);
    ctx.moveTo(sj.x + sj.w - 6, sj.y + 6);
    ctx.lineTo(sj.x + 6, sj.y + sj.h - 6);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(sj.x + sj.w * 0.5, sj.y + sj.h * 0.44, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = '700 8px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('45m', sj.x + sj.w * 0.5, sj.y + sj.h * 0.44 + 3);

    // Illuminated south entrance arch facing Rua Garrett / Rua do Carmo
    ctx.fillStyle = '#fde047';
    ctx.fillRect(sj.doorX - 13, sj.y + sj.h - 8, 26, 8);

    // Crisp plaque tag
    drawRoundedRect(ctx, sj.x - 16, sj.y + sj.h - 28, sj.w + 32, 16, 4);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.font = '700 8px Georgia, serif';
    ctx.fillText('SANTA JUSTA (1902)', sj.x + sj.w * 0.5, sj.y + sj.h - 17);
    ctx.restore();
  }

}

export const buildings2dMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    buildings2dMethods[key] = _Mixin.prototype[key];
  }
}
