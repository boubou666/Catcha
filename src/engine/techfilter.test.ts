import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { research } from './tech';
import { DEFAULT_TECH_FILTER, filterTechs, groupByLevel, isTechFiltering, type TechFilter } from './techfilter';
import { TECHS } from '../data/tech';

const f = (over: Partial<TechFilter>): TechFilter => ({ ...DEFAULT_TECH_FILTER, ...over });
const ids = (s: ReturnType<typeof newState>, over: Partial<TechFilter>) => filterTechs(s, f(over)).map((r) => r.tech.id);

describe('tech filter', () => {
  it('lists every tech in data order by default, grouped by level', () => {
    const s = newState();
    expect(ids(s, {})).toEqual(TECHS.map((t) => t.id));
    const groups = groupByLevel(filterTechs(s, DEFAULT_TECH_FILTER));
    expect(groups[0][0]).toBe(1);
    expect(groups.map(([l]) => l)).toEqual([...groups.map(([l]) => l)].sort((a, b) => a - b));
    expect(isTechFiltering(DEFAULT_TECH_FILTER)).toBe(false);
    expect(isTechFiltering(f({ hideFuture: true }))).toBe(true);
  });

  it('searches names, descriptions, what a tech unlocks and prerequisites', () => {
    const s = newState();
    expect(ids(s, { query: 'primitive workbench' })).toContain('s_workbench');
    expect(ids(s, { query: 'condenser' })).toContain('s_condenser');          // structure name
    expect(ids(s, { query: 'cake' })).toContain('r_cake');                     // recipe name
    expect(ids(s, { query: 'catch rate' }).every((id) => { const t = TECHS.find((x) => x.id === id)!; return t.effect.kind === 'mult' ? t.effect.stat === 'catch' : /catch rate/i.test(t.desc); })).toBe(true);
    expect(ids(s, { query: 'zzz' })).toEqual([]);
  });

  it('filters by kind, boosted stat, status and level', () => {
    const s = newState();                                   // level 1, 2 TP
    expect(ids(s, { kind: 'recipe' }).every((id) => id.startsWith('r_'))).toBe(true);
    expect(ids(s, { kind: 'structure' }).every((id) => id.startsWith('s_'))).toBe(true);
    const gold = filterTechs(s, f({ stat: 'gold' }));
    expect(gold.length).toBeGreaterThan(0);
    expect(gold.every((r) => r.tech.effect.kind === 'mult' && r.tech.effect.stat === 'gold')).toBe(true);
    expect(ids(s, { status: 'ready' })).toEqual(TECHS.filter((t) => t.level <= 1 && !t.requires?.length && t.cost <= 2).map((t) => t.id));
    expect(ids(s, { hideFuture: true }).every((id) => TECHS.find((t) => t.id === id)!.level <= 1)).toBe(true);

    research(s, 's_workbench');
    expect(ids(s, { status: 'researched' })).toEqual(['s_workbench']);
    expect(ids(s, { status: 'todo' })).not.toContain('s_workbench');
    expect(ids(s, { status: 'ready' })).toContain('r_sphere_pal');           // its prerequisite is now met
    expect(filterTechs(s, f({})).find((r) => r.tech.id === 's_workbench')?.block).toBe('researched');
  });
});
