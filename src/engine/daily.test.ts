import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { bonusReady, claimBonus, claimQuest, dayKey, generateDaily, msUntilRollover, progressTier, questDone, questProgress, rollDaily, DAILY_COUNT, BONUS_EFFIGIES, DEFAULT_QUEST_FILTER, filterQuests, isQuestFiltering, questStatus, QUEST_KIND_LABEL, type QuestFilter } from './daily';
import { applyDefeat } from './combat';
import { routeById } from '../data/regions';
import { itemById } from '../data/items';

const DAY = 24 * 60 * 60 * 1000;

describe('day keys', () => {
  it('are UTC dates and roll at midnight', () => {
    const t = Date.UTC(2026, 8, 12, 23, 59, 0);
    expect(dayKey(t)).toBe('2026-09-12');
    expect(dayKey(t + 2 * 60 * 1000)).toBe('2026-09-13');
    expect(msUntilRollover(t)).toBe(60 * 1000);
  });
});

describe('generation', () => {
  it('gives three distinct quests, deterministic per day and tier, with valid rewards', () => {
    const save = newState();
    const a = generateDaily(save, '2026-09-12');
    const b = generateDaily(newState(), '2026-09-12');
    expect(a.quests).toHaveLength(DAILY_COUNT);
    expect(new Set(a.quests.map((q) => q.kind)).size).toBe(DAILY_COUNT);
    expect(a.quests.map((q) => q.kind)).toEqual(b.quests.map((q) => q.kind));
    expect(generateDaily(save, '2026-09-13').quests.map((q) => q.id)).not.toEqual(a.quests.map((q) => q.id));
    for (const q of a.quests) {
      expect(q.target).toBeGreaterThan(0);
      expect(q.reward.gold).toBeGreaterThan(0);
      for (const id of Object.keys(q.reward.items)) itemById(id);
      if (q.kind === 'route') routeById(q.param!);
    }
  });
  it('only offers what the player can do, and scales with progress', () => {
    const fresh = newState();
    const kinds = new Set<string>();
    for (let d = 1; d <= 60; d++) for (const q of generateDaily(fresh, `2026-01-${String(d % 28 + 1).padStart(2, '0')}`).quests) kinds.add(q.kind);
    expect(kinds.has('hatch')).toBe(false);
    expect(kinds.has('expedition')).toBe(false);
    expect(kinds.has('realm')).toBe(false);
    expect(progressTier(fresh)).toBe(1);
    const late = newState();
    late.progress.towers.push('rayne', 'lily', 'axel');
    expect(progressTier(late)).toBe(4);
    const early = generateDaily(fresh, '2026-09-12').quests.find((q) => q.kind === 'defeat');
    const later = generateDaily(late, '2026-09-12').quests.find((q) => q.kind === 'defeat');
    if (early && later) expect(later.target).toBeGreaterThan(early.target);
  });
});

