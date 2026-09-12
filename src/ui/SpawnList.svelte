<script lang="ts">
  import { game } from '../state/game.svelte';
  import { ELEMENTS } from '../data/types';
  import { DEFAULT_SPAWN_FILTER, filterSpawns, isSpawnFiltering, spawnTable, SPAWN_STATUS_LABEL, type SpawnFilter, type SpawnTable } from '../engine/arenafilter';
  import { catchPreview } from '../engine/catch';
  import { catchText } from './catchText';
  import { palById } from '../data/pals';
  import PalIcon from './PalIcon.svelte';

  // Defaults to the current route; a realm passes its wave pool and guardian.
  let { spawns, where, guardian }: { spawns?: SpawnTable; where?: string; guardian?: number } = $props();
  let filter = $state<SpawnFilter>({ ...DEFAULT_SPAWN_FILTER });
  let open = $state(false);
  const all = $derived(spawnTable(game.save, spawns ?? game.route.spawns, game.watched));
  const guardianPv = $derived(guardian !== undefined ? catchPreview(game.save, guardian) : null);
  const rows = $derived(filterSpawns(all, filter));
  const filtering = $derived(isSpawnFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_SPAWN_FILTER }; };
  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

<div class="row head">
  <span class="grow muted small">{where ?? `On ${game.route.name}`} <b>{filtering ? `${rows.length} of ${all.length}` : all.length}</b> species</span>
  <input type="search" placeholder="Search…" bind:value={filter.query} aria-label="Search spawns" />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>Filters{filtering ? ' •' : ''}</button>
</div>
{#if open}
  <div class="filters">
    <select bind:value={filter.status} aria-label="Spawn status">
      {#each Object.entries(SPAWN_STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
    </select>
    <select bind:value={filter.element} aria-label="Spawn element">
      <option value="any">Any element</option>
      {#each ELEMENTS as e}<option value={e}>{e}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.watchedOnly} /> 👀 Watched</label>
    {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
  </div>
{/if}
{#if rows.length === 0}
  <p class="muted small">No species matches. <button class="small" onclick={clear}>Clear</button></p>
{/if}
<div class="spawns">
  {#each rows as r (r.palId)}
    <div class="spawn row" class:here={game.wild?.palId === r.palId} class:missing={r.status === 'missing'}>
      <PalIcon palId={r.palId} size={28} unknown={r.status === 'missing'} />
      <span class="grow">
        <b>{r.name}</b> <span class="muted small">#{r.no}{r.elements.length ? ` · ${r.elements.join('/')}` : ''}{r.status === 'seen' ? ' · seen' : r.status === 'caught' ? ' · caught' : ''}</span>
      </span>
      <span class="muted small chance">{pct(r.chance)}</span>
      <span class="small chance odds" class:no={!r.catch.throws} title={`Catch: ${catchText(r.catch)}`}>🎯 {r.catch.throws ? pct(r.catch.chance) : '—'}</span>
      <button class="small watch" class:on={r.watched} onclick={() => game.toggleWatch(r.palId)} title={r.watched ? 'Stop watching' : 'Toast me when this Pal spawns'}>👀</button>
    </div>
  {/each}
  {#if guardian !== undefined && guardianPv}
    <div class="spawn row guardian" class:here={game.wild?.palId === guardian && game.wild?.kind === 'dungeonBoss'}>
      <PalIcon palId={guardian} size={28} />
      <span class="grow"><b>{palById(guardian).name}</b> <span class="muted small">· guardian, after the last wave</span></span>
      <span class="small chance odds" class:no={!guardianPv.throws} title={`Catch: ${catchText(guardianPv)}`}>🎯 {guardianPv.throws ? pct(guardianPv.chance) : '—'}</span>
    </div>
  {/if}
</div>
<p class="muted tiny">First number: each species' share of the spawn table. 🎯: catch odds with the sphere your policy picks (Settings → Catching). Watched Pals pop a toast when they appear (this device only).</p>

<style>
  .head { margin-bottom: 0.3rem; }
  .small { font-size: 0.8rem; }
  .tiny { font-size: 0.75rem; margin: 0.4rem 0 0; }
  input[type='search'] { min-width: 6rem; flex: 1; max-width: 10rem; font-size: 0.85rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0 0 0.4rem; padding: 0.4rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
  .spawns { display: flex; flex-direction: column; gap: 0.25rem; max-height: 40vh; overflow-y: auto; }
  .spawn { padding: 0.25rem 0.4rem; border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); }
  .spawn.here { border-color: var(--accent); }
  .spawn.missing { opacity: 0.7; }
  .chance { min-width: 2.5rem; text-align: right; font-variant-numeric: tabular-nums; }
  .odds { color: var(--accent-2); min-width: 3.6rem; font-weight: 700; }
  .odds.no { color: var(--muted); font-weight: 400; }
  .guardian { border-style: dashed; }
  .watch { opacity: 0.5; }
  .watch.on { opacity: 1; border-color: var(--accent); }
</style>
