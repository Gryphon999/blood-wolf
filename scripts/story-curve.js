// Story difficulty curve: `node scripts/story-curve.js [matches=150]`
// Plays every campaign node with its tuning (STORY_TUNING in src/data/story.js) and prints the player's
// win rate. The player deck follows progress: the starter deck in chapter I, then a random mid-game
// collection of human cards (12 in chapter II, 14 in chapter III). "novice" plays like the easy AI,
// "skilled" like the normal AI. Aim: each chapter starts easy and climbs to its boss.
import { playMatch } from '../src/engine/playMatch.js';
import { seededRng, shuffle } from '../src/engine/rng.js';
import { PLAYER_DECK } from '../src/data/starterDecks.js';
import { SHOP_CARDS } from '../src/data/shopCards.js';
import { buildFactionPool } from '../src/data/factionPool.js';
import { getLeader, leadersOf } from '../src/data/leaders.js';
import { STORY_NODES, CHAPTER_TWO_NODES, CAMPAIGN_NODES, storyAi, storyDeck, storyRules } from '../src/data/story.js';

const N = Number(process.argv[2] ?? 150);
const HUMANS = [...PLAYER_DECK, ...SHOP_CARDS].filter((c) => c.faction === 'humans' && !c.tags?.includes('leader'));

const chapter = (i) => (i < STORY_NODES.length ? 1 : i < STORY_NODES.length + CHAPTER_TWO_NODES.length ? 2 : 3);
const playerDeck = (i, rng) => (chapter(i) === 1 ? PLAYER_DECK : shuffle(HUMANS, rng).slice(0, chapter(i) === 2 ? 12 : 14));

function winRate(i, playerAi) {
  const node = CAMPAIGN_NODES[i];
  const deck = storyDeck(node);
  const rules = storyRules(node);
  let wins = 0;
  for (let k = 0; k < N; k++) {
    const rng = seededRng(9000 + k);
    const match = playMatch(playerDeck(i, rng), deck, 10, {
      rng,
      pools: [buildFactionPool('humans'), deck],
      leaders: [leadersOf('humans')[0], node.enemyLeaderId !== undefined ? getLeader(node.enemyLeaderId) : null],
      permanentWeather: rules?.permanentWeather ?? [],
      bossUnits: rules?.bossUnits ?? [],
      ai: [playerAi, storyAi(i)],
      mulligan: true,
    });
    if (match.winner === 0) wins++;
  }
  return `${Math.round((100 * wins) / N)}%`.padStart(5);
}

console.log(`Story curve, ${N} matches per cell (player win rate)\n`);
console.log(` #  ch ${'mission'.padEnd(16)} ${'enemy AI'.padEnd(9)} novice skilled`);
CAMPAIGN_NODES.forEach((node, i) => {
  console.log(`${String(i + 1).padStart(2)}  ${chapter(i)}  ${node.id.padEnd(16)} ${storyAi(i).padEnd(9)} ${winRate(i, 'easy')}  ${winRate(i, 'normal')}`);
});
