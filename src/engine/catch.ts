import type { Rarity, SaveState, SphereTier } from '../data/types';
import { SPHERE_TIERS } from '../data/types';
import { palById } from '../data/pals';
import { BASE_CATCH_RATE, EFFIGY_CAPTURE_BONUS, LUCKY_CATCH_PENALTY, SPHERES } from '../data/spheres';
import { addToBox, makeInstance } from './party';
import type { Rng, Wild } from './combat';

export function catchChance(rarity: Rarity, tier: SphereTier, effigies: number, lucky: boolean): number {
  const chance = BASE_CATCH_RATE[rarity]
    * SPHERES[tier].mult
    * (1 + EFFIGY_CAPTURE_BONUS * effigies)
    * (lucky ? LUCKY_CATCH_PENALTY : 1);
  return Math.min(0.99, chance);
}

/**
 * Which sphere to throw at this species, per the player's policy.
 * Falls back to lower tiers when the preferred one is out of stock.
 */
export function chooseSphere(save: SaveState, palId: number): SphereTier | null {
  const caught = (save.paldeck[palId]?.caught ?? 0) > 0;
  const preferred = caught ? save.settings.sphereForDupe : save.settings.sphereForNew;
  if (preferred === 'none') return null;
  const start = SPHERE_TIERS.indexOf(preferred);
  for (let i = start; i >= 0; i--) {
    const tier = SPHERE_TIERS[i];
    if ((save.inventory[SPHERES[tier].itemId] ?? 0) > 0) return tier;
  }
  return null;
}

export type CatchResult =
  | { outcome: 'skipped' }
  | { outcome: 'caught' | 'failed'; tier: SphereTier; chance: number };

export function tryCatch(save: SaveState, wild: Wild, rand: Rng = Math.random): CatchResult {
  const tier = chooseSphere(save, wild.palId);
  if (!tier) return { outcome: 'skipped' };

  const itemId = SPHERES[tier].itemId;
  save.inventory[itemId] -= 1;

  const chance = catchChance(palById(wild.palId).rarity, tier, save.player.effigies, wild.lucky);
  if (rand() < chance) {
    addToBox(save, makeInstance(wild.palId, wild.level, wild.lucky));
    return { outcome: 'caught', tier, chance };
  }
  return { outcome: 'failed', tier, chance };
}
