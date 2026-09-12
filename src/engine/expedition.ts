import type { ExpeditionReport, PalInstance, SaveState } from '../data/types';
import { EXPEDITION_POST, expeditionById, FAIL_GOLD_SHARE, MAX_CHANCE, MAX_REPORTS, MIN_CHANCE } from '../data/expeditions';
import { addItem } from './inventory';
import { grantInstanceExp, instanceByUid, isAway } from './party';
import { isUnlocked } from './progress';
import { passiveMult } from './passives';
import type { Rng } from './combat';

export function expeditionSlots(save: SaveState): number {
  return save.base.structures[EXPEDITION_POST] ?? 0;
}

/** Idle box Pals: not in the party, working, breeding or already away. */
export function available(save: SaveState): PalInstance[] {
  const b = save.base.breeding;
  return save.box.filter((p) =>
    !save.party.includes(p.uid) && !save.base.workers.includes(p.uid)
    && p.uid !== b?.a && p.uid !== b?.b && !isAway(save, p.uid));
}

/** A member's contribution: level, boosted by stars and attack passives. */
export function memberScore(inst: PalInstance): number {
  return inst.level * (1 + 0.1 * inst.stars) * passiveMult(inst, 'attack');
}

/** Success odds for these members on this trip. Judged against a full party at the recommended level. */
export function successChance(defId: string, members: PalInstance[]): number {
  const def = expeditionById(defId);
  if (members.length === 0) return 0;
  const score = members.reduce((s, m) => s + memberScore(m), 0);
  const ratio = Math.min(1, score / (def.level * def.size));
  return Math.min(MAX_CHANCE, Math.max(MIN_CHANCE, MIN_CHANCE + (MAX_CHANCE - MIN_CHANCE) * ratio));
}

export type SendBlock = 'no-post' | 'locked' | 'no-slots' | 'no-members' | 'too-many' | 'busy';

export function sendBlocker(save: SaveState, defId: string, uids: string[]): SendBlock | null {
  const def = expeditionById(defId);
  if (expeditionSlots(save) === 0) return 'no-post';
  if (!isUnlocked(save, def.unlock)) return 'locked';
  if (save.base.expeditions.length >= expeditionSlots(save)) return 'no-slots';
  if (uids.length === 0) return 'no-members';
  if (uids.length > def.size) return 'too-many';
  const idle = new Set(available(save).map((p) => p.uid));
  if (new Set(uids).size !== uids.length || uids.some((u) => !idle.has(u))) return 'busy';
  return null;
}

export function send(save: SaveState, defId: string, uids: string[]): boolean {
  if (sendBlocker(save, defId, uids)) return false;
  save.base.expeditions.push({ defId, members: [...uids], remaining: expeditionById(defId).durationSec });
  return true;
}

/** Advance timers; resolve and report everything that got back. */
export function tickExpeditions(save: SaveState, dtSec: number, rand: Rng = Math.random): ExpeditionReport[] {
  const done: ExpeditionReport[] = [];
  for (const ex of save.base.expeditions) ex.remaining -= dtSec;
  for (const ex of save.base.expeditions.filter((e) => e.remaining <= 0)) {
    const def = expeditionById(ex.defId);
    const members = ex.members.map((u) => instanceByUid(save, u)).filter((m): m is PalInstance => !!m);
    const success = rand() < successChance(ex.defId, members);
    const report: ExpeditionReport = { defId: ex.defId, success, gold: 0, items: {}, at: Date.now() };
    report.gold = Math.round(def.loot.gold * (success ? 1 : FAIL_GOLD_SHARE));
    save.player.gold += report.gold;
    if (success) {
      for (const drop of def.loot.items) {
        if (rand() < drop.chance) {
          const n = drop.min + Math.floor(rand() * (drop.max - drop.min + 1));
          report.items[drop.itemId] = (report.items[drop.itemId] ?? 0) + n;
          addItem(save, drop.itemId, n);
        }
      }
    }
    for (const m of members) grantInstanceExp(m, success ? def.exp : def.exp / 2);
    done.push(report);
  }
  if (done.length) {
    save.base.expeditions = save.base.expeditions.filter((e) => e.remaining > 0);
    save.base.reports = [...done.reverse(), ...save.base.reports].slice(0, MAX_REPORTS);
  }
  return done;
}

export function clearReports(save: SaveState): void {
  save.base.reports = [];
}
