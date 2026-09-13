// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MESSAGES, LOCALES } from './messages';
import { t, tOr } from './index.svelte';
import { prefs } from '../state/prefs.svelte';
import { TUTORIAL } from '../engine/tutorial';

describe('i18n', () => {
  it('every French key exists in English, and the chrome keys are all translated', () => {
    const en = new Set(Object.keys(MESSAGES.en));
    for (const k of Object.keys(MESSAGES.fr)) if (!k.startsWith('tutorial.') || !/\.(title|text)$/.test(k)) expect(en.has(k), `fr has ${k} but en does not`).toBe(true);
    const missing = [...en].filter((k) => !(k in MESSAGES.fr));
    expect(missing).toEqual([]);
    expect(LOCALES.map((l) => l.id)).toEqual(['en', 'fr']);
  });

  it('translates the tutorial completely', () => {
    for (const step of TUTORIAL) {
      expect(MESSAGES.fr[`tutorial.${step.id}.title`], `${step.id} title`).toBeTruthy();
      expect(MESSAGES.fr[`tutorial.${step.id}.text`], `${step.id} text`).toBeTruthy();
    }
  });

  it('falls back to English, then to the key, and follows the setting', () => {
    prefs.setLang('en');
    expect(t('tab.party')).toBe('Party');
    expect(t('nope.missing')).toBe('nope.missing');
    expect(tOr('tutorial.attack.title', 'Attack a wild Pal')).toBe('Attack a wild Pal');
    prefs.setLang('fr');
    expect(t('tab.party')).toBe('Équipe');
    expect(tOr('tutorial.attack.title', 'Attack a wild Pal')).toBe('Attaquez un Pal sauvage');
    expect(document.documentElement.lang).toBe('fr');
    prefs.setLang('en');
  });
});
