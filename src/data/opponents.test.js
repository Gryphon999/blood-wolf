import { describe, it, expect } from 'vitest';
import { generateOpponent, buildOpponentDeck, OPPONENT_DECK_SIZE, OPPONENT_FACTIONS, OPPONENT_NAME_COUNT } from './opponents.js';
import { seededRng } from '../engine/rng.js';
import { playMatch } from '../engine/playMatch.js';
import { buildFactionPool } from './factionPool.js';
import { PLAYER_DECK } from './starterDecks.js';

describe('buildOpponentDeck', () => {
  it('builds a legal deck of distinct cards from one faction for every difficulty', () => {
    for (const faction of OPPONENT_FACTIONS) {
      for (const difficulty of ['easy', 'normal', 'hard']) {
        for (let seed = 1; seed <= 15; seed++) {
          const deck = buildOpponentDeck(faction, { difficulty, rng: seededRng(seed) });
          expect(deck).toHaveLength(OPPONENT_DECK_SIZE);
          expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
          expect(deck.every((c) => c.faction === faction)).toBe(true);
          expect(deck.filter((c) => c.type === 'special').length).toBeLessThanOrEqual(2);
          expect(deck.filter((c) => c.type === 'unit').length).toBeGreaterThanOrEqual(7);
        }
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = buildOpponentDeck('humans', { rng: seededRng(7) }).map((c) => c.id);
    const b = buildOpponentDeck('humans', { rng: seededRng(7) }).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('brings stronger cards on hard than on easy (average over many seeds)', () => {
    const score = (difficulty) => {
      let total = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const deck = buildOpponentDeck('monsters', { difficulty, rng: seededRng(seed) });
        total += deck.filter((c) => c.rarity === 'epic' || c.rarity === 'legendary').length;
      }
      return total;
    };
    expect(score('hard')).toBeGreaterThan(score('easy'));
  });
});

describe('generateOpponent', () => {
  it('returns faction, leader, deck and a valid name index', () => {
    const opp = generateOpponent({ rng: seededRng(3) });
    expect(OPPONENT_FACTIONS).toContain(opp.faction);
    expect(opp.leader.faction).toBe(opp.faction);
    expect(opp.key).toBe(`${opp.faction}:${opp.leader.id}`);
    expect(opp.nameIndex).toBeGreaterThanOrEqual(0);
    expect(opp.nameIndex).toBeLessThan(OPPONENT_NAME_COUNT);
  });

  it('never repeats the previous faction + leader when it can be avoided', () => {
    let previous = null;
    const rng = seededRng(11);
    for (let i = 0; i < 60; i++) {
      const opp = generateOpponent({ rng, avoid: previous });
      expect(opp.key).not.toBe(previous);
      previous = opp.key;
    }
  });

  it('covers both factions and several leaders over many fights', () => {
    const seen = new Set();
    const rng = seededRng(5);
    let previous = null;
    for (let i = 0; i < 80; i++) {
      const opp = generateOpponent({ rng, avoid: previous });
      seen.add(opp.key);
      previous = opp.key;
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});

describe('generated opponents can actually be played', () => {
  it('finishes full AI-vs-AI matches against the starter deck (30 seeds)', () => {
    const pools = { humans: buildFactionPool('humans'), monsters: buildFactionPool('monsters') };
    for (let seed = 1; seed <= 30; seed++) {
      const rng = seededRng(seed);
      const opp = generateOpponent({ rng });
      const match = playMatch(PLAYER_DECK, opp.deck, 10, { rng, pools: [pools.humans, pools[opp.faction]] });
      expect([0, 1, 'draw']).toContain(match.winner);
    }
  });
});
