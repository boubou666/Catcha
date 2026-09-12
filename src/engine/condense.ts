import type { PalInstance, SaveState } from '../data/types';
import { instanceByUid, isAway } from './party';
import { structureLevel } from './base';

export const CONDENSER = 'condenser';
export const MAX_STARS = 4;
/** Duplicates consumed to reach star n (index n-1). */
export const CONDENSE_COST = [4, 16, 32, 64] as const;

export function condenseCost(inst: PalInstance): number | null {
  return inst.stars >= MAX_STARS ? null : CONDENSE_COST[inst.stars as 0 | 1 | 2 | 3];
}

/**
 * Same-species Pals that may be fed into `target`: idle (not in the party or at the base),
 * unstarred and not Lucky — those are worth keeping. Weakest first.
 */
export function condenseCandidates(save: SaveState, target: PalInstance): PalInstance[] {
  return save.box
    .filter((p) =>
      p.palId === target.palId && p.uid !== target.uid
      && p.stars === 0 && !p.lucky
      && !save.party.includes(p.uid) && !save.base.workers.includes(p.uid)
      && p.uid !== save.base.breeding?.a && p.uid !== save.base.breeding?.b && !isAway(save, p.uid))
    .sort((a, b) => a.level - b.level || a.exp - b.exp);
}

export type CondenseBlock = 'no-condenser' | 'max-stars' | 'not-enough';

export function condenseBlocker(save: SaveState, target: PalInstance): CondenseBlock | null {
  if (structureLevel(save, CONDENSER) === 0) return 'no-condenser';
  const cost = condenseCost(target);
  if (cost === null) return 'max-stars';
  if (condenseCandidates(save, target).length < cost) return 'not-enough';
  return null;
}

/** Consume duplicates and add a star. Returns the consumed instances, or null if blocked. */
export function condense(save: SaveState, targetUid: string): PalInstance[] | null {
  const target = instanceByUid(save, targetUid);
  if (!target || condenseBlocker(save, target)) return null;
  const cost = condenseCost(target)!;
  const fed = condenseCandidates(save, target).slice(0, cost);
  const gone = new Set(fed.map((p) => p.uid));
  save.box = save.box.filter((p) => !gone.has(p.uid));
  target.stars = (target.stars + 1) as PalInstance['stars'];
  save.stats.condensed += 1;
  return fed;
}
