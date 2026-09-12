<script lang="ts">
  import { game } from '../state/game.svelte';
  import { expToLevel } from '../engine/formulas';
  import { SPHERES } from '../data/spheres';
  import { SPHERE_TIERS } from '../data/types';
  import { achievementPoints } from '../engine/achievements';
  import NotificationCenter from './NotificationCenter.svelte';
  import GlobalSearch from './GlobalSearch.svelte';
  import ItemIcon from './ItemIcon.svelte';
  import type { TabEntry } from '../engine/globalsearch';

  let { tabs, go }: { tabs: TabEntry[]; go: (tab: string) => void } = $props();
  import { ui } from '../state/ui.svelte';

  // phones get a two-line strip: identity + actions, then the numbers; the search box folds behind a 🔍 button
  let mobile = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(max-width: 800px)');
    const apply = () => (mobile = mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });
  let searchOpen = $state(false);
  // the / shortcut and Ctrl+K must reach a visible box
  $effect(() => { if (ui.focusSearch > 0) searchOpen = true; });
  const fmt = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : Math.floor(n).toLocaleString());

  const player = $derived(game.save.player);
  const expPct = $derived((player.exp / expToLevel(player.level + 1)) * 100);
  const spheres = $derived(
    SPHERE_TIERS
      .map((t) => ({ tier: t, n: game.save.inventory[SPHERES[t].itemId] ?? 0 }))
      .filter((s) => s.n > 0),
  );

</script>

{#if mobile}
<header class="panel compact">
  <div class="row top">
    <div class="ident">
      <h1>Catcha</h1>
      <div class="muted tiny">{game.region.name} · Lv {player.level}</div>
    </div>
    <div class="bar exp grow" title="{Math.floor(player.exp)} / {expToLevel(player.level + 1)} exp"><span style:width="{expPct}%"></span></div>
    <button class="small icon" class:active={searchOpen} onclick={() => { searchOpen = !searchOpen; if (searchOpen) ui.focusSearch += 1; }} aria-expanded={searchOpen} title="Search">🔍</button>
    <NotificationCenter />
    <button class="small" onclick={() => game.persist()}>Save</button>
  </div>
  <div class="row chips">
    <span class="chip">💰 {fmt(player.gold)}</span>
    <span class="chip" title="Effigies">🗿 {player.effigies}</span>
    <span class="chip" title="Tech points">🔬 {player.techPoints}</span>
    <span class="chip" title="Achievement points">🏆 {achievementPoints(game.save)}</span>
    {#if game.save.prestige.relics > 0 || game.save.prestige.ascensions > 0}<span class="chip" title="Ancient Relics">🏺 {game.save.prestige.relics}</span>{/if}
    {#each spheres as s}<span class="chip sphere" title={SPHERES[s.tier].name}>{SPHERES[s.tier].name.replace(' Sphere', '')} ×{s.n}</span>{/each}
    {#if spheres.length === 0}<span class="chip muted">no spheres</span>{/if}
  </div>
  {#if searchOpen}<div class="row search-row"><GlobalSearch {tabs} {go} /></div>{/if}
</header>
{:else}
<header class="panel row">
  <div>
    <h1>Catcha</h1>
    <div class="muted">{game.region.name}</div>
  </div>

  <div class="stat">
    <div class="label">Level {player.level}</div>
    <div class="bar exp"><span style:width="{expPct}%"></span></div>
    <div class="muted small">{Math.floor(player.exp)} / {expToLevel(player.level + 1)} exp</div>
  </div>

  <div class="stat">
    <div class="label">💰 {Math.floor(player.gold).toLocaleString()}</div>
    <div class="muted small">Effigies: {player.effigies} · Tech pts: {player.techPoints} · 🏆 {achievementPoints(game.save)}{#if game.save.prestige.relics > 0 || game.save.prestige.ascensions > 0}&nbsp;· 🏺 {game.save.prestige.relics}{/if}</div>
  </div>

  <div class="stat grow">
    <div class="label">Spheres</div>
    <div class="muted small">
      {#if spheres.length === 0}none — visit the Merchant{/if}
      {#each spheres as s}<span class="chip"><ItemIcon id={SPHERES[s.tier].itemId} size={16} /> {SPHERES[s.tier].name} ×{s.n}</span>{/each}
    </div>
  </div>

  <GlobalSearch {tabs} {go} />

  <div class="row">
    <NotificationCenter />
    <button class="small" onclick={() => game.persist()}>Save</button>
  </div>
</header>
{/if}

<style>
  header { gap: 1.5rem; }
  header.compact { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.5rem 0.65rem; }
  .compact .top { flex-wrap: nowrap; gap: 0.5rem; }
  .compact h1 { font-size: 1.05rem; margin: 0; line-height: 1.1; }
  .compact .ident { flex-shrink: 0; }
  .compact .tiny { font-size: 0.7rem; line-height: 1.1; white-space: nowrap; }
  .compact .bar { height: 8px; min-width: 3rem; }
  .compact .icon { padding: 0.15rem 0.45rem; }
  .compact .icon.active { border-color: var(--accent-2); }
  .compact .chips { gap: 0.3rem; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .compact .chips::-webkit-scrollbar { display: none; }
  .compact .chip { flex: 0 0 auto; margin: 0; font-size: 0.78rem; font-weight: 700; padding: 0.05rem 0.45rem; background: var(--panel-2); border: 1px solid var(--border-soft); border-radius: 999px; white-space: nowrap; }
  .compact .chip.sphere { color: var(--accent); }
  .compact .search-row { margin-top: 0.15rem; }
  h1 { font-size: 1.6rem; color: var(--title); text-shadow: var(--title-glow); letter-spacing: 0.04em; text-transform: uppercase; }
  .stat .label { font-weight: 800; }
  .stat { min-width: 150px; }
  .label { font-weight: 600; }
  .small { font-size: 0.8rem; }
  .chip { display: inline-block; margin-right: 0.4rem; }
</style>
