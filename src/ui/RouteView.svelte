<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { alphaById, towerById } from '../data/regions';
  import { describeRequirement, isUnlocked, routeCleared, routeKills } from '../engine/progress';
  import PalIcon from './PalIcon.svelte';
  import { dungeonsOf, dungeonById } from '../data/dungeons';
  import { bossName, dungeonClears, dungeonUnlocked } from '../engine/dungeon';
  import { RAIDS, ALTAR } from '../data/raids';
  import { raidWins, summonBlocker, type SummonBlock } from '../engine/raid';
  import { countOf } from '../engine/inventory';
  import { itemName } from '../data/items';

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
  const run = $derived(game.run);
  const hasAltar = $derived((game.save.base.structures[ALTAR] ?? 0) > 0);
  const RAID_BLOCK: Record<SummonBlock, string> = { 'no-altar': 'Build the Summoning Altar', 'locked': '', 'no-slab': 'Craft a slab first' };
  const runDef = $derived(run ? dungeonById(run.id) : null);
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
          {#if wild.kind === 'dungeon' && run && runDef}<span class="tag realm">WAVE {run.wave + 1}/{runDef.waves}</span>{/if}
          {#if wild.kind === 'dungeonBoss'}<span class="tag realm">GUARDIAN</span>{/if}
          {#if wild.kind === 'raid'}<span class="tag raid">RAID</span>{/if}
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
        <button class="small" onclick={() => game.flee()}>{run ? 'Leave realm' : wild.kind === 'raid' ? 'Give up (slab lost)' : 'Retreat'}</button>
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
  {#if hasAltar}
    <div class="row realm-row">
      {#each RAIDS as r (r.id)}
        {@const block = summonBlocker(game.save, r.id)}
        {@const wins = raidWins(game.save, r.id)}
        {@const slabs = countOf(game.save, r.slabItemId)}
        <button class="raid-btn" class:primary={!block && wins === 0} disabled={!game.canSummon(r.id)} onclick={() => game.summonRaid(r.id)}
          title={block === 'locked' ? describeRequirement(r.unlock) : block ? RAID_BLOCK[block] : `${(r.hp / 1000).toLocaleString()}k HP in ${r.timeLimitSec / 60} minutes. Win: ${r.reward.gold.toLocaleString()} gold, loot, and a ${r.name} egg that inherits passives from your party (${Math.round(r.luckyChance * 100)}% Lucky).`}>
          🔮 {r.name} <span class="muted">Lv {r.level} · {slabs} {itemName(r.slabItemId)}{slabs === 1 ? '' : 's'}{wins ? ` · won ×${wins}` : ''}</span>
        </button>
      {/each}
    </div>
  {/if}
  {#each dungeonsOf(game.region.id) as d (d.id)}
    {@const unlocked = dungeonUnlocked(game.save, d.id)}
    {@const clears = dungeonClears(game.save, d.id)}
    <div class="row realm-row">
      <button class="realm-btn" class:primary={unlocked && clears === 0} disabled={!game.canEnter(d.id)} onclick={() => game.enterDungeon(d.id)}
        title={unlocked ? `${d.waves} waves of Lv ${d.level} Pals, then ${bossName(d.id)} — ${d.timeLimitSec / 60} min. Waves and the guardian can be caught.` : describeRequirement(d.unlock)}>
        🗝 {d.name} <span class="muted">Lv {d.level}{clears ? ` · cleared ×${clears}` : ''}</span>
      </button>
    </div>
  {/each}
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
  .tag.realm { background: var(--accent-2); }
  .tag.raid { background: #7b2cbf; }
  .raid-btn { text-align: left; }
  .realm-row { margin-top: 0.5rem; }
  .realm-btn { text-align: left; }
  .bar.hp { margin: 0.35rem 0; }
  .bar.hp > span { background: var(--danger); }
  .attack { width: 100%; padding: 0.9rem; font-size: 1.1rem; margin: 0.75rem 0 0.5rem; user-select: none; }
  .small { font-size: 0.85rem; }
  .log { font-size: 0.85rem; color: var(--muted); }
  .log div:first-of-type { color: var(--text); }
</style>
