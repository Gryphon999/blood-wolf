import Phaser from 'phaser';
import { SCREEN } from './layout.js';
import { FONT_BODY } from './fonts.js';

let scale = 1;

/**
 * How many device pixels we render per logical pixel. The layout stays 1280x720; the canvas is bigger so the
 * browser never has to stretch a small bitmap (that was the cause of blurry text and art).
 * 1 on tiny/low-DPI windows, up to 2 on large or high-DPI screens.
 */
export function computeRenderScale(win = window) {
  const dpr = win.devicePixelRatio || 1;
  const fit = Math.min(win.innerWidth / SCREEN.width, win.innerHeight / SCREEN.height);
  const raw = dpr * fit;
  return Math.min(2, Math.max(1, Math.round(raw * 2) / 2));
}

export function getRenderScale() {
  return scale;
}

/** Call once before creating the Phaser game. */
export function initRender(win = window) {
  scale = computeRenderScale(win);
  // Every text object gets the body font and is rasterised at the render scale unless it says otherwise.
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const original = factory.text;
  factory.text = function text(x, y, value, style = {}) {
    return original.call(this, x, y, value, { fontFamily: FONT_BODY, resolution: scale, ...style });
  };
  return scale;
}

/** Maps the 1280x720 logical world onto the bigger canvas. Call from every scene's create(). */
export function applyCamera(scene) {
  const cam = scene.cameras.main;
  cam.setZoom(scale);
  cam.centerOn(SCREEN.width / 2, SCREEN.height / 2);
}

/** Hooks every scene so applyCamera runs on each (re)start. */
export function installCameraHook(game) {
  const hook = (scene) => {
    scene.events.on(Phaser.Scenes.Events.CREATE, () => applyCamera(scene));
    scene.events.on(Phaser.Scenes.Events.WAKE, () => applyCamera(scene));
  };
  game.scene.scenes.forEach((scene) => {
    hook(scene);
    if (scene.sys.isActive()) applyCamera(scene);
  });
}
