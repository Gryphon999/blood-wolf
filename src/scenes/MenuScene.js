import Phaser from 'phaser';
import { createButton } from '../ui/Button.js';
import { MENU_ITEMS, menuButtonY, MENU_CENTER_X } from '../ui/menuLayout.js';
import { SCREEN } from '../ui/layout.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x14100c);
    this.add.text(SCREEN.width / 2, 160, 'Blood Wolf', { fontSize: '56px', color: '#ffd479' }).setOrigin(0.5);
    this.add
      .text(SCREEN.width / 2, 214, 'мрачная карточная дуэль', { fontSize: '18px', color: '#9a8a6a' })
      .setOrigin(0.5);

    MENU_ITEMS.forEach((label, i) => {
      const target = { 'Бой': 'BattleScene', 'Колода': 'DeckScene', 'Магазин': 'ShopScene' }[label];
      const enabled = Boolean(target);
      const shown = enabled ? label : `${label} — скоро`;
      createButton(this, MENU_CENTER_X, menuButtonY(i), shown, {
        enabled,
        onClick: () => this.scene.start(target),
      });
    });
  }
}
