import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene.js';
import { SCREEN } from './ui/layout.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: '#14100c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BattleScene],
});
