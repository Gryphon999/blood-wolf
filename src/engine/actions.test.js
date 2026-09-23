import { describe, it, expect } from 'vitest';
import { createMatch } from './GwentMatch.js';
import { createCard } from './Card.js';
import { addUnit } from './Board.js';
import {
  dealDamage, destroy, heal, boost, giveShield, copyToHand,
  applyPoison, addBleed, damageRow, takeControl,
} from './actions.js';

const def = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

function place(match, playerIdx, d) {
  const card = createCard(d);
  addUnit(match.players[playerIdx].board, d.row, card);
  return card;
}

const newMatch = () => createMatch([], [], 0);

describe('dealDamage', () => {
  it('reduces power and emits a damage event', () => {
    const match = newMatch();
    const src = place(match, 0, def('s', 3));
    const t = place(match, 1, def('t', 5));
    dealDamage(match, src, t, 2);
    expect(t.power).toBe(3);
    expect(match.events).toEqual([
      { type: 'damage', sourceUid: src.uid, targetUid: t.uid, amount: 2, powerAfter: 3 },
    ]);
  });

  it('kills a card at 0 power: removed from board, into graveyard, destroy event', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 2));
    dealDamage(match, null, t, 5);
    expect(match.players[1].board.melee).toHaveLength(0);
    expect(match.players[1].graveyard).toContain(t);
    expect(match.events.map((e) => e.type)).toEqual(['damage', 'destroy']);
    expect(match.events[0].powerAfter).toBe(0);
    expect(match.events[1]).toEqual({ type: 'destroy', uid: t.uid, player: 1, row: 'melee' });
  });

  it('a doomed card that dies does not enter the graveyard', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 1, { doomed: true }));
    dealDamage(match, null, t, 1);
    expect(match.players[1].graveyard).toHaveLength(0);
  });

  it('a shield absorbs the whole hit and is consumed', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 4));
    t.shielded = true;
    dealDamage(match, null, t, 10);
    expect(t.power).toBe(4);
    expect(t.shielded).toBe(false);
    expect(match.events).toEqual([{ type: 'shieldBreak', sourceUid: null, targetUid: t.uid }]);
  });

  it('armor absorbs part of the damage', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 5, { armor: 2 }));
    dealDamage(match, null, t, 3);
    expect(t.armorLeft).toBe(0);
    expect(t.power).toBe(4);
  });

  it('heroes are immune', () => {
    const match = newMatch();
    const t = place(match, 1, def('h', 6, { type: 'hero' }));
    dealDamage(match, null, t, 3);
    expect(t.power).toBe(6);
    expect(match.events).toEqual([]);
  });

  it('direct damage ignores shield and armor', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 5, { armor: 2 }));
    t.shielded = true;
    dealDamage(match, null, t, 2, { direct: true });
    expect(t.power).toBe(3);
    expect(t.shielded).toBe(true);
  });
});

describe('destroy', () => {
  it('exile skips the graveyard', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 9));
    destroy(match, t, { exile: true });
    expect(match.players[0].board.melee).toHaveLength(0);
    expect(match.players[0].graveyard).toHaveLength(0);
  });
});

describe('heal / boost / shield', () => {
  it('heal restores up to base power only', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    t.power = 2;
    heal(match, null, t, 10);
    expect(t.power).toBe(5);
    expect(match.events[0]).toMatchObject({ type: 'heal', amount: 3, powerAfter: 5 });
  });

  it('heal never lowers a boosted card', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    t.power = 8;
    heal(match, null, t, 2);
    expect(t.power).toBe(8);
    expect(match.events).toEqual([]);
  });

  it('boost adds power without a cap; zero boost emits nothing', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    boost(match, null, t, 3);
    boost(match, null, t, 0);
    expect(t.power).toBe(8);
    expect(match.events).toEqual([
      { type: 'boost', sourceUid: null, targetUid: t.uid, amount: 3, powerAfter: 8 },
    ]);
  });

  it('giveShield sets shielded', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    giveShield(match, null, t);
    expect(t.shielded).toBe(true);
    expect(match.events[0]).toMatchObject({ type: 'shield', targetUid: t.uid });
  });
});

describe('copyToHand', () => {
  it('puts a fresh copy flagged isCopy into the given hand', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    t.power = 1;
    copyToHand(match, null, t, 0);
    const copy = match.players[0].hand[0];
    expect(copy.def).toBe(t.def);
    expect(copy.power).toBe(5);
    expect(copy.isCopy).toBe(true);
    expect(copy.uid).not.toBe(t.uid);
    expect(match.events[0]).toEqual({
      type: 'copyToHand', sourceUid: null, targetUid: t.uid, newUid: copy.uid, player: 0,
    });
  });
});

describe('statuses', () => {
  it('applyPoison and addBleed set statuses and emit events', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 5));
    applyPoison(match, null, t);
    addBleed(match, null, t, 2);
    expect(t.poisoned).toBe(true);
    expect(t.bleedStacks).toBe(2);
    expect(match.events.map((e) => e.type)).toEqual(['poison', 'bleed']);
  });

  it('statuses do not stick to heroes', () => {
    const match = newMatch();
    const t = place(match, 1, def('h', 5, { type: 'hero' }));
    applyPoison(match, null, t);
    addBleed(match, null, t, 1);
    expect(t.poisoned).toBe(false);
    expect(t.bleedStacks).toBe(0);
  });
});

describe('damageRow', () => {
  it('hits every card in the row even when some die mid-loop', () => {
    const match = newMatch();
    const a = place(match, 1, def('a', 1));
    const b = place(match, 1, def('b', 1));
    const c = place(match, 1, def('c', 4));
    damageRow(match, null, 1, 'melee', 1);
    expect(match.players[1].board.melee).toEqual([c]);
    expect(c.power).toBe(3);
    expect(match.players[1].graveyard).toEqual([a, b]);
    expect(match.events[0]).toEqual({ type: 'rowDamage', sourceUid: null, player: 1, row: 'melee' });
  });
});

describe('takeControl', () => {
  it('moves the enemy card to the new owner board and marks it controlled', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 3));
    takeControl(match, null, t, 0);
    expect(match.players[1].board.melee).toHaveLength(0);
    expect(match.players[0].board.melee).toEqual([t]);
    expect(t.controlled).toBe(true);
    expect(match.events[0]).toEqual({
      type: 'control', sourceUid: null, targetUid: t.uid, player: 0, row: 'melee',
    });
  });
});
