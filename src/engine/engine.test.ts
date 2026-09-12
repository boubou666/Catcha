import { describe, expect, it } from 'vitest';
import { elementMult, singleMult } from '../data/elements';
import { PALS, palById } from '../data/pals';
import { REGIONS, routeById } from '../data/regions';
import { itemById } from '../data/items';
import { newState } from './save';
import { catchChance, chooseSphere, tryCatch } from './catch';
import { applyDefeat, partyDps, spawnWild } from './combat';
import { addToBox, grantExp, makeInstance } from './party';
import { expToLevel, PARTY_SIZE } from './formulas';
import { isUnlocked } from './progress';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('elements', () => {
  it('follows the Palworld chart', () => {
    expect(singleMult('Fire', 'Grass')).toBe(2);
    expect(singleMult('Grass', 'Fire')).toBe(0.5);
    expect(singleMult('Water', 'Fire')).toBe(2);
    expect(singleMult('Dark', 'Neutral')).toBe(2);
    expect(singleMult('Neutral', 'Dark')).toBe(0.5);
    expect(singleMult('Neutral', 'Fire')).toBe(1);
  });
  it('uses the attacker\'s best element and stacks defender weaknesses', () => {
    expect(elementMult(['Water', 'Ice'], ['Dragon'])).toBe(2);
    expect(elementMult(['Fire'], ['Grass', 'Ice'])).toBe(4);
    expect(elementMult(['Grass'], ['Fire'])).toBe(0.5);
  });
});

describe('content integrity', () => {
  it('every route/alpha/tower references a known Pal', () => {
    for (const region of REGIONS) {
      for (const r of region.routes) for (const s of r.spawns) expect(() => palById(s.palId)).not.toThrow();
      for (const a of region.alphas) expect(() => palById(a.palId)).not.toThrow();
      expect(() => palById(region.tower.palId)).not.toThrow();
    }
  });
  it('every Pal drop references a known item', () => {
    for (const p of PALS) for (const d of p.drops) expect(() => itemById(d.itemId)).not.toThrow();
  });
  it('Paldeck ids are unique', () => {
    expect(new Set(PALS.map((p) => p.id)).size).toBe(PALS.length);
  });
});

describe('combat', () => {
  it('spawns from the route table with a level near the route level', () => {
    const w = spawnWild(routeById('plateau'), seq(0, 0.5, 0.99));
    expect([1, 2, 3, 4]).toContain(w.palId);
    expect(w.level).toBeGreaterThanOrEqual(1);
    expect(w.level).toBeLessThanOrEqual(2);
    expect(w.hp).toBe(w.maxHp);
    expect(w.lucky).toBe(false);
  });
  it('party dps applies element multipliers', () => {
    const save = newState();
    addToBox(save, makeInstance(5, 1)); // Foxparks (Fire)
    const vsGrass = partyDps(save, { palId: 4, level: 1, hp: 1, maxHp: 1, lucky: false, kind: 'wild' });
    const vsWater = partyDps(save, { palId: 6, level: 1, hp: 1, maxHp: 1, lucky: false, kind: 'wild' });
    expect(vsGrass).toBeCloseTo(vsWater * 4);
  });
  it('defeat grants gold, exp, drops and marks the Pal seen', () => {
    const save = newState();
    const wild = { palId: 1, level: 1, hp: 0, maxHp: 1, lucky: false, kind: 'wild' as const };
    const r = applyDefeat(save, wild, () => 0);
    expect(save.player.gold).toBe(r.gold);
    expect(save.paldeck[1]?.seen).toBe(true);
    expect(save.inventory.wool).toBeGreaterThan(0);
  });
});

describe('catching', () => {
  it('chance scales with sphere tier and effigies, capped at 99%', () => {
    expect(catchChance('common', 'pal', 0, false)).toBe(0.6);
    expect(catchChance('common', 'mega', 0, false)).toBeCloseTo(0.9);
    expect(catchChance('common', 'legendary', 50, false)).toBe(0.99);
    expect(catchChance('common', 'pal', 0, true)).toBe(0.3);
  });
  it('respects the new/dupe policy and falls back to lower tiers', () => {
    const save = newState();
    save.settings.sphereForNew = 'giga';
    expect(chooseSphere(save, 1)).toBe('pal'); // no giga/mega in stock -> pal
    save.inventory.sphere_pal = 0;
    expect(chooseSphere(save, 1)).toBeNull();
    save.inventory.sphere_pal = 5;
    addToBox(save, makeInstance(1, 1));
    expect(chooseSphere(save, 1)).toBeNull(); // dupe policy is 'none'
  });
  it('consumes a sphere and fills the box + party on success', () => {
    const save = newState();
    const wild = { palId: 3, level: 2, hp: 0, maxHp: 1, lucky: false, kind: 'wild' as const };
    const res = tryCatch(save, wild, () => 0);
    expect(res.outcome).toBe('caught');
    expect(save.inventory.sphere_pal).toBe(19);
    expect(save.box).toHaveLength(1);
    expect(save.party).toEqual([save.box[0].uid]);
    expect(save.paldeck[3]?.caught).toBe(1);
  });
});

describe('party', () => {
  it('levels up the player and party members', () => {
    const save = newState();
    addToBox(save, makeInstance(1, 1));
    grantExp(save, expToLevel(2));
    expect(save.player.level).toBe(2);
    expect(save.box[0].level).toBe(2);
  });
  it('auto-fills party only up to PARTY_SIZE', () => {
    const save = newState();
    for (let i = 0; i < PARTY_SIZE + 2; i++) addToBox(save, makeInstance(1, 1));
    expect(save.party).toHaveLength(PARTY_SIZE);
  });
});

describe('progress', () => {
  it('gates routes on kills and alphas', () => {
    const save = newState();
    expect(isUnlocked(save, routeById('behemoth').unlock)).toBe(false);
    save.progress.routeKills.plateau = 10;
    expect(isUnlocked(save, routeById('behemoth').unlock)).toBe(true);
    expect(isUnlocked(save, routeById('cove').unlock)).toBe(false);
    save.progress.alphas.push('chillet');
    expect(isUnlocked(save, routeById('cove').unlock)).toBe(true);
  });
});
