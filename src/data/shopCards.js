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
  chargeMax: opts.chargeMax ?? (opts.hasOrder ? 1 : 0),
  zeal: opts.zeal ?? false,
  armor: opts.armor ?? 0,
  resilience: opts.resilience ?? false,
  doomed: opts.doomed ?? false,
  immune: opts.immune ?? false,
});

// ── Humans ───────────────────────────────────────────────────────────────────

const HUMAN_CARDS = [
  // Knights
  card('shield_knight',  'Рыцарь Щита',      'humans', 'unit',    'melee',  5, 'rare',      7,  { tags: ['knight'], deployEffect: 'knight_bonus', armor: 2 }),
  card('squire',         'Оруженосец',        'humans', 'unit',    'melee',  3, 'common',    5,  { tags: ['knight'], deployEffect: 'boost_neighbor', deployParam: 2 }),
  card('banner',         'Знаменосец',        'humans', 'unit',    'melee',  2, 'rare',      6,  { tags: ['knight'], hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1 }),
  card('paladin',        'Паладин',           'humans', 'hero',    'melee',  5, 'epic',      10, { tags: ['knight'], resilience: true, hasOrder: true, orderEffect: 'boost_knights', orderParam: 2 }),
  // Archers
  card('poison_arrow',   'Отравл. стрела',    'humans', 'unit',    'ranged', 3, 'rare',      5,  { tags: ['archer'], deployEffect: 'poison_one' }),
  card('crossbow',       'Арбалетчик',        'humans', 'unit',    'ranged', 4, 'rare',      6,  { tags: ['archer'], deployEffect: 'damage_one', deployParam: 3 }),
  card('sniper',         'Снайпер',           'humans', 'unit',    'ranged', 4, 'rare',      7,  { tags: ['archer'], hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 }),
  card('eagle_eye',      'Орлиный Глаз',      'humans', 'hero',    'ranged', 5, 'epic',      10, { tags: ['archer'], zeal: true, hasOrder: true, orderEffect: 'poison_two' }),
  // Medics
  card('field_medic',    'Боевой Медик',      'humans', 'unit',    'melee',  4, 'rare',      6,  { tags: ['medic'], zeal: true, hasOrder: true, orderEffect: 'heal_ally', orderParam: 2 }),
  card('priest',         'Священник',         'humans', 'unit',    'melee',  3, 'common',    5,  { tags: ['medic'], deployEffect: 'cleanse_ally' }),
  card('alchemist',      'Алхимик',           'humans', 'unit',    'ranged', 3, 'rare',      6,  { tags: ['medic'], hasOrder: true, orderEffect: 'shield_ally' }),
  card('order_healer',   'Лекарь Ордена',     'humans', 'hero',    'melee',  4, 'legendary', 11, { tags: ['medic'], resilience: true, deployEffect: 'boost_all_faction', deployParam: 1 }),
  // Siege
  card('ballista',       'Огненная Баллиста', 'humans', 'unit',    'siege',  5, 'rare',      7,  { tags: ['siege', 'machine'], hasOrder: true, orderEffect: 'damage_lock', orderParam: 3 }),
  card('engineer',       'Инженер',           'humans', 'unit',    'siege',  4, 'rare',      8,  { tags: ['siege'], deployEffect: 'boost_machine', deployParam: 3 }),
  // Specials
  card('lightning',      'Небесный Огонь',    'humans', 'special', 'ranged', 0, 'rare',      5,  { effect: 'lightning_ranged' }),
  card('blessing',       'Благословение',     'humans', 'special', 'melee',  0, 'rare',      5,  { effect: 'blessing_humans' }),
  card('battle_order',   'Боевой Приказ',     'humans', 'special', 'melee',  0, 'common',    4,  { effect: 'order_ready' }),
  // Leader
  card('king_raven',     'Король Рэйвен',     'humans', 'hero',    'melee',  5, 'legendary', 0,  { tags: ['leader', 'knight'], cost: 0, deployEffect: 'shield_self', hasOrder: true, orderEffect: 'boost_knights', orderParam: 1, chargeMax: 2 }),
];

