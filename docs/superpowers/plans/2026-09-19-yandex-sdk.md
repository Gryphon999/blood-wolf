# Yandex SDK Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить Yandex Games SDK v2 для облачных сохранений, лидерборда Might, rewarded-рекламы (сундук) и interstitial между боями.

**Architecture:** Один файл `src/sdk/yandex.js` содержит все SDK-вызовы. Инициализация блокирует запуск Phaser (`await initYandex()` в main.js). `getProfile()` остаётся синхронным — облако загружается один раз до старта, сохраняется через fire-and-forget `cloudSave`. SDK недоступен вне iframe Яндекса — все функции молча пропускаются если `window.YaGames` не существует.

**Tech Stack:** Phaser 3, Vite (ESM top-level await), Vitest, Yandex Games SDK v2

## Global Constraints

- SDK script URL: `https://yandex.ru/games/sdk/v2`
- Leaderboard name: `'might'`, значение: `profile.wins` (целое число)
- localStorage key: `'blood-wolf-profile'` (уже используется в profileStore.js)
- Chest reward: всегда +100 золота, 20% шанс случайной карты из SHOP_CARDS которой нет в collection
- Без заглушек: если `window.YaGames` нет — SDK-функции ничего не делают (не throw)
- Все 89 существующих тестов должны оставаться зелёными
- Запуск тестов: `cd C:/Users/user/source/repos/blood-wolf && npm test`

---

### Task 1: SDK модуль + HTML + main.js (основа)

**Files:**
- Create: `src/sdk/yandex.js`
- Modify: `index.html`
- Modify: `src/main.js`

**Interfaces:**
- Produces:
  - `export async function initYandex(): Promise<void>`
  - `export function cloudSave(profile: object): void`
  - `export function recordWin(profile: object): void`
  - `export function showInterstitial(onClose: () => void): void`
  - `export function showChest(onReward: () => void): void`

- [ ] **Step 1: Создать `src/sdk/yandex.js`**

```js
let ysdk = null;
let player = null;

export async function initYandex() {
  if (!window.YaGames) return;
  ysdk = await YaGames.init();
  player = await ysdk.getPlayer();
  const data = await player.getData(['profile']);
  if (data.profile) {
    localStorage.setItem('blood-wolf-profile', JSON.stringify(data.profile));
  }
}

export function cloudSave(profile) {
  if (!player) return;
  player.setData({ profile }).catch(() => {});
}

export function recordWin(profile) {
  if (!ysdk) return;
  ysdk.getLeaderboards()
    .then(lb => lb.setLeaderboardScore('might', profile.wins))
    .catch(() => {});
}

export function showInterstitial(onClose) {
  if (!ysdk) { onClose(); return; }
  ysdk.adv.showFullscreenAdv({ callbacks: { onClose } });
}

export function showChest(onReward) {
  if (!ysdk) return;
  ysdk.adv.showRewardedVideo({
    callbacks: {
      onRewarded: () => onReward(),
      onClose: () => {},
    },
  });
}
```

- [ ] **Step 2: Добавить SDK script в `index.html`**

Заменить текущий `<head>`:

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
    <script src="https://yandex.ru/games/sdk/v2"></script>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Добавить `await initYandex()` в `src/main.js`**

Заменить содержимое файла полностью:

```js
import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { DeckScene } from './scenes/DeckScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { StoryScene } from './scenes/StoryScene.js';
import { SCREEN } from './ui/layout.js';
import { initYandex } from './sdk/yandex.js';

await initYandex();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.width,
  height: SCREEN.height,
  backgroundColor: '#14100c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, BattleScene, DeckScene, ShopScene, StoryScene],
});
```

- [ ] **Step 4: Убедиться что тесты всё ещё проходят**

```bash
cd C:/Users/user/source/repos/blood-wolf && npm test
```

Ожидаем: 89 passed.

- [ ] **Step 5: Коммит**

```bash
cd C:/Users/user/source/repos/blood-wolf
git add src/sdk/yandex.js index.html src/main.js
git commit -m "feat(sdk): add Yandex Games SDK module, script tag, and init"
```

---

### Task 2: Данные — wins, grantChestReward, cloudSave (TDD)

**Files:**
- Modify: `src/economy/profile.js`
- Modify: `src/economy/profile.test.js`
- Modify: `src/economy/session.js`

**Interfaces:**
- Consumes: `cloudSave(profile)` из `../sdk/yandex.js` (Task 1)
- Produces:
  - `profile.wins: number` — поле в createProfile()
  - `export function grantChestReward(profile, shopCards): object`

