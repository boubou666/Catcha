import type { SaveState } from '../data/types';
import { palById } from '../data/pals';
import { addToParty, instanceByUid, isAway } from './party';
import { isBreeding } from './breeding';

export interface Loadout { id: string; name: string; uids: string[]; createdAt: number }

export const MAX_LOADOUTS = 12;
export const MAX_LOADOUT_NAME = 24;

export type MemberState = 'party' | 'idle' | 'base' | 'breeding' | 'away' | 'gone';
export const MEMBER_STATE_LABEL: Record<MemberState, string> = { party: 'in party', idle: 'ready', base: 'at base', breeding: 'breeding', away: 'on expedition', gone: 'no longer owned' };

export function memberState(save: SaveState, uid: string): MemberState {
  if (!instanceByUid(save, uid)) return 'gone';
  if (save.party.includes(uid)) return 'party';
  if (save.base.workers.includes(uid)) return 'base';
  if (isBreeding(save, uid)) return 'breeding';
  if (isAway(save, uid)) return 'away';
  return 'idle';
}

const newId = () => `lo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const cleanName = (name: string) => name.trim().slice(0, MAX_LOADOUT_NAME);

/** Save the given Pals (default: the current party) under a name. Returns the loadout, or null if full / empty / bad name. */
export function saveLoadout(save: SaveState, name: string, uids: string[] = save.party): Loadout | null {
  const n = cleanName(name);
  if (!n || uids.length === 0 || save.loadouts.length >= MAX_LOADOUTS) return null;
  const lo: Loadout = { id: newId(), name: n, uids: [...uids], createdAt: Date.now() };
  save.loadouts = [...save.loadouts, lo];
  return lo;
}

/** Overwrite a loadout's members with the current party. */
export function updateLoadout(save: SaveState, id: string): boolean {
  const lo = save.loadouts.find((l) => l.id === id);
  if (!lo || save.party.length === 0) return false;
  lo.uids = [...save.party];
  return true;
}

export function renameLoadout(save: SaveState, id: string, name: string): boolean {
  const lo = save.loadouts.find((l) => l.id === id);
  const n = cleanName(name);
  if (!lo || !n) return false;
  lo.name = n;
  return true;
}

export function deleteLoadout(save: SaveState, id: string): void {
  save.loadouts = save.loadouts.filter((l) => l.id !== id);
}

/**
 * Swap the party for a loadout: current members go back to the Box, then each saved member joins in
 * order under the usual rules (pulled off base duty or a breeding pair; skipped if away or gone).
 */
export function applyLoadout(save: SaveState, id: string): { added: string[]; skipped: string[] } | null {
  const lo = save.loadouts.find((l) => l.id === id);
  if (!lo) return null;
  save.party = [];
  const added: string[] = [], skipped: string[] = [];
  for (const uid of lo.uids) (addToParty(save, uid) ? added : skipped).push(uid);
  return { added, skipped };
}

/** How many of a loadout's members could join right now. */
export function loadoutReadiness(save: SaveState, lo: Loadout): { ready: number; total: number } {
  const ready = lo.uids.filter((u) => { const s = memberState(save, u); return s !== 'away' && s !== 'gone'; }).length;
  return { ready, total: lo.uids.length };
}

/** Loadouts whose name or (owned) member species match every search word. */
export function filterLoadouts(save: SaveState, query: string): Loadout[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return save.loadouts.filter((lo) => {
    const members = lo.uids.map((u) => instanceByUid(save, u)).filter((p) => !!p).map((p) => palById(p.palId).name);
    const hay = [lo.name, ...members].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
