import { describe, it, expect } from 'vitest';
import { createBoard, premiumAt, BOARD_SIZE, CENTER } from '../src/engine/board.js';

describe('tablero', () => {
  it('es 15x15 y empieza vacio', () => {
    const b = createBoard();
    expect(b.length).toBe(BOARD_SIZE);
    expect(b[0].length).toBe(BOARD_SIZE);
    expect(b.flat().every((c) => c === null)).toBe(true);
  });

  it('el centro es doble palabra', () => {
    expect(premiumAt(CENTER.row, CENTER.col)).toBe('DW');
  });

  it('las esquinas son triple palabra', () => {
    expect(premiumAt(0, 0)).toBe('TW');
    expect(premiumAt(0, 14)).toBe('TW');
    expect(premiumAt(14, 0)).toBe('TW');
    expect(premiumAt(14, 14)).toBe('TW');
  });

  it('casillas conocidas de letra', () => {
    expect(premiumAt(0, 3)).toBe('DL');
    expect(premiumAt(1, 5)).toBe('TL');
    expect(premiumAt(5, 5)).toBe('TL');
  });

  it('una casilla normal no tiene premio', () => {
    expect(premiumAt(7, 8)).toBe(null);
  });
});
