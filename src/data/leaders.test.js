import { describe, it, expect } from 'vitest';
import { LEADERS, leadersOf, chosenLeader, randomLeader } from './leaders.js';
import { LEADER_ABILITIES } from '../engine/leaders.js';
import { ru } from '../i18n/ru.js';

describe('leaders data', () => {
  it('each faction has 2-3 leaders with known abilities and translated names', () => {
    for (const faction of ['humans', 'monsters']) {
      const list = leadersOf(faction);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.length).toBeLessThanOrEqual(3);
    }
    for (const l of LEADERS) {
      expect(LEADER_ABILITIES).toContain(l.ability);
      expect(ru[`leader.${l.id}`], l.id).toBeTypeOf('string');
      expect(ru[`leader.${l.id}.desc`], l.id).toBeTypeOf('string');
    }
  });

  it('chosenLeader respects the profile and falls back to the first', () => {
    expect(chosenLeader({ leaders: { humans: 'queen_elina' } }, 'humans').id).toBe('queen_elina');
    expect(chosenLeader({}, 'monsters').id).toBe('brood_queen');
    expect(chosenLeader({ leaders: { humans: 'bone_lord' } }, 'humans').id).toBe('bone_lord'); // id wins, even cross-faction
  });

  it('randomLeader picks from the faction', () => {
    expect(randomLeader('monsters', () => 0.99).faction).toBe('monsters');
  });
});
