let ctx = null;
let sfxBus = null;
let sfxVolume = 0.8;

export function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function bus() {
  const c = getCtx();
  if (!sfxBus) {
    sfxBus = c.createGain();
    sfxBus.gain.value = sfxVolume;
    sfxBus.connect(c.destination);
  }
  return sfxBus;
}

let paused = false;

export function setAudioPaused(value) {
  paused = value;
  if (!ctx) return;
  if (value) ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
}

export function isAudioPaused() { return paused; }

export function setSfxVolume(v) {
  sfxVolume = v;
  if (sfxBus) sfxBus.gain.value = v;
}

// ── Primitive helpers ─────────────────────────────────────────────────────

function tone(freq, type, dur, vol = 0.22, delay = 0) {
  if (sfxVolume <= 0 || paused) return;
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume().catch(() => {});
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(bus());
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = c.currentTime + delay;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  } catch { /* audio context unavailable */ }
}

// White-noise buffer through a biquad filter
function noisePlay(filterType, filterFreq, filterQ, vol, dur, delay = 0) {
  if (sfxVolume <= 0 || paused) return;
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume().catch(() => {});
    const len = Math.ceil(c.sampleRate * (dur + 0.15));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;

    const filt = c.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = filterFreq;
    filt.Q.value = filterQ;

    const gain = c.createGain();
    const t0 = c.currentTime + delay;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(bus());
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch {}
}

// ── Animal sounds ─────────────────────────────────────────────────────────

function wolfHowl() {
  if (sfxVolume <= 0 || paused) return;
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t0 = c.currentTime;

    const osc = c.createOscillator();
    const gain = c.createGain();
    const lfo = c.createOscillator();
    const lfoG = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t0);
    osc.frequency.linearRampToValueAtTime(650, t0 + 0.45);
    osc.frequency.linearRampToValueAtTime(480, t0 + 1.1);
    osc.frequency.linearRampToValueAtTime(310, t0 + 1.7);

    lfo.frequency.value = 5.8;
    lfoG.gain.value = 22;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.38, t0 + 0.32);
    gain.gain.setValueAtTime(0.35, t0 + 1.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);

    osc.connect(gain);
    gain.connect(bus());
    lfo.start(t0);    lfo.stop(t0 + 2.0);
    osc.start(t0);    osc.stop(t0 + 2.0);

    // Harmonic (overtone doubles the realism)
    const osc2 = c.createOscillator();
    const g2 = c.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, t0);
    osc2.frequency.linearRampToValueAtTime(1300, t0 + 0.45);
    osc2.frequency.linearRampToValueAtTime(960, t0 + 1.1);
    osc2.frequency.linearRampToValueAtTime(620, t0 + 1.7);
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.linearRampToValueAtTime(0.14, t0 + 0.35);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
    osc2.connect(g2);
    g2.connect(bus());
    osc2.start(t0);   osc2.stop(t0 + 1.9);
  } catch {}
}

function growl() {
  if (sfxVolume <= 0 || paused) return;
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t0 = c.currentTime;

    // Throat rumble: low sawtooth with tremolo LFO
    const osc = c.createOscillator();
    const gain = c.createGain();
    const lfo = c.createOscillator();
    const lfoG = c.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(62, t0);
    osc.frequency.linearRampToValueAtTime(48, t0 + 0.5);

    lfo.frequency.value = 14;
    lfoG.gain.value = 0.22;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);

    gain.gain.setValueAtTime(0.48, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);

    osc.connect(gain);
    gain.connect(bus());
    lfo.start(t0);    lfo.stop(t0 + 0.6);
    osc.start(t0);    osc.stop(t0 + 0.6);

    // Chest air noise
    noisePlay('lowpass', 280, 0.9, 0.28, 0.5);
    tone(95, 'sawtooth', 0.35, 0.22, 0.05);
  } catch {}
}

function screech() {
  if (sfxVolume <= 0 || paused) return;
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t0 = c.currentTime;

    const osc = c.createOscillator();
    const gain = c.createGain();
    const lfo = c.createOscillator();
    const lfoG = c.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t0);
    osc.frequency.linearRampToValueAtTime(1900, t0 + 0.14);
    osc.frequency.linearRampToValueAtTime(1300, t0 + 0.38);

    lfo.frequency.value = 28;
    lfoG.gain.value = 110;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);

    gain.gain.setValueAtTime(0.28, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.48);

    osc.connect(gain);
    gain.connect(bus());
    lfo.start(t0);    lfo.stop(t0 + 0.55);
    osc.start(t0);    osc.stop(t0 + 0.55);

    noisePlay('bandpass', 2800, 2.5, 0.18, 0.3);
  } catch {}
}

function hiss() {
  noisePlay('bandpass', 4500, 4.0, 0.35, 0.5);
  noisePlay('bandpass', 2800, 2.0, 0.20, 0.4, 0.06);
}

// ── Ability sound effects ─────────────────────────────────────────────────

function lightning() {
  if (sfxVolume <= 0 || paused) return;
  // Electric crack burst
  noisePlay('bandpass', 3500, 1.2, 0.55, 0.06);
  noisePlay('bandpass', 1800, 1.5, 0.42, 0.12, 0.04);
  // Thunder rumble
  noisePlay('lowpass', 110, 0.6, 0.45, 0.9, 0.08);
  tone(48, 'sine', 1.1, 0.28, 0.1);
  tone(62, 'sine', 0.6, 0.18, 0.18);
}

