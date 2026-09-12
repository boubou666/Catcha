import type { DailyKind, DailyQuest, DailyRecord, DailyReset, DailyState, Element, SaveState } from '../data/types';
import { ELEMENTS } from '../data/types';
import { REGIONS } from '../data/regions';
import { DUNGEONS } from '../data/dungeons';
import { SPHERE_TIERS } from '../data/types';
import { SPHERES } from '../data/spheres';
import { EXPEDITION_POST } from '../data/expeditions';
import { BREEDING_FARM } from './breeding';
import { isUnlocked } from './progress';
import { addItem, earnGold } from './inventory';
import { itemName } from '../data/items';

export const DAILY_COUNT = 3;
export const BONUS_EFFIGIES = 1;
export const HISTORY_DAYS = 90;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Calendar day as YYYY-MM-DD, in UTC or the browser's local zone. Also the quest seed. */
export function dayKey(now = Date.now(), mode: DailyReset = 'utc'): string {
  const d = new Date(now);
  return mode === 'utc'
    ? d.toISOString().slice(0, 10)
    : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function msUntilRollover(now = Date.now(), mode: DailyReset = 'utc'): number {
  const d = new Date(now);
  return mode === 'utc'
    ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now
    : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now;
}

/** Small deterministic PRNG (mulberry32) seeded from the day key. */
function seeded(key: string): () => number {
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 3432918353), h = (h << 13) | (h >>> 19);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1–7: index of the furthest region whose first route is open, plus one. */
export function progressTier(save: SaveState): number {
  let tier = 1;
  REGIONS.forEach((r, i) => { if (isUnlocked(save, r.routes[0].unlock)) tier = i + 1; });
  return tier;
}

/** The counter a quest measures. Progress = counter − baseline taken at generation. */
export function questCounter(save: SaveState, q: DailyQuest): number {
  switch (q.kind) {
    case 'defeat': return save.stats.defeated;
    case 'catch': return save.stats.caught;
    case 'gold': return save.stats.goldEarned;
    case 'hatch': return save.stats.hatched;
    case 'craft': return save.stats.crafted;
    case 'expedition': return save.stats.expeditions;
    case 'element': return save.stats.defeatedByElement[q.param as Element] ?? 0;
    case 'realm': return Object.values(save.progress.dungeons).reduce((a, b) => a + b, 0);
    case 'route': return save.progress.routeKills[q.param!] ?? 0;
  }
}

export function questProgress(save: SaveState, q: DailyQuest): number {
  return Math.min(q.target, Math.max(0, questCounter(save, q) - q.baseline));
}

export function questDone(save: SaveState, q: DailyQuest): boolean {
  return questProgress(save, q) >= q.target;
}

function questTemplate(save: SaveState, kind: DailyQuest['kind'], tier: number, rand: () => number): Omit<DailyQuest, 'id' | 'baseline' | 'claimed' | 'reward'> {
  const t2 = tier * tier;
  switch (kind) {
    case 'defeat': return { kind, target: 50 * tier };
    case 'catch': return { kind, target: 5 * tier };
    case 'gold': return { kind, target: 500 * t2 };
    case 'hatch': return { kind, target: 1 + Math.floor(tier / 3) };
    case 'craft': return { kind, target: 3 * tier };
    case 'expedition': return { kind, target: 1 };
    case 'realm': return { kind, target: 1 };
    case 'element': return { kind, target: 20 * tier, param: ELEMENTS[Math.floor(rand() * ELEMENTS.length)] };
    case 'route': {
      const open = REGIONS.flatMap((r) => r.routes).filter((r) => isUnlocked(save, r.unlock));
      const route = open[Math.floor(rand() * open.length)];
      return { kind, target: 30 * tier, param: route.id };
    }
  }
}

function available(save: SaveState): DailyQuest['kind'][] {
  const kinds: DailyQuest['kind'][] = ['defeat', 'catch', 'gold', 'craft', 'element', 'route'];
  if ((save.base.structures[BREEDING_FARM] ?? 0) > 0) kinds.push('hatch');
  if ((save.base.structures[EXPEDITION_POST] ?? 0) > 0) kinds.push('expedition');
  if (DUNGEONS.some((d) => isUnlocked(save, d.unlock))) kinds.push('realm');
  return kinds;
}

function rewardFor(tier: number, weight: number): DailyQuest['reward'] {
  const sphere = SPHERE_TIERS[Math.min(tier - 1, SPHERE_TIERS.length - 1)];
  return {
    gold: Math.round(200 * tier * tier * weight),
    items: { [SPHERES[sphere].itemId]: 2 + Math.round(2 * weight), paldium: 10 * tier },
  };
}

/** Today's three quests for this save. Deterministic for a given day and progress tier. */
export function generateDaily(save: SaveState, key: string): DailyState {
  const rand = seeded(`${key}:${progressTier(save)}`);
  const tier = progressTier(save);
  const pool = available(save);
  const quests: DailyQuest[] = [];
  const used = new Set<string>();
  while (quests.length < DAILY_COUNT && used.size < pool.length) {
    const kind = pool[Math.floor(rand() * pool.length)];
    if (used.has(kind)) continue;
    used.add(kind);
    const tpl = questTemplate(save, kind, tier, rand);
    const weight = kind === 'realm' || kind === 'expedition' || kind === 'hatch' ? 1.5 : 1;
    quests.push({ id: `${key}-${kind}`, ...tpl, baseline: questCounter(save, { ...tpl, id: '', baseline: 0, claimed: false, reward: { gold: 0, items: {} } }), claimed: false, reward: rewardFor(tier, weight) });
  }
  return { date: key, quests, bonusClaimed: false };
}

/** Freeze the current day's quests (with their final progress) into the history. */
export function archiveDaily(save: SaveState): void {
  const d = save.daily;
  if (!d || d.quests.length === 0) return;
  const record: DailyRecord = {
    date: d.date,
    quests: d.quests.map((q) => ({ kind: q.kind, param: q.param, target: q.target, progress: questProgress(save, q), claimed: q.claimed, reward: q.reward })),
    bonusClaimed: d.bonusClaimed,
  };
  save.dailyHistory ??= [];
  // a reset-mode change can re-roll the same date; keep one record per date
  save.dailyHistory = [...save.dailyHistory.filter((r) => r.date !== d.date), record].slice(-HISTORY_DAYS);
}

/** Make sure today's quests exist; regenerate on a new day (unclaimed quests are lost). Returns true if rolled. */
export function rollDaily(save: SaveState, now = Date.now()): boolean {
  const key = dayKey(now, save.settings.dailyReset ?? 'utc');
  if (save.daily?.date === key) return false;
  archiveDaily(save);
  save.daily = generateDaily(save, key);
  return true;
}

/** Consecutive days ending today (or yesterday, if today is still open) on which every quest was claimed. */
export function questStreak(save: SaveState): number {
  const days = [...(save.dailyHistory ?? []).map((r) => ({ date: r.date, full: r.quests.length > 0 && r.quests.every((q) => q.claimed) }))];
  if (save.daily) days.push({ date: save.daily.date, full: save.daily.quests.length > 0 && save.daily.quests.every((q) => q.claimed) });
  days.sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  let i = days.length - 1;
  const today = save.daily?.date ?? null;
  if (i >= 0 && days[i].date === today && !days[i].full) i -= 1;   // today isn't over yet
  // the run must reach today or yesterday, otherwise it's already broken
  let expect: string | null = today && i >= 0 && days[i].date !== today ? prevDay(today) : null;
  for (; i >= 0; i -= 1) {
    if (!days[i].full || (expect !== null && days[i].date !== expect)) break;
    streak += 1;
    expect = prevDay(days[i].date);
  }
  return streak;
}

const prevDay = (key: string) => { const d = new Date(key + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

export interface HistorySummary { days: number; claimed: number; total: number; bonuses: number; gold: number; streak: number }

/** Totals over the history plus today. */
export function historySummary(save: SaveState): HistorySummary {
  const recs = save.dailyHistory ?? [];
  const today = save.daily;
  const all = [...recs.flatMap((r) => r.quests), ...(today?.quests ?? [])];
  return {
    days: recs.length + (today ? 1 : 0),
    claimed: all.filter((q) => q.claimed).length,
    total: all.length,
    bonuses: recs.filter((r) => r.bonusClaimed).length + (today?.bonusClaimed ? 1 : 0),
    gold: all.filter((q) => q.claimed).reduce((s, q) => s + q.reward.gold, 0),
    streak: questStreak(save),
  };
}

export function claimQuest(save: SaveState, id: string): DailyQuest | null {
  const q = save.daily?.quests.find((x) => x.id === id);
  if (!q || q.claimed || !questDone(save, q)) return null;
  q.claimed = true;
  earnGold(save, q.reward.gold);
  for (const [itemId, n] of Object.entries(q.reward.items)) addItem(save, itemId, n);
  return q;
}

export function bonusReady(save: SaveState): boolean {
  const d = save.daily;
  return !!d && !d.bonusClaimed && d.quests.length > 0 && d.quests.every((q) => q.claimed);
}

export function claimBonus(save: SaveState): boolean {
  if (!bonusReady(save)) return false;
  save.daily!.bonusClaimed = true;
  save.player.effigies += BONUS_EFFIGIES;
  return true;
}

export function describeQuest(q: DailyQuest, routeName: (id: string) => string): string {
  switch (q.kind) {
    case 'defeat': return `Defeat ${q.target.toLocaleString()} Pals`;
    case 'catch': return `Catch ${q.target} Pals`;
    case 'gold': return `Earn ${q.target.toLocaleString()} gold`;
    case 'hatch': return `Hatch ${q.target} egg${q.target === 1 ? '' : 's'}`;
    case 'craft': return `Craft ${q.target} items`;
    case 'expedition': return 'Complete an expedition';
    case 'realm': return 'Clear a Sealed Realm';
    case 'element': return `Defeat ${q.target} ${q.param}-element Pals`;
    case 'route': return `Defeat ${q.target} Pals on ${routeName(q.param!)}`;
  }
}

// ---- filtering ----------------------------------------------------------------------

export type QuestStatus = 'ready' | 'progress' | 'claimed' | 'missed';
export type QuestStatusFilter = 'any' | QuestStatus;

export interface QuestFilter {
  query: string;
  status: QuestStatusFilter;
  kind: DailyKind | 'any';
}

export const DEFAULT_QUEST_FILTER: QuestFilter = { query: '', status: 'any', kind: 'any' };
export const QUEST_STATUS_LABEL: Record<QuestStatusFilter, string> = { any: 'Any status', ready: 'Ready to claim', progress: 'In progress', claimed: 'Claimed', missed: 'Missed' };
export const QUEST_KIND_LABEL: Record<DailyKind, string> = {
  defeat: 'Defeat Pals', catch: 'Catch Pals', gold: 'Earn gold', hatch: 'Hatch eggs', craft: 'Craft items',
  expedition: 'Expedition', realm: 'Sealed Realm', element: 'Element defeats', route: 'Route defeats',
};

export function questStatus(save: SaveState, q: DailyQuest): QuestStatus {
  return q.claimed ? 'claimed' : questDone(save, q) ? 'ready' : 'progress';
}

export function isQuestFiltering(f: QuestFilter): boolean {
  return f.query.trim() !== '' || f.status !== 'any' || f.kind !== 'any';
}

type QuestLike = Pick<DailyQuest, 'kind' | 'param' | 'target' | 'claimed' | 'reward'>;

function questMatches(q: QuestLike, status: QuestStatus, f: QuestFilter, words: string[], routeName: (id: string) => string): boolean {
  if (f.kind !== 'any' && q.kind !== f.kind) return false;
  if (f.status !== 'any' && status !== f.status) return false;
  if (words.length === 0) return true;
  const hay = [describeQuest(q as DailyQuest, routeName), QUEST_KIND_LABEL[q.kind], ...Object.keys(q.reward.items).map(itemName), 'gold'].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

const queryWords = (f: QuestFilter) => f.query.toLowerCase().split(/\s+/).filter(Boolean);

/** Today's quests matching the filter. Every search word must match the quest text, its kind label, or a reward item name. */
export function filterQuests(save: SaveState, f: QuestFilter, routeName: (id: string) => string): DailyQuest[] {
  const words = queryWords(f);
  return (save.daily?.quests ?? []).filter((q) => questMatches(q, questStatus(save, q), f, words, routeName));
}

/** Past days, newest first, each reduced to the quests that match; days with no match are dropped. */
export function filterHistory(save: SaveState, f: QuestFilter, routeName: (id: string) => string): DailyRecord[] {
  const words = queryWords(f);
  return [...(save.dailyHistory ?? [])].reverse()
    .map((r) => ({ ...r, quests: r.quests.filter((q) => questMatches(q, q.claimed ? 'claimed' : 'missed', f, words, routeName)) }))
    .filter((r) => r.quests.length > 0);
}
