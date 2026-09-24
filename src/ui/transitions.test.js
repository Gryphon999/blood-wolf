import { describe, it, expect, vi } from 'vitest';
import { goTo, sceneFadeIn } from './transitions.js';

vi.mock('./MusicEngine.js', () => ({ music: { play: vi.fn() } }));

function fakeScene({ reduceMotion = false } = {}) {
  const listeners = {};
  return {
    registry: { get: (k) => (k === 'reduceMotion' ? reduceMotion : undefined) },
    scene: { start: vi.fn() },
    cameras: {
      main: {
        fadeIn: vi.fn(),
        fadeOut: vi.fn(),
        once: (ev, fn) => { listeners[ev] = fn; },
        finishFade: () => listeners.camerafadeoutcomplete?.(),
      },
    },
  };
}

describe('goTo', () => {
  it('lets a scene leave again after it was restarted (reduce motion)', () => {
    const scene = fakeScene({ reduceMotion: true });
    goTo(scene, 'ShopScene');
    goTo(scene, 'DeckScene');
    expect(scene.scene.start).toHaveBeenCalledTimes(2);
    expect(scene.scene.start).toHaveBeenLastCalledWith('DeckScene', undefined);
  });

  it('resets the flag after the fade-out finishes', () => {
    const scene = fakeScene();
    goTo(scene, 'ShopScene');
    goTo(scene, 'DeckScene'); // ignored: still fading out
    scene.cameras.main.finishFade();
    expect(scene.scene.start).toHaveBeenCalledTimes(1);
    goTo(scene, 'DeckScene');
    scene.cameras.main.finishFade();
    expect(scene.scene.start).toHaveBeenCalledTimes(2);
  });

  it('sceneFadeIn also clears a stale flag', () => {
    const scene = fakeScene();
    scene.leaving = true;
    sceneFadeIn(scene);
    expect(scene.leaving).toBe(false);
  });
});
