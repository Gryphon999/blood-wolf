import { getSettings, resolveLang } from '../economy/settings.js';
import { setLang } from '../i18n/index.js';
import { sdkLang } from '../sdk/yandex.js';
import { setSfxVolume } from './SoundEngine.js';
import { music } from './MusicEngine.js';
import { setVoiceVolume } from './VoiceEngine.js';

// Push the profile's settings into the language, audio and the game registry
export function applySettings(game, profile) {
  const s = getSettings(profile);
  setLang(resolveLang(s.lang, sdkLang()));
  setSfxVolume(s.volume);
  music.setVolume(s.music);
  setVoiceVolume(s.voice ?? 0.9);
  game.registry.set('reduceMotion', s.reduceMotion);
  game.registry.set('speedUp', s.speedUp);
  return s;
}
