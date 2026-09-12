<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { routeKills } from '../engine/progress';
  import { routeQuota } from '../engine/prestige';
  import { dungeonById } from '../data/dungeons';
  import PalIcon from './PalIcon.svelte';
  import SpawnList from './SpawnList.svelte';

  /** compact: the sticky mobile bar (smaller art, one-line stats) */
  let { compact = false }: { compact?: boolean } = $props();

  const wild = $derived(game.wild);
  const def = $derived(wild ? palById(wild.palId) : null);
  const hpPct = $derived(wild ? Math.max(0, (wild.hp / wild.maxHp) * 100) : 0);
  const kills = $derived(routeKills(game.save, game.route.id));
  const run = $derived(game.run);
  const runDef = $derived(run ? dungeonById(run.id) : null);

  // ticking clock for timed fights
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 500);
    return () => clearInterval(id);
  });
  const secondsLeft = $derived(wild?.deadlineAt ? Math.max(0, Math.ceil((wild.deadlineAt - now) / 1000)) : null);
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(n < 10 ? 1 : 0));
  let showHere = $state(false);
</script>

<div class="panel arena" class:compact>
  {#if wild && def}
    <div class="row">
      <PalIcon palId={wild.palId} size={compact ? 64 : 110} lucky={wild.lucky} render />
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
        <span>· Route progress: <b>{Math.min(kills, routeQuota(game.save, game.route))} / {routeQuota(game.save, game.route)}</b></span>
        {#if !compact}<span class="grow"></span><button class="small" class:active={showHere} onclick={() => (showHere = !showHere)} aria-expanded={showHere}>{showHere ? 'Hide' : 'Who lives here?'}</button>{/if}
      {:else}
        <button class="small" onclick={() => game.flee()}>{run ? 'Leave realm' : wild.kind === 'raid' ? 'Give up (slab lost)' : 'Retreat'}</button>
      {/if}
    </div>
    {#if showHere && !compact && wild.kind === 'wild'}
      <div class="here"><SpawnList /></div>
    {/if}
  {/if}
</div>

<style>
  .name { font-size: 1.15rem; font-weight: 600; }
  .tag { font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: var(--danger); color: #fff; margin-right: 0.3rem; vertical-align: middle; }
  .tag.lucky { background: var(--accent); color: #111; }
  .tag.realm { background: var(--accent-2); }
  .tag.raid { background: #7b2cbf; }
  .bar.hp { margin: 0.35rem 0; }
  .bar.hp > span { background: var(--danger); }
  .attack { width: 100%; padding: 0.9rem; font-size: 1.1rem; margin: 0.75rem 0 0.5rem; user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .small { font-size: 0.85rem; }
  .compact { padding: 0.6rem 0.75rem; }
  .compact .name { font-size: 1rem; }
  .compact .attack { padding: 0.7rem; margin: 0.5rem 0 0.35rem; }
  .here { margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid var(--border); }
  button.active { border-color: var(--accent); color: var(--accent); }
</style>
