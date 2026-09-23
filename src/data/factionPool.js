import { PLAYER_DECK, AI_DECK } from './starterDecks.js';
import { SHOP_CARDS } from './shopCards.js';

// Every card of the faction once (by name), leaders excluded
export function buildFactionPool(faction) {
  const seen = new Set();
  return [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS].filter((def) => {
    if (def.faction !== faction || def.tags?.includes('leader')) return false;
    if (seen.has(def.name)) return false;
    seen.add(def.name);
    return true;
  });
}
