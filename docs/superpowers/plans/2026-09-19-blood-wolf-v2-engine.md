# Blood Wolf v2 — Engine + Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the game engine with Deploy/Order/status-effect mechanics and replace the 5-card shop with a complete 52-card catalog spanning two factions.

**Architecture:** New fields are added to the card definition schema additively — existing code keeps working. Engine effects are extracted to `src/engine/effects.js`. `GwentMatch.js` gains `startTurn`, `useOrder`, and wires `applyDeploy` into `playCard`. Graveyard tracking is added to player state for resurrect effects.

**Tech Stack:** Phaser 3, plain JS (ESM), Vite, Vitest

## Global Constraints

- All files target ESM (`import`/`export`), no CommonJS
- `npm test` must stay green after every task (94+ tests)
- No new npm packages
- Card IDs must be globally unique across PLAYER_DECK + AI_DECK + SHOP_CARDS
- The existing `effect: 'heal'` on `medic` stays unchanged — BattleScene wires it via `awaitingHeal`
- Special cards keep their `row` field (used by `sign_damage` to pick opponent row)
- Deploy runs AFTER the card is on the board (so neighbors and row-count checks are accurate)
- Non-Zeal Order cards start with `orderUsed: true` so they can't act the turn they're played
- `chargeMax > 0` = Charge card (permanent uses, never resets); `chargeMax === 0` = regular Order (resets each turn)

---

### Task 1: New card schema + complete 52-card data files

**Files:**
- Modify: `src/data/starterDecks.js`
- Modify: `src/data/shopCards.js`
- Modify: `src/data/shopCards.test.js`

**Interfaces:**
- Produces: Every card definition has fields: `id`, `name`, `faction`, `type`, `row`, `power`, `rarity`, `prov`, `cost`, `effect`, `art`, `tags`, `deployEffect`, `deployParam`, `hasOrder`, `orderEffect`, `orderParam`, `chargeMax`, `zeal`, `armor`, `resilience`, `doomed`, `immune`
- `PLAYER_DECK` and `AI_DECK` exported from `starterDecks.js` (unchanged export names)
- `SHOP_CARDS` exported from `shopCards.js` (unchanged export name)

- [ ] **Step 1: Rewrite `src/data/starterDecks.js`**

Replace the entire file:

```js
const card = (id, name, faction, type, row, power, rarity, prov, opts = {}) => ({
  id, name, faction, type, row, power, rarity, prov,
  cost: opts.cost ?? prov * 50,
  effect: opts.effect ?? null,
  art: opts.art ?? null,
  tags: opts.tags ?? [],
  deployEffect: opts.deployEffect ?? null,
  deployParam: opts.deployParam ?? 1,
  hasOrder: opts.hasOrder ?? false,
  orderEffect: opts.orderEffect ?? null,
  orderParam: opts.orderParam ?? 1,
  chargeMax: opts.chargeMax ?? (opts.hasOrder ? 1 : 0),
  zeal: opts.zeal ?? false,
  armor: opts.armor ?? 0,
  resilience: opts.resilience ?? false,
  doomed: opts.doomed ?? false,
  immune: opts.immune ?? false,
});

export const PLAYER_DECK = [
  card('merc_a',    'Наёмник',     'humans',   'unit',    'melee',  4, 'common',    3, { art: 'merc',     tags: ['merc'] }),
  card('merc_b',    'Наёмник',     'humans',   'unit',    'melee',  4, 'common',    3, { art: 'merc',     tags: ['merc'] }),
  card('merc_c',    'Наёмник',     'humans',   'unit',    'melee',  4, 'common',    3, { art: 'merc',     tags: ['merc'] }),
  card('knight',    'Рыцарь',      'humans',   'unit',    'melee',  6, 'common',    5, { art: 'knight',   tags: ['knight'] }),
  card('archer_a',  'Лучник',      'humans',   'unit',    'ranged', 3, 'common',    3, { art: 'archer',   tags: ['archer'] }),
  card('archer_b',  'Лучник',      'humans',   'unit',    'ranged', 3, 'common',    3, { art: 'archer',   tags: ['archer'] }),
  card('catapult',  'Катапульта',  'humans',   'unit',    'siege',  5, 'rare',      5, { art: 'catapult', tags: ['siege', 'machine'] }),
  card('champion',  'Витязь',      'humans',   'hero',    'melee',  7, 'legendary', 11,{ art: 'champion', tags: ['knight'], resilience: true }),
  card('warhorn',   'Рог войны',   'humans',   'special', 'melee',  0, 'common',    4, { art: 'warhorn',  effect: 'horn' }),
  card('frost',     'Мороз',       'humans',   'special', 'melee',  0, 'rare',      3, { art: 'frost',    effect: 'weather_frost' }),
  card('clear_sky', 'Ясное небо',  'humans',   'special', 'melee',  0, 'common',    2, { effect: 'clear' }),
  card('medic',     'Медик',       'humans',   'unit',    'melee',  4, 'rare',      5, { art: 'medic',    tags: ['medic'], effect: 'heal' }),
];

export const AI_DECK = [
  card('ghoul_a',  'Упырь',   'monsters', 'unit',    'melee',  3, 'common',    3, { art: 'ghoul', tags: ['undead'] }),
  card('ghoul_b',  'Упырь',   'monsters', 'unit',    'melee',  3, 'common',    3, { art: 'ghoul', tags: ['undead'] }),
  card('ghoul_c',  'Упырь',   'monsters', 'unit',    'melee',  3, 'common',    3, { art: 'ghoul', tags: ['undead'] }),
  card('harpy_a',  'Гарпия',  'monsters', 'unit',    'ranged', 4, 'common',    3, { art: 'harpy', tags: ['beast'] }),
  card('harpy_b',  'Гарпия',  'monsters', 'unit',    'ranged', 4, 'common',    3, { art: 'harpy', tags: ['beast'] }),
  card('troll_a',  'Тролль',  'monsters', 'unit',    'siege',  6, 'rare',      5, { art: 'troll', tags: ['giant'] }),
  card('troll_b',  'Тролль',  'monsters', 'unit',    'siege',  6, 'rare',      5, { art: 'troll', tags: ['giant'] }),
  card('beast',    'Зверь',   'monsters', 'hero',    'melee',  8, 'legendary', 11,{ art: 'beast', tags: ['beast'], immune: true }),
  card('blight',   'Порча',   'monsters', 'special', 'melee',  0, 'rare',      4, { effect: 'sign_damage' }),
  card('fog',      'Туман',   'monsters', 'special', 'ranged', 0, 'common',    3, { effect: 'weather_fog' }),
];
```

- [ ] **Step 2: Rewrite `src/data/shopCards.js`**

Replace the entire file:

