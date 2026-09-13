import type { SaveState } from '../data/types';
import { STARTING_ROUTE } from '../data/regions';
import { newBase } from './base';
import { newStats } from './achievements';
import { newTutorial, TUTORIAL } from './tutorial';
import { STARTING_TECH_POINTS, structureTech, TECH_POINTS_PER_LEVEL } from '../data/tech';

export const SAVE_VERSION = 25;
const STORAGE_KEY = 'catcha.save';

export function newState(): SaveState {
  return {
    version: SAVE_VERSION,
    player: { level: 1, exp: 0, gold: 0, techPoints: STARTING_TECH_POINTS, effigies: 0, weaponTier: 1 },
    paldeck: {},
    party: [],
    box: [],
    inventory: { sphere_pal: 20, red_berries: 30 },
    base: newBase(),
    tech: [],
    progress: { route: STARTING_ROUTE, routeKills: {}, alphas: [], towers: [], dungeons: {}, raids: {}, alphaRematch: {}, challenge: null },
    settings: { sphereForNew: 'pal', sphereForDupe: 'none', dailyReset: 'utc' },
    stats: newStats(),
    achievements: [],
    daily: null,
    dailyHistory: [],
    loadouts: [],
    prestige: { relics: 0, ascensions: 0, upgrades: {} },
    tutorial: newTutorial(),
    lastSavedAt: Date.now(),
  };
}

/** Renumber every Pal reference at once (box, eggs, Paldeck), merging Paldeck rows that collide. */
function remapPalIds(s: SaveState, map: Record<number, number>): void {
  const fix = (id: number) => map[id] ?? id;
  for (const p of s.box) p.palId = fix(p.palId);
  for (const e of s.base.eggs) e.palId = fix(e.palId);
  const deck: SaveState['paldeck'] = {};
  for (const [k, v] of Object.entries(s.paldeck)) {
    const id = fix(Number(k));
    const prev = deck[id];
    deck[id] = prev ? { seen: prev.seen || v.seen, caught: prev.caught + v.caught } : v;
  }
  s.paldeck = deck;
}

/** Bring an older save up to SAVE_VERSION. Add a case per version bump. */
export function migrate(raw: unknown): SaveState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<SaveState> & { version?: number };
  if (typeof s.version !== 'number') return null;
  if (s.version === 1) {
    s.base = newBase();
    s.version = 2;
  }
  if (s.version === 2 && s.base) {
    s.base.breeding = null;
    s.base.eggs = [];
    s.version = 3;
  }
  if (s.version === 3 && s.player && s.base) {
    // Tech tree arrived: back-pay the extra point per level and grant the techs for what's already built.
    s.player.techPoints += STARTING_TECH_POINTS + (s.player.level - 1) * (TECH_POINTS_PER_LEVEL - 1);
    s.tech ??= [];
    for (const id of Object.keys(s.base.structures)) {
      const t = structureTech(id);
      if (t && !s.tech.includes(t.id)) s.tech.push(t.id);
    }
    s.version = 4;
  }
  if (s.version === 4 && s.base) {
    // Two Paldeck numbers were wrong in early data: Chillet is #41 (was 55), Grizzbolt #88 (was 103).
    remapPalIds(s as SaveState, { 55: 41, 103: 88 });
    s.version = 5;
  }
  if (s.version === 5 && s.base) {
    // v5 got the numbering wrong; this is the corrected Paldeck (Chillet #55, Grizzbolt #103, region 2 shifted).
    remapPalIds(s as SaveState, {36:50,37:51,38:52,39:53,40:54,41:55,42:56,46:60,47:61,48:62,49:63,50:64,51:65,52:66,53:67,54:68,55:69,56:70,66:81,71:86,74:89,78:93,88:103,89:104});
    s.version = 6;
  }
  if (s.version === 6 && s.base) {
    for (const e of s.base.eggs) e.passives ??= [];
    s.version = 7;
  }
  if (s.version === 7 && s.progress) {
    s.progress.dungeons ??= {};
    s.version = 8;
  }
  if (s.version === 8 && s.base) {
    s.base.expeditions ??= [];
    s.base.reports ??= [];
    s.version = 9;
  }
  if (s.version === 9 && s.progress) {
    s.progress.raids ??= {};
    s.version = 10;
  }
  if (s.version === 10 && s.box) {
    for (const p of s.box) p.san ??= 100;
    s.version = 11;
  }
  if (s.version === 11 && s.base) {
    for (const e of s.base.eggs) e.lucky ??= false;
    s.version = 12;
  }
  if (s.version === 12) {
    s.stats ??= newStats();
    s.achievements ??= [];
    s.version = 13;
  }
  if (s.version === 13 && s.stats) {
    s.stats.defeatedByElement ??= {};
    s.daily ??= null;
    s.version = 14;
  }
  if (s.version === 14 && s.settings) {
    s.settings.dailyReset ??= 'utc';
    s.version = 15;
  }
  if (s.version === 15) {
    s.prestige ??= { relics: 0, ascensions: 0, upgrades: {} };
    s.version = 16;
  }
  if (s.version === 16) {
    // existing players have already found their feet
    s.tutorial ??= { step: TUTORIAL.length - 1, done: true };
    s.version = 17;
  }
  if (s.version === 17) {
    s.stats = { ...newStats(), ...(s.stats ?? {}) };   // new counters start at zero
    s.version = 18;
  }
  if (s.version === 18) {
    // the wiki drop 'low_grade_medical_supplies' was a duplicate of the Medicine consumable
    const inv = s.inventory ?? {};
    const dupe = inv.low_grade_medical_supplies ?? 0;
    if (dupe > 0) inv.low_grade_medical = (inv.low_grade_medical ?? 0) + dupe;
    delete inv.low_grade_medical_supplies;
    s.version = 19;
  }
  if (s.version === 19) {
    s.dailyHistory ??= [];
    s.version = 20;
  }
  if (s.version === 20) {
    s.loadouts ??= [];
    s.version = 21;
  }
  if (s.version === 21) {
    if (s.stats) { s.stats.chanceSum ??= 0; s.stats.ratedThrows ??= 0; }
    s.version = 22;
  }
  if (s.version === 22) {
    if (s.base) { s.base.raid ??= null; s.base.nextRaidAt ??= (s.stats?.playSeconds ?? 0) + 20 * 60; }
    if (s.stats) { s.stats.baseRaidsRepelled ??= 0; s.stats.baseRaidsLost ??= 0; }
    s.version = 23;
  }
  if (s.version === 23) {
    if (s.progress) { s.progress.alphaRematch ??= {}; s.progress.challenge ??= null; }
    if (s.base) s.base.raidLog ??= [];
    s.version = 24;
  }
  if (s.version === 24) {
    if (s.stats) { s.stats.challengesDone ??= 0; s.stats.rematchesWon ??= 0; }
    s.version = 25;
  }
  if (s.version !== SAVE_VERSION) return null;
  return s as SaveState;
}

