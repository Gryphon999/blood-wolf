import { describe, it, expect } from 'vitest';
import { SCREEN, ROW_NAMES, rowY, handCardX } from './layout.js';

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