function frost() {
  // Crystalline shimmer tones
  [2093, 2637, 3136, 4186].forEach((f, i) => tone(f, 'sine', 0.5 - i * 0.04, 0.13, i * 0.07));
  // Ice-crack noise burst
  noisePlay('bandpass', 2400, 3.0, 0.32, 0.10, 0.04);
  // Cold wind undertone
  noisePlay('bandpass', 600, 0.35, 0.16, 0.75, 0.18);
  tone(880, 'triangle', 0.35, 0.08, 0.1);
}

function fireCrackle() {
  // Fire base: lowpass noise
  noisePlay('lowpass', 380, 0.7, 0.38, 0.8);
  noisePlay('bandpass', 1100, 1.8, 0.22, 0.55, 0.08);
  // Snap / pop
  tone(180, 'sawtooth', 0.07, 0.42);
  tone(260, 'sawtooth', 0.05, 0.32, 0.09);
  tone(140, 'sawtooth', 0.06, 0.28, 0.22);
}

function healShimmer() {
  // Ascending bright arpeggio
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 'sine', 0.38 - i * 0.03, 0.16, i * 0.09));
  // High sparkle twinkles
  [2093, 2637, 3136].forEach((f, i) => tone(f, 'sine', 0.18, 0.09, 0.3 + i * 0.08));
  noisePlay('highpass', 4000, 1.5, 0.10, 0.35, 0.25);
}

function weatherFog() {
  // Deep wind whoosh
  noisePlay('bandpass', 320, 0.4, 0.28, 1.2);
  noisePlay('bandpass', 160, 0.3, 0.20, 1.0, 0.25);
  tone(72, 'sine', 1.0, 0.14);
}

function weatherRain() {
  // Rain patter: many staggered noise bursts
  for (let i = 0; i < 10; i++) {
    const freq = 2800 + Math.random() * 2200;
    noisePlay('bandpass', freq, 3.5, 0.08 + Math.random() * 0.12, 0.04, i * 0.07);
  }
  // Background rain hiss
  noisePlay('highpass', 1800, 0.3, 0.18, 0.9);
}

function weatherFrost() {
  frost();
  tone(65, 'sine', 1.0, 0.18, 0.05);
}

function bloodRitual() {
  // Dark ominous drone
  tone(55, 'sawtooth', 1.2, 0.32);
  [73, 87, 73, 65].forEach((f, i) => tone(f, 'sine', 0.45, 0.22, i * 0.18));
  noisePlay('lowpass', 180, 0.6, 0.22, 0.55, 0.28);
}

function darkness() {
  // Fog + frost combo: ominous layered wind
  weatherFog();
  tone(55, 'triangle', 0.9, 0.18, 0.1);
  noisePlay('bandpass', 500, 0.5, 0.15, 0.8, 0.3);
}

// ── Exports ───────────────────────────────────────────────────────────────

export const sfx = {
  cardMelee:    () => { tone(95, 'sawtooth', 0.13, 0.4); tone(170, 'sine', 0.08, 0.18, 0.04); },
  cardRanged:   () => { tone(620, 'sine', 0.04, 0.14); tone(920, 'sine', 0.05, 0.07, 0.02); tone(380, 'sine', 0.04, 0.16, 0.07); },
  cardSiege:    () => { tone(65, 'square', 0.22, 0.38); tone(105, 'sawtooth', 0.09, 0.26, 0.06); },
  cardSpecial:  () => { tone(440, 'sine', 0.28, 0.14); tone(660, 'sine', 0.18, 0.09, 0.09); tone(880, 'sine', 0.1, 0.07, 0.18); },
  damage:       () => { tone(200, 'sawtooth', 0.07, 0.32); tone(145, 'sawtooth', 0.05, 0.11, 0.06); },
  heal:         healShimmer,
  order:        () => { tone(1047, 'sine', 0.11, 0.13); tone(1319, 'sine', 0.07, 0.09, 0.08); },
  pass:         () => { tone(220, 'sine', 0.42, 0.26); tone(185, 'sine', 0.18, 0.48, 0.22); },
  roundWin:     () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.38, 0.2, i * 0.14)); },
  roundLose:    () => { tone(220, 'sine', 0.5, 0.28); tone(185, 'sine', 0.28, 0.6, 0.26); tone(147, 'sine', 0.18, 0.8, 0.52); },
  weather:      weatherFrost,   // default weather (frost row = cold)
  weatherFog,
  weatherRain,
  weatherFrost,
  scorch:       fireCrackle,
  lightning,
  frost,
  fire:         fireCrackle,
  bloodRitual,
  darkness,
  healShimmer,
  click:        () => tone(680, 'sine', 0.05, 0.06),
  flip:         () => { tone(900, 'triangle', 0.04, 0.08); tone(500, 'triangle', 0.05, 0.06, 0.03); },
  rare:         () => { tone(660, 'sine', 0.2, 0.14); tone(990, 'sine', 0.18, 0.1, 0.08); },
  epic:         () => { [523, 784, 1047].forEach((f, i) => tone(f, 'triangle', 0.3, 0.14, i * 0.07)); },
  legendary:    () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 'sine', 0.5, 0.16, i * 0.08)); },
  wolfHowl,
  growl,
  screech,
  hiss,
};
