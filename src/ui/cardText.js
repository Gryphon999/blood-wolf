import { t, getLang } from '../i18n/index.js';

// Card display name in the current language (data holds the Russian name)
export function cardName(def) {
  if (getLang() !== 'ru') {
    const key = `card.${def.id}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return def.name ?? def.id;
}
