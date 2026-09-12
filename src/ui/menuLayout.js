import { SCREEN } from './layout.js';

export const MENU_ITEMS = ['Бой', 'Колода', 'Магазин', 'Рейтинг'];
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
