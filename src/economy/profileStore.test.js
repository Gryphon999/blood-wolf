import { describe, it, expect } from 'vitest';
import { saveProfile, loadProfile } from './profileStore.js';

function fakeStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
}

describe('profileStore', () => {
  it('round-trips a profile', () => {
    const s = fakeStorage();
    const profile = { gold: 120, collection: { knight: { count: 1, level: 2 } }, deck: ['knight'], faction: 'humans' };
    saveProfile(profile, s);
    expect(loadProfile(s)).toEqual(profile);
  });

  it('returns null when nothing is stored', () => {
    expect(loadProfile(fakeStorage())).toBeNull();
  });

  it('returns null on corrupt data', () => {
    const s = fakeStorage();
    s.setItem('blood-wolf-profile', '{not json');
    expect(loadProfile(s)).toBeNull();
  });
});
