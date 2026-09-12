import type { Element, RegionDef, RouteDef } from './types';

type Spawn = [palId: number, weight: number];
type RouteArgs = [id: string, name: string, level: number, dominant: Element, spawns: Spawn[], unlock: RouteDef['unlock'], killsToClear: number];

function route(regionId: string, [id, name, level, dominant, spawns, unlock, killsToClear]: RouteArgs): RouteDef {
  return { id, regionId, name, level, dominant, spawns: spawns.map(([palId, weight]) => ({ palId, weight })), unlock, killsToClear };
}

// ---------------------------------------------------------------------------
// Region 1 — Windswept Hills (Lv 1–15) · Zoe & Grizzbolt

const R1 = 'windswept';

const windswept: RegionDef = {
  id: R1, name: 'Windswept Hills',
  routes: ([
    ['plateau',  'Plateau of Beginnings',      1,  'Neutral', [[1, 40], [2, 30], [3, 20], [4, 10]],                          { kind: 'none' }, 10],
    ['behemoth', 'Grassy Behemoth Hills',      3,  'Grass',   [[4, 20], [8, 20], [5, 15], [14, 15], [16, 15], [13, 15]],       { kind: 'routeCleared', id: 'plateau' }, 20],
    ['fort',     'Fort Ruins',                 5,  'Water',   [[10, 25], [6, 20], [7, 20], [12, 20], [17, 15]],               { kind: 'routeCleared', id: 'behemoth' }, 30],
    ['cove',     'Small Cove',                 7,  'Water',   [[25, 25], [23, 20], [16, 15], [6, 15], [27, 15], [29, 10]],     { kind: 'alpha', id: 'chillet' }, 40],
    ['bridge',   'Bridge of the Twin Knights', 9,  'Ground',  [[20, 25], [22, 20], [21, 20], [19, 20], [26, 15]],             { kind: 'routeCleared', id: 'cove' }, 50],
    ['church',   'Abandoned Church',           11, 'Dark',    [[24, 15], [15, 25], [18, 20], [28, 20], [30, 20]],             { kind: 'routeCleared', id: 'bridge' }, 60],
    ['icewind',  'Ice Wind Island',            13, 'Ice',     [[10, 35], [11, 15], [29, 25], [55, 10], [9, 15]],              { kind: 'alpha', id: 'penking' }, 75],
  ] as RouteArgs[]).map((a) => route(R1, a)),
  alphas: [
    { id: 'chillet', regionId: R1, palId: 55, level: 11, hpMult: 12, unlock: { kind: 'routeCleared', id: 'fort' },   reward: { gold: 500, effigies: 2 } },
    { id: 'penking', regionId: R1, palId: 11, level: 15, hpMult: 15, unlock: { kind: 'routeCleared', id: 'church' }, reward: { gold: 1500, effigies: 3 } },
  ],
  tower: {
    id: 'rayne', regionId: R1,
    name: 'Rayne Syndicate Tower', boss: 'Zoe & Grizzbolt', palId: 103, level: 15,
    hp: 30_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'penking' }, { kind: 'routeCleared', id: 'icewind' }] },
  },
};

// ---------------------------------------------------------------------------
// Region 2 — Marsh & Bamboo Groves (Lv 15–25) · Lily & Lyleen

const R2 = 'marsh';

