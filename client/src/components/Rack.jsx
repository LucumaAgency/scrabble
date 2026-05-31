// Atril del jugador. En modo normal, una ficha seleccionada se resalta y se
// coloca al hacer click en una celda. En modo cambio, se marcan varias para swap.
export default function Rack({ tiles, selectedId, swapMode, swapIds, onTileClick }) {
  return (
    <div className="rack">
      {tiles.map((t) => {
        const active = swapMode ? swapIds.includes(t.id) : t.id === selectedId;
        return (
          <button
            key={t.id}
            className={`tile rack-tile${active ? ' active' : ''}${swapMode ? ' swap' : ''}`}
            onClick={() => onTileClick(t)}
          >
            <span className="tile-face">{t.isBlank ? '·' : t.letter}</span>
            <span className="tile-pts">{t.isBlank ? 0 : t.points}</span>
          </button>
        );
      })}
      {tiles.length === 0 && <span className="muted">Sin fichas</span>}
    </div>
  );
}
