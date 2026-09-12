import type { Drop, Requirement } from './types';

export interface ExpeditionDef {
  id: string;
  name: string;
  level: number;               // recommended member level
  size: number;                // max members; chance is judged against a full party
  durationSec: number;
  unlock: Requirement;
  loot: { gold: number; items: Drop[] };
  exp: number;                 // per member on success (half on failure)
}

export const EXPEDITION_POST = 'expedition_post';
export const FAIL_GOLD_SHARE = 0.25;
export const MIN_CHANCE = 0.15;
export const MAX_CHANCE = 0.95;
export const MAX_REPORTS = 20;

const d = (itemId: string, chance: number, min: number, max: number): Drop => ({ itemId, chance, min, max });
const H = 3600;

export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'scout_hills', name: 'Scout Windswept Hills', level: 5, size: 3, durationSec: 10 * 60, unlock: { kind: 'none' },
    loot: { gold: 100, items: [d('wood', 1, 20, 40), d('stone', 1, 20, 40), d('paldium', 1, 3, 6), d('berry_seeds', 0.5, 1, 3)] }, exp: 50 },
  { id: 'syndicate_camp', name: 'Raid a Syndicate Camp', level: 12, size: 3, durationSec: 30 * 60, unlock: { kind: 'alpha', id: 'chillet' },
    loot: { gold: 400, items: [d('paldium', 1, 10, 20), d('ingot', 0.5, 1, 3), d('sphere_pal', 1, 3, 6), d('flame_organ', 0.5, 2, 4)] }, exp: 200 },
  { id: 'marsh_survey', name: 'Survey the Marsh', level: 20, size: 4, durationSec: 1 * H, unlock: { kind: 'tower', id: 'rayne' },
    loot: { gold: 1500, items: [d('paldium', 1, 20, 40), d('ingot', 1, 2, 5), d('high_quality_pal_oil', 0.5, 1, 3), d('sphere_mega', 0.6, 2, 4), d('honey', 0.5, 2, 5)] }, exp: 800 },
  { id: 'desert_caravan', name: 'Escort a Desert Caravan', level: 30, size: 4, durationSec: 2 * H, unlock: { kind: 'tower', id: 'lily' },
    loot: { gold: 6000, items: [d('paldium', 1, 40, 80), d('ingot', 1, 5, 10), d('high_quality_pal_oil', 1, 2, 5), d('sphere_giga', 0.6, 2, 4), d('diamond', 0.02, 1, 1)] }, exp: 3000 },
  { id: 'volcano_delve', name: 'Delve into Mount Obsidian', level: 40, size: 5, durationSec: 4 * H, unlock: { kind: 'tower', id: 'axel' },
    loot: { gold: 20000, items: [d('ingot', 1, 10, 20), d('high_quality_pal_oil', 1, 4, 8), d('sphere_hyper', 0.6, 2, 4), d('flame_organ', 1, 10, 20), d('diamond', 0.08, 1, 1), d('slab_fragment', 0.5, 1, 2)] }, exp: 10000 },
  { id: 'astral_climb', name: 'Climb the Astral Mountains', level: 50, size: 5, durationSec: 6 * H, unlock: { kind: 'tower', id: 'marcus' },
    loot: { gold: 60000, items: [d('ingot', 1, 20, 35), d('high_quality_pal_oil', 1, 6, 12), d('sphere_ultra', 0.6, 2, 4), d('high_quality_cloth', 0.5, 1, 3), d('diamond', 0.2, 1, 1), d('slab_fragment', 0.7, 1, 3)] }, exp: 30000 },
  { id: 'far_isles', name: 'Voyage to the Far Isles', level: 60, size: 5, durationSec: 8 * H, unlock: { kind: 'tower', id: 'victor' },
    loot: { gold: 200000, items: [d('ingot', 1, 30, 50), d('high_quality_pal_oil', 1, 10, 20), d('sphere_legendary', 0.4, 1, 2), d('diamond', 0.4, 1, 2), d('slab_fragment', 1, 2, 4)] }, exp: 80000 },
];

const BY_ID = new Map(EXPEDITIONS.map((e) => [e.id, e]));
export function expeditionById(id: string): ExpeditionDef {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Unknown expedition ${id}`);
  return e;
}
