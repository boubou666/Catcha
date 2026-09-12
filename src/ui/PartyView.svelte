<script lang="ts">
  import { game } from '../state/game.svelte';
  import { partyInstances } from '../engine/party';
  import { PARTY_SIZE } from '../engine/formulas';
  import { DEFAULT_FILTER, filterBox, isFiltering, statusOf, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';
  import PalCard from './PalCard.svelte';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import Loadouts from './Loadouts.svelte';

  const party = $derived(partyInstances(game.save));
  const empty = $derived(Math.max(0, PARTY_SIZE - party.length));
  const full = $derived(empty === 0);

  // Picker: the Box, minus the party, idle Pals first by default. Sorted by attack since that's what a party is for.
  const PICK_DEFAULTS: BoxFilter = { ...DEFAULT_FILTER, status: 'idle', sort: 'attack' };
  let filter = $state<BoxFilter>({ ...PICK_DEFAULTS });
  const candidates = $derived(filterBox(game.save, filter).filter((p) => !game.save.party.includes(p.uid)));
  const others = $derived(game.save.box.length - party.length);
  const filtering = $derived(isFiltering(filter, PICK_DEFAULTS));
  const clear = () => { filter = { ...PICK_DEFAULTS, sort: filter.sort }; };
</script>

<h2>Party <span class="muted">{party.length} / {PARTY_SIZE}</span></h2>
<p class="muted">Party Pals attack automatically. Element matchups against the wild Pal change their damage.</p>

<div class="list">
  {#each party as inst (inst.uid)}
    <PalCard {inst}>
      <button class="small" onclick={() => game.removeFromParty(inst.uid)}>To box</button>
    </PalCard>
  {/each}
  {#each { length: empty } as _}
    <div class="slot muted">Empty slot — add a Pal from below</div>
  {/each}
</div>

<Loadouts />

{#if others > 0}
  <div class="picker">
    <BoxFilterBar bind:filter defaults={PICK_DEFAULTS} label="Search Pals to add">
      {#snippet heading()}
        <h3 class="grow">Add from the Box <span class="muted">{filtering ? `${candidates.length} of ${others}` : candidates.length}</span></h3>
      {/snippet}
    </BoxFilterBar>
    {#if full}<p class="muted small">The party is full — send someone to the Box first.</p>{/if}
    {#if candidates.length === 0}
      {#if filtering}
        <p class="muted">No Pal matches. <button class="small" onclick={clear}>Clear filters</button></p>
      {:else}
        <p class="muted">Everyone else is working, breeding or away. <button class="small" onclick={() => (filter.status = 'any')}>Show them anyway</button></p>
      {/if}
    {/if}
    <div class="list">
      {#each candidates as inst (inst.uid)}
        {@const status = statusOf(game.save, inst.uid)}
        <PalCard {inst}>
          {#if status !== 'idle'}<span class="muted small">{STATUS_LABEL[status].toLowerCase()}</span>{/if}
          <button class="small" disabled={full || status === 'expedition'} onclick={() => game.addToParty(inst.uid)}
            title={status === 'expedition' ? 'Away until the expedition returns' : status === 'base' ? 'Pulls it off its base job' : status === 'breeding' ? 'Breaks up the breeding pair' : ''}>Add</button>
        </PalCard>
      {/each}
    </div>
  </div>
{/if}

<style>
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .slot { border: 2px dashed var(--border-soft); border-radius: var(--radius-sm); padding: 0.9rem; text-align: center; }
  .picker { margin-top: 1rem; padding-top: 0.75rem; border-top: 1.5px solid var(--border-soft); }
  .picker .list { max-height: 45vh; overflow-y: auto; }
  .small { font-size: 0.8rem; }
  h3 { margin: 0; }
</style>
