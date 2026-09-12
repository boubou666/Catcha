<script lang="ts">
  import { game } from '../state/game.svelte';
  import { SPHERES } from '../data/spheres';
  import { SPHERE_TIERS, type SpherePolicy } from '../data/types';
  import { describeRequirement } from '../engine/progress';

  const gold = $derived(game.save.player.gold);
  const policies: { value: SpherePolicy; label: string }[] = [
    { value: 'none', label: "Don't catch" },
    ...SPHERE_TIERS.map((t) => ({ value: t, label: SPHERES[t].name })),
  ];
</script>

<h2>Wandering Merchant</h2>
<p class="muted">Spheres for gold. Higher tiers unlock as you progress; later they'll be craftable at your base.</p>

<div class="list">
  {#each SPHERE_TIERS as tier}
    {@const s = SPHERES[tier]}
    {@const available = game.sphereAvailable(tier)}
    {#if s.price !== null}
      <div class="row item">
        <div class="grow">
          <b>{s.name}</b> <span class="muted">×{s.mult} catch rate</span>
          {#if !available}<div class="muted small">{describeRequirement(s.unlock)}</div>{/if}
        </div>
        <span class="muted">{s.price} 🪙</span>
        <button class="small" disabled={!available || gold < s.price} onclick={() => game.buySphere(tier, 1)}>Buy 1</button>
        <button class="small" disabled={!available || gold < s.price * 10} onclick={() => game.buySphere(tier, 10)}>Buy 10</button>
      </div>
    {/if}
  {/each}
</div>

<h2 class="settings">Catch settings</h2>
<div class="row">
  <label class="grow">New species
    <select value={game.save.settings.sphereForNew} onchange={(e) => game.setSpherePolicy('new', e.currentTarget.value as SpherePolicy)}>
      {#each policies as p}<option value={p.value}>{p.label}</option>{/each}
    </select>
  </label>
  <label class="grow">Already caught
    <select value={game.save.settings.sphereForDupe} onchange={(e) => game.setSpherePolicy('dupe', e.currentTarget.value as SpherePolicy)}>
      {#each policies as p}<option value={p.value}>{p.label}</option>{/each}
    </select>
  </label>
</div>
<p class="muted small">If the chosen sphere is out of stock, the next lower tier is thrown instead.</p>

<style>
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .item { padding: 0.5rem; border: 1px solid var(--border); border-radius: 8px; }
  .settings { margin-top: 1.5rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; }
  .small { font-size: 0.8rem; }
</style>
