import type { PalInstance, SaveState, SphereTier, WildKind } from '../data/types';
import { ELEMENTS, SPHERE_TIERS } from '../data/types';
import { PALS, palById } from '../data/pals';
import { REGIONS } from '../data/regions';
import { DUNGEONS } from '../data/dungeons';
import { RAIDS } from '../data/raids';
import { TECHS } from '../data/tech';
import { ALPHA_CATCH_PENALTY, EFFIGY_CAPTURE_BONUS, LUCKY_CATCH_PENALTY, SPHERES } from '../data/spheres';
import { RARITIES } from '../data/types';
import { catchChance } from './catch';
import { techMult } from './tech';
import { prestigeMult } from './prestige';
import { partnerMult } from './partner';
import { instanceAttack } from './formulas';
import { achievementPoints, totalPoints } from './achievements';
import { ACHIEVEMENTS } from '../data/achievements';
import { routeCleared } from './progress';

export interface StatRow { label: string; value: string; hint?: string }
export interface StatSection { title: string; rows: StatRow[] }

export const KIND_LABEL: Record<WildKind, string> = {
  wild: 'Wild Pals', alpha: 'Alphas', tower: 'Tower bosses', dungeon: 'Sealed Realm Pals', dungeonBoss: 'Realm bosses', raid: 'Raid bosses',
};

export const fmtInt = (n: number) => Math.round(n).toLocaleString();
export const fmtPct = (n: number) => `${(n * 100).toFixed(n >= 0.1 ? 0 : 1)}%`;

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

/** The single Pal with the highest attack (any star/level/passive), or null with an empty box. */
export function strongestPal(save: SaveState): PalInstance | null {
  let best: PalInstance | null = null;
  for (const p of save.box) if (!best || instanceAttack(p) > instanceAttack(best)) best = p;
  return best;
}

export function highestLevelPal(save: SaveState): PalInstance | null {
  let best: PalInstance | null = null;
  for (const p of save.box) if (!best || p.level > best.level) best = p;
  return best;
}

/** Per-tier throws / catches / rate, only for tiers ever thrown, in tier order. */
export function catchByTier(save: SaveState): { tier: SphereTier; name: string; throws: number; caught: number; rate: number }[] {
  return SPHERE_TIERS
    .map((tier) => ({ tier, name: SPHERES[tier].name, throws: save.stats.throwsByTier[tier] ?? 0, caught: save.stats.caughtByTier[tier] ?? 0 }))
    .filter((r) => r.throws > 0)
    .map((r) => ({ ...r, rate: r.caught / r.throws }));
}

