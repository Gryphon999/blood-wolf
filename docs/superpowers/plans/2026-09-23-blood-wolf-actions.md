# Blood Wolf — Активные действия карт: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Каждая карта совершает анимированное действие (урон/лечение/бафф/щит/дубль на выбранную цель), урон убивает, в раундах 2–3 игроки получают 5 случайных карт своей фракции.

**Architecture:** Движок пишет каждое наблюдаемое изменение в `match.events` через примитивы из `actions.js`; цели выбираются через `targeting.js` до вызова `playCard`/`useOrder`. BattleScene забирает события (`drainEvents`) и проигрывает их последовательно через `AnimationQueue` поверх старой отрисовки, затем вызывает `render()`.

**Tech Stack:** Phaser 3.86 (plain JS ESM), Vite 5, Vitest 2. Новых зависимостей нет.

**Спека:** `docs/superpowers/specs/2026-09-23-blood-wolf-actions-design.md`

## Global Constraints

- Plain JS ESM, без TypeScript и без новых npm-зависимостей.
- Весь текст для игрока — на русском.
- Урон до силы ≤ 0 убивает карту; погода не убивает (влияет только на подсчёт `totalPower`).
- Эффекты «на выбор» не бьют героев (`def.type === 'hero'`).
- Раздача: 5 карт в начале раундов 2 и 3, потолок руки 10, веса common 50 / rare 30 / epic 15 / legendary 5, максимум 1 legendary на раздачу, лидеры (`tags` содержит `'leader'`) исключены.
- Карта с `isCopy: true` не срабатывает эффектом дублирования.
- Слой `src/engine/**` не импортирует `src/data/**` и `src/ui/**` (кроме тестов).
- Тесты: `npx vitest run` из корня `C:\Users\user\source\repos\blood-wolf`.
- Каждый коммит заканчивается строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Уточнения спеки, принятые при планировании

1. `createMatch(deckA, deckB, handSize = 10, { rng = null, pools = null } = {})`: `handSize` остаётся третьим позиционным параметром, чтобы не ломать 135 существующих тестов. Пулы фракций **передаются снаружи** (`pools: [poolA, poolB]`), а не строятся в движке. Так движок не зависит от слоя данных. Без `rng` колода не тасуется, без `pools` раздачи нет.
2. `buildFactionPool` живёт в `src/data/factionPool.js`, `dealRandom` — в `src/engine/dealRandom.js`.
3. Добавлено событие `control` (Соблазнитель забирает карту) с полями `sourceUid, targetUid, player, row`.
4. Событие `play` дополнительно несёт `def` (у спецкарт нет экземпляра на поле после розыгрыша) и `special: boolean`.
5. Order без допустимых целей выбрасывает `Error('No valid targets')` и не тратится; Deploy без целей даёт `fizzle`.
6. Между задачами 4 и 10 старая BattleScene не умеет выбирать цели, поэтому игра в браузере временно не играбельна. Это ожидаемо, движок покрыт тестами.

---

## Файловая структура

| Файл | Статус | Ответственность |
|---|---|---|
| `src/engine/events.js` | новый | `emit`, `drainEvents`, `findCardByUid`, `locateOnBoard` |
| `src/engine/actions.js` | новый | примитивы: урон, лечение, бафф, щит, копия, смерть, яд, кровотечение, урон ряду, контроль |
| `src/engine/targeting.js` | новый | какой эффект какую цель требует, список допустимых целей, валидация |
| `src/engine/rng.js` | новый | `seededRng`, `shuffle` |
| `src/engine/dealRandom.js` | новый | взвешенная раздача случайных карт |
| `src/engine/ai/chooseTarget.js` | новый | выбор цели ИИ и оценка эффекта |
| `src/data/factionPool.js` | новый | пул карт фракции |
| `src/ui/AnimationQueue.js` | новый | последовательное проигрывание событий, ускорение |
| `src/ui/effectAnimations.js` | новый | анимация на каждый тип события |
| `src/engine/Card.js` | изменён | `uid`, `isCopy` |
| `src/engine/GwentMatch.js` | изменён | события, цели, смерть, раздача |
| `src/engine/effects.js` | изменён | все эффекты через примитивы, новые целевые эффекты |
| `src/engine/ai/OpponentAI.js` | изменён | оценка карт, цель, правило паса |
| `src/engine/playMatch.js` | изменён | опции матча, передача цели |
| `src/data/starterDecks.js`, `src/data/shopCards.js` | изменены | новые действия карт |
| `src/ui/cardDescription.js` | изменён | описания новых эффектов, экспорт словарей |
| `src/ui/CardView.js` | изменён | `setPower(n)` |
| `src/ui/layout.js` | изменён | `boardCardX`, `BOARD_CARD_SCALE` |
| `src/scenes/BattleScene.js` | переписан | очередь анимаций, выбор цели, ход ИИ через очередь |

---

### Task 0: Зафиксировать незакоммиченные слои 12–13

**Files:** все текущие изменения в рабочем дереве (`git status`).

- [ ] **Step 1: Убедиться, что тесты зелёные**

Run: `npx vitest run`
Expected: `Tests  135 passed (135)`

- [ ] **Step 2: Закоммитить**

```bash
git add src/data/shopCards.js src/data/shopCards.test.js src/engine/GwentMatch.js src/scenes/BattleScene.js src/ui/CardView.js src/ui/cardDescription.js src/ui/FloatingText.js src/ui/SoundEngine.js docs/superpowers/plans/2026-09-19-blood-wolf-v2-engine.md docs/superpowers/plans/2026-09-19-yandex-sdk.md
git commit -m "feat: shop v2 + game feel (sounds, floating numbers, orders UI, scorch)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git status --short` пуст.

---

### Task 1: `uid` у карт и лог событий

**Files:**
- Create: `src/engine/events.js`
- Create: `src/engine/events.test.js`
- Modify: `src/engine/Card.js`
- Modify: `src/engine/Card.test.js`
- Modify: `src/engine/GwentMatch.js` (`createMatch`, `applyCard`)

**Interfaces:**
- Produces: `createCard(def)` → объект с `uid: number` (уникальный, растущий), `isCopy: false`.
- Produces: `emit(match, event)`, `drainEvents(match) → event[]` (очищает лог), `findCardByUid(match, uid) → card | null` (поле, рука, кладбище), `locateOnBoard(match, card) → { player, row, index } | null`.
- Produces: `match.events: []`; `playCard` пишет `{ type: 'play', uid, def, player, row, index, special }` (`index` — позиция в ряду, `null` для спецкарт).

- [ ] **Step 1: Написать падающие тесты**

Добавить в конец `src/engine/Card.test.js`:

```js
describe('createCard — identity', () => {
  it('assigns a unique, increasing uid to every instance', () => {
    const def = { id: 'a', row: 'melee', power: 1 };
    const first = createCard(def);
    const second = createCard(def);
    expect(typeof first.uid).toBe('number');
    expect(second.uid).toBeGreaterThan(first.uid);
  });

  it('is not a copy by default', () => {
    expect(createCard({ id: 'a', row: 'melee', power: 1 }).isCopy).toBe(false);
  });
});
```

Создать `src/engine/events.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createMatch, playCard } from './GwentMatch.js';
import { drainEvents, findCardByUid, locateOnBoard } from './events.js';

const unit = (id, power, row = 'melee') => ({ id, type: 'unit', row, power });

describe('event log', () => {
  it('a new match starts with an empty log', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1)], 1);
    expect(match.events).toEqual([]);
  });

  it('playCard emits a play event with the card uid and its row position', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 1)], 1);
    const uid = match.players[0].hand[0].uid;
    playCard(match, 0, 'melee');
    expect(match.events[0]).toMatchObject({
      type: 'play', uid, player: 0, row: 'melee', index: 0, special: false,
    });
    expect(match.events[0].def.id).toBe('a');
  });

  it('special cards emit play with special: true and index null', () => {
    const clear = { id: 'c', type: 'special', effect: 'clear', row: 'melee', power: 0 };
    const match = createMatch([clear], [unit('b', 1)], 1);
    playCard(match, 0, 'melee');
    expect(match.events[0]).toMatchObject({ type: 'play', special: true, index: null });
  });

  it('drainEvents returns the log and clears it', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 1)], 1);
    playCard(match, 0, 'melee');
    const events = drainEvents(match);
    expect(events).toHaveLength(1);
    expect(match.events).toEqual([]);
  });
});

describe('card lookup', () => {
  it('finds a card by uid in hand and on the board', () => {
    const match = createMatch([unit('a', 3), unit('a2', 2)], [unit('b', 1)], 2);
    const inHand = match.players[0].hand[1];
    const played = match.players[0].hand[0];
    playCard(match, 0, 'melee');
    expect(findCardByUid(match, inHand.uid)).toBe(inHand);
    expect(findCardByUid(match, played.uid)).toBe(played);
    expect(findCardByUid(match, -1)).toBeNull();
  });

  it('locateOnBoard returns owner, row and index', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 1)], 1);
    const card = match.players[0].hand[0];
    playCard(match, 0, 'melee');
    expect(locateOnBoard(match, card)).toEqual({ player: 0, row: 'melee', index: 0 });
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/engine/events.test.js src/engine/Card.test.js`
Expected: FAIL: `Failed to resolve import "./events.js"` и `expected 'undefined' to be 'number'`.

- [ ] **Step 3: Реализация**

`src/engine/Card.js` — полностью:

```js
let nextUid = 1;

export function createCard(def) {
  return {
    uid: nextUid++,
    def,
    power: def.power,
    armorLeft: def.armor ?? 0,
    orderUsed: false,
    chargesLeft: def.chargeMax ?? 0,
    bleedStacks: 0,
    poisoned: false,
    locked: false,
    shielded: false,
    controlled: false,
    isCopy: false,
  };
}
```

Создать `src/engine/events.js`:

```js
import { ROWS } from './Board.js';

export function emit(match, event) {
  match.events.push(event);
}

export function drainEvents(match) {
  const events = match.events;
  match.events = [];
  return events;
}

export function findCardByUid(match, uid) {
  for (const player of match.players) {
    for (const row of ROWS) {
      const onBoard = player.board[row].find((c) => c.uid === uid);
      if (onBoard) return onBoard;
    }
    const inHand = player.hand.find((c) => c.uid === uid);
    if (inHand) return inHand;
    const inGrave = player.graveyard.find((c) => c.uid === uid);
    if (inGrave) return inGrave;
  }
  return null;
}

export function locateOnBoard(match, card) {
  for (let player = 0; player < match.players.length; player++) {
    for (const row of ROWS) {
      const index = match.players[player].board[row].indexOf(card);
      if (index !== -1) return { player, row, index };
    }
  }
  return null;
}
```

В `src/engine/GwentMatch.js`:
- добавить импорт `import { emit } from './events.js';`
- в объект, который возвращает `createMatch`, добавить поле `events: [],`
- заменить функцию `applyCard` на:

```js
function applyCard(match, card, row) {
  const self = match.current;
  if (card.def.type === 'special') {
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: null, special: true });
    applyEffect(match, card.def.effect, row);
    return;
  }
  const board = match.players[self].board;
  addUnit(board, row, card);
  emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: board[row].length - 1, special: false });
  // Non-Zeal Order cards can't act the turn they're played
  if (card.def.hasOrder && !card.def.zeal && card.def.chargeMax === 0) {
    card.orderUsed = true;
  }
  applyDeploy(match, card, self);
}
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты (135 старых + 8 новых).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Card.js src/engine/Card.test.js src/engine/events.js src/engine/events.test.js src/engine/GwentMatch.js
git commit -m "feat(engine): card uid + match event log with play events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Примитивы действий

**Files:**
- Create: `src/engine/actions.js`
- Create: `src/engine/actions.test.js`

**Interfaces:**
- Consumes: `emit`, `locateOnBoard` из `events.js`; `createCard` из `Card.js`.
- Produces (все пишут события, `source` может быть `null`):
  - `dealDamage(match, source, target, amount, { direct = false } = {})`. `direct: true` пропускает щит и броню (тики статусов).
  - `destroy(match, card, { exile = false } = {})`
  - `heal(match, source, target, amount)`, `boost(match, source, target, amount)`
  - `giveShield(match, source, target)`, `copyToHand(match, source, target, playerIdx)`
  - `applyPoison(match, source, target)`, `addBleed(match, source, target, stacks)`
  - `damageRow(match, source, victimIdx, row, amount)`, `takeControl(match, source, target, newOwnerIdx)`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/engine/actions.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createMatch } from './GwentMatch.js';
import { createCard } from './Card.js';
import { addUnit } from './Board.js';
import {
  dealDamage, destroy, heal, boost, giveShield, copyToHand,
  applyPoison, addBleed, damageRow, takeControl,
} from './actions.js';

const def = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

function place(match, playerIdx, d) {
  const card = createCard(d);
  addUnit(match.players[playerIdx].board, d.row, card);
  return card;
}

const newMatch = () => createMatch([], [], 0);

describe('dealDamage', () => {
  it('reduces power and emits a damage event', () => {
    const match = newMatch();
    const src = place(match, 0, def('s', 3));
    const t = place(match, 1, def('t', 5));
    dealDamage(match, src, t, 2);
    expect(t.power).toBe(3);
    expect(match.events).toEqual([
      { type: 'damage', sourceUid: src.uid, targetUid: t.uid, amount: 2, powerAfter: 3 },
    ]);
  });

  it('kills a card at 0 power: removed from board, into graveyard, destroy event', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 2));
    dealDamage(match, null, t, 5);
    expect(match.players[1].board.melee).toHaveLength(0);
    expect(match.players[1].graveyard).toContain(t);
    expect(match.events.map((e) => e.type)).toEqual(['damage', 'destroy']);
    expect(match.events[0].powerAfter).toBe(0);
    expect(match.events[1]).toEqual({ type: 'destroy', uid: t.uid, player: 1, row: 'melee' });
  });

  it('a doomed card that dies does not enter the graveyard', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 1, { doomed: true }));
    dealDamage(match, null, t, 1);
    expect(match.players[1].graveyard).toHaveLength(0);
  });

  it('a shield absorbs the whole hit and is consumed', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 4));
    t.shielded = true;
    dealDamage(match, null, t, 10);
    expect(t.power).toBe(4);
    expect(t.shielded).toBe(false);
    expect(match.events).toEqual([{ type: 'shieldBreak', sourceUid: null, targetUid: t.uid }]);
  });

  it('armor absorbs part of the damage', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 5, { armor: 2 }));
    dealDamage(match, null, t, 3);
    expect(t.armorLeft).toBe(0);
    expect(t.power).toBe(4);
  });

  it('heroes are immune', () => {
    const match = newMatch();
    const t = place(match, 1, def('h', 6, { type: 'hero' }));
    dealDamage(match, null, t, 3);
    expect(t.power).toBe(6);
    expect(match.events).toEqual([]);
  });

  it('direct damage ignores shield and armor', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 5, { armor: 2 }));
    t.shielded = true;
    dealDamage(match, null, t, 2, { direct: true });
    expect(t.power).toBe(3);
    expect(t.shielded).toBe(true);
  });
});

describe('destroy', () => {
  it('exile skips the graveyard', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 9));
    destroy(match, t, { exile: true });
    expect(match.players[0].board.melee).toHaveLength(0);
    expect(match.players[0].graveyard).toHaveLength(0);
  });
});

describe('heal / boost / shield', () => {
  it('heal restores up to base power only', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    t.power = 2;
    heal(match, null, t, 10);
    expect(t.power).toBe(5);
    expect(match.events[0]).toMatchObject({ type: 'heal', amount: 3, powerAfter: 5 });
  });

  it('heal never lowers a boosted card', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    t.power = 8;
    heal(match, null, t, 2);
    expect(t.power).toBe(8);
    expect(match.events).toEqual([]);
  });

  it('boost adds power without a cap; zero boost emits nothing', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    boost(match, null, t, 3);
    boost(match, null, t, 0);
    expect(t.power).toBe(8);
    expect(match.events).toEqual([
      { type: 'boost', sourceUid: null, targetUid: t.uid, amount: 3, powerAfter: 8 },
    ]);
  });

  it('giveShield sets shielded', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    giveShield(match, null, t);
    expect(t.shielded).toBe(true);
    expect(match.events[0]).toMatchObject({ type: 'shield', targetUid: t.uid });
  });
});

describe('copyToHand', () => {
  it('puts a fresh copy flagged isCopy into the given hand', () => {
    const match = newMatch();
    const t = place(match, 0, def('t', 5));
    t.power = 1;
    copyToHand(match, null, t, 0);
    const copy = match.players[0].hand[0];
    expect(copy.def).toBe(t.def);
    expect(copy.power).toBe(5);
    expect(copy.isCopy).toBe(true);
    expect(copy.uid).not.toBe(t.uid);
    expect(match.events[0]).toEqual({
      type: 'copyToHand', sourceUid: null, targetUid: t.uid, newUid: copy.uid, player: 0,
    });
  });
});

describe('statuses', () => {
  it('applyPoison and addBleed set statuses and emit events', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 5));
    applyPoison(match, null, t);
    addBleed(match, null, t, 2);
    expect(t.poisoned).toBe(true);
    expect(t.bleedStacks).toBe(2);
    expect(match.events.map((e) => e.type)).toEqual(['poison', 'bleed']);
  });

  it('statuses do not stick to heroes', () => {
    const match = newMatch();
    const t = place(match, 1, def('h', 5, { type: 'hero' }));
    applyPoison(match, null, t);
    addBleed(match, null, t, 1);
    expect(t.poisoned).toBe(false);
    expect(t.bleedStacks).toBe(0);
  });
});

describe('damageRow', () => {
  it('hits every card in the row even when some die mid-loop', () => {
    const match = newMatch();
    const a = place(match, 1, def('a', 1));
    const b = place(match, 1, def('b', 1));
    const c = place(match, 1, def('c', 4));
    damageRow(match, null, 1, 'melee', 1);
    expect(match.players[1].board.melee).toEqual([c]);
    expect(c.power).toBe(3);
    expect(match.players[1].graveyard).toEqual([a, b]);
    expect(match.events[0]).toEqual({ type: 'rowDamage', sourceUid: null, player: 1, row: 'melee' });
  });
});

describe('takeControl', () => {
  it('moves the enemy card to the new owner board and marks it controlled', () => {
    const match = newMatch();
    const t = place(match, 1, def('t', 3));
    takeControl(match, null, t, 0);
    expect(match.players[1].board.melee).toHaveLength(0);
    expect(match.players[0].board.melee).toEqual([t]);
    expect(t.controlled).toBe(true);
    expect(match.events[0]).toEqual({
      type: 'control', sourceUid: null, targetUid: t.uid, player: 0, row: 'melee',
    });
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/engine/actions.test.js`
Expected: FAIL: `Failed to resolve import "./actions.js"`.

