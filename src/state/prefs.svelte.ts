/** Small per-device display preferences (localStorage), separate from the save. */
const KEY = 'catcha.prefs';

interface Prefs { showOdds: boolean }   // the 🎯 chips in Pal lists, cards and spawn tables
const DEFAULTS: Prefs = { showOdds: true };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

class PrefStore {
  showOdds = $state(load().showOdds);

  setShowOdds(on: boolean) {
    this.showOdds = on;
    try { localStorage.setItem(KEY, JSON.stringify({ showOdds: on } satisfies Prefs)); } catch { /* ignore */ }
  }
}

export const prefs = new PrefStore();
