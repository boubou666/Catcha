import type { PalDef, SaveState } from '../data/types';
import { PALS, palById } from '../data/pals';
import { REGIONS } from '../data/regions';
import { DUNGEONS } from '../data/dungeons';
import { RAIDS } from '../data/raids';
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
export function breedingInfoFor(save: SaveState, palId: number, maxPairs = 12): BreedingInfo {
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
