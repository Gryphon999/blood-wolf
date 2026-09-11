import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass } from './GwentMatch.js';
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

describe('pass and round resolution', () => {
  it('switches turn to the opponent when only one player passes', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 1);
    pass(match);
    expect(match.current).toBe(1);
    expect(match.players[0].passed).toBe(true);
  });

  it('awards the round to the higher total power when both pass', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee'); // p0 plays 5, turn -> p1
    playCard(match, 0, 'melee'); // p1 plays 3, turn -> p0
    pass(match);                 // p0 passes, turn -> p1
    pass(match);                 // p1 passes, round resolves
    expect(match.players[0].roundsWon).toBe(1);
    expect(match.players[1].roundsWon).toBe(0);
    expect(match.lastRound).toBe(0);
  });

  it('resets boards and lets the round loser start the next round', () => {
    const match = createMatch(
      [unit('a', 5), unit('a2', 5)],
      [unit('b', 3), unit('b2', 3)],
      2,
    );
    playCard(match, 0, 'melee'); // p0 -> 5
    playCard(match, 0, 'melee'); // p1 -> 3
    pass(match);                 // p0 passes
    pass(match);                 // p1 passes -> p0 wins round 1
    expect(match.round).toBe(2);
    expect(totalPower(match.players[0].board)).toBe(0);
    expect(match.current).toBe(1); // loser (p1) starts round 2
  });

  it('gives both players a point on a tie', () => {
    const match = createMatch([unit('a', 4)], [unit('b', 4)], 1);
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(match.players[0].roundsWon).toBe(1);
    expect(match.players[1].roundsWon).toBe(1);
    expect(match.lastRound).toBe('draw');
  });
});

describe('match end', () => {
  it('declares the player who wins two rounds the winner', () => {
    // handSize 2 so each player has a card for both rounds
    const match = createMatch(
      [unit('a', 5), unit('a2', 5)],
      [unit('b', 1), unit('b2', 1)],
      2,
    );
    // round 1: p0 5 vs p1 1 -> p0 wins
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    // round 2: p1 starts. p1 1 vs p0 5 -> p0 wins again
    playCard(match, 0, 'melee'); // p1
    playCard(match, 0, 'melee'); // p0
    pass(match);                 // p1 passes
    pass(match);                 // p0 passes -> resolve, p0 hits 2 wins
    expect(match.winner).toBe(0);
  });

  it('refuses further moves once the match is over', () => {
    const match = createMatch(
      [unit('a', 5), unit('a2', 5)],
      [unit('b', 1), unit('b2', 1)],
      2,
    );
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(() => pass(match)).toThrow('Match is over');
  });
});
