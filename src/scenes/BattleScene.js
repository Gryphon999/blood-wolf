import Phaser from 'phaser';
import { createMatch, playCard, pass, useOrder, startTurn } from '../engine/GwentMatch.js';
import { drainEvents } from '../engine/events.js';
import { getValidTargets, targetKind } from '../engine/targeting.js';
import { chooseMove } from '../engine/ai/OpponentAI.js';
import { rowPower } from '../engine/Board.js';
import { createCardView } from '../ui/CardView.js';
import {
  SCREEN, ROW_NAMES, rowY, handCardX, HAND_Y, BOARD_CENTER_Y, boardCardX, BOARD_CARD_SCALE,
} from '../ui/layout.js';
import { AI_DECK } from '../data/starterDecks.js';
import { buildFactionPool } from '../data/factionPool.js';
import { getProfile, persist } from '../economy/session.js';
import { buildDeckCards, addGold, clearNode, grantCard, grantChestReward } from '../economy/profile.js';
import { showChest, showInterstitial, recordWin } from '../sdk/yandex.js';
import { SHOP_CARDS } from '../data/shopCards.js';
import { getCard } from '../data/cardCatalog.js';
import { drawBackground } from '../ui/background.js';
import { preloadBattleAssets } from '../ui/preloadAssets.js';
import { sfx } from '../ui/SoundEngine.js';
import { AnimationQueue } from '../ui/AnimationQueue.js';
import { ANIMATIONS, ensureSparkTexture } from '../ui/effectAnimations.js';

const ROW_TINT = { melee: 0x261a1a, ranged: 0x1a2620, siege: 0x1a1f2a };
const WEATHER_OVERLAY = { melee: 0x4488ee, ranged: 0x88aacc, siege: 0x224488 };
const WEATHER_LABEL   = { melee: '❄', ranged: '🌫', siege: '🌧' };
// Specials that affect the whole board: one click on the card plays them
const INSTANT_SPECIALS = new Set(['weather_frost', 'weather_fog', 'weather_rain', 'clear', 'scorch',
  'blessing_humans', 'order_ready', 'fog_frost_combo', 'bleed_all_enemies']);
const TARGET_STROKE = 0xff6600;

