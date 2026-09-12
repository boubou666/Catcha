import type { PalDef, PalInstance } from '../data/types';
import { MAX_PASSIVES, MUTATION_CHANCE, passiveById, ROLLABLE, WILD_PASSIVE_COUNT_WEIGHTS, type PassiveStat } from '../data/passives';

export type Rng = () => number;

/** Product of a Pal's passive multipliers for one stat. */
export function passiveMult(inst: PalInstance, stat: PassiveStat): number {
  let m = 1;
  for (const id of inst.passives) m *= passiveById(id).effects[stat] ?? 1;
  return m;
}

function pickWeighted<T extends { weight: number }>(list: T[], rand: Rng): T {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = rand() * total;
  for (const x of list) { r -= x.weight; if (r <= 0) return x; }
  return list[list.length - 1];
}

function rollCount(rand: Rng): number {
  let r = rand();
  for (let i = 0; i < WILD_PASSIVE_COUNT_WEIGHTS.length; i++) {
    r -= WILD_PASSIVE_COUNT_WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

/** Distinct random passives from the rollable pool, avoiding `taken`. */
function drawRandom(n: number, taken: Set<string>, rand: Rng): string[] {
  const out: string[] = [];
  let pool = ROLLABLE.filter((p) => !taken.has(p.id));
  while (out.length < n && pool.length > 0) {
    const pick = pickWeighted(pool, rand);
    out.push(pick.id);
    pool = pool.filter((p) => p.id !== pick.id);
  }
  return out;
}

/** Passives for a freshly caught wild Pal: guaranteed ones first, then 0–4 random. */
export function rollWildPassives(def: PalDef, lucky: boolean, rand: Rng = Math.random): string[] {
  const out: string[] = [];
  if (def.rarity === 'legendary') out.push('legend');
  if (lucky) out.push('lucky');
  const n = Math.min(rollCount(rand), MAX_PASSIVES - out.length);
  out.push(...drawRandom(n, new Set(out), rand));
  return out;
}

/**
 * Passives for an egg: a random subset of the parents' combined passives (each kept with the
 * same odds as a wild slot roll), then a small mutation chance per remaining slot.
 * Legend follows the child's species, never the parents.
 */
export function inheritPassives(a: PalInstance, b: PalInstance, childDef: PalDef, rand: Rng = Math.random): string[] {
  return inheritFromParents([a, b], childDef, rand);
}

/** Same rule for any number of "parents" — a raid egg draws from the party that won it. */
export function inheritFromParents(parents: PalInstance[], childDef: PalDef, rand: Rng = Math.random): string[] {
  const out: string[] = [];
  if (childDef.rarity === 'legendary') out.push('legend');
  const pool = [...new Set(parents.flatMap((p) => p.passives))].filter((id) => id !== 'legend' && id !== 'lucky');
  // shuffle parents' pool, keep up to the rolled count (at least one if any are available)
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const keep = Math.min(pool.length, Math.max(pool.length ? 1 : 0, rollCount(rand) + 1), MAX_PASSIVES - out.length);
  out.push(...pool.slice(0, keep));
  while (out.length < MAX_PASSIVES && rand() < MUTATION_CHANCE) {
    const extra = drawRandom(1, new Set(out), rand);
    if (!extra.length) break;
    out.push(...extra);
  }
  return out;
}
