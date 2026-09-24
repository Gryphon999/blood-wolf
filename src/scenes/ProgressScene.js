import Phaser from 'phaser';
import { getProfile, persist } from '../economy/session.js';
import { ensureDailyQuests, canClaimQuest, claimQuest } from '../economy/quests.js';
import { ACHIEVEMENTS } from '../economy/achievements.js';
import { getCard } from '../data/cardCatalog.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { sceneFadeIn } from '../ui/transitions.js';
import { onAchievements } from '../ui/toast.js';
import { sfx } from '../ui/SoundEngine.js';
import { t } from '../i18n/index.js';

// Daily quests (left) and achievements (right)
export class ProgressScene extends Phaser.Scene {
  constructor() {
    super('ProgressScene');
  }

  create() {
    drawBackground(this);
    sceneFadeIn(this);
    this.root = this.add.container(0, 0);
    this.render();
  }

  text(x, y, str, color, size = '16px') {
    const o = this.add.text(x, y, str, { fontSize: size, color });
    this.root.add(o);
    return o;
  }

  render() {
    this.root.removeAll(true);
    const p = getProfile();
    const faction = p.deck[0] ? getCard(p.deck[0]).faction : p.faction;
    const quests = ensureDailyQuests(p, faction);
    persist();

    this.text(20, 16, t('common.gold', { n: p.gold }), '#ffd479', '22px');
    const back = this.text(SCREEN.width - 140, 16, t('common.back'), '#9fbfff', '20px').setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));

    // ── Quests
    this.text(40, 70, t('quest.title'), '#d8c9a8', '24px');
    quests.forEach((q, i) => {
      const y = 170 + i * 110;
      const done = q.progress >= q.target;
      this.root.add(this.add.rectangle(290, y, 500, 92, 0x1c1a22).setStrokeStyle(2, done ? 0xffd479 : 0x3a3a3a));
      this.text(56, y - 34, t(`quest.${q.id}`, { n: q.target }), '#e8dcc0', '17px');
      const reward = q.reward.packs ? t('quest.reward.packs') : t('quest.reward.gold', { n: q.reward.gold });
      this.text(56, y - 8, `🎁 ${reward}`, '#9fe3d0', '14px');
      // progress bar
      this.root.add(this.add.rectangle(56 + 150, y + 22, 300, 10, 0x2b2b33).setOrigin(0.5));
      const w = Math.max(2, 300 * (q.progress / q.target));
      this.root.add(this.add.rectangle(56, y + 22, w, 10, done ? 0xffd479 : 0x8a6d3b).setOrigin(0, 0.5));
      this.text(370, y + 14, `${q.progress}/${q.target}`, '#9a8a6a', '14px');
      if (q.claimed) {
        this.text(440, y - 10, t('quest.done'), '#666666', '16px');
      } else if (canClaimQuest(q)) {
        const btn = this.add.text(480, y, t('quest.claim'), {
          fontSize: '18px', color: '#14100c', backgroundColor: '#ffd479', padding: { x: 10, y: 6 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          claimQuest(p, i);
          sfx.roundWin();
          onAchievements(this, p);
          persist();
          this.render();
        });
        this.root.add(btn);
      }
    });
    this.text(56, 510, t('quest.reset'), '#6a5a40', '13px');

    // ── Achievements
    const got = p.achievements ?? {};
    this.text(620, 70, `${t('ach.title')} ${Object.keys(got).length}/${ACHIEVEMENTS.length}`, '#d8c9a8', '24px');
    ACHIEVEMENTS.forEach((a, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 620 + col * 215;
      const y = 120 + row * 112;
      const unlocked = Boolean(got[a.id]);
      this.root.add(this.add.rectangle(x + 100, y + 44, 205, 100, unlocked ? 0x2b2233 : 0x16141a)
        .setStrokeStyle(2, unlocked ? 0xffd479 : 0x2a2a2a));
      this.text(x + 8, y + 4, a.icon, '#ffffff', '28px').setAlpha(unlocked ? 1 : 0.3);
      this.text(x + 50, y + 8, t(`ach.${a.id}`), unlocked ? '#ffd479' : '#777777', '14px');
      this.root.add(this.add.text(x + 8, y + 46, t(`ach.${a.id}.desc`), {
        fontSize: '12px', color: unlocked ? '#c8b88a' : '#666666', wordWrap: { width: 190 },
      }));
      this.text(x + 8, y + 78, `+${a.reward}`, unlocked ? '#9fe3d0' : '#555555', '12px');
    });
  }
}
