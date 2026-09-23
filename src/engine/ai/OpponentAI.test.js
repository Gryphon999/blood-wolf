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
