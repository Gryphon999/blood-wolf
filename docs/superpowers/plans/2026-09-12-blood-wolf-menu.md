# Blood Wolf — Menu & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a main menu as the start scene and wire navigation Menu ↔ Battle.

**Architecture:** A pure `menuLayout.js` (button coordinates) is unit-tested. A reusable Phaser `Button` component and a `MenuScene` are verified by build + browser. `BattleScene` gains a "В меню" button. The engine is untouched and stays pure.

**Tech Stack:** Phaser 3, Vite, Vitest, plain JavaScript ES modules.

## Global Constraints

- Language: plain JavaScript, ES modules, no TypeScript.
- `src/engine/**` stays pure (no Phaser/DOM) and is NOT modified.
- Screen is 16:9, 1280×720 (from `src/ui/layout.js` `SCREEN`).
- Only the **Бой** menu item is active; **Колода/Магазин/Рейтинг** are disabled with a "скоро" label.
- Card/menu text is original Russian; no third-party IP.
- The existing 51 tests must stay green.

---

### Task 1: Menu layout module (pure)

**Files:**
- Create: `src/ui/menuLayout.js`
- Test: `src/ui/menuLayout.test.js`

**Interfaces:**
- Consumes: `SCREEN` from `./layout.js`.
- Produces: `MENU_ITEMS` `['Бой','Колода','Магазин','Рейтинг']`; `BUTTON_W` (260), `BUTTON_H` (56); `MENU_CENTER_X` (= `SCREEN.width / 2`); `menuButtonY(index)` → y for a stacked button (top→bottom), throws `Unknown menu index: <i>` for out-of-range. Pure — no Phaser/DOM.

- [ ] **Step 1: Write the failing test — `src/ui/menuLayout.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { MENU_ITEMS, menuButtonY, MENU_CENTER_X } from './menuLayout.js';
import { SCREEN } from './layout.js';

describe('menuLayout', () => {
  it('has four items starting with Бой', () => {
    expect(MENU_ITEMS.length).toBe(4);
    expect(MENU_ITEMS[0]).toBe('Бой');
  });

  it('stacks buttons from top to bottom', () => {
    expect(menuButtonY(0)).toBeLessThan(menuButtonY(3));
  });

  it('keeps all buttons on screen', () => {
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      expect(menuButtonY(i)).toBeGreaterThan(0);
      expect(menuButtonY(i)).toBeLessThan(SCREEN.height);
    }
  });

  it('centres buttons horizontally', () => {
    expect(MENU_CENTER_X).toBe(SCREEN.width / 2);
  });

  it('throws on an unknown index', () => {
    expect(() => menuButtonY(9)).toThrow('Unknown menu index: 9');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import from `./menuLayout.js`.

- [ ] **Step 3: Write minimal implementation — `src/ui/menuLayout.js`**

```js
import { SCREEN } from './layout.js';

export const MENU_ITEMS = ['Бой', 'Колода', 'Магазин', 'Рейтинг'];
export const BUTTON_W = 260;
export const BUTTON_H = 56;
export const MENU_CENTER_X = SCREEN.width / 2;

const FIRST_Y = 300;
const GAP = 74;

