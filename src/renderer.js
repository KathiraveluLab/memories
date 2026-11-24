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
} from './data.js';
import { getDayPhase, INTERIOR_STATIONS, METRO_PLATFORM_ZONES, FERRY_PIER_ZONES, computeFunicularCarPose } from './engine.js';
import { LisboaStreetView3DRenderer, buildCalcadaTextureData } from './streetview3d.js';
import { LisboaScenes3DRenderer } from './scenes3d.js';

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

import { overworld2dMethods } from './render/2d/overworld.js';
import { buildings2dMethods } from './render/2d/buildings.js';
import { interiors2dMethods } from './render/2d/interiors.js';
import { transitScenes2dMethods } from './render/2d/transitScenes.js';

export class LisboaCanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewWidth = canvas.width;
    this.viewHeight = canvas.height;
    this.camera = { x: 490, y: 270 };
    this.animTime = 0;
    this.patterns = this.createCobblePatterns();
    this.streetView = new LisboaStreetView3DRenderer(this.viewWidth, this.viewHeight);
    this.scenes3d = new LisboaScenes3DRenderer(this.viewWidth, this.viewHeight);
  }

  setStreetHover(canvasX, canvasY, state) {
    if (!state || state.viewMode !== 'street3d' || state.ridingVehicleId) {
      if (this.streetView) this.streetView.setHoverPoint(null, null, state);
      if (this.scenes3d) this.scenes3d.setHoverPoint(null, null, state);
      return;
    }
    if (state.mode === 'overworld') {
      if (this.streetView) this.streetView.setHoverPoint(canvasX, canvasY, state);
      if (this.scenes3d) this.scenes3d.setHoverPoint(null, null, state);
    } else {
      if (this.scenes3d) this.scenes3d.setHoverPoint(canvasX, canvasY, state);
      if (this.streetView) this.streetView.setHoverPoint(null, null, state);
    }
  }

  pickStreet3DTarget(canvasX, canvasY, state = null) {
    if (state && state.mode !== 'overworld') {
      return this.scenes3d ? this.scenes3d.pickTarget(canvasX, canvasY) : null;
    }
    return this.streetView ? this.streetView.pickInteractiveTarget(canvasX, canvasY) : null;
  }

  createCobblePatterns() {
    if (typeof document === 'undefined' || typeof this.ctx.createPattern !== 'function') {
      return { sidewalk: null, street: null, plaza: null };
    }

    const tex = buildCalcadaTextureData();
    const toPattern = (rgbaData, targetSize = 64) => {
      const src = document.createElement('canvas');
      src.width = tex.size;
      src.height = tex.size;
      const sctx = src.getContext('2d');
      const img = sctx.createImageData(tex.size, tex.size);
      img.data.set(rgbaData);
      sctx.putImageData(img, 0, 0);

      const tile = document.createElement('canvas');
      tile.width = targetSize;
      tile.height = targetSize;
      const tctx = tile.getContext('2d');
      tctx.imageSmoothingEnabled = true;
      tctx.drawImage(src, 0, 0, targetSize, targetSize);
      return this.ctx.createPattern(tile, 'repeat');
    };

    return {
      sidewalk: toPattern(tex.sidewalkMosaic, 56),
      street: toPattern(tex.lequeRoad, 56),
      plaza: toPattern(tex.marLargo, 64)
    };
  }

  screenToWorld(canvasX, canvasY, state) {
    if (
      state.mode === 'interior' ||
      state.mode === 'metro' ||
      state.mode === 'ferry' ||
      state.mode === 'city-district'
    ) {
      if (state.viewMode === 'street3d') {
        return this.scenes3d.screenToFloor(canvasX, canvasY, state);
      }
      const offsetX = (this.viewWidth - INTERIOR_WIDTH) / 2;
      const offsetY = (this.viewHeight - INTERIOR_HEIGHT) / 2;
      return {
        x: canvasX - offsetX,
        y: canvasY - offsetY
      };
    }
    if (state.mode === 'overworld' && !state.ridingVehicleId && state.viewMode === 'street3d') {
      return this.streetView.screenToGround(canvasX, canvasY, state);
    }
    return {
      x: canvasX + this.camera.x,
      y: canvasY + this.camera.y
    };
  }

  updateCamera(state) {
    const targetX = state.player.x - this.viewWidth / 2;
    const targetY = state.player.y - this.viewHeight / 2;
    const clampedX = clamp(targetX, WORLD_MIN_X, Math.max(WORLD_MIN_X, WORLD_MAX_X - this.viewWidth));
    const clampedY = clamp(targetY, WORLD_MIN_Y, Math.max(WORLD_MIN_Y, WORLD_HEIGHT - this.viewHeight));
    if (Math.hypot(clampedX - this.camera.x, clampedY - this.camera.y) > 420) {
      this.camera.x = clampedX;
      this.camera.y = clampedY;
    } else {
      this.camera.x += (clampedX - this.camera.x) * 0.16;
      this.camera.y += (clampedY - this.camera.y) * 0.16;
    }
  }

  render(state, nearbyInteraction, dtSeconds = 0.016) {
    this.animTime += dtSeconds;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    if (state.cityWalk?.active) {
      this.scenes3d.renderCityAvenueWalk3D(ctx, state, this.animTime);
      this.drawSharedOverlays(ctx, state);
      return;
    }

    if (state.mode === 'interior') {
      if (state.viewMode === 'street3d') {
        this.scenes3d.renderInterior3D(ctx, state, nearbyInteraction, this.animTime);
        if (nearbyInteraction) this.drawInteractionBanner(ctx, nearbyInteraction);
      } else {
        this.renderInterior(ctx, state, nearbyInteraction);
      }
    } else if (state.mode === 'metro') {
      if (state.viewMode === 'street3d') {
        this.scenes3d.renderMetro3D(ctx, state, nearbyInteraction, this.animTime);
        if (nearbyInteraction) this.drawInteractionBanner(ctx, nearbyInteraction);
      } else {
        this.renderMetro(ctx, state, nearbyInteraction);
      }
    } else if (state.mode === 'ferry') {
      if (state.viewMode === 'street3d') {
        this.scenes3d.renderFerry3D(ctx, state, nearbyInteraction, this.animTime);
        if (state.southBankFeedback) this.drawSouthBankFeedbackCard(ctx, state.southBankFeedback);
        if (nearbyInteraction) this.drawInteractionBanner(ctx, nearbyInteraction);
      } else {
        this.renderFerry(ctx, state, nearbyInteraction);
        if (state.southBankFeedback) this.drawSouthBankFeedbackCard(ctx, state.southBankFeedback);
      }
    } else if (state.mode === 'santa-justa') {
      if (state.viewMode === 'street3d') {
        this.scenes3d.renderSantaJusta3D(ctx, state, nearbyInteraction, this.animTime);
        if (nearbyInteraction && state.santaJusta?.phase !== 'miradouro') {
          this.drawInteractionBanner(ctx, nearbyInteraction);
        }
      } else {
        this.renderSantaJusta2D(ctx, state, nearbyInteraction);
      }
    } else if (state.mode === 'city-district') {
      if (state.viewMode === 'street3d') {
        this.scenes3d.renderCityDistrict3D(ctx, state, nearbyInteraction, this.animTime);
        if (state.cityDistrictFeedback) this.drawSouthBankFeedbackCard(ctx, state.cityDistrictFeedback);
        if (nearbyInteraction) this.drawInteractionBanner(ctx, nearbyInteraction);
      } else {
        this.renderCityDistrict(ctx, state, nearbyInteraction);
        if (state.cityDistrictFeedback) this.drawSouthBankFeedbackCard(ctx, state.cityDistrictFeedback);
      }
    } else if (state.ridingVehicleId) {
      const ridingVeh = state.vehicles.find((v) => v.id === state.ridingVehicleId);
      if (ridingVeh?.mode === 'tram') {
        this.renderTramInteriorView(ctx, state, nearbyInteraction);
      } else {
        this.renderBusInteriorView(ctx, state, nearbyInteraction);
      }
    } else if (state.viewMode === 'street3d') {
      this.streetView.render(ctx, state, nearbyInteraction, this.animTime);
      if (state.cityDistrictFeedback) this.drawSouthBankFeedbackCard(ctx, state.cityDistrictFeedback);
      if (nearbyInteraction) {
        this.drawInteractionBanner(ctx, nearbyInteraction);
      }
    } else {
      this.updateCamera(state);
      this.renderOverworld(ctx, state, nearbyInteraction);
      if (state.cityDistrictFeedback) this.drawSouthBankFeedbackCard(ctx, state.cityDistrictFeedback);
    }

    this.drawSharedOverlays(ctx, state);
  }

  drawSharedOverlays(ctx, state) {
    // 1. Synchronized Se de Lisboa (1147) Hourly Cathedral Bell-Tower Chime Banner
    if (state.cathedralChime) {
      ctx.save();
      const w = 590;
      const h = 44;
      const x = Math.round((this.viewWidth - w) / 2);
      const y = 70;
      drawRoundedRect(ctx, x, y, w, h, 8);
      ctx.fillStyle = 'rgba(28, 22, 14, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.font = '700 11.5px Georgia, serif';
      ctx.fillText(
        `SE DE LISBOA (1147) BELL TOWERS  |  ${state.cathedralChime.clockLabel || 'HOURLY CHIME'}`,
        this.viewWidth / 2,
        y + 18,
        w - 24
      );
      ctx.fillStyle = '#fef3c7';
      ctx.font = '600 10px "Segoe UI", sans-serif';
      ctx.fillText(state.cathedralChime.text, this.viewWidth / 2, y + 34, w - 24);
      ctx.restore();
    }

    // 2. Synchronized Shared Lisboa Postcard Photo Snapshot Viewfinder & Shutter Flash
    if (state.sharedPostcard) {
      const card = state.sharedPostcard;
      ctx.save();
      // Subtle vintage camera flash during the first 0.45s of capture
      if (card.timer > 4.35) {
        const flashAlpha = clamp((card.timer - 4.35) / 0.45, 0, 1) * 0.38;
        ctx.fillStyle = `rgba(255, 253, 240, ${flashAlpha})`;
        ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
      }

      // Vintage cream-and-gold Lisboa Postcard border corners
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.85)';
      ctx.lineWidth = 3;
      const m = 14;
      const cLen = 28;
      for (const [cx, cy, dx, dy] of [
        [m, m, 1, 1],
        [this.viewWidth - m, m, -1, 1],
        [m, this.viewHeight - m, 1, -1],
        [this.viewWidth - m, this.viewHeight - m, -1, -1]
      ]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cLen, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * cLen);
        ctx.stroke();
      }

      // Postcard stamp card at top-center
      const pw = 610;
      const ph = 52;
      const px = Math.round((this.viewWidth - pw) / 2);
      const py = state.cathedralChime ? 120 : 68;
      drawRoundedRect(ctx, px, py, pw, ph, 8);
      ctx.fillStyle = 'rgba(254, 252, 232, 0.95)';
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#78350f';
      ctx.font = '700 12px Georgia, serif';
      ctx.fillText(
        `SHARED LISBOA POSTCARD  -  ${(card.locationName || 'LISBOA').toUpperCase()} (Day ${card.day} ${card.clock})`,
        this.viewWidth / 2,
        py + 20,
        pw - 24
      );
      ctx.fillStyle = '#1e3a5f';
      ctx.font = '600 10.5px "Segoe UI", sans-serif';
      ctx.fillText(
        `"${card.caption}"  |  Photographer: ${card.photographer}`,
        this.viewWidth / 2,
        py + 39,
        pw - 24
      );
      ctx.restore();
    }

    // 3. Low-Energy / Low-Fullness Walk Speed Indicator Pill (when slowed down)
    if (!state.gameOver && !state.ridingVehicleId && state.walkSpeedMultiplier < 1) {
      ctx.save();
      const pct = Math.round((state.walkSpeedMultiplier || 1) * 100);
      const isCrit = Boolean(state.needsMealToRecoverSpeed);
      const text = isCrit
        ? `EXHAUSTED (${pct}% Walk Speed)  -  Eat a meal at a bakery or restaurant to recover!`
        : `TIRED / HUNGRY (${pct}% Walk Speed)  -  Energy ${Math.round(state.energy)} | Fullness ${Math.round(state.fullness)}`;
      ctx.font = '700 10.5px "Segoe UI", sans-serif';
      const tw = Math.min(this.viewWidth - 40, Math.max(320, ctx.measureText(text).width + 28));
      const tx = Math.round((this.viewWidth - tw) / 2);
      const ty = this.viewHeight - 96;
      drawRoundedRect(ctx, tx, ty, tw, 24, 6);
      ctx.fillStyle = isCrit ? 'rgba(153, 27, 27, 0.94)' : 'rgba(146, 64, 14, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.textAlign = 'center';
      ctx.fillText(text, this.viewWidth / 2, ty + 16, tw - 16);
      ctx.restore();
    }

    // 4. On-Canvas Game Over & Final Memories Scorecard Summary Banner (when Wallet reaches 0.00 EUR)
    if (state.gameOver && state.gameOverSummary) {
      const sum = state.gameOverSummary;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

      const bw = 640;
      const bh = 210;
      const bx = Math.round((this.viewWidth - bw) / 2);
      const by = Math.round((this.viewHeight - bh) / 2);
      drawRoundedRect(ctx, bx, by, bw, bh, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f87171';
      ctx.font = '700 18px Georgia, serif';
      ctx.fillText(sum.title, this.viewWidth / 2, by + 34, bw - 32);

      ctx.fillStyle = '#fde047';
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.fillText(
        `FINAL SCORE: ${sum.totalScore} PTS  |  RANK: ${sum.explorerRank}`,
        this.viewWidth / 2,
        by + 62,
        bw - 32
      );

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 12px "Segoe UI", sans-serif';
      ctx.fillText(
        `Memories Captured: ${sum.memoriesCaptured} / ${sum.memoriesTotal}   |   Venues Explored: ${sum.venuesVisited} / ${sum.venuesTotal}   |   Neighborhoods: ${sum.neighborhoodsVisited} / ${sum.neighborhoodsTotal}`,
        this.viewWidth / 2,
        by + 96,
        bw - 32
      );
      ctx.fillText(
        `Meals Tasted: ${sum.mealsEaten}   |   Keepsakes: ${sum.souvenirsBought}   |   Transit Rides: ${sum.transitRides.total}   |   Phrases: ${sum.phrasesLearned}`,
        this.viewWidth / 2,
        by + 122,
        bw - 32
      );
      ctx.fillStyle = '#93c5fd';
      ctx.font = '600 11px "Segoe UI", sans-serif';
      ctx.fillText(
        `Total Spent: ${sum.eurosSpent.toFixed(2)} EUR   |   Distance Walked: ${sum.distanceWalkedMeters} m   |   Postcards: ${sum.postcardsCaptured}`,
        this.viewWidth / 2,
        by + 148,
        bw - 32
      );
      ctx.fillStyle = '#fde68a';
      ctx.font = '700 11.5px Georgia, serif';
      ctx.fillText(
        'Review your complete Memories Scorecard popup or click "Start New Lisboa Stroll" to play again.',
        this.viewWidth / 2,
        by + 182,
        bw - 32
      );
      ctx.restore();
    }
  }

}

Object.assign(
  LisboaCanvasRenderer.prototype,
  overworld2dMethods,
  buildings2dMethods,
  interiors2dMethods,
  transitScenes2dMethods
);
