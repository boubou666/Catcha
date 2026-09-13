<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { routeKills } from '../engine/progress';
  import { routeQuota } from '../engine/prestige';
  import { dungeonById } from '../data/dungeons';
  import PalIcon from './PalIcon.svelte';
  import SpawnList from './SpawnList.svelte';
  import { catchPreview, isCatchable } from '../engine/catch';
  import { catchText } from './catchText';
  import { raidById } from '../data/raids';
  import { ui } from '../state/ui.svelte';

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
  const preview = $derived(isCatchable(wild) ? catchPreview(game.save, wild.palId, wild.lucky, wild.kind === 'alpha') : null);
  const catchLine = $derived(preview ? catchText(preview) : '');
  // towers and raids never throw a sphere: say so where the odds would be
  const raid = $derived(wild?.kind === 'raid' && wild.refId ? raidById(wild.refId) : null);
  const noCatchLine = $derived(wild?.kind === 'tower' ? 'not catchable — a tower boss is a human and their Pal' : raid ? `no sphere — win for a ${raid.name} egg (✨ ${Math.round(raid.luckyChance * 100)}% Lucky)` : '');
  const noCatchShort = $derived(wild?.kind === 'tower' ? 'no catch' : raid ? `🥚 ${Math.round(raid.luckyChance * 100)}% ✨` : '');
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(n < 10 ? 1 : 0));
  const showHere = $derived(ui.spawnListOpen);
</script>

<div class="panel arena" class:compact>
  {#if wild && def && compact}
    <!-- phone bar: one line — art, name + HP, and a tall Attack button; a tiny status line below -->
    <div class="crow">
      <PalIcon palId={wild.palId} size={44} lucky={wild.lucky} render />
      <div class="grow info">
        <div class="name">
          {#if wild.kind === 'alpha'}<span class="tag">ALPHA</span>{/if}
          {#if wild.kind === 'tower'}<span class="tag">TOWER</span>{/if}
          {#if wild.kind === 'dungeon' && run && runDef}<span class="tag realm">W{run.wave + 1}/{runDef.waves}</span>{/if}
          {#if wild.kind === 'dungeonBoss'}<span class="tag realm">GUARDIAN</span>{/if}
          {#if wild.kind === 'raid'}<span class="tag raid">RAID</span>{/if}
          {#if wild.lucky}<span class="tag lucky">LUCKY</span>{/if}
          {def.name} <span class="muted">Lv {wild.level}</span>
        </div>
        <div class="bar hp"><span style:width="{hpPct}%"></span></div>
        <div class="muted tiny">
          {fmt(Math.max(0, wild.hp))} / {fmt(wild.maxHp)}{#if secondsLeft !== null} · ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}{/if}
          · DPS <b>{game.dps.toFixed(1)}</b>
          {#if preview}· 🎯 {preview.throws ? `${Math.round(preview.chance * 100)}%` : 'no throw'}{:else if noCatchShort}· {noCatchShort}{/if}
          {#if wild.kind === 'wild'} · {Math.min(kills, routeQuota(game.save, game.route))} / {routeQuota(game.save, game.route)}
          {:else} · <button class="tiny flee" onclick={() => game.flee()}>{run ? 'Leave' : wild.kind === 'raid' ? 'Give up' : 'Retreat'}</button>{/if}
        </div>
      </div>
      <button class="primary attack-c" onclick={() => game.click()} aria-label="Attack">⚔<span class="dmg">+{game.clickDmg.toFixed(1)}</span></button>
    </div>
  {:else if wild && def}
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
        {#if preview}<button class="link catch" class:no={!preview.throws} onclick={() => (ui.requestTab = 'settings')} title="Catch settings">🎯 Catch: {catchLine}</button>
        {:else if noCatchLine}<div class="small catch" class:no={wild.kind === 'tower'} class:egg={!!raid}>{raid ? '🥚' : '🎯'} Catch: {noCatchLine}</div>{/if}
      </div>
    </div>

    <button class="primary attack" onclick={() => game.click()}>
      Attack <span class="muted">(+{game.clickDmg.toFixed(1)})</span>
    </button>

    <div class="row muted small">
      <span>Party DPS: <b>{game.dps.toFixed(1)}</b></span>
      {#if wild.kind === 'wild'}
        <span>· Route progress: <b>{Math.min(kills, routeQuota(game.save, game.route))} / {routeQuota(game.save, game.route)}</b></span>
        {#if !compact}<span class="grow"></span><button class="small" class:active={showHere} onclick={() => (ui.spawnListOpen = !ui.spawnListOpen)} aria-expanded={showHere}>{showHere ? 'Hide' : 'Who lives here?'}</button>{/if}
      {:else}
        <button class="small" onclick={() => game.flee()}>{run ? 'Leave realm' : wild.kind === 'raid' ? 'Give up (slab lost)' : 'Retreat'}</button>
        {#if run && !compact}<span class="grow"></span><button class="small" class:active={showHere} onclick={() => (ui.spawnListOpen = !ui.spawnListOpen)} aria-expanded={showHere}>{showHere ? 'Hide' : 'Who lives here?'}</button>{/if}
      {/if}
    </div>
    {#if showHere && !compact && wild.kind === 'wild'}
      <div class="here"><SpawnList /></div>
    {:else if showHere && !compact && run && runDef}
      <div class="here"><SpawnList spawns={runDef.pool} where="Waves in {runDef.name}:" guardian={runDef.boss.palId} /></div>
    {/if}
  {/if}
</div>

<style>
  .name { font-size: 1.15rem; font-weight: 600; }
  .tag { font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: var(--danger); color: #fff; margin-right: 0.3rem; vertical-align: middle; }
  .tag.lucky { background: var(--accent); color: var(--on-accent); }
  .tag.realm { background: var(--accent-2); }
  .tag.raid { background: #7b2cbf; }
  .bar.hp { margin: 0.35rem 0; }
  .catch { color: var(--accent-2); margin-top: 0.15rem; font-size: 0.85rem; background: none; border: none; padding: 0; clip-path: none; text-align: left; cursor: pointer; font-weight: 700; }
  .catch:hover { text-decoration: underline; background: none; }
  .catch.no { color: var(--muted); }
  .catch.egg { color: var(--accent); cursor: default; }
  .catch.egg:hover { text-decoration: none; }
  .bar.hp > span { background: var(--danger); }
  .attack { width: 100%; padding: 0.9rem; font-size: 1.2rem; font-weight: 900; border-radius: var(--radius); box-shadow: var(--shadow); margin: 0.75rem 0 0.5rem; user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .small { font-size: 0.85rem; }
  .compact { padding: 0.45rem 0.6rem; --c: 8px; }
  .compact .name { font-size: 0.95rem; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .compact .tag { font-size: 0.6rem; padding: 0.05rem 0.3rem; margin-right: 0.2rem; }
  .crow { display: flex; gap: 0.5rem; align-items: center; }
  .info { min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
  .compact .bar.hp { margin: 0; height: 8px; }
  .tiny { font-size: 0.72rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .flee { padding: 0 0.35rem; font-size: 0.7rem; min-height: 0; vertical-align: baseline; }
  .attack-c { flex: 0 0 auto; width: 4.6rem; min-height: 3.4rem; padding: 0.2rem 0.4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; font-size: 1.3rem; line-height: 1; margin: 0; user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .attack-c .dmg { font-size: 0.7rem; font-weight: 800; opacity: 0.8; }
  .here { margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1.5px solid var(--border-soft); }
  button.active { border-color: var(--accent); color: var(--accent); }
</style>
