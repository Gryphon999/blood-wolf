import { CARD_W, CARD_H } from './layout.js';
import { rarityColor } from './rarity.js';

const NAME_Y = -CARD_H / 2 + 8;
const BADGE_Y = CARD_H / 2 - 20;

// options.card = live card instance (has .power, .shielded, etc.)
export function createCardView(scene, cardDef, options = {}) {
  const { faceDown = false, selected = false, card = null } = options;

  const container = scene.add.container(0, 0);
  const fill = faceDown ? 0x3a2a1a : 0x24222b;
  const strokeColor = selected ? 0xffd479 : rarityColor(cardDef.rarity);

  const bg = scene.add.rectangle(0, 0, CARD_W, CARD_H, fill)
    .setStrokeStyle(selected ? 4 : 2, strokeColor);
  container.add(bg);

  if (!faceDown) {
    if (cardDef.art && scene.textures.exists(cardDef.art)) {
      container.add(scene.add.image(0, 0, cardDef.art).setDisplaySize(CARD_W, CARD_H));
    }

    container.add(
      scene.add.text(0, NAME_Y, cardDef.name ?? cardDef.id, {
        fontSize: '11px', color: '#ffd479', align: 'center',
        wordWrap: { width: CARD_W - 8 }, stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 0),
    );

    if (cardDef.type === 'special') {
      container.add(
        scene.add.text(0, BADGE_Y, 'знак', { fontSize: '12px', color: '#9fe3d0' }).setOrigin(0.5),
      );
    } else {
      const cur = card ? card.power : cardDef.power;
      const base = cardDef.power;
      const badgeFill = card && cur > base ? 0x1a4a22
        : card && cur < base ? 0x4a1a1a
        : 0x14100c;
      const numColor = cardDef.type === 'hero' ? '#ff9d5c'
        : card && cur > base ? '#7fff7f'
        : card && cur < base ? '#ff9f9f'
        : '#ffd479';

      container.add(scene.add.circle(0, BADGE_Y, 15, badgeFill).setStrokeStyle(2, strokeColor));
      container.add(
        scene.add.text(0, BADGE_Y, String(cur), { fontSize: '18px', color: numColor }).setOrigin(0.5),
      );

      if (card) {
        // Status effect icons above the power badge
        let ix = -CARD_W / 2 + 5;
        const iy = CARD_H / 2 - 36;
        const icon = (txt, col = '#ffffff') => {
          container.add(scene.add.text(ix, iy, txt, { fontSize: '9px', color: col }).setOrigin(0, 0.5));
          ix += 13;
        };
        if (card.shielded)        icon('🛡');
        if (card.locked)          icon('🔒');
        if (card.poisoned)        icon('☠', '#44ff88');
        if (card.bleedStacks > 0) icon(`🩸${card.bleedStacks}`);
        if (card.controlled)      icon('👁', '#dd44ff');

        // Order ready: amber indicator top-right corner
        const hasOrderReady = card.def.hasOrder && !card.orderUsed && !card.locked
          && (card.def.chargeMax === 0 || card.chargesLeft > 0);
        if (hasOrderReady) {
          container.add(
            scene.add.rectangle(CARD_W / 2 - 9, -CARD_H / 2 + 9, 16, 14, 0xbb6600)
              .setStrokeStyle(1, 0xffaa00),
          );
          container.add(
            scene.add.text(CARD_W / 2 - 9, -CARD_H / 2 + 9, '⚡', { fontSize: '9px' }).setOrigin(0.5),
          );
        }
      }
    }
  }

  container.setSize(CARD_W, CARD_H);
  return container;
}
