import type { PalDef, Requirement, SaveState } from '../data/types';
import { PALS, palById } from '../data/pals';
import { alphaById, REGIONS, routeById, towerById } from '../data/regions';
import { DUNGEONS, dungeonById } from '../data/dungeons';
import { RAIDS, raidById } from '../data/raids';
import { isUnlocked } from './progress';
import { childOf, comboKey, SPECIAL_COMBOS } from './breeding';

export interface Habitat {
  routes: { regionName: string; routeId: string; routeName: string; level: number; chance: number }[];
  alphas: { regionName: string; alphaId: string; level: number }[];
  towers: { name: string; boss: string; towerId: string }[];
  realms: { dungeonId: string; name: string; role: 'wave' | 'guardian'; chance: number }[];
  raids: { raidId: string; name: string }[];
}

/** Everywhere a species can be met. Chances are its share of the spawn table. */
export function habitatOf(palId: number): Habitat {
  const h: Habitat = { routes: [], alphas: [], towers: [], realms: [], raids: [] };
  for (const region of REGIONS) {
    for (const route of region.routes) {
      const total = route.spawns.reduce((s, x) => s + x.weight, 0);
      const spawn = route.spawns.find((s) => s.palId === palId);
      if (spawn) h.routes.push({ regionName: region.name, routeId: route.id, routeName: route.name, level: route.level, chance: spawn.weight / total });
    }
    for (const a of region.alphas) if (a.palId === palId) h.alphas.push({ regionName: region.name, alphaId: a.id, level: a.level });
    if (region.tower.palId === palId) h.towers.push({ name: region.tower.name, boss: region.tower.boss, towerId: region.tower.id });
  }
  for (const d of DUNGEONS) {
    const total = d.pool.reduce((s, x) => s + x.weight, 0);
    const wave = d.pool.find((s) => s.palId === palId);
    if (wave) h.realms.push({ dungeonId: d.id, name: d.name, role: 'wave', chance: wave.weight / total });
    if (d.boss.palId === palId) h.realms.push({ dungeonId: d.id, name: d.name, role: 'guardian', chance: 1 });
  }
  for (const r of RAIDS) if (r.palId === palId) h.raids.push({ raidId: r.id, name: r.name });
  return h;
}

export interface BreedingInfo {
  producedBy: { a: number; b: number; special: boolean }[];   // pairs that yield this species
  parentOf: { partner: number; child: number }[];            // special combos this species is part of
  sameSpecies: boolean;                                       // it breeds true with itself
}

const ownedSpecies = (save: SaveState) => PALS.filter((p) => (save.paldeck[p.id]?.caught ?? 0) > 0);

/**
 * How to breed a species: every special combo that yields it, then — among species the player owns —
 * pairs whose rank average lands on it. Base species only for the formula (subspecies come from combos).
 */
export function breedingInfoFor(save: SaveState, palId: number, maxPairs = 40): BreedingInfo {
  const def = palById(palId);
  const producedBy: BreedingInfo['producedBy'] = [];
  const parentOf: BreedingInfo['parentOf'] = [];
  for (const [key, child] of Object.entries(SPECIAL_COMBOS)) {
    const [a, b] = key.split('+').map(Number);
    if (child === palId) producedBy.push({ a, b, special: true });
    if (a === palId) parentOf.push({ partner: b, child });
    else if (b === palId) parentOf.push({ partner: a, child });
  }
  if (!def.variantOf) {
    const owned = ownedSpecies(save).filter((p) => !p.variantOf);
    outer: for (let i = 0; i < owned.length; i++) {
      for (let j = i; j < owned.length; j++) {
        const a = owned[i].id, b = owned[j].id;
        if (a === b) continue;
        if (SPECIAL_COMBOS[comboKey(a, b)] !== undefined) continue;
        if (childOf(a, b) === palId) {
          producedBy.push({ a, b, special: false });
          if (producedBy.length >= maxPairs) break outer;
        }
      }
    }
  }
  return { producedBy, parentOf, sameSpecies: true };
}

export function ownedCopies(save: SaveState, palId: number) {
  const copies = save.box.filter((p) => p.palId === palId);
  const best = copies.reduce<typeof copies[number] | null>((b, p) => (!b || p.stars > b.stars || (p.stars === b.stars && p.level > b.level) ? p : b), null);
  return { count: copies.length, best };
}

export const isSeen = (save: SaveState, def: PalDef) => !!save.paldeck[def.id]?.seen;

// ---- detail-view filtering ----------------------------------------------------------------

export type PairKind = 'any' | 'special' | 'rank';
export interface DetailFilter { query: string; unlockedOnly: boolean; pairs: PairKind }
export const DEFAULT_DETAIL_FILTER: DetailFilter = { query: '', unlockedOnly: false, pairs: 'any' };
export const PAIR_KIND_LABEL: Record<PairKind, string> = { any: 'All pairs', special: 'Special combos', rank: 'By breeding rank' };

export function isDetailFiltering(f: DetailFilter): boolean {
  return f.query.trim() !== '' || f.unlockedOnly || f.pairs !== 'any';
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const matchAll = (ws: string[], text: string) => ws.every((w) => text.toLowerCase().includes(w));
const seenName = (save: SaveState, id: number) => (isSeen(save, palById(id)) ? palById(id).name : '???');

/** Habitat entries whose place, region or role matches every search word; optionally only places you can reach. */
export function filterHabitat(save: SaveState, h: Habitat, f: DetailFilter): Habitat {
  const ws = words(f.query);
  const open = (req: Requirement) => !f.unlockedOnly || isUnlocked(save, req);
  return {
    routes: h.routes.filter((r) => open(routeById(r.routeId).unlock) && matchAll(ws, `${r.routeName} ${r.regionName} route lv ${r.level}`)),
    alphas: h.alphas.filter((a) => open(alphaById(a.alphaId).unlock) && matchAll(ws, `alpha ${a.regionName} lv ${a.level}`)),
    towers: h.towers.filter((t) => open(towerById(t.towerId).unlock) && matchAll(ws, `tower ${t.name} ${t.boss}`)),
    realms: h.realms.filter((d) => open(dungeonById(d.dungeonId).unlock) && matchAll(ws, `realm ${d.name} ${d.role}`)),
    raids: h.raids.filter((r) => open(raidById(r.raidId).unlock) && matchAll(ws, `raid ${r.name}`)),
  };
}

/** Breeding pairs by kind, with every search word matched against the (seen) names involved. */
export function filterBreedingInfo(save: SaveState, info: BreedingInfo, f: DetailFilter): BreedingInfo {
  const ws = words(f.query);
  return {
    ...info,
    producedBy: info.producedBy.filter((p) =>
      (f.pairs === 'any' || (f.pairs === 'special') === p.special) && matchAll(ws, `${seenName(save, p.a)} ${seenName(save, p.b)} ${p.special ? 'special' : 'rank'}`)),
    parentOf: info.parentOf.filter((p) => f.pairs !== 'rank' && matchAll(ws, `${seenName(save, p.partner)} ${seenName(save, p.child)} special`)),
  };
}
