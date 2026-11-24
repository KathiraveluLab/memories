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
  renderInterior(ctx, state, nearbyInteraction) {
    const venue = findEnterableVenueById(state.currentVenueId);
    if (!venue) return;

    const theme = venue.interiorTheme;
    const phase = getDayPhase(state.minutesOfDay);

    ctx.fillStyle = '#182230';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    const offsetX = Math.round((this.viewWidth - INTERIOR_WIDTH) / 2);
    const offsetY = Math.round((this.viewHeight - INTERIOR_HEIGHT) / 2);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = theme.wall;
    ctx.fill();
    ctx.strokeStyle = theme.trim;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = theme.wall;
    ctx.fillRect(6, 6, INTERIOR_WIDTH - 12, 134);
    if (theme.layout === 'cathedral') {
      // Romanesque carved limestone vault arches + glowing stained-glass rose window
      ctx.strokeStyle = 'rgba(92, 79, 65, 0.35)';
      ctx.lineWidth = 2.5;
      for (let ax = 90; ax < INTERIOR_WIDTH - 60; ax += 145) {
        ctx.beginPath();
        ctx.arc(ax, 132, 62, Math.PI, 0);
        ctx.stroke();
      }
      // Stained-glass lancet side windows + central rose glow
      for (const wx of [100, 616]) {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(wx + 22, 46, 22, Math.PI, 0);
        ctx.lineTo(wx + 44, 114);
        ctx.lineTo(wx, 114);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(wx + 22, 56, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5c4f41';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      // Rose window halo centered behind the docent desk
      const roseGlow = ctx.createRadialGradient(380, 96, 6, 380, 96, 56);
      roseGlow.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
      roseGlow.addColorStop(0.55, 'rgba(37, 99, 235, 0.38)');
      roseGlow.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = roseGlow;
      ctx.beginPath();
      ctx.arc(380, 96, 56, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme.layout === 'bookshop') {
      // Tall floor-to-ceiling oak Bertrand bookcases across the back wall
      ctx.fillStyle = '#5a3a21';
      ctx.fillRect(14, 14, INTERIOR_WIDTH - 28, 118);
      const bookCols = ['#1b4d89', '#b84a32', '#1f7062', '#c98a18', '#5b3a63', '#2563eb'];
      for (let shelf = 0; shelf < 3; shelf += 1) {
        const sy = 24 + shelf * 34;
        for (let bx = 24; bx < INTERIOR_WIDTH - 34; bx += 11) {
          if (bx > 210 && bx < 548 && shelf < 2) continue;
          ctx.fillStyle = bookCols[((bx / 11) + shelf * 2) % bookCols.length | 0];
          ctx.fillRect(bx, sy, 8, 24);
        }
        ctx.fillStyle = '#3d2514';
        ctx.fillRect(18, sy + 24, INTERIOR_WIDTH - 36, 4);
      }
    } else if (theme.layout === 'gallery') {
      // Clean museum wall with illuminated gilded art frames flanking title plaque
      for (const fx of [56, 148, 566, 658]) {
        ctx.fillStyle = '#d4a337';
        ctx.fillRect(fx - 3, 28, 56, 70);
        ctx.fillStyle = '#faf5ea';
        ctx.fillRect(fx, 31, 50, 64);
        ctx.fillStyle = fx % 2 === 0 ? '#1b4d89' : '#b84a32';
        ctx.fillRect(fx + 6, 40, 38, 46);
      }
    } else if (theme.layout === 'airport') {
      // Aeroporto Humberto Delgado Terminal 1 panoramic runway glass + illuminated PARTIDAS / DEPARTURES board
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(24, 16, 360, 114);
      ctx.fillStyle = '#475569';
      ctx.fillRect(24, 92, 360, 38);
      ctx.fillStyle = '#f8fafc';
      for (let rx = 44; rx < 360; rx += 46) ctx.fillRect(rx, 108, 24, 4);
      // Departing jetliner visible through terminal glass
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(210, 62, 24, 5, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(184, 53, 8, 12);
      // LED Flight Departures Board
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(408, 16, 326, 114);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(408, 16, 326, 114);
      ctx.fillStyle = '#facc15';
      ctx.font = '800 11px "Segoe UI", sans-serif';
      ctx.fillText('PARTIDAS / DEPARTURES (LIS)', 424, 36);
      ctx.font = '700 9.5px monospace';
      const rows = [
        'TP 1042  MADRID    GATE A12  BOARDING',
        'TP  432  PARIS     GATE A14  ON TIME',
        'TP 1354  LONDON    GATE A16  ON TIME',
        'TP  209  NEW YORK  GATE B04  16:40'
      ];
      rows.forEach((r, idx) => {
        ctx.fillStyle = idx === 0 ? '#4ade80' : '#f8fafc';
        ctx.fillText(r, 424, 56 + idx * 17);
      });
    } else if (theme.layout === 'stadium') {
      // Panoramic Stadium Concourse overlooking the Football Pitch & Tiered Stands
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(24, 16, INTERIOR_WIDTH - 48, 114);
      ctx.fillStyle = theme.clubColor || '#dc2626';
      ctx.fillRect(24, 48, INTERIOR_WIDTH - 48, 36);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(24, 84, INTERIOR_WIDTH - 48, 46);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 90, INTERIOR_WIDTH - 72, 34);
      ctx.beginPath();
      ctx.moveTo(INTERIOR_WIDTH * 0.5, 90);
      ctx.lineTo(INTERIOR_WIDTH * 0.5, 124);
      ctx.stroke();
    } else if (theme.layout === 'pensao') {
      // Warm residential parlor wallpaper + wooden hotel room-key pigeonhole board
      this.drawAzulejoWall(ctx, 8, 86, INTERIOR_WIDTH - 16, 48, 'cobalt-azulejo');
      ctx.fillStyle = '#6c492e';
      ctx.fillRect(58, 22, 136, 64);
      ctx.strokeStyle = '#3d2514';
      ctx.lineWidth = 2;
      ctx.strokeRect(58, 22, 136, 64);
      ctx.fillStyle = '#eab308';
      for (let r = 0; r < 2; r += 1) {
        for (let c = 0; c < 5; c += 1) {
          ctx.fillRect(68 + c * 24, 34 + r * 24, 14, 14);
        }
      }
    } else if (theme.layout === 'bar') {
      // Backlit Bairro Alto Bar da Noite liquor shelves, neon sign & overhead twinkling festoon party bulbs!
      ctx.fillStyle = '#1b0e26';
      ctx.fillRect(18, 16, INTERIOR_WIDTH - 36, 116);
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 16, INTERIOR_WIDTH - 36, 116);
      const bCols = ['#ef4444', '#f59e0b', '#10b981', '#38bdf8', '#c084fc'];
      for (let s = 0; s < 2; s += 1) {
        const sy = 56 + s * 42;
        ctx.fillStyle = s === 0 ? '#f472b6' : '#fbbf24';
        ctx.fillRect(28, sy, INTERIOR_WIDTH - 56, 3);
        for (let bx = 38; bx < INTERIOR_WIDTH - 48; bx += 22) {
          if (bx > 235 && bx < 525) continue;
          ctx.fillStyle = bCols[((bx / 22) + s) % bCols.length | 0];
          ctx.fillRect(bx, sy - 20, 10, 19);
        }
      }
      // Twinkling overhead party bulbs inside 2D bar plan
      for (let i = 0; i < 9; i += 1) {
        const lx = 56 + i * 80;
        const col = bCols[i % bCols.length];
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(lx, 18, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme.layout === 'bakery') {
      // Back wall of Bakery / Confeitaria: glowing brick wood-fired bread oven + tiered oak bread racks
      this.drawAzulejoWall(ctx, 8, 86, INTERIOR_WIDTH - 16, 48, 'cobalt-azulejo');

      // Left brick wood-fired Lisbon bread oven with arched firebox & baker's peel
      ctx.fillStyle = '#a64b33';
      drawRoundedRect(ctx, 36, 20, 152, 112, 8);
      ctx.fill();
      ctx.strokeStyle = '#6b2c1c';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Brick courses
      ctx.strokeStyle = 'rgba(255, 224, 200, 0.28)';
      ctx.lineWidth = 1;
      for (let by = 34; by < 126; by += 14) {
        ctx.beginPath();
        ctx.moveTo(38, by);
        ctx.lineTo(186, by);
        ctx.stroke();
      }
      // Arched glowing hearth mouth
      ctx.fillStyle = '#29150e';
      ctx.beginPath();
      ctx.arc(112, 92, 34, Math.PI, 0);
      ctx.lineTo(146, 126);
      ctx.lineTo(78, 126);
      ctx.closePath();
      ctx.fill();
      const emberPulse = 0.72 + Math.sin(this.animTime * 4.5) * 0.14;
      const fireGrad = ctx.createRadialGradient(112, 114, 4, 112, 108, 34);
      fireGrad.addColorStop(0, `rgba(254, 240, 138, ${emberPulse})`);
      fireGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.85)');
      fireGrad.addColorStop(1, 'rgba(154, 52, 18, 0.1)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(112, 96, 30, Math.PI, 0);
      ctx.lineTo(142, 124);
      ctx.lineTo(82, 124);
      ctx.closePath();
      ctx.fill();
      // Crusty loaves baking inside oven hearth
      this.drawCountryLoaf(ctx, 98, 116, 11, 6);
      this.drawCountryLoaf(ctx, 126, 116, 11, 6);

      // Right oak bakery bread shelving stacked with crusty loaves, baguettes & pastries
      ctx.fillStyle = '#6c492e';
      drawRoundedRect(ctx, 566, 20, 158, 112, 6);
      ctx.fill();
      ctx.strokeStyle = '#3d2514';
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let shelf = 0; shelf < 3; shelf += 1) {
        const sy = 50 + shelf * 34;
        ctx.fillStyle = '#4e311c';
        ctx.fillRect(572, sy, 146, 4);
        if (shelf === 0) {
          this.drawCountryLoaf(ctx, 598, sy - 9, 16, 9);
          this.drawCountryLoaf(ctx, 644, sy - 9, 16, 9);
          this.drawCountryLoaf(ctx, 690, sy - 9, 16, 9);
        } else if (shelf === 1) {
          for (let px = 588; px <= 702; px += 22) {
            this.drawPastelDeNata(ctx, px, sy - 8, 7.5);
          }
        } else {
          // Crusty baguettes / cacetes
          for (let bx = 582; bx <= 676; bx += 46) {
            this.drawCountryLoaf(ctx, bx + 18, sy - 7, 20, 6);
          }
        }
      }
    } else if (theme.layout === 'restaurant') {
      // Back wall of Restaurant: copper pots, wine cellar rack, and Fado guitar or Alfama sardine grill
      this.drawAzulejoWall(ctx, 8, 86, INTERIOR_WIDTH - 16, 48, 'cobalt-azulejo');

      // Left open kitchen pass & hanging gleaming copper saucepans
      ctx.fillStyle = '#3b2416';
      drawRoundedRect(ctx, 36, 20, 162, 108, 6);
      ctx.fill();
      ctx.fillStyle = '#f5d08a';
      ctx.fillRect(46, 30, 142, 68);
      // Hanging copper pots along upper rail
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 38);
      ctx.lineTo(184, 38);
      ctx.stroke();
      for (const px of [72, 114, 156]) {
        ctx.fillStyle = '#c86d3b';
        ctx.beginPath();
        ctx.arc(px, 56, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7c3214';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f5b07c';
        ctx.beginPath();
        ctx.arc(px - 3, 53, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Kitchen pass shelf holding steaming soup pot & sardine platter
      ctx.fillStyle = '#7c4f2b';
      ctx.fillRect(44, 96, 146, 10);
      this.drawCaldoVerdeBowl(ctx, 86, 90);
      this.drawSardinePlatter(ctx, 118, 80, 62, 18);

      // Right wall: wooden wine bottle rack + Portuguese guitar (Tasca) or glowing grill (Taberna)
      ctx.fillStyle = '#5c3a21';
      drawRoundedRect(ctx, 564, 22, 160, 106, 6);
      ctx.fill();
      ctx.strokeStyle = '#3d2514';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Wine bottles (Vinho Verde & Douro reds)
      for (let r = 0; r < 2; r += 1) {
        for (let c = 0; c < 4; c += 1) {
          const bx = 582 + c * 20;
          const by = 46 + r * 38;
          ctx.fillStyle = r === 0 ? '#166534' : '#7f1d1d';
          ctx.fillRect(bx, by, 10, 24);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(bx + 2, by + 8, 6, 8);
        }
      }
      if (venue.id === 'tasca-do-fado') {
        // Mounted 12-string Portuguese Guitar on back wall
        const gx = 690;
        const gy = 84;
        ctx.fillStyle = '#d49442';
        ctx.beginPath();
        ctx.arc(gx, gy, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5c3317';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(gx - 3, gy - 44, 6, 28);
        ctx.fillStyle = '#29150e';
        ctx.beginPath();
        ctx.arc(gx, gy, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glowing charcoal sardine brazier with silver grilled sardines & smoke wisps on right wall
        ctx.fillStyle = '#27272a';
        drawRoundedRect(ctx, 666, 56, 50, 58, 4);
        ctx.fill();
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(671, 68, 40, 34);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(675, 74, 32, 22);
        // Grill bars
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.2;
        for (let gy = 72; gy <= 98; gy += 6) {
          ctx.beginPath();
          ctx.moveTo(671, gy);
          ctx.lineTo(711, gy);
          ctx.stroke();
        }
        // Three sizzling silver sardines with forked tails on the charcoal grill
        for (const sy of [75, 85, 95]) {
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.ellipse(692, sy, 12, 2.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(680, sy);
          ctx.lineTo(675, sy - 2.5);
          ctx.lineTo(675, sy + 2.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#334155';
          ctx.fillRect(688, sy - 2, 1.8, 4);
          ctx.fillRect(695, sy - 2, 1.8, 4);
        }
        // Subtle rising charcoal grill smoke
        const smokeDrift = Math.sin(this.animTime * 3) * 2;
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.55)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(684, 54);
        ctx.quadraticCurveTo(682 + smokeDrift, 44, 686, 36);
        ctx.moveTo(698, 54);
        ctx.quadraticCurveTo(700 - smokeDrift, 43, 696, 35);
        ctx.stroke();
      }
    } else {
      this.drawAzulejoWall(ctx, 8, 86, INTERIOR_WIDTH - 16, 48, 'cobalt-azulejo');
    }
    ctx.fillStyle = theme.trim;
    ctx.fillRect(6, 132, INTERIOR_WIDTH - 12, 8);

    const skyColor =
      phase.id === 'evening' ? '#1c2c4d' : phase.id === 'golden' ? '#e89a54' : '#8ec5e8';
    const winXs =
      theme.layout === 'cathedral' ||
        theme.layout === 'bookshop' ||
        theme.layout === 'gallery' ||
        theme.layout === 'bakery' ||
        theme.layout === 'restaurant'
        ? []
        : [88, 588];
    for (const wx of winXs) {
      ctx.fillStyle = skyColor;
      ctx.beginPath();
      ctx.arc(wx + 42, 56, 42, Math.PI, 0);
      ctx.lineTo(wx + 84, 108);
      ctx.lineTo(wx, 108);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = theme.trim;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx + 42, 14);
      ctx.lineTo(wx + 42, 108);
      ctx.moveTo(wx, 66);
      ctx.lineTo(wx + 84, 66);
      ctx.stroke();
    }

    drawRoundedRect(ctx, 224, 22, 312, 46, 8);
    ctx.fillStyle = theme.trim;
    ctx.fill();
    ctx.strokeStyle = '#f3c623';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(venue.name, 380, 44);
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 10.5px "Segoe UI", sans-serif';
    ctx.fillText(`${venue.badge}  -  ${venue.memory.neighborhood.toUpperCase()}`, 380, 60);

    const tile = 32;
    for (let fy = 140; fy < INTERIOR_HEIGHT - 12; fy += tile) {
      for (let fx = 12; fx < INTERIOR_WIDTH - 12; fx += tile) {
        const alt = (Math.floor(fx / tile) + Math.floor(fy / tile)) % 2 === 0;
        const tw = Math.min(tile, INTERIOR_WIDTH - 12 - fx);
        const th = Math.min(tile, INTERIOR_HEIGHT - 12 - fy);
        ctx.fillStyle = alt ? theme.floorPrimary : theme.floorSecondary;
        ctx.fillRect(fx, fy, tw, th);
        if (tw === tile && th === tile) {
          ctx.fillStyle = 'rgba(27, 77, 137, 0.08)';
          ctx.beginPath();
          ctx.moveTo(fx + 16, fy + 8);
          ctx.lineTo(fx + 24, fy + 16);
          ctx.lineTo(fx + 16, fy + 24);
          ctx.lineTo(fx + 8, fy + 16);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Person(s) in charge clearly visible behind the counter (Chef/Baker + dedicated Cashier where applicable)
    const hasSecondCashier = Boolean(venue.cashierName);
    const primaryStaffX = hasSecondCashier ? 314 : 380;
    const isChefOrBaker =
      theme.layout === 'bakery' || theme.layout === 'restaurant';

    this.drawStaffMember(ctx, primaryStaffX, 132, {
      name: venue.proprietor,
      role: venue.proprietorRole,
      tunicColor: isChefOrBaker ? '#f8fafc' : theme.trim,
      apronColor: isChefOrBaker ? '#ffffff' : theme.layout === 'mercearia' ? '#15803d' : theme.layout === 'cafe' ? '#1e293b' : null,
      chefHat: isChefOrBaker,
      hairColor: '#3a2b22'
    });

    if (hasSecondCashier) {
      this.drawStaffMember(ctx, 495, 132, {
        name: venue.cashierName,
        role: venue.cashierRole || 'Cashier',
        tunicColor: theme.trim,
        apronColor: '#f5f0e4',
        chefHat: false,
        hairColor: '#543828'
      });
    }

    // Wide service & cashier counter (y: 144..190)
    ctx.fillStyle = 'rgba(20, 20, 25, 0.22)';
    ctx.fillRect(216, 154, 334, 42);
    ctx.fillStyle = theme.counter;
    drawRoundedRect(ctx, 210, 144, 340, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#3d2514';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 248, 235, 0.25)';
    for (let cx = 224; cx < 536; cx += 24) {
      ctx.fillRect(cx, 176, 14, 7);
    }

    // Vintage brass cash register centered right in front of the Cashier (all commercial venues)
    if (theme.layout !== 'cathedral') {
      this.drawCashRegister(ctx, 472, 146);
    }

    if (theme.layout === 'bakery') {
      // Wide crystal-clear glass bakery showcase filled with breads, pasteis de nata & pastries
      ctx.fillStyle = '#fff9eb';
      drawRoundedRect(ctx, 222, 147, 236, 36, 4);
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // Glass reflection sheen
      ctx.fillStyle = 'rgba(186, 230, 253, 0.24)';
      ctx.fillRect(224, 149, 232, 10);

      // Top tier: crusty scored Pao de Mafra loaves & Pao com Chourico
      this.drawCountryLoaf(ctx, 250, 158, 16, 7);
      this.drawCountryLoaf(ctx, 292, 158, 16, 7);
      // Pao com chourico with red chorizo slice peeking out
      this.drawCountryLoaf(ctx, 334, 158, 15, 6.5);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(339, 158, 3, 0, Math.PI * 2);
      ctx.fill();
      // Sugar-dusted travesseiros
      for (const tx of [372, 406, 438]) {
        ctx.fillStyle = '#d99a38';
        drawRoundedRect(ctx, tx - 11, 153, 22, 10, 3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx - 7, 156, 14, 3);
      }

      // Bottom tier: row of blistered golden Pasteis de Nata & Queijadas
      for (let nx = 240; nx <= 444; nx += 22) {
        this.drawPastelDeNata(ctx, nx, 174, 7.5);
      }
    } else if (theme.layout === 'cafe') {
      // Polished brass espresso machine + glass pastel de nata & bolo de arroz vitrine
      ctx.fillStyle = '#c5922b';
      drawRoundedRect(ctx, 224, 147, 50, 28, 4);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(232, 166, 10, 7);
      ctx.fillRect(252, 166, 10, 7);

      // Glass pastry vitrine with pasteis de nata & rice muffins
      ctx.fillStyle = '#fff8e6';
      drawRoundedRect(ctx, 284, 148, 174, 34, 4);
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      for (let nx = 302; nx <= 384; nx += 20) {
        this.drawPastelDeNata(ctx, nx, 164, 7.5);
      }
      // Bolo de arroz muffins in white paper cups
      for (const bx of [412, 436]) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(bx - 7, 163, 14, 10);
        ctx.fillStyle = '#d98a1c';
        ctx.beginPath();
        ctx.arc(bx, 162, 7.5, Math.PI, 0);
        ctx.fill();
      }
    } else if (theme.layout === 'restaurant') {
      // Rich Portuguese restaurant spread right along the kitchen pass counter, tailored to each restaurant's menu
      if (venue.id === 'tasca-do-fado') {
        // 1. Steaming terracotta bowl of Caldo Verde + sliced broa corn bread
        this.drawCaldoVerdeBowl(ctx, 246, 165);
        this.drawCountryLoaf(ctx, 282, 167, 13, 6.5);
        // 2. Platter of golden Pasteis de Bacalhau with tomato rice & parsley
        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 304, 151, 78, 28, 6);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#d97706';
        for (let bx = 317; bx <= 355; bx += 13) {
          ctx.beginPath();
          ctx.ellipse(bx, 162, 5.5, 3.8, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(369, 166, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(334, 171, 6, 3);
        // 3. Arroz Doce cinnamon-lattice dessert bowl & Bifana roll
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(406, 165, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        // Cinnamon lattice lines
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(398, 160); ctx.lineTo(414, 170);
        ctx.moveTo(398, 170); ctx.lineTo(414, 160);
        ctx.stroke();
        // Warm Bifana roll
        this.drawCountryLoaf(ctx, 444, 165, 14, 7.5);
      } else {
        // Taberna da Sardinha: Tomato & Broa salad, Grilled Sardines platter, Bacalhau a Bras with black olives
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(246, 165, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(242, 163, 4.5, 0, Math.PI * 2);
        ctx.arc(250, 167, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(245, 160, 4, 3);
        this.drawCountryLoaf(ctx, 279, 167, 12, 6.5);

        // Ceramic platter of charcoal-grilled Sardinhas Assadas with roasted peppers & lemon
        this.drawSardinePlatter(ctx, 302, 150, 86, 30);

        // Golden Bacalhau a Bras platter with olives & parsley
        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 398, 151, 64, 28, 6);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#eab308';
        drawRoundedRect(ctx, 405, 156, 50, 18, 5);
        ctx.fill();
        ctx.fillStyle = '#1f2937';
        for (const [ox, oy] of [[418, 164], [432, 167], [445, 162]]) {
          ctx.beginPath();
          ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(426, 160, 5, 3);
      }
    } else if (theme.layout === 'bookshop') {
      const spineCols = ['#1b4d89', '#b84a32', '#1f7062', '#c98a18', '#5b3a63'];
      spineCols.forEach((sc, i) => {
        ctx.fillStyle = sc;
        ctx.fillRect(230 + i * 11, 148, 9, 24);
      });
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(444, 156, 11, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(442, 156, 4, 16);
    } else if (theme.layout === 'vinyl') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(232, 148, 44, 26);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(252, 161, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(252, 161, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(416, 148, 26, 24);
      ctx.fillStyle = '#6d476c';
      ctx.fillRect(446, 148, 26, 24);
    } else if (theme.layout === 'azulejo') {
      for (const [idx, col] of ['#1d568a', '#3b82f6', '#eab308', '#f8fafc'].entries()) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(236 + idx * 14, 160, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (let tx = 412; tx <= 452; tx += 22) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(tx, 150, 19, 19);
        ctx.fillStyle = '#1d568a';
        ctx.fillRect(tx + 5, 155, 9, 9);
      }
    } else if (theme.layout === 'mercearia') {
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(252, 148, 4, 22);
      ctx.fillRect(236, 154, 36, 3);
      const tins = ['#e11d48', '#f59e0b', '#0284c7', '#10b981'];
      tins.forEach((tc, i) => {
        ctx.fillStyle = tc;
        ctx.fillRect(394 + i * 19, 150, 16, 20);
      });
    } else if (theme.layout === 'pensao') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(260, 166, 9, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(410, 148, 56, 24);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(414, 151, 48, 18);
    } else if (theme.layout === 'gallery') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(236, 148, 42, 24);
      ctx.strokeStyle = '#785a36';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(236, 148, 42, 24);
      ctx.fillStyle = '#1b4d89';
      ctx.fillRect(242, 154, 30, 12);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(422, 148, 46, 24);
      ctx.strokeRect(422, 148, 46, 24);
      ctx.fillStyle = '#b84a32';
      ctx.fillRect(430, 154, 30, 12);
    } else if (theme.layout === 'cathedral') {
      for (const cx of [248, 264, 494, 510]) {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx, 154, 5, 16);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx + 2.5, 152, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#faf5e8';
      ctx.fillRect(352, 152, 56, 20);
      ctx.strokeStyle = '#785a36';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(352, 152, 56, 20);
    } else {
      ctx.fillStyle = '#c89b6d';
      ctx.fillRect(236, 148, 38, 24);
      ctx.fillStyle = '#8b5a34';
      ctx.fillRect(418, 148, 24, 22);
      ctx.fillStyle = '#1f7062';
      ctx.fillRect(446, 148, 24, 22);
    }

    // Left interactive display station tailored to venue category (keeps exact collision footprint 62..134, 204..322)
    ctx.fillStyle = theme.layout === 'gallery' || theme.layout === 'cathedral' ? '#e5dfd3' : '#7b5336';
    drawRoundedRect(ctx, 62, 204, 72, 118, 6);
    ctx.fill();
    ctx.strokeStyle = '#472d1b';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (theme.layout === 'bakery') {
      // Three wicker bread baskets packed with scored rustic loaves, baguettes, and warm pastries
      for (let b = 0; b < 3; b += 1) {
        const by = 212 + b * 36;
        ctx.fillStyle = '#b98552';
        drawRoundedRect(ctx, 69, by, 58, 28, 5);
        ctx.fill();
        ctx.strokeStyle = '#784822';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        if (b === 0) {
          this.drawCountryLoaf(ctx, 85, by + 14, 12, 7);
          this.drawCountryLoaf(ctx, 111, by + 14, 12, 7);
        } else if (b === 1) {
          this.drawCountryLoaf(ctx, 98, by + 9, 22, 5);
          this.drawCountryLoaf(ctx, 98, by + 20, 22, 5);
        } else {
          this.drawPastelDeNata(ctx, 83, by + 14, 6.5);
          this.drawPastelDeNata(ctx, 98, by + 14, 6.5);
          this.drawPastelDeNata(ctx, 113, by + 14, 6.5);
        }
      }
    } else if (theme.layout === 'cafe') {
      // Cafe side display: roasted coffee canisters, tiered Pasteis de Nata stand, and toasted sandwiches
      ctx.fillStyle = '#b45309';
      for (let c = 0; c < 3; c += 1) {
        ctx.fillRect(72 + c * 18, 214, 14, 22);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(74 + c * 18, 220, 10, 7);
        ctx.fillStyle = '#b45309';
      }
      // Tiered glass pastry shelf
      ctx.fillStyle = '#fff8e6';
      drawRoundedRect(ctx, 70, 246, 56, 30, 4);
      ctx.fill();
      this.drawPastelDeNata(ctx, 84, 261, 6.5);
      this.drawPastelDeNata(ctx, 98, 261, 6.5);
      this.drawPastelDeNata(ctx, 112, 261, 6.5);
      // Warm Tosta Mista & espresso cups on bottom shelf
      ctx.fillStyle = '#d99026';
      drawRoundedRect(ctx, 72, 286, 26, 20, 3);
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(72, 286);
      ctx.lineTo(98, 306);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(114, 296, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b1806';
      ctx.beginPath();
      ctx.arc(114, 296, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme.layout === 'restaurant') {
      // Portuguese tavern side-buffet: Vinho Verde bottles, olive-oil jug, crusty bread & olive bowl
      for (let c = 0; c < 3; c += 1) {
        ctx.fillStyle = c === 1 ? '#7f1d1d' : '#15803d';
        ctx.fillRect(74 + c * 18, 214, 10, 24);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(76 + c * 18, 222, 6, 8);
      }
      // Bread basket on middle shelf
      this.drawCountryLoaf(ctx, 86, 260, 12, 7);
      this.drawCountryLoaf(ctx, 110, 260, 12, 7);
      // Terracotta olive oil cruet & bowl of black olives on lower shelf
      ctx.fillStyle = '#c25934';
      ctx.beginPath();
      ctx.arc(84, 296, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(112, 296, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f2937';
      for (const [ox, oy] of [[109, 294], [115, 295], [112, 299]]) {
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme.layout === 'bookshop') {
      const colors = ['#1b4d89', '#b84a32', '#1f7062', '#c98a18', '#5b3a63', '#2563eb'];
      for (let row = 0; row < 4; row += 1) {
        const sy = 212 + row * 26;
        for (let b = 0; b < 7; b += 1) {
          ctx.fillStyle = colors[(row * 3 + b) % colors.length];
          ctx.fillRect(70 + b * 8, sy, 6, 18);
        }
        ctx.fillStyle = '#4e311c';
        ctx.fillRect(68, sy + 18, 58, 3);
      }
    } else if (theme.layout === 'vinyl') {
      for (let sy = 216; sy <= 286; sy += 34) {
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(98, sy + 12, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(98, sy + 12, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme.layout === 'gallery' || theme.layout === 'cathedral') {
      ctx.fillStyle = '#dbeafe';
      ctx.fillRect(70, 214, 56, 98);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(70, 214, 56, 98);
      ctx.fillStyle = theme.layout === 'cathedral' ? '#eab308' : '#1b4d89';
      ctx.beginPath();
      ctx.arc(98, 262, 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const swatchColors =
        theme.layout === 'azulejo'
          ? ['#1d568a', '#3b82f6', '#1e40af', '#0284c7']
          : ['#1b4d89', '#c98a18', '#b84a32', '#13795b'];
      for (let sy = 216; sy <= 298; sy += 26) {
        ctx.fillStyle = swatchColors[(sy / 26) % swatchColors.length | 0];
        ctx.fillRect(72, sy, 52, 15);
      }
    }

    // Right furnishings tailored to venue category (keeps exact collision footprint 590..682, 225..279 & 325..379)
    const tableYs = [225, 325];
    tableYs.forEach((ty, tIdx) => {
      if (theme.layout === 'restaurant') {
        // Checkered restaurant table fully set with plated Portuguese dishes, wine glasses, bread & candle
        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 590, ty, 92, 54, 8);
        ctx.fill();
        ctx.strokeStyle = '#472d1b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const clothColor = venue.id === 'tasca-do-fado' ? '#dc2626' : '#1d4ed8';
        ctx.save();
        drawRoundedRect(ctx, 591, ty + 1, 90, 52, 7);
        ctx.clip();
        ctx.fillStyle = clothColor;
        for (let cx = 592; cx < 680; cx += 16) {
          ctx.fillRect(cx, ty + 1, 8, 7);
          ctx.fillRect(cx + 8, ty + 46, 8, 7);
        }
        ctx.restore();
        // Left plate: steaming Caldo Verde soup bowl (top table) or Grilled Sardines plate (bottom table)
        if (tIdx === 0) {
          this.drawCaldoVerdeBowl(ctx, 616, ty + 27);
          this.drawCountryLoaf(ctx, 658, ty + 27, 11, 6);
        } else {
          this.drawSardinePlatter(ctx, 598, ty + 15, 48, 24);
          // Red wine / lemonade glass + flickering table candle
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.arc(662, ty + 22, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(662, ty + 35, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme.layout === 'cafe' || theme.layout === 'bakery') {
        // Marble bistro table laid with espresso cups, blistered Pasteis de Nata, & crusty bread slice
        ctx.fillStyle = '#f8f5ef';
        drawRoundedRect(ctx, 590, ty, 92, 54, 14);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // Espresso cup on saucer
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(614, ty + 27, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#3b1806';
        ctx.beginPath();
        ctx.arc(614, ty + 27, 5, 0, Math.PI * 2);
        ctx.fill();
        // Pastry plate holding golden Pastel de Nata or bread roll
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(654, ty + 27, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (theme.layout === 'bakery' && tIdx === 0) {
          this.drawCountryLoaf(ctx, 654, ty + 27, 9, 5.5);
        } else {
          this.drawPastelDeNata(ctx, 654, ty + 27, 7);
        }
      } else if (theme.layout === 'cathedral') {
        ctx.fillStyle = '#5c3a21';
        drawRoundedRect(ctx, 590, ty + 4, 92, 18, 4);
        ctx.fill();
        drawRoundedRect(ctx, 590, ty + 30, 92, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#3d2514';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(590, ty + 4, 92, 18);
        ctx.strokeRect(590, ty + 30, 92, 18);
      } else if (theme.layout === 'bookshop') {
        ctx.fillStyle = '#7c4f2b';
        drawRoundedRect(ctx, 590, ty, 92, 54, 6);
        ctx.fill();
        ctx.fillStyle = '#fef9ef';
        ctx.fillRect(606, ty + 14, 24, 18);
        ctx.fillRect(644, ty + 18, 22, 16);
        ctx.strokeStyle = '#472d1b';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(590, ty, 92, 54);
      } else if (theme.layout === 'gallery') {
        ctx.fillStyle = '#7f1d1d';
        drawRoundedRect(ctx, 594, ty + 10, 84, 34, 8);
        ctx.fill();
        ctx.strokeStyle = '#d4a337';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#8e623f';
        drawRoundedRect(ctx, 590, ty, 92, 54, 8);
        ctx.fill();
        ctx.strokeStyle = '#472d1b';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    });

    this.drawInteriorMarker(
      ctx,
      INTERIOR_STATIONS.counter.x,
      INTERIOR_STATIONS.counter.y,
      'COUNTER [E]',
      nearbyInteraction?.type === 'counter'
    );
    this.drawInteriorMarker(
      ctx,
      INTERIOR_STATIONS.display.x,
      INTERIOR_STATIONS.display.y,
      'DISPLAY [E]',
      nearbyInteraction?.type === 'display'
    );

    const mat = INTERIOR_STATIONS.exitMat;
    drawRoundedRect(ctx, mat.x - mat.halfWidth, mat.y - 16, mat.halfWidth * 2, 32, 6);
    ctx.fillStyle = nearbyInteraction?.type === 'exit' ? '#d97706' : '#7c4f2b';
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT TO STREET', mat.x, mat.y + 4);

    if (state.player.walkTarget) {
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    const interiorRemotes = (state.remotePlayers || []).filter(
      (rp) => rp.mode === 'interior' && rp.currentVenueId === state.currentVenueId
    );
    const interiorActors = [
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
      },
      ...interiorRemotes.map((rp) => ({
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
      }))
    ];
    interiorActors.sort((a, b) => a.y - b.y);
    for (const actor of interiorActors) {
      this.drawCharacterSprite(ctx, actor.x, actor.y, actor);
    }

    // 2D Overhead Visible Indoor Outcomes: Seated Dining Chair & Freshly Served Plate, Wrapped Souvenir, Display Spotlight, or Dialogue Bubble
    const activeAct = state.indoorActivity && state.indoorActivity.venueId === venue.id ? state.indoorActivity : null;
    const seatedMeal = state.seatedDining && state.seatedDining.venueId === venue.id ? state.seatedDining : null;
    if (seatedMeal) {
      // Wooden dining chair at (562, 252) & EITHER a Drink Glass (for drinks) OR a Freshly Served Plate (for food) on Table 1 at (616, 252)
      const isGlass = seatedMeal.servingType === 'glass';
      const idStr = seatedMeal.itemId || '';
      ctx.save();
      ctx.fillStyle = '#7c4724';
      drawRoundedRect(ctx, seatedMeal.seatX - 10, seatedMeal.seatY - 10, 16, 20, 4);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      const px = seatedMeal.plateX || 616;
      const py = seatedMeal.plateY || 252;
      if (isGlass) {
        // Drink Glass on round cork coaster (NO plate!)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(px, py + 2, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        const liqCol =
          idStr.includes('ginjinha') || idStr.includes('sangria') || idStr.includes('tinto')
            ? '#be123c'
            : idStr.includes('imperial')
              ? '#f59e0b'
              : '#84cc16';
        drawRoundedRect(ctx, px - 5.5, py - 9, 11, 14, 2.5);
        ctx.fillStyle = liqCol;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(px - 4.5, py - 8.5, 9, 3);
      } else {
        // Highlighted served Porcelain Dinner Plate with cobalt rim, food & steam (NO glass!)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(px, py, 7.5, 0, Math.PI * 2);
        ctx.fill();
        const sShift = Math.sin(this.animTime * 4) * 2.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px - 3, py - 10);
        ctx.quadraticCurveTo(px - 3 + sShift, py - 18, px - 1, py - 24);
        ctx.moveTo(px + 4, py - 10);
        ctx.quadraticCurveTo(px + 4 - sShift, py - 18, px + 2, py - 24);
        ctx.stroke();
      }

      // Floating table badge above Table 1 distinguishing GLASS vs PLATE
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      const label = `${isGlass ? 'GLASS' : 'PLATE'}: ${seatedMeal.itemName}`;
      const lw = Math.ceil(ctx.measureText(label).width) + 16;
      drawRoundedRect(ctx, 636 - lw * 0.5, 198, lw, 19, 5);
      ctx.fillStyle = 'rgba(20, 50, 88, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(label, 636, 211);
      ctx.restore();
    } else if (activeAct?.type === 'souvenir') {
      // Ribbon-wrapped souvenir box glowing on the counter
      ctx.save();
      drawRoundedRect(ctx, 368, 152, 24, 18, 3);
      ctx.fillStyle = '#fef3c7';
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      const label = `SATCHEL +1: ${activeAct.itemName}`;
      const lw = Math.ceil(ctx.measureText(label).width) + 16;
      drawRoundedRect(ctx, 380 - lw * 0.5, 194, lw, 19, 5);
      ctx.fillStyle = 'rgba(120, 53, 15, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(label, 380, 207);
      ctx.restore();
    } else if (activeAct?.type === 'inspect') {
      // Golden museum spotlight halo around the left display vitrine + exhibit note banner
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 59, 201, 78, 124, 8);
      ctx.stroke();
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      const label = `INSPECTING: ${venue.displayNote.slice(0, 54)}...`;
      const lw = Math.ceil(ctx.measureText(label).width) + 16;
      drawRoundedRect(ctx, Math.max(12, 130 - lw * 0.3), 176, lw, 19, 5);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.textAlign = 'left';
      ctx.fillText(label, Math.max(12, 130 - lw * 0.3) + 8, 189);
      ctx.restore();
    } else if (activeAct?.type === 'dialogue') {
      // Speech bubble directly over the proprietor behind the counter
      ctx.save();
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      const label = `${activeAct.proprietor}: "${activeAct.phrasePt}"`;
      const lw = Math.min(340, Math.ceil(ctx.measureText(label).width) + 18);
      drawRoundedRect(ctx, primaryStaffX - lw * 0.5, 68, lw, 20, 6);
      ctx.fillStyle = '#fffbeb';
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      ctx.textAlign = 'center';
      ctx.fillText(label, primaryStaffX, 81, lw - 12);
      ctx.restore();
    }

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  drawCashRegister(ctx, x, y) {
    // Detailed vintage brass-and-oak European cash register with EUR display flag
    ctx.save();
    ctx.fillStyle = '#6c492e';
    drawRoundedRect(ctx, x, y + 16, 46, 18, 3);
    ctx.fill();
    ctx.strokeStyle = '#3d2514';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Brass cash drawer handle
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x + 16, y + 25, 14, 4);

    // Ornate brass register upper body + keys
    ctx.fillStyle = '#ca8a04';
    drawRoundedRect(ctx, x + 4, y + 2, 38, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#713f12';
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    for (let k = 0; k < 4; k += 1) {
      ctx.fillRect(x + 9 + k * 7, y + 11, 5, 4);
    }
    // Price readout window
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 10, y + 4, 26, 5);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(x + 13, y + 5.5, 14, 2);
    ctx.restore();
  }

  drawStaffMember(ctx, x, y, { name, role, tunicColor, apronColor, chefHat, hairColor }) {
    ctx.save();
    // Tunic / Uniform
    ctx.fillStyle = tunicColor;
    drawRoundedRect(ctx, x - 10, y - 5, 20, 18, 5);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Apron
    if (apronColor) {
      ctx.fillStyle = apronColor;
      ctx.fillRect(x - 7, y - 2, 14, 15);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - 7, y - 2, 14, 15);
    }

    // Double-breasted chef/baker jacket buttons
    if (chefHat) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 3, y, 1.8, 1.8);
      ctx.fillRect(x + 1.5, y, 1.8, 1.8);
      ctx.fillRect(x - 3, y + 5, 1.8, 1.8);
      ctx.fillRect(x + 1.5, y + 5, 1.8, 1.8);
    }

    // Head
    ctx.fillStyle = '#f2cfb2';
    ctx.beginPath();
    ctx.arc(x, y - 13, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hair
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(x, y - 15.5, 7.6, Math.PI, Math.PI * 2);
    ctx.fill();

    // Crisp white chef's toque hat with dark crisp outline for Bakers, Pastry Chefs & Restaurant Chefs
    if (chefHat) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(x - 4.5, y - 26, 5, 0, Math.PI * 2);
      ctx.arc(x + 4.5, y - 26, 5, 0, Math.PI * 2);
      ctx.arc(x, y - 28.5, 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 7, y - 24, 14, 6);
      ctx.strokeRect(x - 7, y - 24, 14, 6);
    }

    // Friendly eyes & smile
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 3.5, y - 13.5, 2, 2);
    ctx.fillRect(x + 1.5, y - 13.5, 2, 2);
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - 10, 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Clear two-line staff badge (Name + Role) above head sized dynamically to text width
    const roleLabel = String(role || 'Staff').toUpperCase();
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    const nameWidth = ctx.measureText(name).width;
    ctx.font = '700 7.5px "Segoe UI", sans-serif';
    const roleWidth = ctx.measureText(roleLabel).width;
    const badgeW = Math.max(106, Math.ceil(Math.max(nameWidth, roleWidth)) + 16);
    const badgeH = 24;
    const badgeY = chefHat ? y - 60 : y - 50;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    drawRoundedRect(ctx, x - badgeW / 2, badgeY, badgeW, badgeH, 4);
    ctx.fill();
    ctx.strokeStyle = '#1b4d89';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#14375f';
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.fillText(name, x, badgeY + 10);
    ctx.fillStyle = '#64748b';
    ctx.font = '700 7.5px "Segoe UI", sans-serif';
    ctx.fillText(roleLabel, x, badgeY + 20);
    ctx.restore();
  }

  drawCountryLoaf(ctx, cx, cy, rx, ry) {
    // Crusty flour-dusted Portuguese Pao de Mafra / Broa loaf with diagonal score slashes
    ctx.save();
    ctx.fillStyle = '#b96f22';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d99338';
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.1, cy - ry * 0.15, rx * 0.82, ry * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    // Diagonal baker's score cuts dusted with white flour
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.3;
    for (let s = -1; s <= 1; s += 1) {
      ctx.beginPath();
      ctx.moveTo(cx + s * (rx * 0.42) - 3, cy - ry * 0.45);
      ctx.lineTo(cx + s * (rx * 0.42) + 3, cy + ry * 0.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPastelDeNata(ctx, cx, cy, r) {
    // Flaky blistered Portuguese custard tart with crimped crust & caramelized dark spots
    ctx.save();
    ctx.fillStyle = '#b4691e';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    // Signature dark caramelized blister spots
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(cx - r * 0.22, cy - r * 0.18, r * 0.22, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.24, cy + r * 0.15, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCaldoVerdeBowl(ctx, cx, cy) {
    // Terracotta stoneware bowl of Caldo Verde kale soup with red chourico slice & animated steam
    ctx.save();
    ctx.fillStyle = '#b4532a';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a8f49';
    ctx.beginPath();
    ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
    ctx.fill();
    // Shredded dark kale flecks
    ctx.strokeStyle = '#2d5724';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 2);
    ctx.lineTo(cx - 1, cy - 5);
    ctx.moveTo(cx + 2, cy + 4);
    ctx.lineTo(cx + 6, cy + 1);
    ctx.stroke();
    // Red chourico slice floating on top
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
    ctx.fill();
    // Subtle rising steam curls
    const shift = Math.sin(this.animTime * 3.5) * 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 11);
    ctx.quadraticCurveTo(cx - 6 + shift, cy - 17, cx - 3, cy - 21);
    ctx.moveTo(cx + 3, cy - 12);
    ctx.quadraticCurveTo(cx + 5 - shift, cy - 18, cx + 2, cy - 22);
    ctx.stroke();
    ctx.restore();
  }

  drawSardinePlatter(ctx, x, y, w, h) {
    // Glazed white Lisbon platter with charcoal-grilled silver sardines, roasted peppers & lemon
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    drawRoundedRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Three silver sardines with charred grill stripes & forked tails
    const rows = h >= 24 ? 3 : 2;
    for (let i = 0; i < rows; i += 1) {
      const sy = y + 6 + i * ((h - 12) / Math.max(1, rows - 1));
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.42, sy, w * 0.28, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Forked tail
      ctx.beginPath();
      ctx.moveTo(x + w * 0.14, sy);
      ctx.lineTo(x + w * 0.06, sy - 3);
      ctx.lineTo(x + w * 0.06, sy + 3);
      ctx.closePath();
      ctx.fill();
      // Charred grill marks
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + w * 0.34, sy - 2, 2, 4);
      ctx.fillRect(x + w * 0.48, sy - 2, 2, 4);
    }

    // Roasted red & green pepper strips + yellow lemon wedge
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x + w * 0.72, y + 5, w * 0.18, 4);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(x + w * 0.72, y + 11, w * 0.18, 4);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x + w * 0.82, y + h - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawInteriorMarker(ctx, x, y, label, active) {
    ctx.save();
    ctx.strokeStyle = active ? '#f59e0b' : 'rgba(27, 77, 137, 0.55)';
    ctx.lineWidth = active ? 2.5 : 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    const labelW = Math.ceil(ctx.measureText(label).width) + 12;
    ctx.fillStyle = active ? 'rgba(254, 243, 199, 0.95)' : 'rgba(255, 255, 255, 0.88)';
    drawRoundedRect(ctx, x - labelW / 2, y + 20, labelW, 16, 4);
    ctx.fill();
    ctx.strokeStyle = active ? '#d97706' : 'rgba(27, 77, 137, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = active ? '#92400e' : '#1e3a5f';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 31);
    ctx.restore();
  }

}

export const interiors2dMethods = {};
for (const key of Object.getOwnPropertyNames(_Mixin.prototype)) {
  if (key !== 'constructor') {
    interiors2dMethods[key] = _Mixin.prototype[key];
  }
}
