import type { Requirement, RouteDef, SaveState } from '../data/types';
import { alphaById, routeById, towerById } from '../data/regions';
import { palById } from '../data/pals';

export function routeKills(save: SaveState, routeId: string): number {
  return save.progress.routeKills[routeId] ?? 0;
}

export function routeCleared(save: SaveState, route: RouteDef): boolean {
  return routeKills(save, route.id) >= route.killsToClear;
}

export function isUnlocked(save: SaveState, req: Requirement): boolean {
  switch (req.kind) {
    case 'none': return true;
    case 'routeCleared': return routeCleared(save, routeById(req.id));
    case 'alpha': return save.progress.alphas.includes(req.id);
    case 'tower': return save.progress.towers.includes(req.id);
    case 'level': return save.player.level >= req.n;
    case 'all': return req.of.every((r) => isUnlocked(save, r));
  }
}

export function describeRequirement(req: Requirement): string {
  switch (req.kind) {
    case 'none': return '';
    case 'routeCleared': return `Clear ${routeById(req.id).name}`;
    case 'alpha': return `Defeat Alpha ${palById(alphaById(req.id).palId).name}`;
    case 'tower': return `Clear ${towerById(req.id).name}`;
    case 'level': return `Reach level ${req.n}`;
    case 'all': return req.of.map(describeRequirement).join(' + ');
  }
}
