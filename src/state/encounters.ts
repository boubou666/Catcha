/** Starting and leaving fights that are not the route's wild Pal: Alphas, towers, raids and Sealed Realm runs. */
import { ALPHA_TIME_LIMIT_SEC, alphaById, towerById } from '../data/regions';
import { palById } from '../data/pals';
import { dungeonById } from '../data/dungeons';
import { raidById } from '../data/raids';
import { spawnBoss } from '../engine/combat';
import { wildHp } from '../engine/formulas';
import { catchPreview } from '../engine/catch';
import { clockMult } from '../engine/partner';
import { isUnlocked } from '../engine/progress';
import { rematchInfo } from '../engine/rematch';
import { bossName, dungeonUnlocked, spawnFor, startRun } from '../engine/dungeon';
import { summon, summonBlocker } from '../engine/raid';
import type { GameCore } from './core';

export function startAlpha(g: GameCore, id: string) {
  const a = alphaById(id);
  if (!isUnlocked(g.save, a.unlock)) return;
  const rm = rematchInfo(g.save, a);
  if (!rm.ready) return;   // still on cooldown
  g.wild = spawnBoss(a.palId, rm.level, rm.hp, 'alpha', id, Date.now() + ALPHA_TIME_LIMIT_SEC * 1000 * clockMult(g.save));
  const pv = catchPreview(g.save, a.palId, false, true);
  const extra = pv.throws ? { chance: pv.chance } : {};
  if (rm.tier > 0) g.pushT('Alpha {pal} is back for rematch {tier} — Lv {level}, {minutes} minutes on the clock.', { pal: palById(a.palId).name, tier: rm.tier, level: rm.level, minutes: Math.round(ALPHA_TIME_LIMIT_SEC * clockMult(g.save) / 60) }, extra);
  else g.pushT('Alpha {pal} appears — {minutes} minutes on the clock.', { pal: palById(a.palId).name, minutes: Math.round(ALPHA_TIME_LIMIT_SEC * clockMult(g.save) / 60) }, extra);
}

export function startTower(g: GameCore, id: string) {
  const t = towerById(id);
  if (!isUnlocked(g.save, t.unlock)) return;
  g.wild = spawnBoss(t.palId, t.level, t.hp, 'tower', id, Date.now() + t.timeLimitSec * 1000 * clockMult(g.save));
  g.pushT('{boss} — {minutes} minutes on the clock.', { boss: t.boss, minutes: Math.round(t.timeLimitSec * clockMult(g.save) / 60) });
}

export function flee(g: GameCore) {
  if (g.run) { endRun(g, 'Retreated'); return; }
  if (g.wild?.kind === 'raid') { g.pushT('Retreated from {pal} — the slab is spent.', { pal: palById(g.wild.palId).name }); g.spawn(); return; }
  g.pushT('Retreated.');
  g.spawn();
}

export function canSummon(g: GameCore, raidId: string): boolean { return !g.run && !g.inBossFight && summonBlocker(g.save, raidId) === null; }

export function summonRaid(g: GameCore, raidId: string) {
  if (!canSummon(g, raidId)) return;
  const boss = summon(g.save, raidId);
  if (!boss) return;
  g.wild = boss;
  const def = raidById(raidId);
  g.pushT('{raid} answers the altar — {hp}k HP, {minutes} minutes.', { raid: def.name, hp: (def.hp / 1000).toLocaleString(), minutes: def.timeLimitSec / 60 });
  g.emit('summon');
}

export function canEnter(g: GameCore, dungeonId: string): boolean { return !g.run && !g.inBossFight && dungeonUnlocked(g.save, dungeonId); }

export function enterDungeon(g: GameCore, dungeonId: string) {
  if (!canEnter(g, dungeonId)) return;
  g.run = startRun(dungeonId);
  g.wild = spawnFor(g.run);
  const def = dungeonById(dungeonId);
  g.pushT('Entered {realm} — {waves} waves and {guardian} in {minutes} minutes.', { realm: def.name, waves: def.waves, guardian: bossName(dungeonId), minutes: def.timeLimitSec / 60 });
}

export function endRun(g: GameCore, why: string) {
  const run = g.run!;
  const earned = run.gold > 0 || Object.keys(run.items).length > 0;
  g.push(`${why} — left ${dungeonById(run.id).name}${earned ? ` with ${run.gold} gold and ${Object.values(run.items).reduce((a, b) => a + b, 0)} items` : ''}.`);
  g.run = null;
  g.spawn();
}
