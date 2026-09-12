import type { SaveState } from './types';
import { PALS } from './pals';
import { REGIONS } from './regions';
import { TECHS } from './tech';
import { STRUCTURES } from './base';
import { DUNGEONS } from './dungeons';
import { RAIDS } from './raids';

export type AchievementCategory = 'combat' | 'collection' | 'base' | 'breeding' | 'exploration' | 'economy';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  category: AchievementCategory;
  goal: number;
  points: number;
  metric: (save: SaveState) => number;
}

/** Gold bonus per achievement point. */
export const POINT_GOLD_BONUS = 0.01;

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  combat: 'Combat', collection: 'Collection', base: 'Base', breeding: 'Breeding', exploration: 'Exploration', economy: 'Economy',
};
export const categoryLabel = (c: AchievementCategory) => CATEGORY_LABEL[c];

type NumericStat = { [K in keyof SaveState['stats']]: SaveState['stats'][K] extends number ? K : never }[keyof SaveState['stats']];
const stat = (k: NumericStat) => (s: SaveState) => s.stats[k];
const paldeckCaught = (s: SaveState) => Object.values(s.paldeck).filter((e) => e.caught > 0).length;
const maxStars = (s: SaveState) => Math.max(0, ...s.box.map((p) => p.stars));
const structuresBuilt = (s: SaveState) => Object.keys(s.base.structures).length;
const distinctRealms = (s: SaveState) => Object.values(s.progress.dungeons).filter((n) => n > 0).length;
const distinctRaids = (s: SaveState) => Object.values(s.progress.raids).filter((n) => n > 0).length;
const totalRaidWins = (s: SaveState) => Object.values(s.progress.raids).reduce((a, b) => a + b, 0);
const totalClears = (s: SaveState) => Object.values(s.progress.dungeons).reduce((a, b) => a + b, 0);

