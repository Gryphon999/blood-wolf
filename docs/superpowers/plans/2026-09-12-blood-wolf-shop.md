# Blood Wolf — Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shop where the player buys new cards with gold; bought cards become available in the deck.

**Architecture:** A new buyable card pool feeds the card catalog. Pure `canBuy`/`buyCard` functions extend the profile logic (unit-tested). A `ShopScene` renders the pool and calls them. The engine is untouched.

**Tech Stack:** Phaser 3, Vite, Vitest, plain JavaScript ES modules.

## Global Constraints

- Language: plain JavaScript, ES modules, no TypeScript.
- `src/engine/**` stays pure and is NOT modified.
- Card names original (no third-party IP); rows exactly melee/ranged/siege.
- Each shop card is buyable once (no duplicates).
- Do NOT add a full-screen background rectangle in scenes that use a `root` container created in `create()` — the game's `backgroundColor` already provides the dark background (drawing a bg rect later covers the content).
- The existing 70 tests must stay green.

---

### Task 1: Shop card pool + catalog

**Files:**
- Create: `src/data/shopCards.js`
- Test: `src/data/shopCards.test.js`
- Modify: `src/data/cardCatalog.js`
- Modify: `src/data/cardCatalog.test.js`

**Interfaces:**
- Produces: `SHOP_CARDS` (array of buyable card defs, each with `cost > 0`); catalog `getCard` resolves shop cards.

- [ ] **Step 1: Write the failing test — `src/data/shopCards.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { SHOP_CARDS } from './shopCards.js';

const ROWS = ['melee', 'ranged', 'siege'];

describe('shopCards', () => {
  it('offers five buyable cards, each priced above zero', () => {
    expect(SHOP_CARDS.length).toBe(5);
    for (const card of SHOP_CARDS) {
      expect(card.cost).toBeGreaterThan(0);
      expect(['unit', 'hero', 'special']).toContain(card.type);
      expect(ROWS).toContain(card.row);
    }
  });

  it('gives the special card an effect', () => {
    const special = SHOP_CARDS.find((c) => c.type === 'special');
    expect(typeof special.effect).toBe('string');
  });
});
```

Also add to `src/data/cardCatalog.test.js` (append):

```js
it('resolves a shop card', () => {
  expect(getCard('paladin').name).toBe('Паладин');
});
```

- [ ] **Step 2: Run test — expect FAIL (cannot import `./shopCards.js`; `getCard('paladin')` throws).** `npm test`

- [ ] **Step 3: Write `src/data/shopCards.js`**

```js
const card = (id, name, type, row, power, effect, rarity, cost) => ({
  id, name, faction: 'humans', type, row, power, effect, rarity, cost, art: null,
});

export const SHOP_CARDS = [
  card('guard', 'Страж', 'unit', 'melee', 5, null, 'common', 100),
  card('crossbow', 'Арбалетчик', 'unit', 'ranged', 5, null, 'common', 100),
  card('trebuchet', 'Требушет', 'unit', 'siege', 7, null, 'rare', 300),
  card('paladin', 'Паладин', 'hero', 'melee', 9, null, 'legendary', 800),
  card('flame', 'Пламя', 'special', 'melee', 0, 'sign_damage', 'rare', 300),
];
```

Then modify `src/data/cardCatalog.js` to include the shop pool:

```js
import { PLAYER_DECK, AI_DECK } from './starterDecks.js';
import { SHOP_CARDS } from './shopCards.js';

const ALL = [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS];
const CATALOG = Object.fromEntries(ALL.map((card) => [card.id, card]));

export const ALL_CARD_IDS = ALL.map((card) => card.id);

export function getCard(id) {
  const def = CATALOG[id];
  if (!def) {
    throw new Error(`Unknown card: ${id}`);
  }
  return def;
}
```

- [ ] **Step 4: Run test — expect PASS (+ all 70 existing).** `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/data/shopCards.js src/data/shopCards.test.js src/data/cardCatalog.js src/data/cardCatalog.test.js
git commit -m "feat(data): add buyable shop card pool to the catalog"
```

---

### Task 2: Buy logic (pure)

**Files:**
- Modify: `src/economy/profile.js`
- Test: `src/economy/profile.test.js` (append)

**Interfaces:**
- Consumes: `getCard` (already imported in profile.js).
- Produces: `canBuy(profile, id)` (not owned AND enough gold); `buyCard(profile, id)` (spend `cost`, add `collection[id] = {count:1, level:1}`; throws `Cannot buy card: <id>` if `!canBuy`).

- [ ] **Step 1: Write the failing test — append to `src/economy/profile.test.js`**

```js
import { canBuy, buyCard } from './profile.js';

describe('shop purchases', () => {
  it('buys a card the player can afford, spending gold and adding to collection', () => {
    const p = createProfile();
    addGold(p, 150);
    expect(canBuy(p, 'guard')).toBe(true);
    buyCard(p, 'guard');
    expect(p.gold).toBe(50);
    expect(p.collection['guard']).toEqual({ count: 1, level: 1 });
  });

  it('cannot buy a card already owned', () => {
    const p = createProfile();
    addGold(p, 1000);
    buyCard(p, 'guard');
    expect(canBuy(p, 'guard')).toBe(false);
    expect(() => buyCard(p, 'guard')).toThrow('Cannot buy card: guard');
  });

  it('cannot buy without enough gold', () => {
    const p = createProfile();
    expect(canBuy(p, 'paladin')).toBe(false);
    expect(() => buyCard(p, 'paladin')).toThrow('Cannot buy card: paladin');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (cannot import `canBuy`/`buyCard`).** `npm test`

- [ ] **Step 3: Add to `src/economy/profile.js` (after `upgradeCard`)**

```js
export function canBuy(profile, id) {
  if (profile.collection[id]) return false;
  return profile.gold >= getCard(id).cost;
}

