<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import type { Snippet } from 'svelte';
  import { DEFAULT_FILTER, isFiltering, SORT_LABEL, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';
  import { ELEMENTS } from '../data/types';
  import { JOBS } from '../data/base';

  let { filter = $bindable(), heading, label = 'Search the Box', defaults = DEFAULT_FILTER, hideStatus = false }:
    { filter: BoxFilter; heading: Snippet; label?: string; defaults?: BoxFilter; hideStatus?: boolean } = $props();

  let open = $state(false);
  // relative to this bar's own defaults (the Party picker starts on idle Pals)
  const filtering = $derived(isFiltering(filter, defaults));
  const clear = () => { filter = { ...defaults, sort: filter.sort }; };
</script>

<div class="row">
  {@render heading()}
  <input type="search" placeholder={tr("Search name, #, element, passive…")} bind:value={filter.query} aria-label={label} />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>{tr("Filters")}{filtering ? ' •' : ''}</button>
</div>

{#if open}
  <div class="filters">
    <select bind:value={filter.element} aria-label={tr("Element")}>
      <option value="any">{tr("Any element")}</option>
      {#each ELEMENTS as e}<option value={e}>{e}</option>{/each}
    </select>
    <select bind:value={filter.work} aria-label={tr("Work suitability")}>
      <option value="any">{tr("Any work")}</option>
      {#each JOBS as j}<option value={j.type}>{j.icon} {j.type}</option>{/each}
    </select>
    {#if !hideStatus}
      <select bind:value={filter.status} aria-label={tr("Status")}>
        {#each Object.entries(STATUS_LABEL) as [k, text]}<option value={k}>{text}</option>{/each}
      </select>
    {/if}
    <select bind:value={filter.sort} aria-label={tr("Sort")}>
      {#each Object.entries(SORT_LABEL) as [k, text]}<option value={k}>{tr("Sort:")} {text}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.lucky} /> {tr("✨ Lucky")}</label>
    <label class="chk"><input type="checkbox" bind:checked={filter.starred} /> {tr("★ Starred")}</label>
    <label class="chk"><input type="checkbox" bind:checked={filter.dupes} /> {tr("Duplicates")}</label>
    {#if filtering}<button class="small" onclick={clear}>{tr("Clear")}</button>{/if}
  </div>
{/if}

<style>
  .small { font-size: 0.8rem; }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
