import { describe, it, expect } from 'vitest';
import { createProfile } from './profile.js';
import {
  dailyQuests, ensureDailyQuests, applySummaryToQuests, claimQuest, canClaimQuest, localDate, DAILY_COUNT,
} from './quests.js';
import { newSummary } from './matchSummary.js';

describe('daily quests', () => {
  it('gives 3 quests per day, deterministic by date, first one rewards a pack', () => {
    const a = dailyQuests('2026-09-24', 'humans');
    expect(a).toHaveLength(DAILY_COUNT);
    expect(dailyQuests('2026-09-24', 'humans')).toEqual(a);
    expect(a[0].reward).toEqual({ packs: 1 });
    expect(a[1].reward.gold).toBeGreaterThan(0);
  });

  it('never offers the other faction tag quests', () => {
    for (let d = 1; d <= 28; d++) {
      const ids = dailyQuests(`2026-02-${String(d).padStart(2, '0')}`, 'humans').map((q) => q.id);
      expect(ids).not.toContain('play_undead');
      expect(ids).not.toContain('play_beast');
    }
  });

  it('resets when the date changes and keeps progress within a day', () => {
    const p = createProfile();
    ensureDailyQuests(p, 'humans', '2026-09-24');
    p.quests.list[0].progress = 1;
    ensureDailyQuests(p, 'humans', '2026-09-24');
    expect(p.quests.list[0].progress).toBe(1);
    ensureDailyQuests(p, 'humans', '2026-09-25');
    expect(p.quests.date).toBe('2026-09-25');
    expect(p.quests.list.every((q) => q.progress === 0)).toBe(true);
  });

  it('progresses from match summaries and pays out once', () => {
    const p = createProfile();
    p.quests = { date: 'x', list: [
      { id: 'play_cards', counter: 'cardsPlayed', target: 3, reward: { gold: 50 }, progress: 0, claimed: false },
      { id: 'k', counter: 'tag:knight', target: 1, reward: { packs: 1 }, progress: 0, claimed: false },
    ] };
    const s = { ...newSummary(), cardsPlayed: 5, tags: { knight: 2 } };
    applySummaryToQuests(p, s);
    expect(p.quests.list[0].progress).toBe(3);
    expect(canClaimQuest(p.quests.list[0])).toBe(true);
    claimQuest(p, 0);
    claimQuest(p, 1);
    expect(p.gold).toBe(50);
    expect(p.freePacks).toBe(1);
    expect(() => claimQuest(p, 0)).toThrow();
  });

  it('formats the local date', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
