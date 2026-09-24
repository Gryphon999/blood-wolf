import { SHOP_CARDS } from '../data/shopCards.js';
import { addCardCopy } from './profile.js';

export const PACK_COST = 200;
export const PACK_SIZE = 5;
export const PACK_WEIGHTS = { common: 60, rare: 28, epic: 9, legendary: 3 };
const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };

export function packPool() {
  return SHOP_CARDS.filter((c) => !c.tags?.includes('leader'));
}

function pickWeighted(pool, rng) {
  const weight = (d) => PACK_WEIGHTS[d.rarity] ?? PACK_WEIGHTS.common;
  let roll = rng() * pool.reduce((s, d) => s + weight(d), 0);
  for (const def of pool) {
    roll -= weight(def);
    if (roll < 0) return def;
  }
  return pool[pool.length - 1];
}

// 5 weighted cards; the last slot is always rare or better
export function rollPack(pool, rng = Math.random) {
  const cards = [];
  for (let i = 0; i < PACK_SIZE - 1; i++) cards.push(pickWeighted(pool, rng));
  cards.push(pickWeighted(pool.filter((d) => RARITY_RANK[d.rarity] >= 1), rng));
  return cards;
}

export function canOpenPack(profile) {
  return (profile.freePacks ?? 0) > 0 || profile.gold >= PACK_COST;
}

// Free packs (quest rewards) are spent before gold
export function openPack(profile, rng = Math.random, pool = packPool()) {
  if (!canOpenPack(profile)) throw new Error('Not enough gold for a pack');
  if ((profile.freePacks ?? 0) > 0) profile.freePacks -= 1;
  else profile.gold -= PACK_COST;
  const cards = rollPack(pool, rng).map((def) => {
    const isNew = !profile.collection[def.id];
    addCardCopy(profile, def.id);
    return { def, isNew };
  });
  profile.stats = { ...(profile.stats ?? {}), packsOpened: (profile.stats?.packsOpened ?? 0) + 1 };
  return cards;
}
