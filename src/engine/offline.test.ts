import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { assignWorker, computeRates, enqueue } from './base';
import { applyOffline, OFFLINE_CAP_MS, OFFLINE_MIN_MS } from './offline';
import { TECHS } from '../data/tech';

const HOUR = 60 * 60 * 1000;

function withWorkers(...palIds: number[]) {
  const save = newState();
  save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
  for (const id of palIds) {
    const inst = makeInstance(id, 1);
    addToBox(save, inst);
    assignWorker(save, inst.uid);
  }
  return save;
}

describe('offline progress', () => {
  it('ignores short or invalid gaps', () => {
    const save = withWorkers(4);
    expect(applyOffline(save, OFFLINE_MIN_MS - 1)).toBeNull();
    expect(applyOffline(save, -HOUR)).toBeNull();
    expect(applyOffline(save, NaN)).toBeNull();
    expect(save.inventory.wood).toBeUndefined();
  });

  it('returns null with no workers', () => {
    expect(applyOffline(newState(), HOUR)).toBeNull();
  });

  it('runs base production for the elapsed time', () => {
    const save = withWorkers(4); // Lifmunk: ~4.12 wood/min
    const perMin = computeRates(save).items.wood;
    const r = applyOffline(save, HOUR)!;
    expect(r.capped).toBe(false);
    expect(r.items.wood).toBe(Math.floor(perMin * 60));
    expect(r.items.red_berries).toBe(-30); // 0.5/min eaten
    expect(save.inventory.wood).toBe(r.items.wood);
  });

  it('caps at 24 hours', () => {
    const save = withWorkers(4);
    save.inventory.red_berries = 100_000;
    const r = applyOffline(save, 3 * OFFLINE_CAP_MS)!;
    expect(r.capped).toBe(true);
    expect(r.elapsedMs).toBe(OFFLINE_CAP_MS);
    expect(r.items.wood).toBeLessThan(computeRates(save).items.wood * 60 * 24 + 1);
  });

  it('prices in hunger once the berries run out', () => {
    const fed = withWorkers(4);
    fed.inventory.red_berries = 1000;
    const starving = withWorkers(4);
    starving.inventory.red_berries = 5; // gone after 10 minutes
    const a = applyOffline(fed, HOUR)!;
    const b = applyOffline(starving, HOUR)!;
    expect(b.items.wood).toBeLessThan(a.items.wood);
    expect(b.items.wood).toBeGreaterThan(a.items.wood * 0.5);
  });

  it('finishes queued crafts and reports them', () => {
    const save = withWorkers(1); // Lamball: Handiwork 1
    save.base.structures.workbench = 1;
    save.inventory.wood = 60;
    enqueue(save, 'wooden_club', 1);
    enqueue(save, 'wooden_club', 1); // second is pointless but tests the count
    const r = applyOffline(save, 10 * 60 * 1000)!;
    expect(r.crafted).toBe(2);
    expect(r.weaponTier).toBe(2);
    expect(save.base.queue).toHaveLength(0);
  });

  it('never touches combat state', () => {
    const save = withWorkers(4);
    const before = JSON.stringify(save.progress);
    applyOffline(save, HOUR);
    expect(JSON.stringify(save.progress)).toBe(before);
    expect(save.player.level).toBe(1);
  });
});
