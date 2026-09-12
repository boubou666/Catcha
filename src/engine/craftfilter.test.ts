import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { research } from './tech';
import { DEFAULT_CRAFT_FILTER, filterRecipes, isCraftFiltering, recipeKind, recipeStatus, type CraftFilter } from './craftfilter';
import { RECIPES, recipeById } from '../data/base';

const f = (over: Partial<CraftFilter>): CraftFilter => ({ ...DEFAULT_CRAFT_FILTER, ...over });
const ids = (s: ReturnType<typeof newState>, over: Partial<CraftFilter>) => filterRecipes(s, f(over)).map((r) => r.recipe.id);

function setup() {
  const s = newState();
  s.player.techPoints = 10;
  research(s, 's_workbench');
  research(s, 'r_sphere_pal');
  research(s, 'r_wooden_club');
  return s;
}

describe('recipe status and kind', () => {
  it('classifies each recipe from tech, unlock, affordability and owned weapons', () => {
    const s = setup();
    expect(recipeStatus(s, recipeById('sphere_pal'))).toBe('missing');       // researched, no materials
    s.inventory.paldium = 3; s.inventory.wood = 3; s.inventory.stone = 3;
    expect(recipeStatus(s, recipeById('sphere_pal'))).toBe('ready');
    expect(recipeStatus(s, recipeById('cake'))).toBe('research');
    expect(recipeStatus(s, recipeById('wooden_club'))).toBe('missing');
    s.player.weaponTier = 2;
    expect(recipeStatus(s, recipeById('wooden_club'))).toBe('owned');
    s.tech.push('r_sphere_mega');                                             // skip the level/prereq gates
    expect(recipeStatus(s, recipeById('sphere_mega'))).toBe('locked');       // researched but needs Alpha Chillet
    expect(recipeKind(recipeById('sphere_pal'))).toBe('sphere');
    expect(recipeKind(recipeById('cake'))).toBe('food');
    expect(recipeKind(recipeById('metal_spear'))).toBe('weapon');
    expect(recipeKind(recipeById('slab_bellanoir'))).toBe('material');
  });
});

describe('craft filter', () => {
  it('keeps every recipe in data order by default', () => {
    const s = setup();
    expect(ids(s, {})).toEqual(RECIPES.map((r) => r.id));
    expect(isCraftFiltering(DEFAULT_CRAFT_FILTER)).toBe(false);
    expect(isCraftFiltering(f({ sort: 'work' }))).toBe(false);
    expect(isCraftFiltering(f({ hideOwned: true }))).toBe(true);
  });

  it('searches recipe names, outputs, kinds and ingredients', () => {
    const s = setup();
    expect(ids(s, { query: 'cake' })).toEqual(['cake']);
    expect(ids(s, { query: 'milk' })).toEqual(['cake']);
    expect(ids(s, { query: 'diamond' })).toEqual(['sphere_legendary', 'slab_libero']);
    expect(ids(s, { query: 'weapon' })).toEqual(['wooden_club', 'stone_spear', 'metal_spear']);
    expect(ids(s, { query: 'spear ingot' })).toEqual(['metal_spear']);
  });

  it('filters by kind and status, hides owned weapons', () => {
    const s = setup();
    s.inventory.wood = 100;
    expect(ids(s, { kind: 'food' })).toEqual(['cake']);
    expect(ids(s, { kind: 'sphere' })).toHaveLength(6);
    expect(ids(s, { status: 'ready' })).toEqual(['wooden_club']);
    expect(ids(s, { status: 'available' })).toEqual(['sphere_pal', 'wooden_club']);
    expect(ids(s, { status: 'locked' })).toHaveLength(RECIPES.length - 2);
    s.player.weaponTier = 2;
    expect(ids(s, { status: 'ready' })).toEqual([]);
    expect(ids(s, { hideOwned: true })).not.toContain('wooden_club');
  });

  it('sorts by work and name', () => {
    const s = setup();
    expect(ids(s, { sort: 'work' }).slice(0, 3)).toEqual(['wooden_club', 'sphere_pal', 'cake']);   // 30, 60, 120
    expect(ids(s, { sort: 'name' }).slice(0, 2)).toEqual(['slab_bellanoir', 'slab_libero'].sort((a, b) => recipeById(a).name.localeCompare(recipeById(b).name)));
  });
});
