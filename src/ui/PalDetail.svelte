<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById, paldeckNumber } from '../data/pals';
  import { itemName } from '../data/items';
  import { JOB_ICON } from '../data/base';
  import type { WorkType } from '../data/types';
  import { bestPlace, breedingInfoFor, DEFAULT_DETAIL_FILTER, filterBreedingInfo, filterHabitat, habitatOf, isDetailFiltering, isSeen, ownedCopies, PAIR_KIND_LABEL, type DetailFilter } from '../engine/paldex';
  import { routeById } from '../data/regions';
  import { isUnlocked, describeRequirement } from '../engine/progress';
  import { dungeonById } from '../data/dungeons';
  import { raidById } from '../data/raids';
  import { ui } from '../state/ui.svelte';
  import { catchPreview, catchTable } from '../engine/catch';
  import { catchText } from './catchText';
  import { LUCKY_CATCH_PENALTY, SPHERES } from '../data/spheres';
  import PalIcon from './PalIcon.svelte';
  import ItemIcon from './ItemIcon.svelte';
  import PassiveChips from './PassiveChips.svelte';

  let { palId, onclose, onselect }: { palId: number; onclose: () => void; onselect: (id: number) => void } = $props();

  const save = $derived(game.save);
  const def = $derived(palById(palId));
  const seen = $derived(isSeen(save, def));
  const caught = $derived((save.paldeck[palId]?.caught ?? 0) > 0);
  let filter = $state<DetailFilter>({ ...DEFAULT_DETAIL_FILTER });
  const allHabitat = $derived(habitatOf(palId));
  const preview = $derived(catchPreview(save, palId));
  const alphaPreview = $derived(catchPreview(save, palId, false, true));
  const table = $derived(catchTable(save, palId));
  const isAlpha = $derived(allHabitat.alphas.length > 0);
  const place = $derived(seen ? bestPlace(save, palId) : null);
  const allBreeding = $derived(breedingInfoFor(save, palId));
  const habitat = $derived(filterHabitat(save, allHabitat, filter));
  const breeding = $derived(filterBreedingInfo(save, allBreeding, filter));
  const filtering = $derived(isDetailFiltering(filter));
  const clear = () => { filter = { ...DEFAULT_DETAIL_FILTER }; };
  const places = (h: typeof allHabitat) => h.routes.length + h.alphas.length + h.towers.length + h.realms.length + h.raids.length;
  const pairs = (b: typeof allBreeding) => b.producedBy.length + b.parentOf.length;
  // controls only once there is enough to sift through
  const showControls = $derived(places(allHabitat) + pairs(allBreeding) >= 4);
  const owned = $derived(ownedCopies(save, palId));
  const work = $derived(Object.entries(def.work) as [WorkType, number][]);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const name = (id: number) => (isSeen(save, palById(id)) ? palById(id).name : '???');
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onclose(); }} />

