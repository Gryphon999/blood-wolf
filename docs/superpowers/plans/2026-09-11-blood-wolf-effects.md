# Blood Wolf — Special-Card Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add heroes and special cards (weather, commander's horn, and a row-damage sign) to the pure Gwent engine, computing card strength via effective-power recomputation rather than in-place mutation.

**Architecture:** A unit keeps its immutable base power (`card.power`). Effective power is recomputed on demand from active auras: `effectivePower = hero ? base : applyHorn(applyWeather(base))`. Weather is a match-global set of affected rows; the horn is a per-board set of rows. `playCard` dispatches on `card.def.type`: `special` cards apply an effect and are not placed on a row; everything else is placed as a unit.

**Tech Stack:** plain JavaScript ES modules, Vitest. No Phaser/DOM in `src/engine/**`.

## Global Constraints

- Language: plain JavaScript, ES modules, no TypeScript.
- `src/engine/**` must NOT import Phaser or any browser/DOM API — pure logic only.
- Rows are exactly: `melee`, `ranged`, `siege`.
- Effect order is fixed: weather (sets non-hero power to 1) THEN horn (doubles). A horned, weathered row yields 2 per non-hero unit.
- Heroes (`card.def.type === 'hero'`) ignore ALL effects (weather, horn, sign damage).
- Weather affects the named row on BOTH players' boards; weather lives only within a round (cleared when a new round starts).
- Sign damage is instant: `-2` (floored at `1`) to each non-hero unit present in the target row of the OPPONENT at cast time.
- All changes are additive: the existing 28 tests must stay green (new function parameters default to empty).

---

### Task 1: Effective-power model on the Board

**Files:**
- Modify: `src/engine/Board.js`
- Test: `src/engine/Board.test.js` (ADD cases; do not delete existing ones)

**Interfaces:**
- Consumes: runtime cards `{ def, power }` from `createCard`.
- Produces:
  - `createBoard()` → `{ melee: [], ranged: [], siege: [], horns: Set }` (adds a `horns` set of row names).
  - `effectivePower(card, row, board, weather)` → number. Returns `card.power` unchanged if `card.def.type === 'hero'`; otherwise applies weather (`weather.has(row)` ⇒ power becomes `1`) then horn (`board.horns.has(row)` ⇒ power `× 2`).
  - `rowPower(board, row, weather = new Set())` → sum of `effectivePower` over that row.
  - `totalPower(board, weather = new Set())` → sum over all rows.

- [ ] **Step 1: Write the failing test — ADD to `src/engine/Board.test.js`**

Add `effectivePower` to the existing import from `./Board.js` (the file already imports `createBoard, addUnit, rowPower, totalPower, ROWS`). Then append:

```js
describe('effectivePower', () => {
  it('returns base power with no weather or horn', () => {
    const board = createBoard();
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set())).toBe(5);
  });

  it('weather sets a non-hero to 1', () => {
    const board = createBoard();
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set(['melee']))).toBe(1);
  });

  it('horn doubles a non-hero', () => {
    const board = createBoard();
    board.horns.add('melee');
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set())).toBe(10);
  });

  it('weather then horn yields 2', () => {
    const board = createBoard();
    board.horns.add('melee');
    const card = createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 });
    expect(effectivePower(card, 'melee', board, new Set(['melee']))).toBe(2);
  });

  it('a hero ignores weather and horn', () => {
    const board = createBoard();
    board.horns.add('melee');
    const hero = createCard({ id: 'h', type: 'hero', row: 'melee', power: 7 });
    expect(effectivePower(hero, 'melee', board, new Set(['melee']))).toBe(7);
  });
});

describe('rowPower with auras', () => {
  it('applies weather across the whole row', () => {
    const board = createBoard();
    addUnit(board, 'melee', createCard({ id: 'a', type: 'unit', row: 'melee', power: 5 }));
    addUnit(board, 'melee', createCard({ id: 'b', type: 'unit', row: 'melee', power: 3 }));
    expect(rowPower(board, 'melee', new Set(['melee']))).toBe(2); // 1 + 1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import `effectivePower`.

- [ ] **Step 3: Write minimal implementation — replace the body of `src/engine/Board.js` with:**

```js
export const ROWS = ['melee', 'ranged', 'siege'];

export function createBoard() {
  return { melee: [], ranged: [], siege: [], horns: new Set() };
}

export function addUnit(board, row, card) {
  if (!ROWS.includes(row)) {
    throw new Error(`Unknown row: ${row}`);
  }
  board[row].push(card);
}

