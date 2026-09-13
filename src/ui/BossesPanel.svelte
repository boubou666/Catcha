<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { ALPHA_TIME_LIMIT_SEC } from '../data/regions';
  import { catchPreview } from '../engine/catch';
  import { ui } from '../state/ui.svelte';
  import { spawnTable } from '../engine/arenafilter';
  import { catchText, pct } from './catchText';
  import { describeRequirement, isUnlocked } from '../engine/progress';
  import { dungeonsOf } from '../data/dungeons';
  import { bossName, dungeonClears, dungeonUnlocked } from '../engine/dungeon';
  import { RAIDS, ALTAR } from '../data/raids';
  import { raidWins, summonBlocker, type SummonBlock } from '../engine/raid';
  import { countOf } from '../engine/inventory';
  import { itemName } from '../data/items';
  import ItemIcon from './ItemIcon.svelte';
  import { ELEMENTS } from '../data/types';
  import { BOSS_KIND_LABEL, BOSS_STATUS_LABEL, DEFAULT_BOSS_FILTER, filterBosses, isBossFiltering, type BossFilter, type BossRow } from '../engine/bossfilter';

  const tower = $derived(game.region.tower);
  const hasAltar = $derived((game.save.base.structures[ALTAR] ?? 0) > 0);
  const RAID_BLOCK: Record<SummonBlock, string> = { 'no-altar': 'Build the Summoning Altar', 'locked': '', 'no-slab': 'Craft a slab first' };
  const towerUnlocked = $derived(isUnlocked(game.save, tower.unlock));
  const towerDone = $derived(game.save.progress.towers.includes(tower.id));

  let filter = $state<BossFilter>({ ...DEFAULT_BOSS_FILTER });
  let open = $state(false);
  const filtering = $derived(isBossFiltering(filter));
  const rows = $derived(filterBosses(game.save, filter));
  const total = $derived(filterBosses(game.save, DEFAULT_BOSS_FILTER).length);
  const grouped = $derived.by(() => {
    const m = new Map<string, BossRow[]>();
    for (const r of rows) m.set(r.regionName, [...(m.get(r.regionName) ?? []), r]);
    return [...m.entries()];
  });
  const clear = () => { filter = { ...DEFAULT_BOSS_FILTER }; };
  const ICON: Record<BossRow['kind'], string> = { alpha: '⚔', tower: '🏰', realm: '🗝', raid: '🔮' };
  const canStart = (b: BossRow) => !game.inBossFight && (
    b.kind === 'alpha' ? b.status !== 'locked' : b.kind === 'tower' ? b.status !== 'locked' : b.kind === 'realm' ? game.canEnter(b.id) : game.canSummon(b.id));
  function start(b: BossRow) {
    if (b.kind === 'alpha') game.startAlpha(b.id);
    else if (b.kind === 'tower') game.startTower(b.id);
    else if (b.kind === 'realm') game.enterDungeon(b.id);
    else game.summonRaid(b.id);
  }
  const hint = (b: BossRow) => b.kind === 'raid' ? (summonBlocker(game.save, b.id) === 'no-altar' ? 'Build the Summoning Altar' : summonBlocker(game.save, b.id) === 'no-slab' ? 'Craft a slab first' : '') : '';
</script>

