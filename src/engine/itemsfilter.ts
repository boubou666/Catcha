import type { ItemDef, SaveState } from '../data/types';
import { ITEMS, itemById } from '../data/items';
import { PALS } from '../data/pals';
import { RECIPES, STRUCTURES } from '../data/base';
import { SPHERES } from '../data/spheres';

export type ItemCategory = ItemDef['category'];
export type ItemsSort = 'name' | 'count' | 'category';

export interface ItemsFilter {
  query: string;
  category: ItemCategory | 'any';
  usedOnly: boolean;      // only items some recipe or structure consumes
  showMissing: boolean;   // include known items you have none of
  sort: ItemsSort;
}

export const DEFAULT_ITEMS_FILTER: ItemsFilter = { query: '', category: 'any', usedOnly: false, showMissing: false, sort: 'name' };
export const CATEGORY_LABEL: Record<ItemCategory, string> = { sphere: 'Spheres', material: 'Materials', food: 'Food', consumable: 'Consumables' };
export const ITEMS_SORT_LABEL: Record<ItemsSort, string> = { name: 'Name', count: 'Count', category: 'Category' };

export interface ItemInfo {
  def: ItemDef;
  count: number;
  sources: string[];      // Pals that drop or farm it, base jobs, the merchant
  uses: string[];         // recipes and structures that consume it
}

const BASE_JOBS: Record<string, string> = { wood: 'Lumbering', stone: 'Mining', ore: 'Mining', paldium: 'Mining', ingot: 'Kindling (from Ore)', red_berries: 'Berry Plantation', low_grade_medical: 'Medicine' };

/** Static "where from / used for" text per item, computed once. */
const INFO: Map<string, { sources: string[]; uses: string[] }> = (() => {
  const m = new Map<string, { sources: string[]; uses: string[] }>();
  const get = (id: string) => { let e = m.get(id); if (!e) { e = { sources: [], uses: [] }; m.set(id, e); } return e; };
  for (const [id, job] of Object.entries(BASE_JOBS)) get(id).sources.push(job);
  for (const s of Object.values(SPHERES)) if (s.price !== null) get(s.itemId).sources.push('Merchant');
  for (const r of RECIPES) {
    if (r.output.kind === 'item') get(r.output.itemId).sources.push(`Craft: ${r.name}`);
    for (const id of Object.keys(r.inputs)) get(id).uses.push(r.name);
  }
  for (const s of STRUCTURES) for (const id of new Set(s.costs.flatMap((c) => Object.keys(c)))) get(id).uses.push(s.name);
  for (const p of PALS) {
    if (p.farmDrop) get(p.farmDrop.itemId).sources.push(`${p.name} (Ranch)`);
    for (const d of p.drops) get(d.itemId).sources.push(p.name);
  }
  for (const e of m.values()) { e.sources = [...new Set(e.sources)]; e.uses = [...new Set(e.uses)]; }
  return m;
})();

export function itemInfo(id: string, count: number): ItemInfo {
  const info = INFO.get(id) ?? { sources: [], uses: [] };
  return { def: itemById(id), count, sources: info.sources, uses: info.uses };
}

export function isItemsFiltering(f: ItemsFilter): boolean {
  return f.query.trim() !== '' || f.category !== 'any' || f.usedOnly || f.showMissing;
}

/** Every word must match the item name, category, a source or a use. */
function matches(info: ItemInfo, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [info.def.name, CATEGORY_LABEL[info.def.category], ...info.sources, ...info.uses].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function filterItems(save: SaveState, f: ItemsFilter): ItemInfo[] {
  const known = new Set(ITEMS.map((i) => i.id));
  const ids = f.showMissing
    ? ITEMS.map((i) => i.id)
    : Object.entries(save.inventory).filter(([id, n]) => n > 0 && known.has(id)).map(([id]) => id);
  return ids
    .map((id) => itemInfo(id, save.inventory[id] ?? 0))
    .filter((it) => (f.category === 'any' || it.def.category === f.category) && (!f.usedOnly || it.uses.length > 0) && matches(it, f.query))
    .sort(comparator(f.sort));
}

const CAT_ORDER: ItemCategory[] = ['sphere', 'material', 'food', 'consumable'];
function comparator(sort: ItemsSort): (a: ItemInfo, b: ItemInfo) => number {
  const byName = (a: ItemInfo, b: ItemInfo) => a.def.name.localeCompare(b.def.name);
  switch (sort) {
    case 'name': return byName;
    case 'count': return (a, b) => b.count - a.count || byName(a, b);
    case 'category': return (a, b) => CAT_ORDER.indexOf(a.def.category) - CAT_ORDER.indexOf(b.def.category) || byName(a, b);
  }
}
