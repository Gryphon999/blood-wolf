import { CARD_W, CARD_H } from './layout.js';

// Card face layout in card-local units (the card is CARD_W x CARD_H, origin at its centre). CardView multiplies by a zoom
// factor, so the same layout is drawn crisp at any size instead of stretching a small bitmap.
export const FACE = {
  frame: 3,
  namePlate: { y: -CARD_H / 2 + 4, h: 18, inset: 4 },
  art: { x: 0, y: -CARD_H / 2 + 24 + 38.5, w: CARD_W - 10, h: 77 },
  info: { y: -CARD_H / 2 + 24 + 77 + 4, h: 31 },
  badge: { r: 12.5, inset: 5 },
};

/**
 * "Cover" fit: scale the picture so it fills the window and cut away the overflow, never distorting it.
 * focusY is how the leftover height is split (0 = keep the top, 0.5 = centre); portraits keep the upper body.
 * Returns the source rectangle to show, the display scale and where the image centre must be placed.
 */
export function coverCrop(texW, texH, winW, winH, focusY = 0.5, focusX = 0.5) {
  const scale = Math.max(winW / texW, winH / texH);
  const cropW = winW / scale;
  const cropH = winH / scale;
  const cropX = (texW - cropW) * focusX;
  const cropY = (texH - cropH) * focusY;
  // With a 0.5/0.5 origin the image centre sits at (texW/2, texH/2); shift so the visible part is centred in the window.
  const offsetX = (cropX + cropW / 2 - texW / 2) * scale;
  const offsetY = (cropY + cropH / 2 - texH / 2) * scale;
  return { scale, cropX, cropY, cropW, cropH, offsetX, offsetY };
}

/** Shrinks a font size until the text fits, in steps; pure so it is testable without a canvas. */
export function fitFontSize(measure, start, maxWidth, min) {
  let size = start;
  while (size > min && measure(size) > maxWidth) size -= 0.5;
  return Math.max(size, min);
}
