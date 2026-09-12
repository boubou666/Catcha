<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { PARTY_SIZE } from '../engine/formulas';
  import PalCard from './PalCard.svelte';

  let query = $state('');
  const sorted = $derived(
    [...game.save.box]
      .filter((p) => palById(p.palId).name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.level - a.level || a.palId - b.palId),
  );
  const partyFull = $derived(game.save.party.length >= PARTY_SIZE);
</script>

<div class="row">
  <h2 class="grow">Box <span class="muted">{game.save.box.length}</span></h2>
  <input placeholder="Filter…" bind:value={query} />
</div>

{#if game.save.box.length === 0}
  <p class="muted">Nothing here yet. Defeat wild Pals with a Pal Sphere in stock to catch them.</p>
{/if}

<div class="list">
  {#each sorted as inst (inst.uid)}
    {@const inParty = game.save.party.includes(inst.uid)}
    <PalCard {inst}>
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
</style>
