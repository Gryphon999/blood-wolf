import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass } from './GwentMatch.js';
import { useLeader, canUseLeader } from './leaders.js';
import { addUnit } from './Board.js';
import { createCard } from './Card.js';

const unit = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });
const leader = (ability, param) => ({ id: `l_${ability}`, ability, param });

function withLeaders(a, b, deckA = [unit('a', 1), unit('a2', 1)], deckB = [unit('b', 1), unit('b2', 1)], hand = 1) {
  return createMatch(deckA, deckB, hand, { leaders: [a, b] });
}

describe('leader abilities', () => {
  it('can be used once per match, only on your own turn, and does not end the turn', () => {
    const match = withLeaders(leader('clear_weather'), leader('clear_weather'));
    expect(canUseLeader(match, 1)).toBe(false); // not their turn
    useLeader(match, 0);
    expect(match.current).toBe(0);
    expect(canUseLeader(match, 0)).toBe(false);
    expect(() => useLeader(match, 0)).toThrow();
    expect(match.events.find((e) => e.type === 'leader')).toMatchObject({ player: 0, ability: 'clear_weather' });
  });

  it('is unavailable after passing or without a leader', () => {
    const match = withLeaders(leader('clear_weather'), null);
    pass(match);
    expect(canUseLeader(match, 0)).toBe(false);
    expect(canUseLeader(match, 1)).toBe(false);
  });

  it('clear_weather removes all weather', () => {
    const match = withLeaders(leader('clear_weather'), null);
    match.weather.add('melee');
    useLeader(match, 0);
    expect(match.weather.size).toBe(0);
  });

  it('boost_row gives +param to every non-hero unit in the most crowded own row', () => {
    const match = withLeaders(leader('boost_row', 2), null);
    const b = match.players[0].board;
    const m1 = createCard(unit('m1', 3));
    const r1 = createCard(unit('r1', 3, { row: 'ranged' }));
    const r2 = createCard(unit('r2', 3, { row: 'ranged' }));
    const hero = createCard(unit('h', 5, { row: 'ranged', type: 'hero' }));
    addUnit(b, 'melee', m1); addUnit(b, 'ranged', r1); addUnit(b, 'ranged', r2); addUnit(b, 'ranged', hero);
    useLeader(match, 0);
    expect([m1.power, r1.power, r2.power, hero.power]).toEqual([3, 5, 5, 5]);
  });

  it('draw_card draws from the deck', () => {
    const match = withLeaders(leader('draw_card', 1), null);
    useLeader(match, 0);
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['a', 'a2']);
  });

  it('damage_strongest hits the strongest non-hero enemy', () => {
    const match = withLeaders(leader('damage_strongest', 4), null);
    const big = createCard(unit('big', 7));
    const small = createCard(unit('small', 2));
    addUnit(match.players[1].board, 'melee', big);
    addUnit(match.players[1].board, 'melee', small);
    useLeader(match, 0);
    expect(big.power).toBe(3);
  });

  it('resurrect returns the last unit from the graveyard at full power', () => {
    const match = withLeaders(leader('resurrect'), null);
    const dead = createCard(unit('dead', 6));
    dead.power = -1;
    dead.poisoned = true;
    match.players[0].graveyard.push(createCard({ id: 'sp', type: 'special', effect: 'clear', row: 'melee', power: 0 }), dead);
    useLeader(match, 0);
    expect(match.players[0].board.melee).toContain(dead);
    expect(dead.power).toBe(6);
    expect(dead.poisoned).toBe(false);
    expect(match.players[0].graveyard).not.toContain(dead);
  });

  it('peek_enemy reveals 3 enemy cards (deck top first, then hand)', () => {
    const match = withLeaders(leader('peek_enemy', 3), null, undefined,
      [unit('h1', 1), unit('h2', 1), unit('d1', 1), unit('d2', 1)], 2);
    useLeader(match, 0);
    const ev = match.events.find((e) => e.type === 'reveal');
    expect(ev.player).toBe(1);
    expect(ev.defs).toHaveLength(3);
    expect(ev.defs.slice(0, 2).map((d) => d.id)).toEqual(['d1', 'd2']);
  });
});
