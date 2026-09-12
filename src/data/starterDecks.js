// Original dark-fantasy content (no third-party IP).
const card = (id, name, type, row, power, effect = null, rarity = 'common', art = null) => ({
  id, name, faction: 'humans', type, row, power, effect, rarity, cost: 0, art,
});

export const PLAYER_DECK = [
  card('merc_a', 'Наёмник',   'unit',    'melee',  4, null, 'common',    'merc'),
  card('merc_b', 'Наёмник',   'unit',    'melee',  4, null, 'common',    'merc'),
  card('merc_c', 'Наёмник',   'unit',    'melee',  4, null, 'common',    'merc'),
  card('knight', 'Рыцарь',    'unit',    'melee',  6, null, 'common',    'knight'),
  card('archer_a', 'Лучник',  'unit',    'ranged', 3, null, 'common',    'archer'),
  card('archer_b', 'Лучник',  'unit',    'ranged', 3, null, 'common',    'archer'),
  card('catapult', 'Катапульта', 'unit', 'siege',  5, null, 'rare',      'catapult'),
  card('champion', 'Витязь',  'hero',    'melee',  7, null, 'legendary', 'champion'),
  card('warhorn',  'Рог войны', 'special', 'melee', 0, 'horn',          'common', 'warhorn'),
  card('frost',    'Мороз',   'special', 'melee',  0, 'weather_frost',  'rare',   'frost'),
  card('clear_sky', 'Ясное небо', 'special', 'melee', 0, 'clear',       'common', null),
];

export const AI_DECK = [
  { id: 'ghoul_a', name: 'Упырь',   faction: 'monsters', type: 'unit',    row: 'melee',  power: 3, effect: null,           rarity: 'common',    cost: 0, art: 'ghoul' },
  { id: 'ghoul_b', name: 'Упырь',   faction: 'monsters', type: 'unit',    row: 'melee',  power: 3, effect: null,           rarity: 'common',    cost: 0, art: 'ghoul' },
  { id: 'ghoul_c', name: 'Упырь',   faction: 'monsters', type: 'unit',    row: 'melee',  power: 3, effect: null,           rarity: 'common',    cost: 0, art: 'ghoul' },
  { id: 'harpy_a', name: 'Гарпия',  faction: 'monsters', type: 'unit',    row: 'ranged', power: 4, effect: null,           rarity: 'common',    cost: 0, art: 'harpy' },
  { id: 'harpy_b', name: 'Гарпия',  faction: 'monsters', type: 'unit',    row: 'ranged', power: 4, effect: null,           rarity: 'common',    cost: 0, art: 'harpy' },
  { id: 'troll_a', name: 'Тролль',  faction: 'monsters', type: 'unit',    row: 'siege',  power: 6, effect: null,           rarity: 'rare',      cost: 0, art: 'troll' },
  { id: 'troll_b', name: 'Тролль',  faction: 'monsters', type: 'unit',    row: 'siege',  power: 6, effect: null,           rarity: 'rare',      cost: 0, art: 'troll' },
  { id: 'beast',   name: 'Зверь',   faction: 'monsters', type: 'hero',    row: 'melee',  power: 8, effect: null,           rarity: 'legendary', cost: 0, art: 'beast' },
  { id: 'blight',  name: 'Порча',   faction: 'monsters', type: 'special', row: 'melee',  power: 0, effect: 'sign_damage',  rarity: 'rare',      cost: 0, art: null },
  { id: 'fog',     name: 'Туман',   faction: 'monsters', type: 'special', row: 'ranged', power: 0, effect: 'weather_fog',  rarity: 'common',    cost: 0, art: null },
];
