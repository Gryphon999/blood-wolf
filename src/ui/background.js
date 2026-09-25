import { SCREEN } from './layout.js';

// Generic dark background used by battle and other scenes.
export function drawBackground(scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x241b14, 0x241b14, 0x0b0908, 0x0b0908, 1);
  g.fillRect(0, 0, SCREEN.width, SCREEN.height);
  g.fillStyle(0x3a2e22, 0.16);
  g.fillRect(0, SCREEN.height / 2 - 70, SCREEN.width, 140);
  g.fillStyle(0x000000, 0.4);
  g.fillRect(0, 0, SCREEN.width, 48);
  g.fillRect(0, SCREEN.height - 48, SCREEN.width, 48);
  return g;
}

// Atmospheric menu background: blood moon, forest silhouettes, blood drips.
export function drawMenuBackground(scene) {
  const W = SCREEN.width;
  const H = SCREEN.height;
  const g = scene.add.graphics();

  // Sky gradient: near-black at top → dark purple in middle → dark charcoal at bottom
  g.fillGradientStyle(0x060308, 0x060308, 0x140d18, 0x140d18, 1);
  g.fillRect(0, 0, W, H * 0.55);
  g.fillGradientStyle(0x140d18, 0x140d18, 0x150b08, 0x150b08, 1);
  g.fillRect(0, H * 0.55, W, H * 0.45);

  // Stars — deterministic positions (no random per-frame flicker)
  let rx = 17, ry = 31;
  for (let i = 0; i < 210; i++) {
    rx = (rx * 1664525 + 1013904223) >>> 0;
    ry = (ry * 22695477 + 1)         >>> 0;
    const px = rx % W;
    const py = ry % Math.floor(H * 0.58);
    const alpha = 0.12 + (rx % 80) / 100;
    g.fillStyle(0xffffff, alpha);
    if (rx % 12 === 0) g.fillCircle(px, py, 1.3); else g.fillRect(px, py, 1, 1);
  }

  // Blood moon — upper-right
  const mx = W * 0.82, my = 118;
  g.fillStyle(0x550000, 0.06); g.fillCircle(mx, my, 130);
  g.fillStyle(0x770000, 0.09); g.fillCircle(mx, my, 105);
  g.fillStyle(0xaa1100, 0.14); g.fillCircle(mx, my, 82);
  g.fillStyle(0xcc1800, 0.22); g.fillCircle(mx, my, 62);
  g.fillStyle(0xb51800, 1);    g.fillCircle(mx, my, 48);
  // Surface texture
  g.fillStyle(0x880d00, 0.65); g.fillCircle(mx + 14, my - 7, 15);
  g.fillStyle(0x991200, 0.55); g.fillCircle(mx - 11, my + 11, 11);
  g.fillStyle(0x771000, 0.5);  g.fillCircle(mx + 5,  my + 16, 8);
  g.fillStyle(0xdd3322, 0.38); g.fillCircle(mx - 16, my - 14, 19); // bright crescent

  // Distant hills silhouette
  g.fillStyle(0x0d0609, 0.9);
  const hills = [[0, 0.64, 220, 0.42], [150, 0.64, 380, 0.38], [320, 0.64, 520, 0.46],
                 [480, 0.64, 680, 0.40], [640, 0.64, 820, 0.44], [780, 0.64, 980, 0.39],
                 [940, 0.64, 1150, 0.43], [1080, 0.64, 1280, 0.41]];
  for (const [x1, y1, xp, yp] of hills) {
    g.fillTriangle(x1, H * y1, xp, H * yp, x1 + 400, H * y1);
  }
  g.fillRect(0, H * 0.64, W, H * 0.04); // base of hills

  // Pine tree helper
  function pine(tx, ty, th, tw) {
    g.fillRect(tx - 3, ty - th * 0.24, 6, th * 0.24);
    g.fillTriangle(tx - tw * 0.5,  ty - th * 0.26, tx + tw * 0.5,  ty - th * 0.26, tx, ty - th);
    g.fillTriangle(tx - tw * 0.38, ty - th * 0.48, tx + tw * 0.38, ty - th * 0.48, tx, ty - th * 0.93);
    g.fillTriangle(tx - tw * 0.26, ty - th * 0.66, tx + tw * 0.26, ty - th * 0.66, tx, ty - th);
  }

  // Back tree row
  g.fillStyle(0x07050a, 1);
  [[55,118],[170,132],[285,98],[395,124],[500,108],[615,128],[728,112],[840,102],[955,134],[1065,110],[1170,122],[1255,96]]
    .forEach(([tx, th]) => pine(tx, H * 0.72, th, th * 0.54));

  // Front tree row
  g.fillStyle(0x040203, 1);
  [[0,155],[115,175],[228,148],[342,165],[458,158],[578,178],[698,162],[818,152],[938,172],[1058,156],[1178,168],[1280,154]]
    .forEach(([tx, th]) => pine(tx, H, th, th * 0.5));

  g.fillStyle(0x030202, 1);
  g.fillRect(0, H * 0.8, W, H * 0.2); // ground fill

  // Blood drips from top edge
  const drips = [[44,58],[128,38],[258,82],[392,46],[518,70],[648,42],[768,74],[895,52],[1020,62],[1148,40],[1232,66]];
  for (const [dx, dl] of drips) {
    g.fillStyle(0x8b0000, 0.88);
    g.fillRect(dx - 2, 0, 4, dl);
    g.fillCircle(dx, dl, 5);
    g.fillStyle(0x6b0000, 0.65);
    g.fillRect(dx + 9, 0, 2, dl * 0.55);
    g.fillCircle(dx + 10, dl * 0.55, 3);
  }

  // Fog layers
  g.fillStyle(0x180e1e, 0.38); g.fillRect(0, H * 0.56, W, 75);
  g.fillStyle(0x120810, 0.52); g.fillRect(0, H * 0.63, W, 45);
  g.fillStyle(0x0a0a14, 0.62); g.fillRect(0, H * 0.78, W, 38);

  // Title glow behind the text
  g.fillStyle(0x380010, 0.28); g.fillEllipse(W / 2, 165, 520, 110);

  // Blood moon reflection in ground mist
  g.fillStyle(0x440000, 0.14); g.fillEllipse(mx, H * 0.87, 180, 24);

  // Vignette
  g.fillStyle(0x000000, 0.6);
  g.fillRect(0, 0, W, 28);
  g.fillRect(0, H - 36, W, 36);
  g.fillRect(0, 0, 28, H);
  g.fillRect(W - 28, 0, 28, H);

  return g;
}
