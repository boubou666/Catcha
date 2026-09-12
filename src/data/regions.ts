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
    hp: 50_000, timeLimitSec: 600,
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
    hp: 100_000, timeLimitSec: 600,
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
    hp: 190_000, timeLimitSec: 600,
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
    hp: 330_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'blazamut' }, { kind: 'routeCleared', id: 'pidf' }] },
  },
};

// ---------------------------------------------------------------------------
// Region 5 — Astral Mountains (Lv 45–55) · Victor & Shadowbeak

const R5 = 'astral';

const astral: RegionDef = {
  id: R5, name: 'Astral Mountains',
  routes: ([
    ['astral_foot', 'Astral Foothills',            46, 'Ice',     [[57, 25], [59, 20], [1012, 15], [1032, 15], [1024, 10], [54, 15]],  { kind: 'tower', id: 'marcus' }, 380],
    ['frozen',      'Frozen Forest',               48, 'Grass',   [[77, 20], [78, 20], [87, 20], [92, 15], [91, 10], [79, 15]],       { kind: 'routeCleared', id: 'astral_foot' }, 400],
    ['ridge',       'Lake Ridge',                  49, 'Water',   [[82, 25], [1071, 20], [1089, 20], [65, 20], [101, 5], [59, 10]],    { kind: 'routeCleared', id: 'frozen' }, 420],
    ['glacier',     'Glacier Pass',                51, 'Ice',     [[79, 20], [83, 10], [91, 20], [1088, 15], [1090, 5], [57, 30]],     { kind: 'alpha', id: 'wumpo' }, 440],
    ['summit',      'Astral Summit',               52, 'Neutral', [[108, 5], [109, 5], [83, 20], [1089, 25], [1071, 25], [79, 20]],   { kind: 'routeCleared', id: 'glacier' }, 460],
    ['sanctuary',   'Wildlife Sanctuary No. 3',    54, 'Dragon',  [[111, 3], [110, 3], [109, 10], [108, 10], [82, 30], [1090, 20], [1110, 3], [92, 21]], { kind: 'alpha', id: 'cryolinx' }, 480],
    ['genetics',    'PAL Genetic Research Unit',   55, 'Dark',    [[109, 15], [1110, 5], [97, 20], [99, 20], [98, 20], [83, 20]],      { kind: 'alpha', id: 'frostallion' }, 500],
  ] as RouteArgs[]).map((a) => route(R5, a)),
  alphas: [
    { id: 'wumpo',       regionId: R5, palId: 91,  level: 48, hpMult: 30, unlock: { kind: 'routeCleared', id: 'ridge' },     reward: { gold: 70000, effigies: 6 } },
    { id: 'cryolinx',    regionId: R5, palId: 83,  level: 52, hpMult: 34, unlock: { kind: 'routeCleared', id: 'summit' },    reward: { gold: 100000, effigies: 6 } },
    { id: 'frostallion', regionId: R5, palId: 110, level: 55, hpMult: 40, unlock: { kind: 'routeCleared', id: 'sanctuary' }, reward: { gold: 150000, effigies: 8 } },
  ],
  tower: {
    id: 'victor', regionId: R5,
    name: 'PAL Genetic Research Unit Tower', boss: 'Victor & Shadowbeak', palId: 107, level: 55,
    hp: 620_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'frostallion' }, { kind: 'routeCleared', id: 'genetics' }] },
  },
};

// ---------------------------------------------------------------------------
// Region 6 — Sakurajima (Lv 55–62) · Saya & Selyne

const R6 = 'sakurajima';

