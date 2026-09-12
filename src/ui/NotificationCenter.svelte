<script lang="ts">
  import { game } from '../state/game.svelte';
  import { ui } from '../state/ui.svelte';
  import { DEFAULT_NOTICE_FILTER, filterNotices, isNoticeFiltering, NOTICE_CAP, NOTICE_KIND_LABEL, NOTICE_KINDS, type NoticeFilter } from '../engine/notices';

  let filter = $state<NoticeFilter>({ ...DEFAULT_NOTICE_FILTER });
  const rows = $derived(filterNotices(game.notices, filter));
  const filtering = $derived(isNoticeFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_NOTICE_FILTER }; };
  const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const open = $derived(ui.notificationsOpen);
  function toggle() {
    ui.notificationsOpen = !ui.notificationsOpen;
    if (!ui.notificationsOpen) game.markNoticesRead();
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && open) toggle(); }} />

<span class="bellwrap">
  <button class="small bell" onclick={toggle} aria-expanded={open} title="Notifications">🔔</button>
  {#if game.unreadNotices > 0}<span class="badge" aria-label="{game.unreadNotices} unread">{game.unreadNotices > 99 ? '99+' : game.unreadNotices}</span>{/if}
</span>

{#if open}
  <div class="backdrop" onclick={toggle} role="presentation"></div>
  <div class="center panel" role="dialog" aria-label="Notifications">
    <div class="row head">
      <h3 class="grow">Notifications <span class="muted">{filtering ? `${rows.length} of ${game.notices.length}` : game.notices.length}</span></h3>
      {#if game.unreadNotices > 0}<button class="small" onclick={() => game.markNoticesRead()}>Mark all read</button>{/if}
      {#if game.notices.length > 0}<button class="small" onclick={() => game.clearNotices()}>Clear</button>{/if}
      <button class="small" onclick={toggle} title="Close">✕</button>
    </div>
    <div class="row">
      <input type="search" placeholder="Search notifications…" bind:value={filter.query} aria-label="Search notifications" />
      <select bind:value={filter.kind} aria-label="Notification kind">
        <option value="any">All kinds</option>
        {#each NOTICE_KINDS as k}<option value={k}>{NOTICE_KIND_LABEL[k]}</option>{/each}
      </select>
      <label class="chk"><input type="checkbox" bind:checked={filter.unreadOnly} /> Unread</label>
      {#if filtering}<button class="small" onclick={clear}>Reset</button>{/if}
    </div>
    <div class="list">
      {#if rows.length === 0}
        <p class="muted small">{game.notices.length === 0 ? 'Nothing yet — catches, level-ups, hatches and rewards land here.' : 'No notification matches.'}</p>
      {/if}
      {#each rows as n (n.id)}
        <div class="notice {n.kind}" class:unread={!n.read}>
          <span class="t muted">{time(n.at)}</span>
          <span class="grow">{n.text}</span>
        </div>
      {/each}
    </div>
    <div class="prefs">
      <div class="muted small">Pop up as toasts (this device):</div>
      <div class="row">
        {#each NOTICE_KINDS as k}
          <label class="chk"><input type="checkbox" checked={game.toastPref[k]} onchange={(e) => game.setToastPref(k, e.currentTarget.checked)} /> {NOTICE_KIND_LABEL[k]}</label>
        {/each}
      </div>
      <div class="muted tiny">Everything still lands here, up to the last {NOTICE_CAP}, for this session.</div>
    </div>
  </div>
{/if}

<style>
  .bellwrap { position: relative; display: inline-flex; }
  .badge { position: absolute; top: -0.45rem; right: -0.45rem; pointer-events: none; z-index: 1; background: var(--danger); color: #fff; border-radius: 999px; font-size: 0.65rem; padding: 0.05rem 0.35rem; font-weight: 700; }
  .backdrop { position: fixed; inset: 0; z-index: 14; }
  .center { position: fixed; top: 4.5rem; right: 1rem; z-index: 15; background: rgba(var(--navy), 0.98); backdrop-filter: blur(10px); width: min(420px, calc(100vw - 2rem)); max-height: 75vh; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: var(--shadow-float); }
  .head h3 { margin: 0; }
  .small { font-size: 0.8rem; }
  .tiny { font-size: 0.75rem; margin-top: 0.25rem; }
  input[type='search'] { min-width: 8rem; flex: 1; font-size: 0.85rem; }
  select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
  .list { overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem; min-height: 4rem; }
  .notice { display: flex; gap: 0.5rem; padding: 0.35rem 0.5rem; border: 1.5px solid var(--border-soft); border-left: 4px solid var(--accent-2); border-radius: var(--radius-sm); font-size: 0.9rem; }
  .notice.success { border-left-color: var(--ok); }
  .notice.gold { border-left-color: var(--accent); }
  .notice.warn { border-left-color: var(--danger); }
  .notice.unread { background: var(--panel-2); }
  .t { font-variant-numeric: tabular-nums; font-size: 0.75rem; white-space: nowrap; }
  .prefs { border-top: 1.5px solid var(--border-soft); padding-top: 0.5rem; }
  @media (max-width: 800px) { .center { top: auto; bottom: 0.5rem; right: 0.5rem; left: 0.5rem; width: auto; } }
</style>
