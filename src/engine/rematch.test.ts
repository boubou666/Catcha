import { describe, expect, it } from 'vitest';
import { newState } from './save';
import { alphaById } from '../data/regions';
import { fmtCooldown, recordAlphaWin, rematchInfo, REMATCH_COOLDOWN_SEC } from './rematch';
import { wildHp } from './formulas';

describe('Alpha rematches', () => {
  it('scale each win and go on a play-time cooldown', () => {
    const s = newState();
    const chillet = alphaById('chillet');
    let r = rematchInfo(s, chillet);
    expect(r).toMatchObject({ beaten: false, tier: 0, ready: true, level: 11, gold: 500 });
    expect(r.hp).toBe(Math.round(wildHp(11) * chillet.hpMult));

    expect(recordAlphaWin(s, 'chillet')).toEqual({ first: true, tier: 0 });
    expect(s.progress.alphas).toContain('chillet');
    r = rematchInfo(s, chillet);
    expect(r).toMatchObject({ beaten: true, tier: 1, ready: false, level: 13, gold: 1000 });
    expect(r.secondsLeft).toBe(REMATCH_COOLDOWN_SEC);
    expect(r.hp).toBe(Math.round(wildHp(13) * chillet.hpMult * 1.5));

    s.stats.playSeconds += REMATCH_COOLDOWN_SEC;
    expect(rematchInfo(s, chillet).ready).toBe(true);
    expect(recordAlphaWin(s, 'chillet')).toEqual({ first: false, tier: 1 });   // the tier that was just fought
    expect(rematchInfo(s, chillet)).toMatchObject({ tier: 2, level: 15, gold: 1500, ready: false });
    expect(fmtCooldown(REMATCH_COOLDOWN_SEC)).toBe('1h 0m');
    expect(fmtCooldown(150)).toBe('3m');
  });
});
