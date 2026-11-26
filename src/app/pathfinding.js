// Reusable obstacle-aware Lisbon sidewalk grid pathfinding (Dijkstra over verified clear street edges)
// and HTML escaping helpers. Guarantees auto-navigation never walks into buildings or fences.

import {
  isOverworldPositionValid,
  isPointInVehicleLane
} from '../engine.js';

export const HORIZONTAL_SIDEWALKS = [-2494, -2356, -1814, -1676, -1134, -996, -454, -316, 214, 355, 546, 682, 878, 996];
export const VERTICAL_SIDEWALKS = [-2260, -1460, -560, 512, 892, 1014, 1380, 1745, 2215, 3360, 4152];

export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isSegmentWalkable(ax, ay, bx, by, { allowLanes = true } = {}) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(2, Math.ceil(dist / 14));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (!isOverworldPositionValid(x, y, 13)) return false;
    if (!allowLanes && i > 0 && i < steps && isPointInVehicleLane(x, y)) return false;
  }
  return true;
}

// Lazily build and cache the verified obstacle-free sidewalk intersection graph
let cachedGraph = null;

function getSidewalkGraph() {
  if (cachedGraph) return cachedGraph;
  const nodes = [];
  const adj = [];
  const idxGrid = [];

  for (let yi = 0; yi < HORIZONTAL_SIDEWALKS.length; yi += 1) {
    const row = [];
    const y = HORIZONTAL_SIDEWALKS[yi];
    for (let xi = 0; xi < VERTICAL_SIDEWALKS.length; xi += 1) {
      const x = VERTICAL_SIDEWALKS[xi];
      if (isOverworldPositionValid(x, y, 13)) {
        const id = nodes.length;
        nodes.push({ x, y });
        adj.push([]);
        row.push(id);
      } else {
        row.push(-1);
      }
    }
    idxGrid.push(row);
  }

  // Connect adjacent horizontal & vertical intersection nodes only when the entire segment is obstacle-free
  for (let yi = 0; yi < HORIZONTAL_SIDEWALKS.length; yi += 1) {
    for (let xi = 0; xi < VERTICAL_SIDEWALKS.length; xi += 1) {
      const a = idxGrid[yi][xi];
      if (a < 0) continue;
      // Scan right to next valid node on the same horizontal sidewalk
      for (let xj = xi + 1; xj < VERTICAL_SIDEWALKS.length; xj += 1) {
        const b = idxGrid[yi][xj];
        if (b < 0) continue;
        if (isSegmentWalkable(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y)) {
          const w = Math.abs(nodes[b].x - nodes[a].x);
          adj[a].push({ to: b, w });
          adj[b].push({ to: a, w });
        }
        break;
      }
      // Scan down to next valid node on the same vertical corridor
      for (let yj = yi + 1; yj < HORIZONTAL_SIDEWALKS.length; yj += 1) {
        const b = idxGrid[yj][xi];
        if (b < 0) continue;
        if (isSegmentWalkable(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y)) {
          const w = Math.abs(nodes[b].y - nodes[a].y);
          adj[a].push({ to: b, w });
          adj[b].push({ to: a, w });
        }
        break;
      }
    }
  }

  cachedGraph = { nodes, adj };
  return cachedGraph;
}

