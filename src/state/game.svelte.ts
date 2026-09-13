import type { DailyReset, RouteDef, SaveState, SpherePolicy, SphereTier } from '../data/types';
import { palById } from '../data/pals';
import { regionById, REGIONS, routeById } from '../data/regions';
import { rivalsOf } from '../data/rivals';
import { SPHERES } from '../data/spheres';
import { clearSave, decodeSaveCode, encodeSaveCode, exportSave, importSave, loadState, newState, persist } from '../engine/save';
import { partyDps, spawnWild, type Wild } from '../engine/combat';
import { catchPreview } from '../engine/catch';
import { isUnlocked } from '../engine/progress';
import { addToParty, release, removeFromParty } from '../engine/party';
import { clickDamage, LUCKY_CHANCE, LUCKY_HP_MULT } from '../engine/formulas';
import { assignWorker, cancelCraft, unassignWorker } from '../engine/base';
import { tickWorld } from '../engine/tick';
import { clearPair } from '../engine/breeding';
import { techMult } from '../engine/tech';
import { type DungeonRun } from '../engine/dungeon';
import { dungeonById, dungeonsOf } from '../data/dungeons';
import { itemName } from '../data/items';
import { clearReports, send } from '../engine/expedition';
import { expeditionById } from '../data/expeditions';
import { raidById, RAIDS } from '../data/raids';
import { checkAchievements } from '../engine/achievements';
import { claimAll, claimBonus, claimQuest, rollDaily, describeQuest, BONUS_EFFIGIES } from '../engine/daily';
import { buyUpgrade, relicsFor } from '../engine/prestige';
import { ascend } from '../engine/ascend';
import { prestigeUpgradeById } from '../data/prestige';
import { applyOffline, type OfflineReport } from '../engine/offline';
import { classifyLog, fillTemplate, type LogMessage, type LogEntry } from '../engine/logfilter';
import { resolveDefeat } from './defeat';
import { canRaid, nextRaidDelay, rollRaidFor, tickRaid } from '../engine/baseraid';
import { rematchInfo } from '../engine/rematch';
import { activeMods, claimChallenge, countChallengeKill, todaysChallenge } from '../engine/challenge';
import { canDuel, canEnter, canSummon, endDuel, endRun, enterDungeon, flee, startAlpha, startDuel, startTower, summonRaid } from './encounters';
import type { Duel } from '../engine/rival';
import { chargeSkills, skillDamage } from '../engine/skills';
import { canFound, found, post, recall, tickOutposts } from '../engine/outpost';
import { partyInstances } from '../engine/party';
import { build, buyItem, cancelCraftAll, condense, craft, research, sellItem, setPair, sphereAvailable } from './economy';
import { applyLoadout, deleteLoadout, renameLoadout, saveLoadout, updateLoadout } from '../engine/loadouts';
import { bulkAssign, bulkParty, bulkRelease, describeBulk, type BulkResult } from '../engine/bulk';
import { loadToastPref, NOTICE_CAP, TOAST_PREF_KEY, type Notice, type NoticeKind, type ToastPref } from '../engine/notices';
import { advanceTutorial, currentStep, finishTutorial } from '../engine/tutorial';
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
  | 'achievement' | 'questClaimed' | 'luckySpawn' | 'summon' | 'realmClear' | 'ascend' | 'craftDone' | 'tutorialStep' | 'raidAlarm' | 'skill';

export class Game {
  save = $state<SaveState>(newState());
  wild = $state<Wild | null>(null);
  log = $state<LogEntry[]>([]);

