<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { itemName } from '../data/items';
  import { structureLevel } from '../engine/base';
  import { countOf } from '../engine/inventory';
  import {
    BREED_SEC, BREEDING_FARM, CAKE, INCUBATION_SEC, breedable, breedingParents, childOf, luckyEggChance, pairBlocker,
    DEFAULT_EGG_FILTER, EGG_SORT_LABEL, filterEggs, isEggFiltering, type EggFilter,
  } from '../engine/breeding';
  import { formatDuration } from './format';
  import PalIcon from './PalIcon.svelte';
  import PalCard from './PalCard.svelte';
  import PassiveChips from './PassiveChips.svelte';
  import { MUTATION_CHANCE } from '../data/passives';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import { DEFAULT_FILTER, isFiltering, partnerCandidates, type BoxFilter } from '../engine/boxfilter';

  const save = $derived(game.save);
  const hasFarm = $derived(structureLevel(save, BREEDING_FARM) > 0);
  const parents = $derived(breedingParents(save));
  const pair = $derived(save.base.breeding);
  const cakes = $derived(countOf(save, CAKE));
  const idle = $derived(breedable(save));

  let aUid = $state('');
  let bUid = $state('');
  // Picker: idle Pals by species; once a parent is picked the search also matches the offspring's name.
  const PICK_DEFAULTS: BoxFilter = { ...DEFAULT_FILTER, status: 'idle', sort: 'species' };
  let filter = $state<BoxFilter>({ ...PICK_DEFAULTS });
  const picked = $derived(aUid || bUid || null);
  const candidates = $derived(partnerCandidates(save, filter, picked).filter((p) => p.uid !== aUid && p.uid !== bUid));
  const filtering = $derived(isFiltering(filter, PICK_DEFAULTS));
  const clear = () => { filter = { ...PICK_DEFAULTS, sort: filter.sort }; };
  const pick = (uid: string) => { if (!aUid) aUid = uid; else if (!bUid) bUid = uid; else bUid = uid; };
  const childWith = (uid: string) => { const a = save.box.find((p) => p.uid === picked); const b = save.box.find((p) => p.uid === uid); return a && b ? childOf(a.palId, b.palId) : null; };
  const inst = (uid: string) => save.box.find((p) => p.uid === uid);

  let eggFilter = $state<EggFilter>({ ...DEFAULT_EGG_FILTER });
  const eggs = $derived(filterEggs(save, eggFilter));
  const eggFiltering = $derived(isEggFiltering(eggFilter));
  const preview = $derived.by(() => {
    const a = save.box.find((p) => p.uid === aUid);
    const b = save.box.find((p) => p.uid === bUid);
    return a && b ? childOf(a.palId, b.palId) : null;
  });
  const block = $derived(aUid && bUid ? pairBlocker(save, aUid, bUid) : null);
  const BLOCK_TEXT = { 'no-farm': 'Build the Breeding Farm first', 'same-pal': 'Pick two different Pals', 'busy': 'One of them is busy' };

  const label = (uid: string) => {
    const p = save.box.find((x) => x.uid === uid);
    return p ? `${palById(p.palId).name} Lv ${p.level}${p.stars ? ' ' + '★'.repeat(p.stars) : ''}${p.lucky ? ' ✨' : ''}` : '';
  };
  const activeChild = $derived(parents ? childOf(parents[0].palId, parents[1].palId) : null);
  const inheritable = (a?: { passives: string[] }, b?: { passives: string[] }) =>
    [...new Set([...(a?.passives ?? []), ...(b?.passives ?? [])])].filter((id) => id !== 'lucky' && id !== 'legend');
  const activePool = $derived(parents ? inheritable(parents[0], parents[1]) : []);
  const previewPool = $derived(inheritable(save.box.find((p) => p.uid === aUid), save.box.find((p) => p.uid === bUid)));
  const eggEta = (remaining: number) => formatDuration(Math.max(0, remaining) * 1000);
  const pct = (n: number) => (n * 100 < 1 ? `${(n * 100).toFixed(1)}%` : `${Math.round(n * 100)}%`);
  const activeLucky = $derived(parents ? luckyEggChance(parents[0], parents[1]) : 0);
  const previewLucky = $derived.by(() => {
    const a = save.box.find((p) => p.uid === aUid); const b = save.box.find((p) => p.uid === bUid);
    return a && b ? luckyEggChance(a, b) : 0;
  });
