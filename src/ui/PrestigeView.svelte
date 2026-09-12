<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { PRESTIGE_UPGRADES } from '../data/prestige';
  import { REGIONS } from '../data/regions';
  import { arkCandidates, arkSlots, canAscend, DEFAULT_UPGRADE_FILTER, filterUpgrades, relicsFor, upgradeLevel, UPGRADE_STATUS_LABEL, type UpgradeFilter } from '../engine/prestige';
  import { DEFAULT_FILTER, filterBox, isFiltering, statusOf, STATUS_LABEL, type BoxFilter } from '../engine/boxfilter';
  import { instanceAttack } from '../engine/formulas';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import PalIcon from './PalIcon.svelte';
  import PassiveChips from './PassiveChips.svelte';

  const save = $derived(game.save);
  const relics = $derived(save.prestige.relics);
  const worth = $derived(relicsFor(save));
  const slots = $derived(arkSlots(save));
  const eligible = $derived(new Set(arkCandidates(save).map((p) => p.uid)));

  // upgrades: a small search + status filter; the Ark picker gets the usual Box filter bar
  let upFilter = $state<UpgradeFilter>({ ...DEFAULT_UPGRADE_FILTER });
  const upgrades = $derived(filterUpgrades(save, upFilter));
  const upFiltering = $derived(upFilter.query.trim() !== '' || upFilter.status !== 'any');
  const PICK_DEFAULTS: BoxFilter = { ...DEFAULT_FILTER, sort: 'attack' };
  let filter = $state<BoxFilter>({ ...PICK_DEFAULTS });
  const candidates = $derived(filterBox(save, filter).filter((p) => eligible.has(p.uid)));
  const filtering = $derived(isFiltering(filter, PICK_DEFAULTS));
  const clear = () => { filter = { ...PICK_DEFAULTS, sort: filter.sort }; };
  function pickBest() {
    keep = [...candidates].sort((a, b) => instanceAttack(b) - instanceAttack(a)).slice(0, slots).map((p) => p.uid);
  }
  const towersCleared = $derived(save.progress.towers.length);

  let keep = $state<string[]>([]);
  let confirming = $state(false);
  function toggle(uid: string) {
    keep = keep.includes(uid) ? keep.filter((u) => u !== uid) : keep.length < slots ? [...keep, uid] : keep;
  }
  function doAscend() {
    game.ascend(keep);
    keep = [];
    confirming = false;
  }
  const effect = (id: string) => {
    const u = PRESTIGE_UPGRADES.find((x) => x.id === id)!;
    const lv = upgradeLevel(save, id);
    switch (u.effect.kind) {
      case 'mult': return `now +${Math.round(u.effect.perLevel * lv * 100)}%`;
      case 'ark': return `carry ${slots}`;
      case 'techPoints': return `+${u.effect.perLevel * lv} TP`;
      case 'quota': return `−${Math.round(Math.min(0.5, u.effect.perLevel * lv) * 100)}% kills`;
      case 'spheres': return `+${u.effect.perLevel * lv} spheres`;
    }
  };
</script>

<div class="row">
  <h2 class="grow">Ascension <span class="muted">{save.prestige.ascensions} so far</span></h2>
  <span class="relics">🏺 {relics} Ancient Relic{relics === 1 ? '' : 's'}</span>
</div>
<p class="muted small">
  Start the map over for Ancient Relics and spend them on permanent upgrades. You keep your Paldeck records, achievements,
  stats, daily quests and up to {slots} Pal{slots === 1 ? '' : 's'} of your choice (with levels, stars and passives). Everything else — routes,
  towers, base, items, tech, level — resets.
</p>

