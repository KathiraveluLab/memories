import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  PLAYER_OUTFITS,
  MULTIPLAYER_SPAWN_POINTS,
  TRANSIT_LINES,
  METRO_STATIONS,
  FERRY_TERMINAL,
  FERRY_DESTINATIONS,
  REST_SPOTS,
  AMBIENT_NPCS
} from './src/data.js';
import { isPointOnSidewalk } from './src/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
};

function isPrivateLanIpv4(address) {
  if (address.startsWith('192.168.')) return 3;
  if (address.startsWith('10.')) return 2;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return 2;
  if (address.startsWith('169.254.')) return 0;
  return 1;
}

export function getLanUrls(port) {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const entries of Object.values(interfaces)) {
    if (!Array.isArray(entries)) continue;
    for (const info of entries) {
      if (info.family === 'IPv4' && !info.internal) {
        candidates.push({
          address: info.address,
          priority: isPrivateLanIpv4(info.address)
        });
      }
    }
  }
  candidates.sort((a, b) => b.priority - a.priority || a.address.localeCompare(b.address));
  const uniqueAddresses = [...new Set(candidates.map((c) => c.address))];
  return uniqueAddresses.map((ip) => `http://${ip}:${port}`);
}

function sanitizeText(value, fallback, maxLen = 28) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\r\n\t<>]/g, '').trim().slice(0, maxLen);
  return cleaned || fallback;
}

function readJsonBody(req, maxBytes = 16384) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

