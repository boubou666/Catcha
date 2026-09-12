<script lang="ts">
  import { game } from '../state/game.svelte';
  import { CATEGORY_LABEL, DEFAULT_ITEMS_FILTER, filterItems, isItemsFiltering, ITEMS_SORT_LABEL, type ItemsFilter } from '../engine/itemsfilter';
  import ItemIcon from './ItemIcon.svelte';

  let filter = $state<ItemsFilter>({ ...DEFAULT_ITEMS_FILTER });
  let open = $state(false);
  const items = $derived(filterItems(game.save, filter));
  const owned = $derived(Object.values(game.save.inventory).filter((n) => n > 0).length);
  const filtering = $derived(isItemsFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_ITEMS_FILTER, sort: filter.sort }; };
  const list = (xs: string[], max = 4) => xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} +${xs.length - max}`;
</script>

<div class="row">
  <h2 class="grow">Items <span class="muted">{filtering ? `${items.length} of ${owned}` : owned}</span></h2>
  <input type="search" placeholder="Search name, source, use…" bind:value={filter.query} aria-label="Search items" />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>Filters{filtering ? ' •' : ''}</button>
</div>

{#if open}
  <div class="filters">
    <select bind:value={filter.category} aria-label="Category">
      <option value="any">Any category</option>
      {#each Object.entries(CATEGORY_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.sort} aria-label="Sort">
      {#each Object.entries(ITEMS_SORT_LABEL) as [k, label]}<option value={k}>Sort: {label}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.usedOnly} /> Used in crafting or building</label>
    <label class="chk"><input type="checkbox" bind:checked={filter.showMissing} /> Show items I don't have</label>
    {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
  </div>
{/if}
<p class="muted small">Drops, base output and crafted goods. Each row says where it comes from and what consumes it.</p>

{#if items.length === 0}
  {#if owned === 0 && !filtering}
    <p class="muted">Empty. Defeat Pals for drops, or put workers at the base.</p>
  {:else}
    <p class="muted">No item matches. <button class="small" onclick={clear}>Clear filters</button></p>
  {/if}
{:else}
  <table>
    <tbody>
      {#each items as it (it.def.id)}
        <tr class:none={it.count === 0}>
          <td class="iconcell"><ItemIcon id={it.def.id} size={30} /></td>
          <td>
            <div>{it.def.name} <span class="cat muted">{CATEGORY_LABEL[it.def.category]}</span></div>
            {#if it.sources.length}<div class="muted tiny">From: {list(it.sources)}</div>{/if}
            {#if it.uses.length}<div class="muted tiny">For: {list(it.uses)}</div>{/if}
          </td>
          <td class="n">{it.count.toLocaleString()}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.35rem 0.25rem; border-bottom: 1.5px solid var(--border-soft); vertical-align: top; }
  tr.none { opacity: 0.55; }
  .iconcell { width: 2.4rem; padding-right: 0; }
  .n { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
  .cat { font-size: 0.75rem; margin-left: 0.3rem; }
  .tiny { font-size: 0.75rem; }
  .small { font-size: 0.8rem; }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
