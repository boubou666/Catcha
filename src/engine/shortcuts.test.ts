import { describe, expect, it } from 'vitest';
import { isFieldTarget, resolveShortcut, SHORTCUT_DOCS, type KeyLike } from './shortcuts';

const k = (over: Partial<KeyLike>): KeyLike => ({ key: '', code: '', ctrl: false, meta: false, alt: false, shift: false, inField: false, ...over });

describe('shortcuts', () => {
  it('maps physical digits, arrows, attack, search, save and help', () => {
    expect(resolveShortcut(k({ key: '&', code: 'Digit1' }))).toEqual({ kind: 'tab', index: 0 });     // AZERTY unshifted
    expect(resolveShortcut(k({ key: '9', code: 'Digit9' }))).toEqual({ kind: 'tab', index: 8 });
    expect(resolveShortcut(k({ key: '0', code: 'Digit0' }))).toBeNull();
    expect(resolveShortcut(k({ key: 'ArrowRight', code: 'ArrowRight' }))).toEqual({ kind: 'tabStep', delta: 1 });
    expect(resolveShortcut(k({ key: 'ArrowUp', code: 'ArrowUp' }))).toEqual({ kind: 'groupStep', delta: -1 });
    expect(resolveShortcut(k({ key: ' ', code: 'Space' }))).toEqual({ kind: 'attack' });
    expect(resolveShortcut(k({ key: 'A', code: 'KeyQ', shift: true }))).toEqual({ kind: 'attack' });   // AZERTY: A sits on KeyQ
    expect(resolveShortcut(k({ key: '/', code: 'Slash' }))).toEqual({ kind: 'search' });
    expect(resolveShortcut(k({ key: '?', code: 'Slash', shift: true }))).toEqual({ kind: 'help' });
    expect(resolveShortcut(k({ key: 's', code: 'KeyS' }))).toEqual({ kind: 'save' });
    expect(resolveShortcut(k({ key: 'x', code: 'KeyX' }))).toBeNull();
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
