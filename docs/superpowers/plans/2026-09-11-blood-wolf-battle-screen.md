# Blood Wolf — Battle Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A thin Phaser scene that renders one Player-vs-AI Gwent match on the existing engine and turns player clicks into `playCard`/`pass` calls.

**Architecture:** Pure, testable modules (`ui/layout.js`, `data/starterDecks.js`) are built with TDD. The Phaser pieces (`ui/CardView.js`, `scenes/BattleScene.js`, `main.js`) hold no game rules — they only render match state and call the engine — and are verified by building the bundle and driving the page in a browser.

**Tech Stack:** Phaser 3, Vite, Vitest, plain JavaScript ES modules.

## Global Constraints

- Language: plain JavaScript, ES modules, no TypeScript.
- `src/engine/**` must remain pure — do NOT import Phaser/DOM into it, and do NOT modify engine files in this plan.
- Rows are exactly: `melee`, `ranged`, `siege`.
- Player is side 0; AI is side 1 (`OpponentAI.chooseMove`).
- Screen is 16:9, 1280×720.
- Card/faction names are original (no «Ведьмак» IP).
- The existing 43 engine tests must stay green.

---

### Task 1: Starter decks (content)

**Files:**
- Create: `src/data/starterDecks.js`
- Test: `src/data/starterDecks.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `PLAYER_DECK` and `AI_DECK` — arrays of card definitions `{ id, name, faction, type, row, power, effect, rarity, cost, art }`. Units/heroes have a real `row`; specials carry `effect` and a `row` (used as a default target). Each deck has at least 10 cards so a `handSize` of 10 fills a hand.

- [ ] **Step 1: Write the failing test — `src/data/starterDecks.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { PLAYER_DECK, AI_DECK } from './starterDecks.js';

const ROWS = ['melee', 'ranged', 'siege'];

