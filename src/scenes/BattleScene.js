import Phaser from 'phaser';
import {
  createMatch, playCard, pass, useOrder, startTurn, mulligan, canMulligan, MULLIGAN_MAX,
} from '../engine/GwentMatch.js';
import { drainEvents } from '../engine/events.js';
import { getValidTargets, targetKind } from '../engine/targeting.js';
import { chooseMove, chooseMulligan } from '../engine/ai/OpponentAI.js';
import { t } from '../i18n/index.js';
import { useLeader, canUseLeader } from '../engine/leaders.js';
import { passiveOf } from '../engine/passives.js';
import { chosenLeader, getLeader, randomLeader } from '../data/leaders.js';
import { rowPower } from '../engine/Board.js';
import { createCardView } from '../ui/CardView.js';
import {
  SCREEN, ROW_NAMES, rowY, handCardX, HAND_Y, BOARD_CENTER_Y, boardCardX, BOARD_CARD_SCALE,
} from '../ui/layout.js';
import { AI_DECK, PLAYER_DECK } from '../data/starterDecks.js';
import { buildFactionPool } from '../data/factionPool.js';
import { getProfile, persist } from '../economy/session.js';
import { buildDeckCards, addGold, clearNode, grantCard, grantChestReward, isDeckValid } from '../economy/profile.js';
import { showChest, showInterstitial, recordWin } from '../sdk/yandex.js';
import { rewardFor } from '../economy/rewards.js';
import { newSummary, accumulate } from '../economy/matchSummary.js';
import { recordMatch } from '../economy/progress.js';
import { toastAchievements } from '../ui/toast.js';
import { cardName } from '../ui/cardText.js';
import { attachCardTooltip, attachLongPress, hideCardTooltip } from '../ui/tooltip.js';
import { tutorialStep, isInfoStep, TUTORIAL_STEPS, TUTORIAL_ANCHOR_Y } from '../ui/tutorial.js';
import { SHOP_CARDS } from '../data/shopCards.js';
import { getCard } from '../data/cardCatalog.js';
import { drawBackground } from '../ui/background.js';
import { sceneFadeIn } from '../ui/transitions.js';
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
    sceneFadeIn(this, 'battle');
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
    // An emptied or too-small deck falls back to the starter deck instead of an empty hand
    const playerDeck  = isDeckValid(getProfile()) ? buildDeckCards(getProfile()) : PLAYER_DECK;
    const pools = [
      buildFactionPool(playerDeck[0]?.faction ?? 'humans'),
      this.storyIndex !== null ? enemyDeck : buildFactionPool(enemyDeck[0]?.faction ?? 'monsters'),
    ];
    const playerFaction = playerDeck[0]?.faction ?? 'humans';
    const enemyFaction = enemyDeck[0]?.faction ?? 'monsters';
    const leaders = [
      chosenLeader(getProfile(), playerFaction),
      data?.enemyLeaderId !== undefined ? getLeader(data.enemyLeaderId) : randomLeader(enemyFaction),
    ];
    this.revealed = null; // enemy cards shown by a peek ability
    this.difficulty = getProfile().difficulty ?? 'normal';
    this.chestClaimed = false;
    this.summary = newSummary();
    this.tutorial = !getProfile().tutorialDone && this.storyIndex === null ? { seen: new Set() } : null;
    this.match = createMatch(playerDeck, enemyDeck, 10, {
      rng: Math.random, pools, leaders,
      permanentWeather: data?.rules?.permanentWeather ?? [],
      bossUnits: data?.rules?.bossUnits ?? [],
    });

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
        if (this.time.now - this.busyStartedAt > 50 && this.registry.get('speedUp') !== false) this.queue.speedUp();
        return;
      }
      if (pointer.rightButtonDown()) this.cancelTargeting();
    });
    this.input.keyboard?.on('keydown-ESC', () => this.cancelTargeting());

    // Mulligan: the AI swaps silently, the player gets a picker before the first move
    mulligan(this.match, 1, chooseMulligan(this.match, 1));
    drainEvents(this.match);
    this.mulliganPicks = canMulligan(this.match, 0) ? new Set() : null;
    this.render();
    if (!this.mulliganPicks) this.act(() => {}); // runs startTurn for whoever moves first
  }

  confirmMulligan(keep) {
    if (!this.mulliganPicks) return;
    const picks = keep ? [] : [...this.mulliganPicks];
    this.mulliganPicks = null;
    mulligan(this.match, 0, picks);
    drainEvents(this.match);
    if (picks.length) sfx.cardSpecial();
    this.render();
    this.act(() => {});
  }

  renderMulligan() {
    const hand = this.match.players[0].hand;
    this.root.add(this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x000000, 0.75));
    this.root.add(this.add.text(SCREEN.width / 2, 150, t('mulligan.title'), { fontSize: '34px', color: '#ffd479' }).setOrigin(0.5));
    this.root.add(this.add.text(SCREEN.width / 2, 192, t('mulligan.hint', { n: MULLIGAN_MAX }), { fontSize: '16px', color: '#c8b88a' }).setOrigin(0.5));
    const step = Math.min(118, (SCREEN.width - 120) / Math.max(1, hand.length));
    const x0 = SCREEN.width / 2 - ((hand.length - 1) / 2) * step;
    hand.forEach((card, i) => {
      const picked = this.mulliganPicks.has(i);
      const cv = createCardView(this, card.def, { selected: picked });
      cv.setScale(1).setPosition(x0 + i * step, 340 + (picked ? -24 : 0));
      if (picked) {
        cv.add(this.add.text(0, 0, '↻', { fontSize: '48px', color: '#ff9f9f', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5));
      }
      onLeftClick(cv.list[0], () => {
        if (picked) this.mulliganPicks.delete(i);
        else if (this.mulliganPicks.size < MULLIGAN_MAX) this.mulliganPicks.add(i);
        sfx.click();
        this.render();
      });
      this.root.add(cv);
    });
    const n = this.mulliganPicks.size;
    this.root.add(onLeftClick(
      this.add.text(SCREEN.width / 2 - 120, 500, t('mulligan.replace', { n }), { fontSize: '24px', color: n ? '#9fe3d0' : '#666666' }).setOrigin(0.5),
      () => { if (n) this.confirmMulligan(false); },
    ));
    this.root.add(onLeftClick(
      this.add.text(SCREEN.width / 2 + 120, 500, t('mulligan.keep'), { fontSize: '24px', color: '#ffd479' }).setOrigin(0.5),
      () => this.confirmMulligan(true),
    ));
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  addText(x, y, text, color, size = '16px') {
    const t = this.add.text(x, y, text, { fontSize: size, color });
    this.root.add(t);
    return t;
  }

  canAct() {
    const m = this.match;
    return m.current === 0 && m.winner === null && !this.busy && !this.pendingPlay && !this.pendingOrder
      && !this.mulliganPicks;
  }

  activeTargets() {
    return this.pendingPlay?.targets ?? this.pendingOrder?.targets ?? null;
  }

  orderReady(card) {
    return card.def.hasOrder && !card.orderUsed && !card.locked
      && (card.def.chargeMax === 0 || card.chargesLeft > 0);
  }

  // ─── Turn flow ────────────────────────────────────────────────────────────

  /** Drain engine events, counting them for quests/achievements. */
  drain() {
    const events = drainEvents(this.match);
    accumulate(this.summary, events, 0);
    return events;
  }

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
    await this.queue.play(this.drain(), { keepSpeed: true });
    await this.beginTurnIfNeeded();
    this.queue.resetSpeed();
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
    const events = this.drain();
    if (events.length > 0) {
      this.animLayer.removeAll(true);
      this.render();
      await this.queue.play(events, { keepSpeed: true });
    }
  }

  maybeRunAi() {
    if (this.match.winner !== null || this.match.current !== 1) return;
    this.time.delayedCall(400, () => this.act(() => {
      try {
        const move = chooseMove(this.match, 1, this.difficulty);
        if (move.type === 'pass') {
          pass(this.match);
          sfx.pass();
        } else if (move.type === 'order') {
          useOrder(this.match, 1, move.row, move.cardIdx, { target: move.target });
          sfx.order();
        } else if (move.type === 'leader') {
          useLeader(this.match, 1);
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
    this.showHint(null);
    hideCardTooltip(this);
    this.viewsByUid = new Map();
    const [player, opp] = m.players;

    this.grantRewardOnce();

    // ── Header
    this.addText(20, 14, t('battle.enemyInfo', { n: opp.hand.length, rounds: pips(opp.roundsWon) }), '#d8c9a8');
    const status = m.winner !== null ? '' : m.current === 0 ? t('battle.yourTurn') : t('battle.aiTurn');
    this.addText(SCREEN.width / 2 - 40, 14, status, '#ffffff');
    onLeftClick(this.addText(SCREEN.width - 110, 14, t('battle.back'), '#9fbfff'),
      () => { if (!this.busy) showInterstitial(() => this.scene.start(this.returnScene)); });

    // ── Board rows
    for (const rowName of ROW_NAMES) {
      this.renderRow(opp, 'opponent', rowName);
      this.renderRow(player, 'player', rowName);
    }

    // ── Weather + score
    const wLabel = t('battle.weather', { rows: m.weather.size ? [...m.weather].map((r) => t(`row.${r}`)).join(', ') : '—' });
    this.addText(20, BOARD_CENTER_Y - 10, wLabel, '#9fe3d0');

    const totalYou = ROW_NAMES.reduce((s, r) => s + rowPower(player.board, r, m.weather), 0);
    const totalAi  = ROW_NAMES.reduce((s, r) => s + rowPower(opp.board,    r, m.weather), 0);
    const scoreCol = totalYou > totalAi ? '#7fff7f' : totalYou < totalAi ? '#ff9f9f' : '#ffd479';
    this.addText(SCREEN.width - 260, BOARD_CENTER_Y - 10, t('battle.score', { ai: totalAi, you: totalYou }), scoreCol);

    // ── Graveyard panels (left column)
    this.renderGraveyardPane(opp.graveyard,    44,  t('battle.ai'));
    this.renderGraveyardPane(player.graveyard, 478, t('battle.you'));

    // ── Leaders
    this.renderLeader(1, 60, 170);
    this.renderLeader(0, 60, 596);
    if (this.revealed?.length) {
      this.addText(20, 206, t('leader.revealed'), '#dd88ff', '11px');
      this.revealed.forEach((def, i) => this.addText(20, 220 + i * 13, cardName(def).slice(0, 16), '#c8a8e8', '11px'));
    }

    // ── Hand
    this.renderHand(player);

    // ── Footer
    this.addText(20, HAND_Y + 52, t('battle.youInfo', { rounds: pips(player.roundsWon) }), '#d8c9a8');
    // Big touch-friendly PASS button to the right of the player's rows (clear of the hand)
    const canPass = this.canAct();
    const passBtn = this.add.rectangle(SCREEN.width - 80, rowY('player', 'siege'), 130, 60, canPass ? 0x3a1c1c : 0x1a1a1f)
      .setStrokeStyle(2, canPass ? 0xffb3b3 : 0x3a3a3a);
    this.root.add(passBtn);
    this.root.add(this.add.text(SCREEN.width - 80, rowY('player', 'siege'), t('battle.pass'), {
      fontSize: '20px', color: canPass ? '#ffb3b3' : '#666666',
    }).setOrigin(0.5));
    onLeftClick(passBtn, () => this.onPass());

    // ── Target-selection hint
    if (this.pendingPlay || this.pendingOrder) {
      this.addText(SCREEN.width / 2 - 170, BOARD_CENTER_Y + 14, t('battle.pickTarget'), '#ffd479', '15px');
      onLeftClick(this.addText(SCREEN.width / 2 + 180, BOARD_CENTER_Y + 14, t('battle.cancel'), '#ff9f9f', '15px'),
        () => this.cancelTargeting());
    }

    if (this.mulliganPicks) this.renderMulligan();
    if (m.winner !== null) this.renderResult();
    else if (this.tutorial) this.renderTutorial();
  }

  // ─── Tutorial ─────────────────────────────────────────────────────────────

  renderTutorial() {
    const m = this.match;
    const step = tutorialStep({
      mulligan: Boolean(this.mulliganPicks),
      selected: this.selectedIndex !== null,
      pendingTarget: Boolean(this.pendingPlay || this.pendingOrder),
      played: this.summary.cardsPlayed > 0,
      myTurn: m.current === 0 && !this.busy,
      seen: this.tutorial.seen,
    });
    if (step === 'done') {
      this.finishTutorial();
      return;
    }
    if (!step) return;
    const y = TUTORIAL_ANCHOR_Y[step];
    const panel = this.add.rectangle(SCREEN.width / 2, y, 980, 78, 0x120e16, 0.95).setStrokeStyle(2, 0x9fe3d0);
    this.root.add(panel);
    this.root.add(this.add.text(SCREEN.width / 2 - 470, y, t(`tutorial.${step}`), {
      fontSize: '15px', color: '#e8f4ee', wordWrap: { width: 730 },
    }).setOrigin(0, 0.5));
    if (isInfoStep(step)) {
      const last = step === TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
      this.root.add(onLeftClick(this.add.text(SCREEN.width / 2 + 400, y - 14, last ? t('tutorial.done') : t('tutorial.next'), {
        fontSize: '18px', color: '#14100c', backgroundColor: '#9fe3d0', padding: { x: 10, y: 4 },
      }).setOrigin(0.5), () => {
        this.tutorial.seen.add(step);
        sfx.click();
        this.render();
      }));
    }
    this.root.add(onLeftClick(this.add.text(SCREEN.width / 2 + 400, y + 22, t('tutorial.skip'), {
      fontSize: '12px', color: '#9a8a6a',
    }).setOrigin(0.5), () => this.finishTutorial()));
    if (step === 'hand') {
      const arrow = this.add.text(SCREEN.width / 2, HAND_Y - 90, '▼', { fontSize: '30px', color: '#9fe3d0' }).setOrigin(0.5);
      this.root.add(arrow);
      this.tweens.add({ targets: arrow, y: HAND_Y - 78, duration: 400, yoyo: true, repeat: -1 });
      arrow.once('destroy', () => this.tweens.killTweensOf(arrow));
    }
  }

  finishTutorial() {
    if (!this.tutorial) return;
    this.tutorial = null;
    getProfile().tutorialDone = true;
    persist();
    this.render();
  }

  grantRewardOnce() {
    const m = this.match;
    if (m.winner === null || this.rewardGranted) return;
    this.rewardGranted = true;
    if (m.winner === 0) {
      const profile = getProfile();
      if (this.storyIndex === null) {
        this.reward = rewardFor(50, this.difficulty);
        addGold(profile, this.reward);
      } else {
        clearNode(profile, this.storyIndex);
        this.reward = rewardFor(this.rewardGold, this.difficulty);
        addGold(profile, this.reward);
        if (this.rewardCardId) {
          grantCard(profile, this.rewardCardId);
          this.rewardCardName = cardName(getCard(this.rewardCardId));
        }
      }
      sfx.roundWin();
    } else if (m.winner !== 'draw') {
      sfx.roundLose();
    }
    const profile = getProfile();
    const result = m.winner === 0 ? 'win' : m.winner === 1 ? 'loss' : 'draw';
    const { rankDelta, unlocked } = recordMatch(profile, {
      result, summary: this.summary, difficulty: this.difficulty, arena: this.storyIndex === null,
    });
    this.rankDelta = this.storyIndex === null ? rankDelta : null;
    if (this.storyIndex === null) recordWin(profile);
    persist();
    toastAchievements(this, unlocked);
  }

  // ─── Leader ───────────────────────────────────────────────────────────────

  renderLeader(playerIdx, x, y) {
    const leader = this.match.leaders[playerIdx];
    if (!leader) return;
    const used = this.match.players[playerIdx].leaderUsed;
    const ready = playerIdx === 0 && this.canAct() && canUseLeader(this.match, 0);
    const disc = this.add.circle(x, y, 26, used ? 0x1a1a1f : 0x2b2233)
      .setStrokeStyle(ready ? 3 : 2, ready ? 0xffd479 : used ? 0x3a3a3a : 0x8a6d3b);
    this.root.add(disc);
    this.root.add(this.add.text(x, y, leader.icon ?? '♛', { fontSize: '24px' }).setOrigin(0.5).setAlpha(used ? 0.35 : 1));
    const name = t(`leader.${leader.id}`) + (used ? ` (${t('leader.used')})` : '');
    this.root.add(this.add.text(x, y + 32, name, {
      fontSize: '10px', color: used ? '#666666' : '#d8c9a8', align: 'center', wordWrap: { width: 110 },
    }).setOrigin(0.5, 0));
    disc.setInteractive({ useHandCursor: ready });
    const passive = passiveOf(this.match, playerIdx);
    const passiveLine = passive
      ? `\n${t('passive.label', { name: t(`passive.${passive}`), desc: t(`passive.${passive}.desc`) })}` : '';
    attachLongPress(this, disc,
      () => this.showHint(`${t(`leader.${leader.id}`)}: ${t(`leader.${leader.id}.desc`)}${passiveLine}`),
      () => this.showHint(null));
    if (ready) {
      disc.on('pointerup', (pointer) => {
        if (this.tooltipShown || pointer.rightButtonReleased?.() || !this.canAct()) return;
        this.showHint(null);
        this.act(() => useLeader(this.match, 0));
      });
    }
  }

  showHint(text) {
    this.hintText?.destroy();
    this.hintText = null;
    if (!text) return;
    this.hintText = this.add.text(SCREEN.width / 2, BOARD_CENTER_Y + 22, text, {
      fontSize: '14px', color: '#ffe9b0', backgroundColor: '#0d0b10', padding: { x: 8, y: 4 },
      align: 'center', wordWrap: { width: 700 },
    }).setOrigin(0.5).setDepth(300);
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

      if (!targets) {
        cv.list[0].setInteractive();
        attachCardTooltip(this, cv.list[0], card.def, { y: sideName === 'player' ? 90 : HAND_Y - 20 });
      }
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
      attachCardTooltip(this, cv.list[0], card.def, { y: BOARD_CENTER_Y });
      this.root.add(cv);
    });
  }

  // ─── Graveyard panel ──────────────────────────────────────────────────────

  renderGraveyardPane(graveyard, yBase, label) {
    this.addText(6, yBase, `${label} ⚰${graveyard.length}`, '#6a5040', '12px');
    graveyard.slice(-4).reverse().forEach((card, i) => {
      this.addText(6, yBase + 16 + i * 13, cardName(card.def).slice(0, 14), '#4a3828', '10px');
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
    if (def.spy) return sideName === 'opponent' && rowName === def.row;
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
    this.tutorial?.seen.add('row');
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
    this.tutorial?.seen.add('target');
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
    const label = w === 0 ? t('battle.victory') : w === 1 ? t('battle.defeat') : t('battle.draw');
    const col   = w === 0 ? '#ffd479' : w === 1 ? '#ff9f9f' : '#d8c9a8';

    this.root.add(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2, label, { fontSize: '48px', color: col })
        .setOrigin(0.5),
    );

    this.root.add(onLeftClick(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 60, t('common.back'), { fontSize: '24px', color: '#9fbfff' })
        .setOrigin(0.5),
      () => showInterstitial(() => this.scene.start(this.returnScene,
        this.storyIndex !== null && w === 0 ? { outroIndex: this.storyIndex } : undefined)),
    ));

    if (w === 0 && !this.chestClaimed) {
      this.root.add(onLeftClick(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 100, t('chest.open'), { fontSize: '22px', color: '#ffd479' })
          .setOrigin(0.5),
        () => {
          if (this.chestClaimed) return; // one chest per battle, even on fast double clicks
          this.chestClaimed = true;
          this.render();
          showChest(() => {
            grantChestReward(getProfile(), SHOP_CARDS);
            persist();
            this.chestText = t('chest.got');
            this.render();
          });
        },
      ));
    }
    if (this.chestText) {
      this.root.add(this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 100, this.chestText, { fontSize: '18px', color: '#9fe3d0' }).setOrigin(0.5));
    }

    if (this.reward > 0) {
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 24, t('battle.gold', { n: this.reward }), { fontSize: '26px', color: '#ffd479' })
          .setOrigin(0.5),
      );
    }
    if (this.rankDelta !== null && this.rankDelta !== undefined) {
      const sign = this.rankDelta >= 0 ? '+' : '−';
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 - 50, t('rank.delta', { sign, n: Math.abs(this.rankDelta) }), {
          fontSize: '20px', color: this.rankDelta >= 0 ? '#9fe3d0' : '#ff9f9f',
        }).setOrigin(0.5),
      );
    }
    if (this.rewardCardName) {
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 54, t('battle.newCard', { name: this.rewardCardName }), { fontSize: '22px', color: '#9fe3d0' })
          .setOrigin(0.5),
      );
    }
  }
}

function pips(won) {
  return '●'.repeat(won) + '○'.repeat(Math.max(0, 2 - won));
}