// Left-click only: right-click is reserved for cancelling target selection
function onLeftClick(obj, handler) {
  obj.setInteractive({ useHandCursor: true });
  obj.on('pointerdown', (pointer) => {
    if (!pointer.rightButtonDown()) handler();
  });
  return obj;
}

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
    ensureSparkTexture(this);

    this.storyIndex   = data?.storyIndex ?? null;
    this.rewardGold   = data?.rewardGold ?? 0;
    this.rewardCardId = data?.rewardCardId ?? null;
    this.returnScene  = this.storyIndex !== null ? 'StoryScene' : 'MenuScene';
    const enemyDeck   = data?.enemyDeck ?? AI_DECK;
    const playerDeck  = buildDeckCards(getProfile());
    const pools = [
      buildFactionPool(playerDeck[0]?.faction ?? 'humans'),
      this.storyIndex !== null ? enemyDeck : buildFactionPool(enemyDeck[0]?.faction ?? 'monsters'),
    ];
    this.match = createMatch(playerDeck, enemyDeck, 10, { rng: Math.random, pools });

    this.selectedIndex  = null;
    this.pendingPlay    = null;  // { handIndex, row, targets } while choosing a Deploy target
    this.pendingOrder   = null;  // { row, cardIdx, targets } while choosing an Order target
    this.busy           = false; // true while the animation queue is playing
    this.busyStartedAt  = 0;
    this.rewardGranted  = false;
    this.reward         = 0;
    this.rewardCardName = null;
    this._lastTurn      = -1;
    this.viewsByUid     = new Map();

    this.root      = this.add.container(0, 0);
    this.animLayer = this.add.container(0, 0); // above root, cleared after each action
    this.queue     = new AnimationQueue(ANIMATIONS, this);

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer) => {
      if (this.busy) {
        // Ignore the very click that started the action; later clicks speed things up
        if (this.time.now - this.busyStartedAt > 50) this.queue.speedUp();
        return;
      }
      if (pointer.rightButtonDown()) this.cancelTargeting();
    });
    this.input.keyboard?.on('keydown-ESC', () => this.cancelTargeting());

    this.render();
    this.act(() => {}); // runs startTurn for whoever moves first
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  addText(x, y, text, color, size = '16px') {
    const t = this.add.text(x, y, text, { fontSize: size, color });
    this.root.add(t);
    return t;
  }

  canAct() {
    const m = this.match;
    return m.current === 0 && m.winner === null && !this.busy && !this.pendingPlay && !this.pendingOrder;
  }

  activeTargets() {
    return this.pendingPlay?.targets ?? this.pendingOrder?.targets ?? null;
  }

  orderReady(card) {
    return card.def.hasOrder && !card.orderUsed && !card.locked
      && (card.def.chargeMax === 0 || card.chargesLeft > 0);
  }

  // ─── Turn flow ────────────────────────────────────────────────────────────

  /** Run one engine action, animate what it did, then redraw. */
  async act(action) {
    if (this.busy) return;
    this.busy = true;
    this.busyStartedAt = this.time.now;
    try {
      action();
    } catch (e) {
      console.warn('Action failed:', e);
    }
    await this.queue.play(drainEvents(this.match));
    await this.beginTurnIfNeeded();
    this.animLayer.removeAll(true);
    this.busy = false;
    this.render();
    this.maybeRunAi();
  }

  /** startTurn exactly once per turn; animate status ticks. */
  async beginTurnIfNeeded() {
    const m = this.match;
    if (m.winner !== null || this._lastTurn === m.turn) return;
    this._lastTurn = m.turn;
    startTurn(m);
    const events = drainEvents(m);
    if (events.length > 0) {
      this.animLayer.removeAll(true);
      this.render();
      await this.queue.play(events);
    }
  }

  maybeRunAi() {
    if (this.match.winner !== null || this.match.current !== 1) return;
    this.time.delayedCall(400, () => this.act(() => {
      try {
        const move = chooseMove(this.match, 1);
        if (move.type === 'pass') {
          pass(this.match);
          sfx.pass();
        } else {
          playCard(this.match, move.cardIndex, move.row, { target: move.target });
        }
      } catch (e) {
        console.warn('AI move failed, passing instead:', e);
        if (this.match.winner === null && this.match.current === 1) pass(this.match);
      }
    }));
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    const m = this.match;
    this.root.removeAll(true);
    this.viewsByUid = new Map();
    const [player, opp] = m.players;

    this.grantRewardOnce();

    // ── Header
    this.addText(20, 14, `Соперник — карт: ${opp.hand.length}   раунды: ${pips(opp.roundsWon)}`, '#d8c9a8');
    const status = m.winner !== null ? '' : m.current === 0 ? 'Твой ход' : 'Ход ИИ…';
    this.addText(SCREEN.width / 2 - 40, 14, status, '#ffffff');
    onLeftClick(this.addText(SCREEN.width - 110, 14, '‹ Назад', '#9fbfff'),
      () => { if (!this.busy) showInterstitial(() => this.scene.start(this.returnScene)); });

    // ── Board rows
    for (const rowName of ROW_NAMES) {
      this.renderRow(opp, 'opponent', rowName);
      this.renderRow(player, 'player', rowName);
    }

    // ── Weather + score
    const wLabel = m.weather.size ? `ПОГОДА: ${[...m.weather].join(', ')}` : 'ПОГОДА: —';
    this.addText(20, BOARD_CENTER_Y - 10, wLabel, '#9fe3d0');

    const totalYou = ROW_NAMES.reduce((s, r) => s + rowPower(player.board, r, m.weather), 0);
    const totalAi  = ROW_NAMES.reduce((s, r) => s + rowPower(opp.board,    r, m.weather), 0);
    const scoreCol = totalYou > totalAi ? '#7fff7f' : totalYou < totalAi ? '#ff9f9f' : '#ffd479';
    this.addText(SCREEN.width - 260, BOARD_CENTER_Y - 10, `ИИ: ${totalAi}    ТЫ: ${totalYou}`, scoreCol);

    // ── Graveyard panels (left column)
    this.renderGraveyardPane(opp.graveyard,    44,  'ИИ');
    this.renderGraveyardPane(player.graveyard, 478, 'Ты');

    // ── Hand
    this.renderHand(player);

    // ── Footer
    this.addText(20, HAND_Y + 52, `Ты — раунды: ${pips(player.roundsWon)}`, '#d8c9a8');
    onLeftClick(this.addText(SCREEN.width - 160, HAND_Y + 48, '[ ПАС ]', '#ffb3b3', '20px'),
      () => this.onPass());

    // ── Target-selection hint
    if (this.pendingPlay || this.pendingOrder) {
      this.addText(SCREEN.width / 2 - 170, BOARD_CENTER_Y + 14, '🎯 Выберите цель   (ПКМ / Esc — отмена)', '#ffd479', '15px');
      onLeftClick(this.addText(SCREEN.width / 2 + 180, BOARD_CENTER_Y + 14, '[отмена]', '#ff9f9f', '15px'),
        () => this.cancelTargeting());
    }

    if (m.winner !== null) this.renderResult();
  }

  grantRewardOnce() {
    const m = this.match;
    if (m.winner === null || this.rewardGranted) return;
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
      profile.wins = (profile.wins ?? 0) + 1;
      recordWin(profile);
      persist();
      sfx.roundWin();
    } else if (m.winner !== 'draw') {
      sfx.roundLose();
    }
  }

  // ─── Row ──────────────────────────────────────────────────────────────────

  renderRow(side, sideName, rowName) {
    const y = rowY(sideName, rowName);
    const m = this.match;
    const targets = this.activeTargets();

    const bg = this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, ROW_TINT[rowName] ?? 0x1c1a22)
      .setStrokeStyle(1, 0x4a4436);
    this.root.add(bg);

    if (m.weather.has(rowName)) {
      this.root.add(
        this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, WEATHER_OVERLAY[rowName], 0.24),
      );
      this.addText(170, y - 10, WEATHER_LABEL[rowName] ?? '☁', '#aaddff', '18px');
    }

    side.board[rowName].forEach((card, i) => {
      const cv = createCardView(this, card.def, { card });
      cv.setScale(BOARD_CARD_SCALE);
      cv.setPosition(boardCardX(i), y);
      this.viewsByUid.set(card.uid, cv);

      if (targets) {
        if (targets.includes(card)) {
          cv.list[0].setStrokeStyle(3, TARGET_STROKE);
          onLeftClick(cv.list[0], () => this.onTargetClick(card));
        } else {
          cv.setAlpha(0.45);
        }
      }
      this.root.add(cv);

      if (sideName === 'player' && this.canAct() && this.selectedIndex === null && this.orderReady(card)
          && (targetKind(card, 'order') === 'none' || getValidTargets(this.match, 0, card, 'order').length > 0)) {
        const obtn = this.add.text(boardCardX(i), y + 50, '⚡', {
          fontSize: '14px', color: '#ffdd44', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
        onLeftClick(obtn, () => this.onOrderButtonClick(rowName, i));
        this.root.add(obtn);
      }
    });

    // Ghost of the unit being placed while its Deploy target is chosen
    if (sideName === 'player' && this.pendingPlay?.row === rowName) {
      const def = m.players[0].hand[this.pendingPlay.handIndex].def;
      if (def.type !== 'special') {
        const ghost = createCardView(this, def);
        ghost.setScale(BOARD_CARD_SCALE).setAlpha(0.5).setPosition(boardCardX(side.board[rowName].length), y);
        this.root.add(ghost);
      }
    }

    this.addText(SCREEN.width - 300, y - 10, `[${rowPower(side.board, rowName, m.weather)}]`, '#ffd479');

    if (targets && sideName === 'opponent' && targets.includes(rowName)) {
      bg.setStrokeStyle(3, TARGET_STROKE);
      onLeftClick(bg, () => this.onTargetClick(rowName));
    } else if (!targets && this.selectedIndex !== null && this.isValidRow(sideName, rowName)) {
      bg.setStrokeStyle(3, 0xffd479);
      onLeftClick(bg, () => this.onRowClick(rowName));
    }
  }

  // ─── Hand ─────────────────────────────────────────────────────────────────

  renderHand(player) {
    player.hand.forEach((card, i) => {
      const selected = this.selectedIndex === i || this.pendingPlay?.handIndex === i;
      const cv = createCardView(this, card.def, { selected });
      cv.setScale(0.9);
      cv.setPosition(handCardX(i, player.hand.length), HAND_Y);
      this.viewsByUid.set(card.uid, cv);
      onLeftClick(cv.list[0], () => this.onHandClick(i));
      this.root.add(cv);
    });
  }

  // ─── Graveyard panel ──────────────────────────────────────────────────────

  renderGraveyardPane(graveyard, yBase, label) {
    this.addText(6, yBase, `${label} ⚰${graveyard.length}`, '#6a5040', '12px');
    graveyard.slice(-4).reverse().forEach((card, i) => {
      this.addText(6, yBase + 16 + i * 13, (card.def.name ?? card.def.id).slice(0, 14), '#4a3828', '10px');
    });
  }

  // ─── Input handlers ───────────────────────────────────────────────────────

  isValidRow(sideName, rowName) {
    const card = this.match.players[0].hand[this.selectedIndex];
    if (!card) return false;
    const { def } = card;
    if (def.type === 'special') {
      if (def.effect === 'horn')        return sideName === 'player';
      if (def.effect === 'sign_damage') return sideName === 'opponent';
      return false;
    }
    return sideName === 'player' && rowName === def.row;
  }

  onHandClick(i) {
    if (!this.canAct()) return;
    const card = this.match.players[0].hand[i];
    const { def } = card;

    if (def.type === 'special' && INSTANT_SPECIALS.has(def.effect)) {
      this.selectedIndex = null;
      if (def.effect.startsWith('weather_')) sfx.weather();
      if (def.effect === 'scorch') sfx.scorch();
      this.act(() => playCard(this.match, i, 'melee'));
      return;
    }
    // Targeted specials (e.g. lightning) skip row selection
    if (def.type === 'special' && targetKind(card, 'deploy') !== 'none') {
      this.beginPlay(i, 'melee');
      return;
    }
    this.selectedIndex = this.selectedIndex === i ? null : i;
    this.render();
  }

  onRowClick(rowName) {
    if (this.selectedIndex === null || this.busy) return;
    this.beginPlay(this.selectedIndex, rowName);
  }

  beginPlay(handIndex, row) {
    const card = this.match.players[0].hand[handIndex];
    this.selectedIndex = null;
    const targets = getValidTargets(this.match, 0, card, 'deploy');
    if (targetKind(card, 'deploy') === 'none' || targets.length === 0) {
      this.render(); // drop selection visuals; hand view is re-registered for the play animation
      this.act(() => playCard(this.match, handIndex, row)); // no choice needed (or it fizzles)
      return;
    }
    this.pendingPlay = { handIndex, row, targets };
    this.render();
  }

  onOrderButtonClick(row, cardIdx) {
    if (!this.canAct()) return;
    const card = this.match.players[0].board[row]?.[cardIdx];
    if (!card?.def.hasOrder) return;
    if (targetKind(card, 'order') === 'none') {
      this.act(() => {
        useOrder(this.match, 0, row, cardIdx);
        sfx.order();
      });
      return;
    }
    const targets = getValidTargets(this.match, 0, card, 'order');
    if (targets.length === 0) return;
    this.pendingOrder = { row, cardIdx, targets };
    this.render();
  }

  onTargetClick(target) {
    if (this.busy) return;
    if (this.pendingPlay) {
      const { handIndex, row } = this.pendingPlay;
      this.pendingPlay = null;
      this.selectedIndex = null;
      this.render();
      this.act(() => playCard(this.match, handIndex, row, { target }));
      return;
    }
    if (this.pendingOrder) {
      const { row, cardIdx } = this.pendingOrder;
      this.pendingOrder = null;
      this.selectedIndex = null;
      this.render();
      this.act(() => {
        useOrder(this.match, 0, row, cardIdx, { target });
        sfx.order();
      });
    }
  }

  cancelTargeting() {
    if (this.busy) return;
    if (!this.pendingPlay && !this.pendingOrder && this.selectedIndex === null) return;
    this.pendingPlay = null;
    this.pendingOrder = null;
    this.selectedIndex = null;
    this.render();
  }

  onPass() {
    if (!this.canAct()) return;
    this.selectedIndex = null;
    this.act(() => {
      pass(this.match);
      sfx.pass();
    });
  }

  // ─── Result overlay ───────────────────────────────────────────────────────

  renderResult() {
    const overlay = this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x000000, 0.6);
    this.root.add(overlay);

    const w = this.match.winner;
    const label = w === 0 ? 'ПОБЕДА' : w === 1 ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
    const col   = w === 0 ? '#ffd479' : w === 1 ? '#ff9f9f' : '#d8c9a8';

    this.root.add(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2, label, { fontSize: '48px', color: col })
        .setOrigin(0.5),
    );

    this.root.add(onLeftClick(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 60, '‹ В меню', { fontSize: '24px', color: '#9fbfff' })
        .setOrigin(0.5),
      () => showInterstitial(() => this.scene.start(this.returnScene)),
    ));

    if (w === 0) {
      this.root.add(onLeftClick(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 100, '🎁 Сундук', { fontSize: '22px', color: '#ffd479' })
          .setOrigin(0.5),
        () => {
          showChest(() => {
            grantChestReward(getProfile(), SHOP_CARDS);
            persist();
            this.render();
          });
        },
      ));
    }

    if (this.reward > 0) {
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 24, `+${this.reward} золота`, { fontSize: '26px', color: '#ffd479' })
          .setOrigin(0.5),
      );
    }
    if (this.rewardCardName) {
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 54, `Новая карта: ${this.rewardCardName}`, { fontSize: '22px', color: '#9fe3d0' })
          .setOrigin(0.5),
      );
    }
  }
}

function pips(won) {
  return '●'.repeat(won) + '○'.repeat(Math.max(0, 2 - won));
}
