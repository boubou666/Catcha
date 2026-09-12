import type { DailyReset, RouteDef, SaveState, SpherePolicy, SphereTier } from '../data/types';
import { palById } from '../data/pals';
import { alphaById, regionById, REGIONS, routeById, towerById } from '../data/regions';
import { SPHERES } from '../data/spheres';
import { clearSave, exportSave, importSave, loadState, newState, persist } from '../engine/save';
import { applyDefeat, partyDps, spawnBoss, spawnWild, type Wild } from '../engine/combat';
import { tryCatch } from '../engine/catch';
import { isUnlocked } from '../engine/progress';
import { addToParty, release, removeFromParty } from '../engine/party';
import { clickDamage, wildHp } from '../engine/formulas';
import { assignWorker, build, cancelCraft, enqueue, unassignWorker } from '../engine/base';
import { tickWorld } from '../engine/tick';
import { clearPair, setPair } from '../engine/breeding';
import { research, techMult } from '../engine/tech';
import { bossName, completeRun, describeChest, dungeonUnlocked, isBossWave, spawnFor, startRun, type DungeonRun } from '../engine/dungeon';
import { dungeonById } from '../data/dungeons';
import { itemName } from '../data/items';
import { clearReports, send } from '../engine/expedition';
import { expeditionById } from '../data/expeditions';
import { completeRaid, describeRaidChest, summon, summonBlocker } from '../engine/raid';
import { raidById } from '../data/raids';
import { checkAchievements } from '../engine/achievements';
import { claimBonus, claimQuest, rollDaily, describeQuest, BONUS_EFFIGIES } from '../engine/daily';
import { buyUpgrade, relicsFor } from '../engine/prestige';
import { ascend } from '../engine/ascend';
import { prestigeUpgradeById } from '../data/prestige';
import { earnGold } from '../engine/inventory';
import { techById } from '../data/tech';
import { recipeById, structureById } from '../data/base';
import { applyOffline, type OfflineReport } from '../engine/offline';
import { buy, sell } from '../engine/shop';
import { classifyLog, type LogEntry } from '../engine/logfilter';
import { applyLoadout, deleteLoadout, renameLoadout, saveLoadout, updateLoadout } from '../engine/loadouts';
import { loadToastPref, NOTICE_CAP, TOAST_PREF_KEY, type Notice, type NoticeKind, type ToastPref } from '../engine/notices';
import { advanceTutorial, currentStep, finishTutorial } from '../engine/tutorial';
import { condense } from '../engine/condense';
import { instanceByUid } from '../engine/party';

const AUTOSAVE_MS = 30_000;
const TICK_MS = 100;
const MAX_TICK_MS = 5_000; // anything longer is a suspend/sleep gap and goes through applyOffline
const LOG_LINES = 200;
const WATCH_KEY = 'catcha.watch';
function loadWatched(): Set<number> {
  try { const raw = localStorage.getItem(WATCH_KEY); return new Set(raw ? (JSON.parse(raw) as number[]) : []); } catch { return new Set(); }
}

export type ToastKind = NoticeKind;

export type GameEvent =
  | 'click' | 'defeat' | 'caught' | 'catchFailed' | 'levelUp' | 'bossWin' | 'towerWin' | 'hatched'
  | 'achievement' | 'questClaimed' | 'luckySpawn' | 'summon' | 'realmClear' | 'ascend' | 'craftDone' | 'tutorialStep';

export class Game {
  save = $state<SaveState>(newState());
  wild = $state<Wild | null>(null);
  log = $state<LogEntry[]>([]);

