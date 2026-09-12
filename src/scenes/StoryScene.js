import Phaser from 'phaser';
import { STORY_NODES } from '../data/story.js';
import { getProfile } from '../economy/session.js';
import { isNodeUnlocked, isNodeCleared } from '../economy/profile.js';
import { SCREEN } from '../ui/layout.js';

export class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
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
    this.text(SCREEN.width / 2 - 90, 16, 'Сюжет — Глухие земли', '#d8c9a8', '22px');
    const back = this.text(SCREEN.width - 120, 16, '‹ В меню', '#9fbfff', '20px').setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));

    STORY_NODES.forEach((node, index) => {
      const y = 130 + index * 96;
      const cleared = isNodeCleared(p, index);
      const unlocked = isNodeUnlocked(p, index);
      const playable = unlocked && !cleared;

      const mark = cleared ? '✓' : unlocked ? '▶' : '🔒';
      const color = cleared ? '#8fce8f' : playable ? '#ffd479' : '#666666';
      const bg = this.add.rectangle(SCREEN.width / 2, y, 720, 72, 0x1c1a22).setStrokeStyle(2, playable ? 0xffd479 : 0x3a3a3a);
      this.root.add(bg);

      this.text(SCREEN.width / 2 - 340, y - 14, `${mark}  ${index + 1}. ${node.name}`, color, '20px');
      const rewardText = node.rewardCardId ? `${node.rewardGold} зол. + карта` : `${node.rewardGold} зол.`;
      this.text(SCREEN.width / 2 + 150, y - 8, `Награда: ${rewardText}`, '#9a8a6a', '15px');

      if (playable) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          this.scene.start('BattleScene', {
            enemyDeck: node.enemyDeck,
            storyIndex: index,
            rewardGold: node.rewardGold,
            rewardCardId: node.rewardCardId ?? null,
          });
        });
      }
    });
  }
}
