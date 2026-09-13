/**
 * The daily challenge route: one unlocked route per day gets a modifier — more Lucky Pals, double gold, tough
 * Pals with double exp, or a loot day with no throws — and a reward for a set number of defeats there. The
 * route and modifier are drawn from the day key, so everyone sees the same challenge and a reload cannot
 * re-roll it; progress lives in the save and resets with the daily quests.
 */
import type { SaveState } from '../data/types';
import { REGIONS, routeById } from '../data/regions';
import type { RouteDef } from '../data/types';
import { isUnlocked } from './progress';
import { dayKey } from './daily';

export type ChallengeMod = 'lucky' | 'gold' | 'tough' | 'loot';
export const CHALLENGE_GOAL = 30;
export const CHALLENGE_REWARD = { gold: 2_000, effigies: 1 };

export interface ChallengeMods { luckyMult: number; goldMult: number; hpMult: number; expMult: number; dropMult: number; noCatch: boolean }
export const MODS: Record<ChallengeMod, ChallengeMods> = {
  lucky: { luckyMult: 10, goldMult: 1, hpMult: 1, expMult: 1, dropMult: 1, noCatch: false },
  gold: { luckyMult: 1, goldMult: 2, hpMult: 1, expMult: 1, dropMult: 1, noCatch: false },
  tough: { luckyMult: 1, goldMult: 1, hpMult: 2, expMult: 2, dropMult: 1, noCatch: false },
  loot: { luckyMult: 1, goldMult: 1, hpMult: 1, expMult: 1, dropMult: 3, noCatch: true },
};
export const MOD_LABEL: Record<ChallengeMod, string> = {
  lucky: 'Lucky day — Lucky Pals ×10 as common',
  gold: 'Gold rush — double gold',
  tough: 'Tough crowd — Pals have double HP and give double exp',
  loot: 'Loot day — triple drops, but no sphere is thrown',
};

export interface Challenge { day: string; route: RouteDef; mod: ChallengeMod; kills: number; claimed: boolean; goal: number }

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Today's challenge, or null before any second route is open (the Plateau alone would be no challenge). */
export function todaysChallenge(save: SaveState, now = Date.now()): Challenge | null {
  const day = dayKey(now, save.settings.dailyReset);
  const open = REGIONS.flatMap((r) => r.routes).filter((r) => isUnlocked(save, r.unlock));
  if (open.length < 2) return null;
  const h = hash(day);
  const route = open[h % open.length];
  const mods = Object.keys(MODS) as ChallengeMod[];
  const mod = mods[(h >>> 8) % mods.length];
  const p = save.progress.challenge;
  const kills = p?.day === day ? p.kills : 0;
  const claimed = p?.day === day ? p.claimed : false;
  return { day, route, mod, kills, claimed, goal: CHALLENGE_GOAL };
}

/** The modifiers in force on the current route, or null when it is not today's challenge route. */
export function activeMods(save: SaveState, now = Date.now()): ChallengeMods | null {
  const c = todaysChallenge(save, now);
  return c && c.route.id === save.progress.route ? MODS[c.mod] : null;
}

/** Count a defeat on the challenge route; returns true when this defeat completes the goal. */
export function countChallengeKill(save: SaveState, now = Date.now()): boolean {
  const c = todaysChallenge(save, now);
  if (!c || c.route.id !== save.progress.route) return false;
  const p = save.progress.challenge?.day === c.day ? save.progress.challenge : { day: c.day, kills: 0, claimed: false };
  p.kills += 1;
  save.progress.challenge = p;
  return p.kills === CHALLENGE_GOAL && !p.claimed;
}

/** Hand out the reward for a finished challenge; returns false when not finished or already claimed. */
export function claimChallenge(save: SaveState, now = Date.now()): boolean {
  const c = todaysChallenge(save, now);
  if (!c || c.kills < c.goal || c.claimed) return false;
  save.progress.challenge = { day: c.day, kills: c.kills, claimed: true };
  save.player.gold += CHALLENGE_REWARD.gold;
  save.stats.goldEarned += CHALLENGE_REWARD.gold;
  save.player.effigies += CHALLENGE_REWARD.effigies;
  save.stats.challengesDone += 1;
  return true;
}

export const challengeRouteName = (c: Challenge) => routeById(c.route.id).name;
