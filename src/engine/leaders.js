import { ROWS, addUnit } from './Board.js';
import { emit } from './events.js';
import { boost, dealDamage } from './actions.js';
import { drawCards } from './draw.js';
import { shuffle } from './rng.js';

const allOnBoard = (board) => ROWS.flatMap((r) => board[r]);
const nonHero = (c) => c.def.type !== 'hero';

// Leader = { id, ability, param }. One use per match, on your turn, before passing.
// Using it does not end the turn (like an Order).
export function canUseLeader(match, playerIdx) {
  const player = match.players[playerIdx];
  return match.winner === null && match.current === playerIdx && !player.passed
    && Boolean(match.leaders?.[playerIdx]) && !player.leaderUsed;
}

const ABILITIES = {
  clear_weather(match) {
    match.weather.clear();
  },
  boost_row(match, p, param) {
    const board = match.players[p].board;
    const row = [...ROWS].sort((a, b) => board[b].filter(nonHero).length - board[a].filter(nonHero).length)[0];
    board[row].filter(nonHero).forEach((c) => boost(match, null, c, param));
  },
  draw_card(match, p, param) {
    drawCards(match, p, param, 'leader');
  },
  damage_strongest(match, p, param) {
    const foes = allOnBoard(match.players[1 - p].board).filter(nonHero);
    if (foes.length === 0) return;
    const target = foes.reduce((a, b) => (b.power > a.power ? b : a));
    dealDamage(match, null, target, param);
  },
  resurrect(match, p) {
    const player = match.players[p];
    const idx = player.graveyard.findLastIndex((c) => (c.def.type ?? 'unit') === 'unit');
    if (idx < 0) return;
    const [card] = player.graveyard.splice(idx, 1);
    Object.assign(card, {
      power: card.def.power, armorLeft: card.def.armor ?? 0, bleedStacks: 0,
      poisoned: false, locked: false, shielded: false, spy: false,
    });
    const row = ROWS.includes(card.def.row) ? card.def.row : 'melee';
    addUnit(player.board, row, card);
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: p, row, index: player.board[row].length - 1, special: false, resurrect: true });
  },
  peek_enemy(match, p, param) {
    const enemy = match.players[1 - p];
    const fromDeck = enemy.deck.slice(0, param);
    const fromHand = shuffle(enemy.hand, match.rng).slice(0, param - fromDeck.length);
    const cards = [...fromDeck, ...fromHand];
    emit(match, { type: 'reveal', player: 1 - p, uids: cards.map((c) => c.uid), defs: cards.map((c) => c.def) });
  },
};

export const LEADER_ABILITIES = Object.keys(ABILITIES);

export function useLeader(match, playerIdx) {
  if (!canUseLeader(match, playerIdx)) throw new Error('Leader ability is not available');
  const leader = match.leaders[playerIdx];
  const run = ABILITIES[leader.ability];
  if (!run) throw new Error(`Unknown leader ability: ${leader.ability}`);
  match.players[playerIdx].leaderUsed = true;
  emit(match, { type: 'leader', player: playerIdx, leaderId: leader.id, ability: leader.ability });
  run(match, playerIdx, leader.param ?? 1);
}
