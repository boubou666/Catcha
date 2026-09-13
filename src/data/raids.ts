import type { Drop, Requirement } from './types';

export interface RaidDef {
  id: string;
  name: string;
  palId: number;
  level: number;
  hp: number;
  timeLimitSec: number;
  slabItemId: string;          // consumed on summon
  luckyChance: number;         // odds the egg is Lucky
  unlock: Requirement;
  reward: { gold: number; items: Drop[]; egg: boolean };
}

export const ALTAR = 'altar';
export const SLAB_FRAGMENT = 'slab_fragment';

const d = (itemId: string, chance: number, min: number, max: number): Drop => ({ itemId, chance, min, max });

export const RAIDS: RaidDef[] = [
  { id: 'bellanoir', name: 'Bellanoir', palId: 142, level: 50, hp: 650_000, timeLimitSec: 600, slabItemId: 'slab_bellanoir', luckyChance: 0.10,
    unlock: { kind: 'tower', id: 'marcus' },
    reward: { gold: 100_000, items: [d('diamond', 1, 2, 4), d('ingot', 1, 20, 40), d('high_quality_pal_oil', 1, 10, 20), d('sphere_legendary', 0.3, 1, 1)], egg: true } },
  { id: 'xenolord', name: 'Xenolord', palId: 125, level: 62, hp: 1_750_000, timeLimitSec: 600, slabItemId: 'slab_xenolord', luckyChance: 0.15,
    unlock: { kind: 'tower', id: 'saya' },
    reward: { gold: 400_000, items: [d('diamond', 1, 4, 8), d('ingot', 1, 40, 80), d('high_quality_pal_oil', 1, 20, 40), d('sphere_legendary', 0.6, 1, 2)], egg: true } },
  { id: 'libero', name: 'Bellanoir Libero', palId: 1142, level: 72, hp: 2_300_000, timeLimitSec: 600, slabItemId: 'slab_libero', luckyChance: 0.25,
    unlock: { kind: 'raid', id: 'bellanoir' },
    reward: { gold: 1_000_000, items: [d('diamond', 1, 8, 15), d('ingot', 1, 80, 150), d('sphere_legendary', 1, 2, 3)], egg: true } },
];

const BY_ID = new Map(RAIDS.map((r) => [r.id, r]));
export function raidById(id: string): RaidDef {
  const r = BY_ID.get(id);
  if (!r) throw new Error(`Unknown raid ${id}`);
  return r;
}
