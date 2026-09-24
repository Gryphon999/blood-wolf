import { createCard } from './Card.js';
import { createBoard, addUnit, totalPower, ROWS } from './Board.js';
import { applyDeploy, applyOrder } from './effects.js';
import { emit } from './events.js';
import { resolveTarget, targetKind } from './targeting.js';
import { dealDamage, boost, addBleed, damageRow, destroy } from './actions.js';
import { dealRandom, ROUND_DRAW, MAX_HAND } from './dealRandom.js';
import { shuffle } from './rng.js';
import { drawCards } from './draw.js';

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

export function createMatch(deckA, deckB, handSize = 10, { rng = null, pools = null } = {}) {
  const order = (deck) => (rng ? shuffle(deck, rng) : deck);
  return {
    players: [makePlayer(order(deckA), handSize), makePlayer(order(deckB), handSize)],
    current: 0,
    turn: 0,
    round: 1,
    roundStarter: 0,
    winner: null,
    lastRound: null,
    weather: new Set(),
    events: [],
    rng: rng ?? Math.random,
    pools, // [poolA, poolB] of card defs, or null = no round draws
  };
}

function allOnBoard(board) {
  return ROWS.flatMap(r => board[r]);
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

function applyEffect(match, card, row, target) {
  const effect = card.def.effect;
  const own = match.players[match.current].board;
  const opp = match.players[1 - match.current].board;

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
    own.horns.add(row);
    return;
  }
  if (effect === 'sign_damage') {
    if (!ROWS.includes(row)) throw new Error(`Unknown row: ${row}`);
    damageRow(match, card, 1 - match.current, row, 2);
    return;
  }
  if (effect === 'lightning') {
    dealDamage(match, card, target, card.def.deployParam ?? 1);
    return;
  }
  if (effect === 'blessing_humans') {
    allOnBoard(own)
      .filter(c => c.def.faction === 'humans')
      .forEach(c => boost(match, card, c, 2));
    return;
  }
  if (effect === 'order_ready') {
    allOnBoard(own).forEach(c => {
      if (c.def.hasOrder && c.def.chargeMax === 0) c.orderUsed = false;
    });
    return;
  }
  if (effect === 'fog_frost_combo') {
    match.weather.add('ranged');
    match.weather.add('melee');
    return;
  }
  if (effect === 'bleed_all_enemies') {
    allOnBoard(opp).forEach(c => addBleed(match, card, c, 1));
    return;
  }
  if (effect === 'scorch') {
    // Destroy all non-hero units tied for highest power if that power >= 10
    const candidates = match.players
      .flatMap(pl => allOnBoard(pl.board))
      .filter(c => c.def.type !== 'hero');
    const maxPow = candidates.reduce((m, c) => Math.max(m, c.power), 0);
    if (maxPow >= 10) {
      // Scorched cards are exiled — they go to neither graveyard
      candidates.filter(c => c.power === maxPow).forEach(c => destroy(match, c, { exile: true }));
    }
    return;
  }
  throw new Error(`Unknown effect: ${effect}`);
}

// Muster: every card of the same family in hand and deck joins the board (no Deploy)
function musterFamily(match, playerIdx, family) {
  const player = match.players[playerIdx];
  const isKin = (c) => c.def.muster === family && c.def.type !== 'special';
  const kin = [...player.hand.filter(isKin), ...player.deck.filter(isKin)];
  player.hand = player.hand.filter((c) => !isKin(c));
  player.deck = player.deck.filter((c) => !isKin(c));
  for (const c of kin) {
    const row = ROWS.includes(c.def.row) ? c.def.row : 'melee';
    addUnit(player.board, row, c);
    emit(match, { type: 'play', uid: c.uid, def: c.def, player: playerIdx, row, index: player.board[row].length - 1, special: false, muster: true });
  }
}

function applyCard(match, card, row, target, fizzled) {
  const self = match.current;
  const special = card.def.type === 'special';
  if (special) {
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: null, special: true });
  } else if (card.def.spy) {
    // Spy: fights for the enemy, pays its owner with two cards
    const side = 1 - self;
    const board = match.players[side].board;
    addUnit(board, row, card);
    card.spy = true;
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: side, row, index: board[row].length - 1, special: false, spy: true });
    drawCards(match, self, 2, 'spy');
    return;
  } else {
    const board = match.players[self].board;
    addUnit(board, row, card);
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: board[row].length - 1, special: false });
    if (card.def.muster) musterFamily(match, self, card.def.muster);
    // Non-Zeal Order cards can't act the turn they're played
    if (card.def.hasOrder && !card.def.zeal && card.def.chargeMax === 0) {
      card.orderUsed = true;
    }
  }
  if (fizzled) {
    emit(match, { type: 'fizzle', sourceUid: card.uid });
    return;
  }
  if (special) applyEffect(match, card, row, target);
  else applyDeploy(match, card, self, target);
}

