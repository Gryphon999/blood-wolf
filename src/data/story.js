// Enemy decks for the PvE campaign. Original dark-fantasy content.
const u = (id, name, row, power) => ({
  id, name, faction: 'monsters', type: 'unit', row, power, effect: null, rarity: 'common', cost: 0, art: null,
});
const hero = (id, name, row, power) => ({ ...u(id, name, row, power), type: 'hero', rarity: 'legendary' });
const spell = (id, name, effect, row) => ({
  id, name, faction: 'monsters', type: 'special', row, power: 0, effect, rarity: 'common', cost: 0, art: null,
});

const bandits = [
  u('b_thug1', 'Головорез', 'melee', 3),
  u('b_thug2', 'Головорез', 'melee', 3),
  u('b_thug3', 'Головорез', 'melee', 4),
  u('b_bow1', 'Разбойник', 'ranged', 3),
  u('b_bow2', 'Разбойник', 'ranged', 3),
  u('b_bow3', 'Разбойник', 'ranged', 4),
  u('b_ram', 'Таран', 'siege', 4),
  u('b_ram2', 'Таран', 'siege', 4),
  u('b_boss', 'Атаман', 'melee', 5),
  u('b_dog', 'Пёс', 'melee', 2),
];

const wolves = [
  u('w1', 'Волк', 'melee', 4),
  u('w2', 'Волк', 'melee', 4),
  u('w3', 'Волк', 'melee', 5),
  u('w4', 'Вожак', 'melee', 6),
  u('w5', 'Волчица', 'ranged', 4),
  u('w6', 'Волчица', 'ranged', 4),
  u('w7', 'Матёрый', 'siege', 5),
  u('w8', 'Матёрый', 'siege', 5),
  spell('w_howl', 'Вой', 'horn', 'melee'),
  u('w9', 'Щенок', 'melee', 3),
];

const undead = [
  u('un1', 'Скелет', 'melee', 4),
  u('un2', 'Скелет', 'melee', 4),
  u('un3', 'Упырь', 'melee', 5),
  u('un4', 'Упырь', 'melee', 5),
  u('un5', 'Призрак', 'ranged', 5),
  u('un6', 'Призрак', 'ranged', 5),
  u('un7', 'Костяк', 'siege', 6),
  spell('un_fog', 'Морок', 'weather_fog', 'ranged'),
  spell('un_blight', 'Тлен', 'sign_damage', 'melee'),
  u('un8', 'Мертвец', 'melee', 3),
];

const darkMercs = [
  u('dm1', 'Тёмный воин', 'melee', 5),
  u('dm2', 'Тёмный воин', 'melee', 6),
  u('dm3', 'Тёмный лучник', 'ranged', 5),
  u('dm4', 'Тёмный лучник', 'ranged', 6),
  u('dm5', 'Осадный зверь', 'siege', 7),
  u('dm6', 'Осадный зверь', 'siege', 6),
  spell('dm_horn', 'Клич', 'horn', 'siege'),
  spell('dm_frost', 'Стужа', 'weather_frost', 'melee'),
  hero('dm_hero', 'Чёрный рыцарь', 'melee', 8),
  u('dm7', 'Наймит', 'ranged', 4),
];

const bossWyrm = [
  u('bw1', 'Змеёныш', 'melee', 5),
  u('bw2', 'Змеёныш', 'melee', 6),
  u('bw3', 'Крылатый', 'ranged', 6),
  u('bw4', 'Крылатый', 'ranged', 7),
  u('bw5', 'Хвост', 'siege', 7),
  u('bw6', 'Хвост', 'siege', 8),
  spell('bw_rain', 'Буря', 'weather_rain', 'siege'),
  spell('bw_horn', 'Рёв', 'horn', 'melee'),
  spell('bw_sign', 'Яд', 'sign_damage', 'ranged'),
  hero('bw_wyrm', 'Древний змей', 'melee', 11),
];

export const STORY_NODES = [
  { id: 'bandits', name: 'Разбойники на тракте', enemyDeck: bandits, rewardGold: 40 },
  { id: 'wolves', name: 'Стая в чаще', enemyDeck: wolves, rewardGold: 60 },
  { id: 'undead', name: 'Проклятое кладбище', enemyDeck: undead, rewardGold: 80 },
  { id: 'mercs', name: 'Наёмники тьмы', enemyDeck: darkMercs, rewardGold: 120 },
  { id: 'boss', name: 'Босс: Древний змей', enemyDeck: bossWyrm, rewardGold: 250, rewardCardId: 'paladin' },
];
