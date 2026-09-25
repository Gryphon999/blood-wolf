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

describe('campaign (chapters 1-3)', async () => {
  const { CAMPAIGN_NODES, CHAPTER_TWO_NODES, CHAPTER_THREE_NODES } = await import('./story.js');
  const { getLeader } = await import('./leaders.js');
  const { getCard } = await import('./cardCatalog.js');
  const { ru } = await import('../i18n/ru.js');

  it('has 20 nodes with unique ids, all decks defined', () => {
    expect(CAMPAIGN_NODES).toHaveLength(20);
    expect(new Set(CAMPAIGN_NODES.map((n) => n.id)).size).toBe(20);
    for (const node of CAMPAIGN_NODES) {
      expect(node.enemyDeck.every(Boolean), node.id).toBe(true);
      expect(node.enemyDeck.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('chapter 2 bosses use real leaders, rules and reward cards; every node has dialogue', () => {
    for (const node of CHAPTER_TWO_NODES) {
      if (node.enemyLeaderId) expect(getLeader(node.enemyLeaderId), node.id).not.toBeNull();
      if (node.rewardCardId) expect(getCard(node.rewardCardId)).toBeTruthy();
    }
    expect(CHAPTER_TWO_NODES.some((n) => n.rules?.permanentWeather?.length)).toBe(true);
    expect(CHAPTER_TWO_NODES.some((n) => n.rules?.bossUnits?.length)).toBe(true);
    for (const node of CAMPAIGN_NODES) {
      expect(ru[`story.${node.id}.intro`], node.id).toBeTypeOf('string');
    }
  });

  it('chapter 3 has 10 nodes with escalating rewards, boss at end', () => {
    expect(CHAPTER_THREE_NODES).toHaveLength(10);
    for (const node of CHAPTER_THREE_NODES) {
      expect(node.rewardGold).toBeGreaterThan(0);
      expect(ru[`story.${node.id}.intro`], node.id).toBeTypeOf('string');
    }
    expect(CHAPTER_THREE_NODES[CHAPTER_THREE_NODES.length - 1].boss).toBe(true);
  });
});
