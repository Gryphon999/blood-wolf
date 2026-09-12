import { PLAYER_DECK, AI_DECK } from './starterDecks.js';
import { SHOP_CARDS } from './shopCards.js';

const ALL = [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS];
const CATALOG = Object.fromEntries(ALL.map((card) => [card.id, card]));

export const ALL_CARD_IDS = ALL.map((card) => card.id);

export function getCard(id) {
  const def = CATALOG[id];
  if (!def) {
    throw new Error(`Unknown card: ${id}`);
  }
  return def;
}
