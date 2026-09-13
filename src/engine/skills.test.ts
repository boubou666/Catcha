import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { addToBox, makeInstance } from './party';
import { chargeSkills, SKILL_CHARGE_SEC, SKILL_MULT, skillDamage, skillName } from './skills';
import { instanceAttack } from './formulas';
import { elementMult } from '../data/elements';
import { palById } from '../data/pals';

describe('active skills', () => {
  it('take their name from the element, charge over 20 s, and hit for six seconds of damage with the matchup', () => {
    const s = newState();
    const lamball = makeInstance(1, 10), foxparks = makeInstance(5, 10);
    addToBox(s, lamball); addToBox(s, foxparks); s.party = [lamball.uid, foxparks.uid];
    expect(skillName(lamball)).toBe('Power Shot');
    expect(skillName(foxparks)).toBe('Ignis Blast');
    const charges: Record<string, number> = {};
    expect(chargeSkills(charges, [lamball, foxparks], 5)).toEqual([]);
    expect(charges[lamball.uid]).toBe(5);
    expect(chargeSkills(charges, [lamball, foxparks], SKILL_CHARGE_SEC)).toEqual([lamball.uid, foxparks.uid]);
    expect(charges[foxparks.uid]).toBe(SKILL_CHARGE_SEC);   // capped
    // a Pal that left the party loses its charge
    expect(chargeSkills(charges, [lamball], 1)).toEqual([lamball.uid]);
    expect(charges[foxparks.uid]).toBeUndefined();
    const wild = { palId: 4, level: 5, hp: 100, maxHp: 100, lucky: false, kind: 'wild' as const };   // Lifmunk, Grass
    const fire = skillDamage(s, foxparks, wild);
    expect(fire).toBeCloseTo(instanceAttack(foxparks) * elementMult(['Fire'], palById(4).elements) * SKILL_MULT);   // Huggy Fire is a work skill and Fluffy Shield boosts Neutral: no help to a Fire skill
    expect(fire).toBeGreaterThan(skillDamage(s, lamball, wild));
    expect(skillDamage(s, lamball, null)).toBe(0);
  });
});
