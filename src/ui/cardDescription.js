import { t } from '../i18n/index.js';

// Card rules text. The wording lives in src/i18n (desc.*); these tables keep the per-effect API.
export const DEPLOY_DESCRIPTIONS = Object.fromEntries([
  'damage', 'heal', 'boost', 'shield', 'duplicate', 'poison', 'bleed', 'row_damage', 'take_control', 'cleanse_heal', 'knight_bonus', 'shield_self', 'boost_self', 'boost_all_faction', 'damage_row', 'damage_all_rows', 'resurrect_one', 'resurrect_four_weak', 'copy_enemy_graveyard', 'wolf_pack', 'bleed_check_self', 'werewolf_register', 'frost_weather_bonus',
].map((key) => [key, (p) => t('desc.deploy.' + key, { p })]));

export const ORDER_DESCRIPTIONS = Object.fromEntries([
  'boost_melee_row', 'boost_knights', 'damage_one', 'damage_lock', 'damage_row_choice', 'heal_ally', 'shield_ally', 'poison_two', 'debuff_living', 'boost_all_faction',
].map((key) => [key, (p) => t('desc.order.' + key, { p })]));

// Getters so each read follows the current language
export const SPECIAL_DESCRIPTIONS = Object.defineProperties({}, Object.fromEntries([
  'horn', 'weather_frost', 'weather_fog', 'weather_rain', 'clear', 'sign_damage', 'lightning', 'blessing_humans', 'order_ready', 'fog_frost_combo', 'bleed_all_enemies', 'scorch',
].map((key) => [key, { get: () => t(`desc.special.${key}`), enumerable: true }])));

const TRAITS = ['spy', 'muster', 'bond', 'berserker', 'ambush', 'vampirism'];

export function cardDescription(def) {
  const lines = [];

  // Specials
  if (def.effect && SPECIAL_DESCRIPTIONS[def.effect]) {
    lines.push(SPECIAL_DESCRIPTIONS[def.effect]);
  }

  // Deploy effect
  if (def.deployEffect && DEPLOY_DESCRIPTIONS[def.deployEffect]) {
    lines.push(t('desc.onDeploy') + DEPLOY_DESCRIPTIONS[def.deployEffect](def.deployParam));
  }

  // Order ability
  if (def.hasOrder && def.orderEffect) {
    const prefix = def.zeal ? t('desc.orderZeal') : t('desc.order');
    const charges = def.chargeMax > 0 ? t('desc.charges', { n: def.chargeMax }) : '';
    const desc = ORDER_DESCRIPTIONS[def.orderEffect]?.(def.orderParam) ?? def.orderEffect;
    lines.push(prefix + desc + charges);
  }

  // Passive traits
  for (const trait of TRAITS) {
    if (def[trait]) lines.push(t(`desc.${trait}`));
  }
  if (def.resilience) lines.push(t('desc.resilience'));
  if (def.doomed)     lines.push(t('desc.doomed'));
  if (def.armor > 0)  lines.push(t('desc.armor', { n: def.armor }));
  if (def.immune)     lines.push(t('desc.immune'));
  if (def.golden)     lines.push(t('desc.golden'));

  return lines.length > 0
    ? lines.join('   •   ')
    : t('desc.none');
}
