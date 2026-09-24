import { describe, it, expect } from 'vitest';
import { gemStates, lostGems } from './gems.js';

const match = (w0, w1) => ({ players: [{ roundsWon: w0 }, { roundsWon: w1 }] });

describe('round gems', () => {
  it('a side loses one gem per round the opponent is credited with', () => {
    expect(gemStates(match(0, 0), 0)).toEqual(['full', 'full']);
    expect(gemStates(match(1, 0), 1)).toEqual(['full', 'lost']);
    expect(gemStates(match(1, 0), 0)).toEqual(['full', 'full']);
    expect(gemStates(match(1, 1), 0)).toEqual(['full', 'lost']); // a draw costs both
    expect(gemStates(match(0, 2), 0)).toEqual(['lost', 'lost']);
    expect(lostGems(match(0, 3), 0)).toBe(2);
  });
});
