export const ROWS = ['melee', 'ranged', 'siege'];

export function createBoard() {
  return { melee: [], ranged: [], siege: [], horns: new Set() };
}

export function addUnit(board, row, card) {
  if (!ROWS.includes(row)) {
    throw new Error(`Unknown row: ${row}`);
  }
  board[row].push(card);
}

export function effectivePower(card, row, board, weather) {
  if (card.def.type === 'hero') {
    return card.power;
  }
  let power = card.power;
  if (weather.has(row)) {
    power = 1;
  }
  if (board.horns.has(row)) {
    power = power * 2;
  }
  return power;
}

export function rowPower(board, row, weather = new Set()) {
  return board[row].reduce(
    (sum, card) => sum + effectivePower(card, row, board, weather),
    0,
  );
}

export function totalPower(board, weather = new Set()) {
  return ROWS.reduce((sum, row) => sum + rowPower(board, row, weather), 0);
}
