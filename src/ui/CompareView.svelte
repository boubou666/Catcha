<script lang="ts">
  import { game } from '../state/game.svelte';
  import { compare } from '../state/compare.svelte';
  import { palById } from '../data/pals';
  import { compareRows, MAX_COMPARE } from '../engine/compare';
  import PalIcon from './PalIcon.svelte';
  import PassiveChips from './PassiveChips.svelte';

  const save = $derived(game.save);
  // drop anything that left the box (released / ascended)
  const insts = $derived(compare.uids.map((u) => save.box.find((p) => p.uid === u)).filter((p): p is NonNullable<typeof p> => !!p));
  const rows = $derived(compareRows(save, insts));
  const others = $derived([...save.box].filter((p) => !compare.has(p.uid)).sort((a, b) => b.level - a.level || a.palId - b.palId));

  let pick = $state('');
  function add() {
    if (pick) { compare.toggle(pick); pick = ''; }
  }
  const label = (p: (typeof save.box)[number]) => `${palById(p.palId).name} Lv ${p.level}${p.stars ? ' ' + '★'.repeat(p.stars) : ''}${p.lucky ? ' ✨' : ''}`;
</script>

<div class="row">
  <h2 class="grow">Compare <span class="muted">{insts.length} / {MAX_COMPARE}</span></h2>
  {#if insts.length}<button class="small" onclick={() => compare.clear()}>Clear</button>{/if}
</div>
<p class="muted small">Pick up to {MAX_COMPARE} Pals here or with the ⚖ button in the Box. Best value per row is highlighted; work rows are effective output after stars, passives and sanity.</p>

<div class="row">
  <select bind:value={pick} disabled={compare.full}>
    <option value="">{compare.full ? 'Selection full' : 'Add a Pal…'}</option>
    {#each others as p (p.uid)}<option value={p.uid}>{label(p)}</option>{/each}
  </select>
  <button class="small" disabled={!pick || compare.full} onclick={add}>Add</button>
</div>

{#if insts.length === 0}
  <p class="muted">Nothing selected yet.</p>
{:else}
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th></th>
          {#each insts as p (p.uid)}
            <th>
              <PalIcon palId={p.palId} size={40} lucky={p.lucky} />
              <div class="small"><b>{palById(p.palId).name}</b></div>
              <PassiveChips ids={p.passives} />
              <button class="tiny" title="Remove" onclick={() => compare.remove(p.uid)}>✕</button>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as r (r.label)}
          <tr>
            <td class="label">{r.label}</td>
            {#each r.values as v, i}
              <td class:best={r.best.includes(i)}>{v}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .small { font-size: 0.8rem; }
  .scroll { overflow-x: auto; margin-top: 0.75rem; }
  table { border-collapse: collapse; width: 100%; min-width: 420px; }
  th, td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border); text-align: center; vertical-align: middle; }
  th { vertical-align: top; }
  td.label { text-align: left; color: var(--muted); white-space: nowrap; }
  td.best { color: var(--ok); font-weight: 600; }
  .tiny { font-size: 0.7rem; padding: 0 0.35rem; margin-top: 0.25rem; }
  select { max-width: 60%; }
</style>
