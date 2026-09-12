/** Cross-view intents: something (global search) wants a view to open on a specific thing. Consumed once. */
class UiIntents {
  paldeckSelect = $state<number | null>(null);
  boxQuery = $state<string | null>(null);

  takePaldeck(): number | null { const v = this.paldeckSelect; this.paldeckSelect = null; return v; }
  takeBoxQuery(): string | null { const v = this.boxQuery; this.boxQuery = null; return v; }
}

export const ui = new UiIntents();
