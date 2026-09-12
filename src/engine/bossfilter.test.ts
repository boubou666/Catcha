import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { REGIONS } from '../data/regions';
import { RAIDS } from '../data/raids';
import { allBosses, DEFAULT_BOSS_FILTER, filterBosses, isBossFiltering, type BossFilter } from './bossfilter';

const f = (over: Partial<BossFilter>): BossFilter => ({ ...DEFAULT_BOSS_FILTER, ...over });
const ids = (s: ReturnType<typeof newState>, over: Partial<BossFilter>) => filterBosses(s, f(over)).map((b) => `${b.kind}:${b.id}`);

describe('boss filter', () => {
  it('lists the reachable region\'s bosses plus every raid, in map order', () => {
    const s = newState();
    const all = allBosses(s);
    const r1 = REGIONS[0];
    expect(all.map((b) => b.kind)).toEqual([...r1.alphas.map(() => 'alpha'), 'tower', 'realm', ...RAIDS.map(() => 'raid')]);
    expect(all.find((b) => b.kind === 'alpha')!.name).toMatch(/^Alpha /);
    expect(all.find((b) => b.kind === 'tower')!.name).toBe(r1.tower.boss);
    expect(isBossFiltering(DEFAULT_BOSS_FILTER)).toBe(false);
    s.progress.towers.push('rayne');
    expect(allBosses(s).filter((b) => b.regionId === 'marsh').length).toBeGreaterThan(0);
  });

  it('reports status and filters by it, by kind and by element', () => {
    const s = newState();
    expect(ids(s, { status: 'ready' })).toEqual([]);                          // nothing before Fort Ruins
    s.progress.routeKills.fort = 99;
    expect(ids(s, { status: 'ready' })).toEqual(['alpha:chillet']);
    s.progress.alphas.push('chillet');
    expect(ids(s, { status: 'beaten' })).toEqual(['alpha:chillet']);
    expect(ids(s, { kind: 'raid' })).toEqual(RAIDS.map((r) => `raid:${r.id}`));
    expect(ids(s, { kind: 'tower' })).toEqual(['tower:rayne']);
    expect(ids(s, { element: 'Ice' })).toContain('alpha:chillet');            // Chillet is Ice/Dragon
    s.progress.dungeons.frozen_wings = 3;
    const realm = filterBosses(s, f({ kind: 'realm' }))[0];
    expect(realm.status).toBe('beaten');
    expect(realm.wins).toBe(3);
  });

  it('searches name, kind, region, element and level', () => {
    const s = newState();
    expect(ids(s, { query: 'chillet' })).toEqual(['alpha:chillet']);
    expect(ids(s, { query: 'zoe' })).toEqual(['tower:rayne']);
    expect(ids(s, { query: 'raids' })).toEqual(RAIDS.map((r) => `raid:${r.id}`));
    expect(ids(s, { query: 'windswept alphas' }).every((id) => id.startsWith('alpha:'))).toBe(true);
    expect(ids(s, { query: 'lv 11' })).toEqual(['alpha:chillet']);
    expect(ids(s, { query: 'zzz' })).toEqual([]);
  });
});
