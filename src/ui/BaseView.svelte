<script lang="ts">
  import { game } from '../state/game.svelte';
  import { itemName } from '../data/items';
  import { JOBS, STRUCTURES, FOOD_ITEM } from '../data/base';
  import { baseWorkers, computeRates, isHungry, MEDICINE_ITEM, nextCost, sanStatus, structureLevel, workLevels } from '../engine/base';
  import { canAfford, countOf } from '../engine/inventory';
  import PalCard from './PalCard.svelte';
  import CostLine from './CostLine.svelte';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import { DEFAULT_FILTER, filterBox, isFiltering, statusOf, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';
  import { structureUnlocked } from '../engine/tech';
  import { structureTech } from '../data/tech';

  const save = $derived(game.save);
  const workers = $derived(baseWorkers(save));
  const levels = $derived(workLevels(save));
  const rates = $derived(computeRates(save));
  const hungry = $derived(isHungry(save));
  const berries = $derived(countOf(save, FOOD_ITEM));
  const medical = $derived(countOf(save, MEDICINE_ITEM));
  const sick = $derived(workers.filter((w) => sanStatus(w.san ?? 100) === 'sick').length);
  const stressed = $derived(workers.filter((w) => sanStatus(w.san ?? 100) !== 'fine').length);

  // Workers list: same filter bar, pinned to the base and sorted by work.
  const WORKER_DEFAULTS: BoxFilter = { ...DEFAULT_FILTER, status: 'base', sort: 'work' };
  let workerFilter = $state<BoxFilter>({ ...WORKER_DEFAULTS });
  const shownWorkers = $derived(filterBox(save, workerFilter));
  const workerFiltering = $derived(isFiltering(workerFilter, WORKER_DEFAULTS));

  // Assign picker: everyone not already working (party Pals included — assigning pulls them), best workers first.
  const PICK_DEFAULTS: BoxFilter = { ...DEFAULT_FILTER, sort: 'work' };
  let pickFilter = $state<BoxFilter>({ ...PICK_DEFAULTS });
  const candidates = $derived(filterBox(save, pickFilter).filter((p) => !save.base.workers.includes(p.uid)));
  const others = $derived(save.box.length - workers.length);
  const pickFiltering = $derived(isFiltering(pickFilter, PICK_DEFAULTS));
  const clearPick = () => { pickFilter = { ...PICK_DEFAULTS, sort: pickFilter.sort }; };
  const full = $derived(workers.length >= save.base.slots);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
</script>

<h2>Base <span class="muted">{workers.length} / {save.base.slots} workers</span></h2>

<div class="status row">
  <span>🍇 {itemName(FOOD_ITEM)}: <b>{berries}</b>
    {#if workers.length > 0}<span class="muted">(−{fmt(rates.foodPerMin)}/min)</span>{/if}</span>
  <span>Output: <b>×{rates.mult.toFixed(2)}</b></span>
  {#if workers.length > 0}
    <span>💊 {itemName(MEDICINE_ITEM)}: <b>{medical}</b> <span class="muted">(+{fmt(rates.medicalPerMin)}/min · SAN −{fmt(rates.sanDrainPerMin)}/min each)</span></span>
  {/if}
  {#if sick > 0}<span class="warn">{sick} worker{sick === 1 ? ' is' : 's are'} sick and not working — rest them or stock Medical Supplies.</span>
  {:else if stressed > 0}<span class="warn">{stressed} worker{stressed === 1 ? '' : 's'} below 50 SAN.</span>{/if}
  {#if hungry}<span class="warn">Workers are hungry — output halved. Stock Red Berries or build a Berry Plantation.</span>{/if}
</div>

<section>
  {#if workers.length === 0}
    <h3>Workers</h3>
    <p class="muted">Nobody's working. Assign Pals from your box below — a Pal can't be in the party and at the base at once.</p>
  {:else}
    <BoxFilterBar bind:filter={workerFilter} defaults={WORKER_DEFAULTS} label="Search workers" hideStatus>
      {#snippet heading()}
        <h3 class="grow">Workers <span class="muted">{workerFiltering ? `${shownWorkers.length} of ${workers.length}` : workers.length}</span></h3>
      {/snippet}
    </BoxFilterBar>
    {#if shownWorkers.length === 0}
      <p class="muted">No worker matches. <button class="small" onclick={() => (workerFilter = { ...WORKER_DEFAULTS, sort: workerFilter.sort })}>Clear filters</button></p>
    {/if}
  {/if}
  <div class="list">
    {#each shownWorkers as inst (inst.uid)}
      <PalCard {inst} showWork showSan>
        <button class="small" onclick={() => game.unassignWorker(inst.uid)}>Dismiss</button>
      </PalCard>
    {/each}
  </div>
</section>

<section>
  <h3>Production</h3>
  <table>
    <tbody>
      {#each JOBS as job}
        {@const lvl = levels[job.type]}
        <tr class:idle={lvl === 0}>
          <td class="icon">{job.icon}</td>
          <td>{job.type} <span class="muted">Lv {fmt(lvl)}</span></td>
          <td class="muted small">{job.effect}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if Object.keys(rates.items).length > 0 || rates.smeltPerMin > 0 || rates.handiworkPerSec > 0}
    <div class="rates row">
      {#each Object.entries(rates.items) as [id, perMin]}
        <span class="chip">{itemName(id)} +{fmt(perMin)}/min</span>
      {/each}
      {#if rates.smeltPerMin > 0}<span class="chip">Ingot +{fmt(rates.smeltPerMin)}/min (uses Ore)</span>{/if}
      {#if rates.handiworkPerSec > 0}<span class="chip">Crafting {fmt(rates.handiworkPerSec)} work/s</span>{/if}
    </div>
  {/if}
</section>

<section>
  <h3>Structures</h3>
  <div class="list">
    {#each STRUCTURES as s (s.id)}
      {@const level = structureLevel(save, s.id)}
      {@const cost = nextCost(save, s.id)}
      {@const locked = !structureUnlocked(save, s.id)}
      <div class="structure row" class:locked>
        <div class="grow">
          <b>{s.name}</b>
          {#if level > 0}<span class="muted">Lv {level}{cost ? '' : ' (max)'}</span>{/if}
          <div class="muted small">{s.desc}</div>
          {#if cost}<CostLine {cost} />{/if}
          {#if locked}<div class="muted small">🔒 Research <b>{structureTech(s.id)?.name}</b> (Tech tab)</div>{/if}
        </div>
        {#if cost}
          <button class="small" disabled={!canAfford(save, cost)} onclick={() => game.build(s.id)}>
            {level > 0 ? 'Upgrade' : 'Build'}
          </button>
        {/if}
      </div>
    {/each}
  </div>
</section>

<section>
  <BoxFilterBar bind:filter={pickFilter} defaults={PICK_DEFAULTS} label="Search Pals to assign">
    {#snippet heading()}
      <h3 class="grow">Assign from the Box <span class="muted">{pickFiltering ? `${candidates.length} of ${others}` : candidates.length}</span></h3>
    {/snippet}
  </BoxFilterBar>
  <p class="muted small">Pick a work type under Filters to sort by that job's level. Assigning a party Pal pulls it out of the party.</p>
  {#if full}<p class="muted small">All {save.base.slots} slots are taken — dismiss a worker or build a Palbox Expansion.</p>{/if}
  {#if candidates.length === 0 && others > 0}
    <p class="muted">No Pal matches. <button class="small" onclick={clearPick}>Clear filters</button></p>
  {/if}
  <div class="list scroll">
    {#each candidates as inst (inst.uid)}
      {@const status = statusOf(save, inst.uid)}
      <PalCard {inst} showWork>
        {#if status !== 'idle'}<span class="muted small">{STATUS_LABEL[status].toLowerCase()}</span>{/if}
        <button class="small" disabled={full || status === 'expedition'} onclick={() => game.assignWorker(inst.uid)}
          title={status === 'expedition' ? 'Away until the expedition returns' : status === 'party' ? 'Removes it from the party' : status === 'breeding' ? 'Breaks up the breeding pair' : ''}>Assign</button>
      </PalCard>
    {/each}
  </div>
</section>

<style>
  section { margin-top: 1.25rem; }
  .status { padding: 0.5rem 0.75rem; background: var(--panel-2); border-radius: 8px; }
  .warn { color: var(--accent); }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .scroll { max-height: 40vh; overflow-y: auto; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.25rem 0.3rem; border-bottom: 1px solid var(--border); vertical-align: top; }
  td.icon { width: 1.6rem; }
  tr.idle { opacity: 0.5; }
  .small { font-size: 0.8rem; }
  .rates { margin-top: 0.5rem; }
  .chip { background: var(--panel-2); border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.85rem; }
  .structure { padding: 0.5rem; border: 1px solid var(--border); border-radius: 8px; }
  .structure.locked { opacity: 0.6; }
</style>
