import { VENUES, findEnterableVenueById, WATERFRONT_Y, FADO_TRACKS, FERRY_TERMINAL, FERRY_DESTINATIONS, LISBOA_CITY_DISTRICTS, REST_SPOTS, TRANSIT_LINES, getMonthInfo, isBairroAltoPartyTime } from '../data.js';

import { clamp } from '../shared/geometry.js';

export const EMPTY_PROFILE = {
  bakeryFire: 0,
  fadoMusic: 0,
  folkGuitar: 0,
  grillSizzle: 0,
  cafeSteam: 0,
  metroRumble: 0,
  metroRiding: false,
  ferryEngine: 0,
  cathedralOrgan: 0,
  vinylCrackle: 0,
  riverWater: 0,
  rainLevel: 0,
  badgeTone: 'idle',
  activeLabel: 'Lisboa Streets'
};

/**
 * Pure, headless calculation of active Lisboa soundscape intensities based on player state.
 * Every building interior, underground Metro phase, Transtejo ferry crossing, surface transit ride,
 * and the Tagus riverfront maps to a distinct background soundscape or Portuguese cultural / Fado motif.
 */
export function computeSoundscapeProfile(state) {
  if (!state) {
    return { ...EMPTY_PROFILE };
  }

  const monthInfo = getMonthInfo(state.month);
  const outdoorRain = Math.round(clamp(monthInfo.rainIntensity || 0, 0, 1) * 100) / 100;
  const indoorRain = Math.round(outdoorRain * 0.22 * 100) / 100;

  if (state.mode === 'interior' && state.currentVenueId) {
    const venue = findEnterableVenueById(state.currentVenueId);
    if (!venue) return { ...EMPTY_PROFILE, rainLevel: indoorRain, activeLabel: 'Indoors' };

    if (venue.id === 'tasca-do-fado') {
      return {
        ...EMPTY_PROFILE,
        fadoMusic: 1,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: 'Fado Music'
      };
    }

    if (venue.id === 'taberna-sardinha') {
      return {
        ...EMPTY_PROFILE,
        grillSizzle: 1,
        fadoMusic: 0.42,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: 'Charcoal Grill & Fado'
      };
    }

    if (venue.interiorTheme?.layout === 'bakery') {
      return {
        ...EMPTY_PROFILE,
        bakeryFire: venue.id === 'casa-da-rosa' ? 1 : 0.78,
        folkGuitar: venue.id === 'arcadas-chiado' ? 0.32 : 0,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: venue.id === 'casa-da-rosa' ? 'Bakery Wood Oven' : 'Pastry Oven & Tea Salon'
      };
    }

    if (venue.interiorTheme?.layout === 'cafe') {
      return {
        ...EMPTY_PROFILE,
        cafeSteam: venue.id === 'cafe-do-poeta' ? 1 : 0.72,
        folkGuitar: 0.3,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: venue.id === 'cafe-do-poeta' ? 'Espresso Steam & Cafe' : 'Kiosk Cafe & Espresso'
      };
    }

    if (venue.interiorTheme?.layout === 'cathedral') {
      return {
        ...EMPTY_PROFILE,
        cathedralOrgan: 1,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: 'Se Cathedral Organ'
      };
    }

    if (venue.interiorTheme?.layout === 'vinyl') {
      return {
        ...EMPTY_PROFILE,
        fadoMusic: 0.85,
        vinylCrackle: 0.9,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: 'Fado Vinyl & Crackle'
      };
    }

    if (venue.interiorTheme?.layout === 'bar') {
      return {
        ...EMPTY_PROFILE,
        fadoMusic: 0.72,
        folkGuitar: 0.88,
        cafeSteam: 0.28,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: 'Bairro Alto Bar & Party'
      };
    }

    if (venue.interiorTheme?.layout === 'azulejo') {
      return {
        ...EMPTY_PROFILE,
        folkGuitar: 0.78,
        bakeryFire: 0.3,
        rainLevel: indoorRain,
        badgeTone: 'warm',
        activeLabel: 'Tile Kiln & Folk Guitar'
      };
    }

    return {
      ...EMPTY_PROFILE,
      folkGuitar: 0.78,
      rainLevel: indoorRain,
      badgeTone: 'warm',
      activeLabel: 'Portuguese Folk Guitar'
    };
  }

  if (state.mode === 'metro') {
    const isRiding = state.metro?.phase === 'riding';
    return {
      ...EMPTY_PROFILE,
      metroRumble: isRiding ? 1 : 0.58,
      metroRiding: isRiding,
      badgeTone: 'metro',
      activeLabel: isRiding ? 'Metro Tunnel Rumble' : 'Metro Station Vault'
    };
  }

  if (state.mode === 'ferry') {
    const isSailing = state.ferry?.phase === 'sailing';
    const portId = state.ferry?.portId;
    const isSouthBank = Boolean(portId && portId !== FERRY_TERMINAL.id);
    const portLabel =
      portId === FERRY_TERMINAL.id
        ? 'Cais do Sodre Pier'
        : `${FERRY_DESTINATIONS.find((d) => d.id === portId)?.shortName || 'South Bank'} Waterfront`;
    return {
      ...EMPTY_PROFILE,
      riverWater: isSailing ? 1 : isSouthBank ? 0.65 : 0.86,
      ferryEngine: isSailing ? 1 : isSouthBank ? 0.16 : 0.42,
      folkGuitar: !isSailing && isSouthBank ? 0.48 : 0,
      rainLevel: outdoorRain,
      badgeTone: isSailing || !isSouthBank ? 'water' : 'warm',
      activeLabel: isSailing ? 'Tagus Ferry Crossing' : portLabel
    };
  }

  if (state.mode === 'santa-justa') {
    const sjPhase = state.santaJusta?.phase;
    if (sjPhase === 'ascending' || sjPhase === 'descending') {
      return {
        ...EMPTY_PROFILE,
        metroRumble: 0.48,
        rainLevel: indoorRain,
        badgeTone: 'metro',
        activeLabel: 'Santa Justa 1902 Lift'
      };
    }
    if (sjPhase === 'miradouro') {
      return {
        ...EMPTY_PROFILE,
        folkGuitar: 0.52,
        riverWater: 0.28,
        rainLevel: outdoorRain,
        badgeTone: 'warm',
        activeLabel: 'Santa Justa 45m Miradouro'
      };
    }
    return {
      ...EMPTY_PROFILE,
      folkGuitar: 0.26,
      rainLevel: indoorRain,
      badgeTone: 'warm',
      activeLabel: 'Santa Justa Lobby'
    };
  }

  if (state.mode === 'city-district') {
    const district = LISBOA_CITY_DISTRICTS.find((d) => d.id === state.cityDistrictId);
    const isRiverfront =
      district?.skylineStyle === 'oriente-calatrava' || district?.skylineStyle === 'belem-tower';
    return {
      ...EMPTY_PROFILE,
      riverWater: isRiverfront ? 0.58 : district?.skylineStyle === 'alameda-fountain' ? 0.35 : 0,
      folkGuitar: 0.42,
      rainLevel: outdoorRain,
      badgeTone: isRiverfront ? 'water' : 'warm',
      activeLabel: district ? `${district.shortName} Plaza` : 'Lisboa City District'
    };
  }

  const px = Number.isFinite(state.player?.x) ? state.player.x : 950;
  const py = Number.isFinite(state.player?.y) ? state.player.y : 544;
  const riverStartY = WATERFRONT_Y - 240; // y = 790
  const riverPeakY = WATERFRONT_Y - 38;   // y = 992
  const rawRiver = clamp((py - riverStartY) / (riverPeakY - riverStartY), 0, 1);
  let riverWater = Math.round(Math.pow(rawRiver, 1.35) * 1000) / 1000;
  // Eastern Tagus Estuary waterfront along Parque das Nacoes & Gare do Oriente
  if (px >= 2700 && py >= -780) {
    riverWater = Math.max(riverWater, 0.58);
  }
  // Monumental Fonte Luminosa water cascade in Alameda Dom Afonso Henriques
  if (px >= 1650 && px <= 2320 && py >= -700 && py <= -240) {
    riverWater = Math.max(riverWater, 0.35);
  }

  if (state.ridingVehicleId) {
    const line = TRANSIT_LINES.find((l) => l.id === state.ridingVehicleId);
    const isTram = line ? line.mode === 'tram' : state.ridingVehicleId.startsWith('tram-');
    const routeTag = line?.routeNumber || (isTram ? '28E' : '737');
    return {
      ...EMPTY_PROFILE,
      metroRumble: isTram ? 0.42 : 0.48,
      metroRiding: isTram,
      riverWater,
      rainLevel: Math.round(outdoorRain * 0.4 * 100) / 100,
      badgeTone: riverWater >= 0.35 ? 'water' : 'metro',
      activeLabel: isTram ? `Tram ${routeTag} Rail Hum` : `Carris Bus ${routeTag} Coach`
    };
  }

  let miradouroGuitar = 0;
  for (const spot of REST_SPOTS) {
    const d = Math.hypot(px - spot.x, py - spot.y);
    if (d <= 120) {
      miradouroGuitar = Math.max(miradouroGuitar, Math.round((1 - d / 140) * 85) / 100);
    }
  }
  if (state.miradouroEncore) {
    miradouroGuitar = Math.max(miradouroGuitar, 0.78);
  }

  const inBairroPartyZone = px >= 0 && px <= 840 && py >= 0 && py <= 285 && isBairroAltoPartyTime(state.minutesOfDay);
  if (inBairroPartyZone) {
    return {
      ...EMPTY_PROFILE,
      folkGuitar: Math.max(miradouroGuitar, 0.78),
      fadoMusic: 0.36,
      riverWater,
      rainLevel: outdoorRain,
      badgeTone: 'warm',
      activeLabel: 'Bairro Alto Evening Party'
    };
  }

  return {
    ...EMPTY_PROFILE,
    folkGuitar: miradouroGuitar,
    riverWater,
    rainLevel: outdoorRain,
    badgeTone: riverWater >= 0.12 || outdoorRain >= 0.45 ? 'water' : miradouroGuitar >= 0.35 ? 'warm' : 'idle',
    activeLabel:
      riverWater >= 0.12
        ? 'Tagus Riverfront'
        : state.miradouroEncore || miradouroGuitar >= 0.45
          ? 'Miradouro Street Musician'
          : outdoorRain >= 0.45
            ? 'Lisboa Atlantic Rain'
            : 'Lisboa Streets'
  };
}

