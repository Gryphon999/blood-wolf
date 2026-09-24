// 15 achievements: icon, gold reward and a check on the profile. Names live in src/i18n.
const stat = (p, key) => p.stats?.[key] ?? 0;
const collected = (p) => Object.keys(p.collection ?? {}).length;

export const ACHIEVEMENTS = [
  { id: 'first_win',   icon: '🏆', reward: 50,  check: (p) => (p.wins ?? 0) >= 1 },
  { id: 'wins_10',     icon: '⚔',  reward: 150, check: (p) => (p.wins ?? 0) >= 10 },
  { id: 'wins_50',     icon: '👑', reward: 500, check: (p) => (p.wins ?? 0) >= 50 },
  { id: 'streak_3',    icon: '🔥', reward: 100, check: (p) => stat(p, 'bestStreak') >= 3 },
  { id: 'streak_10',   icon: '🌋', reward: 400, check: (p) => stat(p, 'bestStreak') >= 10 },
  { id: 'collect_20',  icon: '📚', reward: 150, check: (p) => collected(p) >= 20 },
  { id: 'collect_40',  icon: '🗃',  reward: 300, check: (p) => collected(p) >= 40 },
  { id: 'first_pack',  icon: '🎴', reward: 50,  check: (p) => stat(p, 'packsOpened') >= 1 },
  { id: 'packs_10',    icon: '🎁', reward: 200, check: (p) => stat(p, 'packsOpened') >= 10 },
  { id: 'golden_1',    icon: '✨', reward: 100, check: (p) => stat(p, 'goldenMade') >= 1 },
  { id: 'story_5',     icon: '🗺',  reward: 200, check: (p) => (p.story?.cleared ?? 0) >= 5 },
  { id: 'story_10',    icon: '🐺', reward: 500, check: (p) => (p.story?.cleared ?? 0) >= 10 },
  { id: 'hard_win',    icon: '💀', reward: 150, check: (p) => stat(p, 'hardWins') >= 1 },
  { id: 'flawless',    icon: '🛡',  reward: 100, check: (p) => stat(p, 'flawlessWins') >= 1 },
  { id: 'spy_master',  icon: '🕵', reward: 100, check: (p) => stat(p, 'spiesPlayed') >= 10 },
];

// Unlocks every newly met achievement, pays its gold, returns the new ones
export function checkAchievements(profile) {
  profile.achievements = profile.achievements ?? {};
  const unlocked = ACHIEVEMENTS.filter((a) => !profile.achievements[a.id] && a.check(profile));
  for (const a of unlocked) {
    profile.achievements[a.id] = true;
    profile.gold += a.reward;
  }
  return unlocked;
}
