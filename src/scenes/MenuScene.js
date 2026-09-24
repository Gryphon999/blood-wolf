import Phaser from 'phaser';
import { createButton } from '../ui/Button.js';
import { MENU_ITEMS, menuButtonY, MENU_CENTER_X } from '../ui/menuLayout.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { showChest } from '../sdk/yandex.js';
import { getProfile, persist } from '../economy/session.js';
import { grantChestReward } from '../economy/profile.js';
import { SHOP_CARDS } from '../data/shopCards.js';
import { chestReadyIn, DIFFICULTY_MULT } from '../economy/rewards.js';
import { DIFFICULTIES } from '../engine/ai/OpponentAI.js';
import { t } from '../i18n/index.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    drawBackground(this);
    this.add.text(SCREEN.width / 2, 160, 'Blood Wolf', { fontSize: '56px', color: '#ffd479' }).setOrigin(0.5);
    this.add
      .text(SCREEN.width / 2, 214, 'мрачная карточная дуэль', { fontSize: '18px', color: '#9a8a6a' })
      .setOrigin(0.5);

    MENU_ITEMS.forEach((label, i) => {
      const target = { 'Бой': 'BattleScene', 'Сюжет': 'StoryScene', 'Колода': 'DeckScene', 'Магазин': 'ShopScene' }[label];
      const enabled = Boolean(target);
      const shown = enabled ? label : `${label} — скоро`;
      createButton(this, MENU_CENTER_X, menuButtonY(i), shown, {
        enabled,
        onClick: () => this.scene.start(target),
      });
    });

    this.renderChest();
    this.renderDifficulty();
  }

  renderChest() {
    this.chestButton?.destroy();
    const wait = chestReadyIn(getProfile());
    const label = wait > 0 ? t('chest.wait', { min: Math.ceil(wait / 60000) }) : t('chest.open');
    this.chestButton = createButton(this, MENU_CENTER_X, 670, label, {
      enabled: wait === 0 && !this.chestBusy,
      onClick: () => {
        if (this.chestBusy || chestReadyIn(getProfile()) > 0) return;
        this.chestBusy = true;
        this.renderChest();
        showChest(() => {
          const profile = getProfile();
          grantChestReward(profile, SHOP_CARDS);
          profile.lastChestAt = Date.now();
          persist();
          this.chestBusy = false;
          if (this.scene.isActive()) this.renderChest();
        });
      },
    });
    if (wait > 0) this.time.delayedCall(Math.min(wait, 30000), () => this.renderChest());
  }

  renderDifficulty() {
    this.diffRoot?.destroy();
    this.diffRoot = this.add.container(0, 0);
    const profile = getProfile();
    this.diffRoot.add(this.add.text(SCREEN.width - 380, 20, t('difficulty.label'), { fontSize: '14px', color: '#9a8a6a' }));
    DIFFICULTIES.forEach((d, i) => {
      const active = (profile.difficulty ?? 'normal') === d;
      const label = `${t(`difficulty.${d}`)} ×${DIFFICULTY_MULT[d]}`;
      const txt = this.add.text(SCREEN.width - 380 + i * 122, 42, label, {
        fontSize: '14px', color: active ? '#ffd479' : '#6a5a40',
        backgroundColor: active ? '#2b2233' : undefined, padding: { x: 4, y: 2 },
      }).setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => {
        profile.difficulty = d;
        persist();
        this.renderDifficulty();
      });
      this.diffRoot.add(txt);
    });
  }
}
