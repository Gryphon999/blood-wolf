const RARITY_COLORS = {
  common: 0x8a8a8a,
  rare: 0x4a80c0,
  epic: 0x9a4ac0,
  legendary: 0xffd479,
};

export function rarityColor(rarity) {
  return RARITY_COLORS[rarity] ?? 0x8a6d3b;
}