<div class="panel">
  <div class="row head">
    <h3 class="grow">{filtering ? `Bosses — ${rows.length} of ${total}` : 'Bosses'}</h3>
    <input type="search" placeholder="Search bosses…" bind:value={filter.query} aria-label="Search bosses" />
    <button class="small" class:active={open || filtering} onclick={() => (open = !open)} aria-expanded={open}>Filters{filtering ? ' •' : ''}</button>
  </div>
  {#if open}
    <div class="filters">
      <select bind:value={filter.kind} aria-label="Boss kind">
        <option value="any">Any kind</option>
        {#each Object.entries(BOSS_KIND_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
      </select>
      <select bind:value={filter.status} aria-label="Boss status">
        {#each Object.entries(BOSS_STATUS_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
      </select>
      <select bind:value={filter.element} aria-label="Boss element">
        <option value="any">Any element</option>
        {#each ELEMENTS as e}<option value={e}>{e}</option>{/each}
      </select>
      {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
    </div>
  {/if}
  {#if filtering}
    {#if rows.length === 0}<p class="muted small">No boss matches. <button class="small" onclick={clear}>Clear</button></p>{/if}
    {#each grouped as [regionName, list] (regionName)}
      <div class="muted small region-title">{regionName}</div>
      <div class="found">
        {#each list as b (b.kind + b.id)}
          <button class="found-btn" class:beaten={b.status === 'beaten'} class:primary={b.status === 'ready' && b.wins === 0 && canStart(b)} disabled={!canStart(b)} onclick={() => start(b)} title={hint(b)}>
            <span>{ICON[b.kind]} {b.name}</span>
            <span class="muted">Lv {b.level}{b.status === 'beaten' ? (b.kind === 'realm' || b.kind === 'raid' ? ` · ×${b.wins}` : ' ✓') : b.status === 'locked' ? ' 🔒' : ''}</span>
          </button>
        {/each}
      </div>
    {/each}
  {:else}
  <div class="row">
    {#each game.region.alphas as a}
      {@const unlocked = isUnlocked(game.save, a.unlock)}
      {@const done = game.save.progress.alphas.includes(a.id)}
      {@const pv = catchPreview(game.save, a.palId, false, true)}
      <button disabled={!unlocked || game.inBossFight} onclick={() => game.startAlpha(a.id)}
        title={unlocked ? `${ALPHA_TIME_LIMIT_SEC / 60} minutes to win. ${a.reward.gold.toLocaleString()} gold${a.reward.effigies ? `, ${a.reward.effigies} Effigies` : ''} the first time. Catch: ${catchText(pv)}.` : describeRequirement(a.unlock)}>
        Alpha {palById(a.palId).name} Lv {a.level}{done ? ' ✓' : ''}{#if unlocked} <span class="odds" class:no={!pv.throws}>🎯 {pv.throws ? `${pct(pv.chance)}` : '—'}</span>{/if}
      </button>
    {/each}
    <button class:primary={towerUnlocked && !towerDone}
      disabled={!towerUnlocked || game.inBossFight} onclick={() => game.startTower(tower.id)}
      title={towerUnlocked ? `Tower boss — a human and their Pal, so nothing to catch. Clears the tower${towerDone ? ' (already cleared)' : ''}.` : describeRequirement(tower.unlock)}>
      {tower.boss}{towerDone ? ' ✓' : ''}{#if towerUnlocked} <span class="odds no">🎯 no catch</span>{/if}
    </button>
  </div>
  {#if hasAltar}
    <div class="row realm-row">
      {#each RAIDS as r (r.id)}
        {@const block = summonBlocker(game.save, r.id)}
        {@const wins = raidWins(game.save, r.id)}
        {@const slabs = countOf(game.save, r.slabItemId)}
        <button class="raid-btn" class:primary={!block && wins === 0} disabled={!game.canSummon(r.id)} onclick={() => game.summonRaid(r.id)}
          title={block === 'locked' ? describeRequirement(r.unlock) : block ? RAID_BLOCK[block] : `${(r.hp / 1000).toLocaleString()}k HP in ${r.timeLimitSec / 60} minutes. Win: ${r.reward.gold.toLocaleString()} gold, loot, and a ${r.name} egg that inherits passives from your party (${pct(r.luckyChance)} Lucky).`}>
          🔮 {r.name} <span class="muted">Lv {r.level} · {slabs} <ItemIcon id={r.slabItemId} size={14} /> {itemName(r.slabItemId)}{slabs === 1 ? '' : 's'}{wins ? ` · won ×${wins}` : ''}</span>{#if block !== 'locked'} <span class="odds egg" title="No sphere: winning gives a {r.name} egg, {pct(r.luckyChance)} Lucky">🥚 egg · ✨ {pct(r.luckyChance)}</span>{/if}
        </button>
      {/each}
    </div>
  {/if}
  {#each dungeonsOf(game.region.id) as d (d.id)}
    {@const unlocked = dungeonUnlocked(game.save, d.id)}
    {@const clears = dungeonClears(game.save, d.id)}
    {@const pv = catchPreview(game.save, d.boss.palId)}
    <div class="row realm-row">
      <button class="realm-btn" class:primary={unlocked && clears === 0} disabled={!game.canEnter(d.id)} onclick={() => game.enterDungeon(d.id)}
        title={unlocked ? `${d.waves} waves of Lv ${d.level} Pals, then ${bossName(d.id)} — ${d.timeLimitSec / 60} min. Waves and the guardian can be caught at normal odds. Waves: ${spawnTable(game.save, d.pool).map((r) => `${r.name} ${r.catch.throws ? `${pct(r.catch.chance)}` : '—'}`).join(', ')}. Guardian ${bossName(d.id)}: ${catchText(pv)}.` : describeRequirement(d.unlock)}>
        🗝 {d.name} <span class="muted">Lv {d.level}{clears ? ` · cleared ×${clears}` : ''}</span>{#if unlocked} <span class="odds" class:no={!pv.throws}>🎯 {bossName(d.id)} {pv.throws ? `${pct(pv.chance)}` : '—'}</span>{/if}
      </button>
    </div>
  {/each}
  {/if}
</div>

<style>
  .raid-btn { text-align: left; }
  .odds { font-size: 0.75rem; margin-left: 0.25rem; }
  .odds.egg { color: var(--accent); }
  .realm-row { margin-top: 0.5rem; }
  .realm-btn { text-align: left; }
  .head { margin-bottom: 0.4rem; }
  .head h3 { margin: 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .small { font-size: 0.85rem; }
  input[type='search'] { min-width: 7rem; flex: 1; max-width: 12rem; }
  button.active { border-color: var(--accent); color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: 0 0 0.5rem; padding: 0.4rem; background: var(--panel-2); border-radius: var(--radius); }
  .filters select { font-size: 0.85rem; }
  .region-title { margin: 0.5rem 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .found { display: flex; flex-direction: column; gap: 0.25rem; }
  .found-btn { display: flex; justify-content: space-between; text-align: left; }
  .found-btn { border-radius: var(--radius-sm); box-shadow: none; }
  .found-btn.beaten:not(.primary) { color: var(--ok); }
</style>