<section>
  <div class="row">
    <h3 class="grow">Ancient upgrades <span class="muted">{upFiltering ? `${upgrades.length} of ${PRESTIGE_UPGRADES.length}` : PRESTIGE_UPGRADES.length}</span></h3>
    <input type="search" placeholder="Search upgrades…" bind:value={upFilter.query} aria-label="Search upgrades" />
    <select bind:value={upFilter.status} aria-label="Upgrade status">
      {#each Object.entries(UPGRADE_STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
  </div>
  {#if upgrades.length === 0}
    <p class="muted">No upgrade matches. <button class="small" onclick={() => (upFilter = { ...DEFAULT_UPGRADE_FILTER })}>Clear</button></p>
  {/if}
  <div class="grid">
    {#each upgrades as { def: u, level: lv, cost } (u.id)}
      <div class="up" class:maxed={cost === null}>
        <div class="row top"><b class="grow">{u.name}</b><span class="muted small">Lv {lv} / {u.maxLevel}</span></div>
        <div class="muted small">{u.desc} <span class="now">({effect(u.id)})</span></div>
        {#if cost !== null}
          <button class="small" class:primary={relics >= cost} disabled={relics < cost} onclick={() => game.buyUpgrade(u.id)}>🏺 {cost}</button>
        {:else}<span class="small maxed-label">Maxed</span>{/if}
      </div>
    {/each}
  </div>
</section>

<section>
  <h3>Ascend</h3>
  {#if !canAscend(save)}
    <p class="muted small">Clear at least one tower first. Relics come from towers (1–7 each by region), every 10 species owned, and every 10 levels.</p>
  {:else}
    <p class="small">This run is worth <b class="relics">🏺 {worth}</b> — {towersCleared} tower{towersCleared === 1 ? '' : 's'}, {Object.values(save.paldeck).filter((e) => e.caught > 0).length} species, level {save.player.level}.
      {#each REGIONS as r, i}{#if !save.progress.towers.includes(r.tower.id)} <span class="muted">Next tower: +{i + 1}.</span>{/if}{/each}
    </p>
    <div class="row">
      <h3 class="grow">Choose up to {slots} to carry <span class="muted">{keep.length} / {slots}</span></h3>
      <button class="small" disabled={candidates.length === 0} onclick={pickBest} title="Fill the Ark with the strongest Pals in the list below">Pick best</button>
      {#if keep.length}<button class="small" onclick={() => (keep = [])}>Clear picks</button>{/if}
    </div>
    <BoxFilterBar bind:filter defaults={PICK_DEFAULTS} label="Search Pals to carry">
      {#snippet heading()}
        <span class="grow muted small">Eligible {filtering ? `${candidates.length} of ${eligible.size}` : eligible.size}</span>
      {/snippet}
    </BoxFilterBar>
    {#if eligible.size > 0 && candidates.length === 0}
      <p class="muted">No Pal matches. <button class="small" onclick={clear}>Clear filters</button></p>
    {/if}
    <div class="list scroll">
      {#each candidates as p (p.uid)}
        {@const on = keep.includes(p.uid)}
        {@const status = statusOf(save, p.uid)}
        <label class="pick row" class:on>
          <input type="checkbox" checked={on} disabled={!on && keep.length >= slots} onchange={() => toggle(p.uid)} />
          <PalIcon palId={p.palId} size={32} lucky={p.lucky} />
          <span class="grow"><b>{palById(p.palId).name}</b> <span class="muted">Lv {p.level}{p.stars ? ' ' + '★'.repeat(p.stars) : ''}{p.lucky ? ' ✨' : ''} · ATK {instanceAttack(p).toFixed(1)}</span> <PassiveChips ids={p.passives} /></span>
          {#if status !== 'idle'}<span class="muted small">{STATUS_LABEL[status].toLowerCase()}</span>{/if}
        </label>
      {/each}
    </div>
    {#if !confirming}
      <button class="primary ascend" onclick={() => (confirming = true)}>Ascend for 🏺 {worth}</button>
    {:else}
      <div class="confirm">
        <p><b>Are you sure?</b> Everything except your records, upgrades and the {keep.length} chosen Pal{keep.length === 1 ? '' : 's'} will be gone. The Merchant, your base and your inventory reset to a fresh start.</p>
        <div class="row">
          <button class="danger" onclick={doAscend}>Yes, ascend</button>
          <button onclick={() => (confirming = false)}>Not yet</button>
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .relics { color: var(--accent); font-weight: 600; }
  .small { font-size: 0.8rem; }
  section { margin-top: 1.25rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 0.5rem; }
  .up { border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem; background: var(--panel-2); display: flex; flex-direction: column; gap: 0.3rem; }
  .up.maxed { border-color: var(--ok); }
  .maxed-label { color: var(--ok); }
  .now { color: var(--text); }
  .up button { margin-top: auto; align-self: flex-start; }
  .list { display: flex; flex-direction: column; gap: 0.4rem; }
  .scroll { max-height: 35vh; overflow-y: auto; }
  .pick { padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
  .pick.on { border-color: var(--accent); }
  .ascend { width: 100%; padding: 0.8rem; margin-top: 0.75rem; }
  .confirm { margin-top: 0.75rem; padding: 0.75rem; border: 1px solid var(--danger); border-radius: 8px; }
  input[type='search'] { min-width: 8rem; max-width: 14rem; }
  select { font-size: 0.85rem; }
</style>
