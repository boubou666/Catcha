<script lang="ts">
  import { game } from '../state/game.svelte';
  import { dayKey, msUntilRollover } from '../engine/daily';
  import { formatDuration } from './format';
  import type { DailyReset } from '../data/types';
  import { buzz, getPref, hapticsAvailable, play, setPref } from './sfx';
  import { whatsNew } from '../state/whatsnew.svelte';
  import { LATEST_VERSION } from '../data/changelog';

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
</script>

<h2>Settings</h2>

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

<section>
  <h3>Catching</h3>
  <p class="muted small">Sphere policies live under <b>Merchant → Catch settings</b>.</p>
</section>

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

<section>
  <h3>About</h3>
  <p class="muted small">Catcha version <code>{version}</code>{version !== 'dev' ? `, built ${new Date(builtAt).toLocaleString()}` : ' (development build)'}. Changelog v{LATEST_VERSION}. New deploys show a reload banner at the top; the hosted copy checks every 30 minutes and whenever you return to the tab.</p>
  <button class="small" onclick={() => whatsNew.showAll()}>What's new</button>
</section>

<style>
  section { margin-top: 1.25rem; }
  .small { font-size: 0.8rem; }
  .options { display: flex; flex-direction: column; gap: 0.4rem; }
  .opt { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
  .opt.on { border-color: var(--accent); }
  .opt input { margin-top: 0.2rem; }
  .sound { gap: 1.5rem; }
  .sound input[type=range] { flex: 1; min-height: 0; }
</style>
