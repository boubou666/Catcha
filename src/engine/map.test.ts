import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { worldMap } from './map';
import { REGION_MAPS, spotOf } from '../data/map';
import { REGIONS } from '../data/regions';
import { DUNGEONS } from '../data/dungeons';

describe('world map', () => {
  it('places every route, Alpha, tower and realm inside its region\'s crop of the map', () => {
    expect(REGION_MAPS.map((m) => m.regionId).sort()).toEqual(REGIONS.map((r) => r.id).sort());
    for (const region of REGIONS) {
      const m = REGION_MAPS.find((x) => x.regionId === region.id)!;
      const ids = [...region.routes.map((r) => r.id), ...region.alphas.map((a) => a.id), region.tower.id, ...DUNGEONS.filter((d) => d.regionId === region.id).map((d) => d.id)];
      for (const id of ids) {
        expect(m.spots[id], `${region.id}/${id} has no spot`).toBeDefined();
        const [x, y] = spotOf(region.id, id);
        expect(x >= m.box[0] && x <= m.box[0] + m.box[2] && y >= m.box[1] && y <= m.box[1] + m.box[3], `${region.id}/${id} outside its box`).toBe(true);
      }
    }
    expect(spotOf('windswept', 'nowhere')).toEqual([990 + 280, 430 + 380]);   // unknown ids land on the region centre
  });

  it('colours pins by progress and names what unlocks the rest', () => {
    const s = newState();
    let [w] = worldMap(s);
    expect(w.reachable).toBe(true);
    const route = (id: string) => worldMap(s)[0].pins.find((p) => p.kind === 'route' && p.id === id)!;
    expect(route('plateau')).toMatchObject({ status: 'open', current: true, detail: '0 / 10 defeated', x: 1230, y: 970 });
    expect(route('behemoth')).toMatchObject({ status: 'locked', detail: 'Clear Plateau of Beginnings' });
    s.progress.routeKills.plateau = 10;
    expect(route('plateau').status).toBe('cleared');
    expect(route('behemoth').status).toBe('open');
    w = worldMap(s)[0];
    expect(w.pins.filter((p) => p.kind === 'alpha').map((p) => p.name)).toEqual(['Alpha Chillet', 'Alpha Penking']);
    expect(w.pins.find((p) => p.kind === 'tower')).toMatchObject({ status: 'locked', name: 'Rayne Syndicate Tower' });
    expect(w.pins.find((p) => p.kind === 'realm')).toMatchObject({ status: 'locked', level: 14 });
    const marsh = worldMap(s)[1];
    expect(marsh.reachable).toBe(false);
    expect(marsh.requirement).toMatch(/Tower|tower/);
  });
});
