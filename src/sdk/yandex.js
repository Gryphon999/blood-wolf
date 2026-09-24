let ysdk = null;
let player = null;

export async function initYandex() {
  if (!window.YaGames) return;
  try {
    ysdk = await YaGames.init();
    player = await ysdk.getPlayer();
    const data = await player.getData(['profile']);
    if (data.profile) {
      localStorage.setItem('blood-wolf-profile', JSON.stringify(data.profile));
    }
  } catch {
    // Outside Yandex Games iframe (local dev) — continue without SDK
  }
}

export function cloudSave(profile) {
  if (!player) return;
  player.setData({ profile }).catch(() => {});
}

// The existing Yandex leaderboard now ranks arena points (see notes/layer-15.md)
export const LEADERBOARD = 'might';

export function recordWin(profile) {
  if (!ysdk) return;
  ysdk.getLeaderboards()
    .then(lb => lb.setLeaderboardScore(LEADERBOARD, profile.rank?.points ?? 0))
    .catch(() => {});
}

// Top entries + the player's own; null outside Yandex Games
export async function fetchLeaderboard(top = 10) {
  if (!ysdk) return null;
  try {
    const lb = await ysdk.getLeaderboards();
    const res = await lb.getLeaderboardEntries(LEADERBOARD, { quantityTop: top, includeUser: true, quantityAround: 2 });
    const me = res.userRank;
    return res.entries.map((e) => ({
      rank: e.rank,
      name: e.player?.publicName || '—',
      score: e.score,
      isMe: e.rank === me,
    }));
  } catch {
    return null;
  }
}

// Language from the Yandex environment (ru, en, tr, ...), null outside Yandex Games
export function sdkLang() {
  return ysdk?.environment?.i18n?.lang ?? null;
}

export function showInterstitial(onClose) {
  if (!ysdk) { onClose(); return; }
  ysdk.adv.showFullscreenAdv({ callbacks: { onClose } });
}

export function showChest(onReward) {
  if (!ysdk) { onReward(); return; }
  ysdk.adv.showRewardedVideo({
    callbacks: {
      onRewarded: () => onReward(),
      onClose: () => {},
    },
  });
}

// Yandex asks games to pause (ads, tab switch inside the app); returns nothing outside Yandex
export function onSdkPause(onPause, onResume) {
  if (!ysdk?.on) return;
  try {
    ysdk.on('game_api_pause', onPause);
    ysdk.on('game_api_resume', onResume);
  } catch { /* older SDK */ }
}

// Tell Yandex the game has loaded (required for moderation)
export function gameReady() {
  try { ysdk?.features?.LoadingAPI?.ready(); } catch { /* not in Yandex */ }
}
