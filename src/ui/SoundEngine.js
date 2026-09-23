let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, type, dur, vol = 0.22, delay = 0) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = c.currentTime + delay;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  } catch { /* audio context unavailable */ }
}

export const sfx = {
  cardMelee:  () => { tone(95, 'sawtooth', 0.13, 0.4); tone(170, 'sine', 0.08, 0.18, 0.04); },
  cardRanged: () => { tone(620, 'sine', 0.04, 0.14); tone(920, 'sine', 0.05, 0.07, 0.02); tone(380, 'sine', 0.04, 0.16, 0.07); },
  cardSiege:  () => { tone(65, 'square', 0.22, 0.38); tone(105, 'sawtooth', 0.09, 0.26, 0.06); },
  cardSpecial:() => { tone(440, 'sine', 0.28, 0.14); tone(660, 'sine', 0.18, 0.09, 0.09); tone(880, 'sine', 0.1, 0.07, 0.18); },
  damage:     () => { tone(200, 'sawtooth', 0.07, 0.32); tone(145, 'sawtooth', 0.05, 0.11, 0.06); },
  heal:       () => { tone(523, 'sine', 0.22, 0.17); tone(659, 'sine', 0.18, 0.14, 0.11); tone(784, 'sine', 0.12, 0.11, 0.22); },
  order:      () => { tone(1047, 'sine', 0.11, 0.13); tone(1319, 'sine', 0.07, 0.09, 0.08); },
  pass:       () => { tone(220, 'sine', 0.42, 0.26); tone(185, 'sine', 0.18, 0.48, 0.22); },
  roundWin:   () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.38, 0.2, i * 0.14)); },
  roundLose:  () => { tone(220, 'sine', 0.5, 0.28); tone(185, 'sine', 0.28, 0.6, 0.26); tone(147, 'sine', 0.18, 0.8, 0.52); },
  weather:    () => { tone(75, 'sine', 0.95, 0.16); tone(115, 'sine', 0.65, 0.11, 0.12); },
  scorch:     () => { [180, 260, 340, 260, 180].forEach((f, i) => tone(f, 'sawtooth', 0.14, 0.28, i * 0.07)); },
  click:      () => tone(680, 'sine', 0.05, 0.06),
};
