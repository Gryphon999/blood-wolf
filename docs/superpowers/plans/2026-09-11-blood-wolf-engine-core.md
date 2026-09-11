# Blood Wolf — Engine Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully unit-tested, pure-JavaScript Gwent match engine (unit cards only) plus the project scaffold, so later plans can add special-card effects, Phaser rendering, the Yandex SDK, economy, story, and online.

**Architecture:** The engine lives in `src/engine/` as pure ES modules with **no Phaser imports** — it knows only about cards, rows, turns, rounds, and who won. State is a plain object mutated by exported functions (`createMatch`, `playCard`, `pass`). This keeps the rules testable without a browser and lets the same engine serve story, online, and AI opponents later.

**Tech Stack:** Phaser 3 (added now, used in later plans), Vite (dev server + build), Vitest (unit tests), plain JavaScript ES modules.

## Global Constraints

- Language: plain JavaScript, ES modules (`"type": "module"`), no TypeScript.
- `src/engine/**` must NOT import Phaser or any browser/DOM API — pure logic only.
- Platform target: Яндекс.Игры (WebGL) — keep the build light.
- No «Ведьмак» IP: all card/faction names in content are original (does not affect this engine plan, which uses test-only card data).
- Randomness must be injectable/deterministic in the engine so tests are repeatable (deal from the front of the deck array; shuffling is a separate concern handled by the caller).
- Rows are exactly: `melee`, `ranged`, `siege`.
- Match format: best-of-three rounds; a tie in a round awards a round point to **both** players (Gwent rule).

---

### Task 1: Project scaffold (Vite + Vitest + Phaser)

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/engine/smoke.test.js`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a working toolchain — `npm test` runs Vitest, `npm run dev` serves the page.

- [ ] **Step 1: Write the failing test**

Create `src/engine/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `npm` errors because there is no `package.json` / Vitest is not installed yet.

- [ ] **Step 3: Create the scaffold files**

Create `package.json`:

```json
{
  "name": "blood-wolf",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "phaser": "^3.86.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

Create `vite.config.js`:

```js
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

Create `index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blood Wolf</title>
    <style>
      html, body { margin: 0; padding: 0; background: #0b0b0d; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

Create `src/main.js`:

```js
// Phaser boot lives here in a later plan. For now this file only
// confirms the module entry point loads.
console.log('Blood Wolf: entry point loaded');
```

Create `.gitignore`:

```
node_modules/
dist/
```

- [ ] **Step 4: Install deps and run the test to verify it passes**

Run: `npm install && npm test`
Expected: PASS — one passing test in `src/engine/smoke.test.js`.

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js index.html src/main.js src/engine/smoke.test.js .gitignore
git commit -m "chore: scaffold Vite + Vitest + Phaser project"
```

---

### Task 2: Card model

**Files:**
- Create: `src/engine/Card.js`
- Test: `src/engine/Card.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createCard(def)` → returns a runtime card `{ def, power }` where `def` is the static card definition (with fields `id`, `name`, `faction`, `type`, `row`, `power`, `rarity`, `cost`, `art`) and `power` is the current (mutable) power, initialised from `def.power`.

- [ ] **Step 1: Write the failing test**

Create `src/engine/Card.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createCard } from './Card.js';

describe('createCard', () => {
  it('copies base power into current power', () => {
    const card = createCard({ id: 'wolf', row: 'melee', power: 5 });
    expect(card.power).toBe(5);
  });

  it('keeps the original definition accessible', () => {
    const def = { id: 'wolf', row: 'melee', power: 5 };
    const card = createCard(def);
    expect(card.def).toBe(def);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import `createCard` (file does not exist).

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/Card.js`:

```js
export function createCard(def) {
  return { def, power: def.power };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/Card.js src/engine/Card.test.js
git commit -m "feat(engine): add card model"
```

---

### Task 3: Board (rows and power)

**Files:**
- Create: `src/engine/Board.js`
- Test: `src/engine/Board.test.js`

**Interfaces:**
- Consumes: runtime cards from `createCard` (Task 2).
- Produces:
  - `ROWS` → `['melee', 'ranged', 'siege']`
  - `createBoard()` → `{ melee: [], ranged: [], siege: [] }`
  - `addUnit(board, row, card)` → pushes `card` onto `board[row]`; throws `Error` if `row` is not in `ROWS`.
  - `rowPower(board, row)` → sum of `card.power` in that row.
  - `totalPower(board)` → sum of all three rows.

