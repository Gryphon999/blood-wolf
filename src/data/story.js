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

// ── Chapter 3: Проклятие не снято ───────────────────────────────────────────
// Story: Rein discovers the ritual that created the Blood Wolf opened a rift
// to the Lich Emperor — an ancient evil now reclaiming the Hollow Lands.

const frozenKeep = [
  u('fk1', 'Ледяной стражник', 'melee', 5), u('fk2', 'Ледяной стражник', 'melee', 5),
  u('fk3', 'Морозный лучник', 'ranged', 5), u('fk4', 'Морозный лучник', 'ranged', 5),
  u('fk5', 'Ледяная пушка', 'siege', 6), u('fk6', 'Ледяная пушка', 'siege', 6),
  shop('ice_giant'), spell('fk_frost', 'Вечная стужа', 'weather_frost', 'melee'),
  hero('fk_hero', 'Хранитель льда', 'melee', 8), u('fk7', 'Ледяной щитоносец', 'melee', 4),
];

const shadowThieves = [
  shop('doppelganger'), shop('spy_scout'), shop('forest_shade'), shop('seducer'),
  u('st1', 'Ночной лазутчик', 'melee', 4), u('st2', 'Ночной лазутчик', 'melee', 4),
  u('st3', 'Теневой стрелок', 'ranged', 5), u('st4', 'Теневой стрелок', 'ranged', 5),
  u('st5', 'Мастер теней', 'ranged', 6), hero('st_hero', 'Призрак Клинка', 'ranged', 7),
];

const plagueHorde = [
  shop('vampire'), shop('bloodsucker'), shop('serpent'),
  u('ph1', 'Заражённый', 'melee', 4), u('ph2', 'Заражённый', 'melee', 4),
  u('ph3', 'Заражённый', 'melee', 5), u('ph4', 'Чумной лучник', 'ranged', 4),
  u('ph5', 'Чумной лучник', 'ranged', 4), spell('ph_blight', 'Мор', 'bleed_all_enemies', 'melee'),
  hero('ph_hero', 'Повелитель чумы', 'melee', 9),
];

const serpentCult = [
  shop('serpent'), shop('serpent'), shop('necromancer'), shop('blood_ritual'),
  u('sc1', 'Адепт культа', 'melee', 5), u('sc2', 'Адепт культа', 'melee', 5),
  u('sc3', 'Жрец змея', 'ranged', 6), u('sc4', 'Жрец змея', 'ranged', 6),
  spell('sc_fog', 'Змеиный туман', 'weather_fog', 'ranged'), hero('sc_hero', 'Верховный жрец', 'siege', 9),
];

const FALLEN_KNIGHT = { ...hero('fln_boss', 'Падший Рыцарь', 'melee', 9), tags: ['knight'] };
const fallenKnight = [
  shop('shield_knight'), shop('berserker'), shop('king_raven'),
  u('fln1', 'Павший воин', 'melee', 6), u('fln2', 'Павший воин', 'melee', 6),
  u('fln3', 'Проклятый лучник', 'ranged', 5), u('fln4', 'Проклятый лучник', 'ranged', 5),
  u('fln5', 'Осквернённая баллиста', 'siege', 7), spell('fln_horn', 'Падший клич', 'horn', 'melee'),
  FALLEN_KNIGHT,
];

const bloodTide = [
  shop('vampire'), shop('blood_count'), shop('bloodsucker'), shop('bloodsucker'),
  u('bt1', 'Кровяной пес', 'melee', 5), u('bt2', 'Кровяной пес', 'melee', 5),
  u('bt3', 'Ночной упырь', 'ranged', 5), u('bt4', 'Ночной упырь', 'ranged', 5),
  spell('bt_ritual', 'Кровавый прилив', 'bleed_all_enemies', 'melee'), hero('bt_hero', 'Граф Крови', 'melee', 9),
];