- [ ] **Step 1: Написать падающие тесты**

Добавить в конец `src/economy/profile.test.js`:

```js
import { vi } from 'vitest';

describe('createProfile — wins field', () => {
  it('initializes wins to zero', () => {
    const p = createProfile();
    expect(p.wins).toBe(0);
  });
});

describe('grantChestReward', () => {
  it('adds 100 gold', () => {
    const p = createProfile();
    grantChestReward(p, []);
    expect(p.gold).toBe(100);
  });

  it('grants an uncollected card when Math.random < 0.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const p = createProfile();
    grantChestReward(p, [{ id: 'rare_card' }]);
    expect(p.collection['rare_card']).toBeDefined();
    vi.restoreAllMocks();
  });

  it('skips card when Math.random >= 0.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const p = createProfile();
    grantChestReward(p, [{ id: 'rare_card' }]);
    expect(p.collection['rare_card']).toBeUndefined();
    vi.restoreAllMocks();
  });

  it('skips cards already in collection', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const p = createProfile(); // медик уже в коллекции из starterDecks
    const before = { ...p.collection };
    grantChestReward(p, [{ id: 'medic' }]);
    expect(p.collection).toEqual(before); // коллекция не изменилась, только золото
    expect(p.gold).toBe(100);
    vi.restoreAllMocks();
  });
});
```

Добавить `grantChestReward` в импорт вверху `profile.test.js`:
```js
import { createProfile, addGold, grantCard, grantChestReward, /* ...остальные */ } from './profile.js';
```

- [ ] **Step 2: Убедиться что тесты падают**

```bash
npm test
```

Ожидаем: 4 новых теста FAIL с `grantChestReward is not a function` / `p.wins is undefined`.

- [ ] **Step 3: Реализовать в `src/economy/profile.js`**

Добавить `wins: 0` в `createProfile()`:

```js
export function createProfile() {
  const collection = {};
  for (const card of PLAYER_DECK) {
    collection[card.id] = { count: 1, level: 1 };
  }
  return {
    gold: 0,
    wins: 0,
    collection,
    deck: PLAYER_DECK.map((card) => card.id),
    faction: 'humans',
    story: { cleared: 0 },
  };
}
```

Добавить функцию в конец `src/economy/profile.js`:

```js
export function grantChestReward(profile, shopCards) {
  profile.gold += 100;
  const uncollected = shopCards.filter(c => !profile.collection[c.id]);
  if (uncollected.length > 0 && Math.random() < 0.2) {
    const card = uncollected[Math.floor(Math.random() * uncollected.length)];
    grantCard(profile, card.id);
  }
  return profile;
}
```

- [ ] **Step 4: Обновить `src/economy/session.js` — добавить cloudSave**

Заменить содержимое файла:

```js
import { loadProfile, saveProfile } from './profileStore.js';
import { createProfile } from './profile.js';
import { cloudSave } from '../sdk/yandex.js';

let profile = null;

export function getProfile() {
  if (!profile) {
    profile = loadProfile() ?? createProfile();
  }
  return profile;
}

export function persist() {
  saveProfile(getProfile());
  cloudSave(getProfile());
}
```

- [ ] **Step 5: Убедиться что все тесты проходят**

```bash
npm test
```

Ожидаем: 93 passed (89 + 4 новых).

- [ ] **Step 6: Коммит**

```bash
git add src/economy/profile.js src/economy/profile.test.js src/economy/session.js
git commit -m "feat(economy): add wins counter, grantChestReward, cloudSave in persist"
```

---

### Task 3: BattleScene — wins, chest, interstitial

**Files:**
- Modify: `src/scenes/BattleScene.js`

**Interfaces:**
- Consumes:
  - `showChest(onReward: () => void)` из `../sdk/yandex.js` (Task 1)
  - `showInterstitial(onClose: () => void)` из `../sdk/yandex.js` (Task 1)
  - `recordWin(profile: object)` из `../sdk/yandex.js` (Task 1)
  - `grantChestReward(profile, shopCards)` из `../economy/profile.js` (Task 2)
  - `profile.wins: number` — поле существует после Task 2

- [ ] **Step 1: Добавить импорты в BattleScene.js**

Добавить две строки после существующих импортов:

```js
import { showChest, showInterstitial, recordWin } from '../sdk/yandex.js';
import { SHOP_CARDS } from '../data/shopCards.js';
```

Также добавить `grantChestReward` в существующий импорт из profile.js:

