import type { PalInstance, SaveState } from '../data/types';
import { expToLevel, PARTY_SIZE } from './formulas';

let uidCounter = 0;
export function newUid(): string {
  return `${Date.now().toString(36)}-${(uidCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeInstance(palId: number, level: number, lucky = false): PalInstance {
  return { uid: newUid(), palId, level, exp: 0, stars: 0, lucky, passives: [] };
}

export function addToBox(save: SaveState, inst: PalInstance): void {
  save.box.push(inst);
  const entry = (save.paldeck[inst.palId] ??= { seen: true, caught: 0 });
  entry.seen = true;
  entry.caught += 1;
  // Auto-fill the party while there's room so the first catches immediately help.
  if (save.party.length < PARTY_SIZE) save.party.push(inst.uid);
}

export function instanceByUid(save: SaveState, uid: string): PalInstance | undefined {
  return save.box.find((p) => p.uid === uid);
}

export function partyInstances(save: SaveState): PalInstance[] {
  return save.party
    .map((uid) => instanceByUid(save, uid))
    .filter((p): p is PalInstance => !!p);
}

/** Feed exp to the player and every party member; applies level-ups. Returns names that levelled. */
export function grantExp(save: SaveState, amount: number): PalInstance[] {
  save.player.exp += amount;
  while (save.player.exp >= expToLevel(save.player.level + 1)) {
    save.player.exp -= expToLevel(save.player.level + 1);
    save.player.level += 1;
    save.player.techPoints += 1;
  }
  const levelled: PalInstance[] = [];
  for (const inst of partyInstances(save)) {
    inst.exp += amount;
    let up = false;
    while (inst.exp >= expToLevel(inst.level + 1)) {
      inst.exp -= expToLevel(inst.level + 1);
      inst.level += 1;
      up = true;
    }
    if (up) levelled.push(inst);
  }
  return levelled;
}

export function addToParty(save: SaveState, uid: string): boolean {
  if (save.party.length >= PARTY_SIZE || save.party.includes(uid) || !instanceByUid(save, uid)) return false;
  save.party.push(uid);
  return true;
}

export function removeFromParty(save: SaveState, uid: string): void {
  save.party = save.party.filter((u) => u !== uid);
}

export function release(save: SaveState, uid: string): void {
  removeFromParty(save, uid);
  save.box = save.box.filter((p) => p.uid !== uid);
}