  /** Transient notifications shown by the Toasts component. */
  toasts = $state<{ id: number; text: string; kind: ToastKind; msg?: LogMessage }[]>([]);
  private toastSeq = 0;
  /** Every notice is kept in the history; only kinds enabled in the toast preference pop up. */
  notices = $state<Notice[]>([]);
  toastPref = $state<ToastPref>(loadToastPref(typeof localStorage === 'undefined' ? null : localStorage));
  notify(text: string, kind: ToastKind = 'info', ms = 4000, msg?: LogMessage) {
    const id = ++this.toastSeq;
    this.notices = [{ id, at: Date.now(), text, kind, read: false, ...(msg ? { msg } : {}) }, ...this.notices].slice(0, NOTICE_CAP);
    if (!this.toastPref[kind]) return;
    this.toasts = [...this.toasts, { id, text, kind, ...(msg ? { msg } : {}) }].slice(-4);
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
  emit(e: GameEvent) { for (const fn of this.listeners) { try { fn(e); } catch { /* ignore */ } } }
  offline = $state<OfflineReport | null>(null);   // "while you were away" summary, until dismissed
  run = $state<DungeonRun | null>(null);           // active Sealed Realm run
  duel = $state<Duel | null>(null);                 // a rival duel in progress
  /** Skill charge per party Pal (seconds), not saved. */
  charges = $state<Record<string, number>>({});
  /** Stats at the start of this session, for the "this session" rows. */
  sessionStart = structuredClone($state.snapshot(this.save.stats));
  private sinceSave = 0;
  private sinceCheck = 0;

  constructor() {
    const loaded = loadState();
    if (loaded) {
      this.save = loaded;
      this.pushT('Save loaded.');
      this.catchUp(Date.now() - loaded.lastSavedAt);
    } else {
      this.pushT('Welcome to the Palpagos Islands. Attack a Pal to begin.');
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
  get nextRival(): string | null { return rivalsOf(this.region.id).find((r) => this.canDuel(r.id))?.id ?? null; }
  /** The play clock rounded to the second: views that show countdowns read this instead of stats.playSeconds, so they re-render once a second, not ten times. */
  playSecond = $derived(Math.floor(this.save.stats.playSeconds));

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
        else if (this.duel) endDuel(this, false);
        else if (w.kind === 'raid') { this.pushT('{pal} withdrew — the slab is spent.', { pal: palById(w.palId).name }); this.spawn(); }
        else { this.pushT("Time's up — {pal} retreats.", { pal: palById(w.palId).name }); this.spawn(); }
      } else {
        this.hit((this.dps * dtMs) / 1000);
        // active skills: charge, fire the ready ones
        for (const uid of chargeSkills(this.charges, partyInstances(this.save), dtMs / 1000)) this.fireSkill(uid);
      }
    }
    this.save.stats.playSeconds += dtMs / 1000;
    this.tickBaseRaid(dtMs / 1000);
    this.sinceCheck += dtMs;
    if (this.sinceCheck >= 1000) {
      this.sinceCheck = 0;
      this.unlockAchievements();
      if (advanceTutorial(this.save)) {
        this.emit('tutorialStep');
        const next = currentStep(this.save);
        if (next) this.notify(`📖 Next: ${next.title}`, 'success');
      }
      if (rollDaily(this.save)) { this.pushT('A new day — fresh daily quests are up.'); this.notifyT('📅 New daily quests are up', {}, 'info'); }
    }
    const queued = this.save.base.queue.length;
    tickOutposts(this.save, dtMs / 1000);
    const world = tickWorld(this.save, dtMs / 1000);
    if (this.save.base.queue.length < queued) this.emit('craftDone');
    for (const palId of world.hatched) { this.pushT('An egg hatched: {pal}!', { pal: palById(palId).name }); this.emit('hatched'); this.notifyT('🥚 {pal} hatched!', { pal: palById(palId).name }, 'success'); }
    for (const r of world.returned) this.notify(`${r.success ? '✅' : '❌'} ${expeditionById(r.defId).name}: ${r.success ? 'success' : 'failed'} (+${r.gold.toLocaleString()} gold)`, r.success ? 'gold' : 'warn');
    for (const r of world.returned) this.push(`${expeditionById(r.defId).name}: ${r.success ? 'success' : 'failed'} — +${r.gold.toLocaleString()} gold${Object.keys(r.items).length ? ', ' + Object.entries(r.items).map(([id, n]) => `${n} ${itemName(id)}`).join(', ') : ''}.`);
    this.sinceSave += dtMs;
    if (this.sinceSave >= AUTOSAVE_MS) this.persist();
  }

  click() { this.save.stats.clicks += 1; this.emit('click'); this.hit(this.clickDmg, true); }

