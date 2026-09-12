<script lang="ts">
  import { game } from '../state/game.svelte';
</script>

<div class="panel log">
  <h3>Log</h3>
  {#each game.log as line}<div>{line}</div>{/each}
</div>

<style>
  .log { font-size: 0.85rem; color: var(--muted); }
  .log div:first-of-type { color: var(--text); }
</style>
