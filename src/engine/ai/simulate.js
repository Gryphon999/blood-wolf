import { ROWS, totalPower } from '../Board.js';
import { playCard, useOrder } from '../GwentMatch.js';
import { useLeader } from '../leaders.js';
import { findCardByUid } from '../events.js';
import { seededRng } from '../rng.js';

// Deep-enough copy of a match for look-ahead: cards are flat objects sharing `def`
export function cloneMatch(match) {
  const copyCard = (c) => ({ ...c });
  const players = match.players.map((p) => ({
    ...p,
    deck: p.deck.map(copyCard),
    hand: p.hand.map(copyCard),
    graveyard: p.graveyard.map(copyCard),
    board: {
      melee: p.board.melee.map(copyCard),
      ranged: p.board.ranged.map(copyCard),
      siege: p.board.siege.map(copyCard),
      horns: new Set(p.board.horns),
    },
  }));
  return { ...match, players, weather: new Set(match.weather), events: [], rng: seededRng(7) };
}

// Map a target from the real match onto the clone (cards by uid, rows as-is)
function mapTarget(clone, target) {
  if (target == null || typeof target === 'string') return target;
  return findCardByUid(clone, target.uid);
}

export function applyMove(match, move) {
  const target = mapTarget(match, move.target);
  switch (move.type) {
    case 'play': playCard(match, move.cardIndex, move.row, { target }); break;
    case 'order': useOrder(match, match.current, move.row, move.cardIdx, { target }); break;
    case 'leader': useLeader(match, match.current); break;
    default: throw new Error(`Cannot simulate move ${move.type}`);
  }
}

// Expected worth of one card in hand, in points. Hoarding past the refill cap is worth little.
export function cardWorth(match, playerIdx) {
  if (match.round >= 3) return 4.5;
  return match.players[playerIdx].hand.length > 5 ? 1.5 : 4.5;
}

const allOnBoard = (board) => ROWS.flatMap((r) => board[r]);

function statusScore(card) {
  let v = card.bleedStacks * 1.5 + (card.poisoned ? 2 : 0);
  if (card.locked && card.def.hasOrder) v += 1;
  return v;
}

function readiness(card) {
  let v = card.shielded ? 2 : 0;
  v += (card.armorLeft ?? 0) * 0.5;
  if (card.def.hasOrder && !card.locked && (card.def.chargeMax > 0 ? card.chargesLeft > 0 : true)) v += 1;
  return v;
}

// Static evaluation of a position from `playerIdx`'s side
export function evaluate(match, playerIdx, worth = cardWorth(match, playerIdx)) {
  const me = match.players[playerIdx];
  const opp = match.players[1 - playerIdx];
  const board = totalPower(me.board, match.weather) - totalPower(opp.board, match.weather);
  const status = allOnBoard(opp.board).reduce((s, c) => s + statusScore(c), 0)
    - allOnBoard(me.board).reduce((s, c) => s + statusScore(c), 0);
  const ready = allOnBoard(me.board).reduce((s, c) => s + readiness(c), 0)
    - allOnBoard(opp.board).reduce((s, c) => s + readiness(c), 0);
  const cards = (me.hand.length - opp.hand.length) * worth;
  return board + status + ready * 0.5 + cards;
}

// How much a move improves our position. A normal card play is not charged for the card itself.
export function moveValue(match, playerIdx, move) {
  const worth = cardWorth(match, playerIdx);
  const before = evaluate(match, playerIdx, worth);
  const clone = cloneMatch(match);
  try {
    applyMove(clone, move);
  } catch {
    return -Infinity;
  }
  const refund = move.type === 'play' ? worth : 0;
  return evaluate(clone, playerIdx, worth) - before + refund;
}