  // ---- base raids --------------------------------------------------------

  private tickBaseRaid(dtSec: number) {
    const base = this.save.base;
    if (base.raid) {
      const out = tickRaid(this.save, base.raid, dtSec);
      if (!out) return;
      const name = palById(base.raid.palId).name;
      const rec = { at: Date.now(), palId: base.raid.palId, level: base.raid.level, outcome: out.kind, gold: out.kind === 'repelled' ? out.gold : 0, stolen: out.kind === 'failed' ? Object.values(out.stolen).reduce((a, b) => a + b, 0) : 0 };
      base.raidLog = [rec, ...base.raidLog].slice(0, 10);
      base.raid = null;
      base.nextRaidAt = this.save.stats.playSeconds + nextRaidDelay();
      if (out.kind === 'repelled') {
        const loot = Object.entries(out.drops).map(([id, n]) => `${n} ${itemName(id)}`).join(', ') || '—';
        this.pushT('Raid repelled! {pal} fled — +{gold} gold, {loot}.', { pal: name, gold: out.gold, loot });
        if (out.catchResult.outcome === 'caught') this.pushT('The raider {pal} was caught with a {sphere}!', { pal: name, sphere: SPHERES[out.catchResult.tier].name }, { chance: out.catchResult.chance, landed: true });
        else if (out.catchResult.outcome === 'failed') this.pushT('{pal} broke free.', { pal: name }, { chance: out.catchResult.chance, landed: false });
        this.emit('bossWin');
        this.notifyT('🛡 Raid repelled — {pal} fled', { pal: name }, 'gold', 5000);
      } else {
        const list = Object.entries(out.stolen).map(([id, n]) => `${n} ${itemName(id)}`).join(', ');
        if (list) { this.pushT('The base fell to {pal}: {stolen} stolen, the workers are shaken.', { pal: name, stolen: list }); this.notifyT('🚨 {pal} raided the base — {stolen} stolen', { pal: name, stolen: list }, 'warn', 6000); }
        else { this.pushT('The base fell to {pal} — nothing worth taking, but the workers are shaken.', { pal: name }); this.notifyT('🚨 {pal} raided the base — nothing taken, workers shaken', { pal: name }, 'warn', 6000); }
      }
      return;
    }
    if (this.save.stats.playSeconds >= base.nextRaidAt) {
      if (!canRaid(this.save)) { base.nextRaidAt = this.save.stats.playSeconds + 60; return; }
      base.raid = rollRaidFor(this.save, this.route);
      this.emit('raidAlarm');
      const name = palById(base.raid.palId).name;
      this.pushT('🚨 {pal} Lv {level} is raiding the base! The workers fight back — rally the party from the Base tab.', { pal: name, level: base.raid.level });
      this.notifyT('🚨 {pal} is raiding the base!', { pal: name }, 'warn', 8000);
    }
  }

  /** Send the party to the base for the rest of the raid. */
  rally() {
    if (!this.save.base.raid || this.save.base.raid.rallied) return;
    this.save.base.raid.rallied = true;
    this.pushT('The party rushes to the base.');
  }

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
    this.duel = null;
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

  /** Shortcut: claim everything that is ready today. */
  claimAllQuests() {
    const r = claimAll(this.save);
    if (r.quests.length === 0 && !r.bonus) { this.notify('No finished quest to claim', 'info', 2000); return; }
    for (const q of r.quests) this.push(`Quest complete: ${describeQuest(q, (id) => routeById(id).name)} (+${q.reward.gold.toLocaleString()} gold).`);
    if (r.bonus) this.pushT('Daily bonus claimed: +{n} Effigy.', { n: BONUS_EFFIGIES });
    this.emit('questClaimed');
    this.notify(`✅ Claimed ${r.quests.length} quest${r.quests.length === 1 ? '' : 's'}${r.bonus ? ' + the daily bonus' : ''}`, 'gold', 3500);
  }

