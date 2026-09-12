import { describe, it, expect } from 'vitest';
import { rarityColor } from './rarity.js';

describe('rarityColor', () => {
  it('maps known rarities to distinct colors', () => {
    expect(rarityColor('common')).toBe(0x8a8a8a);
    expect(rarityColor('rare')).toBe(0x4a80c0);
    expect(rarityColor('epic')).toBe(0x9a4ac0);
    expect(rarityColor('legendary')).toBe(0xffd479);
  });

  it('falls back to a default color for unknown rarity', () => {
    expect(rarityColor(undefined)).toBe(0x8a6d3b);
    expect(rarityColor('mythic')).toBe(0x8a6d3b);
  });
});