// Fallback procedural Fado Menor progression (used seamlessly if MP3 playback is unavailable)
export const FADO_MELODY_STEPS = [
  { freq: 440.0, dur: 0.72, vel: 0.9 },
  { freq: 523.25, dur: 0.36, vel: 0.75 },
  { freq: 659.25, dur: 0.78, vel: 1.0 },
  { freq: 587.33, dur: 0.36, vel: 0.8 },
  { freq: 523.25, dur: 0.42, vel: 0.85 },
  { freq: 587.33, dur: 0.75, vel: 0.95 },
  { freq: 698.46, dur: 0.62, vel: 0.9 },
  { freq: 659.25, dur: 0.45, vel: 0.78 },
  { freq: 622.25, dur: 0.32, vel: 0.65 },
  { freq: 659.25, dur: 0.68, vel: 0.95 },
  { freq: 493.88, dur: 0.45, vel: 0.82 },
  { freq: 415.30, dur: 0.82, vel: 0.92 },
  { freq: 440.0, dur: 0.95, vel: 0.95 },
  { freq: 523.25, dur: 0.38, vel: 0.72 },
  { freq: 493.88, dur: 0.38, vel: 0.7 },
  { freq: 440.0, dur: 0.55, vel: 0.65 }
];

export const FADO_CHORDS = [
  { bass: 110.0, notes: [220.0, 261.63, 329.63] },
  { bass: 146.83, notes: [220.0, 293.66, 349.23] },
  { bass: 82.41, notes: [207.65, 246.94, 329.63] },
  { bass: 110.0, notes: [220.0, 261.63, 329.63] }
];

