import Phaser from 'phaser';
import { createButton } from '../ui/Button.js';
import {
  MENU_IDS, MENU_TARGETS, MENU_EXTRA_IDS, MENU_EXTRA_X, MENU_INFO_X, menuButtonY, MENU_CENTER_X,
} from '../ui/menuLayout.js';
import { SCREEN } from '../ui/layout.js';
import { drawMenuBackground, preloadBackgrounds } from '../ui/background.js';
import { showChest } from '../sdk/yandex.js';
import { getProfile, persist } from '../economy/session.js';
import { grantChestReward } from '../economy/profile.js';
import { SHOP_CARDS } from '../data/shopCards.js';
import { chestReadyIn, DIFFICULTY_MULT } from '../economy/rewards.js';
import { tierOf } from '../economy/rank.js';
import { ensureDailyQuests, canClaimQuest } from '../economy/quests.js';
import { getCard } from '../data/cardCatalog.js';
import { DIFFICULTIES } from '../engine/ai/OpponentAI.js';
import { t } from '../i18n/index.js';
import { sceneFadeIn, goTo } from '../ui/transitions.js';
import { checkAchievements } from '../economy/achievements.js';
import { toastAchievements } from '../ui/toast.js';
import { FONT_TITLE } from '../ui/fonts.js';

const MENU_ICONS = {
  battle: 'sword', story: 'book', deck: 'deck', shop: 'coin', rank: 'crown', packs: 'packs', quests: 'scroll', settings: 'gear',
};

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create() {
    drawMenuBackground(this);
    sceneFadeIn(this);

    // Title with blood-red drop shadow
    this.add.text(SCREEN.width / 2 + 4, 164, 'Blood Wolf', {
      fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '76px', color: '#5a0a08',
    }).setOrigin(0.5);
    this.add.text(SCREEN.width / 2, 160, 'Blood Wolf', {
      fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '76px', color: '#f0cf78',
      stroke: '#2a0a02', strokeThickness: 6,
    }).setOrigin(0.5);
    this.add
      .text(SCREEN.width / 2, 222, t('menu.subtitle'), { fontFamily: FONT_TITLE, fontStyle: '600', fontSize: '22px', color: '#c9b48a', stroke: '#120a04', strokeThickness: 3 })
      .setOrigin(0.5);

    const profile = getProfile();
    const faction = profile.deck[0] ? getCard(profile.deck[0]).faction : profile.faction;
    const quests = ensureDailyQuests(profile, faction);
    const ready = quests.filter(canClaimQuest).length;

    MENU_IDS.forEach((id, i) => {
      createButton(this, MENU_CENTER_X, menuButtonY(i), t(`menu.${id}`), {
        icon: MENU_ICONS[id],
        onClick: () => goTo(this, MENU_TARGETS[id]),
      });
    });
    MENU_EXTRA_IDS.forEach((id, i) => {
      const badge = id === 'quests' && ready > 0 ? ` (${ready}!)` : id === 'packs' && profile.freePacks > 0 ? ` (${profile.freePacks})` : '';
      createButton(this, MENU_EXTRA_X, menuButtonY(i), t(`menu.${id}`) + badge, {
        icon: MENU_ICONS[id],
        onClick: () => goTo(this, MENU_TARGETS[id]),
      });
    });

    // Catch achievements met outside a battle (packs, collection, older saves)
    const unlocked = checkAchievements(profile);
    persist();
    toastAchievements(this, unlocked);
    this.renderInfo(profile);
    this.renderChest();
    this.renderDifficulty();
  }

  renderInfo(profile) {
    const points = profile.rank?.points ?? 0;
    const tier = tierOf(points);
    const x = MENU_INFO_X;
    const y = menuButtonY(0) - 20;
    this.add.rectangle(x, y + 70, 260, 170, 0x1f1610, 0.8).setStrokeStyle(1, 0x3a2e1e);
    this.add.text(x, y, t('rank.short', { icon: tier.icon, name: t(`rank.${tier.id}`), n: points }), {
      fontSize: '17px', color: '#ffd479',
    }).setOrigin(0.5);
    const s = profile.stats ?? {};
    const lines = [
      t('menu.gold', { n: profile.gold }),
      t('menu.wins', { n: profile.wins ?? 0, streak: s.winStreak ?? 0 }),
      t('menu.cards', { n: Object.keys(profile.collection).length }),
      t('menu.ach', { n: Object.keys(profile.achievements ?? {}).length }),
    ];
    lines.forEach((line, i) => this.add.text(x - 115, y + 30 + i * 26, line, { fontSize: '15px', color: '#c8b88a' }));
  }

  renderChest() {
    this.chestButton?.destroy();
    const wait = chestReadyIn(getProfile());
    const label = wait > 0 ? t('chest.wait', { min: Math.ceil(wait / 60000) }) : t('chest.open');
    this.chestButton = createButton(this, MENU_CENTER_X, 670, label, {
      icon: 'chest',
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
    this.diffRoot.add(this.add.rectangle(SCREEN.width - 205, 40, 390, 58, 0x120e0a, 0.78).setStrokeStyle(1, 0x6a4d2a));
    this.diffRoot.add(this.add.text(SCREEN.width - 392, 16, t('difficulty.label'), { fontFamily: FONT_TITLE, fontStyle: '600', fontSize: '15px', color: '#c9b48a' }));
    DIFFICULTIES.forEach((d, i) => {
      const active = (profile.difficulty ?? 'normal') === d;
      const label = `${t(`difficulty.${d}`)} ×${DIFFICULTY_MULT[d]}`;
      const txt = this.add.text(SCREEN.width - 392 + i * 128, 40, label, {
        fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '17px', color: active ? '#ffd479' : '#a08a62',
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
