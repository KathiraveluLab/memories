// Core MemoriesGameEngine coordinator — composes modular engine subsystems from src/engine/*.js
export * from './engine/constants.js';

import { isBairroAltoPartyTime, getMonthInfo } from './data.js';
import { createInitialState, clamp, getDayPhase, formatClock, computeFunicularCarPose, recordLog } from './engine/constants.js';
import { multiplayerSyncMethods } from './engine/multiplayerSync.js';
import { movementMethods } from './engine/movement.js';
import { transitModeMethods } from './engine/transitModes.js';
import { interactionMethods } from './engine/interactions.js';

export class MemoriesGameEngine {
  constructor() {
    this.state = createInitialState();
    this.timeAccumulator = 0;
    this.doorEntryCooldown = 0;
    this.announcementSeq = 0;
    this.transitIntentSeq = 0;
    this.globalClockSynced = false;
    this.globalTransitSynced = false;
    this.serverMetro = null;
    this.serverFerries = null;
    this.signalSeq = 0;
    this.lastServerBellIds = new Map();
    this.lastLocalBellAt = 0;
    this.lastServerMetroChimeId = 0;
    this.lastLocalMetroChimeAt = 0;
    this.lastServerFerryHornIds = new Map();
    this.lastLocalFerryHornAt = 0;
    this.lastServerEncoreIds = new Map();
    this.lastLocalEncoreAt = 0;
    this.lastServerToastId = 0;
    this.lastLocalToastAt = 0;
    this.lastHourlyChimeKey = '1:9';
    this.lastServerCathedralChimeId = 0;
    this.lastLocalCathedralChimeAt = 0;
    this.lastServerPostcardId = 0;
    this.lastLocalPostcardAt = 0;
  }


