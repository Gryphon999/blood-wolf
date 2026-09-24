import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass } from './GwentMatch.js';
import { totalPower, rowPower, addUnit } from './Board.js';
import { createCard } from './Card.js';
import { dealDamage } from './actions.js';

const unit = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

describe('Bond', () => {
  it('multiplies power by the number of same-name bond cards in the row', () => {
    const b = (id) => unit(id, 3, { name: 'Брат', bond: true });
    const match = createMatch([], [], 0);
    addUnit(match.players[0].board, 'melee', createCard(b('b1')));
    expect(rowPower(match.players[0].board, 'melee')).toBe(3);
    addUnit(match.players[0].board, 'melee', createCard(b('b2')));
    expect(rowPower(match.players[0].board, 'melee')).toBe(12);
    addUnit(match.players[0].board, 'melee', createCard(unit('o', 2)));
    expect(rowPower(match.players[0].board, 'melee')).toBe(14);
  });

  it('does not bond across rows', () => {
    const match = createMatch([], [], 0);
    addUnit(match.players[0].board, 'melee', createCard(unit('b1', 3, { name: 'Брат', bond: true })));
    addUnit(match.players[0].board, 'ranged', createCard(unit('b2', 3, { name: 'Брат', bond: true, row: 'ranged' })));
    expect(totalPower(match.players[0].board)).toBe(6);
  });
});

describe('Berserker', () => {
  it('gains +1 power whenever any unit on the board dies', () => {
    const match = createMatch([], [], 0);
    const bers = createCard(unit('bers', 3, { berserker: true }));
    addUnit(match.players[0].board, 'melee', bers);
    const foe = createCard(unit('foe', 2));
    const ally = createCard(unit('ally', 1));
    addUnit(match.players[1].board, 'melee', foe);
    addUnit(match.players[0].board, 'melee', ally);
    dealDamage(match, null, foe, 5);
    dealDamage(match, null, ally, 5);
    expect(bers.power).toBe(5);
    expect(match.events.filter((e) => e.type === 'boost' && e.targetUid === bers.uid)).toHaveLength(2);
  });
});

describe('Ambush', () => {
  it('ambush cards in hand jump onto the board when their owner passes', () => {
    const amb = unit('amb', 5, { ambush: true, row: 'ranged' });
    const match = createMatch([amb, unit('a', 1)], [unit('x', 1)], 2, { rng: () => 0 });
    pass(match);
    expect(match.players[0].hand.map((c) => c.def.id)).toEqual(['a']);
    const onBoard = ['melee', 'ranged', 'siege'].flatMap((r) => match.players[0].board[r]);
    expect(onBoard.map((c) => c.def.id)).toEqual(['amb']);
    expect(match.events.find((e) => e.type === 'play')).toMatchObject({ ambush: true, player: 0 });
  });
});

describe('Vampirism', () => {
  it('the source gains power equal to the damage it dealt', () => {
    const match = createMatch([], [], 0);
    const vamp = createCard(unit('v', 4, { vampirism: true }));
    addUnit(match.players[0].board, 'melee', vamp);
    const foe = createCard(unit('foe', 2));
    addUnit(match.players[1].board, 'melee', foe);
    dealDamage(match, vamp, foe, 3);
    expect(vamp.power).toBe(6); // only 2 power was actually drained
  });

  it('gains nothing when the hit is absorbed by a shield', () => {
    const match = createMatch([], [], 0);
    const vamp = createCard(unit('v', 4, { vampirism: true }));
    addUnit(match.players[0].board, 'melee', vamp);
    const foe = createCard(unit('foe', 5));
    foe.shielded = true;
    addUnit(match.players[1].board, 'melee', foe);
    dealDamage(match, vamp, foe, 3);
    expect(vamp.power).toBe(4);
  });
});
