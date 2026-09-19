import { loadProfile, saveProfile } from './profileStore.js';
import { createProfile } from './profile.js';
import { cloudSave } from '../sdk/yandex.js';

let profile = null;

export function getProfile() {
  if (!profile) {
    profile = loadProfile() ?? createProfile();
  }
  return profile;
}

export function persist() {
  saveProfile(getProfile());
  cloudSave(getProfile());
}
