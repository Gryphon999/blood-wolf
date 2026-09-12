import { describe, it, expect } from 'vitest';
import { STORY_NODES } from './story.js';

describe('story nodes', () => {
  it('has five campaign nodes', () => {
    expect(STORY_NODES.length).toBe(5);
  });

  it('every node has a non-empty enemy deck and a gold reward', () => {
    for (const node of STORY_NODES) {
      expect(node.enemyDeck.length).toBeGreaterThan(0);
      expect(node.rewardGold).toBeGreaterThan(0);
    }
  });

  it('the final node (boss) rewards a card', () => {
    expect(typeof STORY_NODES[STORY_NODES.length - 1].rewardCardId).toBe('string');
  });
});
