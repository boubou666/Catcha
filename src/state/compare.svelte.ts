import { MAX_COMPARE } from '../engine/compare';

/** Pals picked for side-by-side comparison — shared by the Box (⚖ buttons) and the Compare tab. */
class CompareSelection {
  uids = $state<string[]>([]);

  has(uid: string) { return this.uids.includes(uid); }
  get full() { return this.uids.length >= MAX_COMPARE; }

  toggle(uid: string) {
    if (this.has(uid)) this.uids = this.uids.filter((u) => u !== uid);
    else if (!this.full) this.uids = [...this.uids, uid];
  }
  remove(uid: string) { this.uids = this.uids.filter((u) => u !== uid); }
  clear() { this.uids = []; }
}

export const compare = new CompareSelection();
