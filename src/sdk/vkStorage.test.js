import { describe, expect, it } from 'vitest';
import { MAX_PARTS, partKeys, splitSave } from './vkStorage.js';

describe('VK cloud save parts', () => {
  it('fit the 4096-byte value limit and join back losslessly', () => {
    const json = JSON.stringify({ name: 'Волк'.repeat(900), deck: Array.from({ length: 40 }, (_, i) => `card_${i}`) });
    const parts = splitSave(json);
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(4096);
    expect(parts.join('')).toBe(json);
  });

  it('name one key per part and never more than the cap', () => {
    expect(partKeys(3)).toEqual(['profile_0', 'profile_1', 'profile_2']);
    expect(partKeys(500)).toHaveLength(MAX_PARTS);
    expect(splitSave('')).toEqual([]);
  });
});
