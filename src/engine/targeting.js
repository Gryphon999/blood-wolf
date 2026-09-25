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

// A unit can be targeted by single-target effects: not a hero, not immune.
const isTargetable = (c) => c.def.type !== 'hero' && !c.def.immune;

export function getValidTargets(match, playerIdx, card, slot) {
  const kind = targetKind(card, slot);
  if (kind === 'none') return [];
  if (kind === 'enemyRow') return [...ROWS];
  const side = kind === 'enemyUnit' ? 1 - playerIdx : playerIdx;
  const filter = TARGET_FILTER[effectOf(card, slot)] ?? (() => true);
  // Siege protection: enemy siege row is untargetable ONLY while they have targetable
  // (non-hero, non-immune) units in melee or ranged rows. If front rows are all heroes/
  // immune, siege becomes reachable — otherwise it would be permanently unreachable.
  const enemyBoard = match.players[1 - playerIdx].board;
  const siegeShielded = kind === 'enemyUnit'
    && (enemyBoard.melee.some(isTargetable) || enemyBoard.ranged.some(isTargetable));
  return ROWS.flatMap((row) => {
    if (siegeShielded && row === 'siege') return [];
    return match.players[side].board[row];
  }).filter((c) => isTargetable(c) && c !== card && filter(c));
}

// null = effect needs a target but none exists (fizzle). Throws on a bad choice.
export function resolveTarget(match, playerIdx, card, slot, target) {
  if (targetKind(card, slot) === 'none') return null;
  const valid = getValidTargets(match, playerIdx, card, slot);
  if (valid.length === 0) return null;
  if (!valid.includes(target)) throw new Error('Invalid target');
  return target;
}
