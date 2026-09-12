<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { itemName } from '../data/items';
  import { EXPEDITIONS, EXPEDITION_POST, expeditionById } from '../data/expeditions';
  import { available, bestMembers, DEFAULT_DESTINATION_FILTER, expeditionSlots, filterDestinations, filterReports, sendBlocker, successChance, type DestinationFilter, type SendBlock } from '../engine/expedition';
  import { DEFAULT_FILTER, filterBox, isFiltering, type BoxFilter } from '../engine/boxfilter';
  import BoxFilterBar from './BoxFilterBar.svelte';
  import { describeRequirement, isUnlocked } from '../engine/progress';
  import { formatDuration } from './format';
  import PalIcon from './PalIcon.svelte';
  import PassiveChips from './PassiveChips.svelte';

  const save = $derived(game.save);
  const slots = $derived(expeditionSlots(save));
  const idle = $derived(available(save));

  // destinations + reports share one search; the member list has the usual Box filter bar
  let dest = $state<DestinationFilter>({ ...DEFAULT_DESTINATION_FILTER });
  const destinations = $derived(filterDestinations(save, dest));
  const reports = $derived(filterReports(save, dest.query));
  const PICK_DEFAULTS: BoxFilter = { ...DEFAULT_FILTER, status: 'idle', sort: 'attack' };
  let filter = $state<BoxFilter>({ ...PICK_DEFAULTS });
  const idleSet = $derived(new Set(idle.map((p) => p.uid)));
  const candidates = $derived(filterBox(save, filter).filter((p) => idleSet.has(p.uid)));
  const filtering = $derived(isFiltering(filter, PICK_DEFAULTS));
  const clear = () => { filter = { ...PICK_DEFAULTS, sort: filter.sort }; };

  let defId = $state(EXPEDITIONS[0].id);
  let picked = $state<string[]>([]);
  const def = $derived(expeditionById(defId));
  const members = $derived(picked.map((u) => save.box.find((p) => p.uid === u)!).filter(Boolean));
  const chance = $derived(successChance(defId, members));
  const block = $derived(sendBlocker(save, defId, picked));

  const BLOCK: Record<SendBlock, string> = {
    'no-post': 'Build the Expedition Post at your base',
    'locked': 'Not unlocked yet',
    'no-slots': 'All expedition slots are busy',
    'no-members': 'Pick at least one Pal',
    'too-many': 'Too many Pals for this trip',
    'busy': 'One of those Pals is busy',
  };

  function toggle(uid: string) {
    picked = picked.includes(uid) ? picked.filter((u) => u !== uid) : [...picked, uid];
  }
  function sendNow() {
    if (game.sendExpedition(defId, picked)) picked = [];
  }
  function pickBest() {
    picked = bestMembers(candidates, def.size).map((p) => p.uid);
  }
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const lootText = (id: string) => {
    const e = expeditionById(id);
    return [`${e.loot.gold.toLocaleString()} gold`, ...e.loot.items.map((d) => `${itemName(d.itemId)}${d.chance < 1 ? ` (${pct(d.chance)})` : ''}`)].join(', ');
  };
</script>

<h2>Expeditions <span class="muted">{save.base.expeditions.length} / {slots} out</span></h2>