- [ ] **Step 3: Реализация**

Создать `src/engine/actions.js`:

```js
import { createCard } from './Card.js';
import { emit, locateOnBoard } from './events.js';

const uidOf = (card) => card?.uid ?? null;
const isHero = (card) => card.def.type === 'hero';

export function destroy(match, card, { exile = false } = {}) {
  const loc = locateOnBoard(match, card);
  if (!loc) return;
  const owner = match.players[loc.player];
  owner.board[loc.row].splice(loc.index, 1);
  if (!exile && !card.def.doomed) owner.graveyard.push(card);
  emit(match, { type: 'destroy', uid: card.uid, player: loc.player, row: loc.row });
}

export function dealDamage(match, source, target, amount, { direct = false } = {}) {
  if (amount <= 0 || isHero(target)) return;
  let dmg = amount;
  if (!direct) {
    if (target.shielded) {
      target.shielded = false;
      emit(match, { type: 'shieldBreak', sourceUid: uidOf(source), targetUid: target.uid });
      return;
    }
    const absorbed = Math.min(target.armorLeft, dmg);
    target.armorLeft -= absorbed;
    dmg -= absorbed;
    if (dmg === 0) return;
  }
  target.power -= dmg;
  emit(match, {
    type: 'damage', sourceUid: uidOf(source), targetUid: target.uid,
    amount: dmg, powerAfter: Math.max(0, target.power),
  });
  if (target.power <= 0) destroy(match, target);
}

export function heal(match, source, target, amount) {
  if (target.power >= target.def.power) return;
  const before = target.power;
  target.power = Math.min(target.def.power, target.power + amount);
  emit(match, {
    type: 'heal', sourceUid: uidOf(source), targetUid: target.uid,
    amount: target.power - before, powerAfter: target.power,
  });
}

export function boost(match, source, target, amount) {
  if (amount <= 0) return;
  target.power += amount;
  emit(match, {
    type: 'boost', sourceUid: uidOf(source), targetUid: target.uid,
    amount, powerAfter: target.power,
  });
}

export function giveShield(match, source, target) {
  target.shielded = true;
  emit(match, { type: 'shield', sourceUid: uidOf(source), targetUid: target.uid });
}

export function copyToHand(match, source, target, playerIdx) {
  const copy = createCard(target.def);
  copy.isCopy = true;
  match.players[playerIdx].hand.push(copy);
  emit(match, {
    type: 'copyToHand', sourceUid: uidOf(source), targetUid: target.uid,
    newUid: copy.uid, player: playerIdx,
  });
}

export function applyPoison(match, source, target) {
  if (isHero(target)) return;
  target.poisoned = true;
  emit(match, { type: 'poison', sourceUid: uidOf(source), targetUid: target.uid });
}

export function addBleed(match, source, target, stacks) {
  if (isHero(target) || stacks <= 0) return;
  target.bleedStacks += stacks;
  emit(match, { type: 'bleed', sourceUid: uidOf(source), targetUid: target.uid });
}

export function damageRow(match, source, victimIdx, row, amount) {
  emit(match, { type: 'rowDamage', sourceUid: uidOf(source), player: victimIdx, row });
  // Copy the row first: dealDamage may splice dead cards out of it
  for (const card of [...match.players[victimIdx].board[row]]) {
    dealDamage(match, source, card, amount);
  }
}

export function takeControl(match, source, target, newOwnerIdx) {
  const loc = locateOnBoard(match, target);
  if (!loc) return;
  match.players[loc.player].board[loc.row].splice(loc.index, 1);
  target.controlled = true;
  match.players[newOwnerIdx].board[target.def.row].push(target);
  emit(match, {
    type: 'control', sourceUid: uidOf(source), targetUid: target.uid,
    player: newOwnerIdx, row: target.def.row,
  });
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/engine/actions.test.js`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.js src/engine/actions.test.js
git commit -m "feat(engine): action primitives (damage kills, shield, armor, heal, copy, control)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Таргетинг и новые целевые эффекты

**Files:**
- Create: `src/engine/targeting.js`
- Create: `src/engine/targeting.test.js`
- Modify: `src/engine/GwentMatch.js` (`applyEffect`, `applyCard`, `playCard`, `useOrder`)
- Modify: `src/engine/effects.js` (`applyDeploy`, `applyOrder`)
- Modify: `src/engine/effects.test.js` (2 теста useOrder, новый блок)

**Interfaces:**
- Consumes: примитивы из Task 2.
- Produces:
  - `DEPLOY_TARGET`, `ORDER_TARGET`, `SPECIAL_TARGET`: объекты `effectId → 'enemyUnit' | 'allyUnit' | 'enemyRow'`.
  - `effectOf(card, slot) → string | null`, `targetKind(card, slot) → 'enemyUnit' | 'allyUnit' | 'enemyRow' | 'none'`; `slot` равен `'deploy'` или `'order'` (для спецкарт `'deploy'`).
  - `getValidTargets(match, playerIdx, card, slot) → card[] | string[]`.
  - `resolveTarget(match, playerIdx, card, slot, target) → target | null` (`null` = нет целей), бросает `Error('Invalid target')`.
  - `playCard(match, cardIndex, row, { target } = {})`, `useOrder(match, playerIdx, row, cardIdx, { target } = {})`.
  - `applyDeploy(match, card, playerIdx, target = null)`, `applyOrder(match, card, playerIdx, target = null)`.
  - Новые deploy-эффекты: `damage`, `heal`, `boost`, `shield`, `duplicate`, `poison`, `bleed`, `row_damage`, `take_control`, `cleanse_heal`; новая спецкарта `lightning` (урон `def.deployParam` выбранному врагу).

- [ ] **Step 1: Написать падающие тесты**

Создать `src/engine/targeting.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createMatch, playCard, useOrder } from './GwentMatch.js';
import { createCard } from './Card.js';
import { addUnit } from './Board.js';
import { getValidTargets, targetKind, resolveTarget } from './targeting.js';

const def = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });

function place(match, playerIdx, d) {
  const card = createCard(d);
  addUnit(match.players[playerIdx].board, d.row, card);
  return card;
}

describe('targetKind', () => {
  it('maps deploy, order and special effects', () => {
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'damage' })), 'deploy')).toBe('enemyUnit');
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'heal' })), 'deploy')).toBe('allyUnit');
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'row_damage' })), 'deploy')).toBe('enemyRow');
    expect(targetKind(createCard(def('a', 1, { deployEffect: 'shield_self' })), 'deploy')).toBe('none');
    expect(targetKind(createCard(def('a', 1, { hasOrder: true, orderEffect: 'damage_one' })), 'order')).toBe('enemyUnit');
    const lightning = { id: 'l', type: 'special', effect: 'lightning', row: 'ranged', power: 0 };
    expect(targetKind(createCard(lightning), 'deploy')).toBe('enemyUnit');
  });
});

describe('getValidTargets', () => {
  it('enemyUnit lists enemy non-heroes only', () => {
    const match = createMatch([], [], 0);
    const enemy = place(match, 1, def('e', 3));
    place(match, 1, def('h', 9, { type: 'hero' }));
    place(match, 0, def('ally', 3));
    const archer = createCard(def('ar', 3, { deployEffect: 'damage', deployParam: 2 }));
    expect(getValidTargets(match, 0, archer, 'deploy')).toEqual([enemy]);
  });

  it('allyUnit excludes the acting card itself', () => {
    const match = createMatch([], [], 0);
    const alchemist = place(match, 0, def('alc', 3, { hasOrder: true, orderEffect: 'shield_ally' }));
    const ally = place(match, 0, def('a', 4));
    expect(getValidTargets(match, 0, alchemist, 'order')).toEqual([ally]);
  });

  it('take_control only allows enemies with power <= 4', () => {
    const match = createMatch([], [], 0);
    const small = place(match, 1, def('s', 4));
    place(match, 1, def('b', 5));
    const seducer = createCard(def('sd', 3, { deployEffect: 'take_control' }));
    expect(getValidTargets(match, 0, seducer, 'deploy')).toEqual([small]);
  });

  it('enemyRow lists all three rows', () => {
    const match = createMatch([], [], 0);
    const catapult = createCard(def('c', 5, { deployEffect: 'row_damage' }));
    expect(getValidTargets(match, 0, catapult, 'deploy')).toEqual(['melee', 'ranged', 'siege']);
  });
});

describe('resolveTarget', () => {
  it('returns null when the effect has no valid targets', () => {
    const match = createMatch([], [], 0);
    const archer = createCard(def('ar', 3, { deployEffect: 'damage' }));
    expect(resolveTarget(match, 0, archer, 'deploy', undefined)).toBeNull();
  });

  it('throws when targets exist but the choice is missing or invalid', () => {
    const match = createMatch([], [], 0);
    place(match, 1, def('e', 3));
    const archer = createCard(def('ar', 3, { deployEffect: 'damage' }));
    expect(() => resolveTarget(match, 0, archer, 'deploy', undefined)).toThrow('Invalid target');
    expect(() => resolveTarget(match, 0, archer, 'deploy', 'melee')).toThrow('Invalid target');
  });
});

describe('playCard with targets', () => {
  it('fizzles when there is nothing to target: card still lands, fizzle event', () => {
    const archer = def('ar', 3, { deployEffect: 'damage', deployParam: 2 });
    const match = createMatch([archer], [def('x', 1)], 1);
    const uid = match.players[0].hand[0].uid;
    playCard(match, 0, 'melee');
    expect(match.players[0].board.melee).toHaveLength(1);
    expect(match.events.map((e) => e.type)).toEqual(['play', 'fizzle']);
    expect(match.events[1]).toEqual({ type: 'fizzle', sourceUid: uid });
  });

  it('an invalid target throws and leaves the hand untouched', () => {
    const archer = def('ar', 3, { deployEffect: 'damage', deployParam: 2 });
    const match = createMatch([archer], [def('x', 1)], 1);
    place(match, 1, def('e', 5));
    expect(() => playCard(match, 0, 'melee', { target: 'nope' })).toThrow('Invalid target');
    expect(match.players[0].hand).toHaveLength(1);
  });
});

describe('useOrder with targets', () => {
  it('throws No valid targets and keeps the order unused', () => {
    const match = createMatch([], [], 0);
    const sniper = place(match, 0, def('sn', 4, { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 }));
    expect(() => useOrder(match, 0, 'melee', 0)).toThrow('No valid targets');
    expect(sniper.chargesLeft).toBe(2);
  });
});
```

Добавить в конец `src/engine/effects.test.js`:

```js
describe('targeted Deploy effects', () => {
  function setup(playedDef) {
    const match = createMatch([playedDef], [unit('x', 1)], 1);
    return match;
  }
  const put = (match, playerIdx, d) => {
    const card = createCard(d);
    addUnit(match.players[playerIdx].board, d.row, card);
    return card;
  };

  it('damage hits the chosen enemy, not the strongest', () => {
    const match = setup(uDef('ar', 3, 'ranged', { deployEffect: 'damage', deployParam: 2 }));
    const weak = put(match, 1, unit('w', 5));
    const strong = put(match, 1, unit('s', 8));
    playCard(match, 0, 'ranged', { target: weak });
    expect(weak.power).toBe(3);
    expect(strong.power).toBe(8);
  });

  it('heal, boost and shield act on the chosen ally', () => {
    const match = createMatch([
      uDef('m', 4, 'melee', { deployEffect: 'heal', deployParam: 4 }),
      uDef('sq', 3, 'melee', { deployEffect: 'boost', deployParam: 2 }),
      uDef('sh', 3, 'melee', { deployEffect: 'shield' }),
    ], [unit('x1', 1), unit('x2', 1), unit('x3', 1)], 3);
    const ally = put(match, 0, unit('a', 6));
    ally.power = 1;
    playCard(match, 0, 'melee', { target: ally }); // heal 4 -> 5
    playCard(match, 0, 'melee');                    // opponent
    playCard(match, 0, 'melee', { target: ally }); // boost 2 -> 7
    playCard(match, 0, 'melee');                    // opponent
    playCard(match, 0, 'melee', { target: ally }); // shield
    expect(ally.power).toBe(7);
    expect(ally.shielded).toBe(true);
  });

  it('duplicate puts a copy of the chosen ally into hand', () => {
    const match = setup(uDef('alc', 3, 'ranged', { deployEffect: 'duplicate' }));
    const ally = put(match, 0, unit('k', 6));
    playCard(match, 0, 'ranged', { target: ally });
    expect(match.players[0].hand).toHaveLength(1);
    expect(match.players[0].hand[0].def).toBe(ally.def);
    expect(match.players[0].hand[0].isCopy).toBe(true);
  });

  it('a copied duplicator does not duplicate again', () => {
    const dup = uDef('alc', 3, 'ranged', { deployEffect: 'duplicate' });
    const match = setup(dup);
    const copy = createCard(dup);
    copy.isCopy = true;
    match.players[0].hand = [copy];
    const ally = put(match, 0, unit('k', 6));
    playCard(match, 0, 'ranged', { target: ally });
    expect(match.players[0].hand).toHaveLength(0);
  });

  it('poison and bleed apply to the chosen enemy', () => {
    const match = createMatch([
      uDef('pa', 3, 'ranged', { deployEffect: 'poison' }),
      uDef('v', 4, 'melee', { deployEffect: 'bleed', deployParam: 2 }),
    ], [unit('x1', 1), unit('x2', 1)], 2);
    const enemy = put(match, 1, unit('e', 9));
    playCard(match, 0, 'ranged', { target: enemy });
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee', { target: enemy });
    expect(enemy.poisoned).toBe(true);
    expect(enemy.bleedStacks).toBe(2);
  });

  it('row_damage hits every card in the chosen enemy row', () => {
    const match = setup(uDef('cat', 5, 'siege', { deployEffect: 'row_damage', deployParam: 1 }));
    const a = put(match, 1, unit('a', 3, 'ranged'));
    const b = put(match, 1, unit('b', 4, 'ranged'));
    const m = put(match, 1, unit('m', 4, 'melee'));
    playCard(match, 0, 'siege', { target: 'ranged' });
    expect([a.power, b.power, m.power]).toEqual([2, 3, 4]);
  });

  it('take_control steals the chosen enemy', () => {
    const match = setup(uDef('sd', 3, 'ranged', { deployEffect: 'take_control' }));
    const enemy = put(match, 1, unit('e', 4));
    playCard(match, 0, 'ranged', { target: enemy });
    expect(match.players[0].board.melee).toContain(enemy);
  });

  it('cleanse_heal removes statuses and heals', () => {
    const match = setup(uDef('pr', 3, 'melee', { deployEffect: 'cleanse_heal', deployParam: 2 }));
    const ally = put(match, 0, unit('a', 6));
    ally.power = 2;
    ally.poisoned = true;
    ally.bleedStacks = 2;
    playCard(match, 0, 'melee', { target: ally });
    expect(ally.poisoned).toBe(false);
    expect(ally.bleedStacks).toBe(0);
    expect(ally.power).toBe(4);
  });

  it('lightning special damages the chosen enemy', () => {
    const lightning = { id: 'l', type: 'special', effect: 'lightning', row: 'ranged', power: 0, deployParam: 4 };
    const match = setup(lightning);
    const enemy = put(match, 1, unit('e', 6));
    playCard(match, 0, 'ranged', { target: enemy });
    expect(enemy.power).toBe(2);
  });
});
```

