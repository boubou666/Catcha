import type { RegionDef, RouteDef, SaveState } from '../data/types';
import { REGIONS } from '../data/regions';
import { palById } from '../data/pals';
import { isUnlocked, routeCleared } from './progress';

export type RouteStatus = 'cleared' | 'open' | 'locked';
export type RouteStatusFilter = 'any' | RouteStatus;

export interface RouteFilter {
  query: string;
  status: RouteStatusFilter;
  element: string | 'any';      // dominant element
}

export const DEFAULT_ROUTE_FILTER: RouteFilter = { query: '', status: 'any', element: 'any' };
export const ROUTE_STATUS_LABEL: Record<RouteStatusFilter, string> = { any: 'Any status', cleared: 'Cleared', open: 'In progress', locked: 'Locked' };

export function routeStatus(save: SaveState, r: RouteDef): RouteStatus {
  if (!isUnlocked(save, r.unlock)) return 'locked';
  return routeCleared(save, r) ? 'cleared' : 'open';
}

/** Regions the player can reach (first route unlocked). */
export function reachableRegions(save: SaveState): RegionDef[] {
  return REGIONS.filter((r) => isUnlocked(save, r.routes[0].unlock));
}

export function isRouteFiltering(f: RouteFilter): boolean {
  return f.query.trim() !== '' || f.status !== 'any' || f.element !== 'any';
}

/**
 * Every word must match the route name, region name, dominant element, or a spawning species you have
 * already seen (unseen Pals stay "???" in the Paldeck, so they don't reveal routes here either).
 */
function matches(save: SaveState, region: RegionDef, r: RouteDef, words: string[]): boolean {
  if (words.length === 0) return true;
  const seen = r.spawns.map((s) => palById(s.palId)).filter((d) => save.paldeck[d.id]?.seen).map((d) => d.name);
  const hay = [r.name, region.name, r.dominant, `lv ${r.level}`, ...seen].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export interface RouteRow { region: RegionDef; route: RouteDef; status: RouteStatus }

/** Matching routes across every reachable region, in map order. */
export function filterRoutes(save: SaveState, f: RouteFilter): RouteRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const rows: RouteRow[] = [];
  for (const region of reachableRegions(save)) {
    for (const route of region.routes) {
      const status = routeStatus(save, route);
      if (f.status !== 'any' && status !== f.status) continue;
      if (f.element !== 'any' && route.dominant !== f.element) continue;
      if (!matches(save, region, route, words)) continue;
      rows.push({ region, route, status });
    }
  }
  return rows;
}