export function createMultiplayerServer({
  rootDir = __dirname,
  host = '0.0.0.0',
  port = 3000,
  staleTimeoutMs = 25000,
  clockMsPerMinute = 2400,
  initialMinutesOfDay = 9 * 60,
  transitTickMs = 100
} = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const players = new Map();
  const sseClients = new Map();
  let nextSlotNumber = 1;
  let boundPort = port;
  let cleanupTimer = null;
  let keepaliveTimer = null;
  let clockTimer = null;
  let transitTimer = null;

  const worldClock = {
    day: 1,
    minutesOfDay: ((Math.floor(initialMinutesOfDay) % 1440) + 1440) % 1440,
    msPerGameMinute: Math.max(50, Number(clockMsPerMinute) || 2400),
    updatedAt: Date.now()
  };

  function getNextWaypointStep(line, currentIndex, direction) {
    const len = line.waypoints.length;
    if (line.loopType === 'cycle') {
      return { nextIndex: (currentIndex + 1) % len, nextDirection: 1 };
    }
    let nextIdx = currentIndex + direction;
    let nextDir = direction;
    if (nextIdx >= len) {
      nextDir = -1;
      nextIdx = len - 2;
    } else if (nextIdx < 0) {
      nextDir = 1;
      nextIdx = 1;
    }
    return { nextIndex: nextIdx, nextDirection: nextDir };
  }

  function findNextStopName(line, fromIndex, direction) {
    const len = line.waypoints.length;
    let idx = fromIndex;
    let dir = direction;
    for (let s = 0; s < len * 2; s += 1) {
      const step = getNextWaypointStep(line, idx, dir);
      idx = step.nextIndex;
      dir = step.nextDirection;
      const wp = line.waypoints[idx];
      if (wp && wp.stopName) return wp.stopName;
    }
    return line.name;
  }

  // Authoritative server-owned Tram 28E & Carris Bus 737/758 simulation
  let bellAnnouncementSeq = 0;
  let ferryHornSeq = 0;
  let metroChimeSeq = 0;
  let miradouroEncoreSeq = 0;
  let cafeToastSeq = 0;
  let cathedralChimeSeq = 0;
  let postcardSeq = 0;
  let sharedFadoTrackIndex = 0;
  let sharedCafeToast = null;
  let sharedCathedralChime = null;
  let sharedPostcardSnapshot = null;
  let lastChimedHourKey = `${worldClock.day}:${Math.floor(worldClock.minutesOfDay / 60)}`;

  function triggerServerCathedralChime(hourInput = null, triggeredBy = 'Se de Lisboa (1147)') {
    const rawHour = Number.isFinite(hourInput)
      ? ((Math.floor(hourInput) % 24) + 24) % 24
      : Math.floor(worldClock.minutesOfDay / 60);
    const clockLabel = `${String(rawHour).padStart(2, '0')}:00`;
    const tolls = ((rawHour + 11) % 12) + 1;
    cathedralChimeSeq += 1;
    lastChimedHourKey = `${worldClock.day}:${rawHour}`;
    sharedCathedralChime = {
      id: cathedralChimeSeq,
      day: worldClock.day,
      hour: rawHour,
      clockLabel,
      tolls,
      triggeredBy: sanitizeText(triggeredBy, 'Se de Lisboa (1147)', 28),
      text: `Se de Lisboa (1147) Bell Towers toll ${tolls} ${tolls === 1 ? 'chime' : 'chimes'} for ${clockLabel} across Lisboa`,
      expiresAt: Date.now() + 5500
    };
    return sharedCathedralChime;
  }
  const sharedMiradouros = REST_SPOTS.map((spot) => ({
    spotId: spot.id,
    spotName: spot.name,
    neighborhood: spot.neighborhood,
    musicianName: spot.musicianName || 'Musico de Lisboa',
    instrument: spot.instrument || 'Guitarra Portuguesa',
    songs: Array.isArray(spot.songs) && spot.songs.length > 0 ? spot.songs : ['Serenata de Lisboa'],
    songIndex: 0,
    songTitle: (Array.isArray(spot.songs) && spot.songs[0]) || 'Serenata de Lisboa',
    lastEncore: null
  }));
  const transitVehicles = TRANSIT_LINES.map((line, i) => {
    const startIdx = i === 0 ? 1 : 2;
    const wp = line.waypoints[startIdx];
    const nextStep = getNextWaypointStep(line, startIdx, 1);
    const nextWp = line.waypoints[nextStep.nextIndex];
    return {
      id: line.id,
      mode: line.mode,
      x: wp.x,
      y: wp.y,
      heading: Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x),
      waypointIndex: startIdx,
      direction: 1,
      dwellRemaining: wp.stopId ? 2.5 : 0,
      yielding: false,
      currentStopId: wp.stopId || null,
      currentStopName: wp.stopName || null,
      nextStopName: findNextStopName(line, startIdx, 1),
      scrollOffset: 0,
      stopBellRung: false,
      bellAnnouncement: null
    };
  });

  // Authoritative server-owned Metropolitano de Lisboa (Linha Azul) shuttle train
  const metroOrder = METRO_STATIONS.map((s) => s.id);
  const sharedMetro = {
    phase: 'docked', // 'docked' | 'riding'
    stationId: metroOrder[0],
    fromStationId: metroOrder[0],
    toStationId: metroOrder[1] || metroOrder[0],
    direction: 1,
    progress: 0,
    rideDuration: 3.0,
    dwellRemaining: 4.5,
    trainX: 380,
    doorChime: null
  };

  // Authoritative server-owned Transtejo Tagus Catamaran fleet (Cacilhas, Seixal, Montijo)
  const sharedFerries = FERRY_DESTINATIONS.map((dest) => ({
    routeId: dest.id,
    phase: 'docked', // 'docked' | 'sailing'
    portId: FERRY_TERMINAL.id,
    fromPortId: FERRY_TERMINAL.id,
    toPortId: dest.id,
    progress: 0,
    sailDuration: dest.sailDurationSec || 4.5,
    dwellRemaining: 6.0,
    hornSignal: null
  }));

  function triggerServerMetroDoorChime(fromStationId, toStationId, triggeredBy = 'Metropolitano de Lisboa') {
    const dest = METRO_STATIONS.find((s) => s.id === toStationId);
    const destName = dest ? dest.name.replace('Metro ', '') : 'Linha Azul';
    metroChimeSeq += 1;
    sharedMetro.doorChime = {
      id: metroChimeSeq,
      stationId: fromStationId || sharedMetro.stationId,
      toStationId: toStationId || sharedMetro.toStationId,
      triggeredBy: sanitizeText(triggeredBy, 'Metropolitano de Lisboa', 24),
      text: `Atencao as portas - Doors closing for ${destName}`,
      expiresAt: Date.now() + 3600
    };
    return sharedMetro.doorChime;
  }

  function triggerServerFerryHorn(ferry, fromPortId, toPortId, triggeredBy = 'Transtejo Captain') {
    const destInfo = FERRY_DESTINATIONS.find((d) => d.id === toPortId);
    const toName =
      toPortId === FERRY_TERMINAL.id
        ? FERRY_TERMINAL.shortName
        : (destInfo?.shortName || destInfo?.name || 'Tagus South Bank');
    ferryHornSeq += 1;
    ferry.hornSignal = {
      id: ferryHornSeq,
      routeId: ferry.routeId,
      fromPortId: fromPortId || ferry.fromPortId,
      toPortId: toPortId || ferry.toPortId,
      triggeredBy: sanitizeText(triggeredBy, 'Transtejo Captain', 24),
      text: `Transtejo Foghorn - Sailing toward ${toName}`,
      expiresAt: Date.now() + 3800
    };
    return ferry.hornSignal;
  }

  // Authoritative server-owned Ambient Lisboa Villagers patrolling strictly on sidewalks
  const sharedNpcs = AMBIENT_NPCS.map((npc) => ({
    ...npc,
    homeX: npc.x,
    homeY: npc.y,
    dir: 1,
    walkPhase: 0,
    isMoving: true,
    avoidSide: 0
  }));

  function getServerSidewalkSpanY(x, refY) {
    const base = Math.round(refY);
    let minY = base;
    let maxY = base;
    while (minY > base - 50 && isPointOnSidewalk(x, minY - 1)) minY -= 1;
    while (maxY < base + 50 && isPointOnSidewalk(x, maxY + 1)) maxY += 1;
    return { minY, maxY };
  }

  function stepServerNpcs(dt) {
    const passClearance = 17.0;
    const preferredGap = 24.0;
    const lookahead = 54.0;
    const clampVal = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    for (const npc of sharedNpcs) {
      const step = npc.speed * dt;
      const pedestrians = [];
      for (const p of players.values()) {
        if (p.mode === 'overworld' && !p.ridingVehicleId) {
          pedestrians.push({ x: p.x, y: p.y });
        }
      }
      for (const other of sharedNpcs) {
        if (other.id !== npc.id) pedestrians.push({ x: other.x, y: other.y });
      }

      const isClear = (cx, cy, minSep) => {
        if (!isPointOnSidewalk(cx, cy)) return false;
        for (const p of pedestrians) {
          const nextD = Math.hypot(cx - p.x, cy - p.y);
          if (nextD < minSep) {
            const curD = Math.hypot(npc.x - p.x, npc.y - p.y);
            if (curD < minSep && nextD > curD + 0.05) continue;
            return false;
          }
        }
        return true;
      };

      if (npc.x >= npc.max && npc.dir > 0) npc.dir = -1;
      else if (npc.x <= npc.min && npc.dir < 0) npc.dir = 1;

      let blocker = null;
      let bestAlong = Infinity;
      for (const p of pedestrians) {
        const along = (p.x - npc.x) * npc.dir;
        if (along > -20 && along < lookahead && Math.abs(p.y - npc.y) < preferredGap - 1) {
          if (along < bestAlong) {
            bestAlong = along;
            blocker = p;
          }
        }
      }

      if (blocker) {
        const curSpan = getServerSidewalkSpanY(npc.x, npc.y);
        const passSpan = getServerSidewalkSpanY(clampVal(blocker.x, npc.min, npc.max), npc.y);
        const sMin = Math.max(curSpan.minY, passSpan.minY);
        const sMax = Math.min(curSpan.maxY, passSpan.maxY);
        const useMin = sMax - sMin >= passClearance ? sMin : curSpan.minY;
        const useMax = sMax - sMin >= passClearance ? sMax : curSpan.maxY;
        const spaceUp = blocker.y - useMin;
        const spaceDown = useMax - blocker.y;
        if (!npc.avoidSide) npc.avoidSide = spaceDown >= spaceUp ? 1 : -1;
        else if (npc.avoidSide === 1 && spaceDown < passClearance && spaceUp >= passClearance) npc.avoidSide = -1;
        else if (npc.avoidSide === -1 && spaceUp < passClearance && spaceDown >= passClearance) npc.avoidSide = 1;

        const desiredY = npc.avoidSide > 0
          ? Math.min(useMax, blocker.y + preferredGap)
          : Math.max(useMin, blocker.y - preferredGap);
        const dyNeed = desiredY - npc.y;
        const latMove = Math.sign(dyNeed) * Math.min(Math.abs(dyNeed), Math.max(step * 1.65, 2.2));
        const nextY = clampVal(npc.y + latMove, useMin, useMax);
        const nextX = clampVal(npc.x + step * npc.dir, npc.min, npc.max);
        const halfX = clampVal(npc.x + step * 0.55 * npc.dir, npc.min, npc.max);

        let moved = false;
        for (const c of [{ x: nextX, y: nextY }, { x: halfX, y: nextY }, { x: npc.x, y: nextY }, { x: nextX, y: npc.y }]) {
          if (isClear(c.x, c.y, passClearance)) {
            npc.x = c.x;
            npc.y = c.y;
            npc.isMoving = true;
            npc.walkPhase = (npc.walkPhase + dt * 4.6) % (Math.PI * 2);
            moved = true;
            break;
          }
        }
        if (!moved) npc.isMoving = false;
        continue;
      }

      npc.avoidSide = 0;
      const targetX = clampVal(npc.x + step * npc.dir, npc.min, npc.max);
      let targetY = npc.y;
      const homeDy = npc.homeY - npc.y;
      if (Math.abs(homeDy) > 0.4) {
        const driftY = npc.y + clampVal(homeDy, -step * 0.8, step * 0.8);
        if (isClear(targetX, driftY, preferredGap)) targetY = driftY;
      }
      if (isClear(targetX, targetY, passClearance)) {
        npc.x = targetX;
        npc.y = targetY;
        npc.isMoving = true;
        npc.walkPhase = (npc.walkPhase + dt * 4.6) % (Math.PI * 2);
        if (npc.x >= npc.max) npc.dir = -1;
        else if (npc.x <= npc.min) npc.dir = 1;
      } else {
        npc.isMoving = false;
      }
    }
  }

  function shouldServerVehicleYield(vehicle, nextHeading) {
    const cos = Math.cos(nextHeading);
    const sin = Math.sin(nextHeading);
    for (const p of players.values()) {
      if (p.mode !== 'overworld' || p.ridingVehicleId) continue;
      const dx = p.x - vehicle.x;
      const dy = p.y - vehicle.y;
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      if (localX > -51 && localX < 114 && Math.abs(localY) < 33) {
        return true;
      }
    }
    return false;
  }

  function stepServerTransit(dt) {
    const nowMs = Date.now();
    // 1. Surface Tram 28E & Carris Bus 737/758
    for (const vehicle of transitVehicles) {
      if (vehicle.bellAnnouncement && nowMs >= vehicle.bellAnnouncement.expiresAt) {
        vehicle.bellAnnouncement = null;
      }
      const line = TRANSIT_LINES.find((l) => l.id === vehicle.id);
      if (!line) continue;
      if (vehicle.dwellRemaining > 0) {
        vehicle.yielding = false;
        vehicle.dwellRemaining = Math.max(0, vehicle.dwellRemaining - dt);
        continue;
      }
      const step = getNextWaypointStep(line, vehicle.waypointIndex, vehicle.direction);
      const targetWp = line.waypoints[step.nextIndex];
      const dx = targetWp.x - vehicle.x;
      const dy = targetWp.y - vehicle.y;
      const dist = Math.hypot(dx, dy);
      const nextHeading = dist > 0.001 ? Math.atan2(dy, dx) : vehicle.heading;
      if (shouldServerVehicleYield(vehicle, nextHeading)) {
        vehicle.yielding = true;
        continue;
      }
      vehicle.yielding = false;
      const moveDist = line.speedPxPerSec * dt;
      vehicle.scrollOffset = (vehicle.scrollOffset + dt * (vehicle.mode === 'bus' ? 165 : 130)) % 100000;
      vehicle.currentStopId = null;
      vehicle.currentStopName = null;
      vehicle.heading = nextHeading;
      if (dist <= moveDist) {
        vehicle.x = targetWp.x;
        vehicle.y = targetWp.y;
        vehicle.waypointIndex = step.nextIndex;
        vehicle.direction = step.nextDirection;
        vehicle.nextStopName = findNextStopName(line, vehicle.waypointIndex, vehicle.direction);
        if (targetWp.stopId) {
          vehicle.currentStopId = targetWp.stopId;
          vehicle.currentStopName = targetWp.stopName;
          vehicle.dwellRemaining = line.dwellSeconds;
          vehicle.stopBellRung = false;
        }
      } else {
        vehicle.x += (dx / dist) * moveDist;
        vehicle.y += (dy / dist) * moveDist;
      }
    }

    // 2. Shared Underground Metro Linha Azul Train
    if (sharedMetro.doorChime && nowMs >= sharedMetro.doorChime.expiresAt) {
      sharedMetro.doorChime = null;
    }
    if (sharedMetro.phase === 'docked') {
      sharedMetro.trainX = 380;
      sharedMetro.dwellRemaining = Math.max(0, sharedMetro.dwellRemaining - dt);
      if (sharedMetro.dwellRemaining <= 0) {
        const curIdx = Math.max(0, metroOrder.indexOf(sharedMetro.stationId));
        let nextIdx = curIdx + sharedMetro.direction;
        if (nextIdx >= metroOrder.length || nextIdx < 0) {
          sharedMetro.direction *= -1;
          nextIdx = curIdx + sharedMetro.direction;
        }
        sharedMetro.fromStationId = sharedMetro.stationId;
        sharedMetro.toStationId = metroOrder[nextIdx] || metroOrder[0];
        sharedMetro.phase = 'riding';
        sharedMetro.progress = 0;
        sharedMetro.rideDuration = 3.0;
        triggerServerMetroDoorChime(sharedMetro.fromStationId, sharedMetro.toStationId, 'Linha Azul');
      }
    } else if (sharedMetro.phase === 'riding') {
      sharedMetro.progress = Math.min(1, sharedMetro.progress + dt / Math.max(1.2, sharedMetro.rideDuration));
      const p = sharedMetro.progress;
      const dir = sharedMetro.direction || 1;
      if (p < 0.16) {
        const k = p / 0.16;
        sharedMetro.trainX = 380 + dir * k * k * 560;
      } else if (p < 0.84) {
        sharedMetro.trainX = 380;
      } else {
        const k = (p - 0.84) / 0.16;
        const ease = 1 - Math.pow(1 - k, 3);
        sharedMetro.stationId = sharedMetro.toStationId;
        sharedMetro.trainX = 380 - dir * (1 - ease) * 560;
      }
      if (sharedMetro.progress >= 1) {
        sharedMetro.stationId = sharedMetro.toStationId;
        sharedMetro.phase = 'docked';
        sharedMetro.progress = 0;
        sharedMetro.dwellRemaining = 4.5;
        sharedMetro.trainX = 380;
      }
    }

    // 3. Shared Transtejo Tagus Catamaran Fleet
    for (const ferry of sharedFerries) {
      if (ferry.hornSignal && nowMs >= ferry.hornSignal.expiresAt) {
        ferry.hornSignal = null;
      }
      if (ferry.phase === 'docked') {
        ferry.dwellRemaining = Math.max(0, ferry.dwellRemaining - dt);
        if (ferry.dwellRemaining <= 0) {
          const nextPort = ferry.portId === FERRY_TERMINAL.id ? ferry.routeId : FERRY_TERMINAL.id;
          ferry.fromPortId = ferry.portId;
          ferry.toPortId = nextPort;
          ferry.phase = 'sailing';
          ferry.progress = 0;
          triggerServerFerryHorn(ferry, ferry.fromPortId, ferry.toPortId, 'Transtejo Captain');
        }
      } else if (ferry.phase === 'sailing') {
        ferry.progress = Math.min(1, ferry.progress + dt / Math.max(1.5, ferry.sailDuration));
        if (ferry.progress >= 1) {
          ferry.portId = ferry.toPortId;
          ferry.phase = 'docked';
          ferry.progress = 0;
          ferry.dwellRemaining = 6.0;
        }
      }
    }

    // 4. Shared Miradouro Street-Musician Encores & Cafe Toast Expirations
    for (const m of sharedMiradouros) {
      if (m.lastEncore && nowMs >= m.lastEncore.expiresAt) {
        m.lastEncore = null;
      }
    }
    if (sharedCafeToast && nowMs >= sharedCafeToast.expiresAt) {
      sharedCafeToast = null;
    }
    if (sharedCathedralChime && nowMs >= sharedCathedralChime.expiresAt) {
      sharedCathedralChime = null;
    }
    if (sharedPostcardSnapshot && nowMs >= sharedPostcardSnapshot.expiresAt) {
      sharedPostcardSnapshot = null;
    }

    // 5. Shared Ambient Lisboa Sidewalk Villagers
    stepServerNpcs(dt);
  }

  function getTransitSnapshot() {
    return {
      vehicles: transitVehicles.map((v) => ({
        id: v.id,
        mode: v.mode,
        x: Math.round(v.x * 10) / 10,
        y: Math.round(v.y * 10) / 10,
        heading: Math.round(v.heading * 1000) / 1000,
        waypointIndex: v.waypointIndex,
        direction: v.direction,
        dwellRemaining: Math.round(v.dwellRemaining * 100) / 100,
        yielding: v.yielding,
        currentStopId: v.currentStopId,
        currentStopName: v.currentStopName,
        nextStopName: v.nextStopName,
        scrollOffset: Math.round((v.scrollOffset || 0) * 10) / 10,
        stopBellRung: Boolean(v.stopBellRung),
        bellAnnouncement: v.bellAnnouncement
          ? {
              id: v.bellAnnouncement.id,
              lineId: v.bellAnnouncement.lineId,
              vehicleMode: v.bellAnnouncement.vehicleMode,
              stopName: v.bellAnnouncement.stopName,
              text: v.bellAnnouncement.text,
              ringerName: v.bellAnnouncement.ringerName
            }
          : null
      })),
      fadoTrackIndex: sharedFadoTrackIndex,
      metro: {
        phase: sharedMetro.phase,
        stationId: sharedMetro.stationId,
        fromStationId: sharedMetro.fromStationId,
        toStationId: sharedMetro.toStationId,
        direction: sharedMetro.direction,
        progress: Math.round(sharedMetro.progress * 1000) / 1000,
        rideDuration: sharedMetro.rideDuration,
        dwellRemaining: Math.round(sharedMetro.dwellRemaining * 100) / 100,
        trainX: Math.round(sharedMetro.trainX * 10) / 10,
        doorChime: sharedMetro.doorChime
          ? {
              id: sharedMetro.doorChime.id,
              stationId: sharedMetro.doorChime.stationId,
              toStationId: sharedMetro.doorChime.toStationId,
              triggeredBy: sharedMetro.doorChime.triggeredBy,
              text: sharedMetro.doorChime.text
            }
          : null
      },
      ferries: sharedFerries.map((f) => ({
        routeId: f.routeId,
        phase: f.phase,
        portId: f.portId,
        fromPortId: f.fromPortId,
        toPortId: f.toPortId,
        progress: Math.round(f.progress * 1000) / 1000,
        sailDuration: f.sailDuration,
        dwellRemaining: Math.round(f.dwellRemaining * 100) / 100,
        hornSignal: f.hornSignal
          ? {
              id: f.hornSignal.id,
              routeId: f.hornSignal.routeId,
              fromPortId: f.hornSignal.fromPortId,
              toPortId: f.hornSignal.toPortId,
              triggeredBy: f.hornSignal.triggeredBy,
              text: f.hornSignal.text
            }
          : null
      })),
      npcs: sharedNpcs.map((n) => ({
        id: n.id,
        x: Math.round(n.x * 10) / 10,
        y: Math.round(n.y * 10) / 10,
        dir: n.dir,
        walkPhase: Math.round(n.walkPhase * 100) / 100,
        isMoving: n.isMoving
      })),
      miradouros: sharedMiradouros.map((m) => ({
        spotId: m.spotId,
        spotName: m.spotName,
        neighborhood: m.neighborhood,
        musicianName: m.musicianName,
        instrument: m.instrument,
        songIndex: m.songIndex,
        songTitle: m.songTitle,
        lastEncore: m.lastEncore
          ? {
              id: m.lastEncore.id,
              spotId: m.lastEncore.spotId,
              spotName: m.lastEncore.spotName,
              neighborhood: m.lastEncore.neighborhood,
              musicianName: m.lastEncore.musicianName,
              instrument: m.lastEncore.instrument,
              songIndex: m.lastEncore.songIndex,
              songTitle: m.lastEncore.songTitle,
              requestedBy: m.lastEncore.requestedBy,
              text: m.lastEncore.text
            }
          : null
      })),
      cafeToast: sharedCafeToast
        ? {
            id: sharedCafeToast.id,
            locationKey: sharedCafeToast.locationKey,
            locationName: sharedCafeToast.locationName,
            speakerName: sharedCafeToast.speakerName,
            itemName: sharedCafeToast.itemName,
            text: sharedCafeToast.text
          }
        : null,
      cathedralChime: sharedCathedralChime
        ? {
            id: sharedCathedralChime.id,
            day: sharedCathedralChime.day,
            hour: sharedCathedralChime.hour,
            clockLabel: sharedCathedralChime.clockLabel,
            tolls: sharedCathedralChime.tolls,
            triggeredBy: sharedCathedralChime.triggeredBy,
            text: sharedCathedralChime.text
          }
        : null,
      sharedPostcard: sharedPostcardSnapshot
        ? {
            id: sharedPostcardSnapshot.id,
            locationKey: sharedPostcardSnapshot.locationKey,
            locationName: sharedPostcardSnapshot.locationName,
            neighborhood: sharedPostcardSnapshot.neighborhood,
            photographer: sharedPostcardSnapshot.photographer,
            companions: sharedPostcardSnapshot.companions,
            day: sharedPostcardSnapshot.day,
            clock: sharedPostcardSnapshot.clock,
            caption: sharedPostcardSnapshot.caption
          }
        : null
    };
  }

  function broadcastTransit(reason = 'tick') {
    const clock = getWorldClockSnapshot();
    const payload = JSON.stringify({
      type: 'transit',
      reason,
      serverTime: clock.serverTime,
      clock,
      transit: getTransitSnapshot()
    });
    const frame = `event: transit\ndata: ${payload}\n\n`;
    for (const [clientId, res] of sseClients.entries()) {
      try {
        res.write(frame);
      } catch {
        sseClients.delete(clientId);
      }
    }
  }

  function getWorldClockSnapshot(now = Date.now()) {
    const elapsedMins = Math.floor(Math.max(0, now - worldClock.updatedAt) / worldClock.msPerGameMinute);
    if (elapsedMins > 0) {
      const total = worldClock.minutesOfDay + elapsedMins;
      worldClock.day += Math.floor(total / 1440);
      worldClock.minutesOfDay = ((total % 1440) + 1440) % 1440;
      worldClock.updatedAt += elapsedMins * worldClock.msPerGameMinute;
      const curHour = Math.floor(worldClock.minutesOfDay / 60);
      const hourKey = `${worldClock.day}:${curHour}`;
      if (hourKey !== lastChimedHourKey) {
        triggerServerCathedralChime(curHour, 'Se de Lisboa (1147)');
      }
    }
    return {
      day: worldClock.day,
      minutesOfDay: worldClock.minutesOfDay,
      msPerGameMinute: worldClock.msPerGameMinute,
      serverTime: now
    };
  }

  function advanceGlobalClockToMorning() {
    getWorldClockSnapshot();
    worldClock.day += 1;
    worldClock.minutesOfDay = 9 * 60;
    worldClock.updatedAt = Date.now();
    triggerServerCathedralChime(9, 'Se de Lisboa (1147)');
    return getWorldClockSnapshot();
  }

  function pickDistinctOutfit(preferredId) {
    const used = new Set([...players.values()].map((p) => p.outfitId));
    if (preferredId && PLAYER_OUTFITS.some((o) => o.id === preferredId) && !used.has(preferredId)) {
      return preferredId;
    }
    for (const outfit of PLAYER_OUTFITS) {
      if (!used.has(outfit.id)) {
        return outfit.id;
      }
    }
    return PLAYER_OUTFITS[players.size % PLAYER_OUTFITS.length].id;
  }

  function pickSpawnPoint() {
    const usedSlots = new Set([...players.values()].map((p) => p.spawnIndex));
    for (let i = 0; i < MULTIPLAYER_SPAWN_POINTS.length; i += 1) {
      if (!usedSlots.has(i)) {
        return { index: i, ...MULTIPLAYER_SPAWN_POINTS[i] };
      }
    }
    const idx = players.size % MULTIPLAYER_SPAWN_POINTS.length;
    return { index: idx, ...MULTIPLAYER_SPAWN_POINTS[idx] };
  }

  function serializePlayers() {
    return [...players.values()].map((p) => ({
      id: p.id,
      slot: p.slot,
      name: p.name,
      outfitId: p.outfitId,
      x: p.x,
      y: p.y,
      facing: p.facing,
      walkPhase: p.walkPhase,
      isMoving: p.isMoving,
      mode: p.mode,
      currentVenueId: p.currentVenueId,
      metroStationId: p.metroStationId,
      metroPhase: p.metroPhase,
      ferryPortId: p.ferryPortId || null,
      ferryPhase: p.ferryPhase || null,
      ridingVehicleId: p.ridingVehicleId,
      neighborhoodName: p.neighborhoodName,
      emoteText: p.emoteText
    }));
  }

  function broadcastPlayers(reason = 'update') {
    const clock = getWorldClockSnapshot();
    const payload = JSON.stringify({
      type: 'players',
      reason,
      serverTime: clock.serverTime,
      clock,
      players: serializePlayers()
    });
    const frame = `event: players\ndata: ${payload}\n\n`;
    for (const [clientId, res] of sseClients.entries()) {
      try {
        res.write(frame);
      } catch {
        sseClients.delete(clientId);
      }
    }
  }

  function removePlayer(playerId, reason = 'leave') {
    const existed = players.delete(playerId);
    const sse = sseClients.get(playerId);
    if (sse) {
      sseClients.delete(playerId);
      try {
        sse.end();
      } catch {
        // Ignore already-closed stream
      }
    }
    if (existed) {
      broadcastPlayers(reason);
    }
    return existed;
  }

  function serveStaticFile(reqPath, res) {
    const cleanPath = reqPath === '/' ? '/index.html' : reqPath;
    let decoded;
    try {
      decoded = decodeURIComponent(cleanPath);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    const relative = decoded.replace(/^\/+/, '');
    const fullPath = path.resolve(resolvedRoot, relative);
    if (fullPath !== resolvedRoot && !fullPath.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=60'
    });
    fs.createReadStream(fullPath).pipe(res);
  }

  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const pathname = urlObj.pathname;

    if (req.method === 'GET' && pathname === '/api/info') {
      sendJson(res, 200, {
        ok: true,
        multiplayer: true,
        port: boundPort,
        lanUrls: getLanUrls(boundPort),
        playerCount: players.size,
        clock: getWorldClockSnapshot(),
        transit: getTransitSnapshot(),
        outfits: PLAYER_OUTFITS.map((o) => ({ id: o.id, name: o.name }))
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/join') {
      try {
        const body = await readJsonBody(req);
        const slot = nextSlotNumber;
        nextSlotNumber += 1;

        const id = crypto.randomUUID();
        const outfitId = pickDistinctOutfit(body.preferredOutfitId);
        const spawn = pickSpawnPoint();
        const name = sanitizeText(body.name, `Traveler ${slot}`, 22);

        const record = {
          id,
          slot,
          spawnIndex: spawn.index,
          name,
          outfitId,
          x: spawn.x,
          y: spawn.y,
          facing: 'down',
          walkPhase: 0,
          isMoving: false,
          mode: 'overworld',
          currentVenueId: null,
          metroStationId: null,
          metroPhase: null,
          ferryPortId: null,
          ferryPhase: null,
          ridingVehicleId: null,
          neighborhoodName: 'Chiado',
          emoteText: '',
          lastSeen: Date.now()
        };
        players.set(id, record);
        broadcastPlayers('join');

        sendJson(res, 200, {
          ok: true,
          player: serializePlayers().find((p) => p.id === id),
          players: serializePlayers(),
          clock: getWorldClockSnapshot(),
          transit: getTransitSnapshot(),
          lanUrls: getLanUrls(boundPort)
        });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    if (req.method === 'GET' && pathname === '/api/events') {
      const playerId = urlObj.searchParams.get('playerId') || `observer-${crypto.randomUUID()}`;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      const previous = sseClients.get(playerId);
      if (previous && previous !== res) {
        try {
          previous.end();
        } catch {
          // Ignore
        }
      }
      sseClients.set(playerId, res);

      const snapClock = getWorldClockSnapshot();
      const snapshot = JSON.stringify({
        type: 'players',
        reason: 'snapshot',
        serverTime: snapClock.serverTime,
        clock: snapClock,
        transit: getTransitSnapshot(),
        players: serializePlayers()
      });
      res.write(`event: players\ndata: ${snapshot}\n\n`);

      req.on('close', () => {
        if (sseClients.get(playerId) === res) {
          sseClients.delete(playerId);
          if (players.has(playerId)) {
            removePlayer(playerId, 'disconnect');
          }
        }
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/sync') {
      try {
        const body = await readJsonBody(req);
        const playerId = body.playerId;
        const record = players.get(playerId);
        if (!record) {
          sendJson(res, 404, { ok: false, error: 'Unknown player session.' });
          return;
        }

        const st = body.state && typeof body.state === 'object' ? body.state : body;
        if (Number.isFinite(st.x)) record.x = Math.round(st.x * 10) / 10;
        if (Number.isFinite(st.y)) record.y = Math.round(st.y * 10) / 10;
        if (['up', 'down', 'left', 'right'].includes(st.facing)) record.facing = st.facing;
        if (Number.isFinite(st.walkPhase)) record.walkPhase = st.walkPhase;
        if (typeof st.isMoving === 'boolean') record.isMoving = st.isMoving;
        if (['overworld', 'interior', 'metro', 'ferry'].includes(st.mode)) record.mode = st.mode;
        if (st.currentVenueId === null || typeof st.currentVenueId === 'string') {
          record.currentVenueId = st.currentVenueId;
        }
        if (st.metroStationId === null || typeof st.metroStationId === 'string') {
          record.metroStationId = st.metroStationId;
        }
        if (st.metroPhase === null || typeof st.metroPhase === 'string') {
          record.metroPhase = st.metroPhase;
        }
        if (st.ferryPortId === null || typeof st.ferryPortId === 'string') {
          record.ferryPortId = st.ferryPortId;
        }
        if (st.ferryPhase === null || typeof st.ferryPhase === 'string') {
          record.ferryPhase = st.ferryPhase;
        }
        if (st.ridingVehicleId === null || typeof st.ridingVehicleId === 'string') {
          record.ridingVehicleId = st.ridingVehicleId;
        }
        if (typeof st.neighborhoodName === 'string') {
          record.neighborhoodName = sanitizeText(st.neighborhoodName, record.neighborhoodName, 32);
        }
        if (typeof st.outfitId === 'string' && PLAYER_OUTFITS.some((o) => o.id === st.outfitId)) {
          record.outfitId = st.outfitId;
        }
        if (typeof st.name === 'string') {
          record.name = sanitizeText(st.name, record.name, 22);
        }
        if (typeof st.emoteText === 'string') {
          record.emoteText = sanitizeText(st.emoteText, '', 36);
        }
        record.lastSeen = Date.now();

        broadcastPlayers('sync');
        sendJson(res, 200, { ok: true, playerCount: players.size, clock: getWorldClockSnapshot() });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/clock') {
      try {
        const body = await readJsonBody(req);
        if (body.action === 'rest-morning') {
          const clock = advanceGlobalClockToMorning();
          broadcastPlayers('clock-morning');
          sendJson(res, 200, { ok: true, clock });
          return;
        }
        if (Number.isFinite(body.minutesOfDay)) {
          worldClock.minutesOfDay = ((Math.floor(body.minutesOfDay) % 1440) + 1440) % 1440;
          if (Number.isFinite(body.day) && body.day >= 1) worldClock.day = Math.floor(body.day);
          worldClock.updatedAt = Date.now();
          const curHour = Math.floor(worldClock.minutesOfDay / 60);
          const hourKey = `${worldClock.day}:${curHour}`;
          if (worldClock.minutesOfDay % 60 === 0 || hourKey !== lastChimedHourKey) {
            triggerServerCathedralChime(curHour, 'Se de Lisboa (1147)');
            broadcastTransit('cathedral-chime');
          }
          const clock = getWorldClockSnapshot();
          broadcastPlayers('clock-set');
          sendJson(res, 200, { ok: true, clock, cathedralChime: sharedCathedralChime });
          return;
        }
        sendJson(res, 200, { ok: true, clock: getWorldClockSnapshot() });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/transit') {
      try {
        const body = await readJsonBody(req);
        const requesterId = body.playerId || null;

        if (body.action === 'summon-surface') {
          const line = TRANSIT_LINES.find((l) => l.id === body.lineId);
          const vehicle = transitVehicles.find((v) => v.id === body.lineId);
          const stopIdx = line ? line.waypoints.findIndex((w) => w.stopId === body.stopId) : -1;
          if (!line || !vehicle || stopIdx === -1) {
            sendJson(res, 404, { ok: false, error: 'Unknown surface transit stop.' });
            return;
          }
          const companionAboard = [...players.values()].some(
            (p) => p.id !== requesterId && p.ridingVehicleId === vehicle.id
          );
          if (!companionAboard && vehicle.currentStopId !== body.stopId) {
            const wp = line.waypoints[stopIdx];
            vehicle.x = wp.x;
            vehicle.y = wp.y;
            vehicle.waypointIndex = stopIdx;
            vehicle.currentStopId = wp.stopId;
            vehicle.currentStopName = wp.stopName;
            vehicle.dwellRemaining = line.dwellSeconds;
            vehicle.yielding = false;
            vehicle.nextStopName = findNextStopName(line, stopIdx, vehicle.direction);
            broadcastTransit('summon-surface');
          }
          sendJson(res, 200, { ok: true, companionAboard, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'metro-depart') {
          const origin = METRO_STATIONS.find((s) => s.id === body.fromStationId);
          const dest = METRO_STATIONS.find((s) => s.id === body.toStationId);
          if (!origin || !dest || origin.id === dest.id) {
            sendJson(res, 400, { ok: false, error: 'Invalid Metro route.' });
            return;
          }
          const triggeredBy =
            body.triggeredBy || players.get(requesterId)?.name || 'Linha Azul Passenger';
          const companionRiding = [...players.values()].some(
            (p) => p.id !== requesterId && p.mode === 'metro' && p.metroPhase === 'riding'
          );
          if (!companionRiding || (sharedMetro.fromStationId === origin.id && sharedMetro.toStationId === dest.id)) {
            const hops = Math.max(1, Math.abs((dest.order ?? 0) - (origin.order ?? 0)));
            sharedMetro.fromStationId = origin.id;
            sharedMetro.toStationId = dest.id;
            sharedMetro.stationId = origin.id;
            sharedMetro.direction = (dest.order ?? 0) >= (origin.order ?? 0) ? 1 : -1;
            sharedMetro.rideDuration = 3.0 + (hops - 1) * 1.2;
            if (sharedMetro.phase !== 'riding') {
              sharedMetro.phase = 'riding';
              sharedMetro.progress = 0;
            }
            triggerServerMetroDoorChime(origin.id, dest.id, triggeredBy);
            broadcastTransit('metro-depart');
          }
          sendJson(res, 200, { ok: true, doorChime: sharedMetro.doorChime, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'metro-chime') {
          const fromId = body.fromStationId || sharedMetro.fromStationId || sharedMetro.stationId;
          const toId = body.toStationId || sharedMetro.toStationId || sharedMetro.stationId;
          const triggeredBy =
            body.triggeredBy || players.get(requesterId)?.name || 'Linha Azul Passenger';
          const chime = triggerServerMetroDoorChime(fromId, toId, triggeredBy);
          broadcastTransit('metro-chime');
          sendJson(res, 200, { ok: true, doorChime: chime, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'ferry-board') {
          const ferry = sharedFerries.find((f) => f.routeId === body.routeId);
          if (!ferry) {
            sendJson(res, 404, { ok: false, error: 'Unknown Transtejo ferry route.' });
            return;
          }
          const fromPort = body.fromPortId || ferry.portId;
          const toPort = body.toPortId || (fromPort === FERRY_TERMINAL.id ? ferry.routeId : FERRY_TERMINAL.id);
          const triggeredBy =
            body.triggeredBy || players.get(requesterId)?.name || 'Transtejo Passenger';
          const companionSailingOtherWay = [...players.values()].some(
            (p) =>
              p.id !== requesterId &&
              p.mode === 'ferry' &&
              p.ferryPhase === 'sailing' &&
              ferry.phase === 'sailing' &&
              ferry.toPortId !== toPort
          );
          if (!companionSailingOtherWay) {
            if (!(ferry.phase === 'sailing' && ferry.toPortId === toPort)) {
              ferry.fromPortId = fromPort;
              ferry.toPortId = toPort;
              ferry.portId = fromPort;
              ferry.phase = 'sailing';
              ferry.progress = 0;
            }
            triggerServerFerryHorn(ferry, fromPort, toPort, triggeredBy);
            broadcastTransit('ferry-board');
          }
          sendJson(res, 200, { ok: true, hornSignal: ferry.hornSignal, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'ferry-horn') {
          const ferry =
            sharedFerries.find((f) => f.routeId === body.routeId) ||
            sharedFerries.find((f) => f.toPortId === body.toPortId) ||
            sharedFerries[0];
          if (!ferry) {
            sendJson(res, 404, { ok: false, error: 'Unknown Transtejo ferry route for horn signal.' });
            return;
          }
          const fromPort = body.fromPortId || ferry.fromPortId || ferry.portId;
          const toPort = body.toPortId || ferry.toPortId || ferry.routeId;
          const triggeredBy =
            body.triggeredBy || players.get(requesterId)?.name || 'Transtejo Passenger';
          const signal = triggerServerFerryHorn(ferry, fromPort, toPort, triggeredBy);
          broadcastTransit('ferry-horn');
          sendJson(res, 200, { ok: true, hornSignal: signal, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'ring-bell') {
          const line = TRANSIT_LINES.find((l) => l.id === body.lineId);
          const vehicle = transitVehicles.find((v) => v.id === body.lineId);
          if (!line || !vehicle) {
            sendJson(res, 404, { ok: false, error: 'Unknown transit vehicle for stop bell.' });
            return;
          }
          const cleanStop = sanitizeText(
            String(body.stopName || vehicle.nextStopName || 'Next Stop').split(' (')[0],
            'Next Stop',
            44
          );
          const ringerName = sanitizeText(
            body.ringerName || players.get(requesterId)?.name || 'Passenger',
            'Passenger',
            22
          );
          bellAnnouncementSeq += 1;
          vehicle.stopBellRung = true;
          vehicle.bellAnnouncement = {
            id: bellAnnouncementSeq,
            lineId: vehicle.id,
            vehicleMode: line.mode,
            stopName: cleanStop,
            text: `Proxima Paragem: ${cleanStop}`,
            ringerName,
            expiresAt: Date.now() + 5500
          };
          broadcastTransit('ring-bell');
          sendJson(res, 200, { ok: true, announcement: vehicle.bellAnnouncement, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'next-fado') {
          sharedFadoTrackIndex = (sharedFadoTrackIndex + 1) % 3;
          broadcastTransit('fado-track');
          sendJson(res, 200, { ok: true, fadoTrackIndex: sharedFadoTrackIndex, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'miradouro-perform') {
          const m = sharedMiradouros.find((entry) => entry.spotId === body.spotId) || sharedMiradouros[0];
          if (!m) {
            sendJson(res, 404, { ok: false, error: 'Unknown miradouro viewpoint.' });
            return;
          }
          m.songIndex = (m.songIndex + 1) % m.songs.length;
          m.songTitle = m.songs[m.songIndex];
          const requestedBy = sanitizeText(
            body.requestedBy || players.get(requesterId)?.name || 'Traveler',
            'Traveler',
            22
          );
          miradouroEncoreSeq += 1;
          m.lastEncore = {
            id: miradouroEncoreSeq,
            spotId: m.spotId,
            spotName: m.spotName,
            neighborhood: m.neighborhood,
            musicianName: m.musicianName,
            instrument: m.instrument,
            songIndex: m.songIndex,
            songTitle: m.songTitle,
            requestedBy,
            text: `${m.musicianName} (${m.instrument}) performs "${m.songTitle}" at ${m.spotName}`,
            expiresAt: Date.now() + 5800
          };
          broadcastTransit('miradouro-perform');
          sendJson(res, 200, { ok: true, encore: m.lastEncore, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'cafe-toast') {
          const speakerName = sanitizeText(
            body.speakerName || players.get(requesterId)?.name || 'Traveler',
            'Traveler',
            22
          );
          const locationKey = sanitizeText(body.locationKey, 'venue:cafe-do-poeta', 48);
          const locationName = sanitizeText(body.locationName, 'Cafe A Brasileira', 44);
          const itemName = sanitizeText(body.itemName || '', '', 44);
          const text = sanitizeText(
            body.text ||
              (itemName
                ? `Saude! Raising a toast with ${itemName} at ${locationName}!`
                : `Saude! Um brinde a Lisboa at ${locationName}!`),
            `Saude! Um brinde a Lisboa at ${locationName}!`,
            96
          );
          cafeToastSeq += 1;
          sharedCafeToast = {
            id: cafeToastSeq,
            locationKey,
            locationName,
            speakerName,
            itemName,
            text,
            expiresAt: Date.now() + 5200
          };
          const record = players.get(requesterId);
          if (record) {
            record.emoteText = 'Saude!';
            record.lastSeen = Date.now();
            broadcastPlayers('toast');
          }
          broadcastTransit('cafe-toast');
          sendJson(res, 200, { ok: true, cafeToast: sharedCafeToast, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'cathedral-chime') {
          const triggeredBy = sanitizeText(
            body.triggeredBy || players.get(requesterId)?.name || 'Se de Lisboa (1147)',
            'Se de Lisboa (1147)',
            28
          );
          const hour = Number.isFinite(body.hour)
            ? body.hour
            : Math.floor(getWorldClockSnapshot().minutesOfDay / 60);
          const chime = triggerServerCathedralChime(hour, triggeredBy);
          broadcastTransit('cathedral-chime');
          sendJson(res, 200, { ok: true, cathedralChime: chime, transit: getTransitSnapshot() });
          return;
        }

        if (body.action === 'shared-postcard') {
          const photographer = sanitizeText(
            body.photographer || players.get(requesterId)?.name || 'Traveler',
            'Traveler',
            22
          );
          const locationKey = sanitizeText(body.locationKey, 'overworld:chiado', 48);
          const locationName = sanitizeText(body.locationName, 'Praca Luis de Camoes', 48);
          const neighborhood = sanitizeText(body.neighborhood, 'Chiado', 32);
          const rawCompanions = Array.isArray(body.companions)
            ? body.companions.map((c) => sanitizeText(String(c), '', 22)).filter(Boolean)
            : [photographer];
          const companions = rawCompanions.length > 0 ? rawCompanions.slice(0, 6) : [photographer];
          const clockSnap = getWorldClockSnapshot();
          const hh = String(Math.floor(clockSnap.minutesOfDay / 60)).padStart(2, '0');
          const mm = String(clockSnap.minutesOfDay % 60).padStart(2, '0');
          const clockStr = sanitizeText(body.clock || `${hh}:${mm}`, `${hh}:${mm}`, 12);
          const caption = sanitizeText(
            body.caption || `Postcard from ${locationName} with ${companions.join(' & ')}`,
            `Postcard from ${locationName}`,
            110
          );
          postcardSeq += 1;
          sharedPostcardSnapshot = {
            id: postcardSeq,
            locationKey,
            locationName,
            neighborhood,
            photographer,
            companions,
            day: clockSnap.day,
            clock: clockStr,
            caption,
            expiresAt: Date.now() + 5500
          };
          const record = players.get(requesterId);
          if (record) {
            record.emoteText = 'Sorria!';
            record.lastSeen = Date.now();
            broadcastPlayers('postcard');
          }
          broadcastTransit('shared-postcard');
          sendJson(res, 200, { ok: true, postcard: sharedPostcardSnapshot, transit: getTransitSnapshot() });
          return;
        }

        sendJson(res, 200, { ok: true, transit: getTransitSnapshot() });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/leave') {
      try {
        const body = await readJsonBody(req);
        if (body.playerId) {
          removePlayer(body.playerId, 'leave');
        }
        sendJson(res, 200, { ok: true });
      } catch {
        sendJson(res, 200, { ok: true });
      }
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStaticFile(pathname, res);
      return;
    }

    res.writeHead(405);
    res.end('Method not allowed');
  });

  function start() {
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        server.removeListener('error', reject);
        const addr = server.address();
        boundPort = typeof addr === 'object' && addr ? addr.port : port;

        cleanupTimer = setInterval(() => {
          const now = Date.now();
          let removedAny = false;
          for (const [id, p] of players.entries()) {
            if (now - p.lastSeen > staleTimeoutMs) {
              players.delete(id);
              const sse = sseClients.get(id);
              if (sse) {
                sseClients.delete(id);
                try {
                  sse.end();
                } catch {
                  // Ignore
                }
              }
              removedAny = true;
            }
          }
          if (removedAny) {
            broadcastPlayers('timeout');
          }
        }, Math.max(1000, Math.min(5000, Math.floor(staleTimeoutMs / 2))));
        cleanupTimer.unref?.();

        keepaliveTimer = setInterval(() => {
          for (const [clientId, res] of sseClients.entries()) {
            try {
              res.write(': keepalive\n\n');
            } catch {
              sseClients.delete(clientId);
            }
          }
        }, 15000);
        keepaliveTimer.unref?.();

        // Broadcast authoritative global Lisboa clock periodically so all connected players share identical sky lighting
        clockTimer = setInterval(() => {
          if (sseClients.size > 0) {
            broadcastPlayers('clock');
          }
        }, Math.max(250, worldClock.msPerGameMinute));
        clockTimer.unref?.();

        // Advance & broadcast authoritative Tram 28E, Carris Bus, Metro Linha Azul & Transtejo Ferries
        const tickMs = Math.max(40, Number(transitTickMs) || 100);
        let lastTransitTickAt = Date.now();
        transitTimer = setInterval(() => {
          const now = Date.now();
          const dtSec = Math.min(0.25, Math.max(0.01, (now - lastTransitTickAt) / 1000));
          lastTransitTickAt = now;
          stepServerTransit(dtSec);
          if (sseClients.size > 0) {
            broadcastTransit('tick');
          }
        }, tickMs);
        transitTimer.unref?.();

        resolve({
          port: boundPort,
          host,
          urls: getLanUrls(boundPort)
        });
      });
    });
  }

  function stop() {
    if (cleanupTimer) clearInterval(cleanupTimer);
    if (keepaliveTimer) clearInterval(keepaliveTimer);
    if (clockTimer) clearInterval(clockTimer);
    if (transitTimer) clearInterval(transitTimer);
    cleanupTimer = null;
    keepaliveTimer = null;
    clockTimer = null;
    transitTimer = null;
    for (const res of sseClients.values()) {
      try {
        res.end();
      } catch {
        // Ignore
      }
    }
    sseClients.clear();
    players.clear();
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  return {
    server,
    start,
    stop,
    getPlayers: serializePlayers,
    getClock: getWorldClockSnapshot,
    getTransit: getTransitSnapshot
  };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const instance = createMultiplayerServer({ rootDir: __dirname, host, port });
  instance
    .start()
    .then(({ port: boundPort, urls }) => {
      console.log(`memories Lisboa LAN Multiplayer Server listening on port ${boundPort}`);
      console.log(`  Local:   http://localhost:${boundPort}`);
      if (urls.length > 0) {
        for (const lanUrl of urls) {
          console.log(`  Network: ${lanUrl}  (open this on another computer in the same network)`);
        }
      } else {
        console.log('  Network: No external IPv4 LAN interface detected; players on this machine can use localhost.');
      }
    })
    .catch((err) => {
      console.error('Failed to start memories LAN server:', err.message);
      process.exitCode = 1;
    });
}
