import { createBoard } from './board.js';
import { createBag, shuffle, draw, RACK_SIZE } from './tiles.js';
import { validateMove } from './placement.js';
import { scoreMove } from './score.js';
import { isValidWord } from './dictionary.js';

// Crea una partida nueva. dictionary es un Set (ver dictionary.js).
// rng inyectable para tests deterministas.
export function createGame({ playerIds, dictionary, rng = Math.random }) {
  const bag = shuffle(createBag(), rng);
  const players = playerIds.map((id) => ({
    id,
    rack: draw(bag, RACK_SIZE),
    score: 0,
  }));

  return {
    board: createBoard(),
    bag,
    players,
    turn: 0, // indice del jugador en turno
    status: 'playing', // 'playing' | 'finished'
    history: [],
    consecutivePasses: 0,
    isFirstMove: true,
    dictionary,
    rng,
  };
}

function currentPlayer(game) {
  return game.players[game.turn];
}

function nextTurn(game) {
  game.turn = (game.turn + 1) % game.players.length;
}

// Aplica una jugada de colocacion. placements: [{ row, col, tile }] donde cada
// tile es una ficha del atril del jugador (con assigned puesto si es comodin).
export function applyMove(game, playerId, placements) {
  if (game.status !== 'playing') return { ok: false, error: 'La partida no esta activa' };
  const player = currentPlayer(game);
  if (player.id !== playerId) return { ok: false, error: 'No es tu turno' };

  // Las fichas deben estar en el atril del jugador.
  const rackIds = new Set(player.rack.map((t) => t.id));
  for (const p of placements) {
    if (!rackIds.has(p.tile.id)) return { ok: false, error: 'Esa ficha no esta en tu atril' };
  }

  const result = validateMove(game.board, placements, { isFirstMove: game.isFirstMove });
  if (!result.ok) return { ok: false, error: result.reason };

  // Todas las palabras formadas deben existir en el diccionario.
  for (const w of result.words) {
    if (!isValidWord(game.dictionary, w.word)) {
      return { ok: false, error: `Palabra invalida: ${w.word.toUpperCase()}` };
    }
  }

  const scoring = scoreMove(result.words, placements);

  // Aplicar: colocar en el tablero, quitar del atril, rellenar, sumar puntos.
  for (const p of placements) game.board[p.row][p.col] = p.tile;
  const placedIds = new Set(placements.map((p) => p.tile.id));
  player.rack = player.rack.filter((t) => !placedIds.has(t.id));
  player.rack.push(...draw(game.bag, placements.length));
  player.score += scoring.total;

  game.history.push({ type: 'move', playerId, words: scoring.breakdown, score: scoring.total });
  game.isFirstMove = false;
  game.consecutivePasses = 0;

  // Fin de partida: un jugador vacia su atril y la bolsa esta vacia.
  if (player.rack.length === 0 && game.bag.length === 0) {
    finishGame(game, player.id);
  } else {
    nextTurn(game);
  }

  return { ok: true, scoring };
}

export function passTurn(game, playerId) {
  if (game.status !== 'playing') return { ok: false, error: 'La partida no esta activa' };
  const player = currentPlayer(game);
  if (player.id !== playerId) return { ok: false, error: 'No es tu turno' };

  game.history.push({ type: 'pass', playerId });
  game.consecutivePasses += 1;

  // Si todos pasan dos rondas seguidas, la partida termina.
  if (game.consecutivePasses >= game.players.length * 2) {
    finishGame(game, null);
  } else {
    nextTurn(game);
  }
  return { ok: true };
}

export function swapTiles(game, playerId, tileIds) {
  if (game.status !== 'playing') return { ok: false, error: 'La partida no esta activa' };
  const player = currentPlayer(game);
  if (player.id !== playerId) return { ok: false, error: 'No es tu turno' };
  if (!tileIds || tileIds.length === 0) return { ok: false, error: 'No elegiste fichas' };
  if (game.bag.length < tileIds.length) {
    return { ok: false, error: 'No hay suficientes fichas en la bolsa para cambiar' };
  }

  const ids = new Set(tileIds);
  const toSwap = player.rack.filter((t) => ids.has(t.id));
  if (toSwap.length !== ids.size) return { ok: false, error: 'Esa ficha no esta en tu atril' };

  player.rack = player.rack.filter((t) => !ids.has(t.id));
  const newTiles = draw(game.bag, toSwap.length);
  player.rack.push(...newTiles);
  // Devolver las cambiadas a la bolsa y barajar.
  game.bag.push(...toSwap);
  game.bag = shuffle(game.bag, game.rng);

  game.history.push({ type: 'swap', playerId, count: toSwap.length });
  game.consecutivePasses = 0;
  nextTurn(game);
  return { ok: true };
}

// Termina la partida y ajusta puntajes por las fichas que quedan en los atriles.
// Cada jugador resta el valor de sus fichas restantes; si alguien vacio su atril
// (emptyRackPlayerId), recibe ademas la suma de las fichas de los demas.
function finishGame(game, emptyRackPlayerId) {
  let sumRemaining = 0;
  for (const p of game.players) {
    const rackPoints = p.rack.reduce((s, t) => s + (t.isBlank ? 0 : t.points), 0);
    p.score -= rackPoints;
    sumRemaining += rackPoints;
  }
  if (emptyRackPlayerId) {
    const winner = game.players.find((p) => p.id === emptyRackPlayerId);
    if (winner) winner.score += sumRemaining;
  }
  game.status = 'finished';
  game.history.push({ type: 'end' });
}

// Estado serializable para enviar a un cliente concreto: oculta los atriles
// de los demas jugadores (anti-trampa) y las fichas de la bolsa.
export function publicState(game, forPlayerId) {
  return {
    status: game.status,
    turnPlayerId: game.players[game.turn]?.id,
    isFirstMove: game.isFirstMove,
    bagCount: game.bag.length,
    board: game.board.map((row) =>
      row.map((cell) =>
        cell ? { letter: cell.letter, isBlank: cell.isBlank, assigned: cell.assigned } : null,
      ),
    ),
    players: game.players.map((p) => ({
      id: p.id,
      score: p.score,
      rackCount: p.rack.length,
      rack: p.id === forPlayerId ? p.rack : undefined,
    })),
    history: game.history,
  };
}
