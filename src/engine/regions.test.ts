import { describe, expect, it } from 'vitest';
import { REGIONS, alphaById, routeById, towerById } from '../data/regions';
import { PALS, palById } from '../data/pals';
import type { Requirement } from '../data/types';
import { newState, migrate, SAVE_VERSION } from './save';
import { isUnlocked } from './progress';

function refsResolve(req: Requirement): void {
  switch (req.kind) {
    case 'routeCleared': routeById(req.id); break;
    case 'alpha': alphaById(req.id); break;
    case 'tower': towerById(req.id); break;
    case 'all': req.of.forEach(refsResolve); break;
  }
}

describe('regions', () => {
  it('every unlock requirement points at something that exists', () => {
    for (const r of REGIONS) {
      for (const route of r.routes) refsResolve(route.unlock);
      for (const a of r.alphas) refsResolve(a.unlock);
      refsResolve(r.tower.unlock);
    }
  });

  it('ids are unique across regions and levels climb within a region', () => {
    const ids = REGIONS.flatMap((r) => [...r.routes.map((x) => x.id), ...r.alphas.map((x) => x.id), r.tower.id]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of REGIONS) {
      const levels = r.routes.map((x) => x.level);
      expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    }
  });

  it('every Pal in the roster appears somewhere (route, alpha or tower)', () => {
    const used = new Set<number>();
    for (const r of REGIONS) {
      r.routes.forEach((x) => x.spawns.forEach((s) => used.add(s.palId)));
      r.alphas.forEach((a) => used.add(a.palId));
      used.add(r.tower.palId);
    }
    const missing = PALS.filter((p) => !used.has(p.id)).map((p) => p.name);
    expect(missing).toEqual([]);
  });

  it('region 2 opens after the Rayne tower and chains through its alphas', () => {
    const save = newState();
    expect(isUnlocked(save, routeById('seabreeze').unlock)).toBe(false);
    save.progress.towers.push('rayne');
    expect(isUnlocked(save, routeById('seabreeze').unlock)).toBe(true);
    expect(isUnlocked(save, routeById('ravine').unlock)).toBe(false);
    save.progress.alphas.push('grintale');
    expect(isUnlocked(save, routeById('ravine').unlock)).toBe(true);
    expect(isUnlocked(save, towerById('lily').unlock)).toBe(false);
    save.progress.alphas.push('kingpaca');
    save.progress.routeKills.alliance = 120;
    expect(isUnlocked(save, towerById('lily').unlock)).toBe(true);
  });

  it('tower bosses are real Pals with the expected ids', () => {
    expect(palById(towerById('rayne').palId).name).toBe('Grizzbolt');
    expect(palById(towerById('lily').palId).name).toBe('Lyleen');
    expect(palById(alphaById('chillet').palId).id).toBe(55);
  });
});

describe('migration v4 → v6', () => {
  it('renumbers Chillet and Grizzbolt everywhere and merges Paldeck entries', () => {
    const s = newState() as unknown as Record<string, unknown>;
    s.version = 4;
    s.box = [{ uid: 'a', palId: 55, level: 1, exp: 0, stars: 0, lucky: false, passives: [] }, { uid: 'b', palId: 103, level: 1, exp: 0, stars: 0, lucky: false, passives: [] }];
    s.paldeck = { 55: { seen: true, caught: 1 }, 41: { seen: true, caught: 2 }, 103: { seen: true, caught: 0 }, 1: { seen: true, caught: 5 } };
    (s.base as { eggs: unknown[] }).eggs = [{ palId: 55, remaining: 10 }];
    const out = migrate(s)!;
    expect(out.version).toBe(SAVE_VERSION);
    // v4 ids were right (55/103); v5 moved them to 41/88; v6 moves them back. Net: unchanged.
    expect(out.box.map((p) => p.palId)).toEqual([55, 103]);
    expect(out.base.eggs[0].palId).toBe(55);
    expect(out.paldeck[55]).toEqual({ seen: true, caught: 3 });
    expect(out.paldeck[103]).toEqual({ seen: true, caught: 0 });
    expect(out.paldeck[41]).toBeUndefined();
    expect(out.paldeck[1].caught).toBe(5);
  });
});

describe('region 3', () => {
  it('opens after the Lily tower and chains through Elphidran, Mammorest and Anubis', () => {
    const save = newState();
    expect(isUnlocked(save, routeById('dunes').unlock)).toBe(false);
    save.progress.towers.push('lily');
    expect(isUnlocked(save, routeById('dunes').unlock)).toBe(true);
    expect(isUnlocked(save, alphaById('elphidran').unlock)).toBe(false);
    save.progress.routeKills.ruins = 150;
    expect(isUnlocked(save, alphaById('elphidran').unlock)).toBe(true);
    save.progress.alphas.push('elphidran', 'mammorest', 'anubis');
    expect(isUnlocked(save, routeById('brothers').unlock)).toBe(true);
    expect(isUnlocked(save, towerById('axel').unlock)).toBe(false);
    save.progress.routeKills.brothers = 200;
    expect(isUnlocked(save, towerById('axel').unlock)).toBe(true);
    expect(palById(towerById('axel').palId).name).toBe('Orserk');
  });
});
