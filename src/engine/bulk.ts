import type { SaveState } from '../data/types';
import { addToParty, instanceByUid, release } from './party';
import { assignWorker } from './base';
import { statusOf } from './boxfilter';

export type SkipReason = 'party' | 'base' | 'breeding' | 'away' | 'lucky' | 'starred' | 'full' | 'gone' | 'already';
export interface BulkResult { done: string[]; skipped: { uid: string; reason: SkipReason }[] }
export const SKIP_LABEL: Record<SkipReason, string> = {
  party: 'in the party', base: 'working at the base', breeding: 'breeding', away: 'on an expedition',
  lucky: 'Lucky', starred: 'starred', full: 'no room left', gone: 'not in the Box', already: 'already there',
};

const result = (): BulkResult => ({ done: [], skipped: [] });

/**
 * Release many Pals at once, but never anything you'd regret: party members, workers, breeding pairs,
 * expedition members, Lucky or starred Pals are skipped and reported.
 */
export function bulkRelease(save: SaveState, uids: string[]): BulkResult {
  const r = result();
  for (const uid of uids) {
    const p = instanceByUid(save, uid);
    if (!p) { r.skipped.push({ uid, reason: 'gone' }); continue; }
    if (p.lucky) { r.skipped.push({ uid, reason: 'lucky' }); continue; }
    if (p.stars > 0) { r.skipped.push({ uid, reason: 'starred' }); continue; }
    const st = statusOf(save, uid);
    if (st !== 'idle') { r.skipped.push({ uid, reason: st === 'expedition' ? 'away' : st }); continue; }
    release(save, uid);
    r.done.push(uid);
  }
  return r;
}

/** Put many Pals to work, in order, until the base is full. Party members are left alone. */
export function bulkAssign(save: SaveState, uids: string[]): BulkResult {
  const r = result();
  for (const uid of uids) {
    const st = instanceByUid(save, uid) ? statusOf(save, uid) : 'gone';
    if (st === 'gone') { r.skipped.push({ uid, reason: 'gone' }); continue; }
    if (st === 'base') { r.skipped.push({ uid, reason: 'already' }); continue; }
    if (st === 'party') { r.skipped.push({ uid, reason: 'party' }); continue; }
    if (st === 'expedition') { r.skipped.push({ uid, reason: 'away' }); continue; }
    if (save.base.workers.length >= save.base.slots) { r.skipped.push({ uid, reason: 'full' }); continue; }
    if (assignWorker(save, uid)) r.done.push(uid); else r.skipped.push({ uid, reason: 'full' });
  }
  return r;
}

/** Add many Pals to the party, in order, until it is full (workers and breeders are pulled in, as usual). */
export function bulkParty(save: SaveState, uids: string[]): BulkResult {
  const r = result();
  for (const uid of uids) {
    const st = instanceByUid(save, uid) ? statusOf(save, uid) : 'gone';
    if (st === 'gone') { r.skipped.push({ uid, reason: 'gone' }); continue; }
    if (st === 'party') { r.skipped.push({ uid, reason: 'already' }); continue; }
    if (st === 'expedition') { r.skipped.push({ uid, reason: 'away' }); continue; }
    if (addToParty(save, uid)) r.done.push(uid); else r.skipped.push({ uid, reason: 'full' });
  }
  return r;
}

/** "3 released · 2 skipped (1 Lucky, 1 in the party)" */
export function describeBulk(r: BulkResult, verb: string): string {
  const counts = new Map<SkipReason, number>();
  for (const s of r.skipped) counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
  const skipped = [...counts.entries()].map(([k, n]) => `${n} ${SKIP_LABEL[k]}`).join(', ');
  return `${r.done.length} ${verb}${r.skipped.length ? ` · ${r.skipped.length} skipped (${skipped})` : ''}`;
}