export function playCard(match, cardIndex, row, { target } = {}) {
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
  // Validate before mutating anything: a bad target must not cost the card
  const chosen = resolveTarget(match, match.current, card, 'deploy', target);
  const fizzled = targetKind(card, 'deploy') !== 'none' && chosen === null;
  player.hand.splice(cardIndex, 1);
  applyCard(match, card, row, chosen, fizzled);
  passTurn(match);
  match.turn++;
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
    for (const card of allOnBoard(player.board)) {
      if (card.werewolf) boost(match, card, card, 2);
    }
  }
  match.round++;
  match.roundStarter = lastResult === 'draw'
    ? 1 - match.roundStarter
    : 1 - lastResult;
  match.current = match.roundStarter;
  match.weather.clear();
  if (match.pools) {
    match.players.forEach((player, i) => {
      const count = Math.max(0, Math.min(ROUND_DRAW, MAX_HAND - player.hand.length));
      const cards = dealRandom(match.pools[i], count, match.rng).map(createCard);
      player.hand.push(...cards);
      emit(match, { type: 'draw', player: i, uids: cards.map((c) => c.uid), reason: 'round' });
    });
  }
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

// ── Mulligan: before the first move, each player may swap up to 2 cards once ──
export const MULLIGAN_MAX = 2;

export function canMulligan(match, playerIdx) {
  return match.winner === null && match.round === 1 && match.turn === 0
    && !match.players[playerIdx].mulliganDone;
}

export function mulligan(match, playerIdx, handIndices = []) {
  if (!canMulligan(match, playerIdx)) throw new Error('Mulligan is not available');
  const picks = [...new Set(handIndices)].sort((a, b) => b - a);
  if (picks.length > MULLIGAN_MAX) throw new Error(`At most ${MULLIGAN_MAX} cards`);
  const player = match.players[playerIdx];
  if (picks.some((i) => !player.hand[i])) throw new Error('Invalid hand index');
  const fresh = player.deck.splice(0, picks.length);
  const missing = picks.length - fresh.length;
  if (missing > 0 && match.pools?.[playerIdx]) {
    fresh.push(...dealRandom(match.pools[playerIdx], missing, match.rng).map(createCard));
  }
  // Without enough replacements the extra picks simply stay in hand
  const returned = picks.slice(picks.length - fresh.length).map((i) => player.hand.splice(i, 1)[0]);
  player.hand.push(...fresh);
  player.deck.push(...returned);
  player.mulliganDone = true;
  emit(match, { type: 'mulligan', player: playerIdx, count: fresh.length, uids: fresh.map((c) => c.uid) });
}

export function hasLegalMove(match) {
  if (match.winner !== null) {
    return false;
  }
  const player = match.players[match.current];
  return !player.passed && player.hand.length > 0;
}

// Ambush: cards waiting in hand leap onto a random own row when their owner passes
function springAmbush(match, playerIdx) {
  const player = match.players[playerIdx];
  const hidden = player.hand.filter((c) => c.def.ambush && c.def.type !== 'special');
  if (hidden.length === 0) return;
  player.hand = player.hand.filter((c) => !hidden.includes(c));
  for (const card of hidden) {
    const row = ROWS[Math.floor(match.rng() * ROWS.length) % ROWS.length];
    addUnit(player.board, row, card);
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: playerIdx, row, index: player.board[row].length - 1, special: false, ambush: true });
  }
}

export function pass(match) {
  if (match.winner !== null) {
    throw new Error('Match is over');
  }
  const player = match.players[match.current];
  springAmbush(match, match.current);
  player.passed = true;
  if (match.players[1 - match.current].passed) {
    resolveRound(match);
    match.turn++;
  } else {
    match.current = 1 - match.current;
    match.turn++;
  }
}

export function startTurn(match) {
  // Status ticks: bleed + poison, straight to power (shield/armor don't stop them)
  for (const player of match.players) {
    for (const card of allOnBoard(player.board)) {
      const tick = card.bleedStacks + (card.poisoned ? 1 : 0);
      if (tick > 0) dealDamage(match, null, card, tick, { direct: true });
    }
  }
  // Reset regular Order (not Charge) for the current player
  for (const card of allOnBoard(match.players[match.current].board)) {
    if (card.def.hasOrder && card.def.chargeMax === 0) {
      card.orderUsed = false;
    }
  }
}

export function useOrder(match, playerIdx, row, cardIdx, { target } = {}) {
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

  const chosen = resolveTarget(match, playerIdx, card, 'order', target);
  if (targetKind(card, 'order') !== 'none' && chosen === null) {
    throw new Error('No valid targets');
  }
  applyOrder(match, card, playerIdx, chosen);

  if (isCharge) {
    card.chargesLeft--;
  } else {
    card.orderUsed = true;
  }
}
