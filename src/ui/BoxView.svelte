<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { PARTY_SIZE } from '../engine/formulas';
  import { structureLevel } from '../engine/base';
  import { condenseBlocker, condenseCandidates, condenseCost, CONDENSER, type CondenseBlock } from '../engine/condense';
  import { isBreeding } from '../engine/breeding';
  import PalCard from './PalCard.svelte';

  let query = $state('');
  const sorted = $derived(
    [...game.save.box]
      .filter((p) => palById(p.palId).name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.stars - a.stars || b.level - a.level || a.palId - b.palId),
  );
  const partyFull = $derived(game.save.party.length >= PARTY_SIZE);
  const hasCondenser = $derived(structureLevel(game.save, CONDENSER) > 0);

  const BLOCK_TEXT: Record<CondenseBlock, string> = {
    'no-condenser': 'Build the Pal Essence Condenser at your base',
    'max-stars': 'Already at 4 stars',
    'not-enough': 'Not enough idle, unstarred duplicates',
  };
</script>

<div class="row">
  <h2 class="grow">Box <span class="muted">{game.save.box.length}</span></h2>
  <input placeholder="Filter…" bind:value={query} />
</div>

{#if game.save.box.length === 0}
  <p class="muted">Nothing here yet. Defeat wild Pals with a Pal Sphere in stock to catch them.</p>
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
  .star.ready { border-color: var(--accent); color: var(--accent); }
</style>
