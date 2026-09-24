import { describe, it, expect } from 'vitest';
import { PLAYER_DECK, AI_DECK } from './starterDecks.js';
import { SHOP_CARDS } from './shopCards.js';
import {
  DEPLOY_DESCRIPTIONS, ORDER_DESCRIPTIONS, SPECIAL_DESCRIPTIONS, cardDescription,
} from '../ui/cardDescription.js';

const ALL = [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS];

describe('card design invariants', () => {
  it('every unit and hero does something (Deploy or Order)', () => {
    for (const card of ALL.filter((c) => c.type !== 'special')) {
      const trait = card.spy || card.muster || card.bond || card.berserker || card.ambush || card.vampirism;
      expect(Boolean(card.deployEffect) || card.hasOrder || Boolean(trait), `${card.id} has no action`).toBe(true);
    }
  });

  it('every deployEffect has a description (catches typos in effect ids)', () => {
    for (const card of ALL.filter((c) => c.deployEffect)) {
      expect(DEPLOY_DESCRIPTIONS[card.deployEffect], `${card.id}: ${card.deployEffect}`).toBeTypeOf('function');
    }
  });

  it('every orderEffect has a description', () => {
    for (const card of ALL.filter((c) => c.hasOrder)) {
      expect(ORDER_DESCRIPTIONS[card.orderEffect], `${card.id}: ${card.orderEffect}`).toBeTypeOf('function');
    }
  });

  it('every trait has a description line', () => {
    for (const card of ALL.filter((c) => c.spy || c.muster || c.bond || c.berserker || c.ambush || c.vampirism)) {
      expect(cardDescription(card), card.id).not.toBe('Единица без особых способностей');
    }
  });

  it('every special effect has a description', () => {
    for (const card of ALL.filter((c) => c.type === 'special')) {
      expect(SPECIAL_DESCRIPTIONS[card.effect], `${card.id}: ${card.effect}`).toBeTypeOf('string');
    }
  });

  it('the medic heals through Deploy, not through the old UI-only effect', () => {
    const medic = PLAYER_DECK.find((c) => c.id === 'medic');
    expect(medic.deployEffect).toBe('heal');
    expect(medic.effect).toBeNull();
  });
});
