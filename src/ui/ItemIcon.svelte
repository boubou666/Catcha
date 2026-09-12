<script lang="ts">
  // An item's wiki icon from public/items/<id>.png; falls back to a small labelled disc if missing.
  import { itemName } from '../data/items';

  let { id, size = 22, label = false }: { id: string; size?: number; label?: boolean } = $props();
  let failed = $state(false);
  const src = $derived(`${import.meta.env.BASE_URL}items/${id}.png`);
  const name = $derived(id === 'gold' ? 'Gold' : itemName(id));
  const isGold = $derived(id === 'gold');
</script>

<span class="item" title={name}>
  {#if isGold}
    <span class="disc gold" style:width="{size}px" style:height="{size}px" style:font-size="{size * 0.6}px">💰</span>
  {:else if failed}
    <span class="disc" style:width="{size}px" style:height="{size}px" style:font-size="{size * 0.45}px">{name.slice(0, 2)}</span>
  {:else}
    <img {src} alt={name} width={size} height={size} draggable="false" onerror={() => (failed = true)} />
  {/if}
  {#if label}<span class="name">{name}</span>{/if}
</span>

<style>
  .item { display: inline-flex; align-items: center; gap: 0.3rem; vertical-align: middle; }
  img { object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4)); }
  .disc { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--panel-2); border: 1px solid var(--border-soft); font-weight: 800; flex-shrink: 0; line-height: 1; }
  .disc.gold { background: transparent; border: none; }
</style>
