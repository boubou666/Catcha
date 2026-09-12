import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { DEFAULT_FILTER, filterBox, isFiltering, partnerCandidates, statusOf, workScore, type BoxFilter } from './boxfilter';
import { childOf } from './breeding';
import { palById } from '../data/pals';

// Lamball (1, Neutral, Handiwork/Transporting/Farming), Chikipi (3, Neutral), Foxparks (5, Fire),
// Penking (11, Water/Ice, Mining 3 …)
function setup() {
  const s = newState();
  const lamA = makeInstance(1, 5);
  const lamB = makeInstance(1, 12, false, ['brave']);
  const chik = makeInstance(3, 9, true);
  const fox = makeInstance(5, 20);
  const pen = makeInstance(11, 15);
  pen.stars = 2;
  for (const p of [lamA, lamB, chik, fox, pen]) addToBox(s, p);
  s.party = [fox.uid];
  s.base.workers = [pen.uid];
  s.base.expeditions = [{ defId: 'x', members: [chik.uid], remaining: 10 }];
  return { s, lamA, lamB, chik, fox, pen };
}
const f = (over: Partial<BoxFilter>): BoxFilter => ({ ...DEFAULT_FILTER, ...over });
const names = (s: ReturnType<typeof setup>['s'], over: Partial<BoxFilter>) => filterBox(s, f(over)).map((p) => `${p.palId}@${p.level}`);

describe('box filter', () => {
  it('defaults to everything, stars then level first', () => {
    const { s } = setup();
    expect(names(s, {})).toEqual(['11@15', '5@20', '1@12', '3@9', '1@5']);
    expect(isFiltering(DEFAULT_FILTER)).toBe(false);
    expect(isFiltering(f({ sort: 'name' }))).toBe(false);
    expect(isFiltering(f({ query: ' ' }))).toBe(false);
    expect(isFiltering(f({ lucky: true }))).toBe(true);
  });

  it('searches name, Paldeck number, element and passive names by every word', () => {
    const { s } = setup();
    expect(names(s, { query: 'lam' })).toEqual(['1@12', '1@5']);
    expect(names(s, { query: '018' })).toEqual(['11@15']);
    expect(names(s, { query: 'fire' })).toEqual(['5@20']);
    expect(names(s, { query: 'brave' })).toEqual(['1@12']);
    expect(names(s, { query: 'lamball brave' })).toEqual(['1@12']);
    expect(names(s, { query: 'lamball fire' })).toEqual([]);
  });

  it('filters by element, work suitability and status', () => {
    const { s } = setup();
    expect(names(s, { element: 'Neutral' })).toEqual(['1@12', '3@9', '1@5']);
    expect(names(s, { element: 'Ice' })).toEqual(['11@15']);
    expect(names(s, { work: 'Mining' })).toEqual(['11@15']);
    expect(names(s, { work: 'Farming' })).toEqual(['1@12', '3@9', '1@5']);
    expect(names(s, { status: 'party' })).toEqual(['5@20']);
    expect(names(s, { status: 'base' })).toEqual(['11@15']);
    expect(names(s, { status: 'expedition' })).toEqual(['3@9']);
    expect(names(s, { status: 'idle' })).toEqual(['1@12', '1@5']);
  });

  it('reports each status, breeding included', () => {
    const { s, lamA, lamB, fox, pen, chik } = setup();
    s.base.breeding = { a: lamA.uid, b: lamB.uid, progress: null };
    expect(statusOf(s, lamA.uid)).toBe('breeding');
    expect(statusOf(s, fox.uid)).toBe('party');
    expect(statusOf(s, pen.uid)).toBe('base');
    expect(statusOf(s, chik.uid)).toBe('expedition');
    expect(names(s, { status: 'breeding' })).toEqual(['1@12', '1@5']);
    expect(names(s, { status: 'idle' })).toEqual([]);
  });

  it('toggles lucky, starred and duplicate-only', () => {
    const { s } = setup();
    expect(names(s, { lucky: true })).toEqual(['3@9']);
    expect(names(s, { starred: true })).toEqual(['11@15']);
    expect(names(s, { dupes: true })).toEqual(['1@12', '1@5']);
    expect(names(s, { dupes: true, element: 'Fire' })).toEqual([]);
  });

  it('sorts by level, attack, name, species and catch order', () => {
    const { s } = setup();
    expect(names(s, { sort: 'level' })).toEqual(['5@20', '11@15', '1@12', '3@9', '1@5']);
    expect(names(s, { sort: 'name' })).toEqual(['3@9', '5@20', '1@12', '1@5', '11@15']);
    expect(names(s, { sort: 'species' })).toEqual(['1@12', '1@5', '3@9', '5@20', '11@15']);
    expect(names(s, { sort: 'newest' })).toEqual(['11@15', '5@20', '3@9', '1@12', '1@5']);
    const byAttack = names(s, { sort: 'attack' });
    expect(byAttack[0]).toBe('11@15');           // ★2 Penking (95 base) beats a Lv 20 Foxparks
    expect(byAttack.at(-1)).toBe('1@5');
  });
});

