import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { routeById } from '../data/regions';
import { DEFAULT_SPAWN_FILTER, filterSpawns, isSpawnFiltering, routeSpawns, type SpawnFilter } from './arenafilter';

const f = (over: Partial<SpawnFilter>): SpawnFilter => ({ ...DEFAULT_SPAWN_FILTER, ...over });
// Plateau: Lamball 40, Cattiva 30, Chikipi 20, Lifmunk 10
const plateau = routeById('plateau');

describe('route spawn table', () => {
  it('lists odds most common first and hides unseen names', () => {
    const s = newState();
    const rows = routeSpawns(s, plateau);
    expect(rows.map((r) => r.chance)).toEqual([0.4, 0.3, 0.2, 0.1]);
    expect(rows.every((r) => r.name === '???' && r.status === 'missing' && r.elements.length === 0)).toBe(true);
    expect(rows[0].no).toBe('001');
    s.paldeck[1] = { seen: true, caught: 0 };
    s.paldeck[2] = { seen: true, caught: 2 };
    const seen = routeSpawns(s, plateau, new Set([2]));
    expect(seen[0]).toMatchObject({ name: 'Lamball', status: 'seen', elements: ['Neutral'], watched: false });
    expect(seen[1]).toMatchObject({ name: 'Cattiva', status: 'caught', watched: true });
  });

  it('filters by status, element, watch and text without leaking unseen names', () => {
    const s = newState();
    s.paldeck[1] = { seen: true, caught: 0 };
    s.paldeck[2] = { seen: true, caught: 2 };
    const rows = routeSpawns(s, plateau, new Set([4]));
    expect(isSpawnFiltering(DEFAULT_SPAWN_FILTER)).toBe(false);
    expect(filterSpawns(rows, f({ status: 'missing' })).map((r) => r.palId)).toEqual([3, 4]);
    expect(filterSpawns(rows, f({ status: 'caught' })).map((r) => r.palId)).toEqual([2]);
    expect(filterSpawns(rows, f({ element: 'Neutral' })).map((r) => r.palId)).toEqual([1, 2]);   // unseen ones have no element
    expect(filterSpawns(rows, f({ watchedOnly: true })).map((r) => r.palId)).toEqual([4]);
    expect(filterSpawns(rows, f({ query: 'lam' })).map((r) => r.palId)).toEqual([1]);
    expect(filterSpawns(rows, f({ query: 'chikipi' }))).toEqual([]);                            // unseen: not by name
    expect(filterSpawns(rows, f({ query: '003' })).map((r) => r.palId)).toEqual([3]);            // …but by number
    expect(filterSpawns(rows, f({ query: 'zzz' }))).toEqual([]);
  });
});
