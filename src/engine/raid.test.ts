import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { completeRaid, describeRaidChest, raidWins, summon, summonBlocker } from './raid';
import { ALTAR, RAIDS, raidById } from '../data/raids';
import { RECIPES } from '../data/base';
import { itemById, itemName } from '../data/items';
import { palById } from '../data/pals';
import { applyDefeat } from './combat';
import { INCUBATION_SEC } from './breeding';
import { isUnlocked } from './progress';

describe('raid data', () => {
  it('bosses, slabs and rewards reference real content; every slab has a recipe', () => {
    for (const r of RAIDS) {
      palById(r.palId);
      itemById(r.slabItemId);
      for (const drop of r.reward.items) itemById(drop.itemId);
      expect(RECIPES.some((x) => x.output.kind === 'item' && x.output.itemId === r.slabItemId)).toBe(true);
    }
  });
});

describe('summoning', () => {
  it('needs the altar, the unlock, and a slab; the slab is consumed', () => {
    const save = newState();
    expect(summonBlocker(save, 'bellanoir')).toBe('no-altar');
    save.base.structures[ALTAR] = 1;
    expect(summonBlocker(save, 'bellanoir')).toBe('locked');
    save.progress.towers.push('marcus');
    expect(summonBlocker(save, 'bellanoir')).toBe('no-slab');
    save.inventory.slab_bellanoir = 1;
    const boss = summon(save, 'bellanoir', 0)!;
    expect(boss.kind).toBe('raid');
    expect(boss.palId).toBe(142);
    expect(boss.maxHp).toBe(500_000);
    expect(boss.deadlineAt).toBe(600_000);
    expect(save.inventory.slab_bellanoir).toBe(0);
    expect(summon(save, 'bellanoir')).toBeNull();
  });
  it('Libero requires a Bellanoir win', () => {
    const save = newState();
    save.base.structures[ALTAR] = 1;
    save.inventory.slab_libero = 1;
    expect(summonBlocker(save, 'libero')).toBe('locked');
    save.progress.raids.bellanoir = 1;
    expect(isUnlocked(save, raidById('libero').unlock)).toBe(true);
    expect(summonBlocker(save, 'libero')).toBeNull();
  });
});

describe('winning', () => {
  it('pays 40x rewards on the kill, then the chest, the egg and the win count', () => {
    const save = newState();
    const boss = { palId: 142, level: 50, hp: 0, maxHp: 1, lucky: false, kind: 'raid' as const };
    const wild = applyDefeat(newState(), { ...boss, kind: 'wild' }, () => 1);
    const raid = applyDefeat(save, boss, () => 1);
    expect(raid.gold).toBe(wild.gold * 40);

    const def = raidById('bellanoir');
    const chest = completeRaid(save, def, () => 0);
    expect(chest.gold).toBe(def.reward.gold);
    expect(chest.items.diamond).toBe(2);
    expect(save.inventory.diamond).toBe(2);
    expect(chest.egg).toBe(true);
    expect(save.base.eggs).toEqual([{ palId: 142, remaining: INCUBATION_SEC.legendary, passives: ['legend'] }]);
    expect(raidWins(save, 'bellanoir')).toBe(1);
    expect(describeRaidChest(chest, def.name, itemName)).toContain('a Bellanoir egg');
  });
});

describe('migration v9 → v10', () => {
  it('adds the raid win map', () => {
    const v9 = { ...newState(), version: 9 } as Record<string, unknown>;
    const progress = { ...(v9.progress as object) } as Record<string, unknown>;
    delete progress.raids;
    v9.progress = progress;
    const s = migrate(v9)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.progress.raids).toEqual({});
  });
});
