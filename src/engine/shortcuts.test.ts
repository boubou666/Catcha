import { describe, expect, it } from 'vitest';
import {
  ACTIONS, bindingFromKey, bindingLabel, conflicts, DEFAULT_BINDINGS, isFieldTarget, loadBindings, resolveShortcut,
  serializeBindings, shortcutDocs, type Bindings, type KeyLike,
} from './shortcuts';

const k = (over: Partial<KeyLike>): KeyLike => ({ key: '', code: '', ctrl: false, meta: false, alt: false, shift: false, inField: false, ...over });

describe('fixed shortcuts', () => {
  it('maps physical digits, arrows, Space, regions', () => {
    expect(resolveShortcut(k({ key: '&', code: 'Digit1' }))).toEqual({ kind: 'tab', index: 0 });     // AZERTY unshifted
    expect(resolveShortcut(k({ key: '9', code: 'Digit9' }))).toEqual({ kind: 'tab', index: 8 });
    expect(resolveShortcut(k({ key: '0', code: 'Digit0' }))).toBeNull();
    expect(resolveShortcut(k({ key: '!', code: 'Digit1', shift: true }))).toEqual({ kind: 'region', index: 0 });
    expect(resolveShortcut(k({ key: 'ArrowRight', code: 'ArrowRight' }))).toEqual({ kind: 'tabStep', delta: 1 });
    expect(resolveShortcut(k({ key: 'ArrowLeft', code: 'ArrowLeft', shift: true }))).toEqual({ kind: 'regionStep', delta: -1 });
    expect(resolveShortcut(k({ key: 'ArrowUp', code: 'ArrowUp' }))).toEqual({ kind: 'groupStep', delta: -1 });
    expect(resolveShortcut(k({ key: ' ', code: 'Space' }))).toEqual({ kind: 'attack' });
  });

  it('stays out of the way while typing or with modifiers held', () => {
    expect(resolveShortcut(k({ key: 'a', code: 'KeyA', inField: true }))).toBeNull();
    expect(resolveShortcut(k({ key: '1', code: 'Digit1', ctrl: true }))).toBeNull();
    expect(resolveShortcut(k({ key: 'k', code: 'KeyK', meta: true }))).toBeNull();
    expect(resolveShortcut(k({ key: '1', code: 'Digit1', alt: true }))).toBeNull();
    expect(isFieldTarget('input', false)).toBe(true);
    expect(isFieldTarget('SELECT', false)).toBe(true);
    expect(isFieldTarget('button', false)).toBe(false);   // clicking a tab must not disable the arrows
    expect(isFieldTarget('div', true)).toBe(true);
    expect(isFieldTarget(undefined, false)).toBe(false);
  });
});

describe('default bindings', () => {
  it('map every action, with no two on the same key', () => {
    expect(ACTIONS.every((a) => DEFAULT_BINDINGS[a.id] !== null)).toBe(true);
    expect(conflicts(DEFAULT_BINDINGS).size).toBe(0);
    expect(resolveShortcut(k({ key: 'p', code: 'KeyP' }))).toEqual({ kind: 'tabId', id: 'party' });
    expect(resolveShortcut(k({ key: 'a', code: 'KeyQ' }))).toEqual({ kind: 'attack' });                 // AZERTY: A sits on KeyQ
    expect(resolveShortcut(k({ key: 'A', code: 'KeyQ', shift: true }))).toEqual({ kind: 'alpha' });
    expect(resolveShortcut(k({ key: 'M', code: 'Semicolon', shift: true }))).toEqual({ kind: 'raid' });  // AZERTY M
    expect(resolveShortcut(k({ key: 'Q', code: 'KeyA', shift: true }))).toEqual({ kind: 'claimQuests' });
    expect(resolveShortcut(k({ key: 'Backspace', code: 'Backspace' }))).toEqual({ kind: 'flee' });
    expect(resolveShortcut(k({ key: '/', code: 'Slash' }))).toEqual({ kind: 'search' });
    expect(resolveShortcut(k({ key: '?', code: 'Slash', shift: true }))).toEqual({ kind: 'help' });
    expect(resolveShortcut(k({ key: 's', code: 'KeyS' }))).toEqual({ kind: 'save' });
    expect(resolveShortcut(k({ key: 'w', code: 'KeyZ' }))).toEqual({ kind: 'spawnList' });
    expect(resolveShortcut(k({ key: 'n', code: 'KeyN' }))).toEqual({ kind: 'notifications' });
    expect(resolveShortcut(k({ key: 'j', code: 'KeyJ' }))).toBeNull();
    expect(resolveShortcut(k({ key: 'Z', code: 'KeyW', shift: true }))).toBeNull();
  });
});

