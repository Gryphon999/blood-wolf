import Phaser from 'phaser';
import { CARD_W, CARD_H } from './layout.js';

export function createCardView(scene, cardDef, options = {}) {
  const { faceDown = false, selected = false } = options;
  const container = scene.add.container(0, 0);

  const fill = faceDown ? 0x3a2a1a : 0x24222b;
  const strokeColor = selected ? 0xffd479 : 0x8a6d3b;
  const bg = scene.add
    .rectangle(0, 0, CARD_W, CARD_H, fill)
    .setStrokeStyle(selected ? 3 : 2, strokeColor);
  container.add(bg);

  if (!faceDown) {
    const title = cardDef.name ?? cardDef.id;
    container.add(
      scene.add
        .text(0, -CARD_H / 2 + 8, title, {
          fontSize: '12px',
          color: '#e8dcc0',
          align: 'center',
          wordWrap: { width: CARD_W - 10 },
        })
        .setOrigin(0.5, 0),
    );

    if (cardDef.type === 'special') {
      container.add(
        scene.add.text(0, CARD_H / 2 - 18, 'знак', { fontSize: '12px', color: '#9fe3d0' }).setOrigin(0.5),
      );
    } else {
      const color = cardDef.type === 'hero' ? '#ff9d5c' : '#ffd479';
      container.add(
        scene.add.text(0, CARD_H / 2 - 20, String(cardDef.power), { fontSize: '22px', color }).setOrigin(0.5),
      );
    }
  }

  container.setSize(CARD_W, CARD_H);
  return container;
}
