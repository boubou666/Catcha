import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { ascend } from './ascend';
import { arkSlots, buyUpgrade, canAscend, DEFAULT_UPGRADE_FILTER, filterUpgrades, nextUpgradeCost, prestigeMult, relicsFor, routeQuota, startingSpheres, startingTechPoints, upgradeStatus } from './prestige';
import { PRESTIGE_UPGRADES, BASE_ARK, prestigeUpgradeById } from '../data/prestige';
import { routeById } from '../data/regions';
import { addToBox, makeInstance } from './party';
import { assignWorker } from './base';
import { send } from './expedition';
import { routeCleared } from './progress';
import { partyDps } from './combat';
import { TECHS } from '../data/tech';

describe('relics', () => {
  it('weigh towers by region, plus Paldeck size and level', () => {
    const save = newState();
    expect(canAscend(save)).toBe(false);
    expect(relicsFor(save)).toBe(0);
    save.progress.towers.push('rayne', 'lily');            // 1 + 2
    save.player.level = 25;                                 // +2
    save.paldeck = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { seen: true, caught: 1 }])); // +3
    expect(canAscend(save)).toBe(true);
    expect(relicsFor(save)).toBe(8);
  });
});

describe('upgrades', () => {
  it('cost relics, cap at max level, and multiply the right stats', () => {
    const save = newState();
    expect(buyUpgrade(save, 'power')).toBe(false);
    save.prestige.relics = 100;
    const power = prestigeUpgradeById('power');
    expect(nextUpgradeCost(save, 'power')).toBe(power.cost(1));
    expect(buyUpgrade(save, 'power')).toBe(true);
    expect(save.prestige.relics).toBe(100 - power.cost(1));
    expect(nextUpgradeCost(save, 'power')).toBe(power.cost(2));
    expect(power.cost(2)).toBeGreaterThan(power.cost(1));
    expect(prestigeMult(save, 'attack')).toBeCloseTo(1.1);
    expect(prestigeMult(save, 'base')).toBe(1);
    save.prestige.relics = 1000;
    for (let i = 0; i < 10; i++) buyUpgrade(save, 'power');
    expect(save.prestige.upgrades.power).toBe(5);
    expect(nextUpgradeCost(save, 'power')).toBeNull();
    expect(prestigeMult(save, 'attack')).toBeCloseTo(1.5);
    for (const u of PRESTIGE_UPGRADES) expect(u.cost(1)).toBeGreaterThan(0);
  });
  it('attack flows into party DPS', () => {
    const save = newState();
    addToBox(save, makeInstance(1, 10));
    const wild = { palId: 2, level: 1, hp: 1, maxHp: 1, lucky: false, kind: 'wild' as const };
    const base = partyDps(save, wild);
    save.prestige.upgrades.power = 2;
    expect(partyDps(save, wild)).toBeCloseTo(base * 1.2);
  });
  it('Quick Feet shrinks route quotas, floored at half', () => {
    const save = newState();
    const plateau = routeById('plateau'); // 10 kills
    expect(routeQuota(save, plateau)).toBe(10);
    save.prestige.upgrades.quick_feet = 2;
    expect(routeQuota(save, plateau)).toBe(8);
    save.progress.routeKills.plateau = 8;
    expect(routeCleared(save, plateau)).toBe(true);
    save.prestige.upgrades.quick_feet = 5;
    expect(routeQuota(save, plateau)).toBe(5);
  });
  it('Ark, Head Start and Provisions add up', () => {
    const save = newState();
    expect(arkSlots(save)).toBe(BASE_ARK);
    save.prestige.upgrades = { ark: 2, head_start: 3, provisions: 1 };
    expect(arkSlots(save)).toBe(BASE_ARK + 2);
    expect(startingTechPoints(save)).toBe(15);
    expect(startingSpheres(save)).toBe(20);
  });
});

