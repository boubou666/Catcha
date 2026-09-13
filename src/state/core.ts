import type { RouteDef, SaveState } from '../data/types';
import type { Wild } from '../engine/combat';
import type { DungeonRun } from '../engine/dungeon';
import type { Duel } from '../engine/rival';
import type { LogMessage } from '../engine/logfilter';
import type { NoticeKind } from '../engine/notices';

/**
 * What the action modules (defeat.ts, encounters.ts) need from the store: the reactive state they read and
 * write, plus the log / notification / event hooks. The Game class satisfies this structurally.
 */
export interface GameCore {
  save: SaveState;
  wild: Wild | null;
  run: DungeonRun | null;
  duel: Duel | null;
  readonly route: RouteDef;
  readonly inBossFight: boolean;
  emit(event: string): void;
  push(text: string, extra?: { chance?: number; landed?: boolean }, msg?: LogMessage): void;
  pushT(key: string, vars?: Record<string, string | number>, extra?: { chance?: number; landed?: boolean }): void;
  notify(text: string, kind?: NoticeKind, ms?: number, msg?: LogMessage): void;
  notifyT(key: string, vars?: Record<string, string | number>, kind?: NoticeKind, ms?: number): void;
  spawn(): void;
}
