import type { Element, SaveState } from '../data/types';
import { REGIONS } from '../data/regions';
import { DUNGEONS } from '../data/dungeons';
import { RAIDS } from '../data/raids';
import { palById } from '../data/pals';
import { isUnlocked } from './progress';
import { reachableRegions } from './routefilter';

export type BossKind = 'alpha' | 'tower' | 'realm' | 'raid';
export type BossStatus = 'beaten' | 'ready' | 'locked';
export interface BossFilter {
  query: string;
  kind: BossKind | 'any';
  status: BossStatus | 'any';
  element: Element | 'any';
}
export const DEFAULT_BOSS_FILTER: BossFilter = { query: '', kind: 'any', status: 'any', element: 'any' };
export const BOSS_KIND_LABEL: Record<BossKind, string> = { alpha: 'Alphas', tower: 'Towers', realm: 'Sealed Realms', raid: 'Raids' };
export const BOSS_STATUS_LABEL: Record<BossStatus | 'any', string> = { any: 'Any status', beaten: 'Beaten', ready: 'Available', locked: 'Locked' };

export interface BossRow {
  kind: BossKind;
  id: string;
  name: string;            // "Alpha Chillet", "Zoe & Grizzbolt", realm / raid name
  regionId: string | null; // raids are global
  regionName: string;
  level: number;
  elements: Element[];
  status: BossStatus;
  wins: number;            // clears / wins for repeatable bosses
}

export function isBossFiltering(f: BossFilter): boolean {
  return f.query.trim() !== '' || f.kind !== 'any' || f.status !== 'any' || f.element !== 'any';
}

/** Every boss on the reachable map plus raids, in map order. Raids need the altar only to summon, not to appear. */
export function allBosses(save: SaveState): BossRow[] {
  const rows: BossRow[] = [];
  for (const region of reachableRegions(save)) {
    for (const a of region.alphas) {
      const def = palById(a.palId);
      rows.push({ kind: 'alpha', id: a.id, name: `Alpha ${def.name}`, regionId: region.id, regionName: region.name, level: a.level, elements: def.elements,
        status: save.progress.alphas.includes(a.id) ? 'beaten' : isUnlocked(save, a.unlock) ? 'ready' : 'locked', wins: save.progress.alphas.includes(a.id) ? 1 : 0 });
    }
    const t = region.tower;
    rows.push({ kind: 'tower', id: t.id, name: t.boss, regionId: region.id, regionName: region.name, level: t.level, elements: palById(t.palId).elements,
      status: save.progress.towers.includes(t.id) ? 'beaten' : isUnlocked(save, t.unlock) ? 'ready' : 'locked', wins: save.progress.towers.includes(t.id) ? 1 : 0 });
    for (const d of DUNGEONS.filter((x) => x.regionId === region.id)) {
      const clears = save.progress.dungeons[d.id] ?? 0;
      rows.push({ kind: 'realm', id: d.id, name: d.name, regionId: region.id, regionName: region.name, level: d.level, elements: palById(d.boss.palId).elements,
        status: clears > 0 ? 'beaten' : isUnlocked(save, d.unlock) ? 'ready' : 'locked', wins: clears });
    }
  }
  for (const r of RAIDS) {
    const wins = save.progress.raids[r.id] ?? 0;
    rows.push({ kind: 'raid', id: r.id, name: r.name, regionId: null, regionName: 'Raids', level: r.level, elements: palById(r.palId).elements,
      status: wins > 0 ? 'beaten' : isUnlocked(save, r.unlock) ? 'ready' : 'locked', wins });
  }
  return rows;
}

/** Every word must match the boss name, kind, region, element or level. */
export function filterBosses(save: SaveState, f: BossFilter): BossRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return allBosses(save).filter((b) => {
    if (f.kind !== 'any' && b.kind !== f.kind) return false;
    if (f.status !== 'any' && b.status !== f.status) return false;
    if (f.element !== 'any' && !b.elements.includes(f.element)) return false;
    if (words.length === 0) return true;
    const hay = [b.name, BOSS_KIND_LABEL[b.kind], b.regionName, ...b.elements, `lv ${b.level}`].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
