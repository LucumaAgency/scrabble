import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { attachSockets } from '../src/socket.js';
import { createRoomManager } from '../src/rooms.js';
import { makeDictionary } from '../src/engine/index.js';

const dict = makeDictionary(['casa', 'sol', 'oso']);

let httpServer;
let ioServer;
let url;

beforeAll(
  () =>
    new Promise((resolve) => {
      httpServer = createServer();
      ioServer = new Server(httpServer);
      attachSockets(ioServer, createRoomManager({ dictionary: dict }));
      httpServer.listen(() => {
        url = `http://localhost:${httpServer.address().port}`;
        resolve();
      });
    }),
);

afterAll(
  () =>
    new Promise((resolve) => {
      ioServer.close();
      httpServer.close(() => resolve());
    }),
);

const connect = () => Client(url, { transports: ['websocket'], forceNew: true });
const emit = (sock, ev, payload) => new Promise((res) => sock.emit(ev, payload, res));
const once = (sock, ev) => new Promise((res) => sock.once(ev, res));

describe('flujo de sala por sockets', () => {
  it('dos jugadores crean/unen una sala y arrancan la partida', async () => {
    const a = connect();
    const b = connect();

    const created = await emit(a, 'room:create', { playerId: 'pa', name: 'Ana' });
    expect(created.ok).toBe(true);
    const code = created.code;

    const bLobby = once(b, 'room:update');
    const joined = await emit(b, 'room:join', { code, playerId: 'pb', name: 'Beto' });
    expect(joined.ok).toBe(true);
    expect((await bLobby).players).toHaveLength(2);

    // El anfitrion inicia: ambos reciben su estado personalizado.
    const aState = once(a, 'game:state');
    const bState = once(b, 'game:state');
    const started = await emit(a, 'room:start', { code });
    expect(started.ok).toBe(true);

    const sa = await aState;
    expect(sa.board).toHaveLength(15);
    expect(sa.turnPlayerId).toBe('pa');
    const meA = sa.players.find((p) => p.id === 'pa');
    const rivalA = sa.players.find((p) => p.id === 'pb');
    expect(meA.rack).toHaveLength(7); // veo mi atril
    expect(rivalA.rack).toBeUndefined(); // NO veo el del rival
    expect(rivalA.rackCount).toBe(7);

    await bState; // b tambien recibe estado
    a.close();
    b.close();
  });

  it('solo el anfitrion puede iniciar', async () => {
    const a = connect();
    const b = connect();
    const { code } = await emit(a, 'room:create', { playerId: 'pa', name: 'Ana' });
    await emit(b, 'room:join', { code, playerId: 'pb', name: 'Beto' });
    const res = await emit(b, 'room:start', { code });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/anfitrion/i);
    a.close();
    b.close();
  });

  it('rechaza un tercer jugador', async () => {
    const a = connect();
    const b = connect();
    const c = connect();
    const { code } = await emit(a, 'room:create', { playerId: 'pa', name: 'Ana' });
    await emit(b, 'room:join', { code, playerId: 'pb', name: 'Beto' });
    const res = await emit(c, 'room:join', { code, playerId: 'pc', name: 'Caro' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/llena/i);
    a.close();
    b.close();
    c.close();
  });
});
