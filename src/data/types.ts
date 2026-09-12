// Static content definitions (*Def) and the mutable player state (SaveState).
// Everything in src/data is data only — no game logic lives here.

export type Element =
  | 'Neutral' | 'Fire' | 'Water' | 'Grass' | 'Electric'
  | 'Ice' | 'Ground' | 'Dark' | 'Dragon';

export const ELEMENTS: Element[] = [
  'Neutral', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Ground', 'Dark', 'Dragon',
];

export type WorkType =
  | 'Kindling' | 'Watering' | 'Planting' | 'Electricity' | 'Handiwork' | 'Gathering'
  | 'Lumbering' | 'Mining' | 'Medicine' | 'Cooling' | 'Transporting' | 'Farming';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type SphereTier = 'pal' | 'mega' | 'giga' | 'hyper' | 'ultra' | 'legendary';
export const SPHERE_TIERS: SphereTier[] = ['pal', 'mega', 'giga', 'hyper', 'ultra', 'legendary'];

export interface Drop {
  itemId: string;
  chance: number; // 0..1
  min: number;
  max: number;
}

export interface PalDef {
  id: number;                // Paldeck number
  name: string;
  variantOf?: number;
  elements: Element[];       // 1–2
  rarity: Rarity;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  work: Partial<Record<WorkType, 1 | 2 | 3 | 4>>;
  farmDrop?: { itemId: string; perMinute: number };
  drops: Drop[];
  breedPower: number;        // combi rank; lower = "stronger" child
  partnerSkill?: string;
}

export type Requirement =
  | { kind: 'none' }
  | { kind: 'routeCleared'; id: string }
  | { kind: 'alpha'; id: string }
  | { kind: 'tower'; id: string }
  | { kind: 'level'; n: number }
  | { kind: 'all'; of: Requirement[] };

export interface RouteDef {
  id: string;
  regionId: string;
  name: string;
  level: number;
  dominant: Element;                          // UI hint only; combat uses the wild Pal's real elements
  spawns: { palId: number; weight: number }[];
  unlock: Requirement;
  killsToClear: number;
}

export interface AlphaDef {
  id: string;
  regionId: string;
  palId: number;
  level: number;
  hpMult: number;
  unlock: Requirement;
  reward: { gold: number; effigies?: number };
}

export interface TowerDef {
  id: string;
  regionId: string;
  name: string;
  boss: string;              // "Zoe & Grizzbolt"
  palId: number;
  level: number;
  hp: number;
  timeLimitSec: number;
  unlock: Requirement;
}

export interface RegionDef {
  id: string;
  name: string;
  routes: RouteDef[];
  alphas: AlphaDef[];
  tower: TowerDef;
}

export interface ItemDef {
  id: string;
  name: string;
  category: 'material' | 'food' | 'sphere' | 'consumable';
}

// ---------------------------------------------------------------------------
// Player state — the only thing that is mutable and the only thing saved.

export interface PalInstance {
  uid: string;
  palId: number;
  level: number;
  exp: number;
  stars: 0 | 1 | 2 | 3 | 4;
  lucky: boolean;
  passives: string[];
}

export type SpherePolicy = SphereTier | 'none';

export interface SaveState {
  version: number;
  player: {
    level: number;
    exp: number;
    gold: number;
    techPoints: number;
    effigies: number;
    weaponTier: number;
  };
  paldeck: Record<number, { seen: boolean; caught: number }>;
  party: string[];                       // PalInstance uids, max 5
  box: PalInstance[];
  inventory: Record<string, number>;     // itemId -> count (spheres are items: sphere_<tier>)
  tech: string[];
  progress: {
    route: string;
    routeKills: Record<string, number>;
    alphas: string[];
    towers: string[];
  };
  settings: {
    sphereForNew: SpherePolicy;          // sphere to throw at a Pal not yet in the Paldeck
    sphereForDupe: SpherePolicy;         // sphere to throw at an already-caught species
  };
  lastSavedAt: number;
}