```js
const card = (id, name, faction, type, row, power, rarity, prov, opts = {}) => ({
  id, name, faction, type, row, power, rarity, prov,
  cost: opts.cost ?? prov * 50,
  effect: opts.effect ?? null,
  art: opts.art ?? null,
  tags: opts.tags ?? [],
  deployEffect: opts.deployEffect ?? null,
  deployParam: opts.deployParam ?? 1,
  hasOrder: opts.hasOrder ?? false,
  orderEffect: opts.orderEffect ?? null,
  orderParam: opts.orderParam ?? 1,
  chargeMax: opts.chargeMax ?? (opts.hasOrder ? 1 : 0),
  zeal: opts.zeal ?? false,
  armor: opts.armor ?? 0,
  resilience: opts.resilience ?? false,
  doomed: opts.doomed ?? false,
  immune: opts.immune ?? false,
});

// ── Humans ───────────────────────────────────────────────────────────────────

const HUMAN_CARDS = [
  // Knights
  card('shield_knight',  'Рыцарь Щита',      'humans', 'unit',    'melee',  5, 'rare',      7,  { tags: ['knight'], deployEffect: 'knight_bonus', armor: 2 }),
  card('squire',         'Оруженосец',        'humans', 'unit',    'melee',  3, 'common',    5,  { tags: ['knight'], deployEffect: 'boost_neighbor', deployParam: 2 }),
  card('banner',         'Знаменосец',        'humans', 'unit',    'melee',  2, 'rare',      6,  { tags: ['knight'], hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1 }),
  card('paladin',        'Паладин',           'humans', 'hero',    'melee',  5, 'epic',      10, { tags: ['knight'], resilience: true, hasOrder: true, orderEffect: 'boost_knights', orderParam: 2 }),
  // Archers
  card('poison_arrow',   'Отравл. стрела',    'humans', 'unit',    'ranged', 3, 'rare',      5,  { tags: ['archer'], deployEffect: 'poison_one' }),
  card('crossbow',       'Арбалетчик',        'humans', 'unit',    'ranged', 4, 'rare',      6,  { tags: ['archer'], deployEffect: 'damage_one', deployParam: 3 }),
  card('sniper',         'Снайпер',           'humans', 'unit',    'ranged', 4, 'rare',      7,  { tags: ['archer'], hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 }),
  card('eagle_eye',      'Орлиный Глаз',      'humans', 'hero',    'ranged', 5, 'epic',      10, { tags: ['archer'], zeal: true, hasOrder: true, orderEffect: 'poison_two' }),
  // Medics
  card('field_medic',    'Боевой Медик',      'humans', 'unit',    'melee',  4, 'rare',      6,  { tags: ['medic'], zeal: true, hasOrder: true, orderEffect: 'heal_ally', orderParam: 2 }),
  card('priest',         'Священник',         'humans', 'unit',    'melee',  3, 'common',    5,  { tags: ['medic'], deployEffect: 'cleanse_ally' }),
  card('alchemist',      'Алхимик',           'humans', 'unit',    'ranged', 3, 'rare',      6,  { tags: ['medic'], hasOrder: true, orderEffect: 'shield_ally' }),
  card('order_healer',   'Лекарь Ордена',     'humans', 'hero',    'melee',  4, 'legendary', 11, { tags: ['medic'], resilience: true, deployEffect: 'boost_all_faction', deployParam: 1 }),
  // Siege
  card('ballista',       'Огненная Баллиста', 'humans', 'unit',    'siege',  5, 'rare',      7,  { tags: ['siege', 'machine'], hasOrder: true, orderEffect: 'damage_lock', orderParam: 3 }),
  card('engineer',       'Инженер',           'humans', 'unit',    'siege',  4, 'rare',      8,  { tags: ['siege'], deployEffect: 'boost_machine', deployParam: 3 }),
  // Specials
  card('lightning',      'Небесный Огонь',    'humans', 'special', 'ranged', 0, 'rare',      5,  { effect: 'lightning_ranged' }),
  card('blessing',       'Благословение',     'humans', 'special', 'melee',  0, 'rare',      5,  { effect: 'blessing_humans' }),
  card('battle_order',   'Боевой Приказ',     'humans', 'special', 'melee',  0, 'common',    4,  { effect: 'order_ready' }),
  // Leader
  card('king_raven',     'Король Рэйвен',     'humans', 'hero',    'melee',  5, 'legendary', 0,  { tags: ['leader', 'knight'], cost: 0, deployEffect: 'shield_self', hasOrder: true, orderEffect: 'boost_knights', orderParam: 1, chargeMax: 2 }),
];

// ── Monsters ─────────────────────────────────────────────────────────────────

const MONSTER_CARDS = [
  // Undead
  card('vampire',        'Вампир',            'monsters', 'unit',    'melee',  4, 'rare',      6,  { tags: ['undead'], deployEffect: 'bleed_two' }),
  card('bloodsucker',    'Кровопийца',        'monsters', 'unit',    'melee',  3, 'common',    5,  { tags: ['undead'], deployEffect: 'bleed_check_self' }),
  card('necromancer',    'Некромант',         'monsters', 'unit',    'melee',  3, 'rare',      7,  { tags: ['undead'], deployEffect: 'copy_enemy_graveyard' }),
  card('lich',           'Лич',               'monsters', 'hero',    'melee',  6, 'legendary', 10, { tags: ['undead'], resilience: true, hasOrder: true, orderEffect: 'debuff_living', orderParam: 2 }),
  // Beasts
  card('wolf',           'Волк',              'monsters', 'unit',    'melee',  2, 'common',    3,  { tags: ['beast', 'wolf'], deployEffect: 'wolf_pack' }),
  card('serpent',        'Серпент',           'monsters', 'unit',    'ranged', 3, 'common',    5,  { tags: ['beast'], deployEffect: 'poison_one' }),
  card('werewolf',       'Оборотень',         'monsters', 'unit',    'melee',  5, 'rare',      7,  { tags: ['beast'], deployEffect: 'werewolf_register' }),
  card('harpy_hunter',   'Гарпия-охотница',  'monsters', 'unit',    'ranged', 4, 'rare',      5,  { tags: ['beast'], deployEffect: 'boost_self', deployParam: 2 }),
  // Demons
  card('fire_demon',     'Демон Огня',        'monsters', 'unit',    'siege',  5, 'rare',      7,  { tags: ['demon'], deployEffect: 'damage_row', deployParam: 2 }),
  card('seducer',        'Соблазнитель',      'monsters', 'unit',    'ranged', 3, 'rare',      6,  { tags: ['demon'], deployEffect: 'control_weakest' }),
  card('archdemon',      'Архидемон',         'monsters', 'unit',    'siege',  6, 'epic',      8,  { tags: ['demon'], hasOrder: true, orderEffect: 'damage_row_choice', orderParam: 3 }),
  card('chaos_demon',    'Демон Хаоса',       'monsters', 'hero',    'siege',  9, 'legendary', 12, { tags: ['demon'], doomed: true, deployEffect: 'damage_all_rows', deployParam: 5 }),
  // Giants
  card('ice_giant',      'Ледяной Гигант',    'monsters', 'unit',    'siege',  6, 'rare',      8,  { tags: ['giant'], deployEffect: 'frost_weather_bonus', deployParam: 3 }),
  card('regen_troll',    'Регенер. Тролль',   'monsters', 'hero',    'siege',  7, 'legendary', 9,  { tags: ['giant'], doomed: true, deployEffect: 'resurrect_four_weak' }),
  // Specials
  card('darkness',       'Тьма',             'monsters', 'special', 'melee',  0, 'rare',      5,  { effect: 'fog_frost_combo' }),
  card('blood_ritual',   'Кровавый Ритуал',  'monsters', 'special', 'melee',  0, 'rare',      5,  { effect: 'bleed_all_enemies' }),
  // Leader
  card('fang_darkness',  'Тьма Клыков',      'monsters', 'hero',    'melee',  6, 'legendary', 0,  { tags: ['leader'], cost: 0, deployEffect: 'shield_self', hasOrder: true, orderEffect: 'boost_all_faction', orderParam: 1, chargeMax: 2 }),
];

export const SHOP_CARDS = [...HUMAN_CARDS, ...MONSTER_CARDS];
```

