import type { AlphaDef, RegionDef, RouteDef, TowerDef } from './types';

const REGION = 'windswept';

const route = (
  id: string, name: string, level: number, dominant: RouteDef['dominant'],
  spawns: [palId: number, weight: number][], unlock: RouteDef['unlock'], killsToClear: number,
): RouteDef => ({
  id, regionId: REGION, name, level, dominant,
  spawns: spawns.map(([palId, weight]) => ({ palId, weight })),
  unlock, killsToClear,
});

const routes: RouteDef[] = [
  route('plateau',  'Plateau of Beginnings',      1,  'Neutral', [[1, 40], [2, 30], [3, 20], [4, 10]],                    { kind: 'none' }, 10),
  route('behemoth', 'Grassy Behemoth Hills',      3,  'Grass',   [[4, 20], [8, 20], [5, 15], [14, 15], [16, 15], [13, 15]], { kind: 'routeCleared', id: 'plateau' }, 20),
  route('fort',     'Fort Ruins',                 5,  'Water',   [[10, 25], [6, 20], [7, 20], [12, 20], [17, 15]],         { kind: 'routeCleared', id: 'behemoth' }, 30),
  route('cove',     'Small Cove',                 7,  'Water',   [[25, 25], [23, 25], [16, 15], [6, 15], [27, 20]],        { kind: 'alpha', id: 'chillet' }, 40),
  route('bridge',   'Bridge of the Twin Knights', 9,  'Ground',  [[20, 25], [22, 20], [21, 20], [19, 20], [26, 15]],       { kind: 'routeCleared', id: 'cove' }, 50),
  route('church',   'Abandoned Church',           11, 'Dark',    [[24, 15], [15, 25], [18, 20], [28, 20], [30, 20]],       { kind: 'routeCleared', id: 'bridge' }, 60),
  route('icewind',  'Ice Wind Island',            13, 'Ice',     [[10, 35], [11, 15], [29, 25], [55, 10], [9, 15]],        { kind: 'alpha', id: 'penking' }, 75),
];

const alphas: AlphaDef[] = [
  { id: 'chillet', regionId: REGION, palId: 55, level: 11, hpMult: 12, unlock: { kind: 'routeCleared', id: 'fort' },   reward: { gold: 500, effigies: 2 } },
  { id: 'penking', regionId: REGION, palId: 11, level: 15, hpMult: 15, unlock: { kind: 'routeCleared', id: 'church' }, reward: { gold: 1500, effigies: 3 } },
];

const tower: TowerDef = {
  id: 'rayne', regionId: REGION,
  name: 'Rayne Syndicate Tower', boss: 'Zoe & Grizzbolt', palId: 103, level: 15,
  hp: 30_000, timeLimitSec: 600,
  unlock: { kind: 'all', of: [{ kind: 'alpha', id: 'penking' }, { kind: 'routeCleared', id: 'icewind' }] },
};

export const REGIONS: RegionDef[] = [
  { id: REGION, name: 'Windswept Hills', routes, alphas, tower },
];

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
