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
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export type WildKind = 'wild' | 'alpha' | 'tower' | 'dungeon' | 'dungeonBoss' | 'raid';
export type SphereTier = 'pal' | 'mega' | 'giga' | 'hyper' | 'ultra' | 'legendary';
export const SPHERE_TIERS: SphereTier[] = ['pal', 'mega', 'giga', 'hyper', 'ultra', 'legendary'];

export interface Drop {
  itemId: string;
  chance: number; // 0..1
  min: number;
  max: number;
}

export interface PalDef {
  id: number;                // internal key (stable); not the Paldeck number
  no: string;                // wiki Paldeck number as displayed: "001", "055B"
  name: string;
  variantOf?: number;
  elements: Element[];       // 1–2
  rarity: Rarity;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  work: Partial<Record<WorkType, number>>;   // 1–7 in current Palworld
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
  | { kind: 'raid'; id: string }
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
  san: number;                           // 0–100 sanity; drains while working, recovers while resting
}

export type SpherePolicy = SphereTier | 'none';
export type DailyReset = 'utc' | 'local';

export interface CraftJob {
  recipeId: string;
  remaining: number;                     // Handiwork units left on this unit
}

export interface BreedingPair {
  a: string;                             // parent uids; locked out of the party and base while paired
  b: string;
  progress: number | null;               // 0..1 toward the next egg, null = waiting for a Cake
}

export interface Egg {
  palId: number;
  remaining: number;                     // incubation seconds left
  passives: string[];                    // decided when laid
  lucky: boolean;                        // hatches as a Lucky Pal (carries the Lucky passive)
}

export interface Expedition {
  defId: string;
  members: string[];                     // PalInstance uids, locked until return
  remaining: number;                     // seconds
}

export interface ExpeditionReport {
  defId: string;
  success: boolean;
  gold: number;
  items: Record<string, number>;
  at: number;                            // epoch ms
}

export interface BaseState {
  slots: number;                         // worker capacity
  workers: string[];                     // PalInstance uids (never also in the party)
  structures: Record<string, number>;    // structureId -> level (absent = not built)
  queue: CraftJob[];                     // head is being worked on
  acc: Record<string, number>;           // fractional production carry, keyed by item / 'food' / 'smelt'
  breeding: BreedingPair | null;
  eggs: Egg[];                           // all incubate in parallel
  expeditions: Expedition[];
  reports: ExpeditionReport[];           // newest first, capped
  raid: import('../engine/baseraid').BaseRaid | null;   // a wild Pal attacking the base right now
  nextRaidAt: number;                    // stats.playSeconds at which the next raid arrives
  raidLog: RaidRecord[];                 // recent raids, newest first, capped
}

export interface RaidRecord { at: number; palId: number; level: number; outcome: 'repelled' | 'failed'; gold: number; stolen: number }

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
  base: BaseState;
  tech: string[];
  progress: {
    route: string;
    routeKills: Record<string, number>;
    alphas: string[];
    towers: string[];
    dungeons: Record<string, number>;    // dungeonId -> clears
    raids: Record<string, number>;       // raidId -> wins
    alphaRematch: Record<string, import('../engine/rematch').RematchState>;   // per beaten Alpha: next tier and when
    challenge: { day: string; kills: number; claimed: boolean } | null;      // today's challenge route progress
  };
  settings: {
    sphereForNew: SpherePolicy;          // sphere to throw at a Pal not yet in the Paldeck
    sphereForDupe: SpherePolicy;         // sphere to throw at an already-caught species
    dailyReset: DailyReset;              // which midnight rolls the daily quests
  };
  stats: {
    defeated: number; clicks: number; caught: number; luckyCaught: number;
    hatched: number; luckyHatched: number; crafted: number; expeditions: number;
    goldEarned: number; goldSpent: number; playSeconds: number;
    throws: number; condensed: number; luckyDefeated: number;
    chanceSum: number;                   // sum of the odds each throw was made at (expected catches)
    baseRaidsRepelled: number; baseRaidsLost: number;
    ratedThrows: number;                 // throws counted in chanceSum (older saves started mid-way)
    defeatedByElement: Partial<Record<Element, number>>;
    defeatedByKind: Partial<Record<WildKind, number>>;
    throwsByTier: Partial<Record<SphereTier, number>>;
    caughtByTier: Partial<Record<SphereTier, number>>;
  };
  achievements: string[];                // unlocked ids
  daily: DailyState | null;              // today's quests; regenerated when the day changes
  dailyHistory: DailyRecord[];           // past days, oldest first, capped
  loadouts: { id: string; name: string; uids: string[]; createdAt: number }[];   // saved parties
  prestige: { relics: number; ascensions: number; upgrades: Record<string, number> };
  tutorial: { step: number; done: boolean };
  lastSavedAt: number;
}

export type DailyKind = 'defeat' | 'catch' | 'gold' | 'hatch' | 'craft' | 'expedition' | 'realm' | 'element' | 'route';

export interface DailyQuest {
  id: string;
  kind: DailyKind;
  param?: string;                        // element or route id
  target: number;
  baseline: number;                      // counter value when generated
  claimed: boolean;
  reward: { gold: number; items: Record<string, number> };
}

export interface DailyState {
  date: string;                          // YYYY-MM-DD (UTC)
  quests: DailyQuest[];
  bonusClaimed: boolean;
}

/** A past day's quests, frozen at rollover. */
export interface DailyRecord {
  date: string;
  quests: { kind: DailyKind; param?: string; target: number; progress: number; claimed: boolean; reward: DailyQuest['reward'] }[];
  bonusClaimed: boolean;
}
