export const DEPLOY_DESCRIPTIONS = {
  // targeted
  damage:               (p) => `наносит ${p} урона выбранному врагу`,
  heal:                 (p) => `лечит выбранного союзника на ${p}`,
  boost:                (p) => `усиливает выбранного союзника на +${p}`,
  shield:               ()  => 'даёт Щит выбранному союзнику',
  duplicate:            ()  => 'кладёт в руку копию выбранного союзника',
  poison:               ()  => 'отравляет выбранного врага (−1 силы в ход)',
  bleed:                (p) => `накладывает Кровотечение ×${p} на выбранного врага`,
  row_damage:           (p) => `наносит ${p} урона всем картам выбранного ряда врага`,
  take_control:         ()  => 'забирает на свою сторону выбранного врага с силой ≤ 4',
  cleanse_heal:         (p) => `снимает Яд и Кровотечение с союзника и лечит его на ${p}`,
  // automatic
  knight_bonus:         ()  => '+1 к силе за каждого Рыцаря на поле',
  shield_self:          ()  => 'получает Щит',
  boost_self:           (p) => `усиливает себя на +${p}`,
  boost_all_faction:    (p) => `усиливает всех союзников своей фракции на +${p}`,
  damage_row:           (p) => `наносит ${p} урона всем картам в своём ряду у врага`,
  damage_all_rows:      (p) => `наносит ${p} урона всем картам на поле`,
  resurrect_one:        ()  => 'воскрешает последнюю карту с кладбища',
  resurrect_four_weak:  ()  => 'воскрешает 4 последние карты с кладбища с силой 1',
  copy_enemy_graveyard: ()  => 'призывает копию сильнейшей карты с кладбища врага',
  wolf_pack:            ()  => 'кладёт свою копию в руку; при 3+ Волках на поле каждый +2',
  bleed_check_self:     ()  => '+3 к силе, если у врага есть Кровотечение',
  werewolf_register:    ()  => 'в начале каждого раунда получает +2 силы',
  frost_weather_bonus:  (p) => `устанавливает Мороз; если погода уже была — +${p} себе`,
};

export const ORDER_DESCRIPTIONS = {
  boost_melee_row:   (p) => `усиливает все карты ближнего боя на +${p}`,
  boost_knights:     (p) => `усиливает всех Рыцарей на +${p}`,
  damage_one:        (p) => `наносит ${p} урона выбранному врагу`,
  damage_lock:       (p) => `наносит ${p} урона и блокирует способность выбранного врага`,
  damage_row_choice: (p) => `наносит ${p} урона всему выбранному ряду врага`,
  heal_ally:         (p) => `лечит выбранного союзника на ${p}`,
  shield_ally:       ()  => 'даёт Щит выбранному союзнику',
  poison_two:        ()  => 'отравляет двух слабейших врагов',
  debuff_living:     (p) => `наносит ${p} урона всем врагам`,
  boost_all_faction: (p) => `усиливает всех союзников на +${p}`,
};

export const SPECIAL_DESCRIPTIONS = {
  horn:              'удваивает силу карт в выбранном своём ряду',
  weather_frost:     'Мороз: сила карт ближнего боя считается как 1',
  weather_fog:       'Туман: сила карт дальнего боя считается как 1',
  weather_rain:      'Дождь: сила осадных карт считается как 1',
  clear:             'убирает всю погоду',
  sign_damage:       'наносит 2 урона всем картам выбранного ряда врага',
  lightning:         'наносит 4 урона выбранному врагу',
  blessing_humans:   'усиливает всех людей на поле на +2',
  order_ready:       'все Приказы союзников снова готовы',
  fog_frost_combo:   'устанавливает Туман и Мороз одновременно',
  bleed_all_enemies: 'накладывает Кровотечение на всех врагов',
  scorch:            'уничтожает сильнейшие карты (≥10 силы) на обоих полях',
};

export function cardDescription(def) {
  const lines = [];

  // Specials
  if (def.effect && SPECIAL_DESCRIPTIONS[def.effect]) {
    lines.push(SPECIAL_DESCRIPTIONS[def.effect]);
  }

  // Deploy effect
  if (def.deployEffect && DEPLOY_DESCRIPTIONS[def.deployEffect]) {
    lines.push('При розыгрыше: ' + DEPLOY_DESCRIPTIONS[def.deployEffect](def.deployParam));
  }

  // Order ability
  if (def.hasOrder && def.orderEffect) {
    const prefix = def.zeal ? '⚡ Приказ (рвение): ' : 'Приказ: ';
    const charges = def.chargeMax > 0 ? `  [заряды: ${def.chargeMax}]` : '';
    const desc = ORDER_DESCRIPTIONS[def.orderEffect]?.(def.orderParam) ?? def.orderEffect;
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
