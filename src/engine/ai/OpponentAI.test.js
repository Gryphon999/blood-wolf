import { describe, it, expect } from 'vitest';
import { chooseMove } from './OpponentAI.js';
import { createMatch } from '../GwentMatch.js';
import { createCard } from '../Card.js';
import { addUnit } from '../Board.js';

const unit = (id, power, row = 'melee') => ({ id, row, power });

describe('chooseMove', () => {
  it('passes when the hand is empty', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 0);
    expect(chooseMove(match, 0)).toEqual({ type: 'pass' });
  });

  it('plays the highest-power card to its row', () => {
    const match = createMatch([unit('a', 2), unit('big', 9, 'ranged')], [unit('b', 1)], 2);
    expect(chooseMove(match, 0)).toEqual({ type: 'play', cardIndex: 1, row: 'ranged' });
  });

  it('maps an "any" row card to melee', () => {
    const match = createMatch([unit('a', 7, 'any')], [unit('b', 1)], 1);
    expect(chooseMove(match, 0)).toEqual({ type: 'play', cardIndex: 0, row: 'melee' });
  });

  it('prefers a card whose effect kills an enemy, and names the target', () => {
    const vanilla = { id: 'v', type: 'unit', row: 'melee', power: 4 };
    const killer = { id: 'k', type: 'unit', row: 'ranged', power: 3, deployEffect: 'damage', deployParam: 3 };
    const match = createMatch([unit('x', 1)], [vanilla, killer], 2);
    match.current = 1;
    addUnit(match.players[0].board, 'melee', createCard({ id: 'e', type: 'unit', row: 'melee', power: 3 }));
    const move = chooseMove(match, 1);
    expect(move).toMatchObject({ type: 'play', cardIndex: 1, row: 'ranged' });
    expect(move.target).toBe(match.players[0].board.melee[0]);
  });

  it('passes when the opponent has passed and it is already ahead', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1), unit('b2', 1)], 1);
    addUnit(match.players[1].board, 'melee', createCard({ id: 'lead', row: 'melee', power: 5 }));
    match.players[0].passed = true;
    expect(chooseMove(match, 1)).toEqual({ type: 'pass' });
  });
});

describe('chooseMove — layer 15 strategies', () => {
  const u = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

  it('fires a ready Order before playing a card (normal and hard)', () => {
    for (const difficulty of ['normal', 'hard']) {
      const match = createMatch([u('x', 1)], [u('a', 2), u('b', 2)], 2);
      match.current = 1;
      const sniper = createCard(u('sniper', 4, { row: 'ranged', hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 }));
      sniper.chargesLeft = 2;
      addUnit(match.players[1].board, 'ranged', sniper);
      addUnit(match.players[0].board, 'melee', createCard(u('foe', 2)));
      expect(chooseMove(match, 1, difficulty).type, difficulty).toBe('order');
    }
  });

  it('easy never uses Orders', () => {
    const match = createMatch([u('x', 1)], [u('a', 2)], 1);
    match.current = 1;
    const sniper = createCard(u('sniper', 4, { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 }));
    sniper.chargesLeft = 2;
    addUnit(match.players[1].board, 'melee', sniper);
    addUnit(match.players[0].board, 'melee', createCard(u('foe', 2)));
    expect(chooseMove(match, 1, 'easy').type).toBe('play');
  });

  it('never aims Blight at an empty row', () => {
    const blight = { id: 'blight', type: 'special', row: 'melee', power: 0, effect: 'sign_damage' };
    const match = createMatch([u('x', 1)], [blight], 1);
    match.current = 1;
    addUnit(match.players[0].board, 'ranged', createCard(u('r1', 3, { row: 'ranged' })));
    addUnit(match.players[0].board, 'ranged', createCard(u('r2', 3, { row: 'ranged' })));
    const move = chooseMove(match, 1, 'normal');
    expect(move).toMatchObject({ type: 'play', row: 'ranged' });
  });

  it('finishes the unit it can actually kill through armor', () => {
    const match = createMatch([u('x', 1)], [u('arch', 3, { deployEffect: 'damage', deployParam: 3 })], 1);
    match.current = 1;
    const armored = createCard(u('armored', 3, { armor: 2 }));
    const soft = createCard(u('soft', 3));
    addUnit(match.players[0].board, 'melee', armored);
    addUnit(match.players[0].board, 'melee', soft);
    for (const difficulty of ['normal', 'hard']) {
      expect(chooseMove(match, 1, difficulty).target, difficulty).toBe(soft);
    }
  });

  it('uses the leader when losing the round would lose the match', () => {
    const match = createMatch([u('x', 1)], [u('a', 1)], 1, { leaders: [null, { id: 'q', ability: 'damage_strongest', param: 4 }] });
    match.current = 1;
    match.players[0].roundsWon = 1;
    addUnit(match.players[0].board, 'melee', createCard(u('big', 6)));
    expect(chooseMove(match, 1, 'hard')).toEqual({ type: 'leader' });
  });

  it('does not overcommit: passes when the opponent passed and it is already ahead', () => {
    const match = createMatch([u('x', 1)], [u('a', 5), u('b', 5)], 1);
    match.current = 1;
    match.players[0].passed = true;
    addUnit(match.players[1].board, 'melee', createCard(u('lead', 3)));
    expect(chooseMove(match, 1, 'hard')).toEqual({ type: 'pass' });
  });

  it('plays the cheapest card that wins when the opponent passed and it is behind', () => {
    const match = createMatch([u('x', 1)], [u('big', 9), u('small', 3)], 2);
    match.current = 1;
    match.players[0].passed = true;
    addUnit(match.players[0].board, 'melee', createCard(u('foe', 2)));
    expect(chooseMove(match, 1, 'hard')).toMatchObject({ type: 'play', cardIndex: 1 });
  });
});
