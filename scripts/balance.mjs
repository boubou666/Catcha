// Headless balance model: for each region, assume a reasonable party and report how the numbers feel.
//   node scripts/balance.mjs
// Party assumption: 5 Pals from that region's routes (average attack of its spawn pool, top-3 weighted),
// at the region's top route level, stars by region (0/0/1/1/2/2/3), +10% from passives,
// every attack tech whose level requirement ≤ that level. Click damage ignored (idle baseline).

import { REGIONS } from '../src/data/regions.ts';
import { DUNGEONS } from '../src/data/dungeons.ts';
import { RAIDS } from '../src/data/raids.ts';
import { PALS, palById } from '../src/data/pals.ts';
import { TECHS } from '../src/data/tech.ts';
import { wildHp, expToLevel, expReward, goldReward } from '../src/engine/formulas.ts';
import { makeInstance } from '../src/engine/party.ts';
import { instanceAttack } from '../src/engine/formulas.ts';

const fmt = (s) => (s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${(s / 60).toFixed(1)}m` : `${s.toFixed(0)}s`);
const pad = (s, n) => String(s).padEnd(n);

function attackTechMult(level) {
  let m = 1;
  for (const t of TECHS) if (t.effect.kind === 'mult' && t.effect.stat === 'attack' && t.level <= level) m *= t.effect.mult;
  return m;
}

function regionParty(region, level, stars) {
  // top-3 attack species that spawn in the region, weighted toward what's common
  const ids = [...new Set(region.routes.flatMap((r) => r.spawns.map((s) => s.palId)))];
  const attacks = ids.map((id) => palById(id).baseAttack).sort((a, b) => b - a).slice(0, 3);
  const avgAttack = attacks.reduce((a, b) => a + b, 0) / attacks.length;
  const proto = makeInstance(ids[0], level);
  proto.stars = stars;
  // scale the prototype's attack to the average of the good species
  const one = instanceAttack(proto) * (avgAttack / palById(ids[0]).baseAttack) * 1.1; // +10% passives
  return one * 5 * attackTechMult(level);
}

console.log(pad('region', 24), pad('lvl', 4), pad('dps', 7), pad('wild', 7), pad('alpha', 12), pad('tower', 14), pad('realm', 12), pad('kills/lv', 9), pad('region h', 9));
let cumulativeHours = 0;
REGIONS.forEach((region, i) => {
  const top = region.routes[region.routes.length - 1].level;
  const stars = [0, 0, 1, 1, 2, 2, 3][i];
  const dps = regionParty(region, top, stars);

  const wildS = wildHp(top) / dps;
  const alphaTimes = region.alphas.map((a) => (wildHp(a.level) * a.hpMult) / regionParty(region, a.level, stars));
  const towerS = region.tower.hp / dps;
  const towerPct = Math.round((towerS / region.tower.timeLimitSec) * 100);
  const dungeon = DUNGEONS.find((d) => d.regionId === region.id);
  const realmS = dungeon ? (dungeon.waves * wildHp(dungeon.level) * dungeon.waveHpMult + wildHp(dungeon.level + 2) * dungeon.boss.hpMult) / dps : 0;
  const realmPct = dungeon ? Math.round((realmS / dungeon.timeLimitSec) * 100) : 0;

  // levelling pace around the region's mid level (exp is shared with the party at 1x)
  const mid = Math.round((region.routes[0].level + top) / 2);
  const killsPerLevel = expToLevel(mid + 1) / (expReward(mid) * 1.2);
  // hours for the region: route quotas at on-level kill times + levelling from first to top route level
  let seconds = 0;
  for (const r of region.routes) seconds += r.killsToClear * (wildHp(r.level) / regionParty(region, r.level, stars));
  for (let L = region.routes[0].level; L < top; L++) seconds += (expToLevel(L + 1) / (expReward(L) * 1.2)) * (wildHp(L) / regionParty(region, L, stars));
  seconds += alphaTimes.reduce((a, b) => a + b, 0) + towerS;
  cumulativeHours += seconds / 3600;

  console.log(
    pad(region.name, 24), pad(top, 4), pad(dps.toFixed(0), 7), pad(fmt(wildS), 7),
    pad(alphaTimes.map(fmt).join('/'), 12), pad(`${fmt(towerS)} (${towerPct}%)`, 14), pad(`${fmt(realmS)} (${realmPct}%)`, 12),
    pad(killsPerLevel.toFixed(0), 9), pad(`${(seconds / 3600).toFixed(1)} (Σ${cumulativeHours.toFixed(1)})`, 9),
  );
});

console.log('\nraids (party from the region where the raid unlocks, +1 star):');
for (const raid of RAIDS) {
  const regionIdx = raid.id === 'libero' ? 6 : raid.id === 'xenolord' ? 5 : 3;
  const region = REGIONS[regionIdx];
  const stars = Math.min(4, [0, 0, 1, 1, 2, 2, 3][regionIdx] + 1);
  const dps = regionParty(region, region.routes[region.routes.length - 1].level, stars) * 1.5; // Dragon vs Dark / element pick
  const s = raid.hp / dps;
  console.log(' ', pad(raid.name, 18), pad(fmt(s), 8), `(${Math.round((s / raid.timeLimitSec) * 100)}% of limit)`);
}

console.log('\nearly game (click only, no Pals):');
const click = 5 * 1 * 1.03;
console.log(`  first Lamball: ${wildHp(1).toFixed(0)} HP → ${Math.ceil(wildHp(1) / click)} clicks; gold/kill ${goldReward(1)}, sphere 40g`);
console.log(`\nroster: ${PALS.length} Pals, max baseAttack ${Math.max(...PALS.map((p) => p.baseAttack))}`);
