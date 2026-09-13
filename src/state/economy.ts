/** Base building, crafting, breeding pairs, research, condensing and the merchant: the engine calls plus their log lines. */
import type { SaveState, SphereTier } from '../data/types';
import { palById } from '../data/pals';
import { itemName } from '../data/items';
import { techById } from '../data/tech';
import { recipeById, structureById } from '../data/base';
import { SPHERES } from '../data/spheres';
import { build as buildStructure, cancelCraftAll as cancelAllCrafts, enqueue } from '../engine/base';
import { setPair as pairUp } from '../engine/breeding';
import { research as researchTech } from '../engine/tech';
import { condense as condensePal } from '../engine/condense';
import { buy, sell } from '../engine/shop';
import { instanceByUid } from '../engine/party';
import { isUnlocked } from '../engine/progress';
import type { GameCore } from './core';

export function build(g: GameCore, id: string) {
  if (!buildStructure(g.save, id)) return;
  const level = g.save.base.structures[id];
  if (level > 1) g.pushT('Built {structure} Lv {level}.', { structure: structureById(id).name, level }); else g.pushT('Built {structure}.', { structure: structureById(id).name });
}

export function craft(g: GameCore, recipeId: string, n: number) {
  const queued = enqueue(g.save, recipeId, n);
  if (queued > 0) g.pushT('Queued {n}× {recipe}.', { n: queued, recipe: recipeById(recipeId).name });
}

export function cancelCraftAll(g: GameCore, recipeId?: string) {
  const n = cancelAllCrafts(g.save, recipeId);
  if (n) { g.push(`Cancelled ${n} queued craft${n === 1 ? '' : 's'}${recipeId ? ` of ${recipeById(recipeId).name}` : ''} — materials refunded.`); g.notify(`↩ ${n} craft${n === 1 ? '' : 's'} cancelled, materials refunded`, 'info', 3000); }
}

export function setPair(g: GameCore, aUid: string, bUid: string) {
  if (pairUp(g.save, aUid, bUid)) {
    const a = instanceByUid(g.save, aUid)!; const b = instanceByUid(g.save, bUid)!;
    g.pushT('{a} and {b} moved to the Breeding Farm.', { a: palById(a.palId).name, b: palById(b.palId).name });
  }
}


export function research(g: GameCore, techId: string) {
  if (researchTech(g.save, techId)) g.pushT('Researched {tech}.', { tech: techById(techId).name });
}

export function condense(g: GameCore, uid: string) {
  const fed = condensePal(g.save, uid);
  const target = instanceByUid(g.save, uid);
  if (!fed || !target) return;
  g.push(`${palById(target.palId).name} condensed to ${'★'.repeat(target.stars)} (${fed.length} ${palById(target.palId).name}s consumed).`);
}

export function sphereAvailable(save: SaveState, tier: SphereTier): boolean {
  const s = SPHERES[tier];
  return s.price !== null && isUnlocked(save, s.unlock);
}

export function buyItem(g: GameCore, itemId: string, n = 1): boolean {
  const got = buy(g.save, itemId, n);
  if (got > 0) g.pushT('Bought {n} {item}.', { n: got, item: itemName(itemId) });
  return got > 0;
}

export function sellItem(g: GameCore, itemId: string, n = 1): boolean {
  const gold = sell(g.save, itemId, n);
  if (gold > 0) { g.pushT('Sold {item} for {gold} gold.', { item: itemName(itemId), gold: gold.toLocaleString() }); g.notifyT('💰 +{gold} gold', { gold: gold.toLocaleString() }, 'gold', 2500); }
  return gold > 0;
}
