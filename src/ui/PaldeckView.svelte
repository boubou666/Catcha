<script lang="ts">
  import { game } from '../state/game.svelte';
  import { PALS, paldeckNumber } from '../data/pals';
  import PalIcon from './PalIcon.svelte';

  const entries = $derived(
    [...PALS].sort((a, b) => (a.variantOf ?? a.id) - (b.variantOf ?? b.id) || a.id - b.id).map((def) => {
      const e = game.save.paldeck[def.id];
      return { def, seen: !!e?.seen, caught: e?.caught ?? 0 };
    }),
  );
  const caughtCount = $derived(entries.filter((e) => e.caught > 0).length);
</script>

<h2>Paldeck <span class="muted">{caughtCount} / {PALS.length}</span></h2>

<div class="grid">
  {#each entries as { def, seen, caught } (def.id)}
    <div class="entry" class:caught={caught > 0} class:seen={seen && caught === 0}>
      <PalIcon palId={def.id} size={44} unknown={!seen} />
      <div class="num">{paldeckNumber(def)}</div>
      <div class="name">{seen ? def.name : '???'}</div>
      {#if caught > 0}<div class="muted small">×{caught}</div>{/if}
    </div>
  {/each}
</div>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; }
  .entry { text-align: center; padding: 0.5rem 0.25rem; border-radius: 8px; border: 1px solid var(--border); opacity: 0.45; }
  .entry.seen { opacity: 0.75; }
  .entry.caught { opacity: 1; border-color: var(--ok); }
  .num { font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem; }
  .name { font-size: 0.85rem; }
  .small { font-size: 0.75rem; }
</style>
