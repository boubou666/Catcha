<script lang="ts">
  import { keys } from '../state/keys.svelte';
  import { ACTIONS, bindingFromKey, bindingLabel, conflicts, DEFAULT_BINDINGS, sameBinding, type ActionGroup, type ActionId } from '../engine/shortcuts';

  let capturing = $state<ActionId | null>(null);
  const clash = $derived(conflicts(keys.bindings));
  const groups = $derived([...new Set(ACTIONS.map((a) => a.group))] as ActionGroup[]);
  const changed = $derived(ACTIONS.filter((a) => !sameBinding(keys.bindings[a.id], DEFAULT_BINDINGS[a.id]) && (keys.bindings[a.id] !== null || DEFAULT_BINDINGS[a.id] !== null)).length);

  function onKey(e: KeyboardEvent) {
    if (!capturing) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') { capturing = null; return; }
    const b = bindingFromKey({ key: e.key, code: e.code, shift: e.shiftKey });
    if (!b || e.ctrlKey || e.metaKey || e.altKey) return;      // modifiers alone, arrows, digits, Space: keep waiting
    keys.set(capturing, b);
    capturing = null;
  }
</script>

<svelte:window onkeydown={onKey} />

<p class="muted small">Click a key, then press the new one (Esc cancels). Digits, arrows, Space, Ctrl+K and Esc stay fixed. Bindings are stored on this device.</p>
{#if clash.size}<p class="warn small">⚠ Some shortcuts share a key — the first one in the list wins.</p>{/if}
{#each groups as g (g)}
  <h4>{g}</h4>
  <div class="bindings">
    {#each ACTIONS.filter((a) => a.group === g) as a (a.id)}
      {@const b = keys.bindings[a.id]}
      <div class="binding row" class:clash={clash.has(a.id)} class:off={b === null}>
        <span class="grow">{a.label}</span>
        <button class="key" class:capturing={capturing === a.id} onclick={() => (capturing = capturing === a.id ? null : a.id)} title="Press a key">
          {capturing === a.id ? 'Press a key…' : bindingLabel(b)}
        </button>
        <button class="small" disabled={b === null} onclick={() => keys.set(a.id, null)} title="Disable this shortcut">Off</button>
        <button class="small" disabled={sameBinding(b, DEFAULT_BINDINGS[a.id])} onclick={() => keys.reset(a.id)} title="Back to {bindingLabel(DEFAULT_BINDINGS[a.id])}">↺</button>
      </div>
    {/each}
  </div>
{/each}
<div class="row">
  <button class="small" disabled={changed === 0} onclick={() => keys.reset()}>Reset all to defaults</button>
  <span class="muted small">{changed ? `${changed} changed` : 'All defaults'}</span>
</div>

<style>
  .small { font-size: 0.8rem; }
  .warn { color: var(--accent); }
  h4 { margin: 0.75rem 0 0.3rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.75rem; }
  .bindings { display: flex; flex-direction: column; gap: 0.25rem; }
  .binding { padding: 0.25rem 0.4rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; }
  .binding.clash { border-color: var(--danger); }
  .binding.off { opacity: 0.65; }
  .key { min-width: 7rem; font-family: ui-monospace, monospace; }
  .key.capturing { border-color: var(--accent); color: var(--accent); }
</style>
