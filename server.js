import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PLAYER_OUTFITS, MULTIPLAYER_SPAWN_POINTS } from './src/data.js';

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
  staleTimeoutMs = 25000
} = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const players = new Map();
  const sseClients = new Map();
  let nextSlotNumber = 1;
  let boundPort = port;
  let cleanupTimer = null;
  let keepaliveTimer = null;

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
      ridingVehicleId: p.ridingVehicleId,
      neighborhoodName: p.neighborhoodName,
      emoteText: p.emoteText
    }));
  }

  function broadcastPlayers(reason = 'update') {
    const payload = JSON.stringify({
      type: 'players',
      reason,
      serverTime: Date.now(),
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

      const snapshot = JSON.stringify({
        type: 'players',
        reason: 'snapshot',
        serverTime: Date.now(),
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
        if (['overworld', 'interior', 'metro'].includes(st.mode)) record.mode = st.mode;
        if (st.currentVenueId === null || typeof st.currentVenueId === 'string') {
          record.currentVenueId = st.currentVenueId;
        }
        if (st.metroStationId === null || typeof st.metroStationId === 'string') {
          record.metroStationId = st.metroStationId;
        }
        if (st.metroPhase === null || typeof st.metroPhase === 'string') {
          record.metroPhase = st.metroPhase;
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
        sendJson(res, 200, { ok: true, playerCount: players.size });
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
    cleanupTimer = null;
    keepaliveTimer = null;
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
    getPlayers: serializePlayers
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
