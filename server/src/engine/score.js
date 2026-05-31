import { premiumAt } from './board.js';

// Puntua una lista de palabras. Los multiplicadores SOLO aplican a las celdas
// recien colocadas (placedSet); las fichas ya existentes suman su valor base.
// Los comodines valen 0.
export function scoreWords(words, placedSet) {
  let total = 0;
  const breakdown = [];

  for (const w of words) {
    let wordScore = 0;
    let wordMult = 1;

    for (const cell of w.cells) {
      const key = `${cell.row},${cell.col}`;
      const isNew = placedSet.has(key);
      let letterScore = cell.tile.isBlank ? 0 : cell.tile.points;

      if (isNew) {
        const prem = premiumAt(cell.row, cell.col);
        if (prem === 'DL') letterScore *= 2;
        else if (prem === 'TL') letterScore *= 3;
        else if (prem === 'DW') wordMult *= 2;
        else if (prem === 'TW') wordMult *= 3;
      }
      wordScore += letterScore;
    }

    wordScore *= wordMult;
    total += wordScore;
    breakdown.push({ word: w.word, score: wordScore });
  }

  return { total, breakdown };
}

// Puntua una jugada completa, incluyendo el bonus de bingo (+50 por usar
// las 7 fichas del atril en una sola jugada).
export function scoreMove(words, placements) {
  const placedSet = new Set(placements.map((p) => `${p.row},${p.col}`));
  const { total, breakdown } = scoreWords(words, placedSet);
  const bingo = placements.length === 7 ? 50 : 0;
  return { total: total + bingo, breakdown, bingo };
}