export function menuButtonY(index) {
  if (index < 0 || index >= MENU_ITEMS.length) {
    throw new Error(`Unknown menu index: ${index}`);
  }
  return FIRST_Y + index * GAP;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (menu-layout tests + all 51 existing).

- [ ] **Step 5: Commit**

```bash
git add src/ui/menuLayout.js src/ui/menuLayout.test.js
git commit -m "feat(ui): add pure menu layout module"
```

---

### Task 2: Button component (Phaser)

**Files:**
- Create: `src/ui/Button.js`

**Interfaces:**
- Consumes: `BUTTON_W`, `BUTTON_H` from `./menuLayout.js`; a Phaser `scene`.
- Produces: `createButton(scene, x, y, label, options = {})` → a Phaser `Container` centred at (x,y). `options`: `{ enabled = true, onClick = () => {} }`. When enabled, the background is interactive and calls `onClick` on `pointerdown`; when disabled, it is dimmed and not interactive.

Not unit-tested (Phaser) — verified by the build and by the menu in Task 3.

- [ ] **Step 1: Write the implementation — `src/ui/Button.js`**

```js
import Phaser from 'phaser';
import { BUTTON_W, BUTTON_H } from './menuLayout.js';

export function createButton(scene, x, y, label, options = {}) {
  const { enabled = true, onClick = () => {} } = options;
  const container = scene.add.container(x, y);

  const fill = enabled ? 0x2b2b33 : 0x1a1a1f;
  const stroke = enabled ? 0x8a6d3b : 0x3a3a3a;
  const textColor = enabled ? '#e8dcc0' : '#666666';

  const bg = scene.add.rectangle(0, 0, BUTTON_W, BUTTON_H, fill).setStrokeStyle(2, stroke);
  container.add(bg);
  container.add(scene.add.text(0, 0, label, { fontSize: '22px', color: textColor }).setOrigin(0.5));

  if (enabled) {
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', onClick);
  }

  container.setSize(BUTTON_W, BUTTON_H);
  return container;
}
```

- [ ] **Step 2: Verify the bundle builds**

Run: `npm run build`
Expected: build succeeds (a Phaser large-chunk warning is not a failure).
Also run `npm test` — still 51 passing (no engine/test changes).

- [ ] **Step 3: Commit**

```bash
git add src/ui/Button.js
git commit -m "feat(ui): add reusable button component"
```

---

### Task 3: Menu scene + navigation

**Files:**
- Create: `src/scenes/MenuScene.js`
- Modify: `src/main.js`
- Modify: `src/scenes/BattleScene.js`

**Interfaces:**
- Consumes: `createButton` from `../ui/Button.js`; `MENU_ITEMS`, `menuButtonY`, `MENU_CENTER_X` from `../ui/menuLayout.js`; `SCREEN` from `../ui/layout.js`.
- Produces: `MenuScene` (key `'MenuScene'`) that starts `'BattleScene'` from the Бой button; `BattleScene` returns to `'MenuScene'`.

Verified by build + browser.

- [ ] **Step 1: Create `src/scenes/MenuScene.js`**

```js
import Phaser from 'phaser';
import { createButton } from '../ui/Button.js';
import { MENU_ITEMS, menuButtonY, MENU_CENTER_X } from '../ui/menuLayout.js';
import { SCREEN } from '../ui/layout.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x14100c);
    this.add.text(SCREEN.width / 2, 160, 'Blood Wolf', { fontSize: '56px', color: '#ffd479' }).setOrigin(0.5);
    this.add
      .text(SCREEN.width / 2, 214, 'мрачная карточная дуэль', { fontSize: '18px', color: '#9a8a6a' })
      .setOrigin(0.5);

    MENU_ITEMS.forEach((label, i) => {
      const enabled = label === 'Бой';
      const shown = enabled ? label : `${label} — скоро`;
      createButton(this, MENU_CENTER_X, menuButtonY(i), shown, {
        enabled,
        onClick: () => this.scene.start('BattleScene'),
      });
    });
  }
}
```

- [ ] **Step 2: Wire scenes in `src/main.js` — replace the file with:**

```js
import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { SCREEN } from './ui/layout.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: '#14100c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, BattleScene],
});
```

- [ ] **Step 3: Add a "В меню" button to `src/scenes/BattleScene.js`**

In `render()`, right after the line that adds the turn-status text (`this.addText(SCREEN.width / 2 - 40, 14, status, '#ffffff');`), add a corner button:

```js
    const menuBtn = this.addText(SCREEN.width - 110, 14, '‹ В меню', '#9fbfff').setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
```

And in `renderResult()`, after the result text is added to `this.root`, add a return button below it:

```js
    const back = this.add
      .text(SCREEN.width / 2, SCREEN.height / 2 + 60, '‹ В меню', { fontSize: '24px', color: '#9fbfff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));
    this.root.add(back);
```

- [ ] **Step 4: Build, run tests, verify in browser**

Run: `npm run build` — expect success.
Run: `npm test` — expect 51 passing (no engine changes).

Then `npm run dev` and verify in a browser:
1. The menu appears first: title "Blood Wolf", four buttons; only **Бой** is bright/clickable, the other three read "… — скоро" and are dimmed.
2. Clicking **Бой** opens the battle screen.
3. The battle screen shows "‹ В меню" top-right; clicking it returns to the menu.
4. Playing a match to its end shows the result overlay with a "‹ В меню" button that returns to the menu; entering Бой again starts a fresh match.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/MenuScene.js src/main.js src/scenes/BattleScene.js
git commit -m "feat(ui): add main menu and Menu<->Battle navigation"
```

---

## Self-Review

**Spec coverage:**
- MenuScene as start scene, title + 4 buttons → Task 3 + Task 1 (`MENU_ITEMS`). ✅
- Бой active → Battle; others disabled "скоро" → Task 3 (`enabled = label === 'Бой'`). ✅
- Reusable Button component → Task 2. ✅
- Pure menu layout, unit-tested → Task 1. ✅
- "В меню" from battle (corner + result overlay) → Task 3 Step 3. ✅
- Fresh match on re-entry (scene.start re-runs create) → Task 3 (BattleScene.create already calls createMatch). ✅
- main.js registers [MenuScene, BattleScene], menu first → Task 3 Step 2. ✅
- Engine untouched, 51 tests green → Global Constraints + Task 3 Step 4. ✅
- Out of scope (no task, intentional): real Колода/Магазин/Рейтинг screens, transitions, sound, background art. ✅

**Placeholder scan:** No TBD/TODO. Phaser files verified by build + browser (documented). ✅

**Type consistency:** `createButton(scene, x, y, label, {enabled, onClick})` consistent between Task 2 and Task 3; `menuButtonY`/`MENU_ITEMS`/`MENU_CENTER_X`/`BUTTON_W`/`BUTTON_H` consistent between Tasks 1–3; scene keys `'MenuScene'`/`'BattleScene'` consistent; `this.addText` and `this.root` already exist in BattleScene. ✅
