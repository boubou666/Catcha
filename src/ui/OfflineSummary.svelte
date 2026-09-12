<script lang="ts">
  import { game } from '../state/game.svelte';
  import { DEFAULT_OFFLINE_FILTER, filterOfflineRows, isOfflineFiltering, OFFLINE_CAP_MS, OFFLINE_SHOW_LABEL, OFFLINE_SORT_LABEL, offlineRows, type OfflineFilter } from '../engine/offline';
  import { formatDuration } from './format';

  const report = $derived(game.offline);
  const all = $derived(report ? offlineRows(report) : []);
  let filter = $state<OfflineFilter>({ ...DEFAULT_OFFLINE_FILTER });
  const rows = $derived(filterOfflineRows(all, filter));
  const filtering = $derived(isOfflineFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_OFFLINE_FILTER, sort: filter.sort }; };
  // the controls only earn their space once there's a real list to sift
  const showControls = $derived(all.length > 6);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && report) game.dismissOffline(); }} />

{#if report}
  <div class="backdrop">
    <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <h2 id="offline-title">Welcome back</h2>
      <p class="muted">
        Your base kept working for <b>{formatDuration(report.elapsedMs)}</b>{#if report.capped}
          <span class="cap"> (capped at {formatDuration(OFFLINE_CAP_MS)})</span>{/if}.
        Wild Pals don't fight while you're away.
      </p>

      {#if showControls}
        <div class="row controls">
          <input type="search" placeholder="Search…" bind:value={filter.query} aria-label="Search the summary" />
          <select bind:value={filter.show} aria-label="Show">
            {#each Object.entries(OFFLINE_SHOW_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
          </select>
          <select bind:value={filter.sort} aria-label="Sort">
            {#each Object.entries(OFFLINE_SORT_LABEL) as [k, label]}<option value={k}>Sort: {label}</option>{/each}
          </select>
          <span class="muted small">{filtering ? `${rows.length} of ${all.length}` : all.length}</span>
          {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
        </div>
      {/if}

      {#if rows.length === 0}
        <p class="muted small">Nothing matches. <button class="small" onclick={clear}>Clear</button></p>
      {/if}
      <table>
        <tbody>
          {#each rows as r (r.kind + r.id)}
            <tr><td>{r.label}</td><td class="n" class:gain={r.tone === 'gain'} class:loss={r.tone === 'loss'}>{r.text}</td></tr>
          {/each}
        </tbody>
      </table>

      <button class="primary" onclick={() => game.dismissOffline()}>Continue</button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; z-index: 10;
    background: var(--overlay);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .modal { width: min(460px, 100%); max-height: 90vh; overflow-y: auto; overflow-x: hidden; }
  .cap { color: var(--accent); }
  .controls { margin-top: 0.5rem; }
  .controls input[type='search'] { min-width: 6rem; flex: 1; max-width: 10rem; font-size: 0.85rem; }
  .controls select { font-size: 0.85rem; }
  .small { font-size: 0.8rem; }
  table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; }
  td { padding: 0.3rem 0.25rem; border-bottom: 1.5px solid var(--border-soft); }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .gain { color: var(--ok); }
  .loss { color: var(--muted); }
  button.primary { width: 100%; }
</style>
