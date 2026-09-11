import { createCard } from './Card.js';
import { createBoard, addUnit, totalPower, ROWS } from './Board.js';

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
    weather: new Set(),
  };
}

function passTurn(match) {
  const opponent = 1 - match.current;
  if (!match.players[opponent].passed) {
    match.current = opponent;
  }
}

const WEATHER_ROW = {
  weather_frost: 'melee',
  weather_fog: 'ranged',
  weather_rain: 'siege',
};

function applyEffect(match, effect, row) {
  if (effect in WEATHER_ROW) {
    match.weather.add(WEATHER_ROW[effect]);
    return;
  }
  if (effect === 'clear') {
    match.weather.clear();
    return;
  }
  if (effect === 'horn') {
    if (!ROWS.includes(row)) {
      throw new Error(`Unknown row: ${row}`);
    }
    match.players[match.current].board.horns.add(row);
    return;
  }
  if (effect === 'sign_damage') {
    if (!ROWS.includes(row)) {
      throw new Error(`Unknown row: ${row}`);
    }
    const opponentBoard = match.players[1 - match.current].board;
    for (const card of opponentBoard[row]) {
      if (card.def.type !== 'hero') {
        card.power = Math.max(1, card.power - 2);
      }
    }
    return;
  }
  throw new Error(`Unknown effect: ${effect}`);
}

function applyCard(match, card, row) {
  if (card.def.type === 'special') {
    applyEffect(match, card.def.effect, row);
    return;
  }
  addUnit(match.players[match.current].board, row, card);
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
  applyCard(match, card, row);
  passTurn(match);
}

function startNextRound(match, lastResult) {
  for (const player of match.players) {
    player.board = createBoard();
    player.passed = false;
  }
  match.round++;
  match.roundStarter = lastResult === 'draw'
    ? 1 - match.roundStarter
    : 1 - lastResult; // the loser starts the next round
  match.current = match.roundStarter;
  match.weather.clear();
}

function finishMatch(match) {
  const [p0, p1] = match.players;
  if (p0.roundsWon >= 2 && p1.roundsWon >= 2) {
    match.winner = 'draw';
  } else if (p0.roundsWon >= 2) {
    match.winner = 0;
  } else {
    match.winner = 1;
  }
}

function resolveRound(match) {
  const [p0, p1] = match.players;
  const power0 = totalPower(p0.board, match.weather);
  const power1 = totalPower(p1.board, match.weather);

  let result;
  if (power0 > power1) {
    p0.roundsWon++;
    result = 0;
  } else if (power1 > power0) {
    p1.roundsWon++;
    result = 1;
  } else {
    p0.roundsWon++;
    p1.roundsWon++;
    result = 'draw';
  }
  match.lastRound = result;

  if (p0.roundsWon >= 2 || p1.roundsWon >= 2) {
    finishMatch(match);
    return;
  }
  startNextRound(match, result);
}

export function hasLegalMove(match) {
  if (match.winner !== null) {
    return false;
  }
  const player = match.players[match.current];
  return !player.passed && player.hand.length > 0;
}

export function pass(match) {
  if (match.winner !== null) {
    throw new Error('Match is over');
  }
  const player = match.players[match.current];
  player.passed = true;
  if (match.players[1 - match.current].passed) {
    resolveRound(match);
  } else {
    match.current = 1 - match.current;
  }
}
