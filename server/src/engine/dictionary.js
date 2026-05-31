import { readFileSync } from 'node:fs';
import { normalizeWord } from './normalize.js';

// Carga un diccionario desde un archivo de texto (una palabra por linea).
export function loadDictionary(path) {
  const text = readFileSync(path, 'utf8');
  return makeDictionary(text.split(/\r?\n/));
}

// Construye un diccionario (Set normalizado) a partir de una lista de palabras.
export function makeDictionary(words) {
  const set = new Set();
  for (const raw of words) {
    const w = normalizeWord(raw.trim());
    if (w) set.add(w);
  }
  return set;
}

export function isValidWord(dict, word) {
  return dict.has(normalizeWord(word));
}
