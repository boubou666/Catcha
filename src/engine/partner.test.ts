import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { PALS, palById } from '../data/pals';
import { describePartner, partnerEffect, PARTNER_PCT } from '../data/partner';
import { activePartners, partnerAttackMult, partnerMult, summarizePartners } from './partner';
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
    expect(describePartner(palById(1))).toBe('Fluffy Shield — +3% damage for Neutral party members');
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
    expect(summarizePartners(activePartners(s))).toEqual(['+3% Neutral damage']);
  });
});
