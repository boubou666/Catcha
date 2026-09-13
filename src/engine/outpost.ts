/**
 * Outposts: a second, third… camp in a region whose tower you have cleared. Workers posted there gather the
 * region's drops on their own — every minute each worker brings back one item rolled from the region's
 * spawn table, more with stars and a good work level — no structures, no raids, no queue. A sink for the
 * duplicates the late game piles up.
 */
import type { PalInstance, SaveState } from '../data/types';
import { regionById } from '../data/regions';
import { palById } from '../data/pals';
import { pickWeighted, type Rng } from './combat';
import { instanceByUid } from './party';
import { isUnlocked } from './progress';
import { addItem, canAfford, spend, type Cost } from './inventory';
import { structureLevel, workerMult } from './base';

export interface Outpost { regionId: string; workers: string[]; slots: number; acc: number; taken: Record<string, number> }

export const OUTPOST_SLOTS = 3;
export const OUTPOST_ITEMS_PER_MIN = 1;   // per worker, before stars / SAN
export const OUTPOST_COST: Cost = { gold: 5_000, wood: 200, stone: 200, ingot: 20 };

/** An outpost can stand in any region whose tower is beaten (never the home region). */
export function canFound(save: SaveState, regionId: string): boolean {
  const region = regionById(regionId);
  return regionId !== 'windswept' && isUnlocked(save, { kind: 'tower', id: region.tower.id })
    && !save.outposts.some((o) => o.regionId === regionId) && canAfford(save, OUTPOST_COST);
}

export function found(save: SaveState, regionId: string): boolean {
  if (!canFound(save, regionId) || !spend(save, OUTPOST_COST)) return false;
  save.outposts.push({ regionId, workers: [], slots: OUTPOST_SLOTS, acc: 0, taken: {} });
  return true;
}

export function outpostWorkers(save: SaveState, o: Outpost): PalInstance[] {
  return o.workers.map((u) => instanceByUid(save, u)).filter((p): p is PalInstance => !!p);
}

/** A Pal can be posted if it is in the box and doing nothing else. */
/** Slots at an outpost: the base OUTPOST_SLOTS plus the Outpost Expansion's levels. */
export const outpostSlots = (save: SaveState, o: Outpost) => o.slots + structureLevel(save, 'outpost_expansion');

export function canPost(save: SaveState, o: Outpost, uid: string): boolean {
  if (o.workers.length >= outpostSlots(save, o) || !instanceByUid(save, uid)) return false;
  const busy = save.party.includes(uid) || save.base.workers.includes(uid) || save.outposts.some((x) => x.workers.includes(uid))
    || save.base.expeditions.some((e) => e.members.includes(uid)) || save.base.breeding?.a === uid || save.base.breeding?.b === uid;
  return !busy;
}

export function post(save: SaveState, o: Outpost, uid: string): boolean {
  if (!canPost(save, o, uid)) return false;
  o.workers.push(uid);
  return true;
}
export function recall(o: Outpost, uid: string): void { o.workers = o.workers.filter((u) => u !== uid); }

/** Items per minute the outpost gathers. */
export function outpostRate(save: SaveState, o: Outpost): number {
  return outpostWorkers(save, o).reduce((s, w) => s + OUTPOST_ITEMS_PER_MIN * workerMult(w), 0);
}

/** Advance all outposts; returns what was gathered this tick. */
export function tickOutposts(save: SaveState, dtSec: number, rand: Rng = Math.random): Record<string, number> {
  const got: Record<string, number> = {};
  for (const o of save.outposts) {
    o.acc += (outpostRate(save, o) * dtSec) / 60;
    const region = regionById(o.regionId);
    const spawns = region.routes.flatMap((r) => r.spawns);
    while (o.acc >= 1) {
      o.acc -= 1;
      const { palId } = pickWeighted(spawns, rand);
      const drops = palById(palId).drops;
      if (!drops.length) continue;
      const d = drops[Math.floor(rand() * drops.length)];
      addItem(save, d.itemId, 1);
      got[d.itemId] = (got[d.itemId] ?? 0) + 1;
      o.taken[d.itemId] = (o.taken[d.itemId] ?? 0) + 1;
    }
  }
  return got;
}
