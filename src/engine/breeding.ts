import type { PalDef, PalInstance, Rarity, SaveState } from '../data/types';
import { PALS, palById } from '../data/pals';
import { SPECIAL_COMBOS } from '../data/combos';
export { SPECIAL_COMBOS };
import { countOf } from './inventory';
import { addToBox, instanceByUid, isAway, makeInstance } from './party';
import { inheritPassives, type Rng } from './passives';
import { LUCKY_CHANCE } from './formulas';

/** Odds an egg from these parents is Lucky. */
export function luckyEggChance(a: PalInstance, b: PalInstance): number {
  return Math.min(1, LUCKY_CHANCE + LUCKY_PER_LUCKY_PARENT * ((a.lucky ? 1 : 0) + (b.lucky ? 1 : 0)));
}

export const BREEDING_FARM = 'breeding_farm';
export const CAKE = 'cake';
export const BREED_SEC = 300;                       // one Cake → one egg
export const LUCKY_PER_LUCKY_PARENT = 0.1;          // added to the base wild Lucky chance per Lucky parent
export const INCUBATION_SEC: Record<Rarity, number> = {
  common: 120, uncommon: 300, rare: 600, epic: 1200, legendary: 2400,
};


export function comboKey(a: number, b: number): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`;
}

/**
 * Palworld's rule: same species breeds true; a special combo wins; otherwise the child is the
 * base species whose breedPower is closest to the parents' average (ties → lower Paldeck #).
 * Subspecies never come out of the formula — only from a special combo or a same-species pair.
 */
export function childOf(aId: number, bId: number, pals: PalDef[] = PALS, combos = SPECIAL_COMBOS): number {
  if (aId === bId) return aId;
  const special = combos[comboKey(aId, bId)];
  if (special !== undefined) return special;
  const target = (palById(aId).breedPower + palById(bId).breedPower) / 2;
  let best = pals[0];
  let bestDist = Infinity;
  for (const p of pals) {
    if (p.variantOf) continue;
    const d = Math.abs(p.breedPower - target);
    if (d < bestDist || (d === bestDist && p.id < best.id)) { best = p; bestDist = d; }
  }
  return best.id;
}

// ---- pair management ------------------------------------------------------------

export function isBreeding(save: SaveState, uid: string): boolean {
  const b = save.base.breeding;
  return !!b && (b.a === uid || b.b === uid);
}

export function breedingParents(save: SaveState): [PalInstance, PalInstance] | null {
  const b = save.base.breeding;
  if (!b) return null;
  const a = instanceByUid(save, b.a);
  const c = instanceByUid(save, b.b);
  return a && c ? [a, c] : null;
}

/** Idle box Pals: not in the party, not working, not already paired. */
export function breedable(save: SaveState): PalInstance[] {
  return save.box.filter((p) =>
    !save.party.includes(p.uid) && !save.base.workers.includes(p.uid) && !isBreeding(save, p.uid) && !isAway(save, p.uid));
}

export type PairBlock = 'no-farm' | 'same-pal' | 'busy';

export function pairBlocker(save: SaveState, aUid: string, bUid: string): PairBlock | null {
  if (!(save.base.structures[BREEDING_FARM] > 0)) return 'no-farm';
  if (aUid === bUid) return 'same-pal';
  const idle = new Set(breedable(save).map((p) => p.uid));
  if (!idle.has(aUid) || !idle.has(bUid)) return 'busy';
  return null;
}

export function setPair(save: SaveState, aUid: string, bUid: string): boolean {
  if (pairBlocker(save, aUid, bUid)) return false;
  save.base.breeding = { a: aUid, b: bUid, progress: null };
  return true;
}

/** Break the pair; an egg in progress is lost (the Cake is not refunded). */
export function clearPair(save: SaveState): void {
  save.base.breeding = null;
}

// ---- tick -----------------------------------------------------------------------

/** Advance breeding and incubation by dtSec. Returns the Paldeck ids that hatched. */
export function tickBreeding(save: SaveState, dtSec: number, rand: Rng = Math.random): number[] {
  const base = save.base;
  for (const egg of base.eggs) egg.remaining -= dtSec;   // eggs laid below only age for the rest of the tick

  const b = base.breeding;
  if (b && save.base.structures[BREEDING_FARM] > 0) {
    const parents = breedingParents(save);
    if (!parents) {
      base.breeding = null;
    } else {
      let left = dtSec;
      while (left > 0) {
        if (b.progress === null) {
          if (countOf(save, CAKE) < 1) break;
          save.inventory[CAKE] -= 1;
          b.progress = 0;
        }
        const need = (1 - b.progress) * BREED_SEC;
        if (left < need) { b.progress += left / BREED_SEC; left = 0; }
        else {
          left -= need;
          b.progress = null;
          const palId = childOf(parents[0].palId, parents[1].palId);
          const lucky = rand() < luckyEggChance(parents[0], parents[1]);
          const passives = inheritPassives(parents[0], parents[1], palById(palId), rand, lucky);
          base.eggs.push({ palId, remaining: INCUBATION_SEC[palById(palId).rarity] - left, passives, lucky });
        }
      }
    }
  }

  const hatched: number[] = [];
  for (const egg of base.eggs.filter((e) => e.remaining <= 0)) {
    addToBox(save, makeInstance(egg.palId, 1, egg.lucky ?? false, egg.passives));
    save.stats.hatched += 1;
    if (egg.lucky) save.stats.luckyHatched += 1;
    hatched.push(egg.palId);
  }
  if (hatched.length) base.eggs = base.eggs.filter((e) => e.remaining > 0);
  return hatched;
}
