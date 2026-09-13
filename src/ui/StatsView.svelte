<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import { game } from '../state/game.svelte';
  import { defeatsByElement, DEFAULT_STATS_FILTER, filterStats, fmtInt, isStatsFiltering, statsReport, type StatsFilter } from '../engine/stats';
  import { ELEMENT_COLORS } from '../data/elements';
  import type { Element } from '../data/types';

  // The report is rebuilt each second by the tick counter, not on every hit.
  let tick = $state(0);
  $effect(() => {
    const id = setInterval(() => { tick += 1; }, 1000);
    return () => clearInterval(id);
  });
  const all = $derived.by(() => { void tick; return statsReport(game.save, { dps: game.dps, clickDmg: game.clickDmg }); });
  let filter = $state<StatsFilter>({ ...DEFAULT_STATS_FILTER });
  const sections = $derived(filterStats(all, filter));
  const filtering = $derived(isStatsFiltering(filter));
  const rowCount = (xs: typeof all) => xs.reduce((n, sec) => n + sec.rows.length, 0);
  const clear = () => { filter = { ...DEFAULT_STATS_FILTER }; };
  // the element chart is its own section; it follows the section select and hides when a search doesn't touch it
  const elements = $derived.by(() => { void tick; return defeatsByElement(game.save); });
  const showChart = $derived.by(() => {
    if (filter.section !== 'any' && filter.section !== 'Defeats by element') return false;
    if (filter.nonZero && elements.length === 0) return false;
    const hay = ['defeats by element', ...elements.map((e) => e.element)].join(' ').toLowerCase();
    return filter.query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  });
  const maxElement = $derived(elements[0]?.n ?? 1);
</script>

<div class="row">
  <h2 class="grow">{tr("Statistics")} <span class="muted">{filtering ? `${rowCount(sections)} of ${rowCount(all)}` : ''}</span></h2>
  <span class="muted small">{tr("Lifetime, carried through Ascension")}</span>
</div>
<div class="row">
  <input type="search" placeholder={tr("Search stats…")} bind:value={filter.query} aria-label={tr("Search statistics")} />
  <select bind:value={filter.section} aria-label={tr("Section")}>
    <option value="any">{tr("All sections")}</option>
    {#each all as sec (sec.title)}<option value={sec.title}>{tr(sec.title)}</option>{/each}
    <option value="Defeats by element">{tr("Defeats by element")}</option>
  </select>
  <label class="chk"><input type="checkbox" bind:checked={filter.nonZero} /> {tr("Hide zeros")}</label>
  {#if filtering}<button class="small" onclick={clear}>{tr("Clear")}</button>{/if}
</div>
{#if sections.length === 0 && !showChart}
  <p class="muted">{tr("No statistic matches.")} <button class="small" onclick={clear}>{tr("Clear")}</button></p>
{/if}

<div class="grid">
  {#each sections as sec (sec.title)}
    <section class="card">
      <h3>{tr(sec.title)}</h3>
      <dl>
        {#each sec.rows as r (r.label)}
          <div class="stat" class:sub={r.label.startsWith(' ')}>
            <dt>{tr(r.label.trim())}</dt>
            <dd>{r.value}{#if r.hint}<span class="hint muted">{r.hint}</span>{/if}</dd>
          </div>
        {/each}
      </dl>
    </section>
  {/each}

  {#if showChart}
  <section class="card">
    <h3>{tr("Defeats by element")}</h3>
    {#if elements.length === 0}
      <p class="muted">{tr("Nothing defeated yet.")}</p>
    {:else}
      <ul class="bars">
        {#each elements as e (e.element)}
          <li>
            <span class="el">{e.element}</span>
            <span class="track"><span class="fill" style="width: {(e.n / maxElement) * 100}%; background: {ELEMENT_COLORS[e.element as Element]}"></span></span>
            <span class="n">{fmtInt(e.n)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
  {/if}
</div>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; margin-top: 0.5rem; }
  .card { background: var(--panel-2); border: 1.5px solid var(--border-soft); border-radius: var(--radius); padding: 0.6rem 0.75rem; }
  h3 { margin: 0 0 0.4rem; }
  dl { margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .stat { display: flex; justify-content: space-between; gap: 0.75rem; align-items: baseline; }
  .stat.sub { padding-left: 0.9rem; font-size: 0.85rem; }
  .stat.sub dt { color: var(--muted); }
  dt { margin: 0; }
  dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .hint { display: block; font-weight: 400; font-size: 0.75rem; }
  .bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .bars li { display: grid; grid-template-columns: 5rem 1fr 3.5rem; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
  .track { height: 8px; background: var(--border-soft); border-radius: 4px; overflow: hidden; }
  .fill { display: block; height: 100%; border-radius: 4px; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .small { font-size: 0.8rem; }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
