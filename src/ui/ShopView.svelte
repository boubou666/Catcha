<script lang="ts">
  import { game } from '../state/game.svelte';
  import { SPHERES } from '../data/spheres';
  import { sphereVsWild, pct } from './catchText';
  import { SPHERE_TIERS } from '../data/types';
  import { STOCK, SELL_SHARE } from '../data/shop';
  import { describeRequirement } from '../engine/progress';
  import { DEFAULT_SHOP_FILTER, filterSellable, filterStock, isShopFiltering, SHOP_SORT_LABEL, type ShopFilter } from '../engine/shop';
  import { CATEGORY_LABEL } from '../engine/itemsfilter';
  import ItemIcon from './ItemIcon.svelte';

  const save = $derived(game.save);
  const gold = $derived(save.player.gold);

  let side = $state<'buy' | 'sell'>('buy');
  let filter = $state<ShopFilter>({ ...DEFAULT_SHOP_FILTER });
  let open = $state(false);
  const stock = $derived(filterStock(save, filter));
  const sellable = $derived(filterSellable(save, filter));
  const sellableTotal = $derived(filterSellable(save, DEFAULT_SHOP_FILTER).length);
  const filtering = $derived(isShopFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_SHOP_FILTER, sort: filter.sort }; };
  const fmt = (n: number) => n.toLocaleString();
</script>

<div class="row">
  <h2 class="grow">Wandering Merchant</h2>
  <span class="gold">💰 {fmt(gold)}</span>
</div>
<p class="muted small">Spheres and supplies for gold; drops and produce sold back. Stock opens up as you progress.</p>

<div class="row">
  <nav class="sides">
    <button class:active={side === 'buy'} onclick={() => (side = 'buy')}>Buy <span class="muted">{filtering && side === 'buy' ? `${stock.length} of ${STOCK.length}` : STOCK.length}</span></button>
    <button class:active={side === 'sell'} onclick={() => (side = 'sell')}>Sell <span class="muted">{filtering && side === 'sell' ? `${sellable.length} of ${sellableTotal}` : sellableTotal}</span></button>
  </nav>
  <input type="search" placeholder="Search items…" bind:value={filter.query} aria-label="Search the merchant" />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>Filters{filtering ? ' •' : ''}</button>
</div>
{#if open}
  <div class="filters">
    <select bind:value={filter.category} aria-label="Category">
      <option value="any">Any category</option>
      {#each Object.entries(CATEGORY_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.sort} aria-label="Sort">
      {#each Object.entries(SHOP_SORT_LABEL) as [k, label]}<option value={k}>Sort: {label}</option>{/each}
    </select>
    {#if side === 'buy'}
      <label class="chk"><input type="checkbox" bind:checked={filter.affordable} /> Affordable now</label>
      <label class="chk"><input type="checkbox" bind:checked={filter.hideLocked} /> Hide locked</label>
    {/if}
    {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
  </div>
{/if}

{#if side === 'buy'}
  {#if stock.length === 0}<p class="muted">Nothing matches. <button class="small" onclick={clear}>Clear filters</button></p>{/if}
  <div class="list">
    {#each stock as it (it.itemId)}
      <div class="row item" class:locked={!it.unlocked}>
        <ItemIcon id={it.itemId} size={34} />
        <div class="grow">
          <b>{it.name}</b> <span class="muted small">{CATEGORY_LABEL[it.category]}{it.owned ? ` · you have ${fmt(it.owned)}` : ''}</span>
          {#if it.itemId.startsWith('sphere_')}{@const tier = it.itemId.slice(7) as typeof SPHERE_TIERS[number]}<span class="muted small">· ×{SPHERES[tier].mult} catch rate</span> <span class="odds small">🎯 {sphereVsWild(game.save, game.wild, tier)}</span>{/if}
          {#if !it.unlocked}<div class="muted small">🔒 {describeRequirement(it.unlock)}</div>{/if}
        </div>
        <span class="price">{fmt(it.price)} 💰</span>
        <button class="small" disabled={!it.unlocked || gold < it.price} onclick={() => game.buyItem(it.itemId, 1)}>Buy 1</button>
        <button class="small" disabled={!it.unlocked || gold < it.price * 10} onclick={() => game.buyItem(it.itemId, 10)}>Buy 10</button>
      </div>
    {/each}
  </div>
{:else}
  <p class="muted small">The merchant pays {pct(SELL_SHARE)} of the buy price for stocked goods and fixed rates for drops. Spheres, slabs and keys aren't taken.</p>
  {#if sellableTotal === 0}
    <p class="muted">Nothing to sell yet — defeat Pals for drops or put Farming Pals on a Ranch.</p>
  {:else if sellable.length === 0}
    <p class="muted">Nothing matches. <button class="small" onclick={clear}>Clear filters</button></p>
  {/if}
  <div class="list">
    {#each sellable as it (it.itemId)}
      <div class="row item">
        <ItemIcon id={it.itemId} size={34} />
        <div class="grow">
          <b>{it.name}</b> <span class="muted small">{CATEGORY_LABEL[it.category]} · you have {fmt(it.owned)}</span>
        </div>
        <span class="price">{fmt(it.price)} 💰 <span class="muted small">each</span></span>
        <button class="small" onclick={() => game.sellItem(it.itemId, 1)}>Sell 1</button>
        <button class="small" disabled={it.owned < 10} onclick={() => game.sellItem(it.itemId, 10)}>Sell 10</button>
        <button class="small" onclick={() => game.sellItem(it.itemId, it.owned)} title="Sell everything: +{fmt(it.price * it.owned)} gold">All</button>
      </div>
    {/each}
  </div>
{/if}

<p class="muted small">Which sphere gets thrown, and whether to throw at species you already own, is under <b>Settings → Catching</b>.</p>

<style>
  .gold { font-weight: 600; color: var(--accent); }
  .sides { display: flex; gap: 0.25rem; }
  .sides button.active { background: var(--accent-2); color: #fff; }
  .sides button.active .muted { color: #fff; opacity: 0.8; }
  .list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 50vh; overflow-y: auto; }
  .item { padding: 0.5rem; border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); }
  .item.locked { opacity: 0.6; }
  .price { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .small { font-size: 0.8rem; }
  input[type='search'] { min-width: 8rem; flex: 1; max-width: 14rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; flex-direction: row; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
