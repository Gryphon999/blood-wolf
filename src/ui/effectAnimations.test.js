import { describe, it, expect } from 'vitest';
import { ANIMATIONS } from './effectAnimations.js';

const ENGINE_EVENT_TYPES = [
  'play', 'damage', 'shieldBreak', 'heal', 'boost', 'shield', 'destroy',
  'copyToHand', 'poison', 'bleed', 'rowDamage', 'control', 'draw', 'fizzle', 'armorBlock', 'cleanse',
];

describe('ANIMATIONS', () => {
  it('has an animation for every event type the engine emits', () => {
    for (const type of ENGINE_EVENT_TYPES) {
      expect(ANIMATIONS[type], type).toBeTypeOf('function');
    }
  });
});

describe('hitStyle', async () => {
  const { hitStyle } = await import('./effectAnimations.js');
  it('arrows for ranged, lightning for siege and lightning effects, melee otherwise', () => {
    expect(hitStyle({ row: 'ranged', deployEffect: 'damage' })).toBe('arrow');
    expect(hitStyle({ row: 'siege', orderEffect: 'damage_lock' })).toBe('lightning');
    expect(hitStyle({ row: 'ranged', type: 'special', effect: 'lightning' })).toBe('lightning');
    expect(hitStyle({ row: 'melee', deployEffect: 'damage' })).toBe('melee');
    expect(hitStyle(null)).toBe('melee');
  });
});
