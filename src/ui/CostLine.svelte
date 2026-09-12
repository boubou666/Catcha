<script lang="ts">
  // "10 Wood · 5 Stone · 150 gold" with unaffordable parts highlighted.
  import { game } from '../state/game.svelte';
  import { itemName } from '../data/items';
  import { countOf, GOLD, type Cost } from '../engine/inventory';
  import ItemIcon from './ItemIcon.svelte';

  let { cost, times = 1 }: { cost: Cost; times?: number } = $props();
  const parts = $derived(
    Object.entries(cost).map(([id, n]) => ({
      id, need: n * times, have: countOf(game.save, id),
      label: id === GOLD ? '💰' : itemName(id),
    })),
  );
</script>

<div class="cost">
  {#each parts as p, i}
    {#if i > 0}<span class="muted"> · </span>{/if}
    <span class="part" class:short={p.have < p.need} title="{p.label}: {p.have} / {p.need}">{p.need}<ItemIcon id={p.id} size={16} /></span>
  {/each}
</div>

<style>
  .cost { font-size: 0.8rem; color: var(--muted); margin-top: 0.2rem; }
  .short { color: var(--danger); }
  .part { display: inline-flex; align-items: center; gap: 0.15rem; }
</style>
