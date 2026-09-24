// AI-vs-AI balance simulation: `node scripts/simulate.js [matches=400] [difficulty=normal]`
// Plays every matchup with both seat orders and prints faction win rates.
import { playMatch } from '../src/engine/playMatch.js';
import { seededRng, shuffle } from '../src/engine/rng.js';
import { PLAYER_DECK, AI_DECK } from '../src/data/starterDecks.js';
import { SHOP_CARDS } from '../src/data/shopCards.js';
import { buildFactionPool } from '../src/data/factionPool.js';
import { randomLeader } from '../src/data/leaders.js';

const N = Number(process.argv[2] ?? 400);
const DIFFICULTY = process.argv[3] ?? 'normal';

const ALL = [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS];
const factionCards = (faction) => ALL.filter((c) => c.faction === faction && !c.tags?.includes('leader'));

// "Collection" decks: 14 random cards of the faction (a fair mid-game collection)
const DECKS = {
  humans_starter: () => PLAYER_DECK,
  monsters_starter: () => AI_DECK,
  humans_collection: (rng) => shuffle(factionCards('humans'), rng).slice(0, 14),
  monsters_collection: (rng) => shuffle(factionCards('monsters'), rng).slice(0, 14),
};

const MATCHUPS = [
  ['humans_starter', 'monsters_starter'],
  ['humans_collection', 'monsters_collection'],
  ['humans_starter', 'monsters_collection'],
  ['humans_collection', 'monsters_starter'],
];

const factionOf = (deckName) => deckName.split('_')[0];

function run([nameA, nameB]) {
  const stats = { [nameA]: 0, [nameB]: 0, draw: 0 };
  for (let i = 0; i < N; i++) {
    const rng = seededRng(1000 + i);
    const swap = i % 2 === 1; // alternate seats: player 0 moves first in round 1
    const [first, second] = swap ? [nameB, nameA] : [nameA, nameB];
    const deckA = DECKS[first](rng);
    const deckB = DECKS[second](rng);
    const fa = factionOf(first);
    const fb = factionOf(second);
    const match = playMatch(deckA, deckB, 10, {
      rng,
      pools: [buildFactionPool(fa), buildFactionPool(fb)],
      leaders: [randomLeader(fa, rng), randomLeader(fb, rng)],
      ai: [DIFFICULTY, DIFFICULTY],
      mulligan: true,
    });
    if (match.winner === 'draw') stats.draw++;
    else stats[match.winner === 0 ? first : second]++;
  }
  return stats;
}

const pct = (n) => `${((100 * n) / N).toFixed(1)}%`;
console.log(`Blood Wolf balance: ${N} matches per matchup, AI difficulty "${DIFFICULTY}"\n`);
const totals = { humans: 0, monsters: 0, draw: 0, games: 0 };
for (const pair of MATCHUPS) {
  const s = run(pair);
  const [a, b] = pair;
  console.log(`${a.padEnd(20)} ${pct(s[a]).padStart(6)}  vs  ${pct(s[b]).padStart(6)} ${b.padEnd(20)} draws ${pct(s.draw)}`);
  totals[factionOf(a)] += s[a];
  totals[factionOf(b)] += s[b];
  totals.draw += s.draw;
  totals.games += N;
}
const share = (n) => `${((100 * n) / totals.games).toFixed(1)}%`;
console.log(`\nOverall: humans ${share(totals.humans)}  monsters ${share(totals.monsters)}  draws ${share(totals.draw)}`);

// Difficulty ladder: same random decks, seats alternate, faction alternates
function ladder(a, b, n = Math.max(100, Math.floor(N / 2))) {
  let winsA = 0;
  let draws = 0;
  for (let i = 0; i < n; i++) {
    const rng = seededRng(5000 + i);
    const factions = i % 4 < 2 ? ['humans', 'monsters'] : ['monsters', 'humans'];
    const aFirst = i % 2 === 0;
    const decks = factions.map((f) => shuffle(factionCards(f), rng).slice(0, 14));
    const ai = aFirst ? [a, b] : [b, a];
    const match = playMatch(decks[0], decks[1], 10, {
      rng,
      pools: factions.map(buildFactionPool),
      leaders: factions.map((f) => randomLeader(f, rng)),
      ai,
      mulligan: true,
    });
    if (match.winner === 'draw') draws++;
    else if (ai[match.winner] === a) winsA++;
  }
  console.log(`${a.padEnd(6)} vs ${b.padEnd(6)}: ${((100 * winsA) / n).toFixed(1)}% wins (${n} games, ${draws} draws)`);
}

console.log('\nDifficulty ladder:');
ladder('normal', 'easy');
ladder('hard', 'normal');
ladder('hard', 'easy');
