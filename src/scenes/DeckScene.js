import Phaser from 'phaser';
import { createCardView } from '../ui/CardView.js';
import { getProfile, persist } from '../economy/session.js';
import {
  canUpgrade, upgradeCard, upgradeCost, toggleDeckCard, isDeckValid, setLeader,
  canMakeGolden, makeGolden, GOLDEN_COPIES, GOLDEN_BONUS,
} from '../economy/profile.js';
import { leadersOf, chosenLeader } from '../data/leaders.js';
import { getCard } from '../data/cardCatalog.js';
import { SCREEN } from '../ui/layout.js';
import { drawBackground } from '../ui/background.js';
import { sceneFadeIn } from '../ui/transitions.js';
import { preloadCardAssets } from '../ui/preloadAssets.js';
import { t } from '../i18n/index.js';
import { FACTION_PASSIVE } from '../engine/passives.js';
import { attachCardTooltip } from '../ui/tooltip.js';
import { sfx } from '../ui/SoundEngine.js';
import { onAchievements } from '../ui/toast.js';

const COLS = 7;
const ROWS_PER_PAGE = 2;
const PAGE_SIZE = COLS * ROWS_PER_PAGE;
const STEP_X = 160;
const STEP_Y = 250;
const START_X = SCREEN.width / 2 - ((COLS - 1) / 2) * STEP_X;
const START_Y = 230;

export class DeckScene extends Phaser.Scene {
  constructor() {
    super('DeckScene');
    this.page = 0;
  }

  preload() {
    preloadCardAssets(this);
  }

  create() {
    drawBackground(this);
    sceneFadeIn(this);
    this.root = this.add.container(0, 0);
    this.page = 0;
    this.render();
  }

  text(x, y, str, color, size = '16px') {
    const o = this.add.text(x, y, str, { fontSize: size, color });
    this.root.add(o);
    return o;
  }

  button(x, y, str, color, size, onClick) {
    const o = this.text(x, y, str, color, size).setInteractive({ useHandCursor: true });
    o.on('pointerdown', () => { sfx.click(); onClick(); });
    return o;
  }

  renderLeaderPicker(p) {
    const faction = p.deck[0] ? getCard(p.deck[0]).faction : p.faction;
    const current = chosenLeader(p, faction);
    this.text(20, 78, t('leader.pick'), '#d8c9a8', '14px');
    leadersOf(faction).forEach((leader, i) => {
      const active = leader.id === current?.id;
      this.button(250 + i * 220, 78, `${leader.icon} ${t(`leader.${leader.id}`)}`, active ? '#ffd479' : '#8a7a5a', '14px', () => {
        setLeader(p, faction, leader.id);
        persist();
        this.render();
      });
    });
    if (current) this.text(250, 100, t(`leader.${current.id}.desc`), '#9fe3d0', '12px');
    const passive = FACTION_PASSIVE[faction];
    if (passive) {
      this.text(20, 120, t('passive.label', { name: t(`passive.${passive}`), desc: t(`passive.${passive}.desc`) }), '#c8a8e8', '12px');
    }
  }

  render() {
    this.root.removeAll(true);
    const p = getProfile();

    this.text(20, 16, t('common.gold', { n: p.gold }), '#ffd479', '22px');
    const ok = isDeckValid(p);
    this.text(SCREEN.width / 2 - 130, 16, t('deck.size', { n: p.deck.length }) + (ok ? '' : ` ${t('deck.min')}`), ok ? '#d8c9a8' : '#ff9d9d', '20px');
    this.button(SCREEN.width - 140, 16, t('common.back'), '#e8c98a', '20px', () => this.scene.start('MenuScene'));
    this.text(20, 52, t('deck.hint', { n: GOLDEN_COPIES, bonus: GOLDEN_BONUS }), '#9a8a6a', '14px');
    this.renderLeaderPicker(p);

    const ids = Object.keys(p.collection);
    const pages = Math.max(1, Math.ceil(ids.length / PAGE_SIZE));
    this.page = Math.min(this.page, pages - 1);
    ids.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE).forEach((id, idx) => {
      this.renderCard(p, id, START_X + (idx % COLS) * STEP_X, START_Y + Math.floor(idx / COLS) * STEP_Y);
    });

    const navY = SCREEN.height - 34;
    this.text(SCREEN.width / 2 - 30, navY, `${this.page + 1} / ${pages}`, '#7a6a4a', '18px');
    if (this.page > 0) this.button(SCREEN.width / 2 - 160, navY, t('common.prev'), '#e8c98a', '18px', () => { this.page--; this.render(); });
    if (this.page < pages - 1) this.button(SCREEN.width / 2 + 80, navY, t('common.next'), '#e8c98a', '18px', () => { this.page++; this.render(); });
  }

  renderCard(p, id, x, y) {
    const def = getCard(id);
    const owned = p.collection[id];
    const level = owned.level ?? 1;
    const bonus = (def.type === 'unit' ? level - 1 : 0) + (owned.golden ? GOLDEN_BONUS : 0);
    const inDeck = p.deck.includes(id);

    const cv = createCardView(this, { ...def, power: def.power + bonus, golden: owned.golden }, { selected: inDeck });
    cv.setScale(1.1).setPosition(x, y);
    const bg = cv.list[0];
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => {
      if (this.tooltipShown) return; // a long-press shows the tooltip instead of toggling
      toggleDeckCard(p, id);
      persist();
      this.render();
    });
    attachCardTooltip(this, bg, def);
    this.root.add(cv);

    const labelY = y + 82;
    if ((owned.count ?? 1) > 1) this.text(x + 34, labelY, `×${owned.count}`, '#d8c9a8', '13px');
    if (def.type === 'unit') {
      this.text(x - 50, labelY, t('deck.level', { n: level }), '#9a8a6a', '13px');
      if (canUpgrade(p, id)) {
        this.button(x + 2, labelY, `↑ ${upgradeCost(level)}`, '#9fe3d0', '13px', () => {
          upgradeCard(p, id);
          persist();
          this.render();
        });
      } else if (level >= 3) {
        this.text(x + 8, labelY, t('deck.max'), '#666666', '13px');
      }
    }
    if (canMakeGolden(p, id)) {
      this.button(x - 50, labelY + 18, t('deck.golden', { n: GOLDEN_COPIES }), '#ffd700', '13px', () => {
        makeGolden(p, id);
        sfx.roundWin();
        onAchievements(this, p);
        persist();
        this.render();
      });
    }
  }
}
