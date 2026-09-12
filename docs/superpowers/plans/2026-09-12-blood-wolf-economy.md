# Blood Wolf — Economy & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent player profile (gold, collection, deck, card upgrades) with a "Колода" deck-building screen, and wire it into battle (player's deck + gold reward on win).

**Architecture:** Profile/economy logic is a pure module (no Phaser), unit-tested. Persistence hides behind a store adapter over `localStorage`. The DeckScene renders the profile and calls pure functions; BattleScene builds its player deck from the profile and grants gold on a win. The Gwent engine is untouched.

**Tech Stack:** Phaser 3, Vite, Vitest, plain JavaScript ES modules.

## Global Constraints

- Language: plain JavaScript, ES modules, no TypeScript.
- `src/engine/**` stays pure and is NOT modified.
- `src/economy/profile.js` and `src/data/cardCatalog.js` must be pure (no Phaser/DOM) and unit-tested.
- Only unit cards (`type==='unit'`) are upgradable; upgrade adds +1 power per level, max level 3, costs 150 (→2) then 400 (→3).
- Gold reward for a battle win (winner === 0) is +50.
- A deck is valid at ≥10 cards.
- The existing 56 tests must stay green.

---

### Task 1: Card catalog (pure)

**Files:**
- Create: `src/data/cardCatalog.js`
- Test: `src/data/cardCatalog.test.js`

**Interfaces:**
- Consumes: `PLAYER_DECK`, `AI_DECK` from `./starterDecks.js`.
- Produces: `getCard(id)` → card def, throws `Unknown card: <id>` if absent; `ALL_CARD_IDS` → array of every id.

- [ ] **Step 1: Write the failing test — `src/data/cardCatalog.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { getCard, ALL_CARD_IDS } from './cardCatalog.js';

describe('cardCatalog', () => {
  it('returns a card definition by id', () => {
    expect(getCard('knight').name).toBe('Рыцарь');
  });

  it('throws on an unknown id', () => {
    expect(() => getCard('nope')).toThrow('Unknown card: nope');
  });

  it('lists all card ids', () => {
    expect(ALL_CARD_IDS).toContain('knight');
    expect(ALL_CARD_IDS).toContain('ghoul_a');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (cannot import `./cardCatalog.js`).** `npm test`

- [ ] **Step 3: Write `src/data/cardCatalog.js`**

```js
import { PLAYER_DECK, AI_DECK } from './starterDecks.js';

const ALL = [...PLAYER_DECK, ...AI_DECK];
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

- [ ] **Step 4: Run test — expect PASS (+ all 56 existing).** `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/data/cardCatalog.js src/data/cardCatalog.test.js
git commit -m "feat(data): add card catalog lookup"
```

---

### Task 2: Profile & economy logic (pure)

**Files:**
- Create: `src/economy/profile.js`
- Test: `src/economy/profile.test.js`

**Interfaces:**
- Consumes: `PLAYER_DECK` from `../data/starterDecks.js`; `getCard` from `../data/cardCatalog.js`.
- Produces:
  - `createProfile()` → `{ gold: 0, collection: {id:{count,level}}, deck: [id...], faction: 'humans' }` (collection = one of each PLAYER_DECK card at level 1; deck = all those ids).
  - `addGold(profile, amount)` → mutates gold, returns profile.
  - `upgradeCost(level)` → 150 for level 1, 400 for level 2; throws `Cannot upgrade from level <n>` otherwise.
  - `canUpgrade(profile, id)` → true only if owned, `type==='unit'`, level < 3, and enough gold.
  - `upgradeCard(profile, id)` → spends gold, +1 level; throws `Cannot upgrade card: <id>` if `!canUpgrade`.
  - `toggleDeckCard(profile, id)` → add/remove id in deck; throws `Card not in collection: <id>` if unowned.
  - `isDeckValid(profile)` → `deck.length >= 10`.
  - `buildDeckCards(profile)` → array of card defs for the deck, unit power raised by `(level-1)`.

