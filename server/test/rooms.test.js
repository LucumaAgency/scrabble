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
