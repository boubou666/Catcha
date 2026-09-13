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
  import { prefs } from '../state/prefs.svelte';
  import { t, t as tr } from '../i18n/index.svelte';
  import { LOCALES } from '../i18n/messages';
  const policies: { value: SpherePolicy; label: string }[] = [
    { value: 'none', label: "Don't throw" },
    ...SPHERE_TIERS.map((t) => ({ value: t, label: SPHERES[t].name })),
  ];
  const stock = (t: SpherePolicy) => (t === 'none' ? '' : ` (×${save.inventory[SPHERES[t].itemId] ?? 0})`);
  const THEMES: { value: ThemeChoice; key: string }[] = [{ value: 'dark', key: 'dark' }, { value: 'light', key: 'light' }, { value: 'system', key: 'system' }];
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

  // save code: a compact string shown in a box, copied to the clipboard; paste one to load it
  let code = $state('');
  let codeNote = $state('');
  async function doExport() {
    code = await game.saveCode();
    codeNote = `${code.length.toLocaleString()} characters`;
    try { await navigator.clipboard?.writeText(code); codeNote += ' · copied'; } catch { /* clipboard blocked */ }
  }
  async function doLink() {
    const c = await game.saveCode();
    const url = `${location.origin}${location.pathname}#save=${c}`;
    try { await navigator.clipboard?.writeText(url); codeNote = tr('Link copied — open it on the other device to load this save there.'); } catch { code = url; codeNote = tr('Copy this link and open it on the other device.'); }
  }
  async function doImport() {
    const ok = code.trim() ? await game.importCode(code) : false;
    codeNote = ok ? 'Save loaded.' : 'Could not read that code.';
    if (ok) code = '';
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
  <h2 class="grow">{t('settings.title')} <span class="muted">{filtering ? `${shown.size} of ${SETTINGS_SECTIONS.length}` : ''}</span></h2>
  <input type="search" placeholder={t('settings.search')} bind:value={query} aria-label={tr("Search settings")} />
</div>
<nav class="chips">
  <button class="chip" class:on={only === null} onclick={() => (only = null)}>{t('settings.all')}</button>
  {#each SETTINGS_SECTIONS as sec (sec.id)}
    <button class="chip" class:on={only === sec.id} onclick={() => (only = only === sec.id ? null : sec.id)}>{t(`settings.${sec.id}`)}</button>
  {/each}
</nav>
{#if shown.size === 0}
  <p class="muted">{tr("No setting matches.")} <button class="small" onclick={clear}>{tr("Clear")}</button></p>
{/if}

{#if show('daily')}
<section>
  <h3>{t('settings.daily')}</h3>
  <div class="options">
    <label class="opt" class:on={mode === 'utc'}>
      <input type="radio" name="reset" checked={mode === 'utc'} onchange={() => pick('utc')} />
      <span><b>{tr("UTC midnight")}</b><br /><span class="muted small">{tr("Same moment for everyone. Next reset in")} {formatDuration(msUntilRollover(now, 'utc'))}.</span></span>
    </label>
    <label class="opt" class:on={mode === 'local'}>
      <input type="radio" name="reset" checked={mode === 'local'} onchange={() => pick('local')} />
      <span><b>{tr("Local midnight")}</b> <span class="muted small">({tz})</span><br /><span class="muted small">{tr("Your own midnight. Next reset in")} {formatDuration(msUntilRollover(now, 'local'))}.</span></span>
    </label>
  </div>
</section>
{/if}

{#if show('appearance')}
<section>
  <h3>{t('settings.appearance')}</h3>
  <div class="options">
    {#each THEMES as th (th.value)}
      <label class="opt" class:on={theme.choice === th.value}>
        <input type="radio" name="theme" checked={theme.choice === th.value} onchange={() => theme.set(th.value)} />
        <span><b>{t(`theme.${th.key}`)}</b>{#if th.value === 'system'} <span class="muted small">{tr("(now")} {theme.effective})</span>{/if}<br /><span class="muted small">{t(`theme.${th.key}Desc`)}</span></span>
      </label>
    {/each}
  </div>
</section>
{/if}

{#if show('sound')}
<section>
  <h3>{t('settings.sound')}</h3>
  <div class="row sound">
    <label class="row"><input type="checkbox" checked={sound.enabled} onchange={(e) => setSound({ enabled: e.currentTarget.checked })} /> {tr("Sound effects")}</label>
    <label class="row grow"><span class="muted small">{tr("Volume")}</span>
      <input type="range" min="0" max="1" step="0.05" value={sound.volume} disabled={!sound.enabled} oninput={(e) => setSound({ volume: Number(e.currentTarget.value) })} /></label>
  </div>
  <div class="row sound">
    <label class="row"><input type="checkbox" checked={sound.haptics} disabled={!canBuzz} onchange={(e) => setSound({ haptics: e.currentTarget.checked })} /> {tr("Vibration")}</label>
    <span class="muted small">{canBuzz ? 'Short buzzes for clicks, catches, level-ups and wins.' : 'Not available on this device (touch screen + browser support needed; iOS Safari has none).'}</span>
  </div>
  <p class="muted small">{tr("Synthesized in the browser — no audio files. Stored on this device.")}</p>
</section>
{/if}

{#if show('catching')}
<section>
  <h3>{t('settings.catching')}</h3>
  <p class="muted small">{tr("A sphere is thrown automatically when you defeat a wild Pal or an Alpha. Choose which one — or none — for species you haven't caught yet and for ones you already own. If the chosen tier is out of stock, the next lower one is thrown.")}</p>
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
  <label class="row"><input type="checkbox" checked={prefs.showOdds} onchange={(e) => prefs.setShowOdds(e.currentTarget.checked)} /> {tr("Show 🎯 catch odds in Pal lists, Paldeck cards and spawn tables")} <span class="muted small">(the arena line and Pal pages always show them; this device only)</span></label>
  <p class="muted small">{tr("Duplicates are what breeding, condensing and the base run on — throwing at them costs spheres, so it starts off. Spheres:")} {#each SPHERE_TIERS as t}{#if (save.inventory[SPHERES[t].itemId] ?? 0) > 0}<span class="chip"><ItemIcon id={SPHERES[t].itemId} size={14} /> {SPHERES[t].name} ×{save.inventory[SPHERES[t].itemId]}</span>{/if}{/each}{#if SPHERE_TIERS.every((t) => !(save.inventory[SPHERES[t].itemId] ?? 0))}{tr("none — buy or craft some")}{/if}</p>
</section>
{/if}

{#if show('language')}
<section>
  <h3>{t('settings.language')}</h3>
  <div class="options">
    {#each LOCALES as l (l.id)}
      <label class="opt" class:on={prefs.lang === l.id}>
        <input type="radio" name="lang" checked={prefs.lang === l.id} onchange={() => prefs.setLang(l.id)} />
        <span><b>{l.label}</b></span>
      </label>
    {/each}
  </div>
  <p class="muted small">{t('settings.languageHint')}</p>
</section>
{/if}

{#if show('keyboard')}
<section>
  <div class="row">
    <h3 class="grow">{t('settings.keyboard')}</h3>
    <button class="small" onclick={() => (ui.shortcutsOpen = true)}>{tr("Show the list")}</button>
  </div>
  <KeyBindings />
</section>
{/if}

{#if show('save')}
<section>
  <h3>{t('settings.save')}</h3>
  <p class="muted small">{tr("Autosaves every 30 s and when you leave. Saves are per browser — use Export / Import to move between the local copy and the hosted one.")}</p>
  <div class="row">
    <button class="small" onclick={() => game.persist()}>{tr("Save now")}</button>
    <button class="small" onclick={doExport}>{tr("Copy save code")}</button>
    <button class="small" onclick={doImport} disabled={!code.trim()}>{tr("Load pasted code")}</button>
    <button class="small" onclick={doLink} title={tr("A link that carries this save; opening it on another device offers to load it")}>{tr("Copy link")}</button>
    <span class="grow"></span>
    <button class="small danger" onclick={doReset}>{tr("Reset game")}</button>
  </div>
  <textarea class="code" bind:value={code} rows="3" placeholder={tr("Your save code appears here — or paste one from another device.")} spellcheck="false" aria-label={tr("Save code")}></textarea>
  {#if codeNote}<div class="muted small">{tr(codeNote)}</div>{/if}
</section>
{/if}

{#if show('about')}
<section>
  <h3>{t('settings.about')}</h3>
  <p class="muted small">{tr("Catcha version")} <code>{version}</code>{version !== 'dev' ? `, built ${new Date(builtAt).toLocaleString()}` : ' (development build)'}{tr(". Changelog v")}{LATEST_VERSION}. New deploys show a reload banner at the top; the hosted copy checks every 30 minutes and whenever you return to the tab.</p>
  <div class="row">
    <button class="small" onclick={() => whatsNew.showAll()}>{tr("What's new")}</button>
    <button class="small" onclick={() => game.restartTutorial()} disabled={!game.save.tutorial.done}>{game.save.tutorial.done ? 'Replay tutorial' : 'Tutorial in progress'}</button>
    <button class="small" onclick={() => (showSteps = !showSteps)} aria-expanded={showSteps}>{showSteps ? 'Hide steps' : 'How to play'}</button>
  </div>
  {#if showSteps}
    <div class="steps"><TutorialSteps /></div>
  {/if}
  <p class="muted small credits">{tr("Catcha is a fan project and is not affiliated with Pocketpair. Palworld, the Pals, the item icons and the world map are © Pocketpair, Inc.; the images come from palworld.wiki.gg, as in the fan wiki, for a free, non-commercial game. Code by Thomas with Claude, MIT-licensed on GitHub.")} <a href="https://github.com/boubou666/Catcha" target="_blank" rel="noopener">github.com/boubou666/Catcha</a></p>
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
  .credits { margin-top: 0.8rem; }
  .credits a { color: var(--accent-2); }
  .sound input[type=range] { flex: 1; min-height: 0; }
  input[type='search'] { min-width: 10rem; flex: 1; max-width: 16rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
  .chip { font-size: 0.8rem; padding: 0.15rem 0.6rem; border-radius: 999px; }
  .chip.on { border-color: var(--accent); color: var(--accent); }
  .policy { display: flex; flex-direction: column; gap: 0.25rem; font-weight: 700; }
  .code { width: 100%; font-family: ui-monospace, monospace; font-size: 0.75rem; margin-top: 0.4rem; resize: vertical; word-break: break-all; }
  .policies { align-items: flex-start; }
  .steps { margin-top: 0.5rem; }
</style>
