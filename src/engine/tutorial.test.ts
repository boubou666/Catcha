import { describe, expect, it } from 'vitest';
import { newState, migrate, SAVE_VERSION } from './save';
import { advanceTutorial, currentStep, finishTutorial, TUTORIAL } from './tutorial';
import { ascend } from './ascend';
import { addToBox, makeInstance } from './party';
import { assignWorker, build, enqueue } from './base';
import { research } from './tech';
import { routeById } from '../data/regions';

const ids = () => TUTORIAL.map((s) => s.id);

describe('tutorial steps', () => {
  it('start at the first step on a fresh save and do not advance by themselves', () => {
    const s = newState();
    expect(currentStep(s)?.id).toBe('attack');
    expect(advanceTutorial(s)).toBe(false);
    expect(s.tutorial).toEqual({ step: 0, done: false });
  });

  it('have unique ids, and every step but the last is completable from a fresh save', () => {
    expect(new Set(ids()).size).toBe(TUTORIAL.length);
    expect(TUTORIAL.at(-1)!.done(newState())).toBe(false);
  });

  it('advance in order as the player actually plays', () => {
    const s = newState();
    s.stats.defeated = 1;
    expect(advanceTutorial(s)).toBe(true);
    expect(currentStep(s)?.id).toBe('catch');

    s.stats.caught = 1;
    addToBox(s, makeInstance(1, 1));   // auto-joins the party
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('party');

    addToBox(s, makeInstance(3, 1));
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('route');

    s.progress.routeKills.plateau = routeById('plateau').killsToClear;
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('tech');

    expect(research(s, 's_workbench')).toBe(true);
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('worker');

    addToBox(s, makeInstance(2, 1));
    expect(assignWorker(s, s.box[2].uid)).toBe(true);
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('build');

    s.inventory.wood = 50;
    expect(build(s, 'workbench')).toBe(true);
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('craft');

    s.stats.crafted = 1;
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('alpha');

    s.progress.alphas.push('chillet');
    advanceTutorial(s);
    expect(currentStep(s)?.id).toBe('onward');
    expect(s.tutorial.done).toBe(false);
    expect(advanceTutorial(s)).toBe(false);   // the last step waits for the player to dismiss it
  });

  it('skip several steps at once when the player is already past them', () => {
    const s = newState();
    s.stats.defeated = 20; s.stats.caught = 3;
    s.progress.routeKills.plateau = 99;
    expect(advanceTutorial(s)).toBe(true);
    expect(currentStep(s)?.id).toBe('tech');
  });

  it('can be finished, and then never shows a step again', () => {
    const s = newState();
    finishTutorial(s);
    expect(currentStep(s)).toBeNull();
    s.stats.defeated = 1;
    expect(advanceTutorial(s)).toBe(false);
  });

  it('the craft step reflects the real crafting path', () => {
    const s = newState();
    research(s, 's_workbench');
    s.inventory.wood = 50;
    build(s, 'workbench');
    s.player.techPoints = 5;
    expect(research(s, 'r_sphere_pal')).toBe(true);
    s.inventory.paldium = 50; s.inventory.stone = 50;
    expect(enqueue(s, 'sphere_pal', 1)).toBe(1);
  });
});

describe('tutorial persistence', () => {
  it('is marked done for saves migrated from before it existed', () => {
    const v16 = { ...newState(), version: 16 } as Record<string, unknown>;
    delete v16.tutorial;
    const s = migrate(v16)!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.tutorial).toEqual({ step: TUTORIAL.length - 1, done: true });
    expect(currentStep(s)).toBeNull();
  });

  it('survives Ascension', () => {
    const s = newState();
    finishTutorial(s);
    s.progress.towers.push('rayne');
    const next = ascend(s, [])!;
    expect(next.tutorial).toEqual({ step: TUTORIAL.length - 1, done: true });
  });
});
