import { createCard } from './Card.js';
import { createBoard, addUnit } from './Board.js';

function makePlayer(deck, handSize) {
  const cards = deck.map(createCard);
  return {
    deck: cards.slice(handSize),
    hand: cards.slice(0, handSize),
    board: createBoard(),
    passed: false,
    roundsWon: 0,
  };
}

export function createMatch(deckA, deckB, handSize = 10) {
  return {
    players: [makePlayer(deckA, handSize), makePlayer(deckB, handSize)],
    current: 0,
    round: 1,
    roundStarter: 0,
    winner: null,
    lastRound: null,
  };
}

function passTurn(match) {
  const opponent = 1 - match.current;
  if (!match.players[opponent].passed) {
    match.current = opponent;
  }
}

export function playCard(match, cardIndex, row) {
  if (match.winner !== null) {
    throw new Error('Match is over');
  }
  const player = match.players[match.current];
  if (player.passed) {
    throw new Error('Player has already passed this round');
  }
  const card = player.hand[cardIndex];
  if (!card) {
    throw new Error(`No card at index ${cardIndex}`);
  }
  player.hand.splice(cardIndex, 1);
  addUnit(player.board, row, card);
  passTurn(match);
}
