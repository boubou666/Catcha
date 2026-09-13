import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance, addToParty } from './party';
import { canFound, canPost, found, OUTPOST_COST, OUTPOST_SLOTS, outpostRate, post, recall, tickOutposts } from './outpost';
import { statusOf } from './boxfilter';

describe('outposts', () => {
  it('need a beaten tower and the fee, take idle Pals only, and gather the region drops', () => {
    const s = newState();
    expect(canFound(s, 'marsh')).toBe(false);
    s.progress.towers.push('lily');
    expect(canFound(s, 'marsh')).toBe(false);   // cannot afford
    Object.assign(s.inventory, { wood: 500, stone: 500, ingot: 50 }); s.player.gold = 10_000;
    expect(canFound(s, 'windswept')).toBe(false);   // never at home
    expect(found(s, 'marsh')).toBe(true);
    expect(found(s, 'marsh')).toBe(false);          // one per region
    expect(s.player.gold).toBe(10_000 - OUTPOST_COST.gold);
    const o = s.outposts[0];
    expect(o.slots).toBe(OUTPOST_SLOTS);
    const a = makeInstance(1, 10), b = makeInstance(2, 10);
    addToBox(s, a); addToBox(s, b); s.party = [b.uid];   // addToBox auto-joins the party; keep a idle
    expect(canPost(s, o, b.uid)).toBe(false);       // in the party
    expect(post(s, o, a.uid)).toBe(true);
    expect(statusOf(s, a.uid)).toBe('outpost');
    expect(addToParty(s, a.uid)).toBe(false);       // away
    expect(outpostRate(s, o)).toBeCloseTo(1);       // one worker, no stars, full SAN
    const before = Object.values(s.inventory).reduce((x, y) => x + y, 0);
    const got = tickOutposts(s, 10 * 60, () => 0.5);
    const gained = Object.values(got).reduce((x, y) => x + y, 0);
    expect(gained).toBeGreaterThanOrEqual(9);
    expect(Object.values(s.inventory).reduce((x, y) => x + y, 0) - before).toBe(gained);
    expect(Object.values(o.taken).reduce((x, y) => x + y, 0)).toBe(gained);
    recall(o, a.uid);
    expect(statusOf(s, a.uid)).toBe('idle');
    expect(outpostRate(s, o)).toBe(0);
  });
});
