import { CHANGELOG, LATEST_VERSION, type ChangelogEntry } from '../data/changelog';

const KEY = 'catcha.changelog';   // last changelog version the player has seen, per device

class WhatsNew {
  open = $state(false);
  entries = $state<ChangelogEntry[]>([]);

  /** On startup: first run marks everything seen; otherwise show what's newer than the last seen version. */
  init() {
    let seen: string | null = null;
    try { seen = localStorage.getItem(KEY); } catch { /* ignore */ }
    if (!seen) { this.markSeen(); return; }
    if (seen === LATEST_VERSION) return;
    const idx = CHANGELOG.findIndex((e) => e.version === seen);
    this.entries = idx > 0 ? CHANGELOG.slice(0, idx) : CHANGELOG;
    this.open = true;
  }

  /** Open the full history on demand. */
  showAll() {
    this.entries = CHANGELOG;
    this.open = true;
  }

  close() {
    this.open = false;
    this.markSeen();
  }

  private markSeen() {
    try { localStorage.setItem(KEY, LATEST_VERSION); } catch { /* ignore */ }
  }
}

export const whatsNew = new WhatsNew();
