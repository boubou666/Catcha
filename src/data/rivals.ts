import type { Requirement } from './types';

/**
 * Rivals: one faction fighter per region who duels you with a team of three region Pals, one after another,
 * each on a short clock. Beating the team pays gold and a prize and raises the rival's tier; they are back
 * after a cooldown, stronger. Their teams are drawn from the region's routes at duel time (data/rivals only
 * says who they are); `prize` is an item the region is short on.
 */
export interface RivalDef {
  id: string;
  regionId: string;
  name: string;
  faction: string;
  line: string;               // what they say when the duel starts
  unlock: Requirement;
  reward: { gold: number; prize: { itemId: string; n: number } };
}

export const RIVALS: RivalDef[] = [
  { id: 'scout', regionId: 'windswept', name: 'Syndicate Scout', faction: 'Rayne Syndicate', line: "Zoe doesn't like trespassers. Neither do I.",
    unlock: { kind: 'routeCleared', id: 'behemoth' }, reward: { gold: 800, prize: { itemId: 'sphere_mega', n: 3 } } },
  { id: 'zealot', regionId: 'marsh', name: 'Alliance Zealot', faction: 'Free Pal Alliance', line: 'Release those Pals — or lose to mine.',
    unlock: { kind: 'routeCleared', id: 'bamboo' }, reward: { gold: 3_000, prize: { itemId: 'sphere_giga', n: 3 } } },
  { id: 'cultist', regionId: 'dunes', name: 'Pyre Cultist', faction: 'Brothers of the Eternal Pyre', line: 'The flame takes what it wants.',
    unlock: { kind: 'routeCleared', id: 'oasis' }, reward: { gold: 8_000, prize: { itemId: 'high_quality_pal_oil', n: 10 } } },
  { id: 'trooper', regionId: 'obsidian', name: 'PIDF Trooper', faction: 'Palpagos Islands Defense Force', line: 'Unregistered tamer. Stand down.',
    unlock: { kind: 'routeCleared', id: 'lava' }, reward: { gold: 15_000, prize: { itemId: 'sphere_hyper', n: 3 } } },
  { id: 'guard', regionId: 'astral', name: 'Research Unit Guard', faction: 'PAL Genetic Research Unit', line: 'Specimens are not for the likes of you.',
    unlock: { kind: 'routeCleared', id: 'frozen' }, reward: { gold: 30_000, prize: { itemId: 'sphere_ultra', n: 3 } } },
  { id: 'warrior', regionId: 'sakurajima', name: 'Moonflower Warrior', faction: 'Moonflower Clan', line: 'Saya sends her regards.',
    unlock: { kind: 'routeCleared', id: 'cedar' }, reward: { gold: 60_000, prize: { itemId: 'diamond', n: 2 } } },
  { id: 'marauder', regionId: 'feybreak', name: 'Feybreak Marauder', faction: 'Feybreak Warriors', line: 'Bjorn takes the strong. I take the rest.',
    unlock: { kind: 'routeCleared', id: 'wetlands' }, reward: { gold: 120_000, prize: { itemId: 'sphere_legendary', n: 1 } } },
];

const BY_ID = new Map(RIVALS.map((r) => [r.id, r]));
export function rivalById(id: string): RivalDef {
  const r = BY_ID.get(id);
  if (!r) throw new Error(`Unknown rival ${id}`);
  return r;
}
export const rivalsOf = (regionId: string) => RIVALS.filter((r) => r.regionId === regionId);
