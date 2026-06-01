import { createGame } from './engine/index.js';

// Alfabeto para codigos de sala: sin I, O, 0, 1 para evitar confusiones al teclear.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 4;

// Minutos por cada modo de tiempo; 'unlimited' = sin limite.
const TIME_MODES = { '3': 3, '15': 15 };
const EXTRA_MS = 5 * 60000; // tiempo extra que se concede al agotarse el reloj

// Crea el reloj por jugador (tipo ajedrez): cada jugador tiene su banco de
// tiempo y solo corre el del jugador en turno. extraEnabled = conceder +5 min
// automaticos cuando un jugador se queda sin tiempo.
function makeTimer(timeMode, extraEnabled, game, nowMs) {
  const minutes = TIME_MODES[timeMode];
  if (!minutes) return { mode: 'unlimited' };
  const players = {};
  for (const p of game.players) players[p.id] = { remainingMs: minutes * 60000 };
  return {
    mode: timeMode,
    extraEnabled: !!extraEnabled,
    players,
    running: game.players[game.turn].id, // de quien corre el reloj
    since: nowMs, // desde cuando corre
  };
}

// Descuenta al jugador en turno el tiempo transcurrido. Si se agota y el extra
// esta activo, le suma +5 min; si no, se queda en 0 (solo aviso visual).
function commitRunning(timer, nowMs) {
  if (!timer || timer.mode === 'unlimited' || timer.running == null) return;
  const p = timer.players[timer.running];
  if (!p) return;
  p.remainingMs -= nowMs - timer.since;
  if (p.remainingMs <= 0) {
    p.remainingMs = timer.extraEnabled ? p.remainingMs + EXTRA_MS : 0;
    if (p.remainingMs < 0) p.remainingMs = 0;
  }
  timer.since = nowMs;
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

  function startGame(code, playerId, timeMode = 'unlimited', extraEnabled = false) {
    const room = rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };
    if (room.hostId !== playerId) return { error: 'Solo el anfitrion puede empezar' };
    if (room.status === 'playing') return { error: 'La partida ya empezo' };
    if (room.players.length < 2) return { error: 'Se necesitan 2 jugadores' };

    room.game = createGame({ playerIds: room.players.map((p) => p.id), dictionary, rng });
    room.timer = makeTimer(timeMode, extraEnabled, room.game, now());
    room.status = 'playing';
    return { room };
  }

  // Tras una jugada/pase/cambio: para el reloj del que jugaba y arranca el del
  // siguiente (o lo detiene si la partida termino).
  function syncClockToTurn(room) {
    const t = room?.timer;
    if (!t || t.mode === 'unlimited') return;
    const n = now();
    commitRunning(t, n);
    t.running = room.game.status === 'playing' ? room.game.players[room.game.turn].id : null;
    t.since = n;
  }

  // El cliente del jugador en turno avisa cuando su reloj llega a 0: aplicamos
  // el descuento (y el +5 automatico si el extra esta activo).
  function applyTimeout(room, playerId) {
    const t = room?.timer;
    if (!t || t.mode === 'unlimited' || t.running !== playerId) return { room };
    commitRunning(t, now());
    return { room };
  }

  // Foto del reloj para el cliente: ms restantes por jugador (el del jugador en
  // turno cuenta localmente entre actualizaciones, evitando desfase de relojes).
  function timerSnapshot(room) {
    const t = room?.timer;
    if (!t || t.mode === 'unlimited') return { mode: 'unlimited' };
    const n = now();
    const players = {};
    for (const [pid, p] of Object.entries(t.players)) {
      let rem = p.remainingMs;
      if (pid === t.running) rem -= n - t.since;
      players[pid] = Math.max(0, rem);
    }
    return { mode: t.mode, extraEnabled: t.extraEnabled, running: t.running, players };
  }

  function setConnected(code, playerId, connected) {
    const room = rooms.get(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (player) player.connected = connected;
    return room;
  }

  // Registra el socket actual del jugador y lo marca conectado.
  function attachSocket(code, playerId, socketId) {
    const room = rooms.get(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = true;
      player.socketId = socketId;
    }
    return room;
  }

  // Desconexion: solo cuenta si viene del socket ACTUAL del jugador. Asi, al
  // recargar la pagina, la desconexion del socket viejo (que llega despues de
  // que el nuevo ya reconecto) no marca al jugador como offline.
  function detachSocket(code, playerId, socketId) {
    const room = rooms.get(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (player && player.socketId === socketId) player.connected = false;
    return room;
  }

  const getRoom = (code) => rooms.get(code);
  const deleteRoom = (code) => rooms.delete(code);

  return {
    rooms,
    createRoom,
    joinRoom,
    startGame,
    syncClockToTurn,
    applyTimeout,
    timerSnapshot,
    setConnected,
    attachSocket,
    detachSocket,
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
