export const RARITY_WEIGHT = { common: 50, rare: 30, epic: 15, legendary: 5 };
export const ROUND_DRAW = 5;
export const MAX_HAND = 10;

const weightOf = (def) => RARITY_WEIGHT[def.rarity] ?? RARITY_WEIGHT.common;

export function dealRandom(pool, count, rng) {
  const dealt = [];
  let legendaryDealt = false;
  while (dealt.length < count) {
    // After one legendary, the rest of the deal ignores legendaries
    const allowed = legendaryDealt ? pool.filter((d) => d.rarity !== 'legendary') : pool;
    if (allowed.length === 0) break;
    const total = allowed.reduce((sum, d) => sum + weightOf(d), 0);
    let roll = rng() * total;
    let pick = allowed[allowed.length - 1];
    for (const def of allowed) {
      roll -= weightOf(def);
      if (roll < 0) { pick = def; break; }
    }
    if (pick.rarity === 'legendary') legendaryDealt = true;
    dealt.push(pick);
  }
  return dealt;
}
