import { describe, it, expect, vi } from 'vitest';
import { AnimationQueue } from './AnimationQueue.js';

describe('AnimationQueue', () => {
  it('plays events strictly in order, awaiting each one', async () => {
    const log = [];
    const animations = {
      a: async (_s, ev) => { await new Promise((r) => setTimeout(r, 5)); log.push(`a${ev.n}`); },
      b: (_s, ev) => { log.push(`b${ev.n}`); },
    };
    const queue = new AnimationQueue(animations, {});
    await queue.play([{ type: 'a', n: 1 }, { type: 'b', n: 2 }, { type: 'a', n: 3 }]);
    expect(log).toEqual(['a1', 'b2', 'a3']);
  });

  it('skips event types without an animation', async () => {
    const queue = new AnimationQueue({}, {});
    await expect(queue.play([{ type: 'unknown' }])).resolves.toBeUndefined();
  });

  it('keeps going when one animation throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = [];
    const queue = new AnimationQueue({
      bad: () => { throw new Error('boom'); },
      ok: () => { log.push('ok'); },
    }, {});
    await queue.play([{ type: 'bad' }, { type: 'ok' }]);
    expect(log).toEqual(['ok']);
    warn.mockRestore();
  });

  it('speedUp shortens durations until the queue finishes', async () => {
    const seen = [];
    const queue = new AnimationQueue({ t: (_s, _e, q) => { seen.push(q.dur(300)); } }, {});
    queue.speedUp();
    await queue.play([{ type: 't' }]);
    expect(seen).toEqual([100]);
    expect(queue.dur(300)).toBe(300);
  });
});
