export const SCREEN = { width: 1280, height: 720 };
export const ROW_NAMES = ['melee', 'ranged', 'siege'];
export const CARD_W = 84;
export const CARD_H = 116;
export const ROW_HEIGHT = 76;
export const HAND_Y = 648;
export const BOARD_CENTER_Y = 300;

const ROW_INDEX = { melee: 0, ranged: 1, siege: 2 };

export function rowY(side, rowName) {
  const i = ROW_INDEX[rowName];
  if (i === undefined) {
    throw new Error(`Unknown row: ${rowName}`);
  }
  const offset = ROW_HEIGHT * (i + 1);
  return side === 'player' ? BOARD_CENTER_Y + offset : BOARD_CENTER_Y - offset;
}

export function handCardX(index, count, gap = 8) {
  const totalWidth = count * CARD_W + (count - 1) * gap;
  const startX = (SCREEN.width - totalWidth) / 2 + CARD_W / 2;
  return startX + index * (CARD_W + gap);
}