- [ ] **Step 3: Update `src/data/shopCards.test.js`**

Replace the entire file:

```js
import { describe, it, expect } from 'vitest';
import { SHOP_CARDS } from './shopCards.js';

const ROWS = ['melee', 'ranged', 'siege'];
const REQUIRED_FIELDS = ['id', 'name', 'faction', 'type', 'row', 'power', 'rarity', 'prov', 'cost',
  'tags', 'deployEffect', 'hasOrder', 'orderEffect', 'chargeMax', 'zeal', 'armor', 'resilience', 'doomed', 'immune'];

describe('shopCards', () => {
  it('has 35 buyable cards', () => {
    expect(SHOP_CARDS.length).toBe(35);
  });

  it('every card has all required fields', () => {
    for (const card of SHOP_CARDS) {
      for (const field of REQUIRED_FIELDS) {
        expect(card, `${card.id} missing ${field}`).toHaveProperty(field);
      }
      expect(ROWS).toContain(card.row);
      expect(['unit', 'hero', 'special']).toContain(card.type);
      expect(['humans', 'monsters']).toContain(card.faction);
    }
  });

  it('all card IDs are unique', () => {
    const ids = SHOP_CARDS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every special card has a non-null effect', () => {
    for (const card of SHOP_CARDS.filter(c => c.type === 'special')) {
      expect(typeof card.effect).toBe('string');
    }
  });

  it('Order cards have a non-null orderEffect', () => {
    for (const card of SHOP_CARDS.filter(c => c.hasOrder)) {
      expect(typeof card.orderEffect).toBe('string');
    }
  });

  it('Charge cards have chargeMax > 1', () => {
    const sniper = SHOP_CARDS.find(c => c.id === 'sniper');
    expect(sniper.chargeMax).toBe(2);
    const kingRaven = SHOP_CARDS.find(c => c.id === 'king_raven');
    expect(kingRaven.chargeMax).toBe(2);
  });

  it('resilience and doomed cards are correctly flagged', () => {
    expect(SHOP_CARDS.find(c => c.id === 'paladin').resilience).toBe(true);
    expect(SHOP_CARDS.find(c => c.id === 'chaos_demon').doomed).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests**

```
cd C:/Users/user/source/repos/blood-wolf && npm test
```

Expected: existing tests still pass (≥94). New shopCards tests: 7 pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/starterDecks.js src/data/shopCards.js src/data/shopCards.test.js
git commit -m "feat(data): new card schema with Deploy/Order/status fields + 52-card catalog"
```

---

### Task 2: Extended `createCard` runtime state + graveyard

**Files:**
- Modify: `src/engine/Card.js`
- Modify: `src/engine/Card.test.js`
- Modify: `src/engine/GwentMatch.js`
- Modify: `src/engine/GwentMatch.test.js`

**Interfaces:**
- Consumes: card def fields from Task 1 (`armor`, `chargeMax`, `resilience`, `doomed`, `immune`)
- Produces: `createCard(def)` returns `{ def, power, armorLeft, orderUsed, chargesLeft, bleedStacks, poisoned, locked, shielded, controlled }`
- Produces: `match.players[n].graveyard: Card[]` — populated by `startNextRound`
- Produces: Resilience cards stay on board after round; Doomed cards skip graveyard

- [ ] **Step 1: Write failing tests in `src/engine/Card.test.js`**

Append to the existing file:

```js
describe('createCard — runtime state fields', () => {
  it('initializes armorLeft from def.armor', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5, armor: 3 });
    expect(card.armorLeft).toBe(3);
  });

  it('initializes armorLeft to 0 when def.armor is absent', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5 });
    expect(card.armorLeft).toBe(0);
  });

  it('initializes chargesLeft from def.chargeMax', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5, hasOrder: true, chargeMax: 2 });
    expect(card.chargesLeft).toBe(2);
  });

  it('initializes orderUsed to false', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5 });
    expect(card.orderUsed).toBe(false);
  });

  it('initializes bleedStacks, poisoned, locked, shielded, controlled all falsy', () => {
    const card = createCard({ id: 'a', row: 'melee', power: 5 });
    expect(card.bleedStacks).toBe(0);
    expect(card.poisoned).toBe(false);
    expect(card.locked).toBe(false);
    expect(card.shielded).toBe(false);
    expect(card.controlled).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm test -- --reporter=verbose src/engine/Card.test.js
```

Expected: 5 new tests FAIL with `card.armorLeft is undefined` etc.

- [ ] **Step 3: Update `src/engine/Card.js`**

Replace entire file:

```js
export function createCard(def) {
  return {
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
  };
}
```

- [ ] **Step 4: Add graveyard tests to `src/engine/GwentMatch.test.js`**

Append to the existing file:

