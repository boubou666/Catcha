import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { activeMods, CHALLENGE_GOAL, CHALLENGE_REWARD, claimChallenge, countChallengeKill, MODS, todaysChallenge } from './challenge';
import { applyDefeat } from './combat';

const DAY = Date.UTC(2026, 8, 14, 12);

describe('daily challenge', () => {
  it('needs a second route, is the same for a day, and changes with the day', () => {
    const s = newState();
    expect(todaysChallenge(s, DAY)).toBeNull();
    s.progress.routeKills.plateau = 10;
    const c = todaysChallenge(s, DAY)!;
    expect(['plateau', 'behemoth']).toContain(c.route.id);
    expect(Object.keys(MODS)).toContain(c.mod);
    expect(todaysChallenge(s, DAY + 3600_000)!.route.id).toBe(c.route.id);
    const later = Array.from({ length: 10 }, (_, i) => todaysChallenge(s, DAY + (i + 1) * 86400_000)!);
    expect(new Set(later.map((x) => `${x.route.id}:${x.mod}`)).size).toBeGreaterThan(1);
  });

  it('counts defeats only on the challenge route, pays once, and applies its modifiers', () => {
    const s = newState();
    s.progress.routeKills.plateau = 10;
    const c = todaysChallenge(s, DAY)!;
    s.progress.route = c.route.id === 'plateau' ? 'behemoth' : 'plateau';
    expect(activeMods(s, DAY)).toBeNull();
    expect(countChallengeKill(s, DAY)).toBe(false);
    s.progress.route = c.route.id;
    expect(activeMods(s, DAY)).toEqual(MODS[c.mod]);
    for (let i = 1; i < CHALLENGE_GOAL; i++) expect(countChallengeKill(s, DAY)).toBe(false);
    expect(countChallengeKill(s, DAY)).toBe(true);
    const gold = s.player.gold, eff = s.player.effigies;
    expect(claimChallenge(s, DAY)).toBe(true);
    expect(s.player.gold - gold).toBe(CHALLENGE_REWARD.gold);
    expect(s.player.effigies - eff).toBe(CHALLENGE_REWARD.effigies);
    expect(claimChallenge(s, DAY)).toBe(false);
    expect(todaysChallenge(s, DAY + 86400_000)!.kills).toBe(0);   // tomorrow starts over

    // the modifiers reach combat (today's real challenge, since applyDefeat reads the clock): a gold-rush defeat pays double
    const today = todaysChallenge(s)!;
    const wild = { palId: 1, level: 1, hp: 0, maxHp: 35, lucky: false, kind: 'wild' as const };
    s.progress.route = today.route.id;
    const on = applyDefeat({ ...s, progress: { ...s.progress } }, wild, () => 0.99).gold;
    s.progress.route = today.route.id === 'plateau' ? 'behemoth' : 'plateau';
    const off = applyDefeat({ ...s, progress: { ...s.progress } }, wild, () => 0.99).gold;
    if (today.mod === 'gold') expect(on).toBe(off * 2); else expect(on).toBe(off);
  });
});
