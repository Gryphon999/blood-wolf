import { createCard } from './Card.js';
import { emit, locateOnBoard } from './events.js';
import { MAX_HAND } from './dealRandom.js';
import { ROWS } from './Board.js';

const uidOf = (card) => card?.uid ?? null;
const isHero = (card) => card.def.type === 'hero';

export function destroy(match, card, { exile = false } = {}) {
  const loc = locateOnBoard(match, card);
  if (!loc) return;
  const owner = match.players[loc.player];
  owner.board[loc.row].splice(loc.index, 1);
  if (!exile && !card.def.doomed) owner.graveyard.push(card);
  emit(match, { type: 'destroy', uid: card.uid, player: loc.player, row: loc.row });
  // Berserkers feed on every death on the battlefield
  for (const pl of match.players) {
    for (const row of ROWS) {
      for (const c of pl.board[row]) {
        if (c.def.berserker) boost(match, c, c, 1);
      }
    }
  }
}

export function dealDamage(match, source, target, amount, { direct = false } = {}) {
  if (amount <= 0 || isHero(target)) return;
  let dmg = amount;
  if (!direct) {
    if (target.shielded) {
      target.shielded = false;
      emit(match, { type: 'shieldBreak', sourceUid: uidOf(source), targetUid: target.uid });
      return;
    }
    const absorbed = Math.min(target.armorLeft, dmg);
    target.armorLeft -= absorbed;
    dmg -= absorbed;
    if (dmg === 0) {
      emit(match, { type: 'armorBlock', sourceUid: uidOf(source), targetUid: target.uid });
      return;
    }
  }
  const drained = Math.min(dmg, Math.max(0, target.power));
  target.power -= dmg;
  emit(match, {
    type: 'damage', sourceUid: uidOf(source), targetUid: target.uid,
    amount: dmg, powerAfter: Math.max(0, target.power),
  });
  if (target.power <= 0) destroy(match, target);
  // Vampirism: the source drinks what it drained (only while it stands on the board)
  if (source?.def?.vampirism && drained > 0 && locateOnBoard(match, source)) {
    boost(match, source, source, drained);
  }
}

export function heal(match, source, target, amount) {
  if (amount <= 0) return;
  const before = target.power;
  target.power = Math.max(before, Math.min(target.def.power, before + amount));
  emit(match, {
    type: 'heal', sourceUid: uidOf(source), targetUid: target.uid,
    amount: target.power - before, powerAfter: target.power,
  });
}

export function boost(match, source, target, amount) {
  if (amount <= 0) return;
  target.power += amount;
  emit(match, {
    type: 'boost', sourceUid: uidOf(source), targetUid: target.uid,
    amount, powerAfter: target.power,
  });
}

export function giveShield(match, source, target) {
  target.shielded = true;
  emit(match, { type: 'shield', sourceUid: uidOf(source), targetUid: target.uid });
}

export function copyToHand(match, source, target, playerIdx) {
  if (match.players[playerIdx].hand.length >= MAX_HAND) {
    emit(match, { type: 'fizzle', sourceUid: uidOf(source) });
    return;
  }
  const copy = createCard(target.def);
  copy.isCopy = true;
  match.players[playerIdx].hand.push(copy);
  emit(match, {
    type: 'copyToHand', sourceUid: uidOf(source), targetUid: target.uid,
    newUid: copy.uid, player: playerIdx,
  });
}

export function applyPoison(match, source, target) {
  if (isHero(target)) return;
  target.poisoned = true;
  emit(match, { type: 'poison', sourceUid: uidOf(source), targetUid: target.uid });
}

export function addBleed(match, source, target, stacks) {
  if (isHero(target) || stacks <= 0) return;
  target.bleedStacks += stacks;
  emit(match, { type: 'bleed', sourceUid: uidOf(source), targetUid: target.uid });
}

export function damageRow(match, source, victimIdx, row, amount) {
  emit(match, { type: 'rowDamage', sourceUid: uidOf(source), player: victimIdx, row });
  // Copy the row first: dealDamage may splice dead cards out of it
  for (const card of [...match.players[victimIdx].board[row]]) {
    dealDamage(match, source, card, amount);
  }
}

export function takeControl(match, source, target, newOwnerIdx) {
  const loc = locateOnBoard(match, target);
  if (!loc) return;
  match.players[loc.player].board[loc.row].splice(loc.index, 1);
  target.controlled = true;
  match.players[newOwnerIdx].board[target.def.row].push(target);
  emit(match, {
    type: 'control', sourceUid: uidOf(source), targetUid: target.uid,
    player: newOwnerIdx, row: target.def.row,
  });
}
