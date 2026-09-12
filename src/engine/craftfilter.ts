import type { SaveState } from '../data/types';
import { RECIPES, type RecipeDef } from '../data/base';
import { itemById, itemName } from '../data/items';
import { canAfford } from './inventory';
import { isUnlocked } from './progress';
import { recipeUnlocked } from './tech';

export type RecipeKind = 'sphere' | 'material' | 'food' | 'consumable' | 'weapon';
export type RecipeStatus = 'ready' | 'missing' | 'research' | 'locked' | 'owned';
export type CraftStatusFilter = 'any' | 'ready' | 'available' | 'locked';
export type CraftSort = 'default' | 'work' | 'name';

export interface CraftFilter {
  query: string;
  kind: RecipeKind | 'any';
  status: CraftStatusFilter;
  hideOwned: boolean;     // weapons you already have
  sort: CraftSort;
}

export const DEFAULT_CRAFT_FILTER: CraftFilter = { query: '', kind: 'any', status: 'any', hideOwned: false, sort: 'default' };
export const KIND_LABEL: Record<RecipeKind, string> = { sphere: 'Spheres', material: 'Materials', food: 'Food', consumable: 'Consumables', weapon: 'Weapons' };
export const CRAFT_STATUS_LABEL: Record<CraftStatusFilter, string> = { any: 'Any status', ready: 'Craftable now', available: 'Unlocked', locked: 'Locked' };
export const CRAFT_SORT_LABEL: Record<CraftSort, string> = { default: 'Default', work: 'Work needed', name: 'Name' };

export function recipeKind(r: RecipeDef): RecipeKind {
  return r.output.kind === 'weapon' ? 'weapon' : itemById(r.output.itemId).category;
}

/** What the player can do with a recipe right now. */
export function recipeStatus(save: SaveState, r: RecipeDef): RecipeStatus {
  if (r.output.kind === 'weapon' && save.player.weaponTier >= r.output.tier) return 'owned';
  if (!recipeUnlocked(save, r.id)) return 'research';
  if (!isUnlocked(save, r.unlock)) return 'locked';
  return canAfford(save, r.inputs) ? 'ready' : 'missing';
}

export function isCraftFiltering(f: CraftFilter): boolean {
  return f.query.trim() !== '' || f.kind !== 'any' || f.status !== 'any' || f.hideOwned;
}

/** Every word must match the recipe name, its output, or one of its ingredients. */
function matches(r: RecipeDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const out = r.output.kind === 'item' ? itemName(r.output.itemId) : r.output.name;
  const hay = [r.name, out, KIND_LABEL[recipeKind(r)], ...Object.keys(r.inputs).map(itemName)].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function filterRecipes(save: SaveState, f: CraftFilter): { recipe: RecipeDef; status: RecipeStatus }[] {
  const rows = RECIPES.map((recipe, i) => ({ recipe, status: recipeStatus(save, recipe), i }));
  const keep = rows.filter(({ recipe, status }) => {
    if (f.kind !== 'any' && recipeKind(recipe) !== f.kind) return false;
    if (f.hideOwned && status === 'owned') return false;
    if (f.status === 'ready' && status !== 'ready') return false;
    if (f.status === 'available' && status !== 'ready' && status !== 'missing') return false;
    if (f.status === 'locked' && status !== 'research' && status !== 'locked') return false;
    return matches(recipe, f.query);
  });
  switch (f.sort) {
    case 'work': keep.sort((a, b) => a.recipe.work - b.recipe.work || a.i - b.i); break;
    case 'name': keep.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name)); break;
  }
  return keep.map(({ recipe, status }) => ({ recipe, status }));
}
