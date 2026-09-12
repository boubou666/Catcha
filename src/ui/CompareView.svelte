<script lang="ts">
  import { game } from '../state/game.svelte';
  import { compare } from '../state/compare.svelte';
  import { palById } from '../data/pals';
  import { compareRows, DEFAULT_COMPARE_FILTER, filterCompareRows, isCompareFiltering, MAX_COMPARE, ROW_GROUP_LABEL, type CompareFilter } from '../engine/compare';
  import PalIcon from './PalIcon.svelte';
  import PassiveChips from './PassiveChips.svelte';
  import PalCard from './PalCard.svelte';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import { DEFAULT_FILTER, filterBox, isFiltering, statusOf, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';

  const save = $derived(game.save);
  // drop anything that left the box (released / ascended)
  const insts = $derived(compare.uids.map((u) => save.box.find((p) => p.uid === u)).filter((p): p is NonNullable<typeof p> => !!p));
  const allRows = $derived(compareRows(save, insts));
  let rowFilter = $state<CompareFilter>({ ...DEFAULT_COMPARE_FILTER });
  const rows = $derived(filterCompareRows(allRows, rowFilter));
  const rowFiltering = $derived(isCompareFiltering(rowFilter));
  const clearRows = () => { rowFilter = { ...DEFAULT_COMPARE_FILTER }; };
  // Picker: the whole Box minus the selection, strongest first. Duplicates-only is handy for picking which copy to keep.
  const PICK_DEFAULTS: BoxFilter = { ...DEFAULT_FILTER, sort: 'attack' };
  let filter = $state<BoxFilter>({ ...PICK_DEFAULTS });
  const candidates = $derived(filterBox(save, filter).filter((p) => !compare.has(p.uid)));
  const others = $derived(save.box.length - insts.length);
  const filtering = $derived(isFiltering(filter, PICK_DEFAULTS));
  const clear = () => { filter = { ...PICK_DEFAULTS, sort: filter.sort }; };
</script>

<div class="row">
  <h2 class="grow">Compare <span class="muted">{insts.length} / {MAX_COMPARE}</span></h2>
  {#if insts.length}<button class="small" onclick={() => compare.clear()}>Clear</button>{/if}
</div>
<p class="muted small">Pick up to {MAX_COMPARE} Pals here or with the ⚖ button in the Box. Best value per row is highlighted; work rows are effective output after stars, passives and sanity.</p>

{#if insts.length === 0}
  <p class="muted">Nothing selected yet — add Pals from the list below.</p>
{:else}
  <div class="row rowbar">
    <input type="search" placeholder="Search rows…" bind:value={rowFilter.query} aria-label="Search comparison rows" />
    <select bind:value={rowFilter.group} aria-label="Row group">
      {#each Object.entries(ROW_GROUP_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={rowFilter.differencesOnly} /> Differences only</label>
    <span class="muted small">{rowFiltering ? `${rows.length} of ${allRows.length} rows` : `${allRows.length} rows`}</span>
    {#if rowFiltering}<button class="small" onclick={clearRows}>Clear</button>{/if}
  </div>
  {#if rows.length === 0}<p class="muted small">No row matches.</p>{/if}
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th></th>
          {#each insts as p (p.uid)}
            <th>
              <PalIcon palId={p.palId} size={40} lucky={p.lucky} />
              <div class="small"><b>{palById(p.palId).name}</b></div>
              <PassiveChips ids={p.passives} />
              <button class="tiny" title="Remove" onclick={() => compare.remove(p.uid)}>✕</button>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as r (r.label)}
          <tr>
            <td class="label">{r.label}</td>
            {#each r.values as v, i}
              <td class:best={r.best.includes(i)}>{v}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if others > 0}
  <div class="picker">
    <BoxFilterBar bind:filter defaults={PICK_DEFAULTS} label="Search Pals to compare">
      {#snippet heading()}
        <h3 class="grow">Add to comparison <span class="muted">{filtering ? `${candidates.length} of ${others}` : candidates.length}</span></h3>
      {/snippet}
    </BoxFilterBar>
    {#if compare.full}<p class="muted small">Selection is full — remove one above to add another.</p>{/if}
    {#if candidates.length === 0}
      <p class="muted">No Pal matches. <button class="small" onclick={clear}>Clear filters</button></p>
    {/if}
    <div class="list">
      {#each candidates as p (p.uid)}
        {@const status = statusOf(save, p.uid)}
        <PalCard inst={p} showWork>
          {#if status !== 'idle'}<span class="muted small">{STATUS_LABEL[status].toLowerCase()}</span>{/if}
          <button class="small" disabled={compare.full} onclick={() => compare.toggle(p.uid)}>⚖ Add</button>
        </PalCard>
      {/each}
    </div>
  </div>
{/if}

<style>
  .small { font-size: 0.8rem; }
  .scroll { overflow-x: auto; margin-top: 0.75rem; }
  table { border-collapse: collapse; width: 100%; min-width: 420px; }
  th, td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border); text-align: center; vertical-align: middle; }
  th { vertical-align: top; }
  td.label { text-align: left; color: var(--muted); white-space: nowrap; }
  td.best { color: var(--ok); font-weight: 600; }
  .tiny { font-size: 0.7rem; padding: 0 0.35rem; margin-top: 0.25rem; }
  .rowbar { margin-top: 0.75rem; }
  .rowbar input[type='search'] { min-width: 7rem; flex: 1; max-width: 12rem; font-size: 0.85rem; }
  .rowbar select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
  .picker { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }
  .list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 45vh; overflow-y: auto; }
  h3 { margin: 0; }
</style>
