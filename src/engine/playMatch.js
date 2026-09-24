import { createMatch, playCard, pass, useOrder, startTurn, mulligan } from './GwentMatch.js';
import { useLeader } from './leaders.js';
import { chooseMove, chooseMulligan, usesMulligan } from './ai/OpponentAI.js';

// Runs a full AI-vs-AI match. options.ai = [difficultyA, difficultyB], options.mulligan = true lets AIs that mulligan do so.
export function playMatch(deckA, deckB, handSize = 10, options = {}) {
  const { ai = ['normal', 'normal'], mulligan: doMulligan = false, ...matchOptions } = options;
  const match = createMatch(deckA, deckB, handSize, matchOptions);
  if (doMulligan) {
    [0, 1].forEach((p) => { if (usesMulligan(ai[p])) mulligan(match, p, chooseMulligan(match, p)); });
  }
  let safety = 2000;
  let lastTurn = -1;
  while (match.winner === null && safety-- > 0) {
    if (match.turn !== lastTurn) {
      lastTurn = match.turn;
      startTurn(match);
    }
    match.events.length = 0;
    const move = chooseMove(match, match.current, ai[match.current]);
    try {
      if (move.type === 'pass') pass(match);
      else if (move.type === 'order') useOrder(match, match.current, move.row, move.cardIdx, { target: move.target });
      else if (move.type === 'leader') useLeader(match, match.current);
      else playCard(match, move.cardIndex, move.row, { target: move.target });
    } catch {
      pass(match); // same fallback as the battle screen
    }
  }
  if (match.winner === null) {
    throw new Error('playMatch did not terminate');
  }
  return match;
}
