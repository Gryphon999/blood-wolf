import { describe, it, expect } from 'vitest';
import {
  STORY_NODES, CHAPTER_TWO_NODES, CAMPAIGN_NODES, STORY_TUNING, storyAi, storyDeck, storyRules, newMechanics,
} from './story.js';

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

describe('story difficulty curve', () => {
  it('tunes every campaign node', () => {
    for (const node of CAMPAIGN_NODES) expect(STORY_TUNING[node.id], node.id).toBeDefined();
  });

  it('opens each chapter with the easy AI', () => {
    const firsts = [0, STORY_NODES.length, STORY_NODES.length + CHAPTER_TWO_NODES.length];
    for (const i of firsts) expect(storyAi(i)).toBe('easy');
  });

  it('shifts the AI one step with the menu difficulty, clamped', () => {
    expect(storyAi(0, 'easy')).toBe('easy');
    expect(storyAi(0, 'hard')).toBe('normal');
    const last = CAMPAIGN_NODES.length - 1;
    expect(storyAi(last, 'hard')).toBe('hard');
    expect(storyAi(last, 'easy')).toBe('normal');
  });

  it('applies the power tuning to units and heroes, never below 1', () => {
    const node = CAMPAIGN_NODES.find((n) => n.id === 'blood_wolf');
    const { power, heroes } = STORY_TUNING.blood_wolf;
    storyDeck(node).forEach((card, i) => {
      const printed = node.enemyDeck[i];
      if (printed.type === 'unit') expect(card.power).toBe(Math.max(1, printed.power + power));
      else if (printed.type === 'hero') expect(card.power).toBe(Math.max(1, printed.power + heroes));
      else expect(card).toBe(printed);
    });
    expect(node.enemyDeck.some((c) => c.power !== storyDeck(node)[node.enemyDeck.indexOf(c)].power)).toBe(true);
  });

  it('leaves untuned decks and rules untouched', () => {
    const node = CAMPAIGN_NODES.find((n) => n.id === 'bandits');
    expect(storyDeck(node)).toBe(node.enemyDeck);
    expect(storyRules(node)).toBe(node.rules ?? null);
  });

  it('weakens boss units with the hero tuning', () => {
    const node = CAMPAIGN_NODES.find((n) => n.id === 'lich_emperor');
    const boss = node.rules.bossUnits[0];
    expect(storyRules(node).bossUnits[0].power).toBe(Math.max(1, boss.power + STORY_TUNING.lich_emperor.heroes));
  });
});

describe('new mechanics per node', () => {
  it('introduces nothing in the first fight and the War Horn in the second', () => {
    expect(newMechanics(0)).toEqual([]);
    expect(newMechanics(1)).toEqual(['horn']);
  });

  it('introduces each mechanic once, and every one has a hint text', async () => {
    const { ru } = await import('../i18n/ru.js');
    const all = CAMPAIGN_NODES.flatMap((_, i) => newMechanics(i));
    expect(new Set(all).size).toBe(all.length);
    for (const key of all) expect(ru[`story.new.${key}`], key).toBeTruthy();
  });
});
