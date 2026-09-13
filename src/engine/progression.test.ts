import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { REGIONS, routeById } from '../data/regions';
import { DUNGEONS } from '../data/dungeons';
import { RAIDS } from '../data/raids';
import { PALS } from '../data/pals';
import { ACHIEVEMENTS } from '../data/achievements';
import { STOCK } from '../data/shop';
import { TECHS } from '../data/tech';
import { isUnlocked } from './progress';
import { routeQuota } from './prestige';
import { dungeonUnlocked } from './dungeon';
import { habitatOf } from './paldex';
import { childOf } from './breeding';
import { canAscend, relicsFor } from './prestige';
import { worldMap } from './map';

/** Play the whole world in order, by data: clear routes, beat Alphas and towers as they open. */
function playThrough() {
  const s = newState();
  s.player.level = 80;
  const log: string[] = [];
  for (const region of REGIONS) {
    expect(isUnlocked(s, region.routes[0].unlock), `${region.name} should open after the previous region`).toBe(true);
    for (const r of region.routes) {
      // a route must be open by the time it is reached in list order, given everything before it was done
      expect(isUnlocked(s, r.unlock), `${r.name} still locked when reached`).toBe(true);
      s.progress.routeKills[r.id] = routeQuota(s, r);
      s.progress.route = r.id;
      log.push(r.id);
      for (const a of region.alphas) if (!s.progress.alphas.includes(a.id) && isUnlocked(s, a.unlock)) { s.progress.alphas.push(a.id); log.push(`alpha:${a.id}`); }
    }
    for (const a of region.alphas) expect(s.progress.alphas, `Alpha ${a.id} never opened in ${region.name}`).toContain(a.id);
    expect(isUnlocked(s, region.tower.unlock), `${region.tower.name} still locked after its region`).toBe(true);
    s.progress.towers.push(region.tower.id);
    log.push(`tower:${region.tower.id}`);
  }
  return { s, log };
}

describe('the road to the end', () => {
  it('opens every route, Alpha and tower in order, then every realm and raid', () => {
    const { s } = playThrough();
    for (const d of DUNGEONS) expect(dungeonUnlocked(s, d.id), `${d.name} locked at the end`).toBe(true);
    s.base.structures.altar = 1;
    for (const r of RAIDS) {
      if (r.unlock.kind === 'raid') s.progress.raids[r.unlock.id] = 1;
      expect(isUnlocked(s, r.unlock), `${r.name} raid locked at the end`).toBe(true);
    }
    expect(canAscend(s)).toBe(true);
    expect(relicsFor(s)).toBeGreaterThanOrEqual(28 + 8);   // every tower (1+…+7) and level 80
    // the map agrees: nothing left locked
    const locked = worldMap(s).flatMap((r) => r.pins).filter((p) => p.status === 'locked' && p.kind !== 'altar');
    expect(locked.map((p) => `${p.regionId}/${p.id}`)).toEqual([]);
  });

  it('every requirement points at something that exists', () => {
    const ids = { route: new Set(REGIONS.flatMap((r) => r.routes.map((x) => x.id))), alpha: new Set(REGIONS.flatMap((r) => r.alphas.map((x) => x.id))), tower: new Set(REGIONS.map((r) => r.tower.id)), raid: new Set(RAIDS.map((r) => r.id)) };
    const check = (req: import('../data/types').Requirement, where: string) => {
      if (req.kind === 'routeCleared') expect(ids.route.has(req.id), `${where} → route ${req.id}`).toBe(true);
      if (req.kind === 'alpha') expect(ids.alpha.has(req.id), `${where} → alpha ${req.id}`).toBe(true);
      if (req.kind === 'tower') expect(ids.tower.has(req.id), `${where} → tower ${req.id}`).toBe(true);
      if (req.kind === 'raid') expect(ids.raid.has(req.id), `${where} → raid ${req.id}`).toBe(true);
      if (req.kind === 'all') req.of.forEach((r) => check(r, where));
    };
    for (const region of REGIONS) {
      region.routes.forEach((r) => check(r.unlock, r.id));
      region.alphas.forEach((a) => check(a.unlock, a.id));
      check(region.tower.unlock, region.tower.id);
    }
    DUNGEONS.forEach((d) => check(d.unlock, d.id));
    RAIDS.forEach((r) => check(r.unlock, r.id));
    STOCK.forEach((it) => check(it.unlock, it.itemId));
    TECHS.forEach((t) => t.requires?.forEach((req) => expect(TECHS.some((x) => x.id === req), `${t.id} requires ${req}`).toBe(true)));
  });

  it('every species can be obtained: met somewhere, bred from a pair that is, or hatched from a raid', () => {
    const inWild = new Set<number>();
    for (const p of PALS) {
      const h = habitatOf(p.id);
      if (h.routes.length || h.alphas.length || h.realms.length || h.raids.length) inWild.add(p.id);
    }
    // breeding: any pair of obtainable species produces an obtainable child; iterate to a fixed point
    let grew = true;
    const have = new Set(inWild);
    while (grew) {
      grew = false;
      const list = [...have];
      for (const a of list) for (const b of list) {
        const c = childOf(a, b);
        if (!have.has(c)) { have.add(c); grew = true; }
      }
    }
    const missing = PALS.filter((p) => !have.has(p.id)).map((p) => `${p.no} ${p.name}`);
    expect(missing).toEqual([]);
    expect(ACHIEVEMENTS.find((a) => a.id === 'paldeck_4')!.goal).toBe(PALS.length);
  });
});
