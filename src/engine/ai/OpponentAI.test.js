import { describe, it, expect } from 'vitest';
import { chooseMove } from './OpponentAI.js';
import { createMatch } from '../GwentMatch.js';

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
});