export function buyCard(profile, id) {
  if (!canBuy(profile, id)) {
    throw new Error(`Cannot buy card: ${id}`);
  }
  profile.gold -= getCard(id).cost;
  profile.collection[id] = { count: 1, level: 1 };
  return profile;
}
```

- [ ] **Step 4: Run test — expect PASS (+ all existing).** `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/economy/profile.js src/economy/profile.test.js
git commit -m "feat(economy): add card purchase logic"
```

---

### Task 3: Shop scene + menu wiring

**Files:**
- Create: `src/scenes/ShopScene.js`
- Modify: `src/scenes/MenuScene.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `SHOP_CARDS` (`../data/shopCards.js`); `getProfile`, `persist` (`../economy/session.js`); `canBuy`, `buyCard` (`../economy/profile.js`); `createCardView` (`../ui/CardView.js`); `SCREEN` (`../ui/layout.js`).
- Produces: `ShopScene` (key `'ShopScene'`); Menu "Магазин" starts it.

Browser-verified.

- [ ] **Step 1: Create `src/scenes/ShopScene.js`**

```js
import Phaser from 'phaser';
import { SHOP_CARDS } from '../data/shopCards.js';
import { createCardView } from '../ui/CardView.js';
import { getProfile, persist } from '../economy/session.js';
import { canBuy, buyCard } from '../economy/profile.js';
import { SCREEN } from '../ui/layout.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    this.root = this.add.container(0, 0);
    this.render();
  }

  text(x, y, t, color, size = '16px') {
    const o = this.add.text(x, y, t, { fontSize: size, color });
    this.root.add(o);
    return o;
  }

  render() {
    this.root.removeAll(true);
    const p = getProfile();

    this.text(20, 16, `Золото: ${p.gold}`, '#ffd479', '22px');
    this.text(SCREEN.width / 2 - 60, 16, 'Магазин', '#d8c9a8', '22px');
    const back = this.text(SCREEN.width - 120, 16, '‹ В меню', '#9fbfff', '20px').setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));

    const cols = 5;
    const startX = 200;
    const startY = 220;
    const stepX = 200;

    SHOP_CARDS.forEach((def, idx) => {
      const x = startX + (idx % cols) * stepX;
      const y = startY;
      const cv = createCardView(this, def);
      cv.setScale(0.9);
      cv.setPosition(x, y);
      this.root.add(cv);

      const owned = Boolean(p.collection[def.id]);
      if (owned) {
        this.text(x - 22, y + 76, 'есть', '#9a8a6a', '16px');
      } else if (canBuy(p, def.id)) {
        const buy = this.text(x - 40, y + 76, `Купить ${def.cost}`, '#9fe3d0', '16px').setInteractive({ useHandCursor: true });
        buy.on('pointerdown', () => {
          buyCard(p, def.id);
          persist();
          this.render();
        });
      } else {
        this.text(x - 44, y + 76, `${def.cost} — мало`, '#ff9d9d', '15px');
      }
    });
  }
}
```

- [ ] **Step 2: Enable "Магазин" in `src/scenes/MenuScene.js`**

In the `MENU_ITEMS.forEach` block, extend the target map:

```js
      const target = { 'Бой': 'BattleScene', 'Колода': 'DeckScene', 'Магазин': 'ShopScene' }[label];
```

- [ ] **Step 3: Register `ShopScene` in `src/main.js`**

Add the import and include it in the scene list:

```js
import { ShopScene } from './scenes/ShopScene.js';
```
and
```js
  scene: [MenuScene, BattleScene, DeckScene, ShopScene],
```

- [ ] **Step 4: Build, test, verify in browser, commit**

Run: `npm run build` (expect success) and `npm test` (expect all green, no engine changes).

Browser (`npm run dev`): Menu → "Магазин" shows 5 cards with prices; with too little gold each shows "<cost> — мало"; win battles to earn gold, then buy an affordable card — gold drops and the card flips to "есть"; open "Колода" and the bought card is now in the collection; "‹ В меню" returns; reload keeps the purchase.

```bash
git add src/scenes/ShopScene.js src/scenes/MenuScene.js src/main.js
git commit -m "feat(ui): add shop scene and menu wiring"
```

---

## Self-Review

**Spec coverage:**
- Buyable pool of 5 new cards with cost → Task 1. ✅
- Catalog resolves shop cards → Task 1. ✅
- canBuy/buyCard (not owned + affordable; spend + add; buy once) → Task 2. ✅
- ShopScene (grid, price, buy/есть/мало, gold, back) → Task 3. ✅
- Menu "Магазин" active → Task 3. ✅
- Bought cards appear in Колода (collection shared) → Task 2 + existing DeckScene. ✅
- Engine untouched, 70 tests green → Global Constraints. ✅
- No bg-rect-over-root pitfall → Global Constraints + ShopScene (no bg rect). ✅
- Out of scope (no task, intentional): duplicates, packs, ad chest, discounts. ✅

**Placeholder scan:** No TBD/TODO; Phaser scene verified by build + browser. ✅

**Type consistency:** `SHOP_CARDS` card-def shape matches catalog/profile usage; `canBuy`/`buyCard(profile,id)` consistent Task 2↔3; `getCard` resolves shop ids (Task 1) as `buyCard` needs (Task 2); scene keys `'ShopScene'`/`'MenuScene'` consistent; `createCardView(scene, def, {})` matches existing signature. ✅
