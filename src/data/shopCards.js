const card = (id, name, faction, type, row, power, rarity, prov, opts = {}) => ({
  id, name, faction, type, row, power, rarity, prov,
  cost: opts.cost ?? prov * 50,
  effect: opts.effect ?? null,
  art: opts.art ?? null,
  tags: opts.tags ?? [],
  deployEffect: opts.deployEffect ?? null,
  deployParam: opts.deployParam ?? 1,
  hasOrder: opts.hasOrder ?? false,
  orderEffect: opts.orderEffect ?? null,
  orderParam: opts.orderParam ?? 1,
  chargeMax: opts.chargeMax ?? 0,
  zeal: opts.zeal ?? false,
  armor: opts.armor ?? 0,
  resilience: opts.resilience ?? false,
  doomed: opts.doomed ?? false,
  immune: opts.immune ?? false,
  spy: opts.spy ?? false,
  muster: opts.muster ?? null,
  bond: opts.bond ?? false,
  berserker: opts.berserker ?? false,
  ambush: opts.ambush ?? false,
  vampirism: opts.vampirism ?? false,
});

// ── Humans ───────────────────────────────────────────────────────────────────

const HUMAN_CARDS = [
  // Knights
  card('shield_knight',  'Рыцарь Щита',      'humans', 'unit',    'melee',  5, 'rare',      7,  { art: 'shield_knight',  tags: ['knight'], deployEffect: 'knight_bonus', armor: 2 }),
  card('squire',         'Оруженосец',        'humans', 'unit',    'melee',  3, 'common',    5,  { art: 'squire',         tags: ['knight'], deployEffect: 'boost', deployParam: 2 }),
  card('banner',         'Знаменосец',        'humans', 'unit',    'melee',  2, 'rare',      6,  { art: 'banner',         tags: ['knight'], hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1 }),
  card('paladin',        'Паладин',           'humans', 'hero',    'melee',  5, 'epic',      10, { art: 'paladin',        tags: ['knight'], resilience: true, hasOrder: true, orderEffect: 'boost_knights', orderParam: 2 }),
  // Archers
  card('poison_arrow',   'Отравл. стрела',    'humans', 'unit',    'ranged', 3, 'rare',      5,  { art: 'poison_arrow',   tags: ['archer'], deployEffect: 'poison' }),
  card('crossbow',       'Арбалетчик',        'humans', 'unit',    'ranged', 5, 'rare',      6,  { art: 'crossbow',       tags: ['archer'], deployEffect: 'damage', deployParam: 3 }),
  card('sniper',         'Снайпер',           'humans', 'unit',    'ranged', 4, 'rare',      7,  { art: 'sniper',         tags: ['archer'], hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 }),
  card('eagle_eye',      'Орлиный Глаз',      'humans', 'hero',    'ranged', 5, 'epic',      10, { art: 'eagle_eye',      tags: ['archer'], zeal: true, hasOrder: true, orderEffect: 'poison_two' }),
  // Medics
  card('field_medic',    'Боевой Медик',      'humans', 'unit',    'melee',  4, 'rare',      6,  { art: 'field_medic',    tags: ['medic'], zeal: true, hasOrder: true, orderEffect: 'heal_ally', orderParam: 2 }),
  card('priest',         'Священник',         'humans', 'unit',    'melee',  3, 'common',    5,  { art: 'priest',         tags: ['medic'], deployEffect: 'cleanse_heal', deployParam: 2 }),
  card('alchemist',      'Алхимик',           'humans', 'unit',    'ranged', 3, 'rare',      6,  { art: 'alchemist',      tags: ['medic'], deployEffect: 'duplicate', hasOrder: true, orderEffect: 'shield_ally' }),
  card('order_healer',   'Лекарь Ордена',     'humans', 'hero',    'melee',  4, 'legendary', 11, { art: 'order_healer',   tags: ['medic'], resilience: true, deployEffect: 'boost_all_faction', deployParam: 1 }),
  // Siege
  card('ballista',       'Огненная Баллиста', 'humans', 'unit',    'siege',  5, 'rare',      7,  { art: 'ballista',       tags: ['siege', 'machine'], hasOrder: true, orderEffect: 'damage_lock', orderParam: 3 }),
  card('engineer',       'Инженер',           'humans', 'unit',    'siege',  4, 'rare',      8,  { art: 'engineer',       tags: ['siege'], deployEffect: 'boost', deployParam: 3 }),
  // Specials
  card('lightning',      'Небесный Огонь',    'humans', 'special', 'ranged', 0, 'rare',      5,  { art: 'lightning',      effect: 'lightning', deployParam: 4 }),
  card('blessing',       'Благословение',     'humans', 'special', 'melee',  0, 'rare',      5,  { art: 'blessing',       effect: 'blessing_humans' }),
  card('battle_order',   'Боевой Приказ',     'humans', 'special', 'melee',  0, 'common',    4,  { art: 'battle_order',   effect: 'order_ready' }),
  card('scorch',         'Скорч',             'humans', 'special', 'melee',  0, 'epic',      7,  { effect: 'scorch' }),
  // Layer 15 traits (no portrait yet: CardView falls back to name + badge)
  card('spy_scout',      'Лазутчик',          'humans', 'unit',    'melee',  4, 'rare',      6,  { tags: ['spy'], spy: true }),
  card('militia_a',      'Ополченец',         'humans', 'unit',    'melee',  3, 'common',    4,  { tags: ['militia'], muster: 'militia' }),
  card('militia_b',      'Ополченец',         'humans', 'unit',    'melee',  3, 'common',    4,  { tags: ['militia'], muster: 'militia' }),
  card('militia_c',      'Ополченец',         'humans', 'unit',    'melee',  3, 'common',    4,  { tags: ['militia'], muster: 'militia' }),
  card('berserker',      'Берсерк',           'humans', 'unit',    'melee',  3, 'rare',      7,  { tags: ['knight'], berserker: true }),
  card('oath_brother_a', 'Брат по клятве',    'humans', 'unit',    'ranged', 3, 'common',    4,  { tags: ['archer'], bond: true }),
  card('oath_brother_b', 'Брат по клятве',    'humans', 'unit',    'ranged', 3, 'common',    4,  { tags: ['archer'], bond: true }),
  // Leader
  card('king_raven',     'Король Рэйвен',     'humans', 'hero',    'melee',  5, 'legendary', 0,  { art: 'king_raven',     tags: ['leader', 'knight'], cost: 0, deployEffect: 'shield_self', hasOrder: true, orderEffect: 'boost_knights', orderParam: 1, chargeMax: 2 }),
];

