// Prints a save code for a mid-game save: used for screenshots (open http://localhost:5173/#save=<code> in dev).
import { newState, encodeSaveCode } from '../src/engine/save.ts';
import { addToBox, makeInstance } from '../src/engine/party.ts';
import { assignWorker } from '../src/engine/base.ts';
import { TECHS } from '../src/data/tech.ts';

const s = newState();
s.player.level = 22; s.player.exp = 1200; s.player.gold = 18_450; s.player.effigies = 7; s.player.techPoints = 3;
s.tech = TECHS.filter((t) => t.level <= 22).map((t) => t.id);
for (const id of ['plateau', 'behemoth', 'fort', 'cove', 'bridge', 'church', 'icewind']) s.progress.routeKills[id] = 999;
s.progress.routeKills.seabreeze = 30; s.progress.route = 'seabreeze';
s.progress.alphas = ['chillet', 'penking']; s.progress.towers = ['rayne'];
s.progress.alphaRematch = { chillet: { tier: 2, readyAt: 0 }, penking: { tier: 1, readyAt: 3600 } };
s.progress.rivals = { scout: { tier: 1, wins: 1, readyAt: 0 } };
Object.assign(s.inventory, { sphere_pal: 34, sphere_mega: 6, wood: 412, stone: 260, ore: 88, paldium: 140, ingot: 23, red_berries: 96, wool: 41, leather: 17, lamball_mutton: 12, flame_organ: 9, cake: 2 });
const party = [[11, 24, 1], [55, 22, 0], [5, 21, 0], [25, 20, 0], [17, 19, 0]];
for (const [palId, level, stars] of party) { const p = makeInstance(palId, level); p.stars = stars; addToBox(s, p); }
s.party = s.box.map((p) => p.uid);
for (const [palId, level] of [[4, 12], [3, 11], [1, 14], [2, 10]]) { const w = makeInstance(palId, level); addToBox(s, w); assignWorker(s, w.uid); }
for (const [palId, level] of [[1, 5], [1, 6], [2, 7], [3, 4], [10, 9], [6, 8], [7, 8], [12, 6]]) addToBox(s, makeInstance(palId, level));
s.base.structures = { workbench: 1, logging: 2, stone_pit: 1, berry_plantation: 1, furnace: 1, ranch: 1, hot_spring: 1, watchtower: 1, palbox: 1 };
s.base.slots = 4;
s.base.raidLog = [{ at: Date.now() - 600_000, palId: 10, level: 8, outcome: 'repelled', gold: 90, stolen: 0 }];
for (const id of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 17, 25, 55, 20, 22, 24]) s.paldeck[id] = { seen: true, caught: id % 3 === 0 ? 0 : 2 };
s.stats.defeated = 2410; s.stats.caught = 61; s.stats.throws = 104; s.stats.playSeconds = 5.5 * 3600; s.stats.goldEarned = 40_000; s.stats.baseRaidsRepelled = 3; s.stats.duelsWon = 1; s.stats.chanceSum = 60; s.stats.ratedThrows = 104;
s.achievements = ['defeat_1', 'defeat_2', 'caught_1', 'caught_2', 'paldeck_1', 'tower_rayne', 'alpha_1', 'workers_1', 'structures_1', 'structures_2', 'tech_1', 'crafted_1'];
s.tutorial = { step: 15, done: true };
console.log(await encodeSaveCode(s));
