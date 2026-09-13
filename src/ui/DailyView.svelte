<script lang="ts">
  import { t as tr } from '../i18n/index.svelte';
  import { game } from '../state/game.svelte';
  import { routeById } from '../data/regions';
  import { itemName } from '../data/items';
  import { bonusReady, describeQuest, msUntilRollover, progressTier, questDone, questProgress, BONUS_EFFIGIES, DEFAULT_QUEST_FILTER, filterHistory, filterQuests, historySummary, isQuestFiltering, QUEST_KIND_LABEL, QUEST_STATUS_LABEL, type QuestFilter } from '../engine/daily';
  import { formatDuration } from './format';

  const save = $derived(game.save);
  const daily = $derived(save.daily);
  const tier = $derived(progressTier(save));

  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });
  const mode = $derived(save.settings.dailyReset ?? 'utc');
  const untilReset = $derived(formatDuration(msUntilRollover(now, mode)));
  const claimedCount = $derived(daily ? daily.quests.filter((q) => q.claimed).length : 0);
  const fmt = (n: number) => n.toLocaleString();

  let filter = $state<QuestFilter>({ ...DEFAULT_QUEST_FILTER });
  let open = $state(false);
  const routeName = (id: string) => routeById(id).name;
  const shown = $derived(filterQuests(save, filter, routeName));
  const filtering = $derived(isQuestFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_QUEST_FILTER }; };
  const history = $derived(filterHistory(save, filter, routeName));
  const summary = $derived(historySummary(save));
  let showHistory = $state(true);
  const fmtDate = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const pct = (n: number, d: number) => Math.round((n / d) * 100);
</script>

<div class="row">
  <h2 class="grow">{tr("Daily Quests")} <span class="muted">{claimedCount} / {daily?.quests.length ?? 0}</span></h2>
  <span class="muted small">{tr("Resets in {eta} ({mode} midnight · Settings) · tier {tier}", { eta: untilReset, mode: mode === 'utc' ? 'UTC' : tr('local'), tier })}</span>
</div>
<p class="muted small">Three quests a day, scaled to how far you've come. Progress counts from the moment the quest appeared; unclaimed quests vanish at reset.</p>

