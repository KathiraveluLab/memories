import { VENUES, WATERFRONT_Y } from './data.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const EMPTY_PROFILE = {
  bakeryFire: 0,
  fadoMusic: 0,
  folkGuitar: 0,
  grillSizzle: 0,
  cafeSteam: 0,
  metroRumble: 0,
  metroRiding: false,
  cathedralOrgan: 0,
  vinylCrackle: 0,
  riverWater: 0,
  badgeTone: 'idle',
  activeLabel: 'Lisboa Streets'
};

/**
 * Pure, headless calculation of active Lisboa soundscape intensities based on player state.
 * Every building interior, underground Metro phase, transit ride, and the Tagus riverfront
 * maps to a distinct background soundscape or Portuguese cultural / Fado musical motif.
 */
export function computeSoundscapeProfile(state) {
  if (!state) {
    return { ...EMPTY_PROFILE };
  }

  if (state.mode === 'interior' && state.currentVenueId) {
    const venue = VENUES.find((v) => v.id === state.currentVenueId);
    if (!venue) return { ...EMPTY_PROFILE, activeLabel: 'Indoors' };

    // 1. Fado Tavern (Tasca do Fado): traditional minor-key Lisbon Fado music
    if (venue.id === 'tasca-do-fado') {
      return {
        ...EMPTY_PROFILE,
        fadoMusic: 1,
        badgeTone: 'warm',
        activeLabel: 'Fado Music'
      };
    }

    // 2. Alfama Charcoal Grill Restaurant (Taberna da Sardinha): sizzling charcoal sardine grill + tavern Fado
    if (venue.id === 'taberna-sardinha') {
      return {
        ...EMPTY_PROFILE,
        grillSizzle: 1,
        fadoMusic: 0.45,
        badgeTone: 'warm',
        activeLabel: 'Charcoal Grill & Fado'
      };
    }

    // 3. Bakeries & Confeitaria (Casa da Rosa - Padaria, Arcadas do Chiado): brick wood-fired oven & fire crackle
    if (venue.interiorTheme?.layout === 'bakery') {
      return {
        ...EMPTY_PROFILE,
        bakeryFire: venue.id === 'casa-da-rosa' ? 1 : 0.78,
        folkGuitar: venue.id === 'arcadas-chiado' ? 0.32 : 0,
        badgeTone: 'warm',
        activeLabel: venue.id === 'casa-da-rosa' ? 'Bakery Wood Oven' : 'Pastry Oven & Tea Salon'
      };
    }

    // 4. Historic Cafes (Cafe A Brasileira, Quiosque de Sao Pedro): espresso machine steam, porcelain clinks & soft guitar
    if (venue.interiorTheme?.layout === 'cafe') {
      return {
        ...EMPTY_PROFILE,
        cafeSteam: venue.id === 'cafe-do-poeta' ? 1 : 0.72,
        folkGuitar: 0.3,
        badgeTone: 'warm',
        activeLabel: venue.id === 'cafe-do-poeta' ? 'Espresso Steam & Cafe' : 'Kiosk Cafe & Espresso'
      };
    }

    // 5. Se de Lisboa (1147 Cathedral): resonant limestone nave pipe organ
    if (venue.interiorTheme?.layout === 'cathedral') {
      return {
        ...EMPTY_PROFILE,
        cathedralOrgan: 1,
        badgeTone: 'warm',
        activeLabel: 'Se Cathedral Organ'
      };
    }

    // 6. Vinyl & Print Shop (Vinil & Gravuras do Alto): warm spinning Fado vinyl record with needle crackle
    if (venue.interiorTheme?.layout === 'vinyl') {
      return {
        ...EMPTY_PROFILE,
        fadoMusic: 0.82,
        vinylCrackle: 0.9,
        badgeTone: 'warm',
        activeLabel: 'Fado Vinyl & Crackle'
      };
    }

    // 7. Ceramic Tile Workshop (Oficina de Azulejos): sunlit Portuguese folk guitar & warm ceramic kiln hum
    if (venue.interiorTheme?.layout === 'azulejo') {
      return {
        ...EMPTY_PROFILE,
        folkGuitar: 0.78,
        bakeryFire: 0.3,
        badgeTone: 'warm',
        activeLabel: 'Tile Kiln & Folk Guitar'
      };
    }

    // 8. Bookshop, Galleries, Cork Atelier, Grocer & Guesthouse: warm Portuguese cultural folk guitar
    return {
      ...EMPTY_PROFILE,
      folkGuitar: 0.78,
      badgeTone: 'warm',
      activeLabel: 'Portuguese Folk Guitar'
    };
  }

  // Underground Metropolitano de Lisboa: subterranean station vault hum / escalator whirr & full tunnel train rumble
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

  // Overworld: smooth spatial swell as the traveler approaches the Tagus Riverfront (WATERFRONT_Y = 1030)
  const py = Number.isFinite(state.player?.y) ? state.player.y : 544;
  const riverStartY = WATERFRONT_Y - 240; // y = 790
  const riverPeakY = WATERFRONT_Y - 38;   // y = 992
  const rawRiver = clamp((py - riverStartY) / (riverPeakY - riverStartY), 0, 1);
  const riverWater = Math.round(Math.pow(rawRiver, 1.35) * 1000) / 1000;

  if (state.ridingVehicleId) {
    const isTram = state.ridingVehicleId === 'tram-28e';
    return {
      ...EMPTY_PROFILE,
      metroRumble: isTram ? 0.42 : 0.35,
      metroRiding: isTram,
      riverWater,
      badgeTone: riverWater >= 0.35 ? 'water' : 'metro',
      activeLabel: isTram ? 'Tram 28E Rail Hum' : 'Carris Bus Coach'
    };
  }

  return {
    ...EMPTY_PROFILE,
    riverWater,
    badgeTone: riverWater >= 0.12 ? 'water' : 'idle',
    activeLabel: riverWater >= 0.12 ? 'Tagus Riverfront' : 'Lisboa Streets'
  };
}

