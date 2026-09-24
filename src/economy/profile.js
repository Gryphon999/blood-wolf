import { PLAYER_DECK } from '../data/starterDecks.js';
import { getCard } from '../data/cardCatalog.js';

const UPGRADE_COSTS = { 1: 150, 2: 400 };
const MAX_LEVEL = 3;

export function createProfile() {
  const collection = {};
  for (const card of PLAYER_DECK) {
    collection[card.id] = { count: 1, level: 1 };
  }
  return {
    gold: 0,
    wins: 0,
    collection,
    deck: PLAYER_DECK.map((card) => card.id),
    faction: 'humans',
    story: { cleared: 0 },
    leaders: {},
    difficulty: 'normal',
    lastChestAt: 0,
  };
}

// Fill fields added by later versions into an older saved profile
export function normalizeProfile(profile) {
  const fresh = createProfile();
  for (const [key, value] of Object.entries(fresh)) {
    if (profile[key] === undefined) profile[key] = value;
  }
  return profile;
}

export function setLeader(profile, faction, leaderId) {
  profile.leaders = { ...(profile.leaders ?? {}), [faction]: leaderId };
  return profile;
}

export function isNodeUnlocked(profile, index) {
  return index <= (profile.story?.cleared ?? 0);
}

export function isNodeCleared(profile, index) {
  return index < (profile.story?.cleared ?? 0);
}

export function clearNode(profile, index) {
  if (!profile.story) profile.story = { cleared: 0 };
  if (index === profile.story.cleared) {
    profile.story.cleared = index + 1;
  }
  return profile;
}

export function grantCard(profile, id) {
  if (!profile.collection[id]) {
    profile.collection[id] = { count: 1, level: 1 };
  }
  return profile;
}

export function addGold(profile, amount) {
  profile.gold += amount;
  return profile;
}

export function upgradeCost(level) {
  const cost = UPGRADE_COSTS[level];
  if (cost === undefined) {
    throw new Error(`Cannot upgrade from level ${level}`);
  }
  return cost;
}

export function canUpgrade(profile, id) {
  const owned = profile.collection[id];
  if (!owned) return false;
  if (getCard(id).type !== 'unit') return false;
  if (owned.level >= MAX_LEVEL) return false;
  return profile.gold >= upgradeCost(owned.level);
}

export function upgradeCard(profile, id) {
  if (!canUpgrade(profile, id)) {
    throw new Error(`Cannot upgrade card: ${id}`);
  }
  const owned = profile.collection[id];
  profile.gold -= upgradeCost(owned.level);
  owned.level += 1;
  return profile;
}

export function canBuy(profile, id) {
  if (profile.collection[id]) return false;
  return profile.gold >= getCard(id).cost;
}

export function buyCard(profile, id) {
  if (!canBuy(profile, id)) {
    throw new Error(`Cannot buy card: ${id}`);
  }
  profile.gold -= getCard(id).cost;
  profile.collection[id] = { count: 1, level: 1 };
  return profile;
}

export function toggleDeckCard(profile, id) {
  if (!profile.collection[id]) {
    throw new Error(`Card not in collection: ${id}`);
  }
  const i = profile.deck.indexOf(id);
  if (i >= 0) {
    profile.deck.splice(i, 1);
  } else {
    profile.deck.push(id);
  }
  return profile;
}

export function isDeckValid(profile) {
  return profile.deck.length >= 10;
}

export function buildDeckCards(profile) {
  return profile.deck.map((id) => {
    const def = getCard(id);
    const level = profile.collection[id]?.level ?? 1;
    const bonus = def.type === 'unit' ? level - 1 : 0;
    return { ...def, power: def.power + bonus };
  });
}

export function grantChestReward(profile, shopCards) {
  profile.gold += 100;
  const uncollected = shopCards.filter(c => !profile.collection[c.id]);
  if (uncollected.length > 0 && Math.random() < 0.2) {
    const card = uncollected[Math.floor(Math.random() * uncollected.length)];
    grantCard(profile, card.id);
  }
  return profile;
}
