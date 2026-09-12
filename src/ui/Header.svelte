<script lang="ts">
  import { game } from '../state/game.svelte';
  import { expToLevel } from '../engine/formulas';
  import { SPHERES } from '../data/spheres';
  import { SPHERE_TIERS } from '../data/types';

  const player = $derived(game.save.player);
  const expPct = $derived((player.exp / expToLevel(player.level + 1)) * 100);
  const spheres = $derived(
    SPHERE_TIERS
      .map((t) => ({ tier: t, n: game.save.inventory[SPHERES[t].itemId] ?? 0 }))
      .filter((s) => s.n > 0),
  );

  function doExport() {
    const str = game.exportString();
    navigator.clipboard?.writeText(str).catch(() => {});
    window.prompt('Save string (copied to clipboard):', str);
  }
  function doImport() {
    const str = window.prompt('Paste save string:');
    if (str && !game.importString(str)) window.alert('Could not read that save.');
  }
  function doReset() {
    if (window.confirm('Delete your save and start over?')) game.reset();
  }
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
    <div class="label">🪙 {Math.floor(player.gold).toLocaleString()}</div>
    <div class="muted small">Effigies: {player.effigies} · Tech pts: {player.techPoints}</div>
  </div>

  <div class="stat grow">
    <div class="label">Spheres</div>
    <div class="muted small">
      {#if spheres.length === 0}none — visit the Merchant{/if}
      {#each spheres as s}<span class="chip">{SPHERES[s.tier].name} ×{s.n}</span>{/each}
    </div>
  </div>

  <div class="row">
    <button class="small" onclick={() => game.persist()}>Save</button>
    <button class="small" onclick={doExport}>Export</button>
    <button class="small" onclick={doImport}>Import</button>
    <button class="small danger" onclick={doReset}>Reset</button>
  </div>
</header>

<style>
  header { gap: 1.5rem; }
  h1 { font-size: 1.4rem; color: var(--accent); }
  .stat { min-width: 150px; }
  .label { font-weight: 600; }
  .small { font-size: 0.8rem; }
  .chip { display: inline-block; margin-right: 0.4rem; }
</style>
