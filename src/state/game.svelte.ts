import type { RouteDef, SaveState, SpherePolicy, SphereTier } from '../data/types';
import { palById } from '../data/pals';
import { alphaById, regionById, routeById, towerById } from '../data/regions';
import { SPHERES } from '../data/spheres';
import { clearSave, exportSave, importSave, loadState, newState, persist } from '../engine/save';
import { applyDefeat, partyDps, spawnBoss, spawnWild, type Wild } from '../engine/combat';
import { tryCatch } from '../engine/catch';
import { isUnlocked } from '../engine/progress';
import { addToParty, release, removeFromParty } from '../engine/party';
import { clickDamage, wildHp } from '../engine/formulas';
import { assignWorker, build, cancelCraft, enqueue, tickBase, unassignWorker } from '../engine/base';
import { recipeById, structureById } from '../data/base';
import { applyOffline, type OfflineReport } from '../engine/offline';

const AUTOSAVE_MS = 30_000;
const TICK_MS = 100;
const MAX_TICK_MS = 5_000; // anything longer is a suspend/sleep gap and goes through applyOffline
const LOG_LINES = 12;

export class Game {
  save = $state<SaveState>(newState());
  wild = $state<Wild | null>(null);
  log = $state<string[]>([]);
  offline = $state<OfflineReport | null>(null);   // "while you were away" summary, until dismissed
  private sinceSave = 0;

  constructor() {
    const loaded = loadState();
    if (loaded) {
      this.save = loaded;
      this.push('Save loaded.');
      this.catchUp(Date.now() - loaded.lastSavedAt);
    } else {
      this.push('Welcome to the Palpagos Islands. Attack a Pal to begin.');
    }
    this.spawn();
  }

  // ---- derived -----------------------------------------------------------

  get route(): RouteDef { return routeById(this.save.progress.route); }
  get region() { return regionById(this.route.regionId); }
  get dps(): number { return this.wild ? partyDps(this.save, this.wild) : 0; }
  get clickDmg(): number { return clickDamage(this.save.player.level, this.save.player.weaponTier); }
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

  tick(dtMs: number) {
    const w = this.wild;
    if (w) {
      if (w.deadlineAt && Date.now() > w.deadlineAt) {
        this.push(`Time's up — ${palById(w.palId).name} retreats.`);
        this.spawn();
      } else {
        this.hit((this.dps * dtMs) / 1000);
      }
    }
    tickBase(this.save, dtMs / 1000);
    this.sinceSave += dtMs;
    if (this.sinceSave >= AUTOSAVE_MS) this.persist();
  }

  click() { this.hit(this.clickDmg); }

  private hit(dmg: number) {
    const w = this.wild;
    if (!w || dmg <= 0) return;
    w.hp -= dmg;
    if (w.hp <= 0) this.defeat(w);
  }

  private defeat(w: Wild) {
    const def = palById(w.palId);
    const save = this.save;
    const reward = applyDefeat(save, w);

    if (w.kind === 'wild') {
      save.progress.routeKills[this.route.id] = (save.progress.routeKills[this.route.id] ?? 0) + 1;
      const res = tryCatch(save, w);
      const label = `${w.lucky ? '✨ Lucky ' : ''}${def.name} Lv ${w.level}`;
      if (res.outcome === 'caught') this.push(`Caught ${label} with a ${SPHERES[res.tier].name}!`);
      else if (res.outcome === 'failed') this.push(`${label} broke free (${Math.round(res.chance * 100)}%).`);
      else if (w.lucky) this.push(`A Lucky ${def.name} got away — no sphere thrown.`);
    } else if (w.kind === 'alpha' && w.refId) {
      const alpha = alphaById(w.refId);
      if (!save.progress.alphas.includes(w.refId)) {
        save.progress.alphas.push(w.refId);
        save.player.gold += alpha.reward.gold;
        save.player.effigies += alpha.reward.effigies ?? 0;
        this.push(`Alpha ${def.name} defeated! +${alpha.reward.gold} gold, +${alpha.reward.effigies ?? 0} effigies.`);
      } else {
        this.push(`Alpha ${def.name} defeated again. +${reward.gold} gold.`);
      }
    } else if (w.kind === 'tower' && w.refId) {
      const tower = towerById(w.refId);
      if (!save.progress.towers.includes(w.refId)) save.progress.towers.push(w.refId);
      this.push(`${tower.boss} defeated — ${tower.name} cleared!`);
    }
    this.spawn();
  }

  spawn() { this.wild = spawnWild(this.route); }

  // ---- navigation --------------------------------------------------------

  canTravel(routeId: string): boolean { return isUnlocked(this.save, routeById(routeId).unlock); }

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
    this.push('Retreated.');
    this.spawn();
  }

  // ---- party / box -------------------------------------------------------

  addToParty(uid: string) { addToParty(this.save, uid); }
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

  // ---- merchant / settings ----------------------------------------------

  sphereAvailable(tier: SphereTier): boolean {
    const s = SPHERES[tier];
    return s.price !== null && isUnlocked(this.save, s.unlock);
  }

  buySphere(tier: SphereTier, n = 1): boolean {
    const s = SPHERES[tier];
    if (!this.sphereAvailable(tier) || s.price === null) return false;
    const cost = s.price * n;
    if (this.save.player.gold < cost) return false;
    this.save.player.gold -= cost;
    this.save.inventory[s.itemId] = (this.save.inventory[s.itemId] ?? 0) + n;
    return true;
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

  private push(line: string) {
    this.log = [line, ...this.log].slice(0, LOG_LINES);
  }
}

export const game = new Game();
