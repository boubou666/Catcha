<script lang="ts">
  import { game } from '../state/game.svelte';
  import { expToLevel } from '../engine/formulas';
  import { SPHERES } from '../data/spheres';
  import { SPHERE_TIERS } from '../data/types';
  import { achievementPoints } from '../engine/achievements';
  import NotificationCenter from './NotificationCenter.svelte';

  const player = $derived(game.save.player);
  const expPct = $derived((player.exp / expToLevel(player.level + 1)) * 100);
  const spheres = $derived(
    SPHERE_TIERS
      .map((t) => ({ tier: t, n: game.save.inventory[SPHERES[t].itemId] ?? 0 }))
      .filter((s) => s.n > 0),
  );

</script>

<header class="panel row">
  <div>
    <h1>Catcha</h1>
    <div class="muted">{game.region.name}</div>
  </div>

  <div class="stat">
    <div class="label">Level {player.level}</div>
    <div class="bar exp"><span style:width="{expPct}%"></span></div>
    <div class="muted small">{Math.floor(player.exp)} / {expToLevel(player.level + 1)} exp</div>
  </div>

  <div class="stat">
    <div class="label">💰 {Math.floor(player.gold).toLocaleString()}</div>
    <div class="muted small">Effigies: {player.effigies} · Tech pts: {player.techPoints} · 🏆 {achievementPoints(game.save)}{#if game.save.prestige.relics > 0 || game.save.prestige.ascensions > 0}&nbsp;· 🏺 {game.save.prestige.relics}{/if}</div>
  </div>

  <div class="stat grow">
    <div class="label">Spheres</div>
    <div class="muted small">
      {#if spheres.length === 0}none — visit the Merchant{/if}
      {#each spheres as s}<span class="chip">{SPHERES[s.tier].name} ×{s.n}</span>{/each}
    </div>
  </div>

  <div class="row">
    <NotificationCenter />
    <button class="small" onclick={() => game.persist()}>Save</button>
  </div>
</header>

<style>
  header { gap: 1.5rem; }
  @media (max-width: 800px) { header { gap: 0.6rem 1rem; } .stat { min-width: 0; flex: 1 1 40%; } }
  h1 { font-size: 1.4rem; color: var(--accent); }
  .stat { min-width: 150px; }
  .label { font-weight: 600; }
  .small { font-size: 0.8rem; }
  .chip { display: inline-block; margin-right: 0.4rem; }
</style>
