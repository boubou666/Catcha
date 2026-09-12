import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { PALS, palById } from '../data/pals';
import { DEFAULT_DECK_FILTER, filterDeck, isDeckFiltering, regionSpecies, type DeckFilter } from './paldeckfilter';

// Lamball 1 (#001 common), Cattiva 2 (#002), Chikipi 3 (#003), Foxparks 5 (#029 Fire), Penking 11 (#018 rare, Mining),
// Chillet 55 (#103 uncommon, Ice/Dragon, Alpha in Windswept), Jolthog Cryst 1012 (#015B subspecies)
function setup() {
  const s = newState();
  s.paldeck[1] = { seen: true, caught: 3 };
  s.paldeck[2] = { seen: true, caught: 0 };
  s.paldeck[5] = { seen: true, caught: 1 };
  s.paldeck[11] = { seen: true, caught: 1 };
  return s;
}
const f = (over: Partial<DeckFilter>): DeckFilter => ({ ...DEFAULT_DECK_FILTER, ...over });
const ids = (s: ReturnType<typeof setup>, over: Partial<DeckFilter>) => filterDeck(s, f(over)).map((e) => e.def.id);

describe('paldeck filter', () => {
  it('shows every species in Paldeck order by default', () => {
    const s = setup();
    const all = filterDeck(s, DEFAULT_DECK_FILTER);
    expect(all).toHaveLength(PALS.length);
    expect(all.slice(0, 3).map((e) => e.def.id)).toEqual([1, 2, 3]);
    expect(isDeckFiltering(DEFAULT_DECK_FILTER)).toBe(false);
    expect(isDeckFiltering(f({ sort: 'name' }))).toBe(false);
    expect(isDeckFiltering(f({ region: 'windswept' }))).toBe(true);
  });

  it('filters by status', () => {
    const s = setup();
    expect(ids(s, { status: 'caught' })).toEqual([1, 11, 5]);        // #001, #018, #029
    expect(ids(s, { status: 'seen' })).toEqual([2]);
    const missing = ids(s, { status: 'missing' });
    expect(missing).toHaveLength(PALS.length - 4);
    expect(missing).not.toContain(1);
  });

  it('searches seen Pals by name, number and element, unseen ones by number only', () => {
    const s = setup();
    expect(ids(s, { query: 'lam' })).toEqual([1]);
    expect(ids(s, { query: 'fire' })).toEqual([5]);
    expect(ids(s, { query: '029' })).toEqual([5]);
    expect(ids(s, { query: '103' })).toEqual([55, 1055]);            // unseen Chillet + Chillet Ignis (#103B), by number
    expect(ids(s, { query: 'chillet' })).toEqual([]);                // …but not by name
    expect(ids(s, { query: 'penking rare' })).toEqual([]);           // rarity is not searchable text
    expect(ids(s, { query: 'penking water' })).toEqual([11]);
  });

  it('applies element, work and rarity to seen Pals only', () => {
    const s = setup();
    expect(ids(s, { element: 'Ice' })).toEqual([11]);                // Chillet is Ice but unseen
    expect(ids(s, { work: 'Mining' })).toEqual([2, 11]);             // Cattiva 1, Penking 3
    expect(ids(s, { rarity: 'common' })).toEqual([1, 2, 5]);
    expect(ids(s, { rarity: 'rare' })).toEqual([11]);
    expect(ids(s, { rarity: 'legendary' })).toEqual([]);
  });

  it('filters by region habitat regardless of seen state', () => {
    const s = setup();
    const w = regionSpecies('windswept');
    expect(w.has(1)).toBe(true);
    expect(w.has(55)).toBe(true);                                    // Alpha Chillet
    const shown = ids(s, { region: 'windswept' });
    expect(shown).toEqual([...w].sort((a, b) => shown.indexOf(a) - shown.indexOf(b)));
    expect(ids(s, { region: 'windswept', status: 'missing' })).not.toContain(1);
    expect(regionSpecies('nowhere').size).toBe(0);
  });

  it('can show subspecies only', () => {
    const s = setup();
    const subs = ids(s, { subspecies: true });
    expect(subs.length).toBeGreaterThan(30);
    expect(subs.every((id) => !!palById(id).variantOf)).toBe(true);
    expect(subs).toContain(1012);
  });

  it('sorts by name, copies and rarity without giving unseen Pals away', () => {
    const s = setup();
    expect(ids(s, { sort: 'name' }).slice(0, 4)).toEqual([2, 5, 1, 11]);      // Cattiva, Foxparks, Lamball, Penking
    expect(ids(s, { sort: 'name' }).slice(4, 7)).toEqual([3, 4, 6]);          // unseen: number order
    expect(ids(s, { sort: 'copies' }).slice(0, 4)).toEqual([1, 11, 5, 2]);    // 3, 1, 1 (by number), seen
    expect(ids(s, { sort: 'rarity' }).slice(0, 4)).toEqual([11, 1, 2, 5]);    // rare first, then commons by number
    expect(ids(s, { sort: 'rarity' })[4]).toBe(3);                            // unseen trail by number
  });
});
