import type { Element } from './types';

// attacker -> elements it deals 2x to
const STRONG_AGAINST: Record<Element, Element[]> = {
  Fire: ['Grass', 'Ice'],
  Water: ['Fire'],
  Grass: ['Ground'],
  Ground: ['Electric'],
  Electric: ['Water'],
  Ice: ['Dragon'],
  Dragon: ['Dark'],
  Dark: ['Neutral'],
  Neutral: [],
};

export const STRONG_MULT = 2;
export const WEAK_MULT = 0.5;

/** Multiplier for a single attacking element vs a single defending element. */
export function singleMult(attacker: Element, defender: Element): number {
  if (STRONG_AGAINST[attacker].includes(defender)) return STRONG_MULT;
  if (STRONG_AGAINST[defender].includes(attacker)) return WEAK_MULT;
  return 1;
}

/**
 * Multiplier for a Pal with `attacker` elements hitting a Pal with `defender` elements.
 * A Pal attacks with its best element; a dual-element defender's weaknesses stack.
 */
export function elementMult(attacker: Element[], defender: Element[]): number {
  let best = 0;
  for (const a of attacker) {
    let m = 1;
    for (const d of defender) m *= singleMult(a, d);
    best = Math.max(best, m);
  }
  return best || 1;
}

export const ELEMENT_COLORS: Record<Element, string> = {
  Neutral: '#b8b2a7',
  Fire: '#f2622e',
  Water: '#3a8fe8',
  Grass: '#5cb85c',
  Electric: '#f2c230',
  Ice: '#8fd7ec',
  Ground: '#b6742d',
  Dark: '#6b4c9a',
  Dragon: '#d63b8b',
};