- [ ] **Step 1: Write the failing test — `src/economy/profile.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  createProfile, addGold, upgradeCost, canUpgrade, upgradeCard,
  toggleDeckCard, isDeckValid, buildDeckCards,
} from './profile.js';

describe('profile', () => {
  it('starts with gold 0 and a full starter collection/deck', () => {
    const p = createProfile();
    expect(p.gold).toBe(0);
    expect(p.collection['knight']).toEqual({ count: 1, level: 1 });
    expect(p.deck.length).toBeGreaterThanOrEqual(10);
    expect(isDeckValid(p)).toBe(true);
  });

  it('adds gold', () => {
    const p = createProfile();
    addGold(p, 50);
    expect(p.gold).toBe(50);
  });

  it('exposes upgrade costs and rejects maxed level', () => {
    expect(upgradeCost(1)).toBe(150);
    expect(upgradeCost(2)).toBe(400);
    expect(() => upgradeCost(3)).toThrow('Cannot upgrade from level 3');
  });

  it('upgrades a unit card, spending gold and raising level', () => {
    const p = createProfile();
    addGold(p, 200);
    expect(canUpgrade(p, 'knight')).toBe(true);
    upgradeCard(p, 'knight');
    expect(p.collection['knight'].level).toBe(2);
    expect(p.gold).toBe(50); // 200 - 150
  });

  it('refuses to upgrade without enough gold', () => {
    const p = createProfile();
    expect(canUpgrade(p, 'knight')).toBe(false);
    expect(() => upgradeCard(p, 'knight')).toThrow('Cannot upgrade card: knight');
  });

  it('refuses to upgrade non-unit cards', () => {
    const p = createProfile();
    addGold(p, 1000);
    expect(canUpgrade(p, 'warhorn')).toBe(false); // special
    expect(canUpgrade(p, 'champion')).toBe(false); // hero
  });

  it('toggles cards in and out of the deck', () => {
    const p = createProfile();
    toggleDeckCard(p, 'knight');
    expect(p.deck).not.toContain('knight');
    toggleDeckCard(p, 'knight');
    expect(p.deck).toContain('knight');
  });

  it('applies upgrade level to unit power when building the deck', () => {
    const p = createProfile();
    addGold(p, 200);
    upgradeCard(p, 'knight'); // level 2 -> +1 power
    const knight = buildDeckCards(p).find((c) => c.id === 'knight');
    expect(knight.power).toBe(7); // base 6 + 1
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (cannot import `./profile.js`).** `npm test`

- [ ] **Step 3: Write `src/economy/profile.js`**

```js
import { PLAYER_DECK } from '../data/starterDecks.js';
import { getCard } from '../data/cardCatalog.js';

const UPGRADE_COSTS = { 1: 150, 2: 400 };
const MAX_LEVEL = 3;

export function createProfile() {
  const collection = {};
  for (const card of PLAYER_DECK) {
    collection[card.id] = { count: 1, level: 1 };
  }
  return {
    gold: 0,
    collection,
    deck: PLAYER_DECK.map((card) => card.id),
    faction: 'humans',
  };
}

export function addGold(profile, amount) {
  profile.gold += amount;
  return profile;
}

export function upgradeCost(level) {
  const cost = UPGRADE_COSTS[level];
  if (cost === undefined) {
    throw new Error(`Cannot upgrade from level ${level}`);
  }
  return cost;
}

export function canUpgrade(profile, id) {
  const owned = profile.collection[id];
  if (!owned) return false;
  if (getCard(id).type !== 'unit') return false;
  if (owned.level >= MAX_LEVEL) return false;
  return profile.gold >= upgradeCost(owned.level);
}

export function upgradeCard(profile, id) {
  if (!canUpgrade(profile, id)) {
    throw new Error(`Cannot upgrade card: ${id}`);
  }
  const owned = profile.collection[id];
  profile.gold -= upgradeCost(owned.level);
  owned.level += 1;
  return profile;
}

