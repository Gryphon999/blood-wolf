const KEY = 'blood-wolf-profile';

export function saveProfile(profile, storage = globalThis.localStorage) {
  storage.setItem(KEY, JSON.stringify(profile));
}

export function loadProfile(storage = globalThis.localStorage) {
  const raw = storage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
