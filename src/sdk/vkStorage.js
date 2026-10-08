// VK keeps per-user key-value storage with values up to 4096 bytes, so the profile is split across
// numbered keys. 1000 UTF-16 units never exceed 4096 bytes, whatever the characters.
export const PART = 1000;
export const MAX_PARTS = 60;
export const KEY_COUNT = 'profile_n';
export const KEY_PART = 'profile_';

export function splitSave(json) {
  const parts = [];
  for (let i = 0; i < json.length; i += PART) parts.push(json.slice(i, i + PART));
  return parts;
}

export function partKeys(n) {
  return Array.from({ length: Math.min(n, MAX_PARTS) }, (_, i) => `${KEY_PART}${i}`);
}
