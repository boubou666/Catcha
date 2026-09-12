import type { SaveState } from '../data/types';
import { STARTING_ROUTE } from '../data/regions';
import { newBase } from './base';
import { newStats } from './achievements';
import { STARTING_TECH_POINTS, structureTech, TECH_POINTS_PER_LEVEL } from '../data/tech';

export const SAVE_VERSION = 16;
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
    progress: { route: STARTING_ROUTE, routeKills: {}, alphas: [], towers: [], dungeons: {}, raids: {} },
    settings: { sphereForNew: 'pal', sphereForDupe: 'none', dailyReset: 'utc' },
    stats: newStats(),
    achievements: [],
    daily: null,
    prestige: { relics: 0, ascensions: 0, upgrades: {} },
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
