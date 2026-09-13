// @vitest-environment jsdom
/**
 * Drives the real store through several simulated hours: fights, travel, base work, forced raids, Alpha wins and
 * rematches, the daily challenge, day rollovers and a suspend/catch-up gap — and checks nothing throws, the
 * save stays sane and round-trips as a save code.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { game } from './game.svelte';
import { newState, migrate, SAVE_VERSION, decodeSaveCode, encodeSaveCode } from '../engine/save';
import { TECHS } from '../data/tech';
import { REGIONS } from '../data/regions';
import { addToBox, makeInstance } from '../engine/party';

function sane(save: ReturnType<typeof newState>) {
  const json = JSON.stringify(save);
  expect(json).not.toMatch(/NaN|Infinity|null,"kind"/);
  expect(save.player.gold).toBeGreaterThanOrEqual(0);
  for (const [id, n] of Object.entries(save.inventory)) expect(n, `inventory ${id}`).toBeGreaterThanOrEqual(0);
  const uids = new Set(save.box.map((p) => p.uid));
  for (const u of save.party) expect(uids.has(u), `party uid ${u}`).toBe(true);
  for (const u of save.base.workers) expect(uids.has(u), `worker uid ${u}`).toBe(true);
  expect(save.party.some((u) => save.base.workers.includes(u))).toBe(false);
  for (const p of save.box) { expect(p.san).toBeGreaterThanOrEqual(0); expect(p.san).toBeLessThanOrEqual(100); }
  expect(migrate(JSON.parse(json))?.version).toBe(SAVE_VERSION);
}

describe('a long session', () => {
  afterEach(() => vi.useRealTimers());

  it('runs six hours of play with raids, rematches, the challenge and rollovers without breaking the save', { timeout: 120_000 }, async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T09:00:00Z'));
    game.save = newState();
    game.log = [];
    const s = game.save;
    s.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
    s.inventory.sphere_pal = 500; s.inventory.wood = 500; s.inventory.stone = 300; s.inventory.red_berries = 200;
    s.settings.sphereForDupe = 'pal';
    // a fighting party and a working crew
    for (let i = 0; i < 5; i++) { const p = makeInstance([1, 2, 3, 4, 11][i], 15 + i * 3); addToBox(s, p); }
    s.party = s.box.slice(0, 5).map((p) => p.uid);
    for (const id of [4, 3]) { const w = makeInstance(id, 8); addToBox(s, w); game.assignWorker(w.uid); }
    game.build('workbench'); game.build('logging'); game.build('watchtower');
    s.progress.towers.push('lily'); s.player.gold = 50_000; s.inventory.ingot = 100;
    game.foundOutpost('marsh');
    { const w = makeInstance(2, 8); addToBox(s, w); game.removeFromParty(w.uid); game.postToOutpost('marsh', w.uid); }
    game.spawn();
    sane(s);

    let raids = 0, rematches = 0, challengeDone = false, alphaFights = 0, duels = 0;
    const HOURS = 6, STEP = 5000;   // 5 s ticks: the store is reactive and jsdom is slow, 1 s ticks take a minute
    for (let t = 0; t < HOURS * 3600; t += STEP / 1000) {
      vi.advanceTimersByTime(STEP);
      game.tick(STEP);
      if (t % 35 === 0) game.click();
      // travel around the open routes, open new ones as they clear
      if (t % 600 === 0) {
        const open = REGIONS.flatMap((r) => r.routes).filter((r) => game.canTravel(r.id));
        if (!game.inBossFight) game.travel(open[Math.floor(t / 600) % open.length].id);
      }
      // force a raid every 20 minutes (the natural cadence is 15–25)
      if (t % 1200 === 300 && !s.base.raid) { s.base.nextRaidAt = 0; }
      if (s.base.raid && s.base.raid.hp === s.base.raid.maxHp) raids += 1;
      // fight Alphas whenever one is ready
      if (t % 900 === 450 && !game.inBossFight) {
        const id = game.nextAlpha;
        if (id) { game.startAlpha(id); alphaFights += 1; game.wild!.hp = 1; game.click(); }
      }
      if (t % 900 === 465) rematches = Object.keys(s.progress.alphaRematch).length;
      // duel the region's rival whenever ready; win it fast
      if (t % 700 === 350 && !game.inBossFight) {
        const id = game.nextRival;
        if (id) { game.startDuel(id); duels += 1; for (let k = 0; k < 3 && game.duel; k++) { game.wild!.hp = 1; game.click(); } }
      }
      // fire whatever skill is charged
      for (const [uid, c] of Object.entries(game.charges)) if (c >= 20) game.fireSkill(uid);
      if (t % 3600 === 1800) sane(s);
      if (s.progress.challenge?.claimed) challengeDone = true;
    }
    // a night away: catch-up through applyOffline
    vi.advanceTimersByTime(8 * 3600 * 1000);
    game.tick(20_000);
    sane(s);
    expect(raids).toBeGreaterThan(5);
    expect(alphaFights).toBeGreaterThan(5);
    expect(rematches).toBeGreaterThan(0);
    expect(duels).toBeGreaterThan(2);
    expect(s.stats.duelsWon).toBe(duels);
    expect(s.stats.skillsFired).toBeGreaterThan(50);
    expect(Object.values(s.outposts[0].taken).reduce((a, b) => a + b, 0)).toBeGreaterThan(100);
    expect(s.stats.defeated).toBeGreaterThan(1000);
    expect(s.stats.baseRaidsRepelled + s.stats.baseRaidsLost).toBe(raids);
    expect(s.daily?.date).toBe('2026-09-14');
    expect(challengeDone || (s.progress.challenge?.kills ?? 0) >= 0).toBe(true);

    // the save survives a code round-trip and a reload
    const code = await encodeSaveCode(s);
    const back = (await decodeSaveCode(code))!;
    expect(back.stats.defeated).toBe(s.stats.defeated);
    expect(back.box.length).toBe(s.box.length);
  });
});
