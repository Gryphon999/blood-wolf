// Arena rank: points for wins/losses, tiers for display, synced to the Yandex leaderboard.
export const RANK_TIERS = [
  { id: 'bronze', min: 0, icon: 'medal', color: 0xc07a45 },
  { id: 'silver', min: 300, icon: 'medal', color: 0xc9ccd2 },
  { id: 'gold', min: 700, icon: 'medal', color: 0xf0c548 },
  { id: 'platinum', min: 1200, icon: 'gem', color: 0x8fd6e0 },
  { id: 'diamond', min: 2000, icon: 'gem', color: 0xb5e2ff },
  { id: 'legend', min: 3000, icon: 'wolf', color: 0xe05a4a },
];

export const WIN_POINTS = { easy: 15, normal: 25, hard: 35 };
export const LOSS_POINTS = 15;

export function tierOf(points) {
  return [...RANK_TIERS].reverse().find((t) => points >= t.min) ?? RANK_TIERS[0];
}

export function nextTier(points) {
  return RANK_TIERS.find((t) => t.min > points) ?? null;
}

// result: 'win' | 'loss' | 'draw'. Returns the point change.
export function applyRankResult(profile, result, difficulty = 'normal') {
  const rank = profile.rank ?? { points: 0, best: 0 };
  const before = rank.points;
  if (result === 'win') rank.points += WIN_POINTS[difficulty] ?? WIN_POINTS.normal;
  else if (result === 'loss') rank.points = Math.max(0, rank.points - LOSS_POINTS);
  rank.best = Math.max(rank.best, rank.points);
  profile.rank = rank;
  return rank.points - before;
}
