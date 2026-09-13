// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import LogPanel from './LogPanel.svelte';
import { game } from '../state/game.svelte';

describe('LogPanel', () => {
  beforeEach(() => {
    cleanup();
    game.log = [
      { at: 1, kind: 'catch', text: 'Caught Lamball Lv 2 with a Pal Sphere!', chance: 0.6, landed: true },
      { at: 2, kind: 'catch', text: 'Cattiva Lv 1 broke free.', chance: 0.6, landed: false },
      { at: 3, kind: 'combat', text: 'Alpha Chillet appears — 5 minutes on the clock.', chance: 0.13 },
      { at: 4, kind: 'base', text: 'Built Logging Site.' },
    ];
  });

  it('badges each line that carries odds, coloured by outcome', () => {
    const { container } = render(LogPanel);
    const badges = [...container.querySelectorAll('.odds')];
    expect(badges.map((b) => b.textContent?.trim())).toEqual(['🎯 60%', '🎯 60%', '🎯 13%']);
    expect(badges[0]).toHaveClass('hit');
    expect(badges[1]).toHaveClass('miss');
    expect(badges[2]).not.toHaveClass('hit');
    expect(container.querySelectorAll('.line').length).toBe(4);
  });

  it('sums up throws landed vs average odds when looking at the Catching category', async () => {
    const { container } = render(LogPanel);
    expect(container.querySelector('.summary')).toBeNull();
    await fireEvent.change(screen.getByLabelText('Log category'), { target: { value: 'catch' } });
    expect(container.querySelector('.summary')).toHaveTextContent('1 of 2 throws landed (50%) · average odds 60%');
    expect(container.querySelectorAll('.line').length).toBe(2);
  });
});
