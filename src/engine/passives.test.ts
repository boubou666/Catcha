import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { assignWorker, computeRates, workLevels } from './base';
import { instanceAttack } from './formulas';
import { tryCatch } from './catch';
import { BREED_SEC, BREEDING_FARM, CAKE, INCUBATION_SEC, setPair, tickBreeding } from './breeding';
import { inheritPassives, passiveMult, rollWildPassives } from './passives';
import { MAX_PASSIVES, PASSIVES, ROLLABLE, passiveById } from '../data/passives';
import { palById } from '../data/pals';
import { TECHS } from '../data/tech';

const seq = (...v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

describe('passive data', () => {
  it('ids are unique and granted passives are never rollable', () => {
    expect(new Set(PASSIVES.map((p) => p.id)).size).toBe(PASSIVES.length);
    expect(ROLLABLE.some((p) => p.id === 'lucky' || p.id === 'legend')).toBe(false);
  });
});

describe('effects', () => {
  it('multiply per stat and stack', () => {
    const inst = makeInstance(1, 1, false, ['brave', 'ferocious', 'clumsy']);
    expect(passiveMult(inst, 'attack')).toBeCloseTo(1.1 * 1.2);
    expect(passiveMult(inst, 'work')).toBeCloseTo(0.9);
    expect(passiveMult(inst, 'food')).toBe(1);
  });
  it('apply to attack, work output and food', () => {
    const plain = makeInstance(4, 1);
    const artisan = makeInstance(4, 1, false, ['artisan', 'glutton', 'coward']);
    expect(instanceAttack(artisan)).toBeCloseTo(instanceAttack(plain) * 0.9);

    const save = newState();
    save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
    addToBox(save, artisan); assignWorker(save, artisan.uid);
    expect(workLevels(save).Lumbering).toBeCloseTo(1.5);
    expect(computeRates(save).foodPerMin).toBeCloseTo(0.5 * 1.15);
  });
});

describe('wild rolls', () => {
  it('lucky and legendary guarantees, then 0–4 random', () => {
    expect(rollWildPassives(palById(1), false, seq(0.1))).toEqual([]);            // 0.1 → 0 passives
    expect(rollWildPassives(palById(1), true, seq(0.1))).toEqual(['lucky']);
    expect(rollWildPassives(palById(111), false, seq(0.1))).toEqual(['legend']);  // Jetragon
    const four = rollWildPassives(palById(1), false, seq(0.999, 0.1, 0.5, 0.9, 0.3));
    expect(four).toHaveLength(4);
    expect(new Set(four).size).toBe(4);
    const lucky = rollWildPassives(palById(111), true, seq(0.999, 0.1, 0.5, 0.9));
    expect(lucky.slice(0, 2)).toEqual(['legend', 'lucky']);
    expect(lucky).toHaveLength(MAX_PASSIVES);
  });
  it('distribution roughly matches the weights', () => {
    const rand = lcg(42);
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5000; i++) counts[rollWildPassives(palById(1), false, rand).length]++;
    expect(counts[0] / 5000).toBeCloseTo(0.4, 1);
    expect(counts[1] / 5000).toBeCloseTo(0.3, 1);
    expect(counts[4]).toBeGreaterThan(0);
  });
  it('a caught Pal carries its roll', () => {
    const save = newState();
    const wild = { palId: 3, level: 2, hp: 0, maxHp: 1, lucky: true, kind: 'wild' as const };
    tryCatch(save, wild, seq(0, 0.1));
    expect(save.box[0].passives).toEqual(['lucky']);
  });
});

describe('inheritance', () => {
  it('keeps a subset of the parents\' passives and never their lucky/legend', () => {
    const a = makeInstance(1, 1, true, ['lucky', 'brave', 'serious']);
    const b = makeInstance(1, 1, false, ['artisan', 'glutton']);
    const rand = lcg(7);
    for (let i = 0; i < 200; i++) {
      const got = inheritPassives(a, b, palById(1), rand);
      expect(got.length).toBeLessThanOrEqual(MAX_PASSIVES);
      expect(new Set(got).size).toBe(got.length);
      expect(got).not.toContain('lucky');
      expect(got.length).toBeGreaterThanOrEqual(1); // at least one inherited when parents have any
      for (const id of got) passiveById(id);
    }
  });
  it('can inherit all four and can mutate', () => {
    const a = makeInstance(1, 1, false, ['brave', 'serious']);
    const b = makeInstance(1, 1, false, ['artisan', 'dainty']);
    // shuffle no-ops, rollCount → 4 (0.999) so keep = min(4, 5, 4) = 4, then no mutation
    const all = inheritPassives(a, b, palById(1), seq(0, 0, 0, 0.999, 0.99));
    expect(all.sort()).toEqual(['artisan', 'brave', 'dainty', 'serious']);
    const none = makeInstance(1, 1); const none2 = makeInstance(1, 1);
    const mutated = inheritPassives(none, none2, palById(1), seq(0.95, 0.01, 0.5, 0.99));
    expect(mutated).toHaveLength(1);
  });
  it('legend follows the child species', () => {
    const a = makeInstance(111, 1, false, ['legend']);
    const b = makeInstance(111, 1, false, ['legend']);
    expect(inheritPassives(a, b, palById(111), seq(0.95, 0.99))).toEqual(['legend']);
  });
  it('eggs remember their passives until they hatch', () => {
    const save = newState();
    save.base.structures[BREEDING_FARM] = 1;
    const a = makeInstance(1, 5, false, ['artisan']); const b = makeInstance(1, 5, false, ['artisan']);
    addToBox(save, a); addToBox(save, b); save.party = [];
    setPair(save, a.uid, b.uid);
    save.inventory[CAKE] = 1;
    tickBreeding(save, BREED_SEC, seq(0.5, 0.99));
    expect(save.base.eggs[0].passives).toEqual(['artisan']);
    tickBreeding(save, INCUBATION_SEC.common);
    expect(save.box[2].passives).toEqual(['artisan']);
  });
});
