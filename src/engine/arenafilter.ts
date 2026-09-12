import type { Element, RouteDef, SaveState } from '../data/types';
import { palById } from '../data/pals';

export type SpawnStatus = 'caught' | 'seen' | 'missing';
export interface SpawnFilter { query: string; status: SpawnStatus | 'any'; element: Element | 'any'; watchedOnly: boolean }
export const DEFAULT_SPAWN_FILTER: SpawnFilter = { query: '', status: 'any', element: 'any', watchedOnly: false };
export const SPAWN_STATUS_LABEL: Record<SpawnStatus | 'any', string> = { any: 'Any status', caught: 'Caught', seen: 'Seen, not caught', missing: 'Never seen' };

export interface SpawnRow {
  palId: number;
  name: string;          // "???" until seen
  no: string;            // Paldeck number, always shown
  chance: number;        // share of the route's spawn table
  status: SpawnStatus;
  elements: Element[];   // empty until seen
  watched: boolean;
}

/** The route's spawn table with odds and Paldeck status, most common first. */
export function routeSpawns(save: SaveState, route: RouteDef, watched: ReadonlySet<number> = new Set()): SpawnRow[] {
  const total = route.spawns.reduce((s, x) => s + x.weight, 0);
  return route.spawns
    .map((s) => {
      const def = palById(s.palId);
      const e = save.paldeck[def.id];
      const status: SpawnStatus = (e?.caught ?? 0) > 0 ? 'caught' : e?.seen ? 'seen' : 'missing';
      return { palId: def.id, name: status === 'missing' ? '???' : def.name, no: def.no, chance: s.weight / total, status, elements: status === 'missing' ? [] : def.elements, watched: watched.has(def.id) };
    })
    .sort((a, b) => b.chance - a.chance || a.no.localeCompare(b.no));
}

export function isSpawnFiltering(f: SpawnFilter): boolean {
  return f.query.trim() !== '' || f.status !== 'any' || f.element !== 'any' || f.watchedOnly;
}

/** Every word must match the name (seen Pals only), Paldeck number or element; unseen Pals match by number alone. */
export function filterSpawns(rows: SpawnRow[], f: SpawnFilter): SpawnRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (f.status !== 'any' && r.status !== f.status) return false;
    if (f.element !== 'any' && !r.elements.includes(f.element)) return false;
    if (f.watchedOnly && !r.watched) return false;
    const hay = [r.status === 'missing' ? '' : r.name, r.no, ...r.elements].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
