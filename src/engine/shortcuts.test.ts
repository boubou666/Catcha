import { describe, expect, it } from 'vitest';
import { isFieldTarget, resolveShortcut, SHORTCUT_DOCS, TAB_KEYS, type KeyLike } from './shortcuts';

const k = (over: Partial<KeyLike>): KeyLike => ({ key: '', code: '', ctrl: false, meta: false, alt: false, shift: false, inField: false, ...over });

describe('shortcuts', () => {
  it('maps physical digits, arrows, attack, search, save and help', () => {
    expect(resolveShortcut(k({ key: '&', code: 'Digit1' }))).toEqual({ kind: 'tab', index: 0 });     // AZERTY unshifted
    expect(resolveShortcut(k({ key: '9', code: 'Digit9' }))).toEqual({ kind: 'tab', index: 8 });
    expect(resolveShortcut(k({ key: '0', code: 'Digit0' }))).toBeNull();
    expect(resolveShortcut(k({ key: 'ArrowRight', code: 'ArrowRight' }))).toEqual({ kind: 'tabStep', delta: 1 });
    expect(resolveShortcut(k({ key: 'ArrowUp', code: 'ArrowUp' }))).toEqual({ kind: 'groupStep', delta: -1 });
    expect(resolveShortcut(k({ key: ' ', code: 'Space' }))).toEqual({ kind: 'attack' });
    expect(resolveShortcut(k({ key: 'a', code: 'KeyQ' }))).toEqual({ kind: 'attack' });                 // AZERTY: A sits on KeyQ
    expect(resolveShortcut(k({ key: '/', code: 'Slash' }))).toEqual({ kind: 'search' });
    expect(resolveShortcut(k({ key: '?', code: 'Slash', shift: true }))).toEqual({ kind: 'help' });
    expect(resolveShortcut(k({ key: 's', code: 'KeyS' }))).toEqual({ kind: 'save' });
    expect(resolveShortcut(k({ key: 'x', code: 'KeyX' }))).toEqual({ kind: 'tabId', id: 'expedition' });
  });

  it('stays out of the way while typing or with modifiers held', () => {
    expect(resolveShortcut(k({ key: 'a', code: 'KeyA', inField: true }))).toBeNull();
    expect(resolveShortcut(k({ key: '1', code: 'Digit1', ctrl: true }))).toBeNull();
    expect(resolveShortcut(k({ key: 'k', code: 'KeyK', meta: true }))).toBeNull();
    expect(resolveShortcut(k({ key: '1', code: 'Digit1', alt: true }))).toBeNull();
    expect(resolveShortcut(k({ key: '!', code: 'Digit1', shift: true }))).toEqual({ kind: 'region', index: 0 });   // QWERTY Shift+1
    expect(resolveShortcut(k({ key: '3', code: 'Digit3', shift: true }))).toEqual({ kind: 'region', index: 2 });   // AZERTY Shift+3
    expect(resolveShortcut(k({ key: 'ArrowRight', code: 'ArrowRight', shift: true }))).toEqual({ kind: 'regionStep', delta: 1 });
    expect(resolveShortcut(k({ key: 'ArrowLeft', code: 'ArrowLeft', shift: true }))).toEqual({ kind: 'regionStep', delta: -1 });
    expect(isFieldTarget('input', false)).toBe(true);
    expect(isFieldTarget('SELECT', false)).toBe(true);
    expect(isFieldTarget('button', false)).toBe(false);   // clicking a tab must not disable the arrows
    expect(isFieldTarget('div', true)).toBe(true);
    expect(isFieldTarget('div', false)).toBe(false);
    expect(isFieldTarget(undefined, false)).toBe(false);
  });

  it('documents every action', () => {
    expect(SHORTCUT_DOCS.length).toBeGreaterThanOrEqual(7);
    expect(SHORTCUT_DOCS.every((d) => d.keys && d.does)).toBe(true);
  });
});

describe('the full shortcut set', () => {
  it('maps letters to tabs, Shift+letters to fights and claims, and the panel toggles', () => {
    for (const [letter, tab] of Object.entries(TAB_KEYS)) {
      expect(resolveShortcut(k({ key: letter, code: 'Key' + letter.toUpperCase() }))).toEqual({ kind: 'tabId', id: tab });
    }
    expect(new Set(Object.values(TAB_KEYS)).size).toBe(Object.keys(TAB_KEYS).length);   // one letter per tab
    expect(resolveShortcut(k({ key: 'A', code: 'KeyQ', shift: true }))).toEqual({ kind: 'alpha' });
    expect(resolveShortcut(k({ key: 'T', code: 'KeyT', shift: true }))).toEqual({ kind: 'tower' });
    expect(resolveShortcut(k({ key: 'D', code: 'KeyD', shift: true }))).toEqual({ kind: 'realm' });
    expect(resolveShortcut(k({ key: 'M', code: 'Semicolon', shift: true }))).toEqual({ kind: 'raid' });   // AZERTY M
    expect(resolveShortcut(k({ key: 'Q', code: 'KeyA', shift: true }))).toEqual({ kind: 'claimQuests' });
    expect(resolveShortcut(k({ key: 'Backspace', code: 'Backspace' }))).toEqual({ kind: 'flee' });
    expect(resolveShortcut(k({ key: 'w', code: 'KeyZ' }))).toEqual({ kind: 'spawnList' });
    expect(resolveShortcut(k({ key: 'n', code: 'KeyN' }))).toEqual({ kind: 'notifications' });
    expect(resolveShortcut(k({ key: 'Z', code: 'KeyW', shift: true }))).toBeNull();        // unassigned Shift+letter
    expect(resolveShortcut(k({ key: 'j', code: 'KeyJ' }))).toBeNull();                     // unassigned letter
    for (const d of SHORTCUT_DOCS) expect(d.keys.length).toBeGreaterThan(0);
  });
});
