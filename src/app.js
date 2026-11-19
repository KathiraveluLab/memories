import {
  NEIGHBORHOODS,
  VENUES,
  REST_SPOTS,
  getAllTransitStops,
  getAllMemoryCatalog
} from './data.js';
import {
  MemoriesGameEngine,
  INTERIOR_STATIONS,
  formatClock,
  getDayPhase,
  isOverworldPositionValid
} from './engine.js';
import { LisboaCanvasRenderer } from './renderer.js';

const ALL_STOPS = getAllTransitStops();
const ALL_MEMORIES = getAllMemoryCatalog();
const HORIZONTAL_AVENUES = [250, 550, 665, 895];
const VERTICAL_CORRIDORS = [162, 510, 892, 1360, 1730, 2200];

function escapeHtml(text) {
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

function isInHorizontalBand(y) {
  return (y >= 205 && y <= 360) || (y >= 535 && y <= 682) || (y >= 850 && y <= 1005);
}

function isLineClear(ax, ay, bx, by) {
  const steps = Math.max(4, Math.ceil(Math.hypot(bx - ax, by - ay) / 18));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (!isOverworldPositionValid(x, y, 11)) return false;
  }
  return true;
}

function buildOverworldPath(sx, sy, tx, ty, finalAction = null) {
  if (isLineClear(sx, sy, tx, ty)) {
    return [{ x: tx, y: ty, onArriveAction: finalAction }];
  }

  const waypoints = [];
  const hEnd = nearestValue(ty, HORIZONTAL_AVENUES);
  const vStart = nearestValue(sx, VERTICAL_CORRIDORS);

  if (isInHorizontalBand(sy)) {
    const hStart = nearestValue(sy, HORIZONTAL_AVENUES);
    if (Math.abs(sy - hStart) > 8) {
      waypoints.push({ x: sx, y: hStart, onArriveAction: null });
    }
    if (hStart !== hEnd) {
      const vBridge = nearestValue((sx + tx) / 2, VERTICAL_CORRIDORS);
      waypoints.push({ x: vBridge, y: hStart, onArriveAction: null });
      waypoints.push({ x: vBridge, y: hEnd, onArriveAction: null });
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

const engine = new MemoriesGameEngine();
const canvas = document.getElementById('lisboa-canvas');
const renderer = new LisboaCanvasRenderer(canvas);

const pressedKeys = new Set();
let activeTab = 'guide';
let lastUiSignature = '';
let lastContextSignature = '';
let lastStatusText = '';

const dom = {
  euros: document.getElementById('hud-euros'),
  energy: document.getElementById('hud-energy'),
  energyBar: document.getElementById('hud-energy-bar'),
  fullness: document.getElementById('hud-fullness'),
  fullnessBar: document.getElementById('hud-fullness-bar'),
  clock: document.getElementById('hud-clock'),
  phase: document.getElementById('hud-phase'),
  memories: document.getElementById('hud-memories'),
  sceneTitle: document.getElementById('scene-title'),
  sceneSubtitle: document.getElementById('scene-subtitle'),
  liveTramStatus: document.getElementById('live-tram-status'),
  liveBusStatus: document.getElementById('live-bus-status'),
  btnContextAction: document.getElementById('btn-context-action'),
  btnSecondaryAction: document.getElementById('btn-secondary-action'),
  btnOvernight: document.getElementById('btn-overnight'),
  btnReset: document.getElementById('btn-reset'),
  statusBanner: document.getElementById('status-banner'),
  activeContextPanel: document.getElementById('active-context-panel'),
  visitedVenuesBadge: document.getElementById('visited-venues-badge'),
  guideList: document.getElementById('guide-list'),
  albumCountBadge: document.getElementById('album-count-badge'),
  albumCompleteBanner: document.getElementById('album-complete-banner'),
  memoriesList: document.getElementById('memories-list'),
  phraseCountBadge: document.getElementById('phrase-count-badge'),
  phrasebookList: document.getElementById('phrasebook-list'),
  satchelCountBadge: document.getElementById('satchel-count-badge'),
  satchelList: document.getElementById('satchel-list'),
  tastedList: document.getElementById('tasted-list'),
  journalList: document.getElementById('journal-list')
};

function setStatusBanner(message, isError = false) {
  dom.statusBanner.textContent = message;
  dom.statusBanner.classList.toggle('error', isError);
  lastStatusText = message;
}

function setActiveTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

function getKeyboardVector() {
  let x = 0;
  let y = 0;
  if (pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA')) x -= 1;
  if (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) x += 1;
  if (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW')) y -= 1;
  if (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS')) y += 1;
  return { x, y };
}

function handleCanvasClick(event) {
  const state = engine.getState();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;
  const worldPt = renderer.screenToWorld(canvasX, canvasY, state);

  if (state.ridingVehicleId) {
    const res = engine.triggerNearbyInteraction();
    if (res && !res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }

  if (state.mode === 'interior') {
    const counterDist = Math.hypot(worldPt.x - INTERIOR_STATIONS.counter.x, worldPt.y - INTERIOR_STATIONS.counter.y);
    if (counterDist <= 78 || (worldPt.y <= 195 && worldPt.x >= 220 && worldPt.x <= 540)) {
      engine.setWalkTarget(INTERIOR_STATIONS.counter.x, INTERIOR_STATIONS.counter.y, { type: 'talkProprietor' });
      return;
    }
    const displayDist = Math.hypot(worldPt.x - INTERIOR_STATIONS.display.x, worldPt.y - INTERIOR_STATIONS.display.y);
    if (displayDist <= 72 || (worldPt.x <= 165 && worldPt.y >= 195 && worldPt.y <= 340)) {
      engine.setWalkTarget(INTERIOR_STATIONS.display.x, INTERIOR_STATIONS.display.y, { type: 'inspectDisplay' });
      return;
    }
    const mat = INTERIOR_STATIONS.exitMat;
    if (worldPt.y >= mat.triggerY - 22 && Math.abs(worldPt.x - mat.x) <= mat.halfWidth + 16) {
      engine.setWalkTarget(mat.x, mat.triggerY, { type: 'exitVenue' });
      return;
    }
    engine.setWalkTarget(worldPt.x, worldPt.y, null);
    return;
  }

  // Overworld clicks: check if clicked on a venue building
  for (const venue of VENUES) {
    const hitBuilding =
      worldPt.x >= venue.x - 10 &&
      worldPt.x <= venue.x + venue.w + 10 &&
      worldPt.y >= venue.y - 10 &&
      worldPt.y <= venue.y + venue.h + 10;
    if (hitBuilding) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        venue.spawnOutside.x,
        venue.spawnOutside.y,
        { type: 'enterVenue', id: venue.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking toward ${venue.name}...`);
      return;
    }
  }

  // Check if clicked on a transit stop
  for (const stop of ALL_STOPS) {
    const d = Math.min(
      Math.hypot(worldPt.x - stop.platformX, worldPt.y - stop.platformY),
      Math.hypot(worldPt.x - stop.x, worldPt.y - stop.y)
    );
    if (d <= 44) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        stop.platformX,
        stop.platformY,
        { type: 'boardStop', id: stop.stopId }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking to ${stop.stopName} to catch ${stop.lineName}...`);
      return;
    }
  }

  // Check if clicked on a rest bench
  for (const spot of REST_SPOTS) {
    if (Math.hypot(worldPt.x - spot.x, worldPt.y - spot.y) <= 38) {
      const path = buildOverworldPath(
        state.player.x,
        state.player.y,
        spot.x,
        spot.y + 22,
        { type: 'restBench', id: spot.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking to ${spot.name}...`);
      return;
    }
  }

  // Otherwise walk to clicked street spot
  const path = buildOverworldPath(state.player.x, state.player.y, worldPt.x, worldPt.y, null);
  engine.setWalkPath(path);
}

function renderActiveContextPanel(state) {
  const venue = engine.getCurrentVenue();
  const riding = engine.getRidingVehicle();

  const sig = JSON.stringify({
    mode: state.mode,
    venueId: venue?.id || null,
    ridingId: riding?.id || null,
    stopId: riding?.currentStopId || null,
    nextStop: riding?.nextStopName || null,
    alight: state.alightAtNextStop,
    euros: state.euros
  });

  if (sig === lastContextSignature) return;
  lastContextSignature = sig;

  if (riding) {
    dom.activeContextPanel.classList.remove('hidden');
    const stopStatus = riding.currentStopId
      ? `Stopped at <strong>${escapeHtml(riding.currentStopName)}</strong>`
      : `Heading toward <strong>${escapeHtml(riding.nextStopName)}</strong>`;
    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>Aboard ${escapeHtml(riding.name)}</h3>
          <div class="item-meta">${stopStatus}</div>
        </div>
        <span class="badge ${riding.mode === 'tram' ? 'badge-tram' : 'badge-bus'}">${escapeHtml(riding.badge)}</span>
      </div>
      <p class="helper-text">
        Enjoy the street-level view across Lisboa while resting your feet. Ring the bell to disembark automatically at the next stop, or step off immediately at the upcoming shelter.
      </p>
      <div class="action-strip">
        <button type="button" class="btn btn-primary btn-sm" data-transit-action="ring">
          ${riding.currentStopId ? 'Step Off Here' : state.alightAtNextStop ? 'Bell Rung (Waiting)' : 'Ring Bell for Next Stop'}
        </button>
        <button type="button" class="btn btn-secondary btn-sm" data-transit-action="next-now">
          Hop Off at ${escapeHtml(riding.currentStopId ? riding.currentStopName : riding.nextStopName)}
        </button>
      </div>
    `;
    return;
  }

  if (venue) {
    dom.activeContextPanel.classList.remove('hidden');
    const itemsHtml = venue.items
      .map((item) => {
        const affordable = state.euros >= item.costEur;
        const effects =
          item.kind === 'food'
            ? `+${item.fullnessDelta} Fullness, +${item.energyDelta} Energy`
            : `Satchel Keepsake, +${item.energyDelta} Energy`;
        return `
          <div class="item-card">
            <div>
              <h4>${escapeHtml(item.name)}</h4>
              <div class="item-meta">${escapeHtml(item.description)}</div>
              <div class="item-meta"><strong>${item.costEur.toFixed(2)} EUR</strong> | ${escapeHtml(effects)}</div>
            </div>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              data-buy-item="${escapeHtml(item.id)}"
              ${affordable ? '' : 'disabled'}
            >
              ${item.kind === 'food' ? 'Order' : 'Buy'}
            </button>
          </div>
        `;
      })
      .join('');

    dom.activeContextPanel.innerHTML = `
      <div class="context-header">
        <div>
          <h3>${escapeHtml(venue.name)}</h3>
          <div class="item-meta">${escapeHtml(venue.memory.neighborhood)} | Host: ${escapeHtml(venue.proprietor)} (${escapeHtml(venue.proprietorRole)})</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-venue-action="exit">Step Outside</button>
      </div>
      <div class="context-quote">"${escapeHtml(venue.greeting)}"</div>
      <div class="phrase-callout">
        <span class="pt">${escapeHtml(venue.phrase.pt)}</span>
        <span class="pron">${escapeHtml(venue.phrase.pronunciation)}</span>
        <span>${escapeHtml(venue.phrase.en)}</span>
      </div>
      ${itemsHtml}
      <div class="action-strip">
        <button type="button" class="btn btn-sm" data-venue-action="talk">Chat with ${escapeHtml(venue.proprietor)}</button>
        <button type="button" class="btn btn-sm" data-venue-action="inspect">Inspect Display</button>
      </div>
    `;
    return;
  }

  dom.activeContextPanel.classList.add('hidden');
  dom.activeContextPanel.innerHTML = '';
}

function renderLists(state) {
  const sig = JSON.stringify({
    visitedVenues: state.visitedVenues,
    memories: state.memories.map((m) => m.id),
    phrases: state.learnedPhrases.length,
    satchel: state.satchel.length,
    tasted: state.tastedFoods.length,
    journalLen: state.journal.length,
    journalHead: state.journal[0]?.id || 0,
    mode: state.mode,
    riding: state.ridingVehicleId
  });
  if (sig === lastUiSignature) return;
  lastUiSignature = sig;

  dom.visitedVenuesBadge.textContent = `${state.visitedVenues.length} / ${VENUES.length} venues`;
  dom.albumCountBadge.textContent = `${state.memories.length} / ${state.totalMemoriesPossible} captured`;
  dom.phraseCountBadge.textContent = `${state.learnedPhrases.length} ${state.learnedPhrases.length === 1 ? 'phrase' : 'phrases'}`;
  dom.satchelCountBadge.textContent = `${state.satchel.length} ${state.satchel.length === 1 ? 'keepsake' : 'keepsakes'}`;

  dom.albumCompleteBanner.classList.toggle('hidden', !state.albumCompleted);

  // Guide tab: grouped by Bairro Alto, Chiado, Alfama + Transit Stops
  const guideParts = [];
  for (const hood of NEIGHBORHOODS) {
    guideParts.push(`<div class="hood-group-title">${escapeHtml(hood.name)}</div>`);
    const hoodVenues = VENUES.filter((v) => v.neighborhood === hood.id);
    for (const v of hoodVenues) {
      const visited = state.visitedVenues.includes(v.id);
      guideParts.push(`
        <div class="guide-card ${visited ? 'visited' : ''}">
          <div>
            <div class="guide-card-title">${escapeHtml(v.name)} <span class="badge-muted">${escapeHtml(v.badge)}</span></div>
            <div class="guide-card-sub">${visited ? 'Visited - Memory captured' : escapeHtml(v.description)}</div>
          </div>
          <button type="button" class="btn btn-sm" data-walk-venue="${escapeHtml(v.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
            Walk Here
          </button>
        </div>
      `);
    }
    const hoodBench = REST_SPOTS.find((s) => s.neighborhood === hood.id);
    if (hoodBench) {
      const saved = state.memories.some((m) => m.id === hoodBench.memory.id);
      guideParts.push(`
        <div class="guide-card ${saved ? 'visited' : ''}">
          <div>
            <div class="guide-card-title">${escapeHtml(hoodBench.name)} <span class="badge-muted">[BENCH]</span></div>
            <div class="guide-card-sub">Free rest (+30 Energy)${saved ? ' - Viewpoint saved' : ''}</div>
          </div>
          <button type="button" class="btn btn-sm" data-walk-bench="${escapeHtml(hoodBench.id)}" ${state.ridingVehicleId ? 'disabled' : ''}>
            Walk Here
          </button>
        </div>
      `);
    }
  }

  guideParts.push('<div class="hood-group-title">Carris Tram 28E &amp; Bus 737 / 758 Stops</div>');
  for (const stop of ALL_STOPS) {
    guideParts.push(`
      <div class="guide-card">
        <div>
          <div class="guide-card-title">${escapeHtml(stop.stopName)}</div>
          <div class="guide-card-sub">${escapeHtml(stop.badge)} ${escapeHtml(stop.lineName)} - ${stop.fareEur.toFixed(2)} EUR</div>
        </div>
        <button type="button" class="btn btn-sm" data-walk-stop="${escapeHtml(stop.stopId)}" ${state.ridingVehicleId ? 'disabled' : ''}>
          Catch Here
        </button>
      </div>
    `);
  }
  dom.guideList.innerHTML = guideParts.join('');

  // Memories Album tab
  const capturedMap = new Map(state.memories.map((m) => [m.id, m]));
  dom.memoriesList.innerHTML = ALL_MEMORIES.map((mem) => {
    const found = capturedMap.get(mem.id);
    if (found) {
      return `
        <article class="memory-card captured">
          <div class="memory-top">
            <span class="memory-title">${escapeHtml(found.title)}</span>
            <span class="memory-stamp">Day ${found.day} ${escapeHtml(found.clock)} | ${escapeHtml(found.neighborhood)}</span>
          </div>
          <p class="memory-caption">${escapeHtml(found.caption)}</p>
        </article>
      `;
    }
    return `
      <article class="memory-card locked">
        <div class="memory-top">
          <span class="memory-title">Undiscovered Memory (${escapeHtml(mem.category.toUpperCase())})</span>
          <span class="memory-stamp">${escapeHtml(mem.neighborhood)}</span>
        </div>
        <p class="memory-caption">Explore ${escapeHtml(mem.neighborhood)} to capture this memory.</p>
      </article>
    `;
  }).join('');

  // Phrasebook tab
  dom.phrasebookList.innerHTML = state.learnedPhrases
    .map(
      (p) => `
      <li>
        <span class="phrase-pt">${escapeHtml(p.pt)}</span>
        <span class="phrase-pron">${escapeHtml(p.pronunciation)}</span>
        <span class="phrase-en">${escapeHtml(p.en)}</span>
        <span class="item-meta">Learned at ${escapeHtml(p.source)} (Day ${p.day})</span>
      </li>
    `
    )
    .join('');

  // Satchel & Log tab
  dom.satchelList.innerHTML =
    state.satchel.length > 0
      ? state.satchel
          .map(
            (s) =>
              `<li><strong>${escapeHtml(s.name)}</strong> - ${escapeHtml(s.venueName)} (${escapeHtml(s.neighborhood)}, Day ${s.day})</li>`
          )
          .join('')
      : '<li class="empty-note">No souvenirs collected yet. Visit shops in Bairro Alto, Chiado, or Alfama.</li>';

  dom.tastedList.innerHTML =
    state.tastedFoods.length > 0
      ? state.tastedFoods
          .map((f) => `<li><strong>${escapeHtml(f.name)}</strong> at ${escapeHtml(f.venueName)} (Day ${f.day})</li>`)
          .join('')
      : '<li class="empty-note">No Lisbon dishes tasted yet. Stop by a cafe or tasca!</li>';

  dom.journalList.innerHTML = state.journal
    .slice(0, 18)
    .map(
      (j) =>
        `<li><strong>Day ${j.day} ${escapeHtml(j.clock)}:</strong> ${escapeHtml(j.summary)}</li>`
    )
    .join('');
}

function refreshUi(force = false) {
  const state = engine.getState();
  const phase = getDayPhase(state.minutesOfDay);
  const nearby = engine.getNearbyInteraction();

  dom.euros.textContent = `${state.euros.toFixed(2)} EUR`;
  dom.energy.textContent = String(Math.round(state.energy));
  dom.energyBar.style.width = `${Math.round(state.energy)}%`;
  dom.fullness.textContent = String(Math.round(state.fullness));
  dom.fullnessBar.style.width = `${Math.round(state.fullness)}%`;
  dom.clock.textContent = `Day ${state.day} - ${formatClock(state.minutesOfDay)}`;
  dom.phase.textContent = phase.label;
  dom.phase.className = `phase-pill phase-${phase.id}`;
  dom.memories.textContent = `${state.memories.length} / ${state.totalMemoriesPossible}`;

  const venue = engine.getCurrentVenue();
  const riding = engine.getRidingVehicle();
  if (venue) {
    dom.sceneTitle.textContent = `Inside ${venue.name} (${venue.memory.neighborhood})`;
    dom.sceneSubtitle.textContent = `Walk to ${venue.proprietor}'s counter, browse the display, or walk to EXIT TO STREET.`;
  } else if (riding) {
    dom.sceneTitle.textContent = `Riding ${riding.name} through ${state.currentNeighborhoodName}`;
    dom.sceneSubtitle.textContent = riding.currentStopId
      ? `Stopped at ${riding.currentStopName}. Press [E] to step off.`
      : `Next stop: ${riding.nextStopName}. Press [E] to ring the bell.`;
  } else {
    dom.sceneTitle.textContent = `${state.currentNeighborhoodName} - Ground-Level Lisboa`;
    dom.sceneSubtitle.textContent =
      'Walk with WASD / Arrows or click on the streets. Press [E] to enter shops, board Tram 28E or Carris Bus, or rest.';
  }

  const tram = state.vehicles.find((v) => v.mode === 'tram');
  const bus = state.vehicles.find((v) => v.mode === 'bus');
  if (tram) {
    dom.liveTramStatus.textContent = tram.currentStopName
      ? `[TRAM 28E] At ${tram.currentStopName.split(' (')[0]}`
      : `[TRAM 28E] -> ${tram.nextStopName.split(' (')[0]}`;
  }
  if (bus) {
    dom.liveBusStatus.textContent = bus.currentStopName
      ? `[BUS 737] At ${bus.currentStopName.split(' (')[0]}`
      : `[BUS 737] -> ${bus.nextStopName.split(' (')[0]}`;
  }

  if (nearby) {
    dom.btnContextAction.disabled = false;
    dom.btnContextAction.textContent = nearby.label;
  } else {
    dom.btnContextAction.disabled = true;
    dom.btnContextAction.textContent =
      state.mode === 'interior'
        ? 'Walk to counter, display, or EXIT mat'
        : 'Walk near a shop, transit stop, or bench';
  }

  if (state.mode === 'interior') {
    dom.btnSecondaryAction.classList.remove('hidden');
    dom.btnSecondaryAction.textContent = 'Step Outside (Esc)';
    dom.btnSecondaryAction.dataset.action = 'exit-venue';
  } else if (state.ridingVehicleId) {
    dom.btnSecondaryAction.classList.remove('hidden');
    dom.btnSecondaryAction.textContent = 'Hop Off at Next Stop Now';
    dom.btnSecondaryAction.dataset.action = 'alight-now';
  } else {
    dom.btnSecondaryAction.classList.add('hidden');
  }

  if (force || state.statusMessage !== lastStatusText) {
    setStatusBanner(state.statusMessage, false);
  }

  renderActiveContextPanel(state);
  renderLists(state);
}

// Event listeners
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === 'KeyE' || event.code === 'Space') {
    if (!event.repeat) {
      const res = engine.triggerNearbyInteraction();
      if (res && !res.ok && res.error) {
        setStatusBanner(res.error, true);
      }
      refreshUi(true);
    }
    return;
  }
  if (event.code === 'Escape') {
    if (engine.getState().mode === 'interior') {
      engine.exitVenue();
      refreshUi(true);
    }
    return;
  }
  pressedKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener('blur', () => {
  pressedKeys.clear();
});

canvas.addEventListener('click', handleCanvasClick);

dom.btnContextAction.addEventListener('click', () => {
  const res = engine.triggerNearbyInteraction();
  if (res && !res.ok && res.error) {
    setStatusBanner(res.error, true);
  }
  refreshUi(true);
});

dom.btnSecondaryAction.addEventListener('click', () => {
  const action = dom.btnSecondaryAction.dataset.action;
  if (action === 'exit-venue') {
    engine.exitVenue();
  } else if (action === 'alight-now') {
    engine.disembarkTransit({ immediateToNextStop: true });
  }
  refreshUi(true);
});

dom.btnOvernight.addEventListener('click', () => {
  engine.restOvernight();
  refreshUi(true);
});

dom.btnReset.addEventListener('click', () => {
  engine.reset();
  lastUiSignature = '';
  lastContextSignature = '';
  refreshUi(true);
});

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setActiveTab(btn.dataset.tab);
  });
});

dom.activeContextPanel.addEventListener('click', (event) => {
  const buyBtn = event.target.closest('[data-buy-item]');
  if (buyBtn) {
    const res = engine.purchaseVenueItem(buyBtn.dataset.buyItem);
    if (!res.ok && res.error) setStatusBanner(res.error, true);
    refreshUi(true);
    return;
  }
  const venueBtn = event.target.closest('[data-venue-action]');
  if (venueBtn) {
    const act = venueBtn.dataset.venueAction;
    if (act === 'exit') engine.exitVenue();
    else if (act === 'talk') engine.talkToProprietor();
    else if (act === 'inspect') engine.inspectVenueDisplay();
    refreshUi(true);
    return;
  }
  const transitBtn = event.target.closest('[data-transit-action]');
  if (transitBtn) {
    const act = transitBtn.dataset.transitAction;
    if (act === 'ring') engine.disembarkTransit();
    else if (act === 'next-now') engine.disembarkTransit({ immediateToNextStop: true });
    refreshUi(true);
  }
});

dom.guideList.addEventListener('click', (event) => {
  const state = engine.getState();
  if (state.mode === 'interior') {
    engine.exitVenue();
  }
  const venueBtn = event.target.closest('[data-walk-venue]');
  if (venueBtn) {
    const venue = VENUES.find((v) => v.id === venueBtn.dataset.walkVenue);
    if (venue) {
      const path = buildOverworldPath(
        engine.getState().player.x,
        engine.getState().player.y,
        venue.spawnOutside.x,
        venue.spawnOutside.y,
        { type: 'enterVenue', id: venue.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking toward ${venue.name} in ${venue.memory.neighborhood}...`);
    }
    return;
  }
  const benchBtn = event.target.closest('[data-walk-bench]');
  if (benchBtn) {
    const spot = REST_SPOTS.find((s) => s.id === benchBtn.dataset.walkBench);
    if (spot) {
      const path = buildOverworldPath(
        engine.getState().player.x,
        engine.getState().player.y,
        spot.x,
        spot.y + 22,
        { type: 'restBench', id: spot.id }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking toward ${spot.name}...`);
    }
    return;
  }
  const stopBtn = event.target.closest('[data-walk-stop]');
  if (stopBtn) {
    const stop = ALL_STOPS.find((s) => s.stopId === stopBtn.dataset.walkStop);
    if (stop) {
      const path = buildOverworldPath(
        engine.getState().player.x,
        engine.getState().player.y,
        stop.platformX,
        stop.platformY,
        { type: 'boardStop', id: stop.stopId }
      );
      engine.setWalkPath(path);
      setStatusBanner(`Walking to ${stop.stopName} for ${stop.lineName}...`);
    }
  }
});

// Main animation loop
let lastFrameTime = performance.now();
let uiTimer = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  engine.tick(dt, getKeyboardVector());
  const state = engine.getState();
  const nearby = engine.getNearbyInteraction();
  renderer.render(state, nearby, dt);

  uiTimer += dt;
  if (uiTimer >= 0.12) {
    uiTimer = 0;
    refreshUi(false);
  }

  window.requestAnimationFrame(frame);
}

refreshUi(true);
window.requestAnimationFrame(frame);