describe('ascending', () => {
  function veteran() {
    const save = newState();
    save.tech = TECHS.map((t) => t.id);
    save.progress.towers.push('rayne');
    save.progress.route = 'icewind';
    save.player.level = 20; save.player.gold = 99_999;
    save.inventory.ingot = 50;
    save.base.structures = { workbench: 1, logging: 2 };
    save.achievements = ['defeat_1'];
    save.stats.defeated = 5000;
    save.paldeck = { 1: { seen: true, caught: 3 }, 11: { seen: true, caught: 1 } };
    save.prestige = { relics: 5, ascensions: 1, upgrades: { ark: 1 } };
    const keep = [makeInstance(11, 40), makeInstance(1, 30), makeInstance(2, 20)];
    keep[0].stars = 2; keep[0].passives = ['artisan'];
    for (const p of keep) addToBox(save, p);
    return { save, keep };
  }

  it('refuses without a tower', () => {
    expect(ascend(newState(), [])).toBeNull();
  });

  it('keeps records, prestige and chosen Pals; resets the rest', () => {
    const { save, keep } = veteran();
    const relics = relicsFor(save);
    const next = ascend(save, [keep[0].uid, keep[1].uid, keep[2].uid])!;   // ark = 2 slots
    expect(next.prestige).toEqual({ relics: 5 + relics, ascensions: 2, upgrades: { ark: 1 } });
    expect(next.box.map((p) => p.uid)).toEqual([keep[0].uid, keep[1].uid]);
    expect(next.party).toEqual([keep[0].uid, keep[1].uid]);
    expect(next.box[0].stars).toBe(2);
    expect(next.box[0].passives).toEqual(['artisan']);
    expect(next.paldeck).toBe(save.paldeck);
    expect(next.achievements).toEqual(['defeat_1']);
    expect(next.stats.defeated).toBe(5000);
    // reset
    expect(next.progress.towers).toEqual([]);
    expect(next.progress.route).toBe('plateau');
    expect(next.player.level).toBe(1);
    expect(next.player.gold).toBe(0);
    expect(next.tech).toEqual([]);
    expect(next.base.structures).toEqual({});
    expect(next.inventory.ingot).toBeUndefined();
    expect(next.version).toBe(SAVE_VERSION);
  });

  it('grants head-start tech points and spheres; ignores Pals away on expeditions', () => {
    const { save, keep } = veteran();
    save.prestige.upgrades = { head_start: 2, provisions: 2 };
    save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
    save.base.structures.expedition_post = 1;
    save.party = [];
    send(save, 'scout_hills', [keep[2].uid]);
    const next = ascend(save, [keep[2].uid, keep[0].uid])!;
    expect(next.box.map((p) => p.uid)).toEqual([keep[0].uid]);      // away Pal skipped, slot 1 used by next choice
    expect(next.player.techPoints).toBe(newState().player.techPoints + 10);
    expect(next.inventory.sphere_pal).toBe(newState().inventory.sphere_pal + 40);
  });
});

describe('migration v15 → v16', () => {
  it('adds prestige', () => {
    const v15 = { ...newState(), version: 15 } as Record<string, unknown>;
    delete v15.prestige;
    const s = migrate(v15)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.prestige).toEqual({ relics: 0, ascensions: 0, upgrades: {} });
  });
});

describe('upgrade filter', () => {
  it('classifies and filters upgrades by relics and search', () => {
    const s = newState();
    expect(filterUpgrades(s, DEFAULT_UPGRADE_FILTER).map((r) => r.def.id)).toEqual(PRESTIGE_UPGRADES.map((u) => u.id));
    expect(filterUpgrades(s, { query: '', status: 'affordable' })).toEqual([]);
    expect(filterUpgrades(s, { query: '', status: 'saving' })).toHaveLength(PRESTIGE_UPGRADES.length);
    s.prestige.relics = 1;
    const cheap = filterUpgrades(s, { query: '', status: 'affordable' });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.every((r) => r.cost !== null && r.cost <= 1)).toBe(true);
    expect(upgradeStatus(s, cheap[0].def.id)).toBe('affordable');
    s.prestige.upgrades.relic_sense = prestigeUpgradeById('relic_sense').maxLevel;
    expect(filterUpgrades(s, { query: '', status: 'maxed' }).map((r) => r.def.id)).toEqual(['relic_sense']);
    expect(filterUpgrades(s, { query: 'catch', status: 'any' }).map((r) => r.def.id)).toEqual(['spherecraft']);
    expect(filterUpgrades(s, { query: 'ark', status: 'any' }).map((r) => r.def.id)).toContain('ark');
    expect(filterUpgrades(s, { query: 'zzz', status: 'any' })).toEqual([]);
  });
});
