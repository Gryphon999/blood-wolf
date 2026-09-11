import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass, hasLegalMove } from './GwentMatch.js';
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

describe('round-starter after a draw', () => {
  it('alternates the round starter after a drawn round', () => {
    const match = createMatch(
      [unit('a', 4), unit('a2', 1)],
      [unit('b', 4), unit('b2', 1)],
      2,
    );
    playCard(match, 0, 'melee'); // p0 plays 4
    playCard(match, 0, 'melee'); // p1 plays 4
    pass(match);                 // p0 passes
    pass(match);                 // p1 passes -> round 1 is a tie
    expect(match.lastRound).toBe('draw');
    expect(match.roundStarter).toBe(1); // was 0, a draw toggles it
    expect(match.current).toBe(1);
  });
});

describe('full three-round matches', () => {
  it('plays three rounds when the first two are split', () => {
    const match = createMatch(
      [unit('a', 9), unit('a2', 1), unit('a3', 9)],
      [unit('b', 1), unit('b2', 9), unit('b3', 1)],
      3,
    );
    // Round 1: p0 9 vs p1 1 -> p0 wins
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(match.round).toBe(2);
    expect(match.current).toBe(1); // loser p1 starts
    // Round 2: p1 9 vs p0 1 -> p1 wins
    playCard(match, 0, 'melee'); // p1
    playCard(match, 0, 'melee'); // p0
    pass(match);
    pass(match);
    expect(match.round).toBe(3);
    expect(match.winner).toBeNull();
    expect(match.current).toBe(0); // loser p0 starts
    // Round 3: p0 9 vs p1 1 -> p0 wins the match
    playCard(match, 0, 'melee'); // p0
    playCard(match, 0, 'melee'); // p1
    pass(match);
    pass(match);
    expect(match.winner).toBe(0);
  });

  it('ends the match in a draw when both reach two points via ties', () => {
    const match = createMatch(
      [unit('a', 5), unit('a2', 5)],
      [unit('b', 5), unit('b2', 5)],
      2,
    );
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match); // round 1 tie -> 1-1
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match); // round 2 tie -> 2-2 -> match draw
    expect(match.winner).toBe('draw');
  });
});

describe('edge cases', () => {
  it('resolves a round where both players pass immediately (0-0)', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 3)], 1);
    pass(match); // p0 passes on an empty board
    pass(match); // p1 passes -> 0-0 tie
    expect(match.lastRound).toBe('draw');
    expect(match.players[0].roundsWon).toBe(1);
    expect(match.players[1].roundsWon).toBe(1);
  });

  it('keeps the turn with a player whose opponent has already passed', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 2), unit('b2', 2)], 2);
    pass(match);                 // p0 passes -> turn to p1
    expect(match.current).toBe(1);
    playCard(match, 0, 'melee'); // p1 plays; p0 already passed, so turn stays with p1
    expect(match.current).toBe(1);
    expect(match.players[1].hand).toHaveLength(1);
  });

  it('reports no legal move (only pass) when the current player is out of cards', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 1), unit('b2', 1)], 2);
    playCard(match, 0, 'melee'); // p0 plays its only card, hand now empty
    playCard(match, 0, 'melee'); // p1 plays, turn returns to p0
    expect(hasLegalMove(match)).toBe(false); // p0 has no cards -> can only pass
    pass(match);                 // p0 passes (engine allows it), turn to p1
    playCard(match, 0, 'melee'); // p1 plays its second card
    pass(match);                 // p1 passes -> round resolves, p0 (5) beats p1 (2)
    expect(match.players[0].roundsWon).toBe(1);
  });
});

describe('heroes and weather in a match', () => {
  it('a hero keeps its power under weather', () => {
    const hero = { id: 'h', type: 'hero', row: 'melee', power: 7 };
    const frost = { id: 'f', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const filler = { id: 'x', type: 'unit', row: 'melee', power: 3 };
    const match = createMatch([hero, filler], [frost, filler], 2);
    playCard(match, 0, 'melee'); // p0 plays hero(7)
    playCard(match, 0, 'melee'); // p1 plays frost -> weather on melee
    expect(totalPower(match.players[0].board, match.weather)).toBe(7);
  });

  it('weather drops a normal row to 1 per unit and a clear card removes it', () => {
    const strong = { id: 's', type: 'unit', row: 'melee', power: 6 };
    const frost = { id: 'f', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const clear = { id: 'c', type: 'special', effect: 'clear', row: 'melee', power: 0 };
    const match = createMatch([strong, strong], [frost, clear], 2);
    playCard(match, 0, 'melee'); // p0 strong(6)
    playCard(match, 0, 'melee'); // p1 frost -> weather melee
    expect(totalPower(match.players[0].board, match.weather)).toBe(1);
    pass(match);                 // p0 passes -> turn to p1
    playCard(match, 0, 'melee'); // p1 plays clear (p0 passed, so p1 keeps the turn)
    expect(match.weather.size).toBe(0);
    expect(totalPower(match.players[0].board, match.weather)).toBe(6);
  });

  it('weather is cleared when a new round starts', () => {
    const frost = { id: 'f', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const u = () => ({ id: 'u', type: 'unit', row: 'melee', power: 2 });
    const match = createMatch([frost, u()], [u(), u()], 2);
    playCard(match, 0, 'melee'); // p0 frost -> weather melee
    playCard(match, 0, 'melee'); // p1 u(2)
    pass(match);
    pass(match);                 // round resolves -> next round starts
    expect(match.weather.size).toBe(0);
  });
});
