// Synthesized sound effects (Web Audio, no assets). Preference lives per device in localStorage.

export type Sfx =
  | 'click' | 'defeat' | 'caught' | 'catchFailed' | 'levelUp' | 'bossWin' | 'towerWin' | 'hatched'
  | 'achievement' | 'questClaimed' | 'luckySpawn' | 'summon' | 'realmClear' | 'ascend' | 'craftDone' | 'tutorialStep' | 'raidAlarm' | 'skill';

const PREF_KEY = 'catcha.sound';

export interface SoundPref { enabled: boolean; volume: number; haptics: boolean }

export function loadPref(): SoundPref {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) { const p = JSON.parse(raw); return { enabled: !!p.enabled, volume: Math.min(1, Math.max(0, Number(p.volume) || 0.5)), haptics: p.haptics !== false }; }
  } catch { /* ignore */ }
  return { enabled: true, volume: 0.5, haptics: true };
}

export function savePref(p: SoundPref): void {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

let pref = loadPref();
export const getPref = () => pref;
export function setPref(next: Partial<SoundPref>): SoundPref {
  pref = { ...pref, ...next };
  savePref(pref);
  return pref;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const lastPlayed: Partial<Record<Sfx, number>> = {};

function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
    // browsers start contexts suspended until a gesture; resume on the first one we see
    const resume = () => { ctx?.resume(); };
    document.addEventListener('pointerdown', resume, { once: true, capture: true });
    document.addEventListener('keydown', resume, { once: true, capture: true });
  }
  master!.gain.value = pref.volume * pref.volume; // perceptual-ish curve
  return { ctx, master: master! };
}

type Wave = OscillatorType;

/** One enveloped oscillator note. */
function tone(a: { ctx: AudioContext; master: GainNode }, freq: number, start: number, dur: number, opts: { type?: Wave; gain?: number; to?: number } = {}) {
  const { ctx, master } = a;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, start);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
  const peak = opts.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** A short burst of filtered noise. */
function noise(a: { ctx: AudioContext; master: GainNode }, start: number, dur: number, gain = 0.15, cutoff = 1200) {
  const { ctx, master } = a;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(start);
}

const SOUNDS: Record<Sfx, (a: { ctx: AudioContext; master: GainNode }, t: number) => void> = {
  click: (a, t) => tone(a, 1400, t, 0.04, { gain: 0.06, to: 900 }),
  defeat: (a, t) => { noise(a, t, 0.12, 0.12, 900); tone(a, 180, t, 0.16, { type: 'triangle', gain: 0.18, to: 70 }); },
  caught: (a, t) => [523, 659, 784].forEach((f, i) => tone(a, f, t + i * 0.09, 0.16, { gain: 0.18 })),
  catchFailed: (a, t) => tone(a, 320, t, 0.28, { type: 'sawtooth', gain: 0.08, to: 160 }),
  levelUp: (a, t) => [523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.07, 0.22, { type: 'triangle', gain: 0.16 })),
  bossWin: (a, t) => [392, 523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.11, 0.35, { type: 'square', gain: 0.08 })),
  towerWin: (a, t) => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, t + i * 0.12, 0.5, { type: 'square', gain: 0.08 })); tone(a, 98, t, 1.2, { type: 'sawtooth', gain: 0.06 }); },
  hatched: (a, t) => { tone(a, 400, t, 0.12, { gain: 0.16, to: 900 }); tone(a, 1200, t + 0.12, 0.1, { gain: 0.1 }); },
  achievement: (a, t) => { tone(a, 880, t, 0.18, { gain: 0.14 }); tone(a, 1320, t + 0.14, 0.3, { gain: 0.14 }); },
  questClaimed: (a, t) => { tone(a, 1568, t, 0.06, { gain: 0.14 }); tone(a, 2093, t + 0.07, 0.2, { gain: 0.14 }); },
  luckySpawn: (a, t) => [1760, 2217, 2637, 3520].forEach((f, i) => tone(a, f, t + i * 0.06, 0.25, { gain: 0.08 })),
  skill: (a, t) => { noise(a, t, 0.08, 0.1, 1800); tone(a, 520, t, 0.18, { type: 'sawtooth', gain: 0.09, to: 260 }); },
  raidAlarm: (a, t) => [0, 0.3, 0.6].forEach((d) => { tone(a, 880, t + d, 0.14, { type: 'square', gain: 0.1, to: 660 }); tone(a, 660, t + d + 0.15, 0.14, { type: 'square', gain: 0.1, to: 880 }); }),
  summon: (a, t) => { tone(a, 55, t, 0.9, { type: 'sawtooth', gain: 0.12, to: 40 }); noise(a, t, 0.5, 0.05, 400); },
  realmClear: (a, t) => [659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.1, 0.3, { type: 'triangle', gain: 0.14 })),
  ascend: (a, t) => { tone(a, 220, t, 1.6, { type: 'sine', gain: 0.14, to: 1760 }); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, t + 0.8 + i * 0.1, 0.5, { type: 'triangle', gain: 0.1 })); },
  craftDone: (a, t) => tone(a, 1000, t, 0.06, { type: 'triangle', gain: 0.08, to: 1400 }),
  tutorialStep: (a, t) => { tone(a, 1047, t, 0.08, { gain: 0.1 }); tone(a, 1568, t + 0.09, 0.18, { gain: 0.1 }); },
};

const MIN_GAP_MS: Partial<Record<Sfx, number>> = { click: 30, defeat: 60, craftDone: 120 };

/** Play a sound if enabled. Safe to call from anywhere; failures are swallowed. */
export function play(name: Sfx): void {
  if (!pref.enabled || document.hidden) return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < (MIN_GAP_MS[name] ?? 0)) return;
  lastPlayed[name] = now;
  try {
    const a = audio();
    if (!a || a.ctx.state !== 'running') return;
    SOUNDS[name](a, a.ctx.currentTime);
  } catch { /* audio is best-effort */ }
}

// ---- haptics -------------------------------------------------------------------------------
// navigator.vibrate: Android browsers yes, iOS Safari no (silently unsupported). Only on touch devices.

const PATTERNS: Partial<Record<Sfx, number | number[]>> = {
  click: 8,
  defeat: 20,
  caught: [20, 40, 30],
  catchFailed: 60,
  levelUp: [30, 30, 30, 30, 70],
  bossWin: [50, 40, 50, 40, 120],
  towerWin: [60, 40, 60, 40, 60, 40, 200],
  hatched: [20, 30, 40],
  achievement: [40, 50, 90],
  questClaimed: [20, 20, 20],
  luckySpawn: [15, 30, 15, 30, 15, 30, 60],
  raidAlarm: [120, 80, 120, 80, 120],
  skill: 35,
  summon: 250,
  realmClear: [40, 40, 90],
  ascend: [80, 60, 80, 60, 80, 60, 300],
  tutorialStep: [20, 30, 40],
};

let coarse: boolean | null = null;
export function hapticsAvailable(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  if (coarse === null) coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return coarse;
}

/** Vibrate for an event if the device can and the preference allows. */
export function buzz(name: Sfx): void {
  if (!pref.haptics || !hapticsAvailable() || document.hidden) return;
  const pattern = PATTERNS[name];
  if (!pattern) return;
  try { navigator.vibrate(pattern); } catch { /* best-effort */ }
}
