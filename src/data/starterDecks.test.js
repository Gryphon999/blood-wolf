import { describe, it, expect } from 'vitest';
import { PLAYER_DECK, AI_DECK } from './starterDecks.js';

const ROWS = ['melee', 'ranged', 'siege'];

describe('starter decks', () => {
  it('each deck has at least 10 cards', () => {
    expect(PLAYER_DECK.length).toBeGreaterThanOrEqual(10);
    expect(AI_DECK.length).toBeGreaterThanOrEqual(10);
  });

  it('every card has an id, a type, and a valid row', () => {
    for (const card of [...PLAYER_DECK, ...AI_DECK]) {
      expect(typeof card.id).toBe('string');
      expect(['unit', 'hero', 'special']).toContain(card.type);
      expect(ROWS).toContain(card.row);
    }
  });

  it('every special card names an effect', () => {
    for (const card of [...PLAYER_DECK, ...AI_DECK]) {
      if (card.type === 'special') {
        expect(typeof card.effect).toBe('string');
      }
    }
  });
});