describe('starter decks', () => {
  it('each deck has at least 10 cards', () => {
    expect(PLAYER_DECK.length).toBeGreaterThanOrEqual(10);
    expect(AI_DECK.length).toBeGreaterThanOrEqual(10);
  });

  it('every card has an id, a type, and a valid row', () => {
    for (const card of [...PLAYER_DECK, ...AI_DECK]) {
      expect(typeof card.id).toBe('string');
      expect(['unit', 'hero', 'special']).toContain(card.type);
      expect(ROWS).toContain(card.row);
    }
  });

  it('every special card names an effect', () => {
    for (const card of [...PLAYER_DECK, ...AI_DECK]) {
      if (card.type === 'special') {
        expect(typeof card.effect).toBe('string');
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./starterDecks.js`.

- [ ] **Step 3: Write minimal implementation — `src/data/starterDecks.js`**

```js
// Original dark-fantasy content (no third-party IP).
const card = (id, name, type, row, power, effect = null, rarity = 'common') => ({
  id, name, faction: 'humans', type, row, power, effect, rarity, cost: 0, art: null,
});

export const PLAYER_DECK = [
  card('merc_a', 'Наёмник', 'unit', 'melee', 4),
  card('merc_b', 'Наёмник', 'unit', 'melee', 4),
  card('merc_c', 'Наёмник', 'unit', 'melee', 4),
  card('knight', 'Рыцарь', 'unit', 'melee', 6),
  card('archer_a', 'Лучник', 'unit', 'ranged', 3),
  card('archer_b', 'Лучник', 'unit', 'ranged', 3),
  card('catapult', 'Катапульта', 'unit', 'siege', 5),
  card('champion', 'Витязь', 'hero', 'melee', 7),
  card('warhorn', 'Рог войны', 'special', 'melee', 0, 'horn'),
  card('frost', 'Мороз', 'special', 'melee', 0, 'weather_frost'),
  card('clear_sky', 'Ясное небо', 'special', 'melee', 0, 'clear'),
];

export const AI_DECK = [
  { id: 'ghoul_a', name: 'Упырь', faction: 'monsters', type: 'unit', row: 'melee', power: 3, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'ghoul_b', name: 'Упырь', faction: 'monsters', type: 'unit', row: 'melee', power: 3, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'ghoul_c', name: 'Упырь', faction: 'monsters', type: 'unit', row: 'melee', power: 3, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'harpy_a', name: 'Гарпия', faction: 'monsters', type: 'unit', row: 'ranged', power: 4, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'harpy_b', name: 'Гарпия', faction: 'monsters', type: 'unit', row: 'ranged', power: 4, effect: null, rarity: 'common', cost: 0, art: null },
  { id: 'troll_a', name: 'Тролль', faction: 'monsters', type: 'unit', row: 'siege', power: 6, effect: null, rarity: 'rare', cost: 0, art: null },
  { id: 'troll_b', name: 'Тролль', faction: 'monsters', type: 'unit', row: 'siege', power: 6, effect: null, rarity: 'rare', cost: 0, art: null },
  { id: 'beast', name: 'Зверь', faction: 'monsters', type: 'hero', row: 'melee', power: 8, effect: null, rarity: 'legendary', cost: 0, art: null },
  { id: 'blight', name: 'Порча', faction: 'monsters', type: 'special', row: 'melee', power: 0, effect: 'sign_damage', rarity: 'rare', cost: 0, art: null },
  { id: 'fog', name: 'Туман', faction: 'monsters', type: 'special', row: 'ranged', power: 0, effect: 'weather_fog', rarity: 'common', cost: 0, art: null },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (starter-deck tests plus all 43 existing).

- [ ] **Step 5: Commit**

```bash
git add src/data/starterDecks.js src/data/starterDecks.test.js
git commit -m "feat(data): add starter decks for the battle screen"
```

---

### Task 2: Layout module (pure)

**Files:**
- Create: `src/ui/layout.js`
- Test: `src/ui/layout.test.js`

**Interfaces:**
- Consumes: nothing (pure, no Phaser).
- Produces:
  - `SCREEN` → `{ width: 1280, height: 720 }`
  - `ROW_NAMES` → `['melee', 'ranged', 'siege']`
  - `CARD_W` (84), `CARD_H` (116), `ROW_HEIGHT` (84), `HAND_Y` (680)
  - `rowY(side, rowName)` → y for a row; `side` is `'player'` (below centre) or `'opponent'` (above centre); `melee` is nearest the centre; throws `Unknown row: <row>` on a bad row.
  - `handCardX(index, count, gap = 8)` → x that lays `count` cards centred horizontally.

- [ ] **Step 1: Write the failing test — `src/ui/layout.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { SCREEN, ROW_NAMES, rowY, handCardX } from './layout.js';

describe('layout', () => {
  it('lists the three rows in order', () => {
    expect(ROW_NAMES).toEqual(['melee', 'ranged', 'siege']);
  });

  it('puts player rows below centre and opponent rows above', () => {
    expect(rowY('player', 'melee')).toBeGreaterThan(SCREEN.height / 2);
    expect(rowY('opponent', 'melee')).toBeLessThan(SCREEN.height / 2);
  });

  it('keeps melee closest to the centre on each side', () => {
    expect(rowY('player', 'melee')).toBeLessThan(rowY('player', 'siege'));
    expect(rowY('opponent', 'melee')).toBeGreaterThan(rowY('opponent', 'siege'));
  });

  it('throws on an unknown row', () => {
    expect(() => rowY('player', 'sky')).toThrow('Unknown row: sky');
  });

  it('centres the hand horizontally', () => {
    const first = handCardX(0, 4);
    const last = handCardX(3, 4);
    expect(first).toBeLessThan(last);
    expect((first + last) / 2).toBeCloseTo(SCREEN.width / 2, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./layout.js`.

- [ ] **Step 3: Write minimal implementation — `src/ui/layout.js`**

```js
export const SCREEN = { width: 1280, height: 720 };
export const ROW_NAMES = ['melee', 'ranged', 'siege'];
export const CARD_W = 84;
export const CARD_H = 116;
export const ROW_HEIGHT = 84;
export const HAND_Y = 680;

const ROW_INDEX = { melee: 0, ranged: 1, siege: 2 };

export function rowY(side, rowName) {
  const i = ROW_INDEX[rowName];
  if (i === undefined) {
    throw new Error(`Unknown row: ${rowName}`);
  }
  const offset = ROW_HEIGHT * (i + 1);
  return side === 'player' ? SCREEN.height / 2 + offset : SCREEN.height / 2 - offset;
}

export function handCardX(index, count, gap = 8) {
  const totalWidth = count * CARD_W + (count - 1) * gap;
  const startX = (SCREEN.width - totalWidth) / 2 + CARD_W / 2;
  return startX + index * (CARD_W + gap);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/layout.js src/ui/layout.test.js
git commit -m "feat(ui): add pure layout module for the battle screen"
```

---

### Task 3: Card view (Phaser card component)

**Files:**
- Create: `src/ui/CardView.js`

**Interfaces:**
- Consumes: `CARD_W`, `CARD_H` from `./layout.js`; a Phaser `scene`.
- Produces: `createCardView(scene, cardDef, options = {})` → a Phaser `Container` positioned at (0,0) whose first child (`container.list[0]`) is the background rectangle (used by the caller to attach input). `options`: `{ faceDown = false, selected = false }`. Face-up cards show name and (for non-specials) power; specials show a "знак" tag; heroes tint the power gold-orange.

**Verification note:** This file uses Phaser and is not unit-tested; it is exercised by the browser verification in Task 4. The test step here is that the production bundle builds.

- [ ] **Step 1: Write the implementation — `src/ui/CardView.js`**

```js
import Phaser from 'phaser';
import { CARD_W, CARD_H } from './layout.js';

export function createCardView(scene, cardDef, options = {}) {
  const { faceDown = false, selected = false } = options;
  const container = scene.add.container(0, 0);

  const fill = faceDown ? 0x3a2a1a : 0x24222b;
  const strokeColor = selected ? 0xffd479 : 0x8a6d3b;
  const bg = scene.add
    .rectangle(0, 0, CARD_W, CARD_H, fill)
    .setStrokeStyle(selected ? 3 : 2, strokeColor);
  container.add(bg);

  if (!faceDown) {
    const title = cardDef.name ?? cardDef.id;
    container.add(
      scene.add
        .text(0, -CARD_H / 2 + 8, title, {
          fontSize: '12px',
          color: '#e8dcc0',
          align: 'center',
          wordWrap: { width: CARD_W - 10 },
        })
        .setOrigin(0.5, 0),
    );

    if (cardDef.type === 'special') {
      container.add(
        scene.add.text(0, CARD_H / 2 - 18, 'знак', { fontSize: '12px', color: '#9fe3d0' }).setOrigin(0.5),
      );
    } else {
      const color = cardDef.type === 'hero' ? '#ff9d5c' : '#ffd479';
      container.add(
        scene.add.text(0, CARD_H / 2 - 20, String(cardDef.power), { fontSize: '22px', color }).setOrigin(0.5),
      );
    }
  }

  container.setSize(CARD_W, CARD_H);
  return container;
}
```

- [ ] **Step 2: Verify the bundle builds**

Run: `npm run build`
Expected: Vite build succeeds with no errors (imports resolve; Phaser bundles).

- [ ] **Step 3: Commit**

```bash
git add src/ui/CardView.js
git commit -m "feat(ui): add card view component"
```

---

### Task 4: Battle scene + Phaser bootstrap

**Files:**
- Create: `src/scenes/BattleScene.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `createMatch`, `playCard`, `pass` from `../engine/GwentMatch.js`; `chooseMove` from `../engine/ai/OpponentAI.js`; `rowPower` from `../engine/Board.js`; `createCardView` from `../ui/CardView.js`; `SCREEN`, `ROW_NAMES`, `rowY`, `handCardX`, `HAND_Y`, `CARD_W` from `../ui/layout.js`; `PLAYER_DECK`, `AI_DECK` from `../data/starterDecks.js`.
- Produces: a running Phaser game showing one Player-vs-AI match.

**Verification note:** Phaser scene, not unit-tested. Verified by building the bundle and driving the page in a browser (checklist in Step 3).

- [ ] **Step 1: Write the scene — `src/scenes/BattleScene.js`**

```js
import Phaser from 'phaser';
import { createMatch, playCard, pass } from '../engine/GwentMatch.js';
import { chooseMove } from '../engine/ai/OpponentAI.js';
import { rowPower } from '../engine/Board.js';
import { createCardView } from '../ui/CardView.js';
import { SCREEN, ROW_NAMES, rowY, handCardX, HAND_Y, CARD_W } from '../ui/layout.js';
import { PLAYER_DECK, AI_DECK } from '../data/starterDecks.js';

const NO_TARGET_EFFECTS = ['weather_frost', 'weather_fog', 'weather_rain', 'clear'];

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create() {
    this.match = createMatch(PLAYER_DECK, AI_DECK, 10);
    this.selectedIndex = null;
    this.root = this.add.container(0, 0);
    this.render();
  }

  addText(x, y, text, color, size = '16px') {
    const t = this.add.text(x, y, text, { fontSize: size, color });
    this.root.add(t);
    return t;
  }

  render() {
    this.root.removeAll(true);
    const m = this.match;
    const [player, opp] = m.players;

    this.addText(20, 14, `Соперник — карт: ${opp.hand.length}   раунды: ${pips(opp.roundsWon)}`, '#d8c9a8');
    const status = m.winner !== null ? '' : m.current === 0 ? 'Твой ход' : 'Ход ИИ…';
    this.addText(SCREEN.width / 2 - 40, 14, status, '#ffffff');

    for (const rowName of ROW_NAMES) {
      this.renderRow(opp, 'opponent', rowName);
      this.renderRow(player, 'player', rowName);
    }

    const weather = m.weather.size ? `ПОГОДА: ${[...m.weather].join(', ')}` : 'ПОГОДА: —';
    this.addText(20, SCREEN.height / 2 - 10, weather, '#9fe3d0');
    const totalYou = ROW_NAMES.reduce((s, r) => s + rowPower(player.board, r, m.weather), 0);
    const totalAi = ROW_NAMES.reduce((s, r) => s + rowPower(opp.board, r, m.weather), 0);
    this.addText(SCREEN.width - 260, SCREEN.height / 2 - 10, `ИИ: ${totalAi}    ТЫ: ${totalYou}`, '#ffd479');

    this.renderHand(player);

    this.addText(20, HAND_Y + 30, `Ты — раунды: ${pips(player.roundsWon)}`, '#d8c9a8');
    const passBtn = this.addText(SCREEN.width - 160, HAND_Y + 30, '[ ПАС ]', '#ffb3b3', '20px').setInteractive({ useHandCursor: true });
    passBtn.on('pointerdown', () => this.onPass());

    if (m.winner !== null) {
      this.renderResult();
    }
  }

  renderRow(side, sideName, rowName) {
    const y = rowY(sideName, rowName);
    const bg = this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, 0x1c1a22).setStrokeStyle(1, 0x4a4436);
    this.root.add(bg);

    side.board[rowName].forEach((card, i) => {
      const cv = createCardView(this, card.def);
      cv.setScale(0.6);
      cv.setPosition(220 + i * (CARD_W * 0.6 + 6), y);
      this.root.add(cv);
    });

    const power = rowPower(side.board, rowName, this.match.weather);
    this.addText(SCREEN.width - 300, y - 10, `[${power}]`, '#ffd479');

    if (this.selectedIndex !== null && this.isValidTarget(sideName, rowName)) {
      bg.setStrokeStyle(3, 0xffd479).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onRowClick(rowName));
    }
  }

  renderHand(player) {
    player.hand.forEach((card, i) => {
      const cv = createCardView(this, card.def, { selected: this.selectedIndex === i });
      cv.setPosition(handCardX(i, player.hand.length), HAND_Y - 30);
      const bg = cv.list[0];
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onHandClick(i));
      this.root.add(cv);
    });
  }

  isValidTarget(sideName, rowName) {
    const card = this.match.players[0].hand[this.selectedIndex];
    if (!card) return false;
    const def = card.def;
    if (def.type === 'special') {
      if (def.effect === 'horn') return sideName === 'player';
      if (def.effect === 'sign_damage') return sideName === 'opponent';
      return false;
    }
    return sideName === 'player' && rowName === def.row;
  }

  onHandClick(i) {
    if (this.match.current !== 0 || this.match.winner !== null) return;
    const def = this.match.players[0].hand[i].def;
    if (def.type === 'special' && NO_TARGET_EFFECTS.includes(def.effect)) {
      playCard(this.match, i, 'melee'); // row ignored for weather/clear
      this.selectedIndex = null;
      this.afterPlayerAction();
      return;
    }
    this.selectedIndex = this.selectedIndex === i ? null : i;
    this.render();
  }

  onRowClick(rowName) {
    if (this.selectedIndex === null) return;
    playCard(this.match, this.selectedIndex, rowName);
    this.selectedIndex = null;
    this.afterPlayerAction();
  }

  onPass() {
    if (this.match.current !== 0 || this.match.winner !== null) return;
    pass(this.match);
    this.selectedIndex = null;
    this.afterPlayerAction();
  }

  afterPlayerAction() {
    this.render();
    this.maybeRunAi();
  }

  maybeRunAi() {
    if (this.match.winner !== null || this.match.current !== 1) return;
    this.time.delayedCall(600, () => {
      if (this.match.winner !== null || this.match.current !== 1) {
        this.render();
        return;
      }
      const move = chooseMove(this.match, 1);
      if (move.type === 'pass') {
        pass(this.match);
      } else {
        playCard(this.match, move.cardIndex, move.row);
      }
      this.render();
      this.maybeRunAi();
    });
  }

  renderResult() {
    const overlay = this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x000000, 0.6);
    this.root.add(overlay);
    const w = this.match.winner;
    const text = w === 0 ? 'ПОБЕДА' : w === 1 ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
    this.root.add(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2, text, { fontSize: '48px', color: '#ffd479' }).setOrigin(0.5),
    );
  }
}

function pips(won) {
  return '●'.repeat(won) + '○'.repeat(Math.max(0, 2 - won));
}
```

- [ ] **Step 2: Wire up Phaser — replace `src/main.js` with:**

```js
import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene.js';
import { SCREEN } from './ui/layout.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: '#14100c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BattleScene],
});
```

- [ ] **Step 3: Build, then verify in the browser**

Run: `npm run build`
Expected: build succeeds.

Then run the dev server (`npm run dev`) and verify in a browser (this is a visual check — capture screenshots):
1. The board renders: opponent's three rows on top, player's three rows on the bottom, the player's hand along the bottom, totals in the centre, a PASS button.
2. Clicking a unit card in hand highlights it and highlights the valid player row; clicking that row places the card and the row total updates.
3. Clicking a weather special (Мороз) plays immediately and the centre shows the active weather; the affected row's total drops.
4. After the player acts, the AI takes its turn after a short delay and the board updates.
5. Passing with both sides leads to a round result, and reaching two round wins shows ПОБЕДА / ПОРАЖЕНИЕ / НИЧЬЯ.

If spacing overlaps (rows vs hand), adjust the constants in `src/ui/layout.js` (`ROW_HEIGHT`, `HAND_Y`) and the row card scale in `BattleScene.renderRow`, then rebuild. Re-run `npm test` to confirm the layout tests still pass after any constant change.

- [ ] **Step 4: Confirm engine tests still green**

Run: `npm test`
Expected: PASS — all engine + data + layout tests (43 engine + starter-deck + layout).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BattleScene.js src/main.js
git commit -m "feat(ui): add player-vs-AI battle scene"
```

