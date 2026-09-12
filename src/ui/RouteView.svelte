<script lang="ts">
  // Desktop left column: routes, arena, bosses, log. On mobile these are split (see App.svelte).
  import RoutesPanel from './RoutesPanel.svelte';
  import ArenaPanel from './ArenaPanel.svelte';
  import BossesPanel from './BossesPanel.svelte';
  import LogPanel from './LogPanel.svelte';
</script>

<div class="stack">
  <RoutesPanel />
  <ArenaPanel />
  <BossesPanel />
  <LogPanel />
</div>

<style>
  .stack { display: flex; flex-direction: column; gap: 1rem; }
</style>
