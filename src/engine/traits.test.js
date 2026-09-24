import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass } from './GwentMatch.js';
import { totalPower, rowPower, addUnit } from './Board.js';
import { createCard } from './Card.js';
import { dealDamage } from './actions.js';

const unit = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

describe('Spy', () => {
  it('lands on the enemy row, gives them its power and draws 2 cards for its owner', () => {
    const spy = unit('spy', 4, { spy: true });
    const match = createMatch([spy, unit('a', 1), unit('b', 2), unit('c', 3)], [unit('x', 1)], 1);
    playCard(match, 0, 'melee');
    expect(match.players[0].board.melee).toHaveLength(0);
    expect(match.players[1].board.melee.map((c) => c.def.id)).toEqual(['spy']);
    expect(totalPower(match.players[1].board)).toBe(4);
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['a', 'b']);
    expect(match.players[0].deck.map((c) => c.def.id)).toEqual(['c']);
  });

  it('emits a play event on the enemy side and a spy draw event', () => {
    const match = createMatch([unit('spy', 4, { spy: true }), unit('a', 1)], [unit('x', 1)], 1);
    playCard(match, 0, 'melee');
    const play = match.events.find((e) => e.type === 'play');
    expect(play).toMatchObject({ player: 1, row: 'melee', spy: true });
    const draw = match.events.find((e) => e.type === 'draw');
    expect(draw).toMatchObject({ player: 0, reason: 'spy' });
    expect(draw.uids).toHaveLength(1);
  });

  it('falls back to the faction pool when the deck is empty', () => {
    const pool = [unit('p', 2)];
    const match = createMatch([unit('spy', 4, { spy: true })], [unit('x', 1)], 1, { pools: [pool, pool], rng: () => 0.1 });
    playCard(match, 0, 'melee');
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['p', 'p']);
  });

  it('dies into the graveyard of the side it stands on', () => {
    const match = createMatch([unit('spy', 1, { spy: true })], [unit('x', 1)], 1);
    playCard(match, 0, 'melee');
    const spyCard = match.players[1].board.melee[0];
    dealDamage(match, null, spyCard, 5);
    expect(match.players[1].graveyard).toContain(spyCard);
  });
});

describe('Muster', () => {
  it('pulls every card of the family from hand and deck onto the board', () => {
    const w = (id) => unit(id, 3, { muster: 'pack' });
    const match = createMatch([w('w1'), unit('a', 1), w('w2'), w('w3'), unit('b', 1)], [unit('x', 1)], 3);
    // hand: w1, a, w2 ; deck: w3, b
    playCard(match, 0, 'melee');
    expect(match.players[0].board.melee.map((c) => c.def.id)).toEqual(['w1', 'w2', 'w3']);
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['a']);
    expect(match.players[0].deck.map((c) => c.def.id)).toEqual(['b']);
    const plays = match.events.filter((e) => e.type === 'play');
    expect(plays).toHaveLength(3);
    expect(plays[1]).toMatchObject({ muster: true, row: 'melee' });
  });

  it('does not muster cards of a different family', () => {
    const match = createMatch([unit('w1', 3, { muster: 'pack' }), unit('o', 3, { muster: 'other' })], [unit('x', 1)], 2);
    playCard(match, 0, 'melee');
    expect(match.players[0].board.melee).toHaveLength(1);
  });
});

describe('bookkeeping events', () => {
  it('a spy play names its owner', () => {
    const match = createMatch([unit('spy', 4, { spy: true })], [unit('x', 1)], 1);
    playCard(match, 0, 'melee');
    expect(match.events.find((e) => e.type === 'play')).toMatchObject({ player: 1, owner: 0 });
  });

  it('round resolution emits roundEnd with both powers', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(match.events.find((e) => e.type === 'roundEnd')).toEqual({ type: 'roundEnd', round: 1, result: 0, powers: [5, 3] });
  });
});

describe('order event', () => {
  it('useOrder emits an order event before the effect', async () => {
    const { useOrder } = await import('./GwentMatch.js');
    const match = createMatch([unit('x', 1)], [unit('y', 1)], 1);
    const banner = createCard(unit('banner', 2, { hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1 }));
    addUnit(match.players[0].board, 'melee', banner);
    useOrder(match, 0, 'melee', 0);
    expect(match.events[0]).toEqual({ type: 'order', player: 0, uid: banner.uid });
  });
});

describe('permanent weather (boss rule)', () => {
  it('stays through Clear Sky, the clear-weather leader and new rounds', async () => {
    const { useLeader } = await import('./leaders.js');
    const clear = { id: 'clear', type: 'special', effect: 'clear', row: 'melee', power: 0 };
    const match = createMatch([clear, unit('a', 1)], [unit('x', 1), unit('y', 1)], 2, {
      permanentWeather: ['ranged'], leaders: [{ id: 'l', ability: 'clear_weather' }, null],
    });
    expect([...match.weather]).toEqual(['ranged']);
    match.weather.add('melee');
    useLeader(match, 0);
    expect([...match.weather]).toEqual(['ranged']);
    playCard(match, 0, 'melee'); // Clear Sky
    expect([...match.weather]).toEqual(['ranged']);
    pass(match);
    pass(match);
    expect(match.round).toBe(2);
    expect([...match.weather]).toEqual(['ranged']);
  });
});

describe('boss start units', () => {
  it('bossUnits are placed on player 1 board at the start of every round', () => {
    const boss = unit('boss', 7, { type: 'hero' });
    const match = createMatch([unit('a', 1), unit('b', 1)], [unit('x', 1), unit('y', 1)], 2, { bossUnits: [boss] });
    expect(match.players[1].board.melee.map((c) => c.def.id)).toEqual(['boss']);
    pass(match);
    pass(match);
    expect(match.players[1].board.melee.map((c) => c.def.id)).toEqual(['boss']);
  });
});

describe('status tick events', () => {
  it('tick damage names the status that caused it', async () => {
    const { startTurn } = await import('./GwentMatch.js');
    const match = createMatch([unit('x', 1)], [unit('y', 1)], 1);
    const a = createCard(unit('a', 5)); a.poisoned = true;
    const b = createCard(unit('b', 5)); b.bleedStacks = 2;
    const c = createCard(unit('c', 5)); c.poisoned = true; c.bleedStacks = 1;
    [a, b, c].forEach((card) => addUnit(match.players[1].board, 'melee', card));
    startTurn(match);
    const byTarget = Object.fromEntries(match.events.filter((e) => e.type === 'damage').map((e) => [e.targetUid, e.status]));
    expect(byTarget).toEqual({ [a.uid]: 'poison', [b.uid]: 'bleed', [c.uid]: 'both' });
  });

  it('ordinary damage has no status field', () => {
    const match = createMatch([], [], 0);
    const t = createCard(unit('t', 5));
    addUnit(match.players[1].board, 'melee', t);
    dealDamage(match, null, t, 1);
    expect(match.events[0]).not.toHaveProperty('status');
  });
});
