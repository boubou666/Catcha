import type { RouteDef, SaveState } from '../data/types';
import { palById } from '../data/pals';
import { elementMult } from '../data/elements';
import { partyInstances, grantExp } from './party';
import { addItem } from './inventory';
import { techMult } from './tech';
import { expReward, goldReward, instanceAttack, LUCKY_CHANCE, LUCKY_HP_MULT, wildHp } from './formulas';

export type Rng = () => number;

export interface Wild {
  palId: number;
  level: number;
  hp: number;
  maxHp: number;
  lucky: boolean;
  kind: 'wild' | 'alpha' | 'tower' | 'dungeon' | 'dungeonBoss' | 'raid';
  refId?: string;      // alpha / tower id
  deadlineAt?: number; // epoch ms, tower time limit
}

export function pickWeighted<T extends { weight: number }>(list: T[], rand: Rng): T {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = rand() * total;
  for (const x of list) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

export function spawnWild(route: RouteDef, rand: Rng = Math.random): Wild {
  const { palId } = pickWeighted(route.spawns, rand);
  const level = Math.max(1, route.level + Math.floor(rand() * 3) - 1);
  const lucky = rand() < LUCKY_CHANCE;
  const maxHp = wildHp(level) * (lucky ? LUCKY_HP_MULT : 1);
  return { palId, level, hp: maxHp, maxHp, lucky, kind: 'wild' };
}

export function spawnBoss(
  palId: number, level: number, hp: number, kind: 'alpha' | 'tower', refId: string, deadlineAt?: number,
): Wild {
  return { palId, level, hp, maxHp: hp, lucky: false, kind, refId, deadlineAt };
}

export function partyDps(save: SaveState, wild: Wild): number {
  const target = palById(wild.palId).elements;
  let dps = 0;
  for (const inst of partyInstances(save)) {
    dps += instanceAttack(inst) * elementMult(palById(inst.palId).elements, target);
  }
  return dps * techMult(save, 'attack');
}

export interface DefeatSummary {
  gold: number;
  exp: number;
  drops: Record<string, number>;
}

/** Apply gold / exp / item drops / Paldeck "seen" for a defeated Pal. */
export function applyDefeat(save: SaveState, wild: Wild, rand: Rng = Math.random): DefeatSummary {
  const def = palById(wild.palId);
  const bossMult = { wild: 1, dungeon: 2, alpha: 10, dungeonBoss: 12, tower: 25, raid: 40 }[wild.kind];
  const luckyMult = wild.lucky ? 5 : 1;

  const gold = Math.round(goldReward(wild.level) * bossMult * luckyMult * techMult(save, 'gold'));
  const exp = Math.round(expReward(wild.level) * bossMult * luckyMult * techMult(save, 'exp'));
  save.player.gold += gold;
  grantExp(save, exp);

  const drops: Record<string, number> = {};
  for (const drop of def.drops) {
    if (rand() < drop.chance) {
      const n = drop.min + Math.floor(rand() * (drop.max - drop.min + 1));
      drops[drop.itemId] = (drops[drop.itemId] ?? 0) + n;
      addItem(save, drop.itemId, n);
    }
  }

  const entry = (save.paldeck[wild.palId] ??= { seen: false, caught: 0 });
  entry.seen = true;

  return { gold, exp, drops };
}
