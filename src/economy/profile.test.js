import { describe, it, expect } from 'vitest';
import {
  createProfile, addGold, upgradeCost, canUpgrade, upgradeCard,
  toggleDeckCard, isDeckValid, buildDeckCards,
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
