<script lang="ts">
  import { game } from '../state/game.svelte';
  import { routeById } from '../data/regions';
  import { itemName } from '../data/items';
  import { bonusReady, describeQuest, msUntilRollover, progressTier, questDone, questProgress, BONUS_EFFIGIES } from '../engine/daily';
  import { formatDuration } from './format';

  const save = $derived(game.save);
  const daily = $derived(save.daily);
  const tier = $derived(progressTier(save));

  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });
  const untilReset = $derived(formatDuration(msUntilRollover(now)));
  const claimedCount = $derived(daily ? daily.quests.filter((q) => q.claimed).length : 0);
  const fmt = (n: number) => n.toLocaleString();
</script>

<div class="row">
  <h2 class="grow">Daily Quests <span class="muted">{claimedCount} / {daily?.quests.length ?? 0}</span></h2>
  <span class="muted small">Resets in {untilReset} (UTC midnight) · tier {tier}</span>
</div>
<p class="muted small">Three quests a day, scaled to how far you've come. Progress counts from the moment the quest appeared; unclaimed quests vanish at reset.</p>

{#if daily}
  <div class="list">
    {#each daily.quests as q (q.id)}
      {@const value = questProgress(save, q)}
      {@const done = questDone(save, q)}
      <div class="quest" class:done={q.claimed} class:ready={done && !q.claimed}>
        <div class="row">
          <b class="grow">{describeQuest(q, (id) => routeById(id).name)}</b>
          {#if q.claimed}<span class="claimed">✓ claimed</span>
          {:else}<button class="small" class:primary={done} disabled={!done} onclick={() => game.claimQuest(q.id)}>{done ? 'Claim' : `${fmt(value)} / ${fmt(q.target)}`}</button>{/if}
        </div>
        <div class="bar"><span style:width="{(value / q.target) * 100}%"></span></div>
        <div class="muted small">Reward: {fmt(q.reward.gold)} gold{Object.entries(q.reward.items).map(([id, n]) => `, ${n} ${itemName(id)}`).join('')}</div>
      </div>
    {/each}
  </div>

  <div class="bonus row" class:ready={bonusReady(save)}>
    <span class="grow">Daily bonus — claim all three for <b>+{BONUS_EFFIGIES} Effigy</b> (permanent capture power)</span>
    {#if daily.bonusClaimed}<span class="claimed">✓ claimed</span>
    {:else}<button class="small" class:primary={bonusReady(save)} disabled={!bonusReady(save)} onclick={() => game.claimBonus()}>Claim</button>{/if}
  </div>
{:else}
  <p class="muted">Quests appear once the game has run for a second.</p>
{/if}

<style>
  .small { font-size: 0.8rem; }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .quest { border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem; background: var(--panel-2); display: flex; flex-direction: column; gap: 0.35rem; }
  .quest.ready { border-color: var(--accent); }
  .quest.done { opacity: 0.6; border-color: var(--ok); }
  .bar { height: 5px; }
  .quest.done .bar > span { background: var(--ok); }
  .claimed { color: var(--ok); font-size: 0.85rem; }
  .bonus { margin-top: 1rem; padding: 0.6rem; border: 1px dashed var(--border); border-radius: 8px; }
  .bonus.ready { border-style: solid; border-color: var(--accent); }
</style>
