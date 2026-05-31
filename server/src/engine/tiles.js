// Distribucion oficial del Scrabble en espanol: 98 fichas de letra + 2 comodines
// = 100 fichas en total (igual numero total que el set ingles).
// Los digrafos CH, LL, RR y la N son fichas propias (un token cada una),
// no se forman juntando C+H, L+L, R+R ni N+~.
export const TILE_SET = [
  { letter: 'A', points: 1, count: 12 },
  { letter: 'B', points: 3, count: 2 },
  { letter: 'C', points: 3, count: 4 },
  { letter: 'CH', points: 5, count: 1 },
  { letter: 'D', points: 2, count: 5 },
  { letter: 'E', points: 1, count: 12 },
  { letter: 'F', points: 4, count: 1 },
  { letter: 'G', points: 2, count: 2 },
  { letter: 'H', points: 4, count: 2 },
  { letter: 'I', points: 1, count: 6 },
  { letter: 'J', points: 8, count: 1 },
  { letter: 'L', points: 1, count: 4 },
  { letter: 'LL', points: 8, count: 1 },
  { letter: 'M', points: 3, count: 2 },
  { letter: 'N', points: 1, count: 5 },
  { letter: 'Ñ', points: 8, count: 1 },
  { letter: 'O', points: 1, count: 9 },
  { letter: 'P', points: 3, count: 2 },
  { letter: 'Q', points: 5, count: 1 },
  { letter: 'R', points: 1, count: 5 },
  { letter: 'RR', points: 8, count: 1 },
  { letter: 'S', points: 1, count: 6 },
  { letter: 'T', points: 1, count: 4 },
  { letter: 'U', points: 1, count: 5 },
  { letter: 'V', points: 4, count: 1 },
  { letter: 'X', points: 8, count: 1 },
  { letter: 'Y', points: 4, count: 1 },
  { letter: 'Z', points: 10, count: 1 },
];

export const BLANK_COUNT = 2;
export const RACK_SIZE = 7;

let _seq = 0;
function makeTile(letter, points, isBlank = false) {
  return { id: `t${_seq++}`, letter, points, isBlank, assigned: null };
}

// Crea la bolsa completa (102 fichas) sin barajar.
export function createBag() {
  const bag = [];
  for (const { letter, points, count } of TILE_SET) {
    for (let i = 0; i < count; i++) bag.push(makeTile(letter, points));
  }
  for (let i = 0; i < BLANK_COUNT; i++) bag.push(makeTile('', 0, true));
  return bag;
}

// Fisher-Yates. Acepta un rng inyectable para tests deterministas.
export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Saca n fichas del inicio de la bolsa (la muta). Devuelve las sacadas.
export function draw(bag, n) {
  return bag.splice(0, Math.min(n, bag.length));
}

// La "cara" de una ficha tal como aparece en una palabra (minusculas).
// Un comodin usa su letra asignada. Un digrafo aporta varios caracteres.
export function tileFace(tile) {
  const face = tile.isBlank ? tile.assigned || '' : tile.letter;
  return face.toLowerCase();
}
