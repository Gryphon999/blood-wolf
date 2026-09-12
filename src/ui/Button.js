import Phaser from 'phaser';
import { BUTTON_W, BUTTON_H } from './menuLayout.js';

export function createButton(scene, x, y, label, options = {}) {
  const { enabled = true, onClick = () => {} } = options;
  const container = scene.add.container(x, y);

  const fill = enabled ? 0x2b2b33 : 0x1a1a1f;
  const stroke = enabled ? 0x8a6d3b : 0x3a3a3a;
  const textColor = enabled ? '#e8dcc0' : '#666666';

  const bg = scene.add.rectangle(0, 0, BUTTON_W, BUTTON_H, fill).setStrokeStyle(2, stroke);
  container.add(bg);
  container.add(scene.add.text(0, 0, label, { fontSize: '22px', color: textColor }).setOrigin(0.5));

  if (enabled) {
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', onClick);
  }

  container.setSize(BUTTON_W, BUTTON_H);
  return container;
}