- [ ] **Step 1: Write the failing test**

Create `src/engine/Board.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createBoard, addUnit, rowPower, totalPower, ROWS } from './Board.js';
import { createCard } from './Card.js';

describe('Board', () => {
  it('starts with three empty rows', () => {
    const board = createBoard();
    expect(totalPower(board)).toBe(0);
    expect(ROWS).toEqual(['melee', 'ranged', 'siege']);
  });

  it('sums power within a row', () => {
    const board = createBoard();
    addUnit(board, 'melee', createCard({ id: 'a', row: 'melee', power: 4 }));
    addUnit(board, 'melee', createCard({ id: 'b', row: 'melee', power: 6 }));
    expect(rowPower(board, 'melee')).toBe(10);
  });

  it('sums power across all rows', () => {
    const board = createBoard();
    addUnit(board, 'melee', createCard({ id: 'a', row: 'melee', power: 4 }));
    addUnit(board, 'ranged', createCard({ id: 'b', row: 'ranged', power: 3 }));
    addUnit(board, 'siege', createCard({ id: 'c', row: 'siege', power: 2 }));
    expect(totalPower(board)).toBe(9);
  });

  it('rejects an unknown row', () => {
    const board = createBoard();
    expect(() => addUnit(board, 'sky', createCard({ id: 'x', row: 'sky', power: 1 })))
      .toThrow('Unknown row: sky');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./Board.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/Board.js`:

```js
export const ROWS = ['melee', 'ranged', 'siege'];

export function createBoard() {
  return { melee: [], ranged: [], siege: [] };
}

export function addUnit(board, row, card) {
  if (!ROWS.includes(row)) {
    throw new Error(`Unknown row: ${row}`);
  }
  board[row].push(card);
}

export function rowPower(board, row) {
  return board[row].reduce((sum, card) => sum + card.power, 0);
}

export function totalPower(board) {
  return ROWS.reduce((sum, row) => sum + rowPower(board, row), 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/Board.js src/engine/Board.test.js
git commit -m "feat(engine): add board rows and power calculation"
```

---

### Task 4: Match setup and card play

**Files:**
- Create: `src/engine/GwentMatch.js`
- Test: `src/engine/GwentMatch.test.js`

**Interfaces:**
- Consumes: `createCard` (Task 2); `createBoard`, `addUnit` (Task 3).
- Produces:
  - `createMatch(deckA, deckB, handSize = 10)` → match state object:
    ```
    {
      players: [
        { deck: Card[], hand: Card[], board: Board, passed: false, roundsWon: 0 },
        { ... }
      ],
      current: 0,        // index of the player to move
      round: 1,
      roundStarter: 0,
      winner: null,      // null while playing; 0 | 1 | 'draw' when finished
      lastRound: null    // result of the most recent resolved round
    }
    ```
    `deckA`/`deckB` are arrays of card **definitions**. Each player's `hand` is the first `handSize` cards (as runtime cards); `deck` holds the rest.
  - `playCard(match, cardIndex, row)` → removes the card at `cardIndex` from the current player's hand, adds it to their board `row`, then hands the turn to the opponent unless the opponent has already passed. Throws if the match is over, the current player has passed, or `cardIndex` is invalid.

- [ ] **Step 1: Write the failing test**

Create `src/engine/GwentMatch.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createMatch, playCard } from './GwentMatch.js';
import { totalPower } from './Board.js';

const unit = (id, power, row = 'melee') => ({ id, row, power });

describe('createMatch', () => {
  it('deals hands from the front of each deck', () => {
    const deck = [unit('a', 1), unit('b', 2), unit('c', 3)];
    const match = createMatch(deck, deck, 2);
    expect(match.players[0].hand).toHaveLength(2);
    expect(match.players[0].deck).toHaveLength(1);
    expect(match.players[0].hand[0].power).toBe(1);
  });

  it('starts with player 0 to move and no winner', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 1);
    expect(match.current).toBe(0);
    expect(match.winner).toBeNull();
  });
});

describe('playCard', () => {
  it('moves a card from hand to the chosen row and passes the turn', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    expect(match.players[0].hand).toHaveLength(0);
    expect(totalPower(match.players[0].board)).toBe(5);
    expect(match.current).toBe(1);
  });

  it('throws when the card index is invalid', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1);
    expect(() => playCard(match, 9, 'melee')).toThrow('No card at index 9');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./GwentMatch.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/GwentMatch.js`:

```js
import { createCard } from './Card.js';
import { createBoard, addUnit } from './Board.js';

function makePlayer(deck, handSize) {
  const cards = deck.map(createCard);
  return {
    deck: cards.slice(handSize),
    hand: cards.slice(0, handSize),
    board: createBoard(),
    passed: false,
    roundsWon: 0,
  };
}

export function createMatch(deckA, deckB, handSize = 10) {
  return {
    players: [makePlayer(deckA, handSize), makePlayer(deckB, handSize)],
    current: 0,
    round: 1,
    roundStarter: 0,
    winner: null,
    lastRound: null,
  };
}

function passTurn(match) {
  const opponent = 1 - match.current;
  if (!match.players[opponent].passed) {
    match.current = opponent;
  }
}

export function playCard(match, cardIndex, row) {
  if (match.winner !== null) {
    throw new Error('Match is over');
  }
  const player = match.players[match.current];
  if (player.passed) {
    throw new Error('Player has already passed this round');
  }
  const card = player.hand[cardIndex];
  if (!card) {
    throw new Error(`No card at index ${cardIndex}`);
  }
  player.hand.splice(cardIndex, 1);
  addUnit(player.board, row, card);
  passTurn(match);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): add match setup and card play"
```

---

### Task 5: Passing and round resolution

**Files:**
- Modify: `src/engine/GwentMatch.js`
- Test: `src/engine/GwentMatch.test.js` (add cases)

**Interfaces:**
- Consumes: everything from Task 4; `totalPower` (Task 3).
- Produces:
  - `pass(match)` → marks the current player as passed. If both players have passed, resolves the round (compares `totalPower` of both boards; higher total gains a round point; a tie gives **both** players a point). After resolving, if no one has 2 round points, starts the next round: clears both boards, resets `passed`, increments `round`, and sets the round starter to the loser (on a tie, alternate the previous starter). Throws if the match is over. Sets `match.lastRound` to `0`, `1`, or `'draw'`.

- [ ] **Step 1: Write the failing test**

Add to `src/engine/GwentMatch.test.js`:

```js
import { pass } from './GwentMatch.js';

describe('pass and round resolution', () => {
  it('switches turn to the opponent when only one player passes', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 1);
    pass(match);
    expect(match.current).toBe(1);
    expect(match.players[0].passed).toBe(true);
  });

  it('awards the round to the higher total power when both pass', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee'); // p0 plays 5, turn -> p1
    playCard(match, 0, 'melee'); // p1 plays 3, turn -> p0
    pass(match);                 // p0 passes, turn -> p1
    pass(match);                 // p1 passes, round resolves
    expect(match.players[0].roundsWon).toBe(1);
    expect(match.players[1].roundsWon).toBe(0);
    expect(match.lastRound).toBe(0);
  });

  it('resets boards and lets the round loser start the next round', () => {
    const match = createMatch(
      [unit('a', 5), unit('a2', 5)],
      [unit('b', 3), unit('b2', 3)],
      2,
    );
    playCard(match, 0, 'melee'); // p0 -> 5
    playCard(match, 0, 'melee'); // p1 -> 3
    pass(match);                 // p0 passes
    pass(match);                 // p1 passes -> p0 wins round 1
    expect(match.round).toBe(2);
    expect(totalPower(match.players[0].board)).toBe(0);
    expect(match.current).toBe(1); // loser (p1) starts round 2
  });

  it('gives both players a point on a tie', () => {
    const match = createMatch([unit('a', 4)], [unit('b', 4)], 1);
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(match.players[0].roundsWon).toBe(1);
    expect(match.players[1].roundsWon).toBe(1);
    expect(match.lastRound).toBe('draw');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import `pass` (not exported yet).

- [ ] **Step 3: Write minimal implementation**

Add to `src/engine/GwentMatch.js` — import `totalPower` and add the functions:

```js
// update the Board import at the top of the file:
import { createBoard, addUnit, totalPower } from './Board.js';
```

```js
function startNextRound(match, lastResult) {
  for (const player of match.players) {
    player.board = createBoard();
    player.passed = false;
  }
  match.round++;
  match.roundStarter = lastResult === 'draw'
    ? 1 - match.roundStarter
    : 1 - lastResult; // the loser starts the next round
  match.current = match.roundStarter;
}

