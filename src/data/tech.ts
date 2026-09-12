// Technology tree. Structures and recipes listed here can't be built/crafted until researched;
// anything not referenced by a tech is available from the start.

export type TechStat = 'click' | 'attack' | 'base' | 'catch' | 'exp' | 'gold';

export type TechEffect =
  | { kind: 'structure'; id: string }
  | { kind: 'recipe'; id: string }
  | { kind: 'mult'; stat: TechStat; mult: number };

export interface TechDef {
  id: string;
  name: string;
  level: number;              // player level required
  cost: number;               // tech points
  requires?: string[];        // tech ids
  effect: TechEffect;
  desc: string;
}

export const TECH_POINTS_PER_LEVEL = 2;
export const STARTING_TECH_POINTS = 2;

const S = (id: string, name: string, level: number, cost: number, desc: string, requires?: string[]): TechDef =>
  ({ id: `s_${id}`, name, level, cost, requires, effect: { kind: 'structure', id }, desc });
const R = (id: string, name: string, level: number, cost: number, desc: string, requires?: string[]): TechDef =>
  ({ id: `r_${id}`, name, level, cost, requires, effect: { kind: 'recipe', id }, desc });
const M = (id: string, name: string, level: number, cost: number, stat: TechStat, mult: number, desc: string, requires?: string[]): TechDef =>
  ({ id, name, level, cost, requires, effect: { kind: 'mult', stat, mult }, desc });

export const TECHS: TechDef[] = [
  // level 1
  S('workbench', 'Primitive Workbench', 1, 1, 'Unlocks crafting at the base.'),
  R('sphere_pal', 'Pal Sphere', 1, 1, 'Craft Pal Spheres from Paldium, Wood and Stone.', ['s_workbench']),
  R('wooden_club', 'Wooden Club', 1, 1, 'A weapon: click damage tier 2.', ['s_workbench']),
  // level 2
  S('logging', 'Logging Site', 2, 1, 'Multiplies Lumbering output.'),
  S('stone_pit', 'Stone Pit', 2, 1, 'Multiplies Mining output.'),
  // level 3
  S('berry_plantation', 'Berry Plantation', 3, 2, 'Grow Red Berries to feed your workers.'),
  S('ranch', 'Ranch', 3, 2, 'Farming Pals produce their own goods.'),
  M('sharp_tools', 'Sharpened Tools', 3, 2, 'click', 1.25, '+25% click damage.'),
  // level 4
  S('furnace', 'Primitive Furnace', 4, 2, 'Kindling Pals smelt Ore into Ingots.'),
  R('stone_spear', 'Stone Spear', 4, 2, 'A weapon: click damage tier 3.', ['r_wooden_club']),
  M('field_study', 'Field Study', 4, 1, 'exp', 1.2, '+20% experience for you and your party.'),
  // level 5
  S('palbox', 'Palbox Expansion', 5, 1, 'Buy extra worker slots for the base.'),
  M('training_1', 'Pal Training I', 5, 2, 'attack', 1.1, '+10% party attack.'),
  // level 6
  R('sphere_mega', 'Mega Sphere', 6, 2, 'A better sphere: ×1.5 catch rate.', ['r_sphere_pal', 's_furnace']),
  M('labor_1', 'Efficient Labor I', 6, 2, 'base', 1.15, '+15% base output.'),
  // level 7
  M('capture', 'Capture Technique', 7, 2, 'catch', 1.15, '+15% catch rate with every sphere.'),
  M('haggling', 'Haggling', 7, 2, 'gold', 1.2, '+20% gold from defeated Pals.'),
  // level 8
  S('breeding_farm', 'Breeding Farm', 8, 3, 'Pair Pals to produce eggs.', ['s_ranch']),
  R('cake', 'Cake', 8, 2, 'Bake Cake for the Breeding Farm.', ['s_breeding_farm']),
  // level 10
  S('condenser', 'Pal Essence Condenser', 10, 3, 'Condense duplicates into stars.', ['s_furnace']),
  M('training_2', 'Pal Training II', 10, 3, 'attack', 1.15, '+15% party attack.', ['training_1']),
  // level 12
  R('metal_spear', 'Metal Spear', 12, 3, 'A weapon: click damage tier 4.', ['r_stone_spear', 's_furnace']),
  R('sphere_giga', 'Giga Sphere', 12, 3, 'A great sphere: ×2.2 catch rate.', ['r_sphere_mega']),
  M('labor_2', 'Efficient Labor II', 12, 3, 'base', 1.2, '+20% base output.', ['labor_1']),
  // level 20
  R('sphere_hyper', 'Hyper Sphere', 20, 4, 'A superb sphere: ×3.2 catch rate.', ['r_sphere_giga']),
  M('training_3', 'Pal Training III', 20, 4, 'attack', 1.2, '+20% party attack.', ['training_2']),
  M('labor_3', 'Efficient Labor III', 20, 4, 'base', 1.25, '+25% base output.', ['labor_2']),
  // level 25–30
  M('capture_2', 'Capture Technique II', 25, 4, 'catch', 1.2, '+20% catch rate.', ['capture']),
  R('sphere_ultra', 'Ultra Sphere', 30, 5, 'An exceptional sphere: ×4.5 catch rate.', ['r_sphere_hyper']),
  M('training_4', 'Pal Training IV', 30, 5, 'attack', 1.25, '+25% party attack.', ['training_3']),
];

const BY_ID = new Map(TECHS.map((t) => [t.id, t]));
export function techById(id: string): TechDef {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown tech ${id}`);
  return t;
}

const STRUCTURE_TECH = new Map(TECHS.filter((t) => t.effect.kind === 'structure').map((t) => [(t.effect as { id: string }).id, t]));
const RECIPE_TECH = new Map(TECHS.filter((t) => t.effect.kind === 'recipe').map((t) => [(t.effect as { id: string }).id, t]));

/** The tech that gates a structure / recipe, if any. */
export const structureTech = (structureId: string) => STRUCTURE_TECH.get(structureId);
export const recipeTech = (recipeId: string) => RECIPE_TECH.get(recipeId);
