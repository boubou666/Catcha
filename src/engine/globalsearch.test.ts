import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { globalSearch, type TabEntry } from './globalsearch';

const tabs: TabEntry[] = [{ id: 'box', label: 'Box', group: 'Pals' }, { id: 'tech', label: 'Tech', group: 'Progress' }, { id: 'settings', label: 'Settings', group: 'Progress' }];
const kinds = (rs: ReturnType<typeof globalSearch>) => [...new Set(rs.map((r) => r.kind))];

describe('global search', () => {
  it('returns nothing for an empty query and finds tabs, routes, techs, settings and achievements', () => {
    const s = newState();
    expect(globalSearch(s, '  ', tabs)).toEqual([]);
    const tech = globalSearch(s, 'tech', tabs);
    expect(tech.find((r) => r.kind === 'tab')?.action).toEqual({ tab: 'tech' });
    expect(globalSearch(s, 'plateau', tabs).find((r) => r.kind === 'route')?.action).toEqual({ tab: 'routes', travel: 'plateau' });
    expect(globalSearch(s, 'fort ruins', tabs).find((r) => r.kind === 'route')?.action).toEqual({ tab: 'routes' });   // locked: no travel
    expect(globalSearch(s, 'workbench', tabs).some((r) => r.kind === 'tech')).toBe(true);
    expect(globalSearch(s, 'vibration', tabs).find((r) => r.kind === 'setting')?.id).toBe('sound');
    expect(globalSearch(s, 'defeat', tabs).some((r) => r.kind === 'achievement')).toBe(true);
    expect(globalSearch(s, 'chillet', tabs).find((r) => r.kind === 'boss')?.title).toBe('Alpha Chillet');
  });

  it('finds your Pals and seen species, never unseen names, and honours the kind filter and caps', () => {
    const s = newState();
    addToBox(s, makeInstance(1, 12));
    expect(globalSearch(s, 'lamball', tabs).some((r) => r.kind === 'pal')).toBe(true);
    expect(globalSearch(s, 'lamball', tabs).find((r) => r.kind === 'pal')?.action).toEqual({ tab: 'box', boxQuery: 'Lamball' });
    expect(globalSearch(s, 'lamball', tabs).find((r) => r.kind === 'species')?.action).toEqual({ tab: 'paldeck', paldeck: 1 });
    expect(globalSearch(s, 'chikipi', tabs).some((r) => r.kind === 'species')).toBe(false);      // unseen
    expect(globalSearch(s, '003', tabs).find((r) => r.kind === 'species')?.title).toBe('??? #003');
    expect(kinds(globalSearch(s, 'lamball', tabs, 'pal'))).toEqual(['pal']);
    const sphere = globalSearch(s, 'sphere', tabs);
    expect(sphere.some((r) => r.kind === 'item' && r.id === 'sphere_pal')).toBe(true);           // you own 20
    expect(sphere.filter((r) => r.kind === 'recipe').length).toBeLessThanOrEqual(5);
    expect(sphere.length).toBeLessThanOrEqual(30);
  });
});
