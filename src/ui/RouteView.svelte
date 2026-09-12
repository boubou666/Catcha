<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { alphaById, towerById } from '../data/regions';
  import { describeRequirement, isUnlocked, routeCleared, routeKills } from '../engine/progress';
  import PalIcon from './PalIcon.svelte';

  const wild = $derived(game.wild);
  const def = $derived(wild ? palById(wild.palId) : null);
  const hpPct = $derived(wild ? Math.max(0, (wild.hp / wild.maxHp) * 100) : 0);
  const kills = $derived(routeKills(game.save, game.route.id));

  // ticking clock for the tower time limit
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 500);
    return () => clearInterval(id);
  });
  const secondsLeft = $derived(wild?.deadlineAt ? Math.max(0, Math.ceil((wild.deadlineAt - now) / 1000)) : null);

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(n < 10 ? 1 : 0));

  const tower = $derived(game.region.tower);
  const towerUnlocked = $derived(isUnlocked(game.save, tower.unlock));
  const towerDone = $derived(game.save.progress.towers.includes(tower.id));
</script>

<div class="panel">
  {#if game.regions.length > 1}
    <div class="regions row">
      {#each game.regions as r (r.id)}
        <button class="small" class:active={r.id === game.region.id} disabled={game.inBossFight} onclick={() => game.travelToRegion(r.id)}>{r.name}</button>
      {/each}
    </div>
  {/if}
  <h3>Routes — {game.region.name}</h3>
  <div class="routes">
    {#each game.region.routes as r}
      {@const unlocked = game.canTravel(r.id)}
      {@const cleared = routeCleared(game.save, r)}
      <button
        class:active={r.id === game.route.id}
        class:cleared
        disabled={!unlocked || game.inBossFight}
        onclick={() => game.travel(r.id)}
        title={unlocked ? `${routeKills(game.save, r.id)} / ${r.killsToClear} defeated` : describeRequirement(r.unlock)}
      >
        <span>{r.name}</span>
        <span class="muted">Lv {r.level}{cleared ? ' ✓' : ''}</span>
      </button>
    {/each}
  </div>
</div>

<div class="panel arena">
  {#if wild && def}
    <div class="row">
      <PalIcon palId={wild.palId} size={110} lucky={wild.lucky} render />
      <div class="grow">
        <div class="name">
          {#if wild.kind === 'alpha'}<span class="tag">ALPHA</span>{/if}
          {#if wild.kind === 'tower'}<span class="tag">TOWER</span>{/if}
          {#if wild.lucky}<span class="tag lucky">LUCKY</span>{/if}
          {def.name} <span class="muted">Lv {wild.level}</span>
        </div>
        <div class="muted">{def.elements.join(' / ')} · {def.rarity}</div>
        <div class="bar hp"><span style:width="{hpPct}%"></span></div>
        <div class="muted small">{fmt(Math.max(0, wild.hp))} / {fmt(wild.maxHp)} HP
          {#if secondsLeft !== null} · ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}{/if}
        </div>
      </div>
    </div>

    <button class="primary attack" onclick={() => game.click()}>
      Attack <span class="muted">(+{game.clickDmg.toFixed(1)})</span>
    </button>

    <div class="row muted small">
      <span>Party DPS: <b>{game.dps.toFixed(1)}</b></span>
      {#if wild.kind === 'wild'}
        <span>· Route progress: <b>{Math.min(kills, game.route.killsToClear)} / {game.route.killsToClear}</b></span>
      {:else}
        <button class="small" onclick={() => game.flee()}>Retreat</button>
      {/if}
    </div>
  {/if}
</div>

<div class="panel">
  <h3>Bosses</h3>
  <div class="row">
    {#each game.region.alphas as a}
      {@const unlocked = isUnlocked(game.save, a.unlock)}
      {@const done = game.save.progress.alphas.includes(a.id)}
      <button disabled={!unlocked || game.inBossFight} onclick={() => game.startAlpha(a.id)}
        title={unlocked ? '' : describeRequirement(a.unlock)}>
        Alpha {palById(a.palId).name} Lv {a.level}{done ? ' ✓' : ''}
      </button>
    {/each}
    <button class:primary={towerUnlocked && !towerDone}
      disabled={!towerUnlocked || game.inBossFight} onclick={() => game.startTower(tower.id)}
      title={towerUnlocked ? '' : describeRequirement(tower.unlock)}>
      {tower.boss}{towerDone ? ' ✓' : ''}
    </button>
  </div>
</div>

<div class="panel log">
  <h3>Log</h3>
  {#each game.log as line}<div>{line}</div>{/each}
</div>

<style>
  .panel + .panel { margin-top: 1rem; }
  .regions { margin-bottom: 0.6rem; }
  .regions button.active { border-color: var(--accent); color: var(--accent); }
  .routes { display: flex; flex-direction: column; gap: 0.25rem; }
  .routes button { display: flex; justify-content: space-between; text-align: left; }
  .routes button.active { border-color: var(--accent); color: var(--accent); }
  .routes button.cleared:not(.active) { color: var(--ok); }
  .name { font-size: 1.15rem; font-weight: 600; }
  .tag { font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: var(--danger); color: #fff; margin-right: 0.3rem; vertical-align: middle; }
  .tag.lucky { background: var(--accent); color: #111; }
  .bar.hp { margin: 0.35rem 0; }
  .bar.hp > span { background: var(--danger); }
  .attack { width: 100%; padding: 0.9rem; font-size: 1.1rem; margin: 0.75rem 0 0.5rem; user-select: none; }
  .small { font-size: 0.85rem; }
  .log { font-size: 0.85rem; color: var(--muted); }
  .log div:first-of-type { color: var(--text); }
</style>
