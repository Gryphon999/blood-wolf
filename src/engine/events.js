import { ROWS } from './Board.js';

export function emit(match, event) {
  match.events.push(event);
}

export function drainEvents(match) {
  const events = match.events;
  match.events = [];
  return events;
}

export function findCardByUid(match, uid) {
  for (const player of match.players) {
    for (const row of ROWS) {
      const onBoard = player.board[row].find((c) => c.uid === uid);
      if (onBoard) return onBoard;
    }
    const inHand = player.hand.find((c) => c.uid === uid);
    if (inHand) return inHand;
    const inGrave = player.graveyard.find((c) => c.uid === uid);
    if (inGrave) return inGrave;
  }
  return null;
}

export function locateOnBoard(match, card) {
  for (let player = 0; player < match.players.length; player++) {
    for (const row of ROWS) {
      const index = match.players[player].board[row].indexOf(card);
      if (index !== -1) return { player, row, index };
    }
  }
  return null;
}
