// The game's side of a web games portal. One build serves every portal: initPlatform() picks VK
// (signed vk_* launch parameters in the URL) or Yandex Games (its /sdk.js), and anywhere else
// (itch.io, GitHub Pages, local dev) every call quietly falls back to playing without a portal.
import { KEY_COUNT, KEY_PART, partKeys, splitSave } from './vkStorage.js';

const INIT_TIMEOUT_MS = 4000;
const PROFILE_KEY = 'blood-wolf-profile';

let portal = null; // 'yandex' | 'vk' | null
let ysdk = null;
let player = null;
let vk = null; // VK Bridge
let lang = null;
const pauseHandlers = [];

// What the portal glue did, for the ?vcdebug=1 overlay (main.js): checking a portal from inside its frame
export const diag = { platform: 'starting' };
const stamp = () => new Date().toTimeString().slice(0, 8);
const errMsg = (e) => (e instanceof Error ? e.message : JSON.stringify(e)).slice(0, 120);

function withTimeout(promise, ms = INIT_TIMEOUT_MS) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
}

function firePause(paused) {
  for (const [onPause, onResume] of pauseHandlers) (paused ? onPause : onResume)();
}

function applyCloudProfile(profile) {
  if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

async function initYandexPortal() {
  ysdk = await window.YaGames.init();
  player = await ysdk.getPlayer();
  const data = await player.getData(['profile']);
  applyCloudProfile(data.profile);
  diag.cloudLoad = data.profile ? 'found' : 'empty';
  lang = ysdk.environment?.i18n?.lang ?? null;
  try {
    ysdk.on('game_api_pause', () => firePause(true));
    ysdk.on('game_api_resume', () => firePause(false));
  } catch { /* older SDK */ }
}

async function initVkPortal() {
  const { default: bridge } = await import('@vkontakte/vk-bridge');
  await bridge.send('VKWebAppInit');
  vk = bridge;
  bridge.subscribe((e) => {
    if (e.detail.type === 'VKWebAppViewHide') firePause(true);
    else if (e.detail.type === 'VKWebAppViewRestore') firePause(false);
  });
  lang = new URLSearchParams(location.search).get('vk_language');
  try {
    const head = await bridge.send('VKWebAppStorageGet', { keys: [KEY_COUNT] });
    const n = Number(head.keys.find((k) => k.key === KEY_COUNT)?.value ?? 0);
    if (n > 0) {
      const keys = partKeys(n);
      const res = await bridge.send('VKWebAppStorageGet', { keys });
      const byKey = new Map(res.keys.map((k) => [k.key, k.value]));
      applyCloudProfile(JSON.parse(keys.map((k) => byKey.get(k) ?? '').join('')));
      diag.cloudLoad = `found (${n} parts)`;
    } else {
      diag.cloudLoad = 'empty';
    }
  } catch (e) {
    diag.cloudLoad = `error: ${errMsg(e)}`;
  }
}

export async function initPlatform() {
  try {
    if (/[?&]vk_app_id=/.test(location.search)) {
      portal = 'vk';
      if ((await withTimeout(initVkPortal().then(() => true))) !== true) throw new Error('VK Bridge timeout');
    } else if (window.YaGames) {
      portal = 'yandex';
      if ((await withTimeout(initYandexPortal().then(() => true))) !== true) throw new Error('Yandex SDK timeout');
    }
  } catch (e) {
    // Outside the portal's frame (local dev, a direct link) — continue without it
    diag.initError = errMsg(e);
    portal = null;
    ysdk = null;
    player = null;
    vk = null;
  }
  diag.platform = portal ? `${portal} (lang ${lang ?? '-'})` : 'none';
}

export function cloudSave(profile) {
  if (portal === 'yandex' && player) {
    player.setData({ profile }).catch(() => {});
  } else if (portal === 'vk' && vk) {
    const parts = splitSave(JSON.stringify(profile));
    diag.cloudSave = `sending ${stamp()}`;
    // Parts first, the count last: a reader never sees a count ahead of its parts
    (async () => {
      for (let i = 0; i < parts.length; i++) await vk.send('VKWebAppStorageSet', { key: `${KEY_PART}${i}`, value: parts[i] });
      await vk.send('VKWebAppStorageSet', { key: KEY_COUNT, value: String(parts.length) });
    })()
      .then(() => { diag.cloudSave = `ok ${stamp()} (${parts.length} parts)`; })
      .catch((e) => { diag.cloudSave = `error ${stamp()}: ${errMsg(e)}`; });
  }
}

// The existing Yandex leaderboard now ranks arena points (see notes/layer-15.md)
export const LEADERBOARD = 'might';

export function recordWin(profile) {
  if (!ysdk) return;
  ysdk.getLeaderboards()
    .then(lb => lb.setLeaderboardScore(LEADERBOARD, profile.rank?.points ?? 0))
    .catch(() => {});
}

// Top entries + the player's own; null where the portal has no leaderboard (VK, itch.io)
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

// The portal's language (ru, en, tr, ...), null off-portal
export function sdkLang() {
  return lang;
}

// VK ads pause the game the same way a portal pause does
async function vkAd(format) {
  const check = await vk.send('VKWebAppCheckNativeAds', { ad_format: format }).catch(() => null);
  if (!check?.result) {
    diag.ad = `${format}: none available ${stamp()}`;
    return false;
  }
  diag.ad = `${format}: shown ${stamp()}`;
  firePause(true);
  try {
    const res = await vk.send('VKWebAppShowNativeAds', { ad_format: format });
    return !!res?.result;
  } catch (e) {
    diag.ad = `${format}: error ${stamp()}: ${errMsg(e)}`;
    return false;
  } finally {
    firePause(false);
  }
}

export function showInterstitial(onClose) {
  if (portal === 'vk' && vk) { vkAd('interstitial').finally(onClose); return; }
  if (!ysdk) { onClose(); return; }
  ysdk.adv.showFullscreenAdv({ callbacks: { onClose } });
}

export function showChest(onReward) {
  if (portal === 'vk' && vk) {
    // No ad to show on VK right now: the chest still opens, as it does off-portal
    vkAd('reward').then((watched) => { if (watched || diag.ad?.includes('none available')) onReward(); });
    return;
  }
  if (!ysdk) { onReward(); return; }
  ysdk.adv.showRewardedVideo({
    callbacks: {
      onRewarded: () => onReward(),
      onClose: () => {},
    },
  });
}

// The portal asks the game to pause (Yandex ads/app switch, VK view hidden); harmless off-portal
export function onSdkPause(onPause, onResume) {
  pauseHandlers.push([onPause, onResume]);
}

// Tell Yandex the game has loaded (required for moderation)
export function gameReady() {
  try { ysdk?.features?.LoadingAPI?.ready(); } catch { /* not in Yandex */ }
}
