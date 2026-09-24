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

describe('lute melody', () => {
  it('both themes pluck one lute note per pattern step, on chord tones', () => {
    for (const theme of Object.values(THEMES)) {
      const { notes } = barNotes(theme, 1);
      const lute = notes.filter((n) => n.kind === 'lute');
      expect(lute).toHaveLength(theme.lutePattern.length);
      const chord = theme.chords[1].map((n) => n + theme.luteOctave);
      for (const n of lute) expect(chord).toContain(n.midi);
    }
  });
});