describe('rebinding', () => {
  it('captures bindable keys only and labels them', () => {
    expect(bindingFromKey({ key: 'j', code: 'KeyJ', shift: false })).toEqual({ key: 'j', shift: false });
    expect(bindingFromKey({ key: 'J', code: 'KeyJ', shift: true })).toEqual({ key: 'j', shift: true });
    expect(bindingFromKey({ key: '?', code: 'Slash', shift: true })).toEqual({ key: '?', shift: false });   // symbol carries its own shift
    expect(bindingFromKey({ key: 'Backspace', code: 'Backspace', shift: false })).toEqual({ key: 'backspace', shift: false });
    for (const key of ['Shift', 'Control', 'Escape', 'Enter', 'Tab', ' ', 'ArrowLeft', 'F5']) expect(bindingFromKey({ key, code: key, shift: false })).toBeNull();
    expect(bindingFromKey({ key: '1', code: 'Digit1', shift: false })).toBeNull();
    expect(bindingLabel({ key: 'j', shift: true })).toBe('Shift+J');
    expect(bindingLabel({ key: 'backspace', shift: false })).toBe('Backspace');
    expect(bindingLabel(null)).toBe('—');
  });

  it('resolves against custom bindings, honours disabled ones and reports clashes', () => {
    const b: Bindings = { ...DEFAULT_BINDINGS, attack: { key: 'j', shift: false }, save: null, 'tab:box': { key: 'p', shift: false } };
    expect(resolveShortcut(k({ key: 'j', code: 'KeyJ' }), b)).toEqual({ kind: 'attack' });
    expect(resolveShortcut(k({ key: 'a', code: 'KeyA' }), b)).toBeNull();                 // old key freed
    expect(resolveShortcut(k({ key: 's', code: 'KeyS' }), b)).toBeNull();                 // disabled
    expect(resolveShortcut(k({ key: ' ', code: 'Space' }), b)).toEqual({ kind: 'attack' }); // Space always attacks
    expect([...conflicts(b)].sort()).toEqual(['tab:box', 'tab:party']);
    expect(resolveShortcut(k({ key: 'p', code: 'KeyP' }), b)).toEqual({ kind: 'tabId', id: 'party' });   // first in the list wins
  });

  it('persists only the differences and loads them back', () => {
    const b: Bindings = { ...DEFAULT_BINDINGS, attack: { key: 'j', shift: false }, save: null };
    const raw = serializeBindings(b);
    expect(JSON.parse(raw)).toEqual({ attack: { key: 'j', shift: false }, save: null });
    expect(serializeBindings(DEFAULT_BINDINGS)).toBe('{}');
    const loaded = loadBindings({ getItem: () => raw });
    expect(loaded.attack).toEqual({ key: 'j', shift: false });
    expect(loaded.save).toBeNull();
    expect(loaded['tab:party']).toEqual(DEFAULT_BINDINGS['tab:party']);
    expect(loadBindings({ getItem: () => '{"bogus":{"key":"z"},"attack":{"key":5}}' })).toEqual(DEFAULT_BINDINGS);
    expect(loadBindings({ getItem: () => 'not json' })).toEqual(DEFAULT_BINDINGS);
    expect(loadBindings(null)).toEqual(DEFAULT_BINDINGS);
  });

  it('builds the help list from the live bindings', () => {
    const docs = shortcutDocs(DEFAULT_BINDINGS);
    expect(docs[0].keys).toBe('1 – 9');
    expect(docs.find((d) => d.does.startsWith('Party'))?.keys).toBe('P B C D E H F I M X T Q V G U O');
    expect(docs.find((d) => d.does === 'Attack')?.keys).toBe('A');
    const custom = shortcutDocs({ ...DEFAULT_BINDINGS, attack: { key: 'j', shift: false }, save: null });
    expect(custom.find((d) => d.does === 'Attack')?.keys).toBe('J');
    expect(custom.some((d) => d.does === 'Save now')).toBe(false);
  });
});
