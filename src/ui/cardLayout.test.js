import { describe, it, expect } from 'vitest';
import { coverCrop, fitFontSize, FACE } from './cardLayout.js';
import { CARD_H } from './layout.js';

describe('coverCrop', () => {
  it('fills the window without distortion for a wide picture', () => {
    const r = coverCrop(1080, 271, 90, 77);
    expect(r.cropW / r.cropH).toBeCloseTo(90 / 77, 5);
    expect(r.scale).toBeCloseTo(77 / 271, 5); // height is the limiting side
    expect(r.cropX).toBeGreaterThan(0);
    expect(r.cropY).toBeCloseTo(0, 5);
  });

  it('crops top/bottom of a tall picture and honours the focus', () => {
    const top = coverCrop(832, 1248, 90, 77, 0);
    const mid = coverCrop(832, 1248, 90, 77, 0.5);
    expect(top.cropY).toBe(0);
    expect(mid.cropY).toBeGreaterThan(top.cropY);
    expect(top.cropW).toBe(832);
  });

  it('places the visible part in the middle of the window', () => {
    const r = coverCrop(1000, 1000, 90, 77, 0.5);
    expect(r.offsetX).toBeCloseTo(0, 5);
    expect(r.offsetY).toBeCloseTo(0, 5);
  });
});

describe('fitFontSize', () => {
  it('shrinks until the measured width fits and stops at the minimum', () => {
    const measure = (size) => size * 10;
    expect(fitFontSize(measure, 12, 90, 6)).toBe(9);
    expect(fitFontSize(measure, 12, 10, 6)).toBe(6);
    expect(fitFontSize(measure, 8, 200, 6)).toBe(8);
  });
});

describe('FACE layout', () => {
  it('keeps every block inside the card', () => {
    expect(FACE.namePlate.y).toBeGreaterThan(-CARD_H / 2);
    expect(FACE.art.y + FACE.art.h / 2).toBeLessThan(FACE.info.y);
    expect(FACE.info.y + FACE.info.h).toBeLessThanOrEqual(CARD_H / 2);
  });
});
