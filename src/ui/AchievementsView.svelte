<script lang="ts">
  import { game } from '../state/game.svelte';
  import { ACHIEVEMENTS, categoryLabel, POINT_GOLD_BONUS, type AchievementCategory, type AchievementDef } from '../data/achievements';
  import { achievementPoints, isUnlocked, progressOf, totalPoints } from '../engine/achievements';

  const save = $derived(game.save);
  const points = $derived(achievementPoints(save));
  const unlockedCount = $derived(save.achievements.length);

  const groups = $derived.by(() => {
    const m = new Map<AchievementCategory, AchievementDef[]>();
    for (const a of ACHIEVEMENTS) m.set(a.category, [...(m.get(a.category) ?? []), a]);
    return [...m.entries()];
  });

  const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));
</script>

<div class="row">
  <h2 class="grow">Achievements <span class="muted">{unlockedCount} / {ACHIEVEMENTS.length}</span></h2>
  <span class="points">🏆 {points} / {totalPoints} pts · +{Math.round(points * POINT_GOLD_BONUS * 100)}% gold</span>
</div>
<p class="muted small">Every point is +{POINT_GOLD_BONUS * 100}% gold from defeated Pals, permanently.</p>

{#each groups as [category, list] (category)}
  <section>
    <h3>{categoryLabel(category)} <span class="muted">{list.filter((a) => isUnlocked(save, a.id)).length} / {list.length}</span></h3>
    <div class="grid">
      {#each list as a (a.id)}
        {@const done = isUnlocked(save, a.id)}
        {@const value = progressOf(save, a)}
        <div class="ach" class:done>
          <div class="row top">
            <b class="grow">{a.name}</b>
            <span class="pts">{done ? '✓ ' : ''}{a.points} pt{a.points === 1 ? '' : 's'}</span>
          </div>
          <div class="muted small">{a.desc}</div>
          <div class="bar"><span style:width="{(value / a.goal) * 100}%"></span></div>
          <div class="muted small">{fmt(value)} / {fmt(a.goal)}</div>
        </div>
      {/each}
    </div>
  </section>
{/each}

<style>
  .points { color: var(--accent); font-weight: 600; }
  .small { font-size: 0.8rem; }
  section { margin-top: 1rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 0.5rem; }
  .ach { border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem; background: var(--panel-2); display: flex; flex-direction: column; gap: 0.25rem; }
  .ach.done { border-color: var(--ok); }
  .ach.done .pts { color: var(--ok); }
  .pts { font-size: 0.8rem; color: var(--muted); }
  .bar { height: 5px; }
  .ach.done .bar > span { background: var(--ok); }
</style>
