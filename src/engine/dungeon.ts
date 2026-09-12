import type { SaveState } from '../data/types';
import { dungeonById, type DungeonDef } from '../data/dungeons';
import { palById } from '../data/pals';
import { pickWeighted, type Rng, type Wild } from './combat';
import { wildHp } from './formulas';
import { addItem } from './inventory';
import { isUnlocked } from './progress';

/** Live state of a run. Not saved — leaving the page forfeits the run (loot already granted stays). */
export interface DungeonRun {
  id: string;
  wave: number;            // 0-based index of the wave currently up; === waves means the boss
  deadlineAt: number;      // epoch ms
  gold: number;            // tallied for the end-of-run log line
  items: Record<string, number>;
}

export function dungeonClears(save: SaveState, id: string): number {
  return save.progress.dungeons[id] ?? 0;
}

export function dungeonUnlocked(save: SaveState, id: string): boolean {
  return isUnlocked(save, dungeonById(id).unlock);
}

export function startRun(id: string, now = Date.now()): DungeonRun {
  const def = dungeonById(id);
  return { id, wave: 0, deadlineAt: now + def.timeLimitSec * 1000, gold: 0, items: {} };
}

export function isBossWave(run: DungeonRun): boolean {
  return run.wave >= dungeonById(run.id).waves;
}

/** The Pal for the run's current wave (or the boss). */
export function spawnFor(run: DungeonRun, rand: Rng = Math.random): Wild {
  const def = dungeonById(run.id);
  if (isBossWave(run)) {
    const level = def.level + 2;
    const hp = wildHp(level) * def.boss.hpMult;
    return { palId: def.boss.palId, level, hp, maxHp: hp, lucky: false, kind: 'dungeonBoss', refId: def.id, deadlineAt: run.deadlineAt };
  }
  const { palId } = pickWeighted(def.pool, rand);
  const hp = wildHp(def.level) * def.waveHpMult;
  return { palId, level: def.level, hp, maxHp: hp, lucky: false, kind: 'dungeon', refId: def.id, deadlineAt: run.deadlineAt };
}

export interface Chest { gold: number; items: Record<string, number>; effigies: number }

/** Grant the clear: loot chest, first-clear effigies, clear count. */
export function completeRun(save: SaveState, def: DungeonDef, rand: Rng = Math.random): Chest {
  const first = dungeonClears(save, def.id) === 0;
  const chest: Chest = { gold: def.loot.gold, items: {}, effigies: first ? def.firstClear.effigies : 0 };
  save.player.gold += chest.gold;
  for (const drop of def.loot.items) {
    if (rand() < drop.chance) {
      const n = drop.min + Math.floor(rand() * (drop.max - drop.min + 1));
      chest.items[drop.itemId] = (chest.items[drop.itemId] ?? 0) + n;
      addItem(save, drop.itemId, n);
    }
  }
  save.player.effigies += chest.effigies;
  save.progress.dungeons[def.id] = dungeonClears(save, def.id) + 1;
  return chest;
}

export function describeChest(chest: Chest, itemName: (id: string) => string): string {
  const parts = [`${chest.gold.toLocaleString()} gold`];
  for (const [id, n] of Object.entries(chest.items)) parts.push(`${n} ${itemName(id)}`);
  if (chest.effigies) parts.push(`${chest.effigies} Effigies (first clear)`);
  return parts.join(', ');
}

export const bossName = (id: string) => palById(dungeonById(id).boss.palId).name;
