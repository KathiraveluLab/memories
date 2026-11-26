// Zero-dependency interactive OpenStreetMap slippy-tile canvas map for Cidade de Lisboa.
// Supports smooth zoom (+/- and wheel), drag panning, live Metro line overlays, clickable real-world
// station and landmark pins, and live player position tracking.

import {
  ALL_METRO_STATIONS,
  METRO_NETWORK_LINES,
  ALL_ENTERABLE_VENUES,
  findEnterableVenueById
} from '../data.js';
import {
  LISBOA_MAP_CENTER,
  METRO_STATION_GEO,
  LISBOA_LANDMARK_GEO_PINS
} from '../data/lisboaGeo.js';
import { clamp } from '../shared/geometry.js';

const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 16;

function latLonToWorldPx(lat, lon, zoom) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldPxToLatLon(wx, wy, zoom) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lon = (wx / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * wy) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lon };
}

// Map in-game player coordinates (x, y) to approximate real Lisboa GPS via nearest Metro station anchor
function estimatePlayerGeo(playerX, playerY) {
  let best = null;
  let bestD = Infinity;
  for (const st of ALL_METRO_STATIONS) {
    const geo = METRO_STATION_GEO[st.id];
    if (!geo || !Number.isFinite(st.x)) continue;
    const d = Math.hypot(playerX - st.x, playerY - st.y);
    if (d < bestD) {
      bestD = d;
      best = { st, geo };
    }
  }
  if (!best) return { lat: LISBOA_MAP_CENTER.lat, lon: LISBOA_MAP_CENTER.lon };
  const dLon = clamp((playerX - best.st.x) * 0.000018, -0.015, 0.015);
  const dLat = clamp(-(playerY - best.st.y) * 0.000014, -0.012, 0.012);
  return { lat: best.geo.lat + dLat, lon: best.geo.lon + dLon };
}

export class LisboaOsmMapWidget {
  constructor({ onSelectPlace = null } = {}) {
    this.onSelectPlace = onSelectPlace;
    this.centerLat = LISBOA_MAP_CENTER.lat;
    this.centerLon = LISBOA_MAP_CENTER.lon;
    this.zoom = LISBOA_MAP_CENTER.zoom;
    this.tileCache = new Map();
    this.lastPlayerGeo = { lat: 38.7107, lon: -9.1400 };
    this.hoveredPin = null;
    this.screenPins = [];
    this.dragging = false;
    this.dragMoved = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartWorld = null;
    this.mountedContainer = null;

    this.rootEl = document.createElement('div');
    this.rootEl.className = 'osm-map-widget';
    this.rootEl.style.cssText = 'position:relative;width:100%;border-radius:8px;overflow:hidden;border:1px solid #cbd5e1;background:#d7e7f4;user-select:none;';

    this.canvas = document.createElement('canvas');
    this.canvas.width = 340;
    this.canvas.height = 240;
    this.canvas.style.cssText = 'display:block;width:100%;height:240px;cursor:grab;';
    this.ctx = this.canvas.getContext('2d');
    this.rootEl.appendChild(this.canvas);

    // Floating zoom & center toolbar
    const controls = document.createElement('div');
    controls.style.cssText = 'position:absolute;top:6px;right:6px;display:flex;flex-direction:column;gap:4px;z-index:4;';
    const makeBtn = (label, title, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.style.cssText = 'min-width:26px;height:24px;padding:0 5px;border:1px solid #94a3b8;border-radius:5px;background:rgba(255,255,255,0.94);color:#0f172a;font:700 11px "Segoe UI",sans-serif;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.18);';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
      return b;
    };
    controls.appendChild(makeBtn('+', 'Zoom in', () => this.setZoom(this.zoom + 1)));
    controls.appendChild(makeBtn('-', 'Zoom out', () => this.setZoom(this.zoom - 1)));
    controls.appendChild(makeBtn('Me', 'Center on your location', () => {
      this.centerLat = this.lastPlayerGeo.lat;
      this.centerLon = this.lastPlayerGeo.lon;
      this.zoom = Math.max(this.zoom, 14);
      this.render();
    }));
    controls.appendChild(makeBtn('All', 'Fit all Lisboa', () => {
      this.centerLat = LISBOA_MAP_CENTER.lat;
      this.centerLon = LISBOA_MAP_CENTER.lon;
      this.zoom = LISBOA_MAP_CENTER.zoom;
      this.render();
    }));
    this.rootEl.appendChild(controls);

    // Hover tooltip + OSM Attribution bar
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.style.cssText = 'position:absolute;left:6px;top:6px;max-width:240px;padding:3px 7px;border-radius:5px;background:rgba(15,23,42,0.88);color:#f8fafc;font:600 10.5px "Segoe UI",sans-serif;pointer-events:none;display:none;z-index:4;';
    this.rootEl.appendChild(this.tooltipEl);

    const attrib = document.createElement('div');
    attrib.style.cssText = 'position:absolute;right:4px;bottom:3px;padding:1px 5px;border-radius:3px;background:rgba(255,255,255,0.82);color:#334155;font:600 9px "Segoe UI",sans-serif;pointer-events:none;z-index:3;';
    attrib.textContent = 'OpenStreetMap contributors | Drag to pan, scroll to zoom, click pin';
    this.rootEl.appendChild(attrib);

    this.bindEvents();
  }

