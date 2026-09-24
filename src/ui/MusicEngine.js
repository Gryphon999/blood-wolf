import { getCtx, isAudioPaused } from './SoundEngine.js';

// Procedural background music: a look-ahead scheduler plays short synth notes.
// Two themes; each is a chord loop with a pad, a bass line and an arpeggio.
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI → Hz

export const THEMES = {
  // Witcher-like tavern mood: Am – F – Dm – E at 52 bpm, slow arpeggio and a plucked lute melody
  menu: {
    bpm: 52,
    chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
    arp: [0, 1, 2, 1, 0],
    arpOctave: 12,
    bass: true,
    pulse: false,
    padType: 'triangle',
    leadType: 'sine',
    lute: true,
    lutePattern: [2, 0, 1, 2, 1, 0, 2, 1], // chord-tone indices
    luteOctave: 24,
  },
  // Tense: Dm – Bb – C – A at 96 bpm with a pulse bass, a soft kick and the lute
  battle: {
    bpm: 96,
    chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
    arp: [0, 2, 1, 2, 0, 2, 1, 2],
    arpOctave: 24,
    bass: true,
    pulse: true,
    padType: 'sawtooth',
    leadType: 'triangle',
    lute: true,
    lutePattern: [0, 2, 1, 0, 2],
    luteOctave: 12,
  },
};

// Pure: the notes of one bar (used by the scheduler and by tests)
export function barNotes(theme, barIndex) {
  const chord = theme.chords[barIndex % theme.chords.length];
  const beat = 60 / theme.bpm;
  const bar = beat * 4;
  const notes = [];
  chord.forEach((n) => notes.push({ at: 0, dur: bar, midi: n, kind: 'pad' }));
  const step = bar / theme.arp.length;
  theme.arp.forEach((idx, i) => notes.push({ at: i * step, dur: step * 0.9, midi: chord[idx] + theme.arpOctave, kind: 'lead' }));
  if (theme.bass) {
    const hits = theme.pulse ? 8 : 2;
    for (let i = 0; i < hits; i++) notes.push({ at: (i * bar) / hits, dur: (bar / hits) * 0.8, midi: chord[0] - 12, kind: 'bass' });
  }
  if (theme.pulse) for (let i = 0; i < 4; i++) notes.push({ at: i * beat, dur: 0.18, midi: 0, kind: 'kick' });
  if (theme.lute && theme.lutePattern) {
    const luteStep = bar / theme.lutePattern.length;
    theme.lutePattern.forEach((idx, i) => notes.push({
      at: i * luteStep, dur: luteStep * 0.5, midi: chord[idx % chord.length] + theme.luteOctave, kind: 'lute',
    }));
  }
  return { notes, length: bar };
}

let bus = null;
let volume = 0.5;
let current = null;   // theme name
let timer = null;
let nextBarAt = 0;
let barIndex = 0;

// Cheap reverb: two feedback delay lines mixed back in as a wet signal
function addReverb(c, input) {
  const delay1 = c.createDelay(0.5);
  const delay2 = c.createDelay(0.3);
  delay1.delayTime.value = 0.37;
  delay2.delayTime.value = 0.23;
  const fb1 = c.createGain(); fb1.gain.value = 0.25;
  const fb2 = c.createGain(); fb2.gain.value = 0.18;
  const wetGain = c.createGain(); wetGain.gain.value = 0.28;
  input.connect(delay1); delay1.connect(fb1); fb1.connect(delay1); delay1.connect(wetGain);
  input.connect(delay2); delay2.connect(fb2); fb2.connect(delay2); delay2.connect(wetGain);
  wetGain.connect(c.destination);
}

function musicBus() {
  const c = getCtx();
  if (!bus) {
    bus = c.createGain();
    bus.gain.value = volume * 0.35;
    bus.connect(c.destination);
    addReverb(c, bus); // wet level follows the music volume because it taps the bus
  }
  return bus;
}

function voice(c, note, t0) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const theme = THEMES[current];
  if (note.kind === 'lute') {
    // Plucked string: sharp attack, fast exponential decay
    osc.type = 'triangle';
    osc.frequency.value = NOTE(note.midi);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.18, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur * 0.7);
    osc.connect(gain);
    gain.connect(musicBus());
    osc.start(t0);
    osc.stop(t0 + note.dur + 0.05);
    return;
  }
  const peak = { pad: 0.05, lead: 0.07, bass: 0.12, kick: 0.25 }[note.kind];
  if (note.kind === 'kick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + note.dur);
  } else {
    osc.type = note.kind === 'pad' ? theme.padType : note.kind === 'bass' ? 'square' : theme.leadType;
    osc.frequency.value = NOTE(note.midi);
  }
  const attack = note.kind === 'pad' ? 0.4 : 0.01;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(attack, note.dur / 2));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);
  osc.connect(gain);
  gain.connect(musicBus());
  osc.start(t0);
  osc.stop(t0 + note.dur + 0.05);
}

function schedule() {
  if (!current || isAudioPaused()) return;
  const c = getCtx();
  if (c.state !== 'running') return;
  while (nextBarAt < c.currentTime + 0.6) {
    const { notes, length } = barNotes(THEMES[current], barIndex++);
    notes.forEach((n) => voice(c, n, nextBarAt + n.at));
    nextBarAt += length;
  }
}

export const music = {
  play(theme) {
    if (!THEMES[theme] || current === theme) return;
    current = theme;
    barIndex = 0;
    try {
      const c = getCtx();
      nextBarAt = c.currentTime + 0.1;
      if (!timer) timer = setInterval(schedule, 150);
      schedule();
    } catch { /* no Web Audio */ }
  },
  stop() {
    current = null;
  },
  setVolume(v) {
    volume = v;
    if (bus) bus.gain.value = v * 0.35;
  },
  // After a pause the clock jumped: restart bars from "now"
  resync() {
    try { nextBarAt = getCtx().currentTime + 0.1; } catch { /* no Web Audio */ }
  },
};
