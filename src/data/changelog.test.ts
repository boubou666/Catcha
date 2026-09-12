import { describe, expect, it } from 'vitest';
import { CHANGELOG, DEFAULT_CHANGELOG_FILTER, filterChangelog, isChangelogFiltering, LATEST_VERSION, type ChangelogEntry } from './changelog';

const entries: ChangelogEntry[] = [
  { version: '0.8.0', date: '2026-09-12', title: 'Tutorial and statistics', items: ['A Stats tab under Progress.', 'Box search now matches Paldeck numbers.'] },
  { version: '0.7.0', date: '2026-09-12', title: 'Polish: sounds, toasts, install', items: ['Sound effects.', 'Toast notifications.'] },
];

describe('changelog filter', () => {
  it('keeps everything by default and pins a version', () => {
    expect(filterChangelog(entries, DEFAULT_CHANGELOG_FILTER)).toEqual(entries);
    expect(isChangelogFiltering(DEFAULT_CHANGELOG_FILTER)).toBe(false);
    expect(filterChangelog(entries, { query: '', version: '0.7.0' }).map((e) => e.version)).toEqual(['0.7.0']);
  });

  it('narrows entries to matching items, or keeps the whole entry when the title matches', () => {
    expect(filterChangelog(entries, { query: 'paldeck', version: 'any' })).toEqual([{ ...entries[0], items: [entries[0].items[1]] }]);
    expect(filterChangelog(entries, { query: 'polish', version: 'any' })).toEqual([entries[1]]);
    expect(filterChangelog(entries, { query: 'v0.8', version: 'any' })).toEqual([entries[0]]);
    expect(filterChangelog(entries, { query: 'sound toast', version: 'any' })).toEqual([entries[1]]);   // both words in the title
    expect(filterChangelog(entries, { query: 'zzz', version: 'any' })).toEqual([]);
  });

  it('the real changelog is well-formed', () => {
    expect(CHANGELOG[0].version).toBe(LATEST_VERSION);
    expect(new Set(CHANGELOG.map((e) => e.version)).size).toBe(CHANGELOG.length);
    expect(CHANGELOG.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.items.length > 0)).toBe(true);
  });
});
