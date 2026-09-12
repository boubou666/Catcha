import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { DEFAULT_ITEMS_FILTER, filterItems, isItemsFiltering, itemInfo, type ItemsFilter } from './itemsfilter';
import { ITEMS } from '../data/items';

const f = (over: Partial<ItemsFilter>): ItemsFilter => ({ ...DEFAULT_ITEMS_FILTER, ...over });
const ids = (s: ReturnType<typeof newState>, over: Partial<ItemsFilter>) => filterItems(s, f(over)).map((i) => i.def.id);

describe('item info', () => {
  it('knows where common items come from and what uses them', () => {
    const wood = itemInfo('wood', 0);
    expect(wood.sources).toContain('Lumbering');
    expect(wood.uses).toContain('Pal Sphere');
    expect(wood.uses).toContain('Primitive Workbench');
    const sphere = itemInfo('sphere_pal', 0);
    expect(sphere.sources).toEqual(expect.arrayContaining(['Merchant', 'Craft: Pal Sphere']));
    expect(sphere.uses).toEqual([]);
    const wool = itemInfo('wool', 0);
    expect(wool.sources).toEqual(expect.arrayContaining(['Lamball', 'Lamball (Ranch)']));
    expect(new Set(wool.sources).size).toBe(wool.sources.length);   // deduplicated
  });
});

describe('items filter', () => {
  it('shows owned items by name by default, hides zero counts', () => {
    const s = newState();                                   // 20 Pal Spheres, 30 Red Berries
    s.inventory.wood = 0;
    expect(ids(s, {})).toEqual(['sphere_pal', 'red_berries']);
    expect(isItemsFiltering(DEFAULT_ITEMS_FILTER)).toBe(false);
    expect(isItemsFiltering(f({ sort: 'count' }))).toBe(false);
    expect(isItemsFiltering(f({ category: 'food' }))).toBe(true);
  });

  it('searches name, category, sources and uses', () => {
    const s = newState();
    s.inventory.wood = 5; s.inventory.wool = 2;
    expect(ids(s, { query: 'wo' })).toEqual(['wood', 'wool']);
    expect(ids(s, { query: 'lumbering' })).toEqual(['wood']);
    expect(ids(s, { query: 'workbench' })).toEqual(['wood']);           // used by the Primitive Workbench
    expect(ids(s, { query: 'lamball' })).toEqual(['wool']);
    expect(ids(s, { query: 'food' })).toEqual(['red_berries']);
    expect(ids(s, { query: 'wood sphere' })).toEqual(['wood']);          // wood, used for Pal Sphere
  });

  it('filters by category and by being used, and can include missing items', () => {
    const s = newState();
    s.inventory.wood = 5;
    expect(ids(s, { category: 'sphere' })).toEqual(['sphere_pal']);
    expect(ids(s, { category: 'material' })).toEqual(['wood']);
    expect(ids(s, { usedOnly: true })).toEqual(['red_berries', 'wood']);   // spheres are consumed by catching, not recipes
    const all = filterItems(s, f({ showMissing: true }));
    expect(all).toHaveLength(ITEMS.length);
    expect(all.find((i) => i.def.id === 'ingot')?.count).toBe(0);
    expect(ids(s, { showMissing: true, category: 'sphere' })).toHaveLength(6);
  });

  it('sorts by count and category', () => {
    const s = newState();
    s.inventory.wood = 100;
    expect(ids(s, { sort: 'count' })).toEqual(['wood', 'red_berries', 'sphere_pal']);
    expect(ids(s, { sort: 'category' })).toEqual(['sphere_pal', 'wood', 'red_berries']);
  });
});

describe('medical supplies merge (v19)', () => {
  it('folds the duplicate wiki drop into the Medicine consumable', () => {
    const v18 = { ...newState(), version: 18 } as Record<string, unknown>;
    v18.inventory = { low_grade_medical: 3, low_grade_medical_supplies: 4, wood: 1 };
    const s = migrate(v18)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.inventory).toEqual({ low_grade_medical: 7, wood: 1 });
    expect(ITEMS.filter((i) => i.name === 'Low Grade Medical Supplies')).toHaveLength(1);
    expect(itemInfo('low_grade_medical', 0).sources).toEqual(expect.arrayContaining(['Medicine', 'Lifmunk']));
  });
});
