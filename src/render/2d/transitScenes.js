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
  renderMetro(ctx, state, nearbyInteraction) {
    const m = state.metro;
    const isTunnelCruise = m.phase === 'riding' && m.phaseProgress >= 0.16 && m.phaseProgress <= 0.84;

    // Deep subterranean framing backdrop
    ctx.fillStyle = '#0d1522';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    const offsetX = Math.round((this.viewWidth - INTERIOR_WIDTH) / 2);
    const offsetY = Math.round((this.viewHeight - INTERIOR_HEIGHT) / 2);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    if (m.phase === 'transferring') {
      this.renderMetroTransferScene(ctx, state);
    } else if (isTunnelCruise) {
      this.renderMetroTunnelRide(ctx, state);
    } else {
      this.renderMetroPlatformScene(ctx, state, nearbyInteraction);
    }

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  renderMetroTransferScene(ctx, state) {
    const m = state.metro;
    const station = ALL_METRO_STATIONS.find((s) => s.id === m.stationId) || METRO_STATIONS[0];
    const stationLineIds = getStationLineIds(station);
    const fromLine = getMetroLineById(m.activeLineId || stationLineIds[0]);
    const toLine = getMetroLineById(m.transferToLineId || stationLineIds.find((id) => id !== fromLine?.id) || stationLineIds[0]);
    const fromColor = fromLine?.color || '#2563eb';
    const toColor = toLine?.color || '#eab308';
    const p = clamp(m.phaseProgress || 0, 0, 1);

    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = toColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Tiled Lisboa underground transfer passage walls & floor
    ctx.fillStyle = station.undergroundTheme?.wallPrimary || '#e5dfd3';
    ctx.fillRect(8, 8, INTERIOR_WIDTH - 16, 136);
    this.drawAzulejoWall(ctx, 8, 86, INTERIOR_WIDTH - 16, 56, 'cobalt-azulejo');

    // Dual-color transition wayfinding band (fromLine -> toLine)
    const splitX = Math.round(8 + (INTERIOR_WIDTH - 16) * 0.5);
    ctx.fillStyle = fromColor;
    ctx.fillRect(8, 138, splitX - 8, 10);
    ctx.fillStyle = toColor;
    ctx.fillRect(splitX, 138, INTERIOR_WIDTH - 8 - splitX, 10);

    // Pedestrian corridor walkway floor
    ctx.fillStyle = station.undergroundTheme?.platformFloor || '#d4cec2';
    ctx.fillRect(8, 148, INTERIOR_WIDTH - 16, 200);
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.14)';
    ctx.lineWidth = 1;
    for (let gx = 40; gx < INTERIOR_WIDTH - 16; gx += 36) {
      ctx.beginPath();
      ctx.moveTo(gx, 148);
      ctx.lineTo(gx, 348);
      ctx.stroke();
    }

    // Guiding floor arrows along the transfer corridor
    ctx.strokeStyle = toColor;
    ctx.lineWidth = 3;
    for (let ax = 150; ax <= 610; ax += 92) {
      ctx.beginPath();
      ctx.moveTo(ax - 12, 238);
      ctx.lineTo(ax + 8, 250);
      ctx.lineTo(ax - 12, 262);
      ctx.stroke();
    }

    // Left origin line arch & Right destination line arch
    drawRoundedRect(ctx, 18, 178, 88, 142, 8);
    ctx.fillStyle = fromColor;
    ctx.fill();
    ctx.fillStyle = fromLine?.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
    ctx.font = '800 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((fromLine?.name || 'FROM').toUpperCase(), 62, 252, 80);

    drawRoundedRect(ctx, INTERIOR_WIDTH - 106, 178, 88, 142, 8);
    ctx.fillStyle = toColor;
    ctx.fill();
    ctx.fillStyle = toLine?.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
    ctx.fillText((toLine?.name || 'TO').toUpperCase(), INTERIOR_WIDTH - 62, 252, 80);

    // Walking traveler moving smoothly across the Correspondencia passage
    const px = 128 + p * (INTERIOR_WIDTH - 256);
    this.drawCharacterSprite(ctx, px, 252, {
      facing: 'right',
      walkPhase: this.animTime * 9,
      isMoving: true,
      outfitId: state.player.outfitId,
      label: state.player.name,
      isPlayer: true
    });

    // Overhead Correspondencia plaque
    drawRoundedRect(ctx, 110, 18, 540, 56, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fill();
    ctx.strokeStyle = toColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CORRESPONDENCIA AT ${station.name.replace('Metro ', '').toUpperCase()}`, 380, 41, 520);
    ctx.fillStyle = '#fde68a';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillText(
      `${(fromLine?.name || '').toUpperCase()}  ->  ${(toLine?.name || '').toUpperCase()}  |  FREE IN-STATION TRANSFER`,
      380,
      61,
      520
    );

    // Lower informational footer strip
    ctx.fillStyle = '#111827';
    ctx.fillRect(8, 348, INTERIOR_WIDTH - 16, 100);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.fillText(
      `Next Platform Termini: ${(toLine?.termini || []).join('  <->  ')}`,
      380,
      394
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 9.5px "Segoe UI", sans-serif';
    ctx.fillText('Single Navegante ticket covers transfers inside Metropolitano de Lisboa gates.', 380, 418);
    ctx.textAlign = 'left';
  }

  renderMetroPlatformScene(ctx, state, nearbyInteraction) {
    const m = state.metro;
    const station = ALL_METRO_STATIONS.find((s) => s.id === m.stationId) || METRO_STATIONS[0];
    const theme = station.undergroundTheme || {
      wallPrimary: '#ded8ce',
      tileAccent: '#1b4d89',
      platformFloor: '#d4cec2',
      trim: '#1e3a5f',
      artLabel: 'METROPOLITANO DE LISBOA'
    };
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

    // Frame shell
    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = '#182436';
    ctx.fill();
    ctx.strokeStyle = primaryLineColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // 1. Station tiled upper vault wall + Station-Specific Lisboa Azulejo Mural Art
    ctx.fillStyle = theme.wallPrimary;
    ctx.fillRect(6, 6, INTERIOR_WIDTH - 12, 146);
    this.drawAzulejoWall(ctx, 8, 92, INTERIOR_WIDTH - 16, 56, 'cobalt-azulejo');

    // Station-specific architectural mural interventions across all 4 official Lisbon Metro lines
    for (const [mx0, mw] of [[24, 286], [450, 286]]) {
      if (theme.muralStyle === 'siza-limestone-gold') {
        ctx.fillStyle = '#ece6db';
        ctx.fillRect(mx0, 96, mw, 46);
        for (let gx = mx0 + 14; gx < mx0 + mw - 18; gx += 38) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(gx, 102, 20, 34);
          ctx.strokeStyle = '#fef08a';
          ctx.strokeRect(gx, 102, 20, 34);
        }
      } else if (theme.muralStyle === 'transparencia-blue-glass') {
        ctx.fillStyle = '#0c4a6e';
        ctx.fillRect(mx0, 96, mw, 46);
        const cols = ['#0284c7', '#38bdf8', '#bae6fd', '#1d4ed8'];
        for (let i = 0; i < 6; i += 1) {
          ctx.fillStyle = cols[i % cols.length];
          ctx.fillRect(mx0 + 10 + i * 45, 100, 34, 38);
        }
      } else if (theme.muralStyle === 'dacosta-wonderland-tiles') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(mx0, 96, mw, 46);
        for (let i = 0; i < 4; i += 1) {
          const rx = mx0 + 36 + i * 68;
          ctx.fillStyle = '#1d4ed8';
          ctx.beginPath();
          ctx.ellipse(rx, 122, 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(rx - 6, 102, 4, 12);
          ctx.fillRect(rx + 2, 102, 4, 12);
        }
      } else if (theme.muralStyle === 'keil-geometric-patterns') {
        ctx.fillStyle = '#ecfdf5';
        ctx.fillRect(mx0, 96, mw, 46);
        const cols = ['#16a34a', '#eab308', '#2563eb', '#0f766e'];
        for (let i = 0; i < 6; i += 1) {
          const gx = mx0 + 18 + i * 44;
          ctx.fillStyle = cols[i % cols.length];
          ctx.beginPath();
          ctx.moveTo(gx + 16, 100);
          ctx.lineTo(gx + 32, 119);
          ctx.lineTo(gx + 16, 138);
          ctx.lineTo(gx, 119);
          ctx.closePath();
          ctx.fill();
        }
      } else if (theme.muralStyle === 'cargaleiro-polychrome' || theme.muralStyle === 'taveira-polychrome-arches') {
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(mx0, 96, mw, 46);
        const cols = ['#dc2626', '#2563eb', '#eab308', '#16a34a', '#9333ea'];
        for (let i = 0; i < 7; i += 1) {
          ctx.fillStyle = cols[i % cols.length];
          ctx.fillRect(mx0 + 10 + i * 38, 100, 28, 38);
        }
      } else if (theme.muralStyle === 'calatrava-oceans-mural' || theme.muralStyle === 'pomar-zoo-fauna') {
        ctx.fillStyle = theme.muralStyle === 'calatrava-oceans-mural' ? '#e0f2fe' : '#fef9c3';
        ctx.fillRect(mx0, 96, mw, 46);
        const cols = ['#0284c7', '#dc2626', '#eab308', '#16a34a'];
        for (let i = 0; i < 5; i += 1) {
          ctx.fillStyle = cols[i % cols.length];
          ctx.beginPath();
          ctx.arc(mx0 + 30 + i * 56, 119, 13, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme.muralStyle === 'nery-convite-sentinels' || theme.muralStyle === 'almada-marble-reliefs') {
        ctx.fillStyle = theme.muralStyle === 'nery-convite-sentinels' ? '#eff6ff' : '#f5ebe0';
        ctx.fillRect(mx0, 96, mw, 46);
        for (let i = 0; i < 5; i += 1) {
          ctx.fillStyle = theme.muralStyle === 'nery-convite-sentinels' ? '#1d4ed8' : '#b91c1c';
          ctx.fillRect(mx0 + 22 + i * 54, 102, 22, 34);
        }
      } else if (theme.muralStyle === 'ferroviarios-railway-tiles') {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(mx0, 96, mw, 46);
        for (let i = 0; i < 5; i += 1) {
          const wx = mx0 + 28 + i * 56;
          ctx.strokeStyle = i % 2 === 0 ? '#1d4ed8' : '#b45309';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(wx, 119, 13, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(wx, 119, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Active line color stripe along upper platform wall
    ctx.fillStyle = primaryLineColor;
    ctx.fillRect(8, 86, INTERIOR_WIDTH - 16, 6);
    if (secondaryLineColor) {
      ctx.fillStyle = secondaryLineColor;
      ctx.fillRect(8, 80, INTERIOR_WIDTH - 16, 5);
    }

    // Overhead station architectural vault arches & fluorescent light fixtures
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
    ctx.lineWidth = 2;
    for (let ax = 70; ax < INTERIOR_WIDTH - 60; ax += 150) {
      ctx.beginPath();
      ctx.arc(ax, 92, 54, Math.PI, 0);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 252, 236, 0.85)';
    for (let lx = 64; lx < INTERIOR_WIDTH - 80; lx += 170) {
      ctx.fillRect(lx, 14, 72, 6);
    }

    // Left & right station name plaques with authentic red diamond Metropolitano de Lisboa M emblem & LED countdown boards
    for (const [idx, px] of [138, 622].entries()) {
      drawRoundedRect(ctx, px - 108, 24, 216, 48, 6);
      ctx.fillStyle = '#143258';
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Red Diamond M Logo
      const dx = px - 84;
      const dy = 48;
      ctx.fillStyle = '#c81e32';
      ctx.beginPath();
      ctx.moveTo(dx, dy - 13);
      ctx.lineTo(dx + 13, dy);
      ctx.lineTo(dx, dy + 13);
      ctx.lineTo(dx - 13, dy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('M', dx, dy + 4);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px Georgia, serif';
      ctx.fillText(station.name.replace('Metro ', '').toUpperCase(), px - 64, 43, 166);
      ctx.fillStyle = '#93c5fd';
      ctx.font = '700 8.5px "Segoe UI", sans-serif';
      const activeLineUpper = (activeLine?.name || station.lines[0] || 'LINHA AZUL').toUpperCase();
      ctx.fillText(`${activeLineUpper} PLATFORM`, px - 64, 56, 166);
      // Red-LED Next-Train Countdown Line at bottom of plaque (strictly matching active platform line!)
      ctx.fillStyle = '#fb923c';
      ctx.font = '700 8.5px "Consolas", monospace';
      const nextDest =
        idx === 0
          ? (activeLine?.termini?.[1] || theme.nextTrainDest || 'Santa Apolonia')
          : (activeLine?.termini?.[0] || theme.oppositeDest || 'Reboleira');
      ctx.fillText(`DEST: ${nextDest.toUpperCase()} ${idx === 0 ? '1 MIN' : '4 MIN'}`, px - 64, 67, 166);
    }

    // 2. Animated Moving Escalator Bank (center top: x 328..432, y 22..162)
    const escX = 328;
    const escY = 24;
    const escW = 104;
    const escH = 136;

    // Steel escalator housing
    ctx.fillStyle = '#334155';
    drawRoundedRect(ctx, escX - 6, escY, escW + 12, escH, 6);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.fillRect(escX + 6, escY + 8, escW - 12, escH - 12);

    // Animated moving escalator treads
    const treadSpeed = m.phase === 'descending' ? 42 : m.phase === 'ascending' ? -42 : 16;
    const treadPhase = ((this.animTime * treadSpeed) % 10 + 10) % 10;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.8;
    for (let ty = escY + 12 + treadPhase; ty < escY + escH - 6; ty += 10) {
      ctx.beginPath();
      ctx.moveTo(escX + 10, ty);
      ctx.lineTo(escX + escW - 10, ty);
      ctx.stroke();
    }

    // Brushed steel handrails & top sunlit street portal glow
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(escX + 2, escY + 6, 6, escH - 8);
    ctx.fillRect(escX + escW - 8, escY + 6, 6, escH - 8);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.36)';
    ctx.fillRect(escX + 8, escY + 4, escW - 16, 22);

    // Escalator header sign
    drawRoundedRect(ctx, escX - 18, escY - 14, escW + 36, 20, 4);
    ctx.fillStyle = nearbyInteraction?.type === 'metro-exit' ? '#d97706' : '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESCALATOR - STREET EXIT', 380, escY - 1);

    // 3. Tiled Underground Platform Floor (y: 156..290)
    ctx.fillStyle = theme.platformFloor;
    ctx.fillRect(8, 156, INTERIOR_WIDTH - 16, 134);

    // Platform stone grid tiles
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.14)';
    ctx.lineWidth = 1;
    for (let gx = 40; gx < INTERIOR_WIDTH - 16; gx += 36) {
      ctx.beginPath();
      ctx.moveTo(gx, 156);
      ctx.lineTo(gx, 290);
      ctx.stroke();
    }
    for (let gy = 186; gy < 290; gy += 34) {
      ctx.beginPath();
      ctx.moveTo(8, gy);
      ctx.lineTo(INTERIOR_WIDTH - 8, gy);
      ctx.stroke();
    }

    // Yellow Navegante ticket turnstiles flanking the escalator exit
    for (const gx of [190, 240, 470, 520]) {
      ctx.fillStyle = '#eab308';
      drawRoundedRect(ctx, gx, 156, 28, 12, 3);
      ctx.fill();
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Platform benches (keep east floor clear when Correspondencia transfer arch is present!)
    const benchXs = otherLine ? [110, 476] : [110, 580];
    for (const bx of benchXs) {
      ctx.fillStyle = '#475569';
      drawRoundedRect(ctx, bx, 198, 70, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx + 6, 202, 58, 10);
    }

    // Tactile yellow platform safety edge line
    ctx.fillStyle = '#facc15';
    ctx.fillRect(8, 282, INTERIOR_WIDTH - 16, 8);
    ctx.fillStyle = '#a16207';
    for (let dx = 14; dx < INTERIOR_WIDTH - 16; dx += 14) {
      ctx.fillRect(dx, 285, 6, 2);
    }

    // Boarding zone floor marker & East-Wall Transfer Corridor Arch (ONLY on 2-line transfer hubs!)
    if (m.phase === 'platform') {
      const boardLineLabel = (activeLine?.name || 'METRO').toUpperCase();
      this.drawInteriorMarker(
        ctx,
        380,
        252,
        `BOARD ${boardLineLabel} [E]`,
        nearbyInteraction?.type === 'metro-board'
      );

      if (otherLine) {
        // East-wall recessed Correspondencia transfer arch
        drawRoundedRect(ctx, 684, 174, 66, 68, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = otherLine.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = otherLine.color;
        ctx.fillRect(687, 177, 60, 16);
        ctx.fillStyle = otherLine.id === 'linha-amarela' ? '#0f172a' : '#ffffff';
        ctx.font = '800 7.5px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TRANSFER', 717, 188);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 8px "Segoe UI", sans-serif';
        ctx.fillText(otherLine.name.replace('Linha ', '').toUpperCase(), 717, 212);
        ctx.fillStyle = '#fde047';
        ctx.font = '700 7.5px "Segoe UI", sans-serif';
        ctx.fillText('FREE ->', 717, 229);
        ctx.textAlign = 'left';

        this.drawInteriorMarker(
          ctx,
          622,
          208,
          `TO ${otherLine.name.toUpperCase()} [E]`,
          nearbyInteraction?.type === 'metro-transfer'
        );
      }
    }

    // 4. Recessed Underground Railway Track Bed (y: 290..448)
    ctx.fillStyle = '#111827';
    ctx.fillRect(8, 290, INTERIOR_WIDTH - 16, 158);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(8, 290, INTERIOR_WIDTH - 16, 10);

    // Concrete railway sleepers
    ctx.fillStyle = '#2b3544';
    for (let tx = 20; tx < INTERIOR_WIDTH - 18; tx += 22) {
      ctx.fillRect(tx, 318, 10, 86);
    }
    // Twin steel Metro rails + active line third-rail highlight
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8, 332, INTERIOR_WIDTH - 16, 4);
    ctx.fillRect(8, 386, INTERIOR_WIDTH - 16, 4);
    ctx.fillStyle = primaryLineColor;
    ctx.fillRect(8, 412, INTERIOR_WIDTH - 16, 3);

    // Subterranean tunnel mouth arches at left & right edges
    ctx.fillStyle = '#090f1a';
    ctx.fillRect(8, 294, 24, 150);
    ctx.fillRect(INTERIOR_WIDTH - 32, 294, 24, 150);

    // 5. Sleek Metropolitano de Lisboa Train clipped cleanly to the underground track vault
    ctx.save();
    ctx.beginPath();
    ctx.rect(8, 290, INTERIOR_WIDTH - 16, 158);
    ctx.clip();
    const doorsOpen = m.phase === 'platform';
    const showRiderInTrain = m.phase === 'riding';
    this.drawMetroTrain(ctx, m.trainX, 360, {
      doorsOpen,
      showRiderInTrain,
      direction: m.direction || 1,
      headlightsOn: true,
      lineColor: primaryLineColor
    });
    ctx.restore();

    // 6. Active Metropolitano de Lisboa Line Strip Diagram at bottom of vault
    this.drawMetroRouteStrip(
      ctx,
      station.id,
      m.toStationId,
      m.phase === 'riding' ? m.phaseProgress : 0,
      424,
      m.route,
      activeLineId
    );

    // Walk target on platform
    if (m.phase === 'platform' && state.player.walkTarget) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 7. Player character & any connected travelers sharing the same underground Metro platform
    const metroActors = [];
    if (m.phase !== 'riding') {
      metroActors.push({
        x: state.player.x,
        y: state.player.y,
        facing: state.player.facing,
        walkPhase: state.player.walkPhase,
        isMoving: state.player.isMoving,
        outfitId: state.player.outfitId,
        label: (state.remotePlayers || []).length > 0 ? state.player.name : '',
        emoteText: state.player.emoteText || '',
        isPlayer: true
      });
    }
    for (const rp of state.remotePlayers || []) {
      if (rp.mode === 'metro' && rp.metroStationId === m.stationId && rp.metroPhase !== 'riding') {
        metroActors.push({
          x: rp.x,
          y: rp.y,
          facing: rp.facing,
          walkPhase: rp.walkPhase,
          isMoving: rp.isMoving,
          outfitId: rp.outfitId,
          label: rp.name,
          emoteText: rp.emoteText || '',
          isPlayer: false,
          isRemotePlayer: true
        });
      }
    }
    metroActors.sort((a, b) => a.y - b.y);
    for (const actor of metroActors) {
      this.drawCharacterSprite(ctx, actor.x, actor.y, actor);
    }
  }

  renderMetroTunnelRide(ctx, state) {
    const m = state.metro;
    const origin = ALL_METRO_STATIONS.find((s) => s.id === m.fromStationId) || METRO_STATIONS[0];
    const dest = ALL_METRO_STATIONS.find((s) => s.id === m.toStationId) || METRO_STATIONS[1];
    const dir = m.direction || 1;
    const route = m.route;
    const activeLineColor = route?.primaryColor || (origin.lineColors && origin.lineColors[0]) || '#2563eb';

    // Deep curved underground Lisbon Metro tunnel
    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, INTERIOR_HEIGHT);
    bgGrad.addColorStop(0, '#0a1220');
    bgGrad.addColorStop(0.5, '#132038');
    bgGrad.addColorStop(1, '#0b1322');
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.strokeStyle = activeLineColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Clip streaming tunnel ribs, sleepers, and train headlights cleanly inside the tunnel viewport
    ctx.save();
    drawRoundedRect(ctx, 4, 4, INTERIOR_WIDTH - 8, INTERIOR_HEIGHT - 8, 9);
    ctx.clip();

    // Streaming arched tunnel concrete ribs & active line light conduit
    const ribSpacing = 120;
    const scroll = ((m.tunnelOffset % ribSpacing) + ribSpacing) % ribSpacing;
    for (let rx = -ribSpacing + (dir > 0 ? ribSpacing - scroll : scroll); rx < INTERIOR_WIDTH + ribSpacing; rx += ribSpacing) {
      ctx.fillStyle = '#1e2c44';
      ctx.fillRect(rx, 8, 16, INTERIOR_HEIGHT - 16);
      ctx.fillStyle = '#33486b';
      ctx.fillRect(rx + 2, 8, 4, INTERIOR_HEIGHT - 16);

      // Warm tunnel safety lamp sconce
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(rx + 24, 152, 14, 5);
      const lampGlow = ctx.createRadialGradient(rx + 31, 155, 2, rx + 31, 155, 36);
      lampGlow.addColorStop(0, 'rgba(251, 191, 36, 0.34)');
      lampGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(rx + 31, 155, 36, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horizontal active Metro line illuminated cable strip streaking across tunnel wall
    ctx.fillStyle = activeLineColor;
    ctx.fillRect(8, 184, INTERIOR_WIDTH - 16, 5);

    // Passing intermediate stations & transfer hubs dynamically flashed from the 56-station network route
    const interStops = route?.intermediateStops || [];
    if (interStops.length > 0 && m.phaseProgress > 0.22 && m.phaseProgress < 0.78) {
      const normP = (m.phaseProgress - 0.22) / 0.56;
      const stopIdx = Math.min(interStops.length - 1, Math.floor(normP * interStops.length));
      const passingStop = interStops[stopIdx];
      const isTransfer = route?.transferStation && passingStop === route.transferStation;
      ctx.save();
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = isTransfer ? '#b45309' : activeLineColor;
      ctx.fillRect(190, 128, 380, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12.5px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isTransfer
          ? `TRANSFER HUB: ${passingStop.toUpperCase()}`
          : `PASSING: ${passingStop.toUpperCase()}`,
        380,
        151
      );
      ctx.restore();
    }

    // Track ballast & fast-moving sleepers
    ctx.fillStyle = '#0d1522';
    ctx.fillRect(8, 286, INTERIOR_WIDTH - 16, 160);
    const sleeperScroll = ((m.tunnelOffset * 1.4) % 28 + 28) % 28;
    ctx.fillStyle = '#243044';
    for (let sx = -28 + (dir > 0 ? 28 - sleeperScroll : sleeperScroll); sx < INTERIOR_WIDTH + 28; sx += 28) {
      ctx.fillRect(sx, 304, 11, 86);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8, 320, INTERIOR_WIDTH - 16, 4);
    ctx.fillRect(8, 374, INTERIOR_WIDTH - 16, 4);

    // Subtle vertical rail motion hum for the Metropolitano de Lisboa train
    const hum = Math.sin(this.animTime * 26) * 1.1;
    this.drawMetroTrain(ctx, 380, 346 + hum, {
      doorsOpen: false,
      showRiderInTrain: true,
      direction: dir,
      headlightsOn: true,
      lineColor: activeLineColor
    });

    // Overhead live 4-Line journey header & animated station progress map
    drawRoundedRect(ctx, 90, 18, 580, 78, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.strokeStyle = activeLineColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `METROPOLITANO DE LISBOA  -  ${origin.name.replace('Metro ', '')} -> ${dest.name.replace('Metro ', '')}`,
      380,
      39,
      556
    );

    this.drawMetroRouteStrip(ctx, origin.id, dest.id, m.phaseProgress, 68, route);
    if (state.metroDoorChime) {
      drawRoundedRect(ctx, 150, 102, 460, 24, 6);
      ctx.fillStyle = 'rgba(153, 27, 27, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${(state.metroDoorChime.triggeredBy || 'METRO').toUpperCase()} CHIME: "${state.metroDoorChime.text}"`,
        380,
        118,
        440
      );
    }
    ctx.restore();
  }

  drawMetroTrain(ctx, centerX, centerY, { doorsOpen, showRiderInTrain, direction, headlightsOn, lineColor = '#1d4ed8' }) {
    const trainW = 510;
    const trainH = 74;
    const x = centerX - trainW / 2;
    const y = centerY - trainH / 2;

    ctx.save();

    // Forward headlight cone in tunnel
    if (headlightsOn) {
      const noseX = direction >= 0 ? x + trainW : x;
      const beamEndX = direction >= 0 ? noseX + 160 : noseX - 160;
      const beam = ctx.createLinearGradient(noseX, centerY, beamEndX, centerY);
      beam.addColorStop(0, 'rgba(254, 249, 195, 0.45)');
      beam.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(noseX, centerY - 18);
      ctx.lineTo(beamEndX, centerY - 46);
      ctx.lineTo(beamEndX, centerY + 46);
      ctx.lineTo(noseX, centerY + 18);
      ctx.closePath();
      ctx.fill();
    }

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundedRect(ctx, x + 4, y + 8, trainW, trainH, 14);
    ctx.fill();

    // Brushed stainless-steel Lisbon Metro body
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + trainH);
    bodyGrad.addColorStop(0, '#e2e8f0');
    bodyGrad.addColorStop(0.5, '#cbd5e1');
    bodyGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bodyGrad;
    drawRoundedRect(ctx, x, y, trainW, trainH, 14);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Signature Lisbon Metro crimson cab noses & active line color lower livery stripe
    ctx.fillStyle = '#c81e32';
    drawRoundedRect(ctx, x, y + 6, 22, trainH - 12, 8);
    ctx.fill();
    drawRoundedRect(ctx, x + trainW - 22, y + 6, 22, trainH - 12, 8);
    ctx.fill();

    ctx.fillStyle = lineColor;
    ctx.fillRect(x + 20, y + trainH - 14, trainW - 40, 7);

    // Carriage coupling joints (3 articulated cars)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 168, y + 4, 8, trainH - 8);
    ctx.fillRect(x + 334, y + 4, 8, trainH - 8);

    // Illuminated passenger windows & sliding doors
    const windowXs = [36, 78, 120, 190, 232, 274, 356, 398, 440];
    windowXs.forEach((wx, idx) => {
      const isDoor = idx === 1 || idx === 4 || idx === 7;
      if (isDoor && doorsOpen) {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(x + wx - 2, y + 12, 34, 46);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x + wx - 2, y + 12, 34, 46);
      } else {
        ctx.fillStyle = '#fde68a';
        drawRoundedRect(ctx, x + wx, y + 14, 30, 28, 4);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    });

    // Traveler seated inside center illuminated window when aboard
    if (showRiderInTrain) {
      const rx = x + 247;
      const ry = y + 32;
      ctx.fillStyle = '#1b4d89';
      ctx.fillRect(rx - 6, ry, 12, 10);
      ctx.fillStyle = '#d4583b';
      ctx.fillRect(rx - 6, ry, 12, 3);
      ctx.fillStyle = '#f2cfb2';
      ctx.beginPath();
      ctx.arc(rx, ry - 4, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d211b';
      ctx.beginPath();
      ctx.arc(rx, ry - 6, 5.2, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // LED headlights on front nose
    const lightX = direction >= 0 ? x + trainW - 6 : x + 6;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(lightX, centerY - 12, 3.5, 0, Math.PI * 2);
    ctx.arc(lightX, centerY + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawMetroRouteStrip(ctx, originId, destId, rideProgress, y, route = null, activeLineId = null) {
    const startX = 110;
    const endX = 650;
    const span = endX - startX;

    ctx.save();
    const originStation = ALL_METRO_STATIONS.find((s) => s.id === originId) || METRO_STATIONS[0];
    const destStation = destId ? ALL_METRO_STATIONS.find((s) => s.id === destId) : null;
    const activeLine = getMetroLineById(activeLineId || getStationLineIds(originStation)[0]);
    const lineColor = route?.primaryColor || activeLine?.color || (originStation.lineColors && originStation.lineColors[0]) || '#3b82f6';
    const arrivalColor = route?.arrivalColor || lineColor;

    // Draw line track (split cleanly at transfer station if transferring between 2 lines!)
    const stopsList =
      route && Array.isArray(route.stationPath) && route.stationPath.length >= 2
        ? route.stationPath
        : [
          originStation.canonicalStopName || originStation.name.replace('Metro ', ''),
          ...(destStation ? [destStation.canonicalStopName || destStation.name.replace('Metro ', '')] : [])
        ];

    if (stopsList.length >= 2) {
      const tIdx = route?.transferStation ? stopsList.indexOf(route.transferStation) : -1;
      if (tIdx > 0 && tIdx < stopsList.length - 1) {
        const tx = startX + (tIdx / (stopsList.length - 1)) * span;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(tx, y);
        ctx.stroke();
        ctx.strokeStyle = arrivalColor;
        ctx.beginPath();
        ctx.moveTo(tx, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      const maxLabels = stopsList.length <= 5 ? 1 : Math.ceil(stopsList.length / 4);
      stopsList.forEach((stopName, idx) => {
        const sx = startX + (idx / Math.max(1, stopsList.length - 1)) * span;
        const isFirst = idx === 0;
        const isLast = idx === stopsList.length - 1;
        const isTransfer = route?.transferStation && stopName === route.transferStation;

        ctx.fillStyle = isLast ? '#facc15' : isTransfer ? '#fb923c' : isFirst ? '#38bdf8' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(sx, y, isFirst || isLast || isTransfer ? 6.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        if (isFirst || isLast || isTransfer || idx % maxLabels === 0) {
          ctx.fillStyle = isTransfer ? '#fde047' : '#e2e8f0';
          ctx.font = '700 8.5px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(stopName, sx, y + 17);
        }
      });

      if (destStation) {
        const curX = startX + span * clamp(rideProgress, 0, 1);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(curX, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (activeLine) {
      // Idle on platform: display ONLY the active platform line's interactive stations in factual order!
      const stationsOnLine = ALL_METRO_STATIONS
        .filter((s) => getStationLineIds(s).includes(activeLine.id))
        .sort((a, b) => {
          const ia = activeLine.stations.indexOf(a.canonicalStopName || '');
          const ib = activeLine.stations.indexOf(b.canonicalStopName || '');
          return ia - ib;
        });

      ctx.strokeStyle = activeLine.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();

      stationsOnLine.forEach((st, idx) => {
        const sx =
          stationsOnLine.length === 1
            ? (startX + endX) / 2
            : startX + (idx / (stationsOnLine.length - 1)) * span;
        const isCurrent = st.id === originStation.id;
        const isHub = getStationLineIds(st).length > 1;
        ctx.fillStyle = isCurrent ? '#facc15' : isHub ? '#ffffff' : activeLine.color;
        ctx.beginPath();
        ctx.arc(sx, y, isCurrent ? 7.0 : isHub ? 5.2 : 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isCurrent ? '#ffffff' : '#0f172a';
        ctx.lineWidth = isCurrent ? 2.2 : 1.4;
        ctx.stroke();
        ctx.fillStyle = isCurrent ? '#fde047' : isHub ? '#ffffff' : '#cbd5e1';
        ctx.font = isCurrent ? '800 7.5px "Segoe UI", sans-serif' : '700 6.8px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        const shortLabel = (st.canonicalStopName || st.name.replace('Metro ', ''))
          .replace('Colegio Militar/Luz', 'Col. Militar')
          .replace('Cidade Universitaria', 'Cid. Univ.')
          .replace('Quinta das Conchas', 'Qta. Conchas')
          .replace('Marques de Pombal', 'Marques')
          .replace('Praca de Espanha', 'Pr. Espanha')
          .replace('Jardim Zoologico', 'Zoo')
          .replace('Alto dos Moinhos', 'A. Moinhos')
          .replace('Senhor Roubado', 'Sr. Roubado')
          .replace('Terreiro do Paco', 'T. Paco')
          .replace('Santa Apolonia', 'S. Apolonia')
          .replace('Cais do Sodre', 'C. Sodre')
          .replace('Sao Sebastiao', 'S. Sebastiao')
          .replace('Campo Pequeno', 'C. Pequeno')
          .replace('Campo Grande', 'C. Grande')
          .replace('Entre Campos', 'E. Campos')
          .replace('Martim Moniz', 'M. Moniz')
          .replace('Restauradores', 'Restaurad.');
        const labelY = stationsOnLine.length > 8 && idx % 2 === 1 ? y - 10 : y + 16;
        ctx.fillText(shortLabel, sx, labelY);
      });
    }
    ctx.restore();
  }


  renderBusInteriorView(ctx, state, nearbyInteraction) {
    const vehicle = state.vehicles.find((v) => v.id === state.ridingVehicleId) || state.vehicles[1];
    const phase = getDayPhase(state.minutesOfDay);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const onWaterfront = (vehicle?.y || 285) >= 780;
    const isStopped = Boolean(vehicle?.currentStopId || vehicle?.yielding);
    const scroll = state.busScrollOffset || 0;
    const hum = isStopped ? 0 : Math.sin(this.animTime * 18) * 1.1;

    // 1. Panoramic Lisboa Sky outside bus windows
    const skyGrad = ctx.createLinearGradient(0, 62, 0, 390);
    if (isEvening) {
      skyGrad.addColorStop(0, '#0f1b38');
      skyGrad.addColorStop(0.65, '#1e355e');
      skyGrad.addColorStop(1, '#31446b');
    } else if (isGolden) {
      skyGrad.addColorStop(0, '#4f6d9a');
      skyGrad.addColorStop(0.55, '#e89654');
      skyGrad.addColorStop(1, '#fbd38d');
    } else {
      skyGrad.addColorStop(0, '#3b82c4');
      skyGrad.addColorStop(0.65, '#8ecae6');
      skyGrad.addColorStop(1, '#dff2fb');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 62, this.viewWidth, 350);

    // Stars or sun/moon
    if (isEvening) {
      ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
      for (const [sx, sy] of [[120, 95], [240, 118], [390, 88], [560, 108], [710, 92], [830, 115]]) {
        ctx.fillRect(sx, sy, 2.5, 2.5);
      }
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(780, 112, 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isGolden ? '#fed7aa' : '#fef08a';
      ctx.beginPath();
      ctx.arc(isGolden ? 760 : 730, isGolden ? 158 : 118, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Slow-parallax distant 7-hills Lisboa skyline silhouette (Castelo de Sao Jorge & domes)
    const hillOffset = (scroll * 0.14) % 460;
    ctx.fillStyle = isEvening ? '#182844' : isGolden ? '#8c5646' : '#6c8ba8';
    ctx.beginPath();
    ctx.moveTo(0, 290);
    for (let x = -460; x <= this.viewWidth + 460; x += 230) {
      const bx = x - hillOffset;
      ctx.lineTo(bx + 40, 224);
      ctx.lineTo(bx + 115, 206);
      ctx.lineTo(bx + 185, 232);
      ctx.lineTo(bx + 230, 248);
    }
    ctx.lineTo(this.viewWidth, 340);
    ctx.lineTo(0, 340);
    ctx.closePath();
    ctx.fill();

    // Distant Castelo battlements & church dome silhouette
    for (let cx = -460; cx <= this.viewWidth + 460; cx += 460) {
      const sx = cx - hillOffset + 102;
      ctx.fillStyle = isEvening ? '#1e3050' : isGolden ? '#7a4538' : '#587694';
      ctx.fillRect(sx, 192, 46, 22);
      ctx.fillRect(sx + 6, 184, 9, 10);
      ctx.fillRect(sx + 28, 184, 9, 10);
      ctx.beginPath();
      ctx.arc(sx + 250, 224, 18, Math.PI, 0);
      ctx.fill();
    }

    // 3. Mid-ground Lisboa Cityscape (Tagus Riverfront OR Historic Azulejo Pombaline Avenues)
    if (onWaterfront) {
      // Architectural Ponte 25 de Abril red suspension bridge & Cristo Rei silhouette across the Tagus
      const bridgeOffset = (scroll * 0.25) % 920;
      const bCenter = 480 - bridgeOffset * 0.25;
      const bLeft = bCenter - 360;
      const bRight = bCenter + 360;
      const t1X = bCenter - 170;
      const t2X = bCenter + 170;
      const deckY = 246;
      const towerTopY = 166;
      const bridgeRed = isEvening ? '#7f1d1d' : '#b91c1c';
      const bridgeHighlight = isEvening ? '#a32929' : '#dc2626';

      // South-bank Almada cliff & Santuario de Cristo Rei
      const crX = bCenter + 310;
      ctx.fillStyle = isEvening ? '#273549' : '#7c7265';
      ctx.beginPath();
      ctx.moveTo(bCenter + 220, 278);
      ctx.lineTo(crX - 30, 232);
      ctx.lineTo(crX + 95, 238);
      ctx.lineTo(this.viewWidth, 278);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = isEvening ? '#64748b' : '#ded6c8';
      ctx.fillRect(crX - 7, 198, 14, 36);
      ctx.fillStyle = isEvening ? '#e2e8f0' : '#f8fafc';
      ctx.fillRect(crX - 2, 184, 4, 14);
      ctx.fillRect(crX - 10, 187, 20, 2.5);

      const cableY = (x) => {
        if (x <= t1X) {
          const u = (x - bLeft) / Math.max(1, t1X - bLeft);
          return deckY - u * u * (deckY - (towerTopY + 4));
        }
        if (x >= t2X) {
          const u = (bRight - x) / Math.max(1, bRight - t2X);
          return deckY - u * u * (deckY - (towerTopY + 4));
        }
        const u = (x - t1X) / Math.max(1, t2X - t1X);
        return (towerTopY + 4) + 4 * u * (1 - u) * ((deckY - 6) - (towerTopY + 4));
      };

      // Vertical suspender dropper cables
      ctx.strokeStyle = isEvening ? 'rgba(153, 27, 27, 0.7)' : 'rgba(185, 28, 28, 0.72)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let sx = bLeft + 14; sx <= bRight - 14; sx += 14) {
        if (Math.abs(sx - t1X) < 10 || Math.abs(sx - t2X) < 10) continue;
        ctx.moveTo(sx, cableY(sx));
        ctx.lineTo(sx, deckY);
      }
      ctx.stroke();

      // Double-deck Warren truss roadway
      ctx.fillStyle = isEvening ? 'rgba(76, 15, 15, 0.85)' : 'rgba(136, 19, 19, 0.82)';
      ctx.fillRect(0, deckY, this.viewWidth, 7);
      ctx.strokeStyle = bridgeHighlight;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, deckY);
      ctx.lineTo(this.viewWidth, deckY);
      ctx.moveTo(0, deckY + 7);
      ctx.lineTo(this.viewWidth, deckY + 7);
      ctx.stroke();

      // Main catenary cables
      ctx.strokeStyle = bridgeHighlight;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let sx = bLeft; sx <= bRight; sx += 8) {
        const cy = cableY(sx);
        if (sx === bLeft) ctx.moveTo(sx, cy);
        else ctx.lineTo(sx, cy);
      }
      ctx.stroke();

      // Twin portal towers with diamond X-bracing & concrete caisson piers
      for (const tx of [t1X, t2X]) {
        ctx.fillStyle = isEvening ? '#475569' : '#cbd5e1';
        ctx.fillRect(tx - 14, 270, 28, 10);
        ctx.fillStyle = bridgeRed;
        ctx.fillRect(tx - 8, towerTopY, 4.5, 105);
        ctx.fillRect(tx + 3.5, towerTopY, 4.5, 105);
        ctx.strokeStyle = bridgeHighlight;
        ctx.lineWidth = 1.4;
        for (const [yA, yB] of [[170, 196], [198, 224], [226, 244], [254, 268]]) {
          ctx.beginPath();
          ctx.moveTo(tx - 6, yA);
          ctx.lineTo(tx + 6, yA);
          ctx.moveTo(tx - 6, yA);
          ctx.lineTo(tx + 6, yB);
          ctx.moveTo(tx + 6, yA);
          ctx.lineTo(tx - 6, yB);
          ctx.stroke();
        }
      }

      // Shimmering Tagus River water
      const waterGrad = ctx.createLinearGradient(0, 276, 0, 380);
      waterGrad.addColorStop(0, isEvening ? '#122b49' : isGolden ? '#3b6b8c' : '#1d6f9e');
      waterGrad.addColorStop(1, isEvening ? '#0a1c33' : '#144e73');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 276, this.viewWidth, 108);

      // Animated sailboats & water glints
      const waveShift = (scroll * 0.65) % 140;
      ctx.strokeStyle = isGolden ? 'rgba(254, 215, 170, 0.45)' : 'rgba(224, 242, 254, 0.35)';
      ctx.lineWidth = 1.6;
      for (let wx = -140; wx < this.viewWidth + 140; wx += 70) {
        const rx = wx - waveShift;
        ctx.beginPath();
        ctx.moveTo(rx, 304);
        ctx.lineTo(rx + 28, 304);
        ctx.moveTo(rx + 20, 336);
        ctx.lineTo(rx + 52, 336);
        ctx.stroke();
      }
      // White Tagus sailboat scrolling past
      const boatX = ((780 - (scroll * 0.35)) % 1040 + 1040) % 1040 - 60;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(boatX, 294);
      ctx.lineTo(boatX + 18, 294);
      ctx.lineTo(boatX + 6, 268);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b84a32';
      ctx.fillRect(boatX - 2, 294, 24, 6);

      // Limestone waterfront promenade railing & bollards scrolling in foreground
      ctx.fillStyle = '#d8d0c1';
      ctx.fillRect(0, 356, this.viewWidth, 42);
      const railShift = (scroll * 1.05) % 64;
      ctx.fillStyle = '#8b8275';
      for (let bx = -64; bx < this.viewWidth + 64; bx += 64) {
        ctx.fillRect(bx - railShift, 344, 9, 20);
      }
    } else {
      // Historic Lisboa Azulejo & Pombaline Avenue scrolling outside the bus windows!
      const blockW = 152;
      const totalSpan = blockW * 8;
      const bldgShift = (scroll * 0.78) % totalSpan;
      const facades = [
        { wall: '#f2f6fb', roof: '#b54c32', trim: '#1b4d89', azulejo: true, h: 162 },
        { wall: '#f1d6a7', roof: '#a8442a', trim: '#7a3324', azulejo: false, h: 148 },
        { wall: '#ebd2d8', roof: '#b85035', trim: '#6f3224', azulejo: false, h: 170 },
        { wall: '#e4f0ec', roof: '#9e4736', trim: '#1f7062', azulejo: true, h: 154 },
        { wall: '#f7f3eb', roof: '#bf5530', trim: '#1b558a', azulejo: false, h: 142 },
        { wall: '#efe6d5', roof: '#8d5324', trim: '#1f4d3a', azulejo: false, h: 166 },
        { wall: '#f2f6fb', roof: '#1f4975', trim: '#1b4d89', azulejo: true, h: 158 },
        { wall: '#eed7c5', roof: '#a63e2e', trim: '#7a251a', azulejo: false, h: 150 }
      ];

      for (let rep = -1; rep <= 1; rep += 1) {
        facades.forEach((f, idx) => {
          const x = rep * totalSpan + idx * blockW - bldgShift;
          if (x + blockW < -20 || x > this.viewWidth + 20) return;
          const baseY = 368;
          const topY = baseY - f.h;

          // Building wall
          ctx.fillStyle = f.wall;
          ctx.fillRect(x + 2, topY + 26, blockW - 4, f.h - 26);
          if (f.azulejo) {
            ctx.fillStyle = 'rgba(27, 77, 137, 0.16)';
            for (let ty = topY + 34; ty < baseY - 26; ty += 16) {
              for (let tx = x + 10; tx < x + blockW - 14; tx += 16) {
                ctx.fillRect(tx, ty, 6, 6);
              }
            }
          }
          // Terracotta pitched roof + eaves
          ctx.fillStyle = f.roof;
          ctx.beginPath();
          ctx.moveTo(x - 2, topY + 28);
          ctx.lineTo(x + 14, topY);
          ctx.lineTo(x + blockW - 14, topY);
          ctx.lineTo(x + blockW + 2, topY + 28);
          ctx.closePath();
          ctx.fill();

          // Two rows of tall shuttered Lisbon windows + wrought-iron Juliet balconies
          for (let row = 0; row < 2; row += 1) {
            const wy = topY + 42 + row * 46;
            for (let col = 0; col < 3; col += 1) {
              const wx = x + 18 + col * 42;
              ctx.fillStyle = f.trim;
              ctx.fillRect(wx - 4, wy, 26, 32);
              ctx.fillStyle = isEvening ? '#fde68a' : '#2c4159';
              ctx.fillRect(wx, wy + 2, 18, 28);
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 1.4;
              ctx.strokeRect(wx - 3, wy + 24, 24, 10);
            }
          }
          // Ground-floor arched shopfront awning
          ctx.fillStyle = f.trim;
          ctx.fillRect(x + 22, baseY - 30, blockW - 44, 10);
          ctx.fillStyle = isEvening ? '#fcd34d' : '#334155';
          ctx.fillRect(x + 30, baseY - 20, blockW - 60, 20);
        });
      }

      // Blooming purple Jacaranda trees & Lisbon streetlamps scrolling along sidewalk
      const treeShift = (scroll * 0.98) % 240;
      for (let tx = -240; tx < this.viewWidth + 240; tx += 240) {
        const px = tx - treeShift;
        ctx.fillStyle = '#5c4028';
        ctx.fillRect(px + 34, 306, 9, 64);
        ctx.fillStyle = isEvening ? '#5b3b78' : '#9b6bc7';
        for (const [cx, cy, r] of [[px + 38, 294, 28], [px + 18, 304, 20], [px + 58, 304, 20]]) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Classic wrought-iron Lisbon streetlamp
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(px + 150, 272, 4, 98);
        ctx.fillStyle = isEvening || isGolden ? '#fef08a' : '#e2e8f0';
        ctx.beginPath();
        ctx.arc(px + 152, 268, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cobblestone sidewalk strip
      ctx.fillStyle = '#d9d1c2';
      ctx.fillRect(0, 366, this.viewWidth, 34);
    }

    // 4. Carris Bus Stop Shelter visible outside window when stopped at a stop
    if (vehicle?.currentStopId) {
      ctx.fillStyle = 'rgba(20, 83, 61, 0.92)';
      drawRoundedRect(ctx, 595, 256, 175, 118, 6);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(595, 256, 175, 18);
      ctx.fillStyle = '#143326';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`CARRIS STOP - ${vehicle.currentStopName.split(' (')[0].toUpperCase()}`, 682, 269);
      ctx.fillStyle = 'rgba(226, 242, 254, 0.45)';
      ctx.fillRect(606, 282, 153, 84);
      ctx.textAlign = 'left';
    }

    // 5. FOREGROUND: Authentic Carris Bus Interior Frame, Windows, Straps & Next-Stop LED
    ctx.save();
    ctx.translate(0, hum);

    // Overhead dark Carris green ceiling & luggage cove
    ctx.fillStyle = '#143b2e';
    ctx.fillRect(0, 0, this.viewWidth, 72);
    ctx.fillStyle = '#1b5743';
    ctx.fillRect(0, 62, this.viewWidth, 12);

    // Window side frames & vertical pillars separating 3 wide panoramic bus windows
    ctx.fillStyle = '#1b4d3c';
    ctx.fillRect(0, 62, 26, 360);
    ctx.fillRect(this.viewWidth - 26, 62, 26, 360);
    for (const px of [304, 614]) {
      ctx.fillStyle = '#1f5442';
      ctx.fillRect(px, 68, 22, 336);
      ctx.fillStyle = '#0f2d23';
      ctx.fillRect(px + 9, 68, 4, 336);
    }

    // Horizontal overhead steel grab rail + swaying yellow hand straps
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(26, 86, this.viewWidth - 52, 6);
    const sway = isStopped ? 0 : Math.sin(this.animTime * 4.2) * 0.14;
    for (const sx of [120, 230, 400, 520, 700, 815]) {
      ctx.save();
      ctx.translate(sx, 92);
      ctx.rotate(sway);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 26);
      ctx.stroke();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 34, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const busBellLit = state.alightAtNextStop || Boolean(vehicle?.stopBellRung);
    const activeBusId = vehicle?.id || 'bus-737-758';
    const busRouteNum = vehicle?.routeNumber || '737';
    const busCompanionsHeader = (state.remotePlayers || []).filter((rp) => rp.ridingVehicleId === activeBusId);
    // Vertical yellow Carris stanchion pole with glowing red STOP bell button
    ctx.fillStyle = '#eab308';
    ctx.fillRect(310, 72, 10, 340);
    drawRoundedRect(ctx, 304, 238, 22, 34, 4);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.fillStyle = busBellLit ? '#ef4444' : '#b91c1c';
    drawRoundedRect(ctx, 308, 244, 14, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 6px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STOP', 315, 256);

    // Overhead Amber-LED Next-Stop Electronic Sign
    drawRoundedRect(ctx, 210, 12, 500, 44, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = busBellLit ? '#f87171' : '#fbbf24';
    ctx.font = '700 13px "Consolas", monospace';
    ctx.textAlign = 'center';
    const cleanNextStop = String(vehicle?.nextStopName || 'Next Stop').split(' (')[0].toUpperCase();
    const ledText = vehicle?.currentStopId
      ? `CARRIS ${busRouteNum}  |  DOORS OPEN: ${vehicle.currentStopName.split(' (')[0].toUpperCase()}`
      : busBellLit
        ? `STOP BELL  |  PROXIMA PARAGEM: ${cleanNextStop}`
        : `CARRIS ${busRouteNum}  |  PROXIMA PARAGEM: ${cleanNextStop}`;
    ctx.fillText(ledText, this.viewWidth / 2, 31, 480);
    ctx.fillStyle = state.transitAnnouncement ? '#fde68a' : '#94a3b8';
    ctx.font = '600 10px "Segoe UI", sans-serif';
    const busSub = state.transitAnnouncement
      ? `${state.transitAnnouncement.ringerName ? `${state.transitAnnouncement.ringerName.toUpperCase()} RANG BELL: ` : 'ANNOUNCEMENT: '}"${state.transitAnnouncement.text}"`
      : busCompanionsHeader.length > 0
        ? `RIDING TOGETHER WITH: ${busCompanionsHeader.map((c) => c.name).join(', ')}`
        : onWaterfront
          ? `TAGUS RIVERFRONT VIEW  -  ${(state.currentNeighborhoodName || 'LISBOA').toUpperCase()}`
          : `PASSING THROUGH ${(state.currentNeighborhoodName || 'LISBOA').toUpperCase()}`;
    ctx.fillText(busSub, this.viewWidth / 2, 47, 480);

    // Lower bus window sill & patterned Carris passenger seats
    ctx.fillStyle = '#1e3a32';
    ctx.fillRect(0, 386, this.viewWidth, 174);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 386, this.viewWidth, 10);

    // Classic blue-green patterned Carris seat tops along foreground
    const busSeatXs = [56, 176, 364, 484, 672, 792];
    for (const sx of busSeatXs) {
      ctx.fillStyle = '#155e4a';
      drawRoundedRect(ctx, sx, 398, 92, 48, 10);
      ctx.fill();
      ctx.strokeStyle = '#0d3c2f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(sx + 16, 412, 60, 4);
      ctx.fillRect(sx + 24, 424, 44, 4);
    }

    // Connected LAN companions riding the exact same Carris Bus seated right beside you!
    const busCompanions = (state.remotePlayers || []).filter((rp) => rp.ridingVehicleId === activeBusId);
    busCompanions.slice(0, busSeatXs.length).forEach((rp, idx) => {
      const cx = busSeatXs[idx] + 46;
      this.drawCharacterSprite(ctx, cx, 392, {
        facing: 'down',
        walkPhase: 0,
        isMoving: false,
        outfitId: rp.outfitId,
        label: rp.name,
        emoteText: rp.emoteText || '',
        isPlayer: false,
        isRemotePlayer: true
      });
    });

    // Bottom Bus Route Progress Strip cleanly positioned above the interaction prompt banner
    const busLine = TRANSIT_LINES.find((l) => l.id === activeBusId) || TRANSIT_LINES.find((l) => l.mode === 'bus');
    const busStops = busLine ? busLine.waypoints.filter((w) => w.stopId) : [];
    const stripY = 466;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, stripY);
    ctx.lineTo(810, stripY);
    ctx.stroke();
    busStops.forEach((st, idx) => {
      const sx = 110 + (idx / Math.max(1, busStops.length - 1)) * 700;
      const isCur = vehicle?.currentStopId === st.stopId;
      const isNext = vehicle?.nextStopName === st.stopName;
      ctx.fillStyle = isCur ? '#facc15' : isNext ? '#34d399' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(sx, stripY, isCur || isNext ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.stopName.split(' (')[0], sx, stripY + 18);
    });

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  renderTramInteriorView(ctx, state, nearbyInteraction) {
    const vehicle = state.vehicles.find((v) => v.id === state.ridingVehicleId) || state.vehicles[0];
    const activeTramId = vehicle?.id || 'tram-28e';
    const tramRouteNum = vehicle?.routeNumber || '28E';
    const phase = getDayPhase(state.minutesOfDay);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const isStopped = Boolean(vehicle?.currentStopId || vehicle?.yielding);
    const scroll = state.tramScrollOffset || 0;
    const swayHum = isStopped ? 0 : Math.sin(this.animTime * 15) * 1.4;
    const nearCathedral = (vehicle?.x || 1000) >= 1340 && (vehicle?.x || 1000) <= 1860;

    // 1. Dynamic Lisbon Sky outside historic wooden tram windows
    const skyGrad = ctx.createLinearGradient(0, 62, 0, 390);
    if (isEvening) {
      skyGrad.addColorStop(0, '#101d3b');
      skyGrad.addColorStop(1, '#283d66');
    } else if (isGolden) {
      skyGrad.addColorStop(0, '#5a739c');
      skyGrad.addColorStop(0.55, '#eb9852');
      skyGrad.addColorStop(1, '#fde68a');
    } else {
      skyGrad.addColorStop(0, '#2e7cc2');
      skyGrad.addColorStop(0.65, '#8ac7e8');
      skyGrad.addColorStop(1, '#e0f2fe');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 62, this.viewWidth, 340);

    // Distant Alfama/Bairro Alto terracotta hill silhouette
    const hillShift = (scroll * 0.16) % 460;
    ctx.fillStyle = isEvening ? '#1a2844' : isGolden ? '#8c5540' : '#738da6';
    ctx.beginPath();
    ctx.moveTo(0, 290);
    for (let x = -460; x <= this.viewWidth + 460; x += 230) {
      const bx = x - hillShift;
      ctx.lineTo(bx + 60, 208);
      ctx.lineTo(bx + 150, 198);
      ctx.lineTo(bx + 230, 232);
    }
    ctx.lineTo(this.viewWidth, 330);
    ctx.lineTo(0, 330);
    ctx.closePath();
    ctx.fill();

    // 2. Narrow Historic Lisbon Tram 28E Hillside Alley Facades scrolling closely past!
    const blockW = 144;
    const totalSpan = blockW * 7;
    const bldgShift = (scroll * 0.85) % totalSpan;
    const alleyFacades = [
      { wall: '#f2f6fb', roof: '#b54c32', trim: '#1b4d89', azulejo: true, h: 192, laundry: true },
      { wall: '#f2d9b1', roof: '#a8442a', trim: '#7a3324', azulejo: false, h: 178, laundry: false },
      { wall: '#ebd3da', roof: '#b85035', trim: '#6f3224', azulejo: false, h: 186, laundry: true },
      { wall: '#ddd5c5', roof: '#8c6d52', trim: '#5c4f41', cathedral: true, h: 214, laundry: false },
      { wall: '#e6f1ed', roof: '#1f7062', trim: '#15544a', azulejo: true, h: 182, laundry: false },
      { wall: '#f7f3eb', roof: '#bf5530', trim: '#1b558a', azulejo: false, h: 174, laundry: true },
      { wall: '#efe6d5', roof: '#8d5324', trim: '#1f4d3a', azulejo: false, h: 188, laundry: false }
    ];

    for (let rep = -1; rep <= 1; rep += 1) {
      alleyFacades.forEach((f, idx) => {
        const x = rep * totalSpan + idx * blockW - bldgShift;
        if (x + blockW < -20 || x > this.viewWidth + 20) return;
        const baseY = 368;
        const topY = baseY - f.h;

        if (f.cathedral && nearCathedral) {
          // Iconic Romanesque Se de Lisboa twin crenellated bell towers & rose window gliding past Tram 28E!
          ctx.fillStyle = '#ddd5c5';
          ctx.fillRect(x + 8, topY + 24, blockW - 16, f.h - 24);
          ctx.fillRect(x + 8, topY, 36, 48);
          ctx.fillRect(x + blockW - 44, topY, 36, 48);
          // Crenellations
          ctx.fillStyle = '#9c907f';
          for (const tx of [x + 8, x + blockW - 44]) {
            ctx.fillRect(tx, topY - 8, 10, 8);
            ctx.fillRect(tx + 26, topY - 8, 10, 8);
          }
          // Glowing stained-glass rose window
          ctx.fillStyle = '#2563eb';
          ctx.beginPath();
          ctx.arc(x + blockW / 2, topY + 84, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(x + blockW / 2, topY + 84, 8, 0, Math.PI * 2);
          ctx.fill();
          // Romanesque arched portal
          ctx.fillStyle = '#4a3a2a';
          ctx.beginPath();
          ctx.arc(x + blockW / 2, baseY - 26, 20, Math.PI, 0);
          ctx.lineTo(x + blockW / 2 + 20, baseY);
          ctx.lineTo(x + blockW / 2 - 20, baseY);
          ctx.closePath();
          ctx.fill();
          return;
        }

        ctx.fillStyle = f.wall;
        ctx.fillRect(x + 2, topY + 24, blockW - 4, f.h - 24);
        if (f.azulejo) {
          ctx.fillStyle = 'rgba(27, 77, 137, 0.17)';
          for (let ty = topY + 32; ty < baseY - 24; ty += 15) {
            for (let tx = x + 10; tx < x + blockW - 14; tx += 15) {
              ctx.fillRect(tx, ty, 6, 6);
            }
          }
        }
        ctx.fillStyle = f.roof;
        ctx.beginPath();
        ctx.moveTo(x - 2, topY + 26);
        ctx.lineTo(x + 12, topY);
        ctx.lineTo(x + blockW - 12, topY);
        ctx.lineTo(x + blockW + 2, topY + 26);
        ctx.closePath();
        ctx.fill();

        // Shuttered Lisbon windows & geranium balconies
        for (let row = 0; row < 2; row += 1) {
          const wy = topY + 42 + row * 48;
          for (let col = 0; col < 2; col += 1) {
            const wx = x + 26 + col * 62;
            ctx.fillStyle = f.trim;
            ctx.fillRect(wx - 4, wy, 28, 34);
            ctx.fillStyle = isEvening ? '#fde68a' : '#2c4159';
            ctx.fillRect(wx, wy + 2, 20, 30);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.4;
            ctx.strokeRect(wx - 4, wy + 24, 28, 12);
            // Red geranium pot on balcony
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(wx + 10, wy + 28, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Fluttering Alfama / Bairro Alto laundry banner
        if (f.laundry) {
          ctx.strokeStyle = 'rgba(45, 55, 72, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + 12, topY + 96);
          ctx.quadraticCurveTo(x + blockW / 2, topY + 108, x + blockW - 12, topY + 96);
          ctx.stroke();
          const colors = ['#f8fafc', '#2563eb', '#eab308', '#dc2626'];
          colors.forEach((col, ci) => {
            ctx.fillStyle = col;
            ctx.fillRect(x + 28 + ci * 24, topY + 101, 10, 13);
          });
        }

        // Arched wooden doorway / neighborhood shop awning
        ctx.fillStyle = f.trim;
        ctx.fillRect(x + 24, baseY - 28, blockW - 48, 8);
        ctx.fillStyle = isEvening ? '#fcd34d' : '#3d2817';
        ctx.fillRect(x + 36, baseY - 20, blockW - 72, 20);
      });
    }

    // Cobblestone lane & steel tram rail glint
    ctx.fillStyle = '#cfc6b5';
    ctx.fillRect(0, 366, this.viewWidth, 34);

    // Classic yellow-and-white Eletrico 28E shelter when stopped
    if (vehicle?.currentStopId) {
      ctx.fillStyle = 'rgba(180, 120, 12, 0.94)';
      drawRoundedRect(ctx, 595, 256, 175, 118, 6);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(595, 256, 175, 18);
      ctx.fillStyle = '#422006';
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ELETRICO 28E - ${vehicle.currentStopName.split(' (')[0].toUpperCase()}`, 682, 269);
      ctx.fillStyle = 'rgba(255, 251, 235, 0.45)';
      ctx.fillRect(606, 282, 153, 84);
      ctx.textAlign = 'left';
    }

    // 3. FOREGROUND: Historic Varnished Mahogany & Brass Remodelado Eletrico 28E Cabin!
    ctx.save();
    ctx.translate(0, swayHum);

    // Warm varnished mahogany ceiling & brass cove molding
    ctx.fillStyle = '#5c2d16';
    ctx.fillRect(0, 0, this.viewWidth, 72);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(0, 64, this.viewWidth, 6);

    // Varnished wood side frames & brass-trimmed arched window pillars (4 historic tram bays)
    ctx.fillStyle = '#6b3519';
    ctx.fillRect(0, 62, 26, 340);
    ctx.fillRect(this.viewWidth - 26, 62, 26, 340);
    for (const px of [234, 450, 666]) {
      ctx.fillStyle = '#6b3519';
      ctx.fillRect(px, 68, 22, 326);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(px + 9, 68, 4, 326);
    }

    const tramBellLit = state.alightAtNextStop || Boolean(vehicle?.stopBellRung);
    const tramCompanionsHeader = (state.remotePlayers || []).filter((rp) => rp.ridingVehicleId === 'tram-28e');
    // Classic leather ceiling pull-cord & brass tram bell rings
    ctx.strokeStyle = tramBellLit ? '#fef08a' : '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(26, 86);
    ctx.quadraticCurveTo(this.viewWidth / 2, tramBellLit ? 98 : 90, this.viewWidth - 26, 86);
    ctx.stroke();

    const sway = isStopped ? 0 : Math.sin(this.animTime * 4.5) * 0.16;
    for (const sx of [130, 342, 558, 776]) {
      ctx.save();
      ctx.translate(sx, 89);
      ctx.rotate(sway);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 25);
      ctx.stroke();
      ctx.strokeStyle = '#d4a017';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 33, 8.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Vertical brass stanchion pole with vintage red STOP bell button
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(456, 70, 10, 330);
    drawRoundedRect(ctx, 450, 236, 22, 34, 4);
    ctx.fillStyle = '#422006';
    ctx.fill();
    ctx.fillStyle = tramBellLit ? '#ef4444' : '#b91c1c';
    drawRoundedRect(ctx, 454, 242, 14, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.font = '700 6px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BELL', 461, 254);

    // Overhead Vintage Cream-and-Brass Eletrico 28E Route Sign & Proxima Paragem LED
    drawRoundedRect(ctx, 195, 11, 530, 46, 8);
    ctx.fillStyle = '#1e140c';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = tramBellLit ? '#f87171' : '#fde047';
    ctx.font = '700 13px "Consolas", monospace';
    ctx.textAlign = 'center';
    const cleanNextStop = String(vehicle?.nextStopName || 'Next Stop').split(' (')[0].toUpperCase();
    const ledText = vehicle?.currentStopId
      ? `ELETRICO ${tramRouteNum}  |  DOORS OPEN: ${vehicle.currentStopName.split(' (')[0].toUpperCase()}`
      : tramBellLit
        ? `BELL RUNG  |  PROXIMA PARAGEM: ${cleanNextStop}`
        : `ELETRICO ${tramRouteNum}  |  PROXIMA PARAGEM: ${cleanNextStop}`;
    ctx.fillText(ledText, this.viewWidth / 2, 30, 506);
    ctx.fillStyle = state.transitAnnouncement ? '#fde68a' : '#d6c4a8';
    ctx.font = '600 10px Georgia, serif';
    const tramSub = state.transitAnnouncement
      ? `${state.transitAnnouncement.ringerName ? `${state.transitAnnouncement.ringerName.toUpperCase()} RANG BELL: ` : 'ANNOUNCEMENT: '}"${state.transitAnnouncement.text}"`
      : tramCompanionsHeader.length > 0
        ? `RIDING TOGETHER WITH: ${tramCompanionsHeader.map((c) => c.name).join(', ')}`
        : `CARRIS ELETRICO ${tramRouteNum}  -  ${(state.currentNeighborhoodName || 'LISBOA').toUpperCase()}`;
    ctx.fillText(tramSub, this.viewWidth / 2, 47, 506);

    // Lower wooden wainscoting & varnished slatted wooden tram bench seats
    ctx.fillStyle = '#4a2410';
    ctx.fillRect(0, 386, this.viewWidth, 174);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(0, 386, this.viewWidth, 6);

    const tramBenchXs = [52, 266, 488, 702];
    for (const sx of tramBenchXs) {
      ctx.fillStyle = '#8b4e24';
      drawRoundedRect(ctx, sx, 398, 162, 46, 8);
      ctx.fill();
      ctx.strokeStyle = '#3b1d0a';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Polished wooden bench slats
      ctx.fillStyle = '#b9773c';
      ctx.fillRect(sx + 10, 408, 142, 5);
      ctx.fillRect(sx + 10, 420, 142, 5);
      ctx.fillRect(sx + 10, 432, 142, 5);
    }

    // Connected LAN companions riding the exact same Carris Eletrico with you!
    const tramCompanions = (state.remotePlayers || []).filter((rp) => rp.ridingVehicleId === activeTramId);
    tramCompanions.slice(0, tramBenchXs.length).forEach((rp, idx) => {
      const cx = tramBenchXs[idx] + 81;
      this.drawCharacterSprite(ctx, cx, 392, {
        facing: 'down',
        walkPhase: 0,
        isMoving: false,
        outfitId: rp.outfitId,
        label: rp.name,
        emoteText: rp.emoteText || '',
        isPlayer: false,
        isRemotePlayer: true
      });
    });

    // Bottom Eletrico Route Stop Strip cleanly above interaction prompt banner
    const tramLine = TRANSIT_LINES.find((l) => l.id === activeTramId) || TRANSIT_LINES.find((l) => l.mode === 'tram');
    const tramStops = tramLine ? tramLine.waypoints.filter((w) => w.stopId) : [];
    const stripY = 466;
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, stripY);
    ctx.lineTo(810, stripY);
    ctx.stroke();
    tramStops.forEach((st, idx) => {
      const sx = 110 + (idx / Math.max(1, tramStops.length - 1)) * 700;
      const isCur = vehicle?.currentStopId === st.stopId;
      const isNext = vehicle?.nextStopName === st.stopName;
      ctx.fillStyle = isCur ? '#ef4444' : isNext ? '#fde047' : '#fef3c7';
      ctx.beginPath();
      ctx.arc(sx, stripY, isCur || isNext ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#422006';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.font = '600 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.stopName.split(' (')[0], sx, stripY + 18);
    });

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  renderFerry(ctx, state, nearbyInteraction) {
    const f = state.ferry;
    ctx.fillStyle = '#0e2236';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    const offsetX = Math.round((this.viewWidth - INTERIOR_WIDTH) / 2);
    const offsetY = Math.round((this.viewHeight - INTERIOR_HEIGHT) / 2);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    if (f.phase === 'sailing') {
      this.renderFerryCrossingScene(ctx, state);
    } else {
      this.renderFerryTerminalScene(ctx, state, nearbyInteraction);
    }

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  renderFerryTerminalScene(ctx, state, nearbyInteraction) {
    const f = state.ferry;
    const isLisbon = f.portId === FERRY_TERMINAL.id;
    const destInfo = FERRY_DESTINATIONS.find((d) => d.id === f.portId);
    const phase = getDayPhase(state.minutesOfDay);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';

    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = '#143752';
    ctx.fill();
    ctx.strokeStyle = '#0f5c52';
    ctx.lineWidth = 6;
    ctx.stroke();

    // 1. Upper waterfront horizon sky & Transtejo terminal canopy
    const skyGrad = ctx.createLinearGradient(0, 6, 0, 154);
    if (isEvening) {
      skyGrad.addColorStop(0, '#102040');
      skyGrad.addColorStop(1, '#263e66');
    } else if (isGolden) {
      skyGrad.addColorStop(0, '#5a78a3');
      skyGrad.addColorStop(1, '#f3b178');
    } else {
      skyGrad.addColorStop(0, '#3b82c4');
      skyGrad.addColorStop(1, '#b8e3f5');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(6, 6, INTERIOR_WIDTH - 12, 148);

    // Terminal header plaque
    drawRoundedRect(ctx, 180, 16, 400, 52, 8);
    ctx.fillStyle = '#0f5c52';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isLisbon ? 'CAIS DO SODRE - TRANSTEJO PORT' : `${destInfo ? destInfo.name.toUpperCase() : 'SOUTH BANK'} PIER`,
      380,
      39
    );
    ctx.fillStyle = '#fde68a';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillText(
      isLisbon ? 'FERRIES TO CACILHAS  -  SEIXAL  -  MONTIJO' : 'TAGUS SOUTH BANK  -  RETURN FERRY TO CAIS DO SODRE',
      380,
      57
    );

    // Top Waterfront Gate (at Cais do Sodre) OR Explorable South-Bank Townscape Facades!
    if (isLisbon) {
      drawRoundedRect(ctx, 304, 114, 152, 38, 6);
      ctx.fillStyle = nearbyInteraction?.type === 'ferry-exit' ? '#d97706' : '#1e3a5f';
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 10.5px "Segoe UI", sans-serif';
      ctx.fillText('EXIT TO WATERFRONT', 380, 137);
    } else if (destInfo && Array.isArray(destInfo.townSpots)) {
      // Draw 3 authentic South-Bank waterfront facades/landmarks along the upper promenade (y: 72..154)!
      const isCacilhas = destInfo.id === 'cacilhas';
      const isSeixal = destInfo.id === 'seixal';

      // 1. Left Waterfront Eatery (x: 56..254, center 155)
      ctx.fillStyle = isCacilhas ? '#f6e7d4' : isSeixal ? '#f7f4ec' : '#f1dec4';
      drawRoundedRect(ctx, 56, 78, 198, 76, 5);
      ctx.fill();
      ctx.strokeStyle = '#472d1b';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // Roof frieze + crisp white sign text
      const eateryAccent = isCacilhas ? '#b84a32' : isSeixal ? '#0f766e' : '#9a3412';
      ctx.fillStyle = eateryAccent;
      ctx.fillRect(54, 74, 202, 17);
      // Striped waterfront restaurant awning directly beneath frieze
      for (let idx = 0; idx < 16; idx += 1) {
        ctx.fillStyle = idx % 2 === 0 ? eateryAccent : '#fef3c7';
        ctx.fillRect(58 + idx * 12, 91, 12, 9);
      }
      // Warm dining windows & wooden entrance door
      ctx.fillStyle = isEvening ? '#fde68a' : '#fff7ed';
      ctx.fillRect(72, 108, 42, 24);
      ctx.fillRect(196, 108, 42, 24);
      ctx.strokeStyle = '#472d1b';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(72, 108, 42, 24);
      ctx.strokeRect(196, 108, 42, 24);
      // Little restaurant red tablecloths & plates visible in windows
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(78, 122, 30, 8);
      ctx.fillRect(202, 122, 30, 8);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(140, 122, 30, 32);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(164, 136, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(destInfo.townSpots[0].name.toUpperCase(), 155, 86);

      // 2. Center Signature South-Bank Landmark (x: 280..480, center 380)
      if (isCacilhas) {
        // Ponte 25 de Abril + Cristo Rei silhouette + 1886 red Farol de Cacilhas lighthouse
        ctx.strokeStyle = '#c81e32';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(286, 114);
        ctx.lineTo(356, 114);
        ctx.stroke();
        ctx.fillStyle = '#c81e32';
        ctx.fillRect(306, 86, 5, 50);
        ctx.fillRect(340, 86, 5, 50);
        // Cristo Rei monument
        ctx.fillStyle = '#e5ded0';
        ctx.fillRect(428, 86, 10, 48);
        ctx.fillRect(420, 82, 26, 4);
        // Red Farol de Cacilhas Lighthouse
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(372, 90, 16, 46);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(380, 86, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (isSeixal) {
        // Whitewashed Moinho de Mare (Tide Mill) & colorful Tagus Fragata sails
        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 326, 88, 108, 48, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f766e';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#b84a32';
        ctx.fillRect(322, 80, 116, 11);
        // Waterwheel arches cleanly above nameplate
        ctx.fillStyle = '#0284c7';
        for (const wx of [344, 380, 416]) {
          ctx.beginPath();
          ctx.arc(wx, 132, 9, Math.PI, 0);
          ctx.fill();
        }
        // Fragata sail beside dock
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(288, 134);
        ctx.lineTo(318, 134);
        ctx.lineTo(300, 86);
        ctx.closePath();
        ctx.fill();
      } else {
        // Montijo Historic Windmill (Moinho de Vento) with rotating sails & estuary flamingos
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(366, 92, 28, 44);
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.arc(380, 92, 14, Math.PI, 0);
        ctx.fill();
        ctx.save();
        ctx.translate(380, 98);
        ctx.rotate(this.animTime * 0.8);
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 2.6;
        for (let b = 0; b < 4; b += 1) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -24);
          ctx.stroke();
        }
        ctx.restore();
        // Pink estuary flamingos clearly visible above nameplate
        for (const [fx, fy] of [[308, 118], [326, 122], [444, 116]]) {
          ctx.strokeStyle = '#be185d';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(fx, fy + 3);
          ctx.lineTo(fx, fy + 13);
          ctx.stroke();
          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.arc(fx, fy, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      drawRoundedRect(ctx, 290, 135, 180, 17, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.font = '700 8px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(destInfo.townSpots[1].name.toUpperCase(), 380, 146.5);

      // 3. Right Regional Artisan Shop / Kiosk (x: 506..704, center 605)
      ctx.fillStyle = isCacilhas ? '#d8e6dc' : isSeixal ? '#e7d5bc' : '#eaf2fb';
      drawRoundedRect(ctx, 506, 78, 198, 76, 5);
      ctx.fill();
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const shopAccent = isCacilhas ? '#1f6e58' : isSeixal ? '#7c4f2b' : '#1b4d89';
      ctx.fillStyle = shopAccent;
      ctx.fillRect(504, 74, 202, 17);
      // Framed boutique display windows with regional wares inside
      ctx.fillStyle = isEvening ? '#fde68a' : '#fff7ed';
      ctx.fillRect(520, 100, 48, 28);
      ctx.fillRect(642, 100, 48, 28);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(520, 100, 48, 28);
      ctx.strokeRect(642, 100, 48, 28);
      // Display shelf + colorful artisan goods inside shop windows
      ctx.fillStyle = '#92400e';
      ctx.fillRect(524, 118, 40, 3);
      ctx.fillRect(646, 118, 40, 3);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(528, 108, 10, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(544, 109, 12, 9);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(650, 108, 12, 10);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(668, 109, 12, 9);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(590, 122, 30, 32);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(614, 136, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(destInfo.townSpots[2].name.toUpperCase(), 605, 86);
    }

    // 2. Walkable Timber Pier (Cais do Sodre) OR Cobblestone South-Bank Promenade (y: 154..288)
    ctx.fillStyle = isLisbon ? '#cbb89d' : '#e6dfd1';
    ctx.fillRect(8, 154, INTERIOR_WIDTH - 16, 134);
    ctx.strokeStyle = isLisbon ? 'rgba(92, 68, 46, 0.25)' : 'rgba(118, 106, 88, 0.22)';
    ctx.lineWidth = 1.2;
    for (let px = 28; px < INTERIOR_WIDTH - 12; px += 22) {
      ctx.beginPath();
      ctx.moveTo(px, 154);
      ctx.lineTo(px, 288);
      ctx.stroke();
    }
    if (!isLisbon) {
      for (let py = 176; py < 280; py += 22) {
        ctx.beginPath();
        ctx.moveTo(8, py);
        ctx.lineTo(INTERIOR_WIDTH - 8, py);
        ctx.stroke();
      }
      // Draw 3 interactive town spot markers along the south-bank promenade
      if (destInfo && Array.isArray(destInfo.townSpots)) {
        for (const spot of destInfo.townSpots) {
          this.drawInteriorMarker(
            ctx,
            spot.x,
            spot.y,
            `${spot.badge.replace(/[\[\]]/g, '')} [E]`,
            nearbyInteraction?.type === 'south-bank-spot' && nearbyInteraction.spotId === spot.id
          );
        }
      }
      // Friendly local resident strolling gently along the south-bank promenade
      const localX = 270 + Math.sin(this.animTime * 0.55) * 65;
      this.drawCharacterSprite(ctx, localX, 232, {
        facing: Math.cos(this.animTime * 0.55) >= 0 ? 'right' : 'left',
        walkPhase: this.animTime * 3.8,
        isMoving: true,
        outfitId: destInfo?.id === 'cacilhas' ? 'maritime-striped' : destInfo?.id === 'seixal' ? 'tile-artisan' : 'alfama-dress',
        isPlayer: false
      });
    }

    // Yellow nautical safety curb & iron mooring bollards along the water edge
    ctx.fillStyle = '#facc15';
    ctx.fillRect(8, 280, INTERIOR_WIDTH - 16, 8);
    for (const bx of [90, 220, 540, 670]) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(bx, 274, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(bx, 272, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Tagus River Water & Docked Transtejo Catamaran Ferry (y: 288..452)
    const waterGrad = ctx.createLinearGradient(0, 288, 0, 452);
    waterGrad.addColorStop(0, isEvening ? '#0f2744' : '#15608a');
    waterGrad.addColorStop(1, isEvening ? '#09192e' : '#0d3f5e');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(8, 288, INTERIOR_WIDTH - 16, 164);

    // Animated Tagus waves (strictly clipped inside pier water frame)
    ctx.save();
    ctx.beginPath();
    ctx.rect(8, 288, INTERIOR_WIDTH - 16, 164);
    ctx.clip();
    const waveShift = (f.waveOffset || 0) % 60;
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.lineWidth = 1.6;
    for (let wy = 304; wy < 444; wy += 24) {
      for (let wx = 18 - waveShift; wx < INTERIOR_WIDTH - 18; wx += 60) {
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + 14, wy - 4, wx + 28, wy);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Boarding gangway bridge from yellow curb onto catamaran (never hides RETURN FERRY label)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(352, 288, 56, 36);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(352, 288, 56, 36);

    // Boarding Gangway Marker cleanly positioned above yellow safety curb
    this.drawInteriorMarker(
      ctx,
      380,
      244,
      isLisbon ? 'BOARD FERRY [E]' : 'RETURN FERRY [E]',
      nearbyInteraction?.type === 'ferry-board'
    );

    // Docked Transtejo Catamaran gently bobbing on the Tagus
    const bob = Math.sin(this.animTime * 2.3) * 3;
    this.drawTranstejoCatamaran(ctx, 380, 368 + bob, { direction: 1, showWake: false });

    // Walk target on pier
    if (state.player.walkTarget) {
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Local traveler & any LAN peers sharing the same pier
    const pierActors = [
      {
        x: state.player.x,
        y: state.player.y,
        facing: state.player.facing,
        walkPhase: state.player.walkPhase,
        isMoving: state.player.isMoving,
        outfitId: state.player.outfitId,
        label: (state.remotePlayers || []).length > 0 ? state.player.name : '',
        emoteText: state.player.emoteText || '',
        isPlayer: true
      }
    ];
    for (const rp of state.remotePlayers || []) {
      if (rp.mode === 'ferry' && rp.ferryPortId === f.portId && rp.ferryPhase === 'terminal') {
        pierActors.push({
          x: rp.x,
          y: rp.y,
          facing: rp.facing,
          walkPhase: rp.walkPhase,
          isMoving: rp.isMoving,
          outfitId: rp.outfitId,
          label: rp.name,
          emoteText: rp.emoteText || '',
          isPlayer: false,
          isRemotePlayer: true
        });
      }
    }
    pierActors.sort((a, b) => a.y - b.y);
    for (const actor of pierActors) {
      this.drawCharacterSprite(ctx, actor.x, actor.y, actor);
    }
  }

  renderFerryCrossingScene(ctx, state) {
    const f = state.ferry;
    const phase = getDayPhase(state.minutesOfDay);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const destInfo = FERRY_DESTINATIONS.find((d) => d.id === f.toPortId);
    const fromLabel =
      f.fromPortId === FERRY_TERMINAL.id
        ? 'Cais do Sodre'
        : (FERRY_DESTINATIONS.find((d) => d.id === f.fromPortId)?.shortName || 'South Bank');
    const toLabel =
      f.toPortId === FERRY_TERMINAL.id
        ? 'Cais do Sodre (Lisboa)'
        : (destInfo?.name || 'South Bank');

    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = '#0e2236';
    ctx.fill();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.save();
    drawRoundedRect(ctx, 4, 4, INTERIOR_WIDTH - 8, INTERIOR_HEIGHT - 8, 9);
    ctx.clip();

    // 1. Open Tagus Estuary Sky
    const skyGrad = ctx.createLinearGradient(0, 6, 0, 260);
    if (isEvening) {
      skyGrad.addColorStop(0, '#0c1833');
      skyGrad.addColorStop(1, '#223a63');
    } else if (isGolden) {
      skyGrad.addColorStop(0, '#4c6d9c');
      skyGrad.addColorStop(0.55, '#e89654');
      skyGrad.addColorStop(1, '#fde68a');
    } else {
      skyGrad.addColorStop(0, '#2563eb');
      skyGrad.addColorStop(0.65, '#7dd3fc');
      skyGrad.addColorStop(1, '#e0f2fe');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(4, 4, INTERIOR_WIDTH - 8, 256);

    // 2. Approaching Destination Shoreline & Authentic Tagus Landmarks
    const progress = clamp(f.phaseProgress || 0, 0, 1);
    const horizonY = 236;

    if (f.toPortId === 'cacilhas' || f.fromPortId === 'cacilhas') {
      // Architectural red Ponte 25 de Abril suspension bridge + Cristo Rei cliffside monument + Farol de Cacilhas lighthouse
      const bLeft = 32;
      const bRight = 404;
      const t1X = 125;
      const t2X = 295;
      const deckY = 196;
      const towerTopY = 128;
      const bridgeRed = isEvening ? '#7f1d1d' : '#c81e32';
      const bridgeHighlight = isEvening ? '#a32929' : '#e33b45';

      // Concrete caisson piers at water level
      for (const tx of [t1X, t2X]) {
        ctx.fillStyle = isEvening ? '#475569' : '#cbd5e1';
        ctx.fillRect(tx - 12, horizonY - 8, 24, 9);
      }

      const cableY = (x) => {
        if (x <= t1X) {
          const u = (x - bLeft) / Math.max(1, t1X - bLeft);
          return deckY - u * u * (deckY - (towerTopY + 4));
        }
        if (x >= t2X) {
          const u = (bRight - x) / Math.max(1, bRight - t2X);
          return deckY - u * u * (deckY - (towerTopY + 4));
        }
        const u = (x - t1X) / Math.max(1, t2X - t1X);
        return (towerTopY + 4) + 4 * u * (1 - u) * ((deckY - 6) - (towerTopY + 4));
      };

      // Vertical suspender cables
      ctx.strokeStyle = isEvening ? 'rgba(153, 27, 27, 0.72)' : 'rgba(190, 24, 38, 0.72)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let sx = bLeft + 10; sx <= bRight - 10; sx += 11) {
        if (Math.abs(sx - t1X) < 8 || Math.abs(sx - t2X) < 8) continue;
        ctx.moveTo(sx, cableY(sx));
        ctx.lineTo(sx, deckY);
      }
      ctx.stroke();

      // Double-deck Warren truss roadway
      ctx.fillStyle = isEvening ? 'rgba(76, 15, 15, 0.85)' : 'rgba(136, 19, 28, 0.84)';
      ctx.fillRect(bLeft, deckY, bRight - bLeft, 6);
      ctx.strokeStyle = bridgeHighlight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bLeft, deckY);
      ctx.lineTo(bRight, deckY);
      ctx.moveTo(bLeft, deckY + 6);
      ctx.lineTo(bRight, deckY + 6);
      for (let wx = bLeft; wx < bRight - 8; wx += 10) {
        ctx.moveTo(wx, deckY);
        ctx.lineTo(wx + 5, deckY + 6);
        ctx.lineTo(wx + 10, deckY);
      }
      ctx.stroke();

      // Main catenary suspension cable
      ctx.strokeStyle = bridgeHighlight;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      for (let sx = bLeft; sx <= bRight; sx += 6) {
        const cy = cableY(sx);
        if (sx === bLeft) ctx.moveTo(sx, cy);
        else ctx.lineTo(sx, cy);
      }
      ctx.stroke();

      // Twin portal towers with diamond X-bracing
      for (const tx of [t1X, t2X]) {
        ctx.fillStyle = bridgeRed;
        ctx.fillRect(tx - 7, towerTopY, 4, horizonY - 8 - towerTopY);
        ctx.fillRect(tx + 3, towerTopY, 4, horizonY - 8 - towerTopY);
        ctx.strokeStyle = bridgeHighlight;
        ctx.lineWidth = 1.4;
        for (const [yA, yB] of [[132, 154], [156, 178], [180, 194], [204, 224]]) {
          ctx.beginPath();
          ctx.moveTo(tx - 5, yA);
          ctx.lineTo(tx + 5, yA);
          ctx.moveTo(tx - 5, yA);
          ctx.lineTo(tx + 5, yB);
          ctx.moveTo(tx + 5, yA);
          ctx.lineTo(tx - 5, yB);
          ctx.stroke();
        }
      }

      // Cristo Rei tapered 4-pillar pedestal & outstretched-arms statue on Almada cliff
      ctx.fillStyle = '#8b7e6d';
      ctx.beginPath();
      ctx.moveTo(410, horizonY);
      ctx.lineTo(480, 184);
      ctx.lineTo(680, 194);
      ctx.lineTo(756, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dfd7c8';
      ctx.beginPath();
      ctx.moveTo(515, 188);
      ctx.lineTo(519, 146);
      ctx.lineTo(533, 146);
      ctx.lineTo(537, 188);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9c9283';
      ctx.fillRect(524, 153, 4, 35);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(524, 132, 4, 14);
      ctx.fillRect(514, 135, 24, 3);
      ctx.beginPath();
      ctx.arc(526, 129, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Red Farol de Cacilhas lighthouse
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(622, 196, 12, 34);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(622, 208, 12, 5);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(628, 194, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.toPortId === 'seixal') {
      // Calm Baia do Seixal shoreline, tide mill & traditional Tagus fragata sailboats
      ctx.fillStyle = '#3d6b59';
      ctx.beginPath();
      ctx.moveTo(4, horizonY);
      ctx.quadraticCurveTo(220, 188, 420, 206);
      ctx.quadraticCurveTo(580, 196, 756, horizonY);
      ctx.closePath();
      ctx.fill();
      // Whitewashed tide mill & colorful Seixal waterfront houses
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(490, 198, 56, 36);
      ctx.fillStyle = '#b84a32';
      ctx.fillRect(486, 192, 64, 8);
      // Traditional painted fragata sailboats
      for (const [fx, col] of [[240, '#e11d48'], [590, '#f59e0b']]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(fx, 242);
        ctx.lineTo(fx + 26, 242);
        ctx.lineTo(fx + 10, 204);
        ctx.closePath();
        ctx.fill();
      }
    } else if (f.toPortId === 'montijo') {
      // Broad shimmering Montijo estuary marshlands & pink flamingos in flight
      ctx.fillStyle = '#6c8c68';
      ctx.fillRect(4, 212, INTERIOR_WIDTH - 8, 28);
      ctx.fillStyle = '#f8fafc';
      for (let hx = 140; hx <= 580; hx += 95) {
        ctx.fillRect(hx, 204, 34, 16);
        ctx.fillStyle = '#c85a36';
        ctx.fillRect(hx - 2, 199, 38, 6);
        ctx.fillStyle = '#f8fafc';
      }
      // Flamingos skimming the estuary sky
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      for (const [bx, by] of [[210, 152], [250, 144], [290, 158]]) {
        const wing = Math.sin(this.animTime * 6 + bx) * 4;
        ctx.beginPath();
        ctx.moveTo(bx - 10, by + wing);
        ctx.quadraticCurveTo(bx, by - 5, bx + 10, by + wing);
        ctx.stroke();
      }
    } else {
      // Returning to Cais do Sodre: Lisbon 7-hills terracotta skyline & Terreiro do Paco arches
      ctx.fillStyle = isEvening ? '#1f2e4a' : '#c96f4a';
      ctx.beginPath();
      ctx.moveTo(4, horizonY);
      ctx.lineTo(140, 186);
      ctx.lineTo(310, 174);
      ctx.lineTo(520, 184);
      ctx.lineTo(756, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(280, 206, 180, 30);
      ctx.fillStyle = '#0f5c52';
      ctx.fillRect(140, 214, 110, 22);
    }

    // Gliding white Tagus seagulls
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let g = 0; g < 3; g += 1) {
      const gx = ((140 + g * 210 + this.animTime * 28) % (INTERIOR_WIDTH + 60)) - 30;
      const gy = 112 + g * 18 + Math.sin(this.animTime * 4 + g) * 5;
      ctx.beginPath();
      ctx.moveTo(gx - 9, gy + 3);
      ctx.quadraticCurveTo(gx - 4, gy - 4, gx, gy);
      ctx.quadraticCurveTo(gx + 4, gy - 4, gx + 9, gy + 3);
      ctx.stroke();
    }

    // 3. Rolling Deep-Teal Tagus River Waves
    const waterGrad = ctx.createLinearGradient(0, horizonY, 0, INTERIOR_HEIGHT);
    waterGrad.addColorStop(0, isEvening ? '#0f2744' : '#0284c7');
    waterGrad.addColorStop(1, isEvening ? '#081526' : '#0c4a6e');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(4, horizonY, INTERIOR_WIDTH - 8, INTERIOR_HEIGHT - horizonY - 4);

    const waveShift = (f.waveOffset || 0) % 72;
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.42)';
    ctx.lineWidth = 2;
    for (let row = 0, wy = 258; wy < 444; row += 1, wy += 26) {
      const stagger = (row % 2) * 36;
      for (let wx = -108; wx < INTERIOR_WIDTH + 108; wx += 72) {
        const x = wx + stagger - waveShift;
        ctx.beginPath();
        ctx.moveTo(x, wy);
        ctx.quadraticCurveTo(x + 18, wy - 6, x + 36, wy);
        ctx.stroke();
      }
    }

    // 4. Transtejo Catamaran cruising dynamically across the Tagus with white bow & stern wake
    const sailBob = Math.sin(this.animTime * 4.2) * 3.5;
    const dir = f.toPortId === FERRY_TERMINAL.id ? -1 : 1;
    this.drawTranstejoCatamaran(ctx, 380, 344 + sailBob, { direction: dir, showWake: true });

    // 5. Overhead Live Transtejo Route Banner & Crossing Progress Strip
    drawRoundedRect(ctx, 110, 18, 540, 70, 8);
    ctx.fillStyle = 'rgba(12, 34, 54, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TRANSTEJO TAGUS FERRY  -  ${fromLabel} -> ${toLabel}`, 380, 40);

    // Route progress bar
    const sx1 = 175;
    const sx2 = 585;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx1, 64);
    ctx.lineTo(sx2, 64);
    ctx.stroke();
    for (const [px, lbl] of [[sx1, fromLabel], [sx2, toLabel]]) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(px, 64, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bae6fd';
      ctx.font = '700 9px "Segoe UI", sans-serif';
      ctx.fillText(lbl, px, 80);
    }
    const boatPipX = sx1 + (sx2 - sx1) * progress;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(boatPipX, 64, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (state.ferryHornSignal) {
      drawRoundedRect(ctx, 150, 94, 460, 24, 6);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${(state.ferryHornSignal.triggeredBy || 'CAPTAIN').toUpperCase()} HORN: "${state.ferryHornSignal.text}"`,
        380,
        110,
        440
      );
    }

    ctx.restore();
  }

  drawSouthBankFeedbackCard(ctx, fb) {
    if (!fb) return;
    ctx.save();
    const w = 720;
    const h = 76;
    const x = Math.round((this.viewWidth - w) / 2);
    const y = 414;
    drawRoundedRect(ctx, x, y, w, h, 9);
    ctx.fillStyle = 'rgba(12, 31, 48, 0.94)';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = '700 12.5px Georgia, serif';
    ctx.fillText(fb.title, this.viewWidth / 2, y + 21);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '500 10.5px "Segoe UI", sans-serif';
    const clippedNote = fb.text.length > 106 ? `${fb.text.slice(0, 103)}...` : fb.text;
    ctx.fillText(clippedNote, this.viewWidth / 2, y + 41);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.fillText(fb.actionHint || '', this.viewWidth / 2, y + 61);
    ctx.restore();
  }

  drawTranstejoCatamaran(ctx, cx, cy, { direction = 1, showWake = false } = {}) {
    ctx.save();
    ctx.translate(cx, cy);
    if (direction < 0) ctx.scale(-1, 1);

    // Frothy white wake trailing behind stern
    if (showWake) {
      ctx.fillStyle = 'rgba(240, 249, 255, 0.55)';
      ctx.beginPath();
      ctx.moveTo(-135, 8);
      ctx.lineTo(-270, -6);
      ctx.lineTo(-270, 28);
      ctx.lineTo(-135, 22);
      ctx.closePath();
      ctx.fill();
    }

    // Twin catamaran lower orange hull
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(-136, 4);
    ctx.lineTo(126, 4);
    ctx.lineTo(148, 22);
    ctx.lineTo(-142, 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sleek white passenger cabin + sky-blue panoramic windows
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-124, 4);
    ctx.lineTo(-110, -28);
    ctx.lineTo(92, -28);
    ctx.lineTo(128, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Upper bridge wheelhouse
    ctx.fillStyle = '#0f5c52';
    drawRoundedRect(ctx, 14, -44, 66, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(58, -40, 18, 9);

    // Panoramic passenger cabin windows
    ctx.fillStyle = '#0284c7';
    for (let wx = -98; wx <= 74; wx += 26) {
      drawRoundedRect(ctx, wx, -21, 20, 14, 3);
      ctx.fill();
    }

    // Signature orange & emerald Transtejo hull stripe
    ctx.fillStyle = '#0f5c52';
    ctx.fillRect(-130, 8, 260, 5);

    ctx.restore();
  }

  renderCityDistrict(ctx, state, nearbyInteraction) {
    const district =
      LISBOA_CITY_DISTRICTS.find((d) => d.id === state.cityDistrictId) ||
      LISBOA_CITY_DISTRICTS[0];
    const station =
      ALL_METRO_STATIONS.find((s) => s.id === district.stationId) ||
      METRO_STATIONS[0];
    const primaryLineColor = (station.lineColors && station.lineColors[0]) || district.accentColor || '#2563eb';
    const [eatery, landmark, shop] = district.townSpots;

    ctx.fillStyle = '#102032';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    const offsetX = Math.round((this.viewWidth - INTERIOR_WIDTH) / 2);
    const offsetY = Math.round((this.viewHeight - INTERIOR_HEIGHT) / 2);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = '#e7dfd1';
    ctx.fill();
    ctx.strokeStyle = primaryLineColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Top District Architecture Row (y: 12..148)
    ctx.fillStyle = '#d6cec0';
    ctx.fillRect(8, 8, INTERIOR_WIDTH - 16, 140);

    // Header Banner
    drawRoundedRect(ctx, 22, 14, INTERIOR_WIDTH - 44, 34, 6);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.strokeStyle = primaryLineColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${district.name.toUpperCase()}  ${district.zoneBadge}`, INTERIOR_WIDTH / 2, 30, INTERIOR_WIDTH - 64);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '600 9.5px "Segoe UI", sans-serif';
    ctx.fillText(district.transitSummary, INTERIOR_WIDTH / 2, 43, INTERIOR_WIDTH - 64);

    // 3 Top Buildings (Eatery, Center Monument/Transit, Shop)
    const cards = [
      { spot: eatery, x: 34, w: 204, fill: '#f7f1e5', accent: district.accentColor || '#b84a32' },
      { spot: landmark, x: 266, w: 228, fill: '#eef2ff', accent: '#0f766e' },
      { spot: shop, x: 522, w: 204, fill: '#eaf2fb', accent: primaryLineColor }
    ];
    for (const c of cards) {
      const hl = nearbyInteraction?.type === 'city-district-spot' && nearbyInteraction.spotId === c.spot.id;
      ctx.fillStyle = c.fill;
      drawRoundedRect(ctx, c.x, 58, c.w, 84, 7);
      ctx.fill();
      ctx.strokeStyle = hl ? '#f59e0b' : c.accent;
      ctx.lineWidth = hl ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = c.accent;
      ctx.fillRect(c.x, 58, c.w, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.spot.badge, c.x + c.w / 2, 71);
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 10.5px Georgia, serif';
      ctx.fillText(c.spot.name, c.x + c.w / 2, 102, c.w - 14);
      ctx.fillStyle = '#475569';
      ctx.font = '600 9px "Segoe UI", sans-serif';
      ctx.fillText(`Host: ${c.spot.host}`, c.x + c.w / 2, 122, c.w - 14);
    }

    // Walkable Calçada Portuguesa Plaza Floor (y: 148..288)
    ctx.fillStyle = this.patterns?.plaza || '#ece5d6';
    ctx.fillRect(8, 148, INTERIOR_WIDTH - 16, 140);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 148, INTERIOR_WIDTH - 16, 140);

    // Terrace dining table in front of left eatery (shows Glass or Plate when seatedDining is active!)
    ctx.fillStyle = '#78350f';
    drawRoundedRect(ctx, 138, 172, 34, 22, 4);
    ctx.fill();
    if (state.seatedDining && state.seatedDining.active) {
      if (state.seatedDining.servingType === 'glass') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(151, 177, 8, 11);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(151, 177, 8, 11);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(155, 183, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(155, 183, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Interactive spot markers along plaza north edge
    for (const sp of district.townSpots) {
      this.drawInteriorMarker(
        ctx,
        sp.x,
        182,
        sp.kind === 'landmark' ? 'EXPLORE [E]' : sp.badge,
        nearbyInteraction?.type === 'city-district-spot' && nearbyInteraction.spotId === sp.id
      );
    }

    // Open Walkable Perimeter Lisbon Avenue Corridors & Blue-and-White Azulejo Street Signs (continue on foot!)
    const cityAvenues = getWalkingAvenuesFrom(district.id);
    for (const av of cityAvenues) {
      const isHiAv = nearbyInteraction?.type === 'city-avenue' && nearbyInteraction.targetZoneId === av.toZoneId;
      // Visually open the cobblestone avenue corridor through the plaza border!
      ctx.fillStyle = '#ece5d6';
      if (av.slot === 'west') ctx.fillRect(0, 186, 22, 56);
      else if (av.slot === 'east') ctx.fillRect(INTERIOR_WIDTH - 22, 186, 22, 56);
      else if (av.slot === 'north-west' || av.slot === 'north-east') ctx.fillRect(av.x - 16, 134, 32, 22);
      else if (av.slot === 'south-west' || av.slot === 'south-east') ctx.fillRect(av.x - 22, 282, 44, 24);

      const kmTxt = av.distanceMeters >= 1000 ? `${(av.distanceMeters / 1000).toFixed(1)}km` : `${av.distanceMeters}m`;
      const tag = `-> ${av.shortLabel.split(' & ')[0]} (${kmTxt})`;
      ctx.save();
      ctx.font = '700 8px Georgia, serif';
      const tw = ctx.measureText(tag).width + 14;
      const mx =
        av.slot === 'west'
          ? Math.max(14 + tw * 0.5, 52)
          : av.slot === 'east'
            ? Math.min(INTERIOR_WIDTH - 14 - tw * 0.5, INTERIOR_WIDTH - 52)
            : clamp(av.x, 12 + tw * 0.5, INTERIOR_WIDTH - 12 - tw * 0.5);
      const my =
        av.slot === 'south-west' || av.slot === 'south-east'
          ? 276
          : av.slot === 'north-west' || av.slot === 'north-east'
            ? 156
            : 242;
      drawRoundedRect(ctx, mx - tw * 0.5, my - 10, tw, 20, 4);
      ctx.fillStyle = isHiAv ? '#fef3c7' : '#faf8f3';
      ctx.fill();
      ctx.strokeStyle = isHiAv ? '#d97706' : '#1b4d89';
      ctx.lineWidth = isHiAv ? 2.2 : 1.6;
      ctx.stroke();
      ctx.fillStyle = '#14375f';
      ctx.textAlign = 'center';
      ctx.fillText(tag, mx, my + 3);
      ctx.restore();
    }

    // South Metropolitano de Lisboa Entrance Pavilion (y: 292..448)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 288, INTERIOR_WIDTH - 16, 164);
    drawRoundedRect(ctx, 220, 314, 320, 108, 10);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = primaryLineColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Authentic Red Diamond M Logo on Metro Pavilion
    const mx = 276;
    const my = 368;
    ctx.fillStyle = '#c81e32';
    ctx.beginPath();
    ctx.moveTo(mx, my - 20);
    ctx.lineTo(mx + 20, my);
    ctx.lineTo(mx, my + 20);
    ctx.lineTo(mx - 20, my);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', mx, my + 6);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12.5px Georgia, serif';
    ctx.fillText(station.name.toUpperCase(), 312, 356, 214);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillText(station.lines.join(' & ').toUpperCase(), 312, 376, 214);
    ctx.fillStyle = '#fde047';
    ctx.font = '600 9.5px "Segoe UI", sans-serif';
    ctx.fillText('Walk South or Press [E] to Descend into Metro', 312, 396, 214);

    this.drawInteriorMarker(
      ctx,
      380,
      250,
      'METRO ENTRANCE [E]',
      nearbyInteraction?.type === 'city-district-metro'
    );

    if (state.player.walkTarget) {
      ctx.strokeStyle = primaryLineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Strolling local resident, player, and LAN peers
    const actors = [
      {
        x: 270 + Math.sin(this.animTime * 0.55) * 65,
        y: 230,
        facing: Math.cos(this.animTime * 0.55) >= 0 ? 'right' : 'left',
        walkPhase: this.animTime * 3.8,
        isMoving: true,
        outfitId: 'fado-blazer',
        isPlayer: false
      },
      {
        x: state.player.x,
        y: state.player.y,
        facing: state.player.facing,
        walkPhase: state.player.walkPhase,
        isMoving: state.player.isMoving,
        outfitId: state.player.outfitId,
        label: (state.remotePlayers || []).length > 0 ? state.player.name : '',
        emoteText: state.player.emoteText || '',
        isPlayer: true
      }
    ];
    for (const rp of state.remotePlayers || []) {
      if (rp.mode === 'city-district' && rp.cityDistrictId === district.id) {
        actors.push({
          x: rp.x,
          y: rp.y,
          facing: rp.facing,
          walkPhase: rp.walkPhase,
          isMoving: rp.isMoving,
          outfitId: rp.outfitId,
          label: rp.name,
          emoteText: rp.emoteText || '',
          isPlayer: false,
          isRemotePlayer: true
        });
      }
    }
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      this.drawCharacterSprite(ctx, actor.x, actor.y, actor);
    }

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }


  renderSantaJusta2D(ctx, state, nearbyInteraction) {
    const sj = state.santaJusta || { phase: 'lobby', altitudeMeters: 0 };
    if (sj.phase !== 'miradouro') {
      // Reuse the rich 1902 mahogany lobby & 45m shaft elevation graphic cleanly in 2D too!
      this.scenes3d.renderSantaJusta3D(ctx, state, nearbyInteraction, this.animTime);
      if (nearbyInteraction) this.drawInteractionBanner(ctx, nearbyInteraction);
      return;
    }

    // 2D Unfolded 360-Degree Factual Lisbon Skyline Panorama Observatory Chart (45m Elevation)
    const w = this.viewWidth;
    const h = this.viewHeight;
    const yawDeg = (((state.cameraYaw || 0) * 180) / Math.PI + 360) % 360;
    const centerBearing = (yawDeg + 90) % 360;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Header
    drawRoundedRect(ctx, 24, 16, w - 48, 52, 8);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = '700 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ELEVADOR DE SANTA JUSTA (45m MIRADOURO)  -  360-DEGREE FACTUAL LISBOA PANORAMA', w * 0.5, 38);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '600 10.5px "Segoe UI", sans-serif';
    ctx.fillText(`Heading ${Math.round(centerBearing)} deg  |  Press [V] for Full 3D 360-Degree View  |  A/D or Right Panel to Turn`, w * 0.5, 57);

    // Panoramic 360-degree skyline strip (0 deg N -> 90 E -> 180 S -> 270 W -> 360 N)
    const stripX = 36;
    const stripY = 92;
    const stripW = w - 72;
    const stripH = 266;
    drawRoundedRect(ctx, stripX, stripY, stripW, stripH, 10);
    const sGrad = ctx.createLinearGradient(0, stripY, 0, stripY + stripH);
    sGrad.addColorStop(0, '#1d5eb8');
    sGrad.addColorStop(0.54, '#7dd3fc');
    sGrad.addColorStop(0.55, '#c9b79f');
    sGrad.addColorStop(1, '#8c7258');
    ctx.fillStyle = sGrad;
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tagus River water band spanning ESE (118 deg) -> WSW (246 deg)
    const xForDeg = (deg) => stripX + ((((deg % 360) + 360) % 360) / 360) * stripW;
    const r0 = xForDeg(118);
    const r1 = xForDeg(246);
    ctx.fillStyle = '#1d75a8';
    ctx.fillRect(r0, stripY + 144, r1 - r0, 56);

    // Cardinal compass guide lines & labels
    for (const [deg, lbl] of [[0, 'N (0)'], [90, 'E (90)'], [180, 'S (180)'], [270, 'W (270)']]) {
      const cx = xForDeg(deg);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, stripY + 8);
      ctx.lineTo(cx, stripY + stripH - 8);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      drawRoundedRect(ctx, cx - 24, stripY + 8, 48, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.font = '800 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, cx, stripY + 20);
    }

    // Plot every factual Lisbon landmark at its exact bearing across 3 clean staggered rows (zero label overlap!)
    const rowOffsets = [-54, -22, 34];
    const sortedLandmarks = [...SANTA_JUSTA_PANORAMA_LANDMARKS].sort((a, b) => a.compassBearing - b.compassBearing);
    sortedLandmarks.forEach((lm, idx) => {
      const lx = xForDeg(lm.compassBearing);
      const ly = stripY + 132 + rowOffsets[idx % rowOffsets.length];
      const isFocused = sj.focusedLandmarkId === lm.id;
      ctx.fillStyle = isFocused ? '#facc15' : lm.accentColor;
      ctx.beginPath();
      ctx.arc(lx, stripY + 146, isFocused ? 7.5 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.strokeStyle = isFocused ? '#facc15' : 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lx, stripY + 146);
      ctx.lineTo(lx, ly + (ly < stripY + 146 ? 8 : -8));
      ctx.stroke();

      ctx.font = isFocused ? '700 9.5px "Segoe UI", sans-serif' : '600 8.5px "Segoe UI", sans-serif';
      const label = lm.shortName;
      const lw = ctx.measureText(label).width + 10;
      const bx0 = clamp(lx - lw * 0.5, stripX + 4, stripX + stripW - lw - 4);
      drawRoundedRect(ctx, bx0, ly - 8, lw, 17, 4);
      ctx.fillStyle = isFocused ? '#0f172a' : 'rgba(15, 23, 42, 0.85)';
      ctx.fill();
      ctx.strokeStyle = isFocused ? '#facc15' : lm.accentColor;
      ctx.lineWidth = isFocused ? 1.8 : 1;
      ctx.stroke();
      ctx.fillStyle = isFocused ? '#fde047' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(label, bx0 + lw * 0.5, ly + 3.5);
    });

    // Live Camera Heading Indicator bracket
    const curX = xForDeg(centerBearing);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(clamp(curX - 46, stripX + 2, stripX + stripW - 94), stripY + 32, 92, stripH - 40);

    // Bottom focused landmark description card
    const focused =
      SANTA_JUSTA_PANORAMA_LANDMARKS.find((l) => l.id === sj.focusedLandmarkId) ||
      SANTA_JUSTA_PANORAMA_LANDMARKS[3];
    if (focused) {
      drawRoundedRect(ctx, 36, 376, w - 72, 102, 10);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = focused.accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fde047';
      ctx.font = '700 13px Georgia, serif';
      ctx.fillText(
        `${focused.compassLabel} (${focused.compassBearing} deg, ${focused.distanceMeters}m)  -  ${focused.name} (${focused.year})`,
        54,
        404,
        w - 108
      );
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '500 11px "Segoe UI", sans-serif';
      ctx.fillText(focused.description, 54, 432, w - 108);
      ctx.fillStyle = '#93c5fd';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.fillText('Switch to 3D Street View [V] for the full immersive 360-degree skyline from the 45m iron railing.', 54, 460, w - 108);
    }
    ctx.textAlign = 'left';

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }
}

export const transitScenes2dMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    transitScenes2dMethods[key] = _Mixin.prototype[key];
  }
}
