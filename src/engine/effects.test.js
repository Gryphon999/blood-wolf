import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass, useOrder } from './GwentMatch.js';
import { createCard } from './Card.js';
import { addUnit } from './Board.js';
import { applyDeploy } from './effects.js';

// Helper: minimal unit def
const uDef = (id, power, row = 'melee', opts = {}) => ({ id, type: 'unit', row, power, ...opts });
const unit = (id, power, row = 'melee') => uDef(id, power, row);

describe('Deploy: knight_bonus', () => {
  it('adds 1 power per knight already on the board', () => {
    const knightDef = uDef('k1', 3, 'melee', { tags: ['knight'] });
    const knightBonus = uDef('kb', 2, 'melee', { deployEffect: 'knight_bonus' });
    const match = createMatch([knightDef, knightBonus], [unit('x', 1)], 2);
    playCard(match, 0, 'melee'); // k1 onto board (0 knights before it)
    // kb will be index 0 in hand now (knightDef was index 0, knightBonus is index 1→0)
    playCard(match, 0, 'melee'); // x for opponent
    playCard(match, 0, 'melee'); // kb onto board — 1 knight already there
    expect(match.players[0].board.melee[1].power).toBe(3); // 2 + 1
  });
});

describe('Deploy: poison_one', () => {
  it('sets poisoned on the weakest enemy unit', () => {
    const poisoner = uDef('p', 3, 'ranged', { deployEffect: 'poison_one' });
    const weak = unit('w', 2);
    const strong = unit('s', 7);
    const match = createMatch([poisoner], [weak, strong], 1);
    // Pre-populate enemy board manually
    addUnit(match.players[1].board, 'melee', createCard(weak));
    addUnit(match.players[1].board, 'melee', createCard(strong));
    match.players[1].hand = [];
    playCard(match, 0, 'ranged'); // poisoner played
    const cards = match.players[1].board.melee;
    const poisoned = cards.filter(c => c.poisoned);
    expect(poisoned.length).toBe(1);
    expect(poisoned[0].power).toBe(2); // weakest was targeted
  });
});

describe('Deploy: bleed_two', () => {
  it('adds bleedStack to the 2 weakest enemies', () => {
    const bleeder = uDef('b', 4, 'melee', { deployEffect: 'bleed_two' });
    const match = createMatch([bleeder], [unit('e1', 3), unit('e2', 5), unit('e3', 1)], 1);
    for (let i = 0; i < 3; i++) {
      addUnit(match.players[1].board, 'melee', createCard({ id: `e${i}`, type: 'unit', row: 'melee', power: [3, 5, 1][i] }));
    }
    match.players[1].hand = [];
    playCard(match, 0, 'melee');
    const bleeds = match.players[1].board.melee.filter(c => c.bleedStacks > 0);
    expect(bleeds.length).toBe(2);
    const powers = bleeds.map(c => c.power).sort();
    expect(powers).toEqual([1, 3]); // the two weakest
  });
});

describe('Deploy: damage_one', () => {
  it('deals deployParam damage to the strongest enemy non-hero', () => {
    const dmgCard = uDef('d', 3, 'melee', { deployEffect: 'damage_one', deployParam: 3 });
    const enemy = { id: 'e', type: 'unit', row: 'melee', power: 6 };
    const match = createMatch([dmgCard], [enemy], 1);
    addUnit(match.players[1].board, 'melee', createCard(enemy));
    match.players[1].hand = [];
    playCard(match, 0, 'melee');
    expect(match.players[1].board.melee[0].power).toBe(3); // 6 - 3
  });

  it('does not damage heroes', () => {
    const dmgCard = uDef('d', 3, 'melee', { deployEffect: 'damage_one', deployParam: 3 });
    const hero = { id: 'h', type: 'hero', row: 'melee', power: 8 };
    const match = createMatch([dmgCard], [hero], 1);
    addUnit(match.players[1].board, 'melee', createCard(hero));
    match.players[1].hand = [];
    playCard(match, 0, 'melee');
    expect(match.players[1].board.melee[0].power).toBe(8); // unchanged
  });
});

