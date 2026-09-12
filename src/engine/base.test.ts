import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { addToBox, addToParty, makeInstance, release } from './party';
import {
  assignWorker, build, cancelCraft, cancelCraftAll, computeRates, enqueue, filterQueue, isHungry, nextCost, queueSummary,
  tickBase, unassignWorker, workLevels,
} from './base';
import { RATES, RECIPES, STRUCTURES } from '../data/base';
import { PALS, palById } from '../data/pals';
import { itemById } from '../data/items';
import { TECHS } from '../data/tech';

/** newState with every unlock tech researched (no multipliers) — these tests are about the base, not the gates. */
function allTech() {
  const save = newState();
  save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
  return save;
}

/** A save with `n` Lamballs (Handiwork 1, Transporting 1, Farming 1) already on base duty. */
function staffed(n: number, palId = 1) {
  const save = allTech();
  for (let i = 0; i < n; i++) {
    const inst = makeInstance(palId, 1);
    addToBox(save, inst);
    assignWorker(save, inst.uid);
  }
  return save;
}

describe('content integrity', () => {
  it('structure costs and recipe inputs reference known items', () => {
    for (const s of STRUCTURES) for (const c of s.costs) for (const id of Object.keys(c)) if (id !== 'gold') itemById(id);
    for (const r of RECIPES) for (const id of Object.keys(r.inputs)) itemById(id);
    for (const r of RECIPES) if (r.output.kind === 'item') itemById(r.output.itemId);
  });
  it('every farmDrop references a known item', () => {
    for (const p of PALS) if (p.farmDrop) itemById(p.farmDrop.itemId);
  });
});

describe('workers', () => {
  it('base and party are mutually exclusive', () => {
    const save = newState();
    const inst = makeInstance(1, 1);
    addToBox(save, inst); // auto-joins party
    expect(save.party).toContain(inst.uid);
    expect(assignWorker(save, inst.uid)).toBe(true);
    expect(save.party).not.toContain(inst.uid);
    expect(addToParty(save, inst.uid)).toBe(true);
    expect(save.base.workers).not.toContain(inst.uid);
  });
  it('respects the slot cap and release cleans up', () => {
    const save = staffed(3);
    const extra = makeInstance(1, 1);
    addToBox(save, extra);
    expect(assignWorker(save, extra.uid)).toBe(false);
    release(save, save.base.workers[0]);
    expect(save.base.workers).toHaveLength(2);
    expect(assignWorker(save, extra.uid)).toBe(true);
  });
  it('sums work levels with star bonus', () => {
    const save = staffed(2, 11); // two Penkings
    const mining = palById(11).work.Mining!;
    save.box[0].stars = 2;
    const w = workLevels(save);
    expect(w.Mining).toBeCloseTo(mining * (1 + 2 * RATES.starBonus) + mining);
    expect(w.Kindling).toBe(0);
  });
});

describe('production', () => {
  it('produces wood from Lumbering and multiplies with the Logging Site', () => {
    const save = staffed(1, 4); // Lifmunk: Lumbering 1
    const before = computeRates(save).items.wood;
    const transport = 1 + RATES.transportBonus * (palById(4).work.Transporting ?? 0);
    expect(before).toBeCloseTo(RATES.wood * transport);
    save.inventory.wood = 30; save.inventory.stone = 10;
    expect(build(save, 'logging')).toBe(true);
    expect(computeRates(save).items.wood).toBeCloseTo(before * 2);
  });
  it('moves whole units into the inventory over time', () => {
    const save = staffed(1, 4);
    const perMin = computeRates(save).items.wood;
    tickBase(save, 60);
    expect(save.inventory.wood).toBe(Math.floor(perMin));
    expect(save.base.acc.wood).toBeCloseTo(perMin - Math.floor(perMin));
  });
  it('berries need all three crew jobs and the plantation', () => {
    const save = staffed(1, 4); // Lifmunk has Planting + Gathering but no Watering
    save.base.structures.berry_plantation = 1;
    expect(computeRates(save).items.red_berries).toBeUndefined();
    const t = makeInstance(16, 1); // Teafant: Watering 1
    addToBox(save, t); assignWorker(save, t.uid);
    expect(computeRates(save).items.red_berries).toBeGreaterThan(0);
  });
  it('halves output when there is no food', () => {
    const save = staffed(1, 4);
    const fed = computeRates(save).items.wood;
    save.inventory.red_berries = 0;
    expect(isHungry(save)).toBe(true);
    expect(computeRates(save).items.wood).toBeCloseTo(fed * RATES.hungryMult);
  });
  it('workers eat berries', () => {
    const save = staffed(2);
    tickBase(save, 60);
    expect(save.inventory.red_berries).toBe(29); // 2 × 0.5/min
  });
  it('smelts 2 ore into 1 ingot at the furnace and waits when ore runs out', () => {
    const save = staffed(1, 5); // Foxparks: Kindling 1
    save.base.structures.furnace = 1;
    save.inventory.ore = 3;
    tickBase(save, 60 * 4); // 2 ingots' worth of work
    expect(save.inventory.ingot).toBe(1);
    expect(save.inventory.ore).toBe(1);
    expect(save.base.acc.smelt).toBe(1); // capped, not banked
  });
  it('ranch turns farm Pals into produce and Mau into gold', () => {
    const save = staffed(1, 24); // Mau: gold_coin 0.3/min
    save.base.structures.ranch = 1;
    const gold = save.player.gold;
    tickBase(save, 60 * 10);
    expect(save.player.gold).toBe(gold + 3);
    expect(save.inventory.gold_coin).toBeUndefined();
  });
});

