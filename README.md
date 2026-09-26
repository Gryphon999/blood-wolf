# Blood Wolf

Мрачная карточная дуэль в духе Гвинта для Яндекс.Игр. Phaser 3 + plain JS (ESM) + Vite + Vitest.

```bash
npm install
npm run dev                      # локальный запуск
npm test                         # тесты движка, экономики и данных (Vitest)
npm run build                    # сборка в dist/
node scripts/simulate.js 400     # баланс: ИИ против ИИ, винрейт фракций (+ «easy|normal|hard»)
```

## Механики

- **Бой:** 3 ряда (ближний, дальний, осадный), 3 раунда до 2 побед; рука 10 карт, перед раундами 2 и 3
  добор до 5 карт из пула фракции (потолок руки 10). Мулиган: до 2 карт один раз перед боем.
- **Действия карт:** Deploy при розыгрыше, Приказы (Order / Charge / Рвение), статусы Яд и Кровотечение,
  Щит, Броня, Стойкость, Проклятие, погода, Рог, Скорч.
- **Особые свойства:** Шпион (на ряд врага, +2 карты), Призыв (вся семья из руки и колоды),
  Узы (сила × число одноимённых карт в ряду), Берсерк (+1 за каждую смерть), Засада (сама выходит при пасе),
  Вампиризм (сила за нанесённый урон).
- **Лидеры:** по 3 на фракцию, одна способность за матч (выбор в «Колоде»).
- **Пассивки фракций:** люди — «Дисциплина» (в раунде 2 первая карта не завершает ход),
  монстры — «Кровь сильнее» (ничья в раунде за монстрами).
- **ИИ:** симулирует ходы; три стратегии — Лёгкий / Нормальный / Сложный (золото ×0.75 / ×1 / ×1.5).
- **Прогрессия:** магазин, паки (5 карт за 200 золота), золотые карты (3 копии → +2 силы),
  3 ежедневных задания, 15 достижений, ранговая арена с таблицей лидеров Яндекса,
  сюжет из 10 узлов в двух главах с боссами (вечная погода, босс на поле, лидер врага) и диалогами.
- **Интерфейс:** обучение в первом бою, настройки (звук, музыка, ускорение анимаций, меньше движения,
  язык RU/EN — по умолчанию из Yandex SDK), долгое нажатие вместо наведения на тач-экранах,
  процедурная музыка (меню и бой), автопауза при потере фокуса.

## Где что лежит

- `src/engine/` — правила без Phaser: матч, эффекты, действия, лидеры, пассивки, ИИ (`ai/`).
- `src/data/` — карты, стартовые колоды, пулы фракций, лидеры, сюжет.
- `src/economy/` — профиль, паки, задания, достижения, ранг, настройки, сохранение.
- `src/i18n/` — все строки интерфейса (ru, en).
- `src/ui/`, `src/scenes/` — отрисовка, анимации, звук и сцены Phaser.
- `docs/superpowers/` — спеки, планы и заметки по слоям (`notes/layer-15.md` — допущения слоя 15).

## Graphics and UI (ui-overhaul)

- **Crisp rendering.** The layout stays 1280x720 but the canvas is `R` times bigger (`src/ui/render.js`: `R` from `devicePixelRatio` and the window size, between 1 and 2), the camera zoom maps the world onto it and every Phaser `Text` is rasterised at `R`. Nothing is stretched by CSS any more.
- **Fonts.** Cormorant SC (titles, buttons, card names) and Alegreya (body text), both OFL with Cyrillic, bundled via `@fontsource` (`src/ui/fonts.js`). No CDN calls.
- **Cards.** `src/ui/CardView.js` draws every card face in code (name plate, cover-fit art window, row/cost plate, power badge). `zoom` draws a card larger and sharp instead of scaling a bitmap. `src/ui/cardLayout.js` holds the pure layout maths (tested).
- **Card art.** `node scripts/prepare-card-art.mjs` cuts illustrations out of the 12 starter cards that had frame and text baked into the picture (originals in `assets-src/cards-original/`) and shrinks the square PNG portraits. New paintings live in `assets-src/cards-new/`.
- **Backgrounds.** Painted 3:2 sources in `assets-src/backgrounds/`; `node scripts/prepare-backgrounds.mjs` writes the 16:9 files in `public/assets/bg/` (`bg_menu`, `bg_hall` for every menu scene, `bg_field` for battle). Vignette, torch flicker and embers are drawn in code (`src/ui/background.js`).
- **Battle board.** `src/ui/battleBoard.js`: lanes as strips of ground with emblems, score shields and a palisade across no-man's-land.
- **Buttons.** `src/ui/Button.js`: oak plaque in iron bands with heraldic icons.
- **Arena.** `src/data/opponents.js` builds a random faction, leader and 12-card deck per fight (difficulty and rank scale rarity, no immediate repeat).
- **Screenshots and tests.** Open the game with `?debug` to reach the Phaser instance as `window.__game` (used by screenshot scripts). All asset paths are relative so the build works from a sub-folder (GitHub Pages).
