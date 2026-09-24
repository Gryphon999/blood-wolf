import { ru } from './ru.js';
import { en } from './en.js';

const DICTS = { ru, en };
export const LANGS = Object.keys(DICTS);
let lang = 'ru';

export function setLang(next) {
  lang = DICTS[next] ? next : 'ru';
}

export function getLang() {
  return lang;
}

// Missing keys fall back to Russian, then to the key itself
export function t(key, params = {}) {
  const entry = DICTS[lang][key] ?? DICTS.ru[key] ?? key;
  if (typeof entry === 'function') return entry(params);
  return entry.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}
