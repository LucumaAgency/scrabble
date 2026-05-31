export default function Scoreboard({ players, turnPlayerId, myId, bagCount, status }) {
  return (
    <div className="scoreboard">
      <div className="scores">
        {players.map((p) => {
          const isTurn = p.id === turnPlayerId && status === 'playing';
          return (
            <div key={p.id} className={`score-row${isTurn ? ' turn' : ''}`}>
              <span className="dot" data-on={p.connected !== false} />
              <span className="name">
                {p.name || p.id}
                {p.id === myId ? ' (tú)' : ''}
              </span>
              <span className="pts">{p.score}</span>
              {isTurn && <span className="badge">turno</span>}
            </div>
          );
        })}
      </div>
      <div className="meta">Fichas en bolsa: {bagCount}</div>
    </div>
  );
}
