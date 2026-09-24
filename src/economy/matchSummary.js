// Turns engine events into per-match counters for quests, achievements and rank.
export function newSummary() {
  return {
    cardsPlayed: 0, spiesPlayed: 0, tags: {}, ordersUsed: 0, leaderUsed: 0, kills: 0,
    roundsWon: 0, roundsLost: 0, roundsWonNoOrders: 0, ordersThisRound: 0,
  };
}

export function accumulate(summary, events, playerIdx = 0) {
  for (const ev of events) {
    switch (ev.type) {
      case 'play': {
        if ((ev.owner ?? ev.player) !== playerIdx) break;
        summary.cardsPlayed++;
        if (ev.spy) summary.spiesPlayed++;
        for (const tag of ev.def?.tags ?? []) summary.tags[tag] = (summary.tags[tag] ?? 0) + 1;
        break;
      }
      case 'order':
        if (ev.player === playerIdx) { summary.ordersUsed++; summary.ordersThisRound++; }
        break;
      case 'leader':
        if (ev.player === playerIdx) summary.leaderUsed++;
        break;
      case 'destroy':
        if (ev.player !== playerIdx) summary.kills++;
        break;
      case 'roundEnd':
        if (ev.result === playerIdx) {
          summary.roundsWon++;
          if (summary.ordersThisRound === 0) summary.roundsWonNoOrders++;
        } else if (ev.result !== 'draw') {
          summary.roundsLost++;
        }
        summary.ordersThisRound = 0;
        break;
      default:
        break;
    }
  }
  return summary;
}

// Value of a quest/achievement counter in a finished match summary
export function counterValue(summary, counter) {
  if (counter.startsWith('tag:')) return summary.tags[counter.slice(4)] ?? 0;
  return summary[counter] ?? 0;
}
