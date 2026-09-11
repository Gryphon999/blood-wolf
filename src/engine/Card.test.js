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
