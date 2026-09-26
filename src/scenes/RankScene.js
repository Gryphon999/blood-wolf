import Phaser from 'phaser';
import { getProfile } from '../economy/session.js';
import { tierOf, nextTier, RANK_TIERS, WIN_POINTS, LOSS_POINTS } from '../economy/rank.js';
import { fetchLeaderboard } from '../sdk/yandex.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { sceneFadeIn } from '../ui/transitions.js';
import { t } from '../i18n/index.js';

export class RankScene extends Phaser.Scene {
  constructor() {
    super('RankScene');
  }

  create() {
    drawBackground(this);
    sceneFadeIn(this);
    const p = getProfile();
    const points = p.rank?.points ?? 0;
    const tier = tierOf(points);
    const next = nextTier(points);
    const cx = SCREEN.width / 2;

    const back = this.add.text(SCREEN.width - 140, 16, t('common.back'), { fontSize: '20px', color: '#e8c98a' })
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));

    this.add.text(cx, 50, t('rank.title'), { fontSize: '30px', color: '#d8c9a8' }).setOrigin(0.5);
    this.add.text(cx, 120, `${tier.icon} ${t(`rank.${tier.id}`)}`, { fontSize: '40px', color: '#ffd479' }).setOrigin(0.5);
    this.add.text(cx, 168, t('rank.points', { n: points, best: p.rank?.best ?? 0 }), { fontSize: '18px', color: '#c8b88a' }).setOrigin(0.5);
    if (next) {
      const span = next.min - tier.min;
      this.add.rectangle(cx, 200, 400, 12, 0x33261a);
      this.add.rectangle(cx - 200, 200, 400 * ((points - tier.min) / span), 12, 0xffd479).setOrigin(0, 0.5);
      this.add.text(cx, 222, t('rank.next', { icon: next.icon, name: t(`rank.${next.id}`), n: next.min - points }), { fontSize: '14px', color: '#9a8a6a' }).setOrigin(0.5);
    }
    this.add.text(cx, 252, t('rank.rules', { easy: WIN_POINTS.easy, normal: WIN_POINTS.normal, hard: WIN_POINTS.hard, loss: LOSS_POINTS }), {
      fontSize: '13px', color: '#6a5a40', align: 'center',
    }).setOrigin(0.5);
    this.add.text(cx, 276, RANK_TIERS.map((r) => `${r.icon} ${r.min}`).join('   '), { fontSize: '13px', color: '#6a5a40' }).setOrigin(0.5);

    this.add.text(cx, 320, t('rank.board'), { fontSize: '22px', color: '#d8c9a8' }).setOrigin(0.5);
    const status = this.add.text(cx, 360, t('rank.loading'), { fontSize: '16px', color: '#9a8a6a' }).setOrigin(0.5);
    fetchLeaderboard().then((entries) => {
      if (!this.scene.isActive()) return;
      if (!entries) {
        status.setText(t('rank.offline', { n: points }));
        return;
      }
      status.destroy();
      entries.slice(0, 12).forEach((e, i) => {
        this.add.text(cx - 220, 360 + i * 26, `${e.rank}.`, { fontSize: '16px', color: e.isMe ? '#ffd479' : '#9a8a6a' });
        this.add.text(cx - 170, 360 + i * 26, e.name, { fontSize: '16px', color: e.isMe ? '#ffd479' : '#d8c9a8' });
        this.add.text(cx + 170, 360 + i * 26, `${tierOf(e.score).icon} ${e.score}`, { fontSize: '16px', color: '#c8b88a' });
      });
    });
  }
}
