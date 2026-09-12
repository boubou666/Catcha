import type { Rarity, Requirement, SphereTier } from './types';

export interface SphereDef {
  tier: SphereTier;
  name: string;
  itemId: string;
  mult: number;             // catch-rate multiplier
  price: number | null;     // merchant price in gold; null = craft only
  unlock: Requirement;      // when the merchant starts stocking it
}

export const SPHERES: Record<SphereTier, SphereDef> = {
  pal:       { tier: 'pal',       name: 'Pal Sphere',       itemId: 'sphere_pal',       mult: 1,   price: 40,   unlock: { kind: 'none' } },
  mega:      { tier: 'mega',      name: 'Mega Sphere',      itemId: 'sphere_mega',      mult: 1.5, price: 200,  unlock: { kind: 'alpha', id: 'chillet' } },
  giga:      { tier: 'giga',      name: 'Giga Sphere',      itemId: 'sphere_giga',      mult: 2.2, price: 800,  unlock: { kind: 'tower', id: 'rayne' } },
  hyper:     { tier: 'hyper',     name: 'Hyper Sphere',     itemId: 'sphere_hyper',     mult: 3.2, price: null, unlock: { kind: 'tower', id: 'rayne' } },
  ultra:     { tier: 'ultra',     name: 'Ultra Sphere',     itemId: 'sphere_ultra',     mult: 4.5, price: null, unlock: { kind: 'tower', id: 'rayne' } },
  legendary: { tier: 'legendary', name: 'Legendary Sphere', itemId: 'sphere_legendary', mult: 6.5, price: null, unlock: { kind: 'tower', id: 'rayne' } },
};

export const BASE_CATCH_RATE: Record<Rarity, number> = {
  common: 0.6,
  uncommon: 0.35,
  rare: 0.15,
  epic: 0.06,
  legendary: 0.02,
};

export const LUCKY_CATCH_PENALTY = 0.5;
/** Alphas can be caught like in Palworld, but they resist: their catch chance is multiplied by this. */
export const ALPHA_CATCH_PENALTY = 0.35;
export const EFFIGY_CAPTURE_BONUS = 0.02; // +2% capture power per effigy
