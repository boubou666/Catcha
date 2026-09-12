import type { CatchPreview } from '../engine/catch';
import { SPHERES } from '../data/spheres';

/** "60% with a Pal Sphere", "no throw — already caught (Catch settings)", "no spheres left" */
export function catchText(p: CatchPreview): string {
  if (p.throws) return `${Math.round(p.chance * 100)}% with a ${SPHERES[p.tier].name}`;
  if (p.reason === 'no-spheres') return 'no spheres left — Merchant';
  return p.dupe ? 'no throw — already caught (Settings → Catching)' : 'no throw — policy (Settings → Catching)';
}
