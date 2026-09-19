import { createCard } from './Card.js';
import { ROWS } from './Board.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function nonHeroes(board) {
  return ROWS.flatMap(r => board[r]).filter(c => c.def.type !== 'hero');
}

function weakest(units) {
  return units.length ? units.reduce((a, b) => (a.power <= b.power ? a : b)) : null;
}

function strongest(units) {
  return units.length ? units.reduce((a, b) => (a.power >= b.power ? a : b)) : null;
}

// ── Deploy effects ────────────────────────────────────────────────────────────

export function applyDeploy(match, card, playerIdx) {
  const { deployEffect, deployParam = 1 } = card.def;
  if (!deployEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (deployEffect) {
    case 'knight_bonus': {
      const knights = ROWS.flatMap(r => own[r]).filter(c => c.def.tags?.includes('knight') && c !== card);
      card.power += knights.length;
      break;
    }
    case 'boost_self': {
      card.power += deployParam;
      break;
    }
    case 'shield_self': {
      card.shielded = true;
      break;
    }
    case 'boost_neighbor': {
      const row = card.def.row;
      const rowCards = own[row];
      const idx = rowCards.indexOf(card);
      if (idx > 0) rowCards[idx - 1].power += deployParam;
      break;
    }
    case 'boost_machine': {
      const machines = ROWS.flatMap(r => own[r]).filter(c => c.def.tags?.includes('machine') && c !== card);
      const target = strongest(machines);
      if (target) target.power += deployParam;
      break;
    }
    case 'boost_all_faction': {
      const faction = card.def.faction;
      ROWS.forEach(r => own[r].forEach(c => {
        if (c !== card && c.def.faction === faction) c.power += deployParam;
      }));
      break;
    }
    case 'poison_one': {
      const target = weakest(nonHeroes(opp));
      if (target) target.poisoned = true;
      break;
    }
    case 'bleed_two': {
      const sorted = nonHeroes(opp).sort((a, b) => a.power - b.power);
      sorted.slice(0, 2).forEach(u => u.bleedStacks++);
      break;
    }
    case 'damage_one': {
      const target = strongest(nonHeroes(opp));
      if (target) target.power = Math.max(1, target.power - deployParam);
      break;
    }
    case 'damage_row': {
      const row = card.def.row;
      opp[row].forEach(c => {
        if (c.def.type !== 'hero') c.power = Math.max(1, c.power - deployParam);
      });
      break;
    }
    case 'damage_all_rows': {
      ROWS.forEach(row => {
        [...own[row], ...opp[row]].forEach(c => {
          if (c.def.type !== 'hero') c.power = Math.max(1, c.power - deployParam);
        });
      });
      break;
    }
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
        const r = createCard(dead.def);
        r.power = 1;
        own[dead.def.row].push(r);
      });
      break;
    }
    case 'copy_enemy_graveyard': {
      const enemyGrave = match.players[1 - playerIdx].graveyard;
      const template = strongest(enemyGrave);
      if (template) own[template.def.row].push(createCard(template.def));
      break;
    }
    case 'cleanse_ally': {
      const dirty = ROWS.flatMap(r => own[r]).filter(c => c.poisoned || c.bleedStacks > 0);
      const target = dirty.sort((a, b) => (b.def.power - b.power) - (a.def.power - a.power))[0];
      if (target) { target.poisoned = false; target.bleedStacks = 0; }
      break;
    }
    case 'wolf_pack': {
      const wolves = ROWS.flatMap(r => own[r]).filter(c => c.def.tags?.includes('wolf'));
      if (wolves.length >= 3) wolves.forEach(w => { w.power += 2; });
      break;
    }
    case 'bleed_check_self': {
      // bloodsucker: +3 if any enemy already bleeding
      const anyBleeding = nonHeroes(opp).some(c => c.bleedStacks > 0);
      if (anyBleeding) card.power += 3;
      break;
    }
    case 'werewolf_register': {
      // sets a flag checked in startNextRound (handled by GwentMatch)
      card.werewolf = true;
      break;
    }
    case 'control_weakest': {
      const target = weakest(nonHeroes(opp));
      if (target) {
        for (const row of ROWS) {
          const idx = opp[row].indexOf(target);
          if (idx !== -1) { opp[row].splice(idx, 1); break; }
        }
        target.controlled = true;
        own[target.def.row].push(target);
      }
      break;
    }
    case 'frost_weather_bonus': {
      const hadWeather = match.weather.size > 0;
      match.weather.add('melee');
      if (hadWeather) card.power += deployParam;
      break;
    }
    default:
      break; // unknown effects silently ignored
  }
}

// ── Order effects ─────────────────────────────────────────────────────────────

export function applyOrder(match, card, playerIdx, opts = {}) {
  const { orderEffect, orderParam = 1 } = card.def;
  if (!orderEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (orderEffect) {
    case 'boost_melee_row': {
      own.melee.forEach(c => { if (c !== card) c.power += orderParam; });
      break;
    }
    case 'boost_knights': {
      ROWS.forEach(r => own[r].forEach(c => {
        if (c.def.tags?.includes('knight') && c !== card) c.power += orderParam;
      }));
      break;
    }
    case 'boost_all_faction': {
      const faction = card.def.faction;
      ROWS.forEach(r => own[r].forEach(c => {
        if (c !== card && c.def.faction === faction) c.power += orderParam;
      }));
      break;
    }
    case 'damage_one': {
      const target = opts.target ?? strongest(nonHeroes(opp));
      if (target) target.power = Math.max(1, target.power - orderParam);
      break;
    }
    case 'damage_lock': {
      const target = opts.target ?? strongest(nonHeroes(opp));
      if (target) { target.power = Math.max(1, target.power - orderParam); target.locked = true; }
      break;
    }
    case 'damage_row_choice': {
      const row = opts.row ?? 'melee';
      opp[row].forEach(c => {
        if (c.def.type !== 'hero') c.power = Math.max(1, c.power - orderParam);
      });
      break;
    }
    case 'heal_ally': {
      const target = opts.target ?? weakest(nonHeroes(own).filter(c => c !== card));
      if (target) {
        const cap = target.def.defPower ?? target.def.power;
        target.power = Math.min(cap, target.power + orderParam);
      }
      break;
    }
    case 'shield_ally': {
      const target = opts.target ?? weakest(nonHeroes(own).filter(c => c !== card));
      if (target) target.shielded = true;
      break;
    }
    case 'debuff_living': {
      ROWS.forEach(r => opp[r].forEach(c => {
        if (c.def.type !== 'hero') c.power = Math.max(1, c.power - orderParam);
      }));
      break;
    }
    case 'poison_two': {
      const sorted = nonHeroes(opp).sort((a, b) => a.power - b.power);
      sorted.slice(0, 2).forEach(u => { u.poisoned = true; });
      break;
    }
    default:
      break;
  }
}
