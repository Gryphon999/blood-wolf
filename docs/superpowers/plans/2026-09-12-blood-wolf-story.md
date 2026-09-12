# Blood Wolf — Story (PvE Campaign) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A 5-node PvE campaign (4 battles + boss) with sequential unlocks and rewards, reusing the battle engine.

**Architecture:** Story content (enemy decks + rewards) in data; progress + helpers are pure functions on the profile (unit-tested); a StoryScene lists nodes and launches BattleScene with a specific enemy deck; BattleScene grants node rewards on a win. Engine untouched.

**Tech Stack:** Phaser 3, Vite, Vitest, plain JS ES modules.

## Global Constraints

- Plain JS ES modules, no TypeScript. `src/engine/**` untouched.
- Nodes unlock sequentially; a win only advances the current frontier.
- No full-screen bg rect over a `root` container (use game backgroundColor).
- Existing 76 tests stay green (menuLayout test updated for 5 items).

---

### Task 1: Story content

**Files:** Create `src/data/story.js`, `src/data/story.test.js`.

**Produces:** `STORY_NODES` — 5 objects `{ id, name, enemyDeck: cardDef[], rewardGold: number, rewardCardId?: string }`, escalating; node 5 (boss) has `rewardCardId`.

- [ ] Test (`story.test.js`): `STORY_NODES.length === 5`; every node has non-empty `enemyDeck` and `rewardGold > 0`; the last node has a `rewardCardId`.
- [ ] Implement `story.js` with 5 enemy decks (monsters, ~10 cards each, rising power) and rewards; boss `rewardCardId: 'paladin'`.
- [ ] `npm test` green; commit `feat(data): add story campaign nodes`.

---

### Task 2: Story progress + card grant (pure)

**Files:** Modify `src/economy/profile.js`, append `src/economy/profile.test.js`.

**Produces:**
- `createProfile()` now includes `story: { cleared: 0 }`.
- `isNodeUnlocked(profile, index)` → `index <= (profile.story?.cleared ?? 0)`.
- `isNodeCleared(profile, index)` → `index < (profile.story?.cleared ?? 0)`.
- `clearNode(profile, index)` → ensures `profile.story`; if `index === cleared`, sets `cleared = index + 1`.
- `grantCard(profile, id)` → adds `collection[id] = {count:1, level:1}` if absent.

- [ ] Tests: fresh profile → node 0 unlocked, node 1 locked; `clearNode(0)` → node 1 unlocked, node 0 cleared; `clearNode(2)` on a fresh profile is a no-op (not the frontier); `grantCard` adds a card.
- [ ] Implement (add after `buyCard`):

```js
export function isNodeUnlocked(profile, index) {
  return index <= (profile.story?.cleared ?? 0);
}

export function isNodeCleared(profile, index) {
  return index < (profile.story?.cleared ?? 0);
}

export function clearNode(profile, index) {
  if (!profile.story) profile.story = { cleared: 0 };
  if (index === profile.story.cleared) {
    profile.story.cleared = index + 1;
  }
  return profile;
}

export function grantCard(profile, id) {
  if (!profile.collection[id]) {
    profile.collection[id] = { count: 1, level: 1 };
  }
  return profile;
}
```
And in `createProfile`'s returned object add `story: { cleared: 0 },`.

- [ ] `npm test` green; commit `feat(economy): add story progress and card grant`.

---

### Task 3: Story scene + battle wiring + menu

**Files:** Create `src/scenes/StoryScene.js`; modify `src/scenes/BattleScene.js`, `src/scenes/MenuScene.js`, `src/ui/menuLayout.js`, `src/ui/menuLayout.test.js`, `src/main.js`.

**StoryScene:** lists `STORY_NODES` vertically; each row: name + status (`✓` cleared / `▶ бой` unlocked-not-cleared / `🔒` locked). Clicking an unlocked, not-yet-cleared node calls `this.scene.start('BattleScene', { enemyDeck: node.enemyDeck, storyIndex: index, rewardGold: node.rewardGold, rewardCardId: node.rewardCardId })`. Shows gold; `‹ В меню` → MenuScene. No full-screen bg rect.

**BattleScene changes:**
- `create(data)`: `this.storyIndex = data?.storyIndex ?? null; this.rewardGold = data?.rewardGold ?? 0; this.rewardCardId = data?.rewardCardId ?? null; const enemyDeck = data?.enemyDeck ?? AI_DECK; this.returnScene = this.storyIndex !== null ? 'StoryScene' : 'MenuScene';` then build player deck + `createMatch(playerDeck, enemyDeck, 10)`; reset `rewardGranted=false`, `reward=0`, `rewardCardName=null`.
- Reward block (replace existing win-reward in render): on `winner===0 && !rewardGranted`: if `storyIndex===null` → `addGold(getProfile(),50); this.reward=50;` else → `clearNode(p, storyIndex); addGold(p, this.rewardGold); this.reward=this.rewardGold; if (rewardCardId){ grantCard(p, rewardCardId); this.rewardCardName = getCard(rewardCardId).name; }`; `persist()`. Set `rewardGranted=true` regardless when winner!==null.
- Both `‹ В меню` buttons (corner + result) use `this.returnScene`.
- Result overlay: show `+N золота` and, if `rewardCardName`, `Новая карта: <name>`.
- Imports: add `clearNode, grantCard` from profile; `getCard` from `../data/cardCatalog.js`.

**MenuScene / menuLayout:** `MENU_ITEMS = ['Бой','Сюжет','Колода','Магазин','Рейтинг']`; target map adds `'Сюжет':'StoryScene'`. Update `menuLayout.test.js`: length 5, `MENU_ITEMS[1]==='Сюжет'`, keep on-screen assertion.

**main.js:** import + register `StoryScene` in the scene list.

- [ ] Implement all above; `npm run build` succeeds; `npm test` green (76 + story/profile tests, menuLayout updated).
- [ ] Browser check: Menu → Сюжет shows 5 nodes (only first playable); play node 1, win, see reward, node 2 unlocks.
- [ ] Commit `feat(ui): add story campaign scene and battle wiring`.

---

## Self-Review

- 5 nodes + rewards → Task 1. Progress helpers + grant → Task 2. Scene + battle wiring + menu entry → Task 3. Engine untouched; menuLayout test updated for 5 items. Out of scope: multi-location, branching, dialogue. ✅