<div class="backdrop">
  <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="pal-title">
    <div class="row head">
      <PalIcon {palId} size={96} unknown={!seen} render />
      <div class="grow">
        <div class="muted small">{paldeckNumber(def)}{def.variantOf ? ` · subspecies of ${name(def.variantOf)}` : ''}</div>
        <h2 id="pal-title">{seen ? def.name : '???'}</h2>
        <div class="muted">{seen ? `${def.elements.join(' / ')} · ${def.rarity}${def.partnerSkill ? ` · ${def.partnerSkill}` : ''}` : 'Unknown element'}</div>
        {#if owned.count > 0}
          <div class="small">Owned ×{owned.count}{owned.best ? ` · best Lv ${owned.best.level}${owned.best.stars ? ' ' + '★'.repeat(owned.best.stars) : ''}` : ''}</div>
        {:else if seen}<div class="muted small">Seen, not yet caught</div>
        {:else}<div class="muted small">Not yet encountered</div>{/if}
      </div>
      <button class="small" onclick={onclose}>✕</button>
    </div>

    {#if seen}
      <section class="cols">
        <div>
          <h3>Stats</h3>
          <div class="small">HP {def.baseHp} · ATK {def.baseAttack} · DEF {def.baseDefense}<br />Breeding rank {def.breedPower}</div>
        </div>
        <div>
          <h3>Work</h3>
          <div class="small">{#each work as [job, lvl]}<span class="job" title={job}>{JOB_ICON[job]}{lvl}</span>{/each}{#if work.length === 0}<span class="muted">none</span>{/if}
            {#if def.farmDrop}<div class="muted">Ranch: <ItemIcon id={def.farmDrop.itemId} size={16} label /></div>{/if}</div>
        </div>
        <div>
          <h3>Drops</h3>
          <div class="small drops">{#if caught}{#each def.drops as d (d.itemId)}<span class="drop"><ItemIcon id={d.itemId} size={16} label />{#if d.chance < 1}<span class="muted"> ({pct(d.chance)})</span>{/if}</span>{/each}{:else}<span class="muted">catch one to learn</span>{/if}</div>
        </div>
      </section>
      <section>
        <h3>Catching</h3>
        <div class="small">
          <button class="link catchline" class:no={!preview.throws} onclick={() => { ui.requestTab = 'settings'; onclose(); }} title="Catch settings">🎯 Right now: {catchText(preview)}</button>
          <div class="tiers">
            {#each table as t (t.tier)}
              <span class="tier" class:none={t.stock === 0} title={`${SPHERES[t.tier].name} — ${t.stock} in the bag`}><ItemIcon id={SPHERES[t.tier].itemId} size={16} /> {pct(t.chance)}{#if isAlpha}<span class="muted"> · Alpha {pct(t.alpha)}</span>{/if}</span>
            {/each}
          </div>
          <div class="muted tiny">Per sphere, on a wild one at your Effigy and tech bonuses{isAlpha ? '; the Alpha figure includes the boss penalty' : ''}. Lucky Pals are caught at ×{LUCKY_CATCH_PENALTY}. Greyed spheres are out of stock.</div>
        </div>
      </section>
    {/if}

    {#if showControls}
      <div class="row controls">
        <input type="search" placeholder="Search places, partners…" bind:value={filter.query} aria-label="Search habitat and breeding" />
        <label class="chk"><input type="checkbox" bind:checked={filter.unlockedOnly} /> Reachable only</label>
        <select bind:value={filter.pairs} aria-label="Pair kind">
          {#each Object.entries(PAIR_KIND_LABEL) as [k, label]}<option value={k}>{label}</option>{/each}
        </select>
        {#if filtering}<button class="small" onclick={clear}>Clear</button>{/if}
      </div>
    {/if}

    <section>
      <h3>Habitat {#if filtering}<span class="muted small">{places(habitat)} of {places(allHabitat)}</span>{/if}</h3>
      {#if place}<div class="small best">🎯 Best place: <b>{place.routeName}</b> <span class="muted">({place.regionName}) · {pct(place.share)} of spawns × {pct(place.odds)} odds → about 1 catch per {Math.max(1, Math.round(1 / place.perDefeat))} defeat{Math.round(1 / place.perDefeat) === 1 ? '' : 's'}</span>{#if !game.inBossFight && game.route.id !== place.routeId}<button class="tiny" onclick={() => { game.travel(place.routeId); onclose(); }}>Go</button>{/if}</div>{/if}
      {#if places(allHabitat) === 0}
        <div class="muted small">Not found in the wild.</div>
      {:else if places(habitat) === 0}
        <div class="muted small">No place matches.</div>
      {/if}
      <ul class="small">
        {#each habitat.routes as r}
          {@const open = isUnlocked(save, routeById(r.routeId).unlock)}
          <li class:locked={!open}>{r.routeName} <span class="muted">({r.regionName}, Lv {r.level}) · {pct(r.chance)} of spawns{open ? '' : ` · 🔒 ${describeRequirement(routeById(r.routeId).unlock)}`}</span>
            {#if open && !game.inBossFight && game.route.id !== r.routeId}<button class="tiny" onclick={() => { game.travel(r.routeId); onclose(); }}>Go</button>{/if}</li>
        {/each}
        {#each habitat.alphas as a}<li>Alpha in {a.regionName} <span class="muted">(Lv {a.level})</span> <span class="odds" class:no={!alphaPreview.throws} title={`Catch: ${catchText(alphaPreview)}`}>🎯 {alphaPreview.throws ? pct(alphaPreview.chance) : '—'}</span></li>{/each}
        {#each habitat.towers as t}<li>{t.boss} — {t.name} <span class="muted">(tower boss, not catchable)</span></li>{/each}
        {#each habitat.realms as d}<li>{d.name} <span class="muted">({d.role === 'guardian' ? 'guardian' : `${pct(d.chance)} of waves`}{isUnlocked(save, dungeonById(d.dungeonId).unlock) ? '' : ` · 🔒 ${describeRequirement(dungeonById(d.dungeonId).unlock)}`})</span></li>{/each}
        {#each habitat.raids as r}<li>{r.name} raid <span class="muted">(egg on victory{isUnlocked(save, raidById(r.raidId).unlock) ? '' : ` · 🔒 ${describeRequirement(raidById(r.raidId).unlock)}`})</span></li>{/each}
      </ul>
    </section>

    <section>
      <h3>Breeding {#if filtering}<span class="muted small">{pairs(breeding)} of {pairs(allBreeding)}</span>{/if}</h3>
      <ul class="small">
        {#if !filtering}<li>{seen ? def.name : 'It'} × {seen ? def.name : 'itself'} → {seen ? def.name : 'itself'} <span class="muted">(same species breeds true)</span></li>{/if}
        {#if filtering && pairs(breeding) === 0}<li class="muted">No pair matches.</li>{/if}
        {#each breeding.producedBy as p}
          <li><button class="link" onclick={() => onselect(p.a)}>{name(p.a)}</button> × <button class="link" onclick={() => onselect(p.b)}>{name(p.b)}</button> → {seen ? def.name : '???'}
            <span class="muted">{p.special ? '(special combo)' : '(by breeding rank, from species you own)'}</span></li>
        {/each}
        {#each breeding.parentOf as p}
          <li>{seen ? def.name : '???'} × <button class="link" onclick={() => onselect(p.partner)}>{name(p.partner)}</button> → <button class="link" onclick={() => onselect(p.child)}>{name(p.child)}</button> <span class="muted">(special combo)</span></li>
        {/each}
        {#if !filtering && allBreeding.producedBy.length === 0 && !def.variantOf}
          <li class="muted">No owned pair lands on this rank yet — catch more species and check back.</li>
        {/if}
      </ul>
    </section>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 10; background: var(--overlay); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal { width: min(640px, 100%); max-height: 90vh; overflow-y: auto; }
  .head { align-items: flex-start; }
  .small { font-size: 0.85rem; }
  section { margin-top: 1rem; }
  .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  @media (max-width: 560px) { .cols { grid-template-columns: 1fr; } }
  ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.25rem; }
  li.locked { opacity: 0.6; }
  .job { margin-right: 0.35rem; white-space: nowrap; }
  .drops { display: flex; flex-wrap: wrap; gap: 0.25rem 0.6rem; }
  .drop { white-space: nowrap; }
  .tiny { font-size: 0.75rem; padding: 0.05rem 0.4rem; margin-left: 0.3rem; }
  div.tiny { padding: 0; margin: 0.3rem 0 0; }
  .catchline { text-decoration: none; font-weight: 700; }
  .catchline:hover { text-decoration: underline; }
  .catchline.no { color: var(--muted); }
  .tiers { display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; margin-top: 0.35rem; }
  .tier { display: inline-flex; align-items: center; gap: 0.2rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .tier.none { opacity: 0.5; font-weight: 400; }
  .odds { color: var(--accent-2); font-weight: 700; margin-left: 0.3rem; }
  .best { margin: 0.2rem 0 0.4rem; color: var(--accent-2); }
  .odds.no { color: var(--muted); font-weight: 400; }
  .link { background: none; border: none; padding: 0; color: var(--accent-2); cursor: pointer; font: inherit; text-decoration: underline; }
  .controls { margin-top: 1rem; }
  .controls input[type='search'] { min-width: 8rem; flex: 1; max-width: 14rem; font-size: 0.85rem; }
  .controls select { font-size: 0.85rem; }
  .chk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; cursor: pointer; }
  .chk input { min-height: 0; width: auto; }
  h3 .small { font-weight: 400; text-transform: none; letter-spacing: 0; }
</style>
