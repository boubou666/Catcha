import type { Requirement } from './types';
import { SPHERES } from './spheres';
import { SPHERE_TIERS } from './types';

export interface StockDef {
  itemId: string;
  price: number;               // gold each
  unlock: Requirement;
}

/** What the merchant sells. Spheres come from `SPHERES` (null price = craft only); materials open up later. */
const MATERIALS: Requirement = { kind: 'routeCleared', id: 'fort' };
const LATE: Requirement = { kind: 'tower', id: 'rayne' };

export const STOCK: StockDef[] = [
  ...SPHERE_TIERS.flatMap((t) => (SPHERES[t].price === null ? [] : [{ itemId: SPHERES[t].itemId, price: SPHERES[t].price!, unlock: SPHERES[t].unlock }])),
  { itemId: 'red_berries', price: 5,  unlock: { kind: 'none' } },
  { itemId: 'wood',        price: 8,  unlock: MATERIALS },
  { itemId: 'stone',       price: 8,  unlock: MATERIALS },
  { itemId: 'ore',         price: 20, unlock: MATERIALS },
  { itemId: 'paldium',     price: 30, unlock: MATERIALS },
  { itemId: 'ingot',       price: 60, unlock: LATE },
  { itemId: 'low_grade_medical', price: 80, unlock: LATE },
  { itemId: 'cake',        price: 400, unlock: LATE },
  { itemId: 'high_quality_pal_oil', price: 250, unlock: { kind: 'tower', id: 'lily' } },
];

/** The merchant buys back at this share of the buy price. */
export const SELL_SHARE = 0.25;

/** Sell prices for things the merchant doesn't stock. Anything absent here (and not in STOCK) can't be sold. */
export const SELL_PRICES: Record<string, number> = {
  wool: 6, leather: 8, bone: 5, fiber: 3, pal_fluids: 6, flame_organ: 10, electric_organ: 10, ice_organ: 10, venom_gland: 10,
  small_pal_soul: 40, medium_pal_soul: 120, large_pal_soul: 400, penking_plume: 30, ruby: 150, sapphire: 150, diamond: 400,
  gold_coin: 20, horn: 12, beautiful_flower: 15, suspicious_juice: 20, strange_juice: 40, high_quality_cloth: 40, cloth: 12,
  crude_oil: 15, coal: 8, pure_quartz: 60, dark_fragment: 30, carbon_fiber: 25, pal_metal_ingot: 120, soralite: 90,
  thermal_core: 150, dog_coin: 25, meteorite_fragment: 200, precious_claw: 80, chromite: 100, hexolite_quartz: 200,
  coralum_ore: 60, gloopie_tentacle: 20, ancient_civilization_core: 500, gunpowder: 15, arrow: 2,
  egg: 6, milk: 6, mushroom: 4, honey: 10, cotton_candy: 8, lamball_mutton: 5, chikipi_poultry: 5, rushoar_pork: 6,
  mozzarina_meat: 8, caprity_meat: 6, broncherry_meat: 10, eikthyrdeer_venison: 8, reindrix_venison: 10, mammorest_meat: 15,
  galeclaw_poultry: 6, raw_kelpsea: 4, raw_dumud: 6, berry_seeds: 3, tomato_seeds: 3, wheat_seeds: 3, potato_seeds: 3,
  lettuce_seeds: 3, carrot_seeds: 3, onion_seeds: 3, gumoss_leaf: 8, swee_hair: 8, dazzi_cloud: 12, katress_hair: 12,
  ribbuny_ribbon: 8, tocotoco_feather: 5, killamari_tentacle: 8, leezpunk_crest: 10, elizabee_s_staff: 80,
  high_grade_technical_manual: 100, innovative_technical_manual: 150, memory_wiping_medicine: 200, copper_key: 30, silver_key: 60,
};
