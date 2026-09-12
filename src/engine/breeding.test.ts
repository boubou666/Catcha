import { describe, expect, it } from 'vitest';
import { newState, migrate } from './save';
import { addToBox, addToParty, makeInstance, release } from './party';
import { assignWorker } from './base';
import { condenseCandidates } from './condense';
import { applyOffline } from './offline';
import {
  BREED_SEC, BREEDING_FARM, CAKE, INCUBATION_SEC, breedable, childOf, clearPair,
  pairBlocker, setPair, tickBreeding,
} from './breeding';
import { PALS, palById } from '../data/pals';

function farm(...palIds: number[]) {
  const save = newState();
  save.base.structures[BREEDING_FARM] = 1;
  const insts = palIds.map((id) => { const i = makeInstance(id, 5); addToBox(save, i); return i; });
  save.party = [];
  return { save, insts };
}

describe('childOf', () => {
  it('same species breeds true', () => {
    expect(childOf(1, 1)).toBe(1);
    expect(childOf(11, 11)).toBe(11);
  });
  it('picks the species closest to the average breedPower, lower id on ties', () => {
    // Lamball 1470 + Penking 620 → 1045 → Tocotoco 1050 (d=5) beats Fuddler 1010 (d=35)
    expect(childOf(1, 11)).toBe(27);
    // Lamball 1470 + Cattiva 1440 → 1455: equidistant candidates, lowest id wins
    const pals = [
      { ...palById(1), id: 30, breedPower: 1460 },
      { ...palById(1), id: 20, breedPower: 1450 },
    ];
    expect(childOf(1, 2, pals, {})).toBe(20);
  });
  it('special combos override the formula', () => {
    expect(childOf(1, 2, PALS, { '1+2': 103 })).toBe(103);
    expect(childOf(2, 1, PALS, { '1+2': 103 })).toBe(103);
  });
});

describe('pairing', () => {
  it('needs the farm and two distinct idle Pals', () => {
    const { save, insts: [a, b] } = farm(1, 2);
    delete save.base.structures[BREEDING_FARM];
    expect(pairBlocker(save, a.uid, b.uid)).toBe('no-farm');
    save.base.structures[BREEDING_FARM] = 1;
    expect(pairBlocker(save, a.uid, a.uid)).toBe('same-pal');
    addToParty(save, a.uid);
    expect(pairBlocker(save, a.uid, b.uid)).toBe('busy');
    save.party = [];
    expect(setPair(save, a.uid, b.uid)).toBe(true);
    expect(breedable(save)).toHaveLength(0);
  });
  it('a parent taking another job breaks the pair', () => {
    const { save, insts: [a, b] } = farm(1, 2);
    setPair(save, a.uid, b.uid);
    assignWorker(save, a.uid);
    expect(save.base.breeding).toBeNull();
    setPair(save, a.uid, b.uid); // assignWorker leaves a in workers → busy
    expect(save.base.breeding).toBeNull();
    save.base.workers = [];
    setPair(save, a.uid, b.uid);
    release(save, b.uid);
    expect(save.base.breeding).toBeNull();
  });
  it('parents are not condensing fodder', () => {
    const { save, insts: [t, a, b] } = farm(1, 1, 1);
    setPair(save, a.uid, b.uid);
    expect(condenseCandidates(save, t)).toHaveLength(0);
  });
});

describe('tick', () => {
  it('eats a Cake per egg, incubates by rarity, hatches into the box', () => {
    const { save, insts: [a, b] } = farm(1, 1);
    setPair(save, a.uid, b.uid);
    tickBreeding(save, 60);
    expect(save.base.breeding!.progress).toBeNull(); // no cake → nothing starts
    save.inventory[CAKE] = 2;
    tickBreeding(save, BREED_SEC / 2);
    expect(save.inventory[CAKE]).toBe(1);
    expect(save.base.breeding!.progress).toBeCloseTo(0.5);
    tickBreeding(save, BREED_SEC / 2);
    expect(save.base.eggs).toEqual([{ palId: 1, remaining: INCUBATION_SEC.common }]);
    expect(save.base.breeding!.progress).toBeNull(); // next cake is taken when time resumes
    const hatched = tickBreeding(save, INCUBATION_SEC.common);
    expect(hatched).toEqual([1]);
    expect(save.inventory[CAKE]).toBe(0);
    expect(save.base.breeding!.progress).toBeCloseTo(INCUBATION_SEC.common / BREED_SEC);
    expect(save.base.eggs).toHaveLength(0);
    expect(save.box).toHaveLength(3);
    expect(save.box[2].level).toBe(1);
    expect(save.paldeck[1].caught).toBe(3);
  });
  it('lays several eggs in one long tick and stops when cake runs out', () => {
    const { save, insts: [a, b] } = farm(1, 2);
    setPair(save, a.uid, b.uid);
    save.inventory[CAKE] = 3;
    tickBreeding(save, BREED_SEC * 10);
    expect(save.inventory[CAKE]).toBe(0);
    expect(save.base.breeding!.progress).toBeNull();
    // 3 eggs laid at t=300/600/900, all common (2 min) → hatched by t=3000
    expect(save.box).toHaveLength(5);
    expect(save.box.slice(2).every((p) => p.palId === childOf(1, 2))).toBe(true);
  });
  it('clearing the pair keeps eggs incubating', () => {
    const { save, insts: [a, b] } = farm(1, 1);
    setPair(save, a.uid, b.uid);
    save.inventory[CAKE] = 1;
    tickBreeding(save, BREED_SEC);
    clearPair(save);
    expect(tickBreeding(save, INCUBATION_SEC.common)).toEqual([1]);
  });
  it('offline replay hatches and reports', () => {
    const { save, insts: [a, b] } = farm(1, 1);
    setPair(save, a.uid, b.uid);
    save.inventory[CAKE] = 1;
    const r = applyOffline(save, 60 * 60 * 1000)!;
    expect(r.hatched).toEqual([1]);
    expect(r.items[CAKE]).toBe(-1);
  });
});

describe('migration', () => {
  it('v2 → v3 adds breeding fields', () => {
    const v2 = { ...newState(), version: 2 } as Record<string, unknown>;
    const base = { ...(v2.base as object) } as Record<string, unknown>;
    delete base.breeding; delete base.eggs;
    v2.base = base;
    const s = migrate(v2)!;
    expect(s.version).toBe(3);
    expect(s.base.breeding).toBeNull();
    expect(s.base.eggs).toEqual([]);
  });
});
