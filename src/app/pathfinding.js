// Reusable Lisbon sidewalk grid pathfinding & HTML escaping helpers
import {
  isOverworldPositionValid,
  isPointInVehicleLane,
  isPointOnSidewalk
} from '../engine.js';

export const HORIZONTAL_SIDEWALKS = [-2494, -2356, -1814, -1676, -1134, -996, -454, -316, 220, 352, 546, 676, 878, 996];
export const VERTICAL_SIDEWALKS = [-2280, -1400, -490, 0, 512, 892, 1014, 1680, 1800, 2202, 2856, 3290, 3960];

export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function nearestValue(target, candidates) {
  let best = candidates[0];
  let bestDiff = Math.abs(target - best);
  for (const c of candidates) {
    const diff = Math.abs(target - c);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

function isInSidewalkBand(y) {
  return (
    (y >= -2512 && y <= -2476) ||
    (y >= -2374 && y <= -2338) ||
    (y >= -1832 && y <= -1796) ||
    (y >= -1694 && y <= -1658) ||
    (y >= -1152 && y <= -1116) ||
    (y >= -1014 && y <= -978) ||
    (y >= -472 && y <= -436) ||
    (y >= -334 && y <= -298) ||
    (y >= 205 && y <= 246) ||
    (y >= 332 && y <= 368) ||
    (y >= 532 && y <= 570) ||
    (y >= 654 && y <= 688) ||
    (y >= 856 && y <= 892) ||
    (y >= 978 && y <= 1012)
  );
}

function isSidewalkLineClear(ax, ay, bx, by) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(4, Math.ceil(dist / 16));
  let laneSamples = 0;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (!isOverworldPositionValid(x, y, 12)) return false;
    if (isPointInVehicleLane(x, y)) laneSamples += 1;
  }
  // Allow direct line only if it stays off vehicle lanes (short sidewalk walks)
  return laneSamples === 0;
}

export function buildOverworldPath(sx, sy, tx, ty, finalAction = null) {
  if (isSidewalkLineClear(sx, sy, tx, ty)) {
    return [{ x: tx, y: ty, onArriveAction: finalAction }];
  }

  const waypoints = [];
  const hEnd = nearestValue(ty, HORIZONTAL_SIDEWALKS);
  const vStart = nearestValue(sx, VERTICAL_SIDEWALKS);

  if (isInSidewalkBand(sy)) {
    const hStart = nearestValue(sy, HORIZONTAL_SIDEWALKS);
    if (Math.abs(sy - hStart) > 6) {
      waypoints.push({ x: sx, y: hStart, onArriveAction: null });
    }
    if (hStart !== hEnd) {
      const vCrosswalk = nearestValue((sx + tx) / 2, VERTICAL_SIDEWALKS);
      waypoints.push({ x: vCrosswalk, y: hStart, onArriveAction: null });
      waypoints.push({ x: vCrosswalk, y: hEnd, onArriveAction: null });
    }
    waypoints.push({ x: tx, y: hEnd, onArriveAction: null });
  } else {
    waypoints.push({ x: vStart, y: sy, onArriveAction: null });
    waypoints.push({ x: vStart, y: hEnd, onArriveAction: null });
    waypoints.push({ x: tx, y: hEnd, onArriveAction: null });
  }

  waypoints.push({ x: tx, y: ty, onArriveAction: finalAction });
  return waypoints;
}
