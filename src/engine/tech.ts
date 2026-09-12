import type { SaveState } from '../data/types';
import { recipeTech, structureTech, techById, TECHS, type TechStat } from '../data/tech';

export function isResearched(save: SaveState, techId: string): boolean {
  return save.tech.includes(techId);
}

export type TechBlock = 'researched' | 'level' | 'requires' | 'points';

export function researchBlocker(save: SaveState, techId: string): TechBlock | null {
  const t = techById(techId);
  if (isResearched(save, techId)) return 'researched';
  if (save.player.level < t.level) return 'level';
  if (t.requires?.some((r) => !isResearched(save, r))) return 'requires';
  if (save.player.techPoints < t.cost) return 'points';
  return null;
}

export function research(save: SaveState, techId: string): boolean {
  if (researchBlocker(save, techId)) return false;
  save.player.techPoints -= techById(techId).cost;
  save.tech.push(techId);
  return true;
}

/** Product of every researched multiplier for a stat. */
export function techMult(save: SaveState, stat: TechStat): number {
  let m = 1;
  for (const id of save.tech) {
    const e = techById(id).effect;
    if (e.kind === 'mult' && e.stat === stat) m *= e.mult;
  }
  return m;
}

/** Structures / recipes not referenced by any tech are always available. */
export function structureUnlocked(save: SaveState, structureId: string): boolean {
  const t = structureTech(structureId);
  return !t || isResearched(save, t.id);
}

export function recipeUnlocked(save: SaveState, recipeId: string): boolean {
  const t = recipeTech(recipeId);
  return !t || isResearched(save, t.id);
}

/** Techs a player could research right now. */
export function researchable(save: SaveState): string[] {
  return TECHS.filter((t) => researchBlocker(save, t.id) === null).map((t) => t.id);
}
