import { t, getLang } from '../i18n/index.js';

// Card display name in the current language (data holds the Russian name)
export function cardName(def) {
  const name = def.name ?? def.id;
  if (getLang() === 'ru') return name;
  const key = `cardname.${name}`;
  const translated = t(key);
  return translated === key ? name : translated;
}