// Traditional Lisbon Fado Menor progression in A minor (Am - Dm - E7 - Am - F - Dm - E7 - Am)
const FADO_MELODY_STEPS = [
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
  { freq: 440.0, dur: 0.55, vel: 0.65 },
  { freq: 698.46, dur: 0.75, vel: 0.95 },
  { freq: 659.25, dur: 0.38, vel: 0.82 },
  { freq: 587.33, dur: 0.42, vel: 0.8 },
  { freq: 523.25, dur: 0.7, vel: 0.86 },
  { freq: 587.33, dur: 0.72, vel: 0.92 },
  { freq: 523.25, dur: 0.38, vel: 0.8 },
  { freq: 493.88, dur: 0.42, vel: 0.78 },
  { freq: 440.0, dur: 0.62, vel: 0.84 },
  { freq: 493.88, dur: 0.45, vel: 0.85 },
  { freq: 523.25, dur: 0.36, vel: 0.78 },
  { freq: 493.88, dur: 0.42, vel: 0.82 },
  { freq: 415.30, dur: 0.86, vel: 0.95 },
  { freq: 440.0, dur: 1.15, vel: 1.0 },
  { freq: 329.63, dur: 0.48, vel: 0.68 },
  { freq: 392.0, dur: 0.32, vel: 0.55 },
  { freq: 440.0, dur: 0.95, vel: 0.85 }
];

const FADO_CHORDS = [
  { bass: 110.0, notes: [220.0, 261.63, 329.63] },
  { bass: 146.83, notes: [220.0, 293.66, 349.23] },
  { bass: 82.41, notes: [207.65, 246.94, 329.63] },
  { bass: 110.0, notes: [220.0, 261.63, 329.63] },
  { bass: 87.31, notes: [220.0, 261.63, 349.23] },
  { bass: 146.83, notes: [220.0, 293.66, 349.23] },
  { bass: 82.41, notes: [207.65, 246.94, 293.66] },
  { bass: 110.0, notes: [220.0, 261.63, 329.63] }
];

// Sunlit Portuguese cultural folk guitar progression (G major - Em - C - D7) for bookshops, ateliers & galleries
const FOLK_MELODY_STEPS = [
  { freq: 392.0, dur: 0.55, vel: 0.82 },  // G4
  { freq: 493.88, dur: 0.42, vel: 0.78 }, // B4
  { freq: 587.33, dur: 0.68, vel: 0.9 },  // D5
  { freq: 523.25, dur: 0.38, vel: 0.75 }, // C5
  { freq: 493.88, dur: 0.65, vel: 0.85 }, // B4
  { freq: 440.0, dur: 0.4, vel: 0.75 },   // A4
  { freq: 392.0, dur: 0.62, vel: 0.8 },   // G4
  { freq: 329.63, dur: 0.48, vel: 0.7 },  // E4
  { freq: 523.25, dur: 0.66, vel: 0.88 }, // C5
  { freq: 587.33, dur: 0.42, vel: 0.82 }, // D5
  { freq: 659.25, dur: 0.72, vel: 0.92 }, // E5
  { freq: 587.33, dur: 0.4, vel: 0.76 },  // D5
  { freq: 587.33, dur: 0.62, vel: 0.85 }, // D5
  { freq: 523.25, dur: 0.42, vel: 0.78 }, // C5
  { freq: 440.0, dur: 0.55, vel: 0.8 },   // A4
  { freq: 392.0, dur: 0.85, vel: 0.88 }   // G4
];

