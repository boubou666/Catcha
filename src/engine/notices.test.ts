import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTICE_FILTER, DEFAULT_TOAST_PREF, filterNotices, isNoticeFiltering, loadToastPref, type Notice } from './notices';

const list: Notice[] = [
  { id: 3, at: 3, text: '🥚 Lamball hatched!', kind: 'success', read: false },
  { id: 2, at: 2, text: '💰 +18 gold', kind: 'gold', read: true },
  { id: 1, at: 1, text: '✨ A Lucky Chikipi appeared!', kind: 'warn', read: true },
];

describe('notification filter', () => {
  it('filters by kind, unread and every search word, keeping order', () => {
    expect(filterNotices(list, DEFAULT_NOTICE_FILTER)).toEqual(list);
    expect(isNoticeFiltering(DEFAULT_NOTICE_FILTER)).toBe(false);
    expect(filterNotices(list, { query: '', kind: 'gold', unreadOnly: false }).map((n) => n.id)).toEqual([2]);
    expect(filterNotices(list, { query: '', kind: 'any', unreadOnly: true }).map((n) => n.id)).toEqual([3]);
    expect(filterNotices(list, { query: 'lucky chikipi', kind: 'any', unreadOnly: false }).map((n) => n.id)).toEqual([1]);
    expect(filterNotices(list, { query: 'zzz', kind: 'any', unreadOnly: false })).toEqual([]);
  });

  it('loads toast preferences with defaults for anything missing or broken', () => {
    expect(loadToastPref(null)).toEqual(DEFAULT_TOAST_PREF);
    expect(loadToastPref({ getItem: () => '{"gold":false}' })).toEqual({ ...DEFAULT_TOAST_PREF, gold: false });
    expect(loadToastPref({ getItem: () => 'not json' })).toEqual(DEFAULT_TOAST_PREF);
  });
});
