import type { SaveState } from '../data/types';
import { tickBase } from './base';
import { tickBreeding } from './breeding';
import { tickExpeditions } from './expedition';
import type { ExpeditionReport } from '../data/types';

export interface TickResult {
  hatched: number[];              // Paldeck ids of Pals that hatched this tick
  returned: ExpeditionReport[];   // expeditions that got back this tick
}

/** Everything that advances with time except combat. Used by the live loop and offline replay. */
export function tickWorld(save: SaveState, dtSec: number): TickResult {
  tickBase(save, dtSec);
  return { hatched: tickBreeding(save, dtSec), returned: tickExpeditions(save, dtSec) };
}
