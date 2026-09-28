import { describe, it, expect } from 'vitest';
import { LEADERS, ENEMY_LEADERS, ALL_LEADERS, leadersOf, chosenLeader, randomLeader, getLeader } from './leaders.js';
import { CAMPAIGN_NODES } from './story.js';
import { en } from '../i18n/en.js';
import { LEADER_ABILITIES } from '../engine/leaders.js';
import { ru } from '../i18n/ru.js';

describe('leaders data', () => {
  it('each faction has 2-3 leaders with known abilities and translated names', () => {
    for (const faction of ['humans', 'monsters']) {
      const list = leadersOf(faction);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.length).toBeLessThanOrEqual(3);
    }
    for (const l of ALL_LEADERS) {
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

  it('every leader has a unique id, a figure and an English name', () => {
    expect(new Set(ALL_LEADERS.map((l) => l.id)).size).toBe(ALL_LEADERS.length);
    for (const l of ALL_LEADERS) {
      expect(l.art, l.id).toBeTypeOf('string');
      expect(en[`leader.${l.id}`], l.id).toBeTypeOf('string');
    }
  });

  it('campaign leaders are never offered to the player or the arena', () => {
    const playable = [...leadersOf('humans'), ...leadersOf('monsters')];
    expect(playable).toEqual(LEADERS);
    expect(playable.some((l) => l.enemyOnly)).toBe(false);
    expect(chosenLeader({ leaders: { monsters: 'lich_emperor' } }, 'monsters').id).toBe('brood_queen');
    for (let i = 0; i < 20; i++) expect(randomLeader('monsters', () => i / 20).enemyOnly).toBeFalsy();
  });

  it('every campaign enemy is led by a known leader, each campaign leader is used', () => {
    for (const node of CAMPAIGN_NODES) expect(getLeader(node.enemyLeaderId), node.id).not.toBeNull();
    const used = new Set(CAMPAIGN_NODES.map((n) => n.enemyLeaderId));
    for (const l of ENEMY_LEADERS) expect(used.has(l.id), l.id).toBe(true);
  });
});
