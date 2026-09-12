<script lang="ts">
  import { game } from '../state/game.svelte';
  import { describeRequirement, routeCleared, routeKills } from '../engine/progress';
  import { routeQuota } from '../engine/prestige';
</script>

<div class="panel">
  {#if game.regions.length > 1}
    <div class="regions row">
      {#each game.regions as r (r.id)}
        <button class="small" class:active={r.id === game.region.id} disabled={game.inBossFight} onclick={() => game.travelToRegion(r.id)}>{r.name}</button>
      {/each}
    </div>
  {/if}
  <h3>Routes — {game.region.name}</h3>
  <div class="routes">
    {#each game.region.routes as r}
      {@const unlocked = game.canTravel(r.id)}
      {@const cleared = routeCleared(game.save, r)}
      <button
        class:active={r.id === game.route.id}
        class:cleared
        disabled={!unlocked || game.inBossFight}
        onclick={() => game.travel(r.id)}
        title={unlocked ? `${routeKills(game.save, r.id)} / ${routeQuota(game.save, r)} defeated` : describeRequirement(r.unlock)}
      >
        <span>{r.name}</span>
        <span class="muted">Lv {r.level}{cleared ? ' ✓' : ''}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .regions { margin-bottom: 0.6rem; }
  .regions button.active { border-color: var(--accent); color: var(--accent); }
  .routes { display: flex; flex-direction: column; gap: 0.25rem; }
  .routes button { display: flex; justify-content: space-between; text-align: left; }
  .routes button.active { border-color: var(--accent); color: var(--accent); }
  .routes button.cleared:not(.active) { color: var(--ok); }
  .small { font-size: 0.85rem; }
</style>
