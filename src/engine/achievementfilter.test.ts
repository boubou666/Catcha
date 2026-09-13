import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { ACHIEVEMENTS } from '../data/achievements';
import { checkAchievements } from './achievements';
import { ACH_CATEGORIES, achievementCatchHint, DEFAULT_ACH_FILTER, filterAchievements, groupByCategory, isAchFiltering, type AchievementFilter } from './achievementfilter';

const f = (over: Partial<AchievementFilter>): AchievementFilter => ({ ...DEFAULT_ACH_FILTER, ...over });
const ids = (s: ReturnType<typeof newState>, over: Partial<AchievementFilter>) => filterAchievements(s, f(over)).map((r) => r.def.id);

describe('achievement filter', () => {
  it('lists everything in data order, grouped by category in canonical order', () => {
    const s = newState();
    expect(ids(s, {})).toEqual(ACHIEVEMENTS.map((a) => a.id));
    const groups = groupByCategory(filterAchievements(s, DEFAULT_ACH_FILTER));
    expect(groups.map(([c]) => c)).toEqual(ACH_CATEGORIES.filter((c) => ACHIEVEMENTS.some((a) => a.category === c)));
    expect(isAchFiltering(DEFAULT_ACH_FILTER)).toBe(false);
    expect(isAchFiltering(f({ sort: 'points' }))).toBe(false);
    expect(isAchFiltering(f({ status: 'done' }))).toBe(true);
  });

  it('searches name, description and category', () => {
    const s = newState();
    expect(ids(s, { query: 'combat' })).toEqual(ACHIEVEMENTS.filter((a) => a.category === 'combat' || /combat/i.test(a.name + a.desc)).map((a) => a.id));
    expect(ids(s, { query: 'lucky' }).length).toBeGreaterThan(0);
    expect(ids(s, { query: 'zzz' })).toEqual([]);
  });

  it('filters by category and status, including "almost there"', () => {
    const s = newState();
    expect(ids(s, { category: 'economy' }).every((id) => ACHIEVEMENTS.find((a) => a.id === id)!.category === 'economy')).toBe(true);
    expect(ids(s, { status: 'done' })).toEqual([]);
    expect(ids(s, { status: 'close' })).toEqual([]);

    const first = ACHIEVEMENTS.find((a) => a.category === 'combat' && a.goal >= 10)!;   // a defeat counter
    s.stats.defeated = Math.ceil(first.goal * 0.6);
    const close = filterAchievements(s, f({ status: 'close' }));
    expect(close.length).toBeGreaterThan(0);
    expect(close.every((r) => !r.done && r.frac >= 0.5)).toBe(true);

    s.stats.defeated = first.goal;
    checkAchievements(s);
    expect(ids(s, { status: 'done' })).toContain(first.id);
    expect(ids(s, { status: 'todo' })).not.toContain(first.id);
    expect(ids(s, { status: 'close' })).not.toContain(first.id);
  });

  it('sorts by closeness, points and name', () => {
    const s = newState();
    s.stats.defeated = 5;
    const byProgress = filterAchievements(s, f({ sort: 'progress' }));
    for (let i = 1; i < byProgress.length; i++) {
      const a = byProgress[i - 1], b = byProgress[i];
      expect(Number(a.done) < Number(b.done) || (a.done === b.done && a.frac >= b.frac)).toBe(true);
    }
    const byPoints = filterAchievements(s, f({ sort: 'points' })).map((r) => r.def.points);
    expect(byPoints).toEqual([...byPoints].sort((a, b) => b - a));
    const byName = filterAchievements(s, f({ sort: 'name' })).map((r) => r.def.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)));
  });
});

describe('catching achievement hints', () => {
  const def = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;
  it('estimates throws left, points at the easiest missing species, and stays quiet elsewhere', () => {
    const s = newState();
    s.inventory.sphere_pal = 5;
    expect(achievementCatchHint(s, def('caught_1'))).toBe('🎯 ~17 more throws at 60% average odds');   // 10 left at the common Pal Sphere rate
    s.stats.chanceSum = 2; s.stats.ratedThrows = 4; s.stats.caught = 4;
    expect(achievementCatchHint(s, def('caught_1'))).toBe('🎯 ~12 more throws at 50% average odds');
    expect(achievementCatchHint(s, def('paldeck_1'))).toBeNull();                                    // nothing seen yet
    s.paldeck[1] = { seen: true, caught: 0 };    // Lamball, common
    s.paldeck[11] = { seen: true, caught: 0 };   // Penking, rare
    expect(achievementCatchHint(s, def('paldeck_1'))).toBe('🎯 Easiest missing: Lamball 60% · 2 seen but uncaught');
    s.inventory.sphere_pal = 0;
    expect(achievementCatchHint(s, def('paldeck_1'))).toMatch(/no sphere would be thrown/);
    expect(achievementCatchHint(s, def('lucky_1'))).toMatch(/^🎯 1 in 300 wild Pals is Lucky, caught at ×0.5: a common one 30% with a Pal Sphere$/);
    expect(achievementCatchHint(s, def('legendary'))).toBe('🎯 A legendary is caught at 2.0% with a Pal Sphere');
    expect(achievementCatchHint(s, def('defeat_1'))).toBeNull();
    s.achievements.push('legendary');
    expect(achievementCatchHint(s, def('legendary'))).toBeNull();
  });
});
