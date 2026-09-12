import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { addToBox, makeInstance } from './party';
import { assignWorker, computeRates, MEDICINE_ITEM, sanDrainPerMin, sanMult, sanStatus, tickBase, unassignWorker, workLevels } from './base';
import { RATES } from '../data/base';
import { TECHS } from '../data/tech';
import { palById } from '../data/pals';

function base(...palIds: number[]) {
  const save = newState();
  save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
  save.inventory.red_berries = 10_000;
  const insts = palIds.map((id) => { const i = makeInstance(id, 1); addToBox(save, i); assignWorker(save, i.uid); return i; });
  return { save, insts };
}

describe('sanity bands', () => {
  it('map SAN to output and a status', () => {
    expect(sanMult(100)).toBe(1); expect(sanStatus(50)).toBe('fine');
    expect(sanMult(49)).toBe(0.75); expect(sanStatus(20)).toBe('stressed');
    expect(sanMult(19)).toBe(0.4); expect(sanStatus(1)).toBe('depressed');
    expect(sanMult(0)).toBe(0); expect(sanStatus(0)).toBe('sick');
  });
  it('scale a worker\'s output', () => {
    const { save, insts: [w] } = base(4); // Lifmunk
    const full = workLevels(save).Lumbering;
    w.san = 30;
    expect(workLevels(save).Lumbering).toBeCloseTo(full * 0.75);
    w.san = 0;
    expect(workLevels(save).Lumbering).toBe(0);
    expect(computeRates(save).items.wood).toBeUndefined();
  });
});

describe('drain and rest', () => {
  it('workers drain, doubled when hungry, reduced by the Hot Spring', () => {
    const { save, insts: [w] } = base(4);
    expect(sanDrainPerMin(save)).toBe(RATES.sanDrain);
    tickBase(save, 60 * 60); // one hour
    expect(w.san).toBeCloseTo(100 - RATES.sanDrain * 60);
    save.inventory.red_berries = 0;
    expect(sanDrainPerMin(save)).toBe(RATES.sanDrain * RATES.sanHungryMult);
    save.inventory.red_berries = 10_000;
    save.base.structures.hot_spring = 2;
    expect(sanDrainPerMin(save)).toBeCloseTo(RATES.sanDrain * (1 - RATES.hotSpringReduction[1]));
  });
  it('resting Pals recover, even when nobody is working', () => {
    const { save, insts: [w] } = base(4);
    w.san = 10;
    unassignWorker(save, w.uid);
    tickBase(save, 60 * 20); // twenty minutes
    expect(w.san).toBeCloseTo(10 + RATES.sanRest * 20);
    w.san = 99.9;
    tickBase(save, 60);
    expect(w.san).toBe(100);
  });
  it('never goes below 0 and a sick worker stops producing', () => {
    const { save, insts: [w] } = base(4);
    tickBase(save, 60 * 60 * 5);
    expect(w.san).toBe(0);
    expect(sanStatus(w.san)).toBe('sick');
    const wood = save.inventory.wood;
    tickBase(save, 60);
    expect(save.inventory.wood).toBe(wood);
  });
});

describe('medicine', () => {
  it('Medicine Pals make supplies at the workbench', () => {
    const { save } = base(4); // Lifmunk: Medicine 1
    expect(palById(4).work.Medicine).toBe(1);
    expect(computeRates(save).medicalPerMin).toBe(0);
    save.base.structures.medicine_bench = 1;
    expect(computeRates(save).medicalPerMin).toBeCloseTo(RATES.medicinePerLevel);
    tickBase(save, 60 * 40);
    expect(save.inventory[MEDICINE_ITEM]).toBe(2);
  });
  it('supplies are used on the worst-off worker below the threshold', () => {
    const { save, insts: [a, b] } = base(1, 2);
    a.san = 45; b.san = 30;
    save.inventory[MEDICINE_ITEM] = 1;
    tickBase(save, 1);
    expect(save.inventory[MEDICINE_ITEM]).toBe(0);
    expect(b.san).toBeCloseTo(30 + RATES.medicineHeal - RATES.sanDrain / 60, 1);
    expect(a.san).toBeCloseTo(45 - RATES.sanDrain / 60, 1);
  });
  it('keeps a staffed base sane indefinitely', () => {
    const { save, insts } = base(4, 4, 4, 1, 2); // three Lifmunks (Medicine 1 each)
    save.base.structures.medicine_bench = 1;
    save.base.slots = 5;
    tickBase(save, 60 * 60 * 24);
    for (const i of insts) expect(i.san).toBeGreaterThan(20);
  });
});

describe('migration v10 → v11', () => {
  it('gives existing Pals full sanity', () => {
    const v10 = { ...newState(), version: 10 } as Record<string, unknown>;
    const inst = { ...makeInstance(1, 1) } as Record<string, unknown>;
    delete inst.san;
    v10.box = [inst];
    const s = migrate(v10)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.box[0].san).toBe(100);
  });
});