---

## Self-Review

**Spec coverage:**
- Player-vs-AI single match on the engine → Task 4. ✅
- Placeholder card rendering (name + power, special tag, hero tint) → Task 3. ✅
- Starter decks in `data/` → Task 1. ✅
- 16:9 layout, rows/hand/centre/pass, pure layout module (unit-tested) → Task 2 + Task 4. ✅
- Click-to-select input; no-target specials play immediately; horn→own row, sign→opponent row → Task 4 (`onHandClick`, `isValidTarget`, `NO_TARGET_EFFECTS`). ✅
- AI auto-turn with delay + status text → Task 4 (`maybeRunAi`). ✅
- Round/match-end result overlay → Task 4 (`renderResult`). ✅
- Engine stays pure & unmodified; 43 tests green → Global Constraints + Task 4 Step 4. ✅
- Out of scope (no task, intentional): menus, story, economy, shop/chest, Yandex SDK, online, full catalog, art, sound, animations. ✅

**Placeholder scan:** No TBD/TODO. Phaser files legitimately verified by build + browser rather than unit tests (documented per task). ✅

**Type consistency:** `createCardView(scene, cardDef, options)` used consistently; layout exports (`SCREEN`, `ROW_NAMES`, `rowY`, `handCardX`, `HAND_Y`, `CARD_W`, `CARD_H`) match their uses; engine calls (`createMatch`, `playCard(match, index, row)`, `pass`, `chooseMove(match, 1)`, `rowPower(board, row, weather)`) match the existing engine signatures; card-def shape matches `starterDecks.js`. ✅
