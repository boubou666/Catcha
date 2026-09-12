import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { addToBox, addToParty, makeInstance, release } from './party';
import { assignWorker } from './base';
import { setPair, BREEDING_FARM } from './breeding';
import { condenseCandidates } from './condense';
import { applyOffline } from './offline';
import { available, bestMembers, DEFAULT_DESTINATION_FILTER, expeditionSlots, filterDestinations, filterReports, memberScore, send, sendBlocker, successChance, tickExpeditions } from './expedition';
import { EXPEDITION_POST, EXPEDITIONS, expeditionById, MAX_CHANCE, MIN_CHANCE } from '../data/expeditions';
import { itemById } from '../data/items';
import { REGIONS, routeById, towerById } from '../data/regions';
import { TECHS } from '../data/tech';

function post(level = 1, ...pals: [palId: number, level: number][]) {
  const save = newState();
  save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
  save.base.structures[EXPEDITION_POST] = level;
  const insts = pals.map(([id, lv]) => { const i = makeInstance(id, lv); addToBox(save, i); return i; });
  save.party = [];
  return { save, insts };
}

describe('expedition data', () => {
  it('loot and unlocks reference real content, durations climb', () => {
    for (const e of EXPEDITIONS) {
      for (const drop of e.loot.items) itemById(drop.itemId);
      if (e.unlock.kind === 'alpha') expect(REGIONS.flatMap((r) => r.alphas).some((a) => a.id === (e.unlock as { id: string }).id)).toBe(true);
      if (e.unlock.kind === 'tower') towerById(e.unlock.id);
      if (e.unlock.kind === 'routeCleared') routeById(e.unlock.id);
    }
    const durations = EXPEDITIONS.map((e) => e.durationSec);
    expect([...durations].sort((a, b) => a - b)).toEqual(durations);
  });
});

describe('success chance', () => {
  it('scales with level, stars and passives, capped both ways', () => {
    const def = expeditionById('scout_hills'); // Lv 5, size 3
    const weak = [makeInstance(1, 1)];
    const full = [makeInstance(1, 5), makeInstance(1, 5), makeInstance(1, 5)];
    expect(successChance('scout_hills', [])).toBe(0);
    expect(successChance('scout_hills', weak)).toBeGreaterThan(MIN_CHANCE);
    expect(successChance('scout_hills', full)).toBe(MAX_CHANCE);
    const one = [makeInstance(1, def.level)];
    expect(successChance('scout_hills', one)).toBeCloseTo(MIN_CHANCE + (MAX_CHANCE - MIN_CHANCE) / 3);
    const starred = makeInstance(1, 10); starred.stars = 2; starred.passives = ['ferocious'];
    expect(memberScore(starred)).toBeCloseTo(10 * 1.2 * 1.2);
  });
});

describe('sending', () => {
  it('needs the post, the unlock, a free slot, and idle members within the size', () => {
    const { save, insts } = post(0, [1, 5], [1, 5], [1, 5], [1, 5]);
    const uids = insts.map((i) => i.uid);
    expect(sendBlocker(save, 'scout_hills', uids.slice(0, 3))).toBe('no-post');
    save.base.structures[EXPEDITION_POST] = 1;
    expect(sendBlocker(save, 'syndicate_camp', uids.slice(0, 3))).toBe('locked');
    expect(sendBlocker(save, 'scout_hills', [])).toBe('no-members');
    expect(sendBlocker(save, 'scout_hills', uids)).toBe('too-many');
    addToParty(save, uids[0]);
    expect(sendBlocker(save, 'scout_hills', uids.slice(0, 3))).toBe('busy');
    expect(send(save, 'scout_hills', uids.slice(1, 4))).toBe(true);
    expect(sendBlocker(save, 'scout_hills', [uids[0]])).toBe('no-slots');
    expect(expeditionSlots(save)).toBe(1);
  });

  it('members are locked everywhere until they return', () => {
    const { save, insts: [a, b, c] } = post(1, [1, 5], [1, 5], [1, 5]);
    save.base.structures[BREEDING_FARM] = 1;
    send(save, 'scout_hills', [a.uid]);
    expect(available(save).map((p) => p.uid)).toEqual([b.uid, c.uid]);
    expect(addToParty(save, a.uid)).toBe(false);
    expect(assignWorker(save, a.uid)).toBe(false);
    expect(setPair(save, a.uid, b.uid)).toBe(false);
    expect(condenseCandidates(save, c)).toHaveLength(1); // only b
    release(save, a.uid);
    expect(save.box).toHaveLength(3);
  });
});