/** Defeats per element, descending, only elements with any. */
export function defeatsByElement(save: SaveState): { element: string; n: number }[] {
  return ELEMENTS
    .map((element) => ({ element, n: save.stats.defeatedByElement[element] ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
}

export function defeatsByKind(save: SaveState): { kind: WildKind; label: string; n: number }[] {
  return (Object.keys(KIND_LABEL) as WildKind[])
    .map((kind) => ({ kind, label: KIND_LABEL[kind], n: save.stats.defeatedByKind[kind] ?? 0 }))
    .filter((r) => r.n > 0);
}

/** The multipliers on every throw right now, and the sphere the "new species" policy would use (a Pal Sphere when it says none). */
export function catchBonus(save: SaveState): { total: number; effigies: number; tech: number; mastery: number; partner: number; tier: SphereTier } {
  const effigies = 1 + EFFIGY_CAPTURE_BONUS * save.player.effigies;
  const tech = techMult(save, 'catch');
  const mastery = prestigeMult(save, 'catch');
  const partner = partnerMult(save, 'catch');
  const tier: SphereTier = save.settings.sphereForNew === 'none' ? 'pal' : save.settings.sphereForNew;
  return { total: effigies * tech * mastery * partner, effigies, tech, mastery, partner, tier };
}

/** Everything the Stats tab shows, as labelled sections; `live` carries values only the running game knows. */
export function statsReport(save: SaveState, live: { dps: number; clickDmg: number }): StatSection[] {
  const st = save.stats;
  const hours = st.playSeconds / 3600;
  const routes = REGIONS.flatMap((r) => r.routes);
  const alphas = REGIONS.flatMap((r) => r.alphas);
  const seen = PALS.filter((p) => save.paldeck[p.id]?.seen).length;
  const caughtSpecies = PALS.filter((p) => (save.paldeck[p.id]?.caught ?? 0) > 0).length;
  const strongest = strongestPal(save);
  const highest = highestLevelPal(save);
  const structures = Object.values(save.base.structures).reduce((n, lvl) => n + lvl, 0);
  const realmClears = Object.values(save.progress.dungeons).reduce((n, c) => n + c, 0);
  const raidWins = Object.values(save.progress.raids).reduce((n, c) => n + c, 0);
  const bonus = catchBonus(save);
  const bonusParts = [
    save.player.effigies ? `Effigies +${Math.round((bonus.effigies - 1) * 100)}%` : '',
    bonus.tech !== 1 ? `Capture Technique ×${bonus.tech.toFixed(2)}` : '',
    bonus.mastery !== 1 ? `Sphere Mastery ×${bonus.mastery.toFixed(2)}` : '',
    bonus.partner !== 1 ? `partner skills ×${bonus.partner.toFixed(2)}` : '',
  ].filter(Boolean);
  const byRarity = RARITIES.map((r) => `${r} ${fmtPct(catchChance(r, bonus.tier, save.player.effigies, false, bonus.tech * bonus.mastery * bonus.partner))}`).join(' · ');
  const palName = (p: PalInstance | null, extra?: (p: PalInstance) => string) => (p ? `${palById(p.palId).name} Lv ${p.level}${p.lucky ? ' ✨' : ''}${p.stars ? ' ★' + p.stars : ''}${extra ? ' — ' + extra(p) : ''}` : '—');

  return [
    { title: 'Overview', rows: [
      { label: 'Time played', value: fmtDuration(st.playSeconds), hint: 'Active time only; offline base time is not counted.' },
      { label: 'Level', value: `${save.player.level}` },
      { label: 'Gold earned', value: fmtInt(st.goldEarned), hint: hours >= 0.05 ? `${fmtInt(st.goldEarned / hours)} per hour played` : undefined },
      { label: 'Gold spent', value: fmtInt(st.goldSpent) },
      { label: 'Achievements', value: `${save.achievements.length} / ${ACHIEVEMENTS.length}`, hint: `${achievementPoints(save)} / ${totalPoints} points` },
      { label: 'Ascensions', value: `${save.prestige.ascensions}`, hint: save.prestige.ascensions ? `${fmtInt(save.prestige.relics)} Ancient Relics held` : undefined },
    ] },
    { title: 'Combat', rows: [
      { label: 'Pals defeated', value: fmtInt(st.defeated), hint: hours >= 0.05 ? `${fmtInt(st.defeated / hours)} per hour played` : undefined },
      ...defeatsByKind(save).map((r) => ({ label: `  ${r.label}`, value: fmtInt(r.n) })),
      { label: 'Lucky Pals defeated', value: fmtInt(st.luckyDefeated) },
      { label: 'Attacks tapped', value: fmtInt(st.clicks) },
      { label: 'Tap damage', value: fmtInt(live.clickDmg) },
      { label: 'Party DPS', value: live.dps.toFixed(1), hint: 'Against the Pal in the arena right now.' },
    ] },
    { title: 'Catching', rows: [
      { label: 'Pals caught', value: fmtInt(st.caught), hint: st.luckyCaught ? `${st.luckyCaught} Lucky` : undefined },
      { label: 'Spheres thrown', value: fmtInt(st.throws), hint: st.throws ? `${fmtPct(st.caught / st.throws)} landed${st.ratedThrows ? ` · ${fmtPct(st.chanceSum / st.ratedThrows)} expected from the odds` : ''}` : undefined },
      ...catchByTier(save).map((r) => ({ label: `  ${r.name}`, value: `${fmtInt(r.caught)} / ${fmtInt(r.throws)}`, hint: fmtPct(r.rate) })),
      { label: 'Catch bonus', value: `×${bonus.total.toFixed(2)}`, hint: bonusParts.length ? bonusParts.join(' · ') : 'Effigies, Capture Technique and Sphere Mastery multiply every throw.' },
      { label: 'Odds by rarity', value: byRarity, hint: `With a ${SPHERES[bonus.tier].name} on a wild Pal · Lucky ×${LUCKY_CATCH_PENALTY} · Alpha ×${ALPHA_CATCH_PENALTY}` },
      { label: 'Paldeck', value: `${caughtSpecies} caught · ${seen} seen`, hint: `of ${PALS.length} species` },
      { label: 'Pals in the Box', value: fmtInt(save.box.length), hint: `${save.party.length} in the party, ${save.base.workers.length} at the base` },
      { label: 'Strongest Pal', value: palName(strongest, (p) => `${instanceAttack(p).toFixed(1)} attack`) },
      { label: 'Highest level', value: palName(highest) },
    ] },
    { title: 'Base', rows: [
      { label: 'Structures built', value: fmtInt(structures), hint: `${Object.keys(save.base.structures).length} kinds, counting upgrades` },
      { label: 'Items crafted', value: fmtInt(st.crafted) },
      { label: 'Eggs hatched', value: fmtInt(st.hatched), hint: st.luckyHatched ? `${st.luckyHatched} Lucky` : undefined },
      { label: 'Pals condensed', value: fmtInt(st.condensed), hint: 'Stars added across all Pals.' },
      { label: 'Expeditions', value: fmtInt(st.expeditions) },
      { label: 'Tech researched', value: `${save.tech.length} / ${TECHS.length}` },
    ] },
    { title: 'World', rows: [
      { label: 'Routes cleared', value: `${routes.filter((r) => routeCleared(save, r)).length} / ${routes.length}` },
      { label: 'Alphas beaten', value: `${save.progress.alphas.length} / ${alphas.length}` },
      { label: 'Alpha rematches won', value: fmtInt(st.rematchesWon), hint: Object.keys(save.progress.alphaRematch).length ? `highest tier ${Math.max(...Object.values(save.progress.alphaRematch).map((r) => r.tier)) - 1}` : undefined },
      { label: 'Base raids', value: `${fmtInt(st.baseRaidsRepelled)} repelled · ${fmtInt(st.baseRaidsLost)} lost` },
      { label: 'Daily challenges done', value: fmtInt(st.challengesDone) },
      { label: 'Towers cleared', value: `${save.progress.towers.length} / ${REGIONS.length}` },
      { label: 'Sealed Realm clears', value: fmtInt(realmClears), hint: `${Object.keys(save.progress.dungeons).length} / ${DUNGEONS.length} realms cleared at least once` },
      { label: 'Raid wins', value: fmtInt(raidWins), hint: `${Object.keys(save.progress.raids).length} / ${RAIDS.length} raid bosses beaten` },
    ] },
  ];
}

// ---- filtering ----------------------------------------------------------------------

export interface StatsFilter { query: string; section: string | 'any'; nonZero: boolean }
export const DEFAULT_STATS_FILTER: StatsFilter = { query: '', section: 'any', nonZero: false };

export function isStatsFiltering(f: StatsFilter): boolean {
  return f.query.trim() !== '' || f.section !== 'any' || f.nonZero;
}

const isZero = (r: StatRow) => /^(0|—|0 \/ \d+|0 caught · 0 seen)$/.test(r.value.trim());

/**
 * Sections reduced to the rows that match: every search word against the section title, row label,
 * value or hint; optional single section; optional "hide zero / empty rows". A sub-row (indented
 * breakdown) is kept whenever its parent matches, so "Pals defeated" keeps its per-kind lines.
 */
export function filterStats(sections: StatSection[], f: StatsFilter): StatSection[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const out: StatSection[] = [];
  for (const sec of sections) {
    if (f.section !== 'any' && sec.title !== f.section) continue;
    const rows: StatRow[] = [];
    let parentKept = false;
    for (const r of sec.rows) {
      const sub = r.label.startsWith(' ');
      const hay = [sec.title, r.label, r.value, r.hint ?? ''].join(' ').toLowerCase();
      const textOk = words.every((w) => hay.includes(w));
      const keep: boolean = (textOk || (sub && parentKept)) && !(f.nonZero && isZero(r));
      if (!sub) parentKept = keep;
      if (keep) rows.push(r);
    }
    if (rows.length) out.push({ title: sec.title, rows });
  }
  return out;
}
