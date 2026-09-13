/**
 * Keyboard shortcuts. Single-key actions are rebindable (per device); the digit / arrow families
 * (1–9 tabs, Shift+1–9 regions, arrows) are fixed. Pure, so the mapping is testable.
 */

export interface KeyLike { key: string; code: string; ctrl: boolean; meta: boolean; alt: boolean; shift: boolean; inField: boolean }

/** A rebindable key: the normalised `key` (letters lower-case, ' ' → 'space') plus whether Shift is held. */
export interface Binding { key: string; shift: boolean }

export type ActionId =
  | 'tab:party' | 'tab:box' | 'tab:compare' | 'tab:paldeck' | 'tab:breed'
  | 'tab:base' | 'tab:craft' | 'tab:items' | 'tab:shop' | 'tab:expedition'
  | 'tab:tech' | 'tab:daily' | 'tab:achievements' | 'tab:stats' | 'tab:prestige' | 'tab:settings'
  | 'tab:routes' | 'tab:bosses' | 'tab:log'
  | 'attack' | 'flee' | 'alpha' | 'tower' | 'realm' | 'raid' | 'claimQuests' | 'map' | 'foldMap' | 'spawnList' | 'notifications' | 'search' | 'save' | 'help';

export type ActionGroup = 'Tabs' | 'World tabs (phone)' | 'Playing' | 'Panels';
export interface ActionDef { id: ActionId; label: string; group: ActionGroup }

export const ACTIONS: ActionDef[] = [
  { id: 'tab:party', label: 'Party', group: 'Tabs' }, { id: 'tab:box', label: 'Box', group: 'Tabs' }, { id: 'tab:compare', label: 'Compare', group: 'Tabs' },
  { id: 'tab:paldeck', label: 'Paldeck', group: 'Tabs' }, { id: 'tab:breed', label: 'Breeding', group: 'Tabs' },
  { id: 'tab:base', label: 'Base', group: 'Tabs' }, { id: 'tab:craft', label: 'Craft', group: 'Tabs' }, { id: 'tab:items', label: 'Items', group: 'Tabs' },
  { id: 'tab:shop', label: 'Merchant', group: 'Tabs' }, { id: 'tab:expedition', label: 'Expeditions', group: 'Tabs' },
  { id: 'tab:tech', label: 'Tech', group: 'Tabs' }, { id: 'tab:daily', label: 'Daily quests', group: 'Tabs' }, { id: 'tab:achievements', label: 'Achievements', group: 'Tabs' },
  { id: 'tab:stats', label: 'Stats', group: 'Tabs' }, { id: 'tab:prestige', label: 'Ascension', group: 'Tabs' }, { id: 'tab:settings', label: 'Settings', group: 'Tabs' },
  { id: 'tab:routes', label: 'Routes', group: 'World tabs (phone)' }, { id: 'tab:bosses', label: 'Bosses', group: 'World tabs (phone)' }, { id: 'tab:log', label: 'Log', group: 'World tabs (phone)' },
  { id: 'attack', label: 'Attack', group: 'Playing' }, { id: 'flee', label: 'Retreat / leave realm / give up raid', group: 'Playing' },
  { id: 'alpha', label: 'Fight the next available Alpha', group: 'Playing' }, { id: 'tower', label: "Fight this region's tower", group: 'Playing' },
  { id: 'realm', label: "Enter this region's Sealed Realm", group: 'Playing' }, { id: 'raid', label: 'Summon the first ready raid', group: 'Playing' },
  { id: 'claimQuests', label: 'Claim every finished daily quest', group: 'Playing' },
  { id: 'map', label: 'Map ⇄ list in the Routes panel', group: 'Panels' }, { id: 'foldMap', label: 'Fold / unfold the Routes panel', group: 'Panels' },
  { id: 'spawnList', label: 'Toggle "Who lives here?"', group: 'Panels' }, { id: 'notifications', label: 'Open / close notifications', group: 'Panels' },
  { id: 'search', label: 'Focus the global search', group: 'Panels' }, { id: 'save', label: 'Save now', group: 'Panels' }, { id: 'help', label: 'Show the shortcut list', group: 'Panels' },
];

