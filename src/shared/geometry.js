// Shared pure math, 2D/3D geometry, and polygon clipping utilities reused across engine, renderers, and UI.

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

export function pointInPolygon2D(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function clipPolygonNearZ(pts, nearZ = 5.0) {
  const out = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const aIn = a.cz >= nearZ;
    const bIn = b.cz >= nearZ;
    if (aIn && bIn) {
      out.push(b);
    } else if (aIn && !bIn) {
      const t = (nearZ - a.cz) / (b.cz - a.cz);
      out.push({ cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, cz: nearZ });
    } else if (!aIn && bIn) {
      const t = (nearZ - a.cz) / (b.cz - a.cz);
      out.push({ cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, cz: nearZ });
      out.push(b);
    }
  }
  return out;
}

export function clipSegmentNearZ(a, b, nearZ = 5.0) {
  const aIn = a.cz >= nearZ;
  const bIn = b.cz >= nearZ;
  if (!aIn && !bIn) return null;
  if (aIn && bIn) return [a, b];
  const t = (nearZ - a.cz) / (b.cz - a.cz);
  const mid = { cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, cz: nearZ };
  return aIn ? [a, mid] : [mid, b];
}
