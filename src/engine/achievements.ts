import type { SaveState } from '../data/types';
import { ACHIEVEMENTS, POINT_GOLD_BONUS, type AchievementDef } from '../data/achievements';

export function newStats(): SaveState['stats'] {
  return {
    defeated: 0, clicks: 0, caught: 0, luckyCaught: 0, hatched: 0, luckyHatched: 0, crafted: 0, expeditions: 0,
    goldEarned: 0, goldSpent: 0, playSeconds: 0, throws: 0, condensed: 0, luckyDefeated: 0, chanceSum: 0, ratedThrows: 0, baseRaidsRepelled: 0, baseRaidsLost: 0,
    defeatedByElement: {}, defeatedByKind: {}, throwsByTier: {}, caughtByTier: {},
  };
}

export function isUnlocked(save: SaveState, id: string): boolean {
  return save.achievements.includes(id);
}

/** Current progress toward an achievement, clamped to its goal. */
export function progressOf(save: SaveState, def: AchievementDef): number {
  return Math.min(def.goal, def.metric(save));
}

/** Unlock everything whose metric has reached its goal. Returns the newly unlocked definitions. */
export function checkAchievements(save: SaveState): AchievementDef[] {
  const fresh: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (save.achievements.includes(def.id)) continue;
    if (def.metric(save) >= def.goal) {
      save.achievements.push(def.id);
      fresh.push(def);
    }
  }
  return fresh;
}

export function achievementPoints(save: SaveState): number {
  let n = 0;
  for (const id of save.achievements) {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (def) n += def.points;
  }
  return n;
}

export const totalPoints = ACHIEVEMENTS.reduce((n, a) => n + a.points, 0);

/** Gold multiplier from achievement points. */
export function achievementGoldMult(save: SaveState): number {
  return 1 + POINT_GOLD_BONUS * achievementPoints(save);
}
