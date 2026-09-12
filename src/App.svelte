<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './state/game.svelte';
  import Header from './ui/Header.svelte';
  import RouteView from './ui/RouteView.svelte';
  import RoutesPanel from './ui/RoutesPanel.svelte';
  import ArenaPanel from './ui/ArenaPanel.svelte';
  import BossesPanel from './ui/BossesPanel.svelte';
  import LogPanel from './ui/LogPanel.svelte';
  import PartyView from './ui/PartyView.svelte';
  import BoxView from './ui/BoxView.svelte';
  import BaseView from './ui/BaseView.svelte';
  import CraftView from './ui/CraftView.svelte';
  import BreedingView from './ui/BreedingView.svelte';
  import TechView from './ui/TechView.svelte';
  import ExpeditionView from './ui/ExpeditionView.svelte';
  import AchievementsView from './ui/AchievementsView.svelte';
  import DailyView from './ui/DailyView.svelte';
  import SettingsView from './ui/SettingsView.svelte';
  import PrestigeView from './ui/PrestigeView.svelte';
  import CompareView from './ui/CompareView.svelte';
  import PaldeckView from './ui/PaldeckView.svelte';
  import ItemsView from './ui/ItemsView.svelte';
  import ShopView from './ui/ShopView.svelte';
  import OfflineSummary from './ui/OfflineSummary.svelte';
  import { play, buzz } from './ui/sfx';
  import Toasts from './ui/Toasts.svelte';
  import UpdateBanner from './ui/UpdateBanner.svelte';
  import WhatsNew from './ui/WhatsNew.svelte';
  import TutorialPanel from './ui/TutorialPanel.svelte';
  import StatsView from './ui/StatsView.svelte';
  import SpawnList from './ui/SpawnList.svelte';
  import { whatsNew } from './state/whatsnew.svelte';

  type Tab = 'routes' | 'bosses' | 'log' | 'party' | 'box' | 'compare' | 'paldeck' | 'breed' | 'base' | 'craft' | 'items' | 'shop' | 'expedition' | 'tech' | 'daily' | 'achievements' | 'prestige' | 'settings' | 'stats';
  type Group = { id: string; label: string; tabs: { id: Tab; label: string }[] };
  const WORLD: Group = { id: 'world', label: 'World', tabs: [{ id: 'routes', label: 'Routes' }, { id: 'bosses', label: 'Bosses' }, { id: 'log', label: 'Log' }] };
  const GROUPS: Group[] = [
    { id: 'pals', label: 'Pals', tabs: [
      { id: 'party', label: 'Party' }, { id: 'box', label: 'Box' }, { id: 'compare', label: 'Compare' },
      { id: 'paldeck', label: 'Paldeck' }, { id: 'breed', label: 'Breeding' },
    ] },
    { id: 'base', label: 'Base', tabs: [
      { id: 'base', label: 'Base' }, { id: 'craft', label: 'Craft' }, { id: 'items', label: 'Items' },
      { id: 'shop', label: 'Merchant' }, { id: 'expedition', label: 'Expeditions' },
    ] },
    { id: 'progress', label: 'Progress', tabs: [
      { id: 'tech', label: 'Tech' }, { id: 'daily', label: 'Daily' }, { id: 'achievements', label: 'Achievements' }, { id: 'stats', label: 'Stats' },
      { id: 'prestige', label: 'Ascension' }, { id: 'settings', label: 'Settings' },
    ] },
  ];
  // Below 800px the left column folds into a "World" group and the arena becomes a sticky bar.
  let isMobile = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(max-width: 800px)');
    const apply = () => (isMobile = mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });
  const groups = $derived(isMobile ? [WORLD, ...GROUPS] : GROUPS);
  const groupOf = (t: Tab) => [WORLD, ...GROUPS].find((g) => g.tabs.some((x) => x.id === t))!;

  const UI_KEY = 'catcha.ui.tab';
  const stored = (() => { try { return localStorage.getItem(UI_KEY) as Tab | null; } catch { return null; } })();
  let tab = $state<Tab>(stored && [WORLD, ...GROUPS].some((g) => g.tabs.some((x) => x.id === stored)) ? stored : 'party');
  // a World tab restored on desktop has no home there
  $effect(() => { if (!isMobile && groupOf(tab).id === 'world') tab = 'party'; });
  const group = $derived(groupOf(tab));
  // last tab visited in each group, so switching groups lands where you were
  const lastInGroup = $state<Record<string, Tab>>({});

  function select(t: Tab) {
    tab = t;
    lastInGroup[groupOf(t).id] = t;
    try { localStorage.setItem(UI_KEY, t); } catch { /* ignore */ }
  }
  function selectGroup(g: Group) {
    select(lastInGroup[g.id] ?? g.tabs[0].id);
  }

  onMount(() => {
    const stop = game.start();
    const off = game.on((e) => { play(e); buzz(e); });
    whatsNew.init();
    return () => { stop(); off(); };
  });
