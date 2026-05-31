import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadDictionary, makeDictionary, isValidWord } from '../src/engine/dictionary.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('diccionario', () => {
  it('makeDictionary normaliza al construir', () => {
    const dict = makeDictionary(['Niño', 'CANCIÓN', 'calle']);
    expect(isValidWord(dict, 'nino')).toBe(false); // la enie importa
    expect(isValidWord(dict, 'niño')).toBe(true);
    expect(isValidWord(dict, 'cancion')).toBe(true);
    expect(isValidWord(dict, 'CALLE')).toBe(true);
  });

  it('carga el diccionario de muestra desde archivo', () => {
    const path = join(__dirname, '../src/engine/data/dictionary.sample.txt');
    const dict = loadDictionary(path);
    expect(isValidWord(dict, 'casa')).toBe(true);
    expect(isValidWord(dict, 'niño')).toBe(true);
    expect(isValidWord(dict, 'carro')).toBe(true);
    expect(isValidWord(dict, 'palabrota')).toBe(false);
  });
});
