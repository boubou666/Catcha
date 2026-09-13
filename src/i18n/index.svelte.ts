import { MESSAGES, type Locale } from './messages';
import { prefs } from '../state/prefs.svelte';

/** Translate a UI string for the current language; reads prefs.lang so templates re-render on change. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const lang: Locale = prefs.lang;
  let s = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** A translation if one exists, else the given English fallback (for data strings like tutorial steps). */
export function tOr(key: string, fallback: string): string {
  return MESSAGES[prefs.lang][key] ?? fallback;
}
