import { describe, it, expect } from 'vitest';
import { MENU_ITEMS, menuButtonY, MENU_CENTER_X } from './menuLayout.js';
import { SCREEN } from './layout.js';

describe('menuLayout', () => {
  it('has five items with Бой and Сюжет first', () => {
    expect(MENU_ITEMS.length).toBe(5);
    expect(MENU_ITEMS[0]).toBe('Бой');
    expect(MENU_ITEMS[1]).toBe('Сюжет');
  });

  it('stacks buttons from top to bottom', () => {
    expect(menuButtonY(0)).toBeLessThan(menuButtonY(3));
  });

  it('keeps all buttons on screen', () => {
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      expect(menuButtonY(i)).toBeGreaterThan(0);
      expect(menuButtonY(i)).toBeLessThan(SCREEN.height);
    }
  });

  it('centres buttons horizontally', () => {
    expect(MENU_CENTER_X).toBe(SCREEN.width / 2);
  });

  it('throws on an unknown index', () => {
    expect(() => menuButtonY(9)).toThrow('Unknown menu index: 9');
  });
});