// ── Monsters ─────────────────────────────────────────────────────────────────

const MONSTER_CARDS = [
  // Undead
  card('vampire',        'Вампир',            'monsters', 'unit',    'melee',  4, 'rare',      6,  { art: 'vampire',        tags: ['undead'], deployEffect: 'bleed', deployParam: 2 }),
  card('bloodsucker',    'Кровопийца',        'monsters', 'unit',    'melee',  3, 'common',    5,  { art: 'bloodsucker',    tags: ['undead'], deployEffect: 'bleed_check_self' }),
  card('necromancer',    'Некромант',         'monsters', 'unit',    'melee',  3, 'rare',      7,  { art: 'necromancer',    tags: ['undead'], deployEffect: 'copy_enemy_graveyard' }),
  card('lich',           'Лич',               'monsters', 'hero',    'melee',  6, 'legendary', 10, { art: 'lich',           tags: ['undead'], hasOrder: true, orderEffect: 'debuff_living', orderParam: 1 }),
  // Beasts
  card('wolf',           'Волк',              'monsters', 'unit',    'melee',  2, 'common',    3,  { art: 'wolf',           tags: ['beast', 'wolf'], deployEffect: 'wolf_pack' }),
  card('serpent',        'Серпент',           'monsters', 'unit',    'ranged', 3, 'common',    5,  { art: 'serpent',        tags: ['beast'], deployEffect: 'poison' }),
  card('werewolf',       'Оборотень',         'monsters', 'unit',    'melee',  5, 'rare',      7,  { art: 'werewolf',       tags: ['beast'], deployEffect: 'werewolf_register' }),
  card('harpy_hunter',   'Гарпия-охотница',  'monsters', 'unit',    'ranged', 4, 'rare',      5,  { art: 'harpy_hunter',   tags: ['beast'], deployEffect: 'boost_self', deployParam: 2 }),
  // Demons
  card('fire_demon',     'Демон Огня',        'monsters', 'unit',    'siege',  5, 'rare',      7,  { art: 'fire_demon',     tags: ['demon'], deployEffect: 'damage_row', deployParam: 2 }),
  card('seducer',        'Соблазнитель',      'monsters', 'unit',    'ranged', 3, 'rare',      6,  { art: 'seducer',        tags: ['demon'], deployEffect: 'take_control' }),
  card('archdemon',      'Архидемон',         'monsters', 'unit',    'siege',  6, 'epic',      8,  { art: 'archdemon',      tags: ['demon'], hasOrder: true, orderEffect: 'damage_row_choice', orderParam: 2 }),
  card('chaos_demon',    'Демон Хаоса',       'monsters', 'hero',    'siege',  9, 'legendary', 12, { art: 'chaos_demon',    tags: ['demon'], doomed: true, deployEffect: 'damage_all_rows', deployParam: 5 }),
  // Giants
  card('ice_giant',      'Ледяной Гигант',    'monsters', 'unit',    'siege',  6, 'rare',      8,  { art: 'ice_giant',      tags: ['giant'], deployEffect: 'frost_weather_bonus', deployParam: 3 }),
  card('regen_troll',    'Регенер. Тролль',   'monsters', 'hero',    'siege',  7, 'legendary', 9,  { art: 'regen_troll',    tags: ['giant'], doomed: true, deployEffect: 'resurrect_four_weak' }),
  // Specials
  card('darkness',       'Тьма',             'monsters', 'special', 'melee',  0, 'rare',      5,  { art: 'darkness',       effect: 'fog_frost_combo' }),
  card('blood_ritual',   'Кровавый Ритуал',  'monsters', 'special', 'melee',  0, 'rare',      5,  { art: 'blood_ritual',   effect: 'bleed_all_enemies' }),
  // Layer 15 traits (no portrait yet)
  card('doppelganger',   'Двуликий',          'monsters', 'unit',  'melee',  4, 'rare',      6,  { tags: ['demon', 'spy'], spy: true }),
  card('dire_wolf_a',    'Лютый волк',        'monsters', 'unit',  'melee',  3, 'common',    4,  { tags: ['beast'], muster: 'dire_wolf' }),
  card('dire_wolf_b',    'Лютый волк',        'monsters', 'unit',  'melee',  3, 'common',    4,  { tags: ['beast'], muster: 'dire_wolf' }),
  card('dire_wolf_c',    'Лютый волк',        'monsters', 'unit',  'melee',  3, 'common',    4,  { tags: ['beast'], muster: 'dire_wolf' }),
  card('forest_shade',   'Лесная тень',       'monsters', 'unit',  'ranged', 5, 'rare',      6,  { tags: ['undead'], ambush: true }),
  card('blood_count',    'Кровавый граф',     'monsters', 'unit',  'melee',  4, 'epic',      9,  { tags: ['undead'], vampirism: true, deployEffect: 'damage', deployParam: 3 }),
  card('gargoyle_a',     'Горгулья',          'monsters', 'unit',  'siege',  4, 'common',    4,  { tags: ['demon'], bond: true }),
  card('gargoyle_b',     'Горгулья',          'monsters', 'unit',  'siege',  4, 'common',    4,  { tags: ['demon'], bond: true }),
  // Leader
  card('fang_darkness',  'Тьма Клыков',      'monsters', 'hero',    'melee',  6, 'legendary', 0,  { art: 'fang_darkness',  tags: ['leader'], cost: 0, deployEffect: 'shield_self', hasOrder: true, orderEffect: 'boost_all_faction', orderParam: 1, chargeMax: 2 }),
];

export const SHOP_CARDS = [...HUMAN_CARDS, ...MONSTER_CARDS];
