<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { describeRequirement, isUnlocked } from '../engine/progress';
  import { dungeonsOf } from '../data/dungeons';
  import { bossName, dungeonClears, dungeonUnlocked } from '../engine/dungeon';
  import { RAIDS, ALTAR } from '../data/raids';
  import { raidWins, summonBlocker, type SummonBlock } from '../engine/raid';
  import { countOf } from '../engine/inventory';
  import { itemName } from '../data/items';

  const tower = $derived(game.region.tower);
  const hasAltar = $derived((game.save.base.structures[ALTAR] ?? 0) > 0);
  const RAID_BLOCK: Record<SummonBlock, string> = { 'no-altar': 'Build the Summoning Altar', 'locked': '', 'no-slab': 'Craft a slab first' };
  const towerUnlocked = $derived(isUnlocked(game.save, tower.unlock));
  const towerDone = $derived(game.save.progress.towers.includes(tower.id));
</script>

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

<style>
  .raid-btn { text-align: left; }
  .realm-row { margin-top: 0.5rem; }
  .realm-btn { text-align: left; }
</style>
