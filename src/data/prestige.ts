// Ascension: reset the run for Ancient Relics, spend them on permanent upgrades.

export type PrestigeStat = 'attack' | 'base' | 'catch' | 'exp' | 'gold';

export type PrestigeEffect =
  | { kind: 'mult'; stat: PrestigeStat; perLevel: number }   // +perLevel × level, multiplicative with everything else
  | { kind: 'ark'; perLevel: number }                          // extra Pals carried through an ascension
  | { kind: 'techPoints'; perLevel: number }                   // tech points granted at the start of a run
  | { kind: 'quota'; perLevel: number }                        // route kill quotas reduced by perLevel × level (fraction)
  | { kind: 'spheres'; perLevel: number };                     // extra starting Pal Spheres

export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  cost: (level: number) => number;    // relics to buy `level` (1-based)
  effect: PrestigeEffect;
}

export const BASE_ARK = 1;            // Pals you can always carry through

const linear = (base: number) => (level: number) => base * level;

export const PRESTIGE_UPGRADES: PrestigeUpgradeDef[] = [
  { id: 'power', name: 'Ancient Power', desc: '+10% party attack per level.', maxLevel: 5, cost: linear(2), effect: { kind: 'mult', stat: 'attack', perLevel: 0.1 } },
  { id: 'industry', name: 'Ancient Industry', desc: '+10% base output per level.', maxLevel: 5, cost: linear(2), effect: { kind: 'mult', stat: 'base', perLevel: 0.1 } },
  { id: 'spherecraft', name: 'Sphere Mastery', desc: '+10% catch rate per level.', maxLevel: 5, cost: linear(2), effect: { kind: 'mult', stat: 'catch', perLevel: 0.1 } },
  { id: 'scholar', name: 'Scholar', desc: '+10% experience per level.', maxLevel: 5, cost: linear(2), effect: { kind: 'mult', stat: 'exp', perLevel: 0.1 } },
  { id: 'relic_sense', name: 'Relic Sense', desc: '+5% gold per level.', maxLevel: 5, cost: linear(1), effect: { kind: 'mult', stat: 'gold', perLevel: 0.05 } },
  { id: 'ark', name: 'The Ark', desc: 'Carry one more Pal through each ascension per level.', maxLevel: 5, cost: linear(3), effect: { kind: 'ark', perLevel: 1 } },
  { id: 'head_start', name: 'Head Start', desc: 'Begin each run with 5 extra tech points per level.', maxLevel: 5, cost: linear(2), effect: { kind: 'techPoints', perLevel: 5 } },
  { id: 'quick_feet', name: 'Quick Feet', desc: 'Routes need 10% fewer kills to clear per level.', maxLevel: 5, cost: linear(2), effect: { kind: 'quota', perLevel: 0.1 } },
  { id: 'provisions', name: 'Provisions', desc: 'Begin each run with 20 extra Pal Spheres per level.', maxLevel: 3, cost: linear(1), effect: { kind: 'spheres', perLevel: 20 } },
];

const BY_ID = new Map(PRESTIGE_UPGRADES.map((u) => [u.id, u]));
export function prestigeUpgradeById(id: string): PrestigeUpgradeDef {
  const u = BY_ID.get(id);
  if (!u) throw new Error(`Unknown prestige upgrade ${id}`);
  return u;
}
