# UI_OVERHAUL_TASK.md — Sharp text and images, one medieval style, random arena

Branch: **`feature/ui-overhaul`** (created from `master`, which already has layer 18 and the relative-path fix). Work ONLY on this branch,
one commit per phase, push after every phase, `npm test` and `npm run build` must pass before each push. Open ONE pull request into `master` at the end.
Do not build on the old `feature/layer-15-depth` branch, it is stale.

Owner feedback after playing the published build (https://gryphon999.github.io/blood-wolf/):
1. Text quality is bad, especially when a card is enlarged on hover. Images also look low quality.
2. Backgrounds of the main menu, deck, shop and other menus are in different styles: make ONE consistent style.
3. The card rows in battle should look like a battlefield, not flat boxes.
4. "Бой (арена)" must pick a RANDOM opponent each time, not the story opponent.
5. Buttons on the main screen must look medieval.

Constraints: Phaser 3 + Vite, no backend, must keep working inside the Yandex Games iframe and from a sub-folder (keep asset paths relative: `./assets/...`, never `/assets/...`),
RU/EN i18n stays complete, all 312+ tests stay green, keep the total build reasonable (currently ~51 MB, mostly card art; do not grow it by more than ~10 MB, prefer shrinking).
Works on phones (landscape) and desktops. No regressions in game rules.

## Phase U1 — Crisp text and images (root causes first)
Findings from the code (verify them, do not just trust them):
- `src/main.js` creates the game at a fixed `SCREEN.width x SCREEN.height` with `Scale.FIT`, so the canvas is a fixed-size bitmap stretched by CSS. On 1080p, 4K and phone screens everything is upscaled and blurry, including text. There is no `devicePixelRatio` handling.
- Text uses a monospace font (looks like Courier). It has no medieval character and renders poorly.
- Hover zoom (see `CardView.js`, `tooltip.js`) seems to scale an existing card object x2.5, so text and art become blurry instead of being re-rendered.
- Many older card images (starter deck, e.g. `frost.jpg`, `knight.jpg`, `merc.jpg`...) are full card renders with the FRAME AND TEXT BAKED INTO THE PICTURE (848x1264). Their baked text is small and unreadable when enlarged. Newer cards (e.g. `blessing.jpg`, `clear_sky.jpg`) are plain paintings (832x1248) and the game draws frame and text over them.
Do:
1. Render sharply at any screen: keep the logical 16:9 layout but render the canvas at a higher internal resolution (for example scale the internal size by `min(devicePixelRatio, 2)` or a fixed 1920x1080/2560x1440 internal size with a single global layout scale factor), and set `resolution`/`setResolution()` on every Phaser Text so glyphs are drawn at the real pixel density. Provide one helper (e.g. `src/ui/textStyle.js`) so no scene creates raw text with default settings. Make sure it also works when the browser window is resized and on high-DPI phones. Watch performance (target 60 FPS on a mid phone; provide a "graphics quality" setting if needed).
2. Fonts: replace the monospace look with a medieval/serif face family that has good CYRILLIC support and an open licence (OFL), self-hosted through an npm package such as `@fontsource/*` or files under `public/fonts/` (no CDN calls; the game must work offline and inside the Yandex iframe). Suggestions to evaluate: a display face for titles/buttons and a very readable serif for card text (check that Cyrillic really renders). Preload fonts with `document.fonts.load()` before creating scenes so the first frame never uses a fallback.
3. Card hover zoom and the long-press zoom on phones: draw the enlarged card from scratch at the target size (vector text, high-resolution art), do not scale a small texture. Rules text must be crisp and fully readable (proper wrapping, line height, no clipping) at zoom, on desktop and on a phone.
4. Card art quality: for the older cards with baked-in frame and text, produce clean art-only images by cropping the illustration window out of each baked card (the layout is the same template, so a script `scripts/extract-card-art.mjs` with fixed crop coordinates should work; verify visually on all of them and write the crops as high-quality JPEG/WebP), then draw frame, name, cost and rules text in code so they are crisp and translated. Keep file sizes down (WebP or good JPEG, ~150-300 KB each) and never upscale. List any card whose art cannot be extracted cleanly in the PR description.
5. Add screenshot proof: `scripts/screenshots.mjs` (Playwright, already used elsewhere in the owner's projects) capturing menu, deck, shop, battle, hover zoom, at 1280x720, 1920x1080 and a phone-landscape viewport (844x390 at DPR 3). Commit a few compressed screenshots to `docs/screens/ui/` before/after.

## Phase U2 — One medieval visual style for every menu
Scenes: MenuScene, DeckScene, ShopScene, PackScene, StoryScene, ProgressScene, RankScene, SettingsScene (and battle, see U3). Today each has a different background.
- Create one shared theme module (`src/ui/theme.js`) with palette, fonts, frame/plate styles, button styles, and one background builder (`src/ui/background.js` already exists, extend it) used by ALL scenes.
- Backgrounds: use painted images from `public/assets/bg/` which the owner's assistant is generating and will push to this same branch (run `git pull` regularly): `bg_menu.jpg` (castle under a blood moon), `bg_hall.jpg` (dim stone armoury/hall interior used behind deck, shop, packs, progress, rank, settings, story), `bg_field.jpg` (battlefield ground, see U3). Until they arrive use a placeholder dark stone-texture generated in code, but wire everything through the theme so swapping is one line. Add a subtle vignette, floating embers/dust, and a gentle torch flicker light; keep it cheap.
- Consistent headers, panels and frames: dark wood + iron bands + parchment plates, same font, same spacing, same back button everywhere. Nothing should look like a different game from screen to screen.
- Transitions between scenes keep working (see `transitions.js`).

## Phase U3 — Battlefield look for the battle board
- The card rows/lanes must look like a battlefield: a painted field ground behind each side (mud, trampled grass, trenches, scattered weapons), each row as a lane with a banner/emblem plate for its type (siege / ranged / melee — check the real names in `layout.js`), player side and enemy side visually distinct, a central no-man's-land divider, weather effects (frost, fog, blight, clear) visibly overlay the affected rows, score plates as carved shields, pass button and hand tray in the same style.
- Keep hit areas, drag/drop and card placement unchanged; keep it readable on phones. Use `bg_field.jpg` (+ optional overlays drawn in code). Do not lower FPS.

## Phase U4 — "Бой (арена)" = random opponent
- Find how arena currently picks its opponent (it appears to reuse a story/tutorial opponent — verify in `MenuScene`, `BattleScene`, `src/data/story.js`, `src/engine/*`, `src/economy/*`).
- Arena must start a fresh random opponent each time: random faction (humans / monsters / other factions that exist), random leader, and a deck generated from the shared card pools (`starterDecks.js`, `shopCards.js`, layer-15 cards) with a sensible curve, scaled by the chosen difficulty (Лёгкий / Норма / Сложный) and the player's rank. Show the opponent's name, leader and faction on a short pre-battle screen. Avoid repeating the same opponent twice in a row. Keep story battles unchanged. The tutorial must not trigger from arena unless the player is new (check how it triggers today).
- Add unit tests for the opponent generator (deterministic with a seed): legal decks, size limits, faction consistency, difficulty scaling, no immediate repeats.

## Phase U5 — Medieval main-menu buttons
- Restyle the main-menu buttons (currently wooden plaques with rivets and a monospace font) into a convincing medieval look: iron-bound oak or stone plaques, engraved gothic/serif lettering, heraldic icons per button (crossed swords, deck of cards, coin purse/market, shield with laurel, chest, scroll, gear), torch-glow on hover, pressed state, small sound feedback (existing SoundEngine), and a proper focus state for keyboard/gamepad. Same component reused for all scenes (`Button.js`).
- Make sure labels fit in Russian and English, and remain tappable on phones.

## Phase U6 — Final checks and delivery
- Run the game in Chromium via Playwright at 1280x720, 1920x1080 and phone landscape: zero console errors (Yandex SDK errors outside Yandex are expected and ignored), no missing assets (`Failed to load`), all scenes reachable, hover zoom crisp.
- `npm test`, `npm run build`, size report of `dist`.
- Update README (fonts, scale/quality settings, how to regenerate card art, how to run screenshots).
- One PR into `master` with per-phase summary, before/after screenshots, list of art crops that need manual review, known limitations. Do not merge yourself.
- Deployment note: the owner publishes with GitHub Pages from a `gh-pages` branch built from `master` (relative asset paths are mandatory). Do not touch `gh-pages`.

## Definition of done
Text and art look sharp on a 1080p monitor and on a phone; the hover zoom is crisp; every scene shares one medieval look; battle lanes look like a battlefield; the arena gives a different random opponent each time; the main-menu buttons look medieval and work in RU and EN; tests and build are green.
