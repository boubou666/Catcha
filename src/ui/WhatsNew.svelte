<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import { whatsNew } from '../state/whatsnew.svelte';
  import { CHANGELOG, DEFAULT_CHANGELOG_FILTER, filterChangelog, isChangelogFiltering, type ChangelogFilter } from '../data/changelog';

  let filter = $state<ChangelogFilter>({ ...DEFAULT_CHANGELOG_FILTER });
  // searching widens to the whole history so an old entry can be found from the "new since last time" view
  const filtering = $derived(isChangelogFiltering(filter));
  const source = $derived(filtering ? CHANGELOG : whatsNew.entries);
  const shown = $derived(filterChangelog(source, filter));
  const itemCount = (xs: typeof CHANGELOG) => xs.reduce((n, e) => n + e.items.length, 0);
  const clear = () => { filter = { ...DEFAULT_CHANGELOG_FILTER }; };
  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && whatsNew.open) whatsNew.close(); }} />

{#if whatsNew.open}
  <div class="backdrop">
    <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="whatsnew-title">
      <div class="row">
        <h2 id="whatsnew-title" class="grow">{tr("What's new")}</h2>
        <button class="small" onclick={() => whatsNew.close()}>✕</button>
      </div>
      <div class="row">
        <input type="search" placeholder={tr("Search the changelog…")} bind:value={filter.query} aria-label={tr("Search the changelog")} />
        <select bind:value={filter.version} aria-label={tr("Version")}>
          <option value="any">{tr("All versions")}</option>
          {#each CHANGELOG as e (e.version)}<option value={e.version}>v{e.version} — {e.title}</option>{/each}
        </select>
        <span class="muted small">{filtering ? `${itemCount(shown)} of ${itemCount(CHANGELOG)}` : ''}</span>
        {#if filtering}<button class="small" onclick={clear}>{tr("Clear")}</button>{/if}
      </div>
      {#if shown.length === 0}
        <p class="muted">{tr("Nothing matches.")} <button class="small" onclick={clear}>{tr("Clear")}</button></p>
      {/if}
      <div class="entries">
        {#each shown as e (e.version)}
          <section>
            <h3><span class="ver">v{e.version}</span> {e.title} <span class="muted date">{fmtDate(e.date)}</span></h3>
            <ul>{#each e.items as item}<li>{item}</li>{/each}</ul>
          </section>
        {/each}
      </div>
      <button class="primary" onclick={() => whatsNew.close()}>{tr("Got it")}</button>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; z-index: 10; background: var(--overlay); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal { width: min(560px, 100%); max-height: 90vh; display: flex; flex-direction: column; gap: 0.75rem; }
  .entries { overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; padding-right: 0.25rem; }
  h3 { text-transform: none; letter-spacing: 0; color: var(--text); font-size: 1rem; }
  .ver { color: var(--accent); font-family: ui-monospace, monospace; font-size: 0.85rem; margin-right: 0.3rem; }
  .date { font-weight: 400; font-size: 0.8rem; margin-left: 0.4rem; }
  ul { margin: 0.35rem 0 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
  button.primary { width: 100%; }
  .small { font-size: 0.8rem; }
  input[type='search'] { min-width: 8rem; flex: 1; max-width: 14rem; font-size: 0.85rem; }
  select { font-size: 0.85rem; max-width: 14rem; }
</style>
