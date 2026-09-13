<script lang="ts">
  import { game } from '../state/game.svelte';
  import { catchSummary, DEFAULT_LOG_FILTER, filterLog, isLogFiltering, LOG_KIND_LABEL, LOG_KINDS, type LogFilter } from '../engine/logfilter';

  const COMPACT = 12;
  let filter = $state<LogFilter>({ ...DEFAULT_LOG_FILTER });
  let expanded = $state(false);
  const filtering = $derived(isLogFiltering(filter));
  const matches = $derived(filterLog(game.log, filter));
  // filtering shows everything that matches; otherwise the recent dozen unless expanded
  const shown = $derived(filtering || expanded ? matches : matches.slice(0, COMPACT));
  // realized vs expected odds over the throws in view, shown when the Catching category is picked
  const summary = $derived(filter.kind === 'catch' ? catchSummary(matches) : null);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
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
  {#if summary}
    <div class="summary small" title="Throws in the entries shown: how many landed, against the average odds they were thrown at">🎯 {summary.caught} of {summary.throws} throw{summary.throws === 1 ? '' : 's'} landed (<b>{pct(summary.rate)}</b>) · average odds {pct(summary.expected)}</div>
  {:else if filter.kind === 'catch'}
    <div class="muted small">No throws logged yet.</div>
  {/if}
  <div class="lines" class:tall={filtering || expanded}>
    {#each shown as e, i (e.at + e.text + i)}
      <div class="line" class:latest={i === 0 && !filtering}><span class="t muted">{time(e.at)}</span> <span class="k muted">{LOG_KIND_LABEL[e.kind]}</span> {e.text}{#if e.chance !== undefined} <span class="odds" class:hit={e.landed === true} class:miss={e.landed === false} title={e.landed === undefined ? 'Catch odds with the sphere your policy picks' : e.landed ? 'Landed at these odds' : 'Missed at these odds'}>🎯 {pct(e.chance)}</span>{/if}</div>
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
  .summary { color: var(--text); margin: 0 0 0.3rem; }
  .odds { color: var(--accent-2); font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .odds.hit { color: var(--ok); }
  .odds.miss { color: var(--muted); font-weight: 400; }
  input[type='search'] { min-width: 6rem; flex: 1; max-width: 11rem; font-size: 0.85rem; }
  select { font-size: 0.85rem; max-width: 10rem; }
</style>
