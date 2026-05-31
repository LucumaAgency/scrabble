// Genera el diccionario de juego a partir de una lista abierta de palabras en
// espanol (derivada de diccionarios libres tipo RLA-ES). NO es la lista oficial
// FISE de torneo, pero es ideal para juego casero.
//
// Uso: node scripts/build-dictionary.mjs
// Salida: src/engine/data/dictionary.es.txt (una palabra por linea)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SOURCE =
  process.env.DICT_SOURCE ||
  'https://raw.githubusercontent.com/words/an-array-of-spanish-words/master/index.json';

// Solo letras que existen como ficha en el Scrabble espanol + la enie.
// Longitud 2..15 (en el tablero no caben palabras de mas de 15).
const VALID = /^[a-zñ]{2,15}$/;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/engine/data/dictionary.es.txt');

console.log(`Descargando lista desde ${SOURCE} ...`);
const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Descarga fallida: HTTP ${res.status}`);
const words = await res.json();
console.log(`Recibidas ${words.length} palabras crudas.`);

const filtered = [...new Set(words.filter((w) => VALID.test(w)))].sort();
console.log(`Filtradas a ${filtered.length} palabras jugables.`);

writeFileSync(OUT, filtered.join('\n') + '\n', 'utf8');
console.log(`Escrito ${OUT}`);
