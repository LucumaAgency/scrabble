// Layout de casillas premium, replicado del servidor (server/src/engine/board.js)
// solo para PINTAR el tablero. La puntuacion siempre la calcula el servidor.
export const BOARD_SIZE = 15;
export const CENTER = { row: 7, col: 7 };

const TW = [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]];
const DW = [
  [1, 1], [2, 2], [3, 3], [4, 4], [10, 10], [11, 11], [12, 12], [13, 13],
  [1, 13], [2, 12], [3, 11], [4, 10], [10, 4], [11, 3], [12, 2], [13, 1],
  [7, 7],
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

const GRID = (() => {
  const g = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (const [r, c] of TW) g[r][c] = 'TW';
  for (const [r, c] of DW) g[r][c] = 'DW';
  for (const [r, c] of TL) g[r][c] = 'TL';
  for (const [r, c] of DL) g[r][c] = 'DL';
  return g;
})();

export const premiumAt = (r, c) => GRID[r][c];
export const premiumLabel = (p) => ({ TW: 'TP', DW: 'DP', TL: 'TL', DL: 'DL' })[p] || '';

// Letras disponibles para asignar a un comodin (incluye digrafos y la enie).
export const LETTERS = [
  'A', 'B', 'C', 'CH', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'LL', 'M',
  'N', 'Ñ', 'O', 'P', 'Q', 'R', 'RR', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z',
];
