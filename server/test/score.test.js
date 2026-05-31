import { describe, it, expect } from 'vitest';
import { createBoard } from '../src/engine/board.js';
import { validateMove } from '../src/engine/placement.js';
import { scoreMove } from '../src/engine/score.js';
import { T, place } from './helpers.js';

describe('puntuacion', () => {
  it('CASA en la primera jugada usa el doble del centro', () => {
    // C=3 A=1 S=1 A=1 = 6, el centro (7,7) es DW -> 12
    const board = createBoard();
    const placements = [
      place(T('C', 3), 7, 7),
      place(T('A', 1), 7, 8),
      place(T('S', 1), 7, 9),
      place(T('A', 1), 7, 10),
    ];
    const res = validateMove(board, placements, { isFirstMove: true });
    const score = scoreMove(res.words, placements);
    expect(score.total).toBe(12);
  });

  it('aplica doble letra a la ficha sobre DL', () => {
    // Colocamos sobre la fila 0: S(0,3 DL) O(0,4) L(0,5) = "sol"
    // S=1 *2 (DL) + O=1 + L=1 = 4, sin multiplicador de palabra
    const board = createBoard();
    const placements = [
      place(T('S', 1), 0, 3),
      place(T('O', 1), 0, 4),
      place(T('L', 1), 0, 5),
    ];
    // No es primera jugada real, pero validamos estructura como first para el centro:
    // mejor lo probamos como jugada estructuralmente valida desde el centro.
    const res = validateMove(board, placements, { isFirstMove: false });
    // No conecta con nada -> ok:false; para puntuar usamos las palabras directamente.
    // Construimos las words manualmente leyendo el tablero temporal no es necesario:
    // forzamos isFirstMove=true pasando por el centro NO aplica aqui. Validamos scoring
    // con un set de words artificial:
    const words = [
      {
        word: 'sol',
        cells: [
          { row: 0, col: 3, tile: T('S', 1) },
          { row: 0, col: 4, tile: T('O', 1) },
          { row: 0, col: 5, tile: T('L', 1) },
        ],
      },
    ];
    const score = scoreMove(words, placements);
    expect(score.total).toBe(4);
    expect(res.ok).toBe(false); // confirma que aislada no conecta
  });

  it('bingo: usar 7 fichas da +50', () => {
    const placements = Array.from({ length: 7 }, (_, i) => place(T('A', 1), 7, 7 + i));
    const words = [
      {
        word: 'aaaaaaa',
        cells: placements.map((p) => ({ row: p.row, col: p.col, tile: p.tile })),
      },
    ];
    const score = scoreMove(words, placements);
    expect(score.bingo).toBe(50);
    expect(score.total).toBeGreaterThanOrEqual(50);
  });

  it('los comodines valen 0 puntos', () => {
    const blank = T('', 0, { blank: true, assigned: 'z' });
    const words = [
      {
        word: 'za',
        cells: [
          { row: 7, col: 7, tile: blank },
          { row: 7, col: 8, tile: T('A', 1) },
        ],
      },
    ];
    // (7,7) es DW -> (0 + 1) * 2 = 2
    const score = scoreMove(words, [place(blank, 7, 7), place(T('A', 1), 7, 8)]);
    expect(score.total).toBe(2);
  });
});
