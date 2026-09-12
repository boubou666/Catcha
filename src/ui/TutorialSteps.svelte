<script lang="ts">
  import { game } from '../state/game.svelte';
  import { DEFAULT_TUTORIAL_FILTER, filterTutorial, STEP_STATUS_LABEL, TUTORIAL, type TutorialFilter } from '../engine/tutorial';

  let { go }: { go?: (tab: string) => void } = $props();

  let filter = $state<TutorialFilter>({ ...DEFAULT_TUTORIAL_FILTER });
  const rows = $derived(filterTutorial(game.save, filter));
  const filtering = $derived(filter.query.trim() !== '' || filter.status !== 'any');
  const clear = () => { filter = { ...DEFAULT_TUTORIAL_FILTER }; };
  const MARK = { done: '✓', current: '▶', upcoming: '·' } as const;
</script>

<div class="row">
  <input type="search" placeholder="Search steps…" bind:value={filter.query} aria-label="Search tutorial steps" />
  <select bind:value={filter.status} aria-label="Step status">
    {#each Object.entries(STEP_STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
  </select>
  <span class="muted small">{filtering ? `${rows.length} of ${TUTORIAL.length}` : `${TUTORIAL.length} steps`}</span>
  {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
</div>
{#if rows.length === 0}
  <p class="muted small">No step matches. <button class="small" onclick={clear}>Clear</button></p>
{/if}
<ol class="steps">
  {#each rows as r (r.step.id)}
    <li class={r.status}>
      <span class="mark">{MARK[r.status]}</span>
      <div class="grow">
        <div><b>{r.index + 1}. {r.step.title}</b> <span class="muted small">{STEP_STATUS_LABEL[r.status]}</span></div>
        <div class="muted small">{r.step.text}</div>
      </div>
      {#if r.step.tab && go}<button class="small" onclick={() => go!(r.step.tab!)}>Go →</button>{/if}
    </li>
  {/each}
</ol>

<style>
  .small { font-size: 0.8rem; }
  input[type='search'] { min-width: 8rem; flex: 1; max-width: 14rem; }
  select { font-size: 0.85rem; }
  .steps { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
  li { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.4rem 0.5rem; border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); }
  li.done { opacity: 0.7; }
  li.done .mark { color: var(--ok); }
  li.current { border-color: var(--accent); }
  li.current .mark { color: var(--accent); }
  .mark { width: 1rem; text-align: center; font-weight: 700; }
</style>
