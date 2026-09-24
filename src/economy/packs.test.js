import { describe, it, expect } from 'vitest';
import { createProfile } from './profile.js';
import { openPack, rollPack, packPool, canOpenPack, PACK_COST, PACK_SIZE } from './packs.js';
import { seededRng } from '../engine/rng.js';

describe('packs', () => {
  it('the pool excludes leader cards', () => {
    expect(packPool().some((c) => c.tags.includes('leader'))).toBe(false);
  });

  it('rolls 5 cards with the last one rare or better', () => {
    for (let seed = 1; seed < 30; seed++) {
      const cards = rollPack(packPool(), seededRng(seed));
      expect(cards).toHaveLength(PACK_SIZE);
      expect(cards[PACK_SIZE - 1].rarity).not.toBe('common');
    }
  });

  it('costs gold, adds copies and flags new cards', () => {
    const p = createProfile();
    p.gold = PACK_COST + 10;
    const cards = openPack(p, seededRng(3));
    expect(p.gold).toBe(10);
    expect(cards).toHaveLength(5);
    for (const { def } of cards) expect(p.collection[def.id].count).toBeGreaterThanOrEqual(1);
    expect(cards.some((c) => c.isNew)).toBe(true);
    expect(p.stats.packsOpened).toBe(1);
  });

  it('duplicates increase the copy count', () => {
    const p = createProfile();
    p.gold = 10000;
    const pool = [packPool().find((c) => c.rarity === 'rare')];
    openPack(p, seededRng(1), pool);
    expect(p.collection[pool[0].id].count).toBe(5);
  });

  it('spends free packs first and refuses without gold', () => {
    const p = createProfile();
    p.freePacks = 1;
    openPack(p, seededRng(2));
    expect(p.freePacks).toBe(0);
    expect(p.gold).toBe(0);
    expect(canOpenPack(p)).toBe(false);
    expect(() => openPack(p)).toThrow();
  });
});
