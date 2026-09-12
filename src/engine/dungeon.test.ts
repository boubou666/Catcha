import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { completeRun, describeChest, dungeonClears, dungeonUnlocked, isBossWave, spawnFor, startRun } from './dungeon';
import { DUNGEONS, dungeonById } from '../data/dungeons';
import { REGIONS, routeById } from '../data/regions';
import { palById } from '../data/pals';
import { itemById, itemName } from '../data/items';
import { wildHp } from './formulas';
import { applyDefeat } from './combat';

describe('dungeon data', () => {
  it('one per region, pools and loot reference real content', () => {
    expect(DUNGEONS.map((d) => d.regionId)).toEqual(REGIONS.map((r) => r.id));
    for (const d of DUNGEONS) {
      for (const s of d.pool) palById(s.palId);
      palById(d.boss.palId);
      for (const drop of d.loot.items) itemById(drop.itemId);
      if (d.unlock.kind === 'routeCleared') expect(routeById(d.unlock.id).regionId).toBe(d.regionId);
    }
  });
});

describe('a run', () => {
  it('walks the waves then the boss, with scaled HP and the deadline attached', () => {
    const def = dungeonById('frozen_wings');
    const run = startRun('frozen_wings', 1000);
    expect(run.deadlineAt).toBe(1000 + def.timeLimitSec * 1000);
    for (let i = 0; i < def.waves; i++) {
      expect(isBossWave(run)).toBe(false);
      const w = spawnFor(run, () => 0);
      expect(w.kind).toBe('dungeon');
      expect(w.level).toBe(def.level);
      expect(w.maxHp).toBeCloseTo(wildHp(def.level) * def.waveHpMult);
      expect(w.deadlineAt).toBe(run.deadlineAt);
      run.wave++;
    }
    expect(isBossWave(run)).toBe(true);
    const boss = spawnFor(run);
    expect(boss.kind).toBe('dungeonBoss');
    expect(boss.palId).toBe(55); // Chillet
    expect(boss.maxHp).toBeCloseTo(wildHp(def.level + 2) * def.boss.hpMult);
  });

  it('waves and bosses pay more than route Pals', () => {
    const base = { palId: 10, level: 14, hp: 0, maxHp: 1, lucky: false } as const;
    const wild = applyDefeat(newState(), { ...base, kind: 'wild' }, () => 1);
    const wave = applyDefeat(newState(), { ...base, kind: 'dungeon' }, () => 1);
    const boss = applyDefeat(newState(), { ...base, kind: 'dungeonBoss' }, () => 1);
    expect(wave.gold).toBe(wild.gold * 2);
    expect(boss.gold).toBe(wild.gold * 12);
  });

  it('is gated on the region\'s last route', () => {
    const save = newState();
    expect(dungeonUnlocked(save, 'frozen_wings')).toBe(false);
    save.progress.routeKills.icewind = 75;
    expect(dungeonUnlocked(save, 'frozen_wings')).toBe(true);
  });

  it('clearing grants the chest, counts, and effigies only the first time', () => {
    const save = newState();
    const def = dungeonById('frozen_wings');
    const first = completeRun(save, def, () => 0); // every drop hits at its minimum
    expect(first.gold).toBe(def.loot.gold);
    expect(first.effigies).toBe(def.firstClear.effigies);
    expect(first.items.paldium).toBe(10);
    expect(save.inventory.paldium).toBe(10);
    expect(save.player.effigies).toBe(2);
    expect(dungeonClears(save, def.id)).toBe(1);
    const again = completeRun(save, def, () => 0);
    expect(again.effigies).toBe(0);
    expect(save.player.effigies).toBe(2);
    expect(dungeonClears(save, def.id)).toBe(2);
    expect(describeChest(first, itemName)).toContain('2 Effigies (first clear)');
    expect(describeChest(again, itemName)).not.toContain('Effigies');
  });
});

describe('migration v7 → v8', () => {
  it('adds the dungeon clear map', () => {
    const v7 = { ...newState(), version: 7 } as Record<string, unknown>;
    const progress = { ...(v7.progress as object) } as Record<string, unknown>;
    delete progress.dungeons;
    v7.progress = progress;
    const s = migrate(v7)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.progress.dungeons).toEqual({});
  });
});
