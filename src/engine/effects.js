import { createCard } from './Card.js';
import { ROWS } from './Board.js';
import { emit } from './events.js';
import {
  dealDamage, heal, boost, giveShield, copyToHand, applyPoison, addBleed, damageRow, takeControl,
} from './actions.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function allOnBoard(board) {
  return ROWS.flatMap(r => board[r]);
}

function nonHeroes(board) {
  return allOnBoard(board).filter(c => c.def.type !== 'hero');
}

function strongest(units) {
  return units.length ? units.reduce((a, b) => (a.power >= b.power ? a : b)) : null;
}

// ── Deploy effects ────────────────────────────────────────────────────────────

export function applyDeploy(match, card, playerIdx, target = null) {
  const { deployEffect, deployParam = 1 } = card.def;
  if (!deployEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (deployEffect) {
    // ── Targeted (target validated in targeting.js before we get here)
    case 'damage':       dealDamage(match, card, target, deployParam); break;
    case 'heal':         heal(match, card, target, deployParam); break;
    case 'boost':        boost(match, card, target, deployParam); break;
    case 'shield':       giveShield(match, card, target); break;
    case 'duplicate':    if (!card.isCopy) copyToHand(match, card, target, playerIdx); break;
    case 'poison':       applyPoison(match, card, target); break;
    case 'bleed':        addBleed(match, card, target, deployParam); break;
    case 'row_damage':   damageRow(match, card, 1 - playerIdx, target, deployParam); break;
    case 'take_control': takeControl(match, card, target, playerIdx); break;
    case 'cleanse_heal':
      if (target.poisoned || target.bleedStacks > 0) {
        emit(match, { type: 'cleanse', sourceUid: card.uid, targetUid: target.uid });
      }
      target.poisoned = false;
      target.bleedStacks = 0;
      heal(match, card, target, deployParam);
      break;

    // ── Automatic
    case 'knight_bonus': {
      const knights = allOnBoard(own).filter(c => c.def.tags?.includes('knight') && c !== card);
      boost(match, card, card, knights.length);
      break;
    }
    case 'boost_self':
      boost(match, card, card, deployParam);
      break;
    case 'shield_self':
      giveShield(match, card, card);
      break;
    case 'boost_all_faction':
      allOnBoard(own)
        .filter(c => c !== card && c.def.faction === card.def.faction)
        .forEach(c => boost(match, card, c, deployParam));
      break;
    case 'damage_row':
      damageRow(match, card, 1 - playerIdx, card.def.row, deployParam);
      break;
    case 'damage_all_rows':
      // allOnBoard builds new arrays, so deaths during the loop are safe
      [...allOnBoard(own), ...allOnBoard(opp)]
        .filter(c => c !== card)
        .forEach(c => dealDamage(match, card, c, deployParam));
      break;
    case 'resurrect_one': {
      const grave = match.players[playerIdx].graveyard;
      if (grave.length > 0) {
        const dead = grave.pop();
        own[dead.def.row].push(createCard(dead.def));
      }
      break;
    }
    case 'resurrect_four_weak': {
      const grave = match.players[playerIdx].graveyard;
      const batch = grave.splice(Math.max(0, grave.length - 4), 4);
      batch.forEach(dead => {
        const revived = createCard(dead.def);
        revived.power = 1;
        own[dead.def.row].push(revived);
      });
      break;
    }
    case 'copy_enemy_graveyard': {
      const template = strongest(match.players[1 - playerIdx].graveyard);
      if (template) own[template.def.row].push(createCard(template.def));
      break;
    }
    case 'wolf_pack': {
      const wolves = allOnBoard(own).filter(c => c.def.tags?.includes('wolf'));
      if (wolves.length >= 3) wolves.forEach(w => boost(match, card, w, 2));
      if (!card.isCopy) copyToHand(match, card, card, playerIdx);
      break;
    }
    case 'bleed_check_self':
      if (nonHeroes(opp).some(c => c.bleedStacks > 0)) boost(match, card, card, 3);
      break;
    case 'werewolf_register':
      // flag checked in startNextRound (GwentMatch)
      card.werewolf = true;
      break;
    case 'frost_weather_bonus': {
      const hadWeather = match.weather.size > 0;
      match.weather.add('melee');
      if (hadWeather) boost(match, card, card, deployParam);
      break;
    }
    default:
      break; // unknown effects silently ignored
  }
}

// ── Order effects ─────────────────────────────────────────────────────────────

export function applyOrder(match, card, playerIdx, target = null) {
  const { orderEffect, orderParam = 1 } = card.def;
  if (!orderEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (orderEffect) {
    case 'boost_melee_row':
      own.melee.filter(c => c !== card).forEach(c => boost(match, card, c, orderParam));
      break;
    case 'boost_knights':
      allOnBoard(own)
        .filter(c => c !== card && c.def.tags?.includes('knight'))
        .forEach(c => boost(match, card, c, orderParam));
      break;
    case 'boost_all_faction':
      allOnBoard(own)
        .filter(c => c !== card && c.def.faction === card.def.faction)
        .forEach(c => boost(match, card, c, orderParam));
      break;
    case 'damage_one':
      dealDamage(match, card, target, orderParam);
      break;
    case 'damage_lock':
      target.locked = true;
      dealDamage(match, card, target, orderParam);
      break;
    case 'damage_row_choice':
      damageRow(match, card, 1 - playerIdx, target, orderParam);
      break;
    case 'heal_ally':
      heal(match, card, target, orderParam);
      break;
    case 'shield_ally':
      giveShield(match, card, target);
      break;
    case 'debuff_living':
      allOnBoard(opp).forEach(c => dealDamage(match, card, c, orderParam));
      break;
    case 'poison_two':
      nonHeroes(opp)
        .sort((a, b) => a.power - b.power)
        .slice(0, 2)
        .forEach(u => applyPoison(match, card, u));
      break;
    default:
      break;
  }
}
