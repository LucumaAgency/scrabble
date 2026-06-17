import { useState } from 'react';
import { premiumAt, premiumLabel, CENTER } from '../premiums.js';

const faceOf = (cell) =>
  cell.isBlank ? (cell.assigned || '').toUpperCase() : (cell.letter || '').toUpperCase();

// board: matriz 15x15 con la ficha confirmada o null.
// provisional: fichas que el jugador esta colocando este turno (aun no enviadas).
// provStatus: 'valid' | 'invalid' | null -> tinta las fichas provisionales segun
// si la palabra formada existe en el diccionario.
// onCellDrop(row, col, tileId): coloca en esa celda la ficha arrastrada desde el
// atril (drag & drop). El flujo de click (seleccionar + tocar celda) sigue activo.
export default function Board({ board, provisional, provStatus, onCellClick, onProvisionalClick, onCellDrop }) {
  const provMap = new Map(provisional.map((p) => [`${p.row},${p.col}`, p]));
  const [overKey, setOverKey] = useState(null); // celda resaltada al arrastrar encima

  return (
    <div className="board">
      {board.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const prov = provMap.get(key);
          const prem = premiumAt(r, c);
          const isCenter = r === CENTER.row && c === CENTER.col;
          const droppable = !cell && !prov; // solo se suelta en celdas vacías

          let cls = 'cell';
          let content = null;

          if (cell) {
            cls += ' filled';
            content = <span className="tile-face">{faceOf(cell)}</span>;
          } else if (prov) {
            cls += ' provisional';
            if (provStatus) cls += ` ${provStatus}`;
            content = (
              <span className="tile-face">
                {(prov.assigned || prov.letter).toUpperCase()}
              </span>
            );
          } else if (prem) {
            cls += ` prem-${prem}`;
            content = <span className="prem-label">{premiumLabel(prem)}</span>;
          }
          if (isCenter && !cell && !prov) content = <span className="star">★</span>;
          if (droppable && overKey === key) cls += ' drop-target';

          const handleClick = prov
            ? () => onProvisionalClick(prov)
            : !cell
              ? () => onCellClick(r, c)
              : undefined;

          // Destino de drag & drop solo en celdas vacías.
          const dropProps =
            droppable && onCellDrop
              ? {
                  onDragOver: (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  },
                  onDragEnter: () => setOverKey(key),
                  onDragLeave: () => setOverKey((k) => (k === key ? null : k)),
                  onDrop: (e) => {
                    e.preventDefault();
                    setOverKey(null);
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) onCellDrop(r, c, id);
                  },
                }
              : null;

          return (
            <div key={key} className={cls} onClick={handleClick} {...dropProps}>
              {content}
            </div>
          );
        }),
      )}
    </div>
  );
}