const stormPeak = [
  shop('lightning'), shop('lightning'), shop('darkness'),
  u('sp1', 'Маг бури', 'ranged', 5), u('sp2', 'Маг бури', 'ranged', 5),
  u('sp3', 'Громовой страж', 'melee', 5), u('sp4', 'Громовой страж', 'melee', 5),
  u('sp5', 'Штормовая пушка', 'siege', 7), u('sp6', 'Штормовая пушка', 'siege', 7),
  hero('sp_hero', 'Лорд Бури', 'ranged', 8),
];

const golemArmy = [
  shop('engineer'), shop('ballista'),
  u('ga1', 'Боевой голем', 'melee', 7), u('ga2', 'Боевой голем', 'melee', 7),
  u('ga3', 'Осадный голем', 'siege', 8), u('ga4', 'Осадный голем', 'siege', 8),
  u('ga5', 'Стальной лучник', 'ranged', 5), u('ga6', 'Стальной лучник', 'ranged', 5),
  spell('ga_horn', 'Механический клич', 'horn', 'siege'), hero('ga_hero', 'Голем-Император', 'siege', 10),
];

const chaosGate = [
  shop('chaos_demon'), shop('archdemon'), shop('fire_demon'), shop('blood_ritual'), shop('darkness'),
  u('cg1', 'Хаотический бес', 'melee', 5), u('cg2', 'Хаотический бес', 'melee', 5),
  u('cg3', 'Разрыв реальности', 'ranged', 6), u('cg4', 'Разрыв реальности', 'ranged', 6),
  hero('cg_hero', 'Страж разлома', 'siege', 9),
];

const LICH_EMPEROR = { ...hero('le_boss', 'Лич-Император', 'melee', 12), tags: ['undead'] };
const lichEmperor = [
  shop('lich'), shop('necromancer'), shop('chaos_demon'), shop('archdemon'), shop('regen_troll'),
  shop('bloodsucker'), u('le1', 'Костяной рыцарь', 'melee', 7), u('le2', 'Костяной лучник', 'ranged', 6),
  spell('le_fog', 'Вечная тьма', 'fog_frost_combo', 'melee'), spell('le_blight', 'Мор вечности', 'bleed_all_enemies', 'melee'),
];

export const CHAPTER_THREE_NODES = [
  { id: 'frozen_keep', name: 'Замёрзший форт', enemyDeck: frozenKeep, rewardGold: 160,
    rules: { permanentWeather: ['melee'] } },
  { id: 'shadow_thieves', name: 'Воры теней', enemyDeck: shadowThieves, rewardGold: 180 },
  { id: 'plague_horde', name: 'Чумная орда', enemyDeck: plagueHorde, rewardGold: 200 },
  { id: 'serpent_cult', name: 'Культ Змея', enemyDeck: serpentCult, rewardGold: 220,
    rules: { permanentWeather: ['ranged'] } },
  { id: 'fallen_knight', name: 'Босс: Падший Рыцарь', enemyDeck: fallenKnight, rewardGold: 300,
    boss: true, rules: { bossUnits: [FALLEN_KNIGHT] } },
  { id: 'blood_tide', name: 'Кровавый прилив', enemyDeck: bloodTide, rewardGold: 260, rewardCardId: 'blood_count' },
  { id: 'storm_peak', name: 'Грозовой пик', enemyDeck: stormPeak, rewardGold: 280,
    rules: { permanentWeather: ['siege'] } },
  { id: 'golem_army', name: 'Армия Големов', enemyDeck: golemArmy, rewardGold: 320 },
  { id: 'chaos_gate', name: 'Врата Хаоса', enemyDeck: chaosGate, rewardGold: 360,
    rules: { permanentWeather: ['melee', 'ranged'] } },
  { id: 'lich_emperor', name: 'Финал: Лич-Император', enemyDeck: lichEmperor, rewardGold: 700,
    rewardCardId: 'lich', boss: true, rules: { permanentWeather: ['ranged'], bossUnits: [LICH_EMPEROR] } },
];

// The full campaign shown in StoryScene
export const CAMPAIGN_NODES = [...STORY_NODES, ...CHAPTER_TWO_NODES, ...CHAPTER_THREE_NODES];
