// Smooth scene changes: fade to black, start the next scene, which fades itself in.
const FADE_MS = 220;

export function sceneFadeIn(scene) {
  if (scene.registry.get('reduceMotion')) return;
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
}

export function goTo(scene, key, data) {
  if (scene.leaving) return;
  scene.leaving = true;
  if (scene.registry.get('reduceMotion')) {
    scene.scene.start(key, data);
    return;
  }
  scene.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}