function resolveRound(match) {
  const [p0, p1] = match.players;
  const power0 = totalPower(p0.board);
  const power1 = totalPower(p1.board);

  let result;
  if (power0 > power1) {
    p0.roundsWon++;
    result = 0;
  } else if (power1 > power0) {
    p1.roundsWon++;
    result = 1;
  } else {
    p0.roundsWon++;
    p1.roundsWon++;
    result = 'draw';
  }
  match.lastRound = result;

  if (p0.roundsWon >= 2 || p1.roundsWon >= 2) {
    return; // match-end handling is added in Task 6
  }
  startNextRound(match, result);
}

export function pass(match) {
  if (match.winner !== null) {
    throw new Error('Match is over');
  }
  const player = match.players[match.current];
  player.passed = true;
  if (match.players[1 - match.current].passed) {
    resolveRound(match);
  } else {
    match.current = 1 - match.current;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): add passing and round resolution"
```

---

### Task 6: Match end (best-of-three)

**Files:**
- Modify: `src/engine/GwentMatch.js`
- Test: `src/engine/GwentMatch.test.js` (add cases)

**Interfaces:**
- Consumes: everything from Task 5.
- Produces: when a player reaches 2 round points, `resolveRound` sets `match.winner` to that player's index; if both reach 2 (via ties) `match.winner` is `'draw'`. Once `match.winner` is set, `playCard` and `pass` both throw `'Match is over'` (already implemented in Tasks 4–5).

- [ ] **Step 1: Write the failing test**

Add to `src/engine/GwentMatch.test.js`:

```js
describe('match end', () => {
  it('declares the player who wins two rounds the winner', () => {
    // handSize 2 so each player has a card for both rounds
    const match = createMatch(
      [unit('a', 5), unit('a2', 5)],
      [unit('b', 1), unit('b2', 1)],
      2,
    );
    // round 1: p0 5 vs p1 1 -> p0 wins
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    // round 2: p1 starts. p1 1 vs p0 5 -> p0 wins again
    playCard(match, 0, 'melee'); // p1
    playCard(match, 0, 'melee'); // p0
    pass(match);                 // p1 passes
    pass(match);                 // p0 passes -> resolve, p0 hits 2 wins
    expect(match.winner).toBe(0);
  });

  it('refuses further moves once the match is over', () => {
    const match = createMatch(
      [unit('a', 5), unit('a2', 5)],
      [unit('b', 1), unit('b2', 1)],
      2,
    );
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(() => pass(match)).toThrow('Match is over');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `match.winner` stays `null` because match-end is not wired up yet.

- [ ] **Step 3: Write minimal implementation**

In `src/engine/GwentMatch.js`, add a `finishMatch` helper and call it from `resolveRound` (replace the early `return` comment from Task 5):

```js
function finishMatch(match) {
  const [p0, p1] = match.players;
  if (p0.roundsWon >= 2 && p1.roundsWon >= 2) {
    match.winner = 'draw';
  } else if (p0.roundsWon >= 2) {
    match.winner = 0;
  } else {
    match.winner = 1;
  }
}
```

Change the tail of `resolveRound` from:

```js
  if (p0.roundsWon >= 2 || p1.roundsWon >= 2) {
    return; // match-end handling is added in Task 6
  }
  startNextRound(match, result);
```

to:

```js
  if (p0.roundsWon >= 2 || p1.roundsWon >= 2) {
    finishMatch(match);
    return;
  }
  startNextRound(match, result);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): add best-of-three match resolution"
```

---

### Task 7: Greedy opponent AI

**Files:**
- Create: `src/engine/ai/OpponentAI.js`
- Test: `src/engine/ai/OpponentAI.test.js`

**Interfaces:**
- Consumes: match state (Task 4).
- Produces:
  - `chooseMove(match, playerIndex)` → a move object:
    - `{ type: 'pass' }` if the player's hand is empty.
    - `{ type: 'play', cardIndex, row }` otherwise, choosing the highest-power card in hand. The row is `card.def.row`, except `'any'` maps to `'melee'`.

- [ ] **Step 1: Write the failing test**

Create `src/engine/ai/OpponentAI.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { chooseMove } from './OpponentAI.js';
import { createMatch } from '../GwentMatch.js';

const unit = (id, power, row = 'melee') => ({ id, row, power });

describe('chooseMove', () => {
  it('passes when the hand is empty', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 0);
    expect(chooseMove(match, 0)).toEqual({ type: 'pass' });
  });

  it('plays the highest-power card to its row', () => {
    const match = createMatch([unit('a', 2), unit('big', 9, 'ranged')], [unit('b', 1)], 2);
    expect(chooseMove(match, 0)).toEqual({ type: 'play', cardIndex: 1, row: 'ranged' });
  });

  it('maps an "any" row card to melee', () => {
    const match = createMatch([unit('a', 7, 'any')], [unit('b', 1)], 1);
    expect(chooseMove(match, 0)).toEqual({ type: 'play', cardIndex: 0, row: 'melee' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./OpponentAI.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/ai/OpponentAI.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ai/OpponentAI.js src/engine/ai/OpponentAI.test.js
git commit -m "feat(engine): add greedy opponent AI"
```

---

### Task 8: Full auto-played match (integration)

**Files:**
- Create: `src/engine/playMatch.js`
- Test: `src/engine/playMatch.test.js`

**Interfaces:**
- Consumes: `createMatch`, `playCard`, `pass` (Tasks 4–6); `chooseMove` (Task 7).
- Produces:
  - `playMatch(deckA, deckB, handSize = 10)` → runs a complete match where both players are driven by `chooseMove`, and returns the finished match state (`match.winner` set). Includes a hard safety cap on total moves to guarantee termination.

- [ ] **Step 1: Write the failing test**

Create `src/engine/playMatch.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { playMatch } from './playMatch.js';

const unit = (id, power) => ({ id, row: 'melee', power });

describe('playMatch', () => {
  it('plays a full match to completion', () => {
    const strong = [unit('s1', 9), unit('s2', 9), unit('s3', 9)];
    const weak = [unit('w1', 1), unit('w2', 1), unit('w3', 1)];
    const match = playMatch(strong, weak, 3);
    expect(match.winner).not.toBeNull();
    expect(match.winner).toBe(0); // the stronger deck should win
  });

  it('always terminates with a decided match', () => {
    const deck = Array.from({ length: 10 }, (_, i) => unit(`c${i}`, (i % 5) + 1));
    const match = playMatch(deck, deck, 10);
    expect([0, 1, 'draw']).toContain(match.winner);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./playMatch.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/playMatch.js`:

```js
import { createMatch, playCard, pass } from './GwentMatch.js';
import { chooseMove } from './ai/OpponentAI.js';

export function playMatch(deckA, deckB, handSize = 10) {
  const match = createMatch(deckA, deckB, handSize);
  let safety = 1000;
  while (match.winner === null && safety-- > 0) {
    const move = chooseMove(match, match.current);
    if (move.type === 'pass') {
      pass(match);
    } else {
      playCard(match, move.cardIndex, move.row);
    }
  }
  if (match.winner === null) {
    throw new Error('playMatch did not terminate');
  }
  return match;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/playMatch.js src/engine/playMatch.test.js
git commit -m "feat(engine): add full auto-played match runner"
```

---

## Self-Review

**Spec coverage (this plan's slice — the Gwent engine core, units only):**
- Rows melee/ranged/siege → Task 3. ✅
- Turn/pass flow → Tasks 4–5. ✅
- Round scoring by total power, tie awards both → Task 5. ✅
- Best-of-three match resolution → Task 6. ✅
- AI opponent (needed for story and async online later) → Task 7. ✅
- Engine usable to simulate a full match (foundation for story/online) → Task 8. ✅
- Pure engine, no Phaser, deterministic dealing (Global Constraints) → all engine tasks. ✅
- Deferred to later plans (out of scope here, by design): special-card effects (weather/horn/scorch/heal/hero), Phaser scenes, Yandex SDK wrapper, economy/profile, story content, online matchmaking, art. These each get their own spec-derived plan.

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step contains full code. ✅

**Type consistency:** `createCard`→`{def,power}` used consistently by Board/Match; match state shape (`players`, `current`, `round`, `roundStarter`, `winner`, `lastRound`, per-player `deck/hand/board/passed/roundsWon`) is identical across Tasks 4–8; `chooseMove` returns `{type:'pass'}` / `{type:'play',cardIndex,row}` consumed exactly by `playMatch`. ✅