В том же файле обновить два существующих теста `useOrder`, так как Order теперь требует явную цель. Заменить тест `'decrements chargesLeft for Charge cards and allows reuse next turn'` на:

```js
  it('decrements chargesLeft for Charge cards and allows reuse next turn', () => {
    const sniperDef = uDef('sn', 4, 'ranged', { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 });
    const enemy = { id: 'e', type: 'unit', row: 'melee', power: 6 };
    const match = createMatch([], [enemy], 0);
    addUnit(match.players[0].board, 'ranged', createCard(sniperDef));
    addUnit(match.players[1].board, 'melee', createCard(enemy));
    const sniper = match.players[0].board.ranged[0];
    const target = match.players[1].board.melee[0];
    expect(sniper.chargesLeft).toBe(2);
    useOrder(match, 0, 'ranged', 0, { target });
    expect(sniper.chargesLeft).toBe(1);
    expect(target.power).toBe(4); // 6 - 2
    useOrder(match, 0, 'ranged', 0, { target });
    expect(sniper.chargesLeft).toBe(0);
  });
```

Заменить тест `'Zeal card (field_medic) can use Order on the same turn it is played'` на:

```js
  it('Zeal card (field_medic) can use Order on the same turn it is played', () => {
    const zealDef = uDef('fm', 4, 'melee', {
      tags: ['medic'], zeal: true, hasOrder: true, orderEffect: 'heal_ally', orderParam: 2, chargeMax: 0,
    });
    const match = createMatch([zealDef], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'melee', createCard(uDef('w', 3, 'melee')));
    const wounded = match.players[0].board.melee[0];
    wounded.power = 1;
    playCard(match, 0, 'melee');
    const zealCard = match.players[0].board.melee.find(c => c.def.id === 'fm');
    expect(zealCard.orderUsed).toBe(false); // Zeal: available immediately
    useOrder(match, 0, 'melee', match.players[0].board.melee.indexOf(zealCard), { target: wounded });
    expect(wounded.power).toBe(3);
  });
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/engine/targeting.test.js src/engine/effects.test.js`
Expected: FAIL: `Failed to resolve import "./targeting.js"`.

- [ ] **Step 3: Реализация**

Создать `src/engine/targeting.js`:

```js
import { ROWS } from './Board.js';

export const DEPLOY_TARGET = {
  damage: 'enemyUnit',
  poison: 'enemyUnit',
  bleed: 'enemyUnit',
  take_control: 'enemyUnit',
  heal: 'allyUnit',
  boost: 'allyUnit',
  shield: 'allyUnit',
  duplicate: 'allyUnit',
  cleanse_heal: 'allyUnit',
  row_damage: 'enemyRow',
};

export const ORDER_TARGET = {
  damage_one: 'enemyUnit',
  damage_lock: 'enemyUnit',
  heal_ally: 'allyUnit',
  shield_ally: 'allyUnit',
  damage_row_choice: 'enemyRow',
};

export const SPECIAL_TARGET = {
  lightning: 'enemyUnit',
};

// Extra restrictions on top of "not a hero, not the acting card"
const TARGET_FILTER = {
  take_control: (card) => card.power <= 4,
};

export function effectOf(card, slot) {
  if (slot === 'order') return card.def.orderEffect ?? null;
  return (card.def.type === 'special' ? card.def.effect : card.def.deployEffect) ?? null;
}

export function targetKind(card, slot) {
  const table = slot === 'order' ? ORDER_TARGET
    : card.def.type === 'special' ? SPECIAL_TARGET
    : DEPLOY_TARGET;
  return table[effectOf(card, slot)] ?? 'none';
}

export function getValidTargets(match, playerIdx, card, slot) {
  const kind = targetKind(card, slot);
  if (kind === 'none') return [];
  if (kind === 'enemyRow') return [...ROWS];
  const side = kind === 'enemyUnit' ? 1 - playerIdx : playerIdx;
  const filter = TARGET_FILTER[effectOf(card, slot)] ?? (() => true);
  return ROWS.flatMap((row) => match.players[side].board[row])
    .filter((c) => c !== card && c.def.type !== 'hero' && filter(c));
}

// null = effect needs a target but none exists (fizzle). Throws on a bad choice.
export function resolveTarget(match, playerIdx, card, slot, target) {
  if (targetKind(card, slot) === 'none') return null;
  const valid = getValidTargets(match, playerIdx, card, slot);
  if (valid.length === 0) return null;
  if (!valid.includes(target)) throw new Error('Invalid target');
  return target;
}
```

В `src/engine/effects.js`:
- добавить импорт:

```js
import {
  dealDamage, heal, boost, giveShield, copyToHand, applyPoison, addBleed, damageRow, takeControl,
} from './actions.js';
```

- сигнатура: `export function applyDeploy(match, card, playerIdx, target = null) {`
- в начало `switch (deployEffect) {` вставить:

```js
    // ── Targeted (target validated in targeting.js before we get here)
    case 'damage':       dealDamage(match, card, target, deployParam); break;
    case 'heal':         heal(match, card, target, deployParam); break;
    case 'boost':        boost(match, card, target, deployParam); break;
    case 'shield':       giveShield(match, card, target); break;
    case 'duplicate':    if (!card.isCopy) copyToHand(match, card, target, playerIdx); break;
    case 'poison':       applyPoison(match, card, target); break;
    case 'bleed':        addBleed(match, card, target, deployParam); break;
    case 'row_damage':   damageRow(match, card, 1 - playerIdx, target, deployParam); break;
    case 'take_control': takeControl(match, card, target, playerIdx); break;
    case 'cleanse_heal':
      target.poisoned = false;
      target.bleedStacks = 0;
      heal(match, card, target, deployParam);
      break;
```

- в `applyOrder` заменить сигнатуру `(match, card, playerIdx, opts = {})` на `(match, card, playerIdx, target = null)`, все вхождения `opts.target` на `target`, а `opts.row ?? 'melee'` на `target`.

В `src/engine/GwentMatch.js`:
- добавить импорт `import { resolveTarget, targetKind } from './targeting.js';` и `import { dealDamage } from './actions.js';`
- заменить сигнатуру `function applyEffect(match, effect, row) {` на:

```js
function applyEffect(match, card, row, target) {
  const effect = card.def.effect;
```

- сразу после блока `sign_damage` вставить:

```js
  if (effect === 'lightning') {
    dealDamage(match, card, target, card.def.deployParam ?? 1);
    return;
  }
```

- заменить `applyCard` и `playCard` на:

```js
function applyCard(match, card, row, target, fizzled) {
  const self = match.current;
  const special = card.def.type === 'special';
  if (special) {
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: null, special: true });
  } else {
    const board = match.players[self].board;
    addUnit(board, row, card);
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: board[row].length - 1, special: false });
    // Non-Zeal Order cards can't act the turn they're played
    if (card.def.hasOrder && !card.def.zeal && card.def.chargeMax === 0) {
      card.orderUsed = true;
    }
  }
  if (fizzled) {
    emit(match, { type: 'fizzle', sourceUid: card.uid });
    return;
  }
  if (special) applyEffect(match, card, row, target);
  else applyDeploy(match, card, self, target);
}

export function playCard(match, cardIndex, row, { target } = {}) {
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
  // Validate before mutating anything: a bad target must not cost the card
  const chosen = resolveTarget(match, match.current, card, 'deploy', target);
  const fizzled = targetKind(card, 'deploy') !== 'none' && chosen === null;
  player.hand.splice(cardIndex, 1);
  applyCard(match, card, row, chosen, fizzled);
  passTurn(match);
}
```

- в `useOrder` заменить сигнатуру на `export function useOrder(match, playerIdx, row, cardIdx, { target } = {}) {` и строку `applyOrder(match, card, playerIdx, opts);` на:

```js
  const chosen = resolveTarget(match, playerIdx, card, 'order', target);
  if (targetKind(card, 'order') !== 'none' && chosen === null) {
    throw new Error('No valid targets');
  }
  applyOrder(match, card, playerIdx, chosen);
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты.

- [ ] **Step 5: Commit**

```bash
git add src/engine/targeting.js src/engine/targeting.test.js src/engine/effects.js src/engine/effects.test.js src/engine/GwentMatch.js
git commit -m "feat(engine): player-chosen targets for Deploy/Order/special + fizzle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Пересмотр карт в данных

**Files:**
- Modify: `src/data/starterDecks.js`
- Modify: `src/data/shopCards.js`
- Modify: `src/ui/cardDescription.js`
- Modify: `src/engine/effects.js` (кейс `wolf_pack`)
- Create: `src/data/cardData.test.js`
- Modify: `src/engine/effects.test.js` (тест копии Волка)

**Interfaces:**
- Produces: из `cardDescription.js` экспортируются `DEPLOY_DESCRIPTIONS`, `ORDER_DESCRIPTIONS`, `SPECIAL_DESCRIPTIONS` (переименованные `DEPLOY`, `ORDER`, `SPECIAL`).

- [ ] **Step 1: Написать падающие тесты**

Создать `src/data/cardData.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { PLAYER_DECK, AI_DECK } from './starterDecks.js';
import { SHOP_CARDS } from './shopCards.js';
import {
  DEPLOY_DESCRIPTIONS, ORDER_DESCRIPTIONS, SPECIAL_DESCRIPTIONS,
} from '../ui/cardDescription.js';

const ALL = [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS];

describe('card design invariants', () => {
  it('every unit and hero does something (Deploy or Order)', () => {
    for (const card of ALL.filter((c) => c.type !== 'special')) {
      expect(Boolean(card.deployEffect) || card.hasOrder, `${card.id} has no action`).toBe(true);
    }
  });

  it('every deployEffect has a description (catches typos in effect ids)', () => {
    for (const card of ALL.filter((c) => c.deployEffect)) {
      expect(DEPLOY_DESCRIPTIONS[card.deployEffect], `${card.id}: ${card.deployEffect}`).toBeTypeOf('function');
    }
  });

  it('every orderEffect has a description', () => {
    for (const card of ALL.filter((c) => c.hasOrder)) {
      expect(ORDER_DESCRIPTIONS[card.orderEffect], `${card.id}: ${card.orderEffect}`).toBeTypeOf('function');
    }
  });

  it('every special effect has a description', () => {
    for (const card of ALL.filter((c) => c.type === 'special')) {
      expect(SPECIAL_DESCRIPTIONS[card.effect], `${card.id}: ${card.effect}`).toBeTypeOf('string');
    }
  });

  it('the medic heals through Deploy, not through the old UI-only effect', () => {
    const medic = PLAYER_DECK.find((c) => c.id === 'medic');
    expect(medic.deployEffect).toBe('heal');
    expect(medic.effect).toBeNull();
  });
});
```

Добавить в блок `describe('Deploy: wolf_pack', ...)` в `src/engine/effects.test.js`:

```js
  it('puts a copy of itself into hand; the copy does not copy again', () => {
    const wolfDef = uDef('wf', 2, 'melee', { tags: ['wolf', 'beast'], deployEffect: 'wolf_pack' });
    const match = createMatch([wolfDef], [unit('x', 1), unit('x2', 1)], 1);
    playCard(match, 0, 'melee');
    expect(match.players[0].hand).toHaveLength(1);
    expect(match.players[0].hand[0].isCopy).toBe(true);
    playCard(match, 0, 'melee'); // opponent
    playCard(match, 0, 'melee'); // the copy
    expect(match.players[0].hand).toHaveLength(0);
  });
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/data/cardData.test.js src/engine/effects.test.js`
Expected: FAIL: `merc_a has no action`, отсутствуют экспорты `DEPLOY_DESCRIPTIONS`, тест Волка ожидает руку длиной 1.

- [ ] **Step 3: Реализация**

`src/data/starterDecks.js`: заменить массивы `PLAYER_DECK` и `AI_DECK` на:

```js
export const PLAYER_DECK = [
  card('merc_a',    'Наёмник',     'humans',   'unit',    'melee',  4, 'common',    3, { art: 'merc',     tags: ['merc'], deployEffect: 'damage', deployParam: 1 }),
  card('merc_b',    'Наёмник',     'humans',   'unit',    'melee',  4, 'common',    3, { art: 'merc',     tags: ['merc'], deployEffect: 'damage', deployParam: 1 }),
  card('merc_c',    'Наёмник',     'humans',   'unit',    'melee',  4, 'common',    3, { art: 'merc',     tags: ['merc'], deployEffect: 'damage', deployParam: 1 }),
  card('knight',    'Рыцарь',      'humans',   'unit',    'melee',  6, 'common',    5, { art: 'knight',   tags: ['knight'], deployEffect: 'shield_self' }),
  card('archer_a',  'Лучник',      'humans',   'unit',    'ranged', 3, 'common',    3, { art: 'archer',   tags: ['archer'], deployEffect: 'damage', deployParam: 2 }),
  card('archer_b',  'Лучник',      'humans',   'unit',    'ranged', 3, 'common',    3, { art: 'archer',   tags: ['archer'], deployEffect: 'damage', deployParam: 2 }),
  card('catapult',  'Катапульта',  'humans',   'unit',    'siege',  5, 'rare',      5, { art: 'catapult', tags: ['siege', 'machine'], deployEffect: 'row_damage', deployParam: 1 }),
  card('champion',  'Витязь',      'humans',   'hero',    'melee',  7, 'legendary', 11,{ art: 'champion', tags: ['knight'], resilience: true, deployEffect: 'boost', deployParam: 2 }),
  card('warhorn',   'Рог войны',   'humans',   'special', 'melee',  0, 'common',    4, { art: 'warhorn',  effect: 'horn' }),
  card('frost',     'Мороз',       'humans',   'special', 'melee',  0, 'rare',      3, { art: 'frost',    effect: 'weather_frost' }),
  card('clear_sky', 'Ясное небо',  'humans',   'special', 'melee',  0, 'common',    2, { effect: 'clear' }),
  card('medic',     'Медик',       'humans',   'unit',    'melee',  4, 'rare',      5, { art: 'medic',    tags: ['medic'], deployEffect: 'heal', deployParam: 4 }),
];

export const AI_DECK = [
  card('ghoul_a',  'Упырь',   'monsters', 'unit',    'melee',  3, 'common',    3, { art: 'ghoul', tags: ['undead'], deployEffect: 'bleed', deployParam: 1 }),
  card('ghoul_b',  'Упырь',   'monsters', 'unit',    'melee',  3, 'common',    3, { art: 'ghoul', tags: ['undead'], deployEffect: 'bleed', deployParam: 1 }),
  card('ghoul_c',  'Упырь',   'monsters', 'unit',    'melee',  3, 'common',    3, { art: 'ghoul', tags: ['undead'], deployEffect: 'bleed', deployParam: 1 }),
  card('harpy_a',  'Гарпия',  'monsters', 'unit',    'ranged', 4, 'common',    3, { art: 'harpy', tags: ['beast'], deployEffect: 'damage', deployParam: 2 }),
  card('harpy_b',  'Гарпия',  'monsters', 'unit',    'ranged', 4, 'common',    3, { art: 'harpy', tags: ['beast'], deployEffect: 'damage', deployParam: 2 }),
  card('troll_a',  'Тролль',  'monsters', 'unit',    'siege',  6, 'rare',      5, { art: 'troll', tags: ['giant'], deployEffect: 'shield_self' }),
  card('troll_b',  'Тролль',  'monsters', 'unit',    'siege',  6, 'rare',      5, { art: 'troll', tags: ['giant'], deployEffect: 'shield_self' }),
  card('beast',    'Зверь',   'monsters', 'hero',    'melee',  8, 'legendary', 11,{ art: 'beast', tags: ['beast'], immune: true, deployEffect: 'damage', deployParam: 3 }),
  card('blight',   'Порча',   'monsters', 'special', 'melee',  0, 'rare',      4, { effect: 'sign_damage' }),
  card('fog',      'Туман',   'monsters', 'special', 'ranged', 0, 'common',    3, { effect: 'weather_fog' }),
];
```

