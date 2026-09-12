import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { assignWorker } from './base';
import { compareRows, DEFAULT_COMPARE_FILTER, effectiveWork, filterCompareRows, isCompareFiltering, rowGroup, statusOf } from './compare';
import { palById } from '../data/pals';

describe('comparison', () => {
  it('reports status for every role', () => {
    const save = newState();
    const a = makeInstance(1, 1); addToBox(save, a);            // party (auto)
    const b = makeInstance(1, 1); addToBox(save, b); save.party = [a.uid]; assignWorker(save, b.uid);
    const c = makeInstance(1, 1); addToBox(save, c);
    save.party = [a.uid];
    expect(statusOf(save, a)).toBe('Party');
    expect(statusOf(save, b)).toBe('Base');
    expect(statusOf(save, c)).toBe('Idle');
  });

  it('effective work applies stars, passives and sanity', () => {
    const inst = makeInstance(4, 1, false, ['artisan']); // Lifmunk Lumbering 1
    inst.stars = 1;
    expect(effectiveWork(inst, 'Lumbering')).toBeCloseTo(1 * 1.1 * 1.5);
    inst.san = 30;
    expect(effectiveWork(inst, 'Lumbering')).toBeCloseTo(1 * 1.1 * 1.5 * 0.75);
    expect(effectiveWork(inst, 'Kindling')).toBe(0);
  });

  it('marks the best value per row, higher for attack and lower for food', () => {
    const save = newState();
    const strong = makeInstance(11, 20, false, ['ferocious', 'glutton']); // Penking
    const weak = makeInstance(1, 5, false, ['dainty']);                 // Lamball
    addToBox(save, strong); addToBox(save, weak);
    const rows = compareRows(save, [strong, weak]);
    const row = (label: string) => rows.find((r) => r.label === label)!;
    expect(row('Attack').best).toEqual([0]);
    expect(row('Food / min').best).toEqual([1]);
    expect(row('Level').best).toEqual([0]);
    expect(row('Species').best).toEqual([]);
    expect(row('Breeding rank').best).toEqual([0]);   // lower rank = stronger child, Penking 520 < Lamball 1470
    expect(rows.some((r) => r.label.includes('Mining'))).toBe(true);   // Penking has Mining
    expect(rows.some((r) => r.label.includes('Kindling'))).toBe(false); // nobody does
  });

  it('ties are not highlighted and a single Pal has no bests', () => {
    const save = newState();
    const a = makeInstance(1, 5); const b = makeInstance(1, 5);
    addToBox(save, a); addToBox(save, b);
    const rows = compareRows(save, [a, b]);
    expect(rows.find((r) => r.label === 'Attack')!.best).toEqual([]);
    expect(compareRows(save, [a]).every((r) => r.best.length === 0)).toBe(true);
    expect(palById(1).name).toBe('Lamball');
  });
});

describe('compare row filter', () => {
  it('groups rows and filters by text, group and differences', () => {
    const save = newState();
    const a = makeInstance(1, 10), b = makeInstance(1, 20);            // two Lamballs, different level
    addToBox(save, a); addToBox(save, b);
    const rows = compareRows(save, [a, b]);
    expect(rowGroup(rows[0])).toBe('identity');
    expect(rowGroup(rows.find((r) => r.label === 'Attack')!)).toBe('combat');
    expect(rowGroup(rows.find((r) => r.label.endsWith('Handiwork'))!)).toBe('work');
    expect(rowGroup(rows.find((r) => r.label === 'SAN')!)).toBe('other');
    expect(isCompareFiltering(DEFAULT_COMPARE_FILTER)).toBe(false);
    expect(filterCompareRows(rows, DEFAULT_COMPARE_FILTER)).toEqual(rows);
    expect(filterCompareRows(rows, { ...DEFAULT_COMPARE_FILTER, group: 'work' }).every((r) => rowGroup(r) === 'work')).toBe(true);
    const diff = filterCompareRows(rows, { ...DEFAULT_COMPARE_FILTER, differencesOnly: true }).map((r) => r.label);
    expect(diff).toContain('Level');
    expect(diff).toContain('Attack');
    expect(diff).not.toContain('Species');
    expect(diff).not.toContain('Element');
    expect(filterCompareRows(rows, { ...DEFAULT_COMPARE_FILTER, query: 'lamball' }).map((r) => r.label)).toEqual(['Species']);   // values are searchable too
    expect(filterCompareRows(rows, { ...DEFAULT_COMPARE_FILTER, query: 'base' }).map((r) => r.label)).toEqual(['Base HP', 'Base DEF']);
    expect(filterCompareRows(rows, { ...DEFAULT_COMPARE_FILTER, query: 'zzz' })).toEqual([]);
  });
});
