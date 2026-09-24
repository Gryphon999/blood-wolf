import { ROWS, totalPower } from '../Board.js';
import { getValidTargets, targetKind } from '../targeting.js';
import { canUseLeader } from '../leaders.js';
import { passiveOf } from '../passives.js';
import { chooseTarget } from './chooseTarget.js';
import { moveValue, cloneMatch, applyMove } from './simulate.js';

export const DIFFICULTIES = ['easy', 'normal', 'hard'];

// Three different players, not one player with a dial:
// easy   "Recruit"   — dumps its strongest card, sloppy targets, ignores Orders/leader/mulligan
// normal "Veteran"   — one-ply search, uses Orders, fires the leader at the first good chance,
//                      never passes early (plays until the opponent passes)
// hard   "Warlord"   — full target search, tempo passing when ahead with a lean hand, holds
//                      heroes back before round 3, saves the leader for big swings, mulligans
export const STRATEGY = {
  easy:   { search: false, orders: false, leader: false, mulligan: false, reserve: 0, passLead: Infinity, sloppy: 0.3 },
  normal: { search: true, orders: true, leader: true, mulligan: false, leaderThreshold: 1, reserve: 0, passLead: Infinity, allTargets: false },
  hard:   { search: true, orders: true, leader: true, mulligan: true, leaderThreshold: 5, reserve: 0.4, passLead: 6, allTargets: true },
};

export function usesMulligan(difficulty) {
  return (STRATEGY[difficulty] ?? STRATEGY.normal).mulligan;
}

const isSpecial = (card) => card.def.type === 'special';
const ROW_SPECIALS = new Set(['horn', 'sign_damage']);

function unitRows(def) {
  if (def.row === 'any') return [...ROWS];
  return [ROWS.includes(def.row) ? def.row : 'melee'];
}

// Every sensible way to play each hand card
function candidatePlays(match, p, strat) {
  const hand = match.players[p].hand;
  const moves = [];
  hand.forEach((card, cardIndex) => {
    let rows;
    if (isSpecial(card)) rows = ROW_SPECIALS.has(card.def.effect) ? [...ROWS] : ['melee'];
    else rows = unitRows(card.def);
    const needsTarget = targetKind(card, 'deploy') !== 'none';
    const targets = needsTarget ? getValidTargets(match, p, card, 'deploy') : [];
    for (const row of rows) {
      if (!needsTarget || targets.length === 0) {
        moves.push({ type: 'play', cardIndex, row });
      } else if (strat.allTargets) {
        targets.forEach((target) => moves.push({ type: 'play', cardIndex, row, target }));
      } else {
        moves.push({ type: 'play', cardIndex, row, target: chooseTarget(match, p, card, 'deploy') });
      }
    }
  });
  return moves;
}

function candidateOrders(match, p, strat) {
  const moves = [];
  for (const row of ROWS) {
    match.players[p].board[row].forEach((card, cardIdx) => {
      if (!card.def.hasOrder || card.locked) return;
      if (card.def.chargeMax > 0 ? card.chargesLeft <= 0 : card.orderUsed) return;
      if (targetKind(card, 'order') === 'none') {
        moves.push({ type: 'order', row, cardIdx });
        return;
      }
      const targets = getValidTargets(match, p, card, 'order');
      if (targets.length === 0) return;
      const picks = strat.allTargets ? targets : [chooseTarget(match, p, card, 'order')];
      picks.forEach((target) => moves.push({ type: 'order', row, cardIdx, target }));
    });
  }
  return moves;
}

// Holding back heroes and big cards before the last round
function reservePenalty(match, p, card, strat) {
  if (match.round >= 3 || strat.reserve === 0 || isDecisive(match, p)) return 0;
  const big = card.def.type === 'hero' || card.def.rarity === 'legendary' || card.power >= 7;
  return big ? strat.reserve * card.power : 0;
}

// Losing this round loses the match
function isDecisive(match, p) {
  return match.players[1 - p].roundsWon >= 1;
}

function lead(match, p) {
  return totalPower(match.players[p].board, match.weather)
    - totalPower(match.players[1 - p].board, match.weather);
}

// Ties count as wins for a tiebreak faction facing a non-tiebreak one
function winsTie(match, p) {
  return passiveOf(match, p) === 'tiebreak' && passiveOf(match, 1 - p) !== 'tiebreak';
}

function isAhead(match, p) {
  const l = lead(match, p);
  return l > 0 || (l === 0 && winsTie(match, p));
}

