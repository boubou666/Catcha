import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { PALS, palById } from '../data/pals';
import { describePartner, partnerEffect, PARTNER_PCT } from '../data/partner';
import { activePartners, clockMult, partnerAttackMult, partnerMult, ranchMult, refundChance, revealsUnseen, scavengeChance, summarizePartners } from './partner';
import { tryCatch } from './catch';
import { applyDefeat } from './combat';
import { spawnTable } from './arenafilter';
import { routeById } from '../data/regions';
import { addToBox, makeInstance } from './party';
import { assignWorker } from './base';
import { partyDps } from './combat';
import { catchMult } from './catch';

describe('partner skills', () => {
  it('every species has one, sized by rarity, fighting skills tied to the first element', () => {
    expect(PALS.every((p) => partnerEffect(p) !== null)).toBe(true);
    const lamball = partnerEffect(palById(1))!;                     // Fluffy Shield: a fighting skill
    expect(lamball).toMatchObject({ stat: 'attack', element: 'Neutral', pct: PARTNER_PCT.common });
    expect(partnerEffect(palById(4))).toMatchObject({ stat: 'work' }); // Lifmunk Recoil
    expect(describePartner(palById(1))).toBe('Fluffy Shield — +3% damage for Neutral party members; +15% time against Alphas and towers');
    expect(describePartner(palById(4))).toBe('Lifmunk Recoil — +3% base output while working');
  });

  it('party skills stack per stat and only boost matching elements; work skills count at the base', () => {
    const s = newState();
    const a = makeInstance(1, 5), b = makeInstance(2, 5), lif = makeInstance(4, 5);   // two Neutral fighters + Lifmunk
    addToBox(s, a); addToBox(s, b); addToBox(s, lif);
    s.party = [a.uid, b.uid];
    expect(partnerAttackMult(s, palById(1))).toBeCloseTo(1.03);      // Fluffy Shield; Cattiva's Cat Helper is a work skill
    expect(partnerAttackMult(s, palById(4))).toBe(1);                 // Grass: no Neutral bonus
    expect(partnerMult(s, 'work')).toBe(1);                           // Lifmunk is in the box, not working
    assignWorker(s, lif.uid);
    expect(partnerMult(s, 'work')).toBeCloseTo(1.03);
    expect(partnerMult(s, 'catch')).toBe(1);
    expect(catchMult(s)).toBe(1);
    const wild = { palId: 3, level: 1, hp: 1, maxHp: 1, lucky: false, kind: 'wild' as const };
    s.party = [a.uid];
    const solo = partyDps(s, wild);
    s.party = [a.uid, b.uid];
    expect(partyDps(s, wild)).toBeGreaterThan(solo * 2 * 0.99);       // Lamball's skill boosts Cattiva too
  });

  it('summarizes the active skills per stat', () => {
    const s = newState();
    const a = makeInstance(1, 5); addToBox(s, a); s.party = [a.uid];
    expect(summarizePartners(activePartners(s))).toEqual(['+3% Neutral damage', '+15% boss time']);
  });
});

describe('special partner skills', () => {
  it('scavenge, refund, clock and reveal come from the party; ranch from the worker itself', () => {
    const s = newState();
    const lamball = makeInstance(1, 5), chikipi = makeInstance(3, 5);   // Fluffy Shield → clock; Egg Layer → ranch
    addToBox(s, lamball); addToBox(s, chikipi);
    s.party = [lamball.uid];
    expect(clockMult(s)).toBeCloseTo(1.15);
    expect(scavengeChance(s)).toBe(0);
    expect(refundChance(s)).toBe(0);
    expect(revealsUnseen(s)).toBe(false);
    expect(ranchMult(palById(3))).toBe(2);
    expect(ranchMult(palById(1))).toBe(1);
    const digger = PALS.find((p) => p.partnerSkill === 'Gold Digger')!;
    const sense = PALS.find((p) => p.partnerSkill === 'Sixth Sense')!;
    const buddy = PALS.find((p) => p.partnerSkill === 'Travel Companion')!;
    const d = makeInstance(digger.id, 5), se = makeInstance(sense.id, 5), b = makeInstance(buddy.id, 5);
    addToBox(s, d); addToBox(s, se); addToBox(s, b);
    s.party = [d.uid, se.uid, b.uid];
    expect(scavengeChance(s)).toBeCloseTo(0.15);
    expect(refundChance(s)).toBeCloseTo(0.25);
    expect(revealsUnseen(s)).toBe(true);
    expect(summarizePartners(activePartners(s))).toEqual(expect.arrayContaining(['15% extra drops', 'unseen species named', '25% sphere refunds']));
  });

  it('refunds the sphere on a miss and drops an extra item, with the dice on their side', () => {
    const s = newState();
    s.inventory.sphere_pal = 1;
    const buddy = PALS.find((p) => p.partnerSkill === 'Travel Companion')!;
    const digger = PALS.find((p) => p.partnerSkill === 'Gold Digger')!;
    const b = makeInstance(buddy.id, 5), d = makeInstance(digger.id, 5);
    addToBox(s, b); addToBox(s, d); s.party = [b.uid, d.uid];
    const wild = { palId: 1, level: 1, hp: 1, maxHp: 1, lucky: false, kind: 'wild' as const };
    const res = tryCatch(s, wild, () => 0.99);                    // miss, then the refund roll: 0.99 > 0.25 → no refund
    expect(res.outcome).toBe('failed');
    expect('refunded' in res && res.refunded).toBeFalsy();
    expect(s.inventory.sphere_pal).toBe(0);
    s.inventory.sphere_pal = 1;
    let rolls = [0.99, 0.1];                                      // miss, refund
    expect(tryCatch(s, wild, () => rolls.shift()!)).toMatchObject({ outcome: 'failed', refunded: true });
    expect(s.inventory.sphere_pal).toBe(1);
    let before = s.inventory.wool ?? 0;
    applyDefeat(s, wild, () => 0);                                // Lamball always drops 1 Wool at the minimum roll; the scavenge roll (0 < 0.15) adds one
    expect((s.inventory.wool ?? 0) - before).toBe(2);
    s.party = [b.uid];                                            // no digger: just the natural drop
    before = s.inventory.wool ?? 0;
    applyDefeat(s, wild, () => 0);
    expect((s.inventory.wool ?? 0) - before).toBe(1);
  });

  it('names unseen species on spawn tables with a Sixth Sense in the party', () => {
    const s = newState();
    expect(spawnTable(s, routeById('plateau').spawns)[0].name).toBe('???');
    const sense = PALS.find((p) => p.partnerSkill === 'Sixth Sense')!;
    const se = makeInstance(sense.id, 5); addToBox(s, se); s.party = [se.uid];
    expect(spawnTable(s, routeById('plateau').spawns)[0].name).toBe('Lamball');
  });
});
