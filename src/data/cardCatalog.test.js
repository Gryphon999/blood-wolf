import { describe, it, expect } from 'vitest';
import { getCard, ALL_CARD_IDS } from './cardCatalog.js';

describe('cardCatalog', () => {
  it('returns a card definition by id', () => {
    expect(getCard('knight').name).toBe('Рыцарь');
  });

  it('throws on an unknown id', () => {
    expect(() => getCard('nope')).toThrow('Unknown card: nope');
  });

  it('lists all card ids', () => {
    expect(ALL_CARD_IDS).toContain('knight');
    expect(ALL_CARD_IDS).toContain('ghoul_a');
  });
});
