<script lang="ts">
  import { shortcutDocs } from '../engine/shortcuts';
  import { keys } from '../state/keys.svelte';
  const docs = $derived(shortcutDocs(keys.bindings));
  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

{#if open}
  <div class="backdrop" onclick={() => (open = false)} role="presentation"></div>
  <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="keys-title">
    <div class="row">
      <h2 id="keys-title" class="grow">Keyboard shortcuts</h2>
      <button class="small" onclick={() => (open = false)}>✕</button>
    </div>
    <p class="muted small">Shortcuts pause while you type in a field. Digits follow the physical keys, so they work on AZERTY and QWERTZ too. Change them under Settings → Keyboard.</p>
    <table>
      <tbody>
        {#each docs as d (d.does)}
          <tr><td class="keys"><kbd>{d.keys}</kbd></td><td>{d.does}</td></tr>
        {/each}
      </tbody>
    </table>
    <button class="primary" onclick={() => (open = false)}>Got it</button>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; z-index: 10; background: rgba(0, 0, 0, 0.6); }
  .modal { position: fixed; z-index: 11; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(460px, calc(100% - 2rem)); display: flex; flex-direction: column; gap: 0.6rem; }
  .small { font-size: 0.8rem; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.35rem 0.25rem; border-bottom: 1px solid var(--border); }
  .keys { white-space: nowrap; width: 8rem; }
  kbd { font-family: ui-monospace, monospace; font-size: 0.85rem; background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; padding: 0.1rem 0.4rem; }
  button.primary { width: 100%; }
</style>
