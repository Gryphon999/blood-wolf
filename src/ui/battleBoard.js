import { SCREEN } from './layout.js';
import { FONT_TITLE } from './fonts.js';

// Battlefield dressing for the card lanes: everything here is vector art drawn with Graphics, so it stays crisp at any
// render scale and lets the painted field background show through.
export const LANE = { x: 160, w: SCREEN.width - 320, h: 78 };

const LANE_TINT = { melee: 0x4a2418, ranged: 0x243a20, siege: 0x1f2c44 };
const SIDE_WASH = { opponent: [0x3a0808, 0.16], player: [0x3a2a08, 0.1] };
const GOLD = 0xc9a24c;

// Little engraved emblems for each lane type
const EMBLEMS = {
  melee(g, cx, cy) {
    g.beginPath().moveTo(cx - 8, cy + 9).lineTo(cx + 8, cy - 9).moveTo(cx + 8, cy + 9).lineTo(cx - 8, cy - 9).strokePath();
    g.beginPath().moveTo(cx - 9, cy + 3).lineTo(cx - 3, cy + 9).moveTo(cx + 9, cy + 3).lineTo(cx + 3, cy + 9).strokePath();
  },
  ranged(g, cx, cy) {
    g.beginPath().arc(cx - 3, cy, 10, -1.2, 1.2).strokePath();
    g.beginPath().moveTo(cx - 6, cy - 9).lineTo(cx - 6, cy + 9).strokePath();
    g.beginPath().moveTo(cx - 8, cy).lineTo(cx + 10, cy).moveTo(cx + 6, cy - 3).lineTo(cx + 10, cy).lineTo(cx + 6, cy + 3).strokePath();
  },
  siege(g, cx, cy) {
    g.strokeRect(cx - 9, cy - 1, 18, 9);
    for (let i = -8; i <= 4; i += 6) g.strokeRect(cx + i, cy - 6, 4, 5);
    g.beginPath().moveTo(cx - 9, cy + 8).lineTo(cx - 9, cy + 11).moveTo(cx + 9, cy + 8).lineTo(cx + 9, cy + 11).strokePath();
  },
};

/** One lane of the board (behind the cards). */
export function drawLane(scene, root, y, rowName, sideName) {
  const { x, w, h } = LANE;
  const g = scene.add.graphics();
  const tint = LANE_TINT[rowName] ?? 0x2a2a2a;
  const top = y - h / 2;
  // Earth-coloured band, darker toward both ends so it reads as a strip of ground
  g.fillGradientStyle(tint, tint, tint, tint, 0.62, 0.3, 0.62, 0.3).fillRect(x, top, w / 2, h);
  g.fillGradientStyle(tint, tint, tint, tint, 0.3, 0.62, 0.3, 0.62).fillRect(x + w / 2, top, w / 2, h);
  const [wash, washA] = SIDE_WASH[sideName] ?? SIDE_WASH.player;
  g.fillStyle(wash, washA).fillRect(x, top, w, h);
  // Trampled-earth streaks (deterministic so lanes do not shimmer between renders)
  g.lineStyle(1, 0x000000, 0.22);
  for (let i = 0; i < 9; i++) {
    const sx = x + 40 + ((i * 197) % (w - 80));
    const sy = top + 12 + ((i * 29) % (h - 24));
    g.beginPath().moveTo(sx, sy).lineTo(sx + 46 + (i % 3) * 14, sy + (i % 2 ? 2 : -2)).strokePath();
  }
  // Edges: worn iron rail above and below
  g.lineStyle(2, 0x0c0906, 0.9).strokeRect(x, top, w, h);
  g.lineStyle(1, GOLD, 0.4).strokeRect(x + 2, top + 2, w - 4, h - 4);
  for (const [cx, cy] of [[x + 6, top + 6], [x + w - 6, top + 6], [x + 6, top + h - 6], [x + w - 6, top + h - 6]]) {
    g.fillStyle(0x151210, 1).fillCircle(cx, cy, 3.4);
    g.fillStyle(0x9a9284, 1).fillCircle(cx, cy - 0.4, 2.4);
  }
  // Lane emblem on the left end
  g.lineStyle(1.6, GOLD, 0.55);
  EMBLEMS[rowName]?.(g, x + 22, y);
  root.add(g);
}

/** Carved shield with the lane's score and its role name. */
export function drawScoreMedallion(scene, root, x, y, score, label, color) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.4).fillCircle(x + 1.5, y + 3, 24);
  g.fillGradientStyle(0x4a443c, 0x4a443c, 0x1a1712, 0x1a1712, 1).fillCircle(x, y - 2, 23);
  g.lineStyle(2, 0x0c0906, 1).strokeCircle(x, y - 2, 23);
  g.lineStyle(1.5, GOLD, 0.85).strokeCircle(x, y - 2, 19);
  root.add(g);
  root.add(scene.add.text(x, y - 3, String(score), {
    fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '26px', color: '#ffe3a0', stroke: '#1a0d04', strokeThickness: 3,
  }).setOrigin(0.5));
  root.add(scene.add.text(x, y + 30, label, {
    fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '13px', color, stroke: '#0c0906', strokeThickness: 3,
  }).setOrigin(0.5));
}

/** Palisade of sharpened stakes and a faint mud band across the middle of the field. */
export function drawNoMansLand(scene, root, centerY) {
  const { x, w } = LANE;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.32, 0.32).fillRect(x, centerY - 34, w, 34);
  g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.32, 0.32, 0, 0).fillRect(x, centerY, w, 34);
  for (const [edge, dir] of [[centerY - 36, -1], [centerY + 36, 1]]) {
    for (let px = x + 8; px < x + w; px += 22) {
      g.fillStyle(0x2a1a0d, 1).fillRect(px - 3, edge - (dir < 0 ? 12 : 0), 6, 12);
      g.fillStyle(0x4a2f18, 1).fillTriangle(px - 3, edge - (dir < 0 ? 12 : 0), px + 3, edge - (dir < 0 ? 12 : 0), px, edge - dir * 6 - (dir < 0 ? 12 : 0));
    }
    g.lineStyle(2, 0x120a05, 0.9).beginPath().moveTo(x, edge).lineTo(x + w, edge).strokePath();
  }
  root.add(g);
}
