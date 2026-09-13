<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import type { PalInstance } from '../data/types';
  import { palById } from '../data/pals';
  import { expToLevel, instanceAttack } from '../engine/formulas';
  import PalIcon from './PalIcon.svelte';
  import { describePartner } from '../data/partner';
  import PassiveChips from './PassiveChips.svelte';
  import type { Snippet } from 'svelte';

  import { JOB_ICON } from '../data/base';
  import type { WorkType } from '../data/types';

  import { sanStatus } from '../engine/base';

  let { inst, showWork = false, showSan = false, children }: { inst: PalInstance; showWork?: boolean; showSan?: boolean; children?: Snippet } = $props();
  const san = $derived(inst.san ?? 100);
  const status = $derived(sanStatus(san));
  const def = $derived(palById(inst.palId));
  const expPct = $derived((inst.exp / expToLevel(inst.level + 1)) * 100);
  const work = $derived(Object.entries(def.work) as [WorkType, number][]);
</script>

<div class="card row">
  <PalIcon palId={inst.palId} size={40} lucky={inst.lucky} />
  <div class="grow">
    <div>
      <b title={describePartner(def)}>{def.name}</b> <span class="muted">Lv {inst.level}</span>
      {#if inst.stars > 0}<span class="stars">{'★'.repeat(inst.stars)}</span>{/if}
      {#if inst.lucky}<span class="lucky">✨</span>{/if}
    </div>
    <div class="muted small">
      {def.elements.join('/')} {tr("· ATK")} {instanceAttack(inst).toFixed(1)}
      {#if showWork}
        · {#each work as [job, lvl]}<span class="job" title={job}>{JOB_ICON[job]}{lvl}</span>{/each}
      {/if}
    </div>
    {#if inst.passives.length > 0}<div class="passives"><PassiveChips ids={inst.passives} /></div>{/if}
    <div class="bar exp"><span style:width="{expPct}%"></span></div>
    {#if showSan}
      <div class="san row" title="SAN {Math.round(san)} {tr("/ 100 — output")} {status === 'fine' ? 'normal' : status === 'stressed' ? '75%' : status === 'depressed' ? '40%' : 'stopped'}">
        <div class="bar san-bar grow"><span class={status} style:width="{san}%"></span></div>
        <span class="small status {status}">{status === 'fine' ? 'SAN' : status}</span>
      </div>
    {/if}
  </div>
  {#if children}<div class="row">{@render children()}</div>{/if}
</div>

<style>
  .card { padding: 0.5rem; border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); background: var(--panel-2); }
  .small { font-size: 0.8rem; }
  .stars { color: var(--accent); }
  .bar { height: 4px; margin-top: 0.25rem; }
  .job { margin-right: 0.25rem; white-space: nowrap; }
  .passives { margin-top: 0.2rem; }
  .san { margin-top: 0.25rem; gap: 0.4rem; }
  .san-bar { height: 4px; }
  .san-bar > span.fine { background: var(--ok); }
  .san-bar > span.stressed { background: var(--accent); }
  .san-bar > span.depressed { background: var(--danger); }
  .san-bar > span.sick { background: var(--danger); }
  .status { color: var(--muted); min-width: 4.5rem; text-align: right; text-transform: capitalize; }
  .status.stressed { color: var(--accent); }
  .status.depressed, .status.sick { color: var(--danger); }
</style>
