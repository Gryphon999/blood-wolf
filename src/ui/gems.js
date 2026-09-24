// Round gems: each side starts with 2; every round the side does not win costs one
// (a drawn round costs both, as both are credited with the round).
export const GEM_COUNT = 2;

export function lostGems(match, playerIdx) {
  return Math.min(GEM_COUNT, match.players[1 - playerIdx].roundsWon);
}

export function gemStates(match, playerIdx) {
  const lost = lostGems(match, playerIdx);
  // Gems go out from the right
  return Array.from({ length: GEM_COUNT }, (_, i) => (i < GEM_COUNT - lost ? 'full' : 'lost'));
}
