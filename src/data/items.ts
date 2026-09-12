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
  M('low_grade_medical', 'Low Grade Medical Supplies'),   // also the SAN treatment consumable
  M('horn', 'Horn'),
  M('beautiful_flower', 'Beautiful Flower'),
  M('suspicious_juice', 'Suspicious Juice'),
  M('high_quality_cloth', 'High Quality Cloth'),
  M('diamond', 'Diamond'),
  M('slab_fragment', 'Slab Fragment'),
  M('slab_bellanoir', 'Bellanoir Slab'),
  M('slab_xenolord', 'Xenolord Slab'),
  M('slab_libero', 'Bellanoir Libero Slab'),
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
  // ---- generated drop items (scripts/fetch-pal-data.mjs) ----
  { id: 'gumoss_leaf', name: 'Gumoss Leaf', category: 'material' },
  { id: 'high_grade_technical_manual', name: 'High Grade Technical Manual', category: 'material' },
  { id: 'killamari_tentacle', name: 'Killamari Tentacle', category: 'material' },
  { id: 'gunpowder', name: 'Gunpowder', category: 'material' },
  { id: 'tocotoco_feather', name: 'Tocotoco Feather', category: 'material' },
  { id: 'potato_seeds', name: 'Potato Seeds', category: 'food' },
  { id: 'lettuce_seeds', name: 'Lettuce Seeds', category: 'food' },
  { id: 'carrot_seeds', name: 'Carrot Seeds', category: 'food' },
  { id: 'onion_seeds', name: 'Onion Seeds', category: 'food' },
  { id: 'elizabee_s_staff', name: 'Elizabee\'s Staff', category: 'material' },
  { id: 'swee_hair', name: 'Swee Hair', category: 'material' },
  { id: 'dazzi_cloud', name: 'Dazzi Cloud', category: 'material' },
  { id: 'crude_oil', name: 'Crude Oil', category: 'material' },
  { id: 'strange_juice', name: 'Strange Juice', category: 'material' },
  { id: 'memory_wiping_medicine', name: 'Memory Wiping Medicine', category: 'material' },
  { id: 'raw_kelpsea', name: 'Raw Kelpsea', category: 'food' },
  { id: 'innovative_technical_manual', name: 'Innovative Technical Manual', category: 'material' },
  { id: 'eikthyrdeer_venison', name: 'Eikthyrdeer Venison', category: 'food' },
  { id: 'ribbuny_ribbon', name: 'Ribbuny Ribbon', category: 'material' },
  { id: 'raw_dumud', name: 'Raw Dumud', category: 'food' },
  { id: 'copper_key', name: 'Copper Key', category: 'material' },
  { id: 'silver_key', name: 'Silver Key', category: 'material' },
  { id: 'leezpunk_crest', name: 'Leezpunk Crest', category: 'material' },
  { id: 'galeclaw_poultry', name: 'Galeclaw Poultry', category: 'food' },
  { id: 'arrow', name: 'Arrow', category: 'material' },
  { id: 'katress_hair', name: 'Katress Hair', category: 'material' },
  { id: 'mammorest_meat', name: 'Mammorest Meat', category: 'food' },
  { id: 'cloth', name: 'Cloth', category: 'material' },
  { id: 'large_pal_soul', name: 'Large Pal Soul', category: 'material' },
  { id: 'coal', name: 'Coal', category: 'material' },
  { id: 'medium_pal_soul', name: 'Medium Pal Soul', category: 'material' },
  { id: 'pal_metal_ingot', name: 'Pal Metal Ingot', category: 'material' },
  { id: 'pure_quartz', name: 'Pure Quartz', category: 'material' },
  { id: 'dark_fragment', name: 'Dark Fragment', category: 'material' },
  { id: 'reindrix_venison', name: 'Reindrix Venison', category: 'food' },
  { id: 'carbon_fiber', name: 'Carbon Fiber', category: 'material' },
  { id: 'soralite', name: 'Soralite', category: 'material' },
  { id: 'thermal_core', name: 'Thermal Core', category: 'material' },
  { id: 'sapphire', name: 'Sapphire', category: 'material' },
  { id: 'dog_coin', name: 'Dog Coin', category: 'material' },
  { id: 'meteorite_fragment', name: 'Meteorite Fragment', category: 'material' },
  { id: 'precious_claw', name: 'Precious Claw', category: 'material' },
  { id: 'chromite', name: 'Chromite', category: 'material' },
  { id: 'hexolite_quartz', name: 'Hexolite Quartz', category: 'material' },
  { id: 'coralum_ore', name: 'Coralum Ore', category: 'material' },
  { id: 'gloopie_tentacle', name: 'Gloopie Tentacle', category: 'material' },
  { id: 'ancient_civilization_core', name: 'Ancient Civilization Core', category: 'material' },
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
