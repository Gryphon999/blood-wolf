import { describe, it, expect } from 'vitest';
import { playMatch } from './playMatch.js';

const unit = (id, power) => ({ id, row: 'melee', power });

describe('playMatch', () => {
  it('plays a full match to completion', () => {
    const strong = [unit('s1', 9), unit('s2', 9), unit('s3', 9)];
    const weak = [unit('w1', 1), unit('w2', 1), unit('w3', 1)];
    const match = playMatch(strong, weak, 3);
    expect(match.winner).not.toBeNull();
    expect(match.winner).toBe(0); // the stronger deck should win
  });

  it('always terminates with a decided match', () => {
    const deck = Array.from({ length: 10 }, (_, i) => unit(`c${i}`, (i % 5) + 1));
    const match = playMatch(deck, deck, 10);
    expect([0, 1, 'draw']).toContain(match.winner);
  });
});
