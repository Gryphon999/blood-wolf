import { CARD_W, CARD_H } from './layout.js';
import { rarityColor } from './rarity.js';
import { cardName } from './cardText.js';
import { t } from '../i18n/index.js';
import { ensureCardArt } from './CardArtGenerator.js';
import { FACE, coverCrop, fitFontSize } from './cardLayout.js';
import { FONT_TITLE, FONT_BODY } from './fonts.js';

const TRAIT_ICONS = [
  ['spy', '🕵'], ['muster', '📯'], ['bond', '🔗'], ['berserker', '🪓'], ['ambush', '🌲'], ['vampirism', '🦇'],
];
const ROW_ICONS = { melee: '⚔', ranged: '🏹', siege: '⚙' };

export function traitIcons(def) {
  return TRAIT_ICONS.filter(([key]) => def[key]).map(([, icon]) => icon).join('');
}

function fallbackGlyph(def) {
  const trait = TRAIT_ICONS.find(([key]) => def[key]);
  if (trait) return trait[1];
  return def.faction === 'monsters' ? '☠' : '⚔';
}

function powerColor(def, cur, base) {
  if (def.type === 'hero') return '#ff9d5c';
  if (cur > base) return '#7fff7f';
  if (cur < base) return '#ff9f9f';
  return '#ffe2a3';
}

function drawBack(scene, container, s, strokeColor) {
  const g = scene.add.graphics();
  g.lineStyle(1.5 * s, 0x8a6d3b, 0.8).strokeRect(-CARD_W / 2 * s + 6 * s, -CARD_H / 2 * s + 6 * s, (CARD_W - 12) * s, (CARD_H - 12) * s);
  g.lineStyle(1 * s, 0x5a4326, 0.9).strokeRect(-CARD_W / 2 * s + 10 * s, -CARD_H / 2 * s + 10 * s, (CARD_W - 20) * s, (CARD_H - 20) * s);
  g.fillStyle(0x24160c, 1).fillCircle(0, 0, 26 * s);
  g.lineStyle(2 * s, strokeColor, 0.9).strokeCircle(0, 0, 26 * s);
  g.fillStyle(0x7a1a14, 1).fillTriangle(0, -17 * s, 15 * s, 0, -15 * s, 0).fillTriangle(0, 17 * s, 15 * s, 0, -15 * s, 0);
  container.add(g);
}

