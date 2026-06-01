import { describe, it, expect } from 'vitest';
import { createBoard } from '../src/engine/board.js';
import { validateMove } from '../src/engine/placement.js';
import { T, place } from './helpers.js';

// Coloca fichas directamente en el tablero (simula jugadas previas).
function putWord(board, word, row, col, dir = 'H') {
  let r = row;
  let c = col;
  for (const ch of word) {
    board[r][c] = T(ch.toUpperCase(), 1);
    if (dir === 'H') c += 1;
    else r += 1;
  }
}

describe('primera jugada', () => {
  it('valida una palabra que pasa por el centro', () => {
    const board = createBoard();
    const placements = [
      place(T('C', 3), 7, 7),
      place(T('A', 1), 7, 8),
      place(T('S', 1), 7, 9),
      place(T('A', 1), 7, 10),
    ];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(true);
    expect(res.words.map((w) => w.word)).toEqual(['casa']);
  });

  it('una ficha de digrafo (RR) no genera la falsa palabra cruzada "RR"', () => {
    const board = createBoard();
    // CARRO = C A RR O; la ficha RR sola NO debe contar como palabra cruzada,
    // aunque su string tenga 2 caracteres (se mide por celdas, no por longitud).
    const placements = [
      place(T('C', 3), 7, 7),
      place(T('A', 1), 7, 8),
      place(T('RR', 8), 7, 9),
      place(T('O', 1), 7, 10),
    ];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(true);
    expect(res.words.map((w) => w.word)).toEqual(['carro']);
  });

  it('rechaza si no pasa por el centro', () => {
    const board = createBoard();
    const placements = [place(T('S', 1), 0, 0), place(T('O', 1), 0, 1), place(T('L', 1), 0, 2)];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/centro/i);
  });

  it('rechaza una sola ficha como primera jugada', () => {
    const board = createBoard();
    const res = validateMove(board, [place(T('A', 1), 7, 7)], { isFirstMove: true });
    expect(res.ok).toBe(false);
  });
});

describe('digrafos', () => {
  it('CALLE usando la ficha LL forma "calle"', () => {
    const board = createBoard();
    const placements = [
      place(T('C', 3), 7, 7),
      place(T('A', 1), 7, 8),
      place(T('LL', 8), 7, 9),
      place(T('E', 1), 7, 10),
    ];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(true);
    expect(res.words[0].word).toBe('calle');
  });

  it('CARRO usando la ficha RR forma "carro"', () => {
    const board = createBoard();
    const placements = [
      place(T('C', 3), 7, 7),
      place(T('A', 1), 7, 8),
      place(T('RR', 8), 7, 9),
      place(T('O', 1), 7, 10),
    ];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(true);
    expect(res.words[0].word).toBe('carro');
  });

  it('NIÑO usando la ficha Ñ forma "niño"', () => {
    const board = createBoard();
    const placements = [
      place(T('N', 1), 7, 7),
      place(T('I', 1), 7, 8),
      place(T('Ñ', 8), 7, 9),
      place(T('O', 1), 7, 10),
    ];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(true);
    expect(res.words[0].word).toBe('niño');
  });
});

describe('contiguidad y orientacion', () => {
  it('rechaza fichas con un hueco', () => {
    const board = createBoard();
    const placements = [place(T('C', 3), 7, 7), place(T('S', 1), 7, 9)];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/contigua|hueco/i);
  });

  it('rechaza fichas en distinta fila y columna', () => {
    const board = createBoard();
    const placements = [place(T('C', 3), 7, 7), place(T('A', 1), 8, 8)];
    const res = validateMove(board, placements, { isFirstMove: true });
    expect(res.ok).toBe(false);
  });
});

describe('jugadas posteriores', () => {
  it('debe conectar con fichas existentes', () => {
    const board = createBoard();
    putWord(board, 'CASA', 7, 7, 'H'); // ya en el tablero
    // Jugada aislada lejos -> no conecta
    const placements = [place(T('S', 1), 0, 0), place(T('O', 1), 0, 1), place(T('L', 1), 0, 2)];
    const res = validateMove(board, placements, { isFirstMove: false });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/conectar/i);
  });

  it('forma palabra cruzada al extender perpendicularmente', () => {
    const board = createBoard();
    putWord(board, 'CASA', 7, 7, 'H'); // C(7,7) A(7,8) S(7,9) A(7,10)
    // Colocamos "OO" debajo de la primera A para formar "AO"? mejor formamos
    // una vertical real: bajo la S(7,9) ponemos O y L -> "SOL" vertical.
    const placements = [place(T('O', 1), 8, 9), place(T('L', 1), 9, 9)];
    const res = validateMove(board, placements, { isFirstMove: false });
    expect(res.ok).toBe(true);
    // palabra principal vertical "sol" (S existente + O + L nuevas)
    const words = res.words.map((w) => w.word);
    expect(words).toContain('sol');
  });

  it('una sola ficha que conecta y forma palabra es valida', () => {
    const board = createBoard();
    putWord(board, 'OS', 7, 7, 'H'); // O(7,7) S(7,8)
    // Añadimos O al final -> "OSO"
    const res = validateMove(board, [place(T('O', 1), 7, 9)], { isFirstMove: false });
    expect(res.ok).toBe(true);
    expect(res.words.map((w) => w.word)).toContain('oso');
  });
});
