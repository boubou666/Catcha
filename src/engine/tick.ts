import type { SaveState } from '../data/types';
import { tickBase } from './base';
import { tickBreeding } from './breeding';

export interface TickResult {
  hatched: number[];   // Paldeck ids of Pals that hatched this tick
}

/** Everything that advances with time except combat. Used by the live loop and offline replay. */
export function tickWorld(save: SaveState, dtSec: number): TickResult {
  tickBase(save, dtSec);
  return { hatched: tickBreeding(save, dtSec) };
}
