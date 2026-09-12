import type { SaveState } from '../data/types';
import { ITEMS, itemById } from '../data/items';
import { SELL_PRICES, SELL_SHARE, STOCK, type StockDef } from '../data/shop';
import { countOf, earnGold, spend } from './inventory';
import { isUnlocked } from './progress';
import { CATEGORY_LABEL, type ItemCategory } from './itemsfilter';

export const stockById = (itemId: string): StockDef | undefined => STOCK.find((s) => s.itemId === itemId);

export function canBuy(save: SaveState, itemId: string): boolean {
  const s = stockById(itemId);
  return !!s && isUnlocked(save, s.unlock);
}

/** Buy n of an item; returns how many were bought (0 if locked or unaffordable). */
export function buy(save: SaveState, itemId: string, n: number): number {
  const s = stockById(itemId);
  if (!s || n <= 0 || !canBuy(save, itemId)) return 0;
  if (!spend(save, { gold: s.price * n })) return 0;
  save.inventory[itemId] = (save.inventory[itemId] ?? 0) + n;
  return n;
}

/** Gold the merchant pays per unit, or null for things it won't take. */
export function sellPrice(itemId: string): number | null {
  const s = stockById(itemId);
  if (s) return Math.max(1, Math.round(s.price * SELL_SHARE));
  return SELL_PRICES[itemId] ?? null;
}

/** Sell up to n (clamped to stock); returns gold received. */
export function sell(save: SaveState, itemId: string, n: number): number {
  const price = sellPrice(itemId);
  const have = countOf(save, itemId);
  const qty = Math.min(n, have);
  if (price === null || qty <= 0) return 0;
  save.inventory[itemId] = have - qty;
  const gold = price * qty;
  earnGold(save, gold);
  return gold;
}

// ---- listing & filtering ----------------------------------------------------------

export type ShopSort = 'default' | 'price' | 'name';
export interface ShopFilter {
  query: string;
  category: ItemCategory | 'any';
  affordable: boolean;      // buy: can afford at least one; sell: have at least one (always true there)
  hideLocked: boolean;
  sort: ShopSort;
}
export const DEFAULT_SHOP_FILTER: ShopFilter = { query: '', category: 'any', affordable: false, hideLocked: false, sort: 'default' };
export const SHOP_SORT_LABEL: Record<ShopSort, string> = { default: 'Default', price: 'Price', name: 'Name' };

export interface StockRow { itemId: string; name: string; category: ItemCategory; price: number; unlocked: boolean; unlock: StockDef['unlock']; owned: number }
export interface SellRow { itemId: string; name: string; category: ItemCategory; price: number; owned: number }

export function isShopFiltering(f: ShopFilter): boolean {
  return f.query.trim() !== '' || f.category !== 'any' || f.affordable || f.hideLocked;
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const textMatch = (ws: string[], ...parts: string[]) => ws.every((w) => parts.join(' ').toLowerCase().includes(w));

export function filterStock(save: SaveState, f: ShopFilter): StockRow[] {
  const ws = words(f.query);
  const rows = STOCK.map((s, i) => {
    const def = itemById(s.itemId);
    return { i, row: { itemId: s.itemId, name: def.name, category: def.category, price: s.price, unlocked: isUnlocked(save, s.unlock), unlock: s.unlock, owned: countOf(save, s.itemId) } as StockRow };
  }).filter(({ row }) => {
    if (f.category !== 'any' && row.category !== f.category) return false;
    if (f.hideLocked && !row.unlocked) return false;
    if (f.affordable && (!row.unlocked || save.player.gold < row.price)) return false;
    return textMatch(ws, row.name, CATEGORY_LABEL[row.category]);
  });
  sortRows(rows, f.sort);
  return rows.map((r) => r.row);
}

/** Everything in the inventory the merchant will buy. */
export function filterSellable(save: SaveState, f: ShopFilter): SellRow[] {
  const ws = words(f.query);
  const rows = Object.entries(save.inventory)
    .filter(([itemId, n]) => n > 0 && KNOWN.has(itemId))
    .flatMap(([itemId, owned], i) => {
      const price = sellPrice(itemId);
      if (price === null) return [];
      const def = itemById(itemId);
      return [{ i, row: { itemId, name: def.name, category: def.category, price, owned } as SellRow }];
    })
    .filter(({ row }) => (f.category === 'any' || row.category === f.category) && textMatch(ws, row.name, CATEGORY_LABEL[row.category]));
  sortRows(rows, f.sort === 'default' ? 'name' : f.sort);   // inventory order means nothing to the player
  return rows.map((r) => r.row);
}

const KNOWN = new Set(ITEMS.map((i) => i.id));

function sortRows<T extends { name: string; price: number }>(rows: { i: number; row: T }[], sort: ShopSort): void {
  switch (sort) {
    case 'default': rows.sort((a, b) => a.i - b.i); break;
    case 'price': rows.sort((a, b) => a.row.price - b.row.price || a.row.name.localeCompare(b.row.name)); break;
    case 'name': rows.sort((a, b) => a.row.name.localeCompare(b.row.name)); break;
  }
}

