/** Keyboard shortcuts, resolved from a key event into an app action. Pure, so the mapping is testable. */

export interface KeyLike { key: string; code: string; ctrl: boolean; meta: boolean; alt: boolean; shift: boolean; inField: boolean }

export type ShortcutAction =
  | { kind: 'group'; index: number }        // 0-based group in the visible list
  | { kind: 'groupStep'; delta: 1 | -1 }
  | { kind: 'tab'; index: number }          // 0-based tab within the current group
  | { kind: 'tabStep'; delta: 1 | -1 }
  | { kind: 'region'; index: number }       // 0-based reachable region
  | { kind: 'regionStep'; delta: 1 | -1 }
  | { kind: 'attack' }
  | { kind: 'search' }
  | { kind: 'help' }
  | { kind: 'save' };

export interface ShortcutDoc { keys: string; does: string }

/** Shown in the help overlay and Settings. Physical digits so AZERTY / QWERTZ layouts behave the same. */
export const SHORTCUT_DOCS: ShortcutDoc[] = [
  { keys: '1 – 9', does: 'Open the Nth tab of the current group' },
  { keys: '← / →', does: 'Previous / next tab' },
  { keys: '↑ / ↓', does: 'Previous / next group (Pals, Base, Progress — World on phones)' },
  { keys: 'Shift+← / Shift+→', does: 'Previous / next region' },
  { keys: 'Shift+1 – 9', does: 'Travel to the Nth unlocked region' },
  { keys: 'Space or A', does: 'Attack the Pal in the arena' },
  { keys: '/ or Ctrl+K', does: 'Focus the global search' },
  { keys: 'S', does: 'Save now' },
  { keys: '?', does: 'Show this list' },
  { keys: 'Esc', does: 'Close a panel or list' },
];

/** Map a key press to an action, or null. Nothing fires while typing in a field, or with Ctrl/Alt/Meta held (browser shortcuts). */
export function resolveShortcut(e: KeyLike): ShortcutAction | null {
  if (e.inField || e.ctrl || e.meta || e.alt) return null;
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (digit) return e.shift ? { kind: 'region', index: Number(digit[1]) - 1 } : { kind: 'tab', index: Number(digit[1]) - 1 };
  switch (e.key) {
    case 'ArrowLeft': return e.shift ? { kind: 'regionStep', delta: -1 } : { kind: 'tabStep', delta: -1 };
    case 'ArrowRight': return e.shift ? { kind: 'regionStep', delta: 1 } : { kind: 'tabStep', delta: 1 };
    case 'ArrowUp': return { kind: 'groupStep', delta: -1 };
    case 'ArrowDown': return { kind: 'groupStep', delta: 1 };
    case '?': return { kind: 'help' };
    case '/': return { kind: 'search' };
  }
  if (e.code === 'Space') return { kind: 'attack' };
  switch (e.key.toLowerCase()) {
    case 'a': return { kind: 'attack' };
    case 's': return { kind: 'save' };
  }
  return null;
}

/** Whether a focused element is being typed into (inputs, selects, editable text). Buttons are not fields: arrows and digits still navigate after a click. */
export function isFieldTarget(tag: string | undefined, editable: boolean): boolean {
  const t = (tag ?? '').toUpperCase();
  return editable || t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
}
