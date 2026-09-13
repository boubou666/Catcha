// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import WorldMap from './WorldMap.svelte';
import RoutesPanel from './RoutesPanel.svelte';
import { game } from '../state/game.svelte';
import { ui } from '../state/ui.svelte';
import { prefs } from '../state/prefs.svelte';
import { newState } from '../engine/save';

const pin = (name: RegExp) => screen.getAllByRole('button').find((b) => name.test(b.getAttribute('aria-label') ?? ''))!;

describe('WorldMap', () => {
  beforeEach(() => { cleanup(); game.save = newState(); game.wild = { palId: 1, level: 1, hp: 35, maxHp: 35, lucky: false, kind: 'wild' }; ui.mapFocus = null; prefs.setRoutesView('map'); prefs.setRoutesOpen(true); });

  it('opens on the current region with a pin per location, tap to select, tap again to travel', async () => {
    game.save.progress.routeKills.plateau = 10;   // opens Grassy Behemoth Hills
    const { container } = render(WorldMap);
    expect(container.querySelectorAll('.pin').length).toBe(14);   // 7 routes, 2 Alphas, tower, realm, base, altar, rival
    const behemoth = pin(/^Grassy Behemoth Hills/);
    await fireEvent.click(behemoth);
    expect(container.querySelector('.detail')).toHaveTextContent('Grassy Behemoth Hills Lv 3 0 / 20 defeated');
    expect(screen.getByRole('button', { name: 'Travel' })).toBeEnabled();
    await fireEvent.click(behemoth);
    expect(game.save.progress.route).toBe('behemoth');
    expect(container.querySelector('.detail')).toHaveTextContent('you are here');
  });

  it('keeps locked pins inert and says what opens them', async () => {
    const { container } = render(WorldMap);
    await fireEvent.click(pin(/^Fort Ruins/));
    expect(container.querySelector('.detail')).toHaveTextContent('🔒 Clear Grassy Behemoth Hills');
    expect(screen.getByRole('button', { name: 'Travel' })).toBeDisabled();
    await fireEvent.click(pin(/^Fort Ruins/));
    expect(game.save.progress.route).toBe('plateau');
    await fireEvent.click(pin(/^Summoning Altar/));
    expect(container.querySelector('.detail')).toHaveTextContent('Build the Summoning Altar');
  });

  it('zooms out to the world and back, and follows a show-on-map request', async () => {
    const { container } = render(WorldMap);
    await fireEvent.click(screen.getByRole('button', { name: '🌍 World' }));
    expect(container.querySelectorAll('.region').length).toBe(7);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('280 150 1500 1690');
    ui.showOnMap('alpha', 'chillet');
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.detail')).toHaveTextContent('Alpha Chillet Lv 11');
    expect(container.querySelector('svg')?.getAttribute('viewBox')).not.toBe('280 150 1500 1690');
    expect(ui.mapFocus).toBeNull();
  });
});

describe('RoutesPanel folding', () => {
  beforeEach(() => { cleanup(); game.save = newState(); prefs.setRoutesView('map'); prefs.setRoutesOpen(true); });

  it('folds to one line with the current route and unfolds again', async () => {
    const { container } = render(RoutesPanel);
    expect(container.querySelector('svg')).not.toBeNull();
    await fireEvent.click(screen.getByTitle('Minimize the map'));
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('.panel')).toHaveTextContent('📍 Plateau of Beginnings Lv 1 · Windswept Hills · 0 / 10');
    expect(prefs.routesOpen).toBe(false);
    await fireEvent.click(screen.getByTitle('Show the map'));
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
