import Phaser from 'phaser';
import { SHOP_CARDS } from '../data/shopCards.js';
import { createCardView } from '../ui/CardView.js';
import { getProfile, persist } from '../economy/session.js';
import { canBuy, buyCard } from '../economy/profile.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { preloadCardAssets } from '../ui/preloadAssets.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  preload() {
    preloadCardAssets(this);
  }

  create() {
    drawBackground(this);
    this.root = this.add.container(0, 0);
    this.render();
  }

  text(x, y, t, color, size = '16px') {
    const o = this.add.text(x, y, t, { fontSize: size, color });
    this.root.add(o);
    return o;
  }

  render() {
    this.root.removeAll(true);
    const p = getProfile();

    this.text(20, 16, `Золото: ${p.gold}`, '#ffd479', '22px');
    this.text(SCREEN.width / 2 - 60, 16, 'Магазин', '#d8c9a8', '22px');
    const back = this.text(SCREEN.width - 120, 16, '‹ В меню', '#9fbfff', '20px').setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));

    const cols = 5;
    const startX = 200;
    const startY = 220;
    const stepX = 200;

    SHOP_CARDS.forEach((def, idx) => {
      const x = startX + (idx % cols) * stepX;
      const y = startY;
      const cv = createCardView(this, def);
      cv.setScale(0.9);
      cv.setPosition(x, y);
      this.root.add(cv);

      const owned = Boolean(p.collection[def.id]);
      if (owned) {
        this.text(x - 22, y + 76, 'есть', '#9a8a6a', '16px');
      } else if (canBuy(p, def.id)) {
        const buy = this.text(x - 40, y + 76, `Купить ${def.cost}`, '#9fe3d0', '16px').setInteractive({ useHandCursor: true });
        buy.on('pointerdown', () => {
          buyCard(p, def.id);
          persist();
          this.render();
        });
      } else {
        this.text(x - 44, y + 76, `${def.cost} — мало`, '#ff9d9d', '15px');
      }
    });
  }
}
