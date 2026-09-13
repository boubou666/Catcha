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
  import { MAX_COMPARE } from '../engine/compare';
  import { DEFAULT_FILTER, filterBox, isFiltering, type BoxFilter } from '../engine/boxfilter';
  import BoxFilterBar from './BoxFilterBar.svelte';

  import { ui } from '../state/ui.svelte';
  import { catchPreview } from '../engine/catch';
  import { catchText } from './catchText';
  let filter = $state<BoxFilter>({ ...DEFAULT_FILTER });
  $effect(() => { const q = ui.boxQuery; if (q !== null) filter = { ...filter, query: ui.takeBoxQuery() ?? '' }; });
  const sorted = $derived(filterBox(game.save, filter));
  const filtering = $derived(isFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_FILTER, sort: filter.sort }; };
  const partyFull = $derived(game.save.party.length >= PARTY_SIZE);
  const hasCondenser = $derived(structureLevel(game.save, CONDENSER) > 0);

  // bulk selection over the filtered list; selection survives filter changes but drops released Pals
  let selecting = $state(false);
  let selected = $state<Set<string>>(new Set());
  const shownUids = $derived(new Set(sorted.map((p) => p.uid)));
  const selectedShown = $derived([...selected].filter((u) => shownUids.has(u)));
  const allShownSelected = $derived(sorted.length > 0 && sorted.every((p) => selected.has(p.uid)));
  function toggleSel(uid: string) { const next = new Set(selected); if (next.has(uid)) next.delete(uid); else next.add(uid); selected = next; }
  function selectShown(on: boolean) { const next = new Set(selected); for (const p of sorted) { if (on) next.add(p.uid); else next.delete(p.uid); } selected = next; }
  function stopSelecting() { selecting = false; selected = new Set(); }
  const targets = () => sorted.filter((p) => selected.has(p.uid)).map((p) => p.uid);   // list order
  function bulk(kind: 'release' | 'base' | 'party' | 'compare') {
    const uids = targets();
    if (uids.length === 0) return;
    if (kind === 'release') {
      if (!window.confirm(`Release ${uids.length} selected Pal${uids.length === 1 ? '' : 's'}? Party members, workers, breeding or away Pals, Lucky and starred Pals are skipped automatically.`)) return;
      const r = game.bulkRelease(uids);
      selected = new Set([...selected].filter((u) => !r.done.includes(u)));
    } else if (kind === 'base') game.bulkAssign(uids);
    else if (kind === 'party') game.bulkParty(uids);
    else { for (const u of uids) if (!compare.has(u) && !compare.full) compare.toggle(u); }
  }
  const freeSlots = $derived(game.save.base.slots - game.save.base.workers.length);
  const freeParty = $derived(PARTY_SIZE - game.save.party.length);

  const BLOCK_TEXT: Record<CondenseBlock, string> = {
    'no-condenser': 'Build the Pal Essence Condenser at your base',
    'max-stars': 'Already at 4 stars',
    'not-enough': 'Not enough idle, unstarred duplicates',
  };
</script>

<BoxFilterBar bind:filter>
  {#snippet heading()}
    <h2 class="grow">Box <span class="muted">{filtering ? `${sorted.length} of ${game.save.box.length}` : game.save.box.length}</span></h2>
  {/snippet}
</BoxFilterBar>

{#if game.save.box.length > 0}
  <div class="row bulkbar" class:on={selecting}>
    {#if !selecting}
      <button class="small" onclick={() => (selecting = true)}>Select…</button>
      <span class="muted small">Pick Pals from the list (or select everything the filter shows) to release, send to the base, add to the party or compare in one go.</span>
    {:else}
      <label class="chk"><input type="checkbox" checked={allShownSelected} onchange={(e) => selectShown(e.currentTarget.checked)} /> All {sorted.length} shown</label>
      <span class="muted small">{selectedShown.length} selected{selected.size > selectedShown.length ? ` (+${selected.size - selectedShown.length} hidden by the filter)` : ''}</span>
      <span class="grow"></span>
      <button class="small" disabled={!selectedShown.length || freeParty <= 0} onclick={() => bulk('party')} title={freeParty > 0 ? `${freeParty} free party slot${freeParty === 1 ? '' : 's'}` : 'The party is full'}>To party</button>
      <button class="small" disabled={!selectedShown.length || freeSlots <= 0} onclick={() => bulk('base')} title={freeSlots > 0 ? `${freeSlots} free base slot${freeSlots === 1 ? '' : 's'}` : 'The base is full'}>To base</button>
      <button class="small" disabled={!selectedShown.length || compare.full} onclick={() => bulk('compare')} title="Add to the comparison (up to {MAX_COMPARE})">⚖ Compare</button>
      <button class="small danger" disabled={!selectedShown.length} onclick={() => bulk('release')} title="Release the selected Pals (Lucky, starred and busy Pals are skipped)">Release</button>
      <button class="small" onclick={stopSelecting}>Done</button>
    {/if}
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
    {@const pv = catchPreview(game.save, inst.palId)}
    <PalCard {inst} showWork>
      {#if selecting}<input type="checkbox" class="sel" checked={selected.has(inst.uid)} onchange={() => toggleSel(inst.uid)} aria-label="Select {palById(inst.palId).name}" />{/if}
      {#if game.save.base.workers.includes(inst.uid)}<span class="muted small">at base</span>{/if}
      {#if isBreeding(game.save, inst.uid)}<span class="muted small">breeding</span>{/if}
      {#if isAway(game.save, inst.uid)}<span class="muted small">on expedition</span>{/if}
      <button class="small" class:cmp-on={compare.has(inst.uid)} disabled={!compare.has(inst.uid) && compare.full} onclick={() => compare.toggle(inst.uid)} title={compare.has(inst.uid) ? 'Remove from comparison' : 'Add to comparison (Compare tab)'}>⚖</button>
      <button class="small odds" class:no={!pv.throws} onclick={() => (ui.requestTab = 'settings')}
        title={`Catching another ${palById(inst.palId).name}: ${catchText(pv)}`}>🎯 {pv.throws ? `${Math.round(pv.chance * 100)}%` : '—'}</button>
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
  .odds { color: var(--accent-2); font-weight: 700; font-variant-numeric: tabular-nums; }
  .odds.no { color: var(--muted); font-weight: 400; }
  .small { font-size: 0.8rem; }
  .star.ready { border-color: var(--accent); color: var(--accent); }
  .bulkbar { margin: 0.5rem 0; padding: 0.4rem 0.5rem; border: 2px dashed var(--border-soft); border-radius: var(--radius-sm); }
  .bulkbar.on { border-style: solid; border-color: var(--accent); background: var(--panel-2); }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input, .sel { min-height: 0; width: auto; }
  .sel { transform: scale(1.2); margin-right: 0.2rem; }
  .cmp-on { border-color: var(--accent-2); color: var(--accent-2); }
</style>
