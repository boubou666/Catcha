<script lang="ts">
  import { game } from '../state/game.svelte';
  import { RECIPES, recipeById } from '../data/base';
  import { CRAFT_SORT_LABEL, CRAFT_STATUS_LABEL, DEFAULT_CRAFT_FILTER, filterRecipes, isCraftFiltering, KIND_LABEL, type CraftFilter } from '../engine/craftfilter';
  import { itemName } from '../data/items';
  import { canCraft, computeRates, structureLevel } from '../engine/base';
  import { canAfford } from '../engine/inventory';
  import { describeRequirement } from '../engine/progress';
  import CostLine from './CostLine.svelte';
  import { recipeTech } from '../data/tech';

  const save = $derived(game.save);
  const hasBench = $derived(structureLevel(save, 'workbench') > 0);
  const speed = $derived(computeRates(save).handiworkPerSec);
  const queue = $derived(save.base.queue);
  const queuedWork = $derived(queue.reduce((s, j) => s + j.remaining, 0));
  const eta = (units: number) => (speed > 0 ? `${Math.ceil(units / speed)}s` : '—');

  let filter = $state<CraftFilter>({ ...DEFAULT_CRAFT_FILTER });
  let open = $state(false);
  const shown = $derived(filterRecipes(save, filter));
  const filtering = $derived(isCraftFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_CRAFT_FILTER, sort: filter.sort }; };

  function outputLabel(id: string) {
    const out = recipeById(id).output;
    return out.kind === 'item' ? `${out.n}× ${itemName(out.itemId)}` : `Click damage tier ${out.tier}`;
  }
</script>

<div class="row">
  <h2 class="grow">Crafting <span class="muted">{filtering ? `${shown.length} of ${RECIPES.length}` : RECIPES.length}</span></h2>
  <input type="search" placeholder="Search recipe, ingredient…" bind:value={filter.query} aria-label="Search recipes" />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>Filters{filtering ? ' •' : ''}</button>
</div>

{#if open}
  <div class="filters">
    <select bind:value={filter.kind} aria-label="Kind">
      <option value="any">Any kind</option>
      {#each Object.entries(KIND_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.status} aria-label="Status">
      {#each Object.entries(CRAFT_STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.sort} aria-label="Sort">
      {#each Object.entries(CRAFT_SORT_LABEL) as [k, label]}<option value={k}>Sort: {label}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.hideOwned} /> Hide owned weapons</label>
    {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
  </div>
{/if}

{#if !hasBench}
  <p class="muted">Build the Primitive Workbench at your base first (10 Wood).</p>
{:else if speed === 0}
  <p class="warn">No Handiwork at the base — the queue won't move. Assign a 🔨 Pal.</p>
{:else}
  <p class="muted">{speed.toFixed(2)} work/s · queue clears in {eta(queuedWork)}</p>
{/if}

{#if shown.length === 0}
  <p class="muted">No recipe matches. <button class="small" onclick={clear}>Clear filters</button></p>
{/if}

<div class="list">
  {#each shown as { recipe: r, status } (r.id)}
    {@const researched = status !== 'research'}
    {@const unlocked = status === 'ready' || status === 'missing' || status === 'owned'}
    {@const usable = canCraft(save, r.id)}
    {@const owned = status === 'owned'}
    <div class="recipe row" class:locked={!unlocked}>
      <div class="grow">
        <b>{r.name}</b> <span class="muted small">{r.work} work · {eta(r.work)} each</span>
        {#if owned}<span class="muted small">· owned</span>{/if}
        <div class="muted small">{outputLabel(r.id)}</div>
        {#if unlocked}<CostLine cost={r.inputs} />
        {:else if !researched}<div class="muted small">🔒 Research <b>{recipeTech(r.id)?.name}</b> (Tech tab)</div>
        {:else}<div class="muted small">🔒 {describeRequirement(r.unlock)}</div>{/if}
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
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
