<script lang="ts">
  import { game } from '../state/game.svelte';
  import { DEFAULT_LOG_FILTER, filterLog, isLogFiltering, LOG_KIND_LABEL, LOG_KINDS, type LogFilter } from '../engine/logfilter';

  const COMPACT = 12;
  let filter = $state<LogFilter>({ ...DEFAULT_LOG_FILTER });
  let expanded = $state(false);
  const filtering = $derived(isLogFiltering(filter));
  const matches = $derived(filterLog(game.log, filter));
  // filtering shows everything that matches; otherwise the recent dozen unless expanded
  const shown = $derived(filtering || expanded ? matches : matches.slice(0, COMPACT));
  const clear = () => { filter = { ...DEFAULT_LOG_FILTER }; };
  const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
</script>

<div class="panel log">
  <div class="row head">
    <h3 class="grow">Log <span class="muted">{filtering ? `${matches.length} of ${game.log.length}` : game.log.length}</span></h3>
    <input type="search" placeholder="Search log…" bind:value={filter.query} aria-label="Search the log" />
    <select bind:value={filter.kind} aria-label="Log category">
      <option value="any">All</option>
      {#each LOG_KINDS as k}<option value={k}>{LOG_KIND_LABEL[k]}</option>{/each}
    </select>
  </div>
  {#if shown.length === 0}
    <div class="muted">{filtering ? 'No entry matches.' : 'Nothing yet.'} {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}</div>
  {/if}
  <div class="lines" class:tall={filtering || expanded}>
    {#each shown as e, i (e.at + e.text + i)}
      <div class="line" class:latest={i === 0 && !filtering}><span class="t muted">{time(e.at)}</span> <span class="k muted">{LOG_KIND_LABEL[e.kind]}</span> {e.text}</div>
    {/each}
  </div>
  {#if !filtering && game.log.length > COMPACT}
    <button class="small more" onclick={() => (expanded = !expanded)}>{expanded ? 'Show recent only' : `Show all ${game.log.length}`}</button>
  {/if}
</div>

<style>
  .log { font-size: 0.85rem; color: var(--muted); }
  .head { margin-bottom: 0.3rem; }
  .head h3 { margin: 0; }
  .line.latest { color: var(--text); }
  .lines.tall { max-height: 40vh; overflow-y: auto; }
  .t { font-variant-numeric: tabular-nums; font-size: 0.75rem; margin-right: 0.3rem; }
  .k { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; margin-right: 0.3rem; opacity: 0.8; }
  .small { font-size: 0.8rem; }
  .more { margin-top: 0.4rem; }
  input[type='search'] { min-width: 6rem; flex: 1; max-width: 11rem; font-size: 0.85rem; }
  select { font-size: 0.85rem; max-width: 10rem; }
</style>
