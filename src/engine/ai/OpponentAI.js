import { totalPower } from '../Board.js';
import { chooseTarget, effectValue } from './chooseTarget.js';

export function chooseMove(match, playerIndex) {
  const player = match.players[playerIndex];
  const opponent = match.players[1 - playerIndex];
  if (player.hand.length === 0) {
    return { type: 'pass' };
  }
  // Opponent is out of the round and we're ahead: don't waste cards
  if (opponent.passed
      && totalPower(player.board, match.weather) > totalPower(opponent.board, match.weather)) {
    return { type: 'pass' };
  }

  let best = null;
  player.hand.forEach((card, cardIndex) => {
    const target = chooseTarget(match, playerIndex, card, 'deploy');
    const score = card.power + effectValue(match, playerIndex, card, 'deploy', target);
    if (!best || score > best.score) best = { score, cardIndex, target };
  });

  const card = player.hand[best.cardIndex];
  const row = card.def.row === 'any' ? 'melee' : card.def.row;
  const move = { type: 'play', cardIndex: best.cardIndex, row };
  if (best.target !== null) move.target = best.target;
  return move;
}

// Mulligan: swap the weakest units (never specials), as many as can be replaced
export function chooseMulligan(match, playerIndex, max = 2) {
  const player = match.players[playerIndex];
  const supply = match.pools?.[playerIndex]?.length ? max : player.deck.length;
  const n = Math.min(max, supply);
  if (n <= 0) return [];
  return player.hand
    .map((card, i) => ({ card, i }))
    .filter(({ card }) => card.def.type !== 'special')
    .sort((a, b) => a.card.power - b.card.power)
    .slice(0, n)
    .map(({ i }) => i);
}
