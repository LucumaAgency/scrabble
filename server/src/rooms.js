import { createGame } from './engine/index.js';

// Alfabeto para codigos de sala: sin I, O, 0, 1 para evitar confusiones al teclear.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 4;

// Minutos por cada modo de tiempo; 'unlimited' = sin limite.
const TIME_MODES = { '3': 3, '15': 15 };

function makeTimer(timeMode, nowMs) {
  const minutes = TIME_MODES[timeMode];
  if (!minutes) return { mode: 'unlimited', endsAt: null };
  return { mode: timeMode, endsAt: nowMs + minutes * 60000 };
}

// Gestor de salas en memoria. Una partida = un objeto. Sin Redis, un solo proceso.
// `now` es inyectable para tests deterministas del reloj.
export function createRoomManager({
  dictionary,
  rng = Math.random,
  maxPlayers = 2,
  now = () => Date.now(),
} = {}) {
  const rooms = new Map();

  function generateCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < CODE_LEN; i++) code += ALPHABET[Math.floor(rng() * ALPHABET.length)];
    } while (rooms.has(code));
    return code;
  }

  function createRoom(playerId, name) {
    const code = generateCode();
    const room = {
      code,
      hostId: playerId,
      status: 'lobby', // 'lobby' | 'playing' | 'finished'
      players: [{ id: playerId, name, connected: true }],
      game: null,
      maxPlayers,
    };
    rooms.set(code, room);
    return room;
  }

  // Une a un jugador. Si el playerId ya existe en la sala, es una RECONEXION.
  function joinRoom(code, playerId, name) {
    const room = rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };

    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.connected = true;
      if (name) existing.name = name;
      return { room, reconnected: true };
    }

    if (room.status !== 'lobby') return { error: 'La partida ya empezo' };
    if (room.players.length >= room.maxPlayers) return { error: 'La sala esta llena' };

    room.players.push({ id: playerId, name, connected: true });
    return { room };
  }

  function startGame(code, playerId, timeMode = 'unlimited') {
    const room = rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };
    if (room.hostId !== playerId) return { error: 'Solo el anfitrion puede empezar' };
    if (room.status === 'playing') return { error: 'La partida ya empezo' };
    if (room.players.length < 2) return { error: 'Se necesitan 2 jugadores' };

    room.game = createGame({ playerIds: room.players.map((p) => p.id), dictionary, rng });
    room.timer = makeTimer(timeMode, now());
    room.status = 'playing';
    return { room };
  }

  // El anfitrion anade tiempo al reloj total (por defecto 15 min). Si ya se
  // agoto, cuenta los nuevos minutos desde ahora.
  function addTime(code, playerId, minutes = 15) {
    const room = rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };
    if (room.hostId !== playerId) return { error: 'Solo el anfitrion puede anadir tiempo' };
    if (!room.timer || room.timer.mode === 'unlimited') {
      return { error: 'La partida es sin limite de tiempo' };
    }
    room.timer.endsAt = Math.max(room.timer.endsAt, now()) + minutes * 60000;
    return { room };
  }

  // Foto del reloj para enviar al cliente: tiempo restante en ms (el cliente
  // lo cuenta localmente entre actualizaciones, evitando desfase de relojes).
  function timerSnapshot(room) {
    const t = room?.timer;
    if (!t || t.mode === 'unlimited' || t.endsAt == null) return { mode: 'unlimited' };
    return { mode: t.mode, remainingMs: Math.max(0, t.endsAt - now()) };
  }

  function setConnected(code, playerId, connected) {
    const room = rooms.get(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (player) player.connected = connected;
    return room;
  }

  const getRoom = (code) => rooms.get(code);
  const deleteRoom = (code) => rooms.delete(code);

  return {
    rooms,
    createRoom,
    joinRoom,
    startGame,
    addTime,
    timerSnapshot,
    setConnected,
    getRoom,
    deleteRoom,
    generateCode,
  };
}

// Estado del lobby para enviar a los clientes (sin datos sensibles del juego).
export function lobbyState(room) {
  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    players: room.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
  };
}
