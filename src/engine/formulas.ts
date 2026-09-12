import type { PalInstance } from '../data/types';
import { palById } from '../data/pals';
import { passiveMult } from './passives';

// Balance knobs. Everything here is a starting point — see DESIGN.md §8.

export const PARTY_SIZE = 5;
export const LUCKY_CHANCE = 1 / 300;
export const LUCKY_HP_MULT = 3;

// Polynomial for the early curve, with a 1.2%/level exponential so late-game DPS growth (attack techs
// ×3.9 by Lv 60, stars, passives) doesn't turn kills trivial. Tuned by scripts/balance.mjs.
export const wildHp = (level: number) => (25 + 10 * Math.pow(level, 1.5)) * Math.pow(1.012, level);

export function instanceAttack(inst: PalInstance): number {
  const def = palById(inst.palId);
  return (def.baseAttack / 10)
    * (1 + 0.08 * inst.level)
    * (1 + 0.1 * inst.stars)
    * passiveMult(inst, 'attack');
}

export const clickDamage = (playerLevel: number, weaponTier: number) =>
  5 * weaponTier * (1 + 0.03 * playerLevel);

export const expToLevel = (n: number) => Math.floor(25 * Math.pow(n, 1.8));

export const goldReward = (level: number) => 2 + level * 2;
export const expReward = (level: number) => 4 + level * 2;
