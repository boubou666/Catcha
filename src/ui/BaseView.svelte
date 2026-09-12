<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { itemName } from '../data/items';
  import { JOBS, STRUCTURES, FOOD_ITEM } from '../data/base';
  import { baseWorkers, computeRates, isHungry, MEDICINE_ITEM, nextCost, sanStatus, structureLevel, workLevels } from '../engine/base';
  import { canAfford, countOf } from '../engine/inventory';
  import PalCard from './PalCard.svelte';
  import CostLine from './CostLine.svelte';
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

  let query = $state('');
  const candidates = $derived(
    save.box
      .filter((p) => !save.base.workers.includes(p.uid))
      .filter((p) => palById(p.palId).name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => workScore(b.palId) - workScore(a.palId) || b.level - a.level),
  );
  function workScore(palId: number) {
    return Object.values(palById(palId).work).reduce((s, n) => s + (n ?? 0), 0);
  }
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
  <h3>Workers</h3>
  {#if workers.length === 0}
    <p class="muted">Nobody's working. Assign Pals from your box below — a Pal can't be in the party and at the base at once.</p>
  {/if}
  <div class="list">
    {#each workers as inst (inst.uid)}
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
  <div class="row">
    <h3 class="grow">Assign from box</h3>
    <input placeholder="Filter…" bind:value={query} />
  </div>
  <div class="list scroll">
    {#each candidates as inst (inst.uid)}
      <PalCard {inst} showWork>
        {#if save.party.includes(inst.uid)}<span class="muted small">in party</span>{/if}
        <button class="small" disabled={workers.length >= save.base.slots} onclick={() => game.assignWorker(inst.uid)}>Assign</button>
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
