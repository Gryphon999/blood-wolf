import { createCard } from './Card.js';
import { emit } from './events.js';
import { dealRandom, MAX_HAND } from './dealRandom.js';

// Draw up to `count` cards: deck top first, then the faction pool (if any).
// Respects the hand ceiling. Emits one `draw` event tagged with `reason`.
export function drawCards(match, playerIdx, count, reason = 'round') {
  const player = match.players[playerIdx];
  const room = Math.max(0, Math.min(count, MAX_HAND - player.hand.length));
  const drawn = player.deck.splice(0, room);
  const missing = room - drawn.length;
  if (missing > 0 && match.pools?.[playerIdx]) {
    drawn.push(...dealRandom(match.pools[playerIdx], missing, match.rng).map(createCard));
  }
  player.hand.push(...drawn);
  emit(match, { type: 'draw', player: playerIdx, uids: drawn.map((c) => c.uid), reason });
  return drawn;
}