describe('Deploy: boost_neighbor', () => {
  it('boosts the card placed before it in the same row', () => {
    const first = uDef('f', 3, 'melee');
    const booster = uDef('nb', 2, 'melee', { deployEffect: 'boost_neighbor', deployParam: 2 });
    const match = createMatch([first, booster], [unit('x', 1)], 2);
    playCard(match, 0, 'melee'); // first
    playCard(match, 0, 'melee'); // x
    playCard(match, 0, 'melee'); // booster — first is at index 0, booster at 1
    expect(match.players[0].board.melee[0].power).toBe(5); // 3 + 2
  });

  it('does not boost the card placed after it', () => {
    const leftDef = uDef('left', 4, 'melee');
    const boosterDef = uDef('bn', 3, 'melee', { deployEffect: 'boost_neighbor', deployParam: 2 });
    const rightDef = uDef('right', 5, 'melee');
    const match = createMatch([boosterDef, unit('x', 1)], [unit('b', 1)], 1);
    // Manually place left neighbor, then booster, then right neighbor
    addUnit(match.players[0].board, 'melee', createCard(leftDef));
    addUnit(match.players[0].board, 'melee', createCard(boosterDef));
    addUnit(match.players[0].board, 'melee', createCard(rightDef));
    const boosterCard = match.players[0].board.melee[1];
    applyDeploy(match, boosterCard, 0);
    expect(match.players[0].board.melee[0].power).toBe(6); // left boosted (4 + 2)
    expect(match.players[0].board.melee[2].power).toBe(5); // right NOT boosted
  });
});

describe('Deploy: boost_all_faction', () => {
  it('boosts all units of the same faction on own board', () => {
    const booster = uDef('b', 3, 'melee', { faction: 'humans', deployEffect: 'boost_all_faction', deployParam: 1 });
    const ally = { ...uDef('a', 4, 'ranged'), faction: 'humans' };
    const match = createMatch([booster], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'ranged', createCard(ally));
    playCard(match, 0, 'melee'); // booster deployed
    expect(match.players[0].board.ranged[0].power).toBe(5); // 4 + 1
  });
});

describe('Deploy: damage_all_rows (chaos_demon)', () => {
  it('deals damage to all units including own', () => {
    const demon = uDef('cd', 9, 'siege', { deployEffect: 'damage_all_rows', deployParam: 5 });
    const ally = uDef('a', 6, 'melee');
    const match = createMatch([demon], [unit('e', 8)], 1);
    addUnit(match.players[0].board, 'melee', createCard(ally));
    addUnit(match.players[1].board, 'melee', createCard({ id: 'e', type: 'unit', row: 'melee', power: 8 }));
    match.players[1].hand = [];
    playCard(match, 0, 'siege');
    expect(match.players[0].board.melee[0].power).toBe(1); // 6 - 5 = 1
    expect(match.players[1].board.melee[0].power).toBe(3); // 8 - 5 = 3
  });
});

describe('Deploy: resurrect_one', () => {
  it('moves last graveyard card back to board', () => {
    const reviver = uDef('rv', 3, 'melee', { deployEffect: 'resurrect_one' });
    const dead = createCard(uDef('dead', 5, 'melee'));
    const match = createMatch([reviver], [unit('x', 1)], 1);
    match.players[0].graveyard.push(dead);
    playCard(match, 0, 'melee');
    expect(match.players[0].graveyard.length).toBe(0);
    expect(match.players[0].board.melee.some(c => c.def.id === 'dead')).toBe(true);
  });

  it('does nothing if graveyard is empty', () => {
    const reviver = uDef('rv', 3, 'melee', { deployEffect: 'resurrect_one' });
    const match = createMatch([reviver], [unit('x', 1)], 1);
    expect(() => playCard(match, 0, 'melee')).not.toThrow();
  });
});

describe('Deploy: wolf_pack', () => {
  it('boosts all wolves by 2 when 3 or more are on the field', () => {
    const wolfDef = uDef('wf', 2, 'melee', { tags: ['wolf', 'beast'], deployEffect: 'wolf_pack' });
    const match = createMatch([wolfDef], [unit('x', 1)], 1);
    // pre-populate 2 wolves
    addUnit(match.players[0].board, 'melee', createCard({ ...wolfDef, id: 'w1' }));
    addUnit(match.players[0].board, 'melee', createCard({ ...wolfDef, id: 'w2' }));
    playCard(match, 0, 'melee'); // 3rd wolf triggers pack
    const wolves = match.players[0].board.melee;
    expect(wolves.every(w => w.power === 4)).toBe(true); // 2 + 2
  });

  it('does NOT boost when fewer than 3 wolves', () => {
    const wolfDef = uDef('wf', 2, 'melee', { tags: ['wolf', 'beast'], deployEffect: 'wolf_pack' });
    const match = createMatch([wolfDef], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'melee', createCard({ ...wolfDef, id: 'w1' }));
    playCard(match, 0, 'melee'); // 2 wolves — no boost
    expect(match.players[0].board.melee[0].power).toBe(2);
  });
});

