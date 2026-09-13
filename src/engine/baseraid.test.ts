import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { routeById } from '../data/regions';
import { addToBox, makeInstance } from './party';
import { assignWorker, build, computeRates, tickBase } from './base';
import { canRaid, defenceDps, nextRaidDelay, RAID_EVERY_SEC, RAID_HP_MULT, RAID_TIME_SEC, rollRaid, STEAL_FRACTION, tickRaid } from './baseraid';
import { wildHp } from './formulas';
import { TECHS } from '../data/tech';

function staffed() {
  const s = newState();
  s.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
  s.inventory.wood = 100; s.inventory.stone = 50;
  const w = makeInstance(4, 10);   // Lifmunk
  addToBox(s, w); assignWorker(s, w.uid);
  expect(build(s, 'logging')).toBe(true);
  return { s, w };
}

describe('base raids', () => {
  it('only happen with workers and structures, at a play-time cadence', () => {
    const s = newState();
    expect(canRaid(s)).toBe(false);
    expect(s.base.nextRaidAt).toBe(20 * 60);
    const d = nextRaidDelay(() => 0.5);
    expect(d).toBeGreaterThanOrEqual(RAID_EVERY_SEC.min);
    expect(d).toBeLessThanOrEqual(RAID_EVERY_SEC.max);
    expect(canRaid(staffed().s)).toBe(true);
  });

  it('rolls a raider from the route with boss HP, and pauses production while it lasts', () => {
    const { s } = staffed();
    const raid = rollRaid(routeById('plateau'), () => 0);
    expect([1, 2, 3, 4]).toContain(raid.palId);
    expect(raid.level).toBe(2);
    expect(raid.maxHp).toBe(Math.round(wildHp(2) * RAID_HP_MULT));
    expect(raid.secondsLeft).toBe(RAID_TIME_SEC);
    expect(computeRates(s).items.wood).toBeGreaterThan(0);
    s.base.raid = raid;
    const before = s.inventory.wood;
    tickBase(s, 60);
    expect(s.inventory.wood).toBe(before);   // nothing produced during the raid
  });

  it('workers fight at half attack; rallying adds the party', () => {
    const { s } = staffed();
    const raid = rollRaid(routeById('plateau'), () => 0);
    const workersOnly = defenceDps(s, raid);
    expect(workersOnly).toBeGreaterThan(0);
    const p = makeInstance(1, 10); addToBox(s, p); s.party = [p.uid];
    expect(defenceDps(s, raid)).toBe(workersOnly);
    raid.rallied = true;
    expect(defenceDps(s, raid)).toBeGreaterThan(workersOnly);
  });

  it('repelling pays gold, triple drops and a throw; failing steals and shakes', () => {
    const { s, w } = staffed();
    s.inventory.sphere_pal = 3;
    const raid = rollRaid(routeById('plateau'), () => 0);
    raid.hp = 1;
    const gold = s.player.gold;
    const out = tickRaid(s, raid, 1, () => 0)!;
    expect(out.kind).toBe('repelled');
    if (out.kind === 'repelled') {
      expect(s.player.gold).toBeGreaterThan(gold);
      expect(Object.values(out.drops).every((n) => n >= 3)).toBe(true);
      expect(out.catchResult.outcome).toBe('caught');
    }
    expect(s.stats.baseRaidsRepelled).toBe(1);

    const raid2 = rollRaid(routeById('plateau'), () => 0);
    raid2.hp = 1e9; raid2.secondsLeft = 0.5;
    s.inventory.wood = 100; s.inventory.stone = 50; w.san = 100;
    const out2 = tickRaid(s, raid2, 1, () => 0)!;
    expect(out2.kind).toBe('failed');
    if (out2.kind === 'failed') {
      const taken = Object.values(out2.stolen).reduce((a, b) => a + b, 0);
      expect(taken).toBeGreaterThan(0);
      expect(s.inventory.sphere_pal).toBe(2);      // spheres are never taken (one went on the throw above)
      expect(s.inventory.wood + s.inventory.stone).toBe(150 - taken);
      expect(Object.values(out2.stolen).every((n, i) => n <= Math.floor(100 * STEAL_FRACTION))).toBe(true);
    }
    expect(w.san).toBe(80);
    expect(s.stats.baseRaidsLost).toBe(1);
  });

  it('migrates older saves with the new fields', () => {
    const v22 = { ...newState(), version: 22 } as unknown as { base: Record<string, unknown>; stats: Record<string, unknown> };
    delete v22.base.raid; delete v22.base.nextRaidAt; delete v22.stats.baseRaidsRepelled; delete v22.stats.baseRaidsLost;
    const s = migrate(v22)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.base.raid).toBeNull();
    expect(s.base.nextRaidAt).toBe(20 * 60);
    expect(s.stats.baseRaidsLost).toBe(0);
  });
});

describe('watchtower, assembly line and beds', () => {
  it('change how raids, crafting and rest behave', async () => {
    const { s } = staffed();
    const { computeRates, restMult, tickBase } = await import('./base');
    const { rollRaidFor, defenceDps, RAID_TIME_SEC, WATCHTOWER_EXTRA_SEC, WORKER_ATTACK_MULT } = await import('./baseraid');
    const plain = rollRaidFor(s, routeById('plateau'), () => 0);
    const halfDps = defenceDps(s, plain);
    s.base.structures.watchtower = 1;
    expect(defenceDps(s, plain)).toBeCloseTo(halfDps / WORKER_ATTACK_MULT);   // full attack
    expect(rollRaidFor(s, routeById('plateau'), () => 0).secondsLeft).toBe(RAID_TIME_SEC);
    s.base.structures.watchtower = 2;
    expect(rollRaidFor(s, routeById('plateau'), () => 0).secondsLeft).toBe(RAID_TIME_SEC + WATCHTOWER_EXTRA_SEC);
    s.base.structures.watchtower = 3;
    expect(rollRaidFor(s, routeById('plateau'), () => 0).rallied).toBe(true);

    s.base.structures.workbench = 1;
    const w = computeRates(s).handiworkPerSec;
    s.base.structures.assembly_line = 2;
    expect(computeRates(s).handiworkPerSec).toBeCloseTo(w * 2);

    expect(restMult(s)).toBe(1);
    s.base.structures.pal_beds = 2;
    expect(restMult(s)).toBe(3);
    const resting = makeInstance(1, 1); resting.san = 10; addToBox(s, resting);
    s.base.raid = null;
    tickBase(s, 60);
    expect(resting.san).toBeGreaterThan(10);
  });
});
