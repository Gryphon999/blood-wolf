// Engraved vector icons for the whole UI (VK moderation: no system emoji, one style everywhere).
// Every icon is drawn with Phaser Graphics in a 20x20 box centred on (0,0): a gold hairline plus small
// solid accents. Vector strokes stay crisp at any render scale and look the same on every OS.
import { FONT_BODY } from './fonts.js';

export const ICON_GOLD = 0xe8c060;
const BOX = 20;

// Each entry: (g, c) => draws at the origin. The stroke style is already set to colour c.
const PATHS = {
  // --- menu (moved from Button.js) ---
  sword(g, c) {
    g.beginPath().moveTo(-7, 8).lineTo(7, -8).strokePath();
    g.beginPath().moveTo(-6, -1).lineTo(2, 7).strokePath();
    g.fillStyle(c, 1).fillCircle(-8, 9, 1.8);
  },
  book(g) {
    g.strokeRect(-9, -7, 8.5, 14).strokeRect(0.5, -7, 8.5, 14);
    g.beginPath().moveTo(-6.5, -3).lineTo(-3, -3).moveTo(3, -3).lineTo(6.5, -3).strokePath();
  },
  deck(g, c) {
    g.strokeRect(-8, -6, 10, 14);
    g.strokeRect(-2, -9, 10, 14);
    g.fillStyle(c, 1).fillCircle(3, -2, 1.8);
  },
  coin(g) {
    g.strokeCircle(0, 0, 8.5).strokeCircle(0, 0, 4.5);
    g.beginPath().moveTo(0, -2).lineTo(0, 2).strokePath();
  },
  crown(g) {
    g.beginPath().moveTo(-9, 6).lineTo(-9, -5).lineTo(-4, 0).lineTo(0, -8)
      .lineTo(4, 0).lineTo(9, -5).lineTo(9, 6).closePath().strokePath();
    g.beginPath().moveTo(-9, 9).lineTo(9, 9).strokePath();
  },
  packs(g, c) {
    g.strokeRect(-9, -5, 13, 12);
    g.strokeRect(-5, -8, 13, 12);
    g.fillStyle(c, 1).fillTriangle(2, -6, 6, -2, -2, -2);
  },
  scroll(g) {
    g.strokeRect(-6, -7, 12, 14);
    g.strokeCircle(-6, -7, 2.2).strokeCircle(6, 7, 2.2);
    g.beginPath().moveTo(-3, -2).lineTo(3, -2).moveTo(-3, 2).lineTo(3, 2).strokePath();
  },
  gear(g) {
    g.strokeCircle(0, 0, 4.5);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.beginPath().moveTo(Math.cos(a) * 4.5, Math.sin(a) * 4.5).lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5).strokePath();
    }
  },
  chest(g, c) {
    g.strokeRect(-9, -1, 18, 9);
    g.beginPath().moveTo(-9, -1).lineTo(-7, -7).lineTo(7, -7).lineTo(9, -1).strokePath();
    g.fillStyle(c, 1).fillRect(-1.5, 1, 3, 4);
  },

  // --- rows and battle ---
  bow(g, c) {
    g.beginPath().arc(-4, 0, 10, -Math.PI / 2.6, Math.PI / 2.6).strokePath();
    g.beginPath().moveTo(-0.2, -9).lineTo(-0.2, 9).strokePath();
    g.beginPath().moveTo(-8, 0).lineTo(9, 0).strokePath();
    g.fillStyle(c, 1).fillTriangle(9, 0, 5, -2.5, 5, 2.5);
  },
  siege(g, c) {
    // catapult: base, wheels, throwing arm with a stone
    g.beginPath().moveTo(-9, 5).lineTo(9, 5).strokePath();
    g.strokeCircle(-5, 7, 2.2).strokeCircle(5, 7, 2.2);
    g.beginPath().moveTo(-2, 5).lineTo(-2, -1).lineTo(7, -8).strokePath();
    g.fillStyle(c, 1).fillCircle(7, -8, 2.4);
  },
  bolt(g, c) {
    g.fillStyle(c, 1);
    g.beginPath().moveTo(2, -10).lineTo(-6, 1).lineTo(-0.5, 1).lineTo(-3, 10).lineTo(6, -2).lineTo(0.5, -2).closePath().fillPath();
  },
  blood(g, c) {
    g.fillStyle(c, 1);
    g.beginPath().moveTo(0, -10).lineTo(6, 2).lineTo(-6, 2).closePath().fillPath();
    g.fillCircle(0, 3.5, 6);
  },
  skull(g, c) {
    g.strokeCircle(0, -2, 7.5);
    g.strokeRect(-4, 4, 8, 5);
    g.fillStyle(c, 1).fillCircle(-3, -2, 2.1).fillCircle(3, -2, 2.1);
    g.beginPath().moveTo(-1.3, 6).lineTo(-1.3, 9).moveTo(1.3, 6).lineTo(1.3, 9).strokePath();
  },
  shield(g, c) {
    g.beginPath().moveTo(0, -9).lineTo(8, -6).lineTo(7, 2).lineTo(0, 9).lineTo(-7, 2).lineTo(-8, -6).closePath().strokePath();
    g.fillStyle(c, 1).fillRect(-0.9, -6, 1.8, 12);
  },
  lock(g, c) {
    g.beginPath().arc(0, -3, 5, Math.PI, 0).strokePath();
    g.beginPath().moveTo(-5, -3).lineTo(-5, 0).moveTo(5, -3).lineTo(5, 0).strokePath();
    g.strokeRect(-7.5, 0, 15, 9.5);
    g.fillStyle(c, 1).fillCircle(0, 4, 1.8);
  },
  eye(g, c) {
    g.beginPath().moveTo(-10, 0).lineTo(-4, -5).lineTo(4, -5).lineTo(10, 0).lineTo(4, 5).lineTo(-4, 5).closePath().strokePath();
    g.fillStyle(c, 1).fillCircle(0, 0, 3);
  },
  spy(g, c) {
    // hooded face with a mask band
    g.beginPath().moveTo(-8, 9).lineTo(-8, -2).lineTo(0, -10).lineTo(8, -2).lineTo(8, 9).strokePath();
    g.fillStyle(c, 1).fillRect(-6, -2, 12, 3.5);
    g.fillStyle(0x000000, 1).fillCircle(-2.8, -0.3, 1).fillCircle(2.8, -0.3, 1);
  },
  horn(g, c) {
    g.beginPath().moveTo(-9, 4).lineTo(-9, -1).lineTo(4, -7).lineTo(4, 10).lineTo(-9, 4).strokePath();
    g.beginPath().moveTo(4, -7).lineTo(9, -9).moveTo(4, 10).lineTo(9, 12).strokePath();
    g.fillStyle(c, 1).fillRect(-11, -0.5, 2, 4);
  },
  chain(g) {
    g.strokeRoundedRect(-10, -4, 11, 8, 4);
    g.strokeRoundedRect(-1, -4, 11, 8, 4);
  },
  axe(g, c) {
    g.beginPath().moveTo(-6, 9).lineTo(5, -8).strokePath();
    g.fillStyle(c, 1);
    g.beginPath().moveTo(2, -10).lineTo(10, -5).lineTo(6, 2).lineTo(1, -4).closePath().fillPath();
  },
  tree(g, c) {
    g.fillStyle(c, 1);
    g.fillTriangle(0, -10, 7, -1, -7, -1);
    g.fillTriangle(0, -5, 9, 5, -9, 5);
    g.fillRect(-1.2, 5, 2.4, 5);
  },
  bat(g, c) {
    g.fillStyle(c, 1);
    g.beginPath().moveTo(0, -2).lineTo(-4, -6).lineTo(-10, -4).lineTo(-8, 1).lineTo(-5, 0).lineTo(-3, 4)
      .lineTo(0, 2).lineTo(3, 4).lineTo(5, 0).lineTo(8, 1).lineTo(10, -4).lineTo(4, -6).closePath().fillPath();
  },
  dagger(g, c) {
    g.beginPath().moveTo(0, -10).lineTo(2.5, 3).lineTo(-2.5, 3).closePath().strokePath();
    g.beginPath().moveTo(-6, 3).lineTo(6, 3).strokePath();
    g.fillStyle(c, 1).fillRect(-1.2, 3, 2.4, 5).fillCircle(0, 9.5, 1.8);
  },
  coffin(g, c) {
    g.beginPath().moveTo(-4, -10).lineTo(4, -10).lineTo(7, -4).lineTo(4, 10).lineTo(-4, 10).lineTo(-7, -4).closePath().strokePath();
    g.fillStyle(c, 1).fillRect(-0.9, -6, 1.8, 9).fillRect(-3.5, -3.5, 7, 1.8);
  },
  target(g, c) {
    g.strokeCircle(0, 0, 9).strokeCircle(0, 0, 5);
    g.fillStyle(c, 1).fillCircle(0, 0, 1.8);
  },

  // --- weather ---
  snow(g) {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      const dx = Math.cos(a) * 9;
      const dy = Math.sin(a) * 9;
      g.beginPath().moveTo(-dx, -dy).lineTo(dx, dy).strokePath();
    }
    g.strokeCircle(0, 0, 2.5);
  },
  cloud(g) {
    g.beginPath().moveTo(-9, 5).lineTo(9, 5).strokePath();
    g.beginPath().arc(-4, 1, 4, Math.PI, 0).strokePath();
    g.beginPath().arc(3, -1, 6, Math.PI * 1.05, -0.05).strokePath();
    g.beginPath().arc(8, 3, 2, -Math.PI / 2, Math.PI / 2).strokePath();
  },
  fog(g) {
    for (const [y, l, r] of [[-6, -9, 6], [-1, -6, 9], [4, -9, 5], [9, -5, 9]]) g.beginPath().moveTo(l, y).lineTo(r, y).strokePath();
  },
  rain(g) {
    PATHS.cloud(g);
    for (const x of [-5, 0, 5]) g.beginPath().moveTo(x, 7).lineTo(x - 2, 11).strokePath();
  },
  sun(g) {
    g.strokeCircle(0, 0, 4.5);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.beginPath().moveTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5).lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5).strokePath();
    }
  },

  // --- creatures and leaders ---
  wolf(g, c) {
    // wolf head, front view: ears, muzzle, eyes
    g.beginPath().moveTo(-8, -9).lineTo(-4, -3).lineTo(4, -3).lineTo(8, -9).lineTo(8, 0).lineTo(3, 9)
      .lineTo(-3, 9).lineTo(-8, 0).closePath().strokePath();
    g.fillStyle(c, 1).fillTriangle(-3.5, 0, -1, 1.5, -4, 2.5).fillTriangle(3.5, 0, 1, 1.5, 4, 2.5);
    g.fillCircle(0, 7, 1.6);
  },
  serpent(g, c) {
    g.beginPath().moveTo(-9, 8).lineTo(-3, 8).lineTo(3, 3).lineTo(-3, -2).lineTo(3, -7).strokePath();
    g.fillStyle(c, 1).fillCircle(5, -8, 3);
  },
  dragon(g, c) {
    // wing and a horned head
    g.beginPath().moveTo(-10, 6).lineTo(-2, -9).lineTo(0, 0).lineTo(5, -6).lineTo(4, 6).closePath().strokePath();
    g.fillStyle(c, 1).fillCircle(7, 6, 3).fillTriangle(6, 3, 9, -1, 8, 4);
  },
  stone(g, c) {
    // carved golem face
    g.strokeRect(-7, -9, 14, 18);
    g.fillStyle(c, 1).fillRect(-4.5, -4, 3, 2.2).fillRect(1.5, -4, 3, 2.2).fillRect(-3, 3, 6, 1.8);
  },
  spiral(g) {
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.42;
      const r = 1 + i * 0.22;
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.strokePath();
  },
  flame(g, c) {
    g.fillStyle(c, 1);
    g.beginPath().moveTo(0, -10).lineTo(6, 0).lineTo(5, 6).lineTo(0, 10).lineTo(-5, 6).lineTo(-6, 0).lineTo(-2, -3)
      .closePath().fillPath();
    g.fillStyle(0x000000, 0.55).fillCircle(0, 5, 2.8);
  },

  // --- progress and rewards ---
  trophy(g, c) {
    g.beginPath().moveTo(-6, -8).lineTo(6, -8).lineTo(5, 0).lineTo(0, 3).lineTo(-5, 0).closePath().strokePath();
    g.beginPath().arc(-6, -4, 3, Math.PI / 2, Math.PI * 1.5).strokePath();
    g.beginPath().arc(6, -4, 3, -Math.PI / 2, Math.PI / 2).strokePath();
    g.fillStyle(c, 1).fillRect(-1, 3, 2, 4).fillRect(-5, 7, 10, 2.4);
  },
  medal(g, c) {
    g.beginPath().moveTo(-5, -10).lineTo(-1, -2).moveTo(5, -10).lineTo(1, -2).strokePath();
    g.fillStyle(c, 1).fillCircle(0, 4, 6.5);
    g.fillStyle(0x000000, 0.35).fillCircle(0, 4, 3.6);
  },
  gem(g, c) {
    g.fillStyle(c, 1);
    g.beginPath().moveTo(-9, -3).lineTo(-5, -8).lineTo(5, -8).lineTo(9, -3).lineTo(0, 9).closePath().fillPath();
    g.lineStyle(1, 0x000000, 0.45);
    g.beginPath().moveTo(-9, -3).lineTo(9, -3).moveTo(-3, -3).lineTo(0, 9).lineTo(3, -3).strokePath();
  },
  sparkle(g, c) {
    g.fillStyle(c, 1);
    g.beginPath().moveTo(0, -10).lineTo(2, -2).lineTo(10, 0).lineTo(2, 2).lineTo(0, 10).lineTo(-2, 2).lineTo(-10, 0)
      .lineTo(-2, -2).closePath().fillPath();
  },
  map(g, c) {
    g.beginPath().moveTo(-9, -7).lineTo(-3, -9).lineTo(3, -7).lineTo(9, -9).lineTo(9, 7).lineTo(3, 9).lineTo(-3, 7)
      .lineTo(-9, 9).closePath().strokePath();
    g.beginPath().moveTo(-3, -9).lineTo(-3, 7).moveTo(3, -7).lineTo(3, 9).strokePath();
    g.fillStyle(c, 1).fillCircle(6, -2, 1.8);
  },
  crate(g) {
    g.strokeRect(-9, -7, 18, 15);
    g.beginPath().moveTo(-9, -2).lineTo(9, -2).moveTo(-9, -7).lineTo(9, 8).strokePath();
  },

  // --- navigation ---
  play(g, c) { g.fillStyle(c, 1).fillTriangle(-5, -8, 8, 0, -5, 8); },
  prev(g, c) { g.fillStyle(c, 1).fillTriangle(5, -8, -8, 0, 5, 8); },
  replay(g, c) {
    g.beginPath().arc(0, 0, 7, -Math.PI * 0.9, Math.PI * 0.6).strokePath();
    g.fillStyle(c, 1).fillTriangle(-9.5, -6, -3, -4.5, -7.5, 0.5);
  },
  check(g) { g.beginPath().moveTo(-8, 0).lineTo(-2, 7).lineTo(9, -7).strokePath(); },
};

