import { describe, it, expect, afterEach } from 'vitest';
import { t, setLang, getLang } from './index.js';
import { ru } from './ru.js';
import { en } from './en.js';

describe('i18n', () => {
  afterEach(() => setLang('ru'));

  it('interpolates params', () => {
    expect(t('anim.round', { n: 2 })).toBe('Раунд 2');
    setLang('en');
    expect(t('anim.round', { n: 3 })).toBe('Round 3');
  });

  it('falls back to ru for unknown languages and to the key for unknown keys', () => {
    setLang('fr');
    expect(getLang()).toBe('ru');
    expect(t('no.such.key')).toBe('no.such.key');
  });

  it('en and ru dictionaries have the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
  });
});
