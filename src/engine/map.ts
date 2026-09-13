import type { SaveState } from '../data/types';
import { REGIONS } from '../data/regions';
import { dungeonsOf } from '../data/dungeons';
import { palById } from '../data/pals';
import { spotOf } from '../data/map';
import { describeRequirement, isUnlocked, routeCleared, routeKills } from './progress';
import { dungeonClears, dungeonUnlocked } from './dungeon';
import { routeQuota } from './prestige';

export type PinKind = 'route' | 'tower' | 'alpha' | 'realm';
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
  return REGIONS.map((region) => {
    const pins: MapPin[] = [];
    region.routes.forEach((r) => {
      const open = isUnlocked(save, r.unlock);
      const [x, y] = spotOf(region.id, r.id);
      const cleared = open && routeCleared(save, r);
      pins.push({
        kind: 'route', id: r.id, regionId: region.id, name: r.name, level: r.level, x, y,
        status: !open ? 'locked' : cleared ? 'cleared' : 'open',
        current: save.progress.route === r.id,
        detail: open ? `${routeKills(save, r.id)} / ${routeQuota(save, r)} defeated` : describeRequirement(r.unlock),
      });
    });
    region.alphas.forEach((a) => {
      const open = isUnlocked(save, a.unlock);
      const [x, y] = spotOf(region.id, a.id);
      const done = save.progress.alphas.includes(a.id);
      pins.push({
        kind: 'alpha', id: a.id, regionId: region.id, name: `Alpha ${palById(a.palId).name}`, level: a.level, x, y,
        status: !open ? 'locked' : done ? 'cleared' : 'open', current: false,
        detail: open ? (done ? 'Defeated — fight again for gold' : `${a.reward.gold.toLocaleString()} gold${a.reward.effigies ? `, ${a.reward.effigies} Effigies` : ''} the first time`) : describeRequirement(a.unlock),
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
    const first = region.routes[0];
    return { id: region.id, name: region.name, reachable: isUnlocked(save, first.unlock), requirement: describeRequirement(first.unlock), pins };
  });
}
