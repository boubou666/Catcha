<script lang="ts">
  import { game } from '../state/game.svelte';
  import { palById } from '../data/pals';
  import { filterLoadouts, loadoutReadiness, MAX_LOADOUTS, MAX_LOADOUT_NAME, MEMBER_STATE_LABEL, memberState } from '../engine/loadouts';
  import { instanceByUid } from '../engine/party';
  import PalIcon from './PalIcon.svelte';

  const save = $derived(game.save);
  let name = $state('');
  let query = $state('');
  let open = $state(true);
  const shown = $derived(filterLoadouts(save, query));
  const full = $derived(save.loadouts.length >= MAX_LOADOUTS);
  const canSave = $derived(name.trim() !== '' && save.party.length > 0 && !full);
  function saveNow() { if (game.saveLoadout(name)) name = ''; }
  function rename(id: string, current: string) {
    const next = window.prompt('Rename loadout:', current);
    if (next !== null) game.renameLoadout(id, next);
  }
  function remove(id: string, current: string) {
    if (window.confirm(`Delete loadout “${current}”?`)) game.deleteLoadout(id);
  }
  const memberLabel = (uid: string) => { const p = instanceByUid(save, uid); return p ? `${palById(p.palId).name} Lv ${p.level}` : 'gone'; };
</script>

<section class="loadouts">
  <div class="row head">
    <h3 class="grow">Loadouts <span class="muted">{query.trim() ? `${shown.length} of ${save.loadouts.length}` : `${save.loadouts.length} / ${MAX_LOADOUTS}`}</span></h3>
    {#if save.loadouts.length}<button class="small" onclick={() => (open = !open)} aria-expanded={open}>{open ? 'Hide' : 'Show'}</button>{/if}
  </div>
  <div class="row">
    <input type="text" placeholder="Name this party…" maxlength={MAX_LOADOUT_NAME} bind:value={name} aria-label="Loadout name" onkeydown={(e) => { if (e.key === 'Enter' && canSave) saveNow(); }} />
    <button class="small primary" disabled={!canSave} onclick={saveNow} title={full ? `At most ${MAX_LOADOUTS} loadouts` : save.party.length === 0 ? 'The party is empty' : 'Save the current party'}>Save party</button>
    {#if save.loadouts.length > 2}<input type="search" placeholder="Search loadouts…" bind:value={query} aria-label="Search loadouts" />{/if}
  </div>
  {#if save.loadouts.length === 0}
    <p class="muted small">Save the current party under a name to swap teams in one click — a Water team for Fire routes, a grinding crew for the base.</p>
  {:else if open}
    {#if shown.length === 0}<p class="muted small">No loadout matches.</p>{/if}
    <div class="list">
      {#each shown as lo (lo.id)}
        {@const r = loadoutReadiness(save, lo)}
        {@const current = lo.uids.length === save.party.length && lo.uids.every((u) => save.party.includes(u))}
        <div class="lo" class:current>
          <div class="row top">
            <b class="grow">{lo.name}</b>
            <span class="muted small">{r.ready} / {r.total} available{current ? ' · active' : ''}</span>
            <button class="small primary" disabled={r.ready === 0 || current || game.inBossFight} onclick={() => game.applyLoadout(lo.id)} title={game.inBossFight ? 'Finish the fight first' : current ? 'This is your current party' : 'Swap the party for this loadout'}>Load</button>
            <button class="small" disabled={save.party.length === 0} onclick={() => game.updateLoadout(lo.id)} title="Overwrite with the current party">Update</button>
            <button class="small" onclick={() => rename(lo.id, lo.name)} title="Rename">✎</button>
            <button class="small danger" onclick={() => remove(lo.id, lo.name)} title="Delete">✕</button>
          </div>
          <div class="row members">
            {#each lo.uids as uid (uid)}
              {@const st = memberState(save, uid)}
              {@const p = instanceByUid(save, uid)}
              <span class="member" class:off={st === 'away' || st === 'gone'} title={MEMBER_STATE_LABEL[st]}>
                {#if p}<PalIcon palId={p.palId} size={22} lucky={p.lucky} />{:else}<span class="ghost">?</span>{/if}
                <span class="small">{memberLabel(uid)}</span>
                {#if st !== 'idle' && st !== 'party'}<span class="muted tiny">{MEMBER_STATE_LABEL[st]}</span>{/if}
              </span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .loadouts { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }
  .head h3 { margin: 0; }
  .small { font-size: 0.8rem; }
  .tiny { font-size: 0.7rem; }
  input[type='text'] { flex: 1; min-width: 8rem; max-width: 14rem; }
  input[type='search'] { min-width: 8rem; flex: 1; max-width: 12rem; }
  .list { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.5rem; }
  .lo { border: 1px solid var(--border); border-radius: 8px; padding: 0.45rem 0.6rem; display: flex; flex-direction: column; gap: 0.3rem; }
  .lo.current { border-color: var(--accent); }
  .members { gap: 0.5rem 0.75rem; }
  .member { display: inline-flex; align-items: center; gap: 0.3rem; }
  .member.off { opacity: 0.55; }
  .ghost { width: 22px; height: 22px; border-radius: 50%; background: var(--border); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; }
</style>
