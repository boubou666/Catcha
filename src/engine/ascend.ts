import type { SaveState } from '../data/types';
import { newState } from './save';
import { arkCandidates, arkSlots, canAscend, relicsFor, startingSpheres, startingTechPoints } from './prestige';

/**
 * Start a new run. Keeps Paldeck records, achievements, stats, daily quests, settings and prestige;
 * carries the chosen Pals (rested, in the party). Everything else resets. Returns the new state.
 */
export function ascend(save: SaveState, keepUids: string[]): SaveState | null {
  if (!canAscend(save)) return null;
  const slots = arkSlots(save);
  const eligible = new Set(arkCandidates(save).map((p) => p.uid));
  const keep = [...new Set(keepUids)].filter((u) => eligible.has(u)).slice(0, slots);
  const relics = relicsFor(save);

  const next = newState();
  next.paldeck = save.paldeck;
  next.achievements = save.achievements;
  next.stats = save.stats;
  next.tutorial = save.tutorial;
  next.daily = save.daily;
  next.dailyHistory = save.dailyHistory;
  next.loadouts = save.loadouts;           // members that didn't make the Ark just show as gone
  next.settings = save.settings;
  next.prestige = { relics: save.prestige.relics + relics, ascensions: save.prestige.ascensions + 1, upgrades: save.prestige.upgrades };
  next.player.techPoints += startingTechPoints(save);
  next.inventory.sphere_pal += startingSpheres(save);
  for (const uid of keep) {
    const p = save.box.find((x) => x.uid === uid)!;
    next.box.push({ ...p, san: 100 });
    if (next.party.length < 5) next.party.push(p.uid);
  }
  return next;
}
