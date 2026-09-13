import type { BaseState, PalInstance, SaveState, WorkType } from '../data/types';
import { palById } from '../data/pals';
import { itemName } from '../data/items';
import { BASE_SLOTS, FOOD_ITEM, JOBS, QUEUE_CAP, RATES, recipeById, structureById, STRUCTURES, type StructureDef } from '../data/base';
import { addItem, canAfford, spend, countOf, type Cost } from './inventory';
import { detachFromBreeding, instanceByUid, isAway } from './party';
import { isUnlocked } from './progress';
import { recipeUnlocked, structureUnlocked, techMult } from './tech';
import { passiveMult } from './passives';
import { prestigeMult } from './prestige';
import { partnerMult, ranchMult } from './partner';

export function newBase(): BaseState {
  return { slots: BASE_SLOTS, workers: [], structures: {}, queue: [], acc: {}, breeding: null, eggs: [], expeditions: [], reports: [], raid: null, nextRaidAt: 20 * 60 };
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
  if (isWorker(save, uid) || !instanceByUid(save, uid) || isAway(save, uid)) return false;
  if (save.base.workers.length >= save.base.slots) return false;
  save.party = save.party.filter((u) => u !== uid);
  detachFromBreeding(save, uid);
  save.base.workers.push(uid);
  return true;
}

export function unassignWorker(save: SaveState, uid: string): void {
  save.base.workers = save.base.workers.filter((u) => u !== uid);
}

export const MEDICINE_ITEM = 'low_grade_medical';

/** Output multiplier for a worker's sanity. */
export function sanMult(san: number): number {
  for (const [min, mult] of RATES.sanBands) if (san >= min) return mult;
  return 0;
}

export type SanStatus = 'fine' | 'stressed' | 'depressed' | 'sick';
export function sanStatus(san: number): SanStatus {
  return san >= 50 ? 'fine' : san >= 20 ? 'stressed' : san >= 1 ? 'depressed' : 'sick';
}

/** Per-worker output multiplier: stars, work passives, sanity. */
export function workerMult(inst: PalInstance): number {
  return (1 + RATES.starBonus * inst.stars) * passiveMult(inst, 'work') * sanMult(inst.san ?? 100);
}

/** SAN lost per minute by a worker right now. */
export function sanDrainPerMin(save: SaveState): number {
  const spring = structureLevel(save, 'hot_spring');
  const reduction = spring > 0 ? RATES.hotSpringReduction[Math.min(spring, RATES.hotSpringReduction.length) - 1] : 0;
  return RATES.sanDrain * (isHungry(save) ? RATES.sanHungryMult : 1) * (1 - reduction);
}

