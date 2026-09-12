import type { SaveState } from '../data/types';

/** Costs are item maps; the key 'gold' means player gold. */
export type Cost = Record<string, number>;

export const GOLD = 'gold';

/** Add gold to the wallet and to the lifetime tally. */
export function earnGold(save: SaveState, n: number): void {
  if (n <= 0) return;
  save.player.gold += n;
  save.stats.goldEarned += n;
}

/** Give n of an item. Gold Coins (Mau's produce) go straight to the wallet. */
export function addItem(save: SaveState, itemId: string, n: number): void {
  if (n <= 0) return;
  if (itemId === 'gold_coin' || itemId === GOLD) {
    earnGold(save, n);
    return;
  }
  save.inventory[itemId] = (save.inventory[itemId] ?? 0) + n;
}

export function countOf(save: SaveState, itemId: string): number {
  return itemId === GOLD ? save.player.gold : (save.inventory[itemId] ?? 0);
}

export function canAfford(save: SaveState, cost: Cost, times = 1): boolean {
  return Object.entries(cost).every(([id, n]) => countOf(save, id) >= n * times);
}

/** Deduct a cost; returns false (and changes nothing) if unaffordable. */
export function spend(save: SaveState, cost: Cost, times = 1): boolean {
  if (!canAfford(save, cost, times)) return false;
  for (const [id, n] of Object.entries(cost)) {
    if (id === GOLD) save.player.gold -= n * times;
    else save.inventory[id] -= n * times;
  }
  return true;
}
