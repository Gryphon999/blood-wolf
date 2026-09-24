import { describe, it, expect } from 'vitest';
import { createMatch, playCard, mulligan, canMulligan, MULLIGAN_MAX } from './GwentMatch.js';
import { chooseMulligan } from './ai/OpponentAI.js';

const unit = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

describe('mulligan', () => {
  it('swaps chosen hand cards with cards from the deck', () => {
    const match = createMatch([unit('a', 1), unit('b', 2), unit('c', 3), unit('d', 4), unit('e', 5)], [unit('x', 1)], 3);
    mulligan(match, 0, [0, 2]);
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['b', 'd', 'e']);
    expect(match.players[0].deck.map((c) => c.def.id).sort()).toEqual(['a', 'c']);
    expect(match.players[0].mulliganDone).toBe(true);
    expect(match.events.find((e) => e.type === 'mulligan')).toMatchObject({ player: 0, count: 2 });
  });

  it('allows at most MULLIGAN_MAX cards and only once', () => {
    expect(MULLIGAN_MAX).toBe(2);
    const deck = Array.from({ length: 8 }, (_, i) => unit(`c${i}`, i));
    const match = createMatch(deck, deck, 4);
    expect(() => mulligan(match, 0, [0, 1, 2])).toThrow();
    mulligan(match, 0, [0]);
    expect(canMulligan(match, 0)).toBe(false);
    expect(() => mulligan(match, 0, [1])).toThrow();
  });

  it('keeping the hand (empty choice) still uses up the mulligan', () => {
    const match = createMatch([unit('a', 1), unit('b', 1)], [unit('x', 1)], 1);
    mulligan(match, 0, []);
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['a']);
    expect(canMulligan(match, 0)).toBe(false);
  });

  it('draws replacements from the faction pool when the deck is empty', () => {
    const pool = [unit('p', 7)];
    const match = createMatch([unit('a', 1)], [unit('x', 1)], 1, { pools: [pool, pool], rng: () => 0.5 });
    mulligan(match, 0, [0]);
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['p']);
  });

  it('is no longer possible once the first card has been played', () => {
    const match = createMatch([unit('a', 1), unit('b', 1), unit('c', 1)], [unit('x', 1), unit('y', 1)], 2);
    playCard(match, 0, 'melee');
    expect(canMulligan(match, 0)).toBe(false);
    expect(canMulligan(match, 1)).toBe(false);
  });
});

describe('chooseMulligan (AI)', () => {
  it('replaces the two weakest units', () => {
    const match = createMatch([unit('x', 1)], [unit('a', 5), unit('b', 1), unit('c', 8), unit('d', 2), unit('e', 9), unit('f', 3)], 4);
    const picks = chooseMulligan(match, 1);
    expect(picks.map((i) => match.players[1].hand[i].def.id).sort()).toEqual(['b', 'd']);
  });

  it('keeps the hand when the deck is empty and there is no pool', () => {
    const match = createMatch([unit('x', 1)], [unit('a', 1), unit('b', 1)], 2);
    expect(chooseMulligan(match, 1)).toEqual([]);
  });
});
