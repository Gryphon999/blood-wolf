import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass, useOrder, startTurn, HORN_BOOST } from './GwentMatch.js';
import { useLeader } from './leaders.js';
import { addUnit } from './Board.js';
import { createCard } from './Card.js';
import { getCard } from '../data/cardCatalog.js';
import { PLAYER_DECK, AI_DECK } from '../data/starterDecks.js';
import { SHOP_CARDS } from '../data/shopCards.js';
import { DEPLOY_DESCRIPTIONS, ORDER_DESCRIPTIONS, SPECIAL_DESCRIPTIONS } from '../ui/cardDescription.js';

const unit = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });
const filler = (n = 4) => Array.from({ length: n }, (_, i) => unit(`f${i}`, 1));
const put = (match, p, def, row = def.row ?? 'melee') => {
  const card = createCard(def);
  addUnit(match.players[p].board, row, card);
  return card;
};

describe('War Horn', () => {
  it('boosts and cleanses the chosen row only, and the bonus does not outlive the cards', () => {
    const match = createMatch([getCard('warhorn'), ...filler()], filler(), 1);
    const a = put(match, 0, unit('a', 4));
    const b = put(match, 0, unit('b', 2));
    const far = put(match, 0, unit('far', 5, { row: 'ranged' }));
    a.poisoned = true;
    b.bleedStacks = 2;
    playCard(match, 0, 'melee');
    expect([a.power, b.power, far.power]).toEqual([4 + HORN_BOOST, 2 + HORN_BOOST, 5]);
    expect([a.poisoned, b.bleedStacks]).toEqual([false, 0]);
    expect(match.events.filter((e) => e.type === 'boost')).toHaveLength(2);
  });
});

describe('Battle Order', () => {
  it('readies Orders, refills Charges, lifts locks and keeps the turn', () => {
    const match = createMatch([getCard('battle_order'), ...filler()], filler(), 1);
    const sniper = put(match, 0, getCard('sniper'));
    const ballista = put(match, 0, getCard('ballista'));
    sniper.chargesLeft = 0;
    ballista.orderUsed = true;
    ballista.locked = true;
    playCard(match, 0, 'melee');
    expect(match.current).toBe(0);
    expect(sniper.chargesLeft).toBe(2);
    expect([ballista.orderUsed, ballista.locked]).toEqual([false, false]);
  });

  it('does not spend the humans\' Discipline passive', () => {
    const match = createMatch([getCard('battle_order'), ...filler()], filler(), 1, { factions: ['humans', 'monsters'] });
    match.round = 2;
    playCard(match, 0, 'melee');
    expect(match.players[0].passiveUsed).toBeFalsy();
  });
});

describe('Werewolf', () => {
  it('survives the round and grows by 2', () => {
    const match = createMatch([getCard('werewolf'), ...filler()], filler(), 1);
    playCard(match, 0, 'melee');
    const wolf = match.players[0].board.melee[0];
    pass(match);
    pass(match);
    expect(match.round).toBe(2);
    expect(match.players[0].board.melee).toContain(wolf);
    expect(wolf.power).toBe(7);
  });
});

describe('Eagle Eye', () => {
  it('a repeated Order poisons fresh targets instead of the same two', () => {
    const match = createMatch(filler(), filler(), 1);
    const eye = put(match, 0, getCard('eagle_eye'));
    const foes = [2, 3, 4, 5].map((p) => put(match, 1, unit(`e${p}`, p)));
    useOrder(match, 0, 'ranged', match.players[0].board.ranged.indexOf(eye));
    eye.orderUsed = false;
    useOrder(match, 0, 'ranged', match.players[0].board.ranged.indexOf(eye));
    expect(foes.map((f) => f.poisoned)).toEqual([true, true, true, true]);
  });
});

describe('summons are visible to the UI', () => {
  it('Necromancer announces the copied unit', () => {
    const match = createMatch([getCard('necromancer'), ...filler()], filler(), 1);
    match.players[1].graveyard.push(createCard(unit('dead', 6, { row: 'ranged' })));
    playCard(match, 0, 'melee');
    const copy = match.players[0].board.ranged[0];
    expect(copy.power).toBe(6);
    expect(match.events.some((e) => e.type === 'play' && e.uid === copy.uid && e.resurrect)).toBe(true);
  });

  it('Regenerating Troll announces every revived unit at power 1', () => {
    const match = createMatch([getCard('regen_troll'), ...filler()], filler(), 1);
    match.players[0].graveyard.push(createCard(unit('d1', 6)), createCard(unit('d2', 5)));
    playCard(match, 0, 'siege');
    const revived = match.players[0].board.melee;
    expect(revived.map((c) => c.power)).toEqual([1, 1]);
    expect(match.events.filter((e) => e.type === 'play' && e.resurrect)).toHaveLength(2);
  });
});

