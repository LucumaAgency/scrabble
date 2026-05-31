import { LETTERS } from '../premiums.js';

// Modal para elegir que letra representa un comodin recien colocado.
export default function BlankPicker({ onPick, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>¿Qué letra es el comodín?</h3>
        <div className="letter-grid">
          {LETTERS.map((l) => (
            <button key={l} className="tile" onClick={() => onPick(l)}>
              {l}
            </button>
          ))}
        </div>
        <button className="btn ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
