<script lang="ts">
  import { game } from '../state/game.svelte';
  import { PALS, paldeckNumber, paldeckOrder } from '../data/pals';
  import PalIcon from './PalIcon.svelte';
  import PalDetail from './PalDetail.svelte';

  let selected = $state<number | null>(null);
  let query = $state('');

  const entries = $derived(
    [...PALS].sort((a, b) => paldeckOrder(a) - paldeckOrder(b)).map((def) => {
      const e = game.save.paldeck[def.id];
      return { def, seen: !!e?.seen, caught: e?.caught ?? 0 };
    }),
  );
  const caughtCount = $derived(entries.filter((e) => e.caught > 0).length);
  const shown = $derived(entries.filter((e) => !query || (e.seen && e.def.name.toLowerCase().includes(query.toLowerCase()))));
</script>

<div class="row">
  <h2 class="grow">Paldeck <span class="muted">{caughtCount} / {PALS.length}</span></h2>
  <input placeholder="Filter…" bind:value={query} />
</div>
<p class="muted small">Click a Pal for its habitat and breeding recipes.</p>

{#if selected !== null}<PalDetail palId={selected} onclose={() => (selected = null)} onselect={(id) => (selected = id)} />{/if}

<div class="grid">
  {#each shown as { def, seen, caught } (def.id)}
    <button class="entry" class:caught={caught > 0} class:seen={seen && caught === 0} onclick={() => (selected = def.id)}>
      <PalIcon palId={def.id} size={44} unknown={!seen} />
      <div class="num">{paldeckNumber(def)}</div>
      <div class="name">{seen ? def.name : '???'}</div>
      {#if caught > 0}<div class="muted small">×{caught}</div>{/if}
    </button>
  {/each}
</div>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; }
  .entry { text-align: center; padding: 0.5rem 0.25rem; border-radius: 8px; border: 1px solid var(--border); opacity: 0.45; background: transparent; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
  .entry:hover { opacity: 1; border-color: var(--accent); }
  .entry.seen { opacity: 0.75; }
  .entry.caught { opacity: 1; border-color: var(--ok); }
  .num { font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem; }
  .name { font-size: 0.85rem; }
  .small { font-size: 0.75rem; }
</style>
