import { describe, it, expect } from 'vitest';
import { dealRandom } from './dealRandom.js';
import { seededRng } from './rng.js';

const d = (id, rarity) => ({ id, rarity });

describe('dealRandom', () => {
  it('deals exactly count cards from the pool', () => {
    const pool = [d('a', 'common'), d('b', 'rare')];
    const hand = dealRandom(pool, 5, seededRng(1));
    expect(hand).toHaveLength(5);
    hand.forEach((card) => expect(pool).toContain(card));
  });

  it('is deterministic for a given seed', () => {
    const pool = [d('a', 'common'), d('b', 'rare'), d('c', 'epic')];
    expect(dealRandom(pool, 5, seededRng(9))).toEqual(dealRandom(pool, 5, seededRng(9)));
  });

  it('never deals more than one legendary', () => {
    const pool = [d('l1', 'legendary'), d('l2', 'legendary'), d('c', 'common')];
    for (let seed = 1; seed <= 50; seed++) {
      const hand = dealRandom(pool, 5, seededRng(seed));
      expect(hand.filter((c) => c.rarity === 'legendary').length).toBeLessThanOrEqual(1);
    }
  });

  it('respects rarity weights (common 50 vs legendary 5)', () => {
    const pool = [d('c', 'common'), d('l', 'legendary')];
    const rng = seededRng(7);
    let commons = 0;
    for (let i = 0; i < 1000; i++) {
      if (dealRandom(pool, 1, rng)[0].id === 'c') commons++;
    }
    expect(commons).toBeGreaterThan(850); // expected ≈ 909
  });

  it('an empty pool deals nothing', () => {
    expect(dealRandom([], 5, seededRng(1))).toEqual([]);
  });
});
