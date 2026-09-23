import { createCardView } from './CardView.js';
import { floatText } from './FloatingText.js';
import { sfx } from './SoundEngine.js';
import { findCardByUid } from '../engine/events.js';
import {
  SCREEN, HAND_Y, BOARD_CENTER_Y, CARD_W, CARD_H,
  rowY, handCardX, boardCardX, BOARD_CARD_SCALE,
} from './layout.js';

const ROW_SFX = { melee: sfx.cardMelee, ranged: sfx.cardRanged, siege: sfx.cardSiege };
const sideOf = (playerIdx) => (playerIdx === 0 ? 'player' : 'opponent');
const view = (scene, uid) => (uid == null ? null : scene.viewsByUid.get(uid) ?? null);

export function ensureSparkTexture(scene) {
  if (scene.textures.exists('spark')) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('spark', 8, 8);
  g.destroy();
}

// ── Promise helpers ──────────────────────────────────────────────────────────

function tweenP(scene, queue, config) {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, duration: queue.dur(config.duration ?? 300), onComplete: () => resolve() });
  });
}

function waitP(scene, queue, ms) {
  return new Promise((resolve) => scene.time.delayedCall(queue.dur(ms), resolve));
}

// ── Visual building blocks ───────────────────────────────────────────────────

function burst(scene, x, y, tint, { count = 14, rise = false } = {}) {
  const config = { lifespan: 550, scale: { start: 1, end: 0 }, tint, emitting: false };
  if (rise) {
    config.speedY = { min: -140, max: -60 };
    config.speedX = { min: -25, max: 25 };
  } else {
    config.speed = { min: 40, max: 160 };
  }
  const emitter = scene.add.particles(x, y, 'spark', config).setDepth(150);
  emitter.explode(count);
  scene.time.delayedCall(900, () => emitter.destroy());
}

function overlay(scene, v, color, alpha = 0.55) {
  const rect = scene.add.rectangle(v.x, v.y, CARD_W * v.scaleX, CARD_H * v.scaleY, color, alpha);
  scene.animLayer.add(rect);
  return rect;
}

async function projectile(scene, queue, sourceUid, target, color) {
  const source = view(scene, sourceUid);
  if (!source) return;
  const orb = scene.add.circle(source.x, source.y, 7, color).setStrokeStyle(2, 0xffe0a0);
  scene.animLayer.add(orb);
  await tweenP(scene, queue, { targets: orb, x: target.x, y: target.y, duration: 250, ease: 'Quad.In' });
  orb.destroy();
}

async function shake(scene, queue, v) {
  const x0 = v.x;
  await tweenP(scene, queue, { targets: v, x: x0 + 6, duration: 40, yoyo: true, repeat: 1 });
  v.x = x0;
}

function dropIcon(icon) {
  return async (scene, ev, queue) => {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    const text = scene.add.text(t.x, t.y - 70, icon, { fontSize: '26px' }).setOrigin(0.5);
    scene.animLayer.add(text);
    await tweenP(scene, queue, { targets: text, y: t.y, duration: 200, ease: 'Quad.In' });
    await tweenP(scene, queue, { targets: text, alpha: 0, duration: 120 });
    text.destroy();
  };
}

// ── One animation per engine event type ──────────────────────────────────────

