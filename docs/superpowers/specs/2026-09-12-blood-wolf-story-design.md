# Blood Wolf — Сюжет (кампания PvE): дизайн-документ

**Дата:** 2026-09-12
**Слой:** седьмой.

## Цель

Кампания PvE: одна локация из 5 узлов (4 боя + босс), открываются последовательно; победа даёт золото (+ карту за босса) и открывает следующий узел. Прогресс сохраняется в профиль. Движок и экран боя переиспользуются.

## Что делаем

- `src/data/story.js` — `STORY_NODES`: 5 узлов `{ id, name, enemyDeck, rewardGold, rewardCardId? }`, колоды по нарастанию силы; узел 5 — босс (сильная колода + `rewardCardId`).
- `src/economy/profile.js` — прогресс `story: { cleared: number }` (число пройденных). Функции: `isNodeUnlocked(profile, index)` (index ≤ cleared), `isNodeCleared(profile, index)` (index < cleared), `clearNode(profile, index)` (если index — текущий рубеж, cleared = index+1), `grantCard(profile, id)` (добавить карту в коллекцию бесплатно). `createProfile` добавляет `story: { cleared: 0 }`; функции устойчивы к старым профилям без поля story.
- `src/scenes/StoryScene.js` — карта кампании: список узлов (✓ пройден / доступен / 🔒 закрыт), золото, «В меню»; клик по доступному → `scene.start('BattleScene', { enemyDeck, storyIndex, rewardGold, rewardCardId })`.
- `src/scenes/BattleScene.js` — `create(data)`: если есть `data.enemyDeck` — играем против неё (сюжет), иначе против `AI_DECK` (свободный бой). По победе: свободный бой → +50 золота (как сейчас); сюжет → `clearNode` + `addGold(rewardGold)` + (если есть) `grantCard(rewardCardId)`, показать награду. Кнопки «В меню» ведут в сцену возврата (`StoryScene` для сюжета, иначе `MenuScene`).
- Меню — новый пункт «Сюжет» (`MENU_ITEMS` = `['Бой','Сюжет','Колода','Магазин','Рейтинг']`), «Сюжет» → `StoryScene`.
- `src/main.js` — зарегистрировать `StoryScene`.

## Тестирование

- Юнит-тесты: `story.js` (5 узлов; у каждого непустая enemyDeck и rewardGold>0; у босса rewardCardId); `profile.js` (isNodeUnlocked/isNodeCleared/clearNode последовательность и no-op для не-рубежа; grantCard добавляет; createProfile.story.cleared===0).
- Браузер: меню→Сюжет (список узлов, только первый доступен), бой из узла, победа даёт награду и открывает следующий, возврат в карту кампании.
- Существующие 76 тестов зелёные (плюс правка теста menuLayout под 5 пунктов).

## Вне рамок

Несколько локаций, ветвления/выборы сюжета, диалоги, поражение-штрафы, онлайн.
