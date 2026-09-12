// Headless balance model: for each region, assume a reasonable party and report how the numbers feel.
//   npm run balance            # fresh player (ascension 0) in detail, then a per-ascension summary
//   npm run balance -- --runs 8
// Party assumption: 5 Pals from that region's routes (average attack of its top-3 species), at the
// region's top route level, stars by region (0/0/1/1/2/2/3), +10% from passives, every attack tech whose
// level requirement ≤ that level. Click damage ignored (idle baseline).
// Prestige: each full clear earns relics (towers 28 + species/10 + level/10), spent greedily in a fixed
// priority; Ark Pals come through at the previous run's end (Lv 70, ★4, best species) and replace party
// slots; Quick Feet shrinks quotas; Scholar speeds levelling.

import { REGIONS } from '../src/data/regions.ts';
import { DUNGEONS } from '../src/data/dungeons.ts';
import { RAIDS } from '../src/data/raids.ts';
import { PALS, palById } from '../src/data/pals.ts';
import { TECHS } from '../src/data/tech.ts';
import { wildHp, expToLevel, expReward, goldReward, instanceAttack } from '../src/engine/formulas.ts';
import { makeInstance } from '../src/engine/party.ts';
import { newState } from '../src/engine/save.ts';
import { arkSlots, buyUpgrade, prestigeMult, routeQuota } from '../src/engine/prestige.ts';
import { PRESTIGE_UPGRADES } from '../src/data/prestige.ts';

