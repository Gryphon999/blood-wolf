const DEPLOY = {
  knight_bonus:         (p) => `получает Броню +${p ?? 2}`,
  boost_neighbor:       (p) => `усиливает соседнюю карту на +${p}`,
  poison_one:           ()  => 'отравляет врага (−1 силы в ход)',
  damage_one:           (p) => `наносит ${p} урона одному врагу`,
  cleanse_ally:         ()  => 'снимает негативные эффекты с союзника',
  bleed_two:            ()  => 'накладывает Кровотечение на двух врагов',
  bleed_check_self:     ()  => 'Кровотечение врагу; если уже кровоточит — усиляет себя',
  copy_enemy_graveyard: ()  => 'копирует карту с кладбища врага',
  wolf_pack:            ()  => 'усиливает всех Волков на поле на +1',
  control_weakest:      ()  => 'перетягивает слабейшего врага на свою сторону',
  damage_row:           (p) => `наносит ${p} урона всем картам в ряду врага`,
  damage_all_rows:      (p) => `наносит ${p} урона всем рядам противника`,
  frost_weather_bonus:  (p) => `устанавливает Мороз; Великаны получают +${p}`,
  resurrect_four_weak:  ()  => 'воскрешает 4 слабейшие карты с кладбища',
  boost_all_faction:    (p) => `усиливает всех союзников на +${p}`,
  boost_machine:        (p) => `усиливает все Машины на +${p}`,
  boost_self:           (p) => `усиляет себя на +${p}`,
  shield_self:          ()  => 'накладывает Щит на себя',
  werewolf_register:    ()  => 'в начале каждого раунда получает +2 силы',
};

const ORDER = {
  boost_melee_row:   (p) => `усиливает все карты ближнего боя на +${p}`,
  boost_knights:     (p) => `усиливает всех Рыцарей на +${p}`,
  damage_one:        (p) => `наносит ${p} урона выбранному врагу`,
  damage_lock:       (p) => `наносит ${p} урона и блокирует способность карты`,
  damage_row_choice: (p) => `наносит ${p} урона всему выбранному ряду`,
  heal_ally:         (p) => `лечит союзника на +${p}`,
  shield_ally:       ()  => 'накладывает Щит на союзника',
  poison_two:        ()  => 'отравляет двух врагов',
  debuff_living:     (p) => `ослабляет все живые карты врага на −${p}`,
  boost_all_faction: (p) => `усиливает всех союзников на +${p}`,
};

const SPECIAL = {
  lightning_ranged: 'бьёт молнией по всем картам в дальнем ряду врага',
  blessing_humans:  'усиливает всех людей в руке и на поле',
  order_ready:      'позволяет использовать Приказ всем союзникам в этот ход',
  fog_frost_combo:  'устанавливает Туман и Мороз одновременно',
  bleed_all_enemies:'накладывает Кровотечение на всех врагов',
};

export function cardDescription(def) {
  const lines = [];

  // Specials
  if (def.effect && SPECIAL[def.effect]) {
    lines.push(SPECIAL[def.effect]);
  }

  // Deploy effect
  if (def.deployEffect && DEPLOY[def.deployEffect]) {
    lines.push('При розыгрыше: ' + DEPLOY[def.deployEffect](def.deployParam));
  }

  // Order ability
  if (def.hasOrder && def.orderEffect) {
    const prefix = def.zeal ? '⚡ Приказ (рвение): ' : 'Приказ: ';
    const charges = def.chargeMax > 0 ? `  [заряды: ${def.chargeMax}]` : '';
    const desc = ORDER[def.orderEffect]?.(def.orderParam) ?? def.orderEffect;
    lines.push(prefix + desc + charges);
  }

  // Passive traits
  if (def.resilience) lines.push('Стойкость: переходит живым в следующий раунд');
  if (def.doomed)     lines.push('Проклят: удаляется из игры в конце раунда');
  if (def.armor > 0)  lines.push(`Броня ${def.armor}: блокирует первые ${def.armor} урона`);
  if (def.immune)     lines.push('Иммунитет: нельзя применить эффекты');

  return lines.length > 0
    ? lines.join('   •   ')
    : 'Единица без особых способностей';
}
