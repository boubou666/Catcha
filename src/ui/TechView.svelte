<script lang="ts">
  import { game } from '../state/game.svelte';
  import { TECHS, techById, type TechDef } from '../data/tech';
  import { researchBlocker, type TechBlock } from '../engine/tech';

  const save = $derived(game.save);
  const points = $derived(save.player.techPoints);

  // group by required level, ascending
  const rows = $derived.by(() => {
    const byLevel = new Map<number, TechDef[]>();
    for (const t of TECHS) byLevel.set(t.level, [...(byLevel.get(t.level) ?? []), t]);
    return [...byLevel.entries()].sort(([a], [b]) => a - b);
  });

  const BLOCK: Record<TechBlock, (t: TechDef) => string> = {
    researched: () => 'Researched',
    level: (t) => `Reach level ${t.level}`,
    requires: (t) => `Needs ${t.requires!.filter((r) => !save.tech.includes(r)).map((r) => techById(r).name).join(', ')}`,
    points: (t) => `Need ${t.cost} tech points`,
  };
  const ICON = { structure: '🏗️', recipe: '🔨', mult: '📈' } as const;
</script>

<div class="row">
  <h2 class="grow">Technology</h2>
  <span class="points">{points} tech point{points === 1 ? '' : 's'}</span>
</div>
<p class="muted small">You gain 2 tech points per level. Structures and recipes must be researched before you can build or craft them.</p>

{#each rows as [level, techs] (level)}
  <section class:future={save.player.level < level}>
    <h3>Level {level}</h3>
    <div class="grid">
      {#each techs as t (t.id)}
        {@const block = researchBlocker(save, t.id)}
        <div class="node" class:done={block === 'researched'} class:ready={block === null}>
          <div class="row top">
            <span class="icon">{ICON[t.effect.kind]}</span>
            <b class="grow">{t.name}</b>
            {#if block === 'researched'}<span class="check">✓</span>{:else}<span class="cost">{t.cost} TP</span>{/if}
          </div>
          <div class="muted small">{t.desc}</div>
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
  .node { border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem; background: var(--panel-2); }
  .node.done { border-color: var(--ok); }
  .node.ready { border-color: var(--accent); }
  .icon { font-size: 1.1rem; }
  .cost { color: var(--accent); font-size: 0.85rem; }
  .check { color: var(--ok); font-weight: 700; }
  button { margin-top: auto; }
</style>
