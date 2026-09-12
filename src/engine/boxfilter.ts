import type { Element, PalInstance, SaveState, WorkType } from '../data/types';
import { palById } from '../data/pals';
import { passiveById } from '../data/passives';
import { instanceAttack } from './formulas';
import { isAway } from './party';
import { isBreeding } from './breeding';

export type BoxStatus = 'any' | 'idle' | 'party' | 'base' | 'breeding' | 'expedition';
export type BoxSort = 'stars' | 'level' | 'attack' | 'name' | 'species' | 'newest';

export interface BoxFilter {
  query: string;
  element: Element | 'any';
  work: WorkType | 'any';
  status: BoxStatus;
  lucky: boolean;        // only Lucky Pals
  starred: boolean;      // only ★1+
  dupes: boolean;        // only species you own more than once
  sort: BoxSort;
}

export const DEFAULT_FILTER: BoxFilter = { query: '', element: 'any', work: 'any', status: 'any', lucky: false, starred: false, dupes: false, sort: 'stars' };

export const STATUS_LABEL: Record<BoxStatus, string> = {
  any: 'Any status', idle: 'Idle', party: 'In party', base: 'At base', breeding: 'Breeding', expedition: 'On expedition',
};
export const SORT_LABEL: Record<BoxSort, string> = {
  stars: 'Stars, then level', level: 'Level', attack: 'Attack', name: 'Name', species: 'Paldeck number', newest: 'Newest',
};

export function statusOf(save: SaveState, uid: string): Exclude<BoxStatus, 'any'> {
  if (save.party.includes(uid)) return 'party';
  if (save.base.workers.includes(uid)) return 'base';
  if (isBreeding(save, uid)) return 'breeding';
  if (isAway(save, uid)) return 'expedition';
  return 'idle';
}

/** True when the filter differs from the defaults in anything but the sort order. */
export function isFiltering(f: BoxFilter): boolean {
  return f.query.trim() !== '' || f.element !== 'any' || f.work !== 'any' || f.status !== 'any' || f.lucky || f.starred || f.dupes;
}

/** Name / Paldeck number / passive-name match, case-insensitive; every word of the query must match somewhere. */
function matchesQuery(inst: PalInstance, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const def = palById(inst.palId);
  const hay = [def.name, def.no, ...def.elements, ...inst.passives.map((id) => passiveById(id).name)].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function filterBox(save: SaveState, f: BoxFilter): PalInstance[] {
  const counts = new Map<number, number>();
  for (const p of save.box) counts.set(p.palId, (counts.get(p.palId) ?? 0) + 1);
  const cmp = comparator(f.sort, save);
  return save.box
    .filter((p) => {
      const def = palById(p.palId);
      if (f.element !== 'any' && !def.elements.includes(f.element)) return false;
      if (f.work !== 'any' && !(def.work[f.work] ?? 0)) return false;
      if (f.status !== 'any' && statusOf(save, p.uid) !== f.status) return false;
      if (f.lucky && !p.lucky) return false;
      if (f.starred && p.stars === 0) return false;
      if (f.dupes && (counts.get(p.palId) ?? 0) < 2) return false;
      return matchesQuery(p, f.query);
    })
    .sort(cmp);
}

function comparator(sort: BoxSort, save: SaveState): (a: PalInstance, b: PalInstance) => number {
  const byName = (a: PalInstance, b: PalInstance) => palById(a.palId).name.localeCompare(palById(b.palId).name);
  const bySpecies = (a: PalInstance, b: PalInstance) => a.palId - b.palId || b.level - a.level;
  switch (sort) {
    case 'stars': return (a, b) => b.stars - a.stars || b.level - a.level || bySpecies(a, b);
    case 'level': return (a, b) => b.level - a.level || b.stars - a.stars || bySpecies(a, b);
    case 'attack': return (a, b) => instanceAttack(b) - instanceAttack(a) || bySpecies(a, b);
    case 'name': return (a, b) => byName(a, b) || b.level - a.level;
    case 'species': return bySpecies;
    case 'newest': {
      // box order is catch order; newest first
      const idx = new Map(save.box.map((p, i) => [p.uid, i]));
      return (a, b) => (idx.get(b.uid) ?? 0) - (idx.get(a.uid) ?? 0);
    }
  }
}