`src/data/shopCards.js`: заменить строки этих карт (остальные не трогать):

```js
  card('squire',         'Оруженосец',        'humans', 'unit',    'melee',  3, 'common',    5,  { art: 'squire',         tags: ['knight'], deployEffect: 'boost', deployParam: 2 }),
  card('poison_arrow',   'Отравл. стрела',    'humans', 'unit',    'ranged', 3, 'rare',      5,  { art: 'poison_arrow',   tags: ['archer'], deployEffect: 'poison' }),
  card('crossbow',       'Арбалетчик',        'humans', 'unit',    'ranged', 4, 'rare',      6,  { art: 'crossbow',       tags: ['archer'], deployEffect: 'damage', deployParam: 3 }),
  card('priest',         'Священник',         'humans', 'unit',    'melee',  3, 'common',    5,  { art: 'priest',         tags: ['medic'], deployEffect: 'cleanse_heal', deployParam: 2 }),
  card('alchemist',      'Алхимик',           'humans', 'unit',    'ranged', 3, 'rare',      6,  { art: 'alchemist',      tags: ['medic'], deployEffect: 'duplicate', hasOrder: true, orderEffect: 'shield_ally' }),
  card('engineer',       'Инженер',           'humans', 'unit',    'siege',  4, 'rare',      8,  { art: 'engineer',       tags: ['siege'], deployEffect: 'boost', deployParam: 3 }),
  card('lightning',      'Небесный Огонь',    'humans', 'special', 'ranged', 0, 'rare',      5,  { art: 'lightning',      effect: 'lightning', deployParam: 4 }),
  card('vampire',        'Вампир',            'monsters', 'unit',    'melee',  4, 'rare',      6,  { art: 'vampire',        tags: ['undead'], deployEffect: 'bleed', deployParam: 2 }),
  card('serpent',        'Серпент',           'monsters', 'unit',    'ranged', 3, 'common',    5,  { art: 'serpent',        tags: ['beast'], deployEffect: 'poison' }),
  card('seducer',        'Соблазнитель',      'monsters', 'unit',    'ranged', 3, 'rare',      6,  { art: 'seducer',        tags: ['demon'], deployEffect: 'take_control' }),
```

`src/engine/effects.js`: заменить кейс `wolf_pack` на:

```js
    case 'wolf_pack': {
      const wolves = ROWS.flatMap(r => own[r]).filter(c => c.def.tags?.includes('wolf'));
      if (wolves.length >= 3) wolves.forEach(w => boost(match, card, w, 2));
      if (!card.isCopy) copyToHand(match, card, card, playerIdx);
      break;
    }
```

`src/ui/cardDescription.js`: заменить объявления `DEPLOY`, `ORDER`, `SPECIAL` на следующие и в функции `cardDescription` заменить обращения `SPECIAL[`, `DEPLOY[`, `ORDER[` на `SPECIAL_DESCRIPTIONS[`, `DEPLOY_DESCRIPTIONS[`, `ORDER_DESCRIPTIONS[`:

```js
export const DEPLOY_DESCRIPTIONS = {
  // targeted
  damage:               (p) => `наносит ${p} урона выбранному врагу`,
  heal:                 (p) => `лечит выбранного союзника на ${p}`,
  boost:                (p) => `усиливает выбранного союзника на +${p}`,
  shield:               ()  => 'даёт Щит выбранному союзнику',
  duplicate:            ()  => 'кладёт в руку копию выбранного союзника',
  poison:               ()  => 'отравляет выбранного врага (−1 силы в ход)',
  bleed:                (p) => `накладывает Кровотечение ×${p} на выбранного врага`,
  row_damage:           (p) => `наносит ${p} урона всем картам выбранного ряда врага`,
  take_control:         ()  => 'забирает на свою сторону выбранного врага с силой ≤ 4',
  cleanse_heal:         (p) => `снимает Яд и Кровотечение с союзника и лечит его на ${p}`,
  // automatic
  knight_bonus:         ()  => '+1 к силе за каждого Рыцаря на поле',
  shield_self:          ()  => 'получает Щит',
  boost_self:           (p) => `усиливает себя на +${p}`,
  boost_all_faction:    (p) => `усиливает всех союзников своей фракции на +${p}`,
  damage_row:           (p) => `наносит ${p} урона всем картам в своём ряду у врага`,
  damage_all_rows:      (p) => `наносит ${p} урона всем картам на поле`,
  resurrect_one:        ()  => 'воскрешает последнюю карту с кладбища',
  resurrect_four_weak:  ()  => 'воскрешает 4 последние карты с кладбища с силой 1',
  copy_enemy_graveyard: ()  => 'призывает копию сильнейшей карты с кладбища врага',
  wolf_pack:            ()  => 'кладёт свою копию в руку; при 3+ Волках на поле каждый +2',
  bleed_check_self:     ()  => '+3 к силе, если у врага есть Кровотечение',
  werewolf_register:    ()  => 'в начале каждого раунда получает +2 силы',
  frost_weather_bonus:  (p) => `устанавливает Мороз; если погода уже была — +${p} себе`,
};

export const ORDER_DESCRIPTIONS = {
  boost_melee_row:   (p) => `усиливает все карты ближнего боя на +${p}`,
  boost_knights:     (p) => `усиливает всех Рыцарей на +${p}`,
  damage_one:        (p) => `наносит ${p} урона выбранному врагу`,
  damage_lock:       (p) => `наносит ${p} урона и блокирует способность выбранного врага`,
  damage_row_choice: (p) => `наносит ${p} урона всему выбранному ряду врага`,
  heal_ally:         (p) => `лечит выбранного союзника на ${p}`,
  shield_ally:       ()  => 'даёт Щит выбранному союзнику',
  poison_two:        ()  => 'отравляет двух слабейших врагов',
  debuff_living:     (p) => `наносит ${p} урона всем врагам`,
  boost_all_faction: (p) => `усиливает всех союзников на +${p}`,
};

export const SPECIAL_DESCRIPTIONS = {
  horn:              'удваивает силу карт в выбранном своём ряду',
  weather_frost:     'Мороз: сила карт ближнего боя считается как 1',
  weather_fog:       'Туман: сила карт дальнего боя считается как 1',
  weather_rain:      'Дождь: сила осадных карт считается как 1',
  clear:             'убирает всю погоду',
  sign_damage:       'наносит 2 урона всем картам выбранного ряда врага',
  lightning:         'наносит 4 урона выбранному врагу',
  blessing_humans:   'усиливает всех людей на поле на +2',
  order_ready:       'все Приказы союзников снова готовы',
  fog_frost_combo:   'устанавливает Туман и Мороз одновременно',
  bleed_all_enemies: 'накладывает Кровотечение на всех врагов',
  scorch:            'уничтожает сильнейшие карты (≥10 силы) на обоих полях',
};
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты (включая `shopCards.test.js`: карт по-прежнему 36).

- [ ] **Step 5: Commit**

```bash
git add src/data/starterDecks.js src/data/shopCards.js src/data/cardData.test.js src/ui/cardDescription.js src/engine/effects.js src/engine/effects.test.js
git commit -m "feat(data): every card acts — targeted deploys, wolf self-copy, descriptions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Все эффекты через примитивы — правило смерти

**Files:**
- Modify (полностью): `src/engine/effects.js`
- Modify (полностью): `src/engine/GwentMatch.js`
- Modify: `src/engine/effects.test.js` (удалить устаревшие блоки)
- Modify: `src/engine/GwentMatch.test.js` (переписать 2 теста «минимум 1», добавить тест смерти от тика)

**Interfaces:**
- Consumes: всё из Task 1–3.
- Produces: те же экспорты `GwentMatch.js`: `createMatch`, `playCard`, `pass`, `hasLegalMove`, `healUnit`, `startTurn`, `useOrder`. `healUnit` остаётся до Task 10.
- Удаляются deploy-эффекты `poison_one`, `bleed_two`, `damage_one`, `boost_neighbor`, `boost_machine`, `control_weakest`, `cleanse_ally` и спецэффект `lightning_ranged`, а также ветка `heal` в `applyEffect` (больше не используются в данных после Task 4).

- [ ] **Step 1: Переписать тесты под новое правило**

В `src/engine/GwentMatch.test.js` заменить тест `'floors damaged power at 1'` на:

```js
  it('kills a unit whose power drops to 0', () => {
    const f = () => ({ id: 'f', type: 'unit', row: 'ranged', power: 1 });
    const sign = { id: 'sg', type: 'special', effect: 'sign_damage', row: 'melee', power: 0 };
    const weak = { id: 'w', type: 'unit', row: 'melee', power: 2 };
    const extra = { id: 'e', type: 'unit', row: 'siege', power: 1 };
    const match = createMatch([f(), sign], [weak, extra], 2);
    playCard(match, 0, 'ranged'); // p0 filler
    playCard(match, 0, 'melee');  // p1 weak
    playCard(match, 0, 'melee');  // p0 sign: 2 - 2 = 0 -> dies
    expect(match.players[1].board.melee).toHaveLength(0);
    expect(match.players[1].graveyard.map((c) => c.def.id)).toEqual(['w']);
  });
```

Заменить тест `'bleed does not reduce power below 1'` на:

```js
  it('bleed can kill a card', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    match.players[0].board.melee[0].bleedStacks = 5;
    playCard(match, 0, 'melee');
    startTurn(match);
    expect(match.players[0].board.melee).toHaveLength(0);
    expect(match.events.some((e) => e.type === 'destroy')).toBe(true);
  });

  it('status ticks bypass the shield', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    const card = match.players[0].board.melee[0];
    card.poisoned = true;
    card.shielded = true;
    playCard(match, 0, 'melee');
    startTurn(match);
    expect(card.power).toBe(2);
    expect(card.shielded).toBe(true);
  });
```

Добавить в конец `src/engine/GwentMatch.test.js`:

```js
describe('shield vs special damage', () => {
  it('a shielded unit ignores sign damage once', () => {
    const f = () => ({ id: 'f', type: 'unit', row: 'ranged', power: 1 });
    const sign = { id: 'sg', type: 'special', effect: 'sign_damage', row: 'melee', power: 0 };
    const troll = { id: 't', type: 'unit', row: 'melee', power: 6, deployEffect: 'shield_self' };
    const extra = { id: 'e', type: 'unit', row: 'siege', power: 1 };
    const match = createMatch([f(), sign], [troll, extra], 2);
    playCard(match, 0, 'ranged');
    playCard(match, 0, 'melee');  // troll shields itself
    playCard(match, 0, 'melee');  // sign hits melee
    const t = match.players[1].board.melee[0];
    expect(t.power).toBe(6);
    expect(t.shielded).toBe(false);
  });
});
```

В `src/engine/effects.test.js` удалить блоки `describe('Deploy: poison_one', ...)`, `describe('Deploy: bleed_two', ...)`, `describe('Deploy: damage_one', ...)` и `describe('Deploy: boost_neighbor', ...)` целиком (эти эффекты удаляются, их замены покрыты блоком `targeted Deploy effects`).

- [ ] **Step 2: Убедиться, что новые тесты падают**

Run: `npx vitest run src/engine/GwentMatch.test.js`
Expected: FAIL: `kills a unit whose power drops to 0` (длина 1 вместо 0), `bleed can kill a card`, `a shielded unit ignores sign damage once` (сила 4 вместо 6).

- [ ] **Step 3: Реализация**

`src/engine/effects.js` — полностью:

```js
import { createCard } from './Card.js';
import { ROWS } from './Board.js';
import {
  dealDamage, heal, boost, giveShield, copyToHand, applyPoison, addBleed, damageRow, takeControl,
} from './actions.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function allOnBoard(board) {
  return ROWS.flatMap(r => board[r]);
}

function nonHeroes(board) {
  return allOnBoard(board).filter(c => c.def.type !== 'hero');
}

function strongest(units) {
  return units.length ? units.reduce((a, b) => (a.power >= b.power ? a : b)) : null;
}

// ── Deploy effects ────────────────────────────────────────────────────────────

export function applyDeploy(match, card, playerIdx, target = null) {
  const { deployEffect, deployParam = 1 } = card.def;
  if (!deployEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (deployEffect) {
    // ── Targeted (target validated in targeting.js before we get here)
    case 'damage':       dealDamage(match, card, target, deployParam); break;
    case 'heal':         heal(match, card, target, deployParam); break;
    case 'boost':        boost(match, card, target, deployParam); break;
    case 'shield':       giveShield(match, card, target); break;
    case 'duplicate':    if (!card.isCopy) copyToHand(match, card, target, playerIdx); break;
    case 'poison':       applyPoison(match, card, target); break;
    case 'bleed':        addBleed(match, card, target, deployParam); break;
    case 'row_damage':   damageRow(match, card, 1 - playerIdx, target, deployParam); break;
    case 'take_control': takeControl(match, card, target, playerIdx); break;
    case 'cleanse_heal':
      target.poisoned = false;
      target.bleedStacks = 0;
      heal(match, card, target, deployParam);
      break;

    // ── Automatic
    case 'knight_bonus': {
      const knights = allOnBoard(own).filter(c => c.def.tags?.includes('knight') && c !== card);
      boost(match, card, card, knights.length);
      break;
    }
    case 'boost_self':
      boost(match, card, card, deployParam);
      break;
    case 'shield_self':
      giveShield(match, card, card);
      break;
    case 'boost_all_faction':
      allOnBoard(own)
        .filter(c => c !== card && c.def.faction === card.def.faction)
        .forEach(c => boost(match, card, c, deployParam));
      break;
    case 'damage_row':
      damageRow(match, card, 1 - playerIdx, card.def.row, deployParam);
      break;
    case 'damage_all_rows':
      // allOnBoard builds new arrays, so deaths during the loop are safe
      [...allOnBoard(own), ...allOnBoard(opp)]
        .filter(c => c !== card)
        .forEach(c => dealDamage(match, card, c, deployParam));
      break;
    case 'resurrect_one': {
      const grave = match.players[playerIdx].graveyard;
      if (grave.length > 0) {
        const dead = grave.pop();
        own[dead.def.row].push(createCard(dead.def));
      }
      break;
    }
    case 'resurrect_four_weak': {
      const grave = match.players[playerIdx].graveyard;
      const batch = grave.splice(Math.max(0, grave.length - 4), 4);
      batch.forEach(dead => {
        const revived = createCard(dead.def);
        revived.power = 1;
        own[dead.def.row].push(revived);
      });
      break;
    }
    case 'copy_enemy_graveyard': {
      const template = strongest(match.players[1 - playerIdx].graveyard);
      if (template) own[template.def.row].push(createCard(template.def));
      break;
    }
    case 'wolf_pack': {
      const wolves = allOnBoard(own).filter(c => c.def.tags?.includes('wolf'));
      if (wolves.length >= 3) wolves.forEach(w => boost(match, card, w, 2));
      if (!card.isCopy) copyToHand(match, card, card, playerIdx);
      break;
    }
    case 'bleed_check_self':
      if (nonHeroes(opp).some(c => c.bleedStacks > 0)) boost(match, card, card, 3);
      break;
    case 'werewolf_register':
      // flag checked in startNextRound (GwentMatch)
      card.werewolf = true;
      break;
    case 'frost_weather_bonus': {
      const hadWeather = match.weather.size > 0;
      match.weather.add('melee');
      if (hadWeather) boost(match, card, card, deployParam);
      break;
    }
    default:
      break; // unknown effects silently ignored
  }
}

// ── Order effects ─────────────────────────────────────────────────────────────

export function applyOrder(match, card, playerIdx, target = null) {
  const { orderEffect, orderParam = 1 } = card.def;
  if (!orderEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (orderEffect) {
    case 'boost_melee_row':
      own.melee.filter(c => c !== card).forEach(c => boost(match, card, c, orderParam));
      break;
    case 'boost_knights':
      allOnBoard(own)
        .filter(c => c !== card && c.def.tags?.includes('knight'))
        .forEach(c => boost(match, card, c, orderParam));
      break;
    case 'boost_all_faction':
      allOnBoard(own)
        .filter(c => c !== card && c.def.faction === card.def.faction)
        .forEach(c => boost(match, card, c, orderParam));
      break;
    case 'damage_one':
      dealDamage(match, card, target, orderParam);
      break;
    case 'damage_lock':
      target.locked = true;
      dealDamage(match, card, target, orderParam);
      break;
    case 'damage_row_choice':
      damageRow(match, card, 1 - playerIdx, target, orderParam);
      break;
    case 'heal_ally':
      heal(match, card, target, orderParam);
      break;
    case 'shield_ally':
      giveShield(match, card, target);
      break;
    case 'debuff_living':
      allOnBoard(opp).forEach(c => dealDamage(match, card, c, orderParam));
      break;
    case 'poison_two':
      nonHeroes(opp)
        .sort((a, b) => a.power - b.power)
        .slice(0, 2)
        .forEach(u => applyPoison(match, card, u));
      break;
    default:
      break;
  }
}
```