function tiers(idBase: string, name: string, category: AchievementCategory, metric: AchievementDef['metric'],
  steps: [goal: number, points: number, desc: string][]): AchievementDef[] {
  return steps.map(([goal, points, desc], i) => ({ id: `${idBase}_${i + 1}`, name: `${name} ${['I', 'II', 'III', 'IV', 'V'][i]}`, desc, category, goal, points, metric }));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // combat
  ...tiers('defeat', 'Pal Hunter', 'combat', stat('defeated'), [[100, 1, 'Defeat 100 Pals'], [1000, 2, 'Defeat 1,000 Pals'], [10000, 3, 'Defeat 10,000 Pals'], [100000, 5, 'Defeat 100,000 Pals']]),
  ...tiers('click', 'Hands On', 'combat', stat('clicks'), [[1000, 1, 'Attack 1,000 times by hand'], [10000, 2, 'Attack 10,000 times by hand']]),
  ...tiers('alpha', 'Alpha Slayer', 'combat', (s) => s.progress.alphas.length, [[2, 1, 'Defeat 2 Alphas'], [8, 2, 'Defeat 8 Alphas'], [14, 3, 'Defeat 14 Alphas'], [REGIONS.reduce((n, r) => n + r.alphas.length, 0), 5, 'Defeat every Alpha']]),
  ...REGIONS.map((r, i) => ({ id: `tower_${r.tower.id}`, name: r.tower.boss.split(' & ')[0] + ' Falls', desc: `Clear ${r.tower.name}`, category: 'combat' as const, goal: 1, points: i + 1, metric: (s: SaveState) => (s.progress.towers.includes(r.tower.id) ? 1 : 0) })),
  // collection
  ...tiers('caught', 'Catcher', 'collection', stat('caught'), [[10, 1, 'Catch 10 Pals'], [100, 2, 'Catch 100 Pals'], [1000, 3, 'Catch 1,000 Pals'], [10000, 5, 'Catch 10,000 Pals']]),
  ...tiers('paldeck', 'Paldeck', 'collection', paldeckCaught, [[10, 1, 'Own 10 species'], [50, 2, 'Own 50 species'], [100, 3, 'Own 100 species'], [PALS.length, 10, 'Own every species — a complete Paldeck']]),
  ...tiers('lucky', 'Fortune', 'collection', stat('luckyCaught'), [[1, 2, 'Catch a Lucky Pal'], [10, 3, 'Catch 10 Lucky Pals'], [100, 5, 'Catch 100 Lucky Pals']]),
  { id: 'legendary', name: 'Legend', desc: 'Own a legendary species', category: 'collection', goal: 1, points: 3,
    metric: (s) => (PALS.some((p) => p.rarity === 'legendary' && (s.paldeck[p.id]?.caught ?? 0) > 0) ? 1 : 0) },
  // base
  ...tiers('workers', 'Foreman', 'base', (s) => s.base.workers.length, [[3, 1, 'Have 3 Pals working'], [6, 2, 'Have 6 Pals working'], [10, 3, 'Have 10 Pals working']]),
  ...tiers('structures', 'Architect', 'base', structuresBuilt, [[3, 1, 'Build 3 structures'], [6, 2, 'Build 6 structures'], [STRUCTURES.length, 4, 'Build every structure']]),
  ...tiers('crafted', 'Artisan', 'base', stat('crafted'), [[10, 1, 'Craft 10 items'], [100, 2, 'Craft 100 items'], [1000, 3, 'Craft 1,000 items']]),
  ...tiers('tech', 'Researcher', 'base', (s) => s.tech.length, [[5, 1, 'Research 5 technologies'], [20, 2, 'Research 20 technologies'], [TECHS.length, 5, 'Research everything']]),
  ...tiers('stars', 'Condenser', 'base', maxStars, [[1, 1, 'Condense a Pal to one star'], [4, 4, 'Condense a Pal to four stars']]),
  // breeding
  ...tiers('hatched', 'Hatchery', 'breeding', stat('hatched'), [[1, 1, 'Hatch an egg'], [10, 2, 'Hatch 10 eggs'], [100, 3, 'Hatch 100 eggs'], [1000, 5, 'Hatch 1,000 eggs']]),
  { id: 'lucky_hatch', name: 'Born Lucky', desc: 'Hatch a Lucky egg', category: 'breeding', goal: 1, points: 3, metric: stat('luckyHatched') },
  // exploration
  ...tiers('expeditions', 'Explorer', 'exploration', stat('expeditions'), [[1, 1, 'Complete an expedition'], [10, 2, 'Complete 10 expeditions'], [50, 3, 'Complete 50 expeditions']]),
  ...tiers('realms', 'Realm Walker', 'exploration', distinctRealms, [[1, 1, 'Clear a Sealed Realm'], [DUNGEONS.length, 4, 'Clear every Sealed Realm']]),
  { id: 'realm_clears', name: 'Delver', desc: 'Clear Sealed Realms 25 times', category: 'exploration', goal: 25, points: 3, metric: totalClears },
  ...tiers('raids', 'Raider', 'exploration', distinctRaids, [[1, 3, 'Win a raid'], [RAIDS.length, 6, 'Win every raid']]),
  { id: 'raid_wins', name: 'Raid Veteran', desc: 'Win 10 raids', category: 'exploration', goal: 10, points: 4, metric: totalRaidWins },
  // economy
  ...tiers('gold', 'Tycoon', 'economy', stat('goldEarned'), [[10_000, 1, 'Earn 10,000 gold'], [1_000_000, 2, 'Earn 1,000,000 gold'], [100_000_000, 4, 'Earn 100,000,000 gold']]),
  ...tiers('time', 'Dedicated', 'economy', (s) => s.stats.playSeconds / 3600, [[1, 1, 'Play for an hour'], [10, 2, 'Play for 10 hours'], [100, 3, 'Play for 100 hours']]),
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export function achievementById(id: string): AchievementDef {
  const a = BY_ID.get(id);
  if (!a) throw new Error(`Unknown achievement ${id}`);
  return a;
}
