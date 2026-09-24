import { describe, it, expect } from 'vitest';
import { newSummary, accumulate, counterValue } from './matchSummary.js';

describe('match summary', () => {
  it('counts plays, spies, tags, orders, leader, kills and rounds', () => {
    const s = newSummary();
    accumulate(s, [
      { type: 'play', player: 0, def: { tags: ['undead'] } },
      { type: 'play', player: 1, owner: 0, spy: true, def: { tags: [] } },
      { type: 'play', player: 1, def: { tags: ['undead'] } },
      { type: 'order', player: 0 },
      { type: 'leader', player: 0 },
      { type: 'destroy', player: 1 },
      { type: 'destroy', player: 0 },
      { type: 'roundEnd', result: 0 },
      { type: 'roundEnd', result: 0 },
      { type: 'roundEnd', result: 1 },
    ]);
    expect(s).toMatchObject({ cardsPlayed: 2, spiesPlayed: 1, ordersUsed: 1, leaderUsed: 1, kills: 1, roundsWon: 2, roundsLost: 1 });
    expect(s.roundsWonNoOrders).toBe(1); // the first round had an Order
    expect(counterValue(s, 'tag:undead')).toBe(1);
    expect(counterValue(s, 'kills')).toBe(1);
  });
});