`src/engine/GwentMatch.js` — полностью:

```js
import { createCard } from './Card.js';
import { createBoard, addUnit, totalPower, ROWS } from './Board.js';
import { applyDeploy, applyOrder } from './effects.js';
import { emit } from './events.js';
import { resolveTarget, targetKind } from './targeting.js';
import { dealDamage, boost, addBleed, damageRow, destroy } from './actions.js';

function makePlayer(deck, handSize) {
  const cards = deck.map(createCard);
  return {
    deck: cards.slice(handSize),
    hand: cards.slice(0, handSize),
    board: createBoard(),
    graveyard: [],
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
    weather: new Set(),
    events: [],
  };
}

function allOnBoard(board) {
  return ROWS.flatMap(r => board[r]);
}

function passTurn(match) {
  const opponent = 1 - match.current;
  if (!match.players[opponent].passed) {
    match.current = opponent;
  }
}

const WEATHER_ROW = {
  weather_frost: 'melee',
  weather_fog: 'ranged',
  weather_rain: 'siege',
};

function applyEffect(match, card, row, target) {
  const effect = card.def.effect;
  const own = match.players[match.current].board;
  const opp = match.players[1 - match.current].board;

  if (effect in WEATHER_ROW) {
    match.weather.add(WEATHER_ROW[effect]);
    return;
  }
  if (effect === 'clear') {
    match.weather.clear();
    return;
  }
  if (effect === 'horn') {
    if (!ROWS.includes(row)) throw new Error(`Unknown row: ${row}`);
    own.horns.add(row);
    return;
  }
  if (effect === 'sign_damage') {
    if (!ROWS.includes(row)) throw new Error(`Unknown row: ${row}`);
    damageRow(match, card, 1 - match.current, row, 2);
    return;
  }
  if (effect === 'lightning') {
    dealDamage(match, card, target, card.def.deployParam ?? 1);
    return;
  }
  if (effect === 'blessing_humans') {
    allOnBoard(own)
      .filter(c => c.def.faction === 'humans')
      .forEach(c => boost(match, card, c, 2));
    return;
  }
  if (effect === 'order_ready') {
    allOnBoard(own).forEach(c => {
      if (c.def.hasOrder && c.def.chargeMax === 0) c.orderUsed = false;
    });
    return;
  }
  if (effect === 'fog_frost_combo') {
    match.weather.add('ranged');
    match.weather.add('melee');
    return;
  }
  if (effect === 'bleed_all_enemies') {
    allOnBoard(opp).forEach(c => addBleed(match, card, c, 1));
    return;
  }
  if (effect === 'scorch') {
    // Destroy all non-hero units tied for highest power if that power >= 10
    const candidates = match.players
      .flatMap(pl => allOnBoard(pl.board))
      .filter(c => c.def.type !== 'hero');
    const maxPow = candidates.reduce((m, c) => Math.max(m, c.power), 0);
    if (maxPow >= 10) {
      // Scorched cards are exiled — they go to neither graveyard
      candidates.filter(c => c.power === maxPow).forEach(c => destroy(match, c, { exile: true }));
    }
    return;
  }
  throw new Error(`Unknown effect: ${effect}`);
}

function applyCard(match, card, row, target, fizzled) {
  const self = match.current;
  const special = card.def.type === 'special';
  if (special) {
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: null, special: true });
  } else {
    const board = match.players[self].board;
    addUnit(board, row, card);
    emit(match, { type: 'play', uid: card.uid, def: card.def, player: self, row, index: board[row].length - 1, special: false });
    // Non-Zeal Order cards can't act the turn they're played
    if (card.def.hasOrder && !card.def.zeal && card.def.chargeMax === 0) {
      card.orderUsed = true;
    }
  }
  if (fizzled) {
    emit(match, { type: 'fizzle', sourceUid: card.uid });
    return;
  }
  if (special) applyEffect(match, card, row, target);
  else applyDeploy(match, card, self, target);
}

export function playCard(match, cardIndex, row, { target } = {}) {
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
  // Validate before mutating anything: a bad target must not cost the card
  const chosen = resolveTarget(match, match.current, card, 'deploy', target);
  const fizzled = targetKind(card, 'deploy') !== 'none' && chosen === null;
  player.hand.splice(cardIndex, 1);
  applyCard(match, card, row, chosen, fizzled);
  passTurn(match);
}

function startNextRound(match, lastResult) {
  for (const player of match.players) {
    for (const row of ROWS) {
      const kept = [];
      for (const card of player.board[row]) {
        if (card.def.resilience) {
          card.orderUsed = false; // reset Order for next round
          kept.push(card);
        } else if (!card.def.doomed) {
          player.graveyard.push(card); // normal cards → graveyard
          // doomed cards are simply dropped (neither kept nor graveyard)
        }
      }
      player.board[row] = kept;
    }
    player.passed = false;
    // Werewolves get +2 at the start of each new round
    for (const card of allOnBoard(player.board)) {
      if (card.werewolf) boost(match, card, card, 2);
    }
  }
  match.round++;
  match.roundStarter = lastResult === 'draw'
    ? 1 - match.roundStarter
    : 1 - lastResult;
  match.current = match.roundStarter;
  match.weather.clear();
}

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

function resolveRound(match) {
  const [p0, p1] = match.players;
  const power0 = totalPower(p0.board, match.weather);
  const power1 = totalPower(p1.board, match.weather);

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
    finishMatch(match);
    return;
  }
  startNextRound(match, result);
}

export function hasLegalMove(match) {
  if (match.winner !== null) {
    return false;
  }
  const player = match.players[match.current];
  return !player.passed && player.hand.length > 0;
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

export function healUnit(match, playerIndex, row, cardIndex) {
  const card = match.players[playerIndex]?.board[row]?.[cardIndex];
  if (!card) throw new Error(`No card at ${row}[${cardIndex}]`);
  if (card.def.type === 'hero') throw new Error('Cannot heal a hero');
  if (card.power === card.def.power) throw new Error('Card is not weakened');
  card.power = card.def.power;
}

export function startTurn(match) {
  // Status ticks: bleed + poison, straight to power (shield/armor don't stop them)
  for (const player of match.players) {
    for (const card of allOnBoard(player.board)) {
      const tick = card.bleedStacks + (card.poisoned ? 1 : 0);
      if (tick > 0) dealDamage(match, null, card, tick, { direct: true });
    }
  }
  // Reset regular Order (not Charge) for the current player
  for (const card of allOnBoard(match.players[match.current].board)) {
    if (card.def.hasOrder && card.def.chargeMax === 0) {
      card.orderUsed = false;
    }
  }
}

export function useOrder(match, playerIdx, row, cardIdx, { target } = {}) {
  const card = match.players[playerIdx]?.board[row]?.[cardIdx];
  if (!card) throw new Error(`No card at ${row}[${cardIdx}]`);
  if (!card.def.hasOrder) throw new Error('Card has no Order ability');
  if (card.locked) throw new Error('Card is locked');

  const isCharge = card.def.chargeMax > 0;
  if (isCharge) {
    if (card.chargesLeft <= 0) throw new Error('No charges left');
  } else {
    if (card.orderUsed) throw new Error('Order already used this turn');
  }

  const chosen = resolveTarget(match, playerIdx, card, 'order', target);
  if (targetKind(card, 'order') !== 'none' && chosen === null) {
    throw new Error('No valid targets');
  }
  applyOrder(match, card, playerIdx, chosen);

  if (isCharge) {
    card.chargesLeft--;
  } else {
    card.orderUsed = true;
  }
}
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты. Если какой-то старый тест падает из-за того, что карта теперь умирает (сила ≤ 0), исправить ожидание в тесте под правило смерти, а не движок.

- [ ] **Step 5: Commit**

```bash
git add src/engine/effects.js src/engine/effects.test.js src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): route every effect through action primitives — damage now kills

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Раздача 5 карт в раундах 2 и 3

**Files:**
- Create: `src/engine/rng.js`, `src/engine/rng.test.js`
- Create: `src/engine/dealRandom.js`, `src/engine/dealRandom.test.js`
- Create: `src/data/factionPool.js`, `src/data/factionPool.test.js`
- Modify: `src/engine/GwentMatch.js` (`createMatch`, `startNextRound`)
- Modify: `src/engine/GwentMatch.test.js`

**Interfaces:**
- Produces:
  - `seededRng(seed: number) → () => number` в `[0, 1)`; `shuffle(items, rng) → новый массив`.
  - `RARITY_WEIGHT`, `ROUND_DRAW = 5`, `MAX_HAND = 10`, `dealRandom(pool, count, rng) → def[]`.
  - `buildFactionPool(faction) → def[]` (уникальные по `name`, без лидеров).
  - `createMatch(deckA, deckB, handSize = 10, { rng = null, pools = null } = {})`; в матче поля `rng`, `pools`.
  - Событие `{ type: 'draw', player, uids }` для игрока 0, затем 1 (всегда оба, даже если `uids` пуст).

- [ ] **Step 1: Написать падающие тесты**

Создать `src/engine/rng.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { seededRng, shuffle } from './rng.js';

describe('seededRng', () => {
  it('same seed gives the same sequence, values in [0, 1)', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    for (let i = 0; i < 20; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('returns a permutation and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(input, seededRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(out).not.toEqual(input);
  });
});
```

Создать `src/engine/dealRandom.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { dealRandom } from './dealRandom.js';
import { seededRng } from './rng.js';

const d = (id, rarity) => ({ id, rarity });

describe('dealRandom', () => {
  it('deals exactly count cards from the pool', () => {
    const pool = [d('a', 'common'), d('b', 'rare')];
    const hand = dealRandom(pool, 5, seededRng(1));
    expect(hand).toHaveLength(5);
    hand.forEach((card) => expect(pool).toContain(card));
  });

  it('is deterministic for a given seed', () => {
    const pool = [d('a', 'common'), d('b', 'rare'), d('c', 'epic')];
    expect(dealRandom(pool, 5, seededRng(9))).toEqual(dealRandom(pool, 5, seededRng(9)));
  });

  it('never deals more than one legendary', () => {
    const pool = [d('l1', 'legendary'), d('l2', 'legendary'), d('c', 'common')];
    for (let seed = 1; seed <= 50; seed++) {
      const hand = dealRandom(pool, 5, seededRng(seed));
      expect(hand.filter((c) => c.rarity === 'legendary').length).toBeLessThanOrEqual(1);
    }
  });

  it('respects rarity weights (common 50 vs legendary 5)', () => {
    const pool = [d('c', 'common'), d('l', 'legendary')];
    const rng = seededRng(7);
    let commons = 0;
    for (let i = 0; i < 1000; i++) {
      if (dealRandom(pool, 1, rng)[0].id === 'c') commons++;
    }
    expect(commons).toBeGreaterThan(850); // expected ≈ 909
  });

  it('an empty pool deals nothing', () => {
    expect(dealRandom([], 5, seededRng(1))).toEqual([]);
  });
});
```

Создать `src/data/factionPool.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildFactionPool } from './factionPool.js';

describe('buildFactionPool', () => {
  it('contains only the requested faction and no leaders', () => {
    const pool = buildFactionPool('humans');
    expect(pool.length).toBeGreaterThan(10);
    pool.forEach((c) => {
      expect(c.faction).toBe('humans');
      expect(c.tags ?? []).not.toContain('leader');
    });
  });

  it('lists each card name once (merc_a/b/c collapse into one entry)', () => {
    const names = buildFactionPool('humans').map((c) => c.name);
    expect(names.filter((n) => n === 'Наёмник')).toHaveLength(1);
    expect(new Set(names).size).toBe(names.length);
  });
});
```

Добавить в `src/engine/GwentMatch.test.js` импорт `import { seededRng } from './rng.js';` и в конец файла:

```js
describe('round draws', () => {
  const poolCard = { id: 'p', name: 'P', type: 'unit', row: 'melee', power: 2, rarity: 'common' };
  const pool = [poolCard];

  it('deals 5 pool cards to each player at the start of round 2', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 3)], 1, { rng: seededRng(1), pools: [pool, pool] });
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match); // p0 wins round 1
    expect(match.round).toBe(2);
    expect(match.players[0].hand).toHaveLength(5);
    expect(match.players[1].hand).toHaveLength(5);
    const draws = match.events.filter((e) => e.type === 'draw');
    expect(draws.map((e) => e.player)).toEqual([0, 1]);
    expect(draws[0].uids).toEqual(match.players[0].hand.map((c) => c.uid));
  });

  it('never fills a hand above 10', () => {
    const deck = Array.from({ length: 8 }, (_, i) => unit(`a${i}`, 1));
    const match = createMatch(deck, [unit('b', 3)], 8, { rng: seededRng(2), pools: [pool, pool] });
    pass(match);
    pass(match); // 0 vs 0 -> draw, round 2 starts
    expect(match.players[0].hand).toHaveLength(10);
  });

  it('without pools no cards are dealt', () => {
    const match = createMatch([unit('a', 5), unit('a2', 1)], [unit('b', 3), unit('b2', 1)], 1);
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(match.players[0].hand).toHaveLength(0);
  });

  it('shuffles the opening hand when rng is given', () => {
    const deck = Array.from({ length: 10 }, (_, i) => unit(`c${i}`, i + 1));
    const match = createMatch(deck, deck, 10, { rng: seededRng(3) });
    const ids = match.players[0].hand.map((c) => c.def.id);
    expect([...ids].sort()).toEqual(deck.map((c) => c.id).sort());
    expect(ids).not.toEqual(deck.map((c) => c.id));
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/engine/rng.test.js src/engine/dealRandom.test.js src/data/factionPool.test.js src/engine/GwentMatch.test.js`
Expected: FAIL: не найдены `./rng.js`, `./dealRandom.js`, `./factionPool.js`.

- [ ] **Step 3: Реализация**

Создать `src/engine/rng.js`:

```js
// mulberry32 — tiny deterministic PRNG, good enough for card games and tests
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates on a copy
export function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

Создать `src/engine/dealRandom.js`:

```js
export const RARITY_WEIGHT = { common: 50, rare: 30, epic: 15, legendary: 5 };
export const ROUND_DRAW = 5;
export const MAX_HAND = 10;

const weightOf = (def) => RARITY_WEIGHT[def.rarity] ?? RARITY_WEIGHT.common;

export function dealRandom(pool, count, rng) {
  const dealt = [];
  let legendaryDealt = false;
  while (dealt.length < count) {
    // After one legendary, the rest of the deal ignores legendaries
    const allowed = legendaryDealt ? pool.filter((d) => d.rarity !== 'legendary') : pool;
    if (allowed.length === 0) break;
    const total = allowed.reduce((sum, d) => sum + weightOf(d), 0);
    let roll = rng() * total;
    let pick = allowed[allowed.length - 1];
    for (const def of allowed) {
      roll -= weightOf(def);
      if (roll < 0) { pick = def; break; }
    }
    if (pick.rarity === 'legendary') legendaryDealt = true;
    dealt.push(pick);
  }
  return dealt;
}
```

Создать `src/data/factionPool.js`:

```js
import { PLAYER_DECK, AI_DECK } from './starterDecks.js';
import { SHOP_CARDS } from './shopCards.js';

// Every card of the faction once (by name), leaders excluded
export function buildFactionPool(faction) {
  const seen = new Set();
  return [...PLAYER_DECK, ...AI_DECK, ...SHOP_CARDS].filter((def) => {
    if (def.faction !== faction || def.tags?.includes('leader')) return false;
    if (seen.has(def.name)) return false;
    seen.add(def.name);
    return true;
  });
}
```

В `src/engine/GwentMatch.js`:
- добавить импорты:

```js
import { dealRandom, ROUND_DRAW, MAX_HAND } from './dealRandom.js';
import { shuffle } from './rng.js';
```

- заменить `createMatch` на:

```js
export function createMatch(deckA, deckB, handSize = 10, { rng = null, pools = null } = {}) {
  const order = (deck) => (rng ? shuffle(deck, rng) : deck);
  return {
    players: [makePlayer(order(deckA), handSize), makePlayer(order(deckB), handSize)],
    current: 0,
    round: 1,
    roundStarter: 0,
    winner: null,
    lastRound: null,
    weather: new Set(),
    events: [],
    rng: rng ?? Math.random,
    pools, // [poolA, poolB] of card defs, or null = no round draws
  };
}
```

- в `startNextRound` после строки `match.weather.clear();` добавить:

```js
  if (match.pools) {
    match.players.forEach((player, i) => {
      const count = Math.max(0, Math.min(ROUND_DRAW, MAX_HAND - player.hand.length));
      const cards = dealRandom(match.pools[i], count, match.rng).map(createCard);
      player.hand.push(...cards);
      emit(match, { type: 'draw', player: i, uids: cards.map((c) => c.uid) });
    });
  }
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.js src/engine/rng.test.js src/engine/dealRandom.js src/engine/dealRandom.test.js src/data/factionPool.js src/data/factionPool.test.js src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): deal 5 weighted random faction cards at rounds 2 and 3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ИИ выбирает цели

