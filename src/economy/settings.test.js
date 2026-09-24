import { describe, it, expect } from 'vitest';
import { getSettings, updateSettings, resolveLang, stepVolume, DEFAULT_SETTINGS } from './settings.js';

describe('settings', () => {
  it('fills defaults and stores patches', () => {
    const p = {};
    expect(getSettings(p)).toEqual(DEFAULT_SETTINGS);
    updateSettings(p, { volume: 0.3 });
    expect(getSettings(p).volume).toBe(0.3);
    expect(getSettings(p).music).toBe(DEFAULT_SETTINGS.music);
  });

  it('resolves the language from the choice, then the Yandex SDK', () => {
    expect(resolveLang('en', 'ru')).toBe('en');
    expect(resolveLang(null, 'ru')).toBe('ru');
    expect(resolveLang(null, 'kk')).toBe('ru');
    expect(resolveLang(null, 'tr')).toBe('en');
    expect(resolveLang(null, null)).toBe('ru');
  });

  it('steps volume in tenths within 0..1', () => {
    expect(stepVolume(0.8, 0.1)).toBe(0.9);
    expect(stepVolume(1, 0.1)).toBe(1);
    expect(stepVolume(0.1, -0.2)).toBe(0);
  });
});