```js
describe('graveyard', () => {
  it('player starts with an empty graveyard', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 3)], 1);
    expect(match.players[0].graveyard).toEqual([]);
  });

  it('non-resilience cards go to graveyard at round end', () => {
    const match = createMatch([unit('a', 5), unit('a2', 5)], [unit('b', 3), unit('b2', 3)], 2);
    playCard(match, 0, 'melee'); // p0 plays, turn→p1
    playCard(match, 0, 'melee'); // p1 plays, turn→p0
    pass(match);                 // p0 passes, turn→p1
    pass(match);                 // p1 passes, round resolves → round 2 begins
    expect(match.players[0].graveyard.length).toBe(1); // 'a' cleared
    expect(match.players[1].graveyard.length).toBe(1); // 'b' cleared
  });

  it('resilience card stays on board and does not enter graveyard', () => {
    const resilDef = { id: 'r', row: 'melee', power: 5, resilience: true };
    const match = createMatch([resilDef, unit('a2', 3)], [unit('b', 3), unit('b2', 3)], 2);
    playCard(match, 0, 'melee'); // resilient card to board
    playCard(match, 0, 'melee');
    pass(match);
    pass(match); // round resolves
    expect(match.players[0].board.melee.length).toBe(1); // stays on board
    expect(match.players[0].graveyard.length).toBe(0);   // not in graveyard
  });

  it('doomed card is removed from game (not added to graveyard)', () => {
    const doomedDef = { id: 'd', row: 'melee', power: 5, doomed: true };
    const match = createMatch([doomedDef, unit('a2', 3)], [unit('b', 3), unit('b2', 3)], 2);
    playCard(match, 0, 'melee');
    playCard(match, 0, 'melee');
    pass(match);
    pass(match);
    expect(match.players[0].board.melee.length).toBe(0);
    expect(match.players[0].graveyard.length).toBe(0); // doomed: NOT in graveyard
  });
});
```

- [ ] **Step 5: Run tests — expect FAIL**

```
npm test -- --reporter=verbose src/engine/GwentMatch.test.js
```

Expected: 4 new tests FAIL with `graveyard is not defined` / `graveyard.length is not a function`.

- [ ] **Step 6: Update `src/engine/GwentMatch.js`** — add graveyard to player + fix startNextRound

Find `function makePlayer(deck, handSize)` and replace:

```js
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
```

Find `function startNextRound(match, lastResult)` and replace entirely:

```js
import { ROWS } from './Board.js';   // already imported at top of file

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
  }
  match.round++;
  match.roundStarter = lastResult === 'draw'
    ? 1 - match.roundStarter
    : 1 - lastResult;
  match.current = match.roundStarter;
  match.weather.clear();
}
```

> **Note:** The existing `import { createCard } from './Card.js'` and `import { createBoard, addUnit, totalPower, ROWS } from './Board.js'` are already at the top of GwentMatch.js — do not duplicate them. The `ROWS` import is already present.

- [ ] **Step 7: Run tests**

```
npm test
```

