<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import { game } from '../state/game.svelte';
  import { itemName } from '../data/items';
  import { JOBS, STRUCTURES, FOOD_ITEM } from '../data/base';
  import { baseWorkers, computeRates, DEFAULT_STRUCTURE_FILTER, filterStructures, isHungry, isStructureFiltering, MEDICINE_ITEM, sanStatus, STRUCTURE_STATUS_LABEL, workLevels, DEFAULT_PRODUCTION_FILTER, filterJobs, type ProductionFilter, type StructureFilter } from '../engine/base';
  import { countOf } from '../engine/inventory';
  import PalCard from './PalCard.svelte';
  import CatchOdds from './CatchOdds.svelte';
  import { activePartners, summarizePartners } from '../engine/partner';
  import { defenceDps, RAID_TIME_SEC } from '../engine/baseraid';
  import PalIcon from './PalIcon.svelte';
  import { palById } from '../data/pals';
  import { REGIONS, regionById } from '../data/regions';
  import { OUTPOST_COST, outpostRate, outpostWorkers } from '../engine/outpost';
  import { isUnlocked } from '../engine/progress';
  const partnerLines = $derived(summarizePartners(activePartners(game.save).filter((e) => e.stat === 'work')));
  import CostLine from './CostLine.svelte';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import ItemIcon from './ItemIcon.svelte';
  import { DEFAULT_FILTER, filterBox, isFiltering, statusOf, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';
  import { structureTech } from '../data/tech';

  const save = $derived(game.save);
  const raid = $derived(save.base.raid);
  const outpostRegions = $derived(REGIONS.filter((r) => r.id !== 'windswept' && isUnlocked(save, { kind: 'tower', id: r.tower.id })));
  const outpostCandidates = $derived(save.box.filter((p) => statusOf(save, p.uid) === 'idle').slice(0, 40));
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

  let prodFilter = $state<ProductionFilter>({ ...DEFAULT_PRODUCTION_FILTER });
  const jobs = $derived(filterJobs(levels, prodFilter));
  let structFilter = $state<StructureFilter>({ ...DEFAULT_STRUCTURE_FILTER });
  const structures = $derived(filterStructures(save, structFilter));
  const structFiltering = $derived(isStructureFiltering(structFilter));
  const clearStructs = () => { structFilter = { ...DEFAULT_STRUCTURE_FILTER }; };
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
</script>

<h2>{tr("Base")} <span class="muted">{workers.length} / {save.base.slots} {tr("workers")}</span></h2>
{#if raid}
  <div class="raid panel-2">
    <div class="row">
      <PalIcon palId={raid.palId} size={44} />
      <div class="grow">
        <b>🚨 {tr("Raid on the base!")}</b> {palById(raid.palId).name} <span class="muted">Lv {raid.level}</span>
        <div class="bar hp"><span style:width="{Math.max(0, raid.hp / raid.maxHp) * 100}%"></span></div>
        <div class="muted small">{Math.max(0, Math.round(raid.hp)).toLocaleString()} / {raid.maxHp.toLocaleString()} HP · ⏱ {Math.floor(Math.max(0, raid.secondsLeft) / 60)}:{String(Math.max(0, Math.ceil(raid.secondsLeft)) % 60).padStart(2, '0')} · {tr("defence")} <b>{defenceDps(save, raid).toFixed(1)}</b> DPS{raid.rallied ? ` · ${tr("party rallied")}` : ''}</div>
      </div>
      {#if !raid.rallied}<button class="primary small" onclick={() => game.rally()} title={tr("Adds the party's attack to the workers' for the rest of the raid")}>{tr("Rally the party")}</button>{/if}
    </div>
    <p class="muted small">{tr("Production pauses until it is over. Repel it for triple drops, bonus gold and a throw at the raider; lose and it takes a tenth of two stacks and shakes the workers.")}</p>
  </div>
{/if}
{#if outpostRegions.length || save.outposts.length}
  <section class="outposts">
    <h3>🏕 {tr("Outposts")} <span class="muted">{save.outposts.length} / {outpostRegions.length}</span></h3>
    <p class="muted small">{tr("A camp in a region whose tower you have beaten. Posted Pals gather that region's drops on their own — about one item a minute each, more with stars — with no structures, raids or queue. Costs {gold} gold, {wood} Wood, {stone} Stone and {ingot} Ingots.", { gold: OUTPOST_COST.gold.toLocaleString(), wood: OUTPOST_COST.wood, stone: OUTPOST_COST.stone, ingot: OUTPOST_COST.ingot })}</p>
    {#each save.outposts as o (o.regionId)}
      <div class="outpost panel-2">
        <div class="row">
          <b class="grow">{regionById(o.regionId).name} <span class="muted">{o.workers.length} / {o.slots} · {outpostRate(save, o).toFixed(1)} {tr("items/min")}</span></b>
        </div>
        <div class="small muted">{tr("Gathered:")} {Object.entries(o.taken).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${n} ${itemName(id)}`).join(', ') || '—'}</div>
        <div class="list">
          {#each outpostWorkers(save, o) as w (w.uid)}
            <PalCard inst={w} showWork><button class="small" onclick={() => game.recallFromOutpost(o.regionId, w.uid)}>{tr("Recall")}</button></PalCard>
          {/each}
        </div>
        {#if o.workers.length < o.slots}
          <div class="row post">
            <select onchange={(e) => { const uid = e.currentTarget.value; if (uid) game.postToOutpost(o.regionId, uid); e.currentTarget.value = ''; }} aria-label={tr("Post a Pal")}>
              <option value="">{tr("Post an idle Pal…")}</option>
              {#each outpostCandidates as p (p.uid)}<option value={p.uid}>{palById(p.palId).name} Lv {p.level}{p.stars ? ' ' + '★'.repeat(p.stars) : ''}</option>{/each}
            </select>
          </div>
        {/if}
      </div>
    {/each}
    {#each outpostRegions.filter((r) => !save.outposts.some((o) => o.regionId === r.id)) as r (r.id)}
      <div class="row">
        <span class="grow">{r.name}</span>
        <button class="small" disabled={!game.canFoundOutpost(r.id)} onclick={() => game.foundOutpost(r.id)}>{tr("Found an outpost")}</button>
      </div>
    {/each}
  </section>
{/if}
{#if save.base.raidLog.length}
  <details class="raidlog">
    <summary class="muted small">🛡 {tr("Recent raids")} · {save.stats.baseRaidsRepelled} {tr("repelled")} · {save.stats.baseRaidsLost} {tr("lost")}</summary>
    <ul class="small">
      {#each save.base.raidLog as r (r.at)}
        <li class:lost={r.outcome === 'failed'}>{r.outcome === 'repelled' ? '🛡' : '🚨'} {palById(r.palId).name} Lv {r.level} — {r.outcome === 'repelled' ? tr("repelled, +{gold} gold", { gold: r.gold }) : tr("lost, {n} items stolen", { n: r.stolen })} <span class="muted">{new Date(r.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span></li>
      {/each}
    </ul>
  </details>
{/if}
{#if partnerLines.length}<p class="partners small" title={tr("Work-flavoured partner skills of the workers, added up")}>{tr("🤝 Partner skills:")} {partnerLines.map((l) => l.replace(/(Neutral|Fire|Water|Grass|Electric|Ice|Ground|Dark|Dragon) damage|damage|catch odds|gold|exp|base output|extra drops|unseen species named|sphere refunds|boss time|ranch skills?/, (m) => tr(m))).join(' · ')}</p>{/if}

<div class="status row">
  <span><ItemIcon id={FOOD_ITEM} size={18} /> {itemName(FOOD_ITEM)}: <b>{berries}</b>
    {#if workers.length > 0}<span class="muted">(−{fmt(rates.foodPerMin)}{tr("/min)")}</span>{/if}</span>
  <span>{tr("Output:")} <b>×{rates.mult.toFixed(2)}</b></span>
  {#if workers.length > 0}
    <span><ItemIcon id={MEDICINE_ITEM} size={18} /> {itemName(MEDICINE_ITEM)}: <b>{medical}</b> <span class="muted">(+{fmt(rates.medicalPerMin)}{tr("/min · SAN −")}{fmt(rates.sanDrainPerMin)}{tr("/min each)")}</span></span>
  {/if}
  {#if sick > 0}<span class="warn">{sick} {tr("worker")}{sick === 1 ? ' is' : 's are'} {tr("sick and not working — rest them or stock Medical Supplies.")}</span>
  {:else if stressed > 0}<span class="warn">{stressed} {tr("worker")}{stressed === 1 ? '' : 's'} {tr("below 50 SAN.")}</span>{/if}
  {#if hungry}<span class="warn">{tr("Workers are hungry — output halved. Stock Red Berries or build a Berry Plantation.")}</span>{/if}
</div>

<section>
  {#if workers.length === 0}
    <h3>{tr("Workers")}</h3>
    <p class="muted">{tr("Nobody's working. Assign Pals from your box below — a Pal can't be in the party and at the base at once.")}</p>
  {:else}
    <BoxFilterBar bind:filter={workerFilter} defaults={WORKER_DEFAULTS} label="Search workers" hideStatus>
      {#snippet heading()}
        <h3 class="grow">{tr("Workers")} <span class="muted">{workerFiltering ? `${shownWorkers.length} of ${workers.length}` : workers.length}</span></h3>
      {/snippet}
    </BoxFilterBar>
    {#if shownWorkers.length === 0}
      <p class="muted">{tr("No worker matches.")} <button class="small" onclick={() => (workerFilter = { ...WORKER_DEFAULTS, sort: workerFilter.sort })}>{tr("Clear filters")}</button></p>
    {/if}
  {/if}
  <div class="list">
    {#each shownWorkers as inst (inst.uid)}
      <PalCard {inst} showWork showSan>
        <CatchOdds palId={inst.palId} />
        <button class="small" onclick={() => game.unassignWorker(inst.uid)}>{tr("Dismiss")}</button>
      </PalCard>
    {/each}
  </div>
</section>

<section>
  <div class="row">
    <h3 class="grow">{tr("Production")} <span class="muted">{prodFilter.query.trim() || prodFilter.activeOnly ? `${jobs.length} of ${JOBS.length}` : ''}</span></h3>
    <input type="search" placeholder={tr("Search jobs…")} bind:value={prodFilter.query} aria-label={tr("Search jobs")} />
    <label class="chk"><input type="checkbox" bind:checked={prodFilter.activeOnly} /> {tr("Active only")}</label>
  </div>
  {#if jobs.length === 0}<p class="muted small">{tr("No job matches.")}</p>{/if}
  <table>
    <tbody>
      {#each jobs as job (job.type)}
        {@const lvl = levels[job.type]}
        <tr class:idle={lvl === 0}>
          <td class="icon">{job.icon}</td>
          <td>{tr(job.type)} <span class="muted">Lv {fmt(lvl)}</span></td>
          <td class="muted small">{tr(job.effect)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if Object.keys(rates.items).length > 0 || rates.smeltPerMin > 0 || rates.handiworkPerSec > 0}
    <div class="rates row">
      {#each Object.entries(rates.items) as [id, perMin]}
        <span class="chip"><ItemIcon id={id} size={16} /> {itemName(id)} +{fmt(perMin)}{tr("/min")}</span>
      {/each}
      {#if rates.smeltPerMin > 0}<span class="chip"><ItemIcon id="ingot" size={16} /> {tr("Ingot +")}{fmt(rates.smeltPerMin)}{tr("/min (uses Ore)")}</span>{/if}
      {#if rates.handiworkPerSec > 0}<span class="chip">{tr("Crafting")} {fmt(rates.handiworkPerSec)} {tr("work/s")}</span>{/if}
    </div>
  {/if}
</section>

<section>
  <div class="row">
    <h3 class="grow">{tr("Structures")} <span class="muted">{structFiltering ? `${structures.length} of ${STRUCTURES.length}` : ''}</span></h3>
    <input type="search" placeholder={tr("Search structures…")} bind:value={structFilter.query} aria-label={tr("Search structures")} />
    <select bind:value={structFilter.status} aria-label={tr("Structure status")}>
      {#each Object.entries(STRUCTURE_STATUS_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
    </select>
    {#if structFiltering}<button class="small" onclick={clearStructs}>{tr("Clear")}</button>{/if}
  </div>
  {#if structures.length === 0}<p class="muted">{tr("No structure matches.")} <button class="small" onclick={clearStructs}>{tr("Clear")}</button></p>{/if}
  <div class="list">
    {#each structures as { def: s, level, cost, status } (s.id)}
      {@const locked = status === 'research'}
      <div class="structure row" class:locked>
        <div class="grow">
          <b>{s.name}</b>
          {#if level > 0}<span class="muted">Lv {level}{cost ? '' : ' (max)'}</span>{/if}
          <div class="muted small">{tr(s.desc)}</div>
          {#if cost}<CostLine {cost} />{/if}
          {#if locked}<div class="muted small">{tr("🔒 Research")} <b>{structureTech(s.id)?.name}</b> {tr("(Tech tab)")}</div>{/if}
        </div>
        {#if cost}
          <button class="small" class:primary={status === 'buildable'} disabled={status !== 'buildable'} onclick={() => game.build(s.id)}>
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
      <h3 class="grow">{tr("Assign from the Box")} <span class="muted">{pickFiltering ? `${candidates.length} of ${others}` : candidates.length}</span></h3>
    {/snippet}
  </BoxFilterBar>
  <p class="muted small">{tr("Pick a work type under Filters to sort by that job's level. Assigning a party Pal pulls it out of the party.")}</p>
  {#if full}<p class="muted small">{tr("All {n} slots are taken — dismiss a worker or build a Palbox Expansion.", { n: save.base.slots })}</p>{/if}
  {#if candidates.length === 0 && others > 0}
    <p class="muted">{tr("No Pal matches.")} <button class="small" onclick={clearPick}>{tr("Clear filters")}</button></p>
  {/if}
  <div class="list scroll">
    {#each candidates as inst (inst.uid)}
      {@const status = statusOf(save, inst.uid)}
      <PalCard {inst} showWork>
        {#if status !== 'idle'}<span class="muted small">{tr(STATUS_LABEL[status]).toLowerCase()}</span>{/if}
        <CatchOdds palId={inst.palId} />
        <button class="small" disabled={full || status === 'expedition'} onclick={() => game.assignWorker(inst.uid)}
          title={status === 'expedition' ? 'Away until the expedition returns' : status === 'party' ? 'Removes it from the party' : status === 'breeding' ? 'Breaks up the breeding pair' : ''}>{tr("Assign")}</button>
      </PalCard>
    {/each}
  </div>
</section>

<style>
  .outposts { margin: 0.4rem 0 0.8rem; }
  .outposts h3 { margin: 0 0 0.3rem; }
  .outpost { padding: 0.5rem; margin: 0.4rem 0; }
  .outpost .list { margin-top: 0.3rem; }
  .post select { max-width: 20rem; }
  .raid { padding: 0.6rem; margin: 0.4rem 0 0.6rem; border: 1.5px solid var(--danger); border-radius: var(--radius-sm); }
  .raid .hp { margin: 0.25rem 0; }
  .raid .hp span { background: var(--danger); }
  .raid p { margin: 0.4rem 0 0; }
  .raidlog { margin: 0 0 0.5rem; }
  .raidlog summary { cursor: pointer; }
  .raidlog ul { margin: 0.3rem 0 0; padding-left: 1.2rem; }
  .raidlog .lost { color: var(--danger); }
  .partners { color: var(--accent); font-size: 0.85rem; margin: -0.3rem 0 0.5rem; }
  section { margin-top: 1.25rem; }
  .status { padding: 0.5rem 0.75rem; background: var(--panel-2); border-radius: var(--radius-sm); }
  .warn { color: var(--accent); }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .scroll { max-height: 40vh; overflow-y: auto; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.25rem 0.3rem; border-bottom: 1.5px solid var(--border-soft); vertical-align: top; }
  td.icon { width: 1.6rem; }
  tr.idle { opacity: 0.5; }
  .small { font-size: 0.8rem; }
  .rates { margin-top: 0.5rem; }
  .chip { background: var(--panel-2); border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.85rem; }
  .structure { padding: 0.5rem; border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); }
  .structure.locked { opacity: 0.6; }
  input[type='search'] { min-width: 8rem; max-width: 12rem; }
  select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
