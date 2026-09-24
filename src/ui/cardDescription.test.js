import { describe, it, expect, afterEach } from 'vitest';
import { cardDescription, SPECIAL_DESCRIPTIONS } from './cardDescription.js';
import { setLang } from '../i18n/index.js';

describe('cardDescription i18n', () => {
  afterEach(() => setLang('ru'));

  it('keeps the Russian wording and switches to English', () => {
    const def = { deployEffect: 'damage', deployParam: 3, armor: 2 };
    expect(cardDescription(def)).toBe('При розыгрыше: наносит 3 урона выбранному врагу   •   Броня 2: блокирует первые 2 урона');
    setLang('en');
    expect(cardDescription(def)).toBe('On deploy: deals 3 damage to a chosen enemy   •   Armor 2: blocks the first 2 damage');
    expect(SPECIAL_DESCRIPTIONS.clear).toBe('clears all weather');
  });
});