export const FOLK_MELODY_STEPS = [
  { freq: 392.0, dur: 0.55, vel: 0.82 },
  { freq: 493.88, dur: 0.42, vel: 0.78 },
  { freq: 587.33, dur: 0.68, vel: 0.9 },
  { freq: 523.25, dur: 0.38, vel: 0.75 },
  { freq: 493.88, dur: 0.65, vel: 0.85 },
  { freq: 440.0, dur: 0.4, vel: 0.75 },
  { freq: 392.0, dur: 0.62, vel: 0.8 },
  { freq: 329.63, dur: 0.48, vel: 0.7 },
  { freq: 523.25, dur: 0.66, vel: 0.88 },
  { freq: 587.33, dur: 0.42, vel: 0.82 },
  { freq: 659.25, dur: 0.72, vel: 0.92 },
  { freq: 587.33, dur: 0.4, vel: 0.76 },
  { freq: 587.33, dur: 0.62, vel: 0.85 },
  { freq: 523.25, dur: 0.42, vel: 0.78 },
  { freq: 440.0, dur: 0.55, vel: 0.8 },
  { freq: 392.0, dur: 0.85, vel: 0.88 }
];

export const FOLK_CHORDS = [
  { bass: 98.0, notes: [196.0, 246.94, 293.66] },
  { bass: 82.41, notes: [196.0, 246.94, 329.63] },
  { bass: 130.81, notes: [196.0, 261.63, 329.63] },
  { bass: 146.83, notes: [220.0, 293.66, 369.99] }
];

export const CATHEDRAL_ORGAN_CHORDS = [
  [146.83, 220.0, 293.66, 349.23],
  [130.81, 196.0, 261.63, 329.63],
  [116.54, 174.61, 233.08, 293.66],
  [110.0, 164.81, 220.0, 277.18]
];
