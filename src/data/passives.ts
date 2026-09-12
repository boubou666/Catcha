// Passive skills. Multipliers stack multiplicatively across a Pal's (up to 4) passives.
//   attack → party damage       work → base output for that worker       food → that worker's berry consumption

export type PassiveStat = 'attack' | 'work' | 'food';

export interface PassiveDef {
  id: string;
  name: string;
  tier: -2 | -1 | 1 | 2 | 3;         // for colouring: negative, weak, good, great, legendary
  effects: Partial<Record<PassiveStat, number>>;
  weight: number;                     // wild roll weight; 0 = never rolled (granted only)
  desc: string;
}

export const MAX_PASSIVES = 4;

/** Chance of rolling 0, 1, 2, 3, 4 passives on a wild catch. */
export const WILD_PASSIVE_COUNT_WEIGHTS = [0.4, 0.3, 0.2, 0.08, 0.02];

/** Per open slot, chance an egg gains a random passive not held by either parent. */
export const MUTATION_CHANCE = 0.1;

const P = (id: string, name: string, tier: PassiveDef['tier'], effects: PassiveDef['effects'], weight: number, desc: string): PassiveDef =>
  ({ id, name, tier, effects, weight, desc });

export const PASSIVES: PassiveDef[] = [
  // attack
  P('brave',       'Brave',            1, { attack: 1.10 },              10, '+10% attack.'),
  P('ferocious',   'Ferocious',        2, { attack: 1.20 },               5, '+20% attack.'),
  P('musclehead',  'Musclehead',       2, { attack: 1.30, work: 0.5 },    4, '+30% attack, −50% work.'),
  P('coward',      'Coward',          -1, { attack: 0.90 },               8, '−10% attack.'),
  P('pacifist',    'Pacifist',        -2, { attack: 0.80 },               4, '−20% attack.'),
  // work
  P('serious',     'Serious',          1, { work: 1.20 },                 8, '+20% work.'),
  P('artisan',     'Artisan',          2, { work: 1.50 },                 3, '+50% work.'),
  P('work_slave',  'Work Slave',       2, { work: 1.30, attack: 0.7 },    4, '+30% work, −30% attack.'),
  P('conceited',   'Conceited',        1, { work: 1.10 },                 8, '+10% work.'),
  P('clumsy',      'Clumsy',          -1, { work: 0.90 },                 8, '−10% work.'),
  P('slacker',     'Slacker',         -2, { work: 0.70 },                 4, '−30% work.'),
  // food
  P('dainty',      'Dainty Eater',     1, { food: 0.90 },                 8, '−10% food consumption.'),
  P('diet_lover',  'Diet Lover',       2, { food: 0.85 },                 5, '−15% food consumption.'),
  P('glutton',     'Glutton',         -1, { food: 1.15 },                 8, '+15% food consumption.'),
  P('bottomless',  'Bottomless Stomach', -2, { food: 1.50 },              3, '+50% food consumption.'),
  // mixed / granted
  P('positive',    'Positive Thinker', 1, { attack: 1.05, work: 1.05 },   6, '+5% attack and work.'),
  P('lucky',       'Lucky',            3, { attack: 1.15, work: 1.15 },   0, '+15% attack and work. Every Lucky Pal has it.'),
  P('legend',      'Legend',           3, { attack: 1.20, work: 1.20 },   0, '+20% attack and work. Every legendary species has it.'),
];

const BY_ID = new Map(PASSIVES.map((p) => [p.id, p]));
export function passiveById(id: string): PassiveDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown passive ${id}`);
  return p;
}

/** Passives that can turn up on a wild catch or as an egg mutation. */
export const ROLLABLE = PASSIVES.filter((p) => p.weight > 0);
