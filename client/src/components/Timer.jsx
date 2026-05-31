import { useEffect, useRef, useState } from 'react';

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Reloj de UN jugador (tipo ajedrez). El servidor manda los ms restantes en
// cada game:state; si es el reloj que corre, lo contamos localmente desde ese
// ancla (sin desfase de relojes entre cliente y servidor).
export default function Timer({ timer, playerId }) {
  const [, tick] = useState(0);
  const anchor = useRef({ at: Date.now(), remaining: 0, running: false });

  // Resincroniza al llegar un reloj nuevo del servidor.
  useEffect(() => {
    if (!timer || timer.mode === 'unlimited') return;
    anchor.current = {
      at: Date.now(),
      remaining: timer.players?.[playerId] ?? 0,
      running: timer.running === playerId,
    };
  }, [timer, playerId]);

  // Refresca cada medio segundo solo si este reloj es el que corre.
  useEffect(() => {
    if (!timer || timer.mode === 'unlimited' || timer.running !== playerId) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [timer, playerId]);

  if (!timer || timer.mode === 'unlimited') return null;

  let rem = anchor.current.remaining;
  if (anchor.current.running) rem -= Date.now() - anchor.current.at;
  const expired = rem <= 0;
  return (
    <span className={`pclock ${anchor.current.running ? 'run' : ''} ${expired ? 'expired' : rem < 60000 ? 'low' : ''}`}>
      ⏱ {fmt(rem)}
    </span>
  );
}
