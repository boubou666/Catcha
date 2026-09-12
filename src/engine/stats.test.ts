import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { catchByTier, defeatsByElement, defeatsByKind, DEFAULT_STATS_FILTER, filterStats, fmtDuration, highestLevelPal, isStatsFiltering, statsReport, strongestPal, type StatsFilter, type StatSection } from './stats';
import { applyDefeat } from './combat';
import { tryCatch } from './catch';
import { spend } from './inventory';
import { condense } from './condense';
import { addToBox, makeInstance } from './party';
import { newStats } from './achievements';

const wild = (over: Partial<Parameters<typeof applyDefeat>[1]> = {}) => ({ palId: 1, level: 3, hp: 0, maxHp: 1, lucky: false, kind: 'wild' as const, ...over });

describe('stat counters', () => {
  it('count defeats by kind and lucky defeats', () => {
    const s = newState();
    applyDefeat(s, wild(), () => 1);
    applyDefeat(s, wild({ kind: 'alpha' }), () => 1);
    applyDefeat(s, wild({ lucky: true }), () => 1);
    expect(s.stats.defeatedByKind).toEqual({ wild: 2, alpha: 1 });
    expect(s.stats.luckyDefeated).toBe(1);
    expect(defeatsByKind(s)).toEqual([{ kind: 'wild', label: 'Wild Pals', n: 2 }, { kind: 'alpha', label: 'Alphas', n: 1 }]);
    expect(defeatsByElement(s)[0]).toEqual({ element: 'Neutral', n: 3 });
  });

  it('count throws and catches per sphere tier', () => {
    const s = newState();
    expect(tryCatch(s, wild({ palId: 3 }), () => 0).outcome).toBe('caught');
    expect(tryCatch(s, wild({ palId: 4 }), () => 0.99).outcome).toBe('failed');
    expect(tryCatch(s, wild({ palId: 4 }), () => 0).outcome).toBe('caught');
    expect(s.stats.throws).toBe(3);
    expect(s.stats.throwsByTier).toEqual({ pal: 3 });
    expect(s.stats.caughtByTier).toEqual({ pal: 2 });
    expect(catchByTier(s)).toEqual([{ tier: 'pal', name: 'Pal Sphere', throws: 3, caught: 2, rate: 2 / 3 }]);
  });

  it('track gold spent through spend() and condensing', () => {
    const s = newState();
    s.player.gold = 500;
    expect(spend(s, { gold: 120, red_berries: 5 })).toBe(true);
    expect(spend(s, { gold: 1000 })).toBe(false);
    expect(s.stats.goldSpent).toBe(120);

    s.base.structures.condenser = 1;
    const target = makeInstance(1, 10);
    addToBox(s, target);
    for (let i = 0; i < 4; i++) addToBox(s, makeInstance(1, 1));
    s.party = [];
    expect(condense(s, target.uid)).not.toBeNull();
    expect(s.stats.condensed).toBe(1);
  });

  it('fill in the new counters when migrating an older save', () => {
    const v17 = { ...newState(), version: 17 } as Record<string, unknown>;
    v17.stats = { defeated: 42, clicks: 7, caught: 3, luckyCaught: 0, hatched: 0, luckyHatched: 0, crafted: 0, expeditions: 0, goldEarned: 900, playSeconds: 10, defeatedByElement: { Fire: 2 } };
    const s = migrate(v17)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.stats).toEqual({ ...newStats(), defeated: 42, clicks: 7, caught: 3, goldEarned: 900, playSeconds: 10, defeatedByElement: { Fire: 2 } });
  });
});

