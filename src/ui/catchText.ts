import { chanceVsWild, type CatchPreview } from '../engine/catch';

/** 0.62 → "62%" */
export const pct = (n: number) => `${Math.round(n * 100)}%`;
import { spawnTable } from '../engine/arenafilter';
import { SPHERES } from '../data/spheres';
import { palById } from '../data/pals';
import type { SaveState, SphereTier } from '../data/types';
import type { Wild } from '../engine/combat';

/** "62% on the Lamball in front of you" for a sphere tier, or its multiplier when nothing catchable is out. */
export function sphereVsWild(save: SaveState, wild: Wild | null | undefined, tier: SphereTier): string {
  const c = chanceVsWild(save, wild, tier);
  return c === null ? `×${SPHERES[tier].mult} catch rate` : `${pct(c)} on the ${palById(wild!.palId).name} in front of you`;
}

/** "Lamball 62%, Cattiva 62%, ??? 62%" — a spawn table's catch odds under the current policy, unseen names hidden. */
export function tableOddsText(save: SaveState, spawns: readonly { palId: number; weight: number }[]): string {
  return spawnTable(save, spawns).map((r) => `${r.name} ${r.catch.throws ? `${pct(r.catch.chance)}` : '—'}`).join(', ');
}

/** "60% with a Pal Sphere", "no throw — already caught (Catch settings)", "no spheres left" */
export function catchText(p: CatchPreview): string {
  if (p.throws) return `${pct(p.chance)} with a ${SPHERES[p.tier].name}`;
  if (p.reason === 'no-spheres') return 'no spheres left — Merchant';
  return p.dupe ? 'no throw — already caught (Settings → Catching)' : 'no throw — policy (Settings → Catching)';
}