export function toggleDeckCard(profile, id) {
  if (!profile.collection[id]) {
    throw new Error(`Card not in collection: ${id}`);
  }
  const i = profile.deck.indexOf(id);
  if (i >= 0) {
    profile.deck.splice(i, 1);
  } else {
    profile.deck.push(id);
  }
  return profile;
}

export function isDeckValid(profile) {
  return profile.deck.length >= 10;
}

export function buildDeckCards(profile) {
  return profile.deck.map((id) => {
    const def = getCard(id);
    const level = profile.collection[id]?.level ?? 1;
    const bonus = def.type === 'unit' ? level - 1 : 0;
    return { ...def, power: def.power + bonus };
  });
}
```

- [ ] **Step 4: Run test — expect PASS (+ all existing).** `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/economy/profile.js src/economy/profile.test.js
git commit -m "feat(economy): add pure profile and economy logic"
```

---

### Task 3: Profile persistence (store adapter)

**Files:**
- Create: `src/economy/profileStore.js`
- Test: `src/economy/profileStore.test.js`

**Interfaces:**
- Produces: `saveProfile(profile, storage = globalThis.localStorage)` and `loadProfile(storage = globalThis.localStorage)`. Stores JSON under key `blood-wolf-profile`. `loadProfile` returns the parsed profile, or `null` when absent or corrupt.

- [ ] **Step 1: Write the failing test — `src/economy/profileStore.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { saveProfile, loadProfile } from './profileStore.js';

function fakeStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
}

