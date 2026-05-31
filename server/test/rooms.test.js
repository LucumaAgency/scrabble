import { describe, it, expect } from 'vitest';
import { createRoomManager, lobbyState } from '../src/rooms.js';
import { makeDictionary } from '../src/engine/index.js';
import { mulberry32 } from './helpers.js';

const dict = makeDictionary(['casa', 'sol']);
const mgr = () => createRoomManager({ dictionary: dict, rng: mulberry32(7) });

describe('gestor de salas', () => {
  it('crea una sala con codigo de 4 caracteres y al host dentro', () => {
    const m = mgr();
    const room = m.createRoom('p1', 'Ana');
    expect(room.code).toHaveLength(4);
    expect(room.players).toHaveLength(1);
    expect(room.hostId).toBe('p1');
    expect(room.status).toBe('lobby');
  });

  it('permite unirse a un segundo jugador', () => {
    const m = mgr();
    const { code } = m.createRoom('p1', 'Ana');
    const { room, error } = m.joinRoom(code, 'p2', 'Beto');
    expect(error).toBeUndefined();
    expect(room.players).toHaveLength(2);
  });

  it('rechaza un tercer jugador (max 2)', () => {
    const m = mgr();
    const { code } = m.createRoom('p1', 'Ana');
    m.joinRoom(code, 'p2', 'Beto');
    const { error } = m.joinRoom(code, 'p3', 'Caro');
    expect(error).toMatch(/llena/i);
  });

  it('el mismo playerId que vuelve es una reconexion, no un jugador nuevo', () => {
    const m = mgr();
    const { code } = m.createRoom('p1', 'Ana');
    m.joinRoom(code, 'p2', 'Beto');
    const { room, reconnected } = m.joinRoom(code, 'p2', 'Beto');
    expect(reconnected).toBe(true);
    expect(room.players).toHaveLength(2);
  });

  it('joinRoom a una sala inexistente da error', () => {
    const m = mgr();
    const { error } = m.joinRoom('ZZZZ', 'p2', 'Beto');
    expect(error).toMatch(/no encontrada/i);
  });

  it('startGame requiere ser anfitrion y 2 jugadores', () => {
    const m = mgr();
    const { code } = m.createRoom('p1', 'Ana');
    expect(m.startGame(code, 'p1').error).toMatch(/2 jugadores/i);
    m.joinRoom(code, 'p2', 'Beto');
    expect(m.startGame(code, 'p2').error).toMatch(/anfitrion/i);
    const { room } = m.startGame(code, 'p1');
    expect(room.status).toBe('playing');
    expect(room.game).toBeTruthy();
    expect(room.game.players).toHaveLength(2);
  });

  it('lobbyState no expone el objeto de juego', () => {
    const m = mgr();
    const { code } = m.createRoom('p1', 'Ana');
    const state = lobbyState(m.getRoom(code));
    expect(state.game).toBeUndefined();
    expect(state.players[0]).toEqual({ id: 'p1', name: 'Ana', connected: true });
  });
});

describe('reloj por jugador', () => {
  // Manager con reloj controlable + partida ya empezada.
  function setupAt(clock, timeMode, extra) {
    const m = createRoomManager({ dictionary: dict, rng: mulberry32(1), now: () => clock.t });
    const room = m.createRoom('p1', 'Ana');
    m.joinRoom(room.code, 'p2', 'Beto');
    m.startGame(room.code, 'p1', timeMode, extra);
    return { m, room };
  }

  it('sin modo de tiempo la partida es ilimitada', () => {
    const { m, room } = setupAt({ t: 0 }, undefined, false);
    expect(m.timerSnapshot(room)).toEqual({ mode: 'unlimited' });
  });

  it('reparte el banco a cada jugador y arranca el del primero', () => {
    const { m, room } = setupAt({ t: 0 }, '3', false);
    const snap = m.timerSnapshot(room);
    expect(snap.running).toBe('p1');
    expect(snap.players.p1).toBe(180000);
    expect(snap.players.p2).toBe(180000);
  });

  it('solo corre el reloj del jugador en turno', () => {
    const clock = { t: 0 };
    const { m, room } = setupAt(clock, '3', false);
    clock.t = 60000; // pasa 1 min
    const snap = m.timerSnapshot(room);
    expect(snap.players.p1).toBe(120000); // p1 corre
    expect(snap.players.p2).toBe(180000); // p2 esta parado
  });

  it('syncClockToTurn descuenta al que jugo y arranca al siguiente', () => {
    const clock = { t: 0 };
    const { m, room } = setupAt(clock, '3', false);
    clock.t = 30000;
    room.game.turn = 1; // p1 jugo, ahora es turno de p2
    m.syncClockToTurn(room);
    const snap = m.timerSnapshot(room);
    expect(snap.running).toBe('p2');
    expect(snap.players.p1).toBe(150000); // 180 - 30
    clock.t = 50000;
    expect(m.timerSnapshot(room).players.p2).toBe(160000); // p2 corre desde 30s
  });

  it('al agotarse con extra activo suma +5 min', () => {
    const clock = { t: 0 };
    const { m, room } = setupAt(clock, '3', true);
    clock.t = 200000; // mas de 3 min
    m.applyTimeout(room, 'p1');
    expect(m.timerSnapshot(room).players.p1).toBe(280000); // -20s + 300s
  });

  it('al agotarse sin extra se queda en 0', () => {
    const clock = { t: 0 };
    const { m, room } = setupAt(clock, '3', false);
    clock.t = 200000;
    m.applyTimeout(room, 'p1');
    expect(m.timerSnapshot(room).players.p1).toBe(0);
  });
});
