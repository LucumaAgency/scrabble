import { useEffect, useRef, useState } from 'react';

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Reloj total de la partida. El servidor manda `remainingMs` en cada game:state;
// entre actualizaciones contamos localmente desde ese ancla (sin desfase de relojes).
export default function Timer({ timer }) {
  const [, tick] = useState(0);
  const anchor = useRef({ at: Date.now(), remaining: 0 });

  // Resincroniza cada vez que llega un reloj nuevo del servidor.
  useEffect(() => {
    if (timer && timer.mode !== 'unlimited' && typeof timer.remainingMs === 'number') {
      anchor.current = { at: Date.now(), remaining: timer.remainingMs };
    }
  }, [timer]);

  // Refresca la cuenta una vez por segundo (solo si hay límite).
  useEffect(() => {
    if (!timer || timer.mode === 'unlimited') return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [timer]);

  if (!timer || timer.mode === 'unlimited') {
    return <div className="timer unlimited">⏱ Sin límite</div>;
  }

  const remaining = anchor.current.remaining - (Date.now() - anchor.current.at);
  const expired = remaining <= 0;
  return (
    <div className={`timer ${expired ? 'expired' : remaining < 60000 ? 'low' : ''}`}>
      ⏱ {fmt(remaining)}
      {expired ? ' · ¡Tiempo agotado!' : ''}
    </div>
  );
}
