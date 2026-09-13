<script lang="ts">
  // The Palpagos map (official map from the wiki) with pins for routes / tower / Alphas / realm. Click a pin
  // to see it, click again (or the button) to go. World view ⇄ one region, so pins stay tappable on a phone.
  import { game } from '../state/game.svelte';
  import { MAP_IMAGE, MAP_SIZE, regionMapById } from '../data/map';
  import { pinRegion, worldMap, type MapPin, type MapRegion } from '../engine/map';
  import { ui } from '../state/ui.svelte';
  import { RAIDS } from '../data/raids';
  import { summonBlocker, type SummonBlock } from '../engine/raid';
  import { routeById } from '../data/regions';
  import { tableOddsText } from './catchText';
  import { prefs } from '../state/prefs.svelte';
  import { t, t as tr } from '../i18n/index.svelte';

  const regions = $derived(worldMap(game.save));
  const byId = $derived(new Map(regions.map((r) => [r.id, r])));
  let zoom = $state<string | null>(game.region.id);   // region id, or null for the whole archipelago
  let selected = $state<MapPin | null>(null);
  const focused = $derived(zoom ? byId.get(zoom) ?? null : null);
  const pinsShown = $derived(focused ? focused.pins : regions.flatMap((r) => r.pins.filter((p) => p.current)));

  // the archipelago fills roughly this part of the square image
  const WORLD = { x: 280, y: 150, w: 1500, h: 1690 };
  const PAD = 30;
  const view = $derived.by(() => {
    if (!zoom) return WORLD;
    const [x, y, w, h] = regionMapById(zoom).box;
    return { x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 };
  });
  const viewBox = $derived(`${view.x} ${view.y} ${view.w} ${view.h}`);
  const base = import.meta.env.BASE_URL;
  const href = $derived(base + (zoom ? MAP_IMAGE.region : MAP_IMAGE.world));
  // pins are sized in image pixels: keep them about the same on screen whatever the zoom
  const pinR = $derived(Math.round(view.w / 26));
  const fs = $derived(Math.round(view.w / 32));

  // keep the selected pin fresh when the save changes (status, detail)
  const current = $derived(selected ? regions.flatMap((r) => r.pins).find((p) => p.kind === selected!.kind && p.id === selected!.id) ?? null : null);

  const ICON: Record<MapPin['kind'], string> = { route: '', tower: '🗼', alpha: '💀', realm: '🗝', base: '🏠', altar: '🔮' };
  const ACTION_KEY: Record<MapPin['kind'], string> = { route: 'map.travel', tower: 'map.challengeTower', alpha: 'map.fightAlpha', realm: 'map.enterRealm', base: 'map.openBase', altar: '' };
  const RAID_BLOCK: Record<SummonBlock, string> = { 'no-altar': 'Build the Summoning Altar', locked: 'Locked', 'no-slab': 'Craft a slab first' };

  // the boss / realm / raid you are fighting right now, if any
  const fighting = $derived.by((): { kind: MapPin['kind']; id: string } | null => {
    const w = game.wild;
    if (!w || w.kind === 'wild') return null;
    if (w.kind === 'alpha' || w.kind === 'tower') return w.refId ? { kind: w.kind, id: w.refId } : null;
    if (w.kind === 'raid') return { kind: 'altar', id: 'altar' };
    return game.run ? { kind: 'realm', id: game.run.id } : null;
  });
  const isFighting = (p: MapPin) => !!fighting && fighting.kind === p.kind && fighting.id === p.id;

  // "show on map" from elsewhere: zoom to the pin's region and select it
  $effect(() => {
    const f = ui.mapFocus;
    if (!f) return;
    ui.mapFocus = null;
    const regionId = pinRegion(f.kind as MapPin['kind'], f.id);
    const pin = regionId ? byId.get(regionId)?.pins.find((p) => p.kind === f.kind && p.id === f.id) : null;
    if (!pin) return;
    zoom = regionId;
    selected = pin;
  });

  const canAct = (p: MapPin) => p.kind === 'base' || (p.status !== 'locked' && !game.inBossFight && !(p.kind === 'route' && p.current) && !(p.kind === 'realm' && !game.canEnter(p.id)) && p.kind !== 'altar');
  function act(p: MapPin) {
    if (!canAct(p)) return;
    if (p.kind === 'base') ui.requestTab = 'base';
    else if (p.kind === 'route') game.travel(p.id);
    else if (p.kind === 'alpha') game.startAlpha(p.id);
    else if (p.kind === 'tower') game.startTower(p.id);
    else game.enterDungeon(p.id);
  }
  function tap(p: MapPin) {
    if (selected && selected.kind === p.kind && selected.id === p.id) act(p);
    else selected = p;
  }
  function zoomTo(r: MapRegion) {
    if (!r.reachable || zoom === r.id) return;
    zoom = r.id;
    selected = null;
  }
  const odds = (p: MapPin) => (p.kind === 'route' && p.status !== 'locked' ? `Catch: ${tableOddsText(game.save, routeById(p.id).spawns)}` : '');
  const short = (p: MapPin) => (p.kind === 'route' ? p.name : p.kind === 'tower' ? 'Tower' : p.kind === 'alpha' ? p.name.replace('Alpha ', 'α ') : p.kind === 'realm' ? 'Realm' : p.kind === 'base' ? 'Base' : 'Altar');
