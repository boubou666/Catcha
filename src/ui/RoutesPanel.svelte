<script lang="ts">
  import { game } from '../state/game.svelte';
  import { describeRequirement, routeCleared, routeKills } from '../engine/progress';
  import { routeQuota } from '../engine/prestige';
  import { tableOddsText } from './catchText';
  import { ELEMENTS } from '../data/types';
  import { DEFAULT_ROUTE_FILTER, filterRoutes, isRouteFiltering, ROUTE_STATUS_LABEL, type RouteFilter } from '../engine/routefilter';
  import { prefs } from '../state/prefs.svelte';
  import { ui } from '../state/ui.svelte';
  import { todaysChallenge } from '../engine/challenge';
  const challengeId = $derived(todaysChallenge(game.save)?.route.id ?? null);
  import WorldMap from './WorldMap.svelte';
  import { t, t as tr } from '../i18n/index.svelte';

  let filter = $state<RouteFilter>({ ...DEFAULT_ROUTE_FILTER });
  let open = $state(false);
  const filtering = $derived(isRouteFiltering(filter));
  // while filtering, search the whole map; otherwise show the current region as before
  const rows = $derived(filterRoutes(game.save, filter));
  const grouped = $derived.by(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) m.set(r.region.id, [...(m.get(r.region.id) ?? []), r]);
    return [...m.values()];
  });
  const total = $derived(game.regions.reduce((n, r) => n + r.routes.length, 0));
  const clear = () => { filter = { ...DEFAULT_ROUTE_FILTER }; };
  // folded: one line with where you are; searching unfolds it
  const folded = $derived(!prefs.routesOpen && !filtering);
  $effect(() => { if (ui.mapFocus) { prefs.setRoutesView('map'); prefs.setRoutesOpen(true); filter.query = ''; } });
</script>

<div class="panel" class:folded>
  {#if folded}
    <div class="row head">
      <h3 class="grow">📍 {game.route.name} <span class="muted">Lv {game.route.level} · {game.region.name} · {routeKills(game.save, game.route.id)} / {routeQuota(game.save, game.route)}</span></h3>
      <input type="search" placeholder={t('routes.search')} bind:value={filter.query} aria-label={tr("Search routes")} />
      <button class="small fold" onclick={() => prefs.setRoutesOpen(true)} title={prefs.routesView === 'map' ? t('routes.showMap') : t('routes.showRoutes')} aria-expanded="false">▾</button>
    </div>
  {:else if prefs.routesView === 'map' && !filtering}
    <div class="row head">
      <h3 class="grow">{t('routes.map')} — {game.region.name}</h3>
      <input type="search" placeholder={t('routes.search')} bind:value={filter.query} aria-label={tr("Search routes")} />
      <button class="small fold" onclick={() => prefs.setRoutesOpen(false)} title={t('routes.minimizeMap')} aria-expanded="true">▴</button>
    </div>
    <WorldMap />
  {:else}
  {#if game.regions.length > 1 && !filtering}
    <div class="regions row">
      {#each game.regions as r (r.id)}
        <button class="small" class:active={r.id === game.region.id} disabled={game.inBossFight} onclick={() => game.travelToRegion(r.id)}>{r.name}</button>
      {/each}
    </div>
  {/if}
  <div class="row head">
    <h3 class="grow">{filtering ? `${t('routes.routes')} — ${rows.length} / ${total}` : `${t('routes.routes')} — ${game.region.name}`}</h3>
    <input type="search" placeholder={t('routes.search')} bind:value={filter.query} aria-label={tr("Search routes")} />
    <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>{t('routes.filters')}{filtering ? ' •' : ''}</button>
    {#if !filtering}<button class="small" onclick={() => prefs.setRoutesView('map')} title={t('routes.showMap')}>🗺 {t('routes.map')}</button><button class="small fold" onclick={() => prefs.setRoutesOpen(false)} title={t('routes.minimizeRoutes')} aria-expanded="true">▴</button>{/if}
  </div>
  {#if open}
    <div class="filters">
      <select bind:value={filter.status} aria-label={tr("Route status")}>
        {#each Object.entries(ROUTE_STATUS_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
      </select>
      <select bind:value={filter.element} aria-label={tr("Element")}>
        <option value="any">{tr("Any element")}</option>
        {#each ELEMENTS as e}<option value={e}>{e}</option>{/each}
      </select>
      {#if filtering}<button class="small" onclick={clear}>{tr("Clear")}</button>{/if}
    </div>
  {/if}

  {#if filtering}
    {#if rows.length === 0}
      <p class="muted small">{tr("No route matches.")} <button class="small" onclick={clear}>{tr("Clear")}</button></p>
    {/if}
    {#each grouped as group (group[0].region.id)}
      {#if game.regions.length > 1}<div class="muted small region-title">{group[0].region.name}</div>{/if}
      <div class="routes">
        {#each group as { route: r, status } (r.id)}
          <button
            class:active={r.id === game.route.id}
            class:cleared={status === 'cleared'}
            disabled={status === 'locked' || game.inBossFight}
            onclick={() => game.travel(r.id)}
            title={status !== 'locked' ? `${routeKills(game.save, r.id)} / ${routeQuota(game.save, r)} defeated. Catch: ${tableOddsText(game.save, r.spawns)}.` : describeRequirement(r.unlock)}
          >
            <span>{r.id === challengeId ? '⭐ ' : ''}{r.name}</span>
            <span class="muted">Lv {r.level}{status === 'cleared' ? ' ✓' : status === 'locked' ? ' 🔒' : ''}</span>
          </button>
        {/each}
      </div>
    {/each}
  {:else}
    <div class="routes">
      {#each game.region.routes as r (r.id)}
        {@const unlocked = game.canTravel(r.id)}
        {@const cleared = routeCleared(game.save, r)}
        <button
          class:active={r.id === game.route.id}
          class:cleared
          disabled={!unlocked || game.inBossFight}
          onclick={() => game.travel(r.id)}
          title={unlocked ? `${routeKills(game.save, r.id)} / ${routeQuota(game.save, r)} defeated. Catch: ${tableOddsText(game.save, r.spawns)}.` : describeRequirement(r.unlock)}
        >
          <span>{r.id === challengeId ? '⭐ ' : ''}{r.name}</span>
          <span class="muted">Lv {r.level}{cleared ? ' ✓' : ''}</span>
        </button>
      {/each}
    </div>
  {/if}
  {/if}
</div>

<style>
  .regions { margin-bottom: 0.6rem; }
  .regions button.active { background: linear-gradient(180deg, #7fe3ff, #35d0ff); color: var(--on-accent); border-color: #d9f6ff; }
  .head { margin-bottom: 0.4rem; }
  .folded .head { margin-bottom: 0; }
  .folded input[type='search'] { max-width: 8rem; }
  .fold { padding-inline: 0.5rem; }
  .head h3 { margin: 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .routes { display: flex; flex-direction: column; gap: 0.25rem; }
  .routes button { display: flex; justify-content: space-between; text-align: left; }
  .routes button { border-radius: var(--radius-sm); box-shadow: none; font-weight: 700; }
  .routes button.active { background: var(--accent); color: var(--on-accent); box-shadow: var(--shadow-sm); }
  .routes button.active .muted { color: var(--on-accent); opacity: 0.75; }
  .routes button.cleared:not(.active) { color: var(--ok); }
  .small { font-size: 0.85rem; }
  input[type='search'] { min-width: 7rem; flex: 1; max-width: 12rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0 0 0.5rem; padding: 0.4rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .region-title { margin: 0.5rem 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }
</style>
