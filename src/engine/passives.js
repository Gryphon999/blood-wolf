import { emit } from './events.js';

// One passive per faction:
// humans   — discipline: once per match, the first card played in round 2 does not end the turn
// monsters — tiebreak: a tied round goes to the monsters (unless both sides are monsters)
export const FACTION_PASSIVE = {
  humans: 'discipline',
  monsters: 'tiebreak',
};

export function passiveOf(match, playerIdx) {
  return FACTION_PASSIVE[match.factions?.[playerIdx]] ?? null;
}

// Called after a card is played; true = the player keeps the turn
export function keepsTurnAfterPlay(match, playerIdx) {
  const player = match.players[playerIdx];
  if (passiveOf(match, playerIdx) !== 'discipline' || match.round !== 2 || player.passiveUsed) return false;
  player.passiveUsed = true;
  emit(match, { type: 'passive', player: playerIdx, passive: 'discipline' });
  return true;
}

// Returns the tie winner index, or null when the tie stands
export function tieWinner(match) {
  const monsters = [0, 1].filter((i) => passiveOf(match, i) === 'tiebreak');
  if (monsters.length !== 1) return null;
  emit(match, { type: 'passive', player: monsters[0], passive: 'tiebreak' });
  return monsters[0];
}
