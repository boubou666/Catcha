<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import { game } from '../state/game.svelte';
  import { RECIPES, recipeById } from '../data/base';
  import { CRAFT_SORT_LABEL, CRAFT_STATUS_LABEL, DEFAULT_CRAFT_FILTER, filterRecipes, isCraftFiltering, KIND_LABEL, type CraftFilter } from '../engine/craftfilter';
  import { itemName } from '../data/items';
  import { canCraft, computeRates, filterQueue, queueSummary, structureLevel } from '../engine/base';
  import { canAfford } from '../engine/inventory';
  import { describeRequirement } from '../engine/progress';
  import CostLine from './CostLine.svelte';
  import ItemIcon from './ItemIcon.svelte';
  import { sphereVsWild } from './catchText';
  import type { SphereTier } from '../data/types';
  import { recipeTech } from '../data/tech';

  const save = $derived(game.save);
  const hasBench = $derived(structureLevel(save, 'workbench') > 0);
  const speed = $derived(computeRates(save).handiworkPerSec);
  const queue = $derived(save.base.queue);
  const queuedWork = $derived(queue.reduce((s, j) => s + j.remaining, 0));

  // queue: search by recipe, grouped by recipe once it gets long, bulk cancel per recipe or all
  let queueQuery = $state('');
  let grouped = $state<boolean | null>(null);           // null = auto (group when long)
  const isGrouped = $derived(grouped ?? queue.length > 8);
  const matchIdx = $derived(new Set(filterQueue(save, queueQuery)));
  const groups = $derived(queueSummary(save).filter((g) => queueQuery.trim() === '' || queue.some((j, i) => j.recipeId === g.recipeId && matchIdx.has(i))));
  const queueFiltering = $derived(queueQuery.trim() !== '');
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
  <h2 class="grow">{tr("Crafting")} <span class="muted">{filtering ? `${shown.length} of ${RECIPES.length}` : RECIPES.length}</span></h2>
  <input type="search" placeholder={tr("Search recipe, ingredient…")} bind:value={filter.query} aria-label={tr("Search recipes")} />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>{tr("Filters")}{filtering ? ' •' : ''}</button>
</div>

{#if open}
  <div class="filters">
    <select bind:value={filter.kind} aria-label={tr("Kind")}>
      <option value="any">{tr("Any kind")}</option>
      {#each Object.entries(KIND_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
    </select>
    <select bind:value={filter.status} aria-label={tr("Status")}>
      {#each Object.entries(CRAFT_STATUS_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
    </select>
    <select bind:value={filter.sort} aria-label={tr("Sort")}>
      {#each Object.entries(CRAFT_SORT_LABEL) as [k, label]}<option value={k}>{tr("Sort:")} {tr(label)}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.hideOwned} /> {tr("Hide owned weapons")}</label>
    {#if filtering}<button class="small" onclick={clear}>{tr("Clear")}</button>{/if}
  </div>
{/if}

{#if !hasBench}
  <p class="muted">{tr("Build the Primitive Workbench at your base first (10 Wood).")}</p>
{:else if speed === 0}
  <p class="warn">{tr("No Handiwork at the base — the queue won't move. Assign a 🔨 Pal.")}</p>
{:else}
  <p class="muted">{speed.toFixed(2)} {tr("work/s · queue clears in")} {eta(queuedWork)}</p>
{/if}

{#if shown.length === 0}
  <p class="muted">{tr("No recipe matches.")} <button class="small" onclick={clear}>{tr("Clear filters")}</button></p>
{/if}

<div class="list">
  {#each shown as { recipe: r, status } (r.id)}
    {@const researched = status !== 'research'}
    {@const unlocked = status === 'ready' || status === 'missing' || status === 'owned'}
    {@const usable = canCraft(save, r.id)}
    {@const owned = status === 'owned'}
    <div class="recipe row" class:locked={!unlocked}>
      {#if r.output.kind === 'item'}<ItemIcon id={r.output.itemId} size={34} />{:else}<span class="weapon">🗡</span>{/if}
      <div class="grow">
        {#if r.output.kind === 'item' && r.output.itemId.startsWith('sphere_')}<div class="small odds">🎯 {sphereVsWild(game.save, game.wild, r.output.itemId.slice(7) as SphereTier)}</div>{/if}
        <b>{r.name}</b> <span class="muted small">{r.work} {tr("work ·")} {eta(r.work)} {tr("each")}</span>
        {#if owned}<span class="muted small">{tr("· owned")}</span>{/if}
        <div class="muted small">{outputLabel(r.id)}</div>
        {#if unlocked}<CostLine cost={r.inputs} />
        {:else if !researched}<div class="muted small">{tr("🔒 Research")} <b>{recipeTech(r.id)?.name}</b> {tr("(Tech tab)")}</div>
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
  <div class="row queue-head">
    <h3 class="queue-title grow">{tr("Queue")} <span class="muted">{queueFiltering ? `${matchIdx.size} of ${queue.length}` : queue.length}</span></h3>
    <input type="search" placeholder={tr("Search queue…")} bind:value={queueQuery} aria-label={tr("Search the queue")} />
    <button class="small" class:active={isGrouped} onclick={() => (grouped = !isGrouped)} title={tr("Group jobs by recipe")}>{isGrouped ? 'Grouped' : 'Group'}</button>
    <button class="small danger" onclick={() => { if (window.confirm(`Cancel all ${queue.length} queued crafts and refund the materials?`)) game.cancelCraftAll(); }}>{tr("Cancel all")}</button>
  </div>
  {#if matchIdx.size === 0}<p class="muted small">{tr("No queued craft matches.")}</p>{/if}
  <div class="list">
    {#if isGrouped}
      {#each groups as g (g.recipeId)}
        <div class="job row">
          <span class="grow"><b>{g.name}</b> <span class="muted">×{g.count}</span></span>
          {#if g.first === 0}
            <div class="bar grow"><span style:width="{(1 - queue[0].remaining / recipeById(g.recipeId).work) * 100}%"></span></div>
          {/if}
          <span class="muted small">{eta(g.remaining)}</span>
          <button class="small danger" title="Cancel every {g.name} and refund" onclick={() => game.cancelCraftAll(g.recipeId)}>{tr("✕ all")}</button>
        </div>
      {/each}
    {:else}
    {#each queue as job, i}
      {@const r = recipeById(job.recipeId)}
      {#if matchIdx.has(i)}
      <div class="job row">
        <span class="grow">{r.name}</span>
        {#if i === 0}
          <div class="bar grow"><span style:width="{(1 - job.remaining / r.work) * 100}%"></span></div>
        {/if}
        <span class="muted small">{eta(job.remaining)}</span>
        <button class="small danger" title={tr("Cancel and refund")} onclick={() => game.cancelCraft(i)}>✕</button>
      </div>
      {/if}
    {/each}
    {/if}
  </div>
{/if}

<style>
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .weapon { font-size: 1.4rem; width: 34px; text-align: center; }
  .odds { float: right; }
  .recipe, .job { padding: 0.5rem; border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); }
  .locked { opacity: 0.55; }
  .small { font-size: 0.8rem; }
  .warn { color: var(--accent); }
  .queue-title { margin: 0; }
  .queue-head { margin-top: 1.25rem; margin-bottom: 0.4rem; }
  .queue-head input[type='search'] { min-width: 7rem; max-width: 11rem; font-size: 0.85rem; }
  .bar { max-width: 160px; }
  .bar > span { background: var(--accent-2); }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
