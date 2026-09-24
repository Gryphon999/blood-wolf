import { SCREEN } from './layout.js';
import { cardDescription } from './cardDescription.js';
import { cardName } from './cardText.js';

const LONG_PRESS_MS = 450;

// Hover (mouse) or long-press (touch) shows something; leaving / releasing hides it.
// While a long-press is showing, scene.tooltipShown is true so the tap can be ignored.
export function attachLongPress(scene, target, onShow, onHide) {
  let timer = null;
  target.on('pointerover', (pointer) => { if (!pointer.wasTouch) onShow(); });
  target.on('pointerout', () => { clearTimeout(timer); onHide(); });
  target.on('pointerdown', (pointer) => {
    if (!pointer.wasTouch) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      scene.tooltipShown = true;
      onShow();
    }, LONG_PRESS_MS);
  });
  target.on('pointerup', () => {
    clearTimeout(timer);
    if (scene.tooltipShown) {
      // Swallow this tap, then let the next one through
      scene.time.delayedCall(0, () => {
        scene.tooltipShown = false;
        onHide();
      });
    }
  });
  target.once('destroy', () => clearTimeout(timer));
}

export function attachCardTooltip(scene, target, def, options = {}) {
  attachLongPress(scene, target, () => showCardTooltip(scene, def, options), () => hideCardTooltip(scene));
}

export function showCardTooltip(scene, def, { y = SCREEN.height - 70 } = {}) {
  hideCardTooltip(scene);
  const w = SCREEN.width - 120;
  const box = scene.add.container(0, 0).setDepth(900);
  box.add(scene.add.rectangle(SCREEN.width / 2, y, w, 64, 0x0d0b10, 0.94).setStrokeStyle(1, 0x8a6d3b));
  box.add(scene.add.text(SCREEN.width / 2, y - 22, cardName(def), { fontSize: '15px', color: '#ffd479' }).setOrigin(0.5));
  box.add(scene.add.text(SCREEN.width / 2, y - 4, cardDescription(def), {
    fontSize: '13px', color: '#c8b88a', align: 'center', wordWrap: { width: w - 24 },
  }).setOrigin(0.5, 0));
  scene.cardTooltip = box;
}

export function hideCardTooltip(scene) {
  scene.cardTooltip?.destroy();
  scene.cardTooltip = null;
}
