import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { achievementGoldMult, achievementPoints, checkAchievements, newStats, progressOf, totalPoints } from './achievements';
import { ACHIEVEMENTS, achievementById, POINT_GOLD_BONUS } from '../data/achievements';
import { applyDefeat } from './combat';
import { tryCatch } from './catch';
import { addToBox, makeInstance } from './party';
import { assignWorker, enqueue, tickBase } from './base';
import { TECHS } from '../data/tech';

describe('achievement data', () => {
  it('ids are unique, goals positive, every metric evaluates on a fresh save', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const save = newState();
    for (const a of ACHIEVEMENTS) {
      expect(a.goal).toBeGreaterThan(0);
      expect(a.points).toBeGreaterThan(0);
      expect(Number.isFinite(a.metric(save))).toBe(true);
    }
    expect(checkAchievements(save)).toEqual([]);
    expect(totalPoints).toBeGreaterThan(50);
  });
});

describe('stats feed achievements', () => {
  it('defeats, catches, gold and clicks are counted where they happen', () => {
    const save = newState();
    const wild = { palId: 1, level: 1, hp: 0, maxHp: 1, lucky: true, kind: 'wild' as const };
    const r = applyDefeat(save, wild, () => 1);
    expect(save.stats.defeated).toBe(1);
    expect(save.stats.goldEarned).toBe(r.gold);
    tryCatch(save, wild, () => 0);
    expect(save.stats.caught).toBe(1);
    expect(save.stats.luckyCaught).toBe(1);
    expect(checkAchievements(save).map((a) => a.id)).toContain('lucky_1');
    expect(progressOf(save, achievementById('defeat_1'))).toBe(1);
  });
  it('crafting counts completed units', () => {
    const save = newState();
    save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
    save.base.structures.workbench = 1;
    save.inventory.red_berries = 100; save.inventory.wood = 60;
    const w = makeInstance(1, 1); addToBox(save, w); assignWorker(save, w.uid);
    enqueue(save, 'wooden_club', 2);
    tickBase(save, 120);
    expect(save.stats.crafted).toBe(2);
  });
});

describe('unlocking', () => {
  it('is one-way and pays points that boost gold', () => {
    const save = newState();
    expect(achievementGoldMult(save)).toBe(1);
    save.stats.defeated = 100;
    const first = checkAchievements(save);
    expect(first.map((a) => a.id)).toEqual(['defeat_1']);
    expect(checkAchievements(save)).toEqual([]);         // no double unlock
    save.stats.defeated = 0;
    expect(save.achievements).toContain('defeat_1');   // never revoked
    expect(achievementPoints(save)).toBe(achievementById('defeat_1').points);
    expect(achievementGoldMult(save)).toBeCloseTo(1 + POINT_GOLD_BONUS * achievementPoints(save));
    const base = applyDefeat(newState(), { palId: 1, level: 5, hp: 0, maxHp: 1, lucky: false, kind: 'wild' }, () => 1).gold;
    const boosted = applyDefeat(save, { palId: 1, level: 5, hp: 0, maxHp: 1, lucky: false, kind: 'wild' }, () => 1).gold;
    expect(boosted).toBe(Math.round(base * achievementGoldMult(save)));
  });
  it('derived metrics: towers, paldeck, structures, stars', () => {
    const save = newState();
    save.progress.towers.push('rayne');
    save.paldeck = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, { seen: true, caught: 1 }]));
    save.base.structures = { workbench: 1, logging: 1, stone_pit: 1 };
    const inst = makeInstance(1, 1); inst.stars = 1; addToBox(save, inst);
    const ids = checkAchievements(save).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['tower_rayne', 'paldeck_1', 'structures_1', 'stars_1']));
  });
});

describe('migration v12 → v13', () => {
  it('adds stats and achievements', () => {
    const v12 = { ...newState(), version: 12 } as Record<string, unknown>;
    delete v12.stats; delete v12.achievements;
    const s = migrate(v12)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.stats).toEqual(newStats());
    expect(s.achievements).toEqual([]);
  });
});
