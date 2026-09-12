import { describe, it, expect } from 'vitest';
import { SHOP_CARDS } from './shopCards.js';

const ROWS = ['melee', 'ranged', 'siege'];

describe('shopCards', () => {
  it('offers five buyable cards, each priced above zero', () => {
    expect(SHOP_CARDS.length).toBe(5);
    for (const card of SHOP_CARDS) {
      expect(card.cost).toBeGreaterThan(0);
      expect(['unit', 'hero', 'special']).toContain(card.type);
      expect(ROWS).toContain(card.row);
    }
  });

  it('gives the special card an effect', () => {
    const special = SHOP_CARDS.find((c) => c.type === 'special');
    expect(typeof special.effect).toBe('string');
  });
});
