import { describe, it, expect } from 'vitest';
import { ANIMATIONS } from './effectAnimations.js';

const ENGINE_EVENT_TYPES = [
  'play', 'damage', 'shieldBreak', 'heal', 'boost', 'shield', 'destroy',
  'copyToHand', 'poison', 'bleed', 'rowDamage', 'control', 'draw', 'fizzle',
];

describe('ANIMATIONS', () => {
  it('has an animation for every event type the engine emits', () => {
    for (const type of ENGINE_EVENT_TYPES) {
      expect(ANIMATIONS[type], type).toBeTypeOf('function');
    }
  });
});