const K = (key: string, shift = false): Binding => ({ key, shift });
export type Bindings = Record<ActionId, Binding | null>;
export const DEFAULT_BINDINGS: Bindings = {
  'tab:party': K('p'), 'tab:box': K('b'), 'tab:compare': K('c'), 'tab:paldeck': K('d'), 'tab:breed': K('e'),
  'tab:base': K('h'), 'tab:craft': K('f'), 'tab:items': K('i'), 'tab:shop': K('m'), 'tab:expedition': K('x'),
  'tab:tech': K('t'), 'tab:daily': K('q'), 'tab:achievements': K('v'), 'tab:stats': K('g'), 'tab:prestige': K('u'), 'tab:settings': K('o'),
  'tab:routes': K('r'), 'tab:bosses': K('k'), 'tab:log': K('l'),
  attack: K('a'), flee: K('backspace'), alpha: K('a', true), tower: K('t', true), realm: K('d', true), raid: K('m', true), claimQuests: K('q', true),
  map: K('j'), foldMap: K('j', true), spawnList: K('w'), notifications: K('n'), search: K('/'), save: K('s'), help: K('?'),
};

/** Fixed families, for the help list. */
export const FIXED_DOCS: { keys: string; does: string }[] = [
  { keys: '1 – 9', does: 'Open the Nth tab of the current group' },
  { keys: '← / →', does: 'Previous / next tab' },
  { keys: '↑ / ↓', does: 'Previous / next group (Pals, Base, Progress — World on phones)' },
  { keys: 'Shift+← / Shift+→', does: 'Previous / next region' },
  { keys: 'Shift+1 – 9', does: 'Travel to the Nth unlocked region' },
  { keys: 'Space', does: 'Attack (always)' },
  { keys: 'Ctrl+K', does: 'Focus the global search (always)' },
  { keys: 'Esc', does: 'Close a panel or list' },
];

export type ShortcutAction =
  | { kind: 'group'; index: number }
  | { kind: 'groupStep'; delta: 1 | -1 }
  | { kind: 'tab'; index: number }
  | { kind: 'tabStep'; delta: 1 | -1 }
  | { kind: 'tabId'; id: string }
  | { kind: 'region'; index: number }
  | { kind: 'regionStep'; delta: 1 | -1 }
  | { kind: 'attack' } | { kind: 'flee' }
  | { kind: 'alpha' } | { kind: 'tower' } | { kind: 'realm' } | { kind: 'raid' }
  | { kind: 'claimQuests' } | { kind: 'map' } | { kind: 'foldMap' } | { kind: 'spawnList' } | { kind: 'notifications' }
  | { kind: 'search' } | { kind: 'help' } | { kind: 'save' };

const UNBINDABLE = new Set(['shift', 'control', 'alt', 'meta', 'capslock', 'tab', 'enter', 'escape', 'space', 'unidentified', 'dead']);

/** The binding a key press would create, or null for modifiers and keys that stay fixed (arrows, digits, Space, Esc…). */
export function bindingFromKey(e: Pick<KeyLike, 'key' | 'code' | 'shift'>): Binding | null {
  const raw = e.key === ' ' ? 'space' : e.key.toLowerCase();
  if (UNBINDABLE.has(raw) || raw.startsWith('arrow') || /^Digit\d$/.test(e.code) || raw.startsWith('f') && /^f\d+$/.test(raw)) return null;
  // Shift+letter reports the upper-case letter; symbols like '?' already carry the shift, so only letters keep the flag
  return { key: raw, shift: /^[a-z]$/.test(raw) ? e.shift : false };
}

export const sameBinding = (a: Binding | null, b: Binding | null): boolean => !!a && !!b && a.key === b.key && a.shift === b.shift;

/** Human label: "Shift+A", "Backspace", "/", "?" */
export function bindingLabel(b: Binding | null): string {
  if (!b) return '—';
  const name = b.key.length === 1 ? b.key.toUpperCase() : b.key[0].toUpperCase() + b.key.slice(1);
  return b.shift ? `Shift+${name}` : name;
}

