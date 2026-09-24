// Player settings, stored in the profile (and so in the Yandex cloud save)
export const DEFAULT_SETTINGS = {
  volume: 0.8,        // sound effects 0..1
  music: 0.5,         // background music 0..1
  speedUp: true,      // a click during animations speeds them up
  reduceMotion: false, // no screen shake, fades or particles bursts on legendaries
  lang: null,         // null = follow the Yandex SDK language
};

const RU_LANGS = ['ru', 'be', 'kk', 'uk', 'uz'];

export function getSettings(profile) {
  return { ...DEFAULT_SETTINGS, ...(profile.settings ?? {}) };
}

export function updateSettings(profile, patch) {
  profile.settings = { ...getSettings(profile), ...patch };
  return profile.settings;
}

// Explicit choice wins; otherwise Russian-speaking Yandex locales get ru, everyone else en
export function resolveLang(chosen, sdkLang) {
  if (chosen) return chosen;
  if (!sdkLang) return 'ru';
  return RU_LANGS.includes(sdkLang) ? 'ru' : 'en';
}

export function stepVolume(value, delta) {
  return Math.round(Math.min(1, Math.max(0, value + delta)) * 10) / 10;
}
