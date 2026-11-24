// Core LisboaStreetView3DRenderer — composes modular 3D street subsystems from src/render/street3d/*.js
export { buildCalcadaTextureData } from './render/street3d/constants.js';

import {
  WORLD_MIN_X,
  WORLD_MAX_X,
  WORLD_MIN_Y,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WATERFRONT_Y,
  getMonthInfo,
  isBairroAltoPartyTime
} from './data.js';
import { getDayPhase } from './engine.js';
import {
  ELEV_3D_SCALE, getTerrainElevation, ALL_STOPS, NEAR_Z, MAX_VIEW_DIST, FOV_DEG, EYE_HEIGHT, STREET_TREES, STREET_LAMPS, clamp, drawRoundedRect, parseHexRgb, shadeColor, getVenueHeight, getVenueWallBaseColor, getVenueTileMode, clipPolyNearZ, clipSegmentNearZ, rayBoxEntryDistance, getBoxViewOrdering, sortOccludersBackToFront, pointInPolygon2D, findNearestStreetName, CALCADA_TEX_SIZE, CALCADA_TEX_MASK, IS_LITTLE_ENDIAN, hash2DInt, buildCalcadaTextureData
} from './render/street3d/constants.js';
import { street3dPanoramaMethods } from './render/street3d/panorama.js';
import { street3dBuildingMethods } from './render/street3d/buildings.js';
import { street3dPropMethods } from './render/street3d/props.js';

