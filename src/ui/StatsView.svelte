<script lang="ts">
  import { game } from '../state/game.svelte';
  import { defeatsByElement, fmtInt, statsReport } from '../engine/stats';
  import { ELEMENT_COLORS } from '../data/elements';
  import type { Element } from '../data/types';

  // The report is rebuilt each second by the tick counter, not on every hit.
  let tick = $state(0);
  $effect(() => {
    const id = setInterval(() => { tick += 1; }, 1000);
    return () => clearInterval(id);
  });
  const sections = $derived.by(() => { void tick; return statsReport(game.save, { dps: game.dps, clickDmg: game.clickDmg }); });
  const elements = $derived.by(() => { void tick; return defeatsByElement(game.save); });
  const maxElement = $derived(elements[0]?.n ?? 1);
</script>

<div class="row">
  <h2 class="grow">Statistics</h2>
  <span class="muted small">Lifetime, carried through Ascension</span>
</div>

<div class="grid">
  {#each sections as sec (sec.title)}
    <section class="card">
      <h3>{sec.title}</h3>
      <dl>
        {#each sec.rows as r (r.label)}
          <div class="stat" class:sub={r.label.startsWith(' ')}>
            <dt>{r.label.trim()}</dt>
            <dd>{r.value}{#if r.hint}<span class="hint muted">{r.hint}</span>{/if}</dd>
          </div>
        {/each}
      </dl>
    </section>
  {/each}

  <section class="card">
    <h3>Defeats by element</h3>
    {#if elements.length === 0}
      <p class="muted">Nothing defeated yet.</p>
    {:else}
      <ul class="bars">
        {#each elements as e (e.element)}
          <li>
            <span class="el">{e.element}</span>
            <span class="track"><span class="fill" style="width: {(e.n / maxElement) * 100}%; background: {ELEMENT_COLORS[e.element as Element]}"></span></span>
            <span class="n">{fmtInt(e.n)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; margin-top: 0.5rem; }
  .card { background: var(--panel-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.6rem 0.75rem; }
  h3 { margin: 0 0 0.4rem; }
  dl { margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .stat { display: flex; justify-content: space-between; gap: 0.75rem; align-items: baseline; }
  .stat.sub { padding-left: 0.9rem; font-size: 0.85rem; }
  .stat.sub dt { color: var(--muted); }
  dt { margin: 0; }
  dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .hint { display: block; font-weight: 400; font-size: 0.75rem; }
  .bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .bars li { display: grid; grid-template-columns: 5rem 1fr 3.5rem; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
  .track { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .fill { display: block; height: 100%; border-radius: 4px; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .small { font-size: 0.8rem; }
</style>