const marsh: RegionDef = {
  id: R2, name: 'Marsh & Bamboo Groves',
  routes: ([
    ['seabreeze', 'Sea Breeze Archipelago',    15, 'Water',    [[31, 30], [81, 30], [25, 15], [65, 10], [34, 15]],            { kind: 'tower', id: 'rayne' }, 50],
    ['marsh',     'Marsh Island',              17, 'Ground',   [[32, 25], [34, 20], [35, 20], [53, 20], [68, 15]],            { kind: 'routeCleared', id: 'seabreeze' }, 60],
    ['bamboo',    'Bamboo Groves',             19, 'Grass',    [[50, 30], [35, 20], [33, 10], [51, 5], [64, 15], [63, 20]],   { kind: 'routeCleared', id: 'marsh' }, 70],
    ['ravine',    'Ravine Entrance',           21, 'Ground',   [[67, 15], [52, 20], [66, 20], [60, 20], [62, 25]],            { kind: 'alpha', id: 'grintale' }, 80],
    ['lake',      'Lake Center',               23, 'Electric', [[56, 20], [60, 25], [70, 20], [69, 15], [54, 10], [53, 10]],  { kind: 'routeCleared', id: 'ravine' }, 90],
    ['forest',    'Mossanda Forest',           24, 'Grass',    [[33, 20], [86, 10], [93, 10], [89, 10], [50, 25], [61, 10]],  { kind: 'alpha', id: 'elizabee' }, 100],
    ['alliance',  'Free Pal Alliance Grounds', 25, 'Neutral',  [[89, 15], [93, 15], [52, 20], [63, 20], [68, 15], [51, 10]],  { kind: 'alpha', id: 'kingpaca' }, 120],
  ] as RouteArgs[]).map((a) => route(R2, a)),
  alphas: [
    { id: 'grintale', regionId: R2, palId: 52, level: 17, hpMult: 15, unlock: { kind: 'routeCleared', id: 'marsh' },  reward: { gold: 2000, effigies: 3 } },
    { id: 'elizabee', regionId: R2, palId: 51, level: 21, hpMult: 18, unlock: { kind: 'routeCleared', id: 'lake' },   reward: { gold: 3500, effigies: 3 } },
    { id: 'kingpaca', regionId: R2, palId: 89, level: 24, hpMult: 20, unlock: { kind: 'routeCleared', id: 'forest' }, reward: { gold: 5000, effigies: 4 } },
  ],
  tower: {
    id: 'lily', regionId: R2,
    name: 'Free Pal Alliance Tower', boss: 'Lily & Lyleen', palId: 104, level: 25,
    hp: 60_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'kingpaca' }, { kind: 'routeCleared', id: 'alliance' }] },
  },
};

// ---------------------------------------------------------------------------
// Region 3 — Twilight Dunes (Lv 25–35) · Axel & Orserk

const R3 = 'dunes';

const dunes: RegionDef = {
  id: R3, name: 'Twilight Dunes',
  routes: ([
    ['dunes',    'Twilight Dunes',              26, 'Ground',   [[42, 25], [43, 20], [37, 15], [38, 15], [46, 15], [49, 10]],  { kind: 'tower', id: 'lily' }, 130],
    ['oasis',    'Dessicated Desert Oasis',     28, 'Dark',     [[44, 25], [45, 20], [43, 20], [75, 20], [94, 10], [40, 5]],   { kind: 'routeCleared', id: 'dunes' }, 140],
    ['ruins',    'Ancient Ruins',               29, 'Neutral',  [[48, 20], [47, 20], [40, 15], [46, 15], [37, 15], [36, 15]],  { kind: 'routeCleared', id: 'oasis' }, 150],
    ['pyre',     'Eternal Pyre Approach',       31, 'Fire',     [[41, 25], [39, 15], [76, 20], [72, 15], [58, 15], [38, 10]],  { kind: 'alpha', id: 'elphidran' }, 160],
    ['canyon',   'Sealed Canyon',               32, 'Electric', [[73, 25], [71, 20], [74, 20], [95, 10], [85, 10], [76, 15]],  { kind: 'routeCleared', id: 'pyre' }, 170],
    ['crater',   'Obsidian Crater Rim',         34, 'Fire',     [[84, 20], [88, 15], [74, 20], [72, 15], [58, 20], [80, 10]],  { kind: 'alpha', id: 'mammorest' }, 180],
    ['brothers', 'Eternal Pyre Encampment',     35, 'Dark',     [[75, 20], [94, 15], [45, 20], [71, 15], [84, 15], [95, 15]],  { kind: 'alpha', id: 'anubis' }, 200],
  ] as RouteArgs[]).map((a) => route(R3, a)),
  alphas: [
    { id: 'elphidran', regionId: R3, palId: 80,  level: 28, hpMult: 20, unlock: { kind: 'routeCleared', id: 'ruins' },  reward: { gold: 8000, effigies: 4 } },
    { id: 'mammorest', regionId: R3, palId: 90,  level: 32, hpMult: 24, unlock: { kind: 'routeCleared', id: 'canyon' }, reward: { gold: 12000, effigies: 4 } },
    { id: 'anubis',    regionId: R3, palId: 100, level: 35, hpMult: 28, unlock: { kind: 'routeCleared', id: 'crater' }, reward: { gold: 20000, effigies: 5 } },
  ],
  tower: {
    id: 'axel', regionId: R3,
    name: 'Brothers of the Eternal Pyre Tower', boss: 'Axel & Orserk', palId: 106, level: 35,
    hp: 100_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'anubis' }, { kind: 'routeCleared', id: 'brothers' }] },
  },
};

