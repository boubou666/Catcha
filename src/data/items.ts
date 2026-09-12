import type { ItemDef } from './types';

const M = (id: string, name: string): ItemDef => ({ id, name, category: 'material' });
const F = (id: string, name: string): ItemDef => ({ id, name, category: 'food' });

export const ITEMS: ItemDef[] = [
  // spheres
  { id: 'sphere_pal', name: 'Pal Sphere', category: 'sphere' },
  { id: 'sphere_mega', name: 'Mega Sphere', category: 'sphere' },
  { id: 'sphere_giga', name: 'Giga Sphere', category: 'sphere' },
  { id: 'sphere_hyper', name: 'Hyper Sphere', category: 'sphere' },
  { id: 'sphere_ultra', name: 'Ultra Sphere', category: 'sphere' },
  { id: 'sphere_legendary', name: 'Legendary Sphere', category: 'sphere' },
  // base materials
  M('wood', 'Wood'),
  M('stone', 'Stone'),
  M('ore', 'Ore'),
  M('ingot', 'Ingot'),
  M('paldium', 'Paldium Fragment'),
  M('fiber', 'Fiber'),
  M('wool', 'Wool'),
  M('leather', 'Leather'),
  M('bone', 'Bone'),
  M('pal_fluids', 'Pal Fluids'),
  M('flame_organ', 'Flame Organ'),
  M('electric_organ', 'Electric Organ'),
  M('ice_organ', 'Ice Organ'),
  M('venom_gland', 'Venom Gland'),
  M('high_quality_pal_oil', 'High Quality Pal Oil'),
  M('small_pal_soul', 'Small Pal Soul'),
  M('penking_plume', 'Penking Plume'),
  M('ruby', 'Ruby'),
  M('gold_coin', 'Gold Coin'),
  M('low_grade_medical', 'Low Grade Medical Supplies'),
  M('horn', 'Horn'),
  M('beautiful_flower', 'Beautiful Flower'),
  M('suspicious_juice', 'Suspicious Juice'),
  // food
  F('red_berries', 'Red Berries'),
  F('cake', 'Cake'),
  F('berry_seeds', 'Berry Seeds'),
  F('egg', 'Egg'),
  F('milk', 'Milk'),
  F('mushroom', 'Mushroom'),
  F('lamball_mutton', 'Lamball Mutton'),
  F('chikipi_poultry', 'Chikipi Poultry'),
  F('rushoar_pork', 'Rushoar Pork'),
  F('mozzarina_meat', 'Mozzarina Meat'),
  F('honey', 'Honey'),
  F('cotton_candy', 'Cotton Candy'),
  F('caprity_meat', 'Caprity Meat'),
  F('broncherry_meat', 'Broncherry Meat'),
  F('tomato_seeds', 'Tomato Seeds'),
  F('wheat_seeds', 'Wheat Seeds'),
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): ItemDef {
  const it = BY_ID.get(id);
  if (!it) throw new Error(`Unknown item ${id}`);
  return it;
}

export function itemName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}
