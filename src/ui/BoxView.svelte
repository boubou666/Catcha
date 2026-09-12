<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { PARTY_SIZE } from '../engine/formulas';
  import { structureLevel } from '../engine/base';
  import { condenseBlocker, condenseCandidates, condenseCost, CONDENSER, type CondenseBlock } from '../engine/condense';
  import { isBreeding } from '../engine/breeding';
  import { isAway } from '../engine/party';
  import PalCard from './PalCard.svelte';
  import { compare } from '../state/compare.svelte';
  import { DEFAULT_FILTER, filterBox, isFiltering, SORT_LABEL, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';
  import { ELEMENTS } from '../data/types';
  import { JOBS } from '../data/base';

  let filter = $state<BoxFilter>({ ...DEFAULT_FILTER });
  let showFilters = $state(false);
  const sorted = $derived(filterBox(game.save, filter));
  const filtering = $derived(isFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_FILTER, sort: filter.sort }; };
  const partyFull = $derived(game.save.party.length >= PARTY_SIZE);
  const hasCondenser = $derived(structureLevel(game.save, CONDENSER) > 0);

  const BLOCK_TEXT: Record<CondenseBlock, string> = {
    'no-condenser': 'Build the Pal Essence Condenser at your base',
    'max-stars': 'Already at 4 stars',
    'not-enough': 'Not enough idle, unstarred duplicates',
  };
</script>

<div class="row">
  <h2 class="grow">Box <span class="muted">{filtering ? `${sorted.length} of ${game.save.box.length}` : game.save.box.length}</span></h2>
  <input type="search" placeholder="Search name, #, element, passive…" bind:value={filter.query} aria-label="Search the Box" />
  <button class="small" class:active={showFilters || filtering} onclick={() => (showFilters = !showFilters)} aria-expanded={showFilters}>Filters{filtering ? ' •' : ''}</button>
</div>

{#if showFilters}
  <div class="filters">
    <select bind:value={filter.element} aria-label="Element">
      <option value="any">Any element</option>
      {#each ELEMENTS as e}<option value={e}>{e}</option>{/each}
    </select>
    <select bind:value={filter.work} aria-label="Work suitability">
      <option value="any">Any work</option>
      {#each JOBS as j}<option value={j.type}>{j.icon} {j.type}</option>{/each}
    </select>
    <select bind:value={filter.status} aria-label="Status">
      {#each Object.entries(STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.sort} aria-label="Sort">
      {#each Object.entries(SORT_LABEL) as [k, label]}<option value={k}>Sort: {label}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.lucky} /> ✨ Lucky</label>
    <label class="chk"><input type="checkbox" bind:checked={filter.starred} /> ★ Starred</label>
    <label class="chk"><input type="checkbox" bind:checked={filter.dupes} /> Duplicates</label>
    {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
  </div>
{/if}

{#if game.save.box.length === 0}
  <p class="muted">Nothing here yet. Defeat wild Pals with a Pal Sphere in stock to catch them.</p>
{:else if sorted.length === 0}
  <p class="muted">No Pal matches. <button class="small" onclick={clear}>Clear filters</button></p>
{:else if !hasCondenser}
  <p class="muted small">Duplicates pile up? The <b>Pal Essence Condenser</b> (Base → Structures) turns them into ★ stars: +10% attack and work each.</p>
{/if}

<div class="list">
  {#each sorted as inst (inst.uid)}
    {@const inParty = game.save.party.includes(inst.uid)}
    {@const cost = condenseCost(inst)}
    {@const block = condenseBlocker(game.save, inst)}
    {@const dupes = condenseCandidates(game.save, inst).length}
    <PalCard {inst} showWork>
      {#if game.save.base.workers.includes(inst.uid)}<span class="muted small">at base</span>{/if}
      {#if isBreeding(game.save, inst.uid)}<span class="muted small">breeding</span>{/if}
      {#if isAway(game.save, inst.uid)}<span class="muted small">on expedition</span>{/if}
      <button class="small" class:cmp-on={compare.has(inst.uid)} disabled={!compare.has(inst.uid) && compare.full} onclick={() => compare.toggle(inst.uid)} title={compare.has(inst.uid) ? 'Remove from comparison' : 'Add to comparison (Compare tab)'}>⚖</button>
      {#if cost !== null}
        <button class="small star" class:ready={!block} disabled={!!block} onclick={() => game.condense(inst.uid)}
          title={block ? BLOCK_TEXT[block] : `Condense ${cost} ${palById(inst.palId).name}s into this one`}>
          ★ {Math.min(dupes, cost)}/{cost}
        </button>
      {/if}
      {#if inParty}
        <button class="small" onclick={() => game.removeFromParty(inst.uid)}>In party ✓</button>
      {:else}
        <button class="small" disabled={partyFull} onclick={() => game.addToParty(inst.uid)}>Add</button>
      {/if}
      <button class="small danger" onclick={() => game.release(inst.uid)} title="Release">✕</button>
    </PalCard>
  {/each}
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 60vh; overflow-y: auto; }
  .small { font-size: 0.8rem; }
  input[type='search'] { min-width: 12rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
  .star.ready { border-color: var(--accent); color: var(--accent); }
  .cmp-on { border-color: var(--accent-2); color: var(--accent-2); }
</style>
