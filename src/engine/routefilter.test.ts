import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { REGIONS, routeById } from '../data/regions';
import { DEFAULT_ROUTE_FILTER, filterRoutes, isRouteFiltering, reachableRegions, routeStatus, type RouteFilter } from './routefilter';

const f = (over: Partial<RouteFilter>): RouteFilter => ({ ...DEFAULT_ROUTE_FILTER, ...over });
const ids = (s: ReturnType<typeof newState>, over: Partial<RouteFilter>) => filterRoutes(s, f(over)).map((r) => r.route.id);

describe('route filter', () => {
  it('covers only reachable regions and reports status', () => {
    const s = newState();
    expect(reachableRegions(s).map((r) => r.id)).toEqual(['windswept']);
    expect(ids(s, {})).toEqual(REGIONS[0].routes.map((r) => r.id));
    expect(routeStatus(s, routeById('plateau'))).toBe('open');
    expect(routeStatus(s, routeById('behemoth'))).toBe('locked');
    s.progress.routeKills.plateau = 99;
    expect(routeStatus(s, routeById('plateau'))).toBe('cleared');
    expect(routeStatus(s, routeById('behemoth'))).toBe('open');
    expect(isRouteFiltering(DEFAULT_ROUTE_FILTER)).toBe(false);
    expect(isRouteFiltering(f({ status: 'open' }))).toBe(true);
  });

  it('filters by status and dominant element', () => {
    const s = newState();
    s.progress.routeKills.plateau = 99;
    expect(ids(s, { status: 'cleared' })).toEqual(['plateau']);
    expect(ids(s, { status: 'open' })).toEqual(['behemoth']);
    expect(ids(s, { status: 'locked' })).toHaveLength(REGIONS[0].routes.length - 2);
    expect(ids(s, { element: 'Water' })).toEqual(REGIONS[0].routes.filter((r) => r.dominant === 'Water').map((r) => r.id));
  });

  it('searches names, region, element and seen species only', () => {
    const s = newState();
    expect(ids(s, { query: 'fort' })).toEqual(['fort']);
    expect(ids(s, { query: 'windswept' })).toEqual(REGIONS[0].routes.map((r) => r.id));
    expect(ids(s, { query: 'grass' })).toContain('behemoth');
    expect(ids(s, { query: 'lamball' })).toEqual([]);            // never seen: not searchable
    s.paldeck[1] = { seen: true, caught: 0 };
    expect(ids(s, { query: 'lamball' })).toEqual(REGIONS[0].routes.filter((r) => r.spawns.some((x) => x.palId === 1)).map((r) => r.id));
    expect(ids(s, { query: 'zzz' })).toEqual([]);
  });

  it('spans regions once a tower falls', () => {
    const s = newState();
    s.progress.towers.push('rayne');
    expect(reachableRegions(s).map((r) => r.id)).toEqual(['windswept', 'marsh']);
    const rows = filterRoutes(s, f({ query: 'marsh' }));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.region.id === 'marsh')).toBe(true);
  });
});