</script>

<OfflineSummary />
<Toasts />
<UpdateBanner />
<WhatsNew />

<div class="app">
  <Header />
  {#if isMobile}<div class="sticky-arena"><ArenaPanel compact /></div>{/if}
  <main class:mobile={isMobile}>
    {#if !isMobile}
      <section class="left">
        <RouteView />
      </section>
    {/if}
    <section class="right">
      <TutorialPanel {tab} go={(t) => select(t as Tab)} />
      <nav class="groups">
        {#each groups as g (g.id)}
          <button class:active={group.id === g.id} onclick={() => selectGroup(g)}>{g.label}</button>
        {/each}
      </nav>
      <nav class="tabs">
        {#each group.tabs as t (t.id)}
          <button class:active={tab === t.id} onclick={() => select(t.id)}>{t.label}</button>
        {/each}
      </nav>
      <div class="panel tab-body">
        {#if tab === 'routes'}<RoutesPanel />{#if !game.inBossFight}<div class="panel spawns-mobile"><SpawnList /></div>{/if}
        {:else if tab === 'bosses'}<BossesPanel />
        {:else if tab === 'log'}<LogPanel />
        {:else if tab === 'party'}<PartyView />
        {:else if tab === 'box'}<BoxView />
        {:else if tab === 'base'}<BaseView />
        {:else if tab === 'craft'}<CraftView />
        {:else if tab === 'breed'}<BreedingView />
        {:else if tab === 'expedition'}<ExpeditionView />
        {:else if tab === 'tech'}<TechView />
        {:else if tab === 'paldeck'}<PaldeckView />
        {:else if tab === 'items'}<ItemsView />
        {:else if tab === 'shop'}<ShopView />
        {:else if tab === 'daily'}<DailyView />
        {:else if tab === 'settings'}<SettingsView />
        {:else if tab === 'prestige'}<PrestigeView />
        {:else if tab === 'compare'}<CompareView />
        {:else if tab === 'stats'}<StatsView />
        {:else}<AchievementsView />{/if}
      </div>
    </section>
  </main>
</div>

<style>
  .app { max-width: 1200px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  main { display: grid; grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr); gap: 1rem; }
  main.mobile { grid-template-columns: 1fr; }
  .spawns-mobile { margin-top: 0.75rem; }
  .sticky-arena { position: sticky; top: 0; z-index: 5; background: var(--bg); padding-bottom: 0.25rem; }
  @media (max-width: 800px) {
    .app { padding: 0.5rem; gap: 0.5rem; }
    .tab-body { min-height: 0; padding: 0.75rem; }
  }
  .groups { display: flex; gap: 0.25rem; margin-bottom: 0.4rem; }
  .groups button { flex: 1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.8rem; }
  .groups button.active { background: var(--accent); color: #1a1a1a; border-color: transparent; }
  .tabs { display: flex; gap: 0.25rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .tabs button { border-radius: 6px 6px 0 0; }
  .tabs button.active { background: var(--panel); border-color: var(--accent); color: var(--accent); }
  .tab-body { min-height: 400px; }
</style>
