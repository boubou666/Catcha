export type NoticeKind = 'info' | 'success' | 'gold' | 'warn';
import type { LogMessage } from './logfilter';
export interface Notice { id: number; at: number; text: string; kind: NoticeKind; read: boolean; msg?: LogMessage }

export const NOTICE_KIND_LABEL: Record<NoticeKind, string> = { info: 'Info', success: 'Success', gold: 'Gold & rewards', warn: 'Warnings & Lucky' };
export const NOTICE_KINDS = Object.keys(NOTICE_KIND_LABEL) as NoticeKind[];
export const NOTICE_CAP = 100;

export interface NoticeFilter { query: string; kind: NoticeKind | 'any'; unreadOnly: boolean }
export const DEFAULT_NOTICE_FILTER: NoticeFilter = { query: '', kind: 'any', unreadOnly: false };

export function isNoticeFiltering(f: NoticeFilter): boolean {
  return f.query.trim() !== '' || f.kind !== 'any' || f.unreadOnly;
}

/** Notices (newest first, as stored) matching the kind, read state and every search word. */
export function filterNotices(list: Notice[], f: NoticeFilter): Notice[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((n) => (f.kind === 'any' || n.kind === f.kind) && (!f.unreadOnly || !n.read) && words.every((w) => n.text.toLowerCase().includes(w)));
}

/** Per-device toast preferences: which kinds still pop up. Stored under `catcha.toasts`. */
export const TOAST_PREF_KEY = 'catcha.toasts';
export type ToastPref = Record<NoticeKind, boolean>;
export const DEFAULT_TOAST_PREF: ToastPref = { info: true, success: true, gold: true, warn: true };

export function loadToastPref(storage: Pick<Storage, 'getItem'> | null): ToastPref {
  try {
    const raw = storage?.getItem(TOAST_PREF_KEY);
    return raw ? { ...DEFAULT_TOAST_PREF, ...(JSON.parse(raw) as Partial<ToastPref>) } : { ...DEFAULT_TOAST_PREF };
  } catch { return { ...DEFAULT_TOAST_PREF }; }
}
