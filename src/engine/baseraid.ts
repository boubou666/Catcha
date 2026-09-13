/**
 * Base raids: now and then a wild Pal from the current route attacks the base. The workers fight back on
 * their own (at half attack — they were busy), the party can be rallied to help, and production pauses until
 * it is over. Repel it before the clock runs out for a fat drop and a throw at the raider; fail and it makes
 * off with a slice of two stacks and rattles the workers' SAN.
 */
import type { PalInstance, RouteDef, SaveState } from '../data/types';
import { palById } from '../data/pals';
import { elementMult } from '../data/elements';
import { partyInstances } from './party';
import { baseWorkers } from './base';
import { instanceAttack, goldReward, wildHp } from './formulas';
import { partnerAttackMult } from './partner';
import { earnGold, addItem, countOf } from './inventory';
import { pickWeighted, type Rng, type Wild } from './combat';
import { tryCatch, type CatchResult } from './catch';
import { structureLevel } from './base';

export interface BaseRaid {
  palId: number;
  level: number;
  hp: number;
  maxHp: number;
  secondsLeft: number;      // counts down in play time
  rallied: boolean;         // the party joined the defence
}

export const RAID_EVERY_SEC = { min: 15 * 60, max: 25 * 60 };   // of play, between raids
export const RAID_TIME_SEC = 180;
export const WATCHTOWER_EXTRA_SEC = 60;   // Lv 2
export const RAID_HP_MULT = 4;
export const RAID_LOOT_MULT = 3;
export const RAID_GOLD_MULT = 5;
export const WORKER_ATTACK_MULT = 0.6;
export const STEAL_FRACTION = 0.1;
export const STEAL_SAN = 20;

/** Play-seconds until the first raid on a fresh save (or after one ends). */
export function nextRaidDelay(rand: Rng = Math.random): number {
  return RAID_EVERY_SEC.min + rand() * (RAID_EVERY_SEC.max - RAID_EVERY_SEC.min);
}

/** A raid can only happen when there is something to defend. */
export function canRaid(save: SaveState): boolean {
  return save.base.workers.length > 0 && Object.keys(save.base.structures).length > 0;
}

/** Roll the raider: a species from the current route, a level or two above it, with boss-sized HP. */
export function rollRaid(route: RouteDef, rand: Rng = Math.random): BaseRaid {
  const { palId } = pickWeighted(route.spawns, rand);
  const level = route.level + 1 + Math.floor(rand() * 2);
  const maxHp = Math.round(wildHp(level) * RAID_HP_MULT);
  return { palId, level, hp: maxHp, maxHp, secondsLeft: RAID_TIME_SEC, rallied: false };
}

/** The same roll, with the Watchtower's help applied: a longer clock at Lv 2, the party already rallied at Lv 3. */
export function rollRaidFor(save: SaveState, route: RouteDef, rand: Rng = Math.random): BaseRaid {
  const raid = rollRaid(route, rand);
  const tower = structureLevel(save, 'watchtower');
  if (tower >= 2) raid.secondsLeft += WATCHTOWER_EXTRA_SEC;
  if (tower >= 3) raid.rallied = true;
  return raid;
}

/** Damage per second the defenders put out: workers at half attack, plus the party when rallied. */
export function defenceDps(save: SaveState, raid: BaseRaid): number {
  const target = palById(raid.palId).elements;
  const dmg = (inst: PalInstance, mult: number) => {
    const def = palById(inst.palId);
    return instanceAttack(inst) * elementMult(def.elements, target) * partnerAttackMult(save, def) * mult;
  };
  const workerMult = structureLevel(save, 'watchtower') >= 1 ? 1 : WORKER_ATTACK_MULT;   // a Watchtower lets them fight properly
  let dps = baseWorkers(save).reduce((s, w) => s + dmg(w, workerMult), 0);
  if (raid.rallied) dps += partyInstances(save).reduce((s, p) => s + dmg(p, 1), 0);
  return dps;
}

export type RaidOutcome =
  | { kind: 'repelled'; gold: number; drops: Record<string, number>; catchResult: CatchResult }
  | { kind: 'failed'; stolen: Record<string, number> };

/** Advance a running raid by dt seconds. Returns an outcome when it ends, else null. */
export function tickRaid(save: SaveState, raid: BaseRaid, dtSec: number, rand: Rng = Math.random): RaidOutcome | null {
  raid.hp -= defenceDps(save, raid) * dtSec;
  raid.secondsLeft -= dtSec;
  if (raid.hp <= 0) return repel(save, raid, rand);
  if (raid.secondsLeft <= 0) return fail(save, raid, rand);
  return null;
}

function repel(save: SaveState, raid: BaseRaid, rand: Rng): RaidOutcome {
  const def = palById(raid.palId);
  const gold = Math.round(goldReward(raid.level) * RAID_GOLD_MULT);
  earnGold(save, gold);
  const drops: Record<string, number> = {};
  for (const d of def.drops) {
    if (rand() < d.chance) {
      const n = (d.min + Math.floor(rand() * (d.max - d.min + 1))) * RAID_LOOT_MULT;
      drops[d.itemId] = (drops[d.itemId] ?? 0) + n;
      addItem(save, d.itemId, n);
    }
  }
  const wild: Wild = { palId: raid.palId, level: raid.level, hp: 0, maxHp: raid.maxHp, lucky: false, kind: 'wild' };
  const catchResult = tryCatch(save, wild, rand);
  (save.paldeck[raid.palId] ??= { seen: false, caught: 0 }).seen = true;
  save.stats.baseRaidsRepelled += 1;
  return { kind: 'repelled', gold, drops, catchResult };
}

function fail(save: SaveState, raid: BaseRaid, rand: Rng): RaidOutcome {
  // two of the biggest non-sphere stacks lose a tenth
  const stacks = Object.entries(save.inventory).filter(([id, n]) => n >= 10 && !id.startsWith('sphere_') && !id.startsWith('slab_')).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const stolen: Record<string, number> = {};
  for (let i = 0; i < 2 && stacks.length; i++) {
    const [id, n] = stacks.splice(Math.floor(rand() * stacks.length), 1)[0];
    const take = Math.max(1, Math.floor(n * STEAL_FRACTION));
    save.inventory[id] = countOf(save, id) - take;
    stolen[id] = take;
  }
  for (const w of baseWorkers(save)) w.san = Math.max(0, (w.san ?? 100) - STEAL_SAN);
  save.stats.baseRaidsLost += 1;
  return { kind: 'failed', stolen };
}
