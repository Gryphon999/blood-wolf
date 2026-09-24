import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass } from './GwentMatch.js';
import { FACTION_PASSIVE } from './passives.js';

const unit = (id, power, faction) => ({ id, type: 'unit', row: 'melee', power, faction });
const deck = (faction, n = 6, power = 1) => Array.from({ length: n }, (_, i) => unit(`${faction}${i}`, power, faction));

describe('faction passives', () => {
  it('maps factions to passives', () => {
    expect(FACTION_PASSIVE.humans).toBe('discipline');
    expect(FACTION_PASSIVE.monsters).toBe('tiebreak');
  });

  it('monsters win a tied round against a non-monster faction', () => {
    const match = createMatch(deck('humans'), deck('monsters'), 3);
    pass(match);
    pass(match); // 0 : 0
    expect(match.lastRound).toBe(1);
    expect(match.players[1].roundsWon).toBe(1);
    expect(match.players[0].roundsWon).toBe(0);
    expect(match.events.some((e) => e.type === 'passive' && e.passive === 'tiebreak')).toBe(true);
  });

  it('a mirror monster match still draws', () => {
    const match = createMatch(deck('monsters'), deck('monsters'), 3);
    pass(match);
    pass(match);
    expect(match.lastRound).toBe('draw');
  });

  it('humans play one extra card in round 2, once per match', () => {
    const match = createMatch(deck('humans'), deck('monsters'), 4);
    playCard(match, 0, 'melee'); // r1: h 1
    pass(match);                 // monsters pass at 0
    pass(match);                 // humans pass, win r1 -> monsters start r2
    expect(match.round).toBe(2);
    expect(match.current).toBe(1);
    playCard(match, 0, 'melee'); // monsters
    expect(match.current).toBe(0);
    playCard(match, 0, 'melee'); // humans: discipline keeps the turn
    expect(match.current).toBe(0);
    expect(match.events.some((e) => e.type === 'passive' && e.passive === 'discipline')).toBe(true);
    playCard(match, 0, 'melee'); // second card ends the turn normally
    expect(match.current).toBe(1);
  });

  it('decks without a faction have no passive', () => {
    const plain = [{ id: 'a', row: 'melee', power: 1 }, { id: 'b', row: 'melee', power: 1 }];
    const match = createMatch(plain, plain, 1);
    pass(match);
    pass(match);
    expect(match.lastRound).toBe('draw');
  });
});