// Find all clear 1-segment or L-shaped connectors from an arbitrary point (px, py) to nearby grid nodes
function connectPointToGraph(px, py, baseNodes) {
  const links = [];
  // Sort grid nodes by Manhattan distance to (px, py) and test nearest candidates
  const ranked = baseNodes
    .map((n, id) => ({ id, x: n.x, y: n.y, d: Math.abs(n.x - px) + Math.abs(n.y - py) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 28);

  for (const cand of ranked) {
    if (isSegmentWalkable(px, py, cand.x, cand.y)) {
      links.push({ nodeId: cand.id, via: null, w: Math.hypot(cand.x - px, cand.y - py) });
      continue;
    }
    // Try L-shaped sidewalk entry (vertical first, then horizontal)
    if (isSegmentWalkable(px, py, px, cand.y) && isSegmentWalkable(px, cand.y, cand.x, cand.y)) {
      links.push({ nodeId: cand.id, via: { x: px, y: cand.y }, w: Math.abs(cand.y - py) + Math.abs(cand.x - px) });
      continue;
    }
    // Try L-shaped sidewalk entry (horizontal first, then vertical)
    if (isSegmentWalkable(px, py, cand.x, py) && isSegmentWalkable(cand.x, py, cand.x, cand.y)) {
      links.push({ nodeId: cand.id, via: { x: cand.x, y: py }, w: Math.abs(cand.x - px) + Math.abs(cand.y - py) });
    }
  }
  return links;
}

export function buildOverworldPath(sx, sy, tx, ty, finalAction = null) {
  // Fast path: short direct sidewalk walk with zero obstacles and zero vehicle lanes
  if (isSegmentWalkable(sx, sy, tx, ty, { allowLanes: false })) {
    return [{ x: tx, y: ty, onArriveAction: finalAction }];
  }

  const { nodes, adj } = getSidewalkGraph();
  const n = nodes.length;
  const startId = n;
  const goalId = n + 1;

  const startLinks = connectPointToGraph(sx, sy, nodes);
  const goalLinks = connectPointToGraph(tx, ty, nodes);

  // Dijkstra shortest obstacle-free path from startId -> goalId
  const totalNodes = n + 2;
  const dist = new Float64Array(totalNodes).fill(Infinity);
  const prev = new Int32Array(totalNodes).fill(-1);
  const visited = new Uint8Array(totalNodes);
  const startViaMap = new Map();
  const goalViaMap = new Map();

  dist[startId] = 0;
  const startAdj = [];
  for (const lk of startLinks) {
    startAdj.push({ to: lk.nodeId, w: lk.w });
    startViaMap.set(lk.nodeId, lk.via);
  }
  const goalInMap = new Map();
  for (const lk of goalLinks) {
    goalInMap.set(lk.nodeId, lk.w);
    goalViaMap.set(lk.nodeId, lk.via);
  }

  for (let iter = 0; iter < totalNodes; iter += 1) {
    let u = -1;
    let bestD = Infinity;
    for (let i = 0; i < totalNodes; i += 1) {
      if (!visited[i] && dist[i] < bestD) {
        bestD = dist[i];
        u = i;
      }
    }
    if (u < 0 || u === goalId) break;
    visited[u] = 1;

    if (u === startId) {
      for (const e of startAdj) {
        if (dist[u] + e.w < dist[e.to]) {
          dist[e.to] = dist[u] + e.w;
          prev[e.to] = u;
        }
      }
    } else if (u < n) {
      for (const e of adj[u]) {
        if (!visited[e.to] && dist[u] + e.w < dist[e.to]) {
          dist[e.to] = dist[u] + e.w;
          prev[e.to] = u;
        }
      }
      const gw = goalInMap.get(u);
      if (gw !== undefined && dist[u] + gw < dist[goalId]) {
        dist[goalId] = dist[u] + gw;
        prev[goalId] = u;
      }
    }
  }

  if (prev[goalId] < 0) {
    // Fallback if target is directly unreachable
    return [{ x: tx, y: ty, onArriveAction: finalAction }];
  }

  // Reconstruct node sequence startId -> ... -> goalId
  const chain = [];
  for (let cur = goalId; cur >= 0; cur = prev[cur]) {
    chain.push(cur);
  }
  chain.reverse();

  const rawPts = [];
  for (let i = 1; i < chain.length - 1; i += 1) {
    const nodeId = chain[i];
    if (i === 1) {
      const via = startViaMap.get(nodeId);
      if (via) rawPts.push(via);
    }
    rawPts.push({ x: nodes[nodeId].x, y: nodes[nodeId].y });
    if (i === chain.length - 2) {
      const via = goalViaMap.get(nodeId);
      if (via) rawPts.push(via);
    }
  }
  rawPts.push({ x: tx, y: ty });

  // Deduplicate consecutive identical points & attach finalAction to the final waypoint
  const waypoints = [];
  for (const pt of rawPts) {
    const last = waypoints[waypoints.length - 1];
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 3) continue;
    waypoints.push({ x: pt.x, y: pt.y, onArriveAction: null });
  }
  if (waypoints.length === 0) {
    waypoints.push({ x: tx, y: ty, onArriveAction: finalAction });
  } else {
    waypoints[waypoints.length - 1].onArriveAction = finalAction;
  }
  return waypoints;
}
