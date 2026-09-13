/**
 * Alpha rematches. Once beaten, an Alpha goes on a cooldown (play time) and comes back one tier stronger each
 * time: more HP, higher level, a bigger gold purse — and, since it is a boss-level wild Pal, a fresh throw.
 */
import type { AlphaDef, SaveState } from '../data/types';
import { wildHp } from './formulas';

export interface RematchState { tier: number; readyAt: number }   // tier 1 = first rematch; readyAt in stats.playSeconds

export const REMATCH_COOLDOWN_SEC = 60 * 60;   // an hour of play
export const REMATCH_HP_STEP = 0.25;           // +25% HP per tier
export const REMATCH_LEVEL_STEP = 1;
export const REMATCH_GOLD_STEP = 1;            // gold × (1 + tier)

export interface RematchInfo {
  beaten: boolean;
  tier: number;              // 0 before the first win
  ready: boolean;            // can be fought now
  secondsLeft: number;       // until ready (0 when ready)
  level: number;
  hp: number;
  gold: number;
}

export function rematchInfo(save: SaveState, alpha: AlphaDef): RematchInfo {
  const beaten = save.progress.alphas.includes(alpha.id);
  const st = save.progress.alphaRematch[alpha.id];
  const tier = beaten ? (st?.tier ?? 1) : 0;
  const readyAt = st?.readyAt ?? 0;
  const secondsLeft = beaten ? Math.max(0, readyAt - save.stats.playSeconds) : 0;
  return {
    beaten, tier, ready: !beaten || secondsLeft <= 0, secondsLeft,
    level: alpha.level + REMATCH_LEVEL_STEP * tier,
    hp: Math.round(wildHp(alpha.level + REMATCH_LEVEL_STEP * tier) * alpha.hpMult * (1 + REMATCH_HP_STEP * tier)),
    gold: alpha.reward.gold * (1 + REMATCH_GOLD_STEP * tier),
  };
}

/** After a win: the first one marks the Alpha beaten; every win starts the cooldown and raises the next tier. */
export function recordAlphaWin(save: SaveState, alphaId: string): { first: boolean; tier: number } {
  const first = !save.progress.alphas.includes(alphaId);
  if (first) save.progress.alphas.push(alphaId);
  const prev = save.progress.alphaRematch[alphaId]?.tier ?? (first ? 0 : 1);
  const tier = first ? 1 : prev + 1;
  save.progress.alphaRematch[alphaId] = { tier, readyAt: save.stats.playSeconds + REMATCH_COOLDOWN_SEC };
  return { first, tier: first ? 0 : prev };
}

export function fmtCooldown(sec: number): string {
  const m = Math.ceil(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}
