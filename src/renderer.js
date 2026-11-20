import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  STREETS,
  CROSSWALKS,
  DECORATIVE_STRUCTURES,
  METRO_LINE,
  METRO_STATIONS,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  getAllTransitStops
} from './data.js';
import { getDayPhase, INTERIOR_STATIONS, METRO_PLATFORM_ZONES } from './engine.js';

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

export class LisboaCanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewWidth = canvas.width;
    this.viewHeight = canvas.height;
    this.camera = { x: 490, y: 270 };
    this.animTime = 0;
    this.patterns = this.createCobblePatterns();
  }

  createCobblePatterns() {
    if (typeof document === 'undefined' || typeof this.ctx.createPattern !== 'function') {
      return { sidewalk: null, street: null, plaza: null };
    }

    const buildTile = (size, mortarColor, palette, stoneH, minW, maxW, seedOffset) => {
      const tile = document.createElement('canvas');
      tile.width = size;
      tile.height = size;
      const tctx = tile.getContext('2d');
      tctx.fillStyle = mortarColor;
      tctx.fillRect(0, 0, size, size);

      let seed = 1337 + seedOffset * 97;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      const rows = Math.floor(size / stoneH);
      for (let r = 0; r < rows; r += 1) {
        const y = r * stoneH;
        const offset = (r % 2) * Math.round((minW + maxW) * 0.35);
        let x = -offset;
        while (x < size) {
          const w = Math.round(minW + rand() * (maxW - minW));
          const color = palette[Math.floor(rand() * palette.length)];
          const sx = x + 1;
          const sy = y + 1;
          const sw = w - 2;
          const sh = stoneH - 2;

          for (const wrapX of [sx, sx - size, sx + size]) {
            if (wrapX + sw < 0 || wrapX > size) continue;
            drawRoundedRect(tctx, wrapX, sy, sw, sh, 2.5);
            tctx.fillStyle = color;
            tctx.fill();
            tctx.fillStyle = 'rgba(255, 252, 245, 0.24)';
            tctx.fillRect(wrapX + 1.5, sy + 1, Math.max(2, sw - 3), 2);
            tctx.fillStyle = 'rgba(35, 32, 28, 0.14)';
            tctx.fillRect(wrapX + 1.5, sy + sh - 2, Math.max(2, sw - 3), 1.5);
          }
          x += w;
        }
      }
      return this.ctx.createPattern(tile, 'repeat');
    };

    const sidewalk = buildTile(
      96,
      '#b8afa0',
      ['#ebe4d6', '#e2dacb', '#f2ece0', '#dcd3c3', '#e7dfd0'],
      12,
      12,
      18,
      1
    );

    const street = buildTile(
      96,
      '#686259',
      ['#a69f95', '#968f86', '#b5aea3', '#8c867d', '#aba49a', '#9e978d'],
      12,
      14,
      20,
      2
    );

    const plaza = buildTile(
      64,
      '#b9b2a4',
      ['#f2ede3', '#eae4d8', '#f6f2ea', '#e3dcd0'],
      8,
      8,
      10,
      3
    );

    return { sidewalk, street, plaza };
  }

  screenToWorld(canvasX, canvasY, state) {
    if (state.mode === 'interior' || state.mode === 'metro') {
      const offsetX = (this.viewWidth - INTERIOR_WIDTH) / 2;
      const offsetY = (this.viewHeight - INTERIOR_HEIGHT) / 2;
      return {
        x: canvasX - offsetX,
        y: canvasY - offsetY
      };
    }
    return {
      x: canvasX + this.camera.x,
      y: canvasY + this.camera.y
    };
  }

  updateCamera(state) {
    const targetX = state.player.x - this.viewWidth / 2;
    const targetY = state.player.y - this.viewHeight / 2;
    const clampedX = clamp(targetX, 0, Math.max(0, WORLD_WIDTH - this.viewWidth));
    const clampedY = clamp(targetY, 0, Math.max(0, WORLD_HEIGHT - this.viewHeight));
    this.camera.x += (clampedX - this.camera.x) * 0.16;
    this.camera.y += (clampedY - this.camera.y) * 0.16;
  }

  render(state, nearbyInteraction, dtSeconds = 0.016) {
    this.animTime += dtSeconds;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    if (state.mode === 'interior') {
      this.renderInterior(ctx, state, nearbyInteraction);
    } else if (state.mode === 'metro') {
      this.renderMetro(ctx, state, nearbyInteraction);
    } else {
      this.updateCamera(state);
      this.renderOverworld(ctx, state, nearbyInteraction);
    }
  }

  renderOverworld(ctx, state, nearbyInteraction) {
    const phase = getDayPhase(state.minutesOfDay);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // 1. Limestone neighborhood base ground + sidewalk calcada cobblestones
    for (const hood of NEIGHBORHOODS) {
      ctx.fillStyle = hood.groundTint;
      ctx.fillRect(hood.minX, 0, hood.maxX - hood.minX, WATERFRONT_Y);
    }
    this.drawCalcadaGroundTexture(ctx);

    // 2. Streets, plazas, Alfama escadinhas, crosswalks, and calcada Mar Largo waves
    this.drawStreetsAndPlazas(ctx);
    this.drawCrosswalks(ctx);

    // 3. Tagus River Waterfront
    this.drawTagusWaterfront(ctx);

    // 4. Transit corridors (Bus road markings + Steel Tram 28E Rails)
    this.drawTransitInfrastructure(ctx);

    // 5. Enamel Lisbon street plaques
    this.drawLisbonStreetPlaques(ctx);

    // 6. Jacaranda trees, bougainvillea pergolas, and tiled miradouro benches
    this.drawTreesAndBenches(ctx, state);

    // 7. Decorative Portuguese townhouses, Se de Lisboa cathedral, and Camoes monument
    for (const struct of DECORATIVE_STRUCTURES) {
      this.drawDecorativeStructure(ctx, struct, isEvening);
    }

    // 8. Authentic Lisbon Metro Stations (only where actually available: Baixa-Chiado, Terreiro do Paco, Santa Apolonia)
    for (const station of METRO_STATIONS) {
      const isHighlighted =
        (nearbyInteraction?.type === 'metro' && nearbyInteraction.id === station.id) ||
        state.activeMetroStationId === station.id;
      this.drawMetroStation(ctx, station, isHighlighted, isEvening);
    }

    // 9. Bespoke Enterable Shops, Cafes & Restaurants
    for (const venue of VENUES) {
      const visited = state.visitedVenues.includes(venue.id);
      const isHighlighted = nearbyInteraction?.type === 'venue' && nearbyInteraction.id === venue.id;
      this.drawVenueBuilding(ctx, venue, visited, isHighlighted, isEvening);
    }

    // 10. Sidewalk Transit Stops
    for (const stop of ALL_STOPS) {
      const isHighlighted = nearbyInteraction?.type === 'stop' && nearbyInteraction.id === stop.stopId;
      this.drawTransitStop(ctx, stop, isHighlighted, isEvening);
    }

    // 11. Classic wrought-iron Lisbon streetlamps
    this.drawLisbonStreetlamps(ctx, isEvening, isGolden);

    // 12. Walk Target Indicator
    if (state.player.walkTarget) {
      const pulse = 8 + Math.sin(this.animTime * 6) * 3;
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 13. Ambient Lisbon Locals (walking safely on sidewalks and plazas)
    for (const npc of state.npcs) {
      this.drawCharacterSprite(ctx, npc.x, npc.y, {
        facing: npc.patrolAxis === 'x' ? (npc.dir > 0 ? 'right' : 'left') : (npc.dir > 0 ? 'down' : 'up'),
        walkPhase: npc.walkPhase,
        isMoving: npc.isMoving !== false,
        tunicColor: npc.shirt,
        scarfColor: '#e6dcc8',
        hairColor: npc.hair,
        isPlayer: false
      });
    }

    // 14. Live Transit Vehicles (Remodelado Tram 28E & Carris Bus)
    for (const vehicle of state.vehicles) {
      const playerAboard = state.ridingVehicleId === vehicle.id;
      this.drawTransitVehicle(ctx, vehicle, playerAboard, isEvening);
    }

    // 15. Player Character (when walking on foot)
    if (!state.ridingVehicleId) {
      this.drawCharacterSprite(ctx, state.player.x, state.player.y, {
        facing: state.player.facing,
        walkPhase: state.player.walkPhase,
        isMoving: state.player.isMoving,
        tunicColor: '#1b4d89',
        scarfColor: '#d4583b',
        hairColor: '#2d211b',
        isPlayer: true
      });
    }

    ctx.restore();

    // 16. Time-of-day atmospheric lighting wash
    this.drawTimeOfDayOverlay(ctx, phase);

    // 17. Mini-map HUD overlay inside top-right corner
    this.drawMiniMap(ctx, state);

    // 18. Floating Context Interaction Prompt at bottom-center
    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  drawCalcadaGroundTexture(ctx) {
    if (this.patterns.sidewalk) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = this.patterns.sidewalk;
      ctx.fillRect(0, 0, WORLD_WIDTH, WATERFRONT_Y);
      ctx.restore();
      return;
    }

    const startX = Math.max(0, Math.floor(this.camera.x / 32) * 32 - 32);
    const endX = Math.min(WORLD_WIDTH, this.camera.x + this.viewWidth + 64);
    const startY = Math.max(0, Math.floor(this.camera.y / 24) * 24 - 24);
    const endY = Math.min(WATERFRONT_Y, this.camera.y + this.viewHeight + 48);

    ctx.strokeStyle = 'rgba(118, 106, 88, 0.13)';
    ctx.lineWidth = 1;
    for (let gy = startY; gy < endY; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(startX, gy);
      ctx.lineTo(endX, gy);
      ctx.stroke();

      const stagger = ((gy / 24) % 2) * 16;
      for (let gx = startX + stagger; gx < endX; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, gy + 24);
        ctx.stroke();
      }
    }
  }

  drawStreetsAndPlazas(ctx) {
    const drawCurb = (x, y, w, h) => {
      ctx.strokeStyle = '#dfd7c8';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = '#7b7368';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    };

    for (const st of STREETS) {
      if (st.style === 'bus-road') {
        ctx.fillStyle = this.patterns.sidewalk || '#ddd6c8';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#a69f95';
        ctx.fillRect(st.x + 10, st.y + 18, st.w - 20, st.h - 36);
        drawCurb(st.x + 10, st.y + 18, st.w - 20, st.h - 36);
      } else if (st.style === 'tram-avenue') {
        ctx.fillStyle = this.patterns.sidewalk || '#e0d9cb';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#aba49a';
        ctx.fillRect(st.x + 6, st.y + 22, st.w - 12, st.h - 44);
        drawCurb(st.x + 6, st.y + 22, st.w - 12, st.h - 44);
      } else if (st.style === 'plaza') {
        ctx.fillStyle = this.patterns.plaza || '#ede7db';
        ctx.fillRect(st.x, st.y, st.w, st.h);

        ctx.strokeStyle = '#3b424c';
        ctx.lineWidth = 3;
        ctx.strokeRect(st.x + 4, st.y + 4, st.w - 8, st.h - 8);
        ctx.strokeStyle = '#68707d';
        ctx.lineWidth = 1;
        ctx.strokeRect(st.x + 9, st.y + 9, st.w - 18, st.h - 18);

        for (let wy = st.y + 22; wy < st.y + st.h - 18; wy += 24) {
          ctx.fillStyle = 'rgba(46, 54, 66, 0.34)';
          ctx.beginPath();
          for (let wx = st.x + 12; wx <= st.x + st.w - 12; wx += 8) {
            const offset = Math.sin((wx - st.x) * 0.12) * 5;
            if (wx === st.x + 12) ctx.moveTo(wx, wy + offset);
            else ctx.lineTo(wx, wy + offset);
          }
          for (let wx = st.x + st.w - 12; wx >= st.x + 12; wx -= 8) {
            const offset = Math.sin((wx - st.x) * 0.12) * 5;
            ctx.lineTo(wx, wy + 7 + offset);
          }
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.fillStyle = this.patterns.sidewalk || '#dcd4c5';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#b2aba0';
        ctx.globalAlpha = 0.65;
        ctx.fillRect(st.x + 10, st.y + 4, st.w - 20, st.h - 8);
        ctx.globalAlpha = 1;
        drawCurb(st.x + 10, st.y + 4, st.w - 20, st.h - 8);

        if (st.id === 'st-se') {
          for (let sy = 365; sy < 530; sy += 14) {
            ctx.fillStyle = sy % 28 === 0 ? '#cfc6b6' : '#e3dccd';
            ctx.fillRect(st.x + 12, sy, st.w - 24, 9);
            ctx.fillStyle = 'rgba(74, 68, 58, 0.32)';
            ctx.fillRect(st.x + 12, sy + 9, st.w - 24, 2);
          }
        }
      }
    }
  }

  drawCrosswalks(ctx) {
    // Crisp white limestone Lisbon zebra crosswalk bars at pedestrian crossings
    ctx.fillStyle = 'rgba(248, 244, 236, 0.82)';
    for (const cw of CROSSWALKS) {
      for (let sx = cw.x + 3; sx < cw.x + cw.w - 4; sx += 11) {
        ctx.fillRect(sx, cw.y + 4, 6, cw.h - 8);
      }
    }
  }

  drawTagusWaterfront(ctx) {
    ctx.fillStyle = '#d5ccbc';
    ctx.fillRect(0, WATERFRONT_Y - 18, WORLD_WIDTH, 18);
    ctx.fillStyle = '#1b4d89';
    for (let ax = 12; ax < WORLD_WIDTH; ax += 28) {
      ctx.fillRect(ax, WATERFRONT_Y - 14, 14, 4);
    }
    ctx.fillStyle = '#8b8274';
    ctx.fillRect(0, WATERFRONT_Y - 4, WORLD_WIDTH, 5);

    for (let bx = 60; bx < WORLD_WIDTH - 40; bx += 110) {
      ctx.fillStyle = '#a89f8e';
      ctx.fillRect(bx - 5, WATERFRONT_Y - 16, 10, 12);
      ctx.fillStyle = '#e5ded0';
      ctx.fillRect(bx - 4, WATERFRONT_Y - 16, 8, 4);
    }

    const grad = ctx.createLinearGradient(0, WATERFRONT_Y, 0, WORLD_HEIGHT);
    grad.addColorStop(0, '#2a6f97');
    grad.addColorStop(0.55, '#1e5b82');
    grad.addColorStop(1, '#144260');
    ctx.fillStyle = grad;
    ctx.fillRect(0, WATERFRONT_Y, WORLD_WIDTH, WORLD_HEIGHT - WATERFRONT_Y);

    ctx.strokeStyle = 'rgba(218, 240, 255, 0.28)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 4; row += 1) {
      const ry = WATERFRONT_Y + 26 + row * 34;
      for (let rx = 60 + (row % 2) * 70; rx < WORLD_WIDTH - 40; rx += 160) {
        const shift = Math.sin(this.animTime * 1.4 + row + rx * 0.01) * 14;
        ctx.beginPath();
        ctx.moveTo(rx + shift, ry);
        ctx.quadraticCurveTo(rx + shift + 22, ry - 4, rx + shift + 44, ry);
        ctx.stroke();
      }
    }

    const boats = [520, 1280, 1980];
    for (let i = 0; i < boats.length; i += 1) {
      const bx = boats[i] + Math.sin(this.animTime * 0.4 + i * 2) * 16;
      const by = WATERFRONT_Y + 78 + Math.cos(this.animTime * 1.2 + i) * 3;
      ctx.fillStyle = '#7b3e2b';
      ctx.beginPath();
      ctx.moveTo(bx - 20, by);
      ctx.lineTo(bx + 20, by);
      ctx.lineTo(bx + 13, by + 9);
      ctx.lineTo(bx - 13, by + 9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = i === 1 ? '#d97648' : '#faf6ee';
      ctx.beginPath();
      ctx.moveTo(bx - 2, by - 2);
      ctx.lineTo(bx - 2, by - 28);
      ctx.lineTo(bx + 16, by - 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(235, 246, 255, 0.6)';
    ctx.font = '600 13px Georgia, serif';
    ctx.fillText('RIO TEJO  -  TAGUS WATERFRONT', 1020, WATERFRONT_Y + 142);
  }

  drawTransitInfrastructure(ctx) {
    const busLine = TRANSIT_LINES.find((l) => l.mode === 'bus');
    if (busLine) {
      ctx.save();
      ctx.strokeStyle = 'rgba(27, 122, 92, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      busLine.waypoints.forEach((wp, idx) => {
        if (idx === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    const tramY = 610;
    ctx.strokeStyle = 'rgba(72, 66, 58, 0.34)';
    ctx.lineWidth = 2;
    for (let tx = 200; tx <= 2200; tx += 16) {
      ctx.beginPath();
      ctx.moveTo(tx, tramY - 10);
      ctx.lineTo(tx, tramY + 10);
      ctx.stroke();
    }
    ctx.strokeStyle = '#535e6b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(195, tramY - 7);
    ctx.lineTo(2205, tramY - 7);
    ctx.moveTo(195, tramY + 7);
    ctx.lineTo(2205, tramY + 7);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(195, tramY - 8);
    ctx.lineTo(2205, tramY - 8);
    ctx.stroke();
  }

  drawLisbonStreetPlaques(ctx) {
    const plaques = [
      { title: 'BAIRRO ALTO', sub: 'RUA DA ROSA', x: 340, y: 358 },
      { title: 'CHIADO', sub: 'PRACA LUIS DE CAMOES', x: 950, y: 358 },
      { title: 'ALFAMA', sub: 'LARGO DAS PORTAS DO SOL', x: 1955, y: 358 }
    ];
    for (const p of plaques) {
      ctx.font = '700 10px Georgia, serif';
      const w = Math.max(ctx.measureText(p.title).width, ctx.measureText(p.sub).width) + 28;
      const h = 28;
      const px = p.x - w / 2;
      const py = p.y - h / 2;

      ctx.fillStyle = 'rgba(18, 28, 42, 0.16)';
      drawRoundedRect(ctx, px + 2, py + 2, w, h, 4);
      ctx.fill();

      ctx.fillStyle = '#faf8f3';
      drawRoundedRect(ctx, px, py, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(27, 77, 137, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 3, py + 3, w - 6, h - 6);

      ctx.fillStyle = '#1b4d89';
      ctx.fillRect(px + 4, py + 4, 3, 3);
      ctx.fillRect(px + w - 7, py + 4, 3, 3);
      ctx.fillRect(px + 4, py + h - 7, 3, 3);
      ctx.fillRect(px + w - 7, py + h - 7, 3, 3);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#14375f';
      ctx.font = '700 9.5px Georgia, serif';
      ctx.fillText(p.title, p.x, py + 12);
      ctx.font = '600 8px "Segoe UI", sans-serif';
      ctx.fillStyle = '#3c5a7d';
      ctx.fillText(p.sub, p.x, py + 22);
    }
    ctx.textAlign = 'left';
  }

  drawTreesAndBenches(ctx, state) {
    const trees = [
      { x: 482, y: 125, c: '#7a58ab', highlight: '#b093dc' },
      { x: 545, y: 125, c: '#7a58ab', highlight: '#b093dc' },
      { x: 890, y: 492, c: '#3f7d52', highlight: '#65a676' },
      { x: 1010, y: 492, c: '#3f7d52', highlight: '#65a676' },
      { x: 2178, y: 492, c: '#487f57', highlight: '#73ad82' },
      { x: 740, y: 985, c: '#3f7d52', highlight: '#65a676' },
      { x: 1410, y: 985, c: '#7a58ab', highlight: '#b093dc' },
      { x: 2070, y: 985, c: '#3f7d52', highlight: '#65a676' }
    ];
    for (const t of trees) {
      ctx.fillStyle = 'rgba(26, 32, 40, 0.17)';
      ctx.beginPath();
      ctx.ellipse(t.x + 4, t.y + 9, 18, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6c4d35';
      ctx.fillRect(t.x - 3, t.y, 6, 11);

      ctx.fillStyle = t.c;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 6, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.highlight;
      ctx.beginPath();
      ctx.arc(t.x - 4, t.y - 10, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(t.x + 6, t.y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const spot of REST_SPOTS) {
      const captured = state.memories.some((m) => m.id === spot.memory.id);

      ctx.fillStyle = '#f2eee6';
      drawRoundedRect(ctx, spot.x - 32, spot.y - 18, 64, 12, 3);
      ctx.fill();
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1b4d89';
      for (let tx = spot.x - 26; tx <= spot.x + 20; tx += 12) {
        ctx.fillRect(tx, spot.y - 15, 6, 6);
      }

      if (spot.id !== 'bench-chiado') {
        ctx.fillStyle = '#be2f6c';
        ctx.beginPath();
        ctx.arc(spot.x - 28, spot.y - 14, 6, 0, Math.PI * 2);
        ctx.arc(spot.x + 28, spot.y - 14, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ec6ea3';
        ctx.beginPath();
        ctx.arc(spot.x - 29, spot.y - 15, 2.5, 0, Math.PI * 2);
        ctx.arc(spot.x + 27, spot.y - 15, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(25, 30, 35, 0.2)';
      ctx.fillRect(spot.x - 22, spot.y - 3, 44, 15);

      ctx.fillStyle = '#8b5a34';
      drawRoundedRect(ctx, spot.x - 22, spot.y - 7, 44, 13, 3);
      ctx.fill();
      ctx.strokeStyle = '#52321b';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 232, 200, 0.35)';
      ctx.beginPath();
      ctx.moveTo(spot.x - 20, spot.y - 2);
      ctx.lineTo(spot.x + 20, spot.y - 2);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.fillRect(spot.x - 18, spot.y + 5, 4, 5);
      ctx.fillRect(spot.x + 14, spot.y + 5, 4, 5);

      ctx.font = '700 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = captured ? '#0f766e' : '#3d2f22';
      ctx.fillText(captured ? 'MIRADOURO [SAVED]' : 'MIRADOURO BENCH', spot.x, spot.y - 23);
      ctx.textAlign = 'left';
    }
  }

  drawMetroStation(ctx, station, isHighlighted, isEvening) {
    // Authentic Metropolitano de Lisboa street entrance: stone stair canopy + red/white M mast
    ctx.save();

    if (isHighlighted) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, station.x - 5, station.y - 5, station.w + 10, station.h + 10, 7);
      ctx.stroke();
    }

    // Drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    drawRoundedRect(ctx, station.x + 4, station.y + 5, station.w, station.h, 5);
    ctx.fill();

    // Limestone & steel headhouse / stairwell enclosure
    ctx.fillStyle = '#e5dfd3';
    drawRoundedRect(ctx, station.x, station.y, station.w, station.h, 5);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Descending escalator steps inside glazed canopy
    const innerX = station.x + 7;
    const innerY = station.y + 8;
    const innerW = station.w - 14;
    const innerH = Math.max(10, station.h - 14);
    ctx.fillStyle = isEvening ? '#1e3a5f' : '#324a66';
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // Subtle descending staircase treads
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 1;
    for (let sy = innerY + 4; sy < innerY + innerH - 2; sy += 5) {
      ctx.beginPath();
      ctx.moveTo(innerX + 3, sy);
      ctx.lineTo(innerX + innerW - 3, sy);
      ctx.stroke();
    }

    // Blue glazed glass canopy roof highlight
    ctx.fillStyle = 'rgba(125, 211, 252, 0.28)';
    ctx.fillRect(innerX, innerY, innerW, Math.min(18, innerH));

    // Iconic Lisbon Metro crimson-and-white "M" totem emblem
    const mx = station.x + station.w / 2;
    const my = station.y - 6;
    ctx.fillStyle = '#c81e32';
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', mx, my + 4.2);

    // Line color pills (Linha Azul / Linha Verde)
    const dotStartX = mx - ((station.lineColors.length - 1) * 7);
    station.lineColors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(dotStartX + i * 14, station.y + station.h - 6, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Crisp station name tag
    const shortName = station.name.replace('Metro ', '');
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    const labelW = ctx.measureText(shortName).width + 10;
    drawRoundedRect(ctx, mx - labelW / 2, station.y + station.h + 2, labelW, 13, 3);
    ctx.fillStyle = 'rgba(18, 34, 56, 0.88)';
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(shortName, mx, station.y + station.h + 11.5);

    ctx.restore();
  }

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

    ctx.fillStyle = isEvening ? '#ffe285' : '#6c97ba';
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

      ctx.font = '700 9px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#243142';
      ctx.fillText('LUIS DE CAMOES', cx, struct.y - 11);
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

  drawLisbonStreetlamps(ctx, isEvening, isGolden) {
    const lamps = [
      { x: 455, y: 220 },
      { x: 878, y: 220 },
      { x: 1028, y: 220 },
      { x: 1425, y: 220 },
      { x: 1810, y: 220 },
      { x: 878, y: 542 },
      { x: 1028, y: 542 },
      { x: 1425, y: 542 },
      { x: 1810, y: 542 },
      { x: 455, y: 868 },
      { x: 1028, y: 868 },
      { x: 1660, y: 868 },
      { x: 2120, y: 868 }
    ];

    for (const lamp of lamps) {
      if (isEvening || isGolden) {
        const glowRadius = isEvening ? 46 : 26;
        const glow = ctx.createRadialGradient(lamp.x, lamp.y - 14, 2, lamp.x, lamp.y - 14, glowRadius);
        glow.addColorStop(0, isEvening ? 'rgba(255, 226, 130, 0.5)' : 'rgba(255, 220, 130, 0.22)');
        glow.addColorStop(1, 'rgba(255, 226, 130, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y - 14, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#242f3d';
      ctx.fillRect(lamp.x - 1.5, lamp.y - 16, 3, 18);
      ctx.fillRect(lamp.x - 4, lamp.y, 8, 3);
      ctx.fillStyle = isEvening || isGolden ? '#ffe082' : '#d8e4ee';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawTransitStop(ctx, stop, isHighlighted, isEvening) {
    const px = stop.platformX;
    const py = stop.platformY;
    const isTram = stop.mode === 'tram';
    const postColor = isTram ? '#d9980c' : '#1b7a5c';

    ctx.fillStyle = isHighlighted ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 252, 245, 0.65)';
    drawRoundedRect(ctx, px - 28, py - 12, 56, 24, 6);
    ctx.fill();
    ctx.strokeStyle = postColor;
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 18, py - 22, 3, 22);
    ctx.fillStyle = postColor;
    drawRoundedRect(ctx, px + 7, py - 33, 26, 14, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isTram ? '28E' : 'BUS', px + 20, py - 23);

    if (isEvening) {
      ctx.fillStyle = 'rgba(255, 232, 158, 0.24)';
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 9.2px "Segoe UI", sans-serif';
    ctx.fillText(stop.stopName.split(' (')[0], px, py + 20);
    ctx.textAlign = 'left';
  }

  drawTransitVehicle(ctx, vehicle, playerAboard, isEvening) {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.heading);

    const isTram = vehicle.mode === 'tram';
    const len = isTram ? 72 : 76;
    const wid = 30;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    drawRoundedRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 7);
    ctx.fill();

    if (isEvening) {
      const beam = ctx.createLinearGradient(len / 2, 0, len / 2 + 72, 0);
      beam.addColorStop(0, 'rgba(255, 236, 153, 0.56)');
      beam.addColorStop(1, 'rgba(255, 236, 153, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(len / 2, -8);
      ctx.lineTo(len / 2 + 72, -26);
      ctx.lineTo(len / 2 + 72, 26);
      ctx.lineTo(len / 2, 8);
      ctx.closePath();
      ctx.fill();
    }

    if (isTram) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(len / 2 - 2, -wid / 2 + 6, 6, wid - 12);
      ctx.fillRect(-len / 2 - 4, -wid / 2 + 6, 6, wid - 12);

      ctx.fillStyle = '#eab308';
      drawRoundedRect(ctx, -len / 2, -wid / 2, len, wid, 8);
      ctx.fill();
      ctx.strokeStyle = '#422006';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#fdfbf7';
      drawRoundedRect(ctx, -len / 2 + 7, -wid / 2 + 4, len - 14, wid - 8, 5);
      ctx.fill();
      ctx.strokeStyle = '#b47b16';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#1e3a5f';
      for (let wx = -len / 2 + 11; wx <= len / 2 - 19; wx += 10) {
        ctx.fillRect(wx, -wid / 2 + 1, 7, 3);
        ctx.fillRect(wx, wid / 2 - 4, 7, 3);
      }

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(len / 2 - 1, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(-4, -5);
      ctx.lineTo(-4, 5);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(-4, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('28E', 14, 3.5);
    } else {
      ctx.fillStyle = vehicle.color;
      drawRoundedRect(ctx, -len / 2, -wid / 2, len, wid, 7);
      ctx.fill();
      ctx.strokeStyle = '#133a2d';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = vehicle.trimColor;
      drawRoundedRect(ctx, -len / 2 + 8, -wid / 2 + 4, len - 16, wid - 8, 4);
      ctx.fill();

      ctx.fillStyle = '#243b53';
      for (let wx = -len / 2 + 12; wx <= len / 2 - 20; wx += 13) {
        ctx.fillRect(wx, -wid / 2 + 1, 9, 3);
        ctx.fillRect(wx, wid / 2 - 4, 9, 3);
      }
      ctx.fillStyle = '#334e68';
      ctx.fillRect(len / 2 - 7, -wid / 2 + 5, 5, wid - 10);

      ctx.fillStyle = '#124a38';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('737', 0, 3.5);
    }

    // Brake taillights glowing red when yielding to a pedestrian
    if (vehicle.yielding) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-len / 2 - 1, -wid / 2 + 4, 3, 6);
      ctx.fillRect(-len / 2 - 1, wid / 2 - 10, 3, 6);
    }

    if (playerAboard) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, -len / 2 - 4, -wid / 2 - 4, len + 8, wid + 8, 10);
      ctx.stroke();

      ctx.fillStyle = '#d4583b';
      ctx.beginPath();
      ctx.arc(-10, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6d5b8';
      ctx.beginPath();
      ctx.arc(-10, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (vehicle.yielding) {
      const tag = `${vehicle.badge} YIELDING`;
      ctx.font = '700 9px "Segoe UI", sans-serif';
      const tw = ctx.measureText(tag).width + 12;
      drawRoundedRect(ctx, vehicle.x - tw / 2, vehicle.y + 20, tw, 16, 4);
      ctx.fillStyle = 'rgba(153, 27, 27, 0.9)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef2f2';
      ctx.fillText(tag, vehicle.x, vehicle.y + 31);
      ctx.textAlign = 'left';
    } else if (vehicle.currentStopId) {
      const tag = playerAboard ? 'ABOARD - AT STOP' : `${vehicle.badge} AT STOP`;
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      const tw = ctx.measureText(tag).width + 12;
      drawRoundedRect(ctx, vehicle.x - tw / 2, vehicle.y + 20, tw, 16, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(tag, vehicle.x, vehicle.y + 31);
      ctx.textAlign = 'left';
    }
  }

  drawCharacterSprite(ctx, x, y, opts) {
    const bob = opts.isMoving ? Math.sin(opts.walkPhase) * 2.5 : 0;
    const legSwing = opts.isMoving ? Math.sin(opts.walkPhase) * 4 : 0;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.beginPath();
    ctx.ellipse(x, y + 11, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b2b22';
    ctx.beginPath();
    ctx.arc(x - 4, y + 8 + legSwing * 0.45, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 8 - legSwing * 0.45, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (opts.isPlayer && opts.facing === 'up') {
      ctx.fillStyle = '#a3572a';
      drawRoundedRect(ctx, x - 7, y - 5 + bob, 14, 11, 3);
      ctx.fill();
    }

    ctx.fillStyle = opts.tunicColor;
    drawRoundedRect(ctx, x - 8, y - 7 + bob, 16, 15, 5);
    ctx.fill();
    ctx.strokeStyle = '#182436';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = opts.scarfColor;
    ctx.fillRect(x - 7, y - 6 + bob, 14, 4);

    ctx.fillStyle = '#f2cfb2';
    ctx.beginPath();
    ctx.arc(x, y - 13 + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = opts.hairColor;
    ctx.beginPath();
    ctx.arc(x, y - 15.5 + bob, 7.2, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    if (opts.facing === 'down') {
      ctx.fillRect(x - 3, y - 13 + bob, 2, 2);
      ctx.fillRect(x + 1.5, y - 13 + bob, 2, 2);
    } else if (opts.facing === 'left') {
      ctx.fillRect(x - 4.5, y - 13 + bob, 2, 2);
    } else if (opts.facing === 'right') {
      ctx.fillRect(x + 2.5, y - 13 + bob, 2, 2);
    }

    if (opts.isPlayer) {
      ctx.strokeStyle = 'rgba(212, 88, 59, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y + 11, 13, 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawTimeOfDayOverlay(ctx, phase) {
    if (phase.id === 'golden') {
      ctx.fillStyle = 'rgba(235, 136, 48, 0.14)';
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    } else if (phase.id === 'evening') {
      ctx.fillStyle = 'rgba(18, 32, 66, 0.34)';
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }
  }

  drawMiniMap(ctx, state) {
    const mw = 156;
    const mh = 76;
    const mx = this.viewWidth - mw - 10;
    const my = 10;
    const sx = mw / WORLD_WIDTH;
    const sy = mh / WORLD_HEIGHT;

    ctx.save();
    drawRoundedRect(ctx, mx - 4, my - 4, mw + 8, mh + 22, 8);
    ctx.fillStyle = 'rgba(18, 31, 48, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const hood of NEIGHBORHOODS) {
      ctx.fillStyle = hood.groundTint;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(mx + hood.minX * sx, my, (hood.maxX - hood.minX) * sx, WATERFRONT_Y * sy);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#256c94';
    ctx.fillRect(mx, my + WATERFRONT_Y * sy, mw, (WORLD_HEIGHT - WATERFRONT_Y) * sy);

    ctx.strokeStyle = '#f3c623';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx + 220 * sx, my + 610 * sy);
    ctx.lineTo(mx + 2160 * sx, my + 610 * sy);
    ctx.stroke();

    // Underground Metro Blue Line dashed link on minimap
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    METRO_STATIONS.forEach((st, idx) => {
      const px = mx + st.doorX * sx;
      const py = my + st.doorY * sy;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    for (const venue of VENUES) {
      const visited = state.visitedVenues.includes(venue.id);
      ctx.fillStyle = visited ? '#34d399' : '#fbbf24';
      ctx.fillRect(mx + venue.x * sx, my + venue.y * sy, Math.max(4, venue.w * sx), Math.max(4, venue.h * sy));
    }

    for (const st of METRO_STATIONS) {
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(mx + st.doorX * sx - 2.5, my + st.doorY * sy - 2.5, 5, 5);
    }

    for (const v of state.vehicles) {
      ctx.fillStyle = v.mode === 'tram' ? '#fde047' : '#34d399';
      ctx.beginPath();
      ctx.arc(mx + v.x * sx, my + v.y * sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 8.5px "Segoe UI", sans-serif';
    ctx.fillText('B. ALTO', mx + 6, my + mh + 12);
    ctx.fillText('CHIADO', mx + 58, my + mh + 12);
    ctx.fillText('ALFAMA', mx + 112, my + mh + 12);
    ctx.restore();
  }

  drawInteractionBanner(ctx, interaction) {
    const bw = Math.min(540, this.viewWidth - 40);
    const bh = 46;
    const bx = (this.viewWidth - bw) / 2;
    const by = this.viewHeight - bh - 12;

    ctx.save();
    drawRoundedRect(ctx, bx, by, bw, bh, 9);
    ctx.fillStyle = 'rgba(18, 34, 56, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f5b841';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(interaction.label, this.viewWidth / 2, by + 19);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 11px "Segoe UI", sans-serif';
    ctx.fillText(interaction.sublabel, this.viewWidth / 2, by + 36);
    ctx.restore();
  }

  renderInterior(ctx, state, nearbyInteraction) {
    const venue = VENUES.find((v) => v.id === state.currentVenueId);
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
    } else {
      this.drawAzulejoWall(ctx, 8, 86, INTERIOR_WIDTH - 16, 48, 'cobalt-azulejo');
    }
    ctx.fillStyle = theme.trim;
    ctx.fillRect(6, 132, INTERIOR_WIDTH - 12, 8);

    const skyColor =
      phase.id === 'evening' ? '#1c2c4d' : phase.id === 'golden' ? '#e89a54' : '#8ec5e8';
    const winXs =
      theme.layout === 'cathedral' || theme.layout === 'bookshop' || theme.layout === 'gallery'
        ? []
        : [78, 578];
    for (const wx of winXs) {
      ctx.fillStyle = skyColor;
      ctx.beginPath();
      ctx.arc(wx + 52, 46, 52, Math.PI, 0);
      ctx.lineTo(wx + 104, 102);
      ctx.lineTo(wx, 102);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = theme.trim;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx + 52, 18);
      ctx.lineTo(wx + 52, 102);
      ctx.moveTo(wx, 64);
      ctx.lineTo(wx + 104, 64);
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

    this.drawCharacterSprite(ctx, 380, 140, {
      facing: 'down',
      walkPhase: 0,
      isMoving: false,
      tunicColor: theme.trim,
      scarfColor: '#f5cb5c',
      hairColor: '#3a2b22',
      isPlayer: false
    });
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 336, 98, 88, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#1b4d89';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#14375f';
    ctx.font = '700 10.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(venue.proprietor, 380, 110);

    ctx.fillStyle = 'rgba(20, 20, 25, 0.22)';
    ctx.fillRect(236, 152, 294, 42);
    ctx.fillStyle = theme.counter;
    drawRoundedRect(ctx, 230, 142, 300, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#3d2514';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 248, 235, 0.25)';
    for (let cx = 244; cx < 516; cx += 24) {
      ctx.fillRect(cx, 174, 14, 7);
    }

    if (theme.layout === 'cafe' || theme.layout === 'bakery') {
      // Brass espresso machine + glowing pastry / bread showcase
      ctx.fillStyle = '#c5922b';
      ctx.fillRect(250, 148, 42, 24);
      ctx.fillStyle = '#fff5dc';
      ctx.fillRect(426, 148, 82, 24);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(426, 148, 82, 24);
      ctx.fillStyle = theme.layout === 'bakery' ? '#c8802b' : '#d98a1c';
      for (let px = 438; px <= 496; px += 14) {
        ctx.beginPath();
        ctx.ellipse(px, 160, theme.layout === 'bakery' ? 6 : 4.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme.layout === 'restaurant') {
      // Steaming caldo verde soup tureen + grilled sardine platter + wine bottle
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.arc(280, 162, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d7a4a';
      ctx.beginPath();
      ctx.arc(280, 162, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.fillRect(306, 146, 8, 22);

      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(430, 150, 78, 22);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(438, 155, 24, 5);
      ctx.fillRect(470, 155, 24, 5);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(444, 163, 44, 4);
    } else if (theme.layout === 'bookshop') {
      // Stacked vintage volumes + brass library lamp + Bertrand heritage stamp
      const spineCols = ['#1b4d89', '#b84a32', '#1f7062', '#c98a18'];
      spineCols.forEach((sc, i) => {
        ctx.fillStyle = sc;
        ctx.fillRect(250 + i * 11, 148, 9, 24);
      });
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(478, 154, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(476, 154, 4, 18);
    } else if (theme.layout === 'vinyl') {
      // Spinning turntable deck + crate of 7-inch fado vinyl sleeves
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(250, 148, 44, 26);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(270, 161, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(270, 161, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(446, 148, 26, 24);
      ctx.fillStyle = '#6d476c';
      ctx.fillRect(476, 148, 26, 24);
    } else if (theme.layout === 'azulejo') {
      // Cobalt glaze paint pots, brushes, and kiln-fired tile samples
      for (const [idx, col] of ['#1d568a', '#3b82f6', '#eab308', '#f8fafc'].entries()) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(256 + idx * 14, 160, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (let tx = 436; tx <= 484; tx += 24) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(tx, 150, 20, 20);
        ctx.fillStyle = '#1d568a';
        ctx.fillRect(tx + 5, 155, 10, 10);
      }
    } else if (theme.layout === 'mercearia') {
      // Brass grocer balance scale + colorful lithograph fish tins
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(272, 148, 4, 22);
      ctx.fillRect(256, 154, 36, 3);
      const tins = ['#e11d48', '#f59e0b', '#0284c7', '#10b981'];
      tins.forEach((tc, i) => {
        ctx.fillStyle = tc;
        ctx.fillRect(432 + i * 19, 150, 16, 20);
      });
    } else if (theme.layout === 'pensao') {
      // Brass reception service bell + guest register ledger
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(276, 166, 9, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(442, 148, 56, 24);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(446, 151, 48, 18);
    } else if (theme.layout === 'gallery') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(252, 148, 42, 24);
      ctx.strokeStyle = '#785a36';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(252, 148, 42, 24);
      ctx.fillStyle = '#1b4d89';
      ctx.fillRect(258, 154, 30, 12);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(452, 148, 48, 24);
      ctx.strokeRect(452, 148, 48, 24);
      ctx.fillStyle = '#b84a32';
      ctx.fillRect(460, 154, 32, 12);
    } else if (theme.layout === 'cathedral') {
      for (const cx of [258, 274, 484, 500]) {
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
      // Cork & leather atelier tools + stitched cork notebooks
      ctx.fillStyle = '#c89b6d';
      ctx.fillRect(252, 148, 38, 24);
      ctx.fillStyle = '#8b5a34';
      ctx.fillRect(444, 148, 26, 22);
      ctx.fillStyle = '#1f7062';
      ctx.fillRect(476, 148, 26, 22);
    }

    // Left interactive display station tailored to venue category (keeps exact collision footprint 62..134, 204..322)
    ctx.fillStyle = theme.layout === 'gallery' || theme.layout === 'cathedral' ? '#e5dfd3' : '#7b5336';
    drawRoundedRect(ctx, 62, 204, 72, 118, 6);
    ctx.fill();
    ctx.strokeStyle = '#472d1b';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (theme.layout === 'bookshop') {
      // Floor-to-ceiling bookshop shelf packed with vertical book spines
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
      // Wooden record flip crates showing vinyl discs
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
      // Glass museum display vitrine / cathedral reliquary cabinet
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
          : theme.layout === 'bakery'
            ? ['#c8802b', '#e09f3e', '#b45309', '#d97706']
            : ['#1b4d89', '#c98a18', '#b84a32', '#13795b'];
      for (let sy = 216; sy <= 298; sy += 26) {
        ctx.fillStyle = swatchColors[(sy / 26) % swatchColors.length | 0];
        ctx.fillRect(72, sy, 52, 15);
      }
    }

    // Right furnishings tailored to venue category (keeps exact collision footprint 590..682, 225..279 & 325..379)
    const tableYs = [225, 325];
    for (const ty of tableYs) {
      if (theme.layout === 'restaurant') {
        // Checkered restaurant dining table with plates & glowing candle
        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 590, ty, 92, 54, 8);
        ctx.fill();
        ctx.fillStyle = venue.id === 'tasca-do-fado' ? '#dc2626' : '#1d4ed8';
        ctx.fillRect(594, ty + 4, 84, 8);
        ctx.fillRect(594, ty + 42, 84, 8);
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.arc(614, ty + 27, 8, 0, Math.PI * 2);
        ctx.arc(658, ty + 27, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(636, ty + 27, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.layout === 'cafe' || theme.layout === 'bakery') {
        // Marble bistro table with espresso cups & pastry plates
        ctx.fillStyle = '#f8f5ef';
        drawRoundedRect(ctx, 590, ty, 92, 54, 14);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(618, ty + 27, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d98a1c';
        ctx.beginPath();
        ctx.arc(654, ty + 27, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.layout === 'cathedral') {
        // Carved dark-oak Romanesque church pews
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
        // Oak reading table with open books
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
        // Velvet museum viewing bench
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
    }

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

    this.drawCharacterSprite(ctx, state.player.x, state.player.y, {
      facing: state.player.facing,
      walkPhase: state.player.walkPhase,
      isMoving: state.player.isMoving,
      tunicColor: '#1b4d89',
      scarfColor: '#d4583b',
      hairColor: '#2d211b',
      isPlayer: true
    });

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  drawInteriorMarker(ctx, x, y, label, active) {
    ctx.save();
    ctx.strokeStyle = active ? '#f59e0b' : 'rgba(27, 77, 137, 0.45)';
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = active ? '#b45309' : '#334155';
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 34);
    ctx.restore();
  }

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

    if (isTunnelCruise) {
      this.renderMetroTunnelRide(ctx, state);
    } else {
      this.renderMetroPlatformScene(ctx, state, nearbyInteraction);
    }

    ctx.restore();

    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  renderMetroPlatformScene(ctx, state, nearbyInteraction) {
    const m = state.metro;
    const station = METRO_STATIONS.find((s) => s.id === m.stationId) || METRO_STATIONS[0];
    const theme = station.undergroundTheme || {
      wallPrimary: '#ded8ce',
      tileAccent: '#1b4d89',
      platformFloor: '#d4cec2',
      trim: '#1e3a5f',
      artLabel: 'METROPOLITANO DE LISBOA'
    };

    // Frame shell
    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = '#182436';
    ctx.fill();
    ctx.strokeStyle = theme.trim;
    ctx.lineWidth = 6;
    ctx.stroke();

    // 1. Station tiled upper vault wall
    ctx.fillStyle = theme.wallPrimary;
    ctx.fillRect(6, 6, INTERIOR_WIDTH - 12, 146);
    this.drawAzulejoWall(ctx, 8, 92, INTERIOR_WIDTH - 16, 56, 'cobalt-azulejo');

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

    // Left & right station name plaques with crimson Lisbon Metro M emblem
    for (const px of [138, 622]) {
      drawRoundedRect(ctx, px - 102, 28, 204, 46, 6);
      ctx.fillStyle = '#143258';
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = '#c81e32';
      ctx.beginPath();
      ctx.arc(px - 80, 51, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('M', px - 80, 55);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11.5px Georgia, serif';
      ctx.fillText(station.name.replace('Metro ', '').toUpperCase(), px - 60, 47);
      ctx.fillStyle = '#93c5fd';
      ctx.font = '700 9px "Segoe UI", sans-serif';
      ctx.fillText(station.lines.join(' / ').toUpperCase(), px - 60, 62);
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

    // Platform benches + subtle Lisbon art label
    for (const bx of [110, 580]) {
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

    // Boarding zone floor marker when on platform
    if (m.phase === 'platform') {
      this.drawInteriorMarker(
        ctx,
        380,
        252,
        'BOARD METRO [E]',
        nearbyInteraction?.type === 'metro-board'
      );
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
    // Twin steel Metro rails + blue third-rail highlight
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8, 332, INTERIOR_WIDTH - 16, 4);
    ctx.fillRect(8, 386, INTERIOR_WIDTH - 16, 4);
    ctx.fillStyle = '#2563eb';
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
      headlightsOn: true
    });
    ctx.restore();

    // 6. Linha Azul Station Strip Diagram at bottom of vault
    this.drawMetroRouteStrip(ctx, station.id, m.toStationId, m.phase === 'riding' ? m.phaseProgress : 0, 424);

    // Walk target on platform
    if (m.phase === 'platform' && state.player.walkTarget) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 7. Player character (on escalator or platform; inside train when riding)
    if (m.phase !== 'riding') {
      this.drawCharacterSprite(ctx, state.player.x, state.player.y, {
        facing: state.player.facing,
        walkPhase: state.player.walkPhase,
        isMoving: state.player.isMoving,
        tunicColor: '#1b4d89',
        scarfColor: '#d4583b',
        hairColor: '#2d211b',
        isPlayer: true
      });
    }
  }

  renderMetroTunnelRide(ctx, state) {
    const m = state.metro;
    const origin = METRO_STATIONS.find((s) => s.id === m.fromStationId) || METRO_STATIONS[0];
    const dest = METRO_STATIONS.find((s) => s.id === m.toStationId) || METRO_STATIONS[1];
    const dir = m.direction || 1;

    // Deep curved underground Lisbon Metro tunnel
    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, INTERIOR_HEIGHT);
    bgGrad.addColorStop(0, '#0a1220');
    bgGrad.addColorStop(0.5, '#132038');
    bgGrad.addColorStop(1, '#0b1322');
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Clip streaming tunnel ribs, sleepers, and train headlights cleanly inside the tunnel viewport
    ctx.save();
    drawRoundedRect(ctx, 4, 4, INTERIOR_WIDTH - 8, INTERIOR_HEIGHT - 8, 9);
    ctx.clip();

    // Streaming arched tunnel concrete ribs & Linha Azul light conduit
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

    // Horizontal Linha Azul illuminated cable strip streaking across tunnel wall
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(8, 184, INTERIOR_WIDTH - 16, 5);
    ctx.fillStyle = 'rgba(96, 165, 250, 0.35)';
    ctx.fillRect(8, 180, INTERIOR_WIDTH - 16, 13);

    // Passing intermediate station flash when riding 2 stops (Baixa-Chiado <-> Santa Apolonia)
    const isTwoHops = Math.abs((dest.order ?? 0) - (origin.order ?? 0)) === 2;
    if (isTwoHops && m.phaseProgress > 0.42 && m.phaseProgress < 0.58) {
      const alpha = 1 - Math.abs(m.phaseProgress - 0.5) / 0.08;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1) * 0.78;
      ctx.fillStyle = '#14669c';
      ctx.fillRect(210, 118, 340, 44);
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '700 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('PASSING: TERREIRO DO PACO', 380, 145);
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
      headlightsOn: true
    });

    // Overhead live Linha Azul journey header & animated station progress map
    drawRoundedRect(ctx, 110, 22, 540, 74, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `METROPOLITANO DE LISBOA  -  ${origin.name.replace('Metro ', '')} -> ${dest.name.replace('Metro ', '')}`,
      380,
      44
    );

    this.drawMetroRouteStrip(ctx, origin.id, dest.id, m.phaseProgress, 72);
    ctx.restore();
  }

  drawMetroTrain(ctx, centerX, centerY, { doorsOpen, showRiderInTrain, direction, headlightsOn }) {
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

    // Signature Lisbon Metro crimson cab noses & Linha Azul lower livery stripe
    ctx.fillStyle = '#c81e32';
    drawRoundedRect(ctx, x, y + 6, 22, trainH - 12, 8);
    ctx.fill();
    drawRoundedRect(ctx, x + trainW - 22, y + 6, 22, trainH - 12, 8);
    ctx.fill();

    ctx.fillStyle = '#1d4ed8';
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

  drawMetroRouteStrip(ctx, originId, destId, rideProgress, y) {
    const startX = 165;
    const endX = 595;
    const span = endX - startX;

    ctx.save();
    // Blue line track
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    const originStation = METRO_STATIONS.find((s) => s.id === originId) || METRO_STATIONS[0];
    const destStation = destId ? METRO_STATIONS.find((s) => s.id === destId) : null;

    METRO_STATIONS.forEach((st, idx) => {
      const sx = startX + (idx / (METRO_STATIONS.length - 1)) * span;
      const isCurrent = st.id === originId && !destStation;
      const isTarget = destStation && st.id === destStation.id;

      ctx.fillStyle = isTarget ? '#facc15' : isCurrent ? '#38bdf8' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(sx, y, isCurrent || isTarget ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.name.replace('Metro ', ''), sx, y + 18);
    });

    // Live moving train pip along the Blue Line strip during ride
    if (destStation) {
      const ox = startX + ((originStation.order ?? 0) / (METRO_STATIONS.length - 1)) * span;
      const dx = startX + ((destStation.order ?? 0) / (METRO_STATIONS.length - 1)) * span;
      const curX = ox + (dx - ox) * clamp(rideProgress, 0, 1);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(curX, y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}