export class LisboaStreetView3DRenderer {
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.focal = (viewWidth * 0.5) / Math.tan((FOV_DEG * Math.PI) / 360);
    this.hoverWorld = null;
    this.lastHitTargets = [];
    this.calcadaTex = buildCalcadaTextureData();
    this.groundCanvas = null;
    this.groundCtx = null;
    this.groundImg = null;
    this.groundU32 = null;
    this.groundH = 0;
  }

  buildCamera(state) {
    const player = state.player;
    const yaw = Number.isFinite(state.cameraYaw) ? state.cameraYaw : 0.08;
    const pitch = clamp(Number.isFinite(state.cameraPitch) ? state.cameraPitch : 0.03, -0.24, 0.34);
    const isSeated = Boolean(state.seatedBenchId);
    const isFunicular = Boolean(state.ridingFunicularId);
    const bob = !isSeated && !isFunicular && player.isMoving ? Math.sin(player.walkPhase * 2) * 1.15 : 0;
    const camX = player.x;
    const camY = player.y;
    const groundZ = getTerrainElevation(camX, camY);
    const eyeOffset = isFunicular ? 36 : isSeated ? 24.5 : EYE_HEIGHT;
    const camZ = groundZ + eyeOffset + bob;
    const fx = Math.cos(yaw);
    const fy = Math.sin(yaw);
    const rx = -fy;
    const ry = fx;
    const horizonY = this.viewHeight * 0.48 + pitch * this.focal * 0.65;
    return { camX, camY, camZ, groundZ, yaw, pitch, fx, fy, rx, ry, horizonY, isSeated, isFunicular };
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

  projectPolygon(cam, worldPts) {
    const camPts = worldPts.map((p) => this.toCam(cam, p[0], p[1], p[2]));
    const clipped = clipPolyNearZ(camPts);
    if (clipped.length < 3) return null;
    return clipped.map((p) => this.projectCamPt(cam, p));
  }

  drawPoly3D(ctx, cam, worldPts, fillStyle, strokeStyle = null, lineWidth = 1) {
    const screenPts = this.projectPolygon(cam, worldPts);
    if (!screenPts) return null;
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

  screenToGround(canvasX, canvasY, state) {
    const cam = this.buildCamera(state);
    const dy = canvasY - cam.horizonY;
    const colOff = (canvasX - this.viewWidth * 0.5) / this.focal;
    const rdx = cam.fx + cam.rx * colOff;
    const rdy = cam.fy + cam.ry * colOff;
    // Ray-march gently along the sloped Lisbon terrain heightfield so uphill/downhill clicks hit accurately
    let prevDiff = null;
    for (let cz = 14; cz <= 780; cz += 10) {
      const wx = cam.camX + rdx * cz;
      const wy = cam.camY + rdy * cz;
      if (wx < WORLD_MIN_X + 45 || wx > WORLD_MAX_X - 45 || wy < WORLD_MIN_Y + 12 || wy > WATERFRONT_Y - 22) continue;
      const gz = getTerrainElevation(wx, wy);
      const projY = cam.horizonY - ((gz - cam.camZ) * this.focal) / cz;
      const diff = projY - canvasY;
      if (prevDiff !== null && ((prevDiff >= 0 && diff <= 0) || Math.abs(diff) < 3)) {
        return { x: clamp(wx, WORLD_MIN_X + 55, WORLD_MAX_X - 55), y: clamp(wy, WORLD_MIN_Y + 18, WATERFRONT_Y - 26), cz };
      }
      prevDiff = diff;
    }
    if (dy <= 6) return null;
    const cz = ((cam.camZ - cam.groundZ) * this.focal) / dy;
    if (cz < 10 || cz > 780) return null;
    const cx = ((canvasX - this.viewWidth * 0.5) * cz) / this.focal;
    const wx = clamp(cam.camX + cam.fx * cz + cam.rx * cx, WORLD_MIN_X + 55, WORLD_MAX_X - 55);
    const wy = clamp(cam.camY + cam.fy * cz + cam.ry * cx, WORLD_MIN_Y + 18, WATERFRONT_Y - 26);
    return { x: wx, y: wy, cz };
  }

  pickInteractiveTarget(canvasX, canvasY) {
    // Iterate top-most (last drawn) clickable 3D building/metro/ferry hit targets first
    for (let i = this.lastHitTargets.length - 1; i >= 0; i -= 1) {
      const target = this.lastHitTargets[i];
      if (target.poly && pointInPolygon2D(canvasX, canvasY, target.poly)) {
        return target;
      }
    }
    return null;
  }

  setHoverPoint(canvasX, canvasY, state) {
    if (canvasX == null || canvasY == null) {
      this.hoverWorld = null;
      return;
    }
    this.hoverWorld = this.screenToGround(canvasX, canvasY, state);
  }

  render(ctx, state, nearbyInteraction, animTime = 0) {
    this.lastHitTargets = [];
    const cam = this.buildCamera(state);
    const phase = getDayPhase(state.minutesOfDay);
    const monthInfo = getMonthInfo(state.month);
    const isEvening = phase.id === 'evening';
    const isGolden = phase.id === 'golden';
    const lampsGlowing = isEvening || isGolden || monthInfo.rainIntensity >= 0.45 || monthInfo.decorStyle === 'christmas-lights';

    // 1. Sky dome, sun/moon & 360-degree Lisboa hills + Tagus River panorama (season & climate responsive)
    this.drawSkyAndPanorama(ctx, cam, phase, animTime, monthInfo);

    // 2. Ground plane: cobblestone terrain, Tagus water, streets, curbs, crosswalks & Tram 28E rails
    this.drawGroundAndStreets(ctx, cam, state, isEvening, animTime, monthInfo);

    // 3. Google Street View hover ground chevron & walk target ring on cobblestones
    this.drawGroundIndicators(ctx, cam, state, animTime);

    // 3b. Overhead Tram 28E & Funicular catenary wires (drawn before 3D buildings so buildings naturally occlude background wires!)
    this.drawOverheadTramWire(ctx, cam, isEvening);

    // 4. Collect all visible 3D buildings, landmarks, vehicles, trees, lamps, benches, stops, locals & LAN peers
    const occluders = this.collectOccluders(cam, state, nearbyInteraction, monthInfo);
    const sorted = sortOccludersBackToFront(occluders, cam.camX, cam.camY);

    // 5. Render back-to-front in exact topological order
    for (const item of sorted) {
      if (item.kind === 'venue') {
        this.drawVenue3D(ctx, cam, item.venue, item.visited, item.highlighted, isEvening, isGolden, animTime);
      } else if (item.kind === 'metro') {
        this.drawMetro3D(ctx, cam, item.station, item.highlighted, isEvening);
      } else if (item.kind === 'ferry') {
        this.drawFerryTerminal3D(ctx, cam, item.highlighted, isEvening);
      } else if (item.kind === 'santa-justa') {
        this.drawSantaJustaTower3D(ctx, cam, item.highlighted, isEvening, animTime);
      } else if (item.kind === 'city-district-spot') {
        this.drawCityDistrictSpot3D(ctx, cam, item.spot, item.highlighted, isEvening, animTime, state);
      } else if (item.kind === 'monument') {
        this.drawCamoesMonument3D(ctx, cam, item.struct, isEvening, animTime, item.highlighted);
      } else if (item.kind === 'vehicle') {
        this.drawTransitVehicle3D(ctx, cam, item.vehicle, isEvening);
      } else if (item.kind === 'funicular-car') {
        this.drawFunicularCar3D(ctx, cam, item.funicular, item.carIndex, item.pose, isEvening);
      } else if (item.kind === 'funicular-station') {
        this.drawFunicularStation3D(ctx, cam, item.funicular, item.station, item.fromEnd, item.highlighted, isEvening);
      } else if (item.kind === 'tree') {
        this.drawTree3D(ctx, cam, item.tree, isEvening, monthInfo);
      } else if (item.kind === 'lamp') {
        this.drawStreetlamp3D(ctx, cam, item.lamp, isEvening, lampsGlowing);
      } else if (item.kind === 'bench') {
        this.drawBench3D(ctx, cam, item.spot, item.captured, isEvening);
      } else if (item.kind === 'riverside-bench') {
        this.drawRiversideBench3D(ctx, cam, item.bench, item.highlighted, item.isSeated, isEvening);
      } else if (item.kind === 'stop') {
        this.drawTransitStop3D(ctx, cam, item.stop, item.highlighted, isEvening);
      } else if (item.kind === 'seasonal-prop') {
        this.drawSeasonalProp3D(ctx, cam, item.prop, isEvening, animTime, item.highlighted);
      } else if (item.kind === 'decor-arch') {
        this.drawSeasonalDecorArch3D(ctx, cam, item.arch, monthInfo, isEvening, animTime);
      } else if (item.kind === 'bairro-party-arch') {
        this.drawBairroPartyLights3D(ctx, cam, item.arch, isEvening || isGolden, animTime);
      } else if (item.kind === 'jogger') {
        this.drawJogger3D(ctx, cam, item.jogger, isEvening);
      } else if (item.kind === 'person') {
        this.drawPerson3D(ctx, cam, item.person, isEvening, monthInfo, animTime);
      }
    }

    // 7. Weather atmosphere overlay (Atlantic rain streaks, summer sunbeams, drifting blossoms/confetti/autumn leaves)
    this.drawWeatherAtmosphere3D(ctx, cam, monthInfo, phase, animTime);

    // 7b. First-person steaming paper cone of Castanhas Assadas while enjoying roasted chestnuts!
    if ((state.holdingConeTimer || 0) > 0) {
      this.drawHeldCastanhaCone3D(ctx, state.holdingConeTimer, animTime, isEvening);
    }

    // 8. Crisp Google Street View style HUD: street address, month/weather/event badge & live radar mini-map
    this.drawStreetViewHud(ctx, cam, state, monthInfo);
  }

}

Object.assign(
  LisboaStreetView3DRenderer.prototype,
  street3dPanoramaMethods,
  street3dBuildingMethods,
  street3dPropMethods
);
