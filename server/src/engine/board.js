// Tablero 15x15 con casillas premium (mismo layout que el Scrabble clasico).
// TW = triple palabra, DW = doble palabra, TL = triple letra, DL = doble letra.
export const BOARD_SIZE = 15;
export const CENTER = { row: 7, col: 7 };

const TW = [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]];
const DW = [
  [1, 1], [2, 2], [3, 3], [4, 4], [10, 10], [11, 11], [12, 12], [13, 13],
  [1, 13], [2, 12], [3, 11], [4, 10], [10, 4], [11, 3], [12, 2], [13, 1],
  [7, 7], // centro
];
const TL = [
  [1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13],
  [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9],
];
const DL = [
  [0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14],
  [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11],
  [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14],
  [12, 6], [12, 8], [14, 3], [14, 11],
];

const PREMIUMS = (() => {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (const [r, c] of TW) grid[r][c] = 'TW';
  for (const [r, c] of DW) grid[r][c] = 'DW';
  for (const [r, c] of TL) grid[r][c] = 'TL';
  for (const [r, c] of DL) grid[r][c] = 'DL';
  return grid;
})();

export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

export function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function premiumAt(row, col) {
  return PREMIUMS[row][col];
}

// Util para el frontend: layout de premios sin estado de juego.
export function premiumGrid() {
  return PREMIUMS.map((row) => row.slice());
}
