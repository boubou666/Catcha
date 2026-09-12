import type { Element, PalDef, Rarity, SaveState, WorkType } from '../data/types';
import { PALS, paldeckOrder } from '../data/pals';
import { REGIONS } from '../data/regions';

export type DeckStatus = 'any' | 'caught' | 'seen' | 'missing';
export type DeckSort = 'number' | 'name' | 'copies' | 'rarity';

export interface DeckFilter {
  query: string;
  status: DeckStatus;
  element: Element | 'any';
  work: WorkType | 'any';
  rarity: Rarity | 'any';
  region: string | 'any';     // region id: found on its routes / Alphas / tower
  subspecies: boolean;        // only "B" variants
  sort: DeckSort;
}

export interface DeckEntry { def: PalDef; seen: boolean; caught: number }

export const DEFAULT_DECK_FILTER: DeckFilter = { query: '', status: 'any', element: 'any', work: 'any', rarity: 'any', region: 'any', subspecies: false, sort: 'number' };

export const DECK_STATUS_LABEL: Record<DeckStatus, string> = { any: 'Any status', caught: 'Caught', seen: 'Seen, not caught', missing: 'Never seen' };
export const DECK_SORT_LABEL: Record<DeckSort, string> = { number: 'Paldeck number', name: 'Name', copies: 'Copies caught', rarity: 'Rarity' };
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Species met anywhere in a region (routes, Alphas, tower boss), computed once. */
const REGION_SPECIES: Map<string, Set<number>> = new Map(REGIONS.map((r) => [r.id, new Set<number>([
  ...r.routes.flatMap((route) => route.spawns.map((s) => s.palId)),
  ...r.alphas.map((a) => a.palId),
  r.tower.palId,
])]));

export function regionSpecies(regionId: string): Set<number> {
  return REGION_SPECIES.get(regionId) ?? new Set();
}

export function isDeckFiltering(f: DeckFilter): boolean {
  return f.query.trim() !== '' || f.status !== 'any' || f.element !== 'any' || f.work !== 'any' || f.rarity !== 'any' || f.region !== 'any' || f.subspecies;
}

export function deckEntries(save: SaveState): DeckEntry[] {
  return PALS.map((def) => {
    const e = save.paldeck[def.id];
    return { def, seen: !!e?.seen, caught: e?.caught ?? 0 };
  });
}

/**
 * Unseen entries only show as "???" so they never match a name/element/work/rarity query — only their
 * number, status and region (the wiki-facing Paldeck number is always visible).
 */
function matchesQuery(e: DeckEntry, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = (e.seen ? [e.def.name, e.def.no, ...e.def.elements] : [e.def.no]).join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function filterDeck(save: SaveState, f: DeckFilter): DeckEntry[] {
  const region = f.region === 'any' ? null : regionSpecies(f.region);
  return deckEntries(save)
    .filter((e) => {
      const { def } = e;
      if (f.status === 'caught' && e.caught === 0) return false;
      if (f.status === 'seen' && (!e.seen || e.caught > 0)) return false;
      if (f.status === 'missing' && e.seen) return false;
      if (f.element !== 'any' && (!e.seen || !def.elements.includes(f.element))) return false;
      if (f.work !== 'any' && (!e.seen || !(def.work[f.work] ?? 0))) return false;
      if (f.rarity !== 'any' && (!e.seen || def.rarity !== f.rarity)) return false;
      if (region && !region.has(def.id)) return false;
      if (f.subspecies && !def.variantOf) return false;
      return matchesQuery(e, f.query);
    })
    .sort(comparator(f.sort));
}

function comparator(sort: DeckSort): (a: DeckEntry, b: DeckEntry) => number {
  const byNumber = (a: DeckEntry, b: DeckEntry) => paldeckOrder(a.def) - paldeckOrder(b.def);
  switch (sort) {
    case 'number': return byNumber;
    // unseen entries would give their name or rarity away, so they trail in number order
    case 'name': return (a, b) => Number(!a.seen) - Number(!b.seen) || (a.seen ? a.def.name.localeCompare(b.def.name) : 0) || byNumber(a, b);
    case 'copies': return (a, b) => b.caught - a.caught || Number(b.seen) - Number(a.seen) || byNumber(a, b);
    case 'rarity': return (a, b) => Number(!a.seen) - Number(!b.seen) || (a.seen ? RARITIES.indexOf(b.def.rarity) - RARITIES.indexOf(a.def.rarity) : 0) || byNumber(a, b);
  }
}