</script>

<h2>Breeding Farm</h2>

{#if !hasFarm}
  <p class="muted">Build the <b>Breeding Farm</b> at your base (Base → Structures). Each egg costs one Cake, baked at the Workbench.</p>
{:else if parents}
  <div class="pair panel-2">
    <div class="row parents">
      <PalCard inst={parents[0]} />
      <span class="heart">♥</span>
      <PalCard inst={parents[1]} />
    </div>
    <div class="row child">
      <span class="muted">Offspring:</span>
      {#if activeChild !== null}<PalIcon palId={activeChild} size={28} /> <b>{palById(activeChild).name}</b>{/if}
      <span class="muted small">· incubates {formatDuration(INCUBATION_SEC[palById(activeChild!).rarity] * 1000)} · ✨ {pct(activeLucky)} Lucky</span>
    </div>
    <div class="row child muted small">
      <span>Passives it can inherit:</span>
      {#if activePool.length}<PassiveChips ids={activePool} />{:else}<span>none — {Math.round(MUTATION_CHANCE * 100)}% chance of a random one per slot</span>{/if}
    </div>
    {#if pair?.progress !== null && pair}
      <div class="bar grow"><span style:width="{pair.progress * 100}%"></span></div>
      <div class="muted small">Egg in {eggEta((1 - pair.progress) * BREED_SEC)} · {cakes} {itemName(CAKE)} left</div>
    {:else}
      <div class="warn small">Waiting for a Cake ({cakes} in stock). Bake one under Craft.</div>
    {/if}
    <button class="small" onclick={() => game.clearPair()}>Separate pair</button>
  </div>
{:else}
  <p class="muted small">Pick two idle Pals — not in the party, not working. Same species breeds true; otherwise the child is the species closest to the parents' average breeding power.</p>
  <div class="row picks">
    {#each [['A', aUid], ['B', bUid]] as [which, uid], i}
      <div class="slot" class:filled={!!uid}>
        {#if uid && inst(uid)}
          <PalIcon palId={inst(uid)!.palId} size={32} lucky={inst(uid)!.lucky} />
          <span class="grow">{label(uid)}</span>
          <button class="small" onclick={() => { if (i === 0) aUid = ''; else bUid = ''; }} title="Remove">✕</button>
        {:else}
          <span class="muted">Parent {which} — pick from the list below</span>
        {/if}
      </div>
      {#if i === 0}<span class="heart">♥</span>{/if}
    {/each}
  </div>
  <div class="row child">
    {#if preview !== null}
      <span class="muted">Offspring:</span> <PalIcon palId={preview} size={28} /> <b>{palById(preview).name}</b>
      {#if previewPool.length}<span class="muted small">· may inherit</span> <PassiveChips ids={previewPool} />{/if}
      <span class="muted small">· ✨ {pct(previewLucky)} Lucky</span>
    {/if}
    <span class="grow"></span>
    <button class="primary small" disabled={!aUid || !bUid || !!block} title={block ? BLOCK_TEXT[block] : ''}
      onclick={() => { game.setPair(aUid, bUid); aUid = ''; bUid = ''; }}>Start breeding</button>
  </div>
  {#if block}<div class="warn small">{BLOCK_TEXT[block]}</div>{/if}
  <p class="muted small">{cakes} {itemName(CAKE)} in stock · one per egg · {formatDuration(BREED_SEC * 1000)} per egg</p>

  <div class="picker">
    <BoxFilterBar bind:filter defaults={PICK_DEFAULTS} label="Search parents" hideStatus>
      {#snippet heading()}
        <h3 class="grow">Idle Pals <span class="muted">{filtering ? `${candidates.length} of ${idle.length}` : candidates.length}</span></h3>
      {/snippet}
    </BoxFilterBar>
    {#if picked}<p class="muted small">Searching also matches the offspring each partner would give — try the species you want.</p>{/if}
    {#if idle.length === 0}
      <p class="muted">No idle Pals — everyone is in the party, working or away.</p>
    {:else if candidates.length === 0}
      <p class="muted">No Pal matches. <button class="small" onclick={clear}>Clear filters</button></p>
    {/if}
    <div class="list scroll">
      {#each candidates as p (p.uid)}
        {@const child = picked ? childWith(p.uid) : null}
        <PalCard inst={p}>
          {#if child !== null}<span class="muted small child-tag">→ <PalIcon palId={child} size={20} /> {palById(child).name}</span>{/if}
          <button class="small" onclick={() => pick(p.uid)}>{!aUid ? 'Parent A' : !bUid ? 'Parent B' : 'Swap B'}</button>
        </PalCard>
      {/each}
    </div>
  </div>
{/if}

<div class="row eggs-head">
  <h3 class="eggs-title grow">Incubator <span class="muted">{eggFiltering ? `${eggs.length} of ${save.base.eggs.length}` : save.base.eggs.length}</span></h3>
  {#if save.base.eggs.length > 1}
    <input type="search" placeholder="Search eggs…" bind:value={eggFilter.query} aria-label="Search eggs" />
    <label class="chk"><input type="checkbox" bind:checked={eggFilter.luckyOnly} /> ✨ Lucky</label>
    <select bind:value={eggFilter.sort} aria-label="Egg sort">
      {#each Object.entries(EGG_SORT_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
  {/if}
</div>
{#if save.base.eggs.length === 0}
  <p class="muted small">No eggs. Hatched Pals arrive in your box at level 1.</p>
{:else if eggs.length === 0}
  <p class="muted small">No egg matches.</p>
{:else}
  <div class="eggs">
    {#each eggs as { egg, index: i } (i)}
      {@const total = INCUBATION_SEC[palById(egg.palId).rarity]}
      <div class="egg row">
        <PalIcon palId={egg.palId} size={32} />
        <span class="grow">{#if egg.lucky}<span class="lucky-tag">✨ Lucky</span> {/if}{palById(egg.palId).name} egg{#if egg.passives.length} <PassiveChips ids={egg.passives} />{/if}</span>
        <div class="bar egg-bar"><span style:width="{(1 - Math.max(0, egg.remaining) / total) * 100}%"></span></div>
        <span class="muted small eta">{eggEta(egg.remaining)}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .panel-2 { background: var(--panel-2); border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .parents { align-items: center; }
  .parents :global(.card) { flex: 1; }
  .heart { color: var(--danger); font-size: 1.3rem; }
  .picks { align-items: center; }
  .slot { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.6rem; border: 1px dashed var(--border); border-radius: 8px; min-height: 2.8rem; }
  .slot.filled { border-style: solid; border-color: var(--accent); }
  .picker { margin-top: 1rem; }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .scroll { max-height: 45vh; overflow-y: auto; }
  .child-tag { display: inline-flex; align-items: center; gap: 0.25rem; }
  h3 { margin: 0; }
  .child { min-height: 2rem; }
  .small { font-size: 0.8rem; }
  .warn { color: var(--accent); }
  .eggs-head { margin-top: 1.5rem; }
  .eggs-title { margin: 0; }
  .eggs-head input[type='search'] { min-width: 7rem; max-width: 11rem; font-size: 0.85rem; }
  .eggs-head select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
  .eggs { display: flex; flex-direction: column; gap: 0.4rem; }
  .egg { padding: 0.4rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; }
  .egg-bar { width: 120px; }
  .egg-bar > span { background: var(--accent-2); }
  .eta { min-width: 3.5rem; text-align: right; }
  .lucky-tag { color: var(--accent); font-weight: 600; }
</style>
