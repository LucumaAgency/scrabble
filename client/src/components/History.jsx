// Historial de jugadas de la partida (más reciente arriba).
// nameOf(playerId) -> nombre a mostrar.
export default function History({ history, nameOf }) {
  const entries = (history || []).filter((e) => e.type !== 'end');
  if (entries.length === 0) {
    return (
      <div className="history">
        <h4>Historial</h4>
        <p className="muted small">Aún no hay jugadas.</p>
      </div>
    );
  }
  return (
    <div className="history">
      <h4>Historial</h4>
      <ol className="history-list">
        {entries
          .map((e, i) => ({ e, i }))
          .reverse()
          .map(({ e, i }) => (
            <li key={i}>
              {e.type === 'move' && (
                <>
                  <span className="who">{nameOf(e.playerId)}</span>{' '}
                  <span className="words">
                    {(e.words || []).map((w) => w.word.toUpperCase()).join(', ')}
                  </span>{' '}
                  <span className="pts">+{e.score}</span>
                </>
              )}
              {e.type === 'pass' && (
                <>
                  <span className="who">{nameOf(e.playerId)}</span> <span className="muted">pasó</span>
                </>
              )}
              {e.type === 'swap' && (
                <>
                  <span className="who">{nameOf(e.playerId)}</span>{' '}
                  <span className="muted">cambió {e.count} ficha{e.count === 1 ? '' : 's'}</span>
                </>
              )}
            </li>
          ))}
      </ol>
    </div>
  );
}
