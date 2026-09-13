import type { SaveState } from '../data/types';
import { REGIONS } from '../data/regions';
import { dungeonsOf } from '../data/dungeons';
import { palById } from '../data/pals';
import { spotOf } from '../data/map';
import { describeRequirement, isUnlocked, routeCleared, routeKills } from './progress';
import { dungeonClears, dungeonUnlocked } from './dungeon';
import { routeQuota } from './prestige';
import { ALTAR, RAIDS } from '../data/raids';
import { REGION_MAPS } from '../data/map';
import { fmtCooldown, rematchInfo } from './rematch';
import { todaysChallenge } from './challenge';
import { alphaById, routeById, towerById } from '../data/regions';
import { dungeonById } from '../data/dungeons';

export type PinKind = 'route' | 'tower' | 'alpha' | 'realm' | 'base' | 'altar';
export type PinStatus = 'locked' | 'open' | 'cleared';

export interface MapPin {
  kind: PinKind;
  id: string;
  regionId: string;
  name: string;
  level: number;
  x: number;
  y: number;
  status: PinStatus;
  current: boolean;      // the route you are on
  detail: string;        // progress, or what unlocks it
}

export interface MapRegion {
  id: string;
  name: string;
  reachable: boolean;    // its first route is open
  requirement: string;   // when not reachable
  pins: MapPin[];
}

/** Every region with its pins placed on its island and coloured by the save's progress. */
export function worldMap(save: SaveState): MapRegion[] {
  const challengeId = todaysChallenge(save)?.route.id ?? null;
  return REGIONS.map((region) => {
    const pins: MapPin[] = [];
    region.routes.forEach((r) => {
      const open = isUnlocked(save, r.unlock);
      const [x, y] = spotOf(region.id, r.id);
      const cleared = open && routeCleared(save, r);
      const star = challengeId === r.id ? '⭐ ' : '';
      pins.push({
        kind: 'route', id: r.id, regionId: region.id, name: star + r.name, level: r.level, x, y,
        status: !open ? 'locked' : cleared ? 'cleared' : 'open',
        current: save.progress.route === r.id,
        detail: open ? `${routeKills(save, r.id)} / ${routeQuota(save, r)} defeated` : describeRequirement(r.unlock),
      });
    });
    region.alphas.forEach((a) => {
      const open = isUnlocked(save, a.unlock);
      const [x, y] = spotOf(region.id, a.id);
      const done = save.progress.alphas.includes(a.id);
      const rm = rematchInfo(save, a);
      pins.push({
        kind: 'alpha', id: a.id, regionId: region.id, name: `Alpha ${palById(a.palId).name}`, level: rm.level, x, y,
        status: !open ? 'locked' : done && !rm.ready ? 'cleared' : 'open', current: false,
        detail: open ? (done ? (rm.ready ? `Rematch ${rm.tier} — ${rm.gold.toLocaleString()} gold, a fresh throw` : `Beaten — back in ${fmtCooldown(rm.secondsLeft)} of play`) : `${a.reward.gold.toLocaleString()} gold${a.reward.effigies ? `, ${a.reward.effigies} Effigies` : ''} the first time`) : describeRequirement(a.unlock),
      });
    });
    {
      const t = region.tower;
      const open = isUnlocked(save, t.unlock);
      const [x, y] = spotOf(region.id, t.id);
      const done = save.progress.towers.includes(t.id);
      pins.push({
        kind: 'tower', id: t.id, regionId: region.id, name: t.name, level: t.level, x, y,
        status: !open ? 'locked' : done ? 'cleared' : 'open', current: false,
        detail: open ? `${t.boss}${done ? ' — cleared' : ''}` : describeRequirement(t.unlock),
      });
    }
    for (const d of dungeonsOf(region.id)) {
      const open = dungeonUnlocked(save, d.id);
      const [x, y] = spotOf(region.id, d.id);
      const clears = dungeonClears(save, d.id);
      pins.push({
        kind: 'realm', id: d.id, regionId: region.id, name: d.name, level: d.level, x, y,
        status: !open ? 'locked' : clears > 0 ? 'cleared' : 'open', current: false,
        detail: open ? `${d.waves} waves and a guardian${clears ? ` · cleared ×${clears}` : ''}` : describeRequirement(d.unlock),
      });
    }
    if (region.id === 'windswept') {
      // home: the base, and the Summoning Altar once it is built
      const [bx, by] = spotOf(region.id, 'base');
      const structures = Object.values(save.base.structures).reduce((n, lvl) => n + lvl, 0);
      pins.push({ kind: 'base', id: 'base', regionId: region.id, name: 'Your base', level: 0, x: bx, y: by, status: 'open', current: false,
        detail: `${save.base.workers.length} / ${save.base.slots} workers · ${structures} structure${structures === 1 ? '' : 's'}` });
      const [ax, ay] = spotOf(region.id, 'altar');
      const built = (save.base.structures[ALTAR] ?? 0) > 0;
      const wins = RAIDS.filter((r) => (save.progress.raids[r.id] ?? 0) > 0).length;
      pins.push({ kind: 'altar', id: 'altar', regionId: region.id, name: 'Summoning Altar', level: RAIDS[0].level, x: ax, y: ay,
        status: !built ? 'locked' : wins === RAIDS.length ? 'cleared' : 'open', current: false,
        detail: built ? `Raids: ${wins} / ${RAIDS.length} won` : 'Build the Summoning Altar (Base → Structures)' });
    }
    const first = region.routes[0];
    return { id: region.id, name: region.name, reachable: isUnlocked(save, first.unlock), requirement: describeRequirement(first.unlock), pins };
  });
}

/** Which region a pin lives in, for "show on map" links; null when the id is unknown. */
export function pinRegion(kind: PinKind, id: string): string | null {
  try {
    if (kind === 'route') return routeById(id).regionId;
    if (kind === 'alpha') return alphaById(id).regionId;
    if (kind === 'tower') return towerById(id).regionId;
    if (kind === 'realm') return dungeonById(id).regionId;
    return REGION_MAPS.find((m) => m.spots[id])?.regionId ?? null;
  } catch { return null; }
}