export const ICON_KEYS = Object.keys(PATHS);

export function hasIcon(key) {
  return Object.prototype.hasOwnProperty.call(PATHS, key);
}

/** Draws an icon into an existing Graphics at (x, y). Size is the icon's box side in pixels. */
export function paintIcon(g, key, x = 0, y = 0, { size = BOX, color = ICON_GOLD, alpha = 1, line = 1.6 } = {}) {
  const draw = PATHS[key];
  if (!draw) return g;
  g.lineStyle(line, color, alpha);
  g.fillStyle(color, alpha);
  // A shared Graphics can't be scaled per icon, so the coordinates go through a scaling proxy
  draw(scaled({ g, k: size / BOX, x, y }), color);
  return g;
}

/** A standalone icon game object (a Graphics), centred at (x, y). */
export function drawIcon(scene, key, x, y, { size = BOX, color = ICON_GOLD, alpha = 1, line = 1.6 } = {}) {
  const g = scene.add.graphics();
  g.lineStyle(line * (BOX / size), color, 1);
  g.fillStyle(color, 1);
  PATHS[key]?.(g, color);
  g.setPosition(x, y).setScale(size / BOX).setAlpha(alpha);
  return g;
}

/** Colours for status icons that sit on card art. */
export const STATUS_COLORS = { blood: 0xe0404a, skull: 0x55e08a, shield: 0x9fd0ff, lock: 0xd0c0a0, eye: 0xd890ff, spy: 0xe0d0b0, bolt: 0xffc040 };

