// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import ArenaPanel from './ArenaPanel.svelte';
import { game } from '../state/game.svelte';
import { newState } from '../engine/save';
import { spawnBoss } from '../engine/combat';

describe('ArenaPanel catch line', () => {
  beforeEach(() => { cleanup(); game.save = newState(); game.save.inventory.sphere_pal = 5; });

  it('names the sphere and the odds for a wild Pal', () => {
    game.wild = { palId: 1, level: 1, hp: 35, maxHp: 35, lucky: false, kind: 'wild' };
    const { container } = render(ArenaPanel);
    expect(container.querySelector('.catch')).toHaveTextContent('🎯 Catch: 60% with a Pal Sphere');
  });

  it('halves the odds for a Lucky one and applies the Alpha penalty', () => {
    game.wild = { palId: 1, level: 1, hp: 35, maxHp: 35, lucky: true, kind: 'wild' };
    let r = render(ArenaPanel);
    expect(r.container.querySelector('.catch')).toHaveTextContent('30% with a Pal Sphere');
    cleanup();
    game.wild = spawnBoss(55, 11, 5000, 'alpha', 'chillet');
    r = render(ArenaPanel);
    expect(r.container.querySelector('.catch')).toHaveTextContent('12% with a Pal Sphere');   // uncommon 35% × 0.35
  });

  it('says what a tower or a raid gives instead', () => {
    game.wild = spawnBoss(12, 15, 50000, 'tower', 'rayne');
    let r = render(ArenaPanel);
    expect(r.container.querySelector('.catch')).toHaveTextContent('not catchable');
    cleanup();
    game.wild = { palId: 142, level: 50, hp: 1, maxHp: 1, lucky: false, kind: 'raid', refId: 'bellanoir' };
    r = render(ArenaPanel);
    expect(r.container.querySelector('.catch')).toHaveTextContent('Bellanoir egg (✨ 10% Lucky)');
  });
});
