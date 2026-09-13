import type { SaveState } from '../data/types';
import { PALS, palById } from '../data/pals';
import { ITEMS, itemName } from '../data/items';
import { RECIPES } from '../data/base';
import { TECHS } from '../data/tech';
import { ACHIEVEMENTS } from '../data/achievements';
import { PRESTIGE_UPGRADES } from '../data/prestige';
import { SETTINGS_SECTIONS } from './settingsfilter';
import { reachableRegions } from './routefilter';
import { allBosses } from './bossfilter';
import { catchPreview } from './catch';

const oddsTag = (save: SaveState, palId: number) => { const pv = catchPreview(save, palId); return pv.throws ? `🎯 ${Math.round(pv.chance * 100)}%` : '🎯 —'; };
import { isUnlocked } from './progress';

export type SearchKind = 'tab' | 'pal' | 'species' | 'route' | 'boss' | 'item' | 'recipe' | 'tech' | 'upgrade' | 'achievement' | 'setting';
export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  tab: 'Tabs', pal: 'Your Pals', species: 'Paldeck', route: 'Routes', boss: 'Bosses', item: 'Items', recipe: 'Recipes',
  tech: 'Tech', upgrade: 'Ascension', achievement: 'Achievements', setting: 'Settings',
};
export const SEARCH_KINDS = Object.keys(SEARCH_KIND_LABEL) as SearchKind[];

/** What picking a result does: switch to a tab, and optionally travel / open a Paldeck entry / pre-fill the Box search. */
export interface SearchAction { tab: string; travel?: string; paldeck?: number; boxQuery?: string }
export interface SearchResult { kind: SearchKind; id: string; title: string; subtitle: string; action: SearchAction }

export interface TabEntry { id: string; label: string; group: string }

const PER_KIND = 5;
const TOTAL = 30;

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const hit = (ws: string[], ...parts: string[]) => { const hay = parts.join(' ').toLowerCase(); return ws.every((w) => hay.includes(w)); };

/**
 * Everything the query can reach, best kinds first, at most PER_KIND per kind and TOTAL overall.
 * Unseen species only match by Paldeck number, as everywhere else.
 */
export function globalSearch(save: SaveState, query: string, tabs: TabEntry[], kind: SearchKind | 'any' = 'any'): SearchResult[] {
  const ws = words(query);
  if (ws.length === 0) return [];
  const out: SearchResult[] = [];
  const want = (k: SearchKind) => kind === 'any' || kind === k;
  const push = (r: SearchResult) => { if (out.filter((x) => x.kind === r.kind).length < PER_KIND) out.push(r); };

  if (want('tab')) for (const t of tabs) if (hit(ws, t.label, t.group)) push({ kind: 'tab', id: t.id, title: t.label, subtitle: t.group, action: { tab: t.id } });

  if (want('pal')) for (const p of save.box) {
    const def = palById(p.palId);
    if (hit(ws, def.name, def.no, ...def.elements, `lv ${p.level}`, p.lucky ? 'lucky' : ''))
      push({ kind: 'pal', id: p.uid, title: `${def.name} Lv ${p.level}${p.stars ? ' ' + '★'.repeat(p.stars) : ''}${p.lucky ? ' ✨' : ''}`, subtitle: 'In your Box', action: { tab: 'box', boxQuery: def.name } });
  }

  if (want('species')) for (const def of PALS) {
    const e = save.paldeck[def.id];
    const seen = !!e?.seen;
    if (seen ? hit(ws, def.name, def.no, ...def.elements) : hit(ws, def.no))
      push({ kind: 'species', id: String(def.id), title: seen ? def.name : `??? #${def.no}`, subtitle: seen ? `#${def.no} · ${def.elements.join('/')}${(e?.caught ?? 0) > 0 ? ' · caught' : ' · seen'} · ${oddsTag(save, def.id)}` : 'Paldeck entry', action: { tab: 'paldeck', paldeck: def.id } });
  }

  if (want('route')) for (const region of reachableRegions(save)) for (const r of region.routes) {
    if (hit(ws, r.name, region.name, r.dominant, `lv ${r.level}`)) {
      const open = isUnlocked(save, r.unlock);
      push({ kind: 'route', id: r.id, title: r.name, subtitle: `${region.name} · Lv ${r.level}${open ? '' : ' · 🔒'}`, action: open ? { tab: 'routes', travel: r.id } : { tab: 'routes' } });
    }
  }

  if (want('boss')) for (const b of allBosses(save)) if (hit(ws, b.name, b.regionName, ...b.elements, `lv ${b.level}`))
    push({ kind: 'boss', id: `${b.kind}:${b.id}`, title: b.name, subtitle: `${b.regionName} · Lv ${b.level} · ${b.status}`, action: { tab: 'bosses' } });

  if (want('item')) for (const it of ITEMS) {
    const n = save.inventory[it.id] ?? 0;
    if (n > 0 && hit(ws, it.name, it.category)) push({ kind: 'item', id: it.id, title: it.name, subtitle: `×${n.toLocaleString()} · ${it.category}`, action: { tab: 'items' } });
  }

  if (want('recipe')) for (const r of RECIPES) if (hit(ws, r.name, ...Object.keys(r.inputs).map(itemName)))
    push({ kind: 'recipe', id: r.id, title: r.name, subtitle: `Craft · ${Object.entries(r.inputs).map(([id, n]) => `${n} ${itemName(id)}`).join(', ')}`, action: { tab: 'craft' } });

  if (want('tech')) for (const t of TECHS) if (hit(ws, t.name, t.desc))
    push({ kind: 'tech', id: t.id, title: t.name, subtitle: `Tech Lv ${t.level} · ${t.cost} TP${save.tech.includes(t.id) ? ' · researched' : ''}`, action: { tab: 'tech' } });

  if (want('upgrade')) for (const u of PRESTIGE_UPGRADES) if (hit(ws, u.name, u.desc))
    push({ kind: 'upgrade', id: u.id, title: u.name, subtitle: `Ascension · Lv ${save.prestige.upgrades[u.id] ?? 0} / ${u.maxLevel}`, action: { tab: 'prestige' } });

  if (want('achievement')) for (const a of ACHIEVEMENTS) if (hit(ws, a.name, a.desc))
    push({ kind: 'achievement', id: a.id, title: a.name, subtitle: `${a.desc}${save.achievements.includes(a.id) ? ' · ✓' : ''}`, action: { tab: 'achievements' } });

  if (want('setting')) for (const s of SETTINGS_SECTIONS) if (hit(ws, s.title, ...s.keywords))
    push({ kind: 'setting', id: s.id, title: s.title, subtitle: 'Settings', action: { tab: 'settings' } });

  return out.slice(0, TOTAL);
}