describe('profileStore', () => {
  it('round-trips a profile', () => {
    const s = fakeStorage();
    const profile = { gold: 120, collection: { knight: { count: 1, level: 2 } }, deck: ['knight'], faction: 'humans' };
    saveProfile(profile, s);
    expect(loadProfile(s)).toEqual(profile);
  });

  it('returns null when nothing is stored', () => {
    expect(loadProfile(fakeStorage())).toBeNull();
  });

  it('returns null on corrupt data', () => {
    const s = fakeStorage();
    s.setItem('blood-wolf-profile', '{not json');
    expect(loadProfile(s)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (cannot import `./profileStore.js`).** `npm test`

- [ ] **Step 3: Write `src/economy/profileStore.js`**

```js
const KEY = 'blood-wolf-profile';

export function saveProfile(profile, storage = globalThis.localStorage) {
  storage.setItem(KEY, JSON.stringify(profile));
}

export function loadProfile(storage = globalThis.localStorage) {
  const raw = storage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test — expect PASS (+ all existing).** `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/economy/profileStore.js src/economy/profileStore.test.js
git commit -m "feat(economy): add profile persistence adapter"
```

---

### Task 4: Session singleton + Deck scene + menu wiring

**Files:**
- Create: `src/economy/session.js`
- Create: `src/scenes/DeckScene.js`
- Modify: `src/scenes/MenuScene.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `loadProfile`/`saveProfile` (Task 3), `createProfile` (Task 2), profile mutators (Task 2), `getCard` (Task 1), `createCardView` (`../ui/CardView.js`), `SCREEN` (`../ui/layout.js`).
- Produces: `getProfile()` (lazy singleton: load or create) and `persist()` from `session.js`; a `DeckScene` (key `'DeckScene'`); `MenuScene` "Колода" now starts `'DeckScene'`.

Browser-verified (Phaser).

- [ ] **Step 1: Create `src/economy/session.js`**

```js
import { loadProfile, saveProfile } from './profileStore.js';
import { createProfile } from './profile.js';

let profile = null;

export function getProfile() {
  if (!profile) {
    profile = loadProfile() ?? createProfile();
  }
  return profile;
}

export function persist() {
  saveProfile(getProfile());
}
```

- [ ] **Step 2: Create `src/scenes/DeckScene.js`**

```js
import Phaser from 'phaser';
import { createCardView } from '../ui/CardView.js';
import { getProfile, persist } from '../economy/session.js';
import { canUpgrade, upgradeCard, upgradeCost, toggleDeckCard, isDeckValid } from '../economy/profile.js';
import { getCard } from '../data/cardCatalog.js';
import { SCREEN } from '../ui/layout.js';

export class DeckScene extends Phaser.Scene {
  constructor() {
    super('DeckScene');
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
    this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x14100c);

    this.text(20, 16, `Золото: ${p.gold}`, '#ffd479', '22px');
    const ok = isDeckValid(p);
    this.text(SCREEN.width / 2 - 130, 16, `Колода: ${p.deck.length}${ok ? '' : ' (мин 10!)'}`, ok ? '#d8c9a8' : '#ff9d9d', '20px');
    const back = this.text(SCREEN.width - 120, 16, '‹ В меню', '#9fbfff', '20px').setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));
    this.text(20, 52, 'Клик по карте — в колоду / из колоды', '#9a8a6a', '14px');

    const ids = Object.keys(p.collection);
    const cols = 6;
    const startX = 150;
    const startY = 180;
    const stepX = 180;
    const stepY = 250;

    ids.forEach((id, idx) => {
      const def = getCard(id);
      const level = p.collection[id].level;
      const x = startX + (idx % cols) * stepX;
      const y = startY + Math.floor(idx / cols) * stepY;
      const power = def.type === 'unit' ? def.power + (level - 1) : def.power;
      const inDeck = p.deck.includes(id);

      const cv = createCardView(this, { ...def, power }, { selected: inDeck });
      cv.setScale(0.8);
      cv.setPosition(x, y);
      const bg = cv.list[0];
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        toggleDeckCard(p, id);
        persist();
        this.render();
      });
      this.root.add(cv);

      if (def.type === 'unit') {
        this.text(x - 20, y + 56, `ур.${level}`, '#9a8a6a', '14px');
        if (canUpgrade(p, id)) {
          const up = this.text(x - 30, y + 76, `↑ ${upgradeCost(level)}`, '#9fe3d0', '15px').setInteractive({ useHandCursor: true });
          up.on('pointerdown', () => {
            upgradeCard(p, id);
            persist();
            this.render();
          });
        } else if (level >= 3) {
          this.text(x - 18, y + 76, 'макс', '#666666', '14px');
        }
      }
    });
  }
}
```

- [ ] **Step 3: Enable "Колода" in `src/scenes/MenuScene.js`**

Replace the `MENU_ITEMS.forEach(...)` block with one that routes both active buttons:

```js
    MENU_ITEMS.forEach((label, i) => {
      const target = { 'Бой': 'BattleScene', 'Колода': 'DeckScene' }[label];
      const enabled = Boolean(target);
      const shown = enabled ? label : `${label} — скоро`;
      createButton(this, MENU_CENTER_X, menuButtonY(i), shown, {
        enabled,
        onClick: () => this.scene.start(target),
      });
    });
```

- [ ] **Step 4: Register `DeckScene` in `src/main.js`**

Add the import and include it in the scene list:

```js
import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { DeckScene } from './scenes/DeckScene.js';
import { SCREEN } from './ui/layout.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: '#14100c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, BattleScene, DeckScene],
});
```

- [ ] **Step 5: Build, test, verify in browser, commit**

Run: `npm run build` (expect success) and `npm test` (expect 56 + new unit tests, all green — Phaser files add no tests).

Browser (`npm run dev`): Menu → "Колода" opens the deck screen; gold shows; clicking a card toggles its deck border and the deck count updates; "↑ 150" upgrades a unit when gold allows (gold drops, power rises); "‹ В меню" returns. Reload keeps changes (persistence).

```bash
git add src/economy/session.js src/scenes/DeckScene.js src/scenes/MenuScene.js src/main.js
git commit -m "feat(ui): add deck-building screen and profile session"
```

---

### Task 5: Wire profile into battle (deck + reward)

**Files:**
- Modify: `src/scenes/BattleScene.js`

**Interfaces:**
- Consumes: `getProfile`, `persist` (`../economy/session.js`); `buildDeckCards`, `addGold` (`../economy/profile.js`).
- Produces: battle uses the profile's deck; a win grants +50 gold once and shows it on the result overlay.

Browser-verified.

- [ ] **Step 1: Update imports and `create()` in `src/scenes/BattleScene.js`**

Add imports near the top:

```js
import { getProfile, persist } from '../economy/session.js';
import { buildDeckCards, addGold } from '../economy/profile.js';
```

Change `create()` to build the player deck from the profile and reset the reward flag:

```js
  create() {
    const playerDeck = buildDeckCards(getProfile());
    this.match = createMatch(playerDeck, AI_DECK, 10);
    this.selectedIndex = null;
    this.rewardGranted = false;
    this.reward = 0;
    this.root = this.add.container(0, 0);
    this.render();
  }
```

- [ ] **Step 2: Grant the reward when the match ends**

In `render()`, immediately after `const m = this.match;` (before drawing), add:

```js
    if (m.winner !== null && !this.rewardGranted) {
      this.rewardGranted = true;
      if (m.winner === 0) {
        addGold(getProfile(), 50);
        persist();
        this.reward = 50;
      }
    }
```

- [ ] **Step 3: Show the reward on the result overlay**

In `renderResult()`, after the "‹ В меню" button is added, add (only when a reward was granted):

```js
    if (this.reward > 0) {
      this.root.add(
        this.add
          .text(SCREEN.width / 2, SCREEN.height / 2 + 24, `+${this.reward} золота`, { fontSize: '26px', color: '#ffd479' })
          .setOrigin(0.5),
      );
    }
```

- [ ] **Step 4: Build, test, verify in browser, commit**

Run: `npm run build` (expect success) and `npm test` (expect all green, no engine test changes).

Browser: build a deck / upgrade cards in "Колода", start Бой — your (possibly upgraded) cards appear in hand; win a match and see "+50 золота"; return to "Колода" and the gold total increased and persisted after reload.

```bash
git add src/scenes/BattleScene.js
git commit -m "feat(ui): battle uses the profile deck and rewards gold on a win"
```

---

## Self-Review

**Spec coverage:**
- Profile shape (gold/collection/deck/faction) + createProfile → Task 2. ✅
- addGold, upgradeCost/canUpgrade/upgradeCard (unit-only, max 3, 150/400) → Task 2. ✅
- toggleDeckCard, isDeckValid (≥10), buildDeckCards (upgrade→power) → Task 2. ✅
- Card catalog lookup → Task 1. ✅
- Persistence adapter (localStorage, null on absent/corrupt) → Task 3. ✅
- Session singleton (load-or-create) → Task 4. ✅
- Deck screen (collection, toggle, upgrade, gold, back) → Task 4. ✅
- Menu "Колода" active → Task 4. ✅
- Battle uses profile deck + reward on win → Task 5. ✅
- Engine untouched, 56 tests green → Global Constraints. ✅
- Out of scope (no task, intentional): shop/buying, Might/leaderboard, crafting, packs. ✅

**Placeholder scan:** No TBD/TODO; Phaser files verified by build + browser (documented). ✅

**Type consistency:** profile shape `{gold, collection:{id:{count,level}}, deck:[], faction}` consistent across Tasks 2–5; `getCard`, `buildDeckCards`, `addGold`, `canUpgrade`, `upgradeCard`, `upgradeCost`, `toggleDeckCard`, `isDeckValid`, `getProfile`, `persist`, `saveProfile`, `loadProfile` names consistent; scene keys `'MenuScene'/'BattleScene'/'DeckScene'` consistent; `createCardView(scene, def, {selected})` matches its Task-3 (battle-screen plan) signature. ✅