  /** Shortcut targets in the current region: next unbeaten Alpha (else the first open one), the tower, the realm, the first summonable raid. */
  get nextAlpha(): string | null {
    const open = this.region.alphas.filter((a) => isUnlocked(this.save, a.unlock) && rematchInfo(this.save, a).ready);
    return (open.find((a) => !this.save.progress.alphas.includes(a.id)) ?? open[0])?.id ?? null;
  }
  get nextRealm(): string | null { return dungeonsOf(this.region.id).find((d) => this.canEnter(d.id))?.id ?? null; }
  get nextRaid(): string | null { return RAIDS.find((r) => this.canSummon(r.id))?.id ?? null; }

  claimBonus() {
    if (claimBonus(this.save)) this.pushT('Daily bonus claimed: +{n} Effigy.', { n: BONUS_EFFIGIES });
  }

  private unlockAchievements() {
    for (const a of checkAchievements(this.save)) { this.push(`🏆 Achievement: ${a.name} — ${a.desc} (+${a.points} pts)`); this.emit('achievement'); this.notify(`🏆 ${a.name} (+${a.points} pts)`, 'gold', 5000); }
  }

  /** Fire one party Pal's skill at the wild Pal if it is charged. */
  fireSkill(uid: string) {
    const inst = partyInstances(this.save).find((p) => p.uid === uid);
    if (!inst || !this.wild || (this.charges[uid] ?? 0) < 20) return;
    this.charges[uid] = 0;
    this.emit('skill');
    this.hit(skillDamage(this.save, inst, this.wild));
  }

  private hit(dmg: number, byClick = false) {
    const w = this.wild;
    if (!w || dmg <= 0) return;
    w.hp -= dmg;
    if (w.hp <= 0) this.defeat(w, byClick);
  }

  private defeat(w: Wild, byClick = false) { resolveDefeat(this, w, byClick); }