Expected: all previous tests pass + 9 new tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/engine/Card.js src/engine/Card.test.js src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): extended card runtime state + graveyard tracking"
```

---

### Task 3: Status effects tick + `startTurn` export

**Files:**
- Modify: `src/engine/GwentMatch.js`
- Modify: `src/engine/GwentMatch.test.js`

**Interfaces:**
- Consumes: `match.players[n].board`, `card.bleedStacks`, `card.poisoned`, `card.orderUsed`, `card.def.hasOrder`, `card.def.chargeMax`, `card.def.zeal`
- Produces: `export function startTurn(match)` — ticks bleed/poison for all board cards, then resets regular-Order flags for current player

- [ ] **Step 1: Write failing tests** — append to `src/engine/GwentMatch.test.js`

```js
describe('startTurn', () => {
  it('reduces power by bleedStacks (min 1) for all board cards', () => {
    const match = createMatch([unit('a', 5)], [unit('b', 5)], 1);
    playCard(match, 0, 'melee');  // p0 plays, board[0].melee has card with power 5
    match.players[0].board.melee[0].bleedStacks = 2;
    match.players[1].board.melee[0] = { ...match.players[1].board.melee[0], bleedStacks: 1 };
    // give p1 a card on board
    playCard(match, 0, 'melee');
    match.players[1].board.melee[0].bleedStacks = 1;
    startTurn(match); // called at start of p0's turn
    expect(match.players[0].board.melee[0].power).toBe(3); // 5 - 2
    expect(match.players[1].board.melee[0].power).toBe(4); // 5 - 1
  });

  it('bleed does not reduce power below 1', () => {
    const match = createMatch([unit('a', 1)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    match.players[0].board.melee[0].bleedStacks = 5;
    playCard(match, 0, 'melee');
    startTurn(match);
    expect(match.players[0].board.melee[0].power).toBe(1);
  });

  it('poison reduces power by 1 (min 1)', () => {
    const match = createMatch([unit('a', 3)], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    match.players[0].board.melee[0].poisoned = true;
    playCard(match, 0, 'melee');
    startTurn(match);
    expect(match.players[0].board.melee[0].power).toBe(2);
  });

  it('heroes are immune to bleed and poison', () => {
    const heroDef = { id: 'h', type: 'hero', row: 'melee', power: 7 };
    const match = createMatch([heroDef], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    match.players[0].board.melee[0].bleedStacks = 3;
    match.players[0].board.melee[0].poisoned = true;
    playCard(match, 0, 'melee');
    startTurn(match);
    expect(match.players[0].board.melee[0].power).toBe(7); // unchanged
  });

  it('resets orderUsed for current player non-Charge Order cards', () => {
    const orderDef = { id: 'o', row: 'melee', power: 3, hasOrder: true, chargeMax: 0 };
    const match = createMatch([orderDef], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    match.players[0].board.melee[0].orderUsed = true;
    playCard(match, 0, 'melee');
    // Now it's p0's turn again
    match.current = 0;
    startTurn(match);
    expect(match.players[0].board.melee[0].orderUsed).toBe(false);
  });

  it('does NOT reset chargesLeft for Charge cards', () => {
    const chargeDef = { id: 'c', row: 'melee', power: 3, hasOrder: true, chargeMax: 2 };
    const match = createMatch([chargeDef], [unit('b', 3)], 1);
    playCard(match, 0, 'melee');
    match.players[0].board.melee[0].chargesLeft = 1; // spent one charge
    playCard(match, 0, 'melee');
    match.current = 0;
    startTurn(match);
    expect(match.players[0].board.melee[0].chargesLeft).toBe(1); // unchanged
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm test -- --reporter=verbose src/engine/GwentMatch.test.js
```

Expected: 6 new tests FAIL with `startTurn is not a function`.

- [ ] **Step 3: Add `startTurn` to `src/engine/GwentMatch.js`**

Append before the last export in the file (after `healUnit`):

```js
export function startTurn(match) {
  // Tick status effects for all cards on all boards
  for (const player of match.players) {
    for (const row of ROWS) {
      for (const card of player.board[row]) {
        if (card.def.type === 'hero') continue; // heroes immune
        if (card.bleedStacks > 0) {
          card.power = Math.max(1, card.power - card.bleedStacks);
        }
        if (card.poisoned) {
          card.power = Math.max(1, card.power - 1);
        }
      }
    }
  }
  // Reset regular Order (not Charge) for the current player
  for (const row of ROWS) {
    for (const card of match.players[match.current].board[row]) {
      if (card.def.hasOrder && card.def.chargeMax === 0) {
        card.orderUsed = false;
      }
    }
  }
}
```

Also add `startTurn` to the import in `src/engine/GwentMatch.test.js`:

```js
import { createMatch, playCard, pass, hasLegalMove, healUnit, startTurn } from './GwentMatch.js';
```

- [ ] **Step 4: Run tests**

```
npm test
```

Expected: all tests pass (≥103).

- [ ] **Step 5: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/GwentMatch.test.js
git commit -m "feat(engine): startTurn — status tick (bleed/poison) + Order reset"
```

---

### Task 4: Deploy effects engine

**Files:**
- Create: `src/engine/effects.js`
- Create: `src/engine/effects.test.js`
- Modify: `src/engine/GwentMatch.js`

**Interfaces:**
- Consumes: `createCard` from `Card.js`; `ROWS` from `Board.js`
- Produces: `export function applyDeploy(match, card, playerIdx)` — mutates match in place
- Consumes (GwentMatch.js wiring): `applyDeploy` is called from `applyCard` after `addUnit`

- [ ] **Step 1: Create `src/engine/effects.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createMatch, playCard, pass } from './GwentMatch.js';
import { createCard } from './Card.js';
import { addUnit } from './Board.js';

// Helper: minimal unit def
const uDef = (id, power, row = 'melee', opts = {}) => ({ id, type: 'unit', row, power, ...opts });
const unit = (id, power, row = 'melee') => uDef(id, power, row);

describe('Deploy: knight_bonus', () => {
  it('adds 1 power per knight already on the board', () => {
    const knightDef = uDef('k1', 3, 'melee', { tags: ['knight'] });
    const knightBonus = uDef('kb', 2, 'melee', { deployEffect: 'knight_bonus' });
    const match = createMatch([knightDef, knightBonus], [unit('x', 1)], 2);
    playCard(match, 0, 'melee'); // k1 onto board (0 knights before it)
    // kb will be index 0 in hand now (knightDef was index 0, knightBonus is index 1→0)
    playCard(match, 0, 'melee'); // x for opponent
    playCard(match, 0, 'melee'); // kb onto board — 1 knight already there
    expect(match.players[0].board.melee[1].power).toBe(3); // 2 + 1
  });
});

describe('Deploy: poison_one', () => {
  it('sets poisoned on the weakest enemy unit', () => {
    const poisoner = uDef('p', 3, 'ranged', { deployEffect: 'poison_one' });
    const weak = unit('w', 2);
    const strong = unit('s', 7);
    const match = createMatch([poisoner], [weak, strong], 1);
    // Pre-populate enemy board manually
    addUnit(match.players[1].board, 'melee', createCard(weak));
    addUnit(match.players[1].board, 'melee', createCard(strong));
    match.players[1].hand = [];
    playCard(match, 0, 'ranged'); // poisoner played
    const cards = match.players[1].board.melee;
    const poisoned = cards.filter(c => c.poisoned);
    expect(poisoned.length).toBe(1);
    expect(poisoned[0].power).toBe(2); // weakest was targeted
  });
});

describe('Deploy: bleed_two', () => {
  it('adds bleedStack to the 2 weakest enemies', () => {
    const bleeder = uDef('b', 4, 'melee', { deployEffect: 'bleed_two' });
    const match = createMatch([bleeder], [unit('e1', 3), unit('e2', 5), unit('e3', 1)], 1);
    for (let i = 0; i < 3; i++) {
      addUnit(match.players[1].board, 'melee', createCard({ id: `e${i}`, type: 'unit', row: 'melee', power: [3, 5, 1][i] }));
    }
    match.players[1].hand = [];
    playCard(match, 0, 'melee');
    const bleeds = match.players[1].board.melee.filter(c => c.bleedStacks > 0);
    expect(bleeds.length).toBe(2);
    const powers = bleeds.map(c => c.power).sort();
    expect(powers).toEqual([1, 3]); // the two weakest
  });
});

describe('Deploy: damage_one', () => {
  it('deals deployParam damage to the strongest enemy non-hero', () => {
    const dmgCard = uDef('d', 3, 'melee', { deployEffect: 'damage_one', deployParam: 3 });
    const enemy = { id: 'e', type: 'unit', row: 'melee', power: 6 };
    const match = createMatch([dmgCard], [enemy], 1);
    addUnit(match.players[1].board, 'melee', createCard(enemy));
    match.players[1].hand = [];
    playCard(match, 0, 'melee');
    expect(match.players[1].board.melee[0].power).toBe(3); // 6 - 3
  });

  it('does not damage heroes', () => {
    const dmgCard = uDef('d', 3, 'melee', { deployEffect: 'damage_one', deployParam: 3 });
    const hero = { id: 'h', type: 'hero', row: 'melee', power: 8 };
    const match = createMatch([dmgCard], [hero], 1);
    addUnit(match.players[1].board, 'melee', createCard(hero));
    match.players[1].hand = [];
    playCard(match, 0, 'melee');
    expect(match.players[1].board.melee[0].power).toBe(8); // unchanged
  });
});

describe('Deploy: boost_neighbor', () => {
  it('boosts the card placed before it in the same row', () => {
    const first = uDef('f', 3, 'melee');
    const booster = uDef('nb', 2, 'melee', { deployEffect: 'boost_neighbor', deployParam: 2 });
    const match = createMatch([first, booster], [unit('x', 1)], 2);
    playCard(match, 0, 'melee'); // first
    playCard(match, 0, 'melee'); // x
    playCard(match, 0, 'melee'); // booster — first is at index 0, booster at 1
    expect(match.players[0].board.melee[0].power).toBe(5); // 3 + 2
  });
});

describe('Deploy: boost_all_faction', () => {
  it('boosts all units of the same faction on own board', () => {
    const booster = uDef('b', 3, 'melee', { faction: 'humans', deployEffect: 'boost_all_faction', deployParam: 1 });
    const ally = { ...uDef('a', 4, 'ranged'), faction: 'humans' };
    const match = createMatch([booster], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'ranged', createCard(ally));
    playCard(match, 0, 'melee'); // booster deployed
    expect(match.players[0].board.ranged[0].power).toBe(5); // 4 + 1
  });
});

describe('Deploy: damage_all_rows (chaos_demon)', () => {
  it('deals damage to all units including own', () => {
    const demon = uDef('cd', 9, 'siege', { deployEffect: 'damage_all_rows', deployParam: 5 });
    const ally = uDef('a', 6, 'melee');
    const match = createMatch([demon], [unit('e', 8)], 1);
    addUnit(match.players[0].board, 'melee', createCard(ally));
    addUnit(match.players[1].board, 'melee', createCard({ id: 'e', type: 'unit', row: 'melee', power: 8 }));
    match.players[1].hand = [];
    playCard(match, 0, 'siege');
    expect(match.players[0].board.melee[0].power).toBe(1); // 6 - 5 = 1
    expect(match.players[1].board.melee[0].power).toBe(3); // 8 - 5 = 3
  });
});

describe('Deploy: resurrect_one', () => {
  it('moves last graveyard card back to board', () => {
    const reviver = uDef('rv', 3, 'melee', { deployEffect: 'resurrect_one' });
    const dead = createCard(uDef('dead', 5, 'melee'));
    const match = createMatch([reviver], [unit('x', 1)], 1);
    match.players[0].graveyard.push(dead);
    playCard(match, 0, 'melee');
    expect(match.players[0].graveyard.length).toBe(0);
    expect(match.players[0].board.melee.some(c => c.def.id === 'dead')).toBe(true);
  });

  it('does nothing if graveyard is empty', () => {
    const reviver = uDef('rv', 3, 'melee', { deployEffect: 'resurrect_one' });
    const match = createMatch([reviver], [unit('x', 1)], 1);
    expect(() => playCard(match, 0, 'melee')).not.toThrow();
  });
});

describe('Deploy: wolf_pack', () => {
  it('boosts all wolves by 2 when 3 or more are on the field', () => {
    const wolfDef = uDef('wf', 2, 'melee', { tags: ['wolf', 'beast'], deployEffect: 'wolf_pack' });
    const match = createMatch([wolfDef], [unit('x', 1)], 1);
    // pre-populate 2 wolves
    addUnit(match.players[0].board, 'melee', createCard({ ...wolfDef, id: 'w1' }));
    addUnit(match.players[0].board, 'melee', createCard({ ...wolfDef, id: 'w2' }));
    playCard(match, 0, 'melee'); // 3rd wolf triggers pack
    const wolves = match.players[0].board.melee;
    expect(wolves.every(w => w.power === 4)).toBe(true); // 2 + 2
  });

  it('does NOT boost when fewer than 3 wolves', () => {
    const wolfDef = uDef('wf', 2, 'melee', { tags: ['wolf', 'beast'], deployEffect: 'wolf_pack' });
    const match = createMatch([wolfDef], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'melee', createCard({ ...wolfDef, id: 'w1' }));
    playCard(match, 0, 'melee'); // 2 wolves — no boost
    expect(match.players[0].board.melee[0].power).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm test -- --reporter=verbose src/engine/effects.test.js
```

Expected: all new tests FAIL (deploy effects not implemented yet).

- [ ] **Step 3: Create `src/engine/effects.js`**

```js
import { createCard } from './Card.js';
import { ROWS } from './Board.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function nonHeroes(board) {
  return ROWS.flatMap(r => board[r]).filter(c => c.def.type !== 'hero');
}

function weakest(units) {
  return units.length ? units.reduce((a, b) => (a.power <= b.power ? a : b)) : null;
}

function strongest(units) {
  return units.length ? units.reduce((a, b) => (a.power >= b.power ? a : b)) : null;
}

// ── Deploy effects ────────────────────────────────────────────────────────────

export function applyDeploy(match, card, playerIdx) {
  const { deployEffect, deployParam = 1 } = card.def;
  if (!deployEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (deployEffect) {
    case 'knight_bonus': {
      const knights = ROWS.flatMap(r => own[r]).filter(c => c.def.tags?.includes('knight') && c !== card);
      card.power += knights.length;
      break;
    }
    case 'boost_self': {
      card.power += deployParam;
      break;
    }
    case 'shield_self': {
      card.shielded = true;
      break;
    }
    case 'boost_neighbor': {
      const row = card.def.row;
      const rowCards = own[row];
      const idx = rowCards.indexOf(card);
      if (idx > 0) rowCards[idx - 1].power += deployParam;
      if (idx < rowCards.length - 1) rowCards[idx + 1].power += deployParam;
      break;
    }
    case 'boost_machine': {
      const machines = ROWS.flatMap(r => own[r]).filter(c => c.def.tags?.includes('machine') && c !== card);
      const target = strongest(machines);
      if (target) target.power += deployParam;
      break;
    }
    case 'boost_all_faction': {
      const faction = card.def.faction;
      ROWS.forEach(r => own[r].forEach(c => {
        if (c !== card && c.def.faction === faction) c.power += deployParam;
      }));
      break;
    }
    case 'poison_one': {
      const target = weakest(nonHeroes(opp));
      if (target) target.poisoned = true;
      break;
    }
    case 'bleed_two': {
      const sorted = nonHeroes(opp).sort((a, b) => a.power - b.power);
      sorted.slice(0, 2).forEach(u => u.bleedStacks++);
      break;
    }
    case 'damage_one': {
      const target = strongest(nonHeroes(opp));
      if (target) target.power = Math.max(1, target.power - deployParam);
      break;
    }
    case 'damage_row': {
      const row = card.def.row;
      opp[row].forEach(c => {
        if (c.def.type !== 'hero') c.power = Math.max(1, c.power - deployParam);
      });
      break;
    }
    case 'damage_all_rows': {
      ROWS.forEach(row => {
        [...own[row], ...opp[row]].forEach(c => {
          if (c.def.type !== 'hero') c.power = Math.max(1, c.power - deployParam);
        });
      });
      break;
    }
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
        const r = createCard(dead.def);
        r.power = 1;
        own[dead.def.row].push(r);
      });
      break;
    }
    case 'copy_enemy_graveyard': {
      const enemyGrave = match.players[1 - playerIdx].graveyard;
      const template = strongest(enemyGrave);
      if (template) own[template.def.row].push(createCard(template.def));
      break;
    }
    case 'cleanse_ally': {
      const dirty = ROWS.flatMap(r => own[r]).filter(c => c.poisoned || c.bleedStacks > 0);
      const target = dirty.sort((a, b) => (b.def.power - b.power) - (a.def.power - a.power))[0];
      if (target) { target.poisoned = false; target.bleedStacks = 0; }
      break;
    }
    case 'wolf_pack': {
      const wolves = ROWS.flatMap(r => own[r]).filter(c => c.def.tags?.includes('wolf'));
      if (wolves.length >= 3) wolves.forEach(w => { w.power += 2; });
      break;
    }
    case 'bleed_check_self': {
      // bloodsucker: +3 if any enemy already bleeding
      const anyBleeding = nonHeroes(opp).some(c => c.bleedStacks > 0);
      if (anyBleeding) card.power += 3;
      break;
    }
    case 'werewolf_register': {
      // sets a flag checked in startNextRound (handled by GwentMatch)
      card.werewolf = true;
      break;
    }
    case 'control_weakest': {
      const target = weakest(nonHeroes(opp));
      if (target) {
        for (const row of ROWS) {
          const idx = opp[row].indexOf(target);
          if (idx !== -1) { opp[row].splice(idx, 1); break; }
        }
        target.controlled = true;
        own[target.def.row].push(target);
      }
      break;
    }
    case 'frost_weather_bonus': {
      match.weather.add('melee');
      if (match.weather.size > 0) card.power += deployParam;
      break;
    }
    default:
      break; // unknown effects silently ignored
  }
}

// ── Order effects ─────────────────────────────────────────────────────────────

export function applyOrder(match, card, playerIdx, opts = {}) {
  const { orderEffect, orderParam = 1 } = card.def;
  if (!orderEffect) return;

  const own = match.players[playerIdx].board;
  const opp = match.players[1 - playerIdx].board;

  switch (orderEffect) {
    case 'boost_melee_row': {
      own.melee.forEach(c => { if (c !== card) c.power += orderParam; });
      break;
    }
    case 'boost_knights': {
      ROWS.forEach(r => own[r].forEach(c => {
        if (c.def.tags?.includes('knight') && c !== card) c.power += orderParam;
      }));
      break;
    }
    case 'boost_all_faction': {
      const faction = card.def.faction;
      ROWS.forEach(r => own[r].forEach(c => {
        if (c !== card && c.def.faction === faction) c.power += orderParam;
      }));
      break;
    }
    case 'damage_one': {
      const target = opts.target ?? strongest(nonHeroes(opp));
      if (target) target.power = Math.max(1, target.power - orderParam);
      break;
    }
    case 'damage_lock': {
      const target = opts.target ?? strongest(nonHeroes(opp));
      if (target) { target.power = Math.max(1, target.power - orderParam); target.locked = true; }
      break;
    }
    case 'damage_row_choice': {
      const row = opts.row ?? 'melee';
      opp[row].forEach(c => {
        if (c.def.type !== 'hero') c.power = Math.max(1, c.power - orderParam);
      });
      break;
    }
    case 'heal_ally': {
      const target = opts.target ?? weakest(nonHeroes(own).filter(c => c !== card));
      if (target) target.power = Math.min(target.def.power, target.power + orderParam);
      break;
    }
    case 'shield_ally': {
      const target = opts.target ?? weakest(nonHeroes(own).filter(c => c !== card));
      if (target) target.shielded = true;
      break;
    }
    case 'debuff_living': {
      ROWS.forEach(r => opp[r].forEach(c => {
        if (c.def.type !== 'hero') c.power = Math.max(1, c.power - orderParam);
      }));
      break;
    }
    case 'poison_two': {
      const sorted = nonHeroes(opp).sort((a, b) => a.power - b.power);
      sorted.slice(0, 2).forEach(u => { u.poisoned = true; });
      break;
    }
    default:
      break;
  }
}
```

- [ ] **Step 4: Wire `applyDeploy` into `GwentMatch.js`**

At the top of `src/engine/GwentMatch.js`, add the import:

```js
import { applyDeploy } from './effects.js';
```

Find `function applyCard(match, card, row)` and replace it:

```js
function applyCard(match, card, row) {
  if (card.def.type === 'special') {
    applyEffect(match, card.def.effect, row);
    return;
  }
  addUnit(match.players[match.current].board, row, card);
  // Non-Zeal Order cards can't act the turn they're played
  if (card.def.hasOrder && !card.def.zeal && card.def.chargeMax === 0) {
    card.orderUsed = true;
  }
  applyDeploy(match, card, match.current);
}
```

Also add new special effects to `applyEffect` in `GwentMatch.js`. Find the `throw new Error('Unknown effect: ${effect}')` line at the end of `applyEffect` and replace the whole function:

```js
function applyEffect(match, effect, row) {
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
    match.players[match.current].board.horns.add(row);
    return;
  }
  if (effect === 'sign_damage') {
    if (!ROWS.includes(row)) throw new Error(`Unknown row: ${row}`);
    const opponentBoard = match.players[1 - match.current].board;
    for (const card of opponentBoard[row]) {
      if (card.def.type !== 'hero') card.power = Math.max(1, card.power - 2);
    }
    return;
  }
  if (effect === 'lightning_ranged') {
    const oppBoard = match.players[1 - match.current].board;
    const units = oppBoard.ranged.filter(c => c.def.type !== 'hero');
    const target = units.length ? units.reduce((a, b) => (a.power >= b.power ? a : b)) : null;
    if (target) target.power = Math.max(1, target.power - 3);
    return;
  }
  if (effect === 'blessing_humans') {
    const ownBoard = match.players[match.current].board;
    ROWS.forEach(r => ownBoard[r].forEach(c => {
      if (c.def.faction === 'humans') c.power += 2;
    }));
    return;
  }
  if (effect === 'order_ready') {
    const ownBoard = match.players[match.current].board;
    ROWS.forEach(r => ownBoard[r].forEach(c => {
      if (c.def.hasOrder && c.def.chargeMax === 0) c.orderUsed = false;
    }));
    return;
  }
  if (effect === 'fog_frost_combo') {
    match.weather.add('ranged');
    match.weather.add('melee');
    return;
  }
  if (effect === 'bleed_all_enemies') {
    const oppBoard = match.players[1 - match.current].board;
    ROWS.forEach(r => oppBoard[r].forEach(c => {
      if (c.def.type !== 'hero') c.bleedStacks++;
    }));
    return;
  }
  // 'heal' is handled by BattleScene (awaitingHeal flow), not the engine
  if (effect === 'heal') return;
  throw new Error(`Unknown effect: ${effect}`);
}
```

- [ ] **Step 5: Run tests**

```
npm test
```

Expected: all tests pass (≥103 + new deploy tests).

- [ ] **Step 6: Commit**

```bash
git add src/engine/effects.js src/engine/effects.test.js src/engine/GwentMatch.js
git commit -m "feat(engine): Deploy effects engine + new special card effects"
```

---

### Task 5: Order / Zeal / Charge engine

**Files:**
- Modify: `src/engine/effects.test.js` (add Order tests)
- Modify: `src/engine/GwentMatch.js` (add `useOrder` export)

**Interfaces:**
- Consumes: `applyOrder` from `effects.js`; card runtime fields from Task 2 (`orderUsed`, `chargesLeft`, `locked`)
- Produces: `export function useOrder(match, playerIdx, row, cardIdx, opts?)` — throws on invalid use, mutates card state

- [ ] **Step 1: Append Order tests to `src/engine/effects.test.js`**

```js
import { useOrder } from './GwentMatch.js';

describe('useOrder', () => {
  it('applies the order effect and marks orderUsed', () => {
    const bannerDef = uDef('bn', 2, 'melee', { hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1, chargeMax: 0 });
    const ally = uDef('a', 3, 'melee');
    const match = createMatch([bannerDef], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'melee', createCard(bannerDef));
    addUnit(match.players[0].board, 'melee', createCard(ally));
    match.players[0].hand = [];
    // manually mark as available (Zeal or turn reset simulated)
    match.players[0].board.melee[0].orderUsed = false;
    useOrder(match, 0, 'melee', 0);
    expect(match.players[0].board.melee[1].power).toBe(4); // ally boosted
    expect(match.players[0].board.melee[0].orderUsed).toBe(true);
  });

  it('throws if Order already used this turn', () => {
    const bannerDef = uDef('bn', 2, 'melee', { hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1, chargeMax: 0 });
    const match = createMatch([], [unit('x', 1)], 0);
    addUnit(match.players[0].board, 'melee', createCard(bannerDef));
    match.players[0].board.melee[0].orderUsed = true;
    expect(() => useOrder(match, 0, 'melee', 0)).toThrow('Order already used this turn');
  });

  it('throws if card is locked', () => {
    const bannerDef = uDef('bn', 2, 'melee', { hasOrder: true, orderEffect: 'boost_melee_row', orderParam: 1, chargeMax: 0 });
    const match = createMatch([], [unit('x', 1)], 0);
    addUnit(match.players[0].board, 'melee', createCard(bannerDef));
    match.players[0].board.melee[0].locked = true;
    match.players[0].board.melee[0].orderUsed = false;
    expect(() => useOrder(match, 0, 'melee', 0)).toThrow('Card is locked');
  });

  it('decrements chargesLeft for Charge cards and allows reuse next turn', () => {
    const sniperDef = uDef('sn', 4, 'ranged', { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 });
    const enemy = { id: 'e', type: 'unit', row: 'melee', power: 6 };
    const match = createMatch([], [enemy], 0);
    addUnit(match.players[0].board, 'ranged', createCard(sniperDef));
    addUnit(match.players[1].board, 'melee', createCard(enemy));
    const sniper = match.players[0].board.ranged[0];
    expect(sniper.chargesLeft).toBe(2);
    useOrder(match, 0, 'ranged', 0); // use once
    expect(sniper.chargesLeft).toBe(1);
    expect(match.players[1].board.melee[0].power).toBe(4); // 6 - 2
    useOrder(match, 0, 'ranged', 0); // use second charge
    expect(sniper.chargesLeft).toBe(0);
  });

  it('throws when Charge card has no charges left', () => {
    const sniperDef = uDef('sn', 4, 'ranged', { hasOrder: true, orderEffect: 'damage_one', orderParam: 2, chargeMax: 2 });
    const match = createMatch([], [unit('x', 1)], 0);
    addUnit(match.players[0].board, 'ranged', createCard(sniperDef));
    match.players[0].board.ranged[0].chargesLeft = 0;
    expect(() => useOrder(match, 0, 'ranged', 0)).toThrow('No charges left');
  });

  it('Zeal card (field_medic) can use Order on the same turn it is played', () => {
    const zealDef = uDef('fm', 4, 'melee', {
      tags: ['medic'], zeal: true, hasOrder: true, orderEffect: 'heal_ally', orderParam: 2, chargeMax: 0,
    });
    const wounded = uDef('w', 3, 'melee');
    const match = createMatch([zealDef], [unit('x', 1)], 1);
    addUnit(match.players[0].board, 'melee', createCard({ ...wounded, power: 1, defPower: 3 })); // manually wounded
    playCard(match, 0, 'melee'); // plays zealDef; Zeal so orderUsed stays false
    // The played zeal card is at index 1 of melee (wounded was 0, zealDef is 1)
    const zealCard = match.players[0].board.melee.find(c => c.def.id === 'fm');
    expect(zealCard.orderUsed).toBe(false); // Zeal: available immediately
    useOrder(match, 0, 'melee', match.players[0].board.melee.indexOf(zealCard));
    expect(match.players[0].board.melee[0].power).toBeGreaterThan(1); // healed
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm test -- --reporter=verbose src/engine/effects.test.js
```

Expected: Order tests FAIL with `useOrder is not a function`.

- [ ] **Step 3: Add `useOrder` to `src/engine/GwentMatch.js`**

Add import at top:

```js
import { applyDeploy, applyOrder } from './effects.js';
```

Append after `startTurn`:

```js
export function useOrder(match, playerIdx, row, cardIdx, opts = {}) {
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

  applyOrder(match, card, playerIdx, opts);

  if (isCharge) {
    card.chargesLeft--;
  } else {
    card.orderUsed = true;
  }
}
```

Also add `werewolf_register` handling at the end of `startNextRound` (add before the last two lines that set `match.round` and `match.roundStarter`). Find the loop in `startNextRound` that processes resilient/doomed cards and append after the `player.passed = false` line:

```js
    // Werewolves get +2 at the start of each new round
    for (const row of ROWS) {
      for (const card of player.board[row]) {
        if (card.werewolf) card.power += 2;
      }
    }
```

- [ ] **Step 4: Add `useOrder` to the import in `effects.test.js`**

Change the import at the top of `effects.test.js`:

```js
import { createMatch, playCard, pass, useOrder } from './GwentMatch.js';
```

- [ ] **Step 5: Run all tests**

```
npm test
```

Expected: all tests pass (≥110).

- [ ] **Step 6: Commit**

```bash
git add src/engine/GwentMatch.js src/engine/effects.js src/engine/effects.test.js
git commit -m "feat(engine): useOrder with Zeal/Charge support + werewolf round bonus"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Deploy mechanic | Task 4 |
| Order/Zeal/Charge mechanic | Task 5 |
| Armor field | Task 2 (runtime: `armorLeft`) |
| Resilience (stays between rounds) | Task 2 (startNextRound) |
| Doomed (removed from game) | Task 2 (startNextRound) |
| Immune (heroes immune to bleed/poison) | Task 3 (startTurn hero check) |
| Poison/Bleed tick | Task 3 |
| Graveyard tracking | Task 2 |
| All 52 card definitions | Task 1 |
| Shop cards updated | Task 1 |
| Special effect: lightning_ranged | Task 4 (applyEffect) |
| Special effect: blessing_humans | Task 4 (applyEffect) |
| Special effect: order_ready | Task 4 (applyEffect) |
| Special effect: fog_frost_combo | Task 4 (applyEffect) |
| Special effect: bleed_all_enemies | Task 4 (applyEffect) |
| Wolf pack synergy | Task 4 (effects.js) |
| Werewolf round bonus | Task 5 (startNextRound) |
| Bloodsucker conditional boost | Task 4 (effects.js) |
| Control weakest (Соблазнитель) | Task 4 (effects.js) |

**Not in this plan (Plan B):**
- CardView B-style visual redesign
- DeckScene Provision budget display
- BattleScene Order UI (click to activate Order)
- Shop price updates for new cards

**Placeholder scan:** None found.

**Type consistency:** `applyDeploy`/`applyOrder` use identical helper functions (`nonHeroes`, `weakest`, `strongest`) defined once in `effects.js`. `useOrder` import in `effects.test.js` matches the export name. `startTurn` import in `GwentMatch.test.js` matches export.
