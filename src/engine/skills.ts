/**
 * Active skills. Every party Pal charges its signature attack over SKILL_CHARGE_SEC of play and fires it as a
 * burst worth SKILL_MULT seconds of its own damage, with its element's matchup. Charges are per Pal and live
 * in the store (not the save): a fresh session starts everyone at zero. Skills fire on their own; tapping a
 * charged chip fires it right away.
 */
import type { Element, PalInstance, SaveState } from '../data/types';
import { palById } from '../data/pals';
import { elementMult } from '../data/elements';
import { instanceAttack } from './formulas';
import { partnerAttackMult } from './partner';
import { techMult } from './tech';
import { prestigeMult } from './prestige';
import { structureLevel } from './base';
import type { Wild } from './combat';

export const SKILL_CHARGE_SEC = 20;
export const SKILL_MULT = 6;   // seconds of the Pal's own DPS, delivered at once

/** Palworld's basic attack per element — the name each species' skill takes here. */
export const SKILL_NAME: Record<Element, string> = {
  Neutral: 'Power Shot', Fire: 'Ignis Blast', Water: 'Aqua Gun', Grass: 'Seed Machine Gun', Electric: 'Spark Blast',
  Ice: 'Ice Missile', Ground: 'Stone Blast', Dark: 'Shadow Burst', Dragon: 'Dragon Cannon',
};
export const SKILL_ICON: Record<Element, string> = {
  Neutral: '💥', Fire: '🔥', Water: '💧', Grass: '🌿', Electric: '⚡', Ice: '❄️', Ground: '🪨', Dark: '🌑', Dragon: '🐉',
};

export const skillElement = (inst: PalInstance): Element => palById(inst.palId).elements[0];
export const skillName = (inst: PalInstance) => SKILL_NAME[skillElement(inst)];

/** Damage a Pal's skill does to the current wild right now (0 with nothing to hit). */
export function skillDamage(save: SaveState, inst: PalInstance, wild: Wild | null): number {
  if (!wild) return 0;
  const def = palById(inst.palId);
  return instanceAttack(inst) * elementMult([skillElement(inst)], palById(wild.palId).elements) * partnerAttackMult(save, def)
    * techMult(save, 'attack') * prestigeMult(save, 'attack') * SKILL_MULT * (1 + 0.15 * structureLevel(save, 'training_ground'));
}

/** Advance every party Pal's charge; returns the uids whose skill is ready to fire. */
export function chargeSkills(charges: Record<string, number>, party: PalInstance[], dtSec: number): string[] {
  const ready: string[] = [];
  const alive = new Set(party.map((p) => p.uid));
  for (const uid of Object.keys(charges)) if (!alive.has(uid)) delete charges[uid];
  for (const p of party) {
    charges[p.uid] = Math.min(SKILL_CHARGE_SEC, (charges[p.uid] ?? 0) + dtSec);
    if (charges[p.uid] >= SKILL_CHARGE_SEC) ready.push(p.uid);
  }
  return ready;
}
