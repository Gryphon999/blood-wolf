import { SCREEN } from './layout.js';

export const MENU_ITEMS = ['Бой', 'Сюжет', 'Колода', 'Магазин', 'Рейтинг'];
export const BUTTON_W = 260;
export const BUTTON_H = 56;
export const MENU_CENTER_X = SCREEN.width / 2;

const FIRST_Y = 300;
const GAP = 74;

export function menuButtonY(index) {
  if (index < 0 || index >= MENU_ITEMS.length) {
    throw new Error(`Unknown menu index: ${index}`);
  }
  return FIRST_Y + index * GAP;
}

// Stable ids for MENU_ITEMS (labels come from i18n) and their target scenes
export const MENU_IDS = ['battle', 'story', 'deck', 'shop', 'rank'];
export const MENU_TARGETS = {
  battle: 'BattleScene', story: 'StoryScene', deck: 'DeckScene', shop: 'ShopScene', rank: 'RankScene',
  packs: 'PackScene', quests: 'ProgressScene', settings: 'SettingsScene',
};
// Second column on the right
export const MENU_EXTRA_IDS = ['packs', 'quests', 'settings'];
export const MENU_EXTRA_X = SCREEN.width - 190;
export const MENU_INFO_X = 190;
