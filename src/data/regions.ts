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
    ['icewind',  'Ice Wind Island',            13, 'Ice',     [[10, 35], [11, 15], [29, 25], [41, 10], [9, 15]],              { kind: 'alpha', id: 'penking' }, 75],
  ] as RouteArgs[]).map((a) => route(R1, a)),
  alphas: [
    { id: 'chillet', regionId: R1, palId: 41, level: 11, hpMult: 12, unlock: { kind: 'routeCleared', id: 'fort' },   reward: { gold: 500, effigies: 2 } },
    { id: 'penking', regionId: R1, palId: 11, level: 15, hpMult: 15, unlock: { kind: 'routeCleared', id: 'church' }, reward: { gold: 1500, effigies: 3 } },
  ],
  tower: {
    id: 'rayne', regionId: R1,
    name: 'Rayne Syndicate Tower', boss: 'Zoe & Grizzbolt', palId: 88, level: 15,
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
    ['seabreeze', 'Sea Breeze Archipelago',    15, 'Water',    [[31, 30], [66, 30], [25, 15], [51, 10], [34, 15]],            { kind: 'tower', id: 'rayne' }, 50],
    ['marsh',     'Marsh Island',              17, 'Ground',   [[32, 25], [34, 20], [35, 20], [39, 20], [54, 15]],            { kind: 'routeCleared', id: 'seabreeze' }, 60],
    ['bamboo',    'Bamboo Groves',             19, 'Grass',    [[36, 30], [35, 20], [33, 10], [37, 5], [50, 15], [49, 20]],   { kind: 'routeCleared', id: 'marsh' }, 70],
    ['ravine',    'Ravine Entrance',           21, 'Ground',   [[53, 15], [38, 20], [52, 20], [46, 20], [48, 25]],            { kind: 'alpha', id: 'grintale' }, 80],
    ['lake',      'Lake Center',               23, 'Electric', [[42, 20], [46, 25], [56, 20], [55, 15], [40, 10], [39, 10]],  { kind: 'routeCleared', id: 'ravine' }, 90],
    ['forest',    'Mossanda Forest',           24, 'Grass',    [[33, 20], [71, 10], [78, 10], [74, 10], [36, 25], [47, 10]],  { kind: 'alpha', id: 'elizabee' }, 100],
    ['alliance',  'Free Pal Alliance Grounds', 25, 'Neutral',  [[74, 15], [78, 15], [38, 20], [49, 20], [54, 15], [37, 10]],  { kind: 'alpha', id: 'kingpaca' }, 120],
  ] as RouteArgs[]).map((a) => route(R2, a)),
  alphas: [
    { id: 'grintale', regionId: R2, palId: 38, level: 17, hpMult: 15, unlock: { kind: 'routeCleared', id: 'marsh' },  reward: { gold: 2000, effigies: 3 } },
    { id: 'elizabee', regionId: R2, palId: 37, level: 21, hpMult: 18, unlock: { kind: 'routeCleared', id: 'lake' },   reward: { gold: 3500, effigies: 3 } },
    { id: 'kingpaca', regionId: R2, palId: 74, level: 24, hpMult: 20, unlock: { kind: 'routeCleared', id: 'forest' }, reward: { gold: 5000, effigies: 4 } },
  ],
  tower: {
    id: 'lily', regionId: R2,
    name: 'Free Pal Alliance Tower', boss: 'Lily & Lyleen', palId: 89, level: 25,
    hp: 60_000, timeLimitSec: 600,
    unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'kingpaca' }, { kind: 'routeCleared', id: 'alliance' }] },
  },
};

export const REGIONS: RegionDef[] = [windswept, marsh];

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