export const ANIMATIONS = {
  async play(scene, ev, queue) {
    const from = view(scene, ev.uid);
    const startX = from ? from.x : SCREEN.width / 2;
    const startY = from ? from.y : -80; // AI cards come from the top edge
    from?.setVisible(false);
    const clone = createCardView(scene, ev.def).setScale(0.9).setPosition(startX, startY);
    scene.animLayer.add(clone);
    if (ev.special) sfx.cardSpecial();
    else (ROW_SFX[ev.row] ?? sfx.cardMelee)();
    const toX = ev.special ? SCREEN.width / 2 : boardCardX(ev.index);
    const toY = ev.special ? BOARD_CENTER_Y : rowY(sideOf(ev.player), ev.row);
    await tweenP(scene, queue, {
      targets: clone, x: toX, y: toY,
      scale: ev.special ? 0.9 : BOARD_CARD_SCALE,
      duration: 280, ease: 'Power2.Out',
    });
    if (ev.special) {
      await tweenP(scene, queue, { targets: clone, alpha: 0, scale: 1.2, duration: 220 });
      clone.destroy();
    } else {
      // The landed clone stands in for the card until the next render()
      scene.viewsByUid.set(ev.uid, clone);
    }
  },

  async damage(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    await projectile(scene, queue, ev.sourceUid, t, 0xff5533);
    sfx.damage();
    const flash = overlay(scene, t, 0xff2222);
    floatText(scene, t.x, t.y - 30, `-${ev.amount}`, '#ff9f9f');
    t.setPower?.(ev.powerAfter);
    await shake(scene, queue, t);
    await tweenP(scene, queue, { targets: flash, alpha: 0, duration: 110 });
    flash.destroy();
  },

  async shieldBreak(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    await projectile(scene, queue, ev.sourceUid, t, 0xff5533);
    sfx.order();
    const ring = scene.add.circle(t.x, t.y, 48, 0x66aaff, 0.35).setStrokeStyle(3, 0x99ccff);
    scene.animLayer.add(ring);
    burst(scene, t.x, t.y, 0x88bbff, { count: 18 });
    floatText(scene, t.x, t.y - 30, 'Щит!', '#99ccff');
    await tweenP(scene, queue, { targets: ring, scale: 1.5, alpha: 0, duration: 300 });
    ring.destroy();
  },

  async heal(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    sfx.heal();
    burst(scene, t.x, t.y + 30, 0x66ff88, { count: 12, rise: true });
    floatText(scene, t.x, t.y - 30, `+${ev.amount}`, '#7fff7f');
    t.setPower?.(ev.powerAfter);
    await waitP(scene, queue, 350);
  },

  async boost(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    floatText(scene, t.x, t.y - 30, `+${ev.amount}`, '#ffd479');
    t.setPower?.(ev.powerAfter);
    const s0 = t.scale;
    await tweenP(scene, queue, { targets: t, scale: s0 * 1.15, duration: 150, yoyo: true });
    t.setScale(s0);
  },

  async shield(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    sfx.order();
    const ring = scene.add.circle(t.x, t.y, 46, 0x66aaff, 0.25).setStrokeStyle(3, 0x99ccff).setScale(0.3);
    scene.animLayer.add(ring); // stays until render() shows the 🛡 icon
    await tweenP(scene, queue, { targets: ring, scale: 1, duration: 300, ease: 'Back.Out' });
  },

  async destroy(scene, ev, queue) {
    const t = view(scene, ev.uid);
    if (!t) return;
    sfx.damage();
    const red = overlay(scene, t, 0xaa0000, 0.6);
    burst(scene, t.x, t.y, 0xff5533, { count: 20 });
    await Promise.all([
      tweenP(scene, queue, { targets: t, scale: t.scale * 0.2, alpha: 0, duration: 400, ease: 'Quad.In' }),
      tweenP(scene, queue, { targets: red, alpha: 0, duration: 400 }),
    ]);
    red.destroy();
  },

  async copyToHand(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    const copy = findCardByUid(scene.match, ev.newUid);
    if (!t || !copy) return;
    sfx.cardSpecial();
    const ghost = createCardView(scene, copy.def).setScale(t.scale).setPosition(t.x, t.y).setAlpha(0.6);
    scene.animLayer.add(ghost);
    const toY = ev.player === 0 ? HAND_Y : -80;
    await tweenP(scene, queue, { targets: ghost, x: SCREEN.width / 2, y: toY, scale: 0.9, duration: 400, ease: 'Sine.InOut' });
    await tweenP(scene, queue, { targets: ghost, alpha: 0, duration: 150 });
    ghost.destroy();
  },

  poison: dropIcon('☠'),
  bleed: dropIcon('🩸'),

  async rowDamage(scene, ev, queue) {
    const y = rowY(sideOf(ev.player), ev.row);
    const wave = scene.add.rectangle(170, y, 46, 78, 0xff6622, 0.55);
    scene.animLayer.add(wave);
    sfx.scorch();
    await tweenP(scene, queue, { targets: wave, x: SCREEN.width - 170, duration: 350, ease: 'Sine.In' });
    wave.destroy();
  },

  async control(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    sfx.cardSpecial();
    await tweenP(scene, queue, {
      targets: t, x: SCREEN.width / 2, y: rowY(sideOf(ev.player), ev.row),
      duration: 400, ease: 'Sine.InOut',
    });
  },

  async draw(scene, ev, queue) {
    if (ev.player !== 0) return; // the AI's hand is hidden; one banner is enough
    const banner = scene.add.text(SCREEN.width / 2, BOARD_CENTER_Y, `Раунд ${scene.match.round}`, {
      fontSize: '56px', color: '#ffd479', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScale(0.4).setAlpha(0);
    scene.animLayer.add(banner);
    await tweenP(scene, queue, { targets: banner, scale: 1, alpha: 1, duration: 350, ease: 'Back.Out' });
    await waitP(scene, queue, 400);
    await tweenP(scene, queue, { targets: banner, alpha: 0, duration: 250 });

    const hand = scene.match.players[0].hand;
    await Promise.all(ev.uids.map((uid, k) => {
      const idx = hand.findIndex((c) => c.uid === uid);
      const back = createCardView(scene, { rarity: 'common' }, { faceDown: true })
        .setScale(0.9).setPosition(SCREEN.width - 70, HAND_Y);
      scene.animLayer.add(back);
      return tweenP(scene, queue, {
        targets: back, x: handCardX(idx, hand.length),
        delay: queue.dur(120 * k), duration: 300, ease: 'Power2.Out',
      });
    }));
  },

  async fizzle(scene, ev, queue) {
    const s = view(scene, ev.sourceUid);
    const x = s?.x ?? SCREEN.width / 2;
    const y = s?.y ?? BOARD_CENTER_Y;
    burst(scene, x, y, 0x888888, { count: 10 });
    floatText(scene, x, y - 30, 'Нет цели', '#aaaaaa', '16px');
    await waitP(scene, queue, 250);
  },
};
