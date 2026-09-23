import { ROWS } from './Board.js';

export const DEPLOY_TARGET = {
  damage: 'enemyUnit',
  poison: 'enemyUnit',
  bleed: 'enemyUnit',
  take_control: 'enemyUnit',
  heal: 'allyUnit',
  boost: 'allyUnit',
  shield: 'allyUnit',
  duplicate: 'allyUnit',
  cleanse_heal: 'allyUnit',
  row_damage: 'enemyRow',
};

export const ORDER_TARGET = {
  damage_one: 'enemyUnit',
  damage_lock: 'enemyUnit',
  heal_ally: 'allyUnit',
  shield_ally: 'allyUnit',
  damage_row_choice: 'enemyRow',
};

export const SPECIAL_TARGET = {
  lightning: 'enemyUnit',
};

// Extra restrictions on top of "not a hero, not the acting card"
const TARGET_FILTER = {
  take_control: (card) => card.power <= 4,
};

export function effectOf(card, slot) {
  if (slot === 'order') return card.def.orderEffect ?? null;
  return (card.def.type === 'special' ? card.def.effect : card.def.deployEffect) ?? null;
}

export function targetKind(card, slot) {
  const table = slot === 'order' ? ORDER_TARGET
    : card.def.type === 'special' ? SPECIAL_TARGET
    : DEPLOY_TARGET;
  return table[effectOf(card, slot)] ?? 'none';
}

export function getValidTargets(match, playerIdx, card, slot) {
  const kind = targetKind(card, slot);
  if (kind === 'none') return [];
  if (kind === 'enemyRow') return [...ROWS];
  const side = kind === 'enemyUnit' ? 1 - playerIdx : playerIdx;
  const filter = TARGET_FILTER[effectOf(card, slot)] ?? (() => true);
  return ROWS.flatMap((row) => match.players[side].board[row])
    .filter((c) => c !== card && c.def.type !== 'hero' && filter(c));
}

// null = effect needs a target but none exists (fizzle). Throws on a bad choice.
export function resolveTarget(match, playerIdx, card, slot, target) {
  if (targetKind(card, slot) === 'none') return null;
  const valid = getValidTargets(match, playerIdx, card, slot);
  if (valid.length === 0) return null;
  if (!valid.includes(target)) throw new Error('Invalid target');
  return target;
}
