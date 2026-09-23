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
