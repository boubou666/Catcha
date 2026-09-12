import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { breedingInfoFor, habitatOf, ownedCopies } from './paldex';
import { PALS, palById } from '../data/pals';
import { childOf } from './breeding';
import { addToBox, makeInstance } from './party';

describe('habitat', () => {
  it('lists routes with spawn share, bosses, realms and raids', () => {
    const lamball = habitatOf(1);
    expect(lamball.routes.map((r) => r.routeId)).toEqual(['plateau']);
    expect(lamball.routes[0].chance).toBeCloseTo(0.4);
    const chillet = habitatOf(55);
    expect(chillet.alphas).toHaveLength(1);
    expect(chillet.realms.find((r) => r.role === 'guardian')?.dungeonId).toBe('frozen_wings');
    expect(habitatOf(103).towers[0].towerId).toBe('rayne');
    expect(habitatOf(142).raids[0].raidId).toBe('bellanoir');
  });
  it('every species has at least one source', () => {
    for (const p of PALS) {
      const h = habitatOf(p.id);
      expect(h.routes.length + h.alphas.length + h.towers.length + h.realms.length + h.raids.length).toBeGreaterThan(0);
    }
  });
});

describe('breeding info', () => {
  it('finds special combos in both directions', () => {
    const ignis = breedingInfoFor(newState(), 1031);
    expect(ignis.producedBy).toEqual([{ a: 9, b: 31, special: true }]);
    const gobfin = breedingInfoFor(newState(), 31);
    expect(gobfin.parentOf).toContainEqual({ partner: 9, child: 1031 });
  });
  it('lists formula pairs only from owned species, and they really produce the target', () => {
    const save = newState();
    for (const id of [1, 2, 3, 4, 11, 26, 27]) save.paldeck[id] = { seen: true, caught: 1 };
    for (const p of PALS) {
      const info = breedingInfoFor(save, p.id);
      for (const pair of info.producedBy.filter((x) => !x.special)) {
        expect(childOf(pair.a, pair.b)).toBe(p.id);
        expect(save.paldeck[pair.a].caught).toBeGreaterThan(0);
        expect(save.paldeck[pair.b].caught).toBeGreaterThan(0);
      }
    }
    const info = breedingInfoFor(save, childOf(1, 11));
    expect(info.producedBy.some((x) => (x.a === 1 && x.b === 11) || (x.a === 11 && x.b === 1))).toBe(true);
  });
  it('never suggests formula pairs for subspecies', () => {
    const save = newState();
    for (const p of PALS) save.paldeck[p.id] = { seen: true, caught: 1 };
    for (const p of PALS.filter((x) => x.variantOf)) {
      expect(breedingInfoFor(save, p.id).producedBy.every((x) => x.special)).toBe(true);
    }
  });
});

describe('owned copies', () => {
  it('counts and picks the best by stars then level', () => {
    const save = newState();
    const a = makeInstance(1, 30); const b = makeInstance(1, 10); b.stars = 2;
    addToBox(save, a); addToBox(save, b); addToBox(save, makeInstance(2, 5));
    const o = ownedCopies(save, 1);
    expect(o.count).toBe(2);
    expect(o.best?.uid).toBe(b.uid);
    expect(palById(1).name).toBe('Lamball');
  });
});