describe('stats report', () => {
  it('formats durations', () => {
    expect(fmtDuration(59)).toBe('0m 59s');
    expect(fmtDuration(3600 * 5 + 60 * 7)).toBe('5h 7m');
    expect(fmtDuration(86400 * 2 + 3600 * 3)).toBe('2d 3h 0m');
  });

  it('picks the strongest and highest-level Pal', () => {
    const s = newState();
    expect(strongestPal(s)).toBeNull();
    const low = makeInstance(1, 30);           // Lamball (70 atk), high level
    const strong = makeInstance(100, 20);      // Anubis (130 atk): 130×2.6 > 70×3.4
    addToBox(s, low); addToBox(s, strong);
    expect(highestLevelPal(s)?.uid).toBe(low.uid);
    expect(strongestPal(s)?.uid).toBe(strong.uid);
  });

  it('builds every section with sensible values on a fresh save', () => {
    const s = newState();
    const report = statsReport(s, { dps: 0, clickDmg: 5 });
    expect(report.map((x) => x.title)).toEqual(['Overview', 'Combat', 'Catching', 'Base', 'World']);
    const row = (t: string, l: string) => report.find((x) => x.title === t)!.rows.find((r) => r.label === l)!;
    expect(row('Overview', 'Time played').value).toBe('0m 0s');
    expect(row('Combat', 'Tap damage').value).toBe('5');
    expect(row('Catching', 'Strongest Pal').value).toBe('—');
    expect(row('World', 'Towers cleared').value).toBe('0 / 7');
    expect(row('Base', 'Tech researched').value).toMatch(/^0 \/ \d+$/);
    // no per-tier rows before any throw
    expect(report[2].rows.some((r) => r.label.startsWith(' '))).toBe(false);
  });

  it('adds per-kind and per-tier sub-rows and rates once there is data', () => {
    const s = newState();
    s.stats.playSeconds = 7200;
    applyDefeat(s, wild({ kind: 'tower' }), () => 1);
    tryCatch(s, wild({ palId: 3 }), () => 0);
    const report = statsReport(s, { dps: 1, clickDmg: 1 });
    const combat = report[1].rows, catching = report[2].rows;
    expect(combat.find((r) => r.label === '  Tower bosses')?.value).toBe('1');
    expect(combat.find((r) => r.label === 'Pals defeated')?.hint).toBe('1 per hour played');
    expect(catching.find((r) => r.label === '  Pal Sphere')).toEqual({ label: '  Pal Sphere', value: '1 / 1', hint: '100%' });
    expect(catching.find((r) => r.label === 'Spheres thrown')?.hint).toBe('100% landed');
  });
});

describe('stats filter', () => {
  const sections = (): StatSection[] => [
    { title: 'Combat', rows: [
      { label: 'Pals defeated', value: '275', hint: '1,019 per hour played' },
      { label: '  Wild Pals', value: '270' },
      { label: '  Alphas', value: '5' },
      { label: 'Lucky Pals defeated', value: '0' },
    ] },
    { title: 'World', rows: [
      { label: 'Towers cleared', value: '0 / 7' },
      { label: 'Raid wins', value: '2', hint: '1 / 3 raid bosses beaten' },
    ] },
  ];
  const f = (over: Partial<StatsFilter>): StatsFilter => ({ ...DEFAULT_STATS_FILTER, ...over });
  const labels = (over: Partial<StatsFilter>) => filterStats(sections(), f(over)).map((s) => `${s.title}: ${s.rows.map((r) => r.label.trim()).join(', ')}`);

  it('passes everything through by default', () => {
    expect(filterStats(sections(), DEFAULT_STATS_FILTER)).toEqual(sections());
    expect(isStatsFiltering(DEFAULT_STATS_FILTER)).toBe(false);
    expect(isStatsFiltering(f({ nonZero: true }))).toBe(true);
  });

  it('searches title, label, value and hint; sub-rows follow their parent', () => {
    expect(labels({ query: 'defeated' })).toEqual(['Combat: Pals defeated, Wild Pals, Alphas, Lucky Pals defeated']);
    expect(labels({ query: 'alphas' })).toEqual(['Combat: Alphas']);
    expect(labels({ query: 'raid bosses' })).toEqual(['World: Raid wins']);
    expect(labels({ query: 'world' })).toEqual(['World: Towers cleared, Raid wins']);
    expect(labels({ query: '275' })).toEqual(['Combat: Pals defeated, Wild Pals, Alphas']);
    expect(labels({ query: 'zzz' })).toEqual([]);
  });

  it('narrows to one section and hides zero rows', () => {
    expect(labels({ section: 'World' })).toEqual(['World: Towers cleared, Raid wins']);
    expect(labels({ nonZero: true })).toEqual(['Combat: Pals defeated, Wild Pals, Alphas', 'World: Raid wins']);
    expect(labels({ section: 'Combat', nonZero: true, query: 'lucky' })).toEqual([]);
  });
});
