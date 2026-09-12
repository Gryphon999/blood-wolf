const card = (id, name, type, row, power, effect, rarity, cost) => ({
  id, name, faction: 'humans', type, row, power, effect, rarity, cost, art: null,
});

export const SHOP_CARDS = [
  card('guard', 'Страж', 'unit', 'melee', 5, null, 'common', 100),
  card('crossbow', 'Арбалетчик', 'unit', 'ranged', 5, null, 'common', 100),
  card('trebuchet', 'Требушет', 'unit', 'siege', 7, null, 'rare', 300),
  card('paladin', 'Паладин', 'hero', 'melee', 9, null, 'legendary', 800),
  card('flame', 'Пламя', 'special', 'melee', 0, 'sign_damage', 'rare', 300),
];
