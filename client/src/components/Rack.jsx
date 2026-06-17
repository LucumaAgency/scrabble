// Atril del jugador. En modo normal, una ficha seleccionada se resalta y se
// coloca al hacer click en una celda. En modo cambio, se marcan varias para swap.
// Fuera del modo cambio, las fichas se pueden arrastrar: si se sueltan sobre otra
// ficha del atril se reordenan; si se sueltan sobre una celda del tablero se
// colocan ahí (el tablero lee el id desde dataTransfer).
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
            onDragStart={
              draggable
                ? (e) => {
                    setDragId(t.id);
                    // El tablero (y el reordenado) leen este id al soltar.
                    e.dataTransfer.setData('text/plain', t.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }
                : undefined
            }
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