{#if daily}
  <div class="row">
    <input type="search" placeholder={tr("Search quests…")} bind:value={filter.query} aria-label={tr("Search quests")} />
    <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>{tr("Filters")}{filtering ? ' •' : ''}</button>
    {#if filtering}<span class="muted small">{shown.length} of {daily.quests.length}</span>{/if}
  </div>
  {#if open}
    <div class="filters">
      <select bind:value={filter.status} aria-label={tr("Status")}>
        {#each Object.entries(QUEST_STATUS_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
      </select>
      <select bind:value={filter.kind} aria-label={tr("Kind")}>
        <option value="any">{tr("Any kind")}</option>
        {#each Object.entries(QUEST_KIND_LABEL) as [k, label]}<option value={k}>{tr(label)}</option>{/each}
      </select>
      {#if filtering}<button class="small" onclick={clear}>{tr("Clear")}</button>{/if}
    </div>
  {/if}
  {#if shown.length === 0}
    <p class="muted">{tr("No quest matches.")} <button class="small" onclick={clear}>{tr("Clear filters")}</button></p>
  {/if}
  <div class="list">
    {#each shown as q (q.id)}
      {@const value = questProgress(save, q)}
      {@const done = questDone(save, q)}
      <div class="quest" class:done={q.claimed} class:ready={done && !q.claimed}>
        <div class="row">
          <b class="grow">{describeQuest(q, (id) => routeById(id).name)}</b>
          {#if q.claimed}<span class="claimed">{tr("✓ claimed")}</span>
          {:else}<button class="small" class:primary={done} disabled={!done} onclick={() => game.claimQuest(q.id)}>{done ? 'Claim' : `${fmt(value)} / ${fmt(q.target)}`}</button>{/if}
        </div>
        <div class="bar"><span style:width="{(value / q.target) * 100}%"></span></div>
        <div class="muted small">{tr("Reward:")} {fmt(q.reward.gold)} {tr("gold")}{Object.entries(q.reward.items).map(([id, n]) => `, ${n} ${itemName(id)}`).join('')}</div>
      </div>
    {/each}
  </div>

  <div class="bonus row" class:ready={bonusReady(save)}>
    <span class="grow">{tr("Daily bonus — claim all three for")} <b>+{BONUS_EFFIGIES} {tr("Effigy")}</b> <span class="muted">{tr("(permanent capture power)")}</span></span>
    {#if daily.bonusClaimed}<span class="claimed">{tr("✓ claimed")}</span>
    {:else}<button class="small" class:primary={bonusReady(save)} disabled={!bonusReady(save)} onclick={() => game.claimBonus()}>{tr("Claim")}</button>{/if}
  </div>
{:else}
  <p class="muted">{tr("Quests appear once the game has run for a second.")}</p>
{/if}

<section class="history">
  <div class="row">
    <h3 class="grow">{tr("History")} <span class="muted">{save.dailyHistory.length} {tr("day")}{save.dailyHistory.length === 1 ? '' : 's'}</span></h3>
    {#if save.dailyHistory.length}<button class="small" onclick={() => (showHistory = !showHistory)}>{showHistory ? 'Hide' : 'Show'}</button>{/if}
  </div>
  <div class="summary row">
    <span>{tr("🔥 Streak")} <b>{summary.streak}</b> {tr("day")}{summary.streak === 1 ? '' : 's'}</span>
    <span>{tr("Quests claimed")} <b>{summary.claimed}</b> / {summary.total}{#if summary.total} <span class="muted">({pct(summary.claimed, summary.total)}%)</span>{/if}</span>
    <span>{tr("Bonuses")} <b>{summary.bonuses}</b> / {summary.days}</span>
    <span>{tr("Gold from quests")} <b>{fmt(summary.gold)}</b></span>
  </div>
  <p class="muted small">A streak counts consecutive days with all three quests claimed. The last 90 days are kept; the search and filters above apply here too (missed = not claimed before reset).</p>
  {#if save.dailyHistory.length === 0}
    <p class="muted">{tr("Nothing yet — past days appear here after the first reset.")}</p>
  {:else if showHistory}
    {#if history.length === 0}
      <p class="muted">{tr("No past quest matches.")} <button class="small" onclick={clear}>{tr("Clear filters")}</button></p>
    {/if}
    <div class="days">
      {#each history as day (day.date)}
        <div class="day" class:full={day.bonusClaimed}>
          <div class="row">
            <b class="grow">{fmtDate(day.date)}</b>
            <span class="muted small">{day.quests.filter((q) => q.claimed).length} / {day.quests.length} {tr("claimed")}{day.bonusClaimed ? ' · bonus ✓' : ''}</span>
          </div>
          {#each day.quests as q}
            <div class="past row" class:claimed={q.claimed}>
              <span class="mark">{q.claimed ? '✓' : '✗'}</span>
              <span class="grow">{describeQuest({ ...q, id: '', baseline: 0 }, routeName)}</span>
              <span class="muted small">{q.claimed ? `+${fmt(q.reward.gold)} gold` : `${fmt(q.progress)} / ${fmt(q.target)}`}</span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .small { font-size: 0.8rem; }
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .quest { border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); padding: 0.6rem; background: var(--panel-2); display: flex; flex-direction: column; gap: 0.35rem; }
  .quest.ready { border-color: var(--accent); }
  .quest.done { opacity: 0.6; border-color: var(--ok); }
  .bar { height: 5px; }
  .quest.done .bar > span { background: var(--ok); }
  .claimed { color: var(--ok); font-size: 0.85rem; }
  .bonus { margin-top: 1rem; padding: 0.6rem; border: 2px dashed var(--border-soft); border-radius: var(--radius-sm); }
  .bonus.ready { border-style: solid; border-color: var(--accent); }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0.5rem 0; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .list { margin-top: 0.5rem; }
  .history { margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1.5px solid var(--border-soft); }
  .history h3 { margin: 0; }
  .summary { gap: 1rem; margin: 0.4rem 0; font-size: 0.9rem; }
  .days { display: flex; flex-direction: column; gap: 0.5rem; max-height: 50vh; overflow-y: auto; }
  .day { border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); padding: 0.5rem 0.6rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .day.full { border-color: var(--ok); }
  .past { font-size: 0.9rem; color: var(--muted); }
  .past.claimed { color: var(--text); }
  .mark { width: 1.1rem; text-align: center; color: var(--danger); }
  .past.claimed .mark { color: var(--ok); }
</style>
