import type { SaveState } from '../data/types';
import { STARTING_ROUTE } from '../data/regions';
import { newBase } from './base';

export const SAVE_VERSION = 3;
const STORAGE_KEY = 'catcha.save';

export function newState(): SaveState {
  return {
    version: SAVE_VERSION,
    player: { level: 1, exp: 0, gold: 0, techPoints: 0, effigies: 0, weaponTier: 1 },
    paldeck: {},
    party: [],
    box: [],
    inventory: { sphere_pal: 20, red_berries: 30 },
    base: newBase(),
    tech: [],
    progress: { route: STARTING_ROUTE, routeKills: {}, alphas: [], towers: [] },
    settings: { sphereForNew: 'pal', sphereForDupe: 'none' },
    lastSavedAt: Date.now(),
  };
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
