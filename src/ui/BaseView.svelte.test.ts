// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import BaseView from './BaseView.svelte';
import { game } from '../state/game.svelte';
import { newState } from '../engine/save';
import { addToBox, makeInstance } from '../engine/party';
import { assignWorker } from '../engine/base';
import { rollRaid } from '../engine/baseraid';
import { routeById } from '../data/regions';
import { TECHS } from '../data/tech';

describe('BaseView raid banner', () => {
  beforeEach(() => {
    cleanup();
    game.save = newState();
    game.save.tech = TECHS.filter((t) => t.effect.kind !== 'mult').map((t) => t.id);
    const w = makeInstance(4, 5); addToBox(game.save, w); assignWorker(game.save, w.uid);
    const p = makeInstance(1, 5); addToBox(game.save, p); game.save.party = [p.uid];
    game.save.base.structures.workbench = 1;
  });

  it('shows the raid with its clock and defence, and rallies the party', async () => {
    game.save.base.raid = rollRaid(routeById('plateau'), () => 0);
    const { container } = render(BaseView);
    const banner = container.querySelector('.raid')!;
    expect(banner).toHaveTextContent('Raid on the base!');
    expect(banner).toHaveTextContent('Lamball Lv 2');
    expect(banner).toHaveTextContent('3:00');
    const before = Number(banner.textContent!.match(/defence ([\d.]+)/)![1]);
    await fireEvent.click(screen.getByRole('button', { name: 'Rally the party' }));
    expect(game.save.base.raid!.rallied).toBe(true);
    const after = Number(container.querySelector('.raid')!.textContent!.match(/defence ([\d.]+)/)![1]);
    expect(after).toBeGreaterThan(before);
    expect(screen.queryByRole('button', { name: 'Rally the party' })).toBeNull();
  });

  it('lists recent raids once there are any', () => {
    game.save.base.raidLog = [{ at: Date.now(), palId: 1, level: 2, outcome: 'repelled', gold: 30, stolen: 0 }, { at: Date.now() - 1000, palId: 2, level: 3, outcome: 'failed', gold: 0, stolen: 12 }];
    game.save.stats.baseRaidsRepelled = 1; game.save.stats.baseRaidsLost = 1;
    const { container } = render(BaseView);
    expect(container.querySelector('.raidlog')).toHaveTextContent('1 repelled · 1 lost');
    expect(container.querySelectorAll('.raidlog li').length).toBe(2);
    expect(container.querySelector('.raidlog .lost')).toHaveTextContent('Cattiva Lv 3 — lost, 12 items stolen');
  });
});
