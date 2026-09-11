import { createMatch, playCard, pass } from './GwentMatch.js';
import { chooseMove } from './ai/OpponentAI.js';

export function playMatch(deckA, deckB, handSize = 10) {
  const match = createMatch(deckA, deckB, handSize);
  let safety = 1000;
  while (match.winner === null && safety-- > 0) {
    const move = chooseMove(match, match.current);
    if (move.type === 'pass') {
      pass(match);
    } else {
      playCard(match, move.cardIndex, move.row);
    }
  }
  if (match.winner === null) {
    throw new Error('playMatch did not terminate');
  }
  return match;
}
