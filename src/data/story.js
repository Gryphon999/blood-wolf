// Enemy decks for the PvE campaign. Original dark-fantasy content.
import { SHOP_CARDS } from './shopCards.js';
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

// Chapter 1 (the original five nodes)
export const STORY_NODES = [
  { id: 'bandits', name: 'Разбойники на тракте', enemyDeck: bandits, rewardGold: 40 },
  { id: 'wolves', name: 'Стая в чаще', enemyDeck: wolves, rewardGold: 60 },
  { id: 'undead', name: 'Проклятое кладбище', enemyDeck: undead, rewardGold: 80 },
  { id: 'mercs', name: 'Наёмники тьмы', enemyDeck: darkMercs, rewardGold: 120 },
  { id: 'boss', name: 'Босс: Древний змей', enemyDeck: bossWyrm, rewardGold: 250, rewardCardId: 'paladin', boss: true },
];

// ── Chapter 2: bosses with unique rules ──────────────────────────────────────
// rules.permanentWeather: rows that stay under weather all match (Clear Sky cannot lift it)
// rules.bossUnits: units standing on the enemy board at the start of every round
// enemyLeaderId: the enemy's leader (other nodes have none)
const shop = (id) => SHOP_CARDS.find((c) => c.id === id);

const fogMarsh = [
  u('fm1', 'Болотник', 'melee', 5), u('fm2', 'Болотник', 'melee', 5), u('fm3', 'Трясинный тролль', 'siege', 6),
  u('fm4', 'Трясинный тролль', 'siege', 6), shop('werewolf'), shop('wolf'), shop('serpent'),
  u('fm5', 'Утопленник', 'melee', 4), u('fm6', 'Утопленник', 'melee', 4), spell('fm_horn', 'Зов топи', 'horn', 'melee'),
];

const boneCrypt = [
  shop('necromancer'), shop('bloodsucker'), u('bc1', 'Костяной страж', 'melee', 6), u('bc2', 'Костяной страж', 'melee', 6),
  u('bc3', 'Костяной лучник', 'ranged', 5), u('bc4', 'Костяной лучник', 'ranged', 5), u('bc5', 'Катафалк', 'siege', 7),
  shop('forest_shade'), spell('bc_blight', 'Могильный тлен', 'sign_damage', 'melee'), hero('bc_hero', 'Хранитель склепа', 'melee', 9),
];

const bloodCourt = [
  shop('vampire'), shop('blood_count'), shop('bloodsucker'), shop('seducer'), shop('blood_ritual'),
  u('bl1', 'Кровавый страж', 'melee', 6), u('bl2', 'Кровавый страж', 'melee', 6), u('bl3', 'Летучая стая', 'ranged', 5),
  u('bl4', 'Летучая стая', 'ranged', 5), hero('bl_hero', 'Графиня Вейра', 'ranged', 9),
];

const WOLF_KING = { ...hero('wk_king', 'Король волков', 'melee', 8), tags: ['beast', 'wolf'] };
const wolfKing = [
  shop('dire_wolf_a'), shop('dire_wolf_b'), shop('dire_wolf_c'), shop('werewolf'), shop('harpy_hunter'),
  u('wk1', 'Волкодлак', 'melee', 6), u('wk2', 'Волкодлак', 'melee', 6), u('wk3', 'Воющий', 'ranged', 5),
  spell('wk_howl', 'Вой стаи', 'horn', 'melee'), u('wk4', 'Матёрый вожак', 'siege', 7),
];

const BLOOD_WOLF = { ...hero('bwf_boss', 'Кровавый Волк', 'melee', 10), tags: ['beast', 'wolf'] };
const bloodWolf = [
  shop('chaos_demon'), shop('archdemon'), shop('regen_troll'), shop('doppelganger'), shop('ice_giant'),
  shop('vampire'), u('bwf1', 'Кровавая гончая', 'melee', 7), u('bwf2', 'Кровавая гончая', 'melee', 7),
  u('bwf3', 'Вестник луны', 'ranged', 6), spell('bwf_ritual', 'Кровавая луна', 'bleed_all_enemies', 'melee'),
];

export const CHAPTER_TWO_NODES = [
  { id: 'fog_marsh', name: 'Топь ведьмы', enemyDeck: fogMarsh, rewardGold: 150,
    enemyLeaderId: 'fog_witch', rules: { permanentWeather: ['ranged'] } },
  { id: 'bone_crypt', name: 'Костяной склеп', enemyDeck: boneCrypt, rewardGold: 180, enemyLeaderId: 'bone_lord' },
  { id: 'blood_court', name: 'Кровавый двор', enemyDeck: bloodCourt, rewardGold: 220, enemyLeaderId: 'brood_queen' },
  { id: 'wolf_king', name: 'Босс: Король волков', enemyDeck: wolfKing, rewardGold: 280, boss: true,
    rules: { bossUnits: [WOLF_KING] } },
  { id: 'blood_wolf', name: 'Финал: Кровавый Волк', enemyDeck: bloodWolf, rewardGold: 500, rewardCardId: 'order_healer',
    boss: true, enemyLeaderId: 'brood_queen', rules: { permanentWeather: ['siege'], bossUnits: [BLOOD_WOLF] } },
];

// The full campaign shown in StoryScene
export const CAMPAIGN_NODES = [...STORY_NODES, ...CHAPTER_TWO_NODES];
