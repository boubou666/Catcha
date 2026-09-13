import type { PalDef, SaveState } from '../data/types';
import { palById } from '../data/pals';
import { partnerEffect, type PartnerEffect, type PartnerStat } from '../data/partner';
import { partyInstances } from './party';

/** The partner skills currently in force: the party's, plus the base workers' work-flavoured ones. */
export function activePartners(save: SaveState): PartnerEffect[] {
  const party = partyInstances(save).map((i) => partnerEffect(palById(i.palId))).filter((e): e is PartnerEffect => !!e && e.stat !== 'work');
  const workers = save.base.workers.map((uid) => save.box.find((p) => p.uid === uid)).filter((p) => !!p)
    .map((p) => partnerEffect(palById(p.palId))).filter((e): e is PartnerEffect => !!e && e.stat === 'work');
  return [...party, ...workers];
}

/** Multiplier on a non-attack stat from partner skills, e.g. 1.07 for +3% and +4% catch. */
export function partnerMult(save: SaveState, stat: Exclude<PartnerStat, 'attack'>): number {
  return 1 + activePartners(save).filter((e) => e.stat === stat).reduce((s, e) => s + e.pct, 0);
}

/** Damage multiplier for one party member: attack skills whose element it shares (its own counts). */
export function partnerAttackMult(save: SaveState, member: PalDef): number {
  return 1 + activePartners(save).filter((e) => e.stat === 'attack' && e.element && member.elements.includes(e.element)).reduce((s, e) => s + e.pct, 0);
}

/** "+7% Neutral damage · +4% catch odds" for a list of effects, merged per stat/element. */
export function summarizePartners(effects: PartnerEffect[]): string[] {
  const sums = new Map<string, number>();
  for (const e of effects) {
    const key = e.stat === 'attack' ? `attack:${e.element}` : e.stat;
    sums.set(key, (sums.get(key) ?? 0) + e.pct);
  }
  const label: Record<PartnerStat, string> = { attack: 'damage', catch: 'catch odds', gold: 'gold', exp: 'exp', work: 'base output' };
  return [...sums].map(([key, pct]) => {
    const [stat, element] = key.split(':') as [PartnerStat, string | undefined];
    return `+${Math.round(pct * 100)}% ${element ? `${element} ` : ''}${label[stat]}`;
  });
}
