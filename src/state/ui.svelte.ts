/** Cross-view intents and small global UI state (global search, keyboard shortcuts). */
class UiIntents {
  paldeckSelect = $state<number | null>(null);
  boxQuery = $state<string | null>(null);
  focusSearch = $state(0);          // bump to ask the header search to take focus
  shortcutsOpen = $state(false);

  takePaldeck(): number | null { const v = this.paldeckSelect; this.paldeckSelect = null; return v; }
  takeBoxQuery(): string | null { const v = this.boxQuery; this.boxQuery = null; return v; }
}

export const ui = new UiIntents();
