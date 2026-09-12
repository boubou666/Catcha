import type { ExpeditionReport, SaveState } from '../data/types';
import { tickWorld } from './tick';
import { itemName } from '../data/items';
import { palById } from '../data/pals';
import { expeditionById } from '../data/expeditions';

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
  returned: ExpeditionReport[];           // expeditions that came back
  sick: number;                           // workers at 0 SAN when you got back
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
  const returned: ExpeditionReport[] = [];
  for (let left = simulated / 1000; left > 0; left -= OFFLINE_STEP_SEC) {
    const r = tickWorld(save, Math.min(OFFLINE_STEP_SEC, left));
    hatched.push(...r.hatched);
    returned.push(...r.returned);
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
    returned,
    sick: save.box.filter((p) => save.base.workers.includes(p.uid) && p.san <= 0).length,
  };
  if (save.player.weaponTier > weapon) report.weaponTier = save.player.weaponTier;

  const empty = report.gold === 0 && report.crafted === 0 && Object.keys(items).length === 0 && !report.weaponTier && hatched.length === 0 && returned.length === 0;
  return empty ? null : report;
}

// ---- summary rows & filtering ------------------------------------------------------------

export type OfflineRowKind = 'gold' | 'item' | 'event';
export interface OfflineRow { kind: OfflineRowKind; id: string; label: string; text: string; delta: number | null; tone: 'gain' | 'loss' | 'neutral' }

export type OfflineShow = 'any' | 'gained' | 'consumed' | 'events';
export type OfflineSort = 'change' | 'name';
export interface OfflineFilter { query: string; show: OfflineShow; sort: OfflineSort }
export const DEFAULT_OFFLINE_FILTER: OfflineFilter = { query: '', show: 'any', sort: 'change' };
export const OFFLINE_SHOW_LABEL: Record<OfflineShow, string> = { any: 'Everything', gained: 'Gained', consumed: 'Consumed', events: 'Events' };
export const OFFLINE_SORT_LABEL: Record<OfflineSort, string> = { change: 'Biggest change', name: 'Name' };

const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString());

/** One row per thing that changed while away: gold, each item delta, then the events. */
export function offlineRows(r: OfflineReport): OfflineRow[] {
  const rows: OfflineRow[] = [];
  if (r.gold !== 0) rows.push({ kind: 'gold', id: 'gold', label: '💰 Gold', text: signed(r.gold), delta: r.gold, tone: r.gold > 0 ? 'gain' : 'loss' });
  for (const [id, d] of Object.entries(r.items)) if (d !== 0) rows.push({ kind: 'item', id, label: itemName(id), text: signed(d), delta: d, tone: d > 0 ? 'gain' : 'loss' });
  if (r.hatched.length) rows.push({ kind: 'event', id: 'hatched', label: 'Eggs hatched', text: r.hatched.map((id) => palById(id).name).join(', '), delta: null, tone: 'gain' });
  if (r.returned.length) rows.push({ kind: 'event', id: 'returned', label: 'Expeditions back', text: r.returned.map((x) => `${expeditionById(x.defId).name} (${x.success ? 'success' : 'failed'})`).join(', '), delta: null, tone: 'neutral' });
  if (r.sick > 0) rows.push({ kind: 'event', id: 'sick', label: 'Workers sick', text: `${r.sick} — resting or Medical Supplies needed`, delta: null, tone: 'loss' });
  if (r.crafted > 0) rows.push({ kind: 'event', id: 'crafted', label: 'Crafts finished', text: String(r.crafted), delta: null, tone: 'gain' });
  if (r.weaponTier) rows.push({ kind: 'event', id: 'weapon', label: 'New weapon', text: `tier ${r.weaponTier}`, delta: null, tone: 'gain' });
  return rows;
}

export function isOfflineFiltering(f: OfflineFilter): boolean {
  return f.query.trim() !== '' || f.show !== 'any';
}

/** Rows matching the view and every search word (label or text); sorted by |delta| desc with events last, or by name. */
export function filterOfflineRows(rows: OfflineRow[], f: OfflineFilter): OfflineRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const kept = rows.filter((r) => {
    if (f.show === 'gained' && !(r.delta !== null && r.delta > 0)) return false;
    if (f.show === 'consumed' && !(r.delta !== null && r.delta < 0)) return false;
    if (f.show === 'events' && r.kind !== 'event') return false;
    const hay = `${r.label} ${r.text}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  if (f.sort === 'name') kept.sort((a, b) => a.label.localeCompare(b.label));
  else kept.sort((a, b) => Number(a.delta === null) - Number(b.delta === null) || Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0) || a.label.localeCompare(b.label));
  return kept;
}
