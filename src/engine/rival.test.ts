import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { rivalById, RIVALS } from '../data/rivals';
import { DUEL_COOLDOWN_SEC, DUEL_HP_MULT, DUEL_ROUND_SEC, DUEL_TEAM, duelOpponent, loseDuel, rivalInfo, rollTeam, winDuel } from './rival';
import { wildHp } from './formulas';
import { REGIONS } from '../data/regions';

describe('rival duels', () => {
  it('one rival per region, unlocked by a route, with a three-Pal team at the region level', () => {
    expect(RIVALS.map((r) => r.regionId)).toEqual(REGIONS.map((r) => r.id));
    const s = newState();
    const scout = rivalById('scout');
    let info = rivalInfo(s, scout);
    expect(info).toMatchObject({ tier: 0, wins: 0, ready: true, open: false, level: 13, gold: 800 });
    s.progress.routeKills.plateau = 10; s.progress.routeKills.behemoth = 20;
    expect(rivalInfo(s, scout).open).toBe(true);
    const team = rollTeam(s, scout, () => 0);
    expect(team.length).toBe(DUEL_TEAM);
    expect(new Set(team.map((t) => t.palId)).size).toBe(DUEL_TEAM);
    expect(team.every((t) => t.level === 13)).toBe(true);
    const w = duelOpponent(s, { rivalId: 'scout', team, index: 0 }, 1000);
    expect(w).toMatchObject({ kind: 'duel', refId: 'scout', level: 13, deadlineAt: 1000 + DUEL_ROUND_SEC * 1000 });
    expect(w.maxHp).toBe(Math.round(wildHp(13) * DUEL_HP_MULT));
  });

  it('winning pays gold and the prize and raises the tier; losing only starts the cooldown', () => {
    const s = newState();
    const gold = s.player.gold;
    const win = winDuel(s, 'scout');
    expect(win).toMatchObject({ gold: 800, tier: 0 });
    expect(s.player.gold - gold).toBe(800);
    expect(s.inventory.sphere_mega).toBe(3);
    expect(s.stats.duelsWon).toBe(1);
    let info = rivalInfo(s, rivalById('scout'));
    expect(info).toMatchObject({ tier: 1, wins: 1, ready: false, level: 15, gold: 1600 });
    expect(info.secondsLeft).toBe(DUEL_COOLDOWN_SEC);
    s.stats.playSeconds += DUEL_COOLDOWN_SEC;
    expect(rivalInfo(s, rivalById('scout')).ready).toBe(true);
    const w = duelOpponent(s, { rivalId: 'scout', team: [{ palId: 1, level: 15 }], index: 0 });
    expect(w.maxHp).toBe(Math.round(wildHp(15) * DUEL_HP_MULT * 1.2));
    loseDuel(s, 'scout');
    info = rivalInfo(s, rivalById('scout'));
    expect(info.tier).toBe(1);
    expect(info.ready).toBe(false);
    expect(s.stats.duelsLost).toBe(1);
  });
});
