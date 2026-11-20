import { VENUES, WATERFRONT_Y } from './data.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Pure, headless calculation of active Lisboa soundscape intensities based on player state.
 * - Bakeries (Casa da Rosa - Padaria, Arcadas do Chiado): wood-fired brick oven & fire crackle.
 * - Fado Restaurant (Tasca do Fado): traditional Portuguese Guitar & Viola de Fado music.
 * - Tagus Riverfront (walking south toward Avenida Ribeira / Cais de Alfama): lapping river water.
 */
export function computeSoundscapeProfile(state) {
  if (!state) {
    return { bakeryFire: 0, fadoMusic: 0, riverWater: 0, activeLabel: 'Lisboa Streets' };
  }

  if (state.mode === 'interior' && state.currentVenueId) {
    const venue = VENUES.find((v) => v.id === state.currentVenueId);
    if (venue?.id === 'tasca-do-fado') {
      return {
        bakeryFire: 0,
        fadoMusic: 1,
        riverWater: 0,
        activeLabel: 'Fado Music'
      };
    }
    if (venue?.interiorTheme?.layout === 'bakery') {
      return {
        bakeryFire: venue.id === 'casa-da-rosa' ? 1 : 0.78,
        fadoMusic: 0,
        riverWater: 0,
        activeLabel: 'Bakery Wood Oven'
      };
    }
    return {
      bakeryFire: 0,
      fadoMusic: 0,
      riverWater: 0,
      activeLabel: venue ? venue.name : 'Indoors'
    };
  }

  if (state.mode === 'metro') {
    return {
      bakeryFire: 0,
      fadoMusic: 0,
      riverWater: 0,
      activeLabel: 'Underground Metro'
    };
  }

  // Overworld: smooth spatial swell as the traveler approaches the Tagus Riverfront (WATERFRONT_Y = 1030)
  const py = Number.isFinite(state.player?.y) ? state.player.y : 544;
  const riverStartY = WATERFRONT_Y - 240; // y = 790 (south edge of mid-town blocks)
  const riverPeakY = WATERFRONT_Y - 38;   // y = 992 (Tagus riverfront promenade)
  const rawRiver = clamp((py - riverStartY) / (riverPeakY - riverStartY), 0, 1);
  // Gentle ease-in curve so river sound swells naturally on Avenida Ribeira and peaks along the quay
  const riverWater = Math.round(Math.pow(rawRiver, 1.35) * 1000) / 1000;

  return {
    bakeryFire: 0,
    fadoMusic: 0,
    riverWater,
    activeLabel: riverWater >= 0.12 ? 'Tagus Riverfront' : 'Lisboa Streets'
  };
}

