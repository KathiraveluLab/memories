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

export class LisboaCanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewWidth = canvas.width;
    this.viewHeight = canvas.height;
    this.camera = { x: 490, y: 270 };
    this.animTime = 0;
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

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // 1. Neighborhood base ground tiles
    for (const hood of NEIGHBORHOODS) {
      ctx.fillStyle = hood.groundTint;
      ctx.fillRect(hood.minX, 0, hood.maxX - hood.minX, WATERFRONT_Y);
    }

    // Subtle sidewalk grid lines
    ctx.strokeStyle = 'rgba(120, 108, 90, 0.12)';
    ctx.lineWidth = 1;
    for (let gx = 40; gx < WORLD_WIDTH; gx += 48) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, WATERFRONT_Y);
      ctx.stroke();
    }
    for (let gy = 40; gy < WATERFRONT_Y; gy += 48) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(WORLD_WIDTH, gy);
      ctx.stroke();
    }

    // 2. Streets, plazas, and calcada corridors
    for (const st of STREETS) {
      if (st.style === 'bus-road') {
        ctx.fillStyle = '#cfc8bc';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = '#b9b2a7';
        ctx.fillRect(st.x + 8, st.y + 10, st.w - 16, st.h - 20);
      } else if (st.style === 'tram-avenue') {
        ctx.fillStyle = '#d6cfc2';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.fillStyle = '#c5bdb0';
        ctx.fillRect(st.x + 6, st.y + 16, st.w - 12, st.h - 32);
      } else if (st.style === 'plaza') {
        ctx.fillStyle = '#e5ded2';
        ctx.fillRect(st.x, st.y, st.w, st.h);
        // Calcada wave pattern inside Praca Luis de Camoes
        ctx.strokeStyle = 'rgba(42, 54, 72, 0.2)';
        ctx.lineWidth = 2;
        for (let wy = st.y + 24; wy < st.y + st.h - 20; wy += 24) {
          ctx.beginPath();
          for (let wx = st.x + 12; wx < st.x + st.w - 12; wx += 14) {
            const offset = Math.sin((wx - st.x) * 0.16) * 4;
            if (wx === st.x + 12) ctx.moveTo(wx, wy + offset);
            else ctx.lineTo(wx, wy + offset);
          }
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#d9d1c4';
        ctx.fillRect(st.x, st.y, st.w, st.h);
      }
    }

    // 3. Tagus River Waterfront
    this.drawTagusWaterfront(ctx);

    // 4. Transit corridors (Bus road markings + Steel Tram 28E Rails)
    this.drawTransitInfrastructure(ctx);

    // 5. Neighborhood district headers painted subtly onto plazas
    this.drawNeighborhoodSignage(ctx);

    // 6. Miradouro Rest Benches & Trees
    this.drawTreesAndBenches(ctx, state);

    // 7. Decorative structures & landmarks (Se de Lisboa, townhouses, Camoes statue)
    for (const struct of DECORATIVE_STRUCTURES) {
      this.drawDecorativeStructure(ctx, struct, isEvening);
    }

    // 8. Enterable Shops & Restaurants
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

    // 10. Walk Target Indicator
    if (state.player.walkTarget) {
      const pulse = 8 + Math.sin(this.animTime * 6) * 3;
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 11. Ambient Lisbon Locals
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

    // 12. Live Transit Vehicles (Tram 28E & Carris Bus)
    for (const vehicle of state.vehicles) {
      const playerAboard = state.ridingVehicleId === vehicle.id;
      this.drawTransitVehicle(ctx, vehicle, playerAboard, isEvening);
    }

    // 13. Player Character (when not riding inside a vehicle)
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

    // 14. Time-of-day atmospheric lighting wash
    this.drawTimeOfDayOverlay(ctx, phase);

    // 15. Mini-map HUD overlay inside top-right corner
    this.drawMiniMap(ctx, state);

    // 16. Floating Context Interaction Prompt at bottom-center
    if (nearbyInteraction) {
      this.drawInteractionBanner(ctx, nearbyInteraction);
    }
  }

  drawTagusWaterfront(ctx) {
    // Stone river promenade curb
    ctx.fillStyle = '#c8bfb0';
    ctx.fillRect(0, WATERFRONT_Y - 16, WORLD_WIDTH, 18);
    ctx.fillStyle = '#998f7f';
    ctx.fillRect(0, WATERFRONT_Y - 3, WORLD_WIDTH, 5);

    // Tagus estuary water
    const grad = ctx.createLinearGradient(0, WATERFRONT_Y, 0, WORLD_HEIGHT);
    grad.addColorStop(0, '#2a6f97');
    grad.addColorStop(0.55, '#1f5c82');
    grad.addColorStop(1, '#164666');
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

    // Sailboats gently bobbing on the Tagus
    const boats = [520, 1280, 1980];
    for (let i = 0; i < boats.length; i += 1) {
      const bx = boats[i] + Math.sin(this.animTime * 0.4 + i * 2) * 16;
      const by = WATERFRONT_Y + 78 + Math.cos(this.animTime * 1.2 + i) * 3;
      ctx.fillStyle = '#7b3e2b';
      ctx.beginPath();
      ctx.moveTo(bx - 18, by);
      ctx.lineTo(bx + 18, by);
      ctx.lineTo(bx + 12, by + 8);
      ctx.lineTo(bx - 12, by + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f8f5ef';
      ctx.beginPath();
      ctx.moveTo(bx - 2, by - 2);
      ctx.lineTo(bx - 2, by - 26);
      ctx.lineTo(bx + 14, by - 4);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle river label
    ctx.fillStyle = 'rgba(235, 246, 255, 0.55)';
    ctx.font = '600 13px "Segoe UI", sans-serif';
    ctx.fillText('RIO TEJO  -  TAGUS WATERFRONT', 1020, WATERFRONT_Y + 142);
  }

  drawTransitInfrastructure(ctx) {
    // Bus 737/758 loop lane centerlines
    const busLine = TRANSIT_LINES.find((l) => l.mode === 'bus');
    if (busLine) {
      ctx.save();
      ctx.strokeStyle = 'rgba(27, 122, 92, 0.48)';
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

    // Tram 28E twin steel rails along y = 610
    const tramY = 610;
    ctx.strokeStyle = 'rgba(84, 78, 70, 0.35)';
    ctx.lineWidth = 2;
    for (let tx = 200; tx <= 2200; tx += 18) {
      ctx.beginPath();
      ctx.moveTo(tx, tramY - 10);
      ctx.lineTo(tx, tramY + 10);
      ctx.stroke();
    }
    ctx.strokeStyle = '#5c6672';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(195, tramY - 7);
    ctx.lineTo(2205, tramY - 7);
    ctx.moveTo(195, tramY + 7);
    ctx.lineTo(2205, tramY + 7);
    ctx.stroke();
  }

  drawNeighborhoodSignage(ctx) {
    const markers = [
      { text: 'BAIRRO ALTO', x: 340, y: 362, color: '#8f3926' },
      { text: 'CHIADO  -  PRACA LUIS DE CAMOES', x: 960, y: 362, color: '#1b4d89' },
      { text: 'ALFAMA', x: 1950, y: 362, color: '#0f6a62' }
    ];
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (const m of markers) {
      const width = ctx.measureText(m.text).width + 20;
      drawRoundedRect(ctx, m.x - width / 2, m.y - 13, width, 20, 10);
      ctx.fillStyle = 'rgba(255, 252, 245, 0.84)';
      ctx.fill();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = m.color;
      ctx.fillText(m.text, m.x, m.y + 1);
    }
    ctx.textAlign = 'left';
  }

  drawTreesAndBenches(ctx, state) {
    // Decorative Lisbon jacaranda & olive trees
    const trees = [
      { x: 482, y: 125, c: '#7a5fa8' }, // Jacaranda purple
      { x: 545, y: 125, c: '#7a5fa8' },
      { x: 890, y: 490, c: '#3f7d52' },
      { x: 1010, y: 490, c: '#3f7d52' },
      { x: 2180, y: 490, c: '#4b8358' },
      { x: 740, y: 985, c: '#3f7d52' },
      { x: 1410, y: 985, c: '#7a5fa8' },
      { x: 2070, y: 985, c: '#3f7d52' }
    ];
    for (const t of trees) {
      ctx.fillStyle = 'rgba(30, 35, 40, 0.16)';
      ctx.beginPath();
      ctx.ellipse(t.x + 3, t.y + 8, 17, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6c4d35';
      ctx.fillRect(t.x - 3, t.y, 6, 10);

      ctx.fillStyle = t.c;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 6, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      ctx.arc(t.x - 4, t.y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Free Miradouro Rest Benches
    for (const spot of REST_SPOTS) {
      const captured = state.memories.some((m) => m.id === spot.memory.id);
      ctx.fillStyle = 'rgba(25, 30, 35, 0.18)';
      ctx.fillRect(spot.x - 20, spot.y - 6, 40, 16);

      ctx.fillStyle = '#8b5a34';
      drawRoundedRect(ctx, spot.x - 22, spot.y - 10, 44, 14, 3);
      ctx.fill();
      ctx.strokeStyle = '#57361e';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = '#4e5964';
      ctx.fillRect(spot.x - 18, spot.y + 4, 4, 5);
      ctx.fillRect(spot.x + 14, spot.y + 4, 4, 5);

      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = captured ? '#13795b' : '#4a3a2c';
      ctx.fillText(captured ? 'MIRADOURO [SAVED]' : 'MIRADOURO BENCH', spot.x, spot.y - 16);
      ctx.textAlign = 'left';
    }
  }

  drawDecorativeStructure(ctx, struct, isEvening) {
    // Ground shadow
    ctx.fillStyle = 'rgba(22, 28, 38, 0.16)';
    ctx.fillRect(struct.x + 6, struct.y + 8, struct.w, struct.h);

    if (struct.style === 'monument') {
      // Camoes statue pedestal
      ctx.fillStyle = '#dcd5c7';
      ctx.beginPath();
      ctx.arc(struct.x + struct.w / 2, struct.y + struct.h / 2, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8d8575';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = struct.wallColor;
      ctx.fillRect(struct.x + 8, struct.y + 8, struct.w - 16, struct.h - 16);
      ctx.fillStyle = '#4d5b54';
      ctx.beginPath();
      ctx.arc(struct.x + struct.w / 2, struct.y + struct.h / 2, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#334155';
      ctx.fillText('CAMOES', struct.x + struct.w / 2, struct.y - 8);
      ctx.textAlign = 'left';
      return;
    }

    // Wall + Terracotta roof
    ctx.fillStyle = struct.wallColor;
    ctx.fillRect(struct.x, struct.y, struct.w, struct.h);

    const roofH = Math.round(struct.h * 0.44);
    ctx.fillStyle = struct.roofColor;
    ctx.fillRect(struct.x - 3, struct.y - 3, struct.w + 6, roofH);

    // Roof tile ridges
    ctx.strokeStyle = 'rgba(255, 238, 220, 0.22)';
    ctx.lineWidth = 1;
    for (let rx = struct.x + 8; rx < struct.x + struct.w; rx += 14) {
      ctx.beginPath();
      ctx.moveTo(rx, struct.y - 2);
      ctx.lineTo(rx, struct.y + roofH - 3);
      ctx.stroke();
    }

    if (struct.style === 'cathedral') {
      // Twin bell towers + rose window for Se de Lisboa
      ctx.fillStyle = '#c8bfb0';
      ctx.fillRect(struct.x + 12, struct.y - 12, 42, 62);
      ctx.fillRect(struct.x + struct.w - 54, struct.y - 12, 42, 62);
      ctx.strokeStyle = struct.trimColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(struct.x + 12, struct.y - 12, 42, 62);
      ctx.strokeRect(struct.x + struct.w - 54, struct.y - 12, 42, 62);

      // Rose window
      ctx.fillStyle = isEvening ? '#f5cb5c' : '#355c7d';
      ctx.beginPath();
      ctx.arc(struct.x + struct.w / 2, struct.y + roofH + 26, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5c4f41';
      ctx.stroke();
    } else {
      // Townhouse windows
      const cols = Math.max(3, Math.floor((struct.w - 30) / 42));
      for (let i = 0; i < cols; i += 1) {
        const wx = struct.x + 20 + i * ((struct.w - 40) / cols);
        const wy = struct.y + roofH + 18;
        ctx.fillStyle = isEvening ? '#f6d479' : '#536b82';
        ctx.fillRect(wx, wy, 20, 28);
        ctx.strokeStyle = struct.trimColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wx, wy, 20, 28);
      }
    }

    ctx.strokeStyle = struct.trimColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(struct.x, struct.y, struct.w, struct.h);

    ctx.font = '600 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText(struct.label, struct.x + struct.w / 2, struct.y + 22);
    ctx.textAlign = 'left';
  }

  drawVenueBuilding(ctx, venue, visited, isHighlighted, isEvening) {
    // Shadow
    ctx.fillStyle = 'rgba(18, 26, 36, 0.22)';
    ctx.fillRect(venue.x + 7, venue.y + 9, venue.w, venue.h);

    // Highlight glow when player is near doorway
    if (isHighlighted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(venue.x - 4, venue.y - 4, venue.w + 8, venue.h + 8);
    }

    // Facade body
    ctx.fillStyle = venue.wallColor;
    ctx.fillRect(venue.x, venue.y, venue.w, venue.h);

    // Roof section
    const roofH = Math.round(venue.h * 0.42);
    if (venue.doorSide === 'south') {
      ctx.fillStyle = venue.roofColor;
      ctx.fillRect(venue.x - 3, venue.y - 3, venue.w + 6, roofH);
    } else {
      ctx.fillStyle = venue.roofColor;
      ctx.fillRect(venue.x - 3, venue.y + venue.h - roofH + 3, venue.w + 6, roofH);
    }

    // Azulejo / decorative facade stripe
    ctx.fillStyle = venue.accentColor;
    ctx.fillRect(venue.x, venue.y + (venue.doorSide === 'south' ? roofH - 3 : venue.h - roofH), venue.w, 5);

    // Illuminated windows
    const winY = venue.doorSide === 'south' ? venue.y + roofH + 16 : venue.y + 24;
    const winPositions = [venue.x + 18, venue.x + venue.w - 48];
    for (const wx of winPositions) {
      ctx.fillStyle = isEvening ? '#ffe28a' : '#7ba4c7';
      ctx.fillRect(wx, winY, 30, 26);
      ctx.strokeStyle = venue.awningColor;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(wx, winY, 30, 26);
    }

    // Doorway & striped awning
    const doorW = 34;
    const doorH = 30;
    const dx = venue.doorX - doorW / 2;
    const dy = venue.doorSide === 'south' ? venue.y + venue.h - doorH : venue.y;

    // Warm interior spill light at doorstep
    const pulse = 0.28 + Math.sin(this.animTime * 3.2) * 0.1;
    ctx.fillStyle = `rgba(255, 210, 102, ${isEvening ? 0.55 : pulse})`;
    ctx.beginPath();
    ctx.ellipse(
      venue.doorX,
      venue.doorSide === 'south' ? venue.doorY + 10 : venue.doorY - 10,
      26,
      11,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Door frame
    ctx.fillStyle = '#4e331f';
    ctx.fillRect(dx, dy, doorW, doorH);
    ctx.fillStyle = '#f8d27a';
    ctx.fillRect(dx + 5, dy + 4, doorW - 10, doorH - 8);

    // Striped shop awning
    const awningY = venue.doorSide === 'south' ? dy - 10 : dy + doorH;
    ctx.fillStyle = venue.awningColor;
    ctx.fillRect(dx - 8, awningY, doorW + 16, 10);
    ctx.fillStyle = '#fff8ee';
    for (let sx = dx - 4; sx < dx + doorW + 6; sx += 10) {
      ctx.fillRect(sx, awningY, 4, 10);
    }

    // Building border
    ctx.strokeStyle = 'rgba(25, 34, 46, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(venue.x, venue.y, venue.w, venue.h);

    // Signboard on roof
    const signY = venue.doorSide === 'south' ? venue.y + 24 : venue.y + venue.h - 24;
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(venue.name, venue.x + venue.w / 2, signY);

    ctx.font = '600 9.5px "Segoe UI", sans-serif';
    ctx.fillStyle = visited ? '#bbf7d0' : '#fde68a';
    ctx.fillText(
      visited ? `${venue.badge} VISITED` : `${venue.badge} ENTER`,
      venue.x + venue.w / 2,
      signY + 14
    );
    ctx.textAlign = 'left';
  }

  drawTransitStop(ctx, stop, isHighlighted, isEvening) {
    const px = stop.platformX;
    const py = stop.platformY;
    const isTram = stop.mode === 'tram';
    const postColor = isTram ? '#d9980c' : '#1b7a5c';

    // Waiting platform pad
    ctx.fillStyle = isHighlighted ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.45)';
    drawRoundedRect(ctx, px - 28, py - 14, 56, 26, 6);
    ctx.fill();
    ctx.strokeStyle = postColor;
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
    ctx.stroke();

    // Stop shelter sign pole
    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 18, py - 24, 3, 24);
    ctx.fillStyle = postColor;
    drawRoundedRect(ctx, px + 8, py - 34, 24, 14, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isTram ? '28E' : 'BUS', px + 20, py - 24);

    if (isEvening) {
      ctx.fillStyle = 'rgba(255, 232, 158, 0.22)';
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
    const len = isTram ? 68 : 74;
    const wid = isTram ? 28 : 30;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    drawRoundedRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 7);
    ctx.fill();

    // Evening headlight beam
    if (isEvening) {
      const beam = ctx.createLinearGradient(len / 2, 0, len / 2 + 65, 0);
      beam.addColorStop(0, 'rgba(255, 236, 153, 0.52)');
      beam.addColorStop(1, 'rgba(255, 236, 153, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(len / 2, -8);
      ctx.lineTo(len / 2 + 65, -24);
      ctx.lineTo(len / 2 + 65, 24);
      ctx.lineTo(len / 2, 8);
      ctx.closePath();
      ctx.fill();
    }

    // Vehicle body
    ctx.fillStyle = vehicle.color;
    drawRoundedRect(ctx, -len / 2, -wid / 2, len, wid, 7);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Roof stripe
    ctx.fillStyle = vehicle.trimColor;
    drawRoundedRect(ctx, -len / 2 + 8, -wid / 2 + 4, len - 16, wid - 8, 4);
    ctx.fill();

    // Windows along sides
    ctx.fillStyle = '#243b53';
    for (let wx = -len / 2 + 12; wx <= len / 2 - 20; wx += 13) {
      ctx.fillRect(wx, -wid / 2 + 1, 9, 3);
      ctx.fillRect(wx, wid / 2 - 4, 9, 3);
    }
    // Front windshield
    ctx.fillStyle = '#334e68';
    ctx.fillRect(len / 2 - 7, -wid / 2 + 5, 5, wid - 10);

    // Pantograph pole on Tram 28E
    if (isTram) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#475569';
      ctx.fill();
    }

    // Route number badge
    ctx.fillStyle = isTram ? '#1e293b' : '#124a38';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isTram ? '28E' : '737', isTram ? 12 : 0, 3.5);

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

    // Floating boarding badge when stopped
    if (vehicle.currentStopId) {
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(
        playerAboard ? 'ABOARD - AT STOP' : `${vehicle.badge} AT STOP`,
        vehicle.x,
        vehicle.y - 24
      );
      ctx.textAlign = 'left';
    }
  }

  drawCharacterSprite(ctx, x, y, opts) {
    const bob = opts.isMoving ? Math.sin(opts.walkPhase) * 2.5 : 0;
    const legSwing = opts.isMoving ? Math.sin(opts.walkPhase) * 4 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.beginPath();
    ctx.ellipse(x, y + 11, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots / feet
    ctx.fillStyle = '#3b2b22';
    ctx.beginPath();
    ctx.arc(x - 4, y + 8 + legSwing * 0.45, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 8 - legSwing * 0.45, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Backpack (for player)
    if (opts.isPlayer && opts.facing === 'up') {
      ctx.fillStyle = '#a3572a';
      drawRoundedRect(ctx, x - 7, y - 5 + bob, 14, 11, 3);
      ctx.fill();
    }

    // Tunic / Coat
    ctx.fillStyle = opts.tunicColor;
    drawRoundedRect(ctx, x - 8, y - 7 + bob, 16, 15, 5);
    ctx.fill();
    ctx.strokeStyle = '#182436';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Scarf
    ctx.fillStyle = opts.scarfColor;
    ctx.fillRect(x - 7, y - 6 + bob, 14, 4);

    // Head
    ctx.fillStyle = '#f2cfb2';
    ctx.beginPath();
    ctx.arc(x, y - 13 + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hair cap
    ctx.fillStyle = opts.hairColor;
    ctx.beginPath();
    ctx.arc(x, y - 15.5 + bob, 7.2, Math.PI, Math.PI * 2);
    ctx.fill();

    // Directional eyes
    ctx.fillStyle = '#1e293b';
    if (opts.facing === 'down') {
      ctx.fillRect(x - 3, y - 13 + bob, 2, 2);
      ctx.fillRect(x + 1.5, y - 13 + bob, 2, 2);
    } else if (opts.facing === 'left') {
      ctx.fillRect(x - 4.5, y - 13 + bob, 2, 2);
    } else if (opts.facing === 'right') {
      ctx.fillRect(x + 2.5, y - 13 + bob, 2, 2);
    }

    // Subtle player marker ring
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
    const mw = 178;
    const mh = 88;
    const mx = this.viewWidth - mw - 12;
    const my = 12;
    const sx = mw / WORLD_WIDTH;
    const sy = mh / WORLD_HEIGHT;

    ctx.save();
    drawRoundedRect(ctx, mx - 4, my - 4, mw + 8, mh + 22, 8);
    ctx.fillStyle = 'rgba(18, 31, 48, 0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Neighborhood bands
    for (const hood of NEIGHBORHOODS) {
      ctx.fillStyle = hood.groundTint;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(mx + hood.minX * sx, my, (hood.maxX - hood.minX) * sx, WATERFRONT_Y * sy);
    }
    ctx.globalAlpha = 1;

    // River strip
    ctx.fillStyle = '#256c94';
    ctx.fillRect(mx, my + WATERFRONT_Y * sy, mw, (WORLD_HEIGHT - WATERFRONT_Y) * sy);

    // Tram line
    ctx.strokeStyle = '#f3c623';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx + 220 * sx, my + 610 * sy);
    ctx.lineTo(mx + 2160 * sx, my + 610 * sy);
    ctx.stroke();

    // Venues
    for (const venue of VENUES) {
      const visited = state.visitedVenues.includes(venue.id);
      ctx.fillStyle = visited ? '#34d399' : '#fbbf24';
      ctx.fillRect(mx + venue.x * sx, my + venue.y * sy, Math.max(4, venue.w * sx), Math.max(4, venue.h * sy));
    }

    // Live vehicles
    for (const v of state.vehicles) {
      ctx.fillStyle = v.mode === 'tram' ? '#fde047' : '#34d399';
      ctx.beginPath();
      ctx.arc(mx + v.x * sx, my + v.y * sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // District labels below minimap
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 9px "Segoe UI", sans-serif';
    ctx.fillText('B. ALTO', mx + 8, my + mh + 12);
    ctx.fillText('CHIADO', mx + 68, my + mh + 12);
    ctx.fillText('ALFAMA', mx + 128, my + mh + 12);
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

    // Outer ambient backdrop
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

    // Upper back wall
    ctx.fillStyle = theme.wall;
    ctx.fillRect(6, 6, INTERIOR_WIDTH - 12, 134);
    ctx.fillStyle = theme.trim;
    ctx.fillRect(6, 132, INTERIOR_WIDTH - 12, 8);

    // Sunlit Lisbon windows on back wall
    const skyColor =
      phase.id === 'evening' ? '#1c2c4d' : phase.id === 'golden' ? '#e89a54' : '#8ec5e8';
    const winXs = [78, 578];
    for (const wx of winXs) {
      ctx.fillStyle = skyColor;
      ctx.fillRect(wx, 28, 104, 72);
      ctx.strokeStyle = theme.trim;
      ctx.lineWidth = 3;
      ctx.strokeRect(wx, 28, 104, 72);
      ctx.beginPath();
      ctx.moveTo(wx + 52, 28);
      ctx.lineTo(wx + 52, 100);
      ctx.moveTo(wx, 64);
      ctx.lineTo(wx + 104, 64);
      ctx.stroke();
    }

    // Room title plaque centered on back wall
    drawRoundedRect(ctx, 224, 24, 312, 46, 8);
    ctx.fillStyle = theme.trim;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(venue.name, 380, 46);
    ctx.fillStyle = '#fde68a';
    ctx.font = '600 10.5px "Segoe UI", sans-serif';
    ctx.fillText(`${venue.badge}  -  ${venue.memory.neighborhood.toUpperCase()}`, 380, 62);

    // Patterned tiled interior floor
    const tile = 32;
    for (let fy = 140; fy < INTERIOR_HEIGHT - 12; fy += tile) {
      for (let fx = 12; fx < INTERIOR_WIDTH - 12; fx += tile) {
        const alt = (Math.floor(fx / tile) + Math.floor(fy / tile)) % 2 === 0;
        ctx.fillStyle = alt ? theme.floorPrimary : theme.floorSecondary;
        ctx.fillRect(fx, fy, Math.min(tile, INTERIOR_WIDTH - 12 - fx), Math.min(tile, INTERIOR_HEIGHT - 12 - fy));
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
    ctx.fillStyle = '#1e293b';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(venue.proprietor, 380, 114);

    // Service counter (drawn in front of proprietor lower body)
    ctx.fillStyle = 'rgba(20, 20, 25, 0.2)';
    ctx.fillRect(236, 152, 294, 42);
    ctx.fillStyle = theme.counter;
    drawRoundedRect(ctx, 230, 142, 300, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#3d2514';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Counter props based on venue layout
    if (theme.layout === 'cafe') {
      // Brass espresso machine + pastry dome
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
      // Soup tureen / grilled dish platters
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
      // Boutique register & display parcels
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

    // Colored goods / books / tiles on left display shelf
    const swatchColors = ['#1b4d89', '#c98a18', '#b84a32', '#13795b'];
    for (let sy = 216; sy <= 298; sy += 26) {
      ctx.fillStyle = swatchColors[(sy / 26) % swatchColors.length | 0];
      ctx.fillRect(72, sy, 52, 15);
    }

    // Right-side tables or browsing crates
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

    // Walk target inside room
    if (state.player.walkTarget) {
      ctx.strokeStyle = '#1b4d89';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.walkTarget.x, state.player.walkTarget.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player character inside room
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