  spawn() {
    this.wild = spawnWild(this.route);
    const mods = activeMods(this.save);
    if (mods) {
      if (!this.wild.lucky && mods.luckyMult > 1 && Math.random() < LUCKY_CHANCE * (mods.luckyMult - 1)) { this.wild.lucky = true; this.wild.maxHp *= LUCKY_HP_MULT; this.wild.hp = this.wild.maxHp; }
      this.wild.maxHp = Math.round(this.wild.maxHp * mods.hpMult); this.wild.hp = this.wild.maxHp;
    }
    if (this.wild.lucky) { this.emit('luckySpawn'); this.notifyT('✨ A Lucky {pal} appeared!', { pal: palById(this.wild.palId).name }, 'warn', 5000); }
    else if (this.watched.has(this.wild.palId)) { const pv = catchPreview(this.save, this.wild.palId, this.wild.lucky, this.wild.kind === 'alpha'); this.notify(`👀 ${palById(this.wild.palId).name} is here!${pv.throws ? ` 🎯 ${Math.round(pv.chance * 100)}%` : ''}`, 'info', 3000); }
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

  startAlpha(id: string) { startAlpha(this, id); }
  startTower(id: string) { startTower(this, id); }
  flee() { flee(this); }

  // ---- expeditions -------------------------------------------------------

  sendExpedition(defId: string, uids: string[]): boolean {
    const ok = send(this.save, defId, uids);
    if (ok) this.pushT('{n} Pal(s) left for {expedition}.', { n: uids.length, expedition: expeditionById(defId).name });
    return ok;
  }

  clearReports() { clearReports(this.save); }

  // ---- raids / realms (see encounters.ts) --------------------------------

  canSummon(raidId: string): boolean { return canSummon(this, raidId); }
  summonRaid(raidId: string) { summonRaid(this, raidId); }
  canEnter(dungeonId: string): boolean { return canEnter(this, dungeonId); }
  enterDungeon(dungeonId: string) { enterDungeon(this, dungeonId); }
  private endRun(why: string) { endRun(this, why); }
  canDuel(rivalId: string): boolean { return canDuel(this, rivalId); }
  startDuel(rivalId: string) { startDuel(this, rivalId); }

  // ---- outposts ----------------------------------------------------------

  canFoundOutpost(regionId: string): boolean { return canFound(this.save, regionId); }
  foundOutpost(regionId: string) { if (found(this.save, regionId)) this.pushT('Outpost founded in {region}.', { region: regionById(regionId).name }); }
  postToOutpost(regionId: string, uid: string) { const o = this.save.outposts.find((x) => x.regionId === regionId); if (o && post(this.save, o, uid)) this.removeFromParty(uid); }
  recallFromOutpost(regionId: string, uid: string) { const o = this.save.outposts.find((x) => x.regionId === regionId); if (o) recall(o, uid); }

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

  // ---- bulk actions on a Box selection --------------------------------------

  bulkRelease(uids: string[]) { const r = bulkRelease(this.save, uids); this.bulkReport(r, 'released', 'warn'); return r; }
  bulkAssign(uids: string[]) { const r = bulkAssign(this.save, uids); this.bulkReport(r, 'sent to the base', 'success'); return r; }
  bulkParty(uids: string[]) { const r = bulkParty(this.save, uids); this.bulkReport(r, 'added to the party', 'success'); return r; }
  private bulkReport(r: BulkResult, verb: string, kind: ToastKind) {
    const text = describeBulk(r, verb);
    this.push(`Bulk: ${text}.`);
    this.notify(`${r.done.length ? (kind === 'warn' ? '🗑' : '✅') : '⚠️'} ${text}`, r.done.length ? kind : 'warn', 4000);
  }

  // ---- base --------------------------------------------------------------

  assignWorker(uid: string) { assignWorker(this.save, uid); }
  unassignWorker(uid: string) { unassignWorker(this.save, uid); }

  build(id: string) { build(this, id); }
  craft(recipeId: string, n: number) { craft(this, recipeId, n); }
  cancelCraft(index: number) { cancelCraft(this.save, index); }
  cancelCraftAll(recipeId?: string) { cancelCraftAll(this, recipeId); }
  setPair(aUid: string, bUid: string) { setPair(this, aUid, bUid); }
  clearPair() { clearPair(this.save); }
  research(techId: string) { research(this, techId); }
  condense(uid: string) { condense(this, uid); }

  // ---- merchant / settings (see economy.ts) -----------------------------

  sphereAvailable(tier: SphereTier): boolean { return sphereAvailable(this.save, tier); }
  buySphere(tier: SphereTier, n = 1): boolean { return buyItem(this, SPHERES[tier].itemId, n); }
  buyItem(itemId: string, n = 1): boolean { return buyItem(this, itemId, n); }
  sellItem(itemId: string, n = 1): boolean { return sellItem(this, itemId, n); }

  setDailyReset(mode: DailyReset) {
    this.save.settings.dailyReset = mode;
    if (rollDaily(this.save)) this.pushT('Daily quests re-rolled for the new reset time.');
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
  /** Compact code for pasting into another device; see decodeSaveCode. */
  saveCode(): Promise<string> { return encodeSaveCode(this.save); }
  async importCode(code: string): Promise<boolean> {
    const s = await decodeSaveCode(code);
    if (!s) return false;
    this.save = s;
    this.run = null;
    this.spawn();
    this.persist();
    this.pushT('Save imported.');
    return true;
  }

  importString(encoded: string): boolean {
    const s = importSave(encoded);
    if (!s) return false;
    this.save = s;
    this.spawn();
    this.persist();
    this.pushT('Save imported.');
    return true;
  }

  reset() {
    clearSave();
    this.save = newState();
    this.log = [];
    this.spawn();
    this.pushT('New game.');
  }

  push(text: string, extra: { chance?: number; landed?: boolean } = {}, msg?: LogMessage) {
    this.log = [{ at: Date.now(), kind: classifyLog(text), text, ...extra, ...(msg ? { msg } : {}) }, ...this.log].slice(0, LOG_LINES);
  }
  notifyT(key: string, vars: Record<string, string | number> = {}, kind: ToastKind = 'info', ms = 4000) {
    this.notify(fillTemplate(key, vars), kind, ms, { key, vars });
  }
  /** push() from a template: the English text is built here, the template travels with the entry for translation. */
  pushT(key: string, vars: Record<string, string | number> = {}, extra: { chance?: number; landed?: boolean } = {}) {
    this.push(fillTemplate(key, vars), extra, { key, vars });
  }
}

export const game = new Game();
