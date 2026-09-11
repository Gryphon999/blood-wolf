import { describe, it, expect } from 'vitest';
import { createBoard, addUnit, rowPower, totalPower, ROWS } from './Board.js';
import { createCard } from './Card.js';

describe('Board', () => {
  it('starts with three empty rows', () => {
    const board = createBoard();
    expect(totalPower(board)).toBe(0);
    expect(ROWS).toEqual(['melee', 'ranged', 'siege']);
  });

  it('sums power within a row', () => {
    const board = createBoard();
    addUnit(board, 'melee', createCard({ id: 'a', row: 'melee', power: 4 }));
    addUnit(board, 'melee', createCard({ id: 'b', row: 'melee', power: 6 }));
    expect(rowPower(board, 'melee')).toBe(10);
  });

  it('sums power across all rows', () => {
    const board = createBoard();
    addUnit(board, 'melee', createCard({ id: 'a', row: 'melee', power: 4 }));
    addUnit(board, 'ranged', createCard({ id: 'b', row: 'ranged', power: 3 }));
    addUnit(board, 'siege', createCard({ id: 'c', row: 'siege', power: 2 }));
    expect(totalPower(board)).toBe(9);
  });

  it('rejects an unknown row', () => {
    const board = createBoard();
    expect(() => addUnit(board, 'sky', createCard({ id: 'x', row: 'sky', power: 1 })))
      .toThrow('Unknown row: sky');
  });
});
