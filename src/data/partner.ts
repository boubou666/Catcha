import type { Element, PalDef, Rarity } from './types';

/**
 * Partner skills. Every species has one (its Palworld name); here they give a small bonus while the Pal is in
 * the party — or, for the work-flavoured ones, while it works at the base. The stat is read off the name for the
 * skills that are obviously about something (mounts speed you up → exp; diggers and anglers → gold; helpers and
 * harvest blessings → base work; senses, webs and glares → catch); everything else is a fighting skill and adds
 * damage for party members sharing the Pal's first element. The size scales with rarity.
 */
export type PartnerStat = 'attack' | 'catch' | 'gold' | 'exp' | 'work';

export interface PartnerEffect {
  name: string;
  stat: PartnerStat;
  pct: number;          // e.g. 0.04 for +4%
  element?: Element;    // attack only: which party members it boosts
}

export const PARTNER_PCT: Record<Rarity, number> = { common: 0.03, uncommon: 0.04, rare: 0.06, epic: 0.08, legendary: 0.12 };

export const PARTNER_STAT_LABEL: Record<PartnerStat, string> = {
  attack: 'damage', catch: 'catch odds', gold: 'gold from defeats', exp: 'exp from defeats', work: 'base output',
};

const named = (stat: PartnerStat, ...names: string[]) => names.map((n) => [n, stat] as const);
const OVERRIDES = new Map<string, PartnerStat>([
  ...named('catch', 'Sixth Sense', 'Ultrasonic Sensor', 'Tarantriss’ Web', 'Sticky Princess', 'Hawk Eye', 'Master of Unlocking',
    'Grounded Archer', 'Cheery Rifle', 'Phantom Venom', 'Eerie Nightstreaker', 'Unknown Intruder', 'Nightmare Stare', 'Princess Gaze',
    'Overaffectionate', 'Icy Whispers', 'Mysterious Scales', 'Glaring Cat'),
  ...named('gold', 'Gold Digger', 'Grave Robber', 'Soul Collector', 'Dig Here!', 'Dig, Dog! Dig!', 'Master Night Angler', 'Brave Sailor',
    'Fried Squid', 'Happy-Go-Lucky Bunny', 'Candy Pop', 'Heart Drain', 'Life Steal', 'Egg Layer', 'Milk Maker', 'Fluffy Wool',
    'Pacapaca Wool', 'Silk Maker', 'Berry Picker', 'Dark Knowledge'),
  ...named('exp', 'Direhowl Rider', 'Black Steed', 'Ice Steed', 'Red Hare', 'Black Hare', 'Grassland Speedster', 'Sand Sprint', 'Sand Swimmer',
    'Swift Swimmer', 'Swift Deity', 'Galeclaw Glider', 'Zephyr Glider', 'Travel Companion', 'Flying Trapeze', 'Winter Trapeze', 'Antigravity',
    'Plasma Dash', 'Wind and Clouds', 'Chilled Whale Cruiser', 'Cozy Whale Cruiser', 'Aurora Guide', 'Dream Chaser', 'Jumping Force',
    'Leap Stance', 'Homeward Prayer', 'Wings of Flame', 'Wings of Thunder', 'Wings of Water', 'Wings of Death', 'Meteor Wings', 'Flame Wing',
    'Icewing Dance', 'Waterwing Dance', 'Surfing Slam', 'Birds of a Feather', 'Amicable Holy Dragon', 'Amicable Water Dragon',
    'Grass Dragon Affection', 'Sky Dragon Affection', 'Fragrant Dragon'),
  ...named('work', 'Worker Bee', 'Queen Bee Command', 'Cat Helper', 'Helper Bunny', 'Logging Assistance', 'Mining Assistance',
    'Ore-Loving Beast', 'Ice-Loving Beast', 'Soil Improver', 'Harvest Goddess', 'Prayer for Abundant Harvest', 'Floral Boost',
    'Blessing of the Flower Spirit', 'Caffeine Inoculation', 'Warm Body', 'Cool Body', 'Huggy Fire', 'Flame Lantern', 'Ember Chamber',
    'Soothing Shower', 'Blessing of Purification', 'Purification of Gaia', 'Rampant Spores', 'Echo Chamber', 'Kuudere', 'Fluffy',
    'King of Fluff', 'Lifmunk Recoil', 'Static Electricity', 'Tiny Spark', 'Modified DNA'),
]);

export function partnerEffect(def: PalDef): PartnerEffect | null {
  if (!def.partnerSkill) return null;
  const stat = OVERRIDES.get(def.partnerSkill) ?? 'attack';
  return { name: def.partnerSkill, stat, pct: PARTNER_PCT[def.rarity], element: stat === 'attack' ? def.elements[0] : undefined };
}

/** "Wriggling Weasel — +4% damage for Ice party members" */
export function describePartner(def: PalDef): string {
  const e = partnerEffect(def);
  if (!e) return '';
  const pct = `+${Math.round(e.pct * 100)}%`;
  if (e.stat === 'attack') return `${e.name} — ${pct} damage for ${e.element} party members`;
  if (e.stat === 'work') return `${e.name} — ${pct} base output while working`;
  return `${e.name} — ${pct} ${PARTNER_STAT_LABEL[e.stat]} while in the party`;
}