export function effectivePower(card, row, board, weather) {
  if (card.def.type === 'hero') {
    return card.power;
  }
  let power = card.power;
  if (weather.has(row)) {
    power = 1;
  }
  if (board.horns.has(row)) {
    power = power * 2;
  }
  return power;
}

export function rowPower(board, row, weather = new Set()) {
  return board[row].reduce(
    (sum, card) => sum + effectivePower(card, row, board, weather),
    0,
  );
}

export function totalPower(board, weather = new Set()) {
  return ROWS.reduce((sum, row) => sum + rowPower(board, row, weather), 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — new Board tests plus all previously passing tests (existing units have no `type`, so `effectivePower` treats them as normal; default empty `weather` keeps old call sites unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Board.js src/engine/Board.test.js
git commit -m "feat(engine): compute effective power from weather and horn auras"
```

---

### Task 2: Match weather plumbing + card-type dispatch + weather specials

**Files:**
- Modify: `src/engine/GwentMatch.js`
- Test: `src/engine/GwentMatch.test.js` (ADD cases; do not delete existing ones)

**Interfaces:**
- Consumes: `createBoard`, `addUnit`, `totalPower` from `./Board.js`; existing match machinery.
- Produces:
  - `createMatch` now includes `weather: new Set()` in the returned state.
  - `playCard` dispatches on `card.def.type`: a `special` card calls `applyEffect` (and is NOT placed on a row); any other card is placed via `addUnit`. Turn passing/round logic is unchanged.
  - Internal `applyEffect(match, effect, row)` handles: `weather_frost`→add `melee`, `weather_fog`→add `ranged`, `weather_rain`→add `siege`, `clear`→clear all weather. Unknown effects throw `Unknown effect: <effect>` (horn/sign are added in later tasks).
  - `resolveRound` scores with `totalPower(board, match.weather)`.
  - `startNextRound` clears `match.weather` (weather does not carry across rounds).

- [ ] **Step 1: Write the failing test — ADD to `src/engine/GwentMatch.test.js`**

(The file already imports `createMatch`, `playCard`, `pass`, `hasLegalMove` from `./GwentMatch.js` and `totalPower` from `./Board.js`; no new imports needed.)

```js
describe('heroes and weather in a match', () => {
  it('a hero keeps its power under weather', () => {
    const hero = { id: 'h', type: 'hero', row: 'melee', power: 7 };
    const frost = { id: 'f', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const filler = { id: 'x', type: 'unit', row: 'melee', power: 3 };
    const match = createMatch([hero, filler], [frost, filler], 2);
    playCard(match, 0, 'melee'); // p0 plays hero(7)
    playCard(match, 0, 'melee'); // p1 plays frost -> weather on melee
    expect(totalPower(match.players[0].board, match.weather)).toBe(7);
  });

  it('weather drops a normal row to 1 per unit and a clear card removes it', () => {
    const strong = { id: 's', type: 'unit', row: 'melee', power: 6 };
    const frost = { id: 'f', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const clear = { id: 'c', type: 'special', effect: 'clear', row: 'melee', power: 0 };
    const match = createMatch([strong, strong], [frost, clear], 2);
    playCard(match, 0, 'melee'); // p0 strong(6)
    playCard(match, 0, 'melee'); // p1 frost -> weather melee
    expect(totalPower(match.players[0].board, match.weather)).toBe(1);
    pass(match);                 // p0 passes -> turn to p1
    playCard(match, 0, 'melee'); // p1 plays clear (p0 passed, so p1 keeps the turn)
    expect(match.weather.size).toBe(0);
    expect(totalPower(match.players[0].board, match.weather)).toBe(6);
  });

  it('weather is cleared when a new round starts', () => {
    const frost = { id: 'f', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const u = () => ({ id: 'u', type: 'unit', row: 'melee', power: 2 });
    const match = createMatch([frost, u()], [u(), u()], 2);
    playCard(match, 0, 'melee'); // p0 frost -> weather melee
    playCard(match, 0, 'melee'); // p1 u(2)
    pass(match);
    pass(match);                 // round resolves -> next round starts
    expect(match.weather.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `match.weather` is `undefined` (the first test's `totalPower(board, undefined)` throws, or weather assertions fail).

- [ ] **Step 3: Write minimal implementation — edit `src/engine/GwentMatch.js`**

Ensure the Board import includes `totalPower` (it already does from the engine-core work):

```js
import { createBoard, addUnit, totalPower } from './Board.js';
```

Add `weather: new Set()` to the object returned by `createMatch`:

```js
export function createMatch(deckA, deckB, handSize = 10) {
  return {
    players: [makePlayer(deckA, handSize), makePlayer(deckB, handSize)],
    current: 0,
    round: 1,
    roundStarter: 0,
    winner: null,
    lastRound: null,
    weather: new Set(),
  };
}
```

Add the effect map and dispatch helpers (place them above `playCard`):

```js
const WEATHER_ROW = {
  weather_frost: 'melee',
  weather_fog: 'ranged',
  weather_rain: 'siege',
};

function applyEffect(match, effect, row) {
  if (effect in WEATHER_ROW) {
    match.weather.add(WEATHER_ROW[effect]);
    return;
  }
  if (effect === 'clear') {
    match.weather.clear();
    return;
  }
  throw new Error(`Unknown effect: ${effect}`);
}

function applyCard(match, card, row) {
  if (card.def.type === 'special') {
    applyEffect(match, card.def.effect, row);
    return;
  }
  addUnit(match.players[match.current].board, row, card);
}
```

In `playCard`, replace the line `addUnit(player.board, row, card);` with:

```js
  applyCard(match, card, row);
```

In `resolveRound`, change the two power computations to pass weather:

```js
  const power0 = totalPower(p0.board, match.weather);
  const power1 = totalPower(p1.board, match.weather);
```

In `startNextRound`, add a weather clear (e.g. right after the loop that resets boards/passed):

```js
  match.weather.clear();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — new match tests plus all previous tests (existing untyped unit cards fall through `applyCard` to `addUnit`; empty `match.weather` leaves prior scoring unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): add weather effects, hero placement, and special-card dispatch"
```

---

### Task 3: Commander's horn

**Files:**
- Modify: `src/engine/GwentMatch.js`
- Test: `src/engine/GwentMatch.test.js` (ADD a case)

**Interfaces:**
- Consumes: `applyEffect` from Task 2.
- Produces: `applyEffect` handles `effect === 'horn'` by adding `row` to the CURRENT player's `board.horns`, doubling non-hero power in that row (heroes unaffected, per `effectivePower`).

- [ ] **Step 1: Write the failing test — ADD to `src/engine/GwentMatch.test.js`**

```js
describe('commander horn in a match', () => {
  it('doubles non-heroes in the caster row and ignores heroes', () => {
    const u = { id: 'u', type: 'unit', row: 'melee', power: 4 };
    const hero = { id: 'h', type: 'hero', row: 'melee', power: 5 };
    const horn = { id: 'hr', type: 'special', effect: 'horn', row: 'melee', power: 0 };
    const f = () => ({ id: 'f', type: 'unit', row: 'melee', power: 1 });
    const match = createMatch([u, hero, horn], [f(), f(), f()], 3);
    playCard(match, 0, 'melee'); // p0 u(4)
    playCard(match, 0, 'melee'); // p1 filler
    playCard(match, 0, 'melee'); // p0 hero(5)
    playCard(match, 0, 'melee'); // p1 filler
    playCard(match, 0, 'melee'); // p0 horn -> doubles p0 melee
    expect(totalPower(match.players[0].board, match.weather)).toBe(13); // 4*2 + 5
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `applyEffect` throws `Unknown effect: horn`.

- [ ] **Step 3: Write minimal implementation — in `src/engine/GwentMatch.js`, add a horn branch to `applyEffect` (before the final `throw`):**

```js
  if (effect === 'horn') {
    match.players[match.current].board.horns.add(row);
    return;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): add commander's horn row-doubling effect"
```

---

### Task 4: Sign damage (row damage)

**Files:**
- Modify: `src/engine/GwentMatch.js`
- Test: `src/engine/GwentMatch.test.js` (ADD cases)

**Interfaces:**
- Consumes: `applyEffect` from Tasks 2–3.
- Produces: `applyEffect` handles `effect === 'sign_damage'` by reducing the base `power` of each non-hero unit in the OPPONENT's `row` by 2, floored at 1. Instant (present units only); heroes unaffected.

- [ ] **Step 1: Write the failing test — ADD to `src/engine/GwentMatch.test.js`**

```js
describe('sign damage in a match', () => {
  it('reduces non-hero enemy units in the target row by 2, heroes immune', () => {
    const f = () => ({ id: 'f', type: 'unit', row: 'ranged', power: 1 });
    const sign = { id: 'sg', type: 'special', effect: 'sign_damage', row: 'melee', power: 0 };
    const big = { id: 'b', type: 'unit', row: 'melee', power: 5 };
    const hero = { id: 'h', type: 'hero', row: 'melee', power: 4 };
    const extra = { id: 'e', type: 'unit', row: 'siege', power: 1 };
    const match = createMatch([f(), f(), sign], [big, hero, extra], 3);
    playCard(match, 0, 'ranged'); // p0 filler
    playCard(match, 0, 'melee');  // p1 big
    playCard(match, 0, 'ranged'); // p0 filler
    playCard(match, 0, 'melee');  // p1 hero
    playCard(match, 0, 'melee');  // p0 casts sign at p1's melee
    expect(match.players[1].board.melee[0].power).toBe(3); // big 5 -> 3
    expect(match.players[1].board.melee[1].power).toBe(4); // hero immune
  });

  it('floors damaged power at 1', () => {
    const f = () => ({ id: 'f', type: 'unit', row: 'ranged', power: 1 });
    const sign = { id: 'sg', type: 'special', effect: 'sign_damage', row: 'melee', power: 0 };
    const weak = { id: 'w', type: 'unit', row: 'melee', power: 2 };
    const extra = { id: 'e', type: 'unit', row: 'siege', power: 1 };
    const match = createMatch([f(), sign], [weak, extra], 2);
    playCard(match, 0, 'ranged'); // p0 filler
    playCard(match, 0, 'melee');  // p1 weak
    playCard(match, 0, 'melee');  // p0 sign
    expect(match.players[1].board.melee[0].power).toBe(1); // 2 - 2 = 0 -> floor 1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `applyEffect` throws `Unknown effect: sign_damage`.

- [ ] **Step 3: Write minimal implementation — in `src/engine/GwentMatch.js`, add a sign-damage branch to `applyEffect` (before the final `throw`):**

```js
  if (effect === 'sign_damage') {
    const opponentBoard = match.players[1 - match.current].board;
    for (const card of opponentBoard[row]) {
      if (card.def.type !== 'hero') {
        card.power = Math.max(1, card.power - 2);
      }
    }
    return;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): add sign row-damage effect"
```

---

### Task 5: Regression — auto-played match with special cards

**Files:**
- Modify: `src/engine/playMatch.test.js` (ADD a case)

**Interfaces:**
- Consumes: `playMatch` (existing); the greedy AI plays specials (power 0) after units and dispatches them through the effect system.
- Produces: confidence that decks containing special cards still terminate in a decided match.

- [ ] **Step 1: Write the failing test — ADD to `src/engine/playMatch.test.js`**

```js
describe('playMatch with special cards', () => {
  it('terminates with a decided match when decks contain specials', () => {
    const u = (id, p) => ({ id, type: 'unit', row: 'melee', power: p });
    const frost = { id: 'frost', type: 'special', effect: 'weather_frost', row: 'melee', power: 0 };
    const horn = { id: 'horn', type: 'special', effect: 'horn', row: 'melee', power: 0 };
    const sign = { id: 'sign', type: 'special', effect: 'sign_damage', row: 'melee', power: 0 };
    const deckA = [u('a1', 6), u('a2', 6), frost, horn];
    const deckB = [u('b1', 4), u('b2', 4), sign, u('b3', 4)];
    const match = playMatch(deckA, deckB, 4);
    expect([0, 1, 'draw']).toContain(match.winner);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (this is a regression check — it should already pass once Tasks 1–4 are in)**

Run: `npm test`
Expected: PASS. If it FAILS or hangs, the effect dispatch has a defect to fix before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/engine/playMatch.test.js
git commit -m "test(engine): cover auto-played matches with special cards"
```

---

## Self-Review

**Spec coverage:**
- Effective-power recomputation (hero immunity, weather=1, horn=×2, order) → Task 1. ✅
- Weather specials (frost/fog/rain) + clear, both-sides, cleared next round → Task 2. ✅
- Card-type dispatch (`special` vs unit/hero), hero placement → Task 2. ✅
- Commander's horn (per-side row double, heroes immune) → Task 3. ✅
- Sign row damage (−2 floor 1, opponent row, heroes immune, instant) → Task 4. ✅
- `resolveRound`/`startNextRound` weather wiring → Task 2. ✅
- Regression: specials in auto-played match → Task 5. ✅
- Deferred by spec (out of scope, no task, intentional): heal/medic, spy, leader, extra factions, full card catalog, smarter AI for specials. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step has full code. ✅

**Type consistency:** `createBoard` adds `horns:Set` used by `effectivePower`/`applyEffect`; `match.weather:Set` set in `createMatch`, read in `resolveRound`, cleared in `startNextRound`, mutated in `applyEffect`; `applyCard`/`applyEffect` signatures consistent across Tasks 2–4; special card defs use `{type:'special', effect, row, power}` consistently; `rowPower`/`totalPower` optional `weather` param consistent. ✅
