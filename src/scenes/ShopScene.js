import Phaser from 'phaser';
import { SHOP_CARDS } from '../data/shopCards.js';
import { createCardView } from '../ui/CardView.js';
import { getProfile, persist } from '../economy/session.js';
import { canBuy, buyCard } from '../economy/profile.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { preloadCardAssets } from '../ui/preloadAssets.js';

const COLS = 4;
const ROWS = 2;
const PAGE_SIZE = COLS * ROWS;
const CARD_SCALE = 1.4;
const STEP_X = 158;
const STEP_Y = 226;
const START_X = SCREEN.width / 2 - ((COLS - 1) / 2) * STEP_X;
const START_Y = 180;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
    this.page = 0;
  }

  preload() {
    preloadCardAssets(this);
  }

  create() {
    drawBackground(this);
    this.root = this.add.container(0, 0);
    this.page = 0;
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
    const totalPages = Math.ceil(SHOP_CARDS.length / PAGE_SIZE);
    const pageCards = SHOP_CARDS.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);

    // Header
    this.text(20, 16, `Золото: ${p.gold}`, '#ffd479', '22px');
    this.text(SCREEN.width / 2 - 60, 16, 'Магазин', '#d8c9a8', '22px');
    const back = this.text(SCREEN.width - 120, 16, '‹ В меню', '#9fbfff', '20px')
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));

    // Cards
    pageCards.forEach((def, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = START_X + col * STEP_X;
      const y = START_Y + row * STEP_Y;

      const cv = createCardView(this, def);
      cv.setScale(CARD_SCALE);
      cv.setPosition(x, y);
      this.root.add(cv);

      const labelY = y + Math.round(70 * CARD_SCALE);
      const owned = Boolean(p.collection[def.id]);
      if (owned) {
        this.text(x - 18, labelY, 'есть', '#9a8a6a', '15px');
      } else if (canBuy(p, def.id)) {
        const buy = this.text(x - 38, labelY, `Купить ${def.cost}`, '#9fe3d0', '15px')
          .setInteractive({ useHandCursor: true });
        buy.on('pointerdown', () => {
          buyCard(p, def.id);
          persist();
          this.render();
        });
      } else {
        this.text(x - 42, labelY, `${def.cost} — мало`, '#ff9d9d', '14px');
      }
    });

    // Pagination
    const navY = SCREEN.height - 36;
    this.text(SCREEN.width / 2 - 60, navY, `${this.page + 1} / ${totalPages}`, '#7a6a4a', '18px');

    if (this.page > 0) {
      const prev = this.text(SCREEN.width / 2 - 140, navY, '◀ Пред', '#9fbfff', '18px')
        .setInteractive({ useHandCursor: true });
      prev.on('pointerdown', () => { this.page--; this.render(); });
    }

    if (this.page < totalPages - 1) {
      const next = this.text(SCREEN.width / 2 + 60, navY, 'След ▶', '#9fbfff', '18px')
        .setInteractive({ useHandCursor: true });
      next.on('pointerdown', () => { this.page++; this.render(); });
    }
  }
}
