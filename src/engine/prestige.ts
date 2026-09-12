import type { PalInstance, RouteDef, SaveState } from '../data/types';
import { BASE_ARK, PRESTIGE_UPGRADES, prestigeUpgradeById, type PrestigeStat, type PrestigeUpgradeDef } from '../data/prestige';
import { REGIONS } from '../data/regions';
import { isAway } from './party';

export function upgradeLevel(save: SaveState, id: string): number {
  return save.prestige.upgrades[id] ?? 0;
}

/** Product of prestige multipliers for a stat (1 + perLevel × level each). */
export function prestigeMult(save: SaveState, stat: PrestigeStat): number {
  let m = 1;
  for (const u of PRESTIGE_UPGRADES) {
    if (u.effect.kind === 'mult' && u.effect.stat === stat) m *= 1 + u.effect.perLevel * upgradeLevel(save, u.id);
  }
  return m;
}

function effectTotal(save: SaveState, kind: 'ark' | 'techPoints' | 'quota' | 'spheres'): number {
  let n = 0;
  for (const u of PRESTIGE_UPGRADES) if (u.effect.kind === kind) n += u.effect.perLevel * upgradeLevel(save, u.id);
  return n;
}

export const arkSlots = (save: SaveState) => BASE_ARK + effectTotal(save, 'ark');
export const startingTechPoints = (save: SaveState) => effectTotal(save, 'techPoints');
export const startingSpheres = (save: SaveState) => effectTotal(save, 'spheres');

/** Kills a route needs after Quick Feet. */
export function routeQuota(save: SaveState, route: RouteDef): number {
  return Math.max(1, Math.ceil(route.killsToClear * (1 - Math.min(0.5, effectTotal(save, 'quota')))));
}

// ---- buying ------------------------------------------------------------------

export function nextUpgradeCost(save: SaveState, id: string): number | null {
  const u = prestigeUpgradeById(id);
  const level = upgradeLevel(save, id);
  return level < u.maxLevel ? u.cost(level + 1) : null;
}

export function buyUpgrade(save: SaveState, id: string): boolean {
  const cost = nextUpgradeCost(save, id);
  if (cost === null || save.prestige.relics < cost) return false;
  save.prestige.relics -= cost;
  save.prestige.upgrades[id] = upgradeLevel(save, id) + 1;
  return true;
}

// ---- ascending ---------------------------------------------------------------

/** Relics a run is worth: towers weigh 1..7 by region, plus Paldeck size and player level. */
export function relicsFor(save: SaveState): number {
  let n = 0;
  REGIONS.forEach((r, i) => { if (save.progress.towers.includes(r.tower.id)) n += i + 1; });
  n += Math.floor(Object.values(save.paldeck).filter((e) => e.caught > 0).length / 10);
  n += Math.floor(save.player.level / 10);
  return n;
}

export function canAscend(save: SaveState): boolean {
  return save.progress.towers.length > 0;
}

/** Pals eligible to carry through: anything in the box that isn't away on an expedition. */
export function arkCandidates(save: SaveState): PalInstance[] {
  return save.box.filter((p) => !isAway(save, p.uid));
}

// ---- filtering ----------------------------------------------------------------------

export type UpgradeStatus = 'affordable' | 'saving' | 'maxed';
export interface UpgradeFilter { query: string; status: UpgradeStatus | 'any' }
export const DEFAULT_UPGRADE_FILTER: UpgradeFilter = { query: '', status: 'any' };
export const UPGRADE_STATUS_LABEL: Record<UpgradeStatus | 'any', string> = { any: 'Any status', affordable: 'Affordable now', saving: 'Need more relics', maxed: 'Maxed' };

export function upgradeStatus(save: SaveState, id: string): UpgradeStatus {
  const cost = nextUpgradeCost(save, id);
  if (cost === null) return 'maxed';
  return save.prestige.relics >= cost ? 'affordable' : 'saving';
}

export interface UpgradeRow { def: PrestigeUpgradeDef; level: number; cost: number | null; status: UpgradeStatus }

/** Upgrades in data order, matching every search word against name, description or effect kind. */
export function filterUpgrades(save: SaveState, f: UpgradeFilter): UpgradeRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return PRESTIGE_UPGRADES
    .map((def) => ({ def, level: upgradeLevel(save, def.id), cost: nextUpgradeCost(save, def.id), status: upgradeStatus(save, def.id) }))
    .filter((r) => {
      if (f.status !== 'any' && r.status !== f.status) return false;
      const hay = [r.def.name, r.def.desc, r.def.effect.kind, 'stat' in r.def.effect ? r.def.effect.stat : ''].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
}
