<script lang="ts">
  import { game } from '../state/game.svelte';
  import { itemName } from '../data/items';

  const items = $derived(
    Object.entries(game.save.inventory)
      .filter(([, n]) => n > 0)
      .sort(([a], [b]) => itemName(a).localeCompare(itemName(b))),
  );
</script>

<h2>Items</h2>
<p class="muted">Drops from defeated Pals. Base crafting will consume these later.</p>

{#if items.length === 0}
  <p class="muted">Empty.</p>
{:else}
  <table>
    <tbody>
      {#each items as [id, n] (id)}
        <tr><td>{itemName(id)}</td><td class="n">{n.toLocaleString()}</td></tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.3rem 0.25rem; border-bottom: 1px solid var(--border); }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
</style>
