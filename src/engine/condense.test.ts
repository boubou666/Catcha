import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { assignWorker } from './base';
import { instanceAttack } from './formulas';
import { workLevels } from './base';
import { condense, condenseBlocker, condenseCandidates, condenseCost, CONDENSE_COST, CONDENSER } from './condense';

/** target Lamball + n idle Lamball dupes, condenser built, party emptied. */
function setup(n: number) {
  const save = newState();
  save.base.structures[CONDENSER] = 1;
  const target = makeInstance(1, 10);
  addToBox(save, target);
  for (let i = 0; i < n; i++) addToBox(save, makeInstance(1, 1 + (i % 5)));
  save.party = [];
  return { save, target };
}

describe('condensing', () => {
  it('cost table climbs per star and stops at 4', () => {
    const inst = makeInstance(1, 1);
    for (let s = 0; s < 4; s++) {
      inst.stars = s as 0 | 1 | 2 | 3;
      expect(condenseCost(inst)).toBe(CONDENSE_COST[s]);
    }
    inst.stars = 4;
    expect(condenseCost(inst)).toBeNull();
  });

  it('reports why it is blocked', () => {
    const { save, target } = setup(3);
    delete save.base.structures[CONDENSER];
    expect(condenseBlocker(save, target)).toBe('no-condenser');
    save.base.structures[CONDENSER] = 1;
    expect(condenseBlocker(save, target)).toBe('not-enough');
    target.stars = 4;
    expect(condenseBlocker(save, target)).toBe('max-stars');
    expect(condense(save, target.uid)).toBeNull();
  });

  it('only offers idle, unstarred, non-lucky dupes of the same species', () => {
    const { save, target } = setup(4);
    const other = makeInstance(2, 1); addToBox(save, other); save.party = [];  // Cattiva
    const lucky = makeInstance(1, 1, true); addToBox(save, lucky); save.party = [];
    const starred = makeInstance(1, 1); starred.stars = 1; addToBox(save, starred); save.party = [];
    const inParty = makeInstance(1, 1); addToBox(save, inParty); save.party = [inParty.uid];
    const working = makeInstance(1, 1); addToBox(save, working); assignWorker(save, working.uid);
    const ids = condenseCandidates(save, target).map((p) => p.uid);
    expect(ids).toHaveLength(4);
    for (const p of [other, lucky, starred, inParty, working, target]) expect(ids).not.toContain(p.uid);
  });

  it('consumes the weakest dupes and adds a star', () => {
    const { save, target } = setup(6); // levels 1,2,3,4,5,1
    const fed = condense(save, target.uid)!;
    expect(fed.map((p) => p.level)).toEqual([1, 1, 2, 3]);
    expect(target.stars).toBe(1);
    expect(save.box).toHaveLength(3); // target + levels 4, 5
    expect(save.box.find((p) => p.uid === target.uid)).toBeDefined();
  });

  it('stars boost attack and work output', () => {
    const { save, target } = setup(4);
    const atk = instanceAttack(target);
    condense(save, target.uid);
    expect(instanceAttack(target)).toBeCloseTo(atk * 1.1);
    assignWorker(save, target.uid);
    expect(workLevels(save).Handiwork).toBeCloseTo(1.1);
  });
});