  /** Transient notifications shown by the Toasts component. */
  toasts = $state<{ id: number; text: string; kind: ToastKind }[]>([]);
  private toastSeq = 0;
  /** Every notice is kept in the history; only kinds enabled in the toast preference pop up. */
  notices = $state<Notice[]>([]);
  toastPref = $state<ToastPref>(loadToastPref(typeof localStorage === 'undefined' ? null : localStorage));
  notify(text: string, kind: ToastKind = 'info', ms = 4000) {
    const id = ++this.toastSeq;
    this.notices = [{ id, at: Date.now(), text, kind, read: false }, ...this.notices].slice(0, NOTICE_CAP);
    if (!this.toastPref[kind]) return;
    this.toasts = [...this.toasts, { id, text, kind }].slice(-4);
    setTimeout(() => this.dismissToast(id), ms);
  }
  dismissToast(id: number) { this.toasts = this.toasts.filter((t) => t.id !== id); }
  get unreadNotices(): number { return this.notices.filter((n) => !n.read).length; }
  markNoticesRead() { if (this.notices.some((n) => !n.read)) this.notices = this.notices.map((n) => (n.read ? n : { ...n, read: true })); }
  clearNotices() { this.notices = []; }
  setToastPref(kind: NoticeKind, on: boolean) {
    this.toastPref = { ...this.toastPref, [kind]: on };
    try { localStorage.setItem(TOAST_PREF_KEY, JSON.stringify(this.toastPref)); } catch { /* ignore */ }
  }

