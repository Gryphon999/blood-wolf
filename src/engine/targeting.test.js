import { describe, it, expect } from 'vitest';
import { createMatch, playCard, useOrder } from './GwentMatch.js';
import { createCard } from './Card.js';
import { addUnit } from './Board.js';
import { getValidTargets, targetKind, resolveTarget } from './targeting.js';

const def = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

function place(match, playerIdx, d) {
  const card = createCard(d);
  addUnit(match.players[playerIdx].board, d.row, card);
  return card;
}

describe('targetKind', () => {
  it('maps deploy, order and special effects', () => {
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'damage' })), 'deploy')).toBe('enemyUnit');
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'heal' })), 'deploy')).toBe('allyUnit');
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'row_damage' })), 'deploy')).toBe('enemyRow');
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'shield_self' })), 'deploy')).toBe('none');
    expect(targetKind(createCard(def('a', 1, { hasOrder: true, orderEffect: 'damage_one' })), 'order')).toBe('enemyUnit');
    const lightning = { id: 'l', type: 'special', effect: 'lightning', row: 'ranged', power: 0 };
    expect(targetKind(createCard(lightning), 'deploy')).toBe('enemyUnit');
  });
});

describe('getValidTargets', () => {
  it('enemyUnit lists enemy non-heroes only', () => {
    const match = createMatch([], [], 0);
    const enemy = place(match, 1, def('e', 3));
    place(match, 1, def('h', 9, { type: 'hero' }));
    place(match, 0, def('ally', 3));
    const archer = createCard(def('ar', 3, { deployEffect: 'damage', deployParam: 2 }));
    expect(getValidTargets(match, 0, archer, 'deploy')).toEqual([enemy]);
  });

  it('allyUnit excludes the acting card itself', () => {
    const match = createMatch([], [], 0);
    const alchemist = place(match, 0, def('alc', 3, { hasOrder: true, orderEffect: 'shield_ally' }));
    const ally = place(match, 0, def('a', 4));
    expect(getValidTargets(match, 0, alchemist, 'order')).toEqual([ally]);
  });

  it('take_control only allows enemies with power <= 4', () => {
    const match = createMatch([], [], 0);
    const small = place(match, 1, def('s', 4));
    place(match, 1, def('b', 5));
    const seducer = createCard(def('sd', 3, { deployEffect: 'take_control' }));
    expect(getValidTargets(match, 0, seducer, 'deploy')).toEqual([small]);
  });

  it('enemyRow lists all three rows', () => {
    const match = createMatch([], [], 0);
    const catapult = createCard(def('c', 5, { deployEffect: 'row_damage' }));
    expect(getValidTargets(match, 0, catapult, 'deploy')).toEqual(['melee', 'ranged', 'siege']);
  });
});

describe('resolveTarget', () => {
  it('returns null when the effect has no valid targets', () => {
    const match = createMatch([], [], 0);
    const archer = createCard(def('ar', 3, { deployEffect: 'damage' }));
    expect(resolveTarget(match, 0, archer, 'deploy', undefined)).toBeNull();
  });

  it('throws when targets exist but the choice is missing or invalid', () => {
    const match = createMatch([], [], 0);
    place(match, 1, def('e', 3));
    const archer = createCard(def('ar', 3, { deployEffect: 'damage' }));
    expect(() => resolveTarget(match, 0, archer, 'deploy', undefined)).toThrow('Invalid target');
    expect(() => resolveTarget(match, 0, archer, 'deploy', 'melee')).toThrow('Invalid target');
  });
});

describe('playCard with targets', () => {
  it('fizzles when there is nothing to target: card still lands, fizzle event', () => {
    const archer = def('ar', 3, { deployEffect: 'damage', deployParam: 2 });
    const match = createMatch([archer], [def('x', 1)], 1);
    const uid = match.players[0].hand[0].uid;
    playCard(match, 0, 'melee');
    expect(match.players[0].board.melee).toHaveLength(1);
    expect(match.events.map((e) => e.type)).toEqual(['play', 'fizzle']);
    expect(match.events[1]).toEqual({ type: 'fizzle', sourceUid: uid });
  });

  it('lightning with no enemy units fizzles: card leaves the hand, board untouched', () => {
    const lightning = { id: 'l', type: 'special', effect: 'lightning', row: 'ranged', power: 0, deployParam: 4 };
    const match = createMatch([lightning], [def('x', 1)], 1);
    const uid = match.players[0].hand[0].uid;
    playCard(match, 0, 'ranged');
    expect(match.players[0].hand).toHaveLength(0);
    expect(match.events.map((e) => e.type)).toEqual(['play', 'fizzle']);
    expect(match.events[1]).toEqual({ type: 'fizzle', sourceUid: uid });
    expect(match.players[1].board.melee).toHaveLength(0);
  });

  it('an invalid target throws and leaves the hand untouched', () => {
    const archer = def('ar', 3, { deployEffect: 'damage', deployParam: 2 });
    const match = createMatch([archer], [def('x', 1)], 1);
    place(match, 1, def('e', 5));
    expect(() => playCard(match, 0, 'melee', { target: 'nope' })).toThrow('Invalid target');
    expect(match.players[0].hand).toHaveLength(1);
  });
});

describe('useOrder with targets', () => {
  it('throws No valid targets and keeps the order unused', () => {
    const match = createMatch([], [], 0);
    const sniper = place(match, 0, def('sn', 4, { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 }));
    expect(() => useOrder(match, 0, 'melee', 0)).toThrow('No valid targets');
    expect(sniper.chargesLeft).toBe(2);
  });
});
