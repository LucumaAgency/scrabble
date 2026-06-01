import { useEffect, useRef, useState, useCallback } from 'react';
import {
  socket,
  emit,
  getPlayerId,
  getSavedName,
  saveName,
  getSavedCode,
  saveCode,
} from './socket.js';
import { playOpponentMove, playMyMove, playInvalid, primeAudio } from './sound.js';
import Board from './components/Board.jsx';
import Rack from './components/Rack.jsx';
import Scoreboard from './components/Scoreboard.jsx';
import BlankPicker from './components/BlankPicker.jsx';
import Timer from './components/Timer.jsx';

const playerId = getPlayerId();

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [lobby, setLobby] = useState(null); // room:update
  const [game, setGame] = useState(null); // game:state
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Formulario de inicio
  const [name, setName] = useState(getSavedName());
  const [code, setCode] = useState('');
  const [timeMode, setTimeMode] = useState('15'); // '3' | '15' | 'unlimited'
  const [extraTime, setExtraTime] = useState(false); // +5 min al agotarse

  // Estado local de la jugada en curso
  const [selectedId, setSelectedId] = useState(null);
  const [provisional, setProvisional] = useState([]); // [{tileId,row,col,letter,isBlank,assigned,points}]
  const [pendingBlank, setPendingBlank] = useState(null); // {row,col,tile} esperando letra
  const [swapMode, setSwapMode] = useState(false);
  const [swapIds, setSwapIds] = useState([]);
  const [preview, setPreview] = useState(null); // estimado de la jugada en curso
  const [muted, setMuted] = useState(() => localStorage.getItem('scrabble:muted') === '1');

  // Refs para leer valores actuales dentro de listeners de socket (sin re-suscribir).
  const mutedRef = useRef(muted);
  const histLenRef = useRef(null); // longitud del historial vista (para detectar jugadas del rival)

  useEffect(() => {
    mutedRef.current = muted;
    localStorage.setItem('scrabble:muted', muted ? '1' : '0');
  }, [muted]);

  const flashError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  }, []);

  // Listeners de socket
  useEffect(() => {
    const onConnect = async () => {
      setConnected(true);
      const savedCode = getSavedCode();
      if (!savedCode) return;
      // Reconexion automatica (sirve para host y no-host): reentra a la sala.
      const res = await emit('room:join', {
        code: savedCode,
        playerId,
        name: getSavedName() || 'Jugador',
      });
      if (!res?.ok) {
        // La sala ya no existe (p.ej. el server se reinicio): volvemos al inicio.
        saveCode('');
        histLenRef.current = null;
        setLobby(null);
        setGame(null);
      }
    };
    const onDisconnect = () => setConnected(false);
    const onRoom = (state) => setLobby(state);
    const onState = (state) => {
      // Sonido cuando el RIVAL hizo una jugada (creció el historial con una
      // entrada que no es mía). En el primer estado no suena (solo ancla).
      const h = state.history || [];
      if (histLenRef.current !== null && h.length > histLenRef.current) {
        const fresh = h.slice(histLenRef.current);
        const rivalActuo = fresh.some((e) => e.playerId && e.playerId !== playerId);
        if (rivalActuo && !mutedRef.current) playOpponentMove();
      }
      histLenRef.current = h.length;

      setGame(state);
      setProvisional([]); // el servidor mando estado fresco: limpiamos lo provisional
      setSelectedId(null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoom);
    socket.on('game:state', onState);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:update', onRoom);
      socket.off('game:state', onState);
    };
  }, []);

  // ---- Acciones de sala ----
  async function createRoom() {
    primeAudio();
    saveName(name);
    const res = await emit('room:create', { playerId, name: name || 'Jugador' });
    if (res.ok) saveCode(res.code);
    else flashError(res.error);
  }

  async function joinRoom() {
    primeAudio();
    saveName(name);
    const res = await emit('room:join', { code: code.toUpperCase(), playerId, name: name || 'Jugador' });
    if (res.ok) saveCode(res.code);
    else flashError(res.error);
  }

  async function startGame() {
    const res = await emit('room:start', {
      code: lobby.code,
      timeMode,
      extraEnabled: timeMode !== 'unlimited' && extraTime,
    });
    if (!res.ok) flashError(res.error);
  }

  function leaveRoom() {
    saveCode('');
    histLenRef.current = null;
    setLobby(null);
    setGame(null);
    setProvisional([]);
  }

  const toggleMute = () => {
    primeAudio(); // desbloquea el audio con este gesto del usuario
    setMuted((m) => !m);
  };

  // ---- Acciones de juego ----
  const myTurn = game && game.turnPlayerId === playerId && game.status === 'playing';
  const me = game?.players.find((p) => p.id === playerId);
  const provIds = new Set(provisional.map((p) => p.tileId));
  const rackTiles = (me?.rack || []).filter((t) => !provIds.has(t.id));
  // Verde si la(s) palabra(s) existen, rojo si alguna no; null mientras se coloca.
  const provStatus =
    provisional.length === 0 || !preview?.ok ? null : preview.allValid ? 'valid' : 'invalid';

  function onTileClick(tile) {
    if (swapMode) {
      setSwapIds((ids) => (ids.includes(tile.id) ? ids.filter((x) => x !== tile.id) : [...ids, tile.id]));
      return;
    }
    setSelectedId((id) => (id === tile.id ? null : tile.id));
  }

  function onCellClick(row, col) {
    if (!myTurn || !selectedId) return;
    const tile = rackTiles.find((t) => t.id === selectedId);
    if (!tile) return;
    if (tile.isBlank) {
      setPendingBlank({ row, col, tile });
      return;
    }
    placeProvisional(tile, row, col, null);
  }

  function placeProvisional(tile, row, col, assigned) {
    setProvisional((prev) => [
      ...prev,
      {
        tileId: tile.id,
        row,
        col,
        letter: tile.letter,
        isBlank: tile.isBlank,
        assigned,
        points: tile.points,
      },
    ]);
    setSelectedId(null);
  }

  function removeProvisional(prov) {
    setProvisional((prev) => prev.filter((p) => p.tileId !== prov.tileId));
  }

  async function play() {
    if (provisional.length === 0) return;
    const placements = provisional.map((p) => ({
      row: p.row,
      col: p.col,
      tileId: p.tileId,
      assigned: p.assigned || null,
    }));
    const res = await emit('game:move', { code: lobby.code, placements });
    if (!res.ok) {
      if (!muted) playInvalid();
      flashError(res.error);
    } else {
      if (!muted) playMyMove();
      setProvisional([]);
      const b = res.scoring?.bingo ? ' ¡BINGO! +50' : '';
      setInfo(`+${res.scoring?.total ?? 0} puntos${b}`);
      setTimeout(() => setInfo(''), 4000);
    }
  }

  function recall() {
    setProvisional([]);
    setSelectedId(null);
  }

  async function pass() {
    recall();
    const res = await emit('game:pass', { code: lobby.code });
    if (!res.ok) flashError(res.error);
  }

  async function confirmSwap() {
    const res = await emit('game:swap', { code: lobby.code, tileIds: swapIds });
    if (!res.ok) flashError(res.error);
    setSwapMode(false);
    setSwapIds([]);
  }

  // Estimado de puntos en vivo: cada vez que cambian las fichas provisionales,
  // pide al servidor el preview de la jugada (con un pequeno debounce).
  useEffect(() => {
    if (!myTurn || provisional.length === 0) {
      setPreview(null);
      return;
    }
    const placements = provisional.map((p) => ({
      row: p.row,
      col: p.col,
      tileId: p.tileId,
      assigned: p.assigned || null,
    }));
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await emit('game:preview', { code: lobby.code, placements });
      if (!cancelled) setPreview(res);
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [provisional, myTurn, lobby?.code]);

  // Reloj propio: si es mi reloj el que corre y llega a 0, aviso al servidor
  // (que aplica el +5 automatico si el tiempo extra esta activo). El rival no
  // necesita hacer esto: su reloj esta parado mientras no es su turno.
  useEffect(() => {
    const t = game?.timer;
    if (!t || t.mode === 'unlimited' || t.running !== playerId) return;
    const startedAt = Date.now();
    const startRemaining = t.players?.[playerId] ?? 0;
    if (startRemaining <= 0) return; // ya gestionado (0 = sin extra o ya aplicado)
    const id = setInterval(() => {
      if (startRemaining - (Date.now() - startedAt) <= 0) {
        emit('game:timeout', { code: lobby.code });
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [game?.timer, playerId, lobby?.code]);

  // ---- Render ----
  if (!lobby) {
    return (
      <Shell connected={connected} error={error} muted={muted} onToggleMute={toggleMute}>
        <div className="card">
          <h1>Scrabble</h1>
          <label>
            Tu nombre
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </label>
          <button className="btn primary" onClick={createRoom} disabled={!connected}>
            Crear sala
          </button>
          <div className="divider">o</div>
          <label>
            Código de sala
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              maxLength={4}
            />
          </label>
          <button className="btn" onClick={joinRoom} disabled={!connected || code.length < 4}>
            Unirse
          </button>
        </div>
      </Shell>
    );
  }

  if (lobby.status === 'lobby') {
    const isHost = lobby.hostId === playerId;
    return (
      <Shell connected={connected} error={error} muted={muted} onToggleMute={toggleMute}>
        <div className="card">
          <h2>Sala {lobby.code}</h2>
          <p className="muted">Comparte este código con tu rival.</p>
          <ul className="player-list">
            {lobby.players.map((p) => (
              <li key={p.id}>
                {p.name || p.id} {p.id === lobby.hostId ? '· anfitrión' : ''}
              </li>
            ))}
          </ul>
          {isHost && (
            <div className="time-select">
              <span className="muted">Tiempo de partida</span>
              <div className="seg">
                {[
                  ['3', '3 min'],
                  ['15', '15 min'],
                  ['unlimited', 'Ilimitado'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    className={`btn small ${timeMode === val ? 'primary' : ''}`}
                    onClick={() => setTimeMode(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className={`switch ${timeMode === 'unlimited' ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={extraTime}
                  disabled={timeMode === 'unlimited'}
                  onChange={(e) => setExtraTime(e.target.checked)}
                />
                <span>Tiempo extra: +5 min al agotarse</span>
              </label>
            </div>
          )}
          {isHost ? (
            <button className="btn primary" onClick={startGame} disabled={lobby.players.length < 2}>
              {lobby.players.length < 2 ? 'Esperando rival…' : 'Empezar partida'}
            </button>
          ) : (
            <p className="muted">Esperando a que el anfitrión empiece…</p>
          )}
          <button className="btn ghost" onClick={leaveRoom}>
            Salir
          </button>
        </div>
      </Shell>
    );
  }

  // status playing | finished
  const finished = game?.status === 'finished';
  const winner =
    finished && game
      ? [...game.players].sort((a, b) => b.score - a.score)[0]
      : null;

  return (
    <Shell connected={connected} error={error} muted={muted} onToggleMute={toggleMute}>
      <div className="game-layout">
        <div className="left">
          <Scoreboard
            players={game.players}
            turnPlayerId={game.turnPlayerId}
            myId={playerId}
            bagCount={game.bagCount}
            status={game.status}
          />
          {game.timer && game.timer.mode !== 'unlimited' && (
            <div className="clocks">
              {game.players.map((p) => {
                const nm =
                  p.id === playerId
                    ? 'Tú'
                    : lobby.players.find((x) => x.id === p.id)?.name || 'Rival';
                return (
                  <div
                    key={p.id}
                    className={`clock-row ${game.timer.running === p.id ? 'active' : ''}`}
                  >
                    <span className="who">{nm}</span>
                    <Timer timer={game.timer} playerId={p.id} />
                  </div>
                );
              })}
              {game.timer.extraEnabled && <span className="xtra muted">+5 min al agotarse</span>}
            </div>
          )}
          {game.timer && game.timer.mode === 'unlimited' && (
            <div className="clocks">
              <span className="timer unlimited">⏱ Sin límite</span>
            </div>
          )}
          {finished && (
            <div className="banner">
              Partida terminada. Ganó <strong>{winner?.name || winner?.id}</strong> con{' '}
              {winner?.score} puntos.
            </div>
          )}
          {info && <div className="banner ok">{info}</div>}
          {!finished && (
            <div className="turn-hint">
              {myTurn ? 'Es tu turno' : 'Turno del rival…'}
            </div>
          )}
        </div>

        <div className="center">
          <Board
            board={game.board}
            provisional={provisional}
            provStatus={provStatus}
            onCellClick={onCellClick}
            onProvisionalClick={removeProvisional}
          />
        </div>

        <div className="bottom">
          <Rack
            tiles={rackTiles}
            selectedId={selectedId}
            swapMode={swapMode}
            swapIds={swapIds}
            onTileClick={onTileClick}
          />
          {!finished && myTurn && !swapMode && provisional.length > 0 && (
            <div
              className={`preview ${
                preview?.ok ? (preview.allValid ? 'ok' : 'warn') : 'bad'
              }`}
            >
              {preview?.ok ? (
                <>
                  <span className="pts">
                    ≈ {preview.total} pts{preview.bingo ? ' · ¡BINGO! +50' : ''}
                  </span>
                  <span className="words">
                    {preview.words.map((w, i) => (
                      <span key={i} className={`pw ${w.valid ? '' : 'invalid'}`}>
                        {w.word.toUpperCase()} ({w.score}){w.valid ? '' : ' ✗'}
                      </span>
                    ))}
                  </span>
                </>
              ) : (
                <span className="hint">{preview?.error || 'Calculando…'}</span>
              )}
            </div>
          )}
          {!finished && (
            <div className="actions">
              {!swapMode ? (
                <>
                  <button className="btn primary" onClick={play} disabled={!myTurn || provisional.length === 0}>
                    Jugar
                  </button>
                  <button className="btn" onClick={recall} disabled={provisional.length === 0}>
                    Recoger
                  </button>
                  <button className="btn" onClick={pass} disabled={!myTurn}>
                    Pasar
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      recall();
                      setSwapMode(true);
                    }}
                    disabled={!myTurn}
                  >
                    Cambiar
                  </button>
                </>
              ) : (
                <>
                  <span className="muted">Elige fichas a cambiar</span>
                  <button className="btn primary" onClick={confirmSwap} disabled={swapIds.length === 0}>
                    Confirmar cambio
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => {
                      setSwapMode(false);
                      setSwapIds([]);
                    }}
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          )}
          <button className="btn ghost small" onClick={leaveRoom}>
            Salir de la sala
          </button>
        </div>
      </div>

      {pendingBlank && (
        <BlankPicker
          onPick={(letter) => {
            placeProvisional(pendingBlank.tile, pendingBlank.row, pendingBlank.col, letter.toLowerCase());
            setPendingBlank(null);
          }}
          onCancel={() => setPendingBlank(null)}
        />
      )}
    </Shell>
  );
}

function Shell({ connected, error, muted, onToggleMute, children }) {
  return (
    <div className="app">
      <div className="topbar">
        <span className="logo">SCRABBLE</span>
        <span className="topbar-right">
          <button
            className="mute-btn"
            onClick={onToggleMute}
            title={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <span className={`conn ${connected ? 'on' : 'off'}`}>
            {connected ? 'conectado' : 'sin conexión'}
          </span>
        </span>
      </div>
      {error && <div className="banner err">{error}</div>}
      {children}
    </div>
  );
}
