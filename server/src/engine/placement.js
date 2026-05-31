import { inBounds, CENTER } from './board.js';
import { readWord } from './words.js';

const fail = (reason) => ({ ok: false, reason });

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

// Valida la ESTRUCTURA de una jugada (no consulta el diccionario; eso se hace
// despues con las palabras devueltas).
//
// placements: [{ row, col, tile }]  -> fichas que el jugador quiere colocar.
// opts.isFirstMove: si es la primera jugada de la partida.
//
// Devuelve:
//   { ok: true, words: [{ word, cells }], dir }   si la estructura es valida
//   { ok: false, reason }                          si no
export function validateMove(board, placements, { isFirstMove }) {
  if (!placements || placements.length === 0) return fail('No colocaste ninguna ficha');

  // 1. Celdas en rango, no ocupadas y sin duplicados.
  const placedSet = new Set();
  for (const p of placements) {
    if (!inBounds(p.row, p.col)) return fail('Ficha fuera del tablero');
    if (board[p.row][p.col]) return fail('Casilla ya ocupada');
    const key = `${p.row},${p.col}`;
    if (placedSet.has(key)) return fail('Dos fichas en la misma casilla');
    placedSet.add(key);
  }

  // 2. Orientacion: todas en una fila (H) o en una columna (V).
  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  let dir;
  if (placements.length === 1) dir = 'single';
  else if (rows.size === 1) dir = 'H';
  else if (cols.size === 1) dir = 'V';
  else return fail('Las fichas deben estar en una sola fila o columna');

  // 3. Colocar en un tablero temporal para leer palabras.
  const temp = cloneBoard(board);
  for (const p of placements) temp[p.row][p.col] = p.tile;

  // 4. Reunir palabras formadas (principal + cruzadas), descartando longitud < 2.
  const words = [];
  const seen = new Set();
  const addWord = (w) => {
    if (w.word.length < 2) return;
    const key = w.cells.map((c) => `${c.row},${c.col}`).join('|');
    if (seen.has(key)) return;
    seen.add(key);
    words.push(w);
  };

  if (dir === 'single') {
    const p = placements[0];
    addWord(readWord(temp, p.row, p.col, 0, 1)); // horizontal
    addWord(readWord(temp, p.row, p.col, 1, 0)); // vertical
  } else {
    const [md, cd] = dir === 'H' ? [[0, 1], [1, 0]] : [[1, 0], [0, 1]];
    // Palabra principal (a lo largo del eje de la jugada).
    const main = readWord(temp, placements[0].row, placements[0].col, md[0], md[1]);
    // Sin huecos: toda ficha colocada debe pertenecer a la palabra principal.
    const mainCells = new Set(main.cells.map((c) => `${c.row},${c.col}`));
    for (const p of placements) {
      if (!mainCells.has(`${p.row},${p.col}`)) {
        return fail('Las fichas deben ser contiguas (hay un hueco)');
      }
    }
    addWord(main);
    // Palabras cruzadas que genera cada ficha nueva.
    for (const p of placements) addWord(readWord(temp, p.row, p.col, cd[0], cd[1]));
  }

  if (words.length === 0) return fail('La jugada no forma ninguna palabra');

  // 5. Primera jugada vs conexion con lo existente.
  if (isFirstMove) {
    if (!placedSet.has(`${CENTER.row},${CENTER.col}`)) {
      return fail('La primera palabra debe pasar por el centro');
    }
    if (placements.length < 2) {
      return fail('La primera palabra debe tener al menos 2 fichas');
    }
  } else {
    // Conecta si alguna palabra formada incluye al menos una ficha ya existente.
    const connects = words.some((w) =>
      w.cells.some((c) => !placedSet.has(`${c.row},${c.col}`)),
    );
    if (!connects) return fail('La jugada debe conectar con fichas ya colocadas');
  }

  return { ok: true, words, dir };
}
