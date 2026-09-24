import { describe, it, expect } from 'vitest';
import { createProfile } from './profile.js';
import { ACHIEVEMENTS, checkAchievements } from './achievements.js';
import { ru } from '../i18n/ru.js';
import { en } from '../i18n/en.js';

describe('achievements', () => {
  it('has 15 unique achievements with icons, rewards and names in both languages', () => {
    expect(ACHIEVEMENTS).toHaveLength(15);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(15);
    for (const a of ACHIEVEMENTS) {
      expect(a.icon.length).toBeGreaterThan(0);
      expect(a.reward).toBeGreaterThan(0);
      expect(ru[`ach.${a.id}`], a.id).toBeTypeOf('string');
      expect(en[`ach.${a.id}.desc`], a.id).toBeTypeOf('string');
    }
  });

  it('unlocks once and pays gold', () => {
    const p = createProfile();
    expect(checkAchievements(p)).toEqual([]);
    p.wins = 1;
    p.stats.bestStreak = 3;
    const got = checkAchievements(p).map((a) => a.id);
    expect(got).toEqual(['first_win', 'streak_3']);
    expect(p.gold).toBe(150);
    expect(checkAchievements(p)).toEqual([]);
    expect(p.gold).toBe(150);
  });
});