// Traditional Lisbon Fado Menor progression in A minor (Am - Dm - E7 - Am - F - Dm - E7 - Am)
// Frequencies in Hz for Guitarra Portuguesa melody (12-string bright voice) & Viola de Fado accompaniment
const FADO_MELODY_STEPS = [
  // Bar 1 (Am)
  { freq: 440.0, dur: 0.72, vel: 0.9 },   // A4
  { freq: 523.25, dur: 0.36, vel: 0.75 }, // C5
  { freq: 659.25, dur: 0.78, vel: 1.0 },  // E5
  { freq: 587.33, dur: 0.36, vel: 0.8 },  // D5
  // Bar 2 (Dm)
  { freq: 523.25, dur: 0.42, vel: 0.85 }, // C5
  { freq: 587.33, dur: 0.75, vel: 0.95 }, // D5
  { freq: 698.46, dur: 0.62, vel: 0.9 },  // F5
  { freq: 659.25, dur: 0.45, vel: 0.78 }, // E5
  // Bar 3 (E7 - harmonic minor G# saudade inflection)
  { freq: 622.25, dur: 0.32, vel: 0.65 }, // D#5 grace
  { freq: 659.25, dur: 0.68, vel: 0.95 }, // E5
  { freq: 493.88, dur: 0.45, vel: 0.82 }, // B4
  { freq: 415.30, dur: 0.82, vel: 0.92 }, // G#4
  // Bar 4 (Am resolution)
  { freq: 440.0, dur: 0.95, vel: 0.95 },  // A4
  { freq: 523.25, dur: 0.38, vel: 0.72 }, // C5
  { freq: 493.88, dur: 0.38, vel: 0.7 },  // B4
  { freq: 440.0, dur: 0.55, vel: 0.65 },  // A4
  // Bar 5 (F major lift)
  { freq: 698.46, dur: 0.75, vel: 0.95 }, // F5
  { freq: 659.25, dur: 0.38, vel: 0.82 }, // E5
  { freq: 587.33, dur: 0.42, vel: 0.8 },  // D5
  { freq: 523.25, dur: 0.7, vel: 0.86 },  // C5
  // Bar 6 (Dm)
  { freq: 587.33, dur: 0.72, vel: 0.92 }, // D5
  { freq: 523.25, dur: 0.38, vel: 0.8 },  // C5
  { freq: 493.88, dur: 0.42, vel: 0.78 }, // B4
  { freq: 440.0, dur: 0.62, vel: 0.84 },  // A4
  // Bar 7 (E7 descending phrase)
  { freq: 493.88, dur: 0.45, vel: 0.85 }, // B4
  { freq: 523.25, dur: 0.36, vel: 0.78 }, // C5
  { freq: 493.88, dur: 0.42, vel: 0.82 }, // B4
  { freq: 415.30, dur: 0.86, vel: 0.95 }, // G#4
  // Bar 8 (Am home cadence)
  { freq: 440.0, dur: 1.15, vel: 1.0 },   // A4
  { freq: 329.63, dur: 0.48, vel: 0.68 }, // E4
  { freq: 392.0, dur: 0.32, vel: 0.55 },  // G4
  { freq: 440.0, dur: 0.95, vel: 0.85 }   // A4
];

const FADO_CHORDS = [
  { bass: 110.0, notes: [220.0, 261.63, 329.63] },  // Am
  { bass: 146.83, notes: [220.0, 293.66, 349.23] }, // Dm
  { bass: 82.41, notes: [207.65, 246.94, 329.63] }, // E7
  { bass: 110.0, notes: [220.0, 261.63, 329.63] },  // Am
  { bass: 87.31, notes: [220.0, 261.63, 349.23] },  // F
  { bass: 146.83, notes: [220.0, 293.66, 349.23] }, // Dm
  { bass: 82.41, notes: [207.65, 246.94, 293.66] }, // E7
  { bass: 110.0, notes: [220.0, 261.63, 329.63] }   // Am
];

