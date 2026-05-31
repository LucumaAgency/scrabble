import { applyMove, passTurn, swapTiles, previewMove, publicState } from './engine/index.js';
import { lobbyState } from './rooms.js';

// Sala personal de Socket.IO para enviar a un jugador su estado privado (su atril).
const personalRoom = (code, playerId) => `${code}#${playerId}`;

// Convierte las jugadas del cliente [{ row, col, tileId, assigned }] en las jugadas
// que entiende el motor [{ row, col, tile }], resolviendo cada tileId contra el atril
// real del jugador en el servidor (anti-trampa: el cliente nunca manda la ficha entera).
function resolvePlacements(game, playerId, placements) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { error: 'No estas en la partida' };

  const byId = new Map(player.rack.map((t) => [t.id, t]));
  const resolved = [];
  for (const pl of placements || []) {
    const tile = byId.get(pl.tileId);
    if (!tile) return { error: 'Esa ficha no esta en tu atril' };
    if (tile.isBlank) tile.assigned = pl.assigned || null; // comodin: letra elegida
    resolved.push({ row: pl.row, col: pl.col, tile });
  }
  if (resolved.length === 0) return { error: 'No colocaste ninguna ficha' };
  return { placements: resolved };
}

export function attachSockets(io, manager) {
  function emitLobby(room) {
    io.to(room.code).emit('room:update', lobbyState(room));
  }

  // Cada jugador recibe un estado PERSONALIZADO (solo ve su propio atril).
  function emitGameState(room) {
    if (!room.game) return;
    for (const p of room.players) {
      io.to(personalRoom(room.code, p.id)).emit('game:state', publicState(room.game, p.id));
    }
  }

  function bindSocketToRoom(socket, code, playerId) {
    socket.data.code = code;
    socket.data.playerId = playerId;
    socket.join(code);
    socket.join(personalRoom(code, playerId));
  }

  io.on('connection', (socket) => {
    socket.on('room:create', ({ playerId, name } = {}, cb) => {
      if (!playerId) return cb?.({ ok: false, error: 'Falta playerId' });
      const room = manager.createRoom(playerId, name || 'Jugador');
      bindSocketToRoom(socket, room.code, playerId);
      cb?.({ ok: true, code: room.code });
      emitLobby(room);
    });

    socket.on('room:join', ({ code, playerId, name } = {}, cb) => {
      if (!playerId) return cb?.({ ok: false, error: 'Falta playerId' });
      code = (code || '').toUpperCase();
      const { room, error } = manager.joinRoom(code, playerId, name || 'Jugador');
      if (error) return cb?.({ ok: false, error });
      bindSocketToRoom(socket, code, playerId);
      cb?.({ ok: true, code });
      emitLobby(room);
      if (room.game) emitGameState(room); // reconexion a partida en curso
    });

    socket.on('room:start', ({ code } = {}, cb) => {
      const { room, error } = manager.startGame(code, socket.data.playerId);
      if (error) return cb?.({ ok: false, error });
      cb?.({ ok: true });
      emitLobby(room);
      emitGameState(room);
    });

    socket.on('game:move', ({ code, placements } = {}, cb) => {
      const room = manager.getRoom(code);
      if (!room?.game) return cb?.({ ok: false, error: 'Partida no encontrada' });
      const playerId = socket.data.playerId;

      const resolved = resolvePlacements(room.game, playerId, placements);
      if (resolved.error) return cb?.({ ok: false, error: resolved.error });

      const res = applyMove(room.game, playerId, resolved.placements);
      if (!res.ok) return cb?.({ ok: false, error: res.error });

      if (room.game.status === 'finished') room.status = 'finished';
      cb?.({ ok: true, scoring: res.scoring });
      emitLobby(room);
      emitGameState(room);
    });

    // Preview de puntos de la jugada en curso (NO la aplica): solo estima.
    socket.on('game:preview', ({ code, placements } = {}, cb) => {
      const room = manager.getRoom(code);
      if (!room?.game) return cb?.({ ok: false, error: 'Partida no encontrada' });
      const resolved = resolvePlacements(room.game, socket.data.playerId, placements);
      if (resolved.error) return cb?.({ ok: false, error: resolved.error });
      cb?.(previewMove(room.game, socket.data.playerId, resolved.placements));
    });

    socket.on('game:pass', ({ code } = {}, cb) => {
      const room = manager.getRoom(code);
      if (!room?.game) return cb?.({ ok: false, error: 'Partida no encontrada' });
      const res = passTurn(room.game, socket.data.playerId);
      if (!res.ok) return cb?.({ ok: false, error: res.error });
      if (room.game.status === 'finished') room.status = 'finished';
      cb?.({ ok: true });
      emitLobby(room);
      emitGameState(room);
    });

    socket.on('game:swap', ({ code, tileIds } = {}, cb) => {
      const room = manager.getRoom(code);
      if (!room?.game) return cb?.({ ok: false, error: 'Partida no encontrada' });
      const res = swapTiles(room.game, socket.data.playerId, tileIds);
      if (!res.ok) return cb?.({ ok: false, error: res.error });
      cb?.({ ok: true });
      emitLobby(room);
      emitGameState(room);
    });

    socket.on('disconnect', () => {
      const { code, playerId } = socket.data;
      if (!code || !playerId) return;
      const room = manager.setConnected(code, playerId, false);
      if (room) emitLobby(room);
    });
  });
}
