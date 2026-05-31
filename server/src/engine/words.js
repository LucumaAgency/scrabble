import { inBounds } from './board.js';
import { tileFace } from './tiles.js';

// Lee la palabra completa que pasa por (row, col) en la direccion (dRow, dCol),
// extendiendose hacia atras y hacia delante mientras haya fichas contiguas.
// Devuelve { word, cells } donde word es el string concatenado (digrafos incluidos)
// y cells son las celdas {row, col, tile} que la componen, en orden.
export function readWord(board, row, col, dRow, dCol) {
  // Retrocede hasta el inicio de la palabra.
  let r = row;
  let c = col;
  while (inBounds(r - dRow, c - dCol) && board[r - dRow][c - dCol]) {
    r -= dRow;
    c -= dCol;
  }
  // Avanza acumulando fichas.
  const cells = [];
  let word = '';
  while (inBounds(r, c) && board[r][c]) {
    cells.push({ row: r, col: c, tile: board[r][c] });
    word += tileFace(board[r][c]);
    r += dRow;
    c += dCol;
  }
  return { word, cells };
}