/** Sum of each job's work level across workers, with stars, passives and sanity applied. */
export function workLevels(save: SaveState): Record<WorkType, number> {
  const out = Object.fromEntries(JOBS.map((j) => [j.type, 0])) as Record<WorkType, number>;
  for (const inst of baseWorkers(save)) {
    const mult = workerMult(inst);
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
  return (1 + transport) * (1 + electric) * (isHungry(save) ? RATES.hungryMult : 1) * techMult(save, 'base') * prestigeMult(save, 'base') * partnerMult(save, 'work');
}

export function foodPerMinute(save: SaveState, levels = workLevels(save)): number {
  const saving = Math.min(RATES.coolingCap, levels.Cooling * RATES.coolingSaving);
  const mouths = baseWorkers(save).reduce((s, inst) => s + passiveMult(inst, 'food'), 0);
  return mouths * RATES.foodPerWorker * (1 - saving);
}

export interface BaseRates {
  items: Record<string, number>;   // gross production per minute, by item
  smeltPerMin: number;             // ingots/min if ore is available
  handiworkPerSec: number;         // crafting work units per second
  foodPerMin: number;              // consumption
  medicalPerMin: number;           // Medical Supplies from Medicine Pals
  sanDrainPerMin: number;          // per worker
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
      if (farm) add(farm.itemId, farm.perMinute * workerMult(inst) * mult * ranchMult(palById(inst.palId)));
    }
  }

  return {
    items,
    smeltPerMin: lvl('furnace') > 0 ? w.Kindling * RATES.smelt * mult : 0,
    handiworkPerSec: lvl('workbench') > 0 ? w.Handiwork * RATES.handiwork * mult : 0,
    foodPerMin: foodPerMinute(save, w),
    medicalPerMin: lvl('medicine_bench') > 0 ? w.Medicine * RATES.medicinePerLevel * mult : 0,
    sanDrainPerMin: sanDrainPerMin(save),
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
  save.stats.crafted += 1;
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

/** Sanity: workers drain (rates already reflect this tick's bands), everyone else rests, medicine treats the worst off. */
function tickSan(save: SaveState, dtMin: number, drainPerMin: number, medicalPerMin: number): void {
  const workers = new Set(save.base.workers);
  for (const inst of save.box) {
    inst.san ??= 100;
    inst.san = workers.has(inst.uid)
      ? Math.max(0, inst.san - drainPerMin * dtMin)
      : Math.min(100, inst.san + RATES.sanRest * dtMin);
  }
  if (medicalPerMin > 0) produce(save, MEDICINE_ITEM, medicalPerMin * dtMin);
  const needy = baseWorkers(save).filter((w) => w.san < RATES.medicineThreshold).sort((a, b) => a.san - b.san);
  for (const w of needy) {
    if (countOf(save, MEDICINE_ITEM) < 1) break;
    save.inventory[MEDICINE_ITEM] -= 1;
    w.san = Math.min(100, w.san + RATES.medicineHeal);
  }
}

export function tickBase(save: SaveState, dtSec: number): void {
  if (dtSec <= 0) return;
  if (save.base.raid) { tickSan(save, dtSec / 60, 0, 0); return; }   // everyone is fighting, nothing gets made
  const dtMin = dtSec / 60;
  if (save.base.workers.length === 0) { tickSan(save, dtMin, 0, 0); return; }
  const rates = computeRates(save);
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

  tickSan(save, dtMin, rates.sanDrainPerMin, rates.medicalPerMin);

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

// ---- crafting queue: summary, search, bulk cancel -------------------------------------------

export interface QueueGroup { recipeId: string; name: string; count: number; remaining: number; first: number }

/** Jobs grouped by recipe in first-appearance order, with the work left across the group. */
export function queueSummary(save: SaveState): QueueGroup[] {
  const groups = new Map<string, QueueGroup>();
  save.base.queue.forEach((job, i) => {
    const g = groups.get(job.recipeId);
    if (g) { g.count += 1; g.remaining += job.remaining; }
    else groups.set(job.recipeId, { recipeId: job.recipeId, name: recipeById(job.recipeId).name, count: 1, remaining: job.remaining, first: i });
  });
  return [...groups.values()];
}

/** Indexes of queue jobs whose recipe name (or output) matches every search word. */
export function filterQueue(save: SaveState, query: string): number[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out: number[] = [];
  save.base.queue.forEach((job, i) => {
    const r = recipeById(job.recipeId);
    const hay = `${r.name} ${r.output.kind === 'item' ? itemName(r.output.itemId) : r.output.name}`.toLowerCase();
    if (words.every((w) => hay.includes(w))) out.push(i);
  });
  return out;
}

/** Cancel every queued job of one recipe (or every job), refunding materials. Returns how many were cancelled. */
export function cancelCraftAll(save: SaveState, recipeId?: string): number {
  let n = 0;
  for (let i = save.base.queue.length - 1; i >= 0; i--) {
    if (recipeId && save.base.queue[i].recipeId !== recipeId) continue;
    cancelCraft(save, i);
    n += 1;
  }
  return n;
}

// ---- structures list -----------------------------------------------------------------------

export type StructureStatus = 'buildable' | 'missing' | 'research' | 'maxed';
export type StructureStatusFilter = 'any' | 'buildable' | 'available' | 'locked' | 'built' | 'maxed';
export interface StructureFilter { query: string; status: StructureStatusFilter }
export const DEFAULT_STRUCTURE_FILTER: StructureFilter = { query: '', status: 'any' };
export const STRUCTURE_STATUS_LABEL: Record<StructureStatusFilter, string> = {
  any: 'Any status', buildable: 'Buildable now', available: 'Researched', locked: 'Needs research', built: 'Built', maxed: 'Maxed',
};

export interface StructureRow { def: StructureDef; level: number; cost: Cost | null; status: StructureStatus }

/** Where a structure stands: research first, then max level, then whether the next level is affordable. */
export function structureStatus(save: SaveState, id: string): StructureStatus {
  if (!structureUnlocked(save, id)) return 'research';
  const cost = nextCost(save, id);
  if (cost === null) return 'maxed';
  return canAfford(save, cost) ? 'buildable' : 'missing';
}

export function isStructureFiltering(f: StructureFilter): boolean {
  return f.query.trim() !== '' || f.status !== 'any';
}

/** Structures in data order, matching every search word against name, description or next-cost item names. */
export function filterStructures(save: SaveState, f: StructureFilter): StructureRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return STRUCTURES
    .map((def) => ({ def, level: structureLevel(save, def.id), cost: nextCost(save, def.id), status: structureStatus(save, def.id) }))
    .filter((r) => {
      switch (f.status) {
        case 'buildable': if (r.status !== 'buildable') return false; break;
        case 'available': if (r.status === 'research') return false; break;
        case 'locked': if (r.status !== 'research') return false; break;
        case 'built': if (r.level === 0) return false; break;
        case 'maxed': if (r.status !== 'maxed') return false; break;
      }
      const hay = [r.def.name, r.def.desc, ...Object.keys(r.cost ?? {}).map((id) => (id === 'gold' ? 'gold' : itemName(id)))].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
}

// ---- production table ---------------------------------------------------------------------

export interface ProductionFilter { query: string; activeOnly: boolean }
export const DEFAULT_PRODUCTION_FILTER: ProductionFilter = { query: '', activeOnly: false };

/** Jobs whose name or effect text matches every search word; optionally only jobs with any level at the base. */
export function filterJobs(levels: Record<WorkType, number>, f: ProductionFilter): typeof JOBS {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return JOBS.filter((j) => (!f.activeOnly || levels[j.type] > 0) && words.every((w) => `${j.type} ${j.effect}`.toLowerCase().includes(w)));
}