const FOLK_CHORDS = [
  { bass: 98.0, notes: [196.0, 246.94, 293.66] },   // G
  { bass: 82.41, notes: [196.0, 246.94, 329.63] },  // Em
  { bass: 130.81, notes: [196.0, 261.63, 329.63] }, // C
  { bass: 146.83, notes: [220.0, 293.66, 369.99] }  // D
];

// Resonant 12th-century Se de Lisboa modal pipe organ progression (Dm - C - Bb - A)
const CATHEDRAL_ORGAN_CHORDS = [
  [146.83, 220.0, 293.66, 349.23], // Dm
  [130.81, 196.0, 261.63, 329.63], // C
  [116.54, 174.61, 233.08, 293.66], // Bb
  [110.0, 164.81, 220.0, 277.18]   // A
];

export class LisboaSoundEngine {
  constructor({ audioContextFactory = null } = {}) {
    this.audioContextFactory = audioContextFactory;
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;
    this.disposed = false;

    this.profile = { ...EMPTY_PROFILE };

    // Master & soundscape buses created lazily on unlock()
    this.masterGain = null;
    this.bakeryBus = null;
    this.fadoBus = null;
    this.folkBus = null;
    this.grillBus = null;
    this.cafeBus = null;
    this.metroBus = null;
    this.organBus = null;
    this.vinylBus = null;
    this.riverBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;

    // Schedulers
    this.crackleTimer = null;
    this.fadoTimer = null;
    this.folkTimer = null;
    this.cafeTimer = null;
    this.railTimer = null;
    this.organTimer = null;
    this.fadoStepIndex = 0;
    this.folkStepIndex = 0;
    this.organChordIndex = 0;
    this.cafeTickCount = 0;
  }

  isMuted() {
    return this.muted;
  }

  isUnlocked() {
    return this.unlocked;
  }

  getProfile() {
    return this.profile;
  }

  createAudioContext() {
    if (typeof this.audioContextFactory === 'function') {
      return this.audioContextFactory();
    }
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  }

  buildNoiseBuffer(ctx, durationSeconds = 3.5) {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    // Warm pink-weighted noise (Paul Kellet filter) for rich fire, sizzle, steam, rumble & river textures
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = clamp((b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08, -1, 1);
      b6 = white * 0.115926;
    }
    return buffer;
  }