export class LisboaSoundEngine {
  constructor({ audioContextFactory = null } = {}) {
    this.audioContextFactory = audioContextFactory;
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;
    this.disposed = false;

    this.profile = { bakeryFire: 0, fadoMusic: 0, riverWater: 0, activeLabel: 'Lisboa Streets' };

    // Web Audio nodes created lazily on unlock()
    this.masterGain = null;
    this.bakeryBus = null;
    this.fadoBus = null;
    this.riverBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;

    // Schedulers
    this.crackleTimer = null;
    this.fadoTimer = null;
    this.fadoStepIndex = 0;
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
    // Warm pink/brown-weighted noise (Paul Kellet filter) for rich fire & water texture
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

  initGraph(ctx) {
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.75;
    this.masterGain.connect(ctx.destination);

    this.bakeryBus = ctx.createGain();
    this.bakeryBus.gain.value = 0;
    this.bakeryBus.connect(this.masterGain);

    this.fadoBus = ctx.createGain();
    this.fadoBus.gain.value = 0;
    this.fadoBus.connect(this.masterGain);

    this.riverBus = ctx.createGain();
    this.riverBus.gain.value = 0;
    this.riverBus.connect(this.masterGain);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.65;
    this.sfxBus.connect(this.masterGain);

    this.noiseBuffer = this.buildNoiseBuffer(ctx, 3.5);

    this.setupBakeryOvenBed(ctx);
    this.setupRiverWaterBed(ctx);
    this.startSchedulers();
  }

  setupBakeryOvenBed(ctx) {
    // 1. Deep brick wood-fired oven rumble (low-passed warm pink noise with gentle flame draft LFO)
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

    // 2. Warm glowing flame air wash (soft bandpass around 480 Hz)
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
    // Organic wood-fire ember crackles & pops for the bakery brick oven
    if (!this.crackleTimer) {
      this.crackleTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx || this.profile.bakeryFire < 0.05) return;
        if (Math.random() < 0.65) {
          this.triggerOvenCrackle();
        }
      }, 170);
      this.crackleTimer.unref?.();
    }

    // Lyrical Portuguese Guitar & Viola de Fado sequencer inside Tasca do Fado (~76 BPM)
    if (!this.fadoTimer) {
      this.fadoTimer = setInterval(() => {
        if (this.disposed || this.muted || !this.ctx || this.profile.fadoMusic < 0.05) return;
        this.playNextFadoStep();
      }, 410);
      this.fadoTimer.unref?.();
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

    const offset = Math.random() * 2.5;
    src.start(now, offset, decay + 0.02);
  }

  pluckGuitarraPortuguesa(freq, duration, velocity) {
    const ctx = this.ctx;
    if (!ctx || !this.fadoBus) return;
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

    // Subtle metallic harmonic overtone transient
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
    env.connect(this.fadoBus);
  }

  pluckViolaDeFado(freq, duration, gainPeak) {
    const ctx = this.ctx;
    if (!ctx || !this.fadoBus) return;
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
    env.connect(this.fadoBus);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playNextFadoStep() {
    const step = this.fadoStepIndex % FADO_MELODY_STEPS.length;
    const barIdx = Math.floor(step / 4) % FADO_CHORDS.length;
    const beatInBar = step % 4;
    const chord = FADO_CHORDS[barIdx];
    const melody = FADO_MELODY_STEPS[step];

    // Guitarra Portuguesa melody note
    if (melody) {
      this.pluckGuitarraPortuguesa(melody.freq, melody.dur, melody.vel);
    }

    // Viola de Fado accompaniment (bass root on beat 0, warm arpeggiated triad on beats 1..3)
    if (beatInBar === 0) {
      this.pluckViolaDeFado(chord.bass, 1.35, 0.16);
      this.pluckViolaDeFado(chord.notes[0], 0.65, 0.07);
    } else {
      const note = chord.notes[(beatInBar - 1) % chord.notes.length];
      this.pluckViolaDeFado(note, 0.58, 0.075);
    }

    this.fadoStepIndex = (this.fadoStepIndex + 1) % FADO_MELODY_STEPS.length;
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
    ramp(this.riverBus.gain, this.profile.riverWater * 0.52, 0.35);
  }

  update(state) {
    const next = computeSoundscapeProfile(state);
    const changed =
      Math.abs(next.bakeryFire - this.profile.bakeryFire) > 0.015 ||
      Math.abs(next.fadoMusic - this.profile.fadoMusic) > 0.015 ||
      Math.abs(next.riverWater - this.profile.riverWater) > 0.015 ||
      next.activeLabel !== this.profile.activeLabel;

    const enteredFado = this.profile.fadoMusic < 0.05 && next.fadoMusic >= 0.5;
    this.profile = next;

    if (changed) {
      if (enteredFado) {
        this.fadoStepIndex = 0;
        if (this.unlocked && !this.muted && this.ctx) {
          this.playNextFadoStep();
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
      // Vintage brass Lisbon cash register bell ding
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
      // Classic Eletrico 28E double brass clang
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

    if (kind === 'door') {
      // Warm shop entrance chime
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
    if (this.crackleTimer) {
      clearInterval(this.crackleTimer);
      this.crackleTimer = null;
    }
    if (this.fadoTimer) {
      clearInterval(this.fadoTimer);
      this.fadoTimer = null;
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
