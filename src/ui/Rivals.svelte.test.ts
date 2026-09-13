// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import BossesPanel from './BossesPanel.svelte';
import ArenaPanel from './ArenaPanel.svelte';
import BaseView from './BaseView.svelte';
import { game } from '../state/game.svelte';
import { newState } from '../engine/save';
import { addToBox, makeInstance } from '../engine/party';
import { TECHS } from '../data/tech';

describe('rivals, skills and outposts in the UI', () => {
  beforeEach(() => {
    cleanup();
    game.save = newState(); game.duel = null; game.charges = {};
    game.wild = { palId: 1, level: 1, hp: 35, maxHp: 35, lucky: false, kind: 'wild' };
    const p = makeInstance(1, 10); addToBox(game.save, p); game.save.party = [p.uid];
  });

  it('shows the rival locked, then duels from the Bosses panel and tags the arena', async () => {
    let r = render(BossesPanel);
    const btn = () => screen.getByRole('button', { name: /Syndicate Scout/ });
    expect(btn()).toBeDisabled();
    expect(btn().title).toMatch(/Clear Grassy Behemoth Hills/);
    game.save.progress.routeKills.plateau = 10; game.save.progress.routeKills.behemoth = 20;
    cleanup(); r = render(BossesPanel);
    expect(btn()).toBeEnabled();
    await fireEvent.click(btn());
    expect(game.duel).not.toBeNull();
    expect(game.wild?.kind).toBe('duel');
    expect(game.wild?.palId).toBe(103);   // the signature Pal leads
    cleanup();
    const arena = render(ArenaPanel);
    expect(arena.container.querySelector('.tag.duel')).toHaveTextContent('DUEL 1/3 · Syndicate Scout');
    expect(screen.getByRole('button', { name: 'Concede' })).toBeInTheDocument();
  });

  it('shows a skill chip per party Pal that fires when charged', async () => {
    game.charges[game.save.party[0]] = 20;
    const { container } = render(ArenaPanel);
    const chip = container.querySelector('.skill')!;
    expect(chip).toHaveTextContent('Power Shot');
    expect(chip).toHaveClass('ready');
    const hp = game.wild!.hp, defeated = game.save.stats.defeated;
    await fireEvent.click(chip);
    expect(game.charges[game.save.party[0]]).toBe(0);
    expect(game.save.stats.skillsFired).toBe(1);
    expect(game.save.stats.defeated > defeated || game.wild!.hp < hp).toBe(true);   // it hit: the Lamball fell (and something respawned) or lost HP
  });

  it('lets you found an outpost in a cleared region and post an idle Pal', async () => {
    game.save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
    game.save.progress.towers.push('lily');
    Object.assign(game.save.inventory, { wood: 500, stone: 500, ingot: 50 }); game.save.player.gold = 10_000;
    const idle = makeInstance(2, 5); addToBox(game.save, idle); game.save.party = [game.save.party[0]];
    const { container } = render(BaseView);
    await fireEvent.click(screen.getByRole('button', { name: 'Found an outpost' }));
    expect(game.save.outposts.length).toBe(1);
    const select = container.querySelector('.outpost select') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: idle.uid } });
    expect(game.save.outposts[0].workers).toEqual([idle.uid]);
    expect(container.querySelector('.outpost')).toHaveTextContent('1 / 3');
  });
});
