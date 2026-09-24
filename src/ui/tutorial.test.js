import { describe, it, expect } from 'vitest';
import { tutorialStep, isInfoStep, TUTORIAL_STEPS, TUTORIAL_ANCHOR_Y } from './tutorial.js';
import { ru } from '../i18n/ru.js';
import { en } from '../i18n/en.js';

const base = { mulligan: false, selected: false, pendingTarget: false, played: false, myTurn: true, seen: new Set() };

describe('tutorial', () => {
  it('walks mulligan → hand → row → target → score → leader → done', () => {
    expect(tutorialStep({ ...base, mulligan: true })).toBe('mulligan');
    expect(tutorialStep(base)).toBe('hand');
    expect(tutorialStep({ ...base, selected: true })).toBe('row');
    expect(tutorialStep({ ...base, pendingTarget: true })).toBe('target');
    expect(tutorialStep({ ...base, played: true })).toBe('score');
    expect(tutorialStep({ ...base, played: true, seen: new Set(['score']) })).toBe('leader');
    expect(tutorialStep({ ...base, played: true, seen: new Set(['score', 'leader']) })).toBe('done');
  });

  it('stays quiet during the enemy turn and after a step was seen', () => {
    expect(tutorialStep({ ...base, myTurn: false })).toBeNull();
    expect(tutorialStep({ ...base, selected: true, seen: new Set(['row']) })).toBeNull();
  });

  it('has 3-6 steps, texts in both languages and an anchor for each', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(TUTORIAL_STEPS.length).toBeLessThanOrEqual(6);
    for (const step of TUTORIAL_STEPS) {
      expect(ru[`tutorial.${step}`]).toBeTypeOf('string');
      expect(en[`tutorial.${step}`]).toBeTypeOf('string');
      expect(TUTORIAL_ANCHOR_Y[step]).toBeGreaterThan(0);
    }
    expect(isInfoStep('score')).toBe(true);
    expect(isInfoStep('hand')).toBe(false);
  });
});
