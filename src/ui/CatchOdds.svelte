<script lang="ts">
  // "🎯 36%" for a species under the current sphere policy, or a greyed dash with the reason; jumps to Settings → Catching.
  import { game } from '../state/game.svelte';
  import { ui } from '../state/ui.svelte';
  import { palById } from '../data/pals';
  import { catchPreview } from '../engine/catch';
  import { catchText } from './catchText';

  let { palId, alpha = false, prefix }: { palId: number; alpha?: boolean; prefix?: string } = $props();
  const pv = $derived(catchPreview(game.save, palId, false, alpha));
  const tip = $derived(`${prefix ?? `Catching another ${palById(palId).name}`}: ${catchText(pv)}`);
</script>

<button class="small odds" class:no={!pv.throws} onclick={() => (ui.requestTab = 'settings')} title={tip}>
  🎯 {pv.throws ? `${Math.round(pv.chance * 100)}%` : '—'}
</button>

<style>
  .small { font-size: 0.8rem; }
  .odds { color: var(--accent-2); font-weight: 700; font-variant-numeric: tabular-nums; }
  .odds.no { color: var(--muted); font-weight: 400; }
</style>
