import { describe, it, expect } from 'vitest';
import { SHOP_CARDS } from './shopCards.js';

const ROWS = ['melee', 'ranged', 'siege'];
const REQUIRED_FIELDS = ['id', 'name', 'faction', 'type', 'row', 'power', 'rarity', 'prov', 'cost',
  'tags', 'deployEffect', 'hasOrder', 'orderEffect', 'chargeMax', 'zeal', 'armor', 'resilience', 'doomed', 'immune'];

describe('shopCards', () => {
  it('has 36 buyable cards', () => {
    expect(SHOP_CARDS.length).toBe(36);
  });

  it('every card has all required fields', () => {
    for (const card of SHOP_CARDS) {
      for (const field of REQUIRED_FIELDS) {
        expect(card, `${card.id} missing ${field}`).toHaveProperty(field);
      }
      expect(ROWS).toContain(card.row);
      expect(['unit', 'hero', 'special']).toContain(card.type);
      expect(['humans', 'monsters']).toContain(card.faction);
    }
  });

  it('all card IDs are unique', () => {
    const ids = SHOP_CARDS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every special card has a non-null effect', () => {
    for (const card of SHOP_CARDS.filter(c => c.type === 'special')) {
      expect(typeof card.effect).toBe('string');
    }
  });

  it('Order cards have a non-null orderEffect', () => {
    for (const card of SHOP_CARDS.filter(c => c.hasOrder)) {
      expect(typeof card.orderEffect).toBe('string');
    }
  });

  it('Charge cards have chargeMax > 1', () => {
    const sniper = SHOP_CARDS.find(c => c.id === 'sniper');
    expect(sniper.chargeMax).toBe(2);
    const kingRaven = SHOP_CARDS.find(c => c.id === 'king_raven');
    expect(kingRaven.chargeMax).toBe(2);
  });

  it('regular Order cards (non-Charge) have chargeMax === 0', () => {
    const regularOrderIds = ['banner', 'paladin', 'eagle_eye', 'field_medic', 'alchemist', 'ballista', 'lich', 'archdemon'];
    for (const id of regularOrderIds) {
      const card = SHOP_CARDS.find(c => c.id === id);
      expect(card.chargeMax, `${id} should have chargeMax 0`).toBe(0);
    }
  });

  it('resilience and doomed cards are correctly flagged', () => {
    expect(SHOP_CARDS.find(c => c.id === 'paladin').resilience).toBe(true);
    expect(SHOP_CARDS.find(c => c.id === 'chaos_demon').doomed).toBe(true);
  });
});
