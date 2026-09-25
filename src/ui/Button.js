import Phaser from 'phaser';
import { BUTTON_W, BUTTON_H } from './menuLayout.js';

// Draw wood + blood art onto a Phaser Graphics object.
// The rect is centered at (0,0) to match how containers work.
function drawWoodArt(g, w, h, enabled) {
  const hw = w / 2, hh = h / 2;

  // Wood base — dark oak gradient
  if (enabled) {
    g.fillGradientStyle(0x6b3a15, 0x5a2e0a, 0x4a2208, 0x3a1a05, 1);
  } else {
    g.fillGradientStyle(0x2e1a08, 0x251405, 0x1e1003, 0x180d02, 1);
  }
  g.fillRoundedRect(-hw, -hh, w, h, 5);

  // Wood grain lines
  const grains = [0x2a1005, 0x7a4522, 0x2a1005, 0x6a3818, 0x2a1005, 0x7a4020];
  for (let i = 0; i < 6; i++) {
    const gy = -hh + 7 + i * (h / 6.2);
    const wave = i % 2 === 0 ? 1 : -1;
    g.lineStyle(1, grains[i], 0.28 + (i % 3) * 0.07);
    g.beginPath();
    g.moveTo(-hw + 8, gy);
    g.lineTo(-hw + w * 0.25, gy + wave);
    g.lineTo(-hw + w * 0.55, gy - wave * 0.6);
    g.lineTo(-hw + w * 0.78, gy + wave * 0.8);
    g.lineTo(hw - 8, gy);
    g.strokePath();
  }

  if (enabled) {
    // Blood smear — left side
    g.fillStyle(0x6b0000, 0.55);
    g.fillTriangle(-hw + 16, -hh + 3, -hw + 62, -hh + 1, -hw + 48, hh - 3);
    g.fillStyle(0x7a0000, 0.42);
    g.fillCircle(-hw + 30, -1, 8);
    g.fillCircle(-hw + 50, 5, 5);
    g.fillStyle(0x880000, 0.35);
    g.fillCircle(-hw + 20, 6, 4);
    g.fillCircle(-hw + 42, -5, 3);
    // Blood drip
    g.fillStyle(0x7a0000, 0.85);
    g.fillRect(-hw + 37, hh - 13, 3, 12);
    g.fillCircle(-hw + 38.5, hh - 1, 4.5);
    // Tiny satellite drop
    g.fillCircle(-hw + 46, hh + 1, 2.5);
  }

  // Top-edge highlight
  g.lineStyle(1, 0x9a6040, enabled ? 0.45 : 0.18);
  g.beginPath(); g.moveTo(-hw + 5, -hh + 2); g.lineTo(hw - 5, -hh + 2); g.strokePath();

  // Bottom-edge shadow
  g.lineStyle(1, 0x120803, 0.85);
  g.beginPath(); g.moveTo(-hw + 5, hh - 2); g.lineTo(hw - 5, hh - 2); g.strokePath();

  // Corner nails
  if (enabled) {
    for (const [nx, ny] of [[-hw+11, -hh+9], [hw-11, -hh+9], [-hw+11, hh-9], [hw-11, hh-9]]) {
      g.fillStyle(0xc8a060, 1); g.fillCircle(nx, ny, 5.5);
      g.fillStyle(0x8a5e2a, 1); g.fillCircle(nx, ny, 3.8);
      g.fillStyle(0x3a2010, 1); g.fillCircle(nx, ny, 1.8);
      g.lineStyle(1, 0x4a3018, 0.65);
      g.beginPath(); g.moveTo(nx - 2, ny); g.lineTo(nx + 2, ny); g.strokePath();
      g.beginPath(); g.moveTo(nx, ny - 2); g.lineTo(nx, ny + 2); g.strokePath();
    }
  }

  // Outer dark frame
  g.lineStyle(2, 0x1a0a02, 1);
  g.strokeRoundedRect(-hw, -hh, w, h, 5);
  // Inner subtle frame
  g.lineStyle(1, 0x6a3a18, 0.28);
  g.strokeRoundedRect(-hw + 2, -hh + 2, w - 4, h - 4, 4);
}

export function createButton(scene, x, y, label, options = {}) {
  const { enabled = true, onClick = () => {} } = options;
  const container = scene.add.container(x, y);

  // Wood art layer
  const gfx = scene.add.graphics();
  drawWoodArt(gfx, BUTTON_W, BUTTON_H, enabled);
  container.add(gfx);

  // Hover highlight overlay (hidden until pointer enters)
  const hover = scene.add.graphics();
  hover.fillStyle(0xffd470, 0.13);
  hover.fillRoundedRect(-BUTTON_W / 2, -BUTTON_H / 2, BUTTON_W, BUTTON_H, 5);
  hover.setAlpha(0);
  container.add(hover);

  // Label
  const textColor = enabled ? '#f0e4c0' : '#5a4530';
  const txt = scene.add.text(0, 0, label, {
    fontSize: '21px',
    color: textColor,
    stroke: enabled ? '#180800' : 'transparent',
    strokeThickness: enabled ? 2 : 0,
  }).setOrigin(0.5);
  container.add(txt);

  // Invisible hit rectangle on top
  if (enabled) {
    const hit = scene.add.rectangle(0, 0, BUTTON_W, BUTTON_H, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onClick);
    hit.on('pointerover', () => hover.setAlpha(1));
    hit.on('pointerout',  () => hover.setAlpha(0));
    container.add(hit);
  }

  container.setSize(BUTTON_W, BUTTON_H);
  return container;
}
