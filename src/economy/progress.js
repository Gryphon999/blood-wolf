import { applySummaryToQuests } from './quests.js';
import { checkAchievements } from './achievements.js';
import { applyRankResult } from './rank.js';

// Book-keeping after a finished battle: stats, streaks, quests, arena rank, achievements.
// result: 'win' | 'loss' | 'draw'. Gold rewards for the battle itself are paid by the caller.
export function recordMatch(profile, { result, summary, difficulty = 'normal', arena = false }) {
  const stats = { ...(profile.stats ?? {}) };
  const won = result === 'win';
  stats.matches = (stats.matches ?? 0) + 1;
  if (won) {
    profile.wins = (profile.wins ?? 0) + 1;
    stats.winStreak = (stats.winStreak ?? 0) + 1;
    stats.bestStreak = Math.max(stats.bestStreak ?? 0, stats.winStreak);
    if (difficulty === 'hard') stats.hardWins = (stats.hardWins ?? 0) + 1;
    if (summary.roundsLost === 0) stats.flawlessWins = (stats.flawlessWins ?? 0) + 1;
  } else {
    stats.winStreak = 0;
    if (result === 'loss') stats.losses = (stats.losses ?? 0) + 1;
  }
  stats.spiesPlayed = (stats.spiesPlayed ?? 0) + summary.spiesPlayed;
  profile.stats = stats;

  applySummaryToQuests(profile, { ...summary, wins: won ? 1 : 0, arenaWins: won && arena ? 1 : 0 });
  const rankDelta = arena ? applyRankResult(profile, result, difficulty) : 0;
  const unlocked = checkAchievements(profile);
  return { rankDelta, unlocked };
}
