/**
 * Rival duels: three of the region's Pals in a row, each on a 90-second clock, none catchable. Win all three
 * for gold, a prize and a higher tier next time (levels climb, HP grows); the rival is back after a cooldown
 * either way. State lives in progress.rivals.
 */
import type { SaveState } from '../data/types';
import { regionById } from '../data/regions';
import { palById } from '../data/pals';
import { rivalById, type RivalDef } from '../data/rivals';
import { wildHp } from './formulas';
import { isUnlocked } from './progress';
import { earnGold, addItem } from './inventory';
import type { Rng, Wild } from './combat';

export interface RivalState { tier: number; wins: number; readyAt: number }   // readyAt in play seconds
export interface Duel { rivalId: string; team: { palId: number; level: number }[]; index: number }

export const DUEL_TEAM = 3;
export const DUEL_ROUND_SEC = 90;
export const DUEL_COOLDOWN_SEC = 30 * 60;
export const DUEL_HP_MULT = 3;
export const DUEL_TIER_HP = 0.2;     // +20% HP per tier
export const DUEL_TIER_LEVEL = 2;

export interface RivalInfo { tier: number; wins: number; ready: boolean; secondsLeft: number; level: number; gold: number; open: boolean }

export function rivalInfo(save: SaveState, r: RivalDef, now = save.stats.playSeconds): RivalInfo {
  const st = save.progress.rivals[r.id];
  const tier = st?.tier ?? 0;
  const secondsLeft = Math.max(0, (st?.readyAt ?? 0) - now);
  const region = regionById(r.regionId);
  const level = region.routes[region.routes.length - 1].level + DUEL_TIER_LEVEL * tier;
  return { tier, wins: st?.wins ?? 0, ready: secondsLeft <= 0, secondsLeft, level, gold: r.reward.gold * (1 + tier), open: isUnlocked(save, r.unlock) };
}

/** Pick the team: the three hardest-hitting species on the region's routes, at the rival's level. */
export function rollTeam(save: SaveState, r: RivalDef, rand: Rng = Math.random): Duel['team'] {
  const region = regionById(r.regionId);
  const ids = [...new Set(region.routes.flatMap((rt) => rt.spawns.map((s) => s.palId)))];
  const strong = ids.map((id) => palById(id)).sort((a, b) => b.baseAttack - a.baseAttack).slice(0, 6);
  const team: Duel['team'] = [];
  const pool = [...strong];
  const { level } = rivalInfo(save, r);
  while (team.length < DUEL_TEAM && pool.length) {
    const [def] = pool.splice(Math.floor(rand() * pool.length), 1);
    team.push({ palId: def.id, level });
  }
  return team;
}

/** The arena opponent for the duel's current round. */
export function duelOpponent(save: SaveState, duel: Duel, now = Date.now()): Wild {
  const { palId, level } = duel.team[duel.index];
  const tier = save.progress.rivals[duel.rivalId]?.tier ?? 0;
  const hp = Math.round(wildHp(level) * DUEL_HP_MULT * (1 + DUEL_TIER_HP * tier));
  return { palId, level, hp, maxHp: hp, lucky: false, kind: 'duel', refId: duel.rivalId, deadlineAt: now + DUEL_ROUND_SEC * 1000 };
}

/** After the last opponent falls: pay out and raise the tier. */
export function winDuel(save: SaveState, rivalId: string): { gold: number; prize: { itemId: string; n: number }; tier: number } {
  const r = rivalById(rivalId);
  const info = rivalInfo(save, r);
  earnGold(save, info.gold);
  addItem(save, r.reward.prize.itemId, r.reward.prize.n);
  const st = save.progress.rivals[rivalId] ?? { tier: 0, wins: 0, readyAt: 0 };
  save.progress.rivals[rivalId] = { tier: st.tier + 1, wins: st.wins + 1, readyAt: save.stats.playSeconds + DUEL_COOLDOWN_SEC };
  save.stats.duelsWon += 1;
  return { gold: info.gold, prize: r.reward.prize, tier: info.tier };
}

/** Time ran out or you fled: the rival leaves for the cooldown, tier unchanged. */
export function loseDuel(save: SaveState, rivalId: string): void {
  const st = save.progress.rivals[rivalId] ?? { tier: 0, wins: 0, readyAt: 0 };
  save.progress.rivals[rivalId] = { ...st, readyAt: save.stats.playSeconds + DUEL_COOLDOWN_SEC };
  save.stats.duelsLost += 1;
}