describe('progress and claiming', () => {
  it('measures from a baseline and pays once', () => {
    const save = newState();
    save.stats.defeated = 500;
    save.daily = generateDaily(save, '2026-09-12');
    const q = save.daily.quests.find((x) => x.kind === 'defeat') ?? save.daily.quests[0];
    save.daily.quests = [{ ...q, kind: 'defeat', target: 3, baseline: 500, param: undefined }];
    const d = save.daily.quests[0];
    expect(questProgress(save, d)).toBe(0);
    expect(claimQuest(save, d.id)).toBeNull();
    for (let i = 0; i < 3; i++) applyDefeat(save, { palId: 1, level: 1, hp: 0, maxHp: 1, lucky: false, kind: 'wild' }, () => 1);
    expect(questDone(save, d)).toBe(true);
    const gold = save.player.gold;
    expect(claimQuest(save, d.id)).toBe(d);
    expect(save.player.gold).toBe(gold + d.reward.gold);
    expect(claimQuest(save, d.id)).toBeNull();
    expect(bonusReady(save)).toBe(true);
    const eff = save.player.effigies;
    expect(claimBonus(save)).toBe(true);
    expect(save.player.effigies).toBe(eff + BONUS_EFFIGIES);
    expect(claimBonus(save)).toBe(false);
  });
  it('element and route quests count the right kills', () => {
    const save = newState();
    save.daily = { date: 'x', bonusClaimed: false, quests: [
      { id: 'e', kind: 'element', param: 'Grass', target: 2, baseline: 0, claimed: false, reward: { gold: 1, items: {} } },
      { id: 'r', kind: 'route', param: 'plateau', target: 2, baseline: 0, claimed: false, reward: { gold: 1, items: {} } },
    ] };
    applyDefeat(save, { palId: 4, level: 1, hp: 0, maxHp: 1, lucky: false, kind: 'wild' }, () => 1); // Lifmunk (Grass)
    applyDefeat(save, { palId: 1, level: 1, hp: 0, maxHp: 1, lucky: false, kind: 'wild' }, () => 1); // Lamball
    save.progress.routeKills.plateau = 2;
    expect(questProgress(save, save.daily.quests[0])).toBe(1);
    expect(questProgress(save, save.daily.quests[1])).toBe(2);
  });
  it('rolls over to a new day and drops unclaimed quests', () => {
    const save = newState();
    const t = Date.UTC(2026, 8, 12, 12);
    expect(rollDaily(save, t)).toBe(true);
    expect(rollDaily(save, t + 1000)).toBe(false);
    const first = save.daily!.quests.map((q) => q.id);
    expect(rollDaily(save, t + DAY)).toBe(true);
    expect(save.daily!.date).toBe('2026-09-13');
    expect(save.daily!.quests.map((q) => q.id)).not.toEqual(first);
  });
});

describe('local reset', () => {
  it('keys days by the local calendar and rolls at local midnight', () => {
    const local = new Date(2026, 8, 12, 23, 30); // 23:30 local
    expect(dayKey(local.getTime(), 'local')).toBe('2026-09-12');
    expect(dayKey(local.getTime() + 60 * 60 * 1000, 'local')).toBe('2026-09-13');
    expect(msUntilRollover(local.getTime(), 'local')).toBe(30 * 60 * 1000);
    const save = newState();
    save.settings.dailyReset = 'local';
    rollDaily(save, local.getTime());
    expect(save.daily!.date).toBe('2026-09-12');
    expect(rollDaily(save, local.getTime() + 60 * 60 * 1000)).toBe(true);
    expect(save.daily!.date).toBe('2026-09-13');
  });
});

describe('migration v13 → v14', () => {
  it('adds the element counter and daily slot', () => {
    const v13 = { ...newState(), version: 13 } as Record<string, unknown>;
    const stats = { ...(v13.stats as object) } as Record<string, unknown>;
    delete stats.defeatedByElement; v13.stats = stats; delete v13.daily;
    const s = migrate(v13)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.stats.defeatedByElement).toEqual({});
    expect(s.daily).toBeNull();
  });
});

describe('quest filter', () => {
  it('filters by status, kind and text', () => {
    const s = newState();
    rollDaily(s, Date.UTC(2026, 8, 12, 12));
    const quests = s.daily!.quests;
    const name = (id: string) => routeById(id).name;
    const f = (over: Partial<QuestFilter>): QuestFilter => ({ ...DEFAULT_QUEST_FILTER, ...over });
    expect(filterQuests(s, DEFAULT_QUEST_FILTER, name)).toEqual(quests);
    expect(isQuestFiltering(DEFAULT_QUEST_FILTER)).toBe(false);
    expect(filterQuests(s, f({ status: 'progress' }), name)).toEqual(quests);
    expect(filterQuests(s, f({ status: 'claimed' }), name)).toEqual([]);

    const q = quests[0];
    expect(filterQuests(s, f({ kind: q.kind }), name).every((x) => x.kind === q.kind)).toBe(true);
    expect(filterQuests(s, f({ query: QUEST_KIND_LABEL[q.kind].toLowerCase() }), name)).toContain(q);
    expect(filterQuests(s, f({ query: 'gold' }), name)).toEqual(quests);       // every reward pays gold
    expect(filterQuests(s, f({ query: 'zzz' }), name)).toEqual([]);

    // finish and claim the first quest
    q.claimed = true;
    expect(filterQuests(s, f({ status: 'claimed' }), name)).toEqual([q]);
    expect(filterQuests(s, f({ status: 'progress' }), name)).not.toContain(q);
    expect(questStatus(s, q)).toBe('claimed');
  });
});
