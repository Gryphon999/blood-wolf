import { buildFactionPool } from './factionPool.js';
import { randomLeader } from './leaders.js';

// Arena opponents: a fresh random faction, leader and deck each fight (story battles keep their fixed decks).
export const OPPONENT_FACTIONS = ['humans', 'monsters'];
export const OPPONENT_DECK_SIZE = 12;
export const OPPONENT_NAME_COUNT = 6; // i18n keys opponent.name.<faction>.<0..5>

// How likely each rarity is to be picked, per difficulty. Higher difficulty and rank bring stronger cards.
const RARITY_WEIGHT = {
  easy:   { common: 6, rare: 3, epic: 1,   legendary: 0.2 },
  normal: { common: 4, rare: 3, epic: 2,   legendary: 0.6 },
  hard:   { common: 2, rare: 3, epic: 3,   legendary: 1.2 },
};
const MAX_HEROES = { easy: 1, normal: 1, hard: 2 };
const MAX_SPECIALS = 2;
const MIN_UNITS = 7;

function weightOf(def, difficulty, rankBoost) {
  const table = RARITY_WEIGHT[difficulty] ?? RARITY_WEIGHT.normal;
  const base = table[def.rarity] ?? 1;
  return def.rarity === 'common' ? base : base * (1 + rankBoost);
}

function pickWeighted(items, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return items.length - 1;
}

/** Builds a legal deck (distinct cards) from the faction pool with limits on heroes and specials. */
export function buildOpponentDeck(faction, { difficulty = 'normal', points = 0, rng = Math.random, size = OPPONENT_DECK_SIZE } = {}) {
  const rankBoost = Math.min(1, Math.max(0, points) / 1500);
  const pool = buildFactionPool(faction);
  const deck = [];
  let heroes = 0;
  let specials = 0;
  while (deck.length < size && pool.length > 0) {
    const unitsLeft = size - deck.length;
    const unitsNow = deck.filter((c) => c.type === 'unit').length;
    // Keep enough slots for units: once only the minimum remains, stop taking specials and heroes
    const mustUnit = unitsNow + unitsLeft <= MIN_UNITS + 0 && unitsNow < MIN_UNITS;
    const candidates = pool.filter((def) => {
      if (def.type === 'special' && (specials >= MAX_SPECIALS || mustUnit)) return false;
      if (def.type === 'hero' && (heroes >= (MAX_HEROES[difficulty] ?? 1) || mustUnit)) return false;
      return true;
    });
    if (candidates.length === 0) break;
    const idx = pickWeighted(candidates, candidates.map((d) => weightOf(d, difficulty, rankBoost)), rng);
    const chosen = candidates[idx];
    pool.splice(pool.indexOf(chosen), 1);
    if (chosen.type === 'special') specials++;
    if (chosen.type === 'hero') heroes++;
    deck.push(chosen);
  }
  return deck;
}

/**
 * A random arena opponent. `avoid` is the key of the previous one so the same faction + leader never repeats twice in a row.
 * Returns { key, faction, leader, deck, nameIndex } (the display name comes from i18n `opponent.name.<faction>.<nameIndex>`).
 */
export function generateOpponent({ difficulty = 'normal', points = 0, rng = Math.random, avoid = null } = {}) {
  let result = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const faction = OPPONENT_FACTIONS[Math.floor(rng() * OPPONENT_FACTIONS.length) % OPPONENT_FACTIONS.length];
    const leader = randomLeader(faction, rng);
    const key = `${faction}:${leader?.id ?? 'none'}`;
    result = {
      key,
      faction,
      leader,
      deck: buildOpponentDeck(faction, { difficulty, points, rng }),
      nameIndex: Math.floor(rng() * OPPONENT_NAME_COUNT) % OPPONENT_NAME_COUNT,
    };
    if (key !== avoid) break;
  }
  return result;
}