**Files:**
- Create: `src/engine/ai/chooseTarget.js`, `src/engine/ai/chooseTarget.test.js`
- Modify: `src/engine/ai/OpponentAI.js`, `src/engine/ai/OpponentAI.test.js`
- Modify: `src/engine/playMatch.js`, `src/engine/playMatch.test.js`

**Interfaces:**
- Consumes: `getValidTargets`, `effectOf` из `targeting.js`; `totalPower` из `Board.js`.
- Produces:
  - `chooseTarget(match, playerIdx, card, slot) → card | row | null`
  - `effectValue(match, playerIdx, card, slot, target) → number`
  - `chooseMove(match, playerIndex) → { type: 'pass' } | { type: 'play', cardIndex, row, target? }` (`target` отсутствует, если цели нет)
  - `playMatch(deckA, deckB, handSize = 10, options = {})`: `options` передаются в `createMatch`.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/engine/ai/chooseTarget.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createMatch } from '../GwentMatch.js';
import { createCard } from '../Card.js';
import { addUnit } from '../Board.js';
import { chooseTarget } from './chooseTarget.js';

const def = (id, power, extra = {}) => ({ id, type: 'unit', row: 'melee', power, ...extra });
function place(match, playerIdx, d) {
  const card = createCard(d);
  addUnit(match.players[playerIdx].board, d.row, card);
  return card;
}
const archer = (n) => createCard(def('ar', 3, { row: 'ranged', deployEffect: 'damage', deployParam: n }));

describe('chooseTarget', () => {
  it('prefers the strongest enemy it can kill', () => {
    const match = createMatch([], [], 0);
    place(match, 0, def('big', 7));
    const killable = place(match, 0, def('mid', 3));
    place(match, 0, def('small', 2));
    expect(chooseTarget(match, 1, archer(3), 'deploy')).toBe(killable);
  });

  it('without a kill, hits the strongest unshielded enemy', () => {
    const match = createMatch([], [], 0);
    const shielded = place(match, 0, def('s', 9));
    shielded.shielded = true;
    const open = place(match, 0, def('o', 6));
    expect(chooseTarget(match, 1, archer(2), 'deploy')).toBe(open);
  });

  it('hits a shielded enemy only when nothing else is available', () => {
    const match = createMatch([], [], 0);
    const shielded = place(match, 0, def('s', 9));
    shielded.shielded = true;
    expect(chooseTarget(match, 1, archer(2), 'deploy')).toBe(shielded);
  });

  it('heals the most damaged ally', () => {
    const match = createMatch([], [], 0);
    const a = place(match, 1, def('a', 6));
    a.power = 5;
    const b = place(match, 1, def('b', 6));
    b.power = 2;
    const medic = createCard(def('m', 4, { deployEffect: 'heal', deployParam: 4 }));
    expect(chooseTarget(match, 1, medic, 'deploy')).toBe(b);
  });

  it('row damage targets the enemy row with most power', () => {
    const match = createMatch([], [], 0);
    place(match, 0, def('m', 3));
    place(match, 0, def('r1', 4, { row: 'ranged' }));
    place(match, 0, def('r2', 4, { row: 'ranged' }));
    const catapult = createCard(def('c', 5, { row: 'siege', deployEffect: 'row_damage', deployParam: 1 }));
    expect(chooseTarget(match, 1, catapult, 'deploy')).toBe('ranged');
  });

  it('returns null when there is nothing to target', () => {
    const match = createMatch([], [], 0);
    expect(chooseTarget(match, 1, archer(2), 'deploy')).toBeNull();
  });
});
```

Добавить в `src/engine/ai/OpponentAI.test.js` (в тот же `describe('chooseMove', ...)`):

```js
  it('prefers a card whose effect kills an enemy, and names the target', () => {
    const vanilla = { id: 'v', type: 'unit', row: 'melee', power: 4 };
    const killer = { id: 'k', type: 'unit', row: 'ranged', power: 3, deployEffect: 'damage', deployParam: 3 };
    const match = createMatch([unit('x', 1)], [vanilla, killer], 2);
    match.current = 1;
    addUnit(match.players[0].board, 'melee', createCard({ id: 'e', type: 'unit', row: 'melee', power: 3 }));
    const move = chooseMove(match, 1);
    expect(move).toMatchObject({ type: 'play', cardIndex: 1, row: 'ranged' });
    expect(move.target).toBe(match.players[0].board.melee[0]);
  });

  it('passes when the opponent has passed and it is already ahead', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 1), unit('b2', 1)], 1);
    addUnit(match.players[1].board, 'melee', createCard({ id: 'lead', row: 'melee', power: 5 }));
    match.players[0].passed = true;
    expect(chooseMove(match, 1)).toEqual({ type: 'pass' });
  });
```

и импорты в начало этого файла:

```js
import { createCard } from '../Card.js';
import { addUnit } from '../Board.js';
```

Добавить в `src/engine/playMatch.test.js`:

```js
import { PLAYER_DECK, AI_DECK } from '../data/starterDecks.js';
import { buildFactionPool } from '../data/factionPool.js';
import { seededRng } from './rng.js';

