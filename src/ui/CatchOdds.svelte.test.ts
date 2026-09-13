// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import CatchOdds from './CatchOdds.svelte';
import { game } from '../state/game.svelte';
import { ui } from '../state/ui.svelte';
import { prefs } from '../state/prefs.svelte';
import { newState } from '../engine/save';

describe('CatchOdds', () => {
  beforeEach(() => { cleanup(); game.save = newState(); game.save.inventory.sphere_pal = 5; prefs.setShowOdds(true); ui.requestTab = null; });

  it('shows the odds with the sphere in its tooltip and jumps to Settings on click', async () => {
    render(CatchOdds, { palId: 1 });
    const chip = screen.getByRole('button');
    expect(chip).toHaveTextContent('🎯 60%');
    expect(chip).toHaveAttribute('title', 'Catching another Lamball: 60% with a Pal Sphere');
    await fireEvent.click(chip);
    expect(ui.requestTab).toBe('settings');
  });

  it('greys out with the reason when the policy would not throw', () => {
    game.save.paldeck[1] = { seen: true, caught: 1 };   // dupe policy defaults to no throw
    render(CatchOdds, { palId: 1 });
    const chip = screen.getByRole('button');
    expect(chip).toHaveTextContent('🎯 —');
    expect(chip).toHaveClass('no');
    expect(chip.title).toMatch(/already caught/);
  });

  it('applies the Alpha penalty and a custom prefix', () => {
    render(CatchOdds, { palId: 1, alpha: true, prefix: 'As an Alpha' });
    expect(screen.getByRole('button')).toHaveTextContent('🎯 21%');
    expect(screen.getByRole('button').title).toMatch(/^As an Alpha: 21%/);
  });

  it('renders nothing when the odds chips are switched off', () => {
    prefs.setShowOdds(false);
    render(CatchOdds, { palId: 1 });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
