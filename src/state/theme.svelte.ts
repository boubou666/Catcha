/** Appearance: dark HUD (default), light HUD, or follow the system. Per device, localStorage `catcha.theme`. */
export type ThemeChoice = 'dark' | 'light' | 'system';
const KEY = 'catcha.theme';
const META: Record<'dark' | 'light', string> = { dark: '#0f1f34', light: '#8fd3f4' };

class Theme {
  choice = $state<ThemeChoice>(load());

  /** What is actually applied right now. */
  get effective(): 'dark' | 'light' {
    if (this.choice !== 'system') return this.choice;
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  set(choice: ThemeChoice) {
    this.choice = choice;
    try { localStorage.setItem(KEY, choice); } catch { /* ignore */ }
    this.apply();
  }

  /** Stamp the root element and the browser chrome colour; re-run when the system preference changes. */
  apply() {
    if (typeof document === 'undefined') return;
    const eff = this.effective;
    document.documentElement.dataset.theme = eff;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[eff]);
  }

  /** Call once at startup: applies and keeps following the system setting. Returns a disposer. */
  start(): () => void {
    this.apply();
    if (typeof matchMedia === 'undefined') return () => {};
    const mq = matchMedia('(prefers-color-scheme: light)');
    const onChange = () => { if (this.choice === 'system') this.apply(); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }
}

function load(): ThemeChoice {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'system' ? v : 'dark'; } catch { return 'dark'; }
}

export const theme = new Theme();
