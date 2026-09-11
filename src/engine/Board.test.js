import { describe, it, expect } from 'vitest';
import { createBoard, addUnit, rowPower, totalPower, ROWS, effectivePower } from './Board.js';
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

describe('effectivePower', () => {
  it('returns base power with no weather or horn', () => {
    const board = createBoard();
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set())).toBe(5);
  });

  it('weather sets a non-hero to 1', () => {
    const board = createBoard();
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set(['melee']))).toBe(1);
  });

  it('horn doubles a non-hero', () => {
    const board = createBoard();
    board.horns.add('melee');
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set())).toBe(10);
  });

  it('weather then horn yields 2', () => {
    const board = createBoard();
    board.horns.add('melee');
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set(['melee']))).toBe(2);
  });

  it('a hero ignores weather and horn', () => {
    const board = createBoard();
    board.horns.add('melee');
    const hero = createCard({ id: 'h', type: 'hero', row: 'melee', power: 7 });
    expect(effectivePower(hero, 'melee', board, new Set(['melee']))).toBe(7);
  });
});

describe('rowPower with auras', () => {
  it('applies weather across the whole row', () => {
    const board = createBoard();
    addUnit(board, 'melee', createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 }));
    addUnit(board, 'melee', createCard({ id: 'b', type: 'unit', row: 'melee', power: 3 }));
    expect(rowPower(board, 'melee', new Set(['melee']))).toBe(2); // 1 + 1
  });
});
