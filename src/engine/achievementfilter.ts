import type { SaveState } from '../data/types';
import { ACHIEVEMENTS, categoryLabel, type AchievementCategory, type AchievementDef } from '../data/achievements';
import { isUnlocked, progressOf } from './achievements';

export type AchStatusFilter = 'any' | 'done' | 'todo' | 'close';
export type AchSort = 'default' | 'progress' | 'points' | 'name';

export interface AchievementFilter {
  query: string;
  category: AchievementCategory | 'any';
  status: AchStatusFilter;
  sort: AchSort;
}

export const DEFAULT_ACH_FILTER: AchievementFilter = { query: '', category: 'any', status: 'any', sort: 'default' };
export const ACH_STATUS_LABEL: Record<AchStatusFilter, string> = { any: 'Any status', done: 'Unlocked', todo: 'Locked', close: 'Almost there (≥ 50%)' };
export const ACH_SORT_LABEL: Record<AchSort, string> = { default: 'Default', progress: 'Closest first', points: 'Points', name: 'Name' };
export const ACH_CATEGORIES: AchievementCategory[] = ['combat', 'collection', 'base', 'breeding', 'exploration', 'economy'];

export interface AchRow { def: AchievementDef; done: boolean; value: number; frac: number }

export function isAchFiltering(f: AchievementFilter): boolean {
  return f.query.trim() !== '' || f.category !== 'any' || f.status !== 'any';
}

/** Every word must match the name, description or category. */
function matches(def: AchievementDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [def.name, def.desc, categoryLabel(def.category)].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function filterAchievements(save: SaveState, f: AchievementFilter): AchRow[] {
  const rows = ACHIEVEMENTS
    .map((def) => { const value = progressOf(save, def); return { def, done: isUnlocked(save, def.id), value, frac: value / def.goal }; })
    .filter((r) => {
      if (f.category !== 'any' && r.def.category !== f.category) return false;
      if (f.status === 'done' && !r.done) return false;
      if (f.status === 'todo' && r.done) return false;
      if (f.status === 'close' && (r.done || r.frac < 0.5)) return false;
      return matches(r.def, f.query);
    });
  switch (f.sort) {
    // unfinished ones nearest their goal first; finished ones after
    case 'progress': rows.sort((a, b) => Number(a.done) - Number(b.done) || b.frac - a.frac || a.def.name.localeCompare(b.def.name)); break;
    case 'points': rows.sort((a, b) => b.def.points - a.def.points || a.def.name.localeCompare(b.def.name)); break;
    case 'name': rows.sort((a, b) => a.def.name.localeCompare(b.def.name)); break;
  }
  return rows;
}

/** Group rows by category in the canonical order (only categories with rows); flat when sorted. */
export function groupByCategory(rows: AchRow[]): [AchievementCategory, AchRow[]][] {
  const m = new Map<AchievementCategory, AchRow[]>();
  for (const r of rows) m.set(r.def.category, [...(m.get(r.def.category) ?? []), r]);
  return ACH_CATEGORIES.filter((c) => m.has(c)).map((c) => [c, m.get(c)!]);
}
