import { describe, it, expect } from 'vitest';
import { createCard } from './Card.js';

describe('createCard', () => {
  it('copies base power into current power', () => {
    const card = createCard({ id: 'wolf', row: 'melee', power: 5 });
    expect(card.power).toBe(5);
  });

  it('keeps the original definition accessible', () => {
    const def = { id: 'wolf', row: 'melee', power: 5 };
    const card = createCard(def);
    expect(card.def).toBe(def);
  });
});

describe('createCard — runtime state fields', () => {
  it('initializes armorLeft from def.armor', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5, armor: 3 });
    expect(card.armorLeft).toBe(3);
  });

  it('initializes armorLeft to 0 when def.armor is absent', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5 });
    expect(card.armorLeft).toBe(0);
  });

  it('initializes chargesLeft from def.chargeMax', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5, hasOrder: true, chargeMax: 2 });
    expect(card.chargesLeft).toBe(2);
  });

  it('initializes orderUsed to false', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5 });
    expect(card.orderUsed).toBe(false);
  });

  it('initializes bleedStacks, poisoned, locked, shielded, controlled all falsy', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5 });
    expect(card.bleedStacks).toBe(0);
    expect(card.poisoned).toBe(false);
    expect(card.locked).toBe(false);
    expect(card.shielded).toBe(false);
    expect(card.controlled).toBe(false);
  });
});

describe('createCard — identity', () => {
  it('assigns a unique, increasing uid to every instance', () => {
    const def = { id: 'a', row: 'melee', power: 1 };
    const first = createCard(def);
    const second = createCard(def);
    expect(typeof first.uid).toBe('number');
    expect(second.uid).toBeGreaterThan(first.uid);
  });

  it('is not a copy by default', () => {
    expect(createCard({ id: 'a', row: 'melee', power: 1 }).isCopy).toBe(false);
  });
});
