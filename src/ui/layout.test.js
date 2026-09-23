import { describe, it, expect } from 'vitest';
import { SCREEN, ROW_NAMES, rowY, handCardX, boardCardX, BOARD_CARD_SCALE } from './layout.js';

describe('layout', () => {
  it('lists the three rows in order', () => {
    expect(ROW_NAMES).toEqual(['melee', 'ranged', 'siege']);
  });

  it('puts player rows below centre and opponent rows above', () => {
    expect(rowY('player', 'melee')).toBeGreaterThan(SCREEN.height / 2);
    expect(rowY('opponent', 'melee')).toBeLessThan(SCREEN.height / 2);
  });

  it('keeps melee closest to the centre on each side', () => {
    expect(rowY('player', 'melee')).toBeLessThan(rowY('player', 'siege'));
    expect(rowY('opponent', 'melee')).toBeGreaterThan(rowY('opponent', 'siege'));
  });

  it('throws on an unknown row', () => {
    expect(() => rowY('player', 'sky')).toThrow('Unknown row: sky');
  });

  it('centres the hand horizontally', () => {
    const first = handCardX(0, 4);
    const last = handCardX(3, 4);
    expect(first).toBeLessThan(last);
    expect((first + last) / 2).toBeCloseTo(SCREEN.width / 2, 0);
  });
});

describe('boardCardX', () => {
  it('places board cards left to right with a fixed step', () => {
    expect(BOARD_CARD_SCALE).toBe(0.6);
    expect(boardCardX(0)).toBe(220);
    expect(boardCardX(1)).toBe(220 + 100 * 0.6 + 6);
  });
});
