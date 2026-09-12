import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { addToBox, makeInstance } from './party';
import { assignWorker, build, canCraft, computeRates, nextCost } from './base';
import { partyDps } from './combat';
import { catchChance } from './catch';
import { isResearched, recipeUnlocked, research, researchBlocker, structureUnlocked, techMult } from './tech';
import { STARTING_TECH_POINTS, TECHS, techById } from '../data/tech';
import { STRUCTURES, RECIPES } from '../data/base';
import { palById } from '../data/pals';

describe('tech data', () => {
  it('references real structures, recipes and prerequisites', () => {
    const ids = new Set(TECHS.map((t) => t.id));
    for (const t of TECHS) {
      if (t.effect.kind === 'structure') expect(STRUCTURES.some((s) => s.id === (t.effect as { id: string }).id)).toBe(true);
      if (t.effect.kind === 'recipe') expect(RECIPES.some((r) => r.id === (t.effect as { id: string }).id)).toBe(true);
      for (const r of t.requires ?? []) {
        expect(ids.has(r)).toBe(true);
        expect(techById(r).level).toBeLessThanOrEqual(t.level); // prerequisites never sit above their dependents
      }
    }
    expect(ids.size).toBe(TECHS.length);
  });
});

describe('research', () => {
  it('gates on level, prerequisites and points', () => {
    const save = newState(); // level 1, 2 TP
    expect(researchBlocker(save, 's_logging')).toBe('level');
    expect(researchBlocker(save, 'r_sphere_pal')).toBe('requires');
    expect(research(save, 's_workbench')).toBe(true);
    expect(save.player.techPoints).toBe(STARTING_TECH_POINTS - 1);
    expect(researchBlocker(save, 's_workbench')).toBe('researched');
    expect(research(save, 'r_sphere_pal')).toBe(true);
    expect(researchBlocker(save, 'r_wooden_club')).toBe('points');
    expect(research(save, 'r_wooden_club')).toBe(false);
  });

  it('unlocks structures and recipes', () => {
    const save = newState();
    save.inventory.wood = 100;
    expect(structureUnlocked(save, 'workbench')).toBe(false);
    expect(nextCost(save, 'workbench')).toBeNull();
    expect(build(save, 'workbench')).toBe(false);
    research(save, 's_workbench');
    expect(build(save, 'workbench')).toBe(true);
    expect(recipeUnlocked(save, 'sphere_pal')).toBe(false);
    expect(canCraft(save, 'sphere_pal')).toBe(false);
    research(save, 'r_sphere_pal');
    expect(canCraft(save, 'sphere_pal')).toBe(true);
  });
});

describe('multipliers', () => {
  it('stack per stat and apply to attack, base output and catch rate', () => {
    const save = newState();
    save.tech.push('training_1', 'training_2', 'labor_1', 'capture');
    expect(techMult(save, 'attack')).toBeCloseTo(1.1 * 1.15);
    expect(techMult(save, 'click')).toBe(1);

    addToBox(save, makeInstance(1, 1));
    const wild = { palId: 2, level: 1, hp: 1, maxHp: 1, lucky: false, kind: 'wild' as const };
    const boosted = partyDps(save, wild);
    save.tech = [];
    expect(boosted).toBeCloseTo(partyDps(save, wild) * 1.1 * 1.15);

    save.tech = ['labor_1'];
    const inst = makeInstance(4, 1); addToBox(save, inst); assignWorker(save, inst.uid);
    const transport = 1 + 0.03 * (palById(4).work.Transporting ?? 0);
    expect(computeRates(save).mult).toBeCloseTo(transport * 1.15);

    expect(catchChance('common', 'pal', 0, false, 1.15)).toBeCloseTo(0.69);
  });
});

describe('migration v3 → v4', () => {
  it('back-pays tech points and grants techs for built structures', () => {
    const v3 = { ...newState(), version: 3, player: { ...newState().player, level: 10, techPoints: 9 } } as Record<string, unknown>;
    (v3.base as { structures: Record<string, number> }).structures = { workbench: 1, logging: 2 };
    const s = migrate(v3)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.player.techPoints).toBe(9 + 2 + 9); // 9 old + starting 2 + 1 extra per level gained
    expect(isResearched(s, 's_workbench')).toBe(true);
    expect(isResearched(s, 's_logging')).toBe(true);
    expect(isResearched(s, 's_ranch')).toBe(false);
  });
});
