/** Cross-view intents and small global UI state (global search, keyboard shortcuts, toggled panels). */
class UiIntents {
  paldeckSelect = $state<number | null>(null);
  boxQuery = $state<string | null>(null);
  focusSearch = $state(0);          // bump to ask the header search to take focus
  shortcutsOpen = $state(false);
  notificationsOpen = $state(false);
  spawnListOpen = $state(false);
  requestTab = $state<string | null>(null);   // a view asks the app to switch tabs
  mapFocus = $state<{ kind: string; id: string } | null>(null);   // a view asks the map to open on a pin

  /** Open the map on a pin: the Routes panel switches to the map and unfolds; on a phone the World tab opens. */
  showOnMap(kind: string, id: string) { this.mapFocus = { kind, id }; this.requestTab = 'routes'; }

  takePaldeck(): number | null { const v = this.paldeckSelect; this.paldeckSelect = null; return v; }
  takeBoxQuery(): string | null { const v = this.boxQuery; this.boxQuery = null; return v; }
}

export const ui = new UiIntents();
