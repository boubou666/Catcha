// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { MESSAGES, LOCALES } from './messages';
import { t, tOr } from './index.svelte';
import { prefs } from '../state/prefs.svelte';
import { TUTORIAL } from '../engine/tutorial';

describe('i18n', () => {
  it('every chrome key is translated, and every dotted French key exists in English', () => {
    const en = new Set(Object.keys(MESSAGES.en));
    // dotted keys are the chrome table (must exist in English); plain-text keys are gettext-style and fall back to themselves
    for (const k of Object.keys(MESSAGES.fr)) if (/^[a-z]+\.[A-Za-z.]+$/.test(k) && !k.startsWith('tutorial.')) expect(en.has(k), `fr has ${k} but en does not`).toBe(true);
    const missing = [...en].filter((k) => !(k in MESSAGES.fr));
    expect(missing).toEqual([]);
    expect(LOCALES.map((l) => l.id)).toEqual(['en', 'fr']);
  });

  it('translates every view string that the components wrap in tr()', () => {
    const dir = 'src/ui';
    const missing: string[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.svelte')) continue;
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      for (const m of src.matchAll(/\btr\(("(?:[^"\\]|\\.)*")\)/g)) {
        const key = JSON.parse(m[1]) as string;
        if (!(key in MESSAGES.fr)) missing.push(`${f}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
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
    expect(t('Release')).toBe('Release');
    expect(tOr('tutorial.attack.title', 'Attack a wild Pal')).toBe('Attack a wild Pal');
    prefs.setLang('fr');
    expect(t('tab.party')).toBe('Équipe');
    expect(t('Release')).toBe('Relâcher');
    expect(tOr('tutorial.attack.title', 'Attack a wild Pal')).toBe('Attaquez un Pal sauvage');
    expect(document.documentElement.lang).toBe('fr');
    prefs.setLang('en');
  });
});
