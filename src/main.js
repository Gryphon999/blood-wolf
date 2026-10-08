import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { DeckScene } from './scenes/DeckScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { StoryScene } from './scenes/StoryScene.js';
import { PackScene } from './scenes/PackScene.js';
import { ProgressScene } from './scenes/ProgressScene.js';
import { RankScene } from './scenes/RankScene.js';
import { SCREEN } from './ui/layout.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { initPlatform, onSdkPause, gameReady, diag } from './sdk/platform.js';
import { getProfile } from './economy/session.js';
import { applySettings } from './ui/applySettings.js';
import { setAudioPaused, getCtx } from './ui/SoundEngine.js';
import { music } from './ui/MusicEngine.js';
import { t } from './i18n/index.js';
import { loadFonts } from './ui/fonts.js';
import { initRender, installCameraHook } from './ui/render.js';

await initPlatform();
await loadFonts();
const R = initRender();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // Logical layout is 1280x720; the canvas is R times bigger so nothing is upscaled (see ui/render.js)
  width: SCREEN.width * R,
  height: SCREEN.height * R,
  backgroundColor: '#14100c',
  // FIT keeps the 16:9 board whole on any screen; portrait phones get a rotate hint (index.html)
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  disableContextMenu: true,
  callbacks: { postBoot: (g) => installCameraHook(g) },
  scene: [MenuScene, BattleScene, DeckScene, ShopScene, StoryScene, PackScene, ProgressScene, RankScene, SettingsScene],
});

applySettings(game, getProfile());
// Test/screenshot hook: open the game with ?debug to reach the Phaser instance from scripts
if (new URLSearchParams(location.search).has('debug')) window.__game = game;
const rotateHint = document.getElementById('rotate-hint');
if (rotateHint) rotateHint.textContent = t('app.rotate');
// Re-fit when the phone rotates or the browser chrome resizes the viewport
window.addEventListener('orientationchange', () => setTimeout(() => game.scale.refresh(), 200));
gameReady();

// Autopause (Yandex Games requirement): hidden tab, lost focus or an SDK pause
let externalPause = false;
function setPaused(paused) {
  setAudioPaused(paused);
  if (!paused) music.resync();
}
document.addEventListener('visibilitychange', () => setPaused(document.hidden || externalPause));
window.addEventListener('blur', () => setPaused(true));
window.addEventListener('focus', () => setPaused(externalPause));
onSdkPause(
  () => { externalPause = true; setPaused(true); game.pause(); },
  () => { externalPause = false; setPaused(false); game.resume(); },
);
// Browsers start audio only after a gesture
window.addEventListener('pointerdown', () => {
  if (!document.hidden && !externalPause) {
    try { getCtx().resume(); } catch { /* no Web Audio */ }
    setPaused(false);
  }
});

// ?vcdebug=1: a corner readout of the portal glue (set it in the portal's app URL while testing there)
if (/[?&]vcdebug=1/.test(location.search)) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;top:4px;left:4px;z-index:9999;margin:0;padding:6px 8px;font:12px monospace;'
    + 'color:#9f9;background:rgba(0,0,0,.75);pointer-events:none;white-space:pre-wrap;max-width:46vw';
  document.body.appendChild(box);
  setInterval(() => {
    box.textContent = Object.entries({ ...diag, paused: String(externalPause) }).map(([k, v]) => `${k}: ${v}`).join('\n');
  }, 500);
}

// Dev-only handle for local smoke tests
if (import.meta.env.DEV) window.__bw = game;
