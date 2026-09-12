import type { PalInstance, SaveState, WorkType } from '../data/types';
import { palById } from '../data/pals';
import { JOBS, RATES } from '../data/base';
import { instanceAttack } from './formulas';
import { passiveMult } from './passives';
import { sanStatus, workerMult } from './base';
import { memberScore } from './expedition';
import { isAway } from './party';
import { isBreeding } from './breeding';

export interface CompareRow {
  label: string;
  values: string[];
  best: number[];              // indexes of the best value(s), empty when not comparable
}

export const MAX_COMPARE = 4;

export function statusOf(save: SaveState, inst: PalInstance): string {
  if (save.party.includes(inst.uid)) return 'Party';
  if (save.base.workers.includes(inst.uid)) return 'Base';
  if (isBreeding(save, inst.uid)) return 'Breeding';
  if (isAway(save, inst.uid)) return 'Expedition';
  return 'Idle';
}

function bestOf(nums: number[], higher = true): number[] {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length < 2) return [];
  const target = higher ? Math.max(...valid) : Math.min(...valid);
  if (valid.every((n) => n === target)) return [];
  return nums.map((n, i) => (n === target ? i : -1)).filter((i) => i >= 0);
}

/** Effective work level for one job: species level × stars × passives × sanity. */
export function effectiveWork(inst: PalInstance, job: WorkType): number {
  return (palById(inst.palId).work[job] ?? 0) * workerMult(inst);
}

export function compareRows(save: SaveState, insts: PalInstance[]): CompareRow[] {
  const defs = insts.map((i) => palById(i.palId));
  const num = (label: string, nums: number[], fmt: (n: number) => string, higher = true): CompareRow =>
    ({ label, values: nums.map(fmt), best: bestOf(nums, higher) });
  const f1 = (n: number) => n.toFixed(1);
  const f2 = (n: number) => n.toFixed(2);

  const rows: CompareRow[] = [
    { label: 'Species', values: defs.map((d) => d.name), best: [] },
    { label: 'Element', values: defs.map((d) => d.elements.join(' / ')), best: [] },
    { label: 'Status', values: insts.map((i) => statusOf(save, i)), best: [] },
    num('Level', insts.map((i) => i.level), String),
    num('Stars', insts.map((i) => i.stars), (n) => (n ? '★'.repeat(n) : '—')),
    { label: 'Lucky', values: insts.map((i) => (i.lucky ? '✨ yes' : 'no')), best: [] },
    num('Attack', insts.map(instanceAttack), f1),
    num('Base HP', defs.map((d) => d.baseHp), String),
    num('Base DEF', defs.map((d) => d.baseDefense), String),
  ];

  const jobs = JOBS.map((j) => j.type).filter((job) => defs.some((d) => (d.work[job] ?? 0) > 0));
  for (const job of jobs) {
    rows.push(num(`${JOBS.find((j) => j.type === job)!.icon} ${job}`, insts.map((i) => effectiveWork(i, job)), (n) => (n ? f2(n) : '—')));
  }

  rows.push(
    num('Food / min', insts.map((i) => RATES.foodPerWorker * passiveMult(i, 'food')), f2, false),
    num('SAN', insts.map((i) => i.san ?? 100), (n) => `${Math.round(n)} (${sanStatus(n)})`),
    num('Expedition score', insts.map(memberScore), f1),
    num('Breeding rank', defs.map((d) => d.breedPower), String, false),
  );
  return rows;
}

// ---- row filtering ----------------------------------------------------------------------

export type RowGroup = 'identity' | 'combat' | 'work' | 'other';
export interface CompareFilter { query: string; group: RowGroup | 'any'; differencesOnly: boolean }
export const DEFAULT_COMPARE_FILTER: CompareFilter = { query: '', group: 'any', differencesOnly: false };
export const ROW_GROUP_LABEL: Record<RowGroup | 'any', string> = { any: 'All rows', identity: 'Identity', combat: 'Combat', work: 'Work', other: 'Other' };

const IDENTITY = new Set(['Species', 'Element', 'Status', 'Level', 'Stars', 'Lucky']);
const COMBAT = new Set(['Attack', 'Base HP', 'Base DEF', 'Expedition score']);
const JOB_LABELS = new Set(JOBS.map((j) => `${j.icon} ${j.type}`));

export function rowGroup(row: CompareRow): RowGroup {
  if (IDENTITY.has(row.label)) return 'identity';
  if (COMBAT.has(row.label)) return 'combat';
  if (JOB_LABELS.has(row.label)) return 'work';
  return 'other';
}

export function isCompareFiltering(f: CompareFilter): boolean {
  return f.query.trim() !== '' || f.group !== 'any' || f.differencesOnly;
}

/** Rows whose label or any value matches every search word; optionally one group, optionally only rows where the Pals differ. */
export function filterCompareRows(rows: CompareRow[], f: CompareFilter): CompareRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (f.group !== 'any' && rowGroup(r) !== f.group) return false;
    if (f.differencesOnly && new Set(r.values).size < 2) return false;
    const hay = [r.label, ...r.values].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
