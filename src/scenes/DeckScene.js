import Phaser from 'phaser';
import { createCardView } from '../ui/CardView.js';
import { getProfile, persist } from '../economy/session.js';
import { canUpgrade, upgradeCard, upgradeCost, toggleDeckCard, isDeckValid } from '../economy/profile.js';
import { getCard } from '../data/cardCatalog.js';
import { SCREEN } from '../ui/layout.js';

export class DeckScene extends Phaser.Scene {
  constructor() {
    super('DeckScene');
  }

  create() {
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
    const ok = isDeckValid(p);
    this.text(SCREEN.width / 2 - 130, 16, `Колода: ${p.deck.length}${ok ? '' : ' (мин 10!)'}`, ok ? '#d8c9a8' : '#ff9d9d', '20px');
    const back = this.text(SCREEN.width - 120, 16, '‹ В меню', '#9fbfff', '20px').setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));
    this.text(20, 52, 'Клик по карте — в колоду / из колоды', '#9a8a6a', '14px');

    const ids = Object.keys(p.collection);
    const cols = 6;
    const startX = 150;
    const startY = 180;
    const stepX = 180;
    const stepY = 250;

    ids.forEach((id, idx) => {
      const def = getCard(id);
      const level = p.collection[id].level;
      const x = startX + (idx % cols) * stepX;
      const y = startY + Math.floor(idx / cols) * stepY;
      const power = def.type === 'unit' ? def.power + (level - 1) : def.power;
      const inDeck = p.deck.includes(id);

      const cv = createCardView(this, { ...def, power }, { selected: inDeck });
      cv.setScale(0.8);
      cv.setPosition(x, y);
      const bg = cv.list[0];
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        toggleDeckCard(p, id);
        persist();
        this.render();
      });
      this.root.add(cv);

      if (def.type === 'unit') {
        this.text(x - 20, y + 56, `ур.${level}`, '#9a8a6a', '14px');
        if (canUpgrade(p, id)) {
          const up = this.text(x - 30, y + 76, `↑ ${upgradeCost(level)}`, '#9fe3d0', '15px').setInteractive({ useHandCursor: true });
          up.on('pointerdown', () => {
            upgradeCard(p, id);
            persist();
            this.render();
          });
        } else if (level >= 3) {
          this.text(x - 18, y + 76, 'макс', '#666666', '14px');
        }
      }
    });
  }
}
