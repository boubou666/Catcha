/** What happens when the Pal in the arena drops to 0 HP: rewards, the throw, boss and realm bookkeeping, the next spawn. */
import type { Wild } from '../engine/combat';
import { applyDefeat } from '../engine/combat';
import { palById } from '../data/pals';
import { SPHERES } from '../data/spheres';
import { alphaById, towerById } from '../data/regions';
import { dungeonById } from '../data/dungeons';
import { itemName } from '../data/items';
import { raidById } from '../data/raids';
import { catchPreview, tryCatch } from '../engine/catch';
import { bossName, completeRun, describeChest, isBossWave, spawnFor } from '../engine/dungeon';
import { completeRaid, describeRaidChest } from '../engine/raid';
import { earnGold } from '../engine/inventory';
import { recordAlphaWin, rematchInfo } from '../engine/rematch';
import { activeMods, countChallengeKill, claimChallenge, CHALLENGE_REWARD } from '../engine/challenge';
import { LUCKY_CHANCE } from '../engine/formulas';
import type { GameCore } from './core';

export function resolveDefeat(g: GameCore, w: Wild, byClick = false) {
  const def = palById(w.palId);
  const save = g.save;
  const levelBefore = save.player.level;
  const reward = applyDefeat(save, w);
  if (byClick) g.emit('defeat');   // idle kills stay silent — otherwise it's a thud every few seconds forever
  if (save.player.level > levelBefore) { g.emit('levelUp'); g.notifyT('Level {level}!', { level: save.player.level }, 'success'); }

  if (w.kind === 'alpha') {
    // Alphas can be caught, at a reduced rate; the throw uses the same sphere policy
    const res = tryCatch(save, w);
    if (res.outcome === 'caught') { g.pushT('Caught Alpha {pal} Lv {level} with a {sphere}!', { pal: def.name, level: w.level, sphere: SPHERES[res.tier].name }, { chance: res.chance, landed: true }); g.emit('caught'); g.notifyT('⚔ Caught Alpha {pal}!', { pal: def.name }, 'gold', 6000); }
    else if (res.outcome === 'failed') { g.pushT(res.refunded ? 'Alpha {pal} broke free — the sphere came back.' : 'Alpha {pal} broke free.', { pal: def.name }, { chance: res.chance, landed: false }); g.emit('catchFailed'); }
    else g.pushT('No sphere thrown at Alpha {pal} — see Settings → Catching.', { pal: def.name });
  }
  if (w.kind === 'wild' || w.kind === 'dungeon' || w.kind === 'dungeonBoss') {
    if (w.kind === 'wild') {
      save.progress.routeKills[g.route.id] = (save.progress.routeKills[g.route.id] ?? 0) + 1;
      if (countChallengeKill(save) && claimChallenge(save)) {
        g.pushT('Daily challenge complete! +{gold} gold, +{effigies} Effigy.', { gold: CHALLENGE_REWARD.gold.toLocaleString(), effigies: CHALLENGE_REWARD.effigies });
        g.emit('questClaimed');
        g.notifyT('⭐ Daily challenge complete! +{gold} gold, +1 Effigy', { gold: CHALLENGE_REWARD.gold.toLocaleString() }, 'gold', 6000);
      }
    }
    const loot = w.kind === 'wild' && activeMods(save)?.noCatch;   // loot day: no throw
    const res = loot ? { outcome: 'skipped' as const } : tryCatch(save, w);
    const label = `${w.lucky ? '✨ Lucky ' : ''}${def.name} Lv ${w.level}`;
    if (res.outcome === 'caught') { g.pushT('Caught {label} with a {sphere}!', { label, sphere: SPHERES[res.tier].name }, { chance: res.chance, landed: true }); g.emit('caught'); g.notifyT('Caught {label}', { label }, w.lucky ? 'gold' : 'success', w.lucky ? 6000 : 2500); }
    else if (res.outcome === 'failed') { g.pushT(res.refunded ? '{label} broke free — the sphere came back.' : '{label} broke free.', { label }, { chance: res.chance, landed: false }); g.emit('catchFailed'); }
    else if (w.lucky) g.pushT('A Lucky {pal} got away — no sphere thrown.', { pal: def.name });
    if (g.run && w.kind !== 'wild') {
      g.run.gold += reward.gold;
      for (const [id, n] of Object.entries(reward.drops)) g.run.items[id] = (g.run.items[id] ?? 0) + n;
      if (w.kind === 'dungeonBoss') {
        const chest = completeRun(save, dungeonById(g.run.id));
        g.emit('realmClear');
        g.notifyT('🗝 {realm} cleared!', { realm: dungeonById(g.run.id).name }, 'gold', 5000);
        g.pushT('{realm} cleared! Chest: {chest}.', { realm: dungeonById(g.run.id).name, chest: describeChest(chest, itemName) });
        g.run = null;
        g.spawn();
      } else {
        g.run.wave += 1;
        g.wild = spawnFor(g.run);
        if (isBossWave(g.run)) { const pv = catchPreview(g.save, g.wild.palId); g.pushT("The realm's guardian {pal} appears!", { pal: bossName(g.run.id) }, pv.throws ? { chance: pv.chance } : {}); }
        else g.pushT('Wave {n} / {total}', { n: g.run.wave + 1, total: dungeonById(g.run.id).waves });
      }
      return;
    }
  } else if (w.kind === 'alpha' && w.refId) {
    const alpha = alphaById(w.refId);
    const purse = rematchInfo(save, alpha).gold;   // scaled by the tier that was just fought
    const win = recordAlphaWin(save, w.refId);
    if (win.first) {
      earnGold(save, alpha.reward.gold);
      save.player.effigies += alpha.reward.effigies ?? 0;
      g.pushT('Alpha {pal} defeated! +{gold} gold, +{effigies} effigies.', { pal: def.name, gold: alpha.reward.gold, effigies: alpha.reward.effigies ?? 0 });
      g.emit('bossWin');
      g.notifyT('Alpha {pal} defeated! +{gold} gold', { pal: def.name, gold: alpha.reward.gold.toLocaleString() }, 'gold', 5000);
    } else {
      earnGold(save, purse);
      g.pushT('Rematch {tier} won — Alpha {pal} pays {gold} gold and will be back stronger in an hour of play.', { tier: win.tier, pal: def.name, gold: purse.toLocaleString() });
      g.emit('bossWin');
      g.notifyT('Rematch won — Alpha {pal} +{gold} gold', { pal: def.name, gold: purse.toLocaleString() }, 'gold', 4000);
    }
  } else if (w.kind === 'tower' && w.refId) {
    const tower = towerById(w.refId);
    if (!save.progress.towers.includes(w.refId)) save.progress.towers.push(w.refId);
    g.pushT('{boss} defeated — {tower} cleared!', { boss: tower.boss, tower: tower.name });
    g.emit('towerWin');
    g.notifyT('🏰 {tower} cleared!', { tower: tower.name }, 'gold', 6000);
  } else if (w.kind === 'raid' && w.refId) {
    const raid = raidById(w.refId);
    const chest = completeRaid(save, raid);
    g.pushT('{raid} defeated! {chest}.', { raid: raid.name, chest: describeRaidChest(chest, raid.name, itemName) });
    g.emit('towerWin');
    g.notifyT('🔮 {raid} defeated — egg in the incubator', { raid: raid.name }, 'gold', 6000);
  }
  g.spawn();
}
