// Sonidos del juego con Web Audio (sin archivos: se sintetizan en el navegador).
// El AudioContext se crea/reanuda en el primer uso (tras un gesto del usuario).
let ctx;
let volume = 0.7; // 0..1, controlado por el slider del usuario

export function setVolume(v) {
  const n = Number(v);
  volume = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}
export function getVolume() {
  return volume;
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { gain = 0.14, type = 'sine' } = {}) {
  const peak = gain * volume;
  if (peak <= 0.0005) return; // silencio: no programar nada
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(c.destination);
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Chime ascendente: el rival hizo una jugada (suele tocar al volver tu turno).
// Volumen doblado (0.14 -> 0.28) para que la jugada se note más.
export function playOpponentMove() {
  tone(660, 0, 0.18, { gain: 0.28 });
  tone(988, 0.11, 0.24, { gain: 0.28 });
}

// Click de confirmación de tu propia jugada. Volumen doblado (0.1 -> 0.2).
export function playMyMove() {
  tone(523, 0, 0.12, { gain: 0.2 });
}

// Tono grave: jugada rechazada / palabra inválida.
export function playInvalid() {
  tone(196, 0, 0.26, { gain: 0.12, type: 'triangle' });
}

// Permite "desbloquear" el audio en el primer gesto del usuario.
export function primeAudio() {
  ac();
}
