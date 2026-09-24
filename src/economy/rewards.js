// Gold multipliers per AI difficulty
export const DIFFICULTY_MULT = { easy: 0.75, normal: 1, hard: 1.5 };

export function rewardFor(base, difficulty = 'normal') {
  return Math.round(base * (DIFFICULTY_MULT[difficulty] ?? 1));
}

// The menu chest (rewarded ad) has a cooldown so it cannot be farmed by clicking
export const CHEST_COOLDOWN_MS = 3 * 60 * 1000;

export function chestReadyIn(profile, now = Date.now()) {
  if (!profile.lastChestAt) return 0;
  return Math.max(0, profile.lastChestAt + CHEST_COOLDOWN_MS - now);
}
