<script lang="ts">
  import { game } from '../state/game.svelte';
  import { itemName } from '../data/items';
  import { palById } from '../data/pals';
  import { expeditionById } from '../data/expeditions';
  import { OFFLINE_CAP_MS } from '../engine/offline';
  import { formatDuration, signed } from './format';

  const report = $derived(game.offline);
  const rows = $derived(
    report
      ? Object.entries(report.items).sort(([, a], [, b]) => b - a)
      : [],
  );
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && report) game.dismissOffline(); }} />

{#if report}
  <div class="backdrop">
    <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <h2 id="offline-title">Welcome back</h2>
      <p class="muted">
        Your base kept working for <b>{formatDuration(report.elapsedMs)}</b>{#if report.capped}
          <span class="cap"> (capped at {formatDuration(OFFLINE_CAP_MS)})</span>{/if}.
        Wild Pals don't fight while you're away.
      </p>

      <table>
        <tbody>
          {#if report.gold !== 0}
            <tr><td>💰 Gold</td><td class="n" class:gain={report.gold > 0}>{signed(report.gold)}</td></tr>
          {/if}
          {#each rows as [id, delta] (id)}
            <tr><td>{itemName(id)}</td><td class="n" class:gain={delta > 0} class:loss={delta < 0}>{signed(delta)}</td></tr>
          {/each}
          {#if report.hatched.length > 0}
            <tr><td>Eggs hatched</td><td class="n gain">{report.hatched.map((id) => palById(id).name).join(', ')}</td></tr>
          {/if}
          {#if report.returned.length > 0}
            <tr><td>Expeditions back</td><td class="n">{report.returned.map((r) => `${expeditionById(r.defId).name} (${r.success ? 'success' : 'failed'})`).join(', ')}</td></tr>
          {/if}
          {#if report.sick > 0}
            <tr><td>Workers sick</td><td class="n loss">{report.sick} — resting or Medical Supplies needed</td></tr>
          {/if}
          {#if report.crafted > 0}
            <tr><td>Crafts finished</td><td class="n gain">{report.crafted}</td></tr>
          {/if}
          {#if report.weaponTier}
            <tr><td>New weapon</td><td class="n gain">tier {report.weaponTier}</td></tr>
          {/if}
        </tbody>
      </table>

      <button class="primary" onclick={() => game.dismissOffline()}>Continue</button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; z-index: 10;
    background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .modal { width: min(420px, 100%); max-height: 90vh; overflow-y: auto; }
  .cap { color: var(--accent); }
  table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; }
  td { padding: 0.3rem 0.25rem; border-bottom: 1px solid var(--border); }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .gain { color: var(--ok); }
  .loss { color: var(--muted); }
  button { width: 100%; }
</style>
