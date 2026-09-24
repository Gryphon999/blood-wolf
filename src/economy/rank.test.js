import { describe, it, expect } from 'vitest';
import { applyRankResult, tierOf, nextTier } from './rank.js';

describe('rank', () => {
  it('adds points for wins by difficulty and removes them for losses, never below 0', () => {
    const p = {};
    expect(applyRankResult(p, 'win', 'hard')).toBe(35);
    expect(applyRankResult(p, 'loss')).toBe(-15);
    expect(p.rank).toEqual({ points: 20, best: 35 });
    applyRankResult(p, 'loss');
    applyRankResult(p, 'loss');
    expect(p.rank.points).toBe(0);
    expect(applyRankResult(p, 'draw')).toBe(0);
  });

  it('maps points to tiers', () => {
    expect(tierOf(0).id).toBe('bronze');
    expect(tierOf(299).id).toBe('bronze');
    expect(tierOf(300).id).toBe('silver');
    expect(tierOf(5000).id).toBe('legend');
    expect(nextTier(310).id).toBe('gold');
    expect(nextTier(5000)).toBeNull();
  });
});
