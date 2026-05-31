// Utilidades para los tests del motor.

let _seq = 0;

// Crea una ficha "a mano" con id unico. points por defecto = 1.
// T('CH', 5)  ->  ficha de digrafo
// T('A', 1, { blank: true, assigned: 'a' })  ->  comodin que vale como 'a'
export function T(letter, points = 1, opts = {}) {
  return {
    id: `h${_seq++}`,
    letter,
    points,
    isBlank: !!opts.blank,
    assigned: opts.assigned ?? null,
  };
}

// Convierte ["C@7,7", ...] no; usamos un helper explicito:
// place(tile, row, col) -> { row, col, tile }
export function place(tile, row, col) {
  return { row, col, tile };
}

// PRNG determinista (mulberry32) para barajados reproducibles en tests.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