describe('resolution', () => {
  it('pays the chest on success, a quarter of the gold on failure, exp either way', () => {
    const def = expeditionById('scout_hills');
    const { save, insts } = post(1, [1, 5], [1, 5], [1, 5]);
    send(save, 'scout_hills', insts.map((i) => i.uid));
    tickExpeditions(save, def.durationSec - 1);
    expect(save.base.expeditions).toHaveLength(1);
    const [ok] = tickExpeditions(save, 1, () => 0); // roll 0 → success, every drop hits at min
    expect(ok.success).toBe(true);
    expect(ok.gold).toBe(def.loot.gold);
    expect(ok.items.wood).toBe(20);
    expect(save.inventory.wood).toBe(20);
    expect(save.base.expeditions).toHaveLength(0);
    expect(save.base.reports[0]).toBe(ok);
    expect(insts[0].exp).toBe(def.exp);

    const gold = save.player.gold;
    send(save, 'scout_hills', insts.map((i) => i.uid));
    const [bad] = tickExpeditions(save, def.durationSec, () => 0.999);
    expect(bad.success).toBe(false);
    expect(bad.gold).toBe(def.loot.gold * 0.25);
    expect(bad.items).toEqual({});
    expect(save.player.gold).toBe(gold + bad.gold);
    expect(save.base.reports).toHaveLength(2);
    expect(save.base.reports[0]).toBe(bad);
  });

  it('returns during offline replay and is reported', () => {
    const { save, insts } = post(1, [1, 5], [1, 5], [1, 5]);
    send(save, 'scout_hills', insts.map((i) => i.uid));
    const r = applyOffline(save, 60 * 60 * 1000)!;
    expect(r.returned).toHaveLength(1);
    expect(available(save)).toHaveLength(3);
  });
});

describe('migration v8 → v9', () => {
  it('adds expedition lists', () => {
    const v8 = { ...newState(), version: 8 } as Record<string, unknown>;
    const base = { ...(v8.base as object) } as Record<string, unknown>;
    delete base.expeditions; delete base.reports;
    v8.base = base;
    const s = migrate(v8)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.base.expeditions).toEqual([]);
    expect(s.base.reports).toEqual([]);
  });
});

describe('expedition filters', () => {
  it('filters destinations by name, loot and lock state', () => {
    const s = newState();
    expect(filterDestinations(s, DEFAULT_DESTINATION_FILTER)).toEqual(EXPEDITIONS);
    expect(filterDestinations(s, { query: 'windswept', hideLocked: false }).map((e) => e.id)).toEqual(['scout_hills']);
    expect(filterDestinations(s, { query: 'flame organ', hideLocked: false }).map((e) => e.id)).toContain('syndicate_camp');
    expect(filterDestinations(s, { query: 'gold', hideLocked: false })).toEqual(EXPEDITIONS);
    const open = filterDestinations(s, { query: '', hideLocked: true });
    expect(open.length).toBeGreaterThan(0);
    expect(open.length).toBeLessThan(EXPEDITIONS.length);
    expect(filterDestinations(s, { query: 'zzz', hideLocked: false })).toEqual([]);
  });

  it('filters reports by destination, outcome and loot, newest first', () => {
    const s = newState();
    s.base.reports = [
      { defId: 'scout_hills', success: true, gold: 100, items: { wood: 30 }, at: 1 },
      { defId: 'syndicate_camp', success: false, gold: 100, items: {}, at: 2 },
    ];
    expect(filterReports(s, '').map((r) => r.at)).toEqual([2, 1]);
    expect(filterReports(s, 'failed').map((r) => r.defId)).toEqual(['syndicate_camp']);
    expect(filterReports(s, 'wood').map((r) => r.defId)).toEqual(['scout_hills']);
    expect(filterReports(s, 'scout success')).toHaveLength(1);
  });

  it('picks the strongest members for a trip', () => {
    const weak = makeInstance(1, 5), mid = makeInstance(1, 10), strong = makeInstance(1, 10);
    strong.stars = 2;
    const best = bestMembers([weak, strong, mid], 2);
    expect(best.map((p) => p.uid)).toEqual([strong.uid, mid.uid]);
    expect(bestMembers([weak], 3)).toEqual([weak]);
  });
});