function scored(match, p, moves, strat) {
  return moves.map((move) => {
    let value = moveValue(match, p, move);
    if (move.type === 'play') value -= reservePenalty(match, p, match.players[p].hand[move.cardIndex], strat);
    return { move, value };
  }).sort((a, b) => b.value - a.value);
}

// Greedy look-ahead: how many cards does it take to get ahead (Infinity if we can't)?
function cardsToOvertake(match, p, strat, limit = 4) {
  let sim = cloneMatch(match);
  for (let k = 1; k <= Math.min(limit, sim.players[p].hand.length); k++) {
    const best = scored(sim, p, candidatePlays(sim, p, strat), { ...strat, reserve: 0 })[0];
    if (!best || best.value === -Infinity) return Infinity;
    applyMove(sim, best.move);
    sim.current = p; // opponent has passed: we keep moving
    if (isAhead(sim, p)) return k;
  }
  return Infinity;
}

// Opponent is out and we are behind: win with the weakest card that does the job
function cheapestWinningPlay(match, p, ranked) {
  const hand = match.players[p].hand;
  const winners = ranked.filter(({ move, value }) => {
    if (value === -Infinity) return false;
    const sim = cloneMatch(match);
    try { applyMove(sim, move); } catch { return false; }
    return isAhead(sim, p);
  });
  if (winners.length === 0) return null;
  winners.sort((a, b) => hand[a.move.cardIndex].power - hand[b.move.cardIndex].power);
  return winners[0].move;
}

function shouldPass(match, p, strat, bestPlay) {
  const me = match.players[p];
  const opp = match.players[1 - p];
  if (me.hand.length === 0 || !bestPlay) return true;
  if (opp.passed) {
    if (isAhead(match, p)) return true;
    const need = cardsToOvertake(match, p, strat);
    if (need === Infinity) return !isDecisive(match, p) || me.hand.length === 0;
    if (isDecisive(match, p)) return false;
    // Worth it if cheap, or if the cards would be lost to the hand cap anyway
    return need > Math.max(2, me.hand.length - 5);
  }
  if (isDecisive(match, p) || match.round >= 3) return false;
  const l = lead(match, p);
  // Ahead with a lean hand: stop investing and let the opponent spend cards
  if (l >= strat.passLead && me.hand.length <= 5 && me.hand.length >= opp.hand.length - 1) return true;
  return false;
}

function easyMove(match, p, strat) {
  const player = match.players[p];
  const opponent = match.players[1 - p];
  if (opponent.passed && isAhead(match, p)) return { type: 'pass' };
  let bestIndex = 0;
  player.hand.forEach((card, i) => {
    if (card.power > player.hand[bestIndex].power) bestIndex = i;
  });
  const card = player.hand[bestIndex];
  const row = isSpecial(card) ? 'melee' : unitRows(card.def)[0];
  const move = { type: 'play', cardIndex: bestIndex, row };
  const targets = getValidTargets(match, p, card, 'deploy');
  if (targetKind(card, 'deploy') !== 'none' && targets.length > 0) {
    move.target = match.rng() < strat.sloppy
      ? targets[Math.floor(match.rng() * targets.length) % targets.length]
      : chooseTarget(match, p, card, 'deploy');
  }
  return move;
}

function leaderThreshold(match, p, strat) {
  if (match.round >= 3 || isDecisive(match, p)) return 0.5;
  return strat.leaderThreshold;
}

export function chooseMove(match, playerIndex, difficulty = 'normal') {
  const p = playerIndex;
  const strat = STRATEGY[difficulty] ?? STRATEGY.normal;
  const player = match.players[p];
  if (!strat.search) {
    return player.hand.length === 0 ? { type: 'pass' } : easyMove(match, p, strat);
  }

  // Free actions first: Orders, then the leader
  if (strat.orders) {
    const best = scored(match, p, candidateOrders(match, p, strat), strat)[0];
    if (best && best.value > 0.5) return best.move;
  }
  if (strat.leader && canUseLeader(match, p)) {
    const value = moveValue(match, p, { type: 'leader' });
    if (value >= leaderThreshold(match, p, strat)) return { type: 'leader' };
  }

  if (player.hand.length === 0) return { type: 'pass' };
  const ranked = scored(match, p, candidatePlays(match, p, strat), strat);
  const best = ranked[0];
  if (match.players[1 - p].passed && !isAhead(match, p)) {
    const cheapest = cheapestWinningPlay(match, p, ranked);
    if (cheapest) return cheapest;
  }
  if (shouldPass(match, p, strat, best) || !best || best.value === -Infinity) return { type: 'pass' };
  return best.move;
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
