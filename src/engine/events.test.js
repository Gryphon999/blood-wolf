import { describe, it, expect } from 'vitest';
import { createMatch, playCard } from './GwentMatch.js';
import { drainEvents, findCardByUid, locateOnBoard } from './events.js';

const unit = (id, power, row = 'melee') => ({ id, type: 'unit', row, power });

describe('event log', () => {
  it('a new match starts with an empty log', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 1);
    expect(match.events).toEqual([]);
  });

  it('playCard emits a play event with the card uid and its row position', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 1)], 1);
    const uid = match.players[0].hand[0].uid;
    playCard(match, 0, 'melee');
    expect(match.events[0]).toMatchObject({
      type: 'play', uid, player: 0, row: 'melee', index: 0, special: false,
    });
    expect(match.events[0].def.id).toBe('a');
  });

  it('special cards emit play with special: true and index null', () => {
    const clear = { id: 'c', type: 'special', effect: 'clear', row: 'melee', power: 0 };
    const match = createMatch([clear], [unit('b', 1)], 1);
    playCard(match, 0, 'melee');
    expect(match.events[0]).toMatchObject({ type: 'play', special: true, index: null });
  });

  it('drainEvents returns the log and clears it', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 1)], 1);
    playCard(match, 0, 'melee');
    const events = drainEvents(match);
    expect(events).toHaveLength(1);
    expect(match.events).toEqual([]);
  });
});

describe('card lookup', () => {
  it('finds a card by uid in hand and on the board', () => {
    const match = createMatch([unit('a', 3), unit('a2', 2)], [unit('b', 1)], 2);
    const inHand = match.players[0].hand[1];
    const played = match.players[0].hand[0];
    playCard(match, 0, 'melee');
    expect(findCardByUid(match, inHand.uid)).toBe(inHand);
    expect(findCardByUid(match, played.uid)).toBe(played);
    expect(findCardByUid(match, -1)).toBeNull();
  });

  it('locateOnBoard returns owner, row and index', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 1)], 1);
    const card = match.players[0].hand[0];
    playCard(match, 0, 'melee');
    expect(locateOnBoard(match, card)).toEqual({ player: 0, row: 'melee', index: 0 });
  });
});