</script>

<div class="map" class:world={!zoom}>
  <div class="row mapbar">
    <button class="small" class:active={!zoom} onclick={() => { zoom = null; selected = null; }}>🌍 {t('routes.world')}</button>
    {#each regions as r (r.id)}
      {#if r.reachable}<button class="small" class:active={zoom === r.id} onclick={() => zoomTo(r)}>{r.name}</button>{/if}
    {/each}
    <span class="grow"></span>
    <button class="small" onclick={() => prefs.setRoutesView('list')} title={t('routes.backToList')}>☰ {t('routes.list')}</button>
  </div>

  <svg {viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={tr("Map of the Palpagos Islands")} style:aspect-ratio="{view.w} / {view.h}">
    <image {href} x="0" y="0" width={MAP_SIZE} height={MAP_SIZE} />

    {#if !zoom}
      <!-- world view: one frame per region, tap to zoom; locked ones say what opens them -->
      {#each regions as r (r.id)}
        {@const m = regionMapById(r.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <g class="region" class:locked={!r.reachable} class:here={r.id === game.region.id} role="button" tabindex={r.reachable ? 0 : -1} aria-label={r.reachable ? `Zoom to ${r.name}` : `${r.name} — locked: ${r.requirement}`}
          onclick={() => zoomTo(r)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomTo(r); } }}>
          <rect x={m.box[0]} y={m.box[1]} width={m.box[2]} height={m.box[3]} rx="24" />
          <text class="label" x={m.label[0]} y={m.label[1]} text-anchor="middle">{r.reachable ? r.name : `🔒 ${r.name}`}</text>
          <title>{r.reachable ? `${r.name} — ${r.pins.filter((p) => p.status === 'cleared').length} / ${r.pins.length} done` : `${r.name} — ${r.requirement}`}</title>
        </g>
      {/each}
    {:else if focused}
      <!-- the trail between routes, in progression order -->
      <polyline class="trail" points={focused.pins.filter((p) => p.kind === 'route').map((p) => `${p.x},${p.y}`).join(' ')} />
    {/if}

    {#each pinsShown as p (p.kind + ':' + p.id)}
      {@const sel = selected?.kind === p.kind && selected?.id === p.id}
      {@const r = p.kind === 'route' ? pinR : pinR + 2}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <g class="pin {p.kind} {p.status}" class:current={p.current} class:sel class:fighting={isFighting(p)} transform="translate({p.x},{p.y})" role="button" tabindex="0" aria-label="{p.name}{tr(", level")} {p.level}, {p.status}"
        onclick={(e) => { e.stopPropagation(); tap(p); }} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(p); } }}>
        {#if p.current || isFighting(p)}<circle class="pulse" r={r + 8} />{/if}
        <circle {r} />
        {#if p.kind === 'route'}
          <text class="lvl" y={fs * 0.36} text-anchor="middle" font-size={fs}>{p.status === 'locked' ? '🔒' : p.status === 'cleared' ? '✓' : p.level}</text>
        {:else}
          <text class="ico" y={fs * 0.4} text-anchor="middle" font-size={fs * 1.2}>{ICON[p.kind]}</text>
          {#if p.status === 'cleared'}<circle class="done" cx={r - 2} cy={-r + 2} r={fs * 0.45} /><text class="tick" x={r - 2} y={-r + 2 + fs * 0.25} text-anchor="middle" font-size={fs * 0.7}>✓</text>{/if}
          {#if p.status === 'locked'}<text class="lock" x={r - 2} y={-r + 6} text-anchor="middle" font-size={fs * 0.8}>🔒</text>{/if}
        {/if}
        <text class="name" class:show={sel || p.current || isFighting(p)} y={r + fs + 2} text-anchor="middle" font-size={fs * 0.9}>{short(p)}</text>
        <title>{p.name} · Lv {p.level} · {p.detail}{odds(p) ? `. ${odds(p)}` : ''}</title>
      </g>
    {/each}
  </svg>

  {#if current}
    <div class="row detail">
      <div class="grow">
        <b>{ICON[current.kind]} {current.name}</b> <span class="muted">Lv {current.level}{current.current ? ` · ${t('map.youAreHere')}` : ''}</span>
        <div class="muted small">{current.status === 'locked' ? `🔒 ${current.detail}` : current.detail}</div>
        {#if odds(current)}<div class="small odds-line">🎯 {odds(current).replace('Catch: ', '')}</div>{/if}
        {#if isFighting(current)}<div class="small fight">⚔ {t('map.fightingHere')}</div>{/if}
      </div>
      {#if current.kind === 'altar'}
        <div class="raids">
          {#each RAIDS as r (r.id)}
            {@const block = summonBlocker(game.save, r.id)}
            <button class="small" class:primary={!block && game.canSummon(r.id)} disabled={!game.canSummon(r.id)} onclick={() => game.summonRaid(r.id)} title={block ? RAID_BLOCK[block] : `Lv ${r.level} · ${(r.hp / 1000).toLocaleString()}k HP`}>🔮 {r.name}{(game.save.progress.raids[r.id] ?? 0) > 0 ? ' ✓' : ''}</button>
          {/each}
        </div>
      {:else}
        <button class="small" class:primary={canAct(current)} disabled={!canAct(current)} onclick={() => act(current!)} title={game.inBossFight && current.kind !== 'base' ? t('map.finishFight') : ''}>{current.current ? t('map.here') : t(ACTION_KEY[current.kind])}</button>
      {/if}
    </div>
  {:else}
    <p class="muted small hint">{zoom ? t('map.hintRegion') : t('map.hintWorld')} <span class="credit">{t('map.credit')}</span></p>
  {/if}
</div>

<style>
  .map { display: flex; flex-direction: column; gap: 0.4rem; }
  .map > * { flex: none; }   /* the SVG's aspect ratio must not squeeze the bar above it */
  .mapbar { flex-wrap: wrap; gap: 0.3rem; }
  .mapbar button.active { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  svg { width: 100%; height: auto; max-height: 72vh; border-radius: var(--radius-sm); display: block; background: #0b1c2c; }
  .region { cursor: pointer; }
  .region rect { fill: rgba(255, 255, 255, 0); stroke: rgba(255, 255, 255, 0.35); stroke-width: 3; stroke-dasharray: 14 10; transition: fill 0.15s; }
  .region:hover rect, .region:focus-visible rect { fill: rgba(255, 255, 255, 0.12); stroke: #fff; }
  .region:focus-visible { outline: none; }
  .region.here rect { stroke: #35d0ff; stroke-dasharray: none; stroke-width: 5; }
  .region.locked { cursor: default; }
  .region.locked rect { stroke: rgba(0, 0, 0, 0.45); fill: rgba(0, 0, 0, 0.35); }
  .region.locked:hover rect { fill: rgba(0, 0, 0, 0.35); stroke: rgba(0, 0, 0, 0.45); }
  .label { font: 800 56px Nunito, system-ui, sans-serif; fill: #fff; paint-order: stroke; stroke: rgba(0, 0, 0, 0.7); stroke-width: 10px; pointer-events: none; }
  .region.locked .label { fill: #cbd5e1; }
  .trail { fill: none; stroke: rgba(255, 255, 255, 0.7); stroke-width: 4; stroke-dasharray: 8 10; stroke-linejoin: round; }
  .pin { cursor: pointer; }
  .pin circle { fill: #ffb703; stroke: #fff; stroke-width: 3; }
  .pin.cleared circle { fill: #5be08f; }
  .pin.locked { cursor: default; }
  .pin.locked circle { fill: #64748b; stroke: rgba(255, 255, 255, 0.6); }
  .pin.tower circle { fill: #ff5f5f; }
  .pin.alpha circle { fill: #c026d3; }
  .pin.realm circle { fill: #35d0ff; }
  .pin.base circle { fill: #fff; }
  .pin.altar circle { fill: #7b2cbf; }
  .pin.fighting > circle:not(.pulse) { fill: #ff5f5f; }
  .pin.fighting .pulse { stroke: #ff5f5f; }
  .fight { color: var(--danger); font-weight: 700; }
  .raids { display: flex; flex-direction: column; gap: 0.25rem; }
  .raids button { text-align: left; }
  .pin.locked.tower circle, .pin.locked.alpha circle, .pin.locked.realm circle, .pin.locked.altar circle { fill: #64748b; }
  .pin.sel circle:not(.pulse):not(.done) { stroke: #fff; stroke-width: 5; filter: drop-shadow(0 0 8px #fff); }
  .pin:focus-visible { outline: none; }
  .pin:focus-visible circle:not(.pulse) { stroke: #fff; stroke-width: 5; }
  .pin.current > circle:not(.pulse) { fill: #35d0ff; }
  .pulse { fill: none; stroke: #35d0ff; stroke-width: 4; animation: pulse 1.6s ease-out infinite; }
  @keyframes pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
  .lvl { font-family: Nunito, system-ui, sans-serif; font-weight: 800; fill: #14213d; pointer-events: none; }
  .ico { pointer-events: none; }
  .done { fill: #5be08f; stroke: #fff; stroke-width: 2; }
  .tick { font-family: Nunito, system-ui, sans-serif; font-weight: 800; fill: #14213d; pointer-events: none; }
  .lock { pointer-events: none; }
  .name { font-family: Nunito, system-ui, sans-serif; font-weight: 700; fill: #fff; paint-order: stroke; stroke: rgba(0, 0, 0, 0.7); stroke-width: 4px; pointer-events: none; opacity: 0; transition: opacity 0.15s; }
  .name.show, .pin:hover .name, .pin:focus-visible .name { opacity: 1; }
  .detail { align-items: center; padding: 0.5rem; background: var(--panel-2); border-radius: var(--radius-sm); }
  .small { font-size: 0.85rem; }
  .odds-line { color: var(--accent-2); }
  .hint { margin: 0; }
  .credit { opacity: 0.6; font-size: 0.75rem; }
</style>
