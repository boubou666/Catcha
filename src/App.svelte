<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './state/game.svelte';
  import Header from './ui/Header.svelte';
  import RouteView from './ui/RouteView.svelte';
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

  type Tab = 'party' | 'box' | 'base' | 'craft' | 'breed' | 'expedition' | 'tech' | 'paldeck' | 'items' | 'shop' | 'achievements' | 'daily' | 'settings' | 'prestige' | 'compare';
  const TABS: { id: Tab; label: string }[] = [
    { id: 'party', label: 'Party' },
    { id: 'box', label: 'Box' },
    { id: 'compare', label: 'Compare' },
    { id: 'base', label: 'Base' },
    { id: 'craft', label: 'Craft' },
    { id: 'breed', label: 'Breeding' },
    { id: 'expedition', label: 'Expeditions' },
    { id: 'tech', label: 'Tech' },
    { id: 'paldeck', label: 'Paldeck' },
    { id: 'items', label: 'Items' },
    { id: 'shop', label: 'Merchant' },
    { id: 'daily', label: 'Daily' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'prestige', label: 'Ascension' },
    { id: 'settings', label: 'Settings' },
  ];
  let tab = $state<Tab>('party');

  onMount(() => game.start());
</script>

<OfflineSummary />

<div class="app">
  <Header />
  <main>
    <section class="left">
      <RouteView />
    </section>
    <section class="right">
      <nav class="tabs">
        {#each TABS as t}
          <button class:active={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
        {/each}
      </nav>
      <div class="panel tab-body">
        {#if tab === 'party'}<PartyView />
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
        {:else}<AchievementsView />{/if}
      </div>
    </section>
  </main>
</div>

<style>
  .app { max-width: 1200px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  main { display: grid; grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr); gap: 1rem; }
  @media (max-width: 800px) { main { grid-template-columns: 1fr; } }
  .tabs { display: flex; gap: 0.25rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .tabs button { border-radius: 6px 6px 0 0; }
  .tabs button.active { background: var(--panel); border-color: var(--accent); color: var(--accent); }
  .tab-body { min-height: 400px; }
</style>
