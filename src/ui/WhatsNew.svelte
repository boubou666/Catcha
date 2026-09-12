<script lang="ts">
  import { whatsNew } from '../state/whatsnew.svelte';
  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && whatsNew.open) whatsNew.close(); }} />

{#if whatsNew.open}
  <div class="backdrop">
    <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="whatsnew-title">
      <div class="row">
        <h2 id="whatsnew-title" class="grow">What's new</h2>
        <button class="small" onclick={() => whatsNew.close()}>✕</button>
      </div>
      <div class="entries">
        {#each whatsNew.entries as e (e.version)}
          <section>
            <h3><span class="ver">v{e.version}</span> {e.title} <span class="muted date">{fmtDate(e.date)}</span></h3>
            <ul>{#each e.items as item}<li>{item}</li>{/each}</ul>
          </section>
        {/each}
      </div>
      <button class="primary" onclick={() => whatsNew.close()}>Got it</button>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; z-index: 10; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal { width: min(560px, 100%); max-height: 90vh; display: flex; flex-direction: column; gap: 0.75rem; }
  .entries { overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; padding-right: 0.25rem; }
  h3 { text-transform: none; letter-spacing: 0; color: var(--text); font-size: 1rem; }
  .ver { color: var(--accent); font-family: ui-monospace, monospace; font-size: 0.85rem; margin-right: 0.3rem; }
  .date { font-weight: 400; font-size: 0.8rem; margin-left: 0.4rem; }
  ul { margin: 0.35rem 0 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
  button.primary { width: 100%; }
</style>
