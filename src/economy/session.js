import { loadProfile, saveProfile } from './profileStore.js';
import { createProfile, normalizeProfile } from './profile.js';
import { cloudSave } from '../sdk/yandex.js';

let profile = null;

export function getProfile() {
  if (!profile) {
    profile = normalizeProfile(loadProfile() ?? createProfile());
  }
  return profile;
}

export function persist() {
  saveProfile(getProfile());
  cloudSave(getProfile());
}
