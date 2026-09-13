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
  { id: 'map', title: 'Find your way', text: 'The Routes panel is a map of the Palpagos Islands: tap a pin for a route, Alpha, tower or realm, tap it again to go. Travel to Grassy Behemoth Hills. ▴ folds the map away; ☰ List brings the old list back.', tab: 'routes',
    done: (s) => s.progress.route !== 'plateau' },
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
  { id: 'challenge', title: "Take today's challenge", text: 'One open route a day carries a modifier — more Lucky Pals, double gold, tougher Pals or triple drops. It is starred in the route list and on the map and sits at the top of Daily; thirty defeats there pay 2,000 gold and an Effigy. Go and beat one Pal there.', tab: 'daily',
    done: (s) => (s.progress.challenge?.kills ?? 0) > 0 },
  { id: 'skills', title: 'Fire a skill', text: 'Each party Pal charges its element’s attack over 20 seconds — the chips under the arena fill up — and fires it on its own for six seconds’ worth of damage. Tap a full chip to fire it right now. Do that once.',
    done: (s) => s.stats.skillsFired > 0 },
  { id: 'rival', title: 'Duel the region’s rival', text: 'Every region has a faction fighter waiting in the Bosses panel and on the map. Clear Grassy Behemoth Hills and duel the Syndicate Scout: three Pals in a row, 90 seconds each, none catchable — win for gold and Mega Spheres.', tab: 'bosses',
    done: (s) => s.stats.duelsWon + s.stats.duelsLost > 0 },
  { id: 'raid', title: 'Defend the base', text: 'Now and then a wild Pal raids your base. Workers fight back; rally the party from the Base tab (or the 🚨 button in the arena) to finish it fast, or build a Watchtower so they can hold on their own. Beaten Alphas also come back stronger after an hour of play — the Bosses panel shows the countdown.', tab: 'base',
    done: (s) => s.stats.baseRaidsRepelled + s.stats.baseRaidsLost > 0 || (s.base.structures.watchtower ?? 0) > 0 },
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

// ---- listing & filtering ----------------------------------------------------------------

export type StepStatus = 'done' | 'current' | 'upcoming';
export interface TutorialFilter { query: string; status: StepStatus | 'any' }
export const DEFAULT_TUTORIAL_FILTER: TutorialFilter = { query: '', status: 'any' };
export const STEP_STATUS_LABEL: Record<StepStatus | 'any', string> = { any: 'Any status', done: 'Done', current: 'Current', upcoming: 'Upcoming' };

export interface StepRow { index: number; step: TutorialStep; status: StepStatus }

/** Every step with its status relative to the save's progress (all done once the tutorial is finished). */
export function tutorialSteps(save: SaveState): StepRow[] {
  const { step, done } = save.tutorial;
  return TUTORIAL.map((s, index) => ({ index, step: s, status: done || index < step ? 'done' : index === step ? 'current' : 'upcoming' }));
}

/** Every search word must match the step title, text or the tab it points at. */
export function filterTutorial(save: SaveState, f: TutorialFilter): StepRow[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return tutorialSteps(save).filter((r) => {
    if (f.status !== 'any' && r.status !== f.status) return false;
    const hay = [r.step.title, r.step.text, r.step.tab ?? ''].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
