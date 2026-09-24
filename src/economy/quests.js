import { seededRng, shuffle } from '../engine/rng.js';
import { counterValue } from './matchSummary.js';

// Daily quests: 3 per local day, picked deterministically from the date.
// `faction: null` = any deck; otherwise only offered to players of that faction.
export const QUEST_TEMPLATES = [
  { id: 'win_matches',     counter: 'wins',              target: 2,  gold: 80 },
  { id: 'play_cards',      counter: 'cardsPlayed',       target: 15, gold: 50 },
  { id: 'kills',           counter: 'kills',             target: 8,  gold: 60 },
  { id: 'use_orders',      counter: 'ordersUsed',        target: 5,  gold: 60 },
  { id: 'use_leader',      counter: 'leaderUsed',        target: 2,  gold: 50 },
  { id: 'round_no_orders', counter: 'roundsWonNoOrders', target: 1,  gold: 70 },
  { id: 'arena_win',       counter: 'arenaWins',         target: 1,  gold: 60 },
  { id: 'play_spy',        counter: 'spiesPlayed',       target: 1,  gold: 60 },
  { id: 'play_knight',     counter: 'tag:knight',        target: 5,  gold: 60, faction: 'humans' },
  { id: 'play_archer',     counter: 'tag:archer',        target: 4,  gold: 60, faction: 'humans' },
  { id: 'play_undead',     counter: 'tag:undead',        target: 5,  gold: 60, faction: 'monsters' },
  { id: 'play_beast',      counter: 'tag:beast',         target: 4,  gold: 60, faction: 'monsters' },
];
export const DAILY_COUNT = 3;

export function localDate(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function hashDate(date) {
  return [...date].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
}

// The first quest of the day rewards a free pack instead of gold
export function dailyQuests(date, faction) {
  const rng = seededRng(hashDate(date));
  const offered = QUEST_TEMPLATES.filter((q) => !q.faction || q.faction === faction);
  return shuffle(offered, rng).slice(0, DAILY_COUNT).map((q, i) => ({
    id: q.id,
    counter: q.counter,
    target: q.target,
    reward: i === 0 ? { packs: 1 } : { gold: q.gold },
    progress: 0,
    claimed: false,
  }));
}

export function ensureDailyQuests(profile, faction, date = localDate()) {
  if (profile.quests?.date !== date) {
    profile.quests = { date, list: dailyQuests(date, faction) };
  }
  return profile.quests.list;
}

export function applySummaryToQuests(profile, summary) {
  for (const q of profile.quests?.list ?? []) {
    if (q.claimed) continue;
    q.progress = Math.min(q.target, q.progress + counterValue(summary, q.counter));
  }
}

export function canClaimQuest(quest) {
  return !quest.claimed && quest.progress >= quest.target;
}

export function claimQuest(profile, index) {
  const quest = profile.quests?.list?.[index];
  if (!quest || !canClaimQuest(quest)) throw new Error('Quest is not complete');
  quest.claimed = true;
  if (quest.reward.gold) profile.gold += quest.reward.gold;
  if (quest.reward.packs) profile.freePacks = (profile.freePacks ?? 0) + quest.reward.packs;
  return quest.reward;
}
