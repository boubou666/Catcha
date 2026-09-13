import type { Rarity, SaveState, SphereTier } from '../data/types';
import { SPHERE_TIERS } from '../data/types';
import { palById } from '../data/pals';
import { ALPHA_CATCH_PENALTY, BASE_CATCH_RATE, EFFIGY_CAPTURE_BONUS, LUCKY_CATCH_PENALTY, SPHERES } from '../data/spheres';
import { addToBox, makeInstance } from './party';
import { techMult } from './tech';
import { prestigeMult } from './prestige';
import { rollWildPassives } from './passives';
import { isUnlocked } from './progress';
import type { Rng, Wild } from './combat';

export function catchChance(rarity: Rarity, tier: SphereTier, effigies: number, lucky: boolean, mult = 1, alpha = false): number {
  const chance = BASE_CATCH_RATE[rarity]
    * SPHERES[tier].mult
    * mult
    * (1 + EFFIGY_CAPTURE_BONUS * effigies)
    * (lucky ? LUCKY_CATCH_PENALTY : 1)
    * (alpha ? ALPHA_CATCH_PENALTY : 1);
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
  save.stats.throws += 1;
  save.stats.throwsByTier[tier] = (save.stats.throwsByTier[tier] ?? 0) + 1;

  const chance = catchChance(palById(wild.palId).rarity, tier, save.player.effigies, wild.lucky, techMult(save, 'catch') * prestigeMult(save, 'catch'), wild.kind === 'alpha');
  save.stats.chanceSum += chance;
  save.stats.ratedThrows += 1;
  if (rand() < chance) {
    addToBox(save, makeInstance(wild.palId, wild.level, wild.lucky, rollWildPassives(palById(wild.palId), wild.lucky, rand)));
    save.stats.caught += 1;
    save.stats.caughtByTier[tier] = (save.stats.caughtByTier[tier] ?? 0) + 1;
    if (wild.lucky) save.stats.luckyCaught += 1;
    return { outcome: 'caught', tier, chance };
  }
  return { outcome: 'failed', tier, chance };
}

/** Wild Pals, Alphas and realm waves/guardians can be caught; tower bosses and raids cannot. */
export function isCatchable(wild: Wild | null | undefined): wild is Wild {
  return !!wild && (wild.kind === 'wild' || wild.kind === 'alpha' || wild.kind === 'dungeon' || wild.kind === 'dungeonBoss');
}

/** Odds of a specific sphere tier against the current wild (Lucky and Alpha penalties included), or null when nothing catchable is out. */
export function chanceVsWild(save: SaveState, wild: Wild | null | undefined, tier: SphereTier, extraMult = 1): number | null {
  if (!isCatchable(wild)) return null;
  return catchChance(palById(wild.palId).rarity, tier, save.player.effigies, wild.lucky, techMult(save, 'catch') * prestigeMult(save, 'catch') * extraMult, wild.kind === 'alpha');
}

export interface CatchTableRow { tier: SphereTier; stock: number; chance: number; alpha: number }

/** Odds for this species with every sphere the merchant has unlocked so far (wild, and as an Alpha), with what's in the bag. */
export function catchTable(save: SaveState, palId: number): CatchTableRow[] {
  const rarity = palById(palId).rarity;
  const mult = techMult(save, 'catch') * prestigeMult(save, 'catch');
  return SPHERE_TIERS
    .filter((t) => isUnlocked(save, SPHERES[t].unlock))
    .map((tier) => ({
      tier,
      stock: save.inventory[SPHERES[tier].itemId] ?? 0,
      chance: catchChance(rarity, tier, save.player.effigies, false, mult),
      alpha: catchChance(rarity, tier, save.player.effigies, false, mult, true),
    }));
}

export type CatchPreview =
  | { throws: true; tier: SphereTier; chance: number; dupe: boolean }
  | { throws: false; reason: 'policy' | 'no-spheres'; dupe: boolean };

/** What a defeat of this species would do right now: which sphere, what odds — or why nothing is thrown. */
export function catchPreview(save: SaveState, palId: number, lucky = false, alpha = false): CatchPreview {
  const dupe = (save.paldeck[palId]?.caught ?? 0) > 0;
  const preferred = dupe ? save.settings.sphereForDupe : save.settings.sphereForNew;
  if (preferred === 'none') return { throws: false, reason: 'policy', dupe };
  const tier = chooseSphere(save, palId);
  if (!tier) return { throws: false, reason: 'no-spheres', dupe };
  return { throws: true, tier, chance: catchChance(palById(palId).rarity, tier, save.player.effigies, lucky, techMult(save, 'catch') * prestigeMult(save, 'catch'), alpha), dupe };
}
