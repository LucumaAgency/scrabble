// Normaliza una palabra para compararla contra el diccionario:
// minusculas, sin tildes ni dieresis, PERO conservando la enie.
// Ej: "Cancion" -> "cancion", "Nino" -> "nino", "Pinguino" -> "pinguino".
//
// Truco: NFD descompone la "ñ" en "n" + U+0303 (tilde combinante). Primero
// recomponemos esa secuencia a "ñ" y luego eliminamos el resto de diacriticos.
export function normalizeWord(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/ñ/g, 'ñ') // n + tilde combinante -> ñ
    .replace(/[̀-ͯ]/g, ''); // elimina el resto de diacriticos
}
