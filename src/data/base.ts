import type { Requirement, WorkType } from './types';

// ---------------------------------------------------------------------------
// Jobs — what each work suitability does at the base.

export interface JobDef {
  type: WorkType;
  icon: string;
  effect: string;
}

export const JOBS: JobDef[] = [
  { type: 'Lumbering',    icon: '🪓', effect: 'Wood. Logging Site multiplies.' },
  { type: 'Mining',       icon: '⛏️', effect: 'Stone, Ore, Paldium. Stone Pit multiplies.' },
  { type: 'Planting',     icon: '🌱', effect: 'Berries — needs Planting, Watering and Gathering together (Berry Plantation).' },
  { type: 'Watering',     icon: '💧', effect: 'Berries — see Planting.' },
  { type: 'Gathering',    icon: '🧺', effect: 'Berries — see Planting.' },
  { type: 'Kindling',     icon: '🔥', effect: 'Smelts 2 Ore → 1 Ingot (Primitive Furnace).' },
  { type: 'Handiwork',    icon: '🔨', effect: 'Works the crafting queue (Workbench).' },
  { type: 'Farming',      icon: '🐑', effect: "That Pal's own produce: wool, eggs, milk, gold… (Ranch)." },
  { type: 'Transporting', icon: '📦', effect: '+3% to all base output per level (max +60%).' },
  { type: 'Electricity',  icon: '⚡', effect: '+5% to all base output per level (max +50%).' },
  { type: 'Cooling',      icon: '❄️', effect: '−10% food consumption per level (max −50%).' },
  { type: 'Medicine',     icon: '💊', effect: 'No effect yet (SAN system comes later).' },
];

export const JOB_ICON: Record<WorkType, string> = Object.fromEntries(JOBS.map((j) => [j.type, j.icon])) as Record<WorkType, string>;

// ---------------------------------------------------------------------------
// Rates — per work level per minute unless stated. Balance knobs.

export const RATES = {
  wood: 4,
  stone: 4,
  ore: 1,
  paldium: 0.8,
  berries: 1.5,             // per min(Planting, Watering, Gathering) level
  smelt: 0.5,               // ingots per Kindling level
  orePerIngot: 2,
  handiwork: 1,             // work units per Handiwork level per SECOND
  foodPerWorker: 0.5,       // berries per worker per minute
  hungryMult: 0.5,          // output multiplier when there is no food
  transportBonus: 0.03, transportCap: 0.6,
  electricBonus: 0.05, electricCap: 0.5,
  coolingSaving: 0.1, coolingCap: 0.5,
  starBonus: 0.1,           // work output per condensing star
};

export const FOOD_ITEM = 'red_berries';
export const BASE_SLOTS = 3;
export const QUEUE_CAP = 50;

// ---------------------------------------------------------------------------
// Structures — costs[level - 1] is the cost to reach that level. 'gold' is a valid key.

export interface StructureDef {
  id: string;
  name: string;
  desc: string;
  costs: Record<string, number>[];
}

export const STRUCTURES: StructureDef[] = [
  { id: 'workbench', name: 'Primitive Workbench', desc: 'Unlocks crafting. Handiwork Pals work the queue.',
    costs: [{ wood: 10 }] },
  { id: 'logging', name: 'Logging Site', desc: 'Lumbering output ×2 / ×3 / ×4.',
    costs: [{ wood: 30, stone: 10 }, { wood: 120, stone: 60 }, { wood: 400, stone: 200, ingot: 10 }] },
  { id: 'stone_pit', name: 'Stone Pit', desc: 'Mining output ×2 / ×3 / ×4.',
    costs: [{ wood: 30, stone: 10 }, { wood: 120, stone: 60 }, { wood: 400, stone: 200, ingot: 10 }] },
  { id: 'berry_plantation', name: 'Berry Plantation', desc: 'Grow Red Berries (base food). Higher levels ×2 / ×3.',
    costs: [{ wood: 50, stone: 20, berry_seeds: 3 }, { wood: 150, stone: 60, berry_seeds: 10 }, { wood: 400, stone: 200, berry_seeds: 25 }] },
  { id: 'furnace', name: 'Primitive Furnace', desc: 'Kindling Pals smelt Ore into Ingots.',
    costs: [{ stone: 20, wood: 10, flame_organ: 5 }] },
  { id: 'ranch', name: 'Ranch', desc: 'Farming Pals produce their own goods.',
    costs: [{ wood: 50, stone: 20, wool: 10 }] },
  { id: 'palbox', name: 'Palbox Expansion', desc: '+1 worker slot per level.',
    costs: [
      { gold: 150, paldium: 5 }, { gold: 300, paldium: 10 }, { gold: 600, paldium: 15 },
      { gold: 1200, paldium: 25 }, { gold: 2400, paldium: 40 }, { gold: 4800, paldium: 60 }, { gold: 9600, paldium: 100 },
    ] },
];

const STRUCTURE_BY_ID = new Map(STRUCTURES.map((s) => [s.id, s]));
export function structureById(id: string): StructureDef {
  const s = STRUCTURE_BY_ID.get(id);
  if (!s) throw new Error(`Unknown structure ${id}`);
  return s;
}

// ---------------------------------------------------------------------------
// Recipes — crafted at the Workbench by Handiwork.

export type RecipeOutput =
  | { kind: 'item'; itemId: string; n: number }
  | { kind: 'weapon'; tier: number; name: string };

export interface RecipeDef {
  id: string;
  name: string;
  output: RecipeOutput;
  inputs: Record<string, number>;
  work: number;              // Handiwork units per unit crafted
  unlock: Requirement;
}

export const RECIPES: RecipeDef[] = [
  { id: 'sphere_pal', name: 'Pal Sphere', output: { kind: 'item', itemId: 'sphere_pal', n: 1 },
    inputs: { paldium: 3, wood: 3, stone: 3 }, work: 60, unlock: { kind: 'none' } },
  { id: 'sphere_mega', name: 'Mega Sphere', output: { kind: 'item', itemId: 'sphere_mega', n: 1 },
    inputs: { ingot: 1, paldium: 5, wood: 5, stone: 5 }, work: 180, unlock: { kind: 'alpha', id: 'chillet' } },
  { id: 'sphere_giga', name: 'Giga Sphere', output: { kind: 'item', itemId: 'sphere_giga', n: 1 },
    inputs: { ingot: 2, paldium: 8, wood: 8, stone: 8 }, work: 400, unlock: { kind: 'tower', id: 'rayne' } },
  { id: 'wooden_club', name: 'Wooden Club', output: { kind: 'weapon', tier: 2, name: 'Wooden Club' },
    inputs: { wood: 20 }, work: 30, unlock: { kind: 'none' } },
  { id: 'stone_spear', name: 'Stone Spear', output: { kind: 'weapon', tier: 3, name: 'Stone Spear' },
    inputs: { wood: 30, stone: 30 }, work: 120, unlock: { kind: 'routeCleared', id: 'fort' } },
  { id: 'metal_spear', name: 'Metal Spear', output: { kind: 'weapon', tier: 4, name: 'Metal Spear' },
    inputs: { ingot: 15, wood: 40, stone: 40 }, work: 400, unlock: { kind: 'alpha', id: 'penking' } },
];

const RECIPE_BY_ID = new Map(RECIPES.map((r) => [r.id, r]));
export function recipeById(id: string): RecipeDef {
  const r = RECIPE_BY_ID.get(id);
  if (!r) throw new Error(`Unknown recipe ${id}`);
  return r;
}