  unlock() {
    if (this.disposed) return false;
    if (!this.ctx) {
      const ctx = this.createAudioContext();
      if (!ctx) return false;
      this.ctx = ctx;
      this.initGraph(ctx);
    }
    if (typeof this.ctx.resume === 'function' && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume();
      } catch {
        // Ignore resume rejection if called outside gesture
      }
    }
    this.unlocked = true;
    this.applyGains();
    return true;
  }

  createBus(ctx, initialGain = 0) {
    const bus = ctx.createGain();
    bus.gain.value = initialGain;
    bus.connect(this.masterGain);
    return bus;
  }

  initGraph(ctx) {
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.78;
    this.masterGain.connect(ctx.destination);

    this.bakeryBus = this.createBus(ctx, 0);
    this.fadoBus = this.createBus(ctx, 0);
    this.folkBus = this.createBus(ctx, 0);
    this.grillBus = this.createBus(ctx, 0);
    this.cafeBus = this.createBus(ctx, 0);
    this.metroBus = this.createBus(ctx, 0);
    this.organBus = this.createBus(ctx, 0);
    this.vinylBus = this.createBus(ctx, 0);
    this.riverBus = this.createBus(ctx, 0);
    this.sfxBus = this.createBus(ctx, 0.65);

    this.noiseBuffer = this.buildNoiseBuffer(ctx, 3.5);

    this.setupBakeryOvenBed(ctx);
    this.setupGrillSizzleBed(ctx);
    this.setupCafeBed(ctx);
    this.setupMetroRumbleBed(ctx);
    this.setupVinylBed(ctx);
    this.setupRiverWaterBed(ctx);
    this.startSchedulers();
  }

  setupBakeryOvenBed(ctx) {
    // 1. Deep brick wood-fired oven rumble modulated by slow flame draft LFO
    const hearthSrc = ctx.createBufferSource();
    hearthSrc.buffer = this.noiseBuffer;
    hearthSrc.loop = true;

    const hearthFilter = ctx.createBiquadFilter();
    hearthFilter.type = 'lowpass';
    hearthFilter.frequency.value = 185;
    hearthFilter.Q.value = 1.4;

    const draftLfo = ctx.createOscillator();
    draftLfo.type = 'sine';
    draftLfo.frequency.value = 0.34;
    const draftDepth = ctx.createGain();
    draftDepth.gain.value = 55;
    draftLfo.connect(draftDepth);
    draftDepth.connect(hearthFilter.frequency);

    const hearthGain = ctx.createGain();
    hearthGain.gain.value = 0.85;

    hearthSrc.connect(hearthFilter);
    hearthFilter.connect(hearthGain);
    hearthGain.connect(this.bakeryBus);
    hearthSrc.start();
    draftLfo.start();

    // 2. Warm glowing flame air wash
    const flameSrc = ctx.createBufferSource();
    flameSrc.buffer = this.noiseBuffer;
    flameSrc.loop = true;

    const flameFilter = ctx.createBiquadFilter();
    flameFilter.type = 'bandpass';
    flameFilter.frequency.value = 480;
    flameFilter.Q.value = 1.8;

    const flameGain = ctx.createGain();
    flameGain.gain.value = 0.24;

    flameSrc.connect(flameFilter);
    flameFilter.connect(flameGain);
    flameGain.connect(this.bakeryBus);
    flameSrc.start();
  }

  setupGrillSizzleBed(ctx) {
    // 1. High-frequency sizzling charcoal sardine hiss
    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = this.noiseBuffer;
    hissSrc.loop = true;

    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 4600;
    hissFilter.Q.value = 0.9;

    const sizzleLfo = ctx.createOscillator();
    sizzleLfo.type = 'sine';
    sizzleLfo.frequency.value = 0.62;
    const sizzleDepth = ctx.createGain();
    sizzleDepth.gain.value = 0.14;

    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.34;
    sizzleLfo.connect(sizzleDepth);
    sizzleDepth.connect(hissGain.gain);

    hissSrc.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(this.grillBus);
    hissSrc.start();
    sizzleLfo.start();

    // 2. Warm low charcoal ember glow
    const coalSrc = ctx.createBufferSource();
    coalSrc.buffer = this.noiseBuffer;
    coalSrc.loop = true;

    const coalFilter = ctx.createBiquadFilter();
    coalFilter.type = 'lowpass';
    coalFilter.frequency.value = 240;

    const coalGain = ctx.createGain();
    coalGain.gain.value = 0.38;

    coalSrc.connect(coalFilter);
    coalFilter.connect(coalGain);
    coalGain.connect(this.grillBus);
    coalSrc.start();
  }

  setupCafeBed(ctx) {
    // Warm low-mid coffeehouse atmosphere hum (soft espresso boiler & cozy salon murmur)
    const salonSrc = ctx.createBufferSource();
    salonSrc.buffer = this.noiseBuffer;
    salonSrc.loop = true;

    const salonFilter = ctx.createBiquadFilter();
    salonFilter.type = 'bandpass';
    salonFilter.frequency.value = 390;
    salonFilter.Q.value = 1.2;

    const salonGain = ctx.createGain();
    salonGain.gain.value = 0.22;

    salonSrc.connect(salonFilter);
    salonFilter.connect(salonGain);
    salonGain.connect(this.cafeBus);
    salonSrc.start();

    // Subtle brass espresso boiler simmer
    const boilerOsc = ctx.createOscillator();
    boilerOsc.type = 'sine';
    boilerOsc.frequency.value = 118;
    const boilerGain = ctx.createGain();
    boilerGain.gain.value = 0.04;
    boilerOsc.connect(boilerGain);
    boilerGain.connect(this.cafeBus);
    boilerOsc.start();
  }

  setupMetroRumbleBed(ctx) {
    // 1. Subterranean cavernous low-frequency rumble (55-140 Hz)
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = this.noiseBuffer;
    rumbleSrc.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 135;
    rumbleFilter.Q.value = 1.8;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.92;

    rumbleSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.metroBus);
    rumbleSrc.start();

    // 2. Tunnel airflow & electric traction motor hum
    const motorOsc = ctx.createOscillator();
    motorOsc.type = 'triangle';
    motorOsc.frequency.value = 64;

    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 150;

    const motorGain = ctx.createGain();
    motorGain.gain.value = 0.14;

    motorOsc.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(this.metroBus);
    motorOsc.start();

    // 3. Vaulted tunnel wind whoosh
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 460;
    windFilter.Q.value = 1.4;

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.value = 0.45;
    const windDepth = ctx.createGain();
    windDepth.gain.value = 160;
    windLfo.connect(windDepth);
    windDepth.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.value = 0.25;

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.metroBus);
    windSrc.start();
    windLfo.start();
  }

  setupVinylBed(ctx) {
    // Warm analog vinyl surface noise bed inside Vinil & Gravuras do Alto
    const vinylSrc = ctx.createBufferSource();
    vinylSrc.buffer = this.noiseBuffer;
    vinylSrc.loop = true;

    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.value = 3200;
    vinylFilter.Q.value = 1.1;

    const vinylGain = ctx.createGain();
    vinylGain.gain.value = 0.09;

    vinylSrc.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(this.vinylBus);
    vinylSrc.start();
  }

  setupRiverWaterBed(ctx) {
    // 1. Wide Tagus River steady current bed
    const currentSrc = ctx.createBufferSource();
    currentSrc.buffer = this.noiseBuffer;
    currentSrc.loop = true;

    const currentFilter = ctx.createBiquadFilter();
    currentFilter.type = 'bandpass';
    currentFilter.frequency.value = 420;
    currentFilter.Q.value = 0.65;

    const currentGain = ctx.createGain();
    currentGain.gain.value = 0.34;

    currentSrc.connect(currentFilter);
    currentFilter.connect(currentGain);
    currentGain.connect(this.riverBus);
    currentSrc.start();

    // 2. Gently swelling waves lapping against Cais de Alfama stone quay
    const waveSrc = ctx.createBufferSource();
    waveSrc.buffer = this.noiseBuffer;
    waveSrc.loop = true;

    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 620;
    waveFilter.Q.value = 0.9;

    const waveLfo = ctx.createOscillator();
    waveLfo.type = 'sine';
    waveLfo.frequency.value = 0.15;
    const waveFreqDepth = ctx.createGain();
    waveFreqDepth.gain.value = 260;
    waveLfo.connect(waveFreqDepth);
    waveFreqDepth.connect(waveFilter.frequency);

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.46;

    const ampLfo = ctx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.value = 0.21;
    const ampDepth = ctx.createGain();
    ampDepth.gain.value = 0.18;
    ampLfo.connect(ampDepth);
    ampDepth.connect(waveGain.gain);

    waveSrc.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(this.riverBus);
    waveSrc.start();
    waveLfo.start();
    ampLfo.start();

    // 3. Soft shimmering river surface ripple
    const shimmerSrc = ctx.createBufferSource();
    shimmerSrc.buffer = this.noiseBuffer;
    shimmerSrc.loop = true;

    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'bandpass';
    shimmerFilter.frequency.value = 1850;
    shimmerFilter.Q.value = 2.2;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.08;

    shimmerSrc.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(this.riverBus);
    shimmerSrc.start();
  }

  startSchedulers() {
    // 1. Organic fire crackles, charcoal sardine sizzle pops & vinyl ticks
    if (!this.crackleTimer) {
      this.crackleTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx) return;
        if (this.profile.bakeryFire >= 0.05 && Math.random() < 0.65) {
          this.triggerOvenCrackle();
        }
        if (this.profile.grillSizzle >= 0.05 && Math.random() < 0.78) {
          this.triggerGrillPop();
        }
        if (this.profile.vinylCrackle >= 0.05 && Math.random() < 0.52) {
          this.triggerVinylTick();
        }
      }, 170);
      this.crackleTimer.unref?.();
    }

    // 2. Lyrical Portuguese Guitar & Viola de Fado sequencer (~73 BPM)
    if (!this.fadoTimer) {
      this.fadoTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx || this.profile.fadoMusic < 0.05) return;
        this.playNextFadoStep();
      }, 410);
      this.fadoTimer.unref?.();
    }

    // 3. Sunlit Portuguese folk guitar sequencer for bookshops, galleries & ateliers
    if (!this.folkTimer) {
      this.folkTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx || this.profile.folkGuitar < 0.05) return;
        this.playNextFolkStep();
      }, 460);
      this.folkTimer.unref?.();
    }

    // 4. Espresso steam wand bursts & porcelain cup clinks in cafes
    if (!this.cafeTimer) {
      this.cafeTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx || this.profile.cafeSteam < 0.05) return;
        this.cafeTickCount += 1;
        if (this.cafeTickCount % 3 === 1) {
          this.triggerEspressoSteam();
        } else {
          this.triggerCupClink();
        }
      }, 1450);
      this.cafeTimer.unref?.();
    }

    // 5. Rhythmic underground Metro & Tram 28E rail-joint clack-clack
    if (!this.railTimer) {
      this.railTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx || this.profile.metroRumble < 0.05) return;
        if (this.profile.metroRiding) {
          this.triggerRailClack();
        }
      }, 480);
      this.railTimer.unref?.();
    }

    // 6. Slow resonant pipe organ chords inside Se de Lisboa Cathedral
    if (!this.organTimer) {
      this.organTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx || this.profile.cathedralOrgan < 0.05) return;
        this.playNextOrganChord();
      }, 3600);
      this.organTimer.unref?.();
    }
  }

  triggerOvenCrackle() {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer || !this.bakeryBus) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900 + Math.random() * 2400;
    bp.Q.value = 3.2 + Math.random() * 3.0;

    const env = ctx.createGain();
    const peak = (0.12 + Math.random() * 0.22) * this.profile.bakeryFire;
    const decay = 0.018 + Math.random() * 0.032;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    src.connect(bp);
    bp.connect(env);
    env.connect(this.bakeryBus);

    src.start(now, Math.random() * 2.5, decay + 0.02);
  }

  triggerGrillPop() {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer || !this.grillBus) return;
    const now = ctx.currentTime;

    // Bright sea-salt & sardine-oil sizzle burst over hot charcoal
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 3600 + Math.random() * 3400;
    hp.Q.value = 2.4 + Math.random() * 2.0;

    const env = ctx.createGain();
    const peak = (0.14 + Math.random() * 0.2) * this.profile.grillSizzle;
    const decay = 0.04 + Math.random() * 0.085;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    src.connect(hp);
    hp.connect(env);
    env.connect(this.grillBus);

    src.start(now, Math.random() * 2.4, decay + 0.02);
  }

  triggerEspressoSteam() {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer || !this.cafeBus) return;
    const now = ctx.currentTime;

    // Authentic pressurized espresso wand steam hiss rising and tapering cleanly
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(4200, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 1.15);
    filter.Q.value = 1.6;

    const env = ctx.createGain();
    const peak = 0.24 * this.profile.cafeSteam;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.14);
    env.gain.linearRampToValueAtTime(peak * 0.78, now + 0.72);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.cafeBus);

    src.start(now, Math.random() * 1.8, 1.25);
  }

  triggerCupClink() {
    const ctx = this.ctx;
    if (!ctx || !this.cafeBus) return;
    const now = ctx.currentTime;

    // Delicate porcelain bica espresso cup & saucer clink
    const baseFreq = 2500 + Math.random() * 900;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.055 * this.profile.cafeSteam, now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(env);
    env.connect(this.cafeBus);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  triggerRailClack() {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer || !this.metroBus) return;
    const now = ctx.currentTime;

    // Classic double steel rail-joint "clack-clack" cadence
    for (const offset of [0, 0.12]) {
      const t = now + offset;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 260 + offset * 400;
      bp.Q.value = 2.8;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.32 * this.profile.metroRumble, t + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      src.connect(bp);
      bp.connect(env);
      env.connect(this.metroBus);
      src.start(t, Math.random() * 2.5, 0.1);
    }
  }

  triggerVinylTick() {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer || !this.vinylBus) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3800 + Math.random() * 2600;
    bp.Q.value = 5.0;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.11 * this.profile.vinylCrackle, now + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    src.connect(bp);
    bp.connect(env);
    env.connect(this.vinylBus);
    src.start(now, Math.random() * 2.8, 0.02);
  }

  playNextOrganChord() {
    const ctx = this.ctx;
    if (!ctx || !this.organBus) return;
    const now = ctx.currentTime;
    const chord = CATHEDRAL_ORGAN_CHORDS[this.organChordIndex % CATHEDRAL_ORGAN_CHORDS.length];
    this.organChordIndex = (this.organChordIndex + 1) % CATHEDRAL_ORGAN_CHORDS.length;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 780;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.11, now + 0.85);
    env.gain.linearRampToValueAtTime(0.09, now + 2.85);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 3.85);

    filter.connect(env);
    env.connect(this.organBus);

    for (const freq of chord) {
      const pipe = ctx.createOscillator();
      pipe.type = 'triangle';
      pipe.frequency.setValueAtTime(freq, now);
      pipe.connect(filter);
      pipe.start(now);
      pipe.stop(now + 3.9);
    }
  }

  pluckGuitarraPortuguesa(targetBus, freq, duration, velocity) {
    const ctx = this.ctx;
    if (!ctx || !targetBus) return;
    const now = ctx.currentTime;

    // 12-string Guitarra Portuguesa: twin subtly detuned courses for signature Lisbon shimmer
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4800, freq * 6.5), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(620, freq * 2.1), now + duration);
    filter.Q.value = 1.6;

    const env = ctx.createGain();
    const peak = 0.14 * velocity;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    for (const detuneCents of [-4.5, 4.5]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      if (osc.detune) osc.detune.setValueAtTime(detuneCents, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.04);
    }

    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2, now);
    const overGain = ctx.createGain();
    overGain.gain.setValueAtTime(0.045 * velocity, now);
    overGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.45);
    overtone.connect(overGain);
    overGain.connect(filter);
    overtone.start(now);
    overtone.stop(now + duration * 0.5);

    filter.connect(env);
    env.connect(targetBus);
  }

  pluckViolaDeFado(targetBus, freq, duration, gainPeak) {
    const ctx = this.ctx;
    if (!ctx || !targetBus) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 920;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gainPeak, now + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(targetBus);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playNextFadoStep() {
    const step = this.fadoStepIndex % FADO_MELODY_STEPS.length;
    const barIdx = Math.floor(step / 4) % FADO_CHORDS.length;
    const beatInBar = step % 4;
    const chord = FADO_CHORDS[barIdx];
    const melody = FADO_MELODY_STEPS[step];

    if (melody) {
      this.pluckGuitarraPortuguesa(this.fadoBus, melody.freq, melody.dur, melody.vel);
    }

    if (beatInBar === 0) {
      this.pluckViolaDeFado(this.fadoBus, chord.bass, 1.35, 0.16);
      this.pluckViolaDeFado(this.fadoBus, chord.notes[0], 0.65, 0.07);
    } else {
      const note = chord.notes[(beatInBar - 1) % chord.notes.length];
      this.pluckViolaDeFado(this.fadoBus, note, 0.58, 0.075);
    }

    this.fadoStepIndex = (this.fadoStepIndex + 1) % FADO_MELODY_STEPS.length;
  }

  playNextFolkStep() {
    const step = this.folkStepIndex % FOLK_MELODY_STEPS.length;
    const barIdx = Math.floor(step / 4) % FOLK_CHORDS.length;
    const beatInBar = step % 4;
    const chord = FOLK_CHORDS[barIdx];
    const melody = FOLK_MELODY_STEPS[step];

    if (melody) {
      this.pluckGuitarraPortuguesa(this.folkBus, melody.freq, melody.dur, melody.vel * 0.85);
    }

    if (beatInBar === 0) {
      this.pluckViolaDeFado(this.folkBus, chord.bass, 1.2, 0.12);
      this.pluckViolaDeFado(this.folkBus, chord.notes[0], 0.55, 0.055);
    } else {
      const note = chord.notes[(beatInBar - 1) % chord.notes.length];
      this.pluckViolaDeFado(this.folkBus, note, 0.48, 0.06);
    }

    this.folkStepIndex = (this.folkStepIndex + 1) % FOLK_MELODY_STEPS.length;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.applyGains();
    return this.muted;
  }

  toggleMute() {
    if (!this.unlocked) {
      this.unlock();
      this.muted = false;
      this.applyGains();
      return this.muted;
    }
    return this.setMuted(!this.muted);
  }

  applyGains() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const masterTarget = this.muted ? 0 : 0.78;
    const ramp = (param, value, tc = 0.25) => {
      if (typeof param.setTargetAtTime === 'function') {
        param.setTargetAtTime(value, now, tc);
      } else {
        param.value = value;
      }
    };

    ramp(this.masterGain.gain, masterTarget, 0.12);
    ramp(this.bakeryBus.gain, this.profile.bakeryFire * 0.62, 0.28);
    ramp(this.fadoBus.gain, this.profile.fadoMusic * 0.78, 0.32);
    ramp(this.folkBus.gain, this.profile.folkGuitar * 0.62, 0.32);
    ramp(this.grillBus.gain, this.profile.grillSizzle * 0.58, 0.25);
    ramp(this.cafeBus.gain, this.profile.cafeSteam * 0.68, 0.28);
    ramp(this.metroBus.gain, this.profile.metroRumble * 0.66, 0.3);
    ramp(this.organBus.gain, this.profile.cathedralOrgan * 0.72, 0.42);
    ramp(this.vinylBus.gain, this.profile.vinylCrackle * 0.55, 0.25);
    ramp(this.riverBus.gain, this.profile.riverWater * 0.52, 0.35);
  }

  update(state) {
    const next = computeSoundscapeProfile(state);
    const prev = this.profile;
    const changed =
      Math.abs(next.bakeryFire - prev.bakeryFire) > 0.015 ||
      Math.abs(next.fadoMusic - prev.fadoMusic) > 0.015 ||
      Math.abs(next.folkGuitar - prev.folkGuitar) > 0.015 ||
      Math.abs(next.grillSizzle - prev.grillSizzle) > 0.015 ||
      Math.abs(next.cafeSteam - prev.cafeSteam) > 0.015 ||
      Math.abs(next.metroRumble - prev.metroRumble) > 0.015 ||
      Math.abs(next.cathedralOrgan - prev.cathedralOrgan) > 0.015 ||
      Math.abs(next.vinylCrackle - prev.vinylCrackle) > 0.015 ||
      Math.abs(next.riverWater - prev.riverWater) > 0.015 ||
      next.metroRiding !== prev.metroRiding ||
      next.activeLabel !== prev.activeLabel;

    const enteredFado = prev.fadoMusic < 0.05 && next.fadoMusic >= 0.3;
    const enteredFolk = prev.folkGuitar < 0.05 && next.folkGuitar >= 0.25;
    const enteredOrgan = prev.cathedralOrgan < 0.05 && next.cathedralOrgan >= 0.5;
    const enteredCafe = prev.cafeSteam < 0.05 && next.cafeSteam >= 0.5;

    this.profile = next;

    if (changed) {
      if (this.unlocked && !this.muted && this.ctx) {
        if (enteredFado) {
          this.fadoStepIndex = 0;
          this.playNextFadoStep();
        }
        if (enteredFolk) {
          this.folkStepIndex = 0;
          this.playNextFolkStep();
        }
        if (enteredOrgan) {
          this.organChordIndex = 0;
          this.playNextOrganChord();
        }
        if (enteredCafe) {
          this.cafeTickCount = 0;
          this.triggerEspressoSteam();
        }
      }
      this.applyGains();
    }
    return this.profile;
  }

  playEffect(kind) {
    if (this.disposed || this.muted || !this.unlocked || !this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (kind === 'register') {
      for (const [freq, gainVal, dur] of [[1568, 0.16, 0.55], [3136, 0.07, 0.35]]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(gainVal, now + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(env);
        env.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + dur + 0.03);
      }
      return;
    }

    if (kind === 'tram-bell') {
      for (const delay of [0, 0.18]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(988, now + delay);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now + delay);
        env.gain.linearRampToValueAtTime(0.14, now + delay + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.24);
        osc.connect(env);
        env.connect(this.sfxBus);
        osc.start(now + delay);
        osc.stop(now + delay + 0.28);
      }
      return;
    }

    if (kind === 'metro-chime') {
      // Lisbon Metro three-note descending platform door chime (G5 -> E5 -> C5)
      for (const [idx, freq] of [783.99, 659.25, 523.25].entries()) {
        const t = now + idx * 0.14;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(0.11, t + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
        osc.connect(env);
        env.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.4);
      }
      return;
    }

    if (kind === 'door') {
      for (const [idx, freq] of [659.25, 880.0].entries()) {
        const t = now + idx * 0.09;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(0.09, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        osc.connect(env);
        env.connect(this.sfxBus);
        osc.start(t);
        osc.stop(t + 0.35);
      }
    }
  }

  dispose() {
    this.disposed = true;
    for (const key of ['crackleTimer', 'fadoTimer', 'folkTimer', 'cafeTimer', 'railTimer', 'organTimer']) {
      if (this[key]) {
        clearInterval(this[key]);
        this[key] = null;
      }
    }
    if (this.ctx && typeof this.ctx.close === 'function') {
      try {
        this.ctx.close();
      } catch {
        // Ignore already-closed context
      }
    }
    this.ctx = null;
    this.unlocked = false;
  }
}
