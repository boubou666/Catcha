import type { PalDef, SaveState } from '../data/types';
import { palById } from '../data/pals';
import { partnerEffect, SPECIAL_VALUE, type PartnerEffect, type PartnerSpecial, type PartnerStat } from '../data/partner';
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
  const lines = [...sums].map(([key, pct]) => {
    const [stat, element] = key.split(':') as [PartnerStat, string | undefined];
    return `+${Math.round(pct * 100)}% ${element ? `${element} ` : ''}${label[stat]}`;
  });
  const specials = new Map<PartnerSpecial, number>();
  for (const e of effects) if (e.special) specials.set(e.special, (specials.get(e.special) ?? 0) + 1);
  const specialText: Record<PartnerSpecial, (n: number) => string> = {
    scavenge: (n) => `${Math.round(Math.min(0.9, n * SPECIAL_VALUE.scavenge) * 100)}% extra drops`,
    ranch: (n) => `${n} ranch skill${n === 1 ? '' : 's'}`,
    reveal: () => 'unseen species named',
    refund: (n) => `${Math.round(Math.min(0.9, n * SPECIAL_VALUE.refund) * 100)}% sphere refunds`,
    clock: (n) => `+${Math.round(n * SPECIAL_VALUE.clock * 100)}% boss time`,
  };
  for (const [sp, n] of specials) lines.push(specialText[sp](n));
  return lines;
}

/** How many active skills carry a given special (party skills; ranch counts the workers). */
export function specialCount(save: SaveState, special: PartnerSpecial): number {
  return activePartners(save).filter((e) => e.special === special).length;
}
/** Chance of an extra drop per defeat, from scavenger skills in the party. */
export const scavengeChance = (save: SaveState) => Math.min(0.9, specialCount(save, 'scavenge') * SPECIAL_VALUE.scavenge);
/** Chance a failed throw gives the sphere back. */
export const refundChance = (save: SaveState) => Math.min(0.9, specialCount(save, 'refund') * SPECIAL_VALUE.refund);
/** Multiplier on Alpha and tower time limits. */
export const clockMult = (save: SaveState) => 1 + specialCount(save, 'clock') * SPECIAL_VALUE.clock;
/** Whether unseen species should show their names. */
export const revealsUnseen = (save: SaveState) => specialCount(save, 'reveal') > 0;
/** A worker's own ranch output multiplier. */
export const ranchMult = (def: PalDef) => (partnerEffect(def)?.special === 'ranch' ? SPECIAL_VALUE.ranch : 1);
