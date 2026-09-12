import { describe, expect, it } from 'vitest';
import { classifyLog, DEFAULT_LOG_FILTER, filterLog, isLogFiltering, type LogEntry } from './logfilter';

describe('log classification', () => {
  it('sorts the game\'s messages into categories', () => {
    expect(classifyLog('Caught Lamball with a Pal Sphere (60%).')).toBe('catch');
    expect(classifyLog('Lamball broke free (60%).')).toBe('catch');
    expect(classifyLog('Alpha Chillet defeated! +500 gold, +2 Effigies.')).toBe('combat');
    expect(classifyLog('Zoe & Grizzbolt — 10 minutes on the clock.')).toBe('combat');
    expect(classifyLog("Time's up — Lamball retreats.")).toBe('combat');
    expect(classifyLog('Built Primitive Workbench.')).toBe('base');
    expect(classifyLog('Researched Pal Sphere.')).toBe('base');
    expect(classifyLog('Queued 5× Pal Sphere.')).toBe('base');
    expect(classifyLog('An egg hatched: Lamball!')).toBe('breeding');
    expect(classifyLog('Lamball condensed to ★ (4 Lamballs consumed).')).toBe('breeding');
    expect(classifyLog('Quest complete: Defeat 20 Pals (+400 gold).')).toBe('quest');
    expect(classifyLog('🏆 Achievement: Pal Hunter I — Defeat 100 Pals (+1 pts)')).toBe('quest');
    expect(classifyLog('A new day — fresh daily quests are up.')).toBe('quest');
    expect(classifyLog('Scout Windswept Hills: success — +100 gold, 30 Wood.')).toBe('world');
    expect(classifyLog('Entered Sealed Realm of the Frozen Wings — 5 waves.')).toBe('world');
    expect(classifyLog('Bellanoir answers the altar — 2,000k HP.')).toBe('world');
    expect(classifyLog('Bought 10 Pal Sphere.')).toBe('shop');
    expect(classifyLog('Sold Wool for 18 gold.')).toBe('shop');
    expect(classifyLog('Save loaded.')).toBe('system');
    expect(classifyLog('Welcome to the Palpagos Islands. Attack a Pal to begin.')).toBe('system');
  });
});

describe('log filter', () => {
  const entries: LogEntry[] = [
    { at: 3, kind: 'catch', text: 'Caught Lamball with a Pal Sphere (60%).' },
    { at: 2, kind: 'combat', text: 'Alpha Chillet defeated! +500 gold.' },
    { at: 1, kind: 'shop', text: 'Sold Wool for 18 gold.' },
  ];
  it('filters by kind and every search word, keeping order', () => {
    expect(filterLog(entries, DEFAULT_LOG_FILTER)).toEqual(entries);
    expect(isLogFiltering(DEFAULT_LOG_FILTER)).toBe(false);
    expect(filterLog(entries, { query: 'gold', kind: 'any' }).map((e) => e.at)).toEqual([2, 1]);
    expect(filterLog(entries, { query: 'gold', kind: 'shop' }).map((e) => e.at)).toEqual([1]);
    expect(filterLog(entries, { query: 'alpha gold', kind: 'any' }).map((e) => e.at)).toEqual([2]);
    expect(filterLog(entries, { query: 'zzz', kind: 'any' })).toEqual([]);
  });
});