describe('isFiltering against custom defaults', () => {
  it('treats a change away from the given defaults as filtering, sort excluded', () => {
    const picker: BoxFilter = { ...DEFAULT_FILTER, status: 'idle', sort: 'attack' };
    expect(isFiltering(picker, picker)).toBe(false);
    expect(isFiltering({ ...picker, sort: 'name' }, picker)).toBe(false);
    expect(isFiltering({ ...picker, status: 'any' }, picker)).toBe(true);
    expect(isFiltering({ ...picker, query: 'x' }, picker)).toBe(true);
  });
});

describe('work sort', () => {
  it('ranks by the filtered job when one is set, else by total suitability', () => {
    const { s } = setup();
    // Penking (Mining 3, total 12) > Lamballs (total 3) > Foxparks (Kindling 1)/Chikipi (Gathering 1, Farming 1)
    expect(names(s, { sort: 'work' })[0]).toBe('11@15');
    expect(names(s, { sort: 'work' }).slice(1, 3)).toEqual(['1@12', '1@5']);
    expect(names(s, { sort: 'work', work: 'Farming' }).slice(0, 3)).toEqual(['1@12', '1@5', '3@9']);
    expect(workScore(makeInstance(11, 1))).toBe(12);
    expect(workScore(makeInstance(11, 1), 'Mining')).toBe(3);
    expect(workScore(makeInstance(11, 1), 'Kindling')).toBe(0);
  });
});

describe('breeding partner candidates', () => {
  it('lists idle Pals only, minus the picked parent, and matches offspring names once a parent is picked', () => {
    const { s, lamA, lamB, chik, fox, pen } = setup();     // fox in party, pen at base, chik away → idle: lamA, lamB
    const f0 = { ...DEFAULT_FILTER, status: 'any' as const, sort: 'species' as const };
    expect(partnerCandidates(s, f0, null).map((p) => p.uid)).toEqual([lamB.uid, lamA.uid]);
    expect(partnerCandidates(s, f0, lamA.uid).map((p) => p.uid)).toEqual([lamB.uid]);

    // free everyone; pick Lamball A, then search for the child a partner would give (Lamball + Penking → Verdash)
    s.party = []; s.base.workers = []; s.base.expeditions = [];
    expect(palById(childOf(lamA.palId, pen.palId)).name).toBe('Verdash');
    expect(partnerCandidates(s, { ...f0, query: 'verdash' }, lamA.uid).map((p) => p.uid)).toEqual([pen.uid]);
    // a plain name search still works alongside the offspring match
    expect(partnerCandidates(s, { ...f0, query: 'foxparks' }, lamA.uid).map((p) => p.uid)).toEqual([fox.uid]);
    // without a picked parent the query only matches the Pal itself
    expect(partnerCandidates(s, { ...f0, query: 'verdash' }, null)).toEqual([]);
    expect(partnerCandidates(s, f0, null)).toHaveLength(5);
    void chik;
  });
});
