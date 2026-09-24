import { describe, it, expect } from 'vitest';
import { THEMES, barNotes } from './MusicEngine.js';

describe('procedural music', () => {
  it('has a menu and a battle theme', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['battle', 'menu']);
  });

  it('bars loop through the chords and fit inside the bar length', () => {
    for (const theme of Object.values(THEMES)) {
      const { notes, length } = barNotes(theme, 0);
      expect(length).toBeCloseTo((60 / theme.bpm) * 4);
      for (const n of notes) expect(n.at + n.dur).toBeLessThanOrEqual(length + 1e-9);
      expect(barNotes(theme, theme.chords.length).notes).toEqual(notes);
    }
  });

  it('only the battle theme has a kick pulse', () => {
    expect(barNotes(THEMES.battle, 0).notes.some((n) => n.kind === 'kick')).toBe(true);
    expect(barNotes(THEMES.menu, 0).notes.some((n) => n.kind === 'kick')).toBe(false);
  });
});
