import Phaser from 'phaser';
import { FONT_TITLE, FONT_BODY } from './fonts.js';
import { t } from '../i18n/index.js';

// A leader shown as a statuette in a stone niche at the edge of the battlefield.
// The figures are painted on black (public/assets/leaders/<art>.jpg, see scripts/prepare-leader-art.mjs) and drawn
// with the SCREEN blend, so the black drops out and only the lit figure stands in the niche.
export const FIGURE = { w: 140, h: 196, plaque: 30 };

const GOLD = 0xc9a24c;
const SIDE_GLOW = { player: 0xffd479, opponent: 0xff5a4a };

export const leaderTextureKey = (leader) => `leader_${leader.art ?? leader.id}`;

/** Loads the figures that are not in the texture cache yet; `onReady` fires once if anything new arrived. */
export function ensureLeaderArt(scene, leaders, onReady) {
  const missing = leaders.filter((l) => l && !scene.textures.exists(leaderTextureKey(l)));
  if (missing.length === 0) return;
  for (const leader of missing) {
    scene.load.image(leaderTextureKey(leader), `./assets/leaders/${leader.art ?? leader.id}.jpg`);
  }
  // A missing file is fine: the carved fallback figure stays
  scene.load.once('complete', () => {
    if (scene.sys.isActive() && missing.some((l) => scene.textures.exists(leaderTextureKey(l)))) onReady?.();
  });
  scene.load.start();
}

function archPath(g, cx, top, w, h, r) {
  const left = cx - w / 2;
  const right = cx + w / 2;
  g.beginPath();
  g.moveTo(left, top + h);
  g.lineTo(left, top + r);
  g.arc(cx, top + r, w / 2, Math.PI, 0, false);
  g.lineTo(right, top + h);
  g.closePath();
}

// Carved stand-in used until (or instead of) the painted figure: a crowned warrior with a sword
function drawCarvedFigure(g, cx, base, color, alpha) {
  g.fillStyle(color, alpha);
  g.fillEllipse(cx, base - 6, 84, 14); // base shadow
  g.fillTriangle(cx - 44, base - 8, cx + 44, base - 8, cx, base - 128); // cloak
  g.fillRoundedRect(cx - 24, base - 122, 48, 70, 10); // torso
  g.fillEllipse(cx - 30, base - 112, 26, 20).fillEllipse(cx + 30, base - 112, 26, 20); // pauldrons
  g.fillCircle(cx, base - 140, 17); // head
  g.fillTriangle(cx - 17, base - 152, cx - 17, base - 172, cx - 7, base - 154); // crown
  g.fillTriangle(cx - 8, base - 154, cx, base - 178, cx + 8, base - 154);
  g.fillTriangle(cx + 7, base - 154, cx + 17, base - 172, cx + 17, base - 152);
  g.fillRect(cx + 38, base - 150, 5, 142); // sword planted in the ground
  g.fillRect(cx + 29, base - 118, 23, 5);
}

/**
 * Draws the figure into `root` and returns its invisible hit zone (interactive, for hints and clicks).
 * side: 'player' | 'opponent'; used: ability spent; ready: the player can fire it right now.
 */
export function drawLeaderFigure(scene, root, { leader, x, y, side, used, ready }) {
  const { w, h, plaque } = FIGURE;
  const top = y - h / 2;
  const base = top + h;
  const glowColor = SIDE_GLOW[side] ?? GOLD;

  // ── Niche
  const niche = scene.add.graphics();
  niche.fillStyle(0x000000, 0.45);
  archPath(niche, x + 2, top + 3, w + 6, h + 2, (w + 6) / 2);
  niche.fillPath();
  niche.fillGradientStyle(0x0b0908, 0x0b0908, 0x1d1712, 0x1d1712, 1);
  archPath(niche, x, top, w, h, w / 2);
  niche.fillPath();
  root.add(niche);

  // ── Light behind the figure: warm when the ability is ready, faint otherwise
  const halo = scene.add.ellipse(x, y + 6, w * 0.92, h * 0.86, glowColor, used ? 0 : ready ? 0.16 : 0.05);
  root.add(halo);
  if (ready && !scene.registry?.get('reduceMotion')) {
    scene.tweens.add({ targets: halo, alpha: 0.05, scaleX: 0.9, scaleY: 0.94, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    halo.once('destroy', () => scene.tweens.killTweensOf(halo));
  }

  // ── The figure itself
  const key = leaderTextureKey(leader);
  if (scene.textures.exists(key)) {
    const src = scene.textures.get(key).getSourceImage();
    const scale = Math.min((w - 6) / src.width, (h - 4) / src.height);
    const img = scene.add.image(x, base - 2, key).setOrigin(0.5, 1).setScale(scale)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    if (used) img.setTint(0x6a6a72).setAlpha(0.55);
    root.add(img);
  } else {
    const carved = scene.add.graphics();
    drawCarvedFigure(carved, x, base - 4, used ? 0x3a3630 : 0x6e6250, 1);
    root.add(carved);
    root.add(scene.add.text(x, base - 92, leader.icon ?? '♛', { fontSize: '30px' }).setOrigin(0.5).setAlpha(used ? 0.35 : 0.95));
  }

  // ── Stone frame over the figure's edges
  const frame = scene.add.graphics();
  frame.lineStyle(5, 0x120d09, 1);
  archPath(frame, x, top, w, h, w / 2);
  frame.strokePath();
  frame.lineStyle(ready ? 2.5 : 1.5, ready ? 0xffd479 : GOLD, used ? 0.35 : ready ? 1 : 0.75);
  archPath(frame, x, top + 3, w - 6, h - 3, (w - 6) / 2);
  frame.strokePath();
  root.add(frame);

  // ── Pedestal with the name
  const ped = scene.add.graphics();
  ped.fillStyle(0x000000, 0.5).fillRect(x - w / 2 - 4, base + 2, w + 12, plaque);
  ped.fillGradientStyle(0x4a4238, 0x4a4238, 0x1f1a15, 0x1f1a15, 1).fillRect(x - w / 2 - 6, base - 2, w + 12, plaque);
  ped.lineStyle(2, 0x120d09, 1).strokeRect(x - w / 2 - 6, base - 2, w + 12, plaque);
  ped.lineStyle(1, GOLD, used ? 0.3 : 0.7).strokeRect(x - w / 2 - 3, base + 1, w + 6, plaque - 6);
  root.add(ped);
  const name = scene.add.text(x, base - 2 + plaque / 2, t(`leader.${leader.id}`), {
    fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '15px', color: used ? '#7a7264' : '#f4dfae',
    stroke: '#0c0906', strokeThickness: 3,
  }).setOrigin(0.5);
  if (name.width > w + 2) name.setScale((w + 2) / name.width);
  root.add(name);

  // ── State line under the pedestal
  const state = used ? t('leader.used') : ready ? t('leader.ready') : null;
  if (state) {
    root.add(scene.add.text(x, base + plaque + 8, state, {
      fontFamily: FONT_BODY, fontStyle: ready ? '700' : '400', fontSize: '12px',
      color: used ? '#7a7264' : '#ffd479', stroke: '#0c0906', strokeThickness: 3,
    }).setOrigin(0.5));
  }

  const hit = scene.add.rectangle(x, y + plaque / 2, w + 12, h + plaque, 0x000000, 0.001);
  hit.setInteractive({ useHandCursor: ready });
  root.add(hit);
  return hit;
}
