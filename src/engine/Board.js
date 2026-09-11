export const ROWS = ['melee', 'ranged', 'siege'];

export function createBoard() {
  return { melee: [], ranged: [], siege: [] };
}

export function addUnit(board, row, card) {
  if (!ROWS.includes(row)) {
    throw new Error(`Unknown row: ${row}`);
  }
  board[row].push(card);
}

export function rowPower(board, row) {
  return board[row].reduce((sum, card) => sum + card.power, 0);
}

export function totalPower(board) {
  return ROWS.reduce((sum, row) => sum + rowPower(board, row), 0);
}
