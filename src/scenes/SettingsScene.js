import Phaser from 'phaser';
import { getProfile, persist } from '../economy/session.js';
import { getSettings, updateSettings, stepVolume } from '../economy/settings.js';
import { applySettings } from '../ui/applySettings.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { sceneFadeIn, goTo } from '../ui/transitions.js';
import { sfx } from '../ui/SoundEngine.js';
import { t } from '../i18n/index.js';

const LANG_OPTIONS = [null, 'ru', 'en'];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create() {
    drawBackground(this);
    sceneFadeIn(this);
    this.root = this.add.container(0, 0);
    this.render();
  }

  set(patch) {
    const p = getProfile();
    updateSettings(p, patch);
    applySettings(this.game, p);
    persist();
    sfx.click();
    this.render();
  }

  label(y, key) {
    this.root.add(this.add.text(SCREEN.width / 2 - 360, y, t(key), { fontSize: '20px', color: '#d8c9a8' }).setOrigin(0, 0.5));
  }

  chip(x, y, text, active, onClick) {
    const o = this.add.text(x, y, text, {
      fontSize: '22px', color: active ? '#14100c' : '#e8dcc0',
      backgroundColor: active ? '#ffd479' : '#2b2b33', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    o.on('pointerdown', onClick);
    this.root.add(o);
    return o;
  }

  volumeRow(y, key, field, s) {
    this.label(y, key);
    const x = SCREEN.width / 2 + 160;
    this.chip(x - 110, y, '−', false, () => this.set({ [field]: stepVolume(s[field], -0.1) }));
    this.root.add(this.add.text(x, y, `${Math.round(s[field] * 100)}%`, { fontSize: '22px', color: '#ffd479' }).setOrigin(0.5));
    this.chip(x + 110, y, '+', false, () => this.set({ [field]: stepVolume(s[field], 0.1) }));
  }

  toggleRow(y, key, field, s) {
    this.label(y, key);
    const x = SCREEN.width / 2 + 220;
    this.chip(x - 60, y, t('settings.on'), s[field], () => this.set({ [field]: true }));
    this.chip(x + 60, y, t('settings.off'), !s[field], () => this.set({ [field]: false }));
  }

  render() {
    this.root.removeAll(true);
    const p = getProfile();
    const s = getSettings(p);
    this.root.add(this.add.text(SCREEN.width / 2, 60, t('settings.title'), { fontSize: '34px', color: '#ffd479' }).setOrigin(0.5));
    const back = this.add.text(SCREEN.width - 140, 16, t('common.back'), { fontSize: '20px', color: '#9fbfff' })
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => goTo(this, 'MenuScene'));
    this.root.add(back);

    this.volumeRow(160, 'settings.volume', 'volume', s);
    this.volumeRow(240, 'settings.music', 'music', s);
    this.volumeRow(320, 'settings.voice', 'voice', s);
    this.toggleRow(400, 'settings.speedUp', 'speedUp', s);
    this.toggleRow(480, 'settings.reduceMotion', 'reduceMotion', s);

    this.label(560, 'settings.lang');
    LANG_OPTIONS.forEach((lang, i) => {
      this.chip(SCREEN.width / 2 + 40 + i * 130, 560, t(`settings.lang.${lang ?? 'auto'}`), s.lang === lang, () => this.set({ lang }));
    });

    this.label(640, 'settings.tutorial');
    this.chip(SCREEN.width / 2 + 160, 640, t('settings.tutorial.reset'), false, () => {
      p.tutorialDone = false;
      persist();
      sfx.click();
      this.render();
    });
    if (!p.tutorialDone) {
      this.root.add(this.add.text(SCREEN.width / 2, 690, t('settings.tutorial.pending'), { fontSize: '15px', color: '#9fe3d0' }).setOrigin(0.5));
    }
  }
}