describe('leader cards do something on a hero body', () => {
  it('King Raven rallies his faction, Fang of Darkness burns the enemy melee row', () => {
    const a = createMatch([getCard('king_raven'), ...filler()], filler(), 1);
    const ally = put(a, 0, unit('ally', 3, { faction: 'humans' }));
    playCard(a, 0, 'melee');
    expect(ally.power).toBe(4);

    const b = createMatch([getCard('fang_darkness'), ...filler()], filler(), 1);
    const foe = put(b, 1, unit('foe', 5));
    playCard(b, 0, 'melee');
    expect(foe.power).toBe(3);
  });
});

describe('siege bombardment', () => {
  it('marks its damage so the UI can throw a stone from the siege row', () => {
    const match = createMatch(filler(), filler(), 1);
    put(match, 0, unit('cat', 5, { row: 'siege' }));
    const foe = put(match, 1, unit('foe', 4));
    startTurn(match);
    expect(foe.power).toBe(3);
    expect(match.events.find((e) => e.type === 'damage')).toMatchObject({ bombard: 0, targetUid: foe.uid });
  });
});

describe('new leader abilities', () => {
  const led = (ability, param) => createMatch(filler(), filler(), 1, { leaders: [{ id: 'l', ability, param }, null] });

  it('rally clears the weather and boosts every own non-hero', () => {
    const match = led('rally', 1);
    match.weather.add('melee');
    const a = put(match, 0, unit('a', 3));
    const hero = put(match, 0, unit('h', 6, { type: 'hero' }));
    useLeader(match, 0);
    expect(match.weather.size).toBe(0);
    expect([a.power, hero.power]).toEqual([4, 6]);
  });

  it('bleed_all, poison_weakest and damage_all reach the enemy board', () => {
    let match = led('bleed_all', 1);
    let foes = [put(match, 1, unit('a', 3)), put(match, 1, unit('b', 5, { row: 'siege' }))];
    useLeader(match, 0);
    expect(foes.map((f) => f.bleedStacks)).toEqual([1, 1]);

    match = led('poison_weakest', 2);
    foes = [2, 6, 4].map((p) => put(match, 1, unit(`e${p}`, p)));
    useLeader(match, 0);
    expect(foes.map((f) => f.poisoned)).toEqual([true, false, true]);

    match = led('damage_all', 1);
    foes = [put(match, 1, unit('a', 3)), put(match, 1, unit('b', 1))];
    useLeader(match, 0);
    expect(foes[0].power).toBe(2);
    expect(match.players[1].board.melee).toEqual([foes[0]]);
  });

  it('damage_row hits the enemy row with the most power', () => {
    const match = led('damage_row', 2);
    const weak = put(match, 1, unit('w', 3));
    const strong = [put(match, 1, unit('s1', 5, { row: 'siege' })), put(match, 1, unit('s2', 5, { row: 'siege' }))];
    useLeader(match, 0);
    expect([weak.power, ...strong.map((c) => c.power)]).toEqual([3, 3, 3]);
  });

  it('shield_all shields every own non-hero', () => {
    const match = led('shield_all', 1);
    const a = put(match, 0, unit('a', 3));
    useLeader(match, 0);
    expect(a.shielded).toBe(true);
  });
});

describe('every card ability is implemented and described', () => {
  const all = [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS];

  it('no card refers to an effect the engine or the rules text does not know', () => {
    for (const def of all) {
      if (def.deployEffect) expect(DEPLOY_DESCRIPTIONS[def.deployEffect], `${def.id} deploy`).toBeTypeOf('function');
      if (def.orderEffect) expect(ORDER_DESCRIPTIONS[def.orderEffect], `${def.id} order`).toBeTypeOf('function');
      if (def.type === 'special') expect(SPECIAL_DESCRIPTIONS[def.effect], `${def.id} special`).toBeTypeOf('string');
    }
  });

  it('no hero wastes its Deploy on a Shield (heroes cannot be damaged)', () => {
    for (const def of all) {
      if (def.type === 'hero') expect(def.deployEffect, def.id).not.toBe('shield_self');
    }
  });
});
