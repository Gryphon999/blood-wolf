let ysdk = null;
let player = null;

export async function initYandex() {
  if (!window.YaGames) return;
  ysdk = await YaGames.init();
  player = await ysdk.getPlayer();
  const data = await player.getData(['profile']);
  if (data.profile) {
    localStorage.setItem('blood-wolf-profile', JSON.stringify(data.profile));
  }
}

export function cloudSave(profile) {
  if (!player) return;
  player.setData({ profile }).catch(() => {});
}

export function recordWin(profile) {
  if (!ysdk) return;
  ysdk.getLeaderboards()
    .then(lb => lb.setLeaderboardScore('might', profile.wins))
    .catch(() => {});
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
