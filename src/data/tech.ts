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
  S('medicine_bench', 'Medicine Workbench', 6, 2, 'Medicine Pals keep the base sane.'),
  R('sphere_mega', 'Mega Sphere', 6, 2, 'A better sphere: ×1.5 catch rate.', ['r_sphere_pal', 's_furnace']),
  M('labor_1', 'Efficient Labor I', 6, 2, 'base', 1.15, '+15% base output.'),
  // level 7
  M('capture', 'Capture Technique', 7, 2, 'catch', 1.15, '+15% catch rate with every sphere.'),
  M('haggling', 'Haggling', 7, 2, 'gold', 1.2, '+20% gold from defeated Pals.'),
  // level 8
  S('hot_spring', 'Hot Spring', 8, 2, 'Workers lose SAN much slower.'),
  S('pal_beds', 'Pal Beds', 9, 2, 'Resting Pals recover SAN faster.'),
  S('watchtower', 'Watchtower', 12, 3, 'Workers defend the base properly; higher levels buy time and rally the party.'),
  S('assembly_line', 'Sphere Assembly Line', 14, 3, 'Multiplies Handiwork on the craft queue.', ['s_workbench']),
  S('breeding_farm', 'Breeding Farm', 8, 3, 'Pair Pals to produce eggs.', ['s_ranch']),
  R('cake', 'Cake', 8, 2, 'Bake Cake for the Breeding Farm.', ['s_breeding_farm']),
  // level 9
  S('expedition_post', 'Expedition Post', 9, 2, 'Send idle Pals on expeditions.'),
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
  // level 35–55: raids
  S('altar', 'Summoning Altar', 35, 4, 'Summon raid bosses at your base.'),
  R('slab_bellanoir', 'Bellanoir Slab', 35, 3, 'Assemble 4 Slab Fragments into a Bellanoir summoning slab.', ['s_altar']),
  R('slab_xenolord', 'Xenolord Slab', 45, 4, 'Assemble 8 Slab Fragments into a Xenolord summoning slab.', ['r_slab_bellanoir']),
  R('slab_libero', 'Bellanoir Libero Slab', 55, 5, 'The ultimate raid. 6 fragments and 2 Diamonds.', ['r_slab_bellanoir']),
  // level 40
  R('sphere_legendary', 'Legendary Sphere', 40, 6, 'The ultimate sphere: ×6.5 catch rate. Needs a Diamond.', ['r_sphere_ultra']),
  M('labor_4', 'Efficient Labor IV', 40, 6, 'base', 1.3, '+30% base output.', ['labor_3']),
  M('training_5', 'Pal Training V', 40, 6, 'attack', 1.3, '+30% party attack.', ['training_4']),
  // level 50
  M('capture_3', 'Capture Technique III', 50, 7, 'catch', 1.25, '+25% catch rate.', ['capture_2']),
  M('labor_5', 'Efficient Labor V', 50, 7, 'base', 1.35, '+35% base output.', ['labor_4']),
  M('training_6', 'Pal Training VI', 50, 7, 'attack', 1.35, '+35% party attack.', ['training_5']),
  // level 60
  M('capture_4', 'Capture Technique IV', 60, 8, 'catch', 1.3, '+30% catch rate.', ['capture_3']),
  M('labor_6', 'Efficient Labor VI', 60, 8, 'base', 1.4, '+40% base output.', ['labor_5']),
  M('training_7', 'Pal Training VII', 60, 8, 'attack', 1.4, '+40% party attack.', ['training_6']),
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
