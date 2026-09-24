import { describe, it, expect } from 'vitest';
import { createProfile } from './profile.js';
import { recordMatch } from './progress.js';
import { newSummary } from './matchSummary.js';

describe('recordMatch', () => {
  it('tracks wins, streaks, flawless/hard wins, quests, rank and achievements', () => {
    const p = createProfile();
    p.quests = { date: 'x', list: [{ id: 'win_matches', counter: 'wins', target: 2, reward: { gold: 1 }, progress: 0, claimed: false }] };
    const summary = { ...newSummary(), roundsWon: 2, spiesPlayed: 1 };
    const out = recordMatch(p, { result: 'win', summary, difficulty: 'hard', arena: true });
    expect(p.wins).toBe(1);
    expect(p.stats).toMatchObject({ winStreak: 1, bestStreak: 1, hardWins: 1, flawlessWins: 1, spiesPlayed: 1 });
    expect(p.quests.list[0].progress).toBe(1);
    expect(out.rankDelta).toBe(35);
    expect(out.unlocked.map((a) => a.id)).toEqual(expect.arrayContaining(['first_win', 'hard_win', 'flawless']));
  });

  it('a loss resets the streak; story battles do not touch the rank', () => {
    const p = createProfile();
    recordMatch(p, { result: 'win', summary: newSummary(), arena: false });
    const out = recordMatch(p, { result: 'loss', summary: newSummary(), arena: false });
    expect(p.stats.winStreak).toBe(0);
    expect(p.stats.bestStreak).toBe(1);
    expect(out.rankDelta).toBe(0);
    expect(p.rank).toBeUndefined();
  });
});