// options.card = live card instance (has .power, .shielded, etc.); options.zoom draws the whole card larger and crisp
export function createCardView(scene, cardDef, options = {}) {
  const { faceDown = false, selected = false, card = null, zoom = 1 } = options;
  const s = zoom;
  const W = CARD_W * s;
  const H = CARD_H * s;

  const container = scene.add.container(0, 0);
  container.setPower = () => {};
  const fill = faceDown ? 0x3a2a1a : 0x1b1712;
  const strokeColor = selected ? 0xffd479 : cardDef.golden ? 0xffd700 : rarityColor(cardDef.rarity);

  // The first child is the hit area / border: BattleScene relies on cv.list[0] being a rectangle
  const bg = scene.add.rectangle(0, 0, W, H, fill).setStrokeStyle((selected ? 4 : 2.5) * s, strokeColor);
  container.add(bg);

  if (faceDown) {
    drawBack(scene, container, s, strokeColor);
    container.setSize(W, H);
    return container;
  }

  // ── Name plate ────────────────────────────────────────────────────────────
  const plate = FACE.namePlate;
  const plateW = W - plate.inset * 2 * s;
  const plateCy = (plate.y + plate.h / 2) * s;
  const g = scene.add.graphics();
  g.fillStyle(0x2b2118, 1).fillRoundedRect(-plateW / 2, plateCy - plate.h * s / 2, plateW, plate.h * s, 3 * s);
  g.lineStyle(1 * s, 0x6a4d2a, 1).strokeRoundedRect(-plateW / 2, plateCy - plate.h * s / 2, plateW, plate.h * s, 3 * s);
  container.add(g);
  const nameText = scene.add.text(0, plateCy, cardName(cardDef), {
    fontFamily: FONT_TITLE, fontStyle: '700', fontSize: `${12 * s}px`, color: '#f4dfae',
  }).setOrigin(0.5);
  const fitted = fitFontSize((size) => { nameText.setFontSize(size); return nameText.width; }, 12.5 * s, plateW - 6 * s, 6.5 * s);
  nameText.setFontSize(fitted);
  container.add(nameText);

  // ── Art window (cover-fit crop, never stretched) ──────────────────────────
  const art = FACE.art;
  const winW = art.w * s;
  const winH = art.h * s;
  const winCx = art.x * s;
  const winCy = art.y * s;
  container.add(scene.add.rectangle(winCx, winCy, winW, winH, 0x0d0b09));
  const artKey = ensureCardArt(scene, cardDef);
  if (artKey && scene.textures.exists(artKey)) {
    const src = scene.textures.get(artKey).getSourceImage();
    const texW = src.width;
    const texH = src.height;
    const focusY = cardDef.artFocus ?? (texH / texW > 1.1 ? 0.3 : 0.5);
    const c = coverCrop(texW, texH, winW, winH, focusY);
    const img = scene.add.image(winCx - c.offsetX, winCy - c.offsetY, artKey);
    img.setScale(c.scale).setCrop(c.cropX, c.cropY, c.cropW, c.cropH);
    container.add(img);
  } else if (cardDef.type !== 'special') {
    container.add(scene.add.text(winCx, winCy, fallbackGlyph(cardDef), { fontSize: `${40 * s}px` }).setOrigin(0.5).setAlpha(0.55));
  }
  const frame = scene.add.graphics();
  frame.lineStyle(1.5 * s, 0x8a6d3b, 0.9).strokeRect(winCx - winW / 2, winCy - winH / 2, winW, winH);
  frame.lineStyle(1 * s, 0x000000, 0.6).strokeRect(winCx - winW / 2 + s, winCy - winH / 2 + s, winW - 2 * s, winH - 2 * s);
  container.add(frame);

  // ── Info plate: row and provision cost (special cards show the sign label) ──
  const info = FACE.info;
  const infoCy = (info.y + info.h / 2) * s;
  const g2 = scene.add.graphics();
  g2.fillStyle(0x241c14, 1).fillRoundedRect(-plateW / 2, infoCy - info.h * s / 2, plateW, info.h * s, 3 * s);
  g2.lineStyle(1 * s, 0x5a4326, 1).strokeRoundedRect(-plateW / 2, infoCy - info.h * s / 2, plateW, info.h * s, 3 * s);
  container.add(g2);
  const traits = traitIcons(cardDef);
  if (cardDef.type === 'special') {
    container.add(scene.add.text(0, infoCy, t('card.sign'), {
      fontFamily: FONT_TITLE, fontStyle: '700', fontSize: `${11 * s}px`, color: '#9fe3d0',
    }).setOrigin(0.5));
  } else {
    container.add(scene.add.text(-plateW / 2 + 6 * s, infoCy, `${ROW_ICONS[cardDef.row] ?? ''} ${t(`row.${cardDef.row}`)}`, {
      fontFamily: FONT_BODY, fontSize: `${8.5 * s}px`, color: '#d8c79a',
    }).setOrigin(0, 0.5));
    if (cardDef.prov) {
      container.add(scene.add.text(plateW / 2 - 6 * s, infoCy, `◆ ${cardDef.prov}`, {
        fontFamily: FONT_BODY, fontStyle: '700', fontSize: `${9.5 * s}px`, color: '#e8b25a',
      }).setOrigin(1, 0.5));
    }
  }
  if (traits) {
    container.add(scene.add.text(0, infoCy, traits, { fontSize: `${9.5 * s}px` }).setOrigin(0.5));
  }
  if (cardDef.golden) {
    container.add(scene.add.text(W / 2 - 6 * s, -H / 2 + 26 * s, '★', {
      fontSize: `${15 * s}px`, color: '#ffd700', stroke: '#000000', strokeThickness: 3 * s,
    }).setOrigin(1, 0));
  }

  // ── Power badge (top-left of the art) ─────────────────────────────────────
  if (cardDef.type !== 'special') {
    const cur = card ? card.power : cardDef.power;
    const base = cardDef.power;
    const bx = winCx - winW / 2 + (FACE.badge.r + 2) * s;
    const by = winCy - winH / 2 + (FACE.badge.r + 2) * s;
    const badgeFill = card && cur > base ? 0x1a4a22 : card && cur < base ? 0x4a1a1a : 0x14100c;
    container.add(scene.add.circle(bx, by, FACE.badge.r * s, badgeFill).setStrokeStyle(2 * s, strokeColor));
    const powerText = scene.add.text(bx, by, String(cur), {
      fontFamily: FONT_TITLE, fontStyle: '700', fontSize: `${19 * s}px`, color: powerColor(cardDef, cur, base),
    }).setOrigin(0.5);
    container.add(powerText);
    // Lets animations update the number without a full re-render
    container.setPower = (n) => {
      powerText.setText(String(n));
      powerText.setColor(powerColor(cardDef, n, base));
    };

    if (card) {
      // Status effect icons along the bottom edge of the art window
      let ix = winCx - winW / 2 + 4 * s;
      const iy = winCy + winH / 2 - 8 * s;
      const icon = (txt, col = '#ffffff') => {
        container.add(scene.add.text(ix, iy, txt, { fontSize: `${10 * s}px`, color: col, stroke: '#000000', strokeThickness: 2 * s }).setOrigin(0, 0.5));
        ix += 14 * s;
      };
      if (card.shielded)        icon('🛡');
      if (card.locked)          icon('🔒');
      if (card.poisoned)        icon('☠', '#44ff88');
      if (card.bleedStacks > 0) icon(`🩸${card.bleedStacks}`);
      if (card.controlled)      icon('👁', '#dd44ff');
      if (card.spy)             icon('🕵', '#dd88ff');

      // Order ready: amber indicator in the top-right corner of the art
      const hasOrderReady = card.def.hasOrder && !card.orderUsed && !card.locked
        && (card.def.chargeMax === 0 || card.chargesLeft > 0);
      if (hasOrderReady) {
        const ox = winCx + winW / 2 - 9 * s;
        const oy = winCy - winH / 2 + 9 * s;
        container.add(scene.add.rectangle(ox, oy, 16 * s, 14 * s, 0xbb6600).setStrokeStyle(1 * s, 0xffaa00));
        container.add(scene.add.text(ox, oy, '⚡', { fontSize: `${9 * s}px` }).setOrigin(0.5));
      }
    }
  }

  container.setSize(W, H);
  return container;
}