describe('playMatch with real decks, targets and round draws', () => {
  it('always finishes (20 seeds)', () => {
    const pools = [buildFactionPool('humans'), buildFactionPool('monsters')];
    for (let seed = 1; seed <= 20; seed++) {
      const match = playMatch(PLAYER_DECK, AI_DECK, 10, { rng: seededRng(seed), pools });
      expect([0, 1, 'draw']).toContain(match.winner);
    }
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/engine/ai src/engine/playMatch.test.js`
Expected: FAIL: не найден `./chooseTarget.js`; в `playMatch` падает `Invalid target` (ИИ не передаёт цель).

- [ ] **Step 3: Реализация**

Создать `src/engine/ai/chooseTarget.js`:

```js
import { ROWS } from '../Board.js';
import { getValidTargets, effectOf } from '../targeting.js';

// What an effect does, from the AI's point of view
const ROLE = {
  damage: 'damage', lightning: 'damage', damage_one: 'damage', damage_lock: 'damage',
  heal: 'heal', heal_ally: 'heal', cleanse_heal: 'heal',
  boost: 'boost',
  shield: 'shield', shield_ally: 'shield',
  duplicate: 'duplicate',
  poison: 'poison',
  bleed: 'bleed',
  take_control: 'steal',
  row_damage: 'rowDamage', damage_row_choice: 'rowDamage',
};

export function effectParam(card, slot) {
  return (slot === 'order' ? card.def.orderParam : card.def.deployParam) ?? 1;
}

const byPowerDesc = (a, b) => b.power - a.power;
const missing = (c) => c.def.power - c.power;

function enemyRowPower(match, playerIdx, row) {
  return match.players[1 - playerIdx].board[row]
    .filter((c) => c.def.type !== 'hero')
    .reduce((sum, c) => sum + c.power, 0);
}

export function chooseTarget(match, playerIdx, card, slot) {
  const targets = getValidTargets(match, playerIdx, card, slot);
  if (targets.length === 0) return null;
  const role = ROLE[effectOf(card, slot)];
  if (role === 'rowDamage') {
    return [...ROWS].sort((a, b) => enemyRowPower(match, playerIdx, b) - enemyRowPower(match, playerIdx, a))[0];
  }
  const sorted = [...targets].sort(byPowerDesc);
  const n = effectParam(card, slot);
  switch (role) {
    case 'damage': {
      const open = sorted.filter((c) => !c.shielded);
      return open.find((c) => c.power <= n) ?? open[0] ?? sorted[0];
    }
    case 'heal':
      return [...targets].sort((a, b) => missing(b) - missing(a))[0];
    case 'shield':
      return sorted.find((c) => !c.shielded) ?? sorted[0];
    case 'poison':
      return sorted.find((c) => !c.poisoned) ?? sorted[0];
    case 'bleed':
      return sorted.find((c) => c.bleedStacks === 0) ?? sorted[0];
    default:
      return sorted[0];
  }
}

// Rough "how many points does this effect swing" used to rank cards in hand
export function effectValue(match, playerIdx, card, slot, target) {
  const effect = effectOf(card, slot);
  const role = ROLE[effect];
  if (!role) return effect === 'shield_self' ? 2 : 0;
  if (target === null) return 0;
  const n = effectParam(card, slot);
  switch (role) {
    case 'damage':
      if (target.shielded) return 0;
      return target.power <= n ? target.power : n;
    case 'rowDamage':
      return match.players[1 - playerIdx].board[target].filter((c) => c.def.type !== 'hero').length * n;
    case 'heal':
      return Math.min(n, missing(target));
    case 'steal':
      return target.power * 2;
    case 'shield':
    case 'duplicate':
    case 'poison':
    case 'bleed':
      return 2;
    default:
      return n;
  }
}
```

`src/engine/ai/OpponentAI.js` — полностью:

```js
import { totalPower } from '../Board.js';
import { chooseTarget, effectValue } from './chooseTarget.js';

export function chooseMove(match, playerIndex) {
  const player = match.players[playerIndex];
  const opponent = match.players[1 - playerIndex];
  if (player.hand.length === 0) {
    return { type: 'pass' };
  }
  // Opponent is out of the round and we're ahead: don't waste cards
  if (opponent.passed
      && totalPower(player.board, match.weather) > totalPower(opponent.board, match.weather)) {
    return { type: 'pass' };
  }

  let best = null;
  player.hand.forEach((card, cardIndex) => {
    const target = chooseTarget(match, playerIndex, card, 'deploy');
    const score = card.power + effectValue(match, playerIndex, card, 'deploy', target);
    if (!best || score > best.score) best = { score, cardIndex, target };
  });

  const card = player.hand[best.cardIndex];
  const row = card.def.row === 'any' ? 'melee' : card.def.row;
  const move = { type: 'play', cardIndex: best.cardIndex, row };
  if (best.target !== null) move.target = best.target;
  return move;
}
```

`src/engine/playMatch.js` — полностью:

```js
import { createMatch, playCard, pass } from './GwentMatch.js';
import { chooseMove } from './ai/OpponentAI.js';

export function playMatch(deckA, deckB, handSize = 10, options = {}) {
  const match = createMatch(deckA, deckB, handSize, options);
  let safety = 1000;
  while (match.winner === null && safety-- > 0) {
    const move = chooseMove(match, match.current);
    if (move.type === 'pass') {
      pass(match);
    } else {
      playCard(match, move.cardIndex, move.row, { target: move.target });
    }
  }
  if (match.winner === null) {
    throw new Error('playMatch did not terminate');
  }
  return match;
}
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ai src/engine/playMatch.js src/engine/playMatch.test.js
git commit -m "feat(ai): pick targets (lethal first, avoid shields), score cards by effect, smart pass

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Очередь анимаций, `setPower`, позиции на поле

**Files:**
- Create: `src/ui/AnimationQueue.js`, `src/ui/AnimationQueue.test.js`
- Modify: `src/ui/layout.js`, `src/ui/layout.test.js`
- Modify: `src/ui/CardView.js`

**Interfaces:**
- Produces:
  - `new AnimationQueue(animations, scene)`; `play(events) → Promise`; `speedUp()`; `dur(ms) → number`; поле `speed`.
  - Контракт анимации: `(scene, event, queue) => Promise | void`.
  - `BOARD_CARD_SCALE = 0.6`, `boardCardX(index) → number` из `layout.js`.
  - `createCardView(...)` возвращает контейнер с методом `setPower(n)` (для спецкарт и рубашек — пустая функция).

- [ ] **Step 1: Написать падающие тесты**

Создать `src/ui/AnimationQueue.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { AnimationQueue } from './AnimationQueue.js';

describe('AnimationQueue', () => {
  it('plays events strictly in order, awaiting each one', async () => {
    const log = [];
    const animations = {
      a: async (_s, ev) => { await new Promise((r) => setTimeout(r, 5)); log.push(`a${ev.n}`); },
      b: (_s, ev) => { log.push(`b${ev.n}`); },
    };
    const queue = new AnimationQueue(animations, {});
    await queue.play([{ type: 'a', n: 1 }, { type: 'b', n: 2 }, { type: 'a', n: 3 }]);
    expect(log).toEqual(['a1', 'b2', 'a3']);
  });

  it('skips event types without an animation', async () => {
    const queue = new AnimationQueue({}, {});
    await expect(queue.play([{ type: 'unknown' }])).resolves.toBeUndefined();
  });

  it('keeps going when one animation throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = [];
    const queue = new AnimationQueue({
      bad: () => { throw new Error('boom'); },
      ok: () => { log.push('ok'); },
    }, {});
    await queue.play([{ type: 'bad' }, { type: 'ok' }]);
    expect(log).toEqual(['ok']);
    warn.mockRestore();
  });

  it('speedUp shortens durations until the queue finishes', async () => {
    const seen = [];
    const queue = new AnimationQueue({ t: (_s, _e, q) => { seen.push(q.dur(300)); } }, {});
    queue.speedUp();
    await queue.play([{ type: 't' }]);
    expect(seen).toEqual([100]);
    expect(queue.dur(300)).toBe(300);
  });
});
```

Добавить в `src/ui/layout.test.js`:

```js
import { boardCardX, BOARD_CARD_SCALE } from './layout.js';

describe('boardCardX', () => {
  it('places board cards left to right with a fixed step', () => {
    expect(BOARD_CARD_SCALE).toBe(0.6);
    expect(boardCardX(0)).toBe(220);
    expect(boardCardX(1)).toBe(220 + 100 * 0.6 + 6);
  });
});
```

(если `describe` и `expect` уже импортированы в файле — не дублировать их импорт.)

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/ui`
Expected: FAIL: не найден `./AnimationQueue.js`; `boardCardX is not a function`.

- [ ] **Step 3: Реализация**

Создать `src/ui/AnimationQueue.js`:

```js
// Plays engine events one after another. Each animation returns a Promise.
export class AnimationQueue {
  constructor(animations, scene) {
    this.animations = animations;
    this.scene = scene;
    this.speed = 1;
  }

  speedUp() {
    this.speed = 3;
  }

  dur(ms) {
    return Math.max(1, Math.round(ms / this.speed));
  }

  async play(events) {
    try {
      for (const event of events) {
        const animate = this.animations[event.type];
        if (!animate) continue;
        try {
          await animate(this.scene, event, this);
        } catch (e) {
          // A broken animation must never leave the scene stuck in "busy"
          console.warn(`Animation "${event.type}" failed:`, e);
        }
      }
    } finally {
      this.speed = 1;
    }
  }
}
```

В `src/ui/layout.js` добавить в конец:

```js
export const BOARD_CARD_SCALE = 0.6;
const BOARD_CARD_X0 = 220;

export function boardCardX(index) {
  return BOARD_CARD_X0 + index * (CARD_W * BOARD_CARD_SCALE + 6);
}
```

В `src/ui/CardView.js`:
- сразу после `const container = scene.add.container(0, 0);` добавить `container.setPower = () => {};`
- заменить блок создания цифры силы:

```js
      container.add(
        scene.add.text(0, BADGE_Y, String(cur), { fontSize: '18px', color: numColor }).setOrigin(0.5),
      );
```

на:

```js
      const powerText = scene.add.text(0, BADGE_Y, String(cur), { fontSize: '18px', color: numColor }).setOrigin(0.5);
      container.add(powerText);
      // Lets animations update the number without a full re-render
      container.setPower = (n) => {
        powerText.setText(String(n));
        powerText.setColor(cardDef.type === 'hero' ? '#ff9d5c'
          : n > base ? '#7fff7f'
          : n < base ? '#ff9f9f'
          : '#ffd479');
      };
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты.

- [ ] **Step 5: Commit**

```bash
git add src/ui/AnimationQueue.js src/ui/AnimationQueue.test.js src/ui/layout.js src/ui/layout.test.js src/ui/CardView.js
git commit -m "feat(ui): sequential AnimationQueue with speed-up, CardView.setPower, boardCardX

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Анимации эффектов

**Files:**
- Create: `src/ui/effectAnimations.js`, `src/ui/effectAnimations.test.js`

**Interfaces:**
- Consumes: `AnimationQueue.dur`; `scene.viewsByUid: Map<uid, CardView>`, `scene.animLayer`, `scene.match` (ставит BattleScene в Task 10); `findCardByUid`; `createCardView`, `floatText`, `sfx`; из `layout.js`: `SCREEN`, `HAND_Y`, `BOARD_CENTER_Y`, `CARD_W`, `CARD_H`, `rowY`, `handCardX`, `boardCardX`, `BOARD_CARD_SCALE`.
- Produces: `ANIMATIONS` (ключи: `play, damage, shieldBreak, heal, boost, shield, destroy, copyToHand, poison, bleed, rowDamage, control, draw, fizzle`), `ensureSparkTexture(scene)`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/ui/effectAnimations.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { ANIMATIONS } from './effectAnimations.js';

const ENGINE_EVENT_TYPES = [
  'play', 'damage', 'shieldBreak', 'heal', 'boost', 'shield', 'destroy',
  'copyToHand', 'poison', 'bleed', 'rowDamage', 'control', 'draw', 'fizzle',
];

describe('ANIMATIONS', () => {
  it('has an animation for every event type the engine emits', () => {
    for (const type of ENGINE_EVENT_TYPES) {
      expect(ANIMATIONS[type], type).toBeTypeOf('function');
    }
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/ui/effectAnimations.test.js`
Expected: FAIL: не найден `./effectAnimations.js`.

- [ ] **Step 3: Реализация**

Создать `src/ui/effectAnimations.js`:

```js
import { createCardView } from './CardView.js';
import { floatText } from './FloatingText.js';
import { sfx } from './SoundEngine.js';
import { findCardByUid } from '../engine/events.js';
import {
  SCREEN, HAND_Y, BOARD_CENTER_Y, CARD_W, CARD_H,
  rowY, handCardX, boardCardX, BOARD_CARD_SCALE,
} from './layout.js';

const ROW_SFX = { melee: sfx.cardMelee, ranged: sfx.cardRanged, siege: sfx.cardSiege };
const sideOf = (playerIdx) => (playerIdx === 0 ? 'player' : 'opponent');
const view = (scene, uid) => (uid == null ? null : scene.viewsByUid.get(uid) ?? null);

export function ensureSparkTexture(scene) {
  if (scene.textures.exists('spark')) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('spark', 8, 8);
  g.destroy();
}

// ── Promise helpers ──────────────────────────────────────────────────────────

function tweenP(scene, queue, config) {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, duration: queue.dur(config.duration ?? 300), onComplete: () => resolve() });
  });
}

function waitP(scene, queue, ms) {
  return new Promise((resolve) => scene.time.delayedCall(queue.dur(ms), resolve));
}

// ── Visual building blocks ───────────────────────────────────────────────────

function burst(scene, x, y, tint, { count = 14, rise = false } = {}) {
  const config = { lifespan: 550, scale: { start: 1, end: 0 }, tint, emitting: false };
  if (rise) {
    config.speedY = { min: -140, max: -60 };
    config.speedX = { min: -25, max: 25 };
  } else {
    config.speed = { min: 40, max: 160 };
  }
  const emitter = scene.add.particles(x, y, 'spark', config).setDepth(150);
  emitter.explode(count);
  scene.time.delayedCall(900, () => emitter.destroy());
}

function overlay(scene, v, color, alpha = 0.55) {
  const rect = scene.add.rectangle(v.x, v.y, CARD_W * v.scaleX, CARD_H * v.scaleY, color, alpha);
  scene.animLayer.add(rect);
  return rect;
}

async function projectile(scene, queue, sourceUid, target, color) {
  const source = view(scene, sourceUid);
  if (!source) return;
  const orb = scene.add.circle(source.x, source.y, 7, color).setStrokeStyle(2, 0xffe0a0);
  scene.animLayer.add(orb);
  await tweenP(scene, queue, { targets: orb, x: target.x, y: target.y, duration: 250, ease: 'Quad.In' });
  orb.destroy();
}

async function shake(scene, queue, v) {
  const x0 = v.x;
  await tweenP(scene, queue, { targets: v, x: x0 + 6, duration: 40, yoyo: true, repeat: 1 });
  v.x = x0;
}

function dropIcon(icon) {
  return async (scene, ev, queue) => {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    const text = scene.add.text(t.x, t.y - 70, icon, { fontSize: '26px' }).setOrigin(0.5);
    scene.animLayer.add(text);
    await tweenP(scene, queue, { targets: text, y: t.y, duration: 200, ease: 'Quad.In' });
    await tweenP(scene, queue, { targets: text, alpha: 0, duration: 120 });
    text.destroy();
  };
}

// ── One animation per engine event type ──────────────────────────────────────

export const ANIMATIONS = {
  async play(scene, ev, queue) {
    const from = view(scene, ev.uid);
    const startX = from ? from.x : SCREEN.width / 2;
    const startY = from ? from.y : -80; // AI cards come from the top edge
    from?.setVisible(false);
    const clone = createCardView(scene, ev.def).setScale(0.9).setPosition(startX, startY);
    scene.animLayer.add(clone);
    if (ev.special) sfx.cardSpecial();
    else (ROW_SFX[ev.row] ?? sfx.cardMelee)();
    const toX = ev.special ? SCREEN.width / 2 : boardCardX(ev.index);
    const toY = ev.special ? BOARD_CENTER_Y : rowY(sideOf(ev.player), ev.row);
    await tweenP(scene, queue, {
      targets: clone, x: toX, y: toY,
      scale: ev.special ? 0.9 : BOARD_CARD_SCALE,
      duration: 280, ease: 'Power2.Out',
    });
    if (ev.special) {
      await tweenP(scene, queue, { targets: clone, alpha: 0, scale: 1.2, duration: 220 });
      clone.destroy();
    } else {
      // The landed clone stands in for the card until the next render()
      scene.viewsByUid.set(ev.uid, clone);
    }
  },

  async damage(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    await projectile(scene, queue, ev.sourceUid, t, 0xff5533);
    sfx.damage();
    const flash = overlay(scene, t, 0xff2222);
    floatText(scene, t.x, t.y - 30, `-${ev.amount}`, '#ff9f9f');
    t.setPower?.(ev.powerAfter);
    await shake(scene, queue, t);
    await tweenP(scene, queue, { targets: flash, alpha: 0, duration: 110 });
    flash.destroy();
  },

  async shieldBreak(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    await projectile(scene, queue, ev.sourceUid, t, 0xff5533);
    sfx.order();
    const ring = scene.add.circle(t.x, t.y, 48, 0x66aaff, 0.35).setStrokeStyle(3, 0x99ccff);
    scene.animLayer.add(ring);
    burst(scene, t.x, t.y, 0x88bbff, { count: 18 });
    floatText(scene, t.x, t.y - 30, 'Щит!', '#99ccff');
    await tweenP(scene, queue, { targets: ring, scale: 1.5, alpha: 0, duration: 300 });
    ring.destroy();
  },

  async heal(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    sfx.heal();
    burst(scene, t.x, t.y + 30, 0x66ff88, { count: 12, rise: true });
    floatText(scene, t.x, t.y - 30, `+${ev.amount}`, '#7fff7f');
    t.setPower?.(ev.powerAfter);
    await waitP(scene, queue, 350);
  },

  async boost(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    floatText(scene, t.x, t.y - 30, `+${ev.amount}`, '#ffd479');
    t.setPower?.(ev.powerAfter);
    const s0 = t.scale;
    await tweenP(scene, queue, { targets: t, scale: s0 * 1.15, duration: 150, yoyo: true });
    t.setScale(s0);
  },

  async shield(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    sfx.order();
    const ring = scene.add.circle(t.x, t.y, 46, 0x66aaff, 0.25).setStrokeStyle(3, 0x99ccff).setScale(0.3);
    scene.animLayer.add(ring); // stays until render() shows the 🛡 icon
    await tweenP(scene, queue, { targets: ring, scale: 1, duration: 300, ease: 'Back.Out' });
  },

  async destroy(scene, ev, queue) {
    const t = view(scene, ev.uid);
    if (!t) return;
    sfx.damage();
    const red = overlay(scene, t, 0xaa0000, 0.6);
    burst(scene, t.x, t.y, 0xff5533, { count: 20 });
    await Promise.all([
      tweenP(scene, queue, { targets: t, scale: t.scale * 0.2, alpha: 0, duration: 400, ease: 'Quad.In' }),
      tweenP(scene, queue, { targets: red, alpha: 0, duration: 400 }),
    ]);
    red.destroy();
  },

  async copyToHand(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    const copy = findCardByUid(scene.match, ev.newUid);
    if (!t || !copy) return;
    sfx.cardSpecial();
    const ghost = createCardView(scene, copy.def).setScale(t.scale).setPosition(t.x, t.y).setAlpha(0.6);
    scene.animLayer.add(ghost);
    const toY = ev.player === 0 ? HAND_Y : -80;
    await tweenP(scene, queue, { targets: ghost, x: SCREEN.width / 2, y: toY, scale: 0.9, duration: 400, ease: 'Sine.InOut' });
    await tweenP(scene, queue, { targets: ghost, alpha: 0, duration: 150 });
    ghost.destroy();
  },

  poison: dropIcon('☠'),
  bleed: dropIcon('🩸'),

  async rowDamage(scene, ev, queue) {
    const y = rowY(sideOf(ev.player), ev.row);
    const wave = scene.add.rectangle(170, y, 46, 78, 0xff6622, 0.55);
    scene.animLayer.add(wave);
    sfx.scorch();
    await tweenP(scene, queue, { targets: wave, x: SCREEN.width - 170, duration: 350, ease: 'Sine.In' });
    wave.destroy();
  },

  async control(scene, ev, queue) {
    const t = view(scene, ev.targetUid);
    if (!t) return;
    sfx.cardSpecial();
    await tweenP(scene, queue, {
      targets: t, x: SCREEN.width / 2, y: rowY(sideOf(ev.player), ev.row),
      duration: 400, ease: 'Sine.InOut',
    });
  },

  async draw(scene, ev, queue) {
    if (ev.player !== 0) return; // the AI's hand is hidden; one banner is enough
    const banner = scene.add.text(SCREEN.width / 2, BOARD_CENTER_Y, `Раунд ${scene.match.round}`, {
      fontSize: '56px', color: '#ffd479', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScale(0.4).setAlpha(0);
    scene.animLayer.add(banner);
    await tweenP(scene, queue, { targets: banner, scale: 1, alpha: 1, duration: 350, ease: 'Back.Out' });
    await waitP(scene, queue, 400);
    await tweenP(scene, queue, { targets: banner, alpha: 0, duration: 250 });

    const hand = scene.match.players[0].hand;
    await Promise.all(ev.uids.map((uid, k) => {
      const idx = hand.findIndex((c) => c.uid === uid);
      const back = createCardView(scene, { rarity: 'common' }, { faceDown: true })
        .setScale(0.9).setPosition(SCREEN.width - 70, HAND_Y);
      scene.animLayer.add(back);
      return tweenP(scene, queue, {
        targets: back, x: handCardX(idx, hand.length),
        delay: queue.dur(120 * k), duration: 300, ease: 'Power2.Out',
      });
    }));
  },

  async fizzle(scene, ev, queue) {
    const s = view(scene, ev.sourceUid);
    const x = s?.x ?? SCREEN.width / 2;
    const y = s?.y ?? BOARD_CENTER_Y;
    burst(scene, x, y, 0x888888, { count: 10 });
    floatText(scene, x, y - 30, 'Нет цели', '#aaaaaa', '16px');
    await waitP(scene, queue, 250);
  },
};
```

- [ ] **Step 4: Убедиться, что всё зелёное**

Run: `npx vitest run`
Expected: PASS, все тесты.

- [ ] **Step 5: Commit**

```bash
git add src/ui/effectAnimations.js src/ui/effectAnimations.test.js
git commit -m "feat(ui): animation per engine event (projectiles, shields, deaths, round draw)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: BattleScene на событиях и выбор цели

**Files:**
- Modify (полностью): `src/scenes/BattleScene.js`
- Modify: `src/engine/GwentMatch.js` (удалить `healUnit`)
- Modify: `src/engine/GwentMatch.test.js` (удалить `healUnit` из импорта и блок `describe('healUnit', ...)`)

**Interfaces:**
- Consumes: всё из Task 1–9.
- Produces: сцена выставляет `scene.match`, `scene.viewsByUid`, `scene.animLayer` для `effectAnimations.js`.

- [ ] **Step 1: Удалить `healUnit`**

В `src/engine/GwentMatch.js` удалить функцию `healUnit` целиком. В `src/engine/GwentMatch.test.js` убрать `healUnit` из строки импорта и удалить блок `describe('healUnit', ...)` целиком.

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 2: Переписать `src/scenes/BattleScene.js` полностью**

```js
import Phaser from 'phaser';
import { createMatch, playCard, pass, useOrder, startTurn } from '../engine/GwentMatch.js';
import { drainEvents } from '../engine/events.js';
import { getValidTargets, targetKind } from '../engine/targeting.js';
import { chooseMove } from '../engine/ai/OpponentAI.js';
import { rowPower } from '../engine/Board.js';
import { createCardView } from '../ui/CardView.js';
import {
  SCREEN, ROW_NAMES, rowY, handCardX, HAND_Y, BOARD_CENTER_Y, boardCardX, BOARD_CARD_SCALE,
} from '../ui/layout.js';
import { AI_DECK } from '../data/starterDecks.js';
import { buildFactionPool } from '../data/factionPool.js';
import { getProfile, persist } from '../economy/session.js';
import { buildDeckCards, addGold, clearNode, grantCard, grantChestReward } from '../economy/profile.js';
import { showChest, showInterstitial, recordWin } from '../sdk/yandex.js';
import { SHOP_CARDS } from '../data/shopCards.js';
import { getCard } from '../data/cardCatalog.js';
import { drawBackground } from '../ui/background.js';
import { preloadBattleAssets } from '../ui/preloadAssets.js';
import { sfx } from '../ui/SoundEngine.js';
import { AnimationQueue } from '../ui/AnimationQueue.js';
import { ANIMATIONS, ensureSparkTexture } from '../ui/effectAnimations.js';

const ROW_TINT = { melee: 0x261a1a, ranged: 0x1a2620, siege: 0x1a1f2a };
const WEATHER_OVERLAY = { melee: 0x4488ee, ranged: 0x88aacc, siege: 0x224488 };
const WEATHER_LABEL   = { melee: '❄', ranged: '🌫', siege: '🌧' };
// Specials that affect the whole board: one click on the card plays them
const INSTANT_SPECIALS = new Set(['weather_frost', 'weather_fog', 'weather_rain', 'clear', 'scorch',
  'blessing_humans', 'order_ready', 'fog_frost_combo', 'bleed_all_enemies']);
const TARGET_STROKE = 0xff6600;

// Left-click only: right-click is reserved for cancelling target selection
function onLeftClick(obj, handler) {
  obj.setInteractive({ useHandCursor: true });
  obj.on('pointerdown', (pointer) => {
    if (!pointer.rightButtonDown()) handler();
  });
  return obj;
}

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  preload() {
    preloadBattleAssets(this);
  }

  create(data) {
    drawBackground(this);
    if (this.textures.exists('battle_bg')) {
      this.add.image(SCREEN.width / 2, SCREEN.height / 2, 'battle_bg')
        .setDisplaySize(SCREEN.width, SCREEN.height)
        .setAlpha(0.18);
    }
    ensureSparkTexture(this);

    this.storyIndex   = data?.storyIndex ?? null;
    this.rewardGold   = data?.rewardGold ?? 0;
    this.rewardCardId = data?.rewardCardId ?? null;
    this.returnScene  = this.storyIndex !== null ? 'StoryScene' : 'MenuScene';
    const enemyDeck   = data?.enemyDeck ?? AI_DECK;
    const playerDeck  = buildDeckCards(getProfile());
    const pools = [
      buildFactionPool(playerDeck[0]?.faction ?? 'humans'),
      buildFactionPool(enemyDeck[0]?.faction ?? 'monsters'),
    ];
    this.match = createMatch(playerDeck, enemyDeck, 10, { rng: Math.random, pools });

    this.selectedIndex  = null;
    this.pendingPlay    = null;  // { handIndex, row, targets } while choosing a Deploy target
    this.pendingOrder   = null;  // { row, cardIdx, targets } while choosing an Order target
    this.busy           = false; // true while the animation queue is playing
    this.busyStartedAt  = 0;
    this.rewardGranted  = false;
    this.reward         = 0;
    this.rewardCardName = null;
    this._lastCurrent   = -1;
    this.viewsByUid     = new Map();

    this.root      = this.add.container(0, 0);
    this.animLayer = this.add.container(0, 0); // above root, cleared after each action
    this.queue     = new AnimationQueue(ANIMATIONS, this);

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer) => {
      if (this.busy) {
        // Ignore the very click that started the action; later clicks speed things up
        if (this.time.now - this.busyStartedAt > 50) this.queue.speedUp();
        return;
      }
      if (pointer.rightButtonDown()) this.cancelTargeting();
    });
    this.input.keyboard?.on('keydown-ESC', () => this.cancelTargeting());

    this.render();
    this.act(() => {}); // runs startTurn for whoever moves first
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  addText(x, y, text, color, size = '16px') {
    const t = this.add.text(x, y, text, { fontSize: size, color });
    this.root.add(t);
    return t;
  }

  canAct() {
    const m = this.match;
    return m.current === 0 && m.winner === null && !this.busy && !this.pendingPlay && !this.pendingOrder;
  }

  activeTargets() {
    return this.pendingPlay?.targets ?? this.pendingOrder?.targets ?? null;
  }

  orderReady(card) {
    return card.def.hasOrder && !card.orderUsed && !card.locked
      && (card.def.chargeMax === 0 || card.chargesLeft > 0);
  }

  // ─── Turn flow ────────────────────────────────────────────────────────────

  /** Run one engine action, animate what it did, then redraw. */
  async act(action) {
    if (this.busy) return;
    this.busy = true;
    this.busyStartedAt = this.time.now;
    try {
      action();
    } catch (e) {
      console.warn('Action failed:', e.message);
    }
    await this.queue.play(drainEvents(this.match));
    await this.beginTurnIfNeeded();
    this.animLayer.removeAll(true);
    this.busy = false;
    this.render();
    this.maybeRunAi();
  }

  /** startTurn exactly once each time the active player changes; animate status ticks. */
  async beginTurnIfNeeded() {
    const m = this.match;
    if (m.winner !== null || this._lastCurrent === m.current) return;
    this._lastCurrent = m.current;
    startTurn(m);
    const events = drainEvents(m);
    if (events.length > 0) {
      this.animLayer.removeAll(true);
      this.render();
      await this.queue.play(events);
    }
  }

  maybeRunAi() {
    if (this.match.winner !== null || this.match.current !== 1) return;
    this.time.delayedCall(400, () => this.act(() => {
      const move = chooseMove(this.match, 1);
      if (move.type === 'pass') {
        pass(this.match);
        sfx.pass();
      } else {
        playCard(this.match, move.cardIndex, move.row, { target: move.target });
      }
    }));
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    const m = this.match;
    this.root.removeAll(true);
    this.viewsByUid = new Map();
    const [player, opp] = m.players;

    this.grantRewardOnce();

    // ── Header
    this.addText(20, 14, `Соперник — карт: ${opp.hand.length}   раунды: ${pips(opp.roundsWon)}`, '#d8c9a8');
    const status = m.winner !== null ? '' : m.current === 0 ? 'Твой ход' : 'Ход ИИ…';
    this.addText(SCREEN.width / 2 - 40, 14, status, '#ffffff');
    onLeftClick(this.addText(SCREEN.width - 110, 14, '‹ Назад', '#9fbfff'),
      () => showInterstitial(() => this.scene.start(this.returnScene)));

    // ── Board rows
    for (const rowName of ROW_NAMES) {
      this.renderRow(opp, 'opponent', rowName);
      this.renderRow(player, 'player', rowName);
    }

    // ── Weather + score
    const wLabel = m.weather.size ? `ПОГОДА: ${[...m.weather].join(', ')}` : 'ПОГОДА: —';
    this.addText(20, BOARD_CENTER_Y - 10, wLabel, '#9fe3d0');

    const totalYou = ROW_NAMES.reduce((s, r) => s + rowPower(player.board, r, m.weather), 0);
    const totalAi  = ROW_NAMES.reduce((s, r) => s + rowPower(opp.board,    r, m.weather), 0);
    const scoreCol = totalYou > totalAi ? '#7fff7f' : totalYou < totalAi ? '#ff9f9f' : '#ffd479';
    this.addText(SCREEN.width - 260, BOARD_CENTER_Y - 10, `ИИ: ${totalAi}    ТЫ: ${totalYou}`, scoreCol);

    // ── Graveyard panels (left column)
    this.renderGraveyardPane(opp.graveyard,    44,  'ИИ');
    this.renderGraveyardPane(player.graveyard, 478, 'Ты');

    // ── Hand
    this.renderHand(player);

    // ── Footer
    this.addText(20, HAND_Y + 52, `Ты — раунды: ${pips(player.roundsWon)}`, '#d8c9a8');
    onLeftClick(this.addText(SCREEN.width - 160, HAND_Y + 48, '[ ПАС ]', '#ffb3b3', '20px'),
      () => this.onPass());

    // ── Target-selection hint
    if (this.pendingPlay || this.pendingOrder) {
      this.addText(SCREEN.width / 2 - 170, BOARD_CENTER_Y + 14, '🎯 Выберите цель   (ПКМ / Esc — отмена)', '#ffd479', '15px');
      onLeftClick(this.addText(SCREEN.width / 2 + 180, BOARD_CENTER_Y + 14, '[отмена]', '#ff9f9f', '15px'),
        () => this.cancelTargeting());
    }

    if (m.winner !== null) this.renderResult();
  }

  grantRewardOnce() {
    const m = this.match;
    if (m.winner === null || this.rewardGranted) return;
    this.rewardGranted = true;
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
      sfx.roundWin();
    } else if (m.winner !== 'draw') {
      sfx.roundLose();
    }
  }

  // ─── Row ──────────────────────────────────────────────────────────────────

  renderRow(side, sideName, rowName) {
    const y = rowY(sideName, rowName);
    const m = this.match;
    const targets = this.activeTargets();

    const bg = this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, ROW_TINT[rowName] ?? 0x1c1a22)
      .setStrokeStyle(1, 0x4a4436);
    this.root.add(bg);

    if (m.weather.has(rowName)) {
      this.root.add(
        this.add.rectangle(SCREEN.width / 2, y, SCREEN.width - 320, 78, WEATHER_OVERLAY[rowName], 0.24),
      );
      this.addText(170, y - 10, WEATHER_LABEL[rowName] ?? '☁', '#aaddff', '18px');
    }

    side.board[rowName].forEach((card, i) => {
      const cv = createCardView(this, card.def, { card });
      cv.setScale(BOARD_CARD_SCALE);
      cv.setPosition(boardCardX(i), y);
      this.viewsByUid.set(card.uid, cv);

      if (targets) {
        if (targets.includes(card)) {
          cv.list[0].setStrokeStyle(3, TARGET_STROKE);
          onLeftClick(cv.list[0], () => this.onTargetClick(card));
        } else {
          cv.setAlpha(0.45);
        }
      }
      this.root.add(cv);

      if (sideName === 'player' && this.canAct() && this.selectedIndex === null && this.orderReady(card)) {
        const obtn = this.add.text(boardCardX(i), y + 50, '⚡', {
          fontSize: '14px', color: '#ffdd44', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
        onLeftClick(obtn, () => this.onOrderButtonClick(rowName, i));
        this.root.add(obtn);
      }
    });

    // Ghost of the unit being placed while its Deploy target is chosen
    if (sideName === 'player' && this.pendingPlay?.row === rowName) {
      const def = m.players[0].hand[this.pendingPlay.handIndex].def;
      if (def.type !== 'special') {
        const ghost = createCardView(this, def);
        ghost.setScale(BOARD_CARD_SCALE).setAlpha(0.5).setPosition(boardCardX(side.board[rowName].length), y);
        this.root.add(ghost);
      }
    }

    this.addText(SCREEN.width - 300, y - 10, `[${rowPower(side.board, rowName, m.weather)}]`, '#ffd479');

    if (targets && sideName === 'opponent' && targets.includes(rowName)) {
      bg.setStrokeStyle(3, TARGET_STROKE);
      onLeftClick(bg, () => this.onTargetClick(rowName));
    } else if (!targets && this.selectedIndex !== null && this.isValidRow(sideName, rowName)) {
      bg.setStrokeStyle(3, 0xffd479);
      onLeftClick(bg, () => this.onRowClick(rowName));
    }
  }

  // ─── Hand ─────────────────────────────────────────────────────────────────

  renderHand(player) {
    player.hand.forEach((card, i) => {
      const selected = this.selectedIndex === i || this.pendingPlay?.handIndex === i;
      const cv = createCardView(this, card.def, { selected });
      cv.setScale(0.9);
      cv.setPosition(handCardX(i, player.hand.length), HAND_Y);
      this.viewsByUid.set(card.uid, cv);
      onLeftClick(cv.list[0], () => this.onHandClick(i));
      this.root.add(cv);
    });
  }

  // ─── Graveyard panel ──────────────────────────────────────────────────────

  renderGraveyardPane(graveyard, yBase, label) {
    this.addText(6, yBase, `${label} ⚰${graveyard.length}`, '#6a5040', '12px');
    graveyard.slice(-4).reverse().forEach((card, i) => {
      this.addText(6, yBase + 16 + i * 13, (card.def.name ?? card.def.id).slice(0, 14), '#4a3828', '10px');
    });
  }

  // ─── Input handlers ───────────────────────────────────────────────────────

  isValidRow(sideName, rowName) {
    const card = this.match.players[0].hand[this.selectedIndex];
    if (!card) return false;
    const { def } = card;
    if (def.type === 'special') {
      if (def.effect === 'horn')        return sideName === 'player';
      if (def.effect === 'sign_damage') return sideName === 'opponent';
      return false;
    }
    return sideName === 'player' && rowName === def.row;
  }

  onHandClick(i) {
    if (!this.canAct()) return;
    const card = this.match.players[0].hand[i];
    const { def } = card;

    if (def.type === 'special' && INSTANT_SPECIALS.has(def.effect)) {
      this.selectedIndex = null;
      if (def.effect.startsWith('weather_')) sfx.weather();
      if (def.effect === 'scorch') sfx.scorch();
      this.act(() => playCard(this.match, i, 'melee'));
      return;
    }
    // Targeted specials (e.g. lightning) skip row selection
    if (def.type === 'special' && targetKind(card, 'deploy') !== 'none') {
      this.beginPlay(i, 'melee');
      return;
    }
    this.selectedIndex = this.selectedIndex === i ? null : i;
    this.render();
  }

  onRowClick(rowName) {
    if (this.selectedIndex === null || this.busy) return;
    this.beginPlay(this.selectedIndex, rowName);
  }

  beginPlay(handIndex, row) {
    const card = this.match.players[0].hand[handIndex];
    this.selectedIndex = null;
    const targets = getValidTargets(this.match, 0, card, 'deploy');
    if (targetKind(card, 'deploy') === 'none' || targets.length === 0) {
      this.act(() => playCard(this.match, handIndex, row)); // no choice needed (or it fizzles)
      return;
    }
    this.pendingPlay = { handIndex, row, targets };
    this.render();
  }

  onOrderButtonClick(row, cardIdx) {
    if (!this.canAct()) return;
    const card = this.match.players[0].board[row]?.[cardIdx];
    if (!card?.def.hasOrder) return;
    if (targetKind(card, 'order') === 'none') {
      this.act(() => {
        useOrder(this.match, 0, row, cardIdx);
        sfx.order();
      });
      return;
    }
    const targets = getValidTargets(this.match, 0, card, 'order');
    if (targets.length === 0) return;
    this.pendingOrder = { row, cardIdx, targets };
    this.render();
  }

  onTargetClick(target) {
    if (this.busy) return;
    if (this.pendingPlay) {
      const { handIndex, row } = this.pendingPlay;
      this.pendingPlay = null;
      this.act(() => playCard(this.match, handIndex, row, { target }));
      return;
    }
    if (this.pendingOrder) {
      const { row, cardIdx } = this.pendingOrder;
      this.pendingOrder = null;
      this.act(() => {
        useOrder(this.match, 0, row, cardIdx, { target });
        sfx.order();
      });
    }
  }

  cancelTargeting() {
    if (this.busy) return;
    if (!this.pendingPlay && !this.pendingOrder && this.selectedIndex === null) return;
    this.pendingPlay = null;
    this.pendingOrder = null;
    this.selectedIndex = null;
    this.render();
  }

  onPass() {
    if (!this.canAct()) return;
    this.selectedIndex = null;
    this.act(() => {
      pass(this.match);
      sfx.pass();
    });
  }

  // ─── Result overlay ───────────────────────────────────────────────────────

  renderResult() {
    const overlay = this.add.rectangle(SCREEN.width / 2, SCREEN.height / 2, SCREEN.width, SCREEN.height, 0x000000, 0.6);
    this.root.add(overlay);

    const w = this.match.winner;
    const label = w === 0 ? 'ПОБЕДА' : w === 1 ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
    const col   = w === 0 ? '#ffd479' : w === 1 ? '#ff9f9f' : '#d8c9a8';

    this.root.add(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2, label, { fontSize: '48px', color: col })
        .setOrigin(0.5),
    );

    this.root.add(onLeftClick(
      this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 60, '‹ В меню', { fontSize: '24px', color: '#9fbfff' })
        .setOrigin(0.5),
      () => showInterstitial(() => this.scene.start(this.returnScene)),
    ));

    if (w === 0) {
      this.root.add(onLeftClick(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 100, '🎁 Сундук', { fontSize: '22px', color: '#ffd479' })
          .setOrigin(0.5),
        () => {
          showChest(() => {
            grantChestReward(getProfile(), SHOP_CARDS);
            persist();
            this.render();
          });
        },
      ));
    }

    if (this.reward > 0) {
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 24, `+${this.reward} золота`, { fontSize: '26px', color: '#ffd479' })
          .setOrigin(0.5),
      );
    }
    if (this.rewardCardName) {
      this.root.add(
        this.add.text(SCREEN.width / 2, SCREEN.height / 2 + 54, `Новая карта: ${this.rewardCardName}`, { fontSize: '22px', color: '#9fe3d0' })
          .setOrigin(0.5),
      );
    }
  }
}

