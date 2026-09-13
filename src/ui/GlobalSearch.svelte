<script lang="ts">
  import { game } from '../state/game.svelte';
  import { t } from '../i18n/index.svelte';
  import { ui } from '../state/ui.svelte';
  import { globalSearch, SEARCH_KIND_LABEL, SEARCH_KINDS, type SearchAction, type SearchKind, type TabEntry } from '../engine/globalsearch';

  let { tabs, go }: { tabs: TabEntry[]; go: (tab: string) => void } = $props();

  let query = $state('');
  let kind = $state<SearchKind | 'any'>('any');
  let open = $state(false);
  let active = $state(0);
  let input = $state<HTMLInputElement | null>(null);
  const results = $derived(globalSearch(game.save, query, tabs, kind));
  const ICON: Record<SearchKind, string> = { tab: '▸', pal: '🐾', species: '📖', route: '🗺', boss: '⚔', item: '📦', recipe: '🔨', tech: '🔬', upgrade: '🏺', achievement: '🏆', setting: '⚙' };

  function pick(a: SearchAction) {
    if (a.paldeck !== undefined) ui.paldeckSelect = a.paldeck;
    if (a.boxQuery !== undefined) ui.boxQuery = a.boxQuery;
    if (a.travel && !game.inBossFight) game.travel(a.travel);
    go(a.tab);
    query = ''; open = false; input?.blur();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { open = false; input?.blur(); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { active = (active + 1) % results.length; e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = (active - 1 + results.length) % results.length; e.preventDefault(); }
    else if (e.key === 'Enter') { pick(results[Math.min(active, results.length - 1)].action); e.preventDefault(); }
  }
  $effect(() => { void results; active = 0; });
  // the "/" shortcut asks for focus through the ui store
  $effect(() => { if (ui.focusSearch > 0) { input?.focus(); open = true; } });
</script>

<svelte:window onkeydown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input?.focus(); open = true; } }} />

<div class="search">
  <div class="row box">
    <input type="search" bind:this={input} bind:value={query} placeholder={t('header.search')} aria-label="Search the game"
      onfocus={() => (open = true)} onkeydown={onKey} onblur={() => setTimeout(() => (open = false), 150)} />
    <select bind:value={kind} aria-label="Search kind" onchange={() => input?.focus()}>
      <option value="any">All</option>
      {#each SEARCH_KINDS as k}<option value={k}>{SEARCH_KIND_LABEL[k]}</option>{/each}
    </select>
  </div>
  {#if open && query.trim()}
    <div class="results panel" role="listbox">
      {#if results.length === 0}
        <div class="muted small empty">Nothing found{kind !== 'any' ? ` in ${SEARCH_KIND_LABEL[kind]}` : ''}.</div>
      {/if}
      {#each results as r, i (r.kind + r.id)}
        <button class="result" class:active={i === active} role="option" aria-selected={i === active}
          onmousedown={(e) => e.preventDefault()} onclick={() => pick(r.action)} onmouseenter={() => (active = i)}>
          <span class="icon">{ICON[r.kind]}</span>
          <span class="grow"><b>{r.title}</b> <span class="muted small">{r.subtitle}</span></span>
          <span class="muted tiny">{SEARCH_KIND_LABEL[r.kind]}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search { position: relative; min-width: 220px; flex: 1 1 260px; }
  .box { gap: 0.3rem; flex-wrap: nowrap; }
  input[type='search'] { flex: 1; min-width: 0; font-size: 0.9rem; }
  select { font-size: 0.8rem; max-width: 8rem; }
  .results { position: absolute; top: calc(100% + 0.3rem); left: 0; right: 0; z-index: 30; background: rgba(var(--navy), 0.98); max-height: 60vh; overflow-y: auto; padding: 0.3rem; display: flex; flex-direction: column; gap: 0.15rem; box-shadow: var(--shadow-float); }
  .result { display: flex; gap: 0.5rem; align-items: center; text-align: left; border-color: transparent; background: transparent; padding: 0.35rem 0.5rem; }
  .result.active { background: var(--panel-2); border-color: var(--accent); }
  .icon { width: 1.4rem; text-align: center; }
  .small { font-size: 0.8rem; }
  .tiny { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  .empty { padding: 0.5rem; }
  @media (max-width: 800px) { .search { flex-basis: 100%; } .results { max-height: 50vh; } }
</style>
