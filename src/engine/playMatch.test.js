import { describe, it, expect } from 'vitest';
import { playMatch } from './playMatch.js';
import { PLAYER_DECK, AI_DECK } from '../data/starterDecks.js';
import { buildFactionPool } from '../data/factionPool.js';
import { seededRng } from './rng.js';

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

describe('playMatch with special cards', () => {
  it('terminates with a decided match when decks contain specials', () => {
    const u = (id, p) => ({ id, type: 'unit', row: 'melee', power: p });
    const frost = { id: 'frost', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const horn = { id: 'horn', type: 'special', effect: 'horn', row: 'melee', power: 0 };
    const sign = { id: 'sign', type: 'special', effect: 'sign_damage', row: 'melee', power: 0 };
    const deckA = [u('a1', 6), u('a2', 6), frost, horn];
    const deckB = [u('b1', 4), u('b2', 4), sign, u('b3', 4)];
    const match = playMatch(deckA, deckB, 4);
    expect([0, 1, 'draw']).toContain(match.winner);
  });
});

describe('playMatch with real decks, targets and round draws', () => {
  it('always finishes (20 seeds)', () => {
    const pools = [buildFactionPool('humans'), buildFactionPool('monsters')];
    for (let seed = 1; seed <= 20; seed++) {
      const match = playMatch(PLAYER_DECK, AI_DECK, 10, { rng: seededRng(seed), pools });
      expect([0, 1, 'draw']).toContain(match.winner);
    }
  });
});