{#if slots === 0}
  <p class="muted">Build the <b>Expedition Post</b> at your base (Base → Structures) to send idle Pals on trips. Each level adds a concurrent expedition.</p>
{/if}

{#if save.base.expeditions.length > 0}
  <section>
    <h3>Underway</h3>
    <div class="list">
      {#each save.base.expeditions as ex (ex.defId + ex.members.join())}
        {@const e = expeditionById(ex.defId)}
        <div class="trip row">
          <div class="grow">
            <b>{e.name}</b>
            <div class="muted small">{ex.members.map((u) => palById(save.box.find((p) => p.uid === u)?.palId ?? 1).name).join(', ')}</div>
          </div>
          <div class="bar trip-bar"><span style:width="{(1 - Math.max(0, ex.remaining) / e.durationSec) * 100}%"></span></div>
          <span class="muted small eta">{formatDuration(Math.max(0, ex.remaining) * 1000)}</span>
        </div>
      {/each}
    </div>
  </section>
{/if}

<section>
  <div class="row">
    <h3 class="grow">Destination <span class="muted">{destinations.length < EXPEDITIONS.length ? `${destinations.length} of ${EXPEDITIONS.length}` : EXPEDITIONS.length}</span></h3>
    <input type="search" placeholder="Search destination, loot…" bind:value={dest.query} aria-label="Search destinations" />
    <label class="chk"><input type="checkbox" bind:checked={dest.hideLocked} /> Hide locked</label>
  </div>
  {#if destinations.length === 0}
    <p class="muted">No destination matches. <button class="small" onclick={() => (dest = { ...DEFAULT_DESTINATION_FILTER })}>Clear</button></p>
  {/if}
  <div class="dests">
    {#each destinations as e (e.id)}
      {@const open = isUnlocked(save, e.unlock)}
      <button class="dest" class:active={e.id === defId} class:locked={!open} onclick={() => (defId = e.id)}
        title={open ? lootText(e.id) : describeRequirement(e.unlock)}>
        <span>{e.name}</span>
        <span class="muted small">Lv {e.level} · {formatDuration(e.durationSec * 1000)} · up to {e.size}{open ? '' : ' · 🔒'}</span>
      </button>
    {/each}
  </div>
  <p class="muted small">Loot: {lootText(defId)}. Each member gains {def.exp.toLocaleString()} exp (half on failure).</p>
</section>

<section>
  <div class="row">
    <h3 class="grow">Party <span class="muted">{picked.length} / {def.size}</span></h3>
    <span class="chance" class:good={chance >= 0.75} class:bad={chance > 0 && chance < 0.4}>Success {pct(chance)}</span>
    <button class="small" disabled={candidates.length === 0} onclick={pickBest} title="Fill the party with the strongest Pals in the list below">Pick best</button>
    {#if picked.length}<button class="small" onclick={() => (picked = [])}>Clear picks</button>{/if}
    <button class="primary small" disabled={!!block} title={block ? BLOCK[block] : ''} onclick={sendNow}>Send</button>
  </div>
  {#if block && picked.length > 0}<div class="warn small">{BLOCK[block]}</div>{/if}
  <p class="muted small">Chance is judged against a full party at Lv {def.level}. Stars and attack passives count. Members are unavailable until they return.</p>
  <BoxFilterBar bind:filter defaults={PICK_DEFAULTS} label="Search idle Pals" hideStatus>
    {#snippet heading()}
      <span class="grow muted small">Idle Pals {filtering ? `${candidates.length} of ${idle.length}` : idle.length}</span>
    {/snippet}
  </BoxFilterBar>
  {#if idle.length > 0 && candidates.length === 0}
    <p class="muted">No Pal matches. <button class="small" onclick={clear}>Clear filters</button></p>
  {/if}
  <div class="list scroll">
    {#each candidates as p (p.uid)}
      {@const on = picked.includes(p.uid)}
      <label class="pick row" class:on>
        <input type="checkbox" checked={on} disabled={!on && picked.length >= def.size} onchange={() => toggle(p.uid)} />
        <PalIcon palId={p.palId} size={32} lucky={p.lucky} />
        <span class="grow"><b>{palById(p.palId).name}</b> <span class="muted">Lv {p.level}{p.stars ? ' ' + '★'.repeat(p.stars) : ''}</span>
          <PassiveChips ids={p.passives} /></span>
      </label>
    {/each}
    {#if idle.length === 0}<p class="muted small">No idle Pals — everyone is in the party, working, breeding or already away.</p>{/if}
  </div>
</section>

{#if save.base.reports.length > 0}
  <section>
    <div class="row">
      <h3 class="grow">Reports</h3>
      <button class="small" onclick={() => game.clearReports()}>Clear</button>
    </div>
    {#if reports.length === 0}<p class="muted small">No report matches the search.</p>{/if}
    <div class="list">
      {#each reports as r (r.at + r.defId)}
        <div class="report row" class:fail={!r.success}>
          <span class="grow"><b>{expeditionById(r.defId).name}</b> — {r.success ? 'success' : 'failed'}</span>
          <span class="muted small">+{r.gold.toLocaleString()} gold{Object.keys(r.items).length ? ', ' + Object.entries(r.items).map(([id, n]) => `${n} ${itemName(id)}`).join(', ') : ''}</span>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  section { margin-top: 1.25rem; }
  .list { display: flex; flex-direction: column; gap: 0.4rem; }
  .scroll { max-height: 40vh; overflow-y: auto; }
  .small { font-size: 0.8rem; }
  .warn { color: var(--accent); }
  .dests { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.4rem; }
  .dest { display: flex; flex-direction: column; align-items: flex-start; text-align: left; gap: 0.1rem; }
  .dest.active { border-color: var(--accent); color: var(--accent); }
  .dest.locked { opacity: 0.55; }
  .chance { font-weight: 600; }
  .chance.good { color: var(--ok); }
  .chance.bad { color: var(--danger); }
  .pick { padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
  .pick.on { border-color: var(--accent); }
  .trip, .report { padding: 0.4rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; }
  .trip-bar { width: 120px; }
  .trip-bar > span { background: var(--accent-2); }
  .eta { min-width: 3.5rem; text-align: right; }
  .report.fail { opacity: 0.7; }
  input[type='search'] { min-width: 10rem; max-width: 16rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
</style>
