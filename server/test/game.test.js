import { describe, it, expect } from 'vitest';
import { createGame, applyMove, passTurn, swapTiles, publicState } from '../src/engine/game.js';
import { makeDictionary } from '../src/engine/dictionary.js';
import { T, place, mulberry32 } from './helpers.js';

const dict = makeDictionary(['casa', 'sol', 'oso', 'sal', 'las', 'xilofono']);

function newGame() {
  return createGame({ playerIds: ['p1', 'p2'], dictionary: dict, rng: mulberry32(1) });
}

describe('flujo de partida', () => {
  it('reparte 7 fichas a cada jugador y empieza p1', () => {
    const game = newGame();
    expect(game.players[0].rack.length).toBe(7);
    expect(game.players[1].rack.length).toBe(7);
    expect(game.turn).toBe(0);
    expect(game.status).toBe('playing');
  });

  it('aplica una jugada valida, suma puntos y pasa el turno', () => {
    const game = newGame();
    const c = T('C', 3);
    const a1 = T('A', 1);
    const s = T('S', 1);
    const a2 = T('A', 1);
    game.players[0].rack = [c, a1, s, a2, T('O', 1), T('L', 1), T('E', 1)];

    const placements = [place(c, 7, 7), place(a1, 7, 8), place(s, 7, 9), place(a2, 7, 10)];
    const res = applyMove(game, 'p1', placements);

    expect(res.ok).toBe(true);
    expect(game.players[0].score).toBe(12); // CASA con DW del centro
    expect(game.turn).toBe(1);
    expect(game.players[0].rack.length).toBe(7); // rellenado desde la bolsa
    expect(game.isFirstMove).toBe(false);
    expect(game.board[7][7]).toBe(c);
  });

  it('rechaza jugar fuera de turno', () => {
    const game = newGame();
    const res = applyMove(game, 'p2', [place(T('A', 1), 7, 7)]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/turno/i);
  });

  it('rechaza una palabra que no esta en el diccionario y no altera el estado', () => {
    const game = newGame();
    const b = T('B', 3);
    const z = T('Z', 10);
    const t = T('T', 1);
    game.players[0].rack = [b, z, t, T('A', 1), T('A', 1), T('A', 1), T('A', 1)];
    const placements = [place(b, 7, 7), place(z, 7, 8), place(t, 7, 9)];
    const res = applyMove(game, 'p1', placements);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/invalida/i);
    expect(game.turn).toBe(0);
    expect(game.players[0].score).toBe(0);
    expect(game.board[7][7]).toBe(null);
  });

  it('rechaza colocar una ficha que no esta en el atril', () => {
    const game = newGame();
    const intrusa = T('S', 1); // no esta en el rack
    game.players[0].rack = [T('O', 1), T('O', 1), T('A', 1), T('A', 1), T('A', 1), T('A', 1), T('A', 1)];
    const res = applyMove(game, 'p1', [place(intrusa, 7, 7), place(game.players[0].rack[0], 7, 8)]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/atril/i);
  });

  it('passTurn avanza el turno y cuenta los pases', () => {
    const game = newGame();
    expect(passTurn(game, 'p1').ok).toBe(true);
    expect(game.turn).toBe(1);
    expect(game.consecutivePasses).toBe(1);
  });

  it('swapTiles mantiene el tamano del atril y pasa el turno', () => {
    const game = newGame();
    const ids = game.players[0].rack.slice(0, 3).map((t) => t.id);
    const res = swapTiles(game, 'p1', ids);
    expect(res.ok).toBe(true);
    expect(game.players[0].rack.length).toBe(7);
    expect(game.turn).toBe(1);
  });

  it('al vaciar el atril con la bolsa vacia, termina y ajusta puntajes', () => {
    const game = newGame();
    game.bag.length = 0; // bolsa vacia
    const s = T('S', 1);
    const o = T('O', 1);
    const l = T('L', 1);
    game.players[0].rack = [s, o, l];
    game.players[1].rack = [T('Z', 10), T('A', 1)]; // 11 puntos restantes

    const placements = [place(s, 7, 7), place(o, 7, 8), place(l, 7, 9)];
    const res = applyMove(game, 'p1', placements);

    expect(res.ok).toBe(true);
    expect(game.status).toBe('finished');
    // SOL con DW del centro = 6, + 11 de las fichas ajenas = 17
    expect(game.players[0].score).toBe(17);
    expect(game.players[1].score).toBe(-11);
  });
});

describe('publicState', () => {
  it('oculta el atril del rival', () => {
    const game = newGame();
    const view = publicState(game, 'p1');
    const me = view.players.find((p) => p.id === 'p1');
    const rival = view.players.find((p) => p.id === 'p2');
    expect(me.rack).toBeDefined();
    expect(rival.rack).toBeUndefined();
    expect(rival.rackCount).toBe(7);
  });
});
