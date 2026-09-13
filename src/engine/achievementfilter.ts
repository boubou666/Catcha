import type { SaveState } from '../data/types';
import { ACHIEVEMENTS, categoryLabel, type AchievementCategory, type AchievementDef } from '../data/achievements';
import { isUnlocked, progressOf } from './achievements';
import { PALS } from '../data/pals';
import { catchChance, catchPreview } from './catch';
import { catchBonus } from './stats';
import { LUCKY_CATCH_PENALTY, SPHERES } from '../data/spheres';
import { LUCKY_CHANCE } from './formulas';

const pct = (n: number) => `${n < 0.1 ? (n * 100).toFixed(1) : Math.round(n * 100)}%`;

/**
 * What the odds say about an open catching achievement: throws still needed at your average odds (Catcher),
 * the easiest species you are missing (Paldeck), a Lucky catch's odds (Fortune), a legendary's (Legend). Null otherwise.
 */
export function achievementCatchHint(save: SaveState, def: AchievementDef): string | null {
  if (isUnlocked(save, def.id)) return null;
  const b = catchBonus(save);
  const mult = b.tech * b.mastery * b.partner;
  const st = save.stats;
  if (def.id.startsWith('caught_')) {
    const left = def.goal - progressOf(save, def);
    const avg = st.ratedThrows ? st.chanceSum / st.ratedThrows : catchChance('common', b.tier, save.player.effigies, false, mult);
    return `🎯 ~${Math.ceil(left / avg).toLocaleString()} more throws at ${pct(avg)} average odds`;
  }
  if (def.id.startsWith('paldeck_')) {
    const missing = PALS.filter((p) => save.paldeck[p.id]?.seen && !(save.paldeck[p.id]?.caught ?? 0)).map((p) => ({ p, pv: catchPreview(save, p.id) }));
    if (missing.length === 0) return null;
    const throwing = missing.filter((m) => m.pv.throws) as { p: (typeof PALS)[number]; pv: { chance: number } }[];
    if (throwing.length === 0) return `🎯 ${missing.length} seen but uncaught — no sphere would be thrown (Settings → Catching)`;
    const best = throwing.reduce((a, m) => (m.pv.chance > a.pv.chance ? m : a));
    return `🎯 Easiest missing: ${best.p.name} ${pct(best.pv.chance)}${missing.length > 1 ? ` · ${missing.length} seen but uncaught` : ''}`;
  }
  if (def.id.startsWith('lucky_')) {
    return `🎯 1 in ${Math.round(1 / LUCKY_CHANCE)} wild Pals is Lucky, caught at ×${LUCKY_CATCH_PENALTY}: a common one ${pct(catchChance('common', b.tier, save.player.effigies, true, mult))} with a ${SPHERES[b.tier].name}`;
  }
  if (def.id === 'legendary') {
    return `🎯 A legendary is caught at ${pct(catchChance('legendary', b.tier, save.player.effigies, false, mult))} with a ${SPHERES[b.tier].name}`;
  }
  return null;
}

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
