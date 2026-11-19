import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
  WATERFRONT_Y,
  NEIGHBORHOODS,
  STREETS,
  DECORATIVE_STRUCTURES,
  VENUES,
  REST_SPOTS,
  TRANSIT_LINES,
  getAllTransitStops
} from './data.js';
import { getDayPhase, INTERIOR_STATIONS } from './engine.js';

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

const VENUE_ARCHITECTURAL_STYLE = {
  'quiosque-sao-pedro': { wallStyle: 'pombaline-teal', shutter: '#1b4f3e', flowers: '#d94854', chimney: false },
  'tasca-do-fado': { wallStyle: 'ochre-plaster', shutter: '#6e231c', flowers: '#c93434', chimney: true },
  'vinil-do-alto': { wallStyle: 'rose-plaster', shutter: '#3b2e5a', flowers: '#c94c7a', chimney: true },
  'livraria-chiado': { wallStyle: 'cobalt-azulejo', shutter: '#16385b', flowers: '#d14334', chimney: false },
  'cafe-do-poeta': { wallStyle: 'ochre-azulejo', shutter: '#5a3a18', flowers: '#d94c3d', chimney: true },
  'atelier-cortica': { wallStyle: 'pombaline-teal', shutter: '#5e351e', flowers: '#cf5636', chimney: false },
  'oficina-azulejos': { wallStyle: 'cobalt-azulejo', shutter: '#143c69', flowers: '#d94854', chimney: true },
  'taberna-sardinha': { wallStyle: 'ochre-plaster', shutter: '#1d568a', flowers: '#e04f3e', chimney: true },
  'conservas-alfama': { wallStyle: 'cobalt-azulejo', shutter: '#165248', flowers: '#d94854', chimney: false }
};

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

          // Draw wrapped stone so tile repeats seamlessly
          for (const wrapX of [sx, sx - size, sx + size]) {
            if (wrapX + sw < 0 || wrapX > size) continue;
            drawRoundedRect(tctx, wrapX, sy, sw, sh, 2.5);
            tctx.fillStyle = color;
            tctx.fill();
            // Sunlit top bevel highlight
            tctx.fillStyle = 'rgba(255, 252, 245, 0.24)';
            tctx.fillRect(wrapX + 1.5, sy + 1, Math.max(2, sw - 3), 2);
            // Subtle bottom stone shadow
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
    if (state.mode === 'interior') {
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

    // 1. Limestone neighborhood base ground
    for (const hood of NEIGHBORHOODS) {
      ctx.fillStyle = hood.groundTint;
      ctx.fillRect(hood.minX, 0, hood.maxX - hood.minX, WATERFRONT_Y);
    }

    // Subtle Lisbon calcada limestone masonry texture
    this.drawCalcadaGroundTexture(ctx);

    // 2. Streets, plazas, Alfama escadinhas, and calcada Mar Largo waves
    this.drawStreetsAndPlazas(ctx);

    // 3. Tagus River Waterfront with stone parapet and sailboats
    this.drawTagusWaterfront(ctx);

    // 4. Transit corridors (Bus road markings + Steel Tram 28E Rails)
    this.drawTransitInfrastructure(ctx);

    // 5. Enamel Lisbon street plaques (Placas Toponimicas)
    this.drawLisbonStreetPlaques(ctx);

    // 6. Jacaranda trees, bougainvillea pergolas, and tiled miradouro benches
    this.drawTreesAndBenches(ctx, state);

    // 7. Decorative Portuguese townhouses, Se de Lisboa cathedral, and Camoes monument
    for (const struct of DECORATIVE_STRUCTURES) {
      this.drawDecorativeStructure(ctx, struct, isEvening);
    }

    // 8. Enterable Shops, Cafes & Restaurants with azulejos and Pombaline facades
    for (const venue of VENUES) {
      const visited = state.visitedVenues.includes(venue.id);
      const isHighlighted = nearbyInteraction?.type === 'venue' && nearbyInteraction.id === venue.id;
      this.drawVenueBuilding(ctx, venue, visited, isHighlighted, isEvening);
    }

    // 9. Transit Stops
    for (const stop of ALL_STOPS) {
      const isHighlighted = nearbyInteraction?.type === 'stop' && nearbyInteraction.id === stop.stopId;
      this.drawTransitStop(ctx, stop, isHighlighted, isEvening);
    }

    // 10. Classic wrought-iron Lisbon streetlamps (Candeeiros)
    this.drawLisbonStreetlamps(ctx, isEvening, isGolden);

    // 11. Walk Target Indicator
    if (state.player.walkTarget) {
      const pulse = 8 + Math.sin(this.animTime * 6) * 3;
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 12. Ambient Lisbon Locals
    for (const npc of state.npcs) {
      this.drawCharacterSprite(ctx, npc.x, npc.y, {
        facing: npc.patrolAxis === 'x' ? (npc.dir > 0 ? 'right' : 'left') : (npc.dir > 0 ? 'down' : 'up'),
        walkPhase: npc.walkPhase,
        isMoving: true,
        tunicColor: npc.shirt,
        scarfColor: '#e6dcc8',
        hairColor: npc.hair,
        isPlayer: false
      });
    }

    // 13. Live Transit Vehicles (Remodelado Tram 28E & Carris Bus)
    for (const vehicle of state.vehicles) {
      const playerAboard = state.ridingVehicleId === vehicle.id;
      this.drawTransitVehicle(ctx, vehicle, playerAboard, isEvening);
    }

    // 14. Player Character (when walking on foot)
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

    // 15. Time-of-day atmospheric lighting wash
    this.drawTimeOfDayOverlay(ctx, phase);

    // 16. Mini-map HUD overlay inside top-right corner
    this.drawMiniMap(ctx, state);

    // 17. Floating Context Interaction Prompt at bottom-center
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
      ctx.strokeStyle = '#d6cebf';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = '#7e766b';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    };

    for (const st of STREETS) {
      if (st.style === 'bus-road') {
        // Limestone sidewalk band + interlocking basalt cobblestone roadway
        ctx.fillStyle = this.patterns.sidewalk || '#ddd6c8';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#a69f95';
        ctx.fillRect(st.x + 10, st.y + 12, st.w - 20, st.h - 24);
        drawCurb(st.x + 10, st.y + 12, st.w - 20, st.h - 24);
      } else if (st.style === 'tram-avenue') {
        ctx.fillStyle = this.patterns.sidewalk || '#e0d9cb';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#aba49a';
        ctx.fillRect(st.x + 6, st.y + 16, st.w - 12, st.h - 32);
        drawCurb(st.x + 6, st.y + 16, st.w - 12, st.h - 32);
      } else if (st.style === 'plaza') {
        // Praca Luis de Camoes iconic Mar Largo black-and-white calcada portuguesa
        ctx.fillStyle = this.patterns.plaza || '#ede7db';
        ctx.fillRect(st.x, st.y, st.w, st.h);

        // Decorative basalt border trim
        ctx.strokeStyle = '#3b424c';
        ctx.lineWidth = 3;
        ctx.strokeRect(st.x + 4, st.y + 4, st.w - 8, st.h - 8);
        ctx.strokeStyle = '#68707d';
        ctx.lineWidth = 1;
        ctx.strokeRect(st.x + 9, st.y + 9, st.w - 18, st.h - 18);

        // Alternating black basalt wave mosaic bands (Mar Largo)
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
        // Historic Lisbon cobbled lanes (Rua da Rosa, Rua do Carmo, Escadinhas da Se)
        ctx.fillStyle = this.patterns.sidewalk || '#dcd4c5';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = this.patterns.street || '#b2aba0';
        ctx.globalAlpha = 0.72;
        ctx.fillRect(st.x + 8, st.y + 4, st.w - 16, st.h - 8);
        ctx.globalAlpha = 1;
        drawCurb(st.x + 8, st.y + 4, st.w - 16, st.h - 8);

        // Alfama limestone steps (Escadinhas da Se)
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

  drawTagusWaterfront(ctx) {
    // Classic Ribeira limestone balustrade & azulejo quay trim
    ctx.fillStyle = '#d5ccbc';
    ctx.fillRect(0, WATERFRONT_Y - 18, WORLD_WIDTH, 18);
    ctx.fillStyle = '#1b4d89';
    for (let ax = 12; ax < WORLD_WIDTH; ax += 28) {
      ctx.fillRect(ax, WATERFRONT_Y - 14, 14, 4);
    }
    ctx.fillStyle = '#8b8274';
    ctx.fillRect(0, WATERFRONT_Y - 4, WORLD_WIDTH, 5);

    // Stone bollards along the Tagus promenade
    for (let bx = 60; bx < WORLD_WIDTH - 40; bx += 110) {
      ctx.fillStyle = '#a89f8e';
      ctx.fillRect(bx - 5, WATERFRONT_Y - 16, 10, 12);
      ctx.fillStyle = '#e5ded0';
      ctx.fillRect(bx - 4, WATERFRONT_Y - 16, 8, 4);
    }

    // Tagus estuary water
    const grad = ctx.createLinearGradient(0, WATERFRONT_Y, 0, WORLD_HEIGHT);
    grad.addColorStop(0, '#2a6f97');
    grad.addColorStop(0.55, '#1e5b82');
    grad.addColorStop(1, '#144260');
    ctx.fillStyle = grad;
    ctx.fillRect(0, WATERFRONT_Y, WORLD_WIDTH, WORLD_HEIGHT - WATERFRONT_Y);

    // Animated river ripples
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

    // Traditional Tagus fragata sailboats with terracotta lateen sails
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
    // Bus 737/758 loop lane centerlines
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

    // Tram 28E twin steel rails inlaid into basalt cobblestones along y = 610
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
    // Subtle metallic sheen on top rail edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(195, tramY - 8);
    ctx.lineTo(2205, tramY - 8);
    ctx.stroke();
  }

  drawLisbonStreetPlaques(ctx) {
    // Authentic white-and-cobalt Lisbon limestone street plaques (Placas Toponimicas)
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

      // Shadow
      ctx.fillStyle = 'rgba(18, 28, 42, 0.16)';
      drawRoundedRect(ctx, px + 2, py + 2, w, h, 4);
      ctx.fill();

      // White glazed ceramic plaque with double cobalt azulejo border
      ctx.fillStyle = '#faf8f3';
      drawRoundedRect(ctx, px, py, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(27, 77, 137, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 3, py + 3, w - 6, h - 6);

      // Corner cobalt dots
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
    // Lisbon Jacaranda (violet blossoms), Mediterranean cypress & olive trees
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

    // Free Miradouro Azulejo-Trimmed Rest Benches + Santa Luzia Bougainvillea Pergola
    for (const spot of REST_SPOTS) {
      const captured = state.memories.some((m) => m.id === spot.memory.id);

      // Decorative limestone & cobalt tile miradouro backing wall
      ctx.fillStyle = '#f2eee6';
      drawRoundedRect(ctx, spot.x - 32, spot.y - 18, 64, 12, 3);
      ctx.fill();
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cobalt azulejo tile accents along miradouro wall
      ctx.fillStyle = '#1b4d89';
      for (let tx = spot.x - 26; tx <= spot.x + 20; tx += 12) {
        ctx.fillRect(tx, spot.y - 15, 6, 6);
      }

      // Bougainvillea vines on Alfama & Bairro Alto miradouros
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

      // Bench shadow + slatted timber bench
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

  drawAzulejoWall(ctx, x, y, w, h, wallStyle) {
    if (wallStyle === 'cobalt-azulejo') {
      // Classic 18th-century Lisbon glazed white-and-cobalt ceramic tile facade
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
            // Azulejo cobalt diamond rosette
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
            // White center dot + corner petals
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
      // Ornamental cobalt border frieze
      ctx.fillStyle = '#1b4d89';
      ctx.fillRect(x, y, w, 4);
      ctx.fillRect(x, y + h - 4, w, 4);
      return;
    }

    if (wallStyle === 'pombaline-teal') {
      // 19th-century Chiado emerald/turquoise glazed tile facade
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

    if (wallStyle === 'ochre-azulejo') {
      // Sunlit Chiado golden-ochre & cobalt geometric tilework
      ctx.fillStyle = '#f6ecd7';
      ctx.fillRect(x, y, w, h);
      const tile = 14;
      ctx.strokeStyle = 'rgba(156, 103, 36, 0.24)';
      ctx.lineWidth = 0.7;
      for (let ty = y; ty < y + h; ty += tile) {
        for (let tx = x; tx < x + w; tx += tile) {
          const tw = Math.min(tile, x + w - tx);
          const th = Math.min(tile, y + h - ty);
          ctx.strokeRect(tx, ty, tw, th);
          if (tw >= 10 && th >= 10) {
            const cx = tx + tw / 2;
            const cy = ty + th / 2;
            ctx.fillStyle = ((tx + ty) / tile) % 2 === 0 ? '#b6781f' : '#245285';
            ctx.beginPath();
            ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.fillStyle = '#245285';
      ctx.fillRect(x, y, w, 4);
      return;
    }

    // Traditional Portuguese warm lime plaster (ochre or dusty rose) with limestone cantaria quoins
    ctx.fillStyle = wallStyle === 'rose-plaster' ? '#ebd4da' : '#f1dec4';
    ctx.fillRect(x, y, w, h);

    // Subtle limestone corner stone blocks (cantaria quoins)
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

    // Lower cobalt azulejo wainscot band along base of facade
    ctx.fillStyle = '#eef4fa';
    ctx.fillRect(x + 10, y + h - 14, w - 20, 12);
    ctx.fillStyle = '#1b4d89';
    for (let ax = x + 14; ax < x + w - 16; ax += 12) {
      ctx.fillRect(ax, y + h - 11, 5, 5);
    }
  }

  drawTerracottaRoof(ctx, x, y, w, h, baseColor, hasChimney = true) {
    // Base clay-tile roof gradient
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, '#7c2e1c');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Scalloped Portuguese barrel tiles (telha portuguesa)
    ctx.strokeStyle = 'rgba(255, 224, 194, 0.25)';
    ctx.lineWidth = 1.1;
    for (let ry = y + 10; ry < y + h - 4; ry += 11) {
      for (let rx = x + 4; rx < x + w - 6; rx += 12) {
        ctx.beginPath();
        ctx.arc(rx + 6, ry, 5.5, 0, Math.PI);
        ctx.stroke();
      }
    }

    // Ridge beam along crest
    ctx.fillStyle = 'rgba(255, 232, 206, 0.34)';
    ctx.fillRect(x + 4, y + Math.round(h * 0.45), w - 8, 3);

    // Classic Portuguese stone eave cornice (beiral)
    ctx.fillStyle = '#e7dfd0';
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.fillStyle = 'rgba(40, 28, 20, 0.28)';
    ctx.fillRect(x, y + h, w, 3);

    // Traditional whitewashed Portuguese chimney with terracotta cap
    if (hasChimney && w >= 150) {
      const cx = x + w - 28;
      const cy = y + 7;
      ctx.fillStyle = '#f3ede2';
      ctx.fillRect(cx, cy, 14, 16);
      ctx.strokeStyle = '#9c8e7c';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, 14, 16);
      ctx.fillStyle = '#b4482e';
      ctx.fillRect(cx - 2, cy - 3, 18, 5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx + 3, cy + 4, 8, 3);
    }
  }

  drawLisbonWindow(ctx, wx, wy, ww, wh, opts) {
    const { isEvening, shutterColor = '#22543d', flowerColor = '#d64545', hasBalcony = true } = opts;

    // Lioz limestone cantaria window frame
    ctx.fillStyle = '#ebe4d5';
    ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    ctx.strokeStyle = '#8b8070';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx - 4, wy - 4, ww + 8, wh + 8);

    // Wooden louvered shutters (portadas)
    ctx.fillStyle = shutterColor;
    ctx.fillRect(wx - 9, wy - 1, 6, wh + 2);
    ctx.fillRect(wx + ww + 3, wy - 1, 6, wh + 2);

    // Glass pane (golden glow in evening, sky blue tint by day)
    ctx.fillStyle = isEvening ? '#ffe285' : '#6c97ba';
    ctx.fillRect(wx, wy, ww, wh);
    // White colonial wood muntin bars (6-pane Lisbon sash)
    ctx.strokeStyle = '#f5f2eb';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh * 0.36);
    ctx.lineTo(wx + ww, wy + wh * 0.36);
    ctx.moveTo(wx, wy + wh * 0.7);
    ctx.lineTo(wx + ww, wy + wh * 0.7);
    ctx.stroke();

    // Wrought-iron Juliet balcony railing + terracotta geranium pot
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
      // Tiny terracotta planter with red geranium blooms
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
    // Drop shadow
    ctx.fillStyle = 'rgba(20, 26, 36, 0.2)';
    ctx.fillRect(struct.x + 7, struct.y + 9, struct.w, struct.h);

    if (struct.style === 'monument') {
      const cx = struct.x + struct.w / 2;
      const cy = struct.y + struct.h / 2;

      // 16-point calcada compass rose inlaid around Camoes statue
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

      // Octagonal lioz limestone plinth + bronze poet statue
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
      // Se de Lisboa (Lisbon Cathedral) - Romanesque limestone fortress towers & rose window
      ctx.fillStyle = '#ddd5c5';
      ctx.fillRect(struct.x, struct.y, struct.w, struct.h);

      // Ashlar limestone stone masonry joints
      ctx.strokeStyle = 'rgba(98, 88, 72, 0.25)';
      ctx.lineWidth = 1;
      for (let sy = struct.y + 12; sy < struct.y + struct.h; sy += 14) {
        ctx.beginPath();
        ctx.moveTo(struct.x, sy);
        ctx.lineTo(struct.x + struct.w, sy);
        ctx.stroke();
      }

      // Central nave roof
      this.drawTerracottaRoof(ctx, struct.x + 48, struct.y + 6, struct.w - 96, 42, '#9d4c36', false);

      // Twin Romanesque square bell towers with fortress battlements (ameias)
      const towerXs = [struct.x + 6, struct.x + struct.w - 50];
      for (const tx of towerXs) {
        ctx.fillStyle = '#d3cab7';
        ctx.fillRect(tx, struct.y - 12, 44, struct.h + 10);
        ctx.strokeStyle = '#6b5e4c';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(tx, struct.y - 12, 44, struct.h + 10);

        // Crenellations / battlements at tower tops
        ctx.fillStyle = '#e5ded0';
        for (let bx = tx + 2; bx < tx + 40; bx += 11) {
          ctx.fillRect(bx, struct.y - 18, 7, 7);
          ctx.strokeRect(bx, struct.y - 18, 7, 7);
        }

        // Arched belfry window with bronze bell
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

      // Spoked stained-glass rose window
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

      // Triple-recessed Gothic entrance portal arch
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

      // Label plaque
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

    // Pombaline & Bairro Alto Townhouses with Azulejo / Plaster + Barrel Roof + Juliet Balconies
    const roofH = Math.round(struct.h * 0.42);
    const wallStyle =
    struct.style === 'azulejo' || struct.id === 'house-chiado-south'
      ? 'cobalt-azulejo'
        : struct.id === 'house-ba-mid'
      ? 'rose-plaster'
      : 'ochre-plaster';

    this.drawAzulejoWall(ctx, struct.x, struct.y + roofH - 2, struct.w, struct.h - roofH + 2, wallStyle);
    this.drawTerracottaRoof(ctx, struct.x - 3, struct.y - 3, struct.w + 6, roofH, struct.roofColor, true);

    // Lisbon balcony windows with louvered shutters and geranium pots
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

    // Subtle Bairro Alto laundry bunting strung across balconies on Casas da Rosa
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
    ctx.fillStyle = 'rgba(255, 250, 240, 0.92)';
    ctx.fillText(struct.label, struct.x + struct.w / 2, struct.y + 20);
    ctx.textAlign = 'left';
  }

  drawVenueBuilding(ctx, venue, visited, isHighlighted, isEvening) {
    const arch = VENUE_ARCHITECTURAL_STYLE[venue.id] || {
      wallStyle: 'cobalt-azulejo',
      shutter: venue.awningColor,
      flowers: '#d94854',
      chimney: true
    };

    // Building shadow
    ctx.fillStyle = 'rgba(18, 26, 36, 0.24)';
    ctx.fillRect(venue.x + 7, venue.y + 9, venue.w, venue.h);

    // Highlight halo when player approaches doorway
    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(venue.x - 4, venue.y - 4, venue.w + 8, venue.h + 8);
    }

    const roofH = Math.round(venue.h * 0.41);
    const facadeY = venue.doorSide === 'south' ? venue.y + roofH - 2 : venue.y;
    const facadeH = venue.h - roofH + 2;

    // 1. Azulejo / Portuguese plastered facade
    this.drawAzulejoWall(ctx, venue.x, facadeY, venue.w, facadeH, arch.wallStyle);

    // 2. Terracotta telha portuguesa roof
    if (venue.doorSide === 'south') {
      this.drawTerracottaRoof(ctx, venue.x - 3, venue.y - 3, venue.w + 6, roofH, venue.roofColor, arch.chimney);
    } else {
      this.drawTerracottaRoof(
        ctx,
        venue.x - 3,
        venue.y + venue.h - roofH + 3,
        venue.w + 6,
        roofH,
        venue.roofColor,
        arch.chimney
      );
    }

    // 3. Detailed Lisbon shuttered windows with wrought-iron balconies & flowers
    const winY = venue.doorSide === 'south' ? venue.y + roofH + 14 : venue.y + 20;
    this.drawLisbonWindow(ctx, venue.x + 22, winY, 24, 28, {
      isEvening,
      shutterColor: arch.shutter,
      flowerColor: arch.flowers,
      hasBalcony: true
    });
    this.drawLisbonWindow(ctx, venue.x + venue.w - 46, winY, 24, 28, {
      isEvening,
      shutterColor: arch.shutter,
      flowerColor: arch.flowers,
      hasBalcony: true
    });

    // 4. Arched Portuguese Limestone Doorway + Scalloped Canvas Awning
    const doorW = 36;
    const doorH = 34;
    const dx = venue.doorX - doorW / 2;
    const dy = venue.doorSide === 'south' ? venue.y + venue.h - doorH : venue.y;

    // Warm golden welcome light spilling onto cobblestones
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

    // Lioz limestone arched stone surround
    ctx.fillStyle = '#e9e2d2';
    ctx.fillRect(dx - 4, dy - 2, doorW + 8, doorH + 2);
    ctx.strokeStyle = '#7e7362';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(dx - 4, dy - 2, doorW + 8, doorH + 2);

    // Wood door & glowing fanlight interior
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

    // Striped scalloped Lisbon storefront awning
    const awningY = venue.doorSide === 'south' ? dy - 11 : dy + doorH;
    ctx.fillStyle = venue.awningColor;
    ctx.fillRect(dx - 10, awningY, doorW + 20, 11);
    ctx.fillStyle = '#fff9f0';
    for (let sx = dx - 6; sx < dx + doorW + 8; sx += 10) {
      ctx.fillRect(sx, awningY, 4, 11);
    }
    // Scalloped edge trim
    ctx.fillStyle = venue.awningColor;
    for (let sx = dx - 6; sx <= dx + doorW + 6; sx += 8) {
      ctx.beginPath();
      ctx.arc(sx, venue.doorSide === 'south' ? awningY + 11 : awningY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp outer building outline
    ctx.strokeStyle = 'rgba(22, 32, 46, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(venue.x, venue.y, venue.w, venue.h);

    // Classic Portuguese Enamel Signboard Plaque centered on roof
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

      // Cast-iron post & lantern crown
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

    // Waiting platform pad
    ctx.fillStyle = isHighlighted ? 'rgba(245, 158, 11, 0.26)' : 'rgba(255, 252, 245, 0.6)';
    drawRoundedRect(ctx, px - 28, py - 14, 56, 26, 6);
    ctx.fill();
    ctx.strokeStyle = postColor;
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
    ctx.stroke();

    // Carris transit post
    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 18, py - 24, 3, 24);
    ctx.fillStyle = postColor;
    drawRoundedRect(ctx, px + 7, py - 35, 26, 14, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isTram ? '28E' : 'BUS', px + 20, py - 25);

    if (isEvening) {
      ctx.fillStyle = 'rgba(255, 232, 158, 0.24)';
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 9.5px "Segoe UI", sans-serif';
    ctx.fillText(stop.stopName.split(' (')[0], px, py + 22);
    ctx.textAlign = 'left';
  }

  drawTransitVehicle(ctx, vehicle, playerAboard, isEvening) {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.heading);

    const isTram = vehicle.mode === 'tram';
    const len = isTram ? 72 : 76;
    const wid = isTram ? 30 : 30;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    drawRoundedRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 7);
    ctx.fill();

    // Evening headlight beam
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
      // Classic Lisbon Remodelado yellow streetcar with front iron fender & mahogany trim
      ctx.fillStyle = '#334155';
      ctx.fillRect(len / 2 - 2, -wid / 2 + 6, 6, wid - 12);
      ctx.fillRect(-len / 2 - 4, -wid / 2 + 6, 6, wid - 12);

      // Iconic Carris yellow hull
      ctx.fillStyle = '#eab308';
      drawRoundedRect(ctx, -len / 2, -wid / 2, len, wid, 8);
      ctx.fill();
      ctx.strokeStyle = '#422006';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Ivory clerestory upper roof deck
      ctx.fillStyle = '#fdfbf7';
      drawRoundedRect(ctx, -len / 2 + 7, -wid / 2 + 4, len - 14, wid - 8, 5);
      ctx.fill();
      ctx.strokeStyle = '#b47b16';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Subdivided vintage wooden side windows
      ctx.fillStyle = '#1e3a5f';
      for (let wx = -len / 2 + 11; wx <= len / 2 - 19; wx += 10) {
        ctx.fillRect(wx, -wid / 2 + 1, 7, 3);
        ctx.fillRect(wx, wid / 2 - 4, 7, 3);
      }

      // Brass headlamp
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(len / 2 - 1, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Diamond trolley pantograph pole
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
      // Carris City Bus 737 / 758 livery
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

    // Highlight ring & traveler indicator if aboard
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

    // Floating boarding badge cleanly below vehicle when stopped
    if (vehicle.currentStopId) {
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

    for (const venue of VENUES) {
      const visited = state.visitedVenues.includes(venue.id);
      ctx.fillStyle = visited ? '#34d399' : '#fbbf24';
      ctx.fillRect(mx + venue.x * sx, my + venue.y * sy, Math.max(4, venue.w * sx), Math.max(4, venue.h * sy));
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

    // Room frame
    drawRoundedRect(ctx, 0, 0, INTERIOR_WIDTH, INTERIOR_HEIGHT, 12);
    ctx.fillStyle = theme.wall;
    ctx.fill();
    ctx.strokeStyle = theme.trim;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Upper back wall + Authentic Cobalt Azulejo Wainscoting Dado
    ctx.fillStyle = theme.wall;
    ctx.fillRect(6, 6, INTERIOR_WIDTH - 12, 134);
    this.drawAzulejoWall(ctx, 8, 86, INTERIOR_WIDTH - 16, 48, 'cobalt-azulejo');
    ctx.fillStyle = theme.trim;
    ctx.fillRect(6, 132, INTERIOR_WIDTH - 12, 8);

    // Arched Pombaline windows on back wall looking onto Lisbon sky
    const skyColor =
      phase.id === 'evening' ? '#1c2c4d' : phase.id === 'golden' ? '#e89a54' : '#8ec5e8';
    const winXs = [78, 578];
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

    // Room title enamel plaque centered on back wall
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

    // Patterned Portuguese hydraulic-tile interior floor (mosaico hidraulico)
    const tile = 32;
    for (let fy = 140; fy < INTERIOR_HEIGHT - 12; fy += tile) {
      for (let fx = 12; fx < INTERIOR_WIDTH - 12; fx += tile) {
        const alt = (Math.floor(fx / tile) + Math.floor(fy / tile)) % 2 === 0;
        const tw = Math.min(tile, INTERIOR_WIDTH - 12 - fx);
        const th = Math.min(tile, INTERIOR_HEIGHT - 12 - fy);
        ctx.fillStyle = alt ? theme.floorPrimary : theme.floorSecondary;
        ctx.fillRect(fx, fy, tw, th);
        // Subtle inlaid diamond star motif
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

    // Proprietor NPC standing behind counter
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

    // Service counter (drawn in front of proprietor lower body)
    ctx.fillStyle = 'rgba(20, 20, 25, 0.22)';
    ctx.fillRect(236, 152, 294, 42);
    ctx.fillStyle = theme.counter;
    drawRoundedRect(ctx, 230, 142, 300, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#3d2514';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Decorative tiled front face on counter
    ctx.fillStyle = 'rgba(255, 248, 235, 0.25)';
    for (let cx = 244; cx < 516; cx += 24) {
      ctx.fillRect(cx, 174, 14, 7);
    }

    // Counter props based on venue layout
    if (theme.layout === 'cafe') {
      ctx.fillStyle = '#c5922b';
      ctx.fillRect(256, 150, 38, 22);
      ctx.fillStyle = '#fff3d6';
      ctx.fillRect(435, 150, 68, 22);
      ctx.fillStyle = '#d98a1c';
      for (let px = 445; px <= 489; px += 14) {
        ctx.beginPath();
        ctx.arc(px, 161, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme.layout === 'restaurant') {
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.arc(285, 162, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d7a4a';
      ctx.beginPath();
      ctx.arc(285, 162, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(432, 152, 74, 20);
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(442, 158, 22, 6);
      ctx.fillRect(472, 158, 22, 6);
    } else {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(258, 150, 36, 22);
      ctx.fillStyle = '#e2b98f';
      ctx.fillRect(444, 150, 26, 20);
      ctx.fillStyle = '#24588a';
      ctx.fillRect(478, 150, 26, 20);
    }

    // Side furnishings (Display corner on left, dining/reading tables on right)
    ctx.fillStyle = '#7b5336';
    drawRoundedRect(ctx, 62, 204, 72, 118, 6);
    ctx.fill();
    ctx.strokeStyle = '#472d1b';
    ctx.lineWidth = 2;
    ctx.stroke();

    const swatchColors = ['#1b4d89', '#c98a18', '#b84a32', '#13795b'];
    for (let sy = 216; sy <= 298; sy += 26) {
      ctx.fillStyle = swatchColors[(sy / 26) % swatchColors.length | 0];
      ctx.fillRect(72, sy, 52, 15);
    }

    const tableYs = [225, 325];
    for (const ty of tableYs) {
      ctx.fillStyle = theme.layout === 'restaurant' ? '#f8fafc' : '#8e623f';
      drawRoundedRect(ctx, 590, ty, 92, 54, 8);
      ctx.fill();
      ctx.strokeStyle = '#472d1b';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Interactive station circles
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

    // Exit door mat at bottom
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
}
