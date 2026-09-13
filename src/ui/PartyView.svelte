<script lang="ts">
  import { game } from '../state/game.svelte';
  import { partyInstances } from '../engine/party';
  import { PARTY_SIZE } from '../engine/formulas';
  import { DEFAULT_FILTER, filterBox, isFiltering, statusOf, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';
  import PalCard from './PalCard.svelte';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import Loadouts from './Loadouts.svelte';
  import CatchOdds from './CatchOdds.svelte';
  import { t, t as tr } from '../i18n/index.svelte';
  import { activePartners, summarizePartners } from '../engine/partner';
  const partnerLines = $derived(summarizePartners(activePartners(game.save).filter((e) => e.stat !== 'work')));

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

<h2>{t('panel.party')} <span class="muted">{party.length} / {PARTY_SIZE}</span></h2>
<p class="muted">{tr("Party Pals attack automatically. Element matchups against the wild Pal change their damage.")}</p>
{#if partnerLines.length}<p class="partners small" title={tr("Partner skills of the party, added up")}>{tr("🤝 Partner skills:")} {partnerLines.join(' · ')}</p>{/if}

<div class="list">
  {#each party as inst (inst.uid)}
    <PalCard {inst}>
      <CatchOdds palId={inst.palId} />
      <button class="small" onclick={() => game.removeFromParty(inst.uid)}>{tr("To box")}</button>
    </PalCard>
  {/each}
  {#each { length: empty } as _}
    <div class="slot muted">{tr("Empty slot — add a Pal from below")}</div>
  {/each}
</div>

<Loadouts />

{#if others > 0}
  <div class="picker">
    <BoxFilterBar bind:filter defaults={PICK_DEFAULTS} label="Search Pals to add">
      {#snippet heading()}
        <h3 class="grow">{tr("Add from the Box")} <span class="muted">{filtering ? `${candidates.length} of ${others}` : candidates.length}</span></h3>
      {/snippet}
    </BoxFilterBar>
    {#if full}<p class="muted small">{tr("The party is full — send someone to the Box first.")}</p>{/if}
    {#if candidates.length === 0}
      {#if filtering}
        <p class="muted">{tr("No Pal matches.")} <button class="small" onclick={clear}>{tr("Clear filters")}</button></p>
      {:else}
        <p class="muted">{tr("Everyone else is working, breeding or away.")} <button class="small" onclick={() => (filter.status = 'any')}>{tr("Show them anyway")}</button></p>
      {/if}
    {/if}
    <div class="list">
      {#each candidates as inst (inst.uid)}
        {@const status = statusOf(game.save, inst.uid)}
        <PalCard {inst}>
          <CatchOdds palId={inst.palId} />
          {#if status !== 'idle'}<span class="muted small">{tr(STATUS_LABEL[status]).toLowerCase()}</span>{/if}
          <button class="small" disabled={full || status === 'expedition'} onclick={() => game.addToParty(inst.uid)}
            title={status === 'expedition' ? 'Away until the expedition returns' : status === 'base' ? 'Pulls it off its base job' : status === 'breeding' ? 'Breaks up the breeding pair' : ''}>{tr("Add")}</button>
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
  .partners { color: var(--accent); margin: -0.4rem 0 0.6rem; }
  h3 { margin: 0; }
</style>
