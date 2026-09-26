import Phaser from 'phaser';
import { createCardView } from '../ui/CardView.js';
import { getProfile, persist } from '../economy/session.js';
import { openPack, canOpenPack, PACK_COST } from '../economy/packs.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { sceneFadeIn } from '../ui/transitions.js';
import { preloadCardAssets } from '../ui/preloadAssets.js';
import { rarityColor } from '../ui/rarity.js';
import { ensureSparkTexture } from '../ui/effectAnimations.js';
import { attachCardTooltip } from '../ui/tooltip.js';
import { onAchievements } from '../ui/toast.js';
import { sfx } from '../ui/SoundEngine.js';
import { t } from '../i18n/index.js';

const SLOT_Y = 360;
const SLOT_STEP = 210;
const RARITY_SFX = { common: sfx.flip, rare: sfx.rare, epic: sfx.epic, legendary: sfx.legendary };

export class PackScene extends Phaser.Scene {
  constructor() {
    super('PackScene');
  }

  preload() {
    preloadCardAssets(this);
  }

  create() {
    drawBackground(this);
    sceneFadeIn(this);
    ensureSparkTexture(this);
    this.root = this.add.container(0, 0);
    this.cards = null;     // [{ def, isNew }] of the pack being revealed
    this.revealed = 0;
    this.render();
  }

  text(x, y, str, color, size = '16px') {
    const o = this.add.text(x, y, str, { fontSize: size, color });
    this.root.add(o);
    return o;
  }

  button(x, y, str, color, size, onClick) {
    const o = this.add.text(x, y, str, {
      fontSize: size, color, backgroundColor: '#33261a', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    o.on('pointerdown', () => { sfx.click(); onClick(); });
    this.root.add(o);
    return o;
  }

  render() {
    this.root.removeAll(true);
    const p = getProfile();
    this.text(20, 16, t('common.gold', { n: p.gold }), '#ffd479', '22px');
    this.text(SCREEN.width / 2, 30, t('pack.title'), '#d8c9a8', '26px').setOrigin(0.5);
    if (!this.cards) {
      const back = this.text(SCREEN.width - 140, 16, t('common.back'), '#e8c98a', '20px').setInteractive({ useHandCursor: true });
      back.on('pointerdown', () => this.scene.start('MenuScene'));
    }
    if (p.freePacks > 0) this.text(20, 48, t('pack.free', { n: p.freePacks }), '#9fe3d0', '16px');

    if (!this.cards) {
      this.text(SCREEN.width / 2, 140, t('pack.odds'), '#9a8a6a', '14px').setOrigin(0.5);
      this.drawClosedPack();
      const label = p.freePacks > 0 ? t('pack.openFree') : t('pack.open', { n: PACK_COST });
      if (canOpenPack(p)) this.button(SCREEN.width / 2, 560, label, '#ffd479', '24px', () => this.open());
      else this.text(SCREEN.width / 2, 560, t('pack.noGold', { n: PACK_COST }), '#ff9d9d', '20px').setOrigin(0.5);
    }
  }

  drawClosedPack() {
    const g = this.add.container(SCREEN.width / 2, SLOT_Y);
    g.add(this.add.rectangle(0, 0, 150, 210, 0x3a2a1a).setStrokeStyle(4, 0x8a6d3b));
    g.add(this.add.text(0, -20, '🐺', { fontSize: '64px' }).setOrigin(0.5));
    g.add(this.add.text(0, 60, 'BLOOD WOLF', { fontSize: '16px', color: '#ffd479' }).setOrigin(0.5));
    this.root.add(g);
    this.tweens.add({ targets: g, y: SLOT_Y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  open() {
    const p = getProfile();
    if (!canOpenPack(p) || this.cards) return;
    this.cards = openPack(p);
    persist();
    this.revealed = 0;
    this.render();
    this.backs = this.cards.map((_, i) => {
      const back = createCardView(this, { rarity: 'common' }, { faceDown: true })
        .setPosition(SCREEN.width / 2, SLOT_Y).setScale(1.4);
      this.root.add(back);
      this.tweens.add({ targets: back, x: this.slotX(i), duration: 300, delay: i * 60, ease: 'Power2.Out' });
      return back;
    });
    this.skipZone = this.add.zone(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height)
      .setInteractive().on('pointerdown', () => this.revealAll());
    this.root.add(this.skipZone);
    this.time.delayedCall(500, () => this.revealNext());
  }

  slotX(i) {
    return SCREEN.width / 2 + (i - 2) * SLOT_STEP;
  }

  revealNext() {
    if (!this.cards || this.revealed >= this.cards.length) return;
    const i = this.revealed++;
    this.flip(i, true);
    if (this.revealed < this.cards.length) this.nextTimer = this.time.delayedCall(550, () => this.revealNext());
    else this.time.delayedCall(700, () => this.finish());
  }

  revealAll() {
    if (!this.cards || this.revealed >= this.cards.length) return;
    this.nextTimer?.remove();
    while (this.revealed < this.cards.length) this.flip(this.revealed++, false);
    this.time.delayedCall(400, () => this.finish());
  }

  flip(i, animated) {
    const { def, isNew } = this.cards[i];
    const back = this.backs[i];
    const x = this.slotX(i);
    const place = () => {
      back.destroy();
      if (def.rarity !== 'common') this.glow(x, def.rarity);
      const face = createCardView(this, def).setPosition(x, SLOT_Y).setScale(animated ? 0 : 1.4, 1.4);
      this.root.add(face);
      attachCardTooltip(this, face.list[0].setInteractive(), def);
      if (animated) this.tweens.add({ targets: face, scaleX: 1.4, duration: 140, ease: 'Sine.Out' });
      const tag = isNew ? t('pack.new') : t('pack.copy');
      this.root.add(this.add.text(x, SLOT_Y + 118, tag, {
        fontSize: '15px', color: isNew ? '#9fe3d0' : '#9a8a6a',
      }).setOrigin(0.5));
      (RARITY_SFX[def.rarity] ?? sfx.flip)();
      if (def.rarity === 'legendary') this.cameras.main.shake(250, 0.006);
    };
    if (!animated) { place(); return; }
    this.tweens.add({ targets: back, scaleX: 0, duration: 140, ease: 'Sine.In', onComplete: place });
  }

  glow(x, rarity) {
    const color = rarityColor(rarity);
    const halo = this.add.rectangle(x, SLOT_Y, 160, 220, color, 0.35).setStrokeStyle(4, color);
    this.root.add(halo);
    this.tweens.add({ targets: halo, alpha: 0.12, duration: 700, yoyo: true, repeat: -1 });
    const count = rarity === 'legendary' ? 40 : rarity === 'epic' ? 24 : 10;
    const emitter = this.add.particles(x, SLOT_Y, 'spark', {
      lifespan: 900, speed: { min: 60, max: 220 }, scale: { start: 1.2, end: 0 }, tint: color, emitting: false,
    }).setDepth(50);
    emitter.explode(count);
    this.time.delayedCall(1200, () => emitter.destroy());
  }

  finish() {
    if (!this.cards) return;
    this.skipZone?.destroy();
    const p = getProfile();
    onAchievements(this, p);
    persist();
    const again = canOpenPack(p);
    this.button(SCREEN.width / 2 - 140, 600, again ? t('pack.again') : t('pack.noGoldShort'), again ? '#ffd479' : '#666666', '20px', () => {
      if (!canOpenPack(getProfile())) return;
      this.cards = null;
      this.open();
    });
    this.button(SCREEN.width / 2 + 140, 600, t('common.back'), '#e8c98a', '20px', () => this.scene.start('MenuScene'));
  }
}
