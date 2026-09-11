export function chooseMove(match, playerIndex) {
  const player = match.players[playerIndex];
  if (player.hand.length === 0) {
    return { type: 'pass' };
  }
  let bestIndex = 0;
  for (let i = 1; i < player.hand.length; i++) {
    if (player.hand[i].power > player.hand[bestIndex].power) {
      bestIndex = i;
    }
  }
  const card = player.hand[bestIndex];
  const row = card.def.row === 'any' ? 'melee' : card.def.row;
  return { type: 'play', cardIndex: bestIndex, row };
}