  /** Game events for the UI layer (sounds, toasts). Handlers must not throw. */
  private listeners = new Set<(e: GameEvent) => void>();
  on(fn: (e: GameEvent) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(e: GameEvent) { for (const fn of this.listeners) { try { fn(e); } catch { /* ignore */ } } }
  offline = $state<OfflineReport | null>(null);   // "while you were away" summary, until dismissed
  run = $state<DungeonRun | null>(null);           // active Sealed Realm run
  private sinceSave = 0;
  private sinceCheck = 0;

  constructor() {
    const loaded = loadState();
    if (loaded) {
      this.save = loaded;
      this.push('Save loaded.');
      this.catchUp(Date.now() - loaded.lastSavedAt);
    } else {
      this.push('Welcome to the Palpagos Islands. Attack a Pal to begin.');
    }
    rollDaily(this.save);
    this.spawn();
  }

  // ---- derived -----------------------------------------------------------

  get route(): RouteDef { return routeById(this.save.progress.route); }
  get region() { return regionById(this.route.regionId); }
  get dps(): number { return this.wild ? partyDps(this.save, this.wild) : 0; }
  get clickDmg(): number { return clickDamage(this.save.player.level, this.save.player.weaponTier) * techMult(this.save, 'click'); }
  get inBossFight(): boolean { return this.wild?.kind !== 'wild'; }

  // ---- loop --------------------------------------------------------------

  /**
   * Start the simulation loop; returns a stop function.
   * setInterval rather than requestAnimationFrame: rAF stops entirely in background
   * tabs, while intervals keep firing (throttled to ~1/s) and the tick is dt-based.
   */
  start(): () => void {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (dt > MAX_TICK_MS) this.catchUp(dt);   // machine slept / tab frozen: base only, no combat
      else this.tick(dt);
    }, TICK_MS);
    const onHide = () => { if (document.hidden) this.persist(); };
    const onLeave = () => this.persist();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onLeave);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onLeave);
    };
  }

  /** Simulate a gap the live loop didn't cover. Surfaces a report when there's something to show. */
  private catchUp(elapsedMs: number) {
    const report = applyOffline(this.save, elapsedMs);
    if (report) {
      this.offline = report;
      this.persist();
    }
  }

  dismissOffline() { this.offline = null; }

  // ---- tutorial ----------------------------------------------------------

  get tutorialStep() { return currentStep(this.save); }
  skipTutorial() { finishTutorial(this.save); this.persist(); }
  restartTutorial() { this.save.tutorial = { step: 0, done: false }; advanceTutorial(this.save); this.persist(); }

  tick(dtMs: number) {
    const w = this.wild;
    if (w) {
      if (w.deadlineAt && Date.now() > w.deadlineAt) {
        if (this.run) this.endRun('Time ran out');
        else if (w.kind === 'raid') { this.push(`${palById(w.palId).name} withdrew — the slab is spent.`); this.spawn(); }
        else { this.push(`Time's up — ${palById(w.palId).name} retreats.`); this.spawn(); }
      } else {
        this.hit((this.dps * dtMs) / 1000);
      }
    }
    this.save.stats.playSeconds += dtMs / 1000;
    this.sinceCheck += dtMs;
    if (this.sinceCheck >= 1000) {
      this.sinceCheck = 0;
      this.unlockAchievements();
      if (advanceTutorial(this.save)) {
        this.emit('tutorialStep');
        const next = currentStep(this.save);
        if (next) this.notify(`📖 Next: ${next.title}`, 'success');
      }
      if (rollDaily(this.save)) { this.push('A new day — fresh daily quests are up.'); this.notify('📅 New daily quests are up', 'info'); }
    }
    const queued = this.save.base.queue.length;
    const world = tickWorld(this.save, dtMs / 1000);
    if (this.save.base.queue.length < queued) this.emit('craftDone');
    for (const palId of world.hatched) { this.push(`An egg hatched: ${palById(palId).name}!`); this.emit('hatched'); this.notify(`🥚 ${palById(palId).name} hatched!`, 'success'); }
    for (const r of world.returned) this.notify(`${r.success ? '✅' : '❌'} ${expeditionById(r.defId).name}: ${r.success ? 'success' : 'failed'} (+${r.gold.toLocaleString()} gold)`, r.success ? 'gold' : 'warn');
    for (const r of world.returned) this.push(`${expeditionById(r.defId).name}: ${r.success ? 'success' : 'failed'} — +${r.gold.toLocaleString()} gold${Object.keys(r.items).length ? ', ' + Object.entries(r.items).map(([id, n]) => `${n} ${itemName(id)}`).join(', ') : ''}.`);
    this.sinceSave += dtMs;
    if (this.sinceSave >= AUTOSAVE_MS) this.persist();
  }

  click() { this.save.stats.clicks += 1; this.emit('click'); this.hit(this.clickDmg, true); }

  // ---- prestige ----------------------------------------------------------

  buyUpgrade(id: string) {
    if (buyUpgrade(this.save, id)) this.push(`Ancient upgrade: ${prestigeUpgradeById(id).name} Lv ${this.save.prestige.upgrades[id]}.`);
  }

  ascend(keepUids: string[]) {
    const relics = relicsFor(this.save);
    const next = ascend(this.save, keepUids);
    if (!next) return;
    this.save = next;
    this.run = null;
    this.spawn();
    this.persist();
    this.push(`Ascension ${next.prestige.ascensions} — +${relics} Ancient Relics. A new run begins.`);
    this.emit('ascend');
    this.notify(`🏺 Ascension ${next.prestige.ascensions} — +${relics} relics`, 'gold', 6000);
  }

  claimQuest(id: string) {
    const q = claimQuest(this.save, id);
    if (q) { this.emit('questClaimed'); this.notify(`Quest complete: +${q.reward.gold.toLocaleString()} gold`, 'gold'); }
    if (q) this.push(`Quest complete: ${describeQuest(q, (r) => routeById(r).name)} — +${q.reward.gold.toLocaleString()} gold, ${Object.entries(q.reward.items).map(([i, n]) => `${n} ${itemName(i)}`).join(', ')}.`);
  }

  claimBonus() {
    if (claimBonus(this.save)) this.push(`Daily bonus claimed: +${BONUS_EFFIGIES} Effigy.`);
  }

  private unlockAchievements() {
    for (const a of checkAchievements(this.save)) { this.push(`🏆 Achievement: ${a.name} — ${a.desc} (+${a.points} pts)`); this.emit('achievement'); this.notify(`🏆 ${a.name} (+${a.points} pts)`, 'gold', 5000); }
  }

  private hit(dmg: number, byClick = false) {
    const w = this.wild;
    if (!w || dmg <= 0) return;
    w.hp -= dmg;
    if (w.hp <= 0) this.defeat(w, byClick);
  }

  private defeat(w: Wild, byClick = false) {
    const def = palById(w.palId);
    const save = this.save;
    const levelBefore = save.player.level;
    const reward = applyDefeat(save, w);
    if (byClick) this.emit('defeat');   // idle kills stay silent — otherwise it's a thud every few seconds forever
    if (save.player.level > levelBefore) { this.emit('levelUp'); this.notify(`Level ${save.player.level}!`, 'success'); }

    if (w.kind === 'wild' || w.kind === 'dungeon' || w.kind === 'dungeonBoss') {
      if (w.kind === 'wild') save.progress.routeKills[this.route.id] = (save.progress.routeKills[this.route.id] ?? 0) + 1;
      const res = tryCatch(save, w);
      const label = `${w.lucky ? '✨ Lucky ' : ''}${def.name} Lv ${w.level}`;
      if (res.outcome === 'caught') { this.push(`Caught ${label} with a ${SPHERES[res.tier].name}!`); this.emit('caught'); this.notify(`Caught ${label}`, w.lucky ? 'gold' : 'success', w.lucky ? 6000 : 2500); }
      else if (res.outcome === 'failed') { this.push(`${label} broke free (${Math.round(res.chance * 100)}%).`); this.emit('catchFailed'); }
      else if (w.lucky) this.push(`A Lucky ${def.name} got away — no sphere thrown.`);
      if (this.run && w.kind !== 'wild') {
        this.run.gold += reward.gold;
        for (const [id, n] of Object.entries(reward.drops)) this.run.items[id] = (this.run.items[id] ?? 0) + n;
        if (w.kind === 'dungeonBoss') {
          const chest = completeRun(save, dungeonById(this.run.id));
          this.emit('realmClear');
          this.notify(`🗝 ${dungeonById(this.run.id).name} cleared!`, 'gold', 5000);
          this.push(`${dungeonById(this.run.id).name} cleared! Chest: ${describeChest(chest, itemName)}.`);
          this.run = null;
          this.spawn();
        } else {
          this.run.wave += 1;
          this.wild = spawnFor(this.run);
          this.push(isBossWave(this.run) ? `The realm's guardian ${bossName(this.run.id)} appears!` : `Wave ${this.run.wave + 1} / ${dungeonById(this.run.id).waves}`);
        }
        return;
      }
    } else if (w.kind === 'alpha' && w.refId) {
      const alpha = alphaById(w.refId);
      if (!save.progress.alphas.includes(w.refId)) {
        save.progress.alphas.push(w.refId);
        earnGold(save, alpha.reward.gold);
        save.player.effigies += alpha.reward.effigies ?? 0;
        this.push(`Alpha ${def.name} defeated! +${alpha.reward.gold} gold, +${alpha.reward.effigies ?? 0} effigies.`);
        this.emit('bossWin');
        this.notify(`Alpha ${def.name} defeated! +${alpha.reward.gold.toLocaleString()} gold`, 'gold', 5000);
      } else {
        this.push(`Alpha ${def.name} defeated again. +${reward.gold} gold.`);
      }
    } else if (w.kind === 'tower' && w.refId) {
      const tower = towerById(w.refId);
      if (!save.progress.towers.includes(w.refId)) save.progress.towers.push(w.refId);
      this.push(`${tower.boss} defeated — ${tower.name} cleared!`);
      this.emit('towerWin');
      this.notify(`🏰 ${tower.name} cleared!`, 'gold', 6000);
    } else if (w.kind === 'raid' && w.refId) {
      const raid = raidById(w.refId);
      const chest = completeRaid(save, raid);
      this.push(`${raid.name} defeated! ${describeRaidChest(chest, raid.name, itemName)}.`);
      this.emit('towerWin');
      this.notify(`🔮 ${raid.name} defeated — egg in the incubator`, 'gold', 6000);
    }
    this.spawn();
  }

  spawn() {
    this.wild = spawnWild(this.route);
    if (this.wild.lucky) { this.emit('luckySpawn'); this.notify(`✨ A Lucky ${palById(this.wild.palId).name} appeared!`, 'warn', 5000); }
    else if (this.watched.has(this.wild.palId)) this.notify(`👀 ${palById(this.wild.palId).name} is here!`, 'info', 3000);
  }

  // ---- watch list (per device, not part of the save) ----------------------

  watched = $state<Set<number>>(loadWatched());
  toggleWatch(palId: number) {
    const next = new Set(this.watched);
    if (next.has(palId)) next.delete(palId); else next.add(palId);
    this.watched = next;
    try { localStorage.setItem(WATCH_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  }

  // ---- navigation --------------------------------------------------------

  canTravel(routeId: string): boolean { return isUnlocked(this.save, routeById(routeId).unlock); }

  /** Regions whose first route is reachable. */
  get regions() { return REGIONS.filter((r) => this.canTravel(r.routes[0].id)); }

  /** Jump to a region: its furthest unlocked route. */
  travelToRegion(regionId: string) {
    const open = regionById(regionId).routes.filter((r) => this.canTravel(r.id));
    if (open.length) this.travel(open[open.length - 1].id);
  }

  travel(routeId: string) {
    if (!this.canTravel(routeId)) return;
    this.save.progress.route = routeId;
    this.spawn();
  }

  startAlpha(id: string) {
    const a = alphaById(id);
    if (!isUnlocked(this.save, a.unlock)) return;
    this.wild = spawnBoss(a.palId, a.level, wildHp(a.level) * a.hpMult, 'alpha', id);
    this.push(`Alpha ${palById(a.palId).name} appears!`);
  }

  startTower(id: string) {
    const t = towerById(id);
    if (!isUnlocked(this.save, t.unlock)) return;
    this.wild = spawnBoss(t.palId, t.level, t.hp, 'tower', id, Date.now() + t.timeLimitSec * 1000);
    this.push(`${t.boss} — ${t.timeLimitSec / 60} minutes on the clock.`);
  }

  flee() {
    if (this.run) { this.endRun('Retreated'); return; }
    if (this.wild?.kind === 'raid') { this.push(`Retreated from ${palById(this.wild.palId).name} — the slab is spent.`); this.spawn(); return; }
    this.push('Retreated.');
    this.spawn();
  }

  // ---- expeditions -------------------------------------------------------

  sendExpedition(defId: string, uids: string[]): boolean {
    const ok = send(this.save, defId, uids);
    if (ok) this.push(`${uids.length} Pal${uids.length === 1 ? '' : 's'} left for ${expeditionById(defId).name}.`);
    return ok;
  }

  clearReports() { clearReports(this.save); }

  // ---- raids -------------------------------------------------------------

  canSummon(raidId: string): boolean { return !this.run && !this.inBossFight && summonBlocker(this.save, raidId) === null; }

  summonRaid(raidId: string) {
    if (!this.canSummon(raidId)) return;
    const boss = summon(this.save, raidId);
    if (!boss) return;
    this.wild = boss;
    const def = raidById(raidId);
    this.push(`${def.name} answers the altar — ${(def.hp / 1000).toLocaleString()}k HP, ${def.timeLimitSec / 60} minutes.`);
    this.emit('summon');
  }

  // ---- dungeons ----------------------------------------------------------

  canEnter(dungeonId: string): boolean { return !this.run && !this.inBossFight && dungeonUnlocked(this.save, dungeonId); }

  enterDungeon(dungeonId: string) {
    if (!this.canEnter(dungeonId)) return;
    this.run = startRun(dungeonId);
    this.wild = spawnFor(this.run);
    const def = dungeonById(dungeonId);
    this.push(`Entered ${def.name} — ${def.waves} waves and ${bossName(dungeonId)} in ${def.timeLimitSec / 60} minutes.`);
  }

  private endRun(why: string) {
    const run = this.run!;
    const earned = run.gold > 0 || Object.keys(run.items).length > 0;
    this.push(`${why} — left ${dungeonById(run.id).name}${earned ? ` with ${run.gold} gold and ${Object.values(run.items).reduce((a, b) => a + b, 0)} items` : ''}.`);
    this.run = null;
    this.spawn();
  }

  // ---- party / box -------------------------------------------------------

  addToParty(uid: string) { addToParty(this.save, uid); }

  // ---- loadouts ----------------------------------------------------------

  saveLoadout(name: string): boolean {
    const lo = saveLoadout(this.save, name);
    if (lo) { this.push(`Saved party as “${lo.name}”.`); this.notify(`💾 Loadout “${lo.name}” saved`, 'success', 2500); }
    return !!lo;
  }
  updateLoadout(id: string) { if (updateLoadout(this.save, id)) this.notify('💾 Loadout updated', 'success', 2000); }
  renameLoadout(id: string, name: string) { renameLoadout(this.save, id, name); }
  deleteLoadout(id: string) { deleteLoadout(this.save, id); }
  applyLoadout(id: string) {
    const r = applyLoadout(this.save, id);
    if (!r) return;
    const lo = this.save.loadouts.find((l) => l.id === id)!;
    this.push(`Loaded party “${lo.name}” (${r.added.length} joined${r.skipped.length ? `, ${r.skipped.length} unavailable` : ''}).`);
    this.notify(r.skipped.length ? `⚠️ “${lo.name}”: ${r.skipped.length} member${r.skipped.length === 1 ? '' : 's'} unavailable` : `✅ Party “${lo.name}” loaded`, r.skipped.length ? 'warn' : 'success', 3000);
  }
  removeFromParty(uid: string) { removeFromParty(this.save, uid); }
  release(uid: string) { release(this.save, uid); }

  // ---- base --------------------------------------------------------------

  assignWorker(uid: string) { assignWorker(this.save, uid); }
  unassignWorker(uid: string) { unassignWorker(this.save, uid); }

  build(id: string) {
    if (!build(this.save, id)) return;
    const level = this.save.base.structures[id];
    this.push(`Built ${structureById(id).name}${level > 1 ? ` Lv ${level}` : ''}.`);
  }

  craft(recipeId: string, n: number) {
    const queued = enqueue(this.save, recipeId, n);
    if (queued > 0) this.push(`Queued ${queued}× ${recipeById(recipeId).name}.`);
  }

  cancelCraft(index: number) { cancelCraft(this.save, index); }

  setPair(aUid: string, bUid: string) {
    if (setPair(this.save, aUid, bUid)) {
      const a = instanceByUid(this.save, aUid)!; const b = instanceByUid(this.save, bUid)!;
      this.push(`${palById(a.palId).name} and ${palById(b.palId).name} moved to the Breeding Farm.`);
    }
  }

  clearPair() { clearPair(this.save); }

  research(techId: string) {
    if (research(this.save, techId)) this.push(`Researched ${techById(techId).name}.`);
  }

  condense(uid: string) {
    const fed = condense(this.save, uid);
    const target = instanceByUid(this.save, uid);
    if (!fed || !target) return;
    this.push(`${palById(target.palId).name} condensed to ${'★'.repeat(target.stars)} (${fed.length} ${palById(target.palId).name}s consumed).`);
  }

  // ---- merchant / settings ----------------------------------------------

  sphereAvailable(tier: SphereTier): boolean {
    const s = SPHERES[tier];
    return s.price !== null && isUnlocked(this.save, s.unlock);
  }

  buySphere(tier: SphereTier, n = 1): boolean {
    return this.buyItem(SPHERES[tier].itemId, n);
  }

  buyItem(itemId: string, n = 1): boolean {
    const got = buy(this.save, itemId, n);
    if (got > 0) this.push(`Bought ${got} ${itemName(itemId)}.`);
    return got > 0;
  }

  sellItem(itemId: string, n = 1): boolean {
    const gold = sell(this.save, itemId, n);
    if (gold > 0) { this.push(`Sold ${itemName(itemId)} for ${gold.toLocaleString()} gold.`); this.notify(`💰 +${gold.toLocaleString()} gold`, 'gold', 2500); }
    return gold > 0;
  }

  setDailyReset(mode: DailyReset) {
    this.save.settings.dailyReset = mode;
    if (rollDaily(this.save)) this.push('Daily quests re-rolled for the new reset time.');
  }

  setSpherePolicy(kind: 'new' | 'dupe', policy: SpherePolicy) {
    if (kind === 'new') this.save.settings.sphereForNew = policy;
    else this.save.settings.sphereForDupe = policy;
  }

  // ---- persistence -------------------------------------------------------

  persist() {
    persist(this.save);
    this.sinceSave = 0;
  }

  exportString(): string { return exportSave(this.save); }

  importString(encoded: string): boolean {
    const s = importSave(encoded);
    if (!s) return false;
    this.save = s;
    this.spawn();
    this.persist();
    this.push('Save imported.');
    return true;
  }

  reset() {
    clearSave();
    this.save = newState();
    this.log = [];
    this.spawn();
    this.push('New game.');
  }

  private push(text: string) {
    this.log = [{ at: Date.now(), kind: classifyLog(text), text }, ...this.log].slice(0, LOG_LINES);
  }
}

export const game = new Game();
