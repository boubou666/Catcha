<script lang="ts">
  import { game } from '../state/game.svelte';
  import { PALS, paldeckNumber } from '../data/pals';
  import { REGIONS } from '../data/regions';
  import { ELEMENTS } from '../data/types';
  import { JOBS } from '../data/base';
  import { DECK_SORT_LABEL, DECK_STATUS_LABEL, DEFAULT_DECK_FILTER, deckEntries, filterDeck, isDeckFiltering, RARITIES, type DeckFilter } from '../engine/paldeckfilter';
  import PalIcon from './PalIcon.svelte';
  import PalDetail from './PalDetail.svelte';

  import { ui } from '../state/ui.svelte';
  import { catchPreview } from '../engine/catch';
  import { prefs } from '../state/prefs.svelte';
  import { catchText } from './catchText';
  let selected = $state<number | null>(null);
  // global search may ask for an entry to open
  $effect(() => { const id = ui.paldeckSelect; if (id !== null) selected = ui.takePaldeck(); });
  let filter = $state<DeckFilter>({ ...DEFAULT_DECK_FILTER });
  let showFilters = $state(false);

  const caughtCount = $derived(deckEntries(game.save).filter((e) => e.caught > 0).length);
  const shown = $derived(filterDeck(game.save, filter));
  const filtering = $derived(isDeckFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_DECK_FILTER, sort: filter.sort }; };
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
</script>

<div class="row">
  <h2 class="grow">Paldeck <span class="muted">{caughtCount} / {PALS.length}{filtering ? ` · ${shown.length} shown` : ''}</span></h2>
  <input type="search" placeholder="Search name, #, element…" bind:value={filter.query} aria-label="Search the Paldeck" />
  <button class="small" class:active={showFilters || filtering} onclick={() => (showFilters = !showFilters)} aria-expanded={showFilters}>Filters{filtering ? ' •' : ''}</button>
</div>

{#if showFilters}
  <div class="filters">
    <select bind:value={filter.status} aria-label="Status">
      {#each Object.entries(DECK_STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.region} aria-label="Region">
      <option value="any">Any region</option>
      {#each REGIONS as r}<option value={r.id}>{r.name}</option>{/each}
    </select>
    <select bind:value={filter.element} aria-label="Element">
      <option value="any">Any element</option>
      {#each ELEMENTS as e}<option value={e}>{e}</option>{/each}
    </select>
    <select bind:value={filter.work} aria-label="Work suitability">
      <option value="any">Any work</option>
      {#each JOBS as j}<option value={j.type}>{j.icon} {j.type}</option>{/each}
    </select>
    <select bind:value={filter.rarity} aria-label="Rarity">
      <option value="any">Any rarity</option>
      {#each RARITIES as r}<option value={r}>{cap(r)}</option>{/each}
    </select>
    <select bind:value={filter.sort} aria-label="Sort">
      {#each Object.entries(DECK_SORT_LABEL) as [k, label]}<option value={k}>Sort: {label}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.subspecies} /> Subspecies only</label>
    {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
  </div>
  <p class="muted small">Element, work and rarity only apply to Pals you've seen; region means it can be met on that region's routes, Alphas or tower.</p>
{:else}
  <p class="muted small">Click a Pal for its habitat and breeding recipes.</p>
{/if}

{#if shown.length === 0}
  <p class="muted">No Pal matches. <button class="small" onclick={clear}>Clear filters</button></p>
{/if}

{#if selected !== null}<PalDetail palId={selected} onclose={() => (selected = null)} onselect={(id) => (selected = id)} />{/if}

<div class="grid">
  {#each shown as { def, seen, caught } (def.id)}
    {@const pv = seen && prefs.showOdds ? catchPreview(game.save, def.id) : null}
    <button class="entry" class:caught={caught > 0} class:seen={seen && caught === 0} onclick={() => (selected = def.id)} title={pv ? `Catch: ${catchText(pv)}` : undefined}>
      <PalIcon palId={def.id} size={44} unknown={!seen} />
      <div class="num">{paldeckNumber(def)}</div>
      <div class="name">{seen ? def.name : '???'}</div>
      <div class="small foot">{#if caught > 0}<span class="muted">×{caught}</span>{/if}{#if pv}<span class="odds" class:no={!pv.throws}>🎯 {pv.throws ? `${Math.round(pv.chance * 100)}%` : '—'}</span>{/if}</div>
    </button>
  {/each}
</div>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; }
  .entry { text-align: center; padding: 0.5rem 0.25rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border-soft); opacity: 0.45; background: transparent; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
  .entry:hover { opacity: 1; border-color: var(--accent); }
  .entry.seen { opacity: 0.75; }
  .entry.caught { opacity: 1; border-color: var(--ok); }
  .num { font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem; }
  .name { font-size: 0.85rem; }
  .small { font-size: 0.75rem; }
  .foot { display: flex; gap: 0.4rem; min-height: 1em; }
  .odds { color: var(--accent-2); font-weight: 700; }
  .odds.no { color: var(--muted); font-weight: 400; }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  h2 { white-space: nowrap; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
