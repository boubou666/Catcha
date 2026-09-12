<script lang="ts">
  import { game } from '../state/game.svelte';
  import { partyInstances } from '../engine/party';
  import { PARTY_SIZE } from '../engine/formulas';
  import PalCard from './PalCard.svelte';

  const party = $derived(partyInstances(game.save));
  const empty = $derived(Math.max(0, PARTY_SIZE - party.length));
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
    <div class="slot muted">Empty slot — add a Pal from the Box</div>
  {/each}
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .slot { border: 1px dashed var(--border); border-radius: 8px; padding: 0.9rem; text-align: center; }
</style>
