<script lang="ts">
  import { pct } from './catchText';
  import { game } from '../state/game.svelte';
  import { ACHIEVEMENTS, categoryLabel, POINT_GOLD_BONUS } from '../data/achievements';
  import { achievementPoints, totalPoints } from '../engine/achievements';
  import { ACH_CATEGORIES, ACH_SORT_LABEL, ACH_STATUS_LABEL, achievementCatchHint, DEFAULT_ACH_FILTER, filterAchievements, groupByCategory, isAchFiltering, type AchievementFilter } from '../engine/achievementfilter';

  const save = $derived(game.save);
  const points = $derived(achievementPoints(save));
  const unlockedCount = $derived(save.achievements.length);

  let filter = $state<AchievementFilter>({ ...DEFAULT_ACH_FILTER });
  let open = $state(false);
  const shown = $derived(filterAchievements(save, filter));
  // a sorted list reads better flat; the default keeps the category sections
  const groups = $derived(filter.sort === 'default' ? groupByCategory(shown) : [[null, shown] as const]);
  const filtering = $derived(isAchFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_ACH_FILTER, sort: filter.sort }; };

  const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));
</script>

<div class="row">
  <h2 class="grow">Achievements <span class="muted">{unlockedCount} / {ACHIEVEMENTS.length}</span></h2>
  <span class="points">🏆 {points} / {totalPoints} pts · +{pct(points * POINT_GOLD_BONUS)} gold</span>
</div>
<div class="row">
  <input type="search" placeholder="Search achievements…" bind:value={filter.query} aria-label="Search achievements" />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>Filters{filtering ? ' •' : ''}</button>
  {#if filtering}<span class="muted small">{shown.length} of {ACHIEVEMENTS.length}</span>{/if}
</div>
{#if open}
  <div class="filters">
    <select bind:value={filter.category} aria-label="Category">
      <option value="any">Any category</option>
      {#each ACH_CATEGORIES as c}<option value={c}>{categoryLabel(c)}</option>{/each}
    </select>
    <select bind:value={filter.status} aria-label="Status">
      {#each Object.entries(ACH_STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.sort} aria-label="Sort">
      {#each Object.entries(ACH_SORT_LABEL) as [k, label]}<option value={k}>Sort: {label}</option>{/each}
    </select>
    {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
  </div>
{/if}
<p class="muted small">Every point is +{POINT_GOLD_BONUS * 100}% gold from defeated Pals, permanently.</p>

{#if shown.length === 0}
  <p class="muted">No achievement matches. <button class="small" onclick={clear}>Clear filters</button></p>
{/if}

{#each groups as [category, list] (category ?? 'all')}
  <section>
    {#if category}<h3>{categoryLabel(category)} <span class="muted">{list.filter((r) => r.done).length} / {list.length}</span></h3>{/if}
    <div class="grid">
      {#each list as { def: a, done, value } (a.id)}
        <div class="ach" class:done>
          <div class="row top">
            <b class="grow">{a.name}</b>
            <span class="pts">{done ? '✓ ' : ''}{a.points} pt{a.points === 1 ? '' : 's'}</span>
          </div>
          <div class="muted small">{a.desc}</div>
          <div class="bar"><span style:width="{(value / a.goal) * 100}%"></span></div>
          <div class="muted small">{fmt(value)} / {fmt(a.goal)}</div>
          {#if !done}{@const hint = achievementCatchHint(game.save, a)}{#if hint}<div class="small odds">{hint}</div>{/if}{/if}
        </div>
      {/each}
    </div>
  </section>
{/each}

<style>
  .points { color: var(--accent); font-weight: 600; }
  .small { font-size: 0.8rem; }
  .odds { margin-top: 0.2rem; }
  section { margin-top: 1rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 0.5rem; }
  .ach { border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); padding: 0.5rem; background: var(--panel-2); display: flex; flex-direction: column; gap: 0.25rem; }
  .ach.done { border-color: var(--ok); }
  .ach.done .pts { color: var(--ok); }
  .pts { font-size: 0.8rem; color: var(--muted); }
  .bar { height: 5px; }
  .ach.done .bar > span { background: var(--ok); }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 18rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
</style>
