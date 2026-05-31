import { describe, it, expect } from 'vitest';
import { createBag, shuffle, draw, tileFace, TILE_SET, BLANK_COUNT } from '../src/engine/tiles.js';
import { T } from './helpers.js';
import { mulberry32 } from './helpers.js';

describe('bolsa de fichas', () => {
  it('tiene 100 fichas en total (98 de letra + 2 comodines)', () => {
    const bag = createBag();
    expect(bag.length).toBe(100);
  });

  it('respeta la distribucion oficial', () => {
    const bag = createBag();
    const total = TILE_SET.reduce((s, t) => s + t.count, 0);
    expect(total).toBe(98);
    const aes = bag.filter((t) => t.letter === 'A').length;
    expect(aes).toBe(12);
    const blanks = bag.filter((t) => t.isBlank).length;
    expect(blanks).toBe(BLANK_COUNT);
  });

  it('incluye los digrafos CH, LL, RR y la N como fichas propias', () => {
    const bag = createBag();
    expect(bag.find((t) => t.letter === 'CH').points).toBe(5);
    expect(bag.find((t) => t.letter === 'LL').points).toBe(8);
    expect(bag.find((t) => t.letter === 'RR').points).toBe(8);
    expect(bag.find((t) => t.letter === 'Ñ').points).toBe(8);
  });

  it('cada ficha tiene un id unico', () => {
    const bag = createBag();
    const ids = new Set(bag.map((t) => t.id));
    expect(ids.size).toBe(bag.length);
  });
});

describe('shuffle y draw', () => {
  it('shuffle es determinista con el mismo rng', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(42));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(42));
    expect(a).toEqual(b);
  });

  it('draw saca n fichas y muta la bolsa', () => {
    const bag = createBag();
    const before = bag.length;
    const hand = draw(bag, 7);
    expect(hand.length).toBe(7);
    expect(bag.length).toBe(before - 7);
  });
});

describe('tileFace', () => {
  it('digrafo aporta varios caracteres en minuscula', () => {
    expect(tileFace(T('LL', 8))).toBe('ll');
    expect(tileFace(T('CH', 5))).toBe('ch');
    expect(tileFace(T('Ñ', 8))).toBe('ñ');
  });

  it('comodin usa su letra asignada', () => {
    expect(tileFace(T('', 0, { blank: true, assigned: 'S' }))).toBe('s');
  });
});
