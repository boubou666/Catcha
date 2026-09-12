<script lang="ts">
  import { update } from '../state/update.svelte';
  import { game } from '../state/game.svelte';

  function reload() {
    game.persist();          // never lose the last 30 s of progress
    update.apply();
  }
</script>

{#if update.available}
  <div class="banner row" role="status">
    <span class="grow">🆕 A new version of Catcha is ready.</span>
    <button class="primary small" onclick={reload}>Reload</button>
    <button class="small" onclick={() => update.dismiss()} title="Keep playing on this version until next time">Later</button>
  </div>
{/if}

<style>
  .banner {
    position: fixed; left: 50%; top: 0.6rem; transform: translateX(-50%); z-index: 30;
    max-width: min(480px, 94vw); width: max-content;
    background: var(--panel); border: 1px solid var(--accent); border-radius: 999px;
    padding: 0.4rem 0.6rem 0.4rem 1rem; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45); gap: 0.5rem;
  }
</style>