describe('structures', () => {
  it('charges the next level and stops at max', () => {
    const save = allTech();
    save.inventory.wood = 10;
    expect(build(save, 'workbench')).toBe(true);
    expect(save.inventory.wood).toBe(0);
    expect(nextCost(save, 'workbench')).toBeNull();
    expect(build(save, 'workbench')).toBe(false);
  });
  it('palbox adds a slot and takes gold', () => {
    const save = allTech();
    save.player.gold = 150; save.inventory.paldium = 5;
    expect(build(save, 'palbox')).toBe(true);
    expect(save.base.slots).toBe(4);
    expect(save.player.gold).toBe(0);
  });
});

describe('crafting', () => {
  it('needs the workbench, pays up front, and completes with Handiwork', () => {
    const save = staffed(1); // Lamball Handiwork 1, Transporting 1 → 1.03 units/s
    save.inventory.paldium = 6; save.inventory.wood = 6; save.inventory.stone = 6;
    expect(enqueue(save, 'sphere_pal', 2)).toBe(0);
    save.base.structures.workbench = 1;
    expect(enqueue(save, 'sphere_pal', 5)).toBe(2); // only 2 affordable
    expect(save.inventory.paldium).toBe(0);
    tickBase(save, 60); // 61.8 units: first sphere done, second started
    expect(save.inventory.sphere_pal).toBe(21);
    expect(save.base.queue).toHaveLength(1);
    expect(save.base.queue[0].remaining).toBeLessThan(60);
  });
  it('cancel refunds inputs', () => {
    const save = staffed(1);
    save.base.structures.workbench = 1;
    save.inventory.wood = 20;
    enqueue(save, 'wooden_club', 1);
    expect(save.inventory.wood).toBe(0);
    cancelCraft(save, 0);
    expect(save.inventory.wood).toBe(20);
    expect(save.base.queue).toHaveLength(0);
  });
  it('weapons raise the click tier, never lower it', () => {
    const save = staffed(1);
    save.base.structures.workbench = 1;
    save.player.weaponTier = 3;
    save.inventory.wood = 20;
    enqueue(save, 'wooden_club', 1);
    tickBase(save, 60);
    expect(save.player.weaponTier).toBe(3);
  });
  it('unassigned workers stop the queue', () => {
    const save = staffed(1);
    save.base.structures.workbench = 1;
    save.inventory.wood = 20;
    enqueue(save, 'wooden_club', 1);
    unassignWorker(save, save.base.workers[0]);
    tickBase(save, 600);
    expect(save.base.queue).toHaveLength(1);
  });
});

describe('migration', () => {
  it('upgrades a v1 save by adding an empty base', () => {
    const v1 = { ...newState(), version: 1 } as Record<string, unknown>;
    delete v1.base;
    const s = migrate(v1);
    expect(s?.version).toBe(SAVE_VERSION);
    expect(s?.base.slots).toBe(3);
  });
});

describe('crafting queue tools', () => {
  function queued() {
    const save = newState();
    save.base.structures.workbench = 1;
    save.tech.push('s_workbench', 'r_sphere_pal', 'r_wooden_club');
    save.inventory = { paldium: 100, wood: 200, stone: 100 };
    expect(enqueue(save, 'sphere_pal', 3)).toBe(3);
    expect(enqueue(save, 'wooden_club', 1)).toBe(1);
    expect(enqueue(save, 'sphere_pal', 2)).toBe(2);
    return save;
  }

  it('summarises the queue by recipe in first-appearance order', () => {
    const save = queued();
    const s = queueSummary(save);
    expect(s.map((g) => [g.name, g.count, g.first])).toEqual([['Pal Sphere', 5, 0], ['Wooden Club', 1, 3]]);
    expect(s[0].remaining).toBe(5 * 60);
  });

  it('searches jobs by recipe or output name', () => {
    const save = queued();
    expect(filterQueue(save, '')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(filterQueue(save, 'club')).toEqual([3]);
    expect(filterQueue(save, 'sphere')).toEqual([0, 1, 2, 4, 5]);
    expect(filterQueue(save, 'zzz')).toEqual([]);
  });

  it('cancels every job of one recipe, or all, refunding materials', () => {
    const save = queued();
    const wood = save.inventory.wood;
    expect(cancelCraftAll(save, 'sphere_pal')).toBe(5);
    expect(save.base.queue.map((j) => j.recipeId)).toEqual(['wooden_club']);
    expect(save.inventory.wood).toBe(wood + 5 * 3);
    expect(save.inventory.paldium).toBe(100);
    expect(cancelCraftAll(save)).toBe(1);
    expect(save.base.queue).toEqual([]);
    expect(save.inventory.wood).toBe(200);
  });
});
