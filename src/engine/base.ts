import type { BaseState, PalInstance, SaveState, WorkType } from '../data/types';
import { palById } from '../data/pals';
import { BASE_SLOTS, FOOD_ITEM, JOBS, QUEUE_CAP, RATES, recipeById, structureById, STRUCTURES } from '../data/base';
import { addItem, canAfford, spend, countOf, type Cost } from './inventory';
import { detachFromBreeding, instanceByUid } from './party';
import { isUnlocked } from './progress';
import { recipeUnlocked, structureUnlocked, techMult } from './tech';

export function newBase(): BaseState {
  return { slots: BASE_SLOTS, workers: [], structures: {}, queue: [], acc: {}, breeding: null, eggs: [] };
}

// ---- workers ---------------------------------------------------------------

export function baseWorkers(save: SaveState): PalInstance[] {
  return save.base.workers
    .map((uid) => instanceByUid(save, uid))
    .filter((p): p is PalInstance => !!p);
}

export function isWorker(save: SaveState, uid: string): boolean {
  return save.base.workers.includes(uid);
}

/** Move a box Pal to the base. Removes it from the party. */
export function assignWorker(save: SaveState, uid: string): boolean {
  if (isWorker(save, uid) || !instanceByUid(save, uid)) return false;
  if (save.base.workers.length >= save.base.slots) return false;
  save.party = save.party.filter((u) => u !== uid);
  detachFromBreeding(save, uid);
  save.base.workers.push(uid);
  return true;
}

export function unassignWorker(save: SaveState, uid: string): void {
  save.base.workers = save.base.workers.filter((u) => u !== uid);
}

/** Sum of each job's work level across workers, with the condensing-star bonus. */
export function workLevels(save: SaveState): Record<WorkType, number> {
  const out = Object.fromEntries(JOBS.map((j) => [j.type, 0])) as Record<WorkType, number>;
  for (const inst of baseWorkers(save)) {
    const mult = 1 + RATES.starBonus * inst.stars;
    for (const [job, lvl] of Object.entries(palById(inst.palId).work)) {
      out[job as WorkType] += (lvl ?? 0) * mult;
    }
  }
  return out;
}

// ---- structures --------------------------------------------------------------

export function structureLevel(save: SaveState, id: string): number {
  return save.base.structures[id] ?? 0;
}

/** Cost of the next level, or null when maxed. */
export function nextCost(save: SaveState, id: string): Cost | null {
  if (!structureUnlocked(save, id)) return null;
  const def = structureById(id);
  const level = structureLevel(save, id);
  return level < def.costs.length ? def.costs[level] : null;
}

export function build(save: SaveState, id: string): boolean {
  const cost = nextCost(save, id);
  if (!cost || !spend(save, cost)) return false;
  save.base.structures[id] = structureLevel(save, id) + 1;
  if (id === 'palbox') save.base.slots += 1;
  return true;
}

// ---- multipliers / rates -----------------------------------------------------

export function isHungry(save: SaveState): boolean {
  return save.base.workers.length > 0 && countOf(save, FOOD_ITEM) < 1;
}

export function globalMult(save: SaveState, levels = workLevels(save)): number {
  const transport = Math.min(RATES.transportCap, levels.Transporting * RATES.transportBonus);
  const electric = Math.min(RATES.electricCap, levels.Electricity * RATES.electricBonus);
  return (1 + transport) * (1 + electric) * (isHungry(save) ? RATES.hungryMult : 1) * techMult(save, 'base');
}

export function foodPerMinute(save: SaveState, levels = workLevels(save)): number {
  const saving = Math.min(RATES.coolingCap, levels.Cooling * RATES.coolingSaving);
  return save.base.workers.length * RATES.foodPerWorker * (1 - saving);
}

export interface BaseRates {
  items: Record<string, number>;   // gross production per minute, by item
  smeltPerMin: number;             // ingots/min if ore is available
  handiworkPerSec: number;         // crafting work units per second
  foodPerMin: number;              // consumption
  mult: number;
}

