// Atril del jugador. En modo normal, una ficha seleccionada se resalta y se
// coloca al hacer click en una celda. En modo cambio, se marcan varias para swap.
// Fuera del modo cambio, las fichas se pueden reordenar arrastrándolas.
import { useState } from 'react';

export default function Rack({ tiles, selectedId, swapMode, swapIds, onTileClick, onReorder }) {
  const [dragId, setDragId] = useState(null);

  return (
    <div className="rack">
      {tiles.map((t) => {
        const active = swapMode ? swapIds.includes(t.id) : t.id === selectedId;
        const draggable = !swapMode && !!onReorder;
        return (
          <button
            key={t.id}
            className={`tile rack-tile${active ? ' active' : ''}${swapMode ? ' swap' : ''}${
              dragId === t.id ? ' dragging' : ''
            }`}
            draggable={draggable}
            onClick={() => onTileClick(t)}
            onDragStart={draggable ? () => setDragId(t.id) : undefined}
            onDragEnd={draggable ? () => setDragId(null) : undefined}
            onDragOver={draggable ? (e) => e.preventDefault() : undefined}
            onDrop={
              draggable
                ? (e) => {
                    e.preventDefault();
                    if (dragId && dragId !== t.id) onReorder(dragId, t.id);
                    setDragId(null);
                  }
                : undefined
            }
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
