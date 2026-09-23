// Plays engine events one after another. Each animation returns a Promise.
export class AnimationQueue {
  constructor(animations, scene) {
    this.animations = animations;
    this.scene = scene;
    this.speed = 1;
  }

  speedUp() {
    this.speed = 3;
  }

  dur(ms) {
    return Math.max(1, Math.round(ms / this.speed));
  }

  async play(events) {
    try {
      for (const event of events) {
        const animate = this.animations[event.type];
        if (!animate) continue;
        try {
          await animate(this.scene, event, this);
        } catch (e) {
          // A broken animation must never leave the scene stuck in "busy"
          console.warn(`Animation "${event.type}" failed:`, e);
        }
      }
    } finally {
      this.speed = 1;
    }
  }
}
