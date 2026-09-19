import Phaser from 'phaser';
import { createMatch, playCard, pass, healUnit } from '../engine/GwentMatch.js';
import { chooseMove } from '../engine/ai/OpponentAI.js';
import { rowPower } from '../engine/Board.js';
import { createCardView } from '../ui/CardView.js';
import { SCREEN, ROW_NAMES, rowY, handCardX, HAND_Y, CARD_W, BOARD_CENTER_Y } from '../ui/layout.js';
import { AI_DECK } from '../data/starterDecks.js';
import { getProfile, persist } from '../economy/session.js';
import { buildDeckCards, addGold, clearNode, grantCard } from '../economy/profile.js';
import { getCard } from '../data/cardCatalog.js';
import { drawBackground } from '../ui/background.js';
import { preloadBattleAssets } from '../ui/preloadAssets.js';

const ROW_TINT = { melee: 0x261a1a, ranged: 0x1a2620, siege: 0x1a1f2a };

const NO_TARGET_EFFECTS = ['weather_frost', 'weather_fog', 'weather_rain', 'clear'];

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  preload() {
    preloadBattleAssets(this);
  }

  create(data) {
    drawBackground(this);
    if (this.textures.exists('battle_bg')) {
      this.add.image(SCREEN.width / 2, SCREEN.height / 2, 'battle_bg')
        .setDisplaySize(SCREEN.width, SCREEN.height)
        .setAlpha(0.18);
    }
    this.storyIndex = data?.storyIndex ?? null;
    this.rewardGold = data?.rewardGold ?? 0;
    this.rewardCardId = data?.rewardCardId ?? null;
    this.returnScene = this.storyIndex !== null ? 'StoryScene' : 'MenuScene';
    const enemyDeck = data?.enemyDeck ?? AI_DECK;

    const playerDeck = buildDeckCards(getProfile());
    this.match = createMatch(playerDeck, enemyDeck, 10);
    this.selectedIndex = null;
    this.rewardGranted = false;
    this.reward = 0;
    this.rewardCardName = null;
    this.awaitingHeal = false;
    this.root = this.add.container(0, 0);
    this.render();
  }

  addText(x, y, text, color, size = '16px') {
    const t = this.add.text(x, y, text, { fontSize: size, color });
    this.root.add(t);
    return t;
  }

  render() {
    this.root.removeAll(true);
    const m = this.match;
    const [player, opp] = m.players;

    if (m.winner !== null && !this.rewardGranted) {
      this.rewardGranted = true;
      if (m.winner === 0) {
        const profile = getProfile();
        if (this.storyIndex === null) {
          addGold(profile, 50);
          this.reward = 50;
        } else {
          clearNode(profile, this.storyIndex);
          addGold(profile, this.rewardGold);
          this.reward = this.rewardGold;
          if (this.rewardCardId) {
            grantCard(profile, this.rewardCardId);
            this.rewardCardName = getCard(this.rewardCardId).name;
          }
        }
        persist();
      }
    }

    this.addText(20, 14, `Соперник — карт: ${opp.hand.length}   раунды: ${pips(opp.roundsWon)}`, '#d8c9a8');
    const status = m.winner !== null ? '' : m.current === 0 ? 'Твой ход' : 'Ход ИИ…';
    this.addText(SCREEN.width / 2 - 40, 14, status, '#ffffff');

    const menuBtn = this.addText(SCREEN.width - 110, 14, '‹ Назад', '#9fbfff').setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start(this.returnScene));

    for (const rowName of ROW_NAMES) {
      this.renderRow(opp, 'opponent', rowName);
      this.renderRow(player, 'player', rowName);
    }

    const weather = m.weather.size ? `ПОГОДА: ${[...m.weather].join(', ')}` : 'ПОГОДА: —';
    this.addText(20, BOARD_CENTER_Y - 10, weather, '#9fe3d0');
    const totalYou = ROW_NAMES.reduce((s, r) => s + rowPower(player.board, r, m.weather), 0);
    const totalAi = ROW_NAMES.reduce((s, r) => s + rowPower(opp.board, r, m.weather), 0);
    this.addText(SCREEN.width - 260, BOARD_CENTER_Y - 10, `ИИ: ${totalAi}    ТЫ: ${totalYou}`, '#ffd479');

    this.renderHand(player);

    this.addText(20, HAND_Y + 52, `Ты — раунды: ${pips(player.roundsWon)}`, '#d8c9a8');
    const passBtn = this.addText(SCREEN.width - 160, HAND_Y + 48, '[ ПАС ]', '#ffb3b3', '20px').setInteractive({ useHandCursor: true });
    passBtn.on('pointerdown', () => this.onPass());

    if (m.winner !== null) {
      this.renderResult();
    }
  }

  renderRow(side, sideName, rowName) {
    const y = rowY(sideName, rowName);
    const bg = this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, ROW_TINT[rowName] ?? 0x1c1a22).setStrokeStyle(1, 0x4a4436);
    this.root.add(bg);

    side.board[rowName].forEach((card, i) => {
      const isHealTarget = this.awaitingHeal
        && sideName === 'player'
        && card.def.type !== 'hero'
        && card.power < card.def.power;
      const cv = createCardView(this, card.def);
      cv.setScale(0.6);
      cv.setPosition(220 + i * (CARD_W * 0.6 + 6), y);
      if (isHealTarget) {
        cv.list[0].setStrokeStyle(3, 0x00ff88).setInteractive({ useHandCursor: true });
        cv.list[0].on('pointerdown', () => this.onHealTarget(rowName, i));
      }
      this.root.add(cv);
    });

    const power = rowPower(side.board, rowName, this.match.weather);
    this.addText(SCREEN.width - 300, y - 10, `[${power}]`, '#ffd479');

    if (this.selectedIndex !== null && this.isValidTarget(sideName, rowName)) {
      bg.setStrokeStyle(3, 0xffd479).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onRowClick(rowName));
    }
  }

  renderHand(player) {
    player.hand.forEach((card, i) => {
      const cv = createCardView(this, card.def, { selected: this.selectedIndex === i });
      cv.setScale(0.72);
      cv.setPosition(handCardX(i, player.hand.length), HAND_Y);
      const bg = cv.list[0];
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onHandClick(i));
      this.root.add(cv);
    });
  }

  isValidTarget(sideName, rowName) {
    const card = this.match.players[0].hand[this.selectedIndex];
    if (!card) return false;
    const def = card.def;
    if (def.type === 'special') {
      if (def.effect === 'horn') return sideName === 'player';
      if (def.effect === 'sign_damage') return sideName === 'opponent';
      return false;
    }
    return sideName === 'player' && rowName === def.row;
  }

  onHandClick(i) {
    if (this.match.current !== 0 || this.match.winner !== null || this.awaitingHeal) return;
    const def = this.match.players[0].hand[i].def;
    if (def.type === 'special' && NO_TARGET_EFFECTS.includes(def.effect)) {
      playCard(this.match, i, 'melee'); // row ignored for weather/clear
      this.selectedIndex = null;
      this.afterPlayerAction();
      return;
    }
    this.selectedIndex = this.selectedIndex === i ? null : i;
    this.render();
  }

  onRowClick(rowName) {
    if (this.selectedIndex === null) return;
    const playedDef = this.match.players[0].hand[this.selectedIndex].def;
    playCard(this.match, this.selectedIndex, rowName);
    this.selectedIndex = null;
    if (playedDef.effect === 'heal' && this.findWeakenedCards().length > 0) {
      this.awaitingHeal = true;
      this.render();
      return;
    }
    this.afterPlayerAction();
  }

  findWeakenedCards() {
    const board = this.match.players[0].board;
    const result = [];
    for (const row of ROW_NAMES) {
      board[row].forEach((card, i) => {
        if (card.def.type !== 'hero' && card.power < card.def.power) {
          result.push({ row, cardIndex: i });
        }
      });
    }
    return result;
  }

  onHealTarget(row, cardIndex) {
    healUnit(this.match, 0, row, cardIndex);
    this.awaitingHeal = false;
    this.afterPlayerAction();
  }

  onPass() {
    if (this.match.current !== 0 || this.match.winner !== null || this.awaitingHeal) return;
    pass(this.match);
    this.selectedIndex = null;
    this.afterPlayerAction();
  }

  afterPlayerAction() {
    this.render();
    this.maybeRunAi();
  }

  maybeRunAi() {
    if (this.match.winner !== null || this.match.current !== 1) return;
    // setTimeout (not Phaser's clock) so the AI turn still advances if the
    // browser tab is backgrounded, where requestAnimationFrame is paused.
    setTimeout(() => {
      if (this.match.winner !== null || this.match.current !== 1) {
        this.render();
        return;
      }
      const move = chooseMove(this.match, 1);
      if (move.type === 'pass') {
        pass(this.match);
      } else {
        playCard(this.match, move.cardIndex, move.row);
      }
      this.render();
      this.maybeRunAi();
    }, 600);
  }

  renderResult() {
    const overlay = this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x000000, 0.6);
    this.root.add(overlay);
    const w = this.match.winner;
    const text = w === 0 ? 'ПОБЕДА' : w === 1 ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
    this.root.add(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2, text, { fontSize: '48px', color: '#ffd479' }).setOrigin(0.5),
    );
    const back = this.add
      .text(SCREEN.width / 2, SCREEN.height / 2 + 60, '‹ В меню', { fontSize: '24px', color: '#9fbfff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(this.returnScene));
    this.root.add(back);

    if (this.reward > 0) {
      this.root.add(
        this.add
          .text(SCREEN.width / 2, SCREEN.height / 2 + 24, `+${this.reward} золота`, { fontSize: '26px', color: '#ffd479' })
          .setOrigin(0.5),
      );
    }
    if (this.rewardCardName) {
      this.root.add(
        this.add
          .text(SCREEN.width / 2, SCREEN.height / 2 + 54, `Новая карта: ${this.rewardCardName}`, { fontSize: '22px', color: '#9fe3d0' })
          .setOrigin(0.5),
      );
    }
  }
}

function pips(won) {
  return '●'.repeat(won) + '○'.repeat(Math.max(0, 2 - won));
}
