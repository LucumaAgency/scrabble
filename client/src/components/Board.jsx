import { premiumAt, premiumLabel, CENTER } from '../premiums.js';

const faceOf = (cell) =>
  cell.isBlank ? (cell.assigned || '').toUpperCase() : (cell.letter || '').toUpperCase();

// board: matriz 15x15 con la ficha confirmada o null.
// provisional: fichas que el jugador esta colocando este turno (aun no enviadas).
export default function Board({ board, provisional, onCellClick, onProvisionalClick }) {
  const provMap = new Map(provisional.map((p) => [`${p.row},${p.col}`, p]));

  return (
    <div className="board">
      {board.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const prov = provMap.get(key);
          const prem = premiumAt(r, c);
          const isCenter = r === CENTER.row && c === CENTER.col;

          let cls = 'cell';
          let content = null;

          if (cell) {
            cls += ' filled';
            content = <span className="tile-face">{faceOf(cell)}</span>;
          } else if (prov) {
            cls += ' provisional';
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

          const handleClick = prov
            ? () => onProvisionalClick(prov)
            : !cell
              ? () => onCellClick(r, c)
              : undefined;

          return (
            <div key={key} className={cls} onClick={handleClick}>
              {content}
            </div>
          );
        }),
      )}
    </div>
  );
}
