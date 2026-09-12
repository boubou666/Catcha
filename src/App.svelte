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
  import { ui } from './state/ui.svelte';
  import ShortcutsHelp from './ui/ShortcutsHelp.svelte';
  import { isFieldTarget, resolveShortcut } from './engine/shortcuts';
  import { keys } from './state/keys.svelte';
  import { theme } from './state/theme.svelte';
  import { isUnlocked } from './engine/progress';

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
  // every tab the global search may jump to: World tabs only exist on mobile; on desktop those panels are always visible
  const searchTabs = $derived([...(isMobile ? [WORLD] : []), ...GROUPS].flatMap((g) => g.tabs.map((t) => ({ id: t.id, label: t.label, group: g.label }))));
  // last tab visited in each group, so switching groups lands where you were
  const lastInGroup = $state<Record<string, Tab>>({});

  function select(t: Tab) {
    // a World tab picked from search on desktop: those panels are already on screen
    if (!isMobile && groupOf(t).id === 'world') return;
    tab = t;
    lastInGroup[groupOf(t).id] = t;
    try { localStorage.setItem(UI_KEY, t); } catch { /* ignore */ }
  }
  function selectGroup(g: Group) {
    select(lastInGroup[g.id] ?? g.tabs[0].id);
  }

  function onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    const action = resolveShortcut({ key: e.key, code: e.code, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey, shift: e.shiftKey, inField: isFieldTarget(el?.tagName, !!el?.isContentEditable) }, keys.bindings);
    if (!action) return;
    // Space on a focused button is that button's click, not an attack
    if (action.kind === 'attack' && e.code === 'Space' && el?.tagName === 'BUTTON') return;
    // a modal owns the keyboard while open (its own Escape handling still runs)
    if (game.offline || whatsNew.open || ui.shortcutsOpen) { if (action.kind === 'help') ui.shortcutsOpen = false; return; }
    if (ui.notificationsOpen && action.kind !== 'notifications') return;
    e.preventDefault();
    const gi = groups.findIndex((g) => g.id === group.id);
    switch (action.kind) {
      case 'tab': { const t = group.tabs[action.index]; if (t) select(t.id); break; }
      case 'tabStep': { const i = group.tabs.findIndex((t) => t.id === tab); select(group.tabs[(i + action.delta + group.tabs.length) % group.tabs.length].id); break; }
      case 'group': { const g = groups[action.index]; if (g) selectGroup(g); break; }
      case 'groupStep': selectGroup(groups[(gi + action.delta + groups.length) % groups.length]); break;
      case 'region': { const r = game.regions[action.index]; if (r && !game.inBossFight) game.travelToRegion(r.id); break; }
      case 'regionStep': { if (game.inBossFight) break; const rs = game.regions; const ri = rs.findIndex((r) => r.id === game.region.id); game.travelToRegion(rs[(ri + action.delta + rs.length) % rs.length].id); break; }
      case 'attack': if (game.wild) game.click(); break;
      case 'tabId': { const all = groups.flatMap((g) => g.tabs); if (all.some((t) => t.id === action.id)) select(action.id as Tab); break; }
      case 'flee': if (game.inBossFight) game.flee(); break;
      case 'alpha': { const id = game.nextAlpha; if (id && !game.inBossFight) game.startAlpha(id); break; }
      case 'tower': if (!game.inBossFight && isUnlocked(game.save, game.region.tower.unlock)) game.startTower(game.region.tower.id); break;
      case 'realm': { const id = game.nextRealm; if (id) game.enterDungeon(id); break; }
      case 'raid': { const id = game.nextRaid; if (id) game.summonRaid(id); break; }
      case 'claimQuests': game.claimAllQuests(); break;
      case 'spawnList': if (!isMobile) ui.spawnListOpen = !ui.spawnListOpen; break;
      case 'notifications': ui.notificationsOpen = !ui.notificationsOpen; if (!ui.notificationsOpen) game.markNoticesRead(); break;
      case 'search': ui.focusSearch += 1; break;
      case 'help': ui.shortcutsOpen = !ui.shortcutsOpen; break;
      case 'save': game.persist(); game.notify('💾 Saved', 'info', 1500); break;
    }
  }

  onMount(() => {
    const stop = game.start();
    const off = game.on((e) => { play(e); buzz(e); });
    whatsNew.init();
    const stopTheme = theme.start();
    return () => { stop(); off(); stopTheme(); };
  });
</script>

<svelte:window onkeydown={onKey} />

<OfflineSummary />
<Toasts />
<ShortcutsHelp bind:open={ui.shortcutsOpen} />
<UpdateBanner />
<WhatsNew />

<div class="app">
  <Header tabs={searchTabs} go={(t) => select(t as Tab)} />
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
  /* full-height shell: header, then two independently scrolling columns; the window itself never scrolls */
  .app { max-width: 1200px; height: 100vh; height: 100dvh; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr); gap: 1rem; }
  main.mobile { grid-template-columns: 1fr; }
  main > section { min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 4px; margin: -4px; }   /* padding keeps the panels' glow from being clipped */
  .right { display: flex; flex-direction: column; }
  .right .tab-body { flex: 1; min-height: 0; overflow-y: auto; }
  .right > :global(*) { flex-shrink: 0; }
  .right > .tab-body { flex-shrink: 1; }
  .groups button { min-width: 0; padding-left: 0.4rem; padding-right: 0.4rem; }
  .spawns-mobile { margin-top: 0.75rem; }
  .sticky-arena { position: sticky; top: 0; z-index: 5; padding-bottom: 0.35rem; }
  @media (max-width: 800px) {
    .app { padding: 0.5rem; gap: 0.5rem; }
    .tab-body { min-height: 0; padding: 0.75rem; }
    /* two tight nav rows: segmented groups, then a scrolling strip of tab chips */
    .groups { gap: 0.25rem; margin-bottom: 0.3rem; }
    .groups button { font-size: 0.68rem; letter-spacing: 0.04em; padding: 0.15rem 0.3rem; min-height: 30px; --c: 5px; }
    .tabs { gap: 0.2rem; padding: 0 0.3rem; margin-bottom: -1px; }
    .tabs button { font-size: 0.8rem; padding: 0.15rem 0.5rem 0.3rem; min-height: 30px; --c: 5px; }
    .tab-body { padding-top: 0.6rem; }
    /* one column on phones: the sticky arena stays put while the rest scrolls */
    main.mobile > section { overflow: visible; }
    main.mobile { overflow-y: auto; min-height: 0; display: block; }
    .right .tab-body { overflow: visible; flex: none; }
  }
  .groups { display: flex; gap: 0.35rem; margin-bottom: 0.5rem; }
  .groups button { flex: 1; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.8rem; }
  .groups button.active { background: linear-gradient(180deg, #7fe3ff, #35d0ff); color: var(--on-accent); border-color: #d9f6ff; }
  .tabs { display: flex; gap: 0.3rem; margin-bottom: -2px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding: 0 0.5rem; position: relative; z-index: 1; }
  .tabs::-webkit-scrollbar { display: none; }
  .tabs button { flex: 0 0 auto; border-radius: var(--radius-sm) var(--radius-sm) 0 0; border-bottom: none; box-shadow: none; background: var(--panel-2); padding: 0.3rem 0.65rem 0.45rem; font-size: 0.9rem; }
  .tabs button.active { background: var(--tab-active); color: var(--text); border-color: var(--accent-2); font-weight: 900; }
  .tab-body { border-top-left-radius: 0; }
  .tab-body { min-height: 200px; }
</style>
