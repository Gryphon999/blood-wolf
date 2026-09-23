import Phaser from 'phaser';
import { createMatch, playCard, pass, healUnit, useOrder, startTurn } from '../engine/GwentMatch.js';
import { chooseMove } from '../engine/ai/OpponentAI.js';
import { rowPower } from '../engine/Board.js';
import { createCardView } from '../ui/CardView.js';
import { SCREEN, ROW_NAMES, rowY, handCardX, HAND_Y, CARD_W, BOARD_CENTER_Y } from '../ui/layout.js';
import { AI_DECK } from '../data/starterDecks.js';
import { getProfile, persist } from '../economy/session.js';
import { buildDeckCards, addGold, clearNode, grantCard, grantChestReward } from '../economy/profile.js';
import { showChest, showInterstitial, recordWin } from '../sdk/yandex.js';
import { SHOP_CARDS } from '../data/shopCards.js';
import { getCard } from '../data/cardCatalog.js';
import { drawBackground } from '../ui/background.js';
import { preloadBattleAssets } from '../ui/preloadAssets.js';
import { sfx } from '../ui/SoundEngine.js';
import { floatText } from '../ui/FloatingText.js';

const ROW_TINT = { melee: 0x261a1a, ranged: 0x1a2620, siege: 0x1a1f2a };
const WEATHER_OVERLAY = { melee: 0x4488ee, ranged: 0x88aacc, siege: 0x224488 };
const WEATHER_LABEL   = { melee: '❄', ranged: '🌫', siege: '🌧' };
const ROW_SFX = { melee: sfx.cardMelee, ranged: sfx.cardRanged, siege: sfx.cardSiege };
const NO_TARGET_EFFECTS = ['weather_frost', 'weather_fog', 'weather_rain', 'clear', 'scorch',
  'lightning_ranged', 'blessing_humans', 'order_ready', 'fog_frost_combo', 'bleed_all_enemies'];
