<script lang="ts">
  import { game } from '../state/game.svelte';
  import { RECIPES, recipeById } from '../data/base';
  import { itemName } from '../data/items';
  import { canCraft, computeRates, structureLevel } from '../engine/base';
  import { canAfford } from '../engine/inventory';
  import { describeRequirement, isUnlocked } from '../engine/progress';
  import CostLine from './CostLine.svelte';

  const save = $derived(game.save);
  const hasBench = $derived(structureLevel(save, 'workbench') > 0);
  const speed = $derived(computeRates(save).handiworkPerSec);
  const queue = $derived(save.base.queue);
  const queuedWork = $derived(queue.reduce((s, j) => s + j.remaining, 0));
  const eta = (units: number) => (speed > 0 ? `${Math.ceil(units / speed)}s` : '—');

  function outputLabel(id: string) {
    const out = recipeById(id).output;
    return out.kind === 'item' ? `${out.n}× ${itemName(out.itemId)}` : `Click damage tier ${out.tier}`;
  }
</script>

<h2>Crafting</h2>

{#if !hasBench}
  <p class="muted">Build the Primitive Workbench at your base first (10 Wood).</p>
{:else if speed === 0}
  <p class="warn">No Handiwork at the base — the queue won't move. Assign a 🔨 Pal.</p>
{:else}
  <p class="muted">{speed.toFixed(2)} work/s · queue clears in {eta(queuedWork)}</p>
{/if}

<div class="list">
  {#each RECIPES as r (r.id)}
    {@const unlocked = isUnlocked(save, r.unlock)}
    {@const usable = canCraft(save, r.id)}
    {@const owned = r.output.kind === 'weapon' && save.player.weaponTier >= r.output.tier}
    <div class="recipe row" class:locked={!unlocked}>
      <div class="grow">
        <b>{r.name}</b> <span class="muted small">{r.work} work · {eta(r.work)} each</span>
        {#if owned}<span class="muted small">· owned</span>{/if}
        <div class="muted small">{outputLabel(r.id)}</div>
        {#if unlocked}<CostLine cost={r.inputs} />{:else}<div class="muted small">🔒 {describeRequirement(r.unlock)}</div>{/if}
      </div>
      {#if unlocked && !owned}
        <button class="small" disabled={!usable || !canAfford(save, r.inputs)} onclick={() => game.craft(r.id, 1)}>×1</button>
        {#if r.output.kind === 'item'}
          <button class="small" disabled={!usable || !canAfford(save, r.inputs, 5)} onclick={() => game.craft(r.id, 5)}>×5</button>
        {/if}
      {/if}
    </div>
  {/each}
</div>

{#if queue.length > 0}
  <h3 class="queue-title">Queue <span class="muted">{queue.length}</span></h3>
  <div class="list">
    {#each queue as job, i}
      {@const r = recipeById(job.recipeId)}
      <div class="job row">
        <span class="grow">{r.name}</span>
        {#if i === 0}
          <div class="bar grow"><span style:width="{(1 - job.remaining / r.work) * 100}%"></span></div>
        {/if}
        <span class="muted small">{eta(job.remaining)}</span>
        <button class="small danger" title="Cancel and refund" onclick={() => game.cancelCraft(i)}>✕</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .recipe, .job { padding: 0.5rem; border: 1px solid var(--border); border-radius: 8px; }
  .locked { opacity: 0.55; }
  .small { font-size: 0.8rem; }
  .warn { color: var(--accent); }
  .queue-title { margin-top: 1.25rem; }
  .bar { max-width: 160px; }
  .bar > span { background: var(--accent-2); }
</style>