/** An icon on a dark disc, readable over card art. Returns a container centred at (x, y). */
export function iconBadge(scene, key, x, y, { size = 20, color, bgAlpha = 0.7 } = {}) {
  const c = color ?? STATUS_COLORS[key] ?? ICON_GOLD;
  const disc = scene.add.circle(0, 0, size * 0.62, 0x0b0805, bgAlpha).setStrokeStyle(Math.max(1, size / 14), c, 0.8);
  const icon = drawIcon(scene, key, 0, 0, { size: size * 0.8, color: c });
  return scene.add.container(x, y, [disc, icon]);
}

/**
 * Icon + text in one container. origin 0 = left edge at x, 0.5 = centred on x, 1 = right edge at x.
 * The icon sits on the text's vertical middle; its size defaults to the font size.
 */
export function iconLabel(scene, x, y, key, text, style = {}, { origin = 0, size, color = ICON_GOLD, gap = 6 } = {}) {
  const fontPx = parseFloat(style.fontSize ?? '16') || 16;
  const iconSize = size ?? Math.round(fontPx * 1.05);
  const label = scene.add.text(0, 0, text, { fontFamily: FONT_BODY, ...style }).setOrigin(0, 0.5);
  const icon = key && hasIcon(key) ? drawIcon(scene, key, iconSize / 2, 0, { size: iconSize, color }) : null;
  const textX = icon ? iconSize + gap : 0;
  const width = textX + label.width;
  // The container sits on the anchor point, so scale tweens grow around it; the children shift instead
  const shift = -width * origin;
  label.setX(textX + shift);
  icon?.setX(icon.x + shift);
  const container = scene.add.container(x, y, icon ? [icon, label] : [label]);
  container.setSize(width, Math.max(iconSize, label.height));
  container.label = label;
  container.icon = icon;
  return container;
}

