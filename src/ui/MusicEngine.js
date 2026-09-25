import { getCtx, isAudioPaused } from './SoundEngine.js';

/**
 * Gwent-style orchestral background music.
 * No percussion, no beats. Two moods:
 *   menu   — slow, calm, tavern lute + string pad (52 BPM, D minor / Dorian)
 *   battle — tense, dark, Phrygian mood (62 BPM, D Phrygian) — still no drums
 *
 * Instruments:
 *   lute   — Karplus-Strong pluck (sharp attack, exponential decay + LP resonance)
 *   pad    — slow bowed strings (triangle/sine, soft attack 400ms)
 *   bass   — cello pizzicato (similar to lute, one octave down)
 *   lead   — flute/violin solo (sine with gentle vibrato)
 */
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI → Hz

export const THEMES = {
  // Am – F – Dm – Em: slow 52 BPM, Dorian warmth, tavern-like
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
    lutePattern: [2, 0, 1, 2, 1, 0, 2, 1],
    luteOctave: 24,
  },
  // Dm – Bb – Gm – A: 62 BPM, Phrygian darkness — NO kick, NO pulse
  battle: {
    bpm: 62,
    chords: [[50, 53, 57], [46, 50, 53], [43, 47, 50], [45, 49, 52]],
    arp: [0, 2, 1, 2, 0],
    arpOctave: 12,
    bass: true,
    pulse: false,
    padType: 'sine',
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
    // Two slow cello bass hits per bar (no pulse, no machine-gun)
    for (let i = 0; i < 2; i++) notes.push({ at: (i * bar) / 2, dur: (bar / 2) * 0.8, midi: chord[0] - 12, kind: 'bass' });
  }
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
let current = null;
let timer = null;
let nextBarAt = 0;
let barIndex = 0;

// Room reverb via ConvolverNode with a synthetic impulse response
// (no audio files needed, works offline)
let _convolver = null;
function buildImpulse(c, durationSec, decay) {
  const rate = c.sampleRate;
  const len = Math.floor(rate * durationSec);
  const buf = c.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay * 4);
    }
  }
  return buf;
}

function getReverb(c) {
  if (_convolver) return _convolver;
  _convolver = c.createConvolver();
  _convolver.buffer = buildImpulse(c, 2.2, 0.65);
  const wetGain = c.createGain();
  wetGain.gain.value = 0.32;
  _convolver.connect(wetGain);
  wetGain.connect(c.destination);
  return _convolver;
}

function musicBus() {
  const c = getCtx();
  if (!bus) {
    bus = c.createGain();
    bus.gain.value = volume * 0.35;
    bus.connect(c.destination);
    bus.connect(getReverb(c));
  }
  return bus;
}

// Karplus-Strong lute pluck: noise burst → LP filter → exponential decay
function karplusPluck(c, freq, t0, vol = 0.20) {
  try {
    const period = Math.max(2, Math.round(c.sampleRate / freq));
    const noise = c.createBuffer(1, period, c.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < period; i++) nd[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = false;

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(freq * 6, 8000);
    lp.Q.value = 0.4;

    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t0);
    // Decay time: higher notes decay faster (like a real string)
    const decayTime = 0.3 + 50 / freq;
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(musicBus());

    src.start(t0);
    src.stop(t0 + decayTime + 0.05);
  } catch { /* context not available */ }
}

// Bowed string (pad, lead, bass) with vibrato on 'lead'
function bowedString(c, note, t0) {
  const theme = THEMES[current];
  const freq = NOTE(note.midi);
  const osc = c.createOscillator();
  const gain = c.createGain();

  if (note.kind === 'lead') {
    // Flute/violin solo: sine + gentle vibrato LFO
    osc.type = theme.leadType;
    osc.frequency.value = freq;
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.0;
    const lfoGain = c.createGain();
    lfoGain.gain.value = freq * 0.006;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + note.dur + 0.1);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.07, t0 + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);
  } else if (note.kind === 'pad') {
    // String pad: very slow attack, sustained, quiet
    osc.type = theme.padType;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.045, t0 + Math.min(0.45, note.dur * 0.4));
    gain.gain.setValueAtTime(0.045, t0 + note.dur - 0.4);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + note.dur);
  } else {
    // Bass: short cello pizzicato (low, warm)
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.10, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur * 0.7);
  }

  osc.connect(gain);
  gain.connect(musicBus());
  osc.start(t0);
  osc.stop(t0 + note.dur + 0.1);
}

function voice(c, note, t0) {
  if (note.kind === 'lute') {
    karplusPluck(c, NOTE(note.midi), t0, 0.18);
  } else {
    bowedString(c, note, t0);
  }
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
  resync() {
    try { nextBarAt = getCtx().currentTime + 0.1; } catch { /* no Web Audio */ }
  },
};
