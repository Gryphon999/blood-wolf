import { ROWS } from '../Board.js';
import { getValidTargets, effectOf } from '../targeting.js';

// What an effect does, from the AI's point of view
const ROLE = {
  damage: 'damage', lightning: 'damage', damage_one: 'damage', damage_lock: 'damage',
  heal: 'heal', heal_ally: 'heal', cleanse_heal: 'heal',
  boost: 'boost',
  shield: 'shield', shield_ally: 'shield',
  duplicate: 'duplicate',
  poison: 'poison',
  bleed: 'bleed',
  take_control: 'steal',
  row_damage: 'rowDamage', damage_row_choice: 'rowDamage',
};

export function effectParam(card, slot) {
  return (slot === 'order' ? card.def.orderParam : card.def.deployParam) ?? 1;
}

const byPowerDesc = (a, b) => b.power - a.power;
const missing = (c) => c.def.power - c.power;

function enemyRowPower(match, playerIdx, row) {
  return match.players[1 - playerIdx].board[row]
    .filter((c) => c.def.type !== 'hero')
    .reduce((sum, c) => sum + c.power, 0);
}

export function chooseTarget(match, playerIdx, card, slot) {
  const targets = getValidTargets(match, playerIdx, card, slot);
  if (targets.length === 0) return null;
  const role = ROLE[effectOf(card, slot)];
  if (role === 'rowDamage') {
    return [...ROWS].sort((a, b) => enemyRowPower(match, playerIdx, b) - enemyRowPower(match, playerIdx, a))[0];
  }
  const sorted = [...targets].sort(byPowerDesc);
  const n = effectParam(card, slot);
  switch (role) {
    case 'damage': {
      const open = sorted.filter((c) => !c.shielded);
      return open.find((c) => c.power <= n) ?? open[0] ?? sorted[0];
    }
    case 'heal':
      return [...targets].sort((a, b) => missing(b) - missing(a))[0];
    case 'shield':
      return sorted.find((c) => !c.shielded) ?? sorted[0];
    case 'poison':
      return sorted.find((c) => !c.poisoned) ?? sorted[0];
    case 'bleed':
      return sorted.find((c) => c.bleedStacks === 0) ?? sorted[0];
    default:
      return sorted[0];
  }
}

// Rough "how many points does this effect swing" used to rank cards in hand
export function effectValue(match, playerIdx, card, slot, target) {
  const effect = effectOf(card, slot);
  const role = ROLE[effect];
  if (!role) return effect === 'shield_self' ? 2 : 0;
  if (target === null) return 0;
  const n = effectParam(card, slot);
  switch (role) {
    case 'damage':
      if (target.shielded) return 0;
      return target.power <= n ? target.power : n;
    case 'rowDamage':
      return match.players[1 - playerIdx].board[target].filter((c) => c.def.type !== 'hero').length * n;
    case 'heal':
      return Math.min(n, missing(target));
    case 'steal':
      return target.power * 2;
    case 'shield':
    case 'duplicate':
    case 'poison':
    case 'bleed':
      return 2;
    default:
      return n;
  }
}