const sakurajima: RegionDef = {
  id: R6, name: 'Sakurajima',
  routes: ([
    ['rice',       'Sakurajima Rice Fields',    56, 'Grass',    [[113, 25], [112, 25], [114, 20], [1086, 15], [115, 15]],           { kind: 'tower', id: 'victor' }, 520],
    ['cedar',      'Cedar Forest',              57, 'Electric', [[1033, 20], [1064, 20], [1091, 15], [114, 20], [1036, 25]],         { kind: 'routeCleared', id: 'rice' }, 540],
    ['shrine',     'Moonflower Shrine Path',    58, 'Dark',     [[116, 30], [117, 25], [1104, 5], [121, 30], [122, 5], [1036, 5]],   { kind: 'routeCleared', id: 'cedar' }, 560],
    ['hotspring',  'Hot Spring Cliffs',         59, 'Water',    [[1080, 20], [1102, 10], [112, 25], [1085, 20], [1086, 25]],         { kind: 'alpha', id: 'knocklem' }, 580],
    ['dojo',       "Yakumo's Dojo",             60, 'Electric', [[119, 25], [120, 20], [118, 20], [1085, 20], [115, 15]],            { kind: 'routeCleared', id: 'hotspring' }, 600],
    ['crash',      'Meteorite Crash Site',      61, 'Dark',     [[123, 30], [124, 10], [117, 25], [116, 25], [125, 2], [122, 8]],    { kind: 'alpha', id: 'dogen' }, 620],
    ['moonflower', 'Moonflower Tower Approach', 62, 'Neutral',  [[124, 15], [123, 20], [120, 20], [119, 20], [1104, 15], [122, 10]], { kind: 'alpha', id: 'xenolord' }, 650],
  ] as RouteArgs[]).map((a) => route(R6, a)),
  alphas: [
    { id: 'knocklem', regionId: R6, palId: 118, level: 57, hpMult: 34, unlock: { kind: 'routeCleared', id: 'shrine' }, reward: { gold: 200000, effigies: 8 } },
    { id: 'dogen',    regionId: R6, palId: 120, level: 60, hpMult: 38, unlock: { kind: 'routeCleared', id: 'dojo' },   reward: { gold: 300000, effigies: 8 } },
    { id: 'xenolord', regionId: R6, palId: 125, level: 62, hpMult: 45, unlock: { kind: 'routeCleared', id: 'crash' },  reward: { gold: 500000, effigies: 10 } },
  ],
  tower: {
    id: 'saya', regionId: R6,
    name: 'Moonflower Tower', boss: 'Saya & Selyne', palId: 126, level: 62,
    hp: 850_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'xenolord' }, { kind: 'routeCleared', id: 'moonflower' }] },
  },
};

// ---------------------------------------------------------------------------
// Region 7 — Feybreak (Lv 62–70) · Bjorn & Bastigor

const R7 = 'feybreak';

const feybreak: RegionDef = {
  id: R7, name: 'Feybreak',
  routes: ([
    ['shore',     'Feybreak Shore',       63, 'Water',   [[139, 30], [140, 25], [138, 10], [1065, 15], [1082, 20]],           { kind: 'tower', id: 'saya' }, 680],
    ['wetlands',  'Feybreak Wetlands',    64, 'Ground',  [[1047, 20], [1048, 20], [1092, 15], [137, 30], [1095, 15]],          { kind: 'routeCleared', id: 'shore' }, 700],
    ['ghostwood', 'Ghostwood',            65, 'Dark',    [[127, 25], [134, 20], [132, 10], [141, 20], [133, 25]],              { kind: 'routeCleared', id: 'wetlands' }, 720],
    ['starfall',  'Starfall Plateau',     66, 'Neutral', [[128, 15], [129, 15], [131, 15], [135, 15], [1097, 15], [137, 25]],  { kind: 'alpha', id: 'omascul' }, 740],
    ['embers',    'Feybreak Embers',      67, 'Fire',    [[130, 30], [1138, 10], [1140, 25], [1141, 20], [1096, 5], [131, 10]], { kind: 'routeCleared', id: 'starfall' }, 760],
    ['terra',     'Terra Ruins',          68, 'Ground',  [[1099, 15], [1092, 20], [1105, 10], [142, 2], [129, 25], [132, 28]], { kind: 'alpha', id: 'azurmane' }, 780],
    ['peak',      "Bastigor's Peak",      70, 'Ice',     [[138, 20], [1082, 20], [128, 20], [130, 15], [142, 3], [1096, 7], [135, 15]], { kind: 'alpha', id: 'bellanoir' }, 800],
  ] as RouteArgs[]).map((a) => route(R7, a)),
  alphas: [
    { id: 'omascul',   regionId: R7, palId: 132, level: 65, hpMult: 40, unlock: { kind: 'routeCleared', id: 'ghostwood' }, reward: { gold: 800000, effigies: 10 } },
    { id: 'azurmane',  regionId: R7, palId: 135, level: 67, hpMult: 44, unlock: { kind: 'routeCleared', id: 'embers' },    reward: { gold: 1200000, effigies: 10 } },
    { id: 'bellanoir', regionId: R7, palId: 142, level: 69, hpMult: 50, unlock: { kind: 'routeCleared', id: 'terra' },     reward: { gold: 2000000, effigies: 12 } },
  ],
  tower: {
    id: 'bjorn', regionId: R7,
    name: 'Feybreak Tower', boss: 'Bjorn & Bastigor', palId: 136, level: 70,
    hp: 1_150_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'bellanoir' }, { kind: 'routeCleared', id: 'peak' }] },
  },
};

export const REGIONS: RegionDef[] = [windswept, marsh, dunes, obsidian, astral, sakurajima, feybreak];

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
