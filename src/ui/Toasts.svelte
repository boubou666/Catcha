<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import { game } from '../state/game.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each game.toasts as t (t.id)}
    <button class="toast {t.kind}" onclick={() => game.dismissToast(t.id)} title={tr("Dismiss")}>{t.msg ? tr(t.msg.key, t.msg.vars) : t.text}</button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed; right: 1rem; bottom: 1rem; z-index: 20;
    display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; pointer-events: none;
  }
  .toast {
    pointer-events: auto; max-width: min(360px, 90vw); text-align: left;
    background: var(--panel); border: 1.5px solid var(--border-soft); border-left: 4px solid var(--accent-2);
    border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; box-shadow: var(--shadow-float);
    animation: toast-in 180ms ease-out;
  }
  .toast.success { border-left-color: var(--ok); }
  .toast.gold { border-left-color: var(--accent); }
  .toast.warn { border-left-color: var(--danger); }
  @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @media (max-width: 800px) {
    .toasts { left: 0.5rem; right: 0.5rem; bottom: 0.5rem; align-items: stretch; }
    .toast { max-width: none; }
  }
</style>
