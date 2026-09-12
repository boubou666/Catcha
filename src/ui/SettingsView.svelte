<script lang="ts">
  import { game } from '../state/game.svelte';
  import { dayKey, msUntilRollover } from '../engine/daily';
  import { formatDuration } from './format';
  import type { DailyReset } from '../data/types';
  import { buzz, getPref, hapticsAvailable, play, setPref } from './sfx';
  import { whatsNew } from '../state/whatsnew.svelte';
  import { LATEST_VERSION } from '../data/changelog';
  import { filterSettings, SETTINGS_SECTIONS, type SettingsSection } from '../engine/settingsfilter';
  import TutorialSteps from './TutorialSteps.svelte';
  import KeyBindings from './KeyBindings.svelte';
  import { theme, type ThemeChoice } from '../state/theme.svelte';
  import { SPHERES } from '../data/spheres';
  import { SPHERE_TIERS, type SpherePolicy } from '../data/types';
  import ItemIcon from './ItemIcon.svelte';
  const policies: { value: SpherePolicy; label: string }[] = [
    { value: 'none', label: "Don't throw" },
    ...SPHERE_TIERS.map((t) => ({ value: t, label: SPHERES[t].name })),
  ];
  const stock = (t: SpherePolicy) => (t === 'none' ? '' : ` (×${save.inventory[SPHERES[t].itemId] ?? 0})`);
  const THEMES: { value: ThemeChoice; label: string; desc: string }[] = [
    { value: 'dark', label: 'Dark HUD', desc: 'Navy glass panels over the Palpagos sky — the default.' },
    { value: 'light', label: 'Light HUD', desc: 'Cream glass with ink text; easier in bright daylight.' },
    { value: 'system', label: 'Follow the system', desc: 'Light or dark as your device prefers.' },
  ];
  import { ui } from '../state/ui.svelte';

  let sound = $state(getPref());
  function setSound(next: { enabled?: boolean; volume?: number; haptics?: boolean }) {
    sound = setPref(next);
    if (next.haptics) buzz('caught');
    else if (sound.enabled && next.haptics === undefined) play('caught');
  }
  const canBuzz = hapticsAvailable();

  const save = $derived(game.save);
  const mode = $derived(save.settings.dailyReset ?? 'utc');
  const now = Date.now();
  const wouldChangeDay = (m: DailyReset) => dayKey(now, m) !== save.daily?.date;

  function pick(m: DailyReset) {
    if (m === mode) return;
    if (wouldChangeDay(m) && save.daily && !save.daily.quests.every((q) => q.claimed)
      && !window.confirm("Switching now lands on a different calendar day, so today's unclaimed quests will be replaced. Continue?")) return;
    game.setDailyReset(m);
  }

  function doExport() {
    const str = game.exportString();
    navigator.clipboard?.writeText(str).catch(() => {});
    window.prompt('Save string (copied to clipboard):', str);
  }
  function doImport() {
    const str = window.prompt('Paste save string:');
    if (str && !game.importString(str)) window.alert('Could not read that save.');
  }
  function doReset() {
    if (window.confirm('Delete your save and start over? This cannot be undone.')) game.reset();
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const version = __APP_VERSION__;
  const builtAt = __BUILT_AT__;

  // search narrows the sections; a chip pins one (chips act as a second query)
  let query = $state('');
  let only = $state<SettingsSection | null>(null);
  const shown = $derived(new Set(filterSettings(query).filter((sec) => !only || sec.id === only).map((sec) => sec.id)));
  const show = (id: SettingsSection) => shown.has(id);
  const filtering = $derived(query.trim() !== '' || only !== null);
  const clear = () => { query = ''; only = null; };
  let showSteps = $state(false);
</script>

<div class="row">
  <h2 class="grow">Settings <span class="muted">{filtering ? `${shown.size} of ${SETTINGS_SECTIONS.length}` : ''}</span></h2>
  <input type="search" placeholder="Search settings…" bind:value={query} aria-label="Search settings" />
</div>
<nav class="chips">
  <button class="chip" class:on={only === null} onclick={() => (only = null)}>All</button>
  {#each SETTINGS_SECTIONS as sec (sec.id)}
    <button class="chip" class:on={only === sec.id} onclick={() => (only = only === sec.id ? null : sec.id)}>{sec.title}</button>
  {/each}
</nav>
{#if shown.size === 0}
  <p class="muted">No setting matches. <button class="small" onclick={clear}>Clear</button></p>
{/if}

{#if show('daily')}
<section>
  <h3>Daily quest reset</h3>
  <div class="options">
    <label class="opt" class:on={mode === 'utc'}>
      <input type="radio" name="reset" checked={mode === 'utc'} onchange={() => pick('utc')} />
      <span><b>UTC midnight</b><br /><span class="muted small">Same moment for everyone. Next reset in {formatDuration(msUntilRollover(now, 'utc'))}.</span></span>
    </label>
    <label class="opt" class:on={mode === 'local'}>
      <input type="radio" name="reset" checked={mode === 'local'} onchange={() => pick('local')} />
      <span><b>Local midnight</b> <span class="muted small">({tz})</span><br /><span class="muted small">Your own midnight. Next reset in {formatDuration(msUntilRollover(now, 'local'))}.</span></span>
    </label>
  </div>
</section>
{/if}

{#if show('appearance')}
<section>
  <h3>Appearance</h3>
  <div class="options">
    {#each THEMES as t (t.value)}
      <label class="opt" class:on={theme.choice === t.value}>
        <input type="radio" name="theme" checked={theme.choice === t.value} onchange={() => theme.set(t.value)} />
        <span><b>{t.label}</b>{#if t.value === 'system'} <span class="muted small">(now {theme.effective})</span>{/if}<br /><span class="muted small">{t.desc}</span></span>
      </label>
    {/each}
  </div>
</section>
{/if}

{#if show('sound')}
<section>
  <h3>Sound</h3>
  <div class="row sound">
    <label class="row"><input type="checkbox" checked={sound.enabled} onchange={(e) => setSound({ enabled: e.currentTarget.checked })} /> Sound effects</label>
    <label class="row grow"><span class="muted small">Volume</span>
      <input type="range" min="0" max="1" step="0.05" value={sound.volume} disabled={!sound.enabled} oninput={(e) => setSound({ volume: Number(e.currentTarget.value) })} /></label>
  </div>
  <div class="row sound">
    <label class="row"><input type="checkbox" checked={sound.haptics} disabled={!canBuzz} onchange={(e) => setSound({ haptics: e.currentTarget.checked })} /> Vibration</label>
    <span class="muted small">{canBuzz ? 'Short buzzes for clicks, catches, level-ups and wins.' : 'Not available on this device (touch screen + browser support needed; iOS Safari has none).'}</span>
  </div>
  <p class="muted small">Synthesized in the browser — no audio files. Stored on this device.</p>
</section>
{/if}

{#if show('catching')}
<section>
  <h3>Catching</h3>
  <p class="muted small">A sphere is thrown automatically when you defeat a wild Pal or an Alpha. Choose which one — or none — for species you haven't caught yet and for ones you already own. If the chosen tier is out of stock, the next lower one is thrown.</p>
  <div class="row policies">
    <label class="grow policy">New species
      <select value={save.settings.sphereForNew} onchange={(e) => game.setSpherePolicy('new', e.currentTarget.value as SpherePolicy)}>
        {#each policies as p}<option value={p.value}>{p.label}{stock(p.value)}</option>{/each}
      </select>
    </label>
    <label class="grow policy">Already caught
      <select value={save.settings.sphereForDupe} onchange={(e) => game.setSpherePolicy('dupe', e.currentTarget.value as SpherePolicy)}>
        {#each policies as p}<option value={p.value}>{p.label}{stock(p.value)}</option>{/each}
      </select>
    </label>
  </div>
  <p class="muted small">Duplicates are what breeding, condensing and the base run on — throwing at them costs spheres, so it starts off. Spheres: {#each SPHERE_TIERS as t}{#if (save.inventory[SPHERES[t].itemId] ?? 0) > 0}<span class="chip"><ItemIcon id={SPHERES[t].itemId} size={14} /> {SPHERES[t].name} ×{save.inventory[SPHERES[t].itemId]}</span>{/if}{/each}{#if SPHERE_TIERS.every((t) => !(save.inventory[SPHERES[t].itemId] ?? 0))}none — buy or craft some{/if}</p>
</section>
{/if}

{#if show('keyboard')}
<section>
  <div class="row">
    <h3 class="grow">Keyboard</h3>
    <button class="small" onclick={() => (ui.shortcutsOpen = true)}>Show the list</button>
  </div>
  <KeyBindings />
</section>
{/if}

{#if show('save')}
<section>
  <h3>Save</h3>
  <p class="muted small">Autosaves every 30 s and when you leave. Saves are per browser — use Export / Import to move between the local copy and the hosted one.</p>
  <div class="row">
    <button class="small" onclick={() => game.persist()}>Save now</button>
    <button class="small" onclick={doExport}>Export</button>
    <button class="small" onclick={doImport}>Import</button>
    <span class="grow"></span>
    <button class="small danger" onclick={doReset}>Reset game</button>
  </div>
</section>
{/if}

{#if show('about')}
<section>
  <h3>About</h3>
  <p class="muted small">Catcha version <code>{version}</code>{version !== 'dev' ? `, built ${new Date(builtAt).toLocaleString()}` : ' (development build)'}. Changelog v{LATEST_VERSION}. New deploys show a reload banner at the top; the hosted copy checks every 30 minutes and whenever you return to the tab.</p>
  <div class="row">
    <button class="small" onclick={() => whatsNew.showAll()}>What's new</button>
    <button class="small" onclick={() => game.restartTutorial()} disabled={!game.save.tutorial.done}>{game.save.tutorial.done ? 'Replay tutorial' : 'Tutorial in progress'}</button>
    <button class="small" onclick={() => (showSteps = !showSteps)} aria-expanded={showSteps}>{showSteps ? 'Hide steps' : 'How to play'}</button>
  </div>
  {#if showSteps}
    <div class="steps"><TutorialSteps /></div>
  {/if}
</section>
{/if}

<style>
  section { margin-top: 1.25rem; }
  .small { font-size: 0.8rem; }
  .options { display: flex; flex-direction: column; gap: 0.4rem; }
  .opt { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.6rem; border: 1.5px solid var(--border-soft); border-radius: var(--radius-sm); cursor: pointer; }
  .opt.on { border-color: var(--accent); }
  .opt input { margin-top: 0.2rem; }
  .sound { gap: 1.5rem; }
  .sound input[type=range] { flex: 1; min-height: 0; }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
  .chip { font-size: 0.8rem; padding: 0.15rem 0.6rem; border-radius: 999px; }
  .chip.on { border-color: var(--accent); color: var(--accent); }
  .policy { display: flex; flex-direction: column; gap: 0.25rem; font-weight: 700; }
  .policies { align-items: flex-start; }
  .steps { margin-top: 0.5rem; }
</style>
