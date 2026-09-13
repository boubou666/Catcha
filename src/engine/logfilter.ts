export type LogKind = 'combat' | 'catch' | 'base' | 'breeding' | 'quest' | 'world' | 'shop' | 'system';

export interface LogEntry {
  at: number;
  kind: LogKind;
  text: string;
  chance?: number;             // catch odds attached to this line (a throw's, or a boss's on arrival)
  landed?: boolean;            // for a throw: did it catch
  msg?: LogMessage;            // the same line as a template + values, for translation
}

export interface LogMessage { key: string; vars?: Record<string, string | number> }

/** Fill a template's {name} slots. */
export function fillTemplate(key: string, vars?: Record<string, string | number>): string {
  let s = key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Realized vs expected odds over the throws among these entries (lines with a chance and a landed flag). */
export function catchSummary(entries: LogEntry[]): { throws: number; caught: number; rate: number; expected: number } | null {
  const throws = entries.filter((e) => e.chance !== undefined && e.landed !== undefined);
  if (throws.length === 0) return null;
  const caught = throws.filter((e) => e.landed).length;
  return { throws: throws.length, caught, rate: caught / throws.length, expected: throws.reduce((s, e) => s + e.chance!, 0) / throws.length };
}

export const LOG_KIND_LABEL: Record<LogKind, string> = {
  combat: 'Combat', catch: 'Catching', base: 'Base', breeding: 'Breeding', quest: 'Quests & achievements',
  world: 'Expeditions & realms', shop: 'Merchant', system: 'System',
};
export const LOG_KINDS = Object.keys(LOG_KIND_LABEL) as LogKind[];

/** Category from the message text, so call sites don't have to tag every line. Order matters. */
export function classifyLog(text: string): LogKind {
  const t = text.toLowerCase();
  if (/^(bought|sold) /.test(t)) return 'shop';
  if (/achievement|quest|daily bonus|new day/.test(t)) return 'quest';
  if (/egg|hatched|breeding|condensed|paired/.test(t)) return 'breeding';
  if (/expedition|sealed realm|realm|entered |left |success|failed|withdrew|altar|slab/.test(t)) return 'world';
  if (/built|researched|queued|assigned|dismissed|workbench|worker/.test(t)) return 'base';
  if (/caught|broke free|got away|sphere/.test(t)) return 'catch';
  if (/defeated|appears|retreat|time's up|alpha|tower|raid|ascension|ancient upgrade|on the clock/.test(t)) return 'combat';
  return 'system';
}

export interface LogFilter { query: string; kind: LogKind | 'any' }
export const DEFAULT_LOG_FILTER: LogFilter = { query: '', kind: 'any' };

export function isLogFiltering(f: LogFilter): boolean {
  return f.query.trim() !== '' || f.kind !== 'any';
}

/** Entries (newest first, as stored) matching the kind and every search word; `render` gives the text as shown (the translated one). */
export function filterLog(entries: LogEntry[], f: LogFilter, render: (e: LogEntry) => string = (e) => e.text): LogEntry[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => (f.kind === 'any' || e.kind === f.kind) && words.every((w) => render(e).toLowerCase().includes(w)));
}
