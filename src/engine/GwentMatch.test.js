import { describe, it, expect } from 'vitest';
import { createMatch, playCard } from './GwentMatch.js';
import { totalPower } from './Board.js';

const unit = (id, power, row = 'melee') => ({ id, row, power });

describe('createMatch', () => {
  it('deals hands from the front of each deck', () => {
    const deck = [unit('a', 1), unit('b', 2), unit('c', 3)];
    const match = createMatch(deck, deck, 2);
    expect(match.players[0].hand).toHaveLength(2);
    expect(match.players[0].deck).toHaveLength(1);
    expect(match.players[0].hand[0].power).toBe(1);
  });

  it('starts with player 0 to move and no winner', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 1);
    expect(match.current).toBe(0);
    expect(match.winner).toBeNull();
  });
});

describe('playCard', () => {
  it('moves a card from hand to the chosen row and passes the turn', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    expect(match.players[0].hand).toHaveLength(0);
    expect(totalPower(match.players[0].board)).toBe(5);
    expect(match.current).toBe(1);
  });

  it('throws when the card index is invalid', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1);
    expect(() => playCard(match, 9, 'melee')).toThrow('No card at index 9');
  });
});