```js
import { buildDeckCards, addGold, clearNode, grantCard, grantChestReward } from '../economy/profile.js';
```

- [ ] **Step 2: Добавить инкремент wins в блок победы**

В методе `render()`, найти блок `if (m.winner === 0)`. Добавить wins++ и recordWin **перед** строкой `persist()`:

```js
if (m.winner === 0) {
  const profile = getProfile();
  if (this.storyIndex === null) {
    addGold(profile, 50);
    this.reward = 50;
  } else {
    clearNode(profile, this.storyIndex);
    addGold(profile, this.rewardGold);
    this.reward = this.rewardGold;
    if (this.rewardCardId) {
      grantCard(profile, this.rewardCardId);
      this.rewardCardName = getCard(this.rewardCardId).name;
    }
  }
  profile.wins = (profile.wins ?? 0) + 1;
  recordWin(profile);
  persist();
}
```

- [ ] **Step 3: Изменить `renderResult` — interstitial + кнопка сундука**

Заменить метод `renderResult()` полностью:

```js
renderResult() {
  const overlay = this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x000000, 0.6);
  this.root.add(overlay);
  const w = this.match.winner;
  const text = w === 0 ? 'ПОБЕДА' : w === 1 ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
  this.root.add(
    this.add.text(SCREEN.width / 2, SCREEN.height / 2, text, { fontSize: '48px', color: '#ffd479' }).setOrigin(0.5),
  );
  const back = this.add
    .text(SCREEN.width / 2, SCREEN.height / 2 + 60, '‹ В меню', { fontSize: '24px', color: '#9fbfff' })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  back.on('pointerdown', () => showInterstitial(() => this.scene.start(this.returnScene)));
  this.root.add(back);

  if (w === 0) {
    const chest = this.add
      .text(SCREEN.width / 2, SCREEN.height / 2 + 100, '🎁 Сундук', { fontSize: '22px', color: '#ffd479' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    chest.on('pointerdown', () => {
      showChest(() => {
        grantChestReward(getProfile(), SHOP_CARDS);
        persist();
        this.render();
      });
    });
    this.root.add(chest);
  }

  if (this.reward > 0) {
    this.root.add(
      this.add
        .text(SCREEN.width / 2, SCREEN.height / 2 + 24, `+${this.reward} золота`, { fontSize: '26px', color: '#ffd479' })
        .setOrigin(0.5),
    );
  }
  if (this.rewardCardName) {
    this.root.add(
      this.add
        .text(SCREEN.width / 2, SCREEN.height / 2 + 54, `Новая карта: ${this.rewardCardName}`, { fontSize: '22px', color: '#9fe3d0' })
        .setOrigin(0.5),
    );
  }
}
```

- [ ] **Step 4: Убедиться что тесты проходят**

```bash
npm test
```

Ожидаем: 93 passed.

- [ ] **Step 5: Коммит**

```bash
git add src/scenes/BattleScene.js
git commit -m "feat(battle): add wins counter, chest reward, and interstitial on exit"
```

---

### Task 4: MenuScene — кнопка сундука

**Files:**
- Modify: `src/scenes/MenuScene.js`

**Interfaces:**
- Consumes:
  - `showChest(onReward: () => void)` из `../sdk/yandex.js` (Task 1)
  - `grantChestReward(profile, shopCards)` из `../economy/profile.js` (Task 2)
  - `getProfile()`, `persist()` из `../economy/session.js`
  - `SHOP_CARDS` из `../data/shopCards.js`
  - `MENU_CENTER_X` из `../ui/menuLayout.js` (уже импортирован)

- [ ] **Step 1: Добавить импорты в MenuScene.js**

```js
import { showChest } from '../sdk/yandex.js';
import { getProfile, persist } from '../economy/session.js';
import { grantChestReward } from '../economy/profile.js';
import { SHOP_CARDS } from '../data/shopCards.js';
```

- [ ] **Step 2: Добавить кнопку сундука в `create()`**

В конец метода `create()`, после `MENU_ITEMS.forEach(...)`:

```js
createButton(this, MENU_CENTER_X, 670, '🎁 Сундук', {
  enabled: true,
  onClick: () => {
    showChest(() => {
      grantChestReward(getProfile(), SHOP_CARDS);
      persist();
    });
  },
});
```

- [ ] **Step 3: Убедиться что тесты проходят**

```bash
npm test
```

Ожидаем: 93 passed.

- [ ] **Step 4: Коммит**

```bash
git add src/scenes/MenuScene.js
git commit -m "feat(menu): add chest button with rewarded ad"
```