  mount(containerEl, state) {
    if (!containerEl) return;
    if (this.rootEl.parentNode !== containerEl) {
      containerEl.innerHTML = '';
      containerEl.appendChild(this.rootEl);
    }
    this.mountedContainer = containerEl;
    if (state?.player) {
      this.lastPlayerGeo = estimatePlayerGeo(state.player.overworldX ?? state.player.x, state.player.overworldY ?? state.player.y);
    }
    const rectW = Math.max(260, Math.round(containerEl.clientWidth || 340));
    if (Math.abs(this.canvas.width - rectW) > 6) {
      this.canvas.width = rectW;
    }
    this.render();
  }

  setZoom(nextZoom) {
    this.zoom = clamp(Math.round(nextZoom), MIN_ZOOM, MAX_ZOOM);
    this.render();
  }

  getTile(z, x, y) {
    const key = `${z}/${x}/${y}`;
    const existing = this.tileCache.get(key);
    if (existing) return existing;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const rec = { img, loaded: false, failed: false };
    img.onload = () => {
      rec.loaded = true;
      this.render();
    };
    img.onerror = () => {
      rec.failed = true;
    };
    img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    this.tileCache.set(key, rec);
    return rec;
  }

  findPinAt(px, py) {
    let best = null;
    let bestD = 13;
    for (const pin of this.screenPins) {
      const d = Math.hypot(px - pin.sx, py - pin.sy);
      if (d <= bestD) {
        bestD = d;
        best = pin;
      }
    }
    return best;
  }

  bindEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1));
    }, { passive: false });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.dragMoved = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragStartWorld = latLonToWorldPx(this.centerLat, this.centerLon, this.zoom);
      this.canvas.style.cursor = 'grabbing';
      if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * this.canvas.width;
      const cy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * this.canvas.height;
      if (this.dragging && this.dragStartWorld) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        if (Math.hypot(dx, dy) > 4) this.dragMoved = true;
        const nextGeo = worldPxToLatLon(this.dragStartWorld.x - dx, this.dragStartWorld.y - dy, this.zoom);
        this.centerLat = clamp(nextGeo.lat, 38.65, 38.84);
        this.centerLon = clamp(nextGeo.lon, -9.28, -9.02);
        this.render();
        return;
      }
      const pin = this.findPinAt(cx, cy);
      if (pin !== this.hoveredPin) {
        this.hoveredPin = pin;
        if (pin) {
          this.tooltipEl.style.display = 'block';
          this.tooltipEl.textContent = `${pin.label} - Click to visit`;
          this.canvas.style.cursor = 'pointer';
        } else {
          this.tooltipEl.style.display = 'none';
          this.canvas.style.cursor = 'grab';
        }
        this.render();
      }
    });

    const endDrag = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.canvas.style.cursor = this.hoveredPin ? 'pointer' : 'grab';
      if (!this.dragMoved && e) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * this.canvas.width;
        const cy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * this.canvas.height;
        const pin = this.findPinAt(cx, cy);
        if (pin && this.onSelectPlace) {
          this.onSelectPlace(pin);
        }
      }
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', () => { this.dragging = false; });
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const z = this.zoom;
    const centerW = latLonToWorldPx(this.centerLat, this.centerLon, z);
    const originX = centerW.x - w * 0.5;
    const originY = centerW.y - h * 0.5;

    // Warm Lisbon Tagus cartographic fallback background while tiles load
    ctx.fillStyle = '#d7e7f4';
    ctx.fillRect(0, 0, w, h);

    // 1. Draw real OpenStreetMap slippy tiles covering viewport
    const minTileX = Math.floor(originX / TILE_SIZE);
    const maxTileX = Math.floor((originX + w) / TILE_SIZE);
    const minTileY = Math.floor(originY / TILE_SIZE);
    const maxTileY = Math.floor((originY + h) / TILE_SIZE);
    const maxIdx = Math.pow(2, z);

    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      for (let ty = minTileY; ty <= maxTileY; ty += 1) {
        if (ty < 0 || ty >= maxIdx) continue;
        const wrapX = ((tx % maxIdx) + maxIdx) % maxIdx;
        const tile = this.getTile(z, wrapX, ty);
        const dx = Math.round(tx * TILE_SIZE - originX);
        const dy = Math.round(ty * TILE_SIZE - originY);
        if (tile.loaded) {
          ctx.drawImage(tile.img, dx, dy, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.strokeRect(dx, dy, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    const toScreen = (lat, lon) => {
      const wp = latLonToWorldPx(lat, lon, z);
      return { sx: wp.x - originX, sy: wp.y - originY };
    };

    // 2. Overlay the 4 official Metropolitano de Lisboa routes connecting real station GPS points
    const stationByStopName = new Map(ALL_METRO_STATIONS.map((s) => [s.canonicalStopName, s]));
    for (const line of METRO_NETWORK_LINES) {
      ctx.save();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = z >= 14 ? 3.2 : 2.3;
      ctx.globalAlpha = 0.86;
      ctx.beginPath();
      let started = false;
      for (const stopName of line.stations) {
        const st = stationByStopName.get(stopName);
        const geo = st ? METRO_STATION_GEO[st.id] : null;
        if (!geo) continue;
        const { sx, sy } = toScreen(geo.lat, geo.lon);
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Plot clickable pins for all 50 Metro stations + flagship Lisbon landmarks
    this.screenPins = [];
    for (const st of ALL_METRO_STATIONS) {
      const geo = METRO_STATION_GEO[st.id];
      if (!geo) continue;
      const { sx, sy } = toScreen(geo.lat, geo.lon);
      if (sx < -16 || sx > w + 16 || sy < -16 || sy > h + 16) continue;
      const isHub = st.lines.length > 1;
      const r = isHub ? (z >= 14 ? 6.2 : 4.8) : (z >= 14 ? 4.6 : 3.4);
      const pin = {
        type: 'metro',
        id: st.id,
        label: `Metro ${st.canonicalStopName} (${st.lines.join(' / ')})`,
        sx,
        sy,
        station: st
      };
      this.screenPins.push(pin);

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = isHub ? '#ffffff' : (st.lineColors?.[0] || '#2563eb');
      ctx.fill();
      ctx.lineWidth = isHub ? 2.2 : 1.4;
      ctx.strokeStyle = isHub ? '#0f172a' : '#ffffff';
      ctx.stroke();

      if (z >= 14 || isHub || st.id === 'metro-aeroporto' || st.id === 'metro-oriente') {
        ctx.font = '700 9px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillText(st.canonicalStopName, sx + 0.8, sy - r - 2.2);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(st.canonicalStopName, sx, sy - r - 3);
      }
    }

    for (const lm of LISBOA_LANDMARK_GEO_PINS) {
      const { sx, sy } = toScreen(lm.lat, lm.lon);
      if (sx < -16 || sx > w + 16 || sy < -16 || sy > h + 16) continue;
      const venue = findEnterableVenueById(lm.id);
      const pin = {
        type: lm.kind === 'santa-justa' ? 'santa-justa' : 'landmark',
        id: lm.id,
        label: lm.name,
        sx,
        sy,
        venue
      };
      this.screenPins.push(pin);

      ctx.fillStyle = lm.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.rect(sx - 4.5, sy - 4.5, 9, 9);
      ctx.fill();
      ctx.stroke();

      if (z >= 13) {
        ctx.font = '700 8.5px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(lm.name.split(' (')[0], sx, sy + 14);
      }
    }

    // 4. Live pulsing player marker on the real Lisboa map
    const pl = toScreen(this.lastPlayerGeo.lat, this.lastPlayerGeo.lon);
    ctx.beginPath();
    ctx.arc(pl.sx, pl.sy, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pl.sx, pl.sy, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
}
