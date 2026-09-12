import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { buy, canBuy, DEFAULT_SHOP_FILTER, filterSellable, filterStock, isShopFiltering, sell, sellPrice, type ShopFilter } from './shop';
import { STOCK, SELL_SHARE } from '../data/shop';
import { ITEMS } from '../data/items';

const f = (over: Partial<ShopFilter>): ShopFilter => ({ ...DEFAULT_SHOP_FILTER, ...over });

describe('merchant', () => {
  it('stocks only known items and sells them back at a quarter', () => {
    const known = new Set(ITEMS.map((i) => i.id));
    expect(STOCK.every((s) => known.has(s.itemId))).toBe(true);
    expect(new Set(STOCK.map((s) => s.itemId)).size).toBe(STOCK.length);
    expect(sellPrice('sphere_pal')).toBe(Math.round(40 * SELL_SHARE));
    expect(sellPrice('wool')).toBe(6);
    expect(sellPrice('slab_bellanoir')).toBeNull();
  });

  it('buys with gold when unlocked and affordable, tracking gold spent', () => {
    const s = newState();
    s.player.gold = 100;
    expect(canBuy(s, 'sphere_pal')).toBe(true);
    expect(canBuy(s, 'wood')).toBe(false);                  // needs Fort Ruins
    expect(buy(s, 'wood', 1)).toBe(0);
    expect(buy(s, 'sphere_pal', 2)).toBe(2);
    expect(s.player.gold).toBe(20);
    expect(s.inventory.sphere_pal).toBe(22);
    expect(s.stats.goldSpent).toBe(80);
    expect(buy(s, 'sphere_pal', 1)).toBe(0);                // 20 < 40
    s.progress.routeKills.fort = 999;
    expect(buy(s, 'red_berries', 4)).toBe(4);
    expect(canBuy(s, 'wood')).toBe(true);
  });

  it('sells clamped to what you have and counts the gold as earned', () => {
    const s = newState();
    s.inventory.wool = 3;
    expect(sell(s, 'wool', 10)).toBe(18);
    expect(s.inventory.wool).toBe(0);
    expect(s.player.gold).toBe(18);
    expect(s.stats.goldEarned).toBe(18);
    expect(sell(s, 'wool', 1)).toBe(0);
    expect(sell(s, 'slab_fragment', 1)).toBe(0);
  });

  it('filters the stock by text, category, lock state and affordability', () => {
    const s = newState();
    s.player.gold = 50;
    expect(filterStock(s, DEFAULT_SHOP_FILTER).map((r) => r.itemId)).toEqual(STOCK.map((x) => x.itemId));
    expect(isShopFiltering(DEFAULT_SHOP_FILTER)).toBe(false);
    expect(filterStock(s, f({ query: 'sphere' })).every((r) => r.itemId.startsWith('sphere_'))).toBe(true);
    expect(filterStock(s, f({ category: 'food' })).map((r) => r.itemId)).toEqual(['red_berries', 'cake']);
    expect(filterStock(s, f({ hideLocked: true })).map((r) => r.itemId)).toEqual(['sphere_pal', 'red_berries']);
    expect(filterStock(s, f({ affordable: true })).map((r) => r.itemId)).toEqual(['sphere_pal', 'red_berries']);
    s.player.gold = 4;
    expect(filterStock(s, f({ affordable: true }))).toEqual([]);
    const byPrice = filterStock(s, f({ sort: 'price' })).map((r) => r.price);
    expect(byPrice).toEqual([...byPrice].sort((a, b) => a - b));
  });

  it('lists sellable inventory by name, skipping what the merchant refuses', () => {
    const s = newState();                                    // 20 spheres, 30 berries
    s.inventory.wool = 2; s.inventory.slab_fragment = 5; s.inventory.wood = 0;
    expect(filterSellable(s, DEFAULT_SHOP_FILTER).map((r) => r.itemId)).toEqual(['sphere_pal', 'red_berries', 'wool']);
    expect(filterSellable(s, f({ category: 'material' })).map((r) => r.itemId)).toEqual(['wool']);
    expect(filterSellable(s, f({ query: 'berr' })).map((r) => r.itemId)).toEqual(['red_berries']);
    expect(filterSellable(s, f({ sort: 'price' })).map((r) => r.itemId)).toEqual(['red_berries', 'wool', 'sphere_pal']);
  });
});
