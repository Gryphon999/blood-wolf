// Original dark-fantasy content (no third-party IP).
const card = (id, name, type, row, power, effect = null, rarity = 'common') => ({
  id, name, faction: 'humans', type, row, power, effect, rarity, cost: 0, art: null,
});

export const PLAYER_DECK = [
  card('merc_a', 'Наёмник', 'unit', 'melee', 4),
  card('merc_b', 'Наёмник', 'unit', 'melee', 4),
  card('merc_c', 'Наёмник', 'unit', 'melee', 4),
  card('knight', 'Рыцарь', 'unit', 'melee', 6),
  card('archer_a', 'Лучник', 'unit', 'ranged', 3),
  card('archer_b', 'Лучник', 'unit', 'ranged', 3),
  card('catapult', 'Катапульта', 'unit', 'siege', 5),
  card('champion', 'Витязь', 'hero', 'melee', 7),
  card('warhorn', 'Рог войны', 'special', 'melee', 0, 'horn'),
  card('frost', 'Мороз', 'special', 'melee', 0, 'weather_frost'),
  card('clear_sky', 'Ясное небо', 'special', 'melee', 0, 'clear'),
];

export const AI_DECK = [
  { id: 'ghoul_a', name: 'Упырь', faction: 'monsters', type: 'unit', row: 'melee', power: 3, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'ghoul_b', name: 'Упырь', faction: 'monsters', type: 'unit', row: 'melee', power: 3, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'ghoul_c', name: 'Упырь', faction: 'monsters', type: 'unit', row: 'melee', power: 3, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'harpy_a', name: 'Гарпия', faction: 'monsters', type: 'unit', row: 'ranged', power: 4, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'harpy_b', name: 'Гарпия', faction: 'monsters', type: 'unit', row: 'ranged', power: 4, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'troll_a', name: 'Тролль', faction: 'monsters', type: 'unit', row: 'siege', power: 6, effect: null, rarity: 'rare', cost: 0, art: null },
  { id: 'troll_b', name: 'Тролль', faction: 'monsters', type: 'unit', row: 'siege', power: 6, effect: null, rarity: 'rare', cost: 0, art: null },
  { id: 'beast', name: 'Зверь', faction: 'monsters', type: 'hero', row: 'melee', power: 8, effect: null, rarity: 'legendary', cost: 0, art: null },
  { id: 'blight', name: 'Порча', faction: 'monsters', type: 'special', row: 'melee', power: 0, effect: 'sign_damage', rarity: 'rare', cost: 0, art: null },
  { id: 'fog', name: 'Туман', faction: 'monsters', type: 'special', row: 'ranged', power: 0, effect: 'weather_fog', rarity: 'common', cost: 0, art: null },
];
