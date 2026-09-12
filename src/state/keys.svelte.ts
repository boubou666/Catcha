import { BINDINGS_KEY, DEFAULT_BINDINGS, loadBindings, serializeBindings, type ActionId, type Binding, type Bindings } from '../engine/shortcuts';

/** The player's key bindings (per device, localStorage `catcha.keys`). */
class KeyBindings {
  bindings = $state<Bindings>(loadBindings(typeof localStorage === 'undefined' ? null : localStorage));

  set(id: ActionId, b: Binding | null) {
    this.bindings = { ...this.bindings, [id]: b };
    this.persist();
  }
  reset(id?: ActionId) {
    this.bindings = id ? { ...this.bindings, [id]: DEFAULT_BINDINGS[id] } : { ...DEFAULT_BINDINGS };
    this.persist();
  }
  private persist() {
    try { localStorage.setItem(BINDINGS_KEY, serializeBindings(this.bindings)); } catch { /* ignore */ }
  }
}

export const keys = new KeyBindings();