const fmt = (s) => (s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${(s / 60).toFixed(1)}m` : `${s.toFixed(0)}s`);
const pad = (s, n) => String(s).padEnd(n);
const runs = Number(process.argv[process.argv.indexOf('--runs') + 1]) || 5;

const STARS_BY_REGION = [0, 0, 1, 1, 2, 2, 3];
const CARRY_LEVEL = 70, CARRY_STARS = 4;
const BEST_ATTACK = Math.max(...PALS.filter((p) => p.rarity !== 'legendary').map((p) => p.baseAttack));
const SPEND_PRIORITY = ['power', 'quick_feet', 'industry', 'scholar', 'spherecraft', 'ark', 'head_start', 'relic_sense', 'provisions'];

function attackTechMult(level) {
  let m = 1;
  for (const t of TECHS) if (t.effect.kind === 'mult' && t.effect.stat === 'attack' && t.level <= level) m *= t.effect.mult;
  return m;
}

/** Attack of one region-appropriate Pal at `level` with `stars`. */
function regionPal(region, level, stars) {
  const ids = [...new Set(region.routes.flatMap((r) => r.spawns.map((s) => s.palId)))];
  const attacks = ids.map((id) => palById(id).baseAttack).sort((a, b) => b - a).slice(0, 3);
  const avgAttack = attacks.reduce((a, b) => a + b, 0) / attacks.length;
  const proto = makeInstance(ids[0], level); proto.stars = stars;
  return instanceAttack(proto) * (avgAttack / palById(ids[0]).baseAttack) * 1.1;
}

/** Attack of a carried Ark Pal: end-of-run level and stars, best non-legendary species. */
function carriedPal() {
  const proto = makeInstance(1, CARRY_LEVEL); proto.stars = CARRY_STARS;
  return instanceAttack(proto) * (BEST_ATTACK / palById(1).baseAttack) * 1.1;
}

/** Party DPS: `carried` Ark Pals plus region Pals for the rest, techs by level, prestige on top. */
function partyDps(save, region, level, stars, carried) {
  const n = Math.min(5, carried);
  const dps = n * carriedPal() + (5 - n) * regionPal(region, level, stars);
  return dps * attackTechMult(level) * prestigeMult(save, 'attack');
}

/** Hours to clear the whole map for a save with the given prestige state. */
function playThrough(save, carried, verbose) {
  const expMult = 1.2 * prestigeMult(save, 'exp'); // Field Study + Scholar
  let total = 0;
  if (verbose) console.log(pad('region', 24), pad('lvl', 4), pad('dps', 7), pad('wild', 7), pad('alpha', 14), pad('tower', 14), pad('realm', 12), pad('kills/lv', 9), pad('region h', 9));
  const perRegion = [];
  REGIONS.forEach((region, i) => {
    const top = region.routes[region.routes.length - 1].level;
    const stars = STARS_BY_REGION[i];
    const dps = partyDps(save, region, top, stars, carried);
    const wildS = wildHp(top) / dps;
    const alphaTimes = region.alphas.map((a) => (wildHp(a.level) * a.hpMult) / partyDps(save, region, a.level, stars, carried));
    const towerS = region.tower.hp / dps;
    const dungeon = DUNGEONS.find((d) => d.regionId === region.id);
    const realmS = (dungeon.waves * wildHp(dungeon.level) * dungeon.waveHpMult + wildHp(dungeon.level + 2) * dungeon.boss.hpMult) / dps;
    const mid = Math.round((region.routes[0].level + top) / 2);
    const killsPerLevel = expToLevel(mid + 1) / (expReward(mid) * expMult);

    let seconds = 0;
    for (const r of region.routes) seconds += routeQuota(save, r) * (wildHp(r.level) / partyDps(save, region, r.level, stars, carried));
    for (let L = region.routes[0].level; L < top; L++) seconds += (expToLevel(L + 1) / (expReward(L) * expMult)) * (wildHp(L) / partyDps(save, region, L, stars, carried));
    seconds += alphaTimes.reduce((a, b) => a + b, 0) + towerS;
    total += seconds;
    perRegion.push(seconds / 3600);
    if (verbose) console.log(
      pad(region.name, 24), pad(top, 4), pad(dps.toFixed(0), 7), pad(fmt(wildS), 7),
      pad(alphaTimes.map(fmt).join('/'), 14), pad(`${fmt(towerS)} (${Math.round((towerS / region.tower.timeLimitSec) * 100)}%)`, 14),
      pad(`${fmt(realmS)} (${Math.round((realmS / dungeon.timeLimitSec) * 100)}%)`, 12),
      pad(killsPerLevel.toFixed(0), 9), pad(`${(seconds / 3600).toFixed(1)} (Σ${(total / 3600).toFixed(1)})`, 9),
    );
  });
  return { hours: total / 3600, perRegion };
}

/** Relics a full clear is worth after `k` completed runs (species collected grows with each run). */
function relicsForRun(k) {
  const species = Math.min(PALS.length, 60 + 40 * (k + 1));
  return 28 + Math.floor(species / 10) + Math.floor(CARRY_LEVEL / 10);
}

/** Buy upgrades round-robin along the priority list while affordable. */
function spend(save) {
  let bought = true;
  while (bought) {
    bought = false;
    for (const id of SPEND_PRIORITY) if (buyUpgrade(save, id)) bought = true;
  }
}

// ---- ascension 0 in detail ------------------------------------------------------------
console.log('=== Ascension 0 (fresh player) ===');
const fresh = newState();
playThrough(fresh, 0, true);

console.log('\nraids (party from the region where the raid unlocks, +1 star):');
for (const raid of RAIDS) {
  const regionIdx = raid.id === 'libero' ? 6 : raid.id === 'xenolord' ? 5 : 3;
  const region = REGIONS[regionIdx];
  const stars = Math.min(4, STARS_BY_REGION[regionIdx] + 1);
  const dps = partyDps(fresh, region, region.routes[region.routes.length - 1].level, stars, 0) * 1.5;
  const s = raid.hp / dps;
  console.log(' ', pad(raid.name, 18), pad(fmt(s), 8), `(${Math.round((s / raid.timeLimitSec) * 100)}% of limit)`);
}
console.log(`\nearly game: first Lamball ${wildHp(1).toFixed(0)} HP → ${Math.ceil(wildHp(1) / 5.15)} clicks; gold/kill ${goldReward(1)}, sphere 40g`);

// ---- ascensions ----------------------------------------------------------------------
console.log('\n=== Per ascension (full clear each run; relics spent greedily: ' + SPEND_PRIORITY.join(' > ') + ') ===');
console.log(pad('asc', 4), pad('relics', 7), pad('ark', 4), pad('atk×', 6), pad('quota', 6), pad('exp×', 6), pad('upgrades', 44), pad('R1', 5), pad('R2', 5), pad('R4', 5), pad('R7', 5), 'total h');
const save = newState();
let carried = 0;
for (let k = 0; k <= runs; k++) {
  const { hours, perRegion } = playThrough(save, carried, false);
  const ups = PRESTIGE_UPGRADES.filter((u) => (save.prestige.upgrades[u.id] ?? 0) > 0).map((u) => `${u.id}${save.prestige.upgrades[u.id]}`).join(' ');
  const quota = 1 - routeQuota(save, REGIONS[0].routes[0]) / REGIONS[0].routes[0].killsToClear;
  console.log(pad(`A${k}`, 4), pad(save.prestige.relics, 7), pad(carried, 4), pad(prestigeMult(save, 'attack').toFixed(2), 6), pad(`−${Math.round(quota * 100)}%`, 6),
    pad(prestigeMult(save, 'exp').toFixed(2), 6), pad(ups || '—', 44),
    pad(perRegion[0].toFixed(1), 5), pad(perRegion[1].toFixed(1), 5), pad(perRegion[3].toFixed(1), 5), pad(perRegion[6].toFixed(1), 5), hours.toFixed(1));
  // finish the run: earn relics, spend, carry
  save.prestige.relics += relicsForRun(k);
  save.prestige.ascensions += 1;
  spend(save);
  carried = arkSlots(save);
}