  tick(dtSeconds, input = { x: 0, y: 0 }) {
    const dt = clamp(Number(dtSeconds) || 0, 0, 0.25);
    if (dt <= 0) return this.state;

    this.computeWalkSpeedMultiplier();
    this.checkWalletGameOver();

    if (this.doorEntryCooldown > 0) {
      this.doorEntryCooldown = Math.max(0, this.doorEntryCooldown - dt);
    }
    if (this.state.holdingConeTimer > 0) {
      this.state.holdingConeTimer = Math.max(0, this.state.holdingConeTimer - dt);
    }

    this.updateVehicles(dt);
    this.updateFuniculars(dt);
    this.updateNpcs(dt);
    this.updateJoggers(dt);
    this.updateRemotePlayers(dt);

    // Gentle real-time Lisbon clock progression (1 game minute per ~2.4s)
    this.timeAccumulator += dt;
    if (this.timeAccumulator >= 2.4) {
      const mins = Math.floor(this.timeAccumulator / 2.4);
      this.timeAccumulator -= mins * 2.4;
      this.advanceMinutes(mins);
    }

    if (this.state.metroDoorChime && this.state.metroDoorChime.timer > 0) {
      this.state.metroDoorChime.timer = Math.max(0, this.state.metroDoorChime.timer - dt);
      if (this.state.metroDoorChime.timer === 0) {
        this.state.metroDoorChime = null;
      }
    }

    if (this.state.ferryHornSignal && this.state.ferryHornSignal.timer > 0) {
      this.state.ferryHornSignal.timer = Math.max(0, this.state.ferryHornSignal.timer - dt);
      if (this.state.ferryHornSignal.timer === 0) {
        this.state.ferryHornSignal = null;
      }
    }

    if (this.state.miradouroEncore && this.state.miradouroEncore.timer > 0) {
      this.state.miradouroEncore.timer = Math.max(0, this.state.miradouroEncore.timer - dt);
      if (this.state.miradouroEncore.timer === 0) {
        this.state.miradouroEncore = null;
      }
    }

    if (this.state.sharedToast && this.state.sharedToast.timer > 0) {
      this.state.sharedToast.timer = Math.max(0, this.state.sharedToast.timer - dt);
      if (this.state.sharedToast.timer === 0) {
        this.state.sharedToast = null;
      }
    }

    if (this.state.cathedralChime && this.state.cathedralChime.timer > 0) {
      this.state.cathedralChime.timer = Math.max(0, this.state.cathedralChime.timer - dt);
      if (this.state.cathedralChime.timer === 0) {
        this.state.cathedralChime = null;
      }
    }

    if (this.state.sharedPostcard && this.state.sharedPostcard.timer > 0) {
      this.state.sharedPostcard.timer = Math.max(0, this.state.sharedPostcard.timer - dt);
      if (this.state.sharedPostcard.timer === 0) {
        this.state.sharedPostcard = null;
      }
    }

    if (this.state.indoorActivity && this.state.indoorActivity.timer > 0) {
      this.state.indoorActivity.timer = Math.max(0, this.state.indoorActivity.timer - dt);
      if (this.state.indoorActivity.timer === 0) {
        this.state.indoorActivity = null;
      }
    }

    if (this.state.cityDistrictFeedback && this.state.cityDistrictFeedback.timer > 0) {
      this.state.cityDistrictFeedback.timer = Math.max(0, this.state.cityDistrictFeedback.timer - dt);
      if (this.state.cityDistrictFeedback.timer === 0) {
        this.state.cityDistrictFeedback = null;
      }
    }

    if (
      (this.state.mode === 'interior' || this.state.mode === 'overworld' || this.state.mode === 'city-district') &&
      this.state.seatedDining
    ) {
      const sd = this.state.seatedDining;
      if (distance(this.state.player.x, this.state.player.y, sd.seatX, sd.seatY) > 34) {
        this.state.seatedDining = null;
      }
    }

    if (this.state.cityWalk?.active) {
      const cw = this.state.cityWalk;
      cw.progress = Math.min(1, cw.progress + dt / Math.max(0.5, cw.duration || CITY_AVENUE_WALK_DURATION));
      this.state.player.isMoving = true;
      this.state.player.walkPhase = (this.state.player.walkPhase + dt * 9.5) % (Math.PI * 2);
      if (cw.progress >= 1) {
        this.completeCityAvenueWalk();
      }
      return this.state;
    }

    if (this.state.mode === 'metro') {
      this.updateMetroSimulation(dt);
      if (this.state.mode === 'metro' && this.state.metro.phase === 'platform') {
        this.movePlayerByInput(input.x || 0, input.y || 0, dt);
      }
      return this.state;
    }

    if (this.state.mode === 'city-district') {
      if (this.state.cityDistrictFeedback && this.state.cityDistrictFeedback.timer > 0) {
        this.state.cityDistrictFeedback.timer = Math.max(0, this.state.cityDistrictFeedback.timer - dt);
        if (this.state.cityDistrictFeedback.timer === 0) {
          this.state.cityDistrictFeedback = null;
        }
      }
      this.movePlayerByInput(input.x || 0, input.y || 0, dt);
      return this.state;
    }

    if (this.state.mode === 'santa-justa') {
      this.updateSantaJustaSimulation(dt, input);
      return this.state;
    }

    if (this.state.mode === 'ferry') {
      if (this.state.southBankFeedback && this.state.southBankFeedback.timer > 0) {
        this.state.southBankFeedback.timer = Math.max(0, this.state.southBankFeedback.timer - dt);
        if (this.state.southBankFeedback.timer === 0) {
          this.state.southBankFeedback = null;
        }
      }
      this.updateFerrySimulation(dt);
      if (this.state.mode === 'ferry' && this.state.ferry.phase === 'terminal') {
        this.movePlayerByInput(input.x || 0, input.y || 0, dt);
      }
      return this.state;
    }

    if (this.state.transitAnnouncement && this.state.transitAnnouncement.timer > 0) {
      this.state.transitAnnouncement.timer = Math.max(0, this.state.transitAnnouncement.timer - dt);
      if (this.state.transitAnnouncement.timer === 0) {
        this.state.transitAnnouncement = null;
      }
    }

    if (this.state.ridingFunicularId) {
      const fun = (this.state.funiculars || []).find((f) => f.id === this.state.ridingFunicularId);
      if (fun) {
        const pose = computeFunicularCarPose(fun, this.state.ridingFunicularCarIndex || 0);
        this.state.player.x = pose.x;
        this.state.player.y = pose.y;
        this.state.player.overworldX = pose.x;
        this.state.player.overworldY = pose.y;
        this.state.player.isMoving = false;
        this.state.energy = clamp(this.state.energy + dt * 1.2, 0, 100);
        this.computeWalkSpeedMultiplier();
        this.updateNeighborhoodTracking();
        const reachedTop = this.state.ridingFunicularTargetEnd === 'upper' && pose.t >= 0.995;
        const reachedBottom = this.state.ridingFunicularTargetEnd === 'lower' && pose.t <= 0.005;
        if (reachedTop || reachedBottom) {
          this.disembarkFunicular();
        }
      }
    } else if (this.state.ridingVehicleId) {
      const vehicle = this.getRidingVehicle();
      if (vehicle) {
        if (!vehicle.yielding && vehicle.dwellRemaining <= 0) {
          if (vehicle.mode === 'bus') {
            this.state.busScrollOffset = (this.state.busScrollOffset + dt * 165) % 100000;
          } else if (vehicle.mode === 'tram') {
            this.state.tramScrollOffset = (this.state.tramScrollOffset + dt * 130) % 100000;
          }
        }
        this.state.player.x = vehicle.x;
        this.state.player.y = vehicle.y;
        this.state.player.overworldX = vehicle.x;
        this.state.player.overworldY = vehicle.y;
        this.state.player.isMoving = false;
        this.state.energy = clamp(this.state.energy + dt * 0.6, 0, 100);
        this.computeWalkSpeedMultiplier();
        this.updateNeighborhoodTracking();
      }
    } else {
      this.movePlayerByInput(input.x || 0, input.y || 0, dt);
      if (this.state.mode === 'overworld' && this.state.seatedBenchId && !this.state.player.isMoving) {
        this.state.energy = clamp(this.state.energy + dt * 4.5, 0, 100);
        this.computeWalkSpeedMultiplier();
      }
    }

    this.state.bairroAltoPartyActive = isBairroAltoPartyTime(this.state.minutesOfDay);
    this.checkGameOver();
    return this.state;
  }

}

Object.assign(
  MemoriesGameEngine.prototype,
  multiplayerSyncMethods,
  movementMethods,
  transitModeMethods,
  interactionMethods
);
