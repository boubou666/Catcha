<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { itemName } from '../data/items';
  import { structureLevel } from '../engine/base';
  import { countOf } from '../engine/inventory';
  import {
    BREED_SEC, BREEDING_FARM, CAKE, INCUBATION_SEC, breedable, breedingParents, childOf, pairBlocker,
  } from '../engine/breeding';
  import { formatDuration } from './format';
  import PalIcon from './PalIcon.svelte';
  import PalCard from './PalCard.svelte';

  const save = $derived(game.save);
  const hasFarm = $derived(structureLevel(save, BREEDING_FARM) > 0);
  const parents = $derived(breedingParents(save));
  const pair = $derived(save.base.breeding);
  const cakes = $derived(countOf(save, CAKE));
  const idle = $derived(
    breedable(save).sort((x, y) => x.palId - y.palId || y.level - x.level),
  );

  let aUid = $state('');
  let bUid = $state('');
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
  const eggEta = (remaining: number) => formatDuration(Math.max(0, remaining) * 1000);
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
      <span class="muted small">· incubates {formatDuration(INCUBATION_SEC[palById(activeChild!).rarity] * 1000)}</span>
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
    <select bind:value={aUid}>
      <option value="">Parent A…</option>
      {#each idle as p (p.uid)}<option value={p.uid}>{label(p.uid)}</option>{/each}
    </select>
    <span class="heart">♥</span>
    <select bind:value={bUid}>
      <option value="">Parent B…</option>
      {#each idle as p (p.uid)}<option value={p.uid}>{label(p.uid)}</option>{/each}
    </select>
  </div>
  <div class="row child">
    {#if preview !== null}
      <span class="muted">Offspring:</span> <PalIcon palId={preview} size={28} /> <b>{palById(preview).name}</b>
    {/if}
    <span class="grow"></span>
    <button class="primary small" disabled={!aUid || !bUid || !!block} title={block ? BLOCK_TEXT[block] : ''}
      onclick={() => { game.setPair(aUid, bUid); aUid = ''; bUid = ''; }}>Start breeding</button>
  </div>
  {#if block}<div class="warn small">{BLOCK_TEXT[block]}</div>{/if}
  <p class="muted small">{cakes} {itemName(CAKE)} in stock · one per egg · {formatDuration(BREED_SEC * 1000)} per egg</p>
{/if}

<h3 class="eggs-title">Incubator <span class="muted">{save.base.eggs.length}</span></h3>
{#if save.base.eggs.length === 0}
  <p class="muted small">No eggs. Hatched Pals arrive in your box at level 1.</p>
{:else}
  <div class="eggs">
    {#each save.base.eggs as egg, i (i)}
      {@const total = INCUBATION_SEC[palById(egg.palId).rarity]}
      <div class="egg row">
        <PalIcon palId={egg.palId} size={32} />
        <span class="grow">{palById(egg.palId).name} egg</span>
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
  .picks select { flex: 1; min-width: 0; }
  .child { min-height: 2rem; }
  .small { font-size: 0.8rem; }
  .warn { color: var(--accent); }
  .eggs-title { margin-top: 1.5rem; }
  .eggs { display: flex; flex-direction: column; gap: 0.4rem; }
  .egg { padding: 0.4rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; }
  .egg-bar { width: 120px; }
  .egg-bar > span { background: var(--accent-2); }
  .eta { min-width: 3.5rem; text-align: right; }
</style>
