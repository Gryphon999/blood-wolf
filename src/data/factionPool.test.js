import { describe, it, expect } from 'vitest';
import { buildFactionPool } from './factionPool.js';

describe('buildFactionPool', () => {
  it('contains only the requested faction and no leaders', () => {
    const pool = buildFactionPool('humans');
    expect(pool.length).toBeGreaterThan(10);
    pool.forEach((c) => {
      expect(c.faction).toBe('humans');
      expect(c.tags ?? []).not.toContain('leader');
    });
  });

  it('lists each card name once (merc_a/b/c collapse into one entry)', () => {
    const names = buildFactionPool('humans').map((c) => c.name);
    expect(names.filter((n) => n === 'Наёмник')).toHaveLength(1);
    expect(new Set(names).size).toBe(names.length);
  });
});
