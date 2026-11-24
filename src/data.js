// Unified Lisboa Data Barrel - re-exports modular Lisbon domain datasets from src/data/*.js
export * from './data/world.js';
export * from './data/ferryAndLifts.js';
export * from './data/metro.js';
export * from './data/districts.js';
export * from './data/landmarks.js';
export * from './data/walkingNetwork.js';
export * from './data/venues.js';
export * from './data/transit.js';
export * from './data/charactersAndCalendar.js';

import { VENUES, REST_SPOTS } from './data/venues.js';
import { ENTERABLE_LANDMARK_VENUES } from './data/landmarks.js';
import { TRANSIT_LINES } from './data/transit.js';
import { METRO_LINE } from './data/metro.js';
import { FERRY_DESTINATIONS } from './data/ferryAndLifts.js';
import { MILESTONE_MEMORIES } from './data/charactersAndCalendar.js';

export function getAllMemoryCatalog() {
  const catalog = [];
  for (const venue of VENUES) {
    catalog.push(venue.memory);
  }
  for (const line of TRANSIT_LINES) {
    if (line.memory) catalog.push(line.memory);
  }
  catalog.push(METRO_LINE.memory);
  for (const ferryDest of FERRY_DESTINATIONS) {
    catalog.push(ferryDest.memory);
  }
  for (const spot of REST_SPOTS) {
    catalog.push(spot.memory);
  }
  catalog.push(MILESTONE_MEMORIES.taste);
  catalog.push(MILESTONE_MEMORIES.keepsake);
  return catalog;
}

export const ALL_ENTERABLE_VENUES = [...VENUES, ...ENTERABLE_LANDMARK_VENUES];

const ALL_ENTERABLE_VENUE_MAP = new Map(ALL_ENTERABLE_VENUES.map((v) => [v.id, v]));

export function findEnterableVenueById(venueId) {
  return ALL_ENTERABLE_VENUE_MAP.get(venueId) || null;
}
