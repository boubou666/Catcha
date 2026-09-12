import type { Drop, Requirement } from './types';

export interface DungeonDef {
  id: string;
  regionId: string;
  name: string;
  level: number;                 // wave level; boss is +2
  waves: number;
  timeLimitSec: number;
  pool: { palId: number; weight: number }[];
  waveHpMult: number;            // × wildHp(level)
  boss: { palId: number; hpMult: number };
  unlock: Requirement;
  loot: { gold: number; items: Drop[] };
  firstClear: { effigies: number };
}

const d = (itemId: string, chance: number, min: number, max: number): Drop => ({ itemId, chance, min, max });
const pool = (...s: [number, number][]) => s.map(([palId, weight]) => ({ palId, weight }));

export const DUNGEONS: DungeonDef[] = [
  { id: 'frozen_wings', regionId: 'windswept', name: 'Sealed Realm of the Frozen Wings', level: 14, waves: 5, timeLimitSec: 300,
    pool: pool([10, 30], [6, 20], [17, 20], [21, 15], [23, 15]), waveHpMult: 1.5,
    boss: { palId: 55, hpMult: 8 }, unlock: { kind: 'routeCleared', id: 'icewind' },
    loot: { gold: 400, items: [d('paldium', 1, 10, 20), d('ingot', 0.6, 1, 3), d('sphere_mega', 0.5, 1, 3), d('high_quality_pal_oil', 0.3, 1, 2)] },
    firstClear: { effigies: 2 } },
  { id: 'invincible', regionId: 'marsh', name: 'Sealed Realm of the Invincible', level: 26, waves: 5, timeLimitSec: 300,
    pool: pool([52, 25], [68, 20], [63, 20], [66, 20], [53, 15]), waveHpMult: 1.5,
    boss: { palId: 89, hpMult: 10 }, unlock: { kind: 'routeCleared', id: 'alliance' },
    loot: { gold: 1500, items: [d('paldium', 1, 20, 40), d('ingot', 1, 2, 5), d('sphere_giga', 0.5, 1, 3), d('high_quality_pal_oil', 0.5, 1, 3)] },
    firstClear: { effigies: 3 } },
  { id: 'swordmaster', regionId: 'dunes', name: 'Sealed Realm of the Swordmaster', level: 36, waves: 5, timeLimitSec: 300,
    pool: pool([75, 25], [44, 20], [45, 20], [94, 15], [71, 20]), waveHpMult: 1.6,
    boss: { palId: 72, hpMult: 12 }, unlock: { kind: 'routeCleared', id: 'brothers' },
    loot: { gold: 6000, items: [d('paldium', 1, 30, 60), d('ingot', 1, 4, 8), d('sphere_hyper', 0.5, 1, 2), d('high_quality_pal_oil', 0.7, 2, 4), d('diamond', 0.05, 1, 1), d('slab_fragment', 0.5, 1, 1)] },
    firstClear: { effigies: 4 } },
  { id: 'winged_tyrant', regionId: 'obsidian', name: 'Sealed Realm of the Winged Tyrant', level: 46, waves: 5, timeLimitSec: 300,
    pool: pool([74, 25], [84, 20], [1084, 15], [88, 20], [1058, 20]), waveHpMult: 1.6,
    boss: { palId: 102, hpMult: 14 }, unlock: { kind: 'routeCleared', id: 'pidf' },
    loot: { gold: 20000, items: [d('paldium', 1, 50, 90), d('ingot', 1, 6, 12), d('sphere_hyper', 0.7, 1, 3), d('high_quality_pal_oil', 1, 3, 6), d('diamond', 0.1, 1, 1), d('slab_fragment', 0.7, 1, 2)] },
    firstClear: { effigies: 5 } },
  { id: 'pristine', regionId: 'astral', name: 'Sealed Realm of the Pristine', level: 56, waves: 5, timeLimitSec: 300,
    pool: pool([57, 25], [1071, 20], [1089, 20], [91, 15], [1088, 20]), waveHpMult: 1.7,
    boss: { palId: 79, hpMult: 18 }, unlock: { kind: 'routeCleared', id: 'genetics' },
    loot: { gold: 60000, items: [d('paldium', 1, 80, 140), d('ingot', 1, 10, 18), d('sphere_ultra', 0.6, 1, 3), d('high_quality_pal_oil', 1, 4, 8), d('diamond', 0.2, 1, 1), d('slab_fragment', 0.8, 1, 2)] },
    firstClear: { effigies: 6 } },
  { id: 'moonlit', regionId: 'sakurajima', name: 'Sealed Realm of the Moonlit', level: 63, waves: 5, timeLimitSec: 300,
    pool: pool([116, 25], [117, 25], [121, 20], [119, 15], [123, 15]), waveHpMult: 1.7,
    boss: { palId: 124, hpMult: 20 }, unlock: { kind: 'routeCleared', id: 'moonflower' },
    loot: { gold: 150000, items: [d('paldium', 1, 120, 200), d('ingot', 1, 15, 25), d('sphere_ultra', 0.8, 2, 4), d('high_quality_pal_oil', 1, 6, 10), d('diamond', 0.3, 1, 2), d('slab_fragment', 1, 1, 3)] },
    firstClear: { effigies: 7 } },
  { id: 'starfall_realm', regionId: 'feybreak', name: 'Sealed Realm of the Starfall', level: 71, waves: 5, timeLimitSec: 300,
    pool: pool([127, 25], [134, 20], [133, 20], [130, 20], [141, 15]), waveHpMult: 1.8,
    boss: { palId: 128, hpMult: 24 }, unlock: { kind: 'routeCleared', id: 'peak' },
    loot: { gold: 400000, items: [d('paldium', 1, 200, 300), d('ingot', 1, 25, 40), d('sphere_legendary', 0.5, 1, 2), d('high_quality_pal_oil', 1, 10, 15), d('diamond', 0.5, 1, 3), d('slab_fragment', 1, 2, 4)] },
    firstClear: { effigies: 8 } },
];

const BY_ID = new Map(DUNGEONS.map((x) => [x.id, x]));
export function dungeonById(id: string): DungeonDef {
  const x = BY_ID.get(id);
  if (!x) throw new Error(`Unknown dungeon ${id}`);
  return x;
}
export const dungeonsOf = (regionId: string) => DUNGEONS.filter((x) => x.regionId === regionId);
