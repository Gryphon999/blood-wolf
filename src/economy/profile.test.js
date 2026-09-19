import { describe, it, expect, vi } from 'vitest';
import {
  createProfile, addGold, upgradeCost, canUpgrade, upgradeCard,
  toggleDeckCard, isDeckValid, buildDeckCards, canBuy, buyCard,
  isNodeUnlocked, isNodeCleared, clearNode, grantCard, grantChestReward,
} from './profile.js';

describe('profile', () => {
  it('starts with gold 0 and a full starter collection/deck', () => {
    const p = createProfile();
    expect(p.gold).toBe(0);
    expect(p.collection['knight']).toEqual({ count: 1, level: 1 });
    expect(p.deck.length).toBeGreaterThanOrEqual(10);
    expect(isDeckValid(p)).toBe(true);
  });

  it('adds gold', () => {
    const p = createProfile();
    addGold(p, 50);
    expect(p.gold).toBe(50);
  });

  it('exposes upgrade costs and rejects maxed level', () => {
    expect(upgradeCost(1)).toBe(150);
    expect(upgradeCost(2)).toBe(400);
    expect(() => upgradeCost(3)).toThrow('Cannot upgrade from level 3');
  });

  it('upgrades a unit card, spending gold and raising level', () => {
    const p = createProfile();
    addGold(p, 200);
    expect(canUpgrade(p, 'knight')).toBe(true);
    upgradeCard(p, 'knight');
    expect(p.collection['knight'].level).toBe(2);
    expect(p.gold).toBe(50);
  });

  it('refuses to upgrade without enough gold', () => {
    const p = createProfile();
    expect(canUpgrade(p, 'knight')).toBe(false);
    expect(() => upgradeCard(p, 'knight')).toThrow('Cannot upgrade card: knight');
  });

  it('refuses to upgrade non-unit cards', () => {
    const p = createProfile();
    addGold(p, 1000);
    expect(canUpgrade(p, 'warhorn')).toBe(false);
    expect(canUpgrade(p, 'champion')).toBe(false);
  });

  it('toggles cards in and out of the deck', () => {
    const p = createProfile();
    toggleDeckCard(p, 'knight');
    expect(p.deck).not.toContain('knight');
    toggleDeckCard(p, 'knight');
    expect(p.deck).toContain('knight');
  });

  it('applies upgrade level to unit power when building the deck', () => {
    const p = createProfile();
    addGold(p, 200);
    upgradeCard(p, 'knight');
    const knight = buildDeckCards(p).find((c) => c.id === 'knight');
    expect(knight.power).toBe(7);
  });
});

describe('shop purchases', () => {
  it('buys a card the player can afford, spending gold and adding to collection', () => {
    const p = createProfile();
    addGold(p, 150);
    expect(canBuy(p, 'guard')).toBe(true);
    buyCard(p, 'guard');
    expect(p.gold).toBe(50);
    expect(p.collection['guard']).toEqual({ count: 1, level: 1 });
  });

  it('cannot buy a card already owned', () => {
    const p = createProfile();
    addGold(p, 1000);
    buyCard(p, 'guard');
    expect(canBuy(p, 'guard')).toBe(false);
    expect(() => buyCard(p, 'guard')).toThrow('Cannot buy card: guard');
  });

  it('cannot buy without enough gold', () => {
    const p = createProfile();
    expect(canBuy(p, 'paladin')).toBe(false);
    expect(() => buyCard(p, 'paladin')).toThrow('Cannot buy card: paladin');
  });
});

describe('story progress', () => {
  it('starts with only the first node unlocked', () => {
    const p = createProfile();
    expect(p.story.cleared).toBe(0);
    expect(isNodeUnlocked(p, 0)).toBe(true);
    expect(isNodeUnlocked(p, 1)).toBe(false);
    expect(isNodeCleared(p, 0)).toBe(false);
  });

  it('clearing the frontier node unlocks the next', () => {
    const p = createProfile();
    clearNode(p, 0);
    expect(p.story.cleared).toBe(1);
    expect(isNodeCleared(p, 0)).toBe(true);
    expect(isNodeUnlocked(p, 1)).toBe(true);
  });

  it('clearing a non-frontier node is a no-op', () => {
    const p = createProfile();
    clearNode(p, 2);
    expect(p.story.cleared).toBe(0);
  });

  it('grants a card into the collection', () => {
    const p = createProfile();
    grantCard(p, 'paladin');
    expect(p.collection['paladin']).toEqual({ count: 1, level: 1 });
  });
});

describe('createProfile — wins field', () => {
  it('initializes wins to zero', () => {
    const p = createProfile();
    expect(p.wins).toBe(0);
  });
});

describe('grantChestReward', () => {
  it('adds 100 gold', () => {
    const p = createProfile();
    grantChestReward(p, []);
    expect(p.gold).toBe(100);
  });

  it('grants an uncollected card when Math.random < 0.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const p = createProfile();
    grantChestReward(p, [{ id: 'rare_card' }]);
    expect(p.collection['rare_card']).toBeDefined();
    vi.restoreAllMocks();
  });

  it('skips card when Math.random >= 0.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const p = createProfile();
    grantChestReward(p, [{ id: 'rare_card' }]);
    expect(p.collection['rare_card']).toBeUndefined();
    vi.restoreAllMocks();
  });

  it('skips cards already in collection', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const p = createProfile(); // медик уже в коллекции из starterDecks
    const before = { ...p.collection };
    grantChestReward(p, [{ id: 'medic' }]);
    expect(p.collection).toEqual(before); // коллекция не изменилась, только золото
    expect(p.gold).toBe(100);
    vi.restoreAllMocks();
  });
});
