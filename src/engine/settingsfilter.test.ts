import { describe, expect, it } from 'vitest';
import { filterSettings, SETTINGS_SECTIONS } from './settingsfilter';

const ids = (q: string) => filterSettings(q).map((s) => s.id);

describe('settings search', () => {
  it('shows everything for an empty query and matches keywords per section', () => {
    expect(ids('')).toEqual(SETTINGS_SECTIONS.map((s) => s.id));
    expect(ids('  ')).toEqual(SETTINGS_SECTIONS.map((s) => s.id));
    expect(ids('vibration')).toEqual(['sound']);
    expect(ids('export')).toEqual(['save']);
    expect(ids('timezone')).toEqual(['daily']);
    expect(ids('tutorial')).toEqual(['about']);
    expect(ids('sphere')).toEqual(['catching']);
  });

  it('requires every word and is case-insensitive', () => {
    expect(ids('Reset')).toEqual(['daily', 'save']);
    expect(ids('reset game')).toEqual(['save']);
    expect(ids('reset midnight')).toEqual(['daily']);
    expect(ids('zzz')).toEqual([]);
  });
});
