import Phaser from 'phaser';
import { CAMPAIGN_NODES, STORY_NODES } from '../data/story.js';
import { getLeader } from '../data/leaders.js';
import { getProfile } from '../economy/session.js';
import { isNodeUnlocked, isNodeCleared } from '../economy/profile.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { sceneFadeIn, goTo } from '../ui/transitions.js';
import { sfx } from '../ui/SoundEngine.js';
import { t } from '../i18n/index.js';

const CHAPTER_SIZE = STORY_NODES.length;
const COL_X = [SCREEN.width / 4 + 10, (SCREEN.width * 3) / 4 - 10];
const BOX_W = 590;

function nodeRules(node) {
  const lines = [];
  if (node.enemyLeaderId) lines.push(t('story.rule.leader', { name: t(`leader.${node.enemyLeaderId}`) }));
  const weather = node.rules?.permanentWeather ?? [];
  if (weather.length) lines.push(t('story.rule.weather', { rows: weather.map((r) => t(`row.${r}`)).join(', ') }));
  for (const unit of node.rules?.bossUnits ?? []) lines.push(t('story.rule.boss', { name: unit.name }));
  return lines;
}

export class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
  }

  create(data) {
    drawBackground(this);
    sceneFadeIn(this);
    this.root = this.add.container(0, 0);
    this.render();
    // Returning from a won story battle: play that node's outro
    if (data?.outroIndex !== undefined && data.outroIndex !== null) {
      const node = CAMPAIGN_NODES[data.outroIndex];
      if (node) this.showDialogue(t(`story.${node.id}.outro`), null);
    }
  }

  text(x, y, str, color, size = '16px') {
    const o = this.add.text(x, y, str, { fontSize: size, color });
    this.root.add(o);
    return o;
  }

  render() {
    this.root.removeAll(true);
    const p = getProfile();

    this.text(20, 16, t('common.gold', { n: p.gold }), '#ffd479', '22px');
    this.text(SCREEN.width / 2, 30, t('story.title'), '#d8c9a8', '22px').setOrigin(0.5);
    const back = this.text(SCREEN.width - 140, 16, t('common.back'), '#9fbfff', '20px').setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => goTo(this, 'MenuScene'));
    this.text(COL_X[0], 70, t('story.chapter1'), '#9a8a6a', '18px').setOrigin(0.5);
    this.text(COL_X[1], 70, t('story.chapter2'), '#c86a6a', '18px').setOrigin(0.5);

    CAMPAIGN_NODES.forEach((node, index) => {
      const col = index < CHAPTER_SIZE ? 0 : 1;
      const x = COL_X[col];
      const y = 140 + (index % CHAPTER_SIZE) * 116;
      const cleared = isNodeCleared(p, index);
      const unlocked = isNodeUnlocked(p, index);
      const playable = unlocked && !cleared;

      const mark = cleared ? '✓' : unlocked ? '▶' : '🔒';
      const color = cleared ? '#8fce8f' : playable ? '#ffd479' : '#666666';
      const stroke = playable ? (node.boss ? 0xff6a4a : 0xffd479) : 0x3a3a3a;
      const bg = this.add.rectangle(x, y, BOX_W, 100, node.boss ? 0x241618 : 0x1c1a22).setStrokeStyle(2, stroke);
      this.root.add(bg);

      this.text(x - BOX_W / 2 + 14, y - 40, `${mark}  ${index + 1}. ${t(`story.${node.id}.name`)}`, color, '19px');
      const reward = node.rewardCardId
        ? t('story.rewardCard', { gold: node.rewardGold })
        : t('story.reward', { gold: node.rewardGold });
      this.text(x - BOX_W / 2 + 14, y - 12, reward, '#9a8a6a', '14px');
      nodeRules(node).forEach((line, i) => this.text(x - BOX_W / 2 + 14, y + 8 + i * 16, line, '#c88a8a', '12px'));

      if (playable) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          sfx.click();
          this.showDialogue(t(`story.${node.id}.intro`), () => this.startBattle(node, index));
        });
      }
    });
  }

  startBattle(node, index) {
    goTo(this, 'BattleScene', {
      enemyDeck: node.enemyDeck,
      storyIndex: index,
      rewardGold: node.rewardGold,
      rewardCardId: node.rewardCardId ?? null,
      enemyLeaderId: node.enemyLeaderId ?? null,
      rules: node.rules ?? null,
    });
  }

  // Lines are "Speaker: text"; click advances; onDone = null just closes
  showDialogue(script, onDone) {
    const lines = script.split('\n').filter(Boolean);
    let i = 0;
    const layer = this.add.container(0, 0).setDepth(500);
    const shade = this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x000000, 0.7)
      .setInteractive();
    const panel = this.add.rectangle(SCREEN.width / 2, SCREEN.height - 160, SCREEN.width - 160, 180, 0x16121a, 0.96)
      .setStrokeStyle(2, 0x8a6d3b);
    const speaker = this.add.text(120, SCREEN.height - 236, '', { fontSize: '20px', color: '#ffd479' });
    const body = this.add.text(120, SCREEN.height - 200, '', {
      fontSize: '18px', color: '#e8dcc0', wordWrap: { width: SCREEN.width - 260 },
    });
    const hint = this.add.text(SCREEN.width - 110, SCREEN.height - 96, '', { fontSize: '16px', color: '#9fbfff' }).setOrigin(1, 0.5);
    layer.add([shade, panel, speaker, body, hint]);
    const skip = this.add.text(SCREEN.width - 110, 40, t('story.skip'), { fontSize: '16px', color: '#9a8a6a' })
      .setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    layer.add(skip);

    const finish = () => {
      layer.destroy();
      onDone?.();
    };
    const show = () => {
      const [who, ...rest] = lines[i].split(': ');
      const hasSpeaker = rest.length > 0;
      speaker.setText(hasSpeaker ? who : '');
      body.setText(hasSpeaker ? rest.join(': ') : lines[i]);
      const last = i === lines.length - 1;
      hint.setText(last ? (onDone ? t('story.fight') : '✓') : t('story.next'));
    };
    shade.on('pointerdown', () => {
      sfx.click();
      if (i >= lines.length - 1) finish();
      else { i++; show(); }
    });
    skip.on('pointerdown', finish);
    if (lines.length === 0) finish();
    else show();
  }
}