/** Everything the base does per minute at current staffing. Used by the tick and the UI. */
export function computeRates(save: SaveState): BaseRates {
  const w = workLevels(save);
  const mult = globalMult(save, w);
  const lvl = (id: string) => structureLevel(save, id);
  const items: Record<string, number> = {};
  const add = (id: string, n: number) => { if (n > 0) items[id] = (items[id] ?? 0) + n; };

  add('wood', w.Lumbering * RATES.wood * (1 + lvl('logging')) * mult);
  const mining = w.Mining * (1 + lvl('stone_pit')) * mult;
  add('stone', mining * RATES.stone);
  add('ore', mining * RATES.ore);
  add('paldium', mining * RATES.paldium);

  if (lvl('berry_plantation') > 0) {
    const crew = Math.min(w.Planting, w.Watering, w.Gathering);
    add(FOOD_ITEM, crew * RATES.berries * lvl('berry_plantation') * mult);
  }
  if (lvl('ranch') > 0) {
    for (const inst of baseWorkers(save)) {
      const farm = palById(inst.palId).farmDrop;
      if (farm) add(farm.itemId, farm.perMinute * (1 + RATES.starBonus * inst.stars) * mult);
    }
  }

  return {
    items,
    smeltPerMin: lvl('furnace') > 0 ? w.Kindling * RATES.smelt * mult : 0,
    handiworkPerSec: lvl('workbench') > 0 ? w.Handiwork * RATES.handiwork * mult : 0,
    foodPerMin: foodPerMinute(save, w),
    mult,
  };
}

// ---- crafting ------------------------------------------------------------------

export function canCraft(save: SaveState, recipeId: string): boolean {
  const r = recipeById(recipeId);
  return structureLevel(save, 'workbench') > 0 && isUnlocked(save, r.unlock) && recipeUnlocked(save, recipeId);
}

/** Pay for and queue n units. Returns how many were queued. */
export function enqueue(save: SaveState, recipeId: string, n: number): number {
  if (!canCraft(save, recipeId)) return 0;
  const r = recipeById(recipeId);
  const room = QUEUE_CAP - save.base.queue.length;
  let queued = 0;
  while (queued < Math.min(n, room) && spend(save, r.inputs)) {
    save.base.queue.push({ recipeId, remaining: r.work });
    queued++;
  }
  return queued;
}

/** Remove a queued unit and refund its inputs (a partially worked head unit is refunded too). */
export function cancelCraft(save: SaveState, index: number): void {
  const job = save.base.queue[index];
  if (!job) return;
  save.base.queue.splice(index, 1);
  for (const [id, n] of Object.entries(recipeById(job.recipeId).inputs)) addItem(save, id, n);
}

function completeCraft(save: SaveState, recipeId: string): void {
  const out = recipeById(recipeId).output;
  if (out.kind === 'item') addItem(save, out.itemId, out.n);
  else save.player.weaponTier = Math.max(save.player.weaponTier, out.tier);
}

// ---- tick ----------------------------------------------------------------------

/** Accumulate a fractional amount and move whole units into the inventory. */
function produce(save: SaveState, itemId: string, amount: number): void {
  const acc = save.base.acc;
  acc[itemId] = (acc[itemId] ?? 0) + amount;
  const whole = Math.floor(acc[itemId]);
  if (whole > 0) {
    addItem(save, itemId, whole);
    acc[itemId] -= whole;
  }
}

export function tickBase(save: SaveState, dtSec: number): void {
  if (save.base.workers.length === 0 || dtSec <= 0) return;
  const rates = computeRates(save);
  const dtMin = dtSec / 60;
  const acc = save.base.acc;

  // Food is eaten before anything else so this tick's hunger state is already priced into `rates`.
  acc.food = (acc.food ?? 0) + rates.foodPerMin * dtMin;
  while (acc.food >= 1) {
    acc.food -= 1;
    if (countOf(save, FOOD_ITEM) > 0) save.inventory[FOOD_ITEM] -= 1;
  }

  for (const [itemId, perMin] of Object.entries(rates.items)) produce(save, itemId, perMin * dtMin);

  if (rates.smeltPerMin > 0) {
    acc.smelt = (acc.smelt ?? 0) + rates.smeltPerMin * dtMin;
    while (acc.smelt >= 1) {
      if (countOf(save, 'ore') < RATES.orePerIngot) { acc.smelt = 1; break; } // wait for ore, don't bank progress
      save.inventory.ore -= RATES.orePerIngot;
      addItem(save, 'ingot', 1);
      acc.smelt -= 1;
    }
  }

  let units = rates.handiworkPerSec * dtSec;
  while (units > 0 && save.base.queue.length > 0) {
    const head = save.base.queue[0];
    const used = Math.min(units, head.remaining);
    head.remaining -= used;
    units -= used;
    if (head.remaining <= 1e-9) {
      save.base.queue.shift();
      completeCraft(save, head.recipeId);
    }
  }
}

export { canAfford, STRUCTURES };
