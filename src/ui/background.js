import { SCREEN } from './layout.js';

// Procedural atmospheric background drawn with Phaser primitives (no assets).
// Call at the START of a scene's create(), before other content, so it sits
// at the bottom of the display list.
export function drawBackground(scene) {
  const g = scene.add.graphics();
  // Dark vertical gradient: murky brown at the top fading to near-black.
  g.fillGradientStyle(0x241b14, 0x241b14, 0x0b0908, 0x0b0908, 1);
  g.fillRect(0, 0, SCREEN.width, SCREEN.height);
  // Faint fog band across the middle.
  g.fillStyle(0x3a2e22, 0.16);
  g.fillRect(0, SCREEN.height / 2 - 70, SCREEN.width, 140);
  // Vignette: darken top and bottom edges.
  g.fillStyle(0x000000, 0.4);
  g.fillRect(0, 0, SCREEN.width, 48);
  g.fillRect(0, SCREEN.height - 48, SCREEN.width, 48);
  return g;
}
