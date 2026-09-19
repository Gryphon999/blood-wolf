# Yandex SDK Integration — дизайн

**Дата:** 2026-09-19  
**Проект:** Blood Wolf

---

## Что делаем

Подключаем Yandex Games SDK v2 для: облачных сохранений, лидерборда Might (wins), rewarded-рекламы (сундук), interstitial-рекламы между боями.

**Без заглушки:** SDK работает только внутри iframe Яндекс.Игр. Локально `window.YaGames` отсутствует — все SDK-вызовы молча пропускаются.

---

## Архитектура

Один новый файл: `src/sdk/yandex.js` — единственная точка взаимодействия с SDK.

Инициализация до старта Phaser в `main.js`:

```js
import { initYandex } from './sdk/yandex.js';
await initYandex();
new Phaser.Game({ ... });
```

`index.html` получает SDK-скрипт:

```html
<script src="https://yandex.ru/games/sdk/v2"></script>
```

---

## Модуль `src/sdk/yandex.js`

Экспортирует:

```js
export async function initYandex()
export function cloudSave(profile)
export function recordWin(profile)
export function showInterstitial(onClose)
export function showChest(profile, onReward)
```

### `initYandex()`

```js
async function initYandex() {
  if (!window.YaGames) return;              // не в iframe — пропускаем
  ysdk = await YaGames.init();
  player = await ysdk.getPlayer();
  const data = await player.getData(['profile']);
  if (data.profile) {
    // перетираем localStorage чтобы session.js подхватил облачный профиль
    localStorage.setItem('blood-wolf-profile', JSON.stringify(data.profile));
  }
}
```

Переменные `ysdk` и `player` хранятся в модульном scope (не экспортируются).

### `cloudSave(profile)`

```js
function cloudSave(profile) {
  if (!player) return;
  player.setData({ profile }).catch(() => {}); // fire-and-forget, игнорируем ошибки
}
```

### `recordWin(profile)`

```js
function recordWin(profile) {
  if (!ysdk) return;
  ysdk.getLeaderboards()
    .then(lb => lb.setLeaderboardScore('might', profile.wins))
    .catch(() => {});
}
```

### `showInterstitial(onClose)`

```js
function showInterstitial(onClose) {
  if (!ysdk) { onClose(); return; }
  ysdk.adv.showFullscreenAdv({ callbacks: { onClose } });
}
```

### `showChest(profile, onReward)`

```js
function showChest(profile, onReward) {
  if (!ysdk) return;
  ysdk.adv.showRewardedVideo({
    callbacks: {
      onRewarded: () => onReward(),
      onClose: () => {},
    },
  });
}
```

Логика награды — в вызывающем коде (не в yandex.js):
- `+100` золота
- 20% шанс: случайная карта из `SHOP_CARDS`, которой нет в `profile.collection`
- затем `persist()`

---

## Изменения в существующих файлах

### `index.html`

Добавить перед `</head>`:
```html
<script src="https://yandex.ru/games/sdk/v2"></script>
```

### `main.js`

```js
import { initYandex } from './sdk/yandex.js';
// ...
await initYandex();
new Phaser.Game({ ... });
```

### `src/economy/profile.js`

Добавить `wins: 0` в `createProfile()`:

```js
return {
  gold: 0,
  wins: 0,           // новое поле
  collection,
  deck: ...,
  faction: 'humans',
  story: { cleared: 0 },
};
```

### `src/economy/session.js`

```js
import { cloudSave } from '../sdk/yandex.js';

export function persist() {
  saveProfile(getProfile());   // localStorage (как раньше)
  cloudSave(getProfile());     // облако (fire-and-forget)
}
```

### `src/scenes/BattleScene.js`

**Победа:** в блоке `if (m.winner === 0)` — инкремент `profile.wins`, вызов `recordWin(profile)`.

**Кнопка сундука:** в `renderResult()` — если `m.winner === 0`, добавить кнопку "🎁 Сундук" (рядом с "В меню"). При клике: `showChest(profile, () => { /* +100 gold, 20% card, persist, render */ })`.

**Interstitial:** кнопка "В меню" / "‹ В меню" вместо прямого `this.scene.start(...)` сначала вызывает `showInterstitial(() => this.scene.start(...))`.

### `src/scenes/MenuScene.js`

Добавить кнопку "🎁 Сундук" под существующими кнопками. При клике: `showChest(getProfile(), () => { persist(); /* показать флаш +100 */ })`.

---

## Лидерборд Яндекса

Название таблицы в консоли Яндекс.Игр: `'might'`.  
Тип: числовой, сортировка по убыванию.  
Значение: `profile.wins` (целое число).

---

## Тесты

Юнит-тесты: **не пишем** для `yandex.js` — SDK недоступен вне iframe.

Тестируем только новую логику в `profile.js`:
- `createProfile()` содержит поле `wins: 0`
- Нет отдельной функции для wins — инкремент делается inline в BattleScene

Проверка: существующие 89 тестов должны остаться зелёными.