// ---------------------------------------------------------------------------
// Region 4 — Mount Obsidian (Lv 35–45) · Marcus & Faleris

const R4 = 'obsidian';

const obsidian: RegionDef = {
  id: R4, name: 'Mount Obsidian',
  routes: ([
    ['foothills', 'Obsidian Foothills',     36, 'Fire',   [[41, 20], [1031, 25], [1081, 25], [1044, 20], [58, 10]],          { kind: 'tower', id: 'axel' }, 220],
    ['lava',      'Lava Flats',             38, 'Fire',   [[1058, 20], [76, 20], [72, 20], [1062, 20], [1075, 20]],          { kind: 'routeCleared', id: 'foothills' }, 240],
    ['nightpath', 'Ashen Night Path',       39, 'Dark',   [[1039, 25], [1072, 20], [1076, 20], [97, 10], [1075, 25]],        { kind: 'routeCleared', id: 'lava' }, 260],
    ['caldera',   'Caldera Descent',        41, 'Fire',   [[84, 20], [1084, 15], [88, 15], [74, 25], [1055, 25]],            { kind: 'alpha', id: 'helzephyr' }, 280],
    ['furnace',   'Furnace Cavern',         42, 'Ground', [[99, 10], [88, 25], [71, 25], [98, 5], [96, 5], [67, 30]],        { kind: 'routeCleared', id: 'caldera' }, 300],
    ['serpent',   "Serpent's Lava Lake",    44, 'Dragon', [[1101, 10], [101, 10], [1055, 20], [71, 20], [102, 10], [85, 15], [95, 15]], { kind: 'alpha', id: 'menasting' }, 320],
    ['pidf',      'PIDF Outpost',           45, 'Fire',   [[102, 15], [96, 10], [98, 10], [74, 25], [1084, 20], [97, 20]],   { kind: 'alpha', id: 'blazamut' }, 350],
  ] as RouteArgs[]).map((a) => route(R4, a)),
  alphas: [
    { id: 'helzephyr', regionId: R4, palId: 97, level: 38, hpMult: 24, unlock: { kind: 'routeCleared', id: 'nightpath' }, reward: { gold: 25000, effigies: 5 } },
    { id: 'menasting', regionId: R4, palId: 99, level: 42, hpMult: 28, unlock: { kind: 'routeCleared', id: 'furnace' },   reward: { gold: 35000, effigies: 5 } },
    { id: 'blazamut',  regionId: R4, palId: 96, level: 45, hpMult: 32, unlock: { kind: 'routeCleared', id: 'serpent' },   reward: { gold: 50000, effigies: 6 } },
  ],
  tower: {
    id: 'marcus', regionId: R4,
    name: 'PIDF Tower', boss: 'Marcus & Faleris', palId: 105, level: 45,
    hp: 180_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'blazamut' }, { kind: 'routeCleared', id: 'pidf' }] },
  },
};

export const REGIONS: RegionDef[] = [windswept, marsh, dunes, obsidian];

const ROUTES = new Map(REGIONS.flatMap((r) => r.routes).map((r) => [r.id, r]));
const ALPHAS = new Map(REGIONS.flatMap((r) => r.alphas).map((a) => [a.id, a]));
const TOWERS = new Map(REGIONS.map((r) => [r.tower.id, r.tower]));
const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));

function must<T>(m: Map<string, T>, id: string, what: string): T {
  const v = m.get(id);
  if (!v) throw new Error(`Unknown ${what} ${id}`);
  return v;
}

export const routeById = (id: string) => must(ROUTES, id, 'route');
export const alphaById = (id: string) => must(ALPHAS, id, 'alpha');
export const towerById = (id: string) => must(TOWERS, id, 'tower');
export const regionById = (id: string) => must(REGION_BY_ID, id, 'region');
export const STARTING_ROUTE = 'plateau';