// Graphics path calls in PATHS use raw numbers for a 20px box; drawIcon scales the whole Graphics object,
// paintIcon (for drawing into a shared Graphics) maps coordinates through this proxy instead.
function scaled({ g, k, x, y }) {
  const px = (v) => x + v * k;
  const py = (v) => y + v * k;
  const s = (v) => v * k;
  const proxy = {
    beginPath() { g.beginPath(); return proxy; },
    closePath() { g.closePath(); return proxy; },
    moveTo(a, b) { g.moveTo(px(a), py(b)); return proxy; },
    lineTo(a, b) { g.lineTo(px(a), py(b)); return proxy; },
    arc(a, b, r, s0, s1) { g.arc(px(a), py(b), s(r), s0, s1); return proxy; },
    strokePath() { g.strokePath(); return proxy; },
    fillPath() { g.fillPath(); return proxy; },
    strokeRect(a, b, w, h) { g.strokeRect(px(a), py(b), s(w), s(h)); return proxy; },
    fillRect(a, b, w, h) { g.fillRect(px(a), py(b), s(w), s(h)); return proxy; },
    strokeRoundedRect(a, b, w, h, r) { g.strokeRoundedRect(px(a), py(b), s(w), s(h), s(r)); return proxy; },
    strokeCircle(a, b, r) { g.strokeCircle(px(a), py(b), s(r)); return proxy; },
    fillCircle(a, b, r) { g.fillCircle(px(a), py(b), s(r)); return proxy; },
    fillTriangle(a, b, c, d, e, f) { g.fillTriangle(px(a), py(b), px(c), py(d), px(e), py(f)); return proxy; },
    fillStyle(color, alpha) { g.fillStyle(color, alpha); return proxy; },
    lineStyle(w, color, alpha) { g.lineStyle(w, color, alpha); return proxy; },
  };
  return proxy;
}