// ── Monsters ─────────────────────────────────────────────────────────────────

const MONSTER_CARDS = [
  // Undead
  card('vampire',        'Вампир',            'monsters', 'unit',    'melee',  4, 'rare',      6,  { tags: ['undead'], deployEffect: 'bleed_two' }),
  card('bloodsucker',    'Кровопийца',        'monsters', 'unit',    'melee',  3, 'common',    5,  { tags: ['undead'], deployEffect: 'bleed_check_self' }),
  card('necromancer',    'Некромант',         'monsters', 'unit',    'melee',  3, 'rare',      7,  { tags: ['undead'], deployEffect: 'copy_enemy_graveyard' }),
  card('lich',           'Лич',               'monsters', 'hero',    'melee',  6, 'legendary', 10, { tags: ['undead'], resilience: true, hasOrder: true, orderEffect: 'debuff_living', orderParam: 2 }),
  // Beasts
  card('wolf',           'Волк',              'monsters', 'unit',    'melee',  2, 'common',    3,  { tags: ['beast', 'wolf'], deployEffect: 'wolf_pack' }),
  card('serpent',        'Серпент',           'monsters', 'unit',    'ranged', 3, 'common',    5,  { tags: ['beast'], deployEffect: 'poison_one' }),
  card('werewolf',       'Оборотень',         'monsters', 'unit',    'melee',  5, 'rare',      7,  { tags: ['beast'], deployEffect: 'werewolf_register' }),
  card('harpy_hunter',   'Гарпия-охотница',  'monsters', 'unit',    'ranged', 4, 'rare',      5,  { tags: ['beast'], deployEffect: 'boost_self', deployParam: 2 }),
  // Demons
  card('fire_demon',     'Демон Огня',        'monsters', 'unit',    'siege',  5, 'rare',      7,  { tags: ['demon'], deployEffect: 'damage_row', deployParam: 2 }),
  card('seducer',        'Соблазнитель',      'monsters', 'unit',    'ranged', 3, 'rare',      6,  { tags: ['demon'], deployEffect: 'control_weakest' }),
  card('archdemon',      'Архидемон',         'monsters', 'unit',    'siege',  6, 'epic',      8,  { tags: ['demon'], hasOrder: true, orderEffect: 'damage_row_choice', orderParam: 3 }),
  card('chaos_demon',    'Демон Хаоса',       'monsters', 'hero',    'siege',  9, 'legendary', 12, { tags: ['demon'], doomed: true, deployEffect: 'damage_all_rows', deployParam: 5 }),
  // Giants
  card('ice_giant',      'Ледяной Гигант',    'monsters', 'unit',    'siege',  6, 'rare',      8,  { tags: ['giant'], deployEffect: 'frost_weather_bonus', deployParam: 3 }),
  card('regen_troll',    'Регенер. Тролль',   'monsters', 'hero',    'siege',  7, 'legendary', 9,  { tags: ['giant'], doomed: true, deployEffect: 'resurrect_four_weak' }),
  // Specials
  card('darkness',       'Тьма',             'monsters', 'special', 'melee',  0, 'rare',      5,  { effect: 'fog_frost_combo' }),
  card('blood_ritual',   'Кровавый Ритуал',  'monsters', 'special', 'melee',  0, 'rare',      5,  { effect: 'bleed_all_enemies' }),
  // Leader
  card('fang_darkness',  'Тьма Клыков',      'monsters', 'hero',    'melee',  6, 'legendary', 0,  { tags: ['leader'], cost: 0, deployEffect: 'shield_self', hasOrder: true, orderEffect: 'boost_all_faction', orderParam: 1, chargeMax: 2 }),
];

export const SHOP_CARDS = [...HUMAN_CARDS, ...MONSTER_CARDS];
