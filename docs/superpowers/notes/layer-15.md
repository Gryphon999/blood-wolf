# Layer 15 — notes and assumptions

Working notes for `feature/layer-15-depth`. Every non-obvious rule choice is listed here
with the simple option that was picked.

## Phase A — combat depth

### Spy
- A card with `spy: true` is placed on the **enemy** row given by `def.row`; its power counts for the enemy.
- The owner draws 2 cards: deck top first, then the faction pool (`drawCards`, reason `spy`). Hand cap 10 applies.
- Spies have no Deploy effect. If a spy dies it goes to the graveyard of the side it stands on.

### Muster
- `muster: '<family>'`. Playing a family card pulls **every** card of that family from hand and deck
  onto their own rows. Mustered cards do **not** trigger Deploy effects (classic Gwent rule).
- The shop sells one copy per id, so families are 3 ids with the same name (`militia_a..c`, `dire_wolf_a..c`).
- The faction pool dedupes by name, so round draws give at most one family member.

### Bond / Berserker / Ambush / Vampirism
- **Bond:** power × number of same-name bond cards in the same row; applied after weather, before horn.
- **Berserker:** +1 power (as a `boost` event) for every unit destroyed anywhere, while on the board.
- **Ambush:** when the owner passes, each ambush card still in hand is put on a random own row (no Deploy).
- **Vampirism:** the source gains power equal to the power it actually drained (after shield/armor,
  capped by the target's remaining power). Implemented as a boost, not a heal, because heal is capped
  at base power and would do nothing for an undamaged card.

### Mulligan
- Before the first move of round 1, each player may swap up to 2 cards once. Replacements come from
  the deck top, then from the faction pool; returned cards go to the deck bottom.
- Picking 0 cards ("Keep") also uses up the mulligan. The AI mulligans silently when the scene opens.

### Leaders
- Leaders are **not cards**; they are separate entries in `src/data/leaders.js` (3 per faction).
  The old leader-tagged cards (`king_raven`, `fang_darkness`) stay as shop cards.
- An ability is a free action (does not end the turn, like an Order), once per match, only on your
  own turn and before passing. All abilities are automatic (no target choice) to keep the UI simple:
  `boost_row` picks the own row with most non-hero units; `damage_strongest` the strongest non-hero enemy.
- `peek_enemy` shows 3 enemy cards: deck top first, then random hand cards (enemy decks are usually
  fully dealt into the hand, so a pure deck peek would show nothing).
- The enemy gets a random leader of its faction; story nodes may set `enemyLeaderId` (null = none).

### Faction passives
- Faction = `faction` of the first card of each deck (decks without factions have no passive).
- Humans, *Discipline*: once per match, the first card played in round 2 does not end the turn.
- Monsters, *Blood Prevails*: a tied round goes to the monsters; a monsters mirror still draws.

## Phase B — AI

- The AI scores a move by playing it on a cloned match (`src/engine/ai/simulate.js`) and comparing a
  static evaluation: effective board power, statuses, shields/armor/ready Orders, and card advantage.
  A card in hand is worth 4.5 points, but only 1.5 while the hand is above 5 in rounds 1-2
  (the refill is capped at 10, so hoarded cards are partly wasted).
- Difficulty = strategy (see `STRATEGY` in `OpponentAI.js`): Easy "Recruit" dumps its strongest card
  with 30% random targets and ignores Orders/leader/mulligan; Normal "Veteran" searches one ply, uses
  Orders, fires the leader at the first good chance and never passes early; Hard "Warlord" searches
  all targets, tempo-passes when ahead by 6+ with a lean hand, holds heroes/legendaries before round 3,
  keeps the leader for big swings or decisive rounds and mulligans.
- Hard is only slightly stronger than Normal in AI-vs-AI (~54%); most of the gap to Easy comes from
  using Orders. A two-ply "opponent reply" search was tried and made Hard *weaker* (43%), so it was dropped.
- Gold reward multiplier: Easy ×0.75, Normal ×1, Hard ×1.5.

### Balance (scripts/simulate.js)
Decks: starter decks and "collection" decks (14 random faction cards, leaders excluded), both seat
orders, random leaders, mulligan on. Target: each faction 45–55% overall at Normal.

| Run | Humans | Monsters | Draws |
|---|---|---|---|
| master (old AI, no layer-15 mechanics), 1000/matchup | 61.5% | 37.2% | 1.4% |
| layer-15 mechanics + old AI, 400/matchup | 55.3% | 44.8% | 0% |
| new Normal AI, before balancing (3000 collection games) | 37.6% | 62.4% | 0% |
| **new Normal AI, after balancing, 1000/matchup** | **47.9%** | **52.1%** | 0% |
| new Hard AI mirror, after balancing | 52.9% | 47.1% | 0% |

Balance changes:
- Lich (monsters): lost Resilience, Order damage 2 → 1 (it was winning 78% of games it appeared in).
- Archdemon (monsters): Order row damage 3 → 2.
- Mercenary ×3 (human starter): Deploy damage 1 → 2.
- Crossbowman (humans): power 4 → 5.

Starter-vs-collection matchups are intentionally lopsided (collection decks are stronger).

## Phase C — progression

- **Packs:** 5 cards for 200 gold from all non-leader shop cards, weights common 60 / rare 28 / epic 9 /
  legendary 3; the 5th card is always rare or better. Duplicates increase `collection[id].count`.
  Free packs (quest rewards) are stored as `profile.freePacks` and spent before gold.
- **Golden cards:** 3 copies → 1 golden (`count -= 2`, `golden: true`), +2 power on top of the old
  level upgrade (both systems coexist). Specials cannot become golden. The flag is stored only when
  true so existing `{ count, level }` entries stay unchanged.
- **Daily quests:** 3 per *local* calendar day, chosen by a seed hashed from the date, so every device
  shows the same quests; tag quests only for the deck's faction. First quest of the day pays a free
  pack. Progress comes from engine events counted per battle (`matchSummary.js`), saved in the profile
  (localStorage + Yandex cloud save).
- **Achievements:** checked after every battle, pack, golden merge and when the menu opens
  (retroactive for old saves); gold is paid automatically.
- **Rank:** only arena battles (menu «Бой») count. Win +15/+25/+35 by difficulty, loss −15, floor 0.
  The existing Yandex leaderboard `might` now receives rank points instead of the win count
  (no new leaderboard has to be configured in the Yandex console).
- **Story:** the original 5 nodes stay as chapter I (`STORY_NODES`, its tests unchanged); chapter II adds
  5 nodes (`CAMPAIGN_NODES` = 10). Boss rules: permanent weather (re-applied after Clear Sky, the
  clear-weather leader and every new round), boss units placed on the enemy board at each round start
  (only if not already there), and an enemy leader. Old chapter-I nodes have no enemy leader.
  Saves with `story.cleared = 5` simply unlock node 6.

## Phase D — polish and Yandex requirements

- **Tutorial:** runs in the first *arena* battle only (story battles never show it), 6 steps; action steps
  disappear once the player acts, info steps wait for «Далее». Skipping or finishing sets
  `profile.tutorialDone`; Settings → «Пройти снова» clears it.
- **i18n:** every UI string, card rules text (`desc.*`) and English card names (`cardname.<ru name>`)
  live in `src/i18n/{ru,en}.js`. Card data keeps the Russian `name`; `cardName(def)` translates.
  The portraits have Russian titles baked into the art, which cannot be translated.
  Language: explicit choice in Settings, else Yandex `environment.i18n.lang` (ru/be/kk/uk/uz → ru,
  anything else → en), else ru. Changing the language re-renders the current scene.
- **Settings:** stored in `profile.settings` (so they sync through the cloud save). «Ускорение анимаций»
  turns click-to-speed-up on/off; «Меньше движения» disables fades, camera shake and legendary bursts.
- **Mobile:** the 1280×720 board is kept and scaled with `Scale.FIT`; a real portrait layout would need a
  second battle layout, so portrait phones get the whole board letterboxed plus a «rotate your device»
  hint. All hover hints also open on long-press (450 ms); a long-press never counts as a tap.
- **Music:** two procedural themes on a Web Audio look-ahead scheduler (no files). Sound effects and music
  share one AudioContext; autopause suspends it on `visibilitychange`, window `blur` and the Yandex
  `game_api_pause` event (the Phaser loop is also paused for the SDK event). `LoadingAPI.ready()` is called
  after boot.
- **Juice:** legendary plays burst in gold with a ring and fanfare; Scorch shakes/flashes the camera; each
  round ends with the winner's half of the board glowing and a score banner; scenes fade in/out.

## Not done / known limits

- No new card portraits (not allowed): the 15 new cards use a large trait glyph instead.
- Hard AI is only ~54% vs Normal in AI-vs-AI; the difference is mostly in style (tempo passing,
  holding heroes, leader timing).
- Starter-vs-collection matchups stay lopsided by design; only the faction totals and mirror-type
  matchups are held to 45–55%.
