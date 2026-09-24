import { describe, it, expect } from 'vitest';
import { rewardFor, chestReadyIn, CHEST_COOLDOWN_MS } from './rewards.js';

describe('rewardFor', () => {
  it('scales gold by difficulty', () => {
    expect(rewardFor(100, 'easy')).toBe(75);
    expect(rewardFor(100, 'normal')).toBe(100);
    expect(rewardFor(100, 'hard')).toBe(150);
    expect(rewardFor(50, 'unknown')).toBe(50);
  });
});

describe('chestReadyIn', () => {
  it('is 0 for a fresh profile and counts down after opening', () => {
    expect(chestReadyIn({}, 1000)).toBe(0);
    expect(chestReadyIn({ lastChestAt: 1000 }, 1000)).toBe(CHEST_COOLDOWN_MS);
    expect(chestReadyIn({ lastChestAt: 1000 }, 1000 + CHEST_COOLDOWN_MS)).toBe(0);
  });
});
