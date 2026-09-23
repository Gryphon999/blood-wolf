import { createCard } from './Card.js';
import { createBoard, addUnit, totalPower, ROWS } from './Board.js';
import { applyDeploy, applyOrder } from './effects.js';

function makePlayer(deck, handSize) {
  const cards = deck.map(createCard);
  return {
    deck: cards.slice(handSize),
    hand: cards.slice(0, handSize),
    board: createBoard(),
    graveyard: [],
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
    if (!ROWS.includes(row)) throw new Error(`Unknown row: ${row}`);
    match.players[match.current].board.horns.add(row);
    return;
  }
  if (effect === 'sign_damage') {
    if (!ROWS.includes(row)) throw new Error(`Unknown row: ${row}`);
    const opponentBoard = match.players[1 - match.current].board;
    for (const card of opponentBoard[row]) {
      if (card.def.type !== 'hero') card.power = Math.max(1, card.power - 2);
    }
    return;
  }
  if (effect === 'lightning_ranged') {
    const oppBoard = match.players[1 - match.current].board;
    const units = oppBoard.ranged.filter(c => c.def.type !== 'hero');
    const target = units.length ? units.reduce((a, b) => (a.power >= b.power ? a : b)) : null;
    if (target) target.power = Math.max(1, target.power - 3);
    return;
  }
  if (effect === 'blessing_humans') {
    const ownBoard = match.players[match.current].board;
    ROWS.forEach(r => ownBoard[r].forEach(c => {
      if (c.def.faction === 'humans') c.power += 2;
    }));
    return;
  }
  if (effect === 'order_ready') {
    const ownBoard = match.players[match.current].board;
    ROWS.forEach(r => ownBoard[r].forEach(c => {
      if (c.def.hasOrder && c.def.chargeMax === 0) c.orderUsed = false;
    }));
    return;
  }
  if (effect === 'fog_frost_combo') {
    match.weather.add('ranged');
    match.weather.add('melee');
    return;
  }
  if (effect === 'bleed_all_enemies') {
    const oppBoard = match.players[1 - match.current].board;
    ROWS.forEach(r => oppBoard[r].forEach(c => {
      if (c.def.type !== 'hero') c.bleedStacks++;
    }));
    return;
  }
  if (effect === 'scorch') {
    // Destroy all non-hero units tied for highest power if that power >= 10
    const candidates = [];
    for (const pl of match.players) {
      for (const r of ROWS) {
        pl.board[r].forEach(c => {
          if (c.def.type !== 'hero') candidates.push({ card: c, player: pl, row: r });
        });
      }
    }
    const maxPow = candidates.reduce((m, e) => Math.max(m, e.card.power), 0);
    if (maxPow >= 10) {
      candidates.filter(e => e.card.power === maxPow).forEach(e => {
        const idx = e.player.board[e.row].indexOf(e.card);
        if (idx !== -1) e.player.board[e.row].splice(idx, 1);
        // Scorched cards are doomed — go to neither graveyard
      });
    }
    return;
  }
  // 'heal' is handled by BattleScene (awaitingHeal flow), not the engine
  if (effect === 'heal') return;
  throw new Error(`Unknown effect: ${effect}`);
}

function applyCard(match, card, row) {
  if (card.def.type === 'special') {
    applyEffect(match, card.def.effect, row);
    return;
  }
  addUnit(match.players[match.current].board, row, card);
  // Non-Zeal Order cards can't act the turn they're played
  if (card.def.hasOrder && !card.def.zeal && card.def.chargeMax === 0) {
    card.orderUsed = true;
  }
  applyDeploy(match, card, match.current);
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
    for (const row of ROWS) {
      const kept = [];
      for (const card of player.board[row]) {
        if (card.def.resilience) {
          card.orderUsed = false; // reset Order for next round
          kept.push(card);
        } else if (!card.def.doomed) {
          player.graveyard.push(card); // normal cards → graveyard
          // doomed cards are simply dropped (neither kept nor graveyard)
        }
      }
      player.board[row] = kept;
    }
    player.passed = false;
    // Werewolves get +2 at the start of each new round
    for (const row of ROWS) {
      for (const card of player.board[row]) {
        if (card.werewolf) card.power += 2;
      }
    }
  }
  match.round++;
  match.roundStarter = lastResult === 'draw'
    ? 1 - match.roundStarter
    : 1 - lastResult;
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

export function healUnit(match, playerIndex, row, cardIndex) {
  const card = match.players[playerIndex]?.board[row]?.[cardIndex];
  if (!card) throw new Error(`No card at ${row}[${cardIndex}]`);
  if (card.def.type === 'hero') throw new Error('Cannot heal a hero');
  if (card.power === card.def.power) throw new Error('Card is not weakened');
  card.power = card.def.power;
}

export function startTurn(match) {
  // Tick status effects for all cards on all boards
  for (const player of match.players) {
    for (const row of ROWS) {
      for (const card of player.board[row]) {
        if (card.def.type === 'hero') continue; // heroes immune
        if (card.bleedStacks > 0) {
          card.power = Math.max(1, card.power - card.bleedStacks);
        }
        if (card.poisoned) {
          card.power = Math.max(1, card.power - 1);
        }
      }
    }
  }
  // Reset regular Order (not Charge) for the current player
  for (const row of ROWS) {
    for (const card of match.players[match.current].board[row]) {
      if (card.def.hasOrder && card.def.chargeMax === 0) {
        card.orderUsed = false;
      }
    }
  }
}

export function useOrder(match, playerIdx, row, cardIdx, opts = {}) {
  const card = match.players[playerIdx]?.board[row]?.[cardIdx];
  if (!card) throw new Error(`No card at ${row}[${cardIdx}]`);
  if (!card.def.hasOrder) throw new Error('Card has no Order ability');
  if (card.locked) throw new Error('Card is locked');

  const isCharge = card.def.chargeMax > 0;
  if (isCharge) {
    if (card.chargesLeft <= 0) throw new Error('No charges left');
  } else {
    if (card.orderUsed) throw new Error('Order already used this turn');
  }

  applyOrder(match, card, playerIdx, opts);

  if (isCharge) {
    card.chargesLeft--;
  } else {
    card.orderUsed = true;
  }
}