function pips(won) {
  return '●'.repeat(won) + '○'.repeat(Math.max(0, 2 - won));
}
```

- [ ] **Step 3: Проверить сборку и тесты**

Run: `npx vitest run && npx vite build`
Expected: все тесты PASS; `vite build` завершается строкой `✓ built in …` без ошибок импорта.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BattleScene.js src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(battle): event-driven animations, target selection UI, animated AI turns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Ручная проверка в браузере

**Files:** нет изменений кода (только исправления найденных багов, каждое отдельным коммитом).

- [ ] **Step 1: Запустить игру**

Run: `npm run dev` (в фоне), открыть адрес из вывода Vite (обычно `http://localhost:5173`).

- [ ] **Step 2: Пройти чек-лист**

Для каждого пункта убедиться визуально, при необходимости сделать скриншот:

1. Наёмник: после клика по ряду появляется карта-призрак, враги подсвечены оранжевым, свои затемнены; клик по врагу → снаряд летит, враг трясётся, `-1`.
2. Esc и ПКМ во время выбора цели отменяют выбор, карта остаётся в руке.
3. Лучник добивает Упыря с силой ≤ 2: карта краснеет, сжимается, рассыпается частицами и появляется в панели кладбища ИИ.
4. Рыцарь: вокруг него надувается синий пузырь; после отрисовки видна иконка 🛡.
5. Удар по Троллю со щитом: пузырь лопается, «Щит!», сила не меняется.
6. Катапульта: подсвечиваются ряды врага, огненная волна идёт по выбранному ряду.
7. Медик: зелёные искры и `+N` на раненом союзнике.
8. Упырь ИИ: капля 🩸 на твоей карте; в начале твоего хода тик кровотечения отнимает силу без снаряда.
9. Витязь: `+2` золотом на выбранном союзнике.
10. Без целей (например, первый ход Наёмником по пустому полю): серый дымок и «Нет цели».
11. Конец раунда 1: баннер «Раунд 2», 5 рубашек веером летят в руку, в руке не больше 10 карт.
12. Клик во время анимации ускоряет её; после окончания скорость снова обычная.
13. Ход ИИ: его карты прилетают сверху, видно, в кого он бьёт.
14. Матч доигрывается до экрана «ПОБЕДА/ПОРАЖЕНИЕ», золото начисляется.
15. Консоль браузера без ошибок (кроме предупреждений `Action failed`, если они объяснимы).

- [ ] **Step 3: Исправить найденное**

Каждый баг: воспроизвести → при возможности тест в движке → фикс → `npx vitest run` → отдельный коммит `fix(battle): …`.

- [ ] **Step 4: Итоговая проверка**

Run: `npx vitest run && npx vite build`
Expected: все тесты PASS, сборка без ошибок.
