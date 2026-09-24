import { SCREEN } from './layout.js';
import { t } from '../i18n/index.js';
import { checkAchievements } from '../economy/achievements.js';
import { sfx } from './SoundEngine.js';

// Small banner that slides in at the top and fades out; stacks while several are visible
export function showToast(scene, text, color = '#ffd479') {
  scene.toastCount = (scene.toastCount ?? 0) + 1;
  const y = 70 + (scene.toastCount - 1) * 38;
  const label = scene.add.text(SCREEN.width / 2, y - 30, text, {
    fontSize: '18px', color, backgroundColor: '#1a1420', padding: { x: 12, y: 6 },
  }).setOrigin(0.5).setDepth(1000).setAlpha(0);
  scene.tweens.add({ targets: label, y, alpha: 1, duration: 250, ease: 'Back.Out' });
  scene.time.delayedCall(2600, () => {
    scene.tweens.add({
      targets: label, alpha: 0, duration: 300,
      onComplete: () => { label.destroy(); scene.toastCount--; },
    });
  });
}

export function toastAchievements(scene, unlocked) {
  unlocked.forEach((a, i) => scene.time.delayedCall(i * 400, () => {
    sfx.roundWin();
    showToast(scene, t('ach.unlocked', { icon: a.icon, name: t(`ach.${a.id}`), gold: a.reward }));
  }));
}

// Check achievements after a profile change and announce the new ones
export function onAchievements(scene, profile) {
  toastAchievements(scene, checkAchievements(profile));
}
