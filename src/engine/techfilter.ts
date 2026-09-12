import type { SaveState } from '../data/types';
import { TECHS, techById, type TechDef, type TechStat } from '../data/tech';
import { structureById, recipeById } from '../data/base';
import { researchBlocker, type TechBlock } from './tech';

export type TechKind = TechDef['effect']['kind'];
export type TechStatusFilter = 'any' | 'ready' | 'todo' | 'researched';

export interface TechFilter {
  query: string;
  kind: TechKind | 'any';
  stat: TechStat | 'any';       // for multiplier techs
  status: TechStatusFilter;
  hideFuture: boolean;          // techs above your level
}

export const DEFAULT_TECH_FILTER: TechFilter = { query: '', kind: 'any', stat: 'any', status: 'any', hideFuture: false };
export const TECH_KIND_LABEL: Record<TechKind, string> = { structure: 'Structures', recipe: 'Recipes', mult: 'Multipliers' };
export const TECH_STAT_LABEL: Record<TechStat, string> = { click: 'Tap damage', attack: 'Party attack', base: 'Base output', catch: 'Catch rate', exp: 'Experience', gold: 'Gold' };
export const TECH_STATUS_LABEL: Record<TechStatusFilter, string> = { any: 'Any status', ready: 'Researchable now', todo: 'Not researched', researched: 'Researched' };

export function isTechFiltering(f: TechFilter): boolean {
  return f.query.trim() !== '' || f.kind !== 'any' || f.stat !== 'any' || f.status !== 'any' || f.hideFuture;
}

/** What a tech unlocks, by name — so searching "condenser" finds its tech even if the tech is named differently. */
function unlocksName(t: TechDef): string {
  switch (t.effect.kind) {
    case 'structure': return structureById(t.effect.id).name;
    case 'recipe': return recipeById(t.effect.id).name;
    case 'mult': return TECH_STAT_LABEL[t.effect.stat];
  }
}

/** Every word must match the tech name, description, kind, what it unlocks, or a prerequisite's name. */
function matches(t: TechDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [t.name, t.desc, TECH_KIND_LABEL[t.effect.kind], unlocksName(t), ...(t.requires ?? []).map((r) => techById(r).name)].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export interface TechRow { tech: TechDef; block: TechBlock | null }

/** Filtered techs in data order (which is by level). */
export function filterTechs(save: SaveState, f: TechFilter): TechRow[] {
  return TECHS
    .map((tech) => ({ tech, block: researchBlocker(save, tech.id) }))
    .filter(({ tech, block }) => {
      if (f.kind !== 'any' && tech.effect.kind !== f.kind) return false;
      if (f.stat !== 'any' && (tech.effect.kind !== 'mult' || tech.effect.stat !== f.stat)) return false;
      if (f.status === 'ready' && block !== null) return false;
      if (f.status === 'todo' && block === 'researched') return false;
      if (f.status === 'researched' && block !== 'researched') return false;
      if (f.hideFuture && save.player.level < tech.level) return false;
      return matches(tech, f.query);
    });
}

/** Group rows by required level, ascending, for the tree layout. */
export function groupByLevel(rows: TechRow[]): [number, TechRow[]][] {
  const byLevel = new Map<number, TechRow[]>();
  for (const r of rows) byLevel.set(r.tech.level, [...(byLevel.get(r.tech.level) ?? []), r]);
  return [...byLevel.entries()].sort(([a], [b]) => a - b);
}
