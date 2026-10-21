import { BUTTON_W, BUTTON_H } from './menuLayout.js';
import { FONT_TITLE } from './fonts.js';
import { sfx } from './SoundEngine.js';
import { drawIcon, hasIcon } from './icons.js';

const GOLD = 0xe8c060;

// Oak plaque with iron bands and rivets. The rect is centred at (0,0) to match how containers work.
export function drawPlaque(g, w, h, enabled) {
  const hw = w / 2;
  const hh = h / 2;
  g.fillStyle(0x000000, 0.45).fillRoundedRect(-hw + 2, -hh + 4, w, h, 6);

  // Iron frame
  if (enabled) g.fillGradientStyle(0x57504a, 0x57504a, 0x201c17, 0x201c17, 1);
  else g.fillGradientStyle(0x2b2824, 0x2b2824, 0x14120f, 0x14120f, 1);
  g.fillRoundedRect(-hw, -hh, w, h, 6);

  // Oak inlay with grain
  const ix = -hw + 6;
  const iy = -hh + 6;
  const iw = w - 12;
  const ih = h - 12;
  if (enabled) g.fillGradientStyle(0x6a4322, 0x6a4322, 0x36200f, 0x36200f, 1);
  else g.fillGradientStyle(0x2e2419, 0x2e2419, 0x1b140d, 0x1b140d, 1);
  g.fillRoundedRect(ix, iy, iw, ih, 3);
  for (let i = 0; i < 5; i++) {
    const gy = iy + 6 + i * (ih / 5.4);
    g.lineStyle(1, enabled ? 0x2a1608 : 0x150e08, 0.32);
    g.beginPath().moveTo(ix + 6, gy).lineTo(ix + iw * 0.3, gy + (i % 2 ? 1 : -1))
      .lineTo(ix + iw * 0.62, gy + (i % 2 ? -1 : 1)).lineTo(ix + iw - 6, gy).strokePath();
  }

  // Iron end-caps with rivets
  const capW = 26;
  for (const side of [-1, 1]) {
    const cx = side < 0 ? -hw + 6 : hw - 6 - capW;
    if (enabled) g.fillGradientStyle(0x6b645c, 0x6b645c, 0x2a2622, 0x2a2622, 1);
    else g.fillGradientStyle(0x36322d, 0x36322d, 0x1a1815, 0x1a1815, 1);
    g.fillRoundedRect(cx, -hh + 6, capW, h - 12, 3);
    const rx = cx + capW / 2;
    for (const ry of [-hh + 14, hh - 14]) {
      g.fillStyle(0x151210, 1).fillCircle(rx, ry, 4);
      g.fillStyle(enabled ? 0xb9b1a4 : 0x5a554e, 1).fillCircle(rx, ry - 0.5, 3);
      g.fillStyle(0xffffff, enabled ? 0.5 : 0.15).fillCircle(rx - 1, ry - 1.5, 1);
    }
  }

  // Gold hairline and top highlight
  g.lineStyle(1, GOLD, enabled ? 0.55 : 0.18).strokeRoundedRect(-hw + 4, -hh + 4, w - 8, h - 8, 4);
  g.lineStyle(1, 0xffffff, enabled ? 0.18 : 0.05);
  g.beginPath().moveTo(-hw + 8, -hh + 1.5).lineTo(hw - 8, -hh + 1.5).strokePath();
  g.lineStyle(2, 0x0b0805, 1).strokeRoundedRect(-hw, -hh, w, h, 6);
}

export function createButton(scene, x, y, label, options = {}) {
  const { enabled = true, onClick = () => {}, icon = null } = options;
  const container = scene.add.container(x, y);

  const gfx = scene.add.graphics();
  drawPlaque(gfx, BUTTON_W, BUTTON_H, enabled);
  container.add(gfx);

  // Medallion with the heraldic icon inside the left iron cap
  const withIcon = icon && hasIcon(icon);
  if (withIcon) {
    container.add(drawIcon(scene, icon, -BUTTON_W / 2 + 6 + 13, 0, { size: 25, alpha: enabled ? 1 : 0.35, line: 1.9 }));
  }

  // Torch-glow highlight, hidden until the pointer is over the button
  const hover = scene.add.graphics();
  hover.fillStyle(0xffb050, 0.2).fillRoundedRect(-BUTTON_W / 2 + 6, -BUTTON_H / 2 + 6, BUTTON_W - 12, BUTTON_H - 12, 3);
  hover.setAlpha(0);
  container.add(hover);

  const txt = scene.add.text(withIcon ? 12 : 0, -1, label, {
    fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '25px',
    color: enabled ? '#f5e0a2' : '#6b5a3c',
    stroke: enabled ? '#1a0d04' : 'transparent', strokeThickness: enabled ? 4 : 0,
  }).setOrigin(0.5);
  container.add(txt);

  if (enabled) {
    const hit = scene.add.rectangle(0, 0, BUTTON_W, BUTTON_H, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => { sfx.click(); onClick(); });
    hit.on('pointerover', () => {
      hover.setAlpha(1);
      txt.setColor('#fff3c4');
      scene.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 90 });
    });
    hit.on('pointerout', () => {
      hover.setAlpha(0);
      txt.setColor('#f5e0a2');
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 90 });
    });
    container.add(hit);
  }

  container.setSize(BUTTON_W, BUTTON_H);
  return container;
}