/** Actions that share a key with another action. */
export function conflicts(bindings: Bindings): Set<ActionId> {
  const out = new Set<ActionId>();
  for (let i = 0; i < ACTIONS.length; i++) for (let j = i + 1; j < ACTIONS.length; j++) {
    const a = ACTIONS[i].id, b = ACTIONS[j].id;
    if (sameBinding(bindings[a], bindings[b])) { out.add(a); out.add(b); }
  }
  return out;
}

/** Map a key press to an action, or null. Nothing fires while typing in a field, or with Ctrl/Alt/Meta held (browser shortcuts). */
export function resolveShortcut(e: KeyLike, bindings: Bindings = DEFAULT_BINDINGS): ShortcutAction | null {
  if (e.inField || e.ctrl || e.meta || e.alt) return null;
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (digit) return e.shift ? { kind: 'region', index: Number(digit[1]) - 1 } : { kind: 'tab', index: Number(digit[1]) - 1 };
  switch (e.key) {
    case 'ArrowLeft': return e.shift ? { kind: 'regionStep', delta: -1 } : { kind: 'tabStep', delta: -1 };
    case 'ArrowRight': return e.shift ? { kind: 'regionStep', delta: 1 } : { kind: 'tabStep', delta: 1 };
    case 'ArrowUp': return { kind: 'groupStep', delta: -1 };
    case 'ArrowDown': return { kind: 'groupStep', delta: 1 };
  }
  if (e.code === 'Space') return { kind: 'attack' };
  const pressed = bindingFromKey(e);
  if (!pressed) return null;
  for (const a of ACTIONS) {
    if (!sameBinding(bindings[a.id], pressed)) continue;
    if (a.id.startsWith('tab:')) return { kind: 'tabId', id: a.id.slice(4) };
    return { kind: a.id as Exclude<ActionId, `tab:${string}`> };
  }
  return null;
}

/** Whether a focused element is being typed into (inputs, selects, editable text). Buttons are not fields: arrows and digits still navigate after a click. */
export function isFieldTarget(tag: string | undefined, editable: boolean): boolean {
  const t = (tag ?? '').toUpperCase();
  return editable || t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
}

// ---- persistence (per device) --------------------------------------------------------------

export const BINDINGS_KEY = 'catcha.keys';

/** Defaults overlaid with whatever was saved; unknown ids are dropped, `null` keeps a shortcut disabled. */
export function loadBindings(storage: Pick<Storage, 'getItem'> | null): Bindings {
  const out: Bindings = { ...DEFAULT_BINDINGS };
  try {
    const raw = storage?.getItem(BINDINGS_KEY);
    if (!raw) return out;
    const saved = JSON.parse(raw) as Partial<Record<string, Binding | null>>;
    for (const a of ACTIONS) {
      if (!(a.id in saved)) continue;
      const b = saved[a.id];
      if (b === null) out[a.id] = null;
      else if (b && typeof b.key === 'string') out[a.id] = { key: b.key, shift: !!b.shift };
    }
  } catch { /* ignore */ }
  return out;
}

/** Only the entries that differ from the defaults. */
export function serializeBindings(b: Bindings): string {
  const diff: Partial<Record<ActionId, Binding | null>> = {};
  for (const a of ACTIONS) {
    const cur = b[a.id], def = DEFAULT_BINDINGS[a.id];
    if ((cur === null) !== (def === null) || (cur && !sameBinding(cur, def))) diff[a.id] = cur;
  }
  return JSON.stringify(diff);
}

/** The help list for the current bindings: fixed families, then tab letters grouped, then the rest. */
export function shortcutDocs(bindings: Bindings): { keys: string; does: string }[] {
  const rows = FIXED_DOCS.slice(0, 5);
  const tabRow = (group: ActionGroup, prefix = '') => {
    const list = ACTIONS.filter((a) => a.group === group && bindings[a.id]);
    if (list.length) rows.push({ keys: list.map((a) => bindingLabel(bindings[a.id])).join(' '), does: prefix + list.map((a) => a.label).join(' · ') });
  };
  tabRow('Tabs');
  tabRow('World tabs (phone)', 'Phone layout: ');
  for (const a of ACTIONS) if ((a.group === 'Playing' || a.group === 'Panels') && bindings[a.id]) rows.push({ keys: bindingLabel(bindings[a.id]), does: a.label });
  return [...rows, ...FIXED_DOCS.slice(5)];
}
