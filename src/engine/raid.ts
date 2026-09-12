import type { SaveState } from '../data/types';
import { ALTAR, raidById, type RaidDef } from '../data/raids';
import { INCUBATION_SEC } from './breeding';
import { palById } from '../data/pals';
import { passiveById } from '../data/passives';
import { addItem, countOf } from './inventory';
import { isUnlocked } from './progress';
import type { Rng, Wild } from './combat';
import { inheritFromParents } from './passives';
import { partyInstances } from './party';

const passiveName = (id: string) => passiveById(id).name;

export function raidWins(save: SaveState, id: string): number {
  return save.progress.raids[id] ?? 0;
}

export type SummonBlock = 'no-altar' | 'locked' | 'no-slab';

export function summonBlocker(save: SaveState, id: string): SummonBlock | null {
  const def = raidById(id);
  if (!(save.base.structures[ALTAR] > 0)) return 'no-altar';
  if (!isUnlocked(save, def.unlock)) return 'locked';
  if (countOf(save, def.slabItemId) < 1) return 'no-slab';
  return null;
}

/** Consume the slab and produce the boss. The slab is gone whether or not you win. */
export function summon(save: SaveState, id: string, now = Date.now()): Wild | null {
  if (summonBlocker(save, id)) return null;
  const def = raidById(id);
  save.inventory[def.slabItemId] -= 1;
  return { palId: def.palId, level: def.level, hp: def.hp, maxHp: def.hp, lucky: false, kind: 'raid', refId: id, deadlineAt: now + def.timeLimitSec * 1000 };
}

export interface RaidChest { gold: number; items: Record<string, number>; egg: boolean; passives: string[]; lucky: boolean }

/** Grant the win: chest, the boss's egg (inheriting passives from the winning party), win count. */
export function completeRaid(save: SaveState, def: RaidDef, rand: Rng = Math.random): RaidChest {
  const chest: RaidChest = { gold: def.reward.gold, items: {}, egg: def.reward.egg, passives: [], lucky: false };
  save.player.gold += chest.gold;
  for (const drop of def.reward.items) {
    if (rand() < drop.chance) {
      const n = drop.min + Math.floor(rand() * (drop.max - drop.min + 1));
      chest.items[drop.itemId] = (chest.items[drop.itemId] ?? 0) + n;
      addItem(save, drop.itemId, n);
    }
  }
  if (def.reward.egg) {
    const boss = palById(def.palId);
    chest.lucky = rand() < def.luckyChance;
    chest.passives = inheritFromParents(partyInstances(save), boss, rand, chest.lucky);
    save.base.eggs.push({ palId: def.palId, remaining: INCUBATION_SEC[boss.rarity], passives: chest.passives, lucky: chest.lucky });
  }
  save.progress.raids[def.id] = raidWins(save, def.id) + 1;
  return chest;
}

export function describeRaidChest(chest: RaidChest, bossName: string, itemName: (id: string) => string): string {
  const parts = [`${chest.gold.toLocaleString()} gold`];
  for (const [id, n] of Object.entries(chest.items)) parts.push(`${n} ${itemName(id)}`);
  if (chest.egg) parts.push(`a ${chest.lucky ? '✨ Lucky ' : ''}${bossName} egg${chest.passives.length ? ` (${chest.passives.map(passiveName).join(', ')})` : ''}`);
  return parts.join(', ');
}
