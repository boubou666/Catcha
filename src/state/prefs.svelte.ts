/** Small per-device display preferences (localStorage), separate from the save. */
const KEY = 'catcha.prefs';

interface Prefs {
  showOdds: boolean;             // the 🎯 chips in Pal lists, cards and spawn tables
  routesView: 'list' | 'map';    // how the Routes panel shows the world
  routesOpen: boolean;           // false = the panel is folded to one line
  lang: 'en' | 'fr';             // UI language
}
const DEFAULTS: Prefs = { showOdds: true, routesView: 'map', routesOpen: true, lang: 'en' };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

class PrefStore {
  showOdds = $state(load().showOdds);
  routesView = $state<Prefs['routesView']>(load().routesView);
  routesOpen = $state(load().routesOpen);
  lang = $state<Prefs['lang']>(load().lang);

  private persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ showOdds: this.showOdds, routesView: this.routesView, routesOpen: this.routesOpen, lang: this.lang } satisfies Prefs)); } catch { /* ignore */ }
  }
  setShowOdds(on: boolean) { this.showOdds = on; this.persist(); }
  setRoutesView(v: Prefs['routesView']) { this.routesView = v; this.persist(); }
  setRoutesOpen(on: boolean) { this.routesOpen = on; this.persist(); }
  setLang(l: Prefs['lang']) { this.lang = l; this.persist(); document.documentElement.lang = l; }
}

export const prefs = new PrefStore();