// Order effects that require the player to pick a target card
const ORDER_NEEDS_TARGET = new Set(['damage_one', 'damage_lock', 'heal_ally', 'shield_ally']);

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

    this.storyIndex   = data?.storyIndex ?? null;
    this.rewardGold   = data?.rewardGold ?? 0;
    this.rewardCardId = data?.rewardCardId ?? null;
    this.returnScene  = this.storyIndex !== null ? 'StoryScene' : 'MenuScene';
    const enemyDeck   = data?.enemyDeck ?? AI_DECK;

    this.match = createMatch(buildDeckCards(getProfile()), enemyDeck, 10);

    this.selectedIndex = null;
    this.rewardGranted = false;
    this.reward        = 0;
    this.rewardCardName = null;
    this.awaitingHeal  = false;
    this.pendingOrder  = null; // { row, cardIdx } while waiting for Order target click
    this.pendingFloats = [];   // { card, diff } to spawn after next render
    this._lastCurrent  = -1;  // tracks when to call startTurn

    this.root      = this.add.container(0, 0);
    this.animLayer = this.add.container(0, 0); // sits above root, never cleared by render

    this.render();
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  addText(x, y, text, color, size = '16px') {
    const t = this.add.text(x, y, text, { fontSize: size, color });
    this.root.add(t);
    return t;
  }

  /** Capture current power for every card on both boards. */
  snapshotPowers() {
    const snap = new Map();
    for (const player of this.match.players) {
      for (const row of ROW_NAMES) {
        for (const card of player.board[row]) {
          snap.set(card, card.power);
        }
      }
    }
    return snap;
  }

  /** Return list of { card, diff } where power changed since snapshot. */
  computeDiffs(before) {
    const diffs = [];
    for (const [card, prev] of before.entries()) {
      const diff = card.power - prev;
      if (diff !== 0) diffs.push({ card, diff });
    }
    return diffs;
  }

  /** Spawn floating numbers at board-card positions and clear queue. */
  flushFloats() {
    for (const { card, diff } of this.pendingFloats) {
      outer: for (let pi = 0; pi < 2; pi++) {
        for (const row of ROW_NAMES) {
          const idx = this.match.players[pi].board[row].indexOf(card);
          if (idx !== -1) {
            const side = pi === 0 ? 'player' : 'opponent';
            const x = 220 + idx * (CARD_W * 0.6 + 6);
            const y = rowY(side, row);
            floatText(this, x, y, diff > 0 ? `+${diff}` : `${diff}`, diff > 0 ? '#7fff7f' : '#ff9f9f');
            break outer;
          }
        }
      }
    }
    this.pendingFloats = [];
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    const m = this.match;

    // Call startTurn exactly once each time the active player changes
    if (m.winner === null && this._lastCurrent !== m.current) {
      startTurn(m);
      this._lastCurrent = m.current;
    }

    this.root.removeAll(true);
    const [player, opp] = m.players;

    // ── Grant reward on first render after match ends
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
        profile.wins = (profile.wins ?? 0) + 1;
        recordWin(profile);
        persist();
        sfx.roundWin();
      } else if (m.winner !== 'draw') {
        sfx.roundLose();
      }
    }

    // ── Header
    this.addText(20, 14, `Соперник — карт: ${opp.hand.length}   раунды: ${pips(opp.roundsWon)}`, '#d8c9a8');
    const status = m.winner !== null ? '' : m.current === 0 ? 'Твой ход' : 'Ход ИИ…';
    this.addText(SCREEN.width / 2 - 40, 14, status, '#ffffff');
    this.addText(SCREEN.width - 110, 14, '‹ Назад', '#9fbfff')
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => showInterstitial(() => this.scene.start(this.returnScene)));

    // ── Board rows
    for (const rowName of ROW_NAMES) {
      this.renderRow(opp, 'opponent', rowName, 1);
      this.renderRow(player, 'player', rowName, 0);
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
    this.addText(SCREEN.width - 160, HAND_Y + 48, '[ ПАС ]', '#ffb3b3', '20px')
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onPass());

    // ── Order-targeting hint bar
    if (this.pendingOrder) {
      this.addText(SCREEN.width / 2 - 110, HAND_Y - 28, '⚡ Выберите цель для Приказа', '#ffd479', '14px');
      this.addText(SCREEN.width / 2 + 120, HAND_Y - 28, '[отмена]', '#ff9f9f', '13px')
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.pendingOrder = null; this.render(); });
    }

    // ── Floating damage/heal numbers
    this.flushFloats();

    if (m.winner !== null) this.renderResult();
  }

  // ─── Row ──────────────────────────────────────────────────────────────────

  renderRow(side, sideName, rowName, playerIdx) {
    const y = rowY(sideName, rowName);
    const m = this.match;

    // Background
    const bg = this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, ROW_TINT[rowName] ?? 0x1c1a22)
      .setStrokeStyle(1, 0x4a4436);
    this.root.add(bg);

    // Weather colour overlay + icon
    if (m.weather.has(rowName)) {
      this.root.add(
        this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, WEATHER_OVERLAY[rowName], 0.24),
      );
      this.addText(170, y - 10, WEATHER_LABEL[rowName] ?? '☁', '#aaddff', '18px');
    }

    // Determine Order-targeting context
    const orderCard = this.pendingOrder
      ? m.players[0].board[this.pendingOrder.row]?.[this.pendingOrder.cardIdx]
      : null;
    const oe = orderCard?.def.orderEffect ?? '';
    const targetAlly  = oe === 'heal_ally' || oe === 'shield_ally';
    const targetEnemy = oe === 'damage_one' || oe === 'damage_lock';

    // Cards
    side.board[rowName].forEach((card, i) => {
      const isHealTarget = this.awaitingHeal && sideName === 'player'
        && card.def.type !== 'hero' && card.power < card.def.power;

      const isOrderTarget = this.pendingOrder !== null
        && ((targetEnemy && sideName === 'opponent' && card.def.type !== 'hero' && !card.immune)
         || (targetAlly  && sideName === 'player'   && card !== orderCard && card.def.type !== 'hero' && !card.immune));

      const cv = createCardView(this, card.def, { card });
      cv.setScale(0.6);
      cv.setPosition(220 + i * (CARD_W * 0.6 + 6), y);

      if (isHealTarget) {
        cv.list[0].setStrokeStyle(3, 0x00ff88).setInteractive({ useHandCursor: true });
        cv.list[0].on('pointerdown', () => this.onHealTarget(rowName, i));
      }

      if (isOrderTarget) {
        cv.list[0].setStrokeStyle(3, 0xff6600).setInteractive({ useHandCursor: true });
        cv.list[0].on('pointerdown', () => this.onOrderTarget(card));
      }

      this.root.add(cv);

      // ⚡ Order button below player cards when it's idle player turn
      if (sideName === 'player' && m.current === 0 && m.winner === null
          && !this.awaitingHeal && !this.pendingOrder && this.selectedIndex === null
          && card.def.hasOrder && !card.orderUsed && !card.locked
          && (card.def.chargeMax === 0 || card.chargesLeft > 0)) {
        const bx = 220 + i * (CARD_W * 0.6 + 6);
        const obtn = this.add.text(bx, y + 50, '⚡', {
          fontSize: '14px', color: '#ffdd44', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        obtn.on('pointerdown', () => this.onOrderButtonClick(rowName, i));
        this.root.add(obtn);
      }
    });

    // Row power
    this.addText(SCREEN.width - 300, y - 10, `[${rowPower(side.board, rowName, m.weather)}]`, '#ffd479');

    // Row click target for placing a unit/special
    if (this.selectedIndex !== null && this.isValidTarget(sideName, rowName)) {
      bg.setStrokeStyle(3, 0xffd479).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onRowClick(rowName));
    }
  }

  // ─── Hand ─────────────────────────────────────────────────────────────────

  renderHand(player) {
    player.hand.forEach((card, i) => {
      const cv = createCardView(this, card.def, { selected: this.selectedIndex === i });
      cv.setScale(0.9);
      cv.setPosition(handCardX(i, player.hand.length), HAND_Y);
      cv.list[0].setInteractive({ useHandCursor: true });
      cv.list[0].on('pointerdown', () => this.onHandClick(i));
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

  isValidTarget(sideName, rowName) {
    const card = this.match.players[0].hand[this.selectedIndex];
    if (!card) return false;
    const def = card.def;
    if (def.type === 'special') {
      if (def.effect === 'horn')        return sideName === 'player';
      if (def.effect === 'sign_damage') return sideName === 'opponent';
      return false;
    }
    return sideName === 'player' && rowName === def.row;
  }

  onHandClick(i) {
    if (this.match.current !== 0 || this.match.winner !== null || this.awaitingHeal || this.pendingOrder) return;
    const def = this.match.players[0].hand[i].def;

    // Special cards with no board target play instantly
    if (def.type === 'special' && NO_TARGET_EFFECTS.includes(def.effect)) {
      const before = this.snapshotPowers();
      playCard(this.match, i, 'melee');
      sfx.cardSpecial();
      if (def.effect.startsWith('weather_')) sfx.weather();
      if (def.effect === 'scorch') sfx.scorch();
      this.pendingFloats = this.computeDiffs(before);
      this.selectedIndex = null;
      this.afterPlayerAction();
      return;
    }

    this.selectedIndex = this.selectedIndex === i ? null : i;
    this.render();
  }

  onRowClick(rowName) {
    if (this.selectedIndex === null) return;
    const i = this.selectedIndex;
    const handCount = this.match.players[0].hand.length;
    const fromX = handCardX(i, handCount);
    const playedDef = this.match.players[0].hand[i].def;

    const before = this.snapshotPowers();
    playCard(this.match, i, rowName);

    // Sound
    if (playedDef.type === 'special') {
      sfx.cardSpecial();
      if (playedDef.effect === 'scorch') sfx.scorch();
    } else {
      (ROW_SFX[rowName] ?? sfx.cardMelee)();
    }

    // Flying card animation (clone from hand to board row center)
    const clone = createCardView(this, playedDef);
    clone.setScale(0.9);
    clone.setPosition(fromX, HAND_Y);
    this.animLayer.add(clone);
    this.tweens.add({
      targets: clone,
      x: SCREEN.width / 2, y: rowY('player', rowName),
      scaleX: 0.6, scaleY: 0.6,
      duration: 280, ease: 'Power2.Out',
      onComplete: () => this.animLayer.removeAll(true),
    });

    this.pendingFloats = this.computeDiffs(before);
    this.selectedIndex = null;

    if (playedDef.effect === 'heal' && this.findWeakenedCards().length > 0) {
      this.awaitingHeal = true;
      this.render();
      return;
    }
    this.afterPlayerAction();
  }

  // ── Order handlers ────────────────────────────────────────────────────────

  onOrderButtonClick(orderRow, cardIdx) {
    const card = this.match.players[0].board[orderRow]?.[cardIdx];
    if (!card?.def.hasOrder) return;
    if (ORDER_NEEDS_TARGET.has(card.def.orderEffect)) {
      this.pendingOrder = { row: orderRow, cardIdx };
      this.render();
    } else {
      this.resolveOrder(orderRow, cardIdx, {});
    }
  }

  onOrderTarget(targetCard) {
    if (!this.pendingOrder) return;
    const { row, cardIdx } = this.pendingOrder;
    this.pendingOrder = null;
    this.resolveOrder(row, cardIdx, { target: targetCard });
  }

  resolveOrder(orderRow, cardIdx, opts) {
    const before = this.snapshotPowers();
    try {
      useOrder(this.match, 0, orderRow, cardIdx, opts);
    } catch (e) {
      console.warn('Order failed:', e.message);
      this.render();
      return;
    }
    sfx.order();
    const diffs = this.computeDiffs(before);
    const hasDamage = diffs.some(d => d.diff < 0);
    const hasHeal   = diffs.some(d => d.diff > 0);
    if (hasDamage) sfx.damage();
    if (hasHeal)   sfx.heal();
    this.pendingFloats = diffs;
    this.afterPlayerAction();
  }

  // ── Heal targeting ────────────────────────────────────────────────────────

  findWeakenedCards() {
    const board = this.match.players[0].board;
    return ROW_NAMES.flatMap(row =>
      board[row]
        .map((card, cardIndex) => ({ row, cardIndex, card }))
        .filter(({ card }) => card.def.type !== 'hero' && card.power < card.def.power),
    );
  }

  onHealTarget(row, cardIndex) {
    healUnit(this.match, 0, row, cardIndex);
    sfx.heal();
    this.awaitingHeal = false;
    this.afterPlayerAction();
  }

  // ── Pass ──────────────────────────────────────────────────────────────────

  onPass() {
    if (this.match.current !== 0 || this.match.winner !== null || this.awaitingHeal || this.pendingOrder) return;
    sfx.pass();
    pass(this.match);
    this.selectedIndex = null;
    this.afterPlayerAction();
  }

  // ── Turn flow ─────────────────────────────────────────────────────────────

  afterPlayerAction() {
    this.render();
    this.maybeRunAi();
  }

  maybeRunAi() {
    if (this.match.winner !== null || this.match.current !== 1) return;
    setTimeout(() => {
      if (this.match.winner !== null || this.match.current !== 1) {
        this.render();
        return;
      }
      const before = this.snapshotPowers();
      const move = chooseMove(this.match, 1);
      if (move.type === 'pass') {
        pass(this.match);
        sfx.pass();
      } else {
        playCard(this.match, move.cardIndex, move.row);
        (ROW_SFX[move.row] ?? sfx.cardMelee)();
      }
      this.pendingFloats = this.computeDiffs(before);
      this.render();
      this.maybeRunAi();
    }, 600);
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

    this.root.add(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 60, '‹ В меню', { fontSize: '24px', color: '#9fbfff' })
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => showInterstitial(() => this.scene.start(this.returnScene))),
    );

    if (w === 0) {
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 100, '🎁 Сундук', { fontSize: '22px', color: '#ffd479' })
          .setOrigin(0.5).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            showChest(() => {
              grantChestReward(getProfile(), SHOP_CARDS);
              persist();
              this.root.removeAll(true);
              this.render();
            });
          }),
      );
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
