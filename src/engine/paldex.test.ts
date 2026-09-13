import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { bestPlace, breedingInfoFor, DEFAULT_DETAIL_FILTER, filterBreedingInfo, filterHabitat, habitatOf, isDetailFiltering, ownedCopies } from './paldex';
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

describe('detail-view filter', () => {
  it('filters habitat by text and reachability, keeping unseen partners hidden in breeding', () => {
    const save = newState();
    // Chillet (55): Alpha in Windswept + realm guardian + routes later on; nothing reachable on a fresh save
    const h = habitatOf(55);
    expect(h.alphas.length + h.realms.length).toBeGreaterThan(0);
    const reachable = filterHabitat(save, h, { ...DEFAULT_DETAIL_FILTER, unlockedOnly: true });
    expect(reachable.alphas).toEqual([]);
    expect(filterHabitat(save, h, { ...DEFAULT_DETAIL_FILTER, query: 'alpha' }).alphas).toEqual(h.alphas);
    expect(filterHabitat(save, h, { ...DEFAULT_DETAIL_FILTER, query: 'alpha' }).realms).toEqual([]);
    expect(filterHabitat(save, h, { ...DEFAULT_DETAIL_FILTER, query: 'zzz' })).toEqual({ routes: [], alphas: [], towers: [], realms: [], raids: [] });
    expect(isDetailFiltering(DEFAULT_DETAIL_FILTER)).toBe(false);

    // Lamball's habitat: Plateau, reachable from the start
    const lam = habitatOf(1);
    expect(filterHabitat(save, lam, { ...DEFAULT_DETAIL_FILTER, unlockedOnly: true }).routes.map((r) => r.routeId)).toEqual(['plateau']);
    expect(filterHabitat(save, lam, { ...DEFAULT_DETAIL_FILTER, query: 'windswept' }).routes).toHaveLength(1);
  });

  it('filters breeding pairs by kind and by seen names', () => {
    const save = newState();
    const info = breedingInfoFor(save, 1031);                 // Gobfin Ignis: special combo only
    expect(info.producedBy.every((p) => p.special)).toBe(true);
    expect(filterBreedingInfo(save, info, { ...DEFAULT_DETAIL_FILTER, pairs: 'rank' }).producedBy).toEqual([]);
    expect(filterBreedingInfo(save, info, { ...DEFAULT_DETAIL_FILTER, pairs: 'special' }).producedBy).toEqual(info.producedBy);
    const partner = info.producedBy[0].a === 31 ? info.producedBy[0].b : info.producedBy[0].a;
    const partnerName = palById(partner).name.toLowerCase();
    expect(filterBreedingInfo(save, info, { ...DEFAULT_DETAIL_FILTER, query: partnerName }).producedBy).toEqual([]);   // unseen: hidden
    save.paldeck[partner] = { seen: true, caught: 0 };
    expect(filterBreedingInfo(save, info, { ...DEFAULT_DETAIL_FILTER, query: partnerName }).producedBy).toHaveLength(1);
  });
});

describe('best place to hunt', () => {
  it('weighs spawn share by odds over routes you can reach', () => {
    const s = newState();
    s.inventory.sphere_pal = 5;
    // Lamball: 40% on the Plateau (open), 20% on Grassy Behemoth Hills (locked until the Plateau is cleared)
    const p = bestPlace(s, 1)!;
    expect(p.routeId).toBe('plateau');
    expect(p.share).toBeCloseTo(0.4);
    expect(p.odds).toBeCloseTo(0.6);
    expect(p.perDefeat).toBeCloseTo(0.24);
    expect(bestPlace(s, 142)).toBeNull();        // Bellanoir: raid only
    s.inventory.sphere_pal = 0;                   // no throw → ranked with a Pal Sphere anyway
    expect(bestPlace(s, 1)!.odds).toBeCloseTo(0.6);
  });
});
