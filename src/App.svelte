<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './state/game.svelte';
  import Header from './ui/Header.svelte';
  import RouteView from './ui/RouteView.svelte';
  import PartyView from './ui/PartyView.svelte';
  import BoxView from './ui/BoxView.svelte';
  import PaldeckView from './ui/PaldeckView.svelte';
  import ItemsView from './ui/ItemsView.svelte';
  import ShopView from './ui/ShopView.svelte';

  type Tab = 'party' | 'box' | 'paldeck' | 'items' | 'shop';
  const TABS: { id: Tab; label: string }[] = [
    { id: 'party', label: 'Party' },
    { id: 'box', label: 'Box' },
    { id: 'paldeck', label: 'Paldeck' },
    { id: 'items', label: 'Items' },
    { id: 'shop', label: 'Merchant' },
  ];
  let tab = $state<Tab>('party');

  onMount(() => game.start());
</script>

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
        {:else if tab === 'paldeck'}<PaldeckView />
        {:else if tab === 'items'}<ItemsView />
        {:else}<ShopView />{/if}
      </div>
    </section>
  </main>
</div>

<style>
  .app { max-width: 1200px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  main { display: grid; grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr); gap: 1rem; }
  @media (max-width: 800px) { main { grid-template-columns: 1fr; } }
  .tabs { display: flex; gap: 0.25rem; margin-bottom: 0.5rem; }
  .tabs button { border-radius: 6px 6px 0 0; }
  .tabs button.active { background: var(--panel); border-color: var(--accent); color: var(--accent); }
  .tab-body { min-height: 400px; }
</style>
