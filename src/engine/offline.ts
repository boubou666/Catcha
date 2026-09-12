import type { SaveState } from '../data/types';
import { tickWorld } from './tick';

export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_MIN_MS = 10_000;     // shorter gaps aren't worth a report
export const OFFLINE_STEP_SEC = 60;       // chunk size so hunger / ore shortages kick in mid-way

export interface OfflineReport {
  elapsedMs: number;                      // simulated time (after the cap)
  capped: boolean;
  gold: number;                           // delta
  items: Record<string, number>;          // delta per item, positive or negative
  crafted: number;                        // queue entries completed
  hatched: number[];                      // Paldeck ids that hatched
  weaponTier?: number;                    // set if a weapon finished
}

/**
 * Catch the base up on time spent away. Combat does not run offline (by design — see DESIGN.md §2).
 * Returns null when nothing meaningful happened.
 */
export function applyOffline(save: SaveState, elapsedMs: number): OfflineReport | null {
  if (!(elapsedMs >= OFFLINE_MIN_MS)) return null; // also rejects NaN / negative (clock went backwards)
  const capped = elapsedMs > OFFLINE_CAP_MS;
  const simulated = Math.min(elapsedMs, OFFLINE_CAP_MS);

  const before = { ...save.inventory };
  const gold = save.player.gold;
  const queued = save.base.queue.length;
  const weapon = save.player.weaponTier;

  const hatched: number[] = [];
  for (let left = simulated / 1000; left > 0; left -= OFFLINE_STEP_SEC) {
    hatched.push(...tickWorld(save, Math.min(OFFLINE_STEP_SEC, left)).hatched);
  }

  const items: Record<string, number> = {};
  for (const id of new Set([...Object.keys(before), ...Object.keys(save.inventory)])) {
    const delta = (save.inventory[id] ?? 0) - (before[id] ?? 0);
    if (delta !== 0) items[id] = delta;
  }
  const report: OfflineReport = {
    elapsedMs: simulated,
    capped,
    gold: save.player.gold - gold,
    items,
    crafted: queued - save.base.queue.length,
    hatched,
  };
  if (save.player.weaponTier > weapon) report.weaponTier = save.player.weaponTier;

  const empty = report.gold === 0 && report.crafted === 0 && Object.keys(items).length === 0 && !report.weaponTier && hatched.length === 0;
  return empty ? null : report;
}
