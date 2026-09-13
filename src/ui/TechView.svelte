<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import { pct } from './catchText';
  import { game } from '../state/game.svelte';
  import { chanceVsWild, chooseSphere } from '../engine/catch';
  import { palById } from '../data/pals';
  import { SPHERE_TIERS } from '../data/types';
  import { SPHERES } from '../data/spheres';
  // the sphere the policy would throw, else the first one in the bag, else a plain Pal Sphere
  const demoTier = (palId: number) => chooseSphere(game.save, palId) ?? SPHERE_TIERS.find((t) => (game.save.inventory[SPHERES[t].itemId] ?? 0) > 0) ?? 'pal';
  import { TECHS, techById, type TechDef } from '../data/tech';
  import { type TechBlock } from '../engine/tech';
  import { DEFAULT_TECH_FILTER, filterTechs, groupByLevel, isTechFiltering, TECH_KIND_LABEL, TECH_STAT_LABEL, TECH_STATUS_LABEL, type TechFilter } from '../engine/techfilter';

  const save = $derived(game.save);
  const points = $derived(save.player.techPoints);

  let filter = $state<TechFilter>({ ...DEFAULT_TECH_FILTER });
  let open = $state(false);
  const shown = $derived(filterTechs(save, filter));
  const rows = $derived(groupByLevel(shown));
  const filtering = $derived(isTechFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_TECH_FILTER }; };

  const BLOCK: Record<TechBlock, (t: TechDef) => string> = {
    researched: () => 'Researched',
    level: (t) => `Reach level ${t.level}`,
    requires: (t) => `Needs ${t.requires!.filter((r) => !save.tech.includes(r)).map((r) => techById(r).name).join(', ')}`,
    points: (t) => `Need ${t.cost} tech points`,
  };
  const ICON = { structure: '🏗️', recipe: '🔨', mult: '📈' } as const;
</script>

<div class="row">
  <h2 class="grow">{tr("Technology")} <span class="muted">{filtering ? `${shown.length} of ${TECHS.length}` : `${save.tech.length} / ${TECHS.length}`}</span></h2>
  <span class="points">{points} {tr("tech point")}{points === 1 ? '' : 's'}</span>
</div>
<div class="row">
  <input type="search" placeholder={tr("Search tech, unlock, effect…")} bind:value={filter.query} aria-label={tr("Search technology")} />
  <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>{tr("Filters")}{filtering ? ' •' : ''}</button>
</div>
{#if open}
  <div class="filters">
    <select bind:value={filter.kind} aria-label={tr("Kind")}>
      <option value="any">{tr("Any kind")}</option>
      {#each Object.entries(TECH_KIND_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
    </select>
    <select bind:value={filter.stat} aria-label={tr("Boosts")}>
      <option value="any">{tr("Any boost")}</option>
      {#each Object.entries(TECH_STAT_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
    </select>
    <select bind:value={filter.status} aria-label={tr("Status")}>
      {#each Object.entries(TECH_STATUS_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={filter.hideFuture} /> {tr("Hide levels above mine")}</label>
    {#if filtering}<button class="small" onclick={clear}>{tr("Clear")}</button>{/if}
  </div>
{/if}
<p class="muted small">{tr("You gain 2 tech points per level. Structures and recipes must be researched before you can build or craft them.")}</p>

{#if shown.length === 0}
  <p class="muted">{tr("No tech matches.")} <button class="small" onclick={clear}>{tr("Clear filters")}</button></p>
{/if}

{#each rows as [level, techs] (level)}
  <section class:future={save.player.level < level}>
    <h3>{tr("Level")} {level}</h3>
    <div class="grid">
      {#each techs as { tech: t, block } (t.id)}
        <div class="node" class:done={block === 'researched'} class:ready={block === null}>
          <div class="row top">
            <span class="icon">{ICON[t.effect.kind]}</span>
            <b class="grow">{t.name}</b>
            {#if block === 'researched'}<span class="check">✓</span>{:else}<span class="cost">{t.cost} TP</span>{/if}
          </div>
          <div class="muted small">{tr(t.desc)}</div>
          {#if t.effect.kind === 'mult' && t.effect.stat === 'catch' && block !== 'researched' && game.wild}
            {@const tier = demoTier(game.wild.palId)}
            {@const now = chanceVsWild(game.save, game.wild, tier)}
            {@const after = chanceVsWild(game.save, game.wild, tier, t.effect.mult)}
            {#if now !== null && after !== null}<div class="small odds">🎯 {palById(game.wild.palId).name} {tr("with a")} {SPHERES[tier].name}: {pct(now)} → {pct(after)}</div>{/if}
          {/if}
          {#if block !== 'researched'}
            <button class="small" class:primary={block === null} disabled={block !== null} title={block ? BLOCK[block](t) : ''}
              onclick={() => game.research(t.id)}>
              {block === null ? 'Research' : BLOCK[block](t)}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </section>
{/each}

<style>
  .points { font-weight: 600; color: var(--accent); }
  .small { font-size: 0.8rem; }
  section { margin-top: 1rem; }
  section.future { opacity: 0.6; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; }
  .node { border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); padding: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem; background: var(--panel-2); }
  .node.done { border-color: var(--ok); }
  .node.ready { border-color: var(--accent); }
  .icon { font-size: 1.1rem; }
  .cost { color: var(--accent); font-size: 0.85rem; }
  .check { color: var(--ok); font-weight: 700; }
  button { margin-top: auto; }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 18rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; padding: 0 0.3rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
  .row button.small { margin-top: 0; }
</style>
