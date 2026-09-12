import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { assignWorker } from './base';
import { bulkAssign, bulkParty, bulkRelease, describeBulk } from './bulk';

function setup() {
  const s = newState();
  const p = [makeInstance(1, 1), makeInstance(1, 2), makeInstance(1, 3, true), makeInstance(1, 4), makeInstance(1, 5), makeInstance(1, 6), makeInstance(1, 7)];
  for (const x of p) addToBox(s, x);          // first five auto-join the party
  s.party = [p[0].uid];                        // keep one in the party
  p[3].stars = 1;
  assignWorker(s, p[4].uid);
  s.base.expeditions = [{ defId: 'x', members: [p[5].uid], remaining: 10 }];
  return { s, p };
}

describe('bulk release', () => {
  it('releases only safe idle Pals and reports every skip', () => {
    const { s, p } = setup();
    const r = bulkRelease(s, [...p.map((x) => x.uid), 'ghost']);
    expect(r.done).toEqual([p[1].uid, p[6].uid]);              // plain idle ones
    expect(r.skipped.map((x) => x.reason)).toEqual(['party', 'lucky', 'starred', 'base', 'away', 'gone']);
    expect(s.box.map((x) => x.uid)).not.toContain(p[1].uid);
    expect(s.box.map((x) => x.uid)).toContain(p[2].uid);
    expect(describeBulk(r, 'released')).toBe('2 released · 6 skipped (1 in the party, 1 Lucky, 1 starred, 1 working at the base, 1 on an expedition, 1 not in the Box)');
  });
});

describe('bulk assign and party', () => {
  it('fills base slots in order, leaving the party alone', () => {
    const { s, p } = setup();                                    // 3 slots, 1 taken
    const r = bulkAssign(s, [p[0].uid, p[1].uid, p[4].uid, p[5].uid, p[2].uid, p[6].uid]);
    expect(r.done).toEqual([p[1].uid, p[2].uid]);
    expect(r.skipped.map((x) => x.reason)).toEqual(['party', 'already', 'away', 'full']);
    expect(s.base.workers).toHaveLength(3);
    expect(s.party).toEqual([p[0].uid]);
  });

  it('fills the party in order, pulling workers, skipping away and full', () => {
    const { s, p } = setup();
    const r = bulkParty(s, [p[0].uid, p[4].uid, p[5].uid, p[1].uid, p[2].uid, p[3].uid, p[6].uid]);
    expect(r.skipped.map((x) => x.reason)).toEqual(['already', 'away', 'full']);
    expect(r.done).toEqual([p[4].uid, p[1].uid, p[2].uid, p[3].uid]);
    expect(s.party).toHaveLength(5);
    expect(s.base.workers).toEqual([]);                          // the worker was pulled in
    expect(describeBulk({ done: [], skipped: [] }, 'moved')).toBe('0 moved');
  });
});
