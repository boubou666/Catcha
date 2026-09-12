import type { SaveState } from '../data/types';
import { routeById } from '../data/regions';
import { routeCleared } from './progress';

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  /** Tab to jump to, if the step happens somewhere other than the arena. */
  tab?: string;
  done: (save: SaveState) => boolean;
}

export const TUTORIAL: TutorialStep[] = [
  { id: 'attack', title: 'Attack a wild Pal', text: 'Tap Attack to hurt the Pal in the arena. Defeat it and you\'ll throw a Pal Sphere automatically — you start with twenty.',
    done: (s) => s.stats.defeated >= 1 },
  { id: 'catch', title: 'Catch your first Pal', text: 'Catches aren\'t guaranteed (60% for common Pals). Keep attacking until one sticks — it joins your party and fights for you.',
    done: (s) => s.stats.caught >= 1 },
  { id: 'party', title: 'Let the party work', text: 'Party Pals attack on their own — that\'s your Party DPS. Up to five fight at once; the game keeps going while this tab is open, and the base keeps working while it\'s closed.',
    tab: 'party', done: (s) => s.party.length >= 2 || s.stats.defeated >= 15 },
  { id: 'route', title: 'Clear the first route', text: 'Each route unlocks the next after a number of defeats — Plateau of Beginnings needs 10. New routes bring new species and higher levels.',
    done: (s) => routeCleared(s, routeById('plateau')) },
  { id: 'tech', title: 'Research the Workbench', text: 'You earn 2 tech points per level. Spend them under Progress → Tech; start with the Primitive Workbench.',
    tab: 'tech', done: (s) => s.tech.includes('s_workbench') },
  { id: 'worker', title: 'Put a Pal to work', text: 'Under Base → Base, assign a caught Pal as a worker. Lumbering makes Wood, Mining makes Stone and Ore — even while you\'re away.',
    tab: 'base', done: (s) => s.base.workers.length >= 1 },
  { id: 'build', title: 'Build the Workbench', text: 'Structures cost materials your workers produce. The Primitive Workbench needs 10 Wood and unlocks crafting.',
    tab: 'base', done: (s) => (s.base.structures.workbench ?? 0) > 0 },
  { id: 'craft', title: 'Craft a Pal Sphere', text: 'Research the Pal Sphere recipe, then queue one under Base → Craft. A Handiwork Pal at the base works the queue. Spheres are how you catch everything.',
    tab: 'craft', done: (s) => s.stats.crafted >= 1 },
  { id: 'alpha', title: 'Beat an Alpha', text: 'Clear Fort Ruins, then challenge Alpha Chillet from the Bosses panel. Alphas gate routes and pay Effigies, which raise your catch rate.',
    done: (s) => s.progress.alphas.length >= 1 },
  { id: 'onward', title: 'You know the loop', text: 'Towers unlock new regions. Breeding, condensing, expeditions, Sealed Realms, raids and Ascension unlock as you progress — check Daily quests each day and the Paldeck for where to find any Pal.',
    done: () => false },
];

export function newTutorial(): SaveState['tutorial'] {
  return { step: 0, done: false };
}

/** Advance past every completed step. Returns true if the step changed. */
export function advanceTutorial(save: SaveState): boolean {
  const t = save.tutorial;
  if (t.done) return false;
  const start = t.step;
  while (t.step < TUTORIAL.length - 1 && TUTORIAL[t.step].done(save)) t.step += 1;
  return t.step !== start;
}

export function currentStep(save: SaveState): TutorialStep | null {
  return save.tutorial.done ? null : TUTORIAL[save.tutorial.step] ?? null;
}

export function finishTutorial(save: SaveState): void {
  save.tutorial = { step: TUTORIAL.length - 1, done: true };
}
