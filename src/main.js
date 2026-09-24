import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { DeckScene } from './scenes/DeckScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { StoryScene } from './scenes/StoryScene.js';
import { SCREEN } from './ui/layout.js';
import { initYandex } from './sdk/yandex.js';

await initYandex();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: '#14100c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, BattleScene, DeckScene, ShopScene, StoryScene],
});

// Dev-only handle for local smoke tests
if (import.meta.env.DEV) window.__bw = game;
