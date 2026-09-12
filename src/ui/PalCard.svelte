<script lang="ts">
  import type { PalInstance } from '../data/types';
  import { palById } from '../data/pals';
  import { expToLevel, instanceAttack } from '../engine/formulas';
  import PalIcon from './PalIcon.svelte';
  import type { Snippet } from 'svelte';

  let { inst, children }: { inst: PalInstance; children?: Snippet } = $props();
  const def = $derived(palById(inst.palId));
  const expPct = $derived((inst.exp / expToLevel(inst.level + 1)) * 100);
</script>

<div class="card row">
  <PalIcon palId={inst.palId} size={40} lucky={inst.lucky} />
  <div class="grow">
    <div>
      <b>{def.name}</b> <span class="muted">Lv {inst.level}</span>
      {#if inst.stars > 0}<span class="stars">{'★'.repeat(inst.stars)}</span>{/if}
      {#if inst.lucky}<span class="lucky">✨</span>{/if}
    </div>
    <div class="muted small">{def.elements.join('/')} · ATK {instanceAttack(inst).toFixed(1)}</div>
    <div class="bar exp"><span style:width="{expPct}%"></span></div>
  </div>
  {#if children}<div class="row">{@render children()}</div>{/if}
</div>

<style>
  .card { padding: 0.5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--panel-2); }
  .small { font-size: 0.8rem; }
  .stars { color: var(--accent); }
  .bar { height: 4px; margin-top: 0.25rem; }
</style>