describe('Deploy: frost_weather_bonus', () => {
  it('only boosts if weather was already active', () => {
    const frostDef = uDef('fw', 4, 'melee', { deployEffect: 'frost_weather_bonus', deployParam: 3 });

    // No weather: no boost
    const match1 = createMatch([frostDef, unit('a2', 1)], [unit('b', 1)], 1);
    playCard(match1, 0, 'melee');
    expect(match1.players[0].board.melee[0].power).toBe(4); // no boost
    expect(match1.weather.has('melee')).toBe(true); // frost added

    // With existing weather: boost applies
    const match2 = createMatch([frostDef, unit('a2', 1)], [unit('b', 1)], 1);
    match2.weather.add('siege'); // pre-existing weather
    playCard(match2, 0, 'melee');
    expect(match2.players[0].board.melee[0].power).toBe(7); // 4 + 3
  });
});

describe('useOrder', () => {
  it('applies the order effect and marks orderUsed', () => {
    const bannerDef = uDef('bn', 2, 'melee', { hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1, chargeMax: 0 });
    const ally = uDef('a', 3, 'melee');
    const match = createMatch([bannerDef], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'melee', createCard(bannerDef));
    addUnit(match.players[0].board, 'melee', createCard(ally));
    match.players[0].hand = [];
    // manually mark as available (Zeal or turn reset simulated)
    match.players[0].board.melee[0].orderUsed = false;
    useOrder(match, 0, 'melee', 0);
    expect(match.players[0].board.melee[1].power).toBe(4); // ally boosted
    expect(match.players[0].board.melee[0].orderUsed).toBe(true);
  });

  it('throws if Order already used this turn', () => {
    const bannerDef = uDef('bn', 2, 'melee', { hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1, chargeMax: 0 });
    const match = createMatch([], [unit('x', 1)], 0);
    addUnit(match.players[0].board, 'melee', createCard(bannerDef));
    match.players[0].board.melee[0].orderUsed = true;
    expect(() => useOrder(match, 0, 'melee', 0)).toThrow('Order already used this turn');
  });

  it('throws if card is locked', () => {
    const bannerDef = uDef('bn', 2, 'melee', { hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1, chargeMax: 0 });
    const match = createMatch([], [unit('x', 1)], 0);
    addUnit(match.players[0].board, 'melee', createCard(bannerDef));
    match.players[0].board.melee[0].locked = true;
    match.players[0].board.melee[0].orderUsed = false;
    expect(() => useOrder(match, 0, 'melee', 0)).toThrow('Card is locked');
  });

  it('decrements chargesLeft for Charge cards and allows reuse next turn', () => {
    const sniperDef = uDef('sn', 4, 'ranged', { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 });
    const enemy = { id: 'e', type: 'unit', row: 'melee', power: 6 };
    const match = createMatch([], [enemy], 0);
    addUnit(match.players[0].board, 'ranged', createCard(sniperDef));
    addUnit(match.players[1].board, 'melee', createCard(enemy));
    const sniper = match.players[0].board.ranged[0];
    expect(sniper.chargesLeft).toBe(2);
    useOrder(match, 0, 'ranged', 0); // use once
    expect(sniper.chargesLeft).toBe(1);
    expect(match.players[1].board.melee[0].power).toBe(4); // 6 - 2
    useOrder(match, 0, 'ranged', 0); // use second charge
    expect(sniper.chargesLeft).toBe(0);
  });

  it('throws when Charge card has no charges left', () => {
    const sniperDef = uDef('sn', 4, 'ranged', { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 });
    const match = createMatch([], [unit('x', 1)], 0);
    addUnit(match.players[0].board, 'ranged', createCard(sniperDef));
    match.players[0].board.ranged[0].chargesLeft = 0;
    expect(() => useOrder(match, 0, 'ranged', 0)).toThrow('No charges left');
  });

  it('Zeal card (field_medic) can use Order on the same turn it is played', () => {
    const zealDef = uDef('fm', 4, 'melee', {
      tags: ['medic'], zeal: true, hasOrder: true, orderEffect: 'heal_ally', orderParam: 2, chargeMax: 0,
    });
    const wounded = uDef('w', 3, 'melee');
    const match = createMatch([zealDef], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'melee', createCard({ ...wounded, power: 1, defPower: 3 })); // manually wounded
    playCard(match, 0, 'melee'); // plays zealDef; Zeal so orderUsed stays false
    // The played zeal card is at index 1 of melee (wounded was 0, zealDef is 1)
    const zealCard = match.players[0].board.melee.find(c => c.def.id === 'fm');
    expect(zealCard.orderUsed).toBe(false); // Zeal: available immediately
    useOrder(match, 0, 'melee', match.players[0].board.melee.indexOf(zealCard));
    expect(match.players[0].board.melee[0].power).toBeGreaterThan(1); // healed
  });
});