export function serialize(save: SaveState): string {
  return JSON.stringify(save);
}

export function deserialize(json: string): SaveState | null {
  try {
    return migrate(JSON.parse(json));
  } catch {
    return null;
  }
}

export function loadState(): SaveState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? deserialize(json) : null;
  } catch {
    return null;
  }
}

export function persist(save: SaveState): void {
  save.lastSavedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, serialize(save));
  } catch {
    // storage unavailable (private mode, quota) — play on without saving
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// Export/import as a base64 string so players can move saves between browsers.
export function exportSave(save: SaveState): string {
  return btoa(unescape(encodeURIComponent(serialize(save))));
}

export function importSave(encoded: string): SaveState | null {
  try {
    return deserialize(decodeURIComponent(escape(atob(encoded.trim()))));
  } catch {
    return null;
  }
}

// ---- save codes: a compact string to paste between devices -------------------------------------

const CODE_PREFIX = 'catcha1.';   // gzip + base64url; a code without it is a plain export string

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
async function pipe(bytes: Uint8Array, stream: { readable: ReadableStream; writable: WritableStream }): Promise<Uint8Array> {
  const w = stream.writable.getWriter();
  // a bad payload rejects both the writer and the read; the read's rejection is the one callers see
  const writing = w.write(bytes).then(() => w.close()).catch(() => { /* reported through the read */ });
  const out = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  await writing;
  return out;
}

/** A short shareable code for this save: gzip + base64url, prefixed. Falls back to the plain export string where compression is unavailable. */
export async function encodeSaveCode(save: SaveState): Promise<string> {
  const json = serialize(save);
  if (typeof CompressionStream === 'undefined') return exportSave(save);
  const gz = await pipe(new TextEncoder().encode(json), new CompressionStream('gzip'));
  return CODE_PREFIX + toBase64Url(gz);
}

/** Reads a save code (or a plain export string). Null when it cannot be read. */
export async function decodeSaveCode(code: string): Promise<SaveState | null> {
  const s = code.trim();
  if (!s.startsWith(CODE_PREFIX)) return importSave(s);
  try {
    const bytes = await pipe(fromBase64Url(s.slice(CODE_PREFIX.length)), new DecompressionStream('gzip'));
    return deserialize(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
