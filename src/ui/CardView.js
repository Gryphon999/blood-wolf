import Phaser from 'phaser';
import { CARD_W, CARD_H } from './layout.js';
import { rarityColor } from './rarity.js';

// Vertical zones within the card (origin at card center).
const NAME_Y = -CARD_H / 2 + 8;     // top
const ART_TOP = -CARD_H / 2 + 22;   // below name
const BADGE_Y = CARD_H / 2 - 20;    // above bottom edge
const ART_H = BADGE_Y - 14 - ART_TOP; // space between name and badge
const ART_W = CARD_W - 4;
const ART_CENTER_Y = ART_TOP + ART_H / 2;

export function createCardView(scene, cardDef, options = {}) {
  const { faceDown = false, selected = false } = options;
  const container = scene.add.container(0, 0);

  const fill = faceDown ? 0x3a2a1a : 0x24222b;
  const strokeColor = selected ? 0xffd479 : rarityColor(cardDef.rarity);
  const bg = scene.add
    .rectangle(0, 0, CARD_W, CARD_H, fill)
    .setStrokeStyle(selected ? 4 : 2, strokeColor);
  container.add(bg);

  if (!faceDown) {
    // Card art (when texture is available)
    const artKey = cardDef.art;
    if (artKey && scene.textures.exists(artKey)) {
      const tex = scene.textures.get(artKey);
      const srcW = tex.source[0].width;
      const srcH = tex.source[0].height;
      // Crop the bottom ~35% (stats/text area of the source card image).
      const cropH = Math.floor(srcH * 0.65);
      const img = scene.add
        .image(0, ART_CENTER_Y, artKey)
        .setCrop(0, 0, srcW, cropH)
        .setDisplaySize(ART_W, ART_H);
      container.add(img);
    }

    container.add(
      scene.add
        .text(0, NAME_Y, cardDef.name ?? cardDef.id, {
          fontSize: '11px',
          color: '#ffd479',
          align: 'center',
          wordWrap: { width: CARD_W - 8 },
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0),
    );

    if (cardDef.type === 'special') {
      container.add(
        scene.add.text(0, BADGE_Y, 'знак', { fontSize: '12px', color: '#9fe3d0' }).setOrigin(0.5),
      );
    } else {
      container.add(scene.add.circle(0, BADGE_Y, 15, 0x14100c).setStrokeStyle(2, strokeColor));
      const color = cardDef.type === 'hero' ? '#ff9d5c' : '#ffd479';
      container.add(
        scene.add.text(0, BADGE_Y, String(cardDef.power), { fontSize: '18px', color }).setOrigin(0.5),
      );
    }
  }

  container.setSize(CARD_W, CARD_H);
  return container;
}
