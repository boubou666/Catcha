import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { addToBox, makeInstance, release } from './party';
import { assignWorker } from './base';
import { ascend } from './ascend';
import { applyLoadout, DEFAULT_LOADOUT_FILTER, deleteLoadout, filterLoadouts, isLoadoutFiltering, loadoutReadiness, loadoutStatus, MAX_LOADOUTS, memberState, renameLoadout, saveLoadout, updateLoadout, type LoadoutFilter } from './loadouts';

function setup() {
  const s = newState();
  const pals = [makeInstance(1, 10), makeInstance(3, 12), makeInstance(5, 14), makeInstance(11, 20), makeInstance(20, 8), makeInstance(25, 9)];
  for (const p of pals) addToBox(s, p);                       // first five auto-join the party
  return { s, pals };
}

describe('loadouts', () => {
  it('saves the current party under a trimmed name, up to the cap', () => {
    const { s } = setup();
    expect(saveLoadout(s, '   ')).toBeNull();
    const lo = saveLoadout(s, '  Starter team  ')!;
    expect(lo.name).toBe('Starter team');
    expect(lo.uids).toEqual(s.party);
    expect(lo.uids).not.toBe(s.party);                        // a copy
    for (let i = 1; i < MAX_LOADOUTS; i++) expect(saveLoadout(s, `t${i}`)).not.toBeNull();
    expect(saveLoadout(s, 'one too many')).toBeNull();
    expect(saveLoadout({ ...s, party: [], loadouts: [] }, 'empty')).toBeNull();
  });

  it('applies a loadout: current party to the Box, members pulled from base or skipped when away', () => {
    const { s, pals } = setup();
    const lo = saveLoadout(s, 'A')!;
    // change the party: only the 6th Pal; put a saved member to work and send another away
    s.party = [pals[5].uid];
    expect(assignWorker(s, pals[0].uid)).toBe(true);
    s.base.expeditions = [{ defId: 'x', members: [pals[1].uid], remaining: 10 }];
    expect(memberState(s, pals[0].uid)).toBe('base');
    expect(memberState(s, pals[1].uid)).toBe('away');
    expect(loadoutReadiness(s, lo)).toEqual({ ready: 4, total: 5 });
    const r = applyLoadout(s, lo.id)!;
    expect(r.added).toEqual([pals[0].uid, pals[2].uid, pals[3].uid, pals[4].uid]);
    expect(r.skipped).toEqual([pals[1].uid]);
    expect(s.party).toEqual(r.added);
    expect(s.base.workers).toEqual([]);                        // pulled off duty
    expect(s.party).not.toContain(pals[5].uid);                // previous party went back to the Box
    expect(applyLoadout(s, 'nope')).toBeNull();
  });

  it('updates, renames, deletes, and marks released members as gone', () => {
    const { s, pals } = setup();
    const lo = saveLoadout(s, 'A')!;
    s.party = [pals[5].uid];
    expect(updateLoadout(s, lo.id)).toBe(true);
    expect(lo.uids).toEqual([pals[5].uid]);
    expect(renameLoadout(s, lo.id, ' B ')).toBe(true);
    expect(lo.name).toBe('B');
    expect(renameLoadout(s, lo.id, '')).toBe(false);
    release(s, pals[5].uid);
    expect(memberState(s, pals[5].uid)).toBe('gone');
    expect(loadoutReadiness(s, lo)).toEqual({ ready: 0, total: 1 });
    deleteLoadout(s, lo.id);
    expect(s.loadouts).toEqual([]);
  });

  it('searches by name or member species', () => {
    const { s } = setup();
    saveLoadout(s, 'Water team');
    s.party = [s.box[5].uid];                                  // Celaray only
    saveLoadout(s, 'Solo');
    expect(filterLoadouts(s, '').map((l) => l.name)).toEqual(['Water team', 'Solo']);
    expect(filterLoadouts(s, 'water').map((l) => l.name)).toEqual(['Water team']);
    expect(filterLoadouts(s, 'celaray').map((l) => l.name)).toEqual(['Solo']);
    expect(filterLoadouts(s, 'lamball').map((l) => l.name)).toEqual(['Water team']);
    expect(filterLoadouts(s, 'zzz')).toEqual([]);
  });

  it('is added by migration and kept through Ascension', () => {
    const v20 = { ...newState(), version: 20 } as Record<string, unknown>;
    delete v20.loadouts;
    const s = migrate(v20)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.loadouts).toEqual([]);
    const { s: t } = setup();
    saveLoadout(t, 'Keep me');
    t.progress.towers.push('rayne');
    expect(ascend(t, [])!.loadouts.map((l) => l.name)).toEqual(['Keep me']);
  });
});

describe('loadout filter', () => {
  it('filters by readiness and sorts by newest, name or availability', () => {
    const { s, pals } = setup();
    const a = saveLoadout(s, 'Alpha squad')!;                  // 5 members, all in party
    a.createdAt = 1;
    s.party = [pals[5].uid];
    const b = saveLoadout(s, 'Bravo')!;                        // just Celaray
    b.createdAt = 2;
    s.base.expeditions = [{ defId: 'x', members: [pals[0].uid], remaining: 10 }];   // one of Alpha's away
    release(s, pals[5].uid);                                   // Bravo's only member gone
    expect(loadoutStatus(s, a)).toBe('partial');
    expect(loadoutStatus(s, b)).toBe('none');
    const f = (over: Partial<LoadoutFilter>): LoadoutFilter => ({ ...DEFAULT_LOADOUT_FILTER, ...over });
    expect(filterLoadouts(s, f({})).map((l) => l.name)).toEqual(['Bravo', 'Alpha squad']);            // newest first
    expect(filterLoadouts(s, f({ sort: 'name' })).map((l) => l.name)).toEqual(['Alpha squad', 'Bravo']);
    expect(filterLoadouts(s, f({ sort: 'ready' })).map((l) => l.name)).toEqual(['Alpha squad', 'Bravo']);
    expect(filterLoadouts(s, f({ status: 'partial' })).map((l) => l.name)).toEqual(['Alpha squad']);
    expect(filterLoadouts(s, f({ status: 'none' })).map((l) => l.name)).toEqual(['Bravo']);
    expect(filterLoadouts(s, f({ status: 'full' }))).toEqual([]);
    expect(isLoadoutFiltering(DEFAULT_LOADOUT_FILTER)).toBe(false);
    expect(isLoadoutFiltering(f({ sort: 'name' }))).toBe(false);
    expect(filterLoadouts(s, 'bravo').map((l) => l.name)).toEqual(['Bravo']);                        // string form still works
  });
});
