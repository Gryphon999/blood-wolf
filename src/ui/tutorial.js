// First-battle tutorial: which hint to show, derived from what the player is doing.
// Action steps (mulligan, hand, row, target) disappear once the player acts;
// info steps (score, leader) wait for "Next". Returns null when nothing to show, 'done' at the end.
export const TUTORIAL_STEPS = ['mulligan', 'hand', 'row', 'target', 'score', 'leader'];
const INFO_STEPS = new Set(['score', 'leader']);

export function isInfoStep(step) {
  return INFO_STEPS.has(step);
}

export function tutorialStep({ mulligan, selected, pendingTarget, played, myTurn, seen }) {
  if (mulligan) return 'mulligan';
  if (!myTurn) return null;
  if (pendingTarget) return seen.has('target') ? null : 'target';
  if (selected) return seen.has('row') ? null : 'row';
  if (!played) return 'hand';
  if (!seen.has('score')) return 'score';
  if (!seen.has('leader')) return 'leader';
  return 'done';
}

// Where the hint panel sits for each step (y of its centre)
export const TUTORIAL_ANCHOR_Y = {
  mulligan: 600, hand: 470, row: 300, target: 250, score: 190, leader: 470,
};
